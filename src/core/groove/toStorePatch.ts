/**
 * Convert groove PatternPatchOp[] to store PatchOp[] (patternTypes).
 */

import type { PatchOp } from "../patternTypes";
import type { PatternPatchOp } from "./patchTypes";

export function toStorePatchOps(ops: PatternPatchOp[]): PatchOp[] {
  const out: PatchOp[] = [];
  for (const op of ops) {
    if (op.op === "SET_STEP") {
      out.push({
        op: "SET_STEP",
        laneId: op.laneId,
        stepIndex: op.stepIndex,
        on: op.on,
        velocity: op.velocity,
        probability: op.probability,
        microShiftMs: op.microShiftMs,
        accent: op.accent,
        role: op.meta?.role,
      });
    } else if (op.op === "SET_VELOCITY") {
      out.push({
        op: "SET_VELOCITY",
        laneId: op.laneId,
        stepIndex: op.stepIndex,
        velocity: op.velocity,
      });
    } else if (op.op === "SET_PROBABILITY") {
      out.push({
        op: "SET_PROB",
        laneId: op.laneId,
        stepIndex: op.stepIndex,
        probability: op.probability,
      });
    } else if (op.op === "SET_MICROSHIFT") {
      out.push({
        op: "SET_MICROSHIFT",
        laneId: op.laneId,
        stepIndex: op.stepIndex,
        microShiftMs: op.microShiftMs,
      });
    } else if (op.op === "SHIFT_LANE") {
      out.push({
        op: "SHIFT_LANE",
        laneId: op.laneId,
        deltaSteps: op.deltaSteps,
      });
    } else if (op.op === "SET_LANE_START") {
      out.push({
        op: "SET_LANE_START",
        laneId: op.laneId,
        playStartOffsetSteps: op.playStartOffsetSteps,
      });
    } else if (op.op === "SET_LANE_SWING") {
      out.push({
        op: "SET_LANE_SWING",
        laneId: op.laneId,
        laneSwingPct: op.laneSwingPct,
      });
    } else if (op.op === "CLEAR_STEP") {
      out.push({
        op: "CLEAR_STEP",
        laneId: op.laneId,
        stepIndex: op.stepIndex,
      });
    } else if (op.op === "SCALE_VELOCITY") {
      out.push({
        op: "SCALE_VELOCITY",
        laneId: op.laneId,
        stepIndex: op.stepIndex,
        scale: op.scale,
      });
    }
  }
  return out;
}
