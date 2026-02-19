/**
 * Pattern model and patch ops per algorithm/NTU_master/20_schema.txt
 * Patch ops: SET_STEP, CLEAR_STEP, SHIFT_LANE, SET_LANE_START, SET_LANE_SWING,
 *            SCALE_VELOCITY, SET_PROB, SET_MICROSHIFT
 */

import type { TrackId } from "./types";

export const STEPS_PER_BAR = 16;

export type LaneRole =
  | "ANCHOR"
  | "PULSE"
  | "OFFBEAT"
  | "TEXTURE"
  | "ACCENT"
  | "FILL";

export interface StepData {
  on: boolean;
  velocity: number; // 0..1
  probability: number; // 0..1
  microShiftMs: number;
  accent: boolean;
}

export interface LaneState {
  id: TrackId;
  role: LaneRole;
  playStartOffsetSteps: number; // 0..15
  laneSwingPct: number;
  steps: StepData[];
}

export interface PatternState {
  bars: number;
  stepsPerBar: number;
  tempoBpm: number;
  seed: number;
  density: number;
  swingPct: number;
  lanes: Record<TrackId, LaneState>;
}

export type PatchOp =
  | { op: "SET_STEP"; laneId: TrackId; stepIndex: number; on: boolean; velocity?: number; probability?: number; microShiftMs?: number; accent?: boolean; role?: LaneRole }
  | { op: "SET_VELOCITY"; laneId: TrackId; stepIndex: number; velocity: number }
  | { op: "CLEAR_STEP"; laneId: TrackId; stepIndex: number }
  | { op: "SHIFT_LANE"; laneId: TrackId; deltaSteps: number }
  | { op: "SET_LANE_START"; laneId: TrackId; playStartOffsetSteps: number }
  | { op: "SET_LANE_SWING"; laneId: TrackId; laneSwingPct: number }
  | { op: "SCALE_VELOCITY"; laneId: TrackId; stepIndex?: number; scale: number }
  | { op: "SET_PROB"; laneId: TrackId; stepIndex: number; probability: number }
  | { op: "SET_MICROSHIFT"; laneId: TrackId; stepIndex: number; microShiftMs: number };

export type ReasonCode =
  | "ANCHOR_CLARITY"
  | "COLLISION_REDUCTION"
  | "POCKET_STRENGTH"
  | "SWING_ALIGNMENT"
  | "DENSITY_BALANCE"
  | "TIMELINE_INTERLOCK"
  | "VARIATION_SURFACE"
  | "MIX_SAFETY"
  | "MODE_COLOR"
  | "INTENTION_CLARITY"
  | "LOOP_ENDURANCE";

export interface CritiqueItem {
  reason: ReasonCode;
  message: string;
}

export interface PatternPatchResult {
  patternPatch: PatchOp[];
  critique: CritiqueItem[];
  meta: {
    seedUsed: number;
    tempoBpm: number;
    cityProfile: string;
    influenceVector: string[];
    artistLenses: string[];
    mode: string;
    confidenceOverall: number;
    reasonCodes: ReasonCode[];
  };
}

/** When Huckaby lens: top 3 candidates with scores */
export interface CandidateWithScore {
  patternPatch: PatchOp[];
  score: number;
}

export interface GeneratorOutput {
  patternPatch: PatchOp[];
  critique: CritiqueItem[];
  meta: PatternPatchResult["meta"];
  /** Present when Huckaby lens enabled: top 3 candidates; use first (best) if applying single patch */
  candidates?: CandidateWithScore[];
}

const DEFAULT_STEP: StepData = {
  on: false,
  velocity: 0.8,
  probability: 1,
  microShiftMs: 0,
  accent: false,
};

const LANE_ROLES: Record<TrackId, LaneRole> = {
  kick: "ANCHOR",
  snare: "PULSE",
  hhc: "PULSE",
  hho: "OFFBEAT",
  perc1: "TEXTURE",
  perc2: "TEXTURE",
  rim: "ACCENT",
  clap: "ACCENT",
};

const TRACK_IDS: TrackId[] = ["kick", "snare", "hhc", "hho", "perc1", "perc2", "rim", "clap"];

