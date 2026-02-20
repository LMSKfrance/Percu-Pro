/**
 * Map groove engine PatternState to store (patternTypes) PatternState. No React.
 */

import type { PatternState as EnginePatternState, ChannelState, StepState } from "./types";
import type { PatternState as StorePatternState, LaneState, StepData } from "../patternTypes";
import type { TrackId } from "../types";
import { STEPS_PER_BAR } from "../patternTypes";

const TRACK_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];
const LANE_ROLES: Record<TrackId, import("../patternTypes").LaneRole> = {
  noise: "PULSE",
  hiPerc: "TEXTURE",
  lowPerc: "TEXTURE",
  clap: "ACCENT",
  chord: "TEXTURE",
  bass: "PULSE",
  subPerc: "OFFBEAT",
  kick: "ANCHOR",
};

function engineStepToStoreStep(s: StepState): StepData {
  return {
    on: s.active,
    velocity: s.velocity,
    probability: s.probability,
    microShiftMs: s.microShiftMs,
    accent: s.accent,
    pitch: 0,
  };
}

export function enginePatternToStorePattern(
  engine: EnginePatternState,
  tempoBpm: number,
  seed: number,
  swingPct: number,
  density: number
): StorePatternState {
  const lanes: Record<TrackId, LaneState> = {} as Record<TrackId, LaneState>;

  for (let ci = 0; ci < engine.channels.length; ci++) {
    const ch = engine.channels[ci];
    const id = ch.id as TrackId;
    if (!TRACK_IDS.includes(id)) continue;

    const stepStates = engine.steps[ci] ?? [];
    const steps: StepData[] = Array.from({ length: STEPS_PER_BAR }, (_, i) => {
      const s = stepStates[i];
      return s ? engineStepToStoreStep(s) : { on: false, velocity: 0.8, probability: 1, microShiftMs: 0, accent: false, pitch: 0 };
    });

    lanes[id] = {
      id,
      role: LANE_ROLES[id],
      playStartOffsetSteps: 0,
      laneSwingPct: 50,
      steps,
    };
  }

  for (const id of TRACK_IDS) {
    if (!lanes[id]) {
      lanes[id] = {
        id,
        role: LANE_ROLES[id],
        playStartOffsetSteps: 0,
        laneSwingPct: 50,
        steps: Array.from({ length: STEPS_PER_BAR }, () => ({
          on: false,
          velocity: 0.8,
          probability: 1,
          microShiftMs: 0,
          accent: false,
          pitch: 0,
        })),
      };
    }
  }

  return {
    bars: 1,
    stepsPerBar: STEPS_PER_BAR,
    tempoBpm,
    seed,
    density,
    swingPct,
    lanes,
  };
}

export function storePatternToChannelStates(
  pattern: StorePatternState
): ChannelState[] {
  const channelStates: ChannelState[] = [];
  const roleMap: Record<TrackId, string> = {
    kick: "kick",
    noise: "hat",
    clap: "clap",
    hiPerc: "perc",
    lowPerc: "perc",
    subPerc: "perc",
    chord: "chord",
    bass: "bass",
  };
  for (const id of TRACK_IDS) {
    const lane = pattern.lanes[id];
    if (!lane) continue;
    channelStates.push({
      id,
      name: id,
      role: roleMap[id] as ChannelState["role"],
      mute: false,
      solo: false,
      volume: 1,
      tone: 0.5,
      avatarId: id === "kick" ? "kick" : id === "noise" ? "hat" : id === "clap" ? "clap" : id === "bass" ? "bass" : id === "chord" ? "chord" : "perc",
    });
  }
  return channelStates;
}
