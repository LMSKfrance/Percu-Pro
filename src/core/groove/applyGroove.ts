/**
 * Apply groove template and swing to pattern timing. Produces PatchOps to update microShiftMs.
 * Scheduler uses step.microShiftMs so playback reflects groove immediately.
 */

import type { PatternState, PatchOp } from "../patternTypes";
import type { TrackId } from "../types";
import { STEPS_PER_BAR } from "../patternTypes";
import { getGrooveTemplate } from "./grooveTemplates";
import { getAvatarForRole } from "./avatars";

export interface ApplyGrooveParams {
  tempo: number;
  swingPct: number;
  grooveTemplateId: string;
  grooveAmount: number;
}

function clampMicroShift(ms: number): number {
  return Math.max(-50, Math.min(50, Math.round(ms)));
}

/**
 * Compute groove-aware microShiftMs for each step and return PatchOps.
 * Formula: base + templateOffset * stepDurMs * grooveAmount * avatarSwing
 *          + (offbeat ? swingDelayMs : 0)
 * Store result in step.microShiftMs so scheduler (unchanged) uses it.
 */
export function applyGroove(
  pattern: PatternState,
  params: ApplyGrooveParams
): PatchOp[] {
  const { tempo, swingPct, grooveTemplateId, grooveAmount } = params;
  const template = getGrooveTemplate(grooveTemplateId);
  const stepDurMs = (60 / tempo) * (4 / STEPS_PER_BAR) * 1000;
  const swingNorm = (swingPct - 50) / 100;
  const swingDelayMs = stepDurMs * Math.max(0, Math.min(0.2, swingNorm)) * grooveAmount;

  const ops: PatchOp[] = [];
  const laneIds = Object.keys(pattern.lanes) as TrackId[];

  for (const laneId of laneIds) {
    const lane = pattern.lanes[laneId];
    if (!lane) continue;

    const avatar = getAvatarForRole(laneId);
    const avatarSwing = 0.8 + avatar.swingTaste * 0.4;
    const offsets = template?.offsetsByStep ?? Array.from({ length: STEPS_PER_BAR }, () => 0);

    for (let i = 0; i < lane.steps.length && i < offsets.length; i++) {
      const step = lane.steps[i];
      const templateOffset = offsets[i] ?? 0;
      const templateMs = templateOffset * stepDurMs * grooveAmount * avatarSwing;
      const isOdd = i % 2 === 1;
      const swingMs = isOdd ? swingDelayMs * avatarSwing : 0;
      const baseMicro = step.microShiftMs ?? 0;
      const totalMicro = clampMicroShift(baseMicro + templateMs + swingMs);
      if (totalMicro !== (step.microShiftMs ?? 0)) {
        ops.push({ op: "SET_MICROSHIFT", laneId, stepIndex: i, microShiftMs: totalMicro });
      }
    }
  }

  return ops;
}
