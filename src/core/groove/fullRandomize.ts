/**
 * Deterministic full randomize: build patch ops only. No Math.random.
 * Uses patternTypes.PatchOp and applyPatternPatch in store.
 */

import type { TrackId } from "../types";
import type { PatternState, PatchOp } from "../patternTypes";
import { STEPS_PER_BAR } from "../patternTypes";
import { hashStringToSeed } from "../audio/rng";
import { mulberry32 } from "../audio/rng";

const TRACK_IDS: TrackId[] = ["kick", "snare", "hhc", "hho", "perc1", "perc2", "rim", "clap"];

const ANCHOR_LANES: Set<TrackId> = new Set(["kick"]);
const HAT_CLOSED: TrackId = "hhc";
const HAT_OPEN: TrackId = "hho";
const PERC_LANES: Set<TrackId> = new Set(["perc1", "perc2", "rim", "clap", "snare"]);

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export interface FullRandomizeOptions {
  unsafe?: boolean;
}

export function buildFullRandomizeOps(
  pattern: PatternState,
  baseSeed: number,
  options: FullRandomizeOptions = {}
): PatchOp[] {
  const unsafe = options.unsafe === true;
  const seed = hashStringToSeed("FULL_RANDOMIZE") ^ (baseSeed >>> 0);
  const rng = mulberry32(seed);
  const ops: PatchOp[] = [];

  // 1) Kick (ANCHOR): if !unsafe keep on/off, optionally velocity variation [0.85..1.0]
  const kickLane = pattern.lanes.kick;
  if (kickLane && !unsafe) {
    for (let i = 0; i < kickLane.steps.length; i++) {
      const s = kickLane.steps[i];
      if (!s.on) continue;
      const vel = 0.85 + rng() * 0.15;
      ops.push({ op: "SET_STEP", laneId: "kick", stepIndex: i, on: true, velocity: vel });
    }
  }
  if (kickLane && unsafe) {
    for (let i = 0; i < kickLane.steps.length; i++) {
      const on = i % 4 === 0 ? true : rng() < 0.25;
      const vel = on ? 0.85 + rng() * 0.15 : 0.8;
      ops.push({ op: "SET_STEP", laneId: "kick", stepIndex: i, on, velocity: vel, probability: 1, microShiftMs: 0, accent: false });
    }
  }

  // 2) Hats: hhc velocity/prob contour; hho sparse, no adjacent opens
  const hhc = pattern.lanes.hhc;
  if (hhc) {
    for (let i = 0; i < hhc.steps.length; i++) {
      const on = hhc.steps[i].on;
      const vel = on ? clamp(0.4 + rng() * 0.6, 0.25, 1) : 0.8;
      const prob = on ? clamp(0.7 + rng() * 0.3, 0.5, 1) : 1;
      ops.push({ op: "SET_STEP", laneId: "hhc", stepIndex: i, on, velocity: vel, probability: prob, microShiftMs: 0, accent: false });
    }
  }
  const hho = pattern.lanes.hho;
  if (hho) {
    const noAdjacent = [0, 2, 4, 6, 8, 10, 12, 14];
    const nOpen = Math.floor(rng() * 3) + 1;
    const opens: number[] = [];
    const pool = [...noAdjacent];
    for (let k = 0; k < nOpen && pool.length > 0; k++) {
      const idx = Math.floor(rng() * pool.length);
      opens.push(pool.splice(idx, 1)[0]);
    }
    for (let i = 0; i < 16; i++) {
      const on = opens.includes(i);
      const vel = on ? 0.6 + rng() * 0.4 : 0.8;
      ops.push({ op: "SET_STEP", laneId: "hho", stepIndex: i, on, velocity: vel, probability: 1, microShiftMs: 0, accent: false });
    }
  }

  // 3) Perc lanes: randomize on/off, velocity, probability, microShift, optional playStartOffset
  for (const laneId of ["snare", "clap", "rim", "perc1", "perc2"] as TrackId[]) {
    const lane = pattern.lanes[laneId];
    if (!lane) continue;
    const density = 0.2 + rng() * 0.4;
    for (let i = 0; i < lane.steps.length; i++) {
      const on = rng() < density;
      const vel = on ? clamp(0.25 + rng() * 0.75, 0.25, 1) : 0.8;
      const prob = on ? (rng() < 0.5 ? 0.25 + rng() * 0.25 : 0.75 + rng() * 0.25) : 1;
      const microShiftMs = on ? Math.floor(-12 + rng() * 24) : 0;
      ops.push({
        op: "SET_STEP",
        laneId,
        stepIndex: i,
        on,
        velocity: clamp(vel, 0.25, 1),
        probability: clamp(prob, 0, 1),
        microShiftMs: clamp(microShiftMs, -18, 18),
        accent: false,
      });
    }
    if (rng() < 0.3) {
      const offset = Math.floor(rng() * STEPS_PER_BAR);
      ops.push({ op: "SET_LANE_START", laneId, playStartOffsetSteps: offset });
    }
  }

  // 4) Collision reduction: if >3 strong hits at same step, reduce/clear
  const stepCount: number[] = new Array(16).fill(0);
  const stepVelocities: { laneId: TrackId; stepIndex: number; velocity: number }[] = [];
  for (const op of ops) {
    if (op.op === "SET_STEP" && op.on && op.velocity !== undefined && op.velocity > 0.65) {
      stepCount[op.stepIndex]++;
      stepVelocities.push({ laneId: op.laneId, stepIndex: op.stepIndex, velocity: op.velocity });
    }
  }
  for (let s = 0; s < 16; s++) {
    if (stepCount[s] <= 3) continue;
    const atStep = stepVelocities.filter((v) => v.stepIndex === s);
    atStep.sort((a, b) => a.velocity - b.velocity);
    const toReduce = atStep.slice(0, atStep.length - 3);
    for (const { laneId, stepIndex, velocity } of toReduce) {
      if (ANCHOR_LANES.has(laneId)) continue;
      const newVel = velocity * 0.5;
      if (newVel < 0.3) {
        ops.push({ op: "CLEAR_STEP", laneId, stepIndex });
      } else {
        ops.push({ op: "SET_STEP", laneId, stepIndex, on: true, velocity: newVel });
      }
    }
  }

  return ops;
}
