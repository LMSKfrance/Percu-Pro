/**
 * Deterministic candidate generation: 5 patch-op-only candidates.
 * Uses rng(seed). Each candidate has meta.role for newly turned-on hits.
 * If Surgeon lens: reject candidates that turn on hits without meta.role.
 */

import type { TrackId } from "../types";
import type { PatternState } from "../patternTypes";
import { STEPS_PER_BAR } from "../patternTypes";
import { mulberry32 } from "./rng";
import type { PatternPatchOp, LaneRole } from "./patchTypes";

const TRACK_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];
const PERC_LANES: TrackId[] = ["hiPerc", "lowPerc", "clap", "chord", "subPerc"];
const OFFBEAT_LANES: TrackId[] = ["noise", "subPerc"];

export interface GenerateCandidatesInput {
  seed: number;
  pattern: PatternState;
  styleBiases: { densityBias: number; ghostProbBias: number; accentSharpness: number };
  artistLenses: string[];
}

export interface Candidate {
  id: string;
  label: string;
  ops: PatternPatchOp[];
}

function withRole(op: PatternPatchOp, role: LaneRole): PatternPatchOp {
  return { ...op, meta: { ...op.meta, role } };
}

function hasSurgeonLens(lenses: string[]): boolean {
  return lenses.some((l) => l.toLowerCase() === "surgeon");
}

function everySetStepHasRole(ops: PatternPatchOp[]): boolean {
  return ops
    .filter((o): o is PatternPatchOp & { op: "SET_STEP"; on: true } => o.op === "SET_STEP" && o.on)
    .every((o) => o.meta?.role != null);
}

export function generateCandidates(input: GenerateCandidatesInput): Candidate[] {
  const { seed, pattern, styleBiases, artistLenses } = input;
  const rng = mulberry32(seed);
  const surgeon = hasSurgeonLens(artistLenses);
  const candidates: Candidate[] = [];

  const pickLane = (from: TrackId[]): TrackId =>
    from[Math.floor(rng() * from.length)];
  const pickStep = (): number => Math.floor(rng() * STEPS_PER_BAR);

  const tightOps: PatternPatchOp[] = [];
  for (const laneId of PERC_LANES) {
    const lane = pattern.lanes[laneId];
    if (!lane) continue;
    const onIndices = lane.steps.map((s, i) => (s.on ? i : -1)).filter((i) => i >= 0);
    if (onIndices.length > 4) {
      const idx = onIndices[Math.floor(rng() * onIndices.length)];
      tightOps.push({
        op: "SET_VELOCITY",
        laneId,
        stepIndex: idx,
        velocity: Math.max(0.15, (lane.steps[idx]?.velocity ?? 0.8) * 0.85),
        meta: { reasonCode: "COLLISION_REDUCTION" },
      });
    }
  }
  if (tightOps.length === 0) {
    const lid = pickLane(PERC_LANES);
    const lane = pattern.lanes[lid];
    if (lane) {
      const i = pickStep();
      tightOps.push({
        op: "SCALE_VELOCITY",
        laneId: lid,
        scale: 0.9,
        meta: { reasonCode: "COLLISION_REDUCTION" },
      });
    }
  }
  candidates.push({ id: "tighten", label: "Tighten", ops: tightOps });

  const interlockOps: PatternPatchOp[] = [];
  const perc = pickLane(PERC_LANES);
  const step = pickStep();
  const prob = Math.min(0.5 + styleBiases.ghostProbBias, 0.9);
  interlockOps.push({
    op: "SET_STEP",
    laneId: perc,
    stepIndex: step,
    on: true,
    velocity: 0.35,
    probability: prob,
    meta: { role: "TEXTURE", reasonCode: "TIMELINE_INTERLOCK" },
  });
  if (surgeon && !everySetStepHasRole(interlockOps)) {
    interlockOps.length = 0;
    interlockOps.push({
      op: "SET_PROBABILITY",
      laneId: perc,
      stepIndex: (step + 1) % STEPS_PER_BAR,
      probability: prob,
      meta: { reasonCode: "TIMELINE_INTERLOCK" },
    });
  }
  candidates.push({ id: "interlock", label: "Interlock", ops: interlockOps });

  const liftOps: PatternPatchOp[] = [];
  const offLane = pickLane(OFFBEAT_LANES);
  const offStep = (pickStep() % 4) * 4 + 2;
  liftOps.push({
    op: "SET_STEP",
    laneId: offLane,
    stepIndex: offStep,
    on: true,
    velocity: 0.75,
    accent: true,
    meta: { role: "OFFBEAT", reasonCode: "POCKET_STRENGTH" },
  });
  if (surgeon && !everySetStepHasRole(liftOps)) {
    liftOps[0] = withRole(liftOps[0], "OFFBEAT");
  }
  candidates.push({ id: "lift", label: "Lift", ops: liftOps });

  const sparseOps: PatternPatchOp[] = [];
  const sparseLane = pickLane(PERC_LANES);
  const sparseLaneData = pattern.lanes[sparseLane];
  if (sparseLaneData) {
    const onIdx = sparseLaneData.steps
      .map((s, i) => (s.on ? i : -1))
      .filter((i) => i >= 0);
    if (onIdx.length >= 2) {
      const remove = onIdx[Math.floor(rng() * onIdx.length)];
      sparseOps.push({
        op: "CLEAR_STEP",
        laneId: sparseLane,
        stepIndex: remove,
        meta: { reasonCode: "DENSITY_BALANCE" },
      });
    }
  }
  if (sparseOps.length === 0) {
    sparseOps.push({
      op: "SCALE_VELOCITY",
      laneId: pickLane(PERC_LANES),
      scale: 0.92,
      meta: { reasonCode: "DENSITY_BALANCE" },
    });
  }
  candidates.push({ id: "sparse", label: "Sparse", ops: sparseOps });

  const driveOps: PatternPatchOp[] = [];
  driveOps.push({
    op: "SCALE_VELOCITY",
    laneId: "noise",
    scale: 1.05,
    meta: { reasonCode: "MODE_COLOR" },
  });
  driveOps.push({
    op: "SET_VELOCITY",
    laneId: "noise",
    stepIndex: 0,
    velocity: 0.9,
    meta: { reasonCode: "MODE_COLOR" },
  });
  candidates.push({ id: "drive", label: "Drive", ops: driveOps });

  if (surgeon) {
    return candidates.filter((c) => {
      const setSteps = c.ops.filter((o) => o.op === "SET_STEP" && o.on);
      return setSteps.every((o) => o.meta?.role != null);
    });
  }
  return candidates;
}
