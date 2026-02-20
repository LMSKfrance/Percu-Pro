/**
 * Deterministic pattern mutation: controlled chaos. No Math.random.
 */

import type { PatchOp } from "../patternTypes";
import type { PatternState } from "../patternTypes";
import type { TrackId } from "../types";
import { STEPS_PER_BAR } from "../patternTypes";
import { mulberry32, hashStringToSeed, nextInt } from "./rng";

const TRACK_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];
const PERC_LANES: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "subPerc", "chord"];
const ANCHOR_LANES: Set<TrackId> = new Set(["kick"]);

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Apply a controlled mutation pass. Same seed + intensity => same result.
 */
export function mutatePattern(
  pattern: PatternState,
  seed: number,
  intensity: number
): PatchOp[] {
  const rng = mulberry32(hashStringToSeed(`mutate-${seed}-${intensity}`));
  const ops: PatchOp[] = [];

  const numMutations = 2 + Math.floor(intensity * 6);

  for (let m = 0; m < numMutations; m++) {
    const laneId = TRACK_IDS[nextInt(rng, TRACK_IDS.length)];
    const lane = pattern.lanes[laneId];
    if (!lane) continue;

    const stepIndex = nextInt(rng, lane.steps.length);
    const step = lane.steps[stepIndex];

    const action = nextInt(rng, ANCHOR_LANES.has(laneId) ? 2 : 4);
    if (action === 0 && !ANCHOR_LANES.has(laneId)) {
      ops.push({ op: "SET_STEP", laneId, stepIndex, on: !step.on, velocity: step.velocity, probability: step.probability, microShiftMs: step.microShiftMs, accent: step.accent });
    } else if (action === 1) {
      const delta = (rng() - 0.5) * 0.3 * intensity;
      const vel = clamp((step.velocity ?? 0.8) + delta, 0.2, 1);
      ops.push({ op: "SET_VELOCITY", laneId, stepIndex, velocity: vel });
    } else if (action === 2 && PERC_LANES.includes(laneId)) {
      const delta = (rng() - 0.5) * 0.2 * intensity;
      const prob = clamp((step.probability ?? 1) + delta, 0.2, 1);
      ops.push({ op: "SET_PROB", laneId, stepIndex, probability: prob });
    } else if (action === 3 && PERC_LANES.includes(laneId)) {
      const micro = clamp(Math.round((rng() - 0.5) * 24 * intensity), -18, 18);
      ops.push({ op: "SET_MICROSHIFT", laneId, stepIndex, microShiftMs: micro });
    }
  }

  return ops;
}
