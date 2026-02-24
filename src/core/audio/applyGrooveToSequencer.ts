/**
 * Apply extracted groove (timing offsets + accents) to the step sequencer.
 * Strength 0–100% blends extracted groove with current pattern.
 */

import type { PatchOp } from "../patternTypes";
import type { TrackId } from "../types";
import { STEPS_PER_BAR } from "../patternTypes";
import type { GrooveTemplate } from "./grooveExtract";

const TRACK_IDS: TrackId[] = [
  "noise",
  "hiPerc",
  "lowPerc",
  "clap",
  "chord",
  "bass",
  "subPerc",
  "kick",
];

/** Clamp microShift to sequencer limits (patternTypes SET_MICROSHIFT uses -18..18) */
const MICRO_MIN = -18;
const MICRO_MAX = 18;

function clampMicro(ms: number): number {
  return Math.max(MICRO_MIN, Math.min(MICRO_MAX, Math.round(ms)));
}

function clampVelocity(v: number): number {
  return Math.max(0.15, Math.min(1, v));
}

/**
 * Build patch ops to apply extracted groove to the current pattern.
 * @param template - offsetsMs[16], accents[16] from grooveExtract
 * @param strength - 0..1 (0 = no change, 1 = full applied groove)
 * @param currentMicroByLaneStep - optional: get current microShiftMs per (laneId, stepIndex); if not provided we blend with 0
 * @param currentVelByLaneStep - optional: get current velocity per (laneId, stepIndex); if not provided we use 0.8 as base
 */
export function buildApplyGrooveOps(
  template: GrooveTemplate,
  strength: number,
  currentMicroByLaneStep?: (laneId: TrackId, stepIndex: number) => number,
  currentVelByLaneStep?: (laneId: TrackId, stepIndex: number) => number
): PatchOp[] {
  const ops: PatchOp[] = [];
  const str = Math.max(0, Math.min(1, strength));
  const offsets = template.offsetsMs;
  const accents = template.accents;

  for (const laneId of TRACK_IDS) {
    for (let i = 0; i < STEPS_PER_BAR && i < offsets.length; i++) {
      const currentMicro = currentMicroByLaneStep?.(laneId, i) ?? 0;
      const extractedMs = offsets[i] ?? 0;
      const blendedMicro = clampMicro(currentMicro + str * extractedMs);
      if (blendedMicro !== currentMicro) {
        ops.push({ op: "SET_MICROSHIFT", laneId, stepIndex: i, microShiftMs: blendedMicro });
      }

      const currentVel = currentVelByLaneStep?.(laneId, i) ?? 0.8;
      const accent = accents[i] ?? 0.5;
      const blendedVel = clampVelocity(currentVel * (1 + str * (accent - 0.5)));
      if (Math.abs(blendedVel - currentVel) > 0.01) {
        ops.push({ op: "SET_VELOCITY", laneId, stepIndex: i, velocity: blendedVel });
      }
    }
  }

  return ops;
}
