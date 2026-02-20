/**
 * Taste pack: modern techno with funk and swing. Controlled chaos, machine with attitude.
 * Used by the generator to match "my taste" instead of generic randomness.
 */

import type { ChannelRole } from "./types";

export interface RoleCaps {
  maxHitsPerBar: number;
  densityDefault: number;
  velocityMin: number;
  velocityMax: number;
  ghostVelocityMax: number;
  ghostProbabilityMin: number;
}

export const ROLE_CAPS: Record<ChannelRole, RoleCaps> = {
  kick: {
    maxHitsPerBar: 6,
    densityDefault: 0.35,
    velocityMin: 0.7,
    velocityMax: 1,
    ghostVelocityMax: 0.5,
    ghostProbabilityMin: 0.5,
  },
  hat: {
    maxHitsPerBar: 12,
    densityDefault: 0.55,
    velocityMin: 0.35,
    velocityMax: 1,
    ghostVelocityMax: 0.45,
    ghostProbabilityMin: 0.5,
  },
  clap: {
    maxHitsPerBar: 4,
    densityDefault: 0.25,
    velocityMin: 0.65,
    velocityMax: 1,
    ghostVelocityMax: 0.4,
    ghostProbabilityMin: 0.6,
  },
  perc: {
    maxHitsPerBar: 8,
    densityDefault: 0.4,
    velocityMin: 0.3,
    velocityMax: 0.95,
    ghostVelocityMax: 0.5,
    ghostProbabilityMin: 0.55,
  },
  fx: {
    maxHitsPerBar: 3,
    densityDefault: 0.08,
    velocityMin: 0.25,
    velocityMax: 0.65,
    ghostVelocityMax: 0.4,
    ghostProbabilityMin: 0.35,
  },
  bass: {
    maxHitsPerBar: 6,
    densityDefault: 0.35,
    velocityMin: 0.6,
    velocityMax: 1,
    ghostVelocityMax: 0.5,
    ghostProbabilityMin: 0.7,
  },
  chord: {
    maxHitsPerBar: 4,
    densityDefault: 0.15,
    velocityMin: 0.4,
    velocityMax: 0.85,
    ghostVelocityMax: 0.45,
    ghostProbabilityMin: 0.4,
  },
  noise: {
    maxHitsPerBar: 10,
    densityDefault: 0.5,
    velocityMin: 0.35,
    velocityMax: 0.95,
    ghostVelocityMax: 0.45,
    ghostProbabilityMin: 0.5,
  },
};

export const SWING_PREFERENCE = { min: 50, default: 55, max: 65 };
export const GROOVE_AMOUNT_PREFERENCE = { min: 0, default: 0.5, max: 1 };

/** Preferred motifs for perc (ordered by preference). */
export const PREFERRED_PERC_MOTIF_IDS = [
  "broken_offbeat",
  "triplet_tease",
  "sparse_syncopation",
  "call_response",
  "roll_burst",
  "scatter",
];

/** Hukaby (Groove Wizard) bias presets: syncopation and micro shift taste, controlled ratchets. */
export const HUKABY_BIAS = {
  densityBias: -0.05,
  syncopationBias: 0.25,
  accentBias: 0.15,
  ratchetBias: 0.2,
  microShiftBias: 0.3,
  swingTaste: 1.2,
};

/** Default controls when no UI override. */
export const DEFAULT_TASTE_CONTROLS = {
  density: 0.5,
  funkiness: 0.45,
  complexity: 0.5,
  fillAmount: 0.4,
  chaos: 0.15,
};

export function getRoleCaps(role: ChannelRole): RoleCaps {
  return ROLE_CAPS[role] ?? ROLE_CAPS.perc;
}
