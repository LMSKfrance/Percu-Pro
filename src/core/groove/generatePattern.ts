/**
 * Deterministic pattern generation. Techno with funk and swing. No Math.random.
 */

import type { ProjectState, ChannelState, StepState, PatternState } from "./types";
import { mulberry32, hashStringToSeed, nextInt } from "./rng";
import type { Rng } from "./rng";
import { getAvatarForRole } from "./avatars";
import { getRoleCaps } from "./taste";

/**
 * Detroit/Berlin axis (0 = Detroit, 1 = Berlin):
 * - Detroit: more swing, more microtiming, less hat straightness, fewer ratchets, kick can go offbeat.
 * - Berlin: less swing, more density, straighter hats, more ratchets, kick closer to 4/4.
 *
 * Percussive/Noisy axis (0 = percussive, 1 = noisy):
 * - Percussive: less noise probability/level.
 * - Noisy: more noise probability/level (noise/FX lane and texture).
 *
 * When omitted, city preset or existing controls can be used to derive these (e.g. Detroit → 0, Berlin → 1, Tbilisi → 0.5).
 */
export interface GenerateControls {
  density: number;
  funkiness: number;
  complexity: number;
  fillAmount: number;
  chaos: number;
  /** 0 = Detroit, 1 = Berlin. When set, Percu-style generation is used with single bar RNG. */
  detroitBerlin?: number;
  /** 0 = percussive, 1 = noisy. Drives noise/FX probability and level. */
  percussiveNoisy?: number;
}

export type GenerateScope = "all" | { channelIds: string[] };

/** Derived once per pattern when using Percu-style (detroitBerlin/percussiveNoisy). All from 0..1 except microtimingAmountMs (ms). */
export interface PercuStyleDerived {
  swing: number;
  effectiveDensity: number;
  hatStraightness: number;
  microtimingAmountMs: number;
  ratchetProbability: number;
  kick4on4: number;
}

export function computePercuStyleDerived(
  detroitBerlin: number,
  percussiveNoisy: number,
  density: number
): PercuStyleDerived {
  const swing = 1 - detroitBerlin * 0.3;
  const effectiveDensity = density * (0.5 + detroitBerlin * 0.5);
  const hatStraightness = detroitBerlin;
  const microtimingAmountMs = (1 - detroitBerlin) * 20;
  const ratchetProbability = detroitBerlin * 0.3;
  const kick4on4 = detroitBerlin;
  return { swing, effectiveDensity, hatStraightness, microtimingAmountMs, ratchetProbability, kick4on4 };
}

/** Deterministic bar seed for Percu-style: same seed + params => same pattern. */
export function percuStyleBarSeed(projectSeed: number, detroitBerlin: number, percussiveNoisy: number, variationIndex: number): number {
  return hashStringToSeed(`percu-bar-${projectSeed}-${detroitBerlin}-${percussiveNoisy}-${variationIndex}`);
}

/** Map city preset to detroitBerlin axis: Detroit → 0, Berlin → 1, Tbilisi (or other) → 0.5. */
export function cityToDetroitBerlin(cityProfile: string): number {
  const c = cityProfile.trim().toLowerCase();
  if (c === "detroit") return 0;
  if (c === "berlin") return 1;
  return 0.5;
}

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

// --- Percu-style lane generators (single bar RNG, derived params) ---
// Dance music: kick = 4/4 spine with optional offbeat/doubles; clap = backbeat 4,12 with optional ghosts/syncopation.

function generateKickPercuStyle(rng: Rng, d: PercuStyleDerived): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  // Anchor step 0 (always); 4, 8, 12 with high but not 100% so pattern can vary per seed
  const downbeatProb = 0.88 + rng() * 0.12;
  for (let i = 0; i < STEPS; i++) {
    const isDownbeat = i % 4 === 0;
    const alwaysOne = i === 0;
    const onDownbeat = alwaysOne || (isDownbeat && rng() < downbeatProb);
    const offbeatProb = d.effectiveDensity * 0.35 * (1 - d.kick4on4);
    const onOffbeat = !isDownbeat && d.kick4on4 < 0.6 && rng() < offbeatProb;
    const on = onDownbeat || onOffbeat;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(0.75 + rng() * 0.25, 0.15, 1) : 0.8,
      probability: on ? clamp(0.85 + rng() * 0.15, 0.5, 1) : 0.5,
      microShiftMs: on ? Math.round((rng() - 0.5) * d.microtimingAmountMs) : 0,
      ratchetCount: on && rng() < d.ratchetProbability ? 1 + nextInt(rng, 2) : 0,
      accent: on && isDownbeat && rng() < 0.45,
    };
  }
  return steps;
}

