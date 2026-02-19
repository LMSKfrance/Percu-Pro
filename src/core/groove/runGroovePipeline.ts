/**
 * Single entry: build context, resolve style, generate candidates, score, select.
 * Returns scored candidates (top 3 if Huckaby else top 1) and critique items.
 */

import type { PatternState } from "../patternTypes";
import { createInitialPatternState } from "../patternTypes";
import { resolveStyleVector } from "./style/resolveStyleVector";
import { generateCandidates } from "./generateCandidates";
import { selectCandidates } from "./selectCandidates";
import type { ScoredCandidate } from "./selectCandidates";

export interface RunGroovePipelineInput {
  seed: number;
  tempoBpm: number;
  cityProfile: string;
  influenceVector: string[];
  artistLenses: string[];
  mode: string;
  density: number;
  swingPct: number;
  pattern: PatternState | null | undefined;
}

export interface RunGroovePipelineResult {
  scoredCandidates: ScoredCandidate[];
  critiqueItems: { reason: string; message: string }[];
  unknownTags: string[];
}

export function runGroovePipeline(input: RunGroovePipelineInput): RunGroovePipelineResult {
  const pattern: PatternState =
    input.pattern ?? createInitialPatternState(input.tempoBpm, input.seed);

  const style = resolveStyleVector({
    cityProfile: input.cityProfile,
    influenceVector: input.influenceVector,
    artistLenses: input.artistLenses,
    mode: input.mode,
  });

  const critiqueItems: { reason: string; message: string }[] = [];
  for (const tag of style.unknownTags) {
    critiqueItems.push({ reason: "UNKNOWN_TAG", message: `Unknown tag: ${tag}` });
  }

  const candidates = generateCandidates({
    seed: input.seed,
    pattern,
    styleBiases: style.biases,
    artistLenses: input.artistLenses,
  });

  const scored = selectCandidates({
    pattern,
    candidates,
    styleBiases: style.biases,
    artistLenses: input.artistLenses,
  });

  return {
    scoredCandidates: scored,
    critiqueItems,
    unknownTags: style.unknownTags,
  };
}
