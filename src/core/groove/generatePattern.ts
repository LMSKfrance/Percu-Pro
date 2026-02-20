/**
 * Deterministic pattern generation. Techno with funk and swing. No Math.random.
 */

import type { ProjectState, ChannelState, StepState, PatternState } from "./types";
import { mulberry32, hashStringToSeed, nextInt } from "./rng";
import { getAvatarForRole } from "./avatars";
import { getRoleCaps } from "./taste";

export interface GenerateControls {
  density: number;
  funkiness: number;
  complexity: number;
  fillAmount: number;
  chaos: number;
}

export type GenerateScope = "all" | { channelIds: string[] };

const STEPS = 16;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function emptyStep(): StepState {
  return {
    active: false,
    velocity: 0.8,
    probability: 1,
    microShiftMs: 0,
    ratchetCount: 0,
    accent: false,
    flam: false,
  };
}

function salt(seed: number, channelId: string, role: string, variationIndex: number): number {
  return hashStringToSeed(`gen-${seed}-${channelId}-${role}-${variationIndex}`);
}

/** Kick: spine. Anchor step 0; add hits from density/funkiness; prefer offbeat when funky; rare ghost kicks; cap hits; no ratchet unless chaos max. */
function generateKick(
  rng: () => number,
  controls: GenerateControls,
  avatarSwing: number
): StepState[] {
  const caps = getRoleCaps("kick");
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  steps[0] = { ...emptyStep(), active: true, velocity: clamp(0.92, caps.velocityMin, caps.velocityMax), probability: 1, accent: true };

  const maxHits = Math.min(caps.maxHitsPerBar, 4 + Math.floor(controls.density * 2));
  const wantOffbeat = controls.funkiness > 0.4;
  const candidates = wantOffbeat ? [2, 4, 6, 8, 10, 12, 14, 1, 3, 5, 7, 9, 11, 13, 15] : [4, 8, 12];
  let added = 0;
  for (const i of candidates) {
    if (i === 0) continue;
    if (added >= maxHits - 1) break;
    const p = wantOffbeat ? 0.2 + controls.funkiness * 0.4 : 0.3 + controls.density * 0.3;
    if (rng() < p) {
      const ghost = rng() < 0.15 && controls.funkiness > 0.5;
      const vel = ghost
        ? clamp(0.35 + rng() * 0.15, 0.2, caps.ghostVelocityMax)
        : clamp(0.75 + rng() * 0.2, caps.velocityMin, caps.velocityMax);
      steps[i] = {
        ...emptyStep(),
        active: true,
        velocity: vel,
        probability: ghost ? clamp(0.6 + rng() * 0.3, caps.ghostProbabilityMin, 1) : 0.9 + rng() * 0.1,
        microShiftMs: Math.round((rng() - 0.5) * 12 * avatarSwing),
        accent: !ghost && rng() < 0.3,
      };
      added++;
    }
  }
  return steps;
}

/** Clap: backbeat 4,12; rare flam/late when fillAmount and funkiness high; never every step; occasional accent. */
function generateClap(
  rng: () => number,
  controls: GenerateControls,
  avatarSwing: number
): StepState[] {
  const caps = getRoleCaps("clap");
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  const backbeat = [4, 12];
  for (const i of backbeat) {
    steps[i] = {
      ...emptyStep(),
      active: true,
      velocity: clamp(0.82 + rng() * 0.12, caps.velocityMin, caps.velocityMax),
      probability: 1,
      microShiftMs: Math.round((rng() - 0.5) * 8 * avatarSwing),
      accent: rng() < 0.4,
    };
  }
  if (controls.fillAmount > 0.4 && controls.funkiness > 0.35 && rng() < 0.35) {
    const extra = rng() < 0.5 ? 8 : 14;
    if (!steps[extra].active) {
      steps[extra] = {
        ...emptyStep(),
        active: true,
        velocity: clamp(0.5 + rng() * 0.25, caps.velocityMin, caps.ghostVelocityMax),
        probability: clamp(0.7 + rng() * 0.2, caps.ghostProbabilityMin, 1),
        microShiftMs: Math.round(4 + rng() * 10),
        flam: rng() < 0.4,
      };
    }
  }
  return steps;
}

/** Hats: 8ths/16ths by complexity; probability and accents for speech; open hat sparingly; micro shift; controlled ratchet when funky. */
function generateHats(
  rng: () => number,
  controls: GenerateControls,
  avatarSwing: number,
  avatarRatchet: number
): StepState[] {
  const caps = getRoleCaps("hat");
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  const use16 = controls.complexity > 0.4;
  const stepIndices = use16 ? Array.from({ length: STEPS }, (_, i) => i) : [0, 2, 4, 6, 8, 10, 12, 14];
  const density = caps.densityDefault * 0.7 + controls.density * 0.5;
  const ratchetProb = controls.funkiness * avatarRatchet * 0.15;
  let hits = 0;

  for (const i of stepIndices) {
    if (hits >= caps.maxHitsPerBar) break;
    if (rng() > density) continue;
    const accent = rng() < 0.2 + controls.funkiness * 0.2;
    const vel = accent ? 0.8 + rng() * 0.2 : 0.4 + rng() * 0.5;
    const prob = clamp(0.6 + rng() * 0.35, 0.5, 1);
    const ratchet = ratchetProb > 0 && rng() < ratchetProb ? 2 : 0;
    steps[i] = {
      ...emptyStep(),
      active: true,
      velocity: clamp(vel, caps.velocityMin, caps.velocityMax),
      probability: prob,
      microShiftMs: Math.round((rng() - 0.5) * 20 * avatarSwing),
      ratchetCount: ratchet,
      accent,
    };
    hits++;
  }
  return steps;
}

