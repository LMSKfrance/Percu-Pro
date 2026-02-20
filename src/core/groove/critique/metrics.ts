/**
 * Kintu-style critique metrics on the actual pattern model.
 * Normalized 0..1 plus offending step/lane details.
 */

import type { TrackId } from "../../types";
import type { PatternState, LaneState, StepData } from "../../patternTypes";
import { STEPS_PER_BAR } from "../../patternTypes";

const TRACK_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];
const STRONG_VELOCITY = 0.65;
const ANCHOR_LANES: Set<TrackId> = new Set(["kick", "noise"]);
const HAT_LANES: Set<TrackId> = new Set(["noise"]);

export interface DensityDetail {
  laneId: TrackId;
  density: number;
  stepCount: number;
}

export interface CollisionDetail {
  stepIndex: number;
  strongCount: number;
  laneIds: TrackId[];
}

export interface HarshnessDetail {
  laneId: TrackId;
  density: number;
  avgVelocity: number;
  risk: number;
}

export interface AnchorClarityDetail {
  kickOnFours: boolean;
  kickStepCount: number;
  maskedSteps: number[];
}

export interface PatternMetrics {
  densityPerLane: Record<TrackId, number>;
  densityDetails: DensityDetail[];
  collisionRiskScore: number;
  collisionDetails: CollisionDetail[];
  harshnessRisk: number;
  harshnessDetails: HarshnessDetail[];
  anchorClarity: number;
  anchorDetails: AnchorClarityDetail;
}

function stepDensity(lane: LaneState): number {
  const on = lane.steps.filter((s) => s.on).length;
  return on / lane.steps.length;
}

export function computeMetrics(pattern: PatternState): PatternMetrics {
  const densityPerLane: Record<TrackId, number> = {} as Record<TrackId, number>;
  const densityDetails: DensityDetail[] = [];
  for (const id of TRACK_IDS) {
    const lane = pattern.lanes[id];
    if (!lane) continue;
    const d = stepDensity(lane);
    densityPerLane[id] = d;
    densityDetails.push({ laneId: id, density: d, stepCount: lane.steps.filter((s) => s.on).length });
  }

  const collisionDetails: CollisionDetail[] = [];
  let collisionSum = 0;
  for (let stepIndex = 0; stepIndex < STEPS_PER_BAR; stepIndex++) {
    const strong: TrackId[] = [];
    for (const id of TRACK_IDS) {
      const lane = pattern.lanes[id];
      if (!lane) continue;
      const step = lane.steps[stepIndex];
      if (step?.on && step.velocity > STRONG_VELOCITY) strong.push(id);
    }
    const count = strong.length;
    if (count > 3) {
      collisionDetails.push({ stepIndex, strongCount: count, laneIds: strong });
      collisionSum += (count - 3) / 4;
    }
  }
  const collisionRiskScore = Math.min(1, collisionSum / 4);

  const harshnessDetails: HarshnessDetail[] = [];
  let harshnessSum = 0;
  for (const id of HAT_LANES) {
    const lane = pattern.lanes[id];
    if (!lane) continue;
    const onSteps = lane.steps.filter((s) => s.on);
    const density = onSteps.length / lane.steps.length;
    const avgVel = onSteps.length ? onSteps.reduce((a, s) => a + s.velocity, 0) / onSteps.length : 0;
    const risk = density * avgVel;
    harshnessDetails.push({ laneId: id, density, avgVelocity: avgVel, risk });
    harshnessSum += risk;
  }
  const harshnessRisk = Math.min(1, harshnessSum / 2);

  let anchorClarity = 1;
  const kickLane = pattern.lanes.kick;
  const kickOnFours = kickLane
    ? [0, 4, 8, 12].every((i) => kickLane.steps[i]?.on)
    : false;
  const kickStepCount = kickLane ? kickLane.steps.filter((s) => s.on).length : 0;
  const maskedSteps: number[] = [];
  if (kickLane) {
    for (let i = 0; i < STEPS_PER_BAR; i++) {
      if (!kickLane.steps[i]?.on) continue;
      let maskCount = 0;
      for (const id of TRACK_IDS) {
        if (id === "kick") continue;
        const lane = pattern.lanes[id];
        if (lane?.steps[i]?.on && lane.steps[i].velocity > 0.7) maskCount++;
      }
      if (maskCount >= 2) maskedSteps.push(i);
    }
  }
  if (!kickOnFours || kickStepCount < 2) anchorClarity -= 0.3;
  if (maskedSteps.length > 0) anchorClarity -= Math.min(0.3, maskedSteps.length * 0.1);
  anchorClarity = Math.max(0, anchorClarity);

  const anchorDetails: AnchorClarityDetail = {
    kickOnFours,
    kickStepCount,
    maskedSteps,
  };

  return {
    densityPerLane,
    densityDetails,
    collisionRiskScore,
    collisionDetails,
    harshnessRisk,
    harshnessDetails,
    anchorClarity,
    anchorDetails,
  };
}
