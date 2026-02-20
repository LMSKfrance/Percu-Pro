/**
 * Deterministic rule-based generation and critique per algorithm/NTU_master.
 * No dependencies. Outputs patternPatch (diff ops only), critique, meta.
 * Supports: influenceVector (AfroFunk, AfroDisco), artistLenses (31_artist_lenses),
 * mode FUTURIST_FUNK. Huckaby => top 3 candidates; Surgeon => role for every change.
 */

import type { TrackId } from "../types";
import type {
  PatternState,
  PatchOp,
  LaneRole,
  CritiqueItem,
  ReasonCode,
  GeneratorOutput,
  CandidateWithScore,
} from "../patternTypes";
import { STEPS_PER_BAR } from "../patternTypes";

const TRACK_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];

/** Deterministic hash from seed + string for reproducible "random" choices */
function hash(seed: number, s: string): number {
  let h = seed;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 0x7fffffff;
}

function pick<T>(seed: number, key: string, arr: T[]): T {
  if (arr.length === 0) throw new Error("empty array");
  return arr[hash(seed, key) % arr.length];
}

/** Influence rules (from 30_influences): AfroFunk, AfroDisco */
const INFLUENCE_BIAS: Record<string, { percSyncopate?: boolean; interlock?: boolean; kickStable?: boolean; avoidConstantHats?: boolean }> = {
  AfroFunk: { percSyncopate: true, avoidConstantHats: true, kickStable: true },
  AfroDisco: { interlock: true, kickStable: true },
};

/** FUTURIST_FUNK mode (20_mode_params): timeline +0.15 ghostProb +0.10 accents precise */
const MODE_BIAS: Record<string, { ghostProbDelta?: number; accentPrecise?: boolean }> = {
  FUTURIST_FUNK: { ghostProbDelta: 0.1, accentPrecise: true },
};

/** Surgeon: every change must have a role (INTENTION_CLARITY) */
function ensureRoleForOp(op: PatchOp, role: LaneRole): PatchOp {
  if (op.op === "SET_STEP" && op.role === undefined) return { ...op, role };
  return op;
}

/** Build minimal diff ops from current state toward a deterministic variant (same seed => same patch). */
function buildPatch(
  state: PatternState,
  seed: number,
  influenceVector: string[],
  artistLenses: string[],
  mode: string,
  stepsPerBar: number
): PatchOp[] {
  const ops: PatchOp[] = [];
  const useSurgeon = artistLenses.includes("Surgeon");
  const useHuckaby = artistLenses.includes("Huckaby");
  const useMills = artistLenses.includes("Mills");
  const afroFunk = influenceVector.includes("AfroFunk");
  const afroDisco = influenceVector.includes("AfroDisco");
  const futuristFunk = mode === "FUTURIST_FUNK";

  const kickStable = afroFunk || afroDisco;
  const percSyncopate = afroFunk;
  const interlock = afroDisco;
  const ghostProbDelta = MODE_BIAS[mode]?.ghostProbDelta ?? 0;

  // 1) Anchors: kick + hat reference (Kintu). Prefer moving/scaling over adding (Mills).
  const kickLane = state.lanes.kick;
  if (kickLane && kickStable) {
    // Keep kick pattern minimal; at most scale velocity
    const scale = 0.95 + (hash(seed, "kickScale") % 11) / 100;
    ops.push({ op: "SCALE_VELOCITY", laneId: "kick", scale });
    if (useSurgeon) ops[ops.length - 1] = ensureRoleForOp(ops[ops.length - 1], "ANCHOR") as PatchOp;
  }

  // 2) Perc lanes: syncopation (AfroFunk) or interlock (AfroDisco)
  const percLanes: TrackId[] = ["hiPerc", "lowPerc", "clap", "subPerc"];
  for (const lid of percLanes) {
    const lane = state.lanes[lid];
    if (!lane) continue;
    const stepCount = lane.steps.filter((s) => s.on).length;
    if (useMills && stepCount > 6) {
      const idx = hash(seed, `reduce-${lid}`) % stepsPerBar;
      ops.push({ op: "CLEAR_STEP", laneId: lid, stepIndex: idx });
      if (useSurgeon) ops[ops.length - 1] = ensureRoleForOp(ops[ops.length - 1], lane.role) as PatchOp;
    } else if (percSyncopate || interlock) {
      const stepIndex = (hash(seed, `perc-${lid}`) % (stepsPerBar - 2)) + 1;
      const vel = 0.5 + (hash(seed, `vel-${lid}`) % 51) / 100;
      const prob = Math.min(0.5 + ghostProbDelta, 0.9);
      ops.push({
        op: "SET_STEP",
        laneId: lid,
        stepIndex,
        on: true,
        velocity: vel,
        probability: futuristFunk ? prob : undefined,
        role: lane.role,
      });
      if (useSurgeon) (ops[ops.length - 1] as PatchOp) = ensureRoleForOp(ops[ops.length - 1] as PatchOp, lane.role) as PatchOp;
    }
  }

  // 3) Noise (hats): avoid constant hats (AfroFunk); optional lane swing
  if (afroFunk && state.lanes.noise) {
    const drop = hash(seed, "noise-drop") % 4;
    ops.push({ op: "CLEAR_STEP", laneId: "noise", stepIndex: drop * 4 + 2 });
    if (useSurgeon) ops[ops.length - 1] = ensureRoleForOp(ops[ops.length - 1], "PULSE") as PatchOp;
  }

  // 4) FUTURIST_FUNK: accents precise (set accent on selected steps)
  if (futuristFunk && state.lanes.clap) {
    const accStep = (hash(seed, "clap-acc") % 4) * 4;
    ops.push({
      op: "SET_STEP",
      laneId: "clap",
      stepIndex: accStep,
      on: true,
      velocity: 0.9,
      accent: true,
      role: "PULSE",
    });
  }

  return ops;
}