const PERC_MOTIFS: { name: string; steps: number[] }[] = [
  { name: "triplet_tease", steps: [3, 6, 10, 14] },
  { name: "broken_offbeat", steps: [1, 5, 9, 13] },
  { name: "roll_burst", steps: [4, 5, 6, 7] },
  { name: "sparse_syncopation", steps: [2, 8, 11] },
  { name: "call_response", steps: [0, 4, 8, 12] },
  { name: "scatter", steps: [1, 3, 7, 10, 13] },
];

/** Perc: motif-based; cap hits; probability for movement. */
function generatePerc(
  rng: () => number,
  channelIndex: number,
  controls: GenerateControls,
  avatarSwing: number
): StepState[] {
  const caps = getRoleCaps("perc");
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  const motif = PERC_MOTIFS[nextInt(rng, PERC_MOTIFS.length)];
  const maxHits = Math.min(caps.maxHitsPerBar, 2 + Math.floor(controls.density * 4));
  const saltShift = channelIndex * 7;
  const indices = [...motif.steps].sort((a, b) => (a + saltShift) % 3 - (b + saltShift) % 3);
  let placed = 0;
  for (const i of indices) {
    if (placed >= maxHits) break;
    if (rng() < 0.7) {
      steps[i] = {
        ...emptyStep(),
        active: true,
        velocity: clamp(0.45 + rng() * 0.45, caps.velocityMin, caps.velocityMax),
        probability: clamp(0.7 + rng() * 0.25, caps.ghostProbabilityMin, 1),
        microShiftMs: Math.round((rng() - 0.5) * 18 * avatarSwing),
        accent: rng() < 0.25,
      };
      placed++;
    }
  }
  return steps;
}

/** Bass: pulse with restraint; syncopation when funky. */
function generateBass(rng: () => number, controls: GenerateControls): StepState[] {
  const caps = getRoleCaps("bass");
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  const onSteps = controls.funkiness > 0.5 ? [0, 4, 8, 12, 2, 6, 10, 14] : [0, 4, 8, 12];
  const density = caps.densityDefault + controls.density * 0.4;
  let hits = 0;
  for (const i of onSteps) {
    if (hits >= caps.maxHitsPerBar) break;
    if (rng() < density) {
      steps[i] = {
        ...emptyStep(),
        active: true,
        velocity: clamp(0.7 + rng() * 0.25, caps.velocityMin, caps.velocityMax),
        probability: clamp(0.9 + rng() * 0.1, caps.ghostProbabilityMin, 1),
        accent: rng() < 0.2,
      };
      hits++;
    }
  }
  return steps;
}

/** FX / texture: rare, tasteful; low probability; bounded micro shift. */
function generateFx(rng: () => number, controls: GenerateControls, avatarSwing: number): StepState[] {
  const caps = getRoleCaps("fx");
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  const prob = caps.densityDefault + controls.chaos * 0.08;
  let hits = 0;
  for (let i = 0; i < STEPS && hits < caps.maxHitsPerBar; i++) {
    if (rng() < prob) {
      steps[i] = {
        ...emptyStep(),
        active: true,
        velocity: clamp(0.3 + rng() * 0.35, caps.velocityMin, caps.velocityMax),
        probability: clamp(0.4 + rng() * 0.35, caps.ghostProbabilityMin, 1),
        microShiftMs: Math.round((rng() - 0.5) * 24 * avatarSwing),
      };
      hits++;
    }
  }
  return steps;
}

function channelRole(id: string): string {
  if (id === "kick") return "kick";
  if (id === "noise") return "hat";
  if (id === "clap") return "clap";
  if (id === "chord") return "chord";
  if (id === "bass") return "bass";
  return "perc";
}

export function generatePattern(
  projectState: ProjectState,
  channelStates: ChannelState[],
  controls: GenerateControls,
  scope: GenerateScope
): PatternState {
  const channelIds = scope === "all"
    ? channelStates.map((c) => c.id)
    : scope.channelIds.filter((id) => channelStates.some((c) => c.id === id));

  const channels: ChannelState[] = [];
  const steps: StepState[][] = [];

  for (let ci = 0; ci < channelStates.length; ci++) {
    const ch = channelStates[ci];
    if (!channelIds.includes(ch.id)) {
      channels.push(ch);
      steps.push(Array.from({ length: STEPS }, () => ({ ...emptyStep() })));
      continue;
    }

    const seed = salt(projectState.seed, ch.id, ch.role, projectState.variationIndex);
    const rng = mulberry32(seed);
    const avatar = getAvatarForRole(ch.role);
    const avatarSwing = 0.8 + avatar.swingTaste * 0.4;
    const avatarRatchet = Math.max(0, 0.5 + avatar.ratchetBias);

    let stepStates: StepState[];
    const role = channelRole(ch.id);
    if (role === "kick") {
      stepStates = generateKick(rng, controls, avatarSwing);
    } else if (role === "clap") {
      stepStates = generateClap(rng, controls, avatarSwing);
    } else if (role === "hat") {
      stepStates = generateHats(rng, controls, avatarSwing, avatarRatchet);
    } else if (role === "bass") {
      stepStates = generateBass(rng, controls);
    } else if (role === "chord") {
      stepStates = generateFx(rng, controls, avatarSwing);
    } else {
      stepStates = generatePerc(rng, ci, controls, avatarSwing);
    }

    channels.push(ch);
    steps.push(stepStates);
  }

  return { channels, steps };
}
