/**
 * Score a candidate patch by improved collisions, anchor clarity, harshness, style match.
 */

import type { PatternState } from "../../patternTypes";
import type { PatternPatchOp } from "../patchTypes";
import type { StyleBiases } from "../style/resolveStyleVector";
import { applyPatternPatch } from "../applyPatternPatch";
import { computeMetrics } from "./metrics";

export interface ScoreCandidateInput {
  pattern: PatternState;
  ops: PatternPatchOp[];
  styleBiases: StyleBiases;
}

export interface ScoreResult {
  score: number;
  collisionImprovement: number;
  anchorImprovement: number;
  harshnessImprovement: number;
  styleMatch: number;
}

export function scoreCandidate(input: ScoreCandidateInput): ScoreResult {
  const { pattern, ops, styleBiases } = input;
  const before = computeMetrics(pattern);
  const { nextPattern } = applyPatternPatch(pattern, ops);
  const after = computeMetrics(nextPattern);

  const collisionImprovement = Math.max(0, before.collisionRiskScore - after.collisionRiskScore);
  const anchorImprovement = Math.max(0, after.anchorClarity - before.anchorClarity);
  const harshnessImprovement = Math.max(0, before.harshnessRisk - after.harshnessRisk);

  let styleMatch = 0.5;
  if (styleBiases.densityBias < 0 && after.densityDetails.reduce((s, d) => s + d.density, 0) / 8 < 0.5)
    styleMatch += 0.1;
  if (styleBiases.accentSharpness > 0) styleMatch += 0.1;
  if (styleBiases.ghostProbBias > 0) styleMatch += 0.05;
  styleMatch = Math.min(1, styleMatch);

  const score =
    0.3 * (0.5 + collisionImprovement) +
    0.3 * (0.5 + anchorImprovement) +
    0.2 * (0.5 + harshnessImprovement) +
    0.2 * styleMatch;

  return {
    score: Math.max(0, Math.min(1, score)),
    collisionImprovement,
    anchorImprovement,
    harshnessImprovement,
    styleMatch,
  };
}