/** Score a patch (for Huckaby top-3): higher = better. Deterministic from seed + index. */
function scoreCandidate(seed: number, index: number, _ops: PatchOp[]): number {
  const h = hash(seed, `score-${index}`);
  return 60 + (h % 35);
}

/** Generate critique (<=6 items) from current state and patch. */
function buildCritique(
  state: PatternState,
  ops: PatchOp[],
  influenceVector: string[],
  artistLenses: string[],
  mode: string
): CritiqueItem[] {
  const items: CritiqueItem[] = [];
  if (artistLenses.includes("Surgeon") && ops.some((o) => o.op === "SET_STEP" && !("role" in o && o.role))) {
    items.push({ reason: "INTENTION_CLARITY", message: "Every hit change should declare a role (Surgeon lens)." });
  }
  if (state.lanes.kick && state.lanes.kick.steps.filter((s) => s.on).length < 2) {
    items.push({ reason: "ANCHOR_CLARITY", message: "Kick anchor should remain readable." });
  }
  if (influenceVector.includes("AfroFunk")) {
    items.push({ reason: "POCKET_STRENGTH", message: "Rhythmic conversation, groove from bass-perc dialogue." });
  }
  if (influenceVector.includes("AfroDisco")) {
    items.push({ reason: "TIMELINE_INTERLOCK", message: "Dance lift with polyrhythmic hints; interlock percs." });
  }
  if (mode === "FUTURIST_FUNK") {
    items.push({ reason: "MODE_COLOR", message: "FUTURIST_FUNK: timeline + ghostProb, accents precise." });
  }
  if (artistLenses.includes("Huckaby")) {
    items.push({ reason: "VARIATION_SURFACE", message: "Curation: fewer stronger decisions (Huckaby lens)." });
  }
  return items.slice(0, 6);
}

export interface GeneratorInput {
  seed: number;
  density: number;
  swingPct: number;
  tempoBpm: number;
  cityProfile: string;
  influenceVector: string[];
  artistLenses: string[];
  mode: string;
  currentPattern: PatternState;
}

/** Main entry: deterministic generator. Returns patternPatch (diff ops only), critique, meta. */
export function generate(input: GeneratorInput): GeneratorOutput {
  const {
    seed,
    tempoBpm,
    cityProfile,
    influenceVector,
    artistLenses,
    mode,
    currentPattern,
  } = input;

  const useHuckaby = artistLenses.includes("Huckaby");
  const useSurgeon = artistLenses.includes("Surgeon");

  const basePatch = buildPatch(
    currentPattern,
    seed,
    influenceVector,
    artistLenses,
    mode,
    STEPS_PER_BAR
  );

  const withRoles = useSurgeon
    ? basePatch.map((op) => ("role" in op ? op : ensureRoleForOp(op, "TEXTURE")))
    : basePatch;

  const reasonCodes: ReasonCode[] = [];
  const critique = buildCritique(currentPattern, withRoles, influenceVector, artistLenses, mode);
  critique.forEach((c) => reasonCodes.push(c.reason));

  const meta = {
    seedUsed: seed,
    tempoBpm,
    cityProfile,
    influenceVector,
    artistLenses,
    mode,
    confidenceOverall: 0.7 + (hash(seed, "conf") % 30) / 100,
    reasonCodes,
  };

  if (useHuckaby) {
    const candidates: CandidateWithScore[] = [];
    for (let i = 0; i < 3; i++) {
      const variantSeed = seed + i * 1000;
      const variantOps = buildPatch(
        currentPattern,
        variantSeed,
        influenceVector,
        artistLenses,
        mode,
        STEPS_PER_BAR
      );
      const withRolesV = useSurgeon
        ? variantOps.map((op) => ("role" in op ? op : ensureRoleForOp(op, "TEXTURE")))
        : variantOps;
      candidates.push({
        patternPatch: withRolesV,
        score: scoreCandidate(seed, i, withRolesV),
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    return {
      patternPatch: candidates[0].patternPatch,
      critique,
      meta,
      candidates,
    };
  }

  return {
    patternPatch: withRoles,
    critique,
    meta,
  };
}
