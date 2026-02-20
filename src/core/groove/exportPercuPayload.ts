/**
 * Export groove + pattern as JSON payload for injection. No React.
 */

import type { PatternState } from "../patternTypes";
import type { TrackId } from "../types";
import { STEPS_PER_BAR } from "../patternTypes";

const TRACK_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];

export interface ExportChannel {
  id: string;
  name: string;
  role: string;
  mute: boolean;
  solo: boolean;
  volume: number;
  tone: number;
  avatarId: string;
  steps: ExportStep[];
}

export interface ExportStep {
  i: number;
  active: boolean;
  velocity: number;
  probability: number;
  microShiftMs: number;
  ratchetCount: number;
  accent: boolean;
  flam: boolean;
}

export interface PercuGroovePayload {
  version: "percu-groove-1";
  tempo: number;
  loopBars: number;
  stepsPerBar: number;
  seed: number;
  swing: number;
  grooveTemplateId: string;
  grooveAmount: number;
  variationIndex: number;
  channels: ExportChannel[];
}

export interface ExportOptions {
  pattern: PatternState;
  tempo: number;
  loopBars?: number;
  seed?: number;
  swing?: number;
  grooveTemplateId?: string;
  grooveAmount?: number;
  variationIndex?: number;
}

const ROLE_BY_TRACK: Record<TrackId, string> = {
  noise: "hat",
  hiPerc: "perc",
  lowPerc: "perc",
  clap: "clap",
  chord: "chord",
  bass: "bass",
  subPerc: "perc",
  kick: "kick",
};

const AVATAR_BY_TRACK: Record<TrackId, string> = {
  noise: "hat",
  hiPerc: "perc",
  lowPerc: "perc",
  clap: "clap",
  chord: "chord",
  bass: "bass",
  subPerc: "perc",
  kick: "kick",
};

export function exportPercuPayload(options: ExportOptions): PercuGroovePayload {
  const {
    pattern,
    tempo,
    loopBars = 1,
    seed = pattern.seed ?? 42,
    swing = pattern.swingPct ?? 55,
    grooveTemplateId = "straight",
    grooveAmount = 0.5,
    variationIndex = 0,
  } = options;

  const channels: ExportChannel[] = TRACK_IDS.map((id) => {
    const lane = pattern.lanes[id];
    const steps: ExportStep[] = (lane?.steps ?? []).map((s, i) => ({
      i,
      active: s.on ?? false,
      velocity: s.velocity ?? 0.8,
      probability: s.probability ?? 1,
      microShiftMs: s.microShiftMs ?? 0,
      ratchetCount: 0,
      accent: s.accent ?? false,
      flam: false,
    }));
    return {
      id,
      name: id,
      role: ROLE_BY_TRACK[id],
      mute: false,
      solo: false,
      volume: 1,
      tone: 0.5,
      avatarId: AVATAR_BY_TRACK[id],
      steps,
    };
  });

  return {
    version: "percu-groove-1",
    tempo,
    loopBars,
    stepsPerBar: pattern.stepsPerBar ?? STEPS_PER_BAR,
    seed,
    swing,
    grooveTemplateId,
    grooveAmount,
    variationIndex,
    channels,
  };
}