function generateSubPercuStyle(rng: Rng, kickSteps: StepState[], d: PercuStyleDerived): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  for (let i = 0; i < STEPS; i++) {
    const kickOn = kickSteps[i].active;
    const on = kickOn && rng() < 0.7;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(kickSteps[i].velocity * (0.5 + rng() * 0.3), 0.15, 1) : 0.8,
      probability: kickOn ? 0.7 : 0,
      microShiftMs: on ? kickSteps[i].microShiftMs + Math.round((rng() - 0.5) * 5) : 0,
    };
  }
  return steps;
}

function generateLowPercPercuStyle(rng: Rng, kickSteps: StepState[], d: PercuStyleDerived): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  for (let i = 0; i < STEPS; i++) {
    const avoidKick = kickSteps[i].active;
    const prob = avoidKick ? d.effectiveDensity * 0.2 : d.effectiveDensity * 0.4;
    const on = rng() < prob;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(0.5 + rng() * 0.4, 0.15, 1) : 0.8,
      probability: prob,
      microShiftMs: on ? Math.round((rng() - 0.5) * d.microtimingAmountMs) : 0,
      ratchetCount: on && rng() < d.ratchetProbability * 0.5 ? 1 : 0,
    };
  }
  return steps;
}

function generateMidPercPercuStyle(rng: Rng, d: PercuStyleDerived): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  for (let i = 0; i < STEPS; i++) {
    const prob = d.effectiveDensity * 0.3;
    const on = rng() < prob;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(0.4 + rng() * 0.5, 0.15, 1) : 0.8,
      probability: prob,
      microShiftMs: on ? Math.round((rng() - 0.5) * d.microtimingAmountMs) : 0,
      ratchetCount: on && rng() < d.ratchetProbability * 0.7 ? 1 + nextInt(rng, 2) : 0,
    };
  }
  return steps;
}

function generateHatPercuStyle(rng: Rng, d: PercuStyleDerived): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  for (let i = 0; i < STEPS; i++) {
    const straight = i % 2 === 0 || (i % 2 === 1 && d.hatStraightness > 0.5);
    const swingOffset = i % 2 === 1 ? (1 - d.swing) * 10 : 0;
    const prob = straight ? d.effectiveDensity * 0.6 : d.effectiveDensity * 0.3;
    const on = rng() < prob;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(0.3 + rng() * 0.5, 0.15, 1) : 0.8,
      probability: prob,
      microShiftMs: on ? Math.round((rng() - 0.5) * d.microtimingAmountMs * 0.5 + swingOffset) : 0,
      ratchetCount: on && rng() < d.ratchetProbability * 0.8 ? 1 + nextInt(rng, 2) : 0,
      accent: on && i % 4 === 0 && rng() < 0.35,
    };
  }
  return steps;
}

function generateNoiseFxPercuStyle(rng: Rng, percussiveNoisy: number, d: PercuStyleDerived): StepState[] {
  const noiseProb = percussiveNoisy * 0.4 + d.effectiveDensity * 0.2;
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  for (let i = 0; i < STEPS; i++) {
    const on = rng() < noiseProb;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(percussiveNoisy * 0.6 + rng() * 0.4, 0.15, 1) : 0.8,
      probability: noiseProb,
      microShiftMs: on ? Math.round((rng() - 0.5) * d.microtimingAmountMs) : 0,
      ratchetCount: on && rng() < d.ratchetProbability * 0.6 ? 1 : 0,
    };
  }
  return steps;
}

function generateChordPercuStyle(rng: Rng, d: PercuStyleDerived): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  for (let i = 0; i < STEPS; i++) {
    const on = i % 4 === 0 && rng() < d.effectiveDensity * 0.5;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(0.4 + rng() * 0.3, 0.15, 1) : 0.8,
      probability: d.effectiveDensity * 0.5,
      microShiftMs: on ? Math.round((rng() - 0.5) * d.microtimingAmountMs * 0.5) : 0,
    };
  }
  return steps;
}

