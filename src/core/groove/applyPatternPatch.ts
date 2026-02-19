/**
 * Apply pattern patch with validation. Never throws; invalid ops go to rejectedOps.
 */

import type { TrackId } from "../types";
import type { PatternState, LaneState, StepData } from "../patternTypes";
import { STEPS_PER_BAR } from "../patternTypes";
import type { PatternPatchOp, ApplyPatternPatchResult } from "./patchTypes";

const TRACK_IDS: TrackId[] = ["kick", "snare", "hhc", "hho", "perc1", "perc2", "rim", "clap"];
const VALID_LANES = new Set<TrackId>(TRACK_IDS);

function deepCopyPattern(p: PatternState): PatternState {
  const lanes: Record<TrackId, LaneState> = {} as Record<TrackId, LaneState>;
  for (const id of TRACK_IDS) {
    const lane = p.lanes[id];
    if (!lane) continue;
    lanes[id] = {
      ...lane,
      steps: lane.steps.map((s) => ({ ...s })),
    };
  }
  return { ...p, lanes };
}

function clampVelocity(v: number): number {
  return Math.max(0.15, Math.min(1, v));
}
function clampProb(p: number): number {
  return Math.max(0, Math.min(1, p));
}
const DEFAULT_STEP: StepData = {
  on: false,
  velocity: 0.8,
  probability: 1,
  microShiftMs: 0,
  accent: false,
};

function applyOne(
  pattern: PatternState,
  op: PatternPatchOp
): boolean {
  const lanes = pattern.lanes;
  if (op.op === "SET_STEP") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) return false;
    const step = lane.steps[op.stepIndex];
    lane.steps[op.stepIndex] = {
      on: op.on,
      velocity: op.velocity !== undefined ? clampVelocity(op.velocity) : step.velocity,
      probability: op.probability !== undefined ? clampProb(op.probability) : step.probability,
      microShiftMs: op.microShiftMs !== undefined ? Math.max(-18, Math.min(18, op.microShiftMs)) : step.microShiftMs,
      accent: op.accent !== undefined ? op.accent : step.accent,
    };
    if (op.meta?.role !== undefined) lane.role = op.meta.role;
    return true;
  }
  if (op.op === "SET_VELOCITY") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) return false;
    lane.steps[op.stepIndex].velocity = clampVelocity(op.velocity);
    return true;
  }
  if (op.op === "SET_PROBABILITY") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) return false;
    lane.steps[op.stepIndex].probability = clampProb(op.probability);
    return true;
  }
  if (op.op === "SET_MICROSHIFT") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) return false;
    lane.steps[op.stepIndex].microShiftMs = Math.max(-18, Math.min(18, op.microShiftMs));
    return true;
  }
  if (op.op === "SHIFT_LANE") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane) return false;
    const next = lane.playStartOffsetSteps + op.deltaSteps;
    lane.playStartOffsetSteps = ((next % STEPS_PER_BAR) + STEPS_PER_BAR) % STEPS_PER_BAR;
    return true;
  }
  if (op.op === "SET_LANE_START") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane) return false;
    const v = op.playStartOffsetSteps;
    if (v < 0 || v >= STEPS_PER_BAR) return false;
    lane.playStartOffsetSteps = v;
    return true;
  }
  if (op.op === "SET_LANE_SWING") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane) return false;
    lane.laneSwingPct = Math.max(50, Math.min(62, op.laneSwingPct));
    return true;
  }
  if (op.op === "CLEAR_STEP") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane || op.stepIndex < 0 || op.stepIndex >= lane.steps.length) return false;
    lane.steps[op.stepIndex] = { ...DEFAULT_STEP, on: false };
    return true;
  }
  if (op.op === "SCALE_VELOCITY") {
    if (!VALID_LANES.has(op.laneId)) return false;
    const lane = lanes[op.laneId];
    if (!lane) return false;
    if (op.stepIndex !== undefined) {
      const i = op.stepIndex;
      if (i < 0 || i >= lane.steps.length) return false;
      lane.steps[i].velocity = clampVelocity(lane.steps[i].velocity * op.scale);
    } else {
      for (let i = 0; i < lane.steps.length; i++)
        lane.steps[i].velocity = clampVelocity(lane.steps[i].velocity * op.scale);
    }
    return true;
  }
  return false;
}

export function applyPatternPatch(
  pattern: PatternState,
  ops: PatternPatchOp[]
): ApplyPatternPatchResult {
  const nextPattern = deepCopyPattern(pattern);
  const appliedOps: PatternPatchOp[] = [];
  const rejectedOps: PatternPatchOp[] = [];
  for (const op of ops) {
    const ok = applyOne(nextPattern, op);
    if (ok) appliedOps.push(op);
    else rejectedOps.push(op);
  }
  return { nextPattern, appliedOps, rejectedOps };
}
