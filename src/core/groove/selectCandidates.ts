/**
 * If Huckaby lens: return top 3 candidates; else top 1.
 */

import type { PatternState } from "../patternTypes";
import type { PatternPatchOp } from "./patchTypes";
import type { StyleBiases } from "./style/resolveStyleVector";
import type { Candidate } from "./generateCandidates";
import { scoreCandidate } from "./critique/scoreCandidate";

export interface SelectCandidatesInput {
  pattern: PatternState;
  candidates: Candidate[];
  styleBiases: StyleBiases;
  artistLenses: string[];
}

export interface ScoredCandidate {
  id: string;
  label: string;
  ops: PatternPatchOp[];
  score: number;
}

export function selectCandidates(input: SelectCandidatesInput): ScoredCandidate[] {
  const { pattern, candidates, styleBiases, artistLenses } = input;
  const huckaby = artistLenses.some((l) => l.toLowerCase() === "huckaby");

  const scored: ScoredCandidate[] = candidates.map((c) => {
    const result = scoreCandidate({ pattern, ops: c.ops, styleBiases });
    return { id: c.id, label: c.label, ops: c.ops, score: result.score };
  });

  scored.sort((a, b) => b.score - a.score);
  return huckaby ? scored.slice(0, 3) : scored.slice(0, 1);
}
