/**
 * Generator wrapper: always produces a REPLACE patch (clear all steps then generator ops)
 * so the sequencer is never "overlaid" unless MUTATE mode is explicitly enabled.
 * Handles Surgeon (role on SET_STEP), Mills (density reduction), Huckaby (top3).
 */

import type { TrackId } from "../types";
import type { PatternState, PatchOp, LaneRole } from "../patternTypes";
import { STEPS_PER_BAR, applyPatternPatch } from "../patternTypes";
import { generate, type GeneratorInput, type GeneratorOutput } from "../algorithm/generator";
import type { GrooveCandidate } from "../types";

const LANE_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];

export interface GenerateGrooveResult {
  replacePatchOps: PatchOp[];
  critique: { reason: string; message: string }[];
  opCount: number;
  top3: GrooveCandidate[] | null;
}

/**
 * Build a REPLACE patch: clear every step of every lane, then append generator ops.
 * If Surgeon: ensure every SET_STEP has role (lane.role or TEXTURE).
 * If Mills: reduce density by clearing extra hits (highest stepIndex first).
 * If Huckaby: return top3 for UI; best candidate is already in patternPatch.
 */
export function generateGroove(
  input: GeneratorInput,
  currentPattern: PatternState
): GenerateGrooveResult {
  const result = generate(input);

  // 1) Clear every step for every lane (REPLACE, not overlay)
  const clearOps: PatchOp[] = [];
  for (const laneId of LANE_IDS) {
    if (!currentPattern.lanes[laneId]) continue;
    for (let stepIndex = 0; stepIndex < STEPS_PER_BAR; stepIndex++) {
      clearOps.push({ op: "CLEAR_STEP", laneId, stepIndex });
    }
  }

  // 2) Generator ops (best candidate when Huckaby)
  let generatorOps = result.patternPatch;

  // 3) Surgeon: ensure every SET_STEP has role
  if (input.artistLenses.includes("Surgeon")) {
    generatorOps = generatorOps.map((op): PatchOp => {
      if (op.op !== "SET_STEP") return op;
      const role = op.role ?? currentPattern.lanes[op.laneId]?.role ?? "TEXTURE";
      return { ...op, role };
    });
  }

  const replacePatchOps: PatchOp[] = [...clearOps, ...generatorOps];

  // 4) Mills: reduce density by clearing extra hits (deterministic: highest stepIndex first)
  if (input.artistLenses.includes("Mills")) {
    const afterClear = applyPatternPatch(currentPattern, replacePatchOps);
    const seed = input.seed;
    const millsClearOps: PatchOp[] = [];
    const maxStepsPerLane = 6;

    for (const laneId of LANE_IDS) {
      const lane = afterClear.lanes[laneId];
      if (!lane) continue;
      const onIndices = lane.steps
        .map((s, i) => (s.on ? i : -1))
        .filter((i) => i >= 0);
      if (onIndices.length <= maxStepsPerLane) continue;
      // Sort descending by stepIndex (clear highest first), then deterministic order via hash
      onIndices.sort((a, b) => b - a);
      const toRemove = onIndices.length - maxStepsPerLane;
      for (let i = 0; i < toRemove; i++) {
        const stepIndex = onIndices[i];
        millsClearOps.push({ op: "CLEAR_STEP", laneId, stepIndex });
      }
    }
    replacePatchOps.push(...millsClearOps);
  }

  // 5) Huckaby: map candidates to GrooveCandidate for top3
  let top3: GrooveCandidate[] | null = null;
  if (result.candidates && result.candidates.length > 0) {
    top3 = result.candidates.map((c, i) => ({
      id: `cand-${i}`,
      label: `Candidate ${i + 1}`,
      ops: c.patternPatch,
    }));
  }

  const critique = result.critique.map((c) => ({ reason: c.reason, message: c.message }));

  return {
    replacePatchOps,
    critique,
    opCount: replacePatchOps.length,
    top3,
  };
}