export function createInitialPatternState(tempoBpm: number, seed: number): PatternState {
  const lanes: Record<TrackId, LaneState> = {} as Record<TrackId, LaneState>;
  for (const id of TRACK_IDS) {
    const steps: StepData[] = Array.from({ length: STEPS_PER_BAR }, (_, i) => {
      const on =
        (id === "kick" && i % 4 === 0) ||
        (id === "hhc" && i % 2 === 0) ||
        (id === "snare" && i === 4) ||
        false;
      return { ...DEFAULT_STEP, on, velocity: on ? 0.85 : 0.8 };
    });
    lanes[id] = {
      id,
      role: LANE_ROLES[id],
      playStartOffsetSteps: 0,
      laneSwingPct: 50,
      steps,
    };
  }
  return {
    bars: 1,
    stepsPerBar: STEPS_PER_BAR,
    tempoBpm,
    seed,
    density: 0.5,
    swingPct: 55,
    lanes,
  };
}

function clampVelocity(v: number): number {
  return Math.max(0.15, Math.min(1, v));
}
function clampProb(p: number): number {
  return Math.max(0, Math.min(1, p));
}

export function applyPatternPatch(state: PatternState, ops: PatchOp[]): PatternState {
  const lanes = { ...state.lanes };
  for (const key of TRACK_IDS) {
    lanes[key] = {
      ...lanes[key],
      steps: lanes[key].steps.map((s) => ({ ...s })),
    };
  }

  for (const op of ops) {
    if (op.op === "SET_STEP") {
      const lane = lanes[op.laneId];
      if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) continue;
      const step = lane.steps[op.stepIndex];
      lane.steps[op.stepIndex] = {
        on: op.on,
        velocity: op.velocity !== undefined ? clampVelocity(op.velocity) : step.velocity,
        probability: op.probability !== undefined ? clampProb(op.probability) : step.probability,
        microShiftMs: op.microShiftMs !== undefined ? op.microShiftMs : step.microShiftMs,
        accent: op.accent !== undefined ? op.accent : step.accent,
      };
      if (op.role !== undefined) lane.role = op.role;
    } else if (op.op === "SET_VELOCITY") {
      const lane = lanes[op.laneId];
      if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) continue;
      lane.steps[op.stepIndex].velocity = clampVelocity(op.velocity);
    } else if (op.op === "CLEAR_STEP") {
      const lane = lanes[op.laneId];
      if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) continue;
      lane.steps[op.stepIndex] = { ...DEFAULT_STEP, on: false };
    } else if (op.op === "SHIFT_LANE") {
      const lane = lanes[op.laneId];
      if (!lane) continue;
      const next = lane.playStartOffsetSteps + op.deltaSteps;
      lane.playStartOffsetSteps = ((next % STEPS_PER_BAR) + STEPS_PER_BAR) % STEPS_PER_BAR;
    } else if (op.op === "SET_LANE_START") {
      const lane = lanes[op.laneId];
      if (!lane) continue;
      lane.playStartOffsetSteps = Math.max(0, Math.min(STEPS_PER_BAR - 1, op.playStartOffsetSteps));
    } else if (op.op === "SET_LANE_SWING") {
      const lane = lanes[op.laneId];
      if (!lane) continue;
      lane.laneSwingPct = Math.max(50, Math.min(62, op.laneSwingPct));
    } else if (op.op === "SCALE_VELOCITY") {
      const lane = lanes[op.laneId];
      if (!lane) continue;
      if (op.stepIndex !== undefined) {
        const i = op.stepIndex;
        if (i >= 0 && i < lane.steps.length)
          lane.steps[i].velocity = clampVelocity(lane.steps[i].velocity * op.scale);
      } else {
        for (let i = 0; i < lane.steps.length; i++)
          lane.steps[i].velocity = clampVelocity(lane.steps[i].velocity * op.scale);
      }
    } else if (op.op === "SET_PROB") {
      const lane = lanes[op.laneId];
      if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) continue;
      lane.steps[op.stepIndex].probability = clampProb(op.probability);
    } else if (op.op === "SET_MICROSHIFT") {
      const lane = lanes[op.laneId];
      if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) continue;
      lane.steps[op.stepIndex].microShiftMs = Math.max(-18, Math.min(18, op.microShiftMs));
    }
  }

  return { ...state, lanes };
}