function generateAcidPercuStyle(rng: Rng, d: PercuStyleDerived): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  for (let i = 0; i < STEPS; i++) {
    const on = rng() < d.effectiveDensity * 0.35;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(0.5 + rng() * 0.4, 0.15, 1) : 0.8,
      probability: d.effectiveDensity * 0.35,
      microShiftMs: on ? Math.round((rng() - 0.5) * d.microtimingAmountMs) : 0,
      ratchetCount: on && rng() < d.ratchetProbability * 0.4 ? 1 : 0,
    };
  }
  return steps;
}

/** Clap: dance backbeat (4, 12) with RNG so each generation varies; optional ghost/syncopated hits. */
function generateClapPercuStyle(rng: Rng, d: PercuStyleDerived): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
  const backbeats = [4, 12];
  for (const i of backbeats) {
    const on = rng() < 0.92;
    steps[i] = {
      ...emptyStep(),
      active: on,
      velocity: on ? clamp(0.78 + rng() * 0.2, 0.15, 1) : 0.8,
      probability: on ? clamp(0.88 + rng() * 0.12, 0.5, 1) : 0.5,
      microShiftMs: on ? Math.round((rng() - 0.5) * d.microtimingAmountMs * 0.6) : 0,
      accent: on && rng() < 0.4,
      flam: on && rng() < 0.25,
    };
  }
  const extraSteps = [2, 6, 8, 10, 14];
  const extraProb = d.effectiveDensity * 0.25;
  for (const i of extraSteps) {
    if (rng() < extraProb) {
      steps[i] = {
        ...emptyStep(),
        active: true,
        velocity: clamp(0.4 + rng() * 0.35, 0.15, 1),
        probability: clamp(0.6 + rng() * 0.3, 0.5, 1),
        microShiftMs: Math.round((rng() - 0.5) * d.microtimingAmountMs),
        flam: rng() < 0.35,
      };
    }
  }
  return steps;
}

/** Merge two Percu-style lanes (e.g. noise + chord into chord lane). Step on if either on; velocity max. */
function mergePercuLanes(a: StepState[], b: StepState[]): StepState[] {
  const steps: StepState[] = Array.from({ length: STEPS }, (_, i) => {
    const sa = a[i];
    const sb = b[i];
    const on = sa.active || sb.active;
    const vel = on ? Math.max(sa.active ? sa.velocity : 0, sb.active ? sb.velocity : 0) : 0.8;
    return {
      ...emptyStep(),
      active: on,
      velocity: vel,
      probability: sa.active ? sa.probability : sb.probability,
      microShiftMs: sa.active ? sa.microShiftMs : sb.microShiftMs,
      accent: sa.accent || sb.accent,
    };
  });
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

  const usePercuStyle = controls.detroitBerlin !== undefined;
  const detroitBerlin = usePercuStyle ? clamp(controls.detroitBerlin!, 0, 1) : 0.5;
  const percussiveNoisy = usePercuStyle ? clamp(controls.percussiveNoisy ?? 0, 0, 1) : 0;

  if (usePercuStyle) {
    const d = computePercuStyleDerived(detroitBerlin, percussiveNoisy, controls.density);
    const barSeed = percuStyleBarSeed(projectState.seed, detroitBerlin, percussiveNoisy, projectState.variationIndex);
    const rng = mulberry32(barSeed);

    const kickSteps = generateKickPercuStyle(rng, d);
    const percuStyleByChannelId: Record<string, StepState[]> = {
      kick: kickSteps,
      subPerc: generateSubPercuStyle(rng, kickSteps, d),
      lowPerc: generateLowPercPercuStyle(rng, kickSteps, d),
      hiPerc: generateMidPercPercuStyle(rng, d),
      noise: generateHatPercuStyle(rng, d),
      chord: mergePercuLanes(generateNoiseFxPercuStyle(rng, percussiveNoisy, d), generateChordPercuStyle(rng, d)),
      bass: generateAcidPercuStyle(rng, d),
      clap: generateClapPercuStyle(rng, d),
    };

    for (let ci = 0; ci < channelStates.length; ci++) {
      const ch = channelStates[ci];
      channels.push(ch);
      if (!channelIds.includes(ch.id)) {
        steps.push(Array.from({ length: STEPS }, () => ({ ...emptyStep() })));
        continue;
      }
      const stepStates = percuStyleByChannelId[ch.id] ?? Array.from({ length: STEPS }, () => ({ ...emptyStep() }));
      steps.push(stepStates);
    }
    return { channels, steps };
  }

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
