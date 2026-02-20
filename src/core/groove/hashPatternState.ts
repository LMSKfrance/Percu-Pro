/**
 * Stable hash for pattern state (engine or store) to verify determinism.
 */

import type { PatternState as EnginePatternState, StepState } from "./types";

function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function stepSignature(s: StepState): string {
  return `${s.active ? 1 : 0},${s.velocity},${s.probability},${s.microShiftMs},${s.ratchetCount},${s.accent ? 1 : 0},${s.flam ? 1 : 0}`;
}

/**
 * Stable hash of engine PatternState. Same pattern => same hash.
 */
export function hashEnginePatternState(p: EnginePatternState): string {
  const parts: string[] = [];
  for (let c = 0; c < p.channels.length; c++) {
    parts.push(p.channels[c].id);
    const steps = p.steps[c] ?? [];
    for (let i = 0; i < steps.length; i++) {
      parts.push(stepSignature(steps[i]));
    }
  }
  const str = parts.join("|");
  return (hashString(str) >>> 0).toString(16);
}

/**
 * Hash store pattern (patternTypes) for determinism checks.
 */
export function hashStorePatternState(p: import("../patternTypes").PatternState): string {
  const parts: string[] = [];
  const laneIds = Object.keys(p.lanes).sort();
  for (const id of laneIds) {
    const lane = p.lanes[id as keyof typeof p.lanes];
    if (!lane) continue;
    parts.push(id);
    for (const s of lane.steps) {
      parts.push(`${s.on ? 1 : 0},${s.velocity},${s.probability},${s.microShiftMs},${s.accent ? 1 : 0}`);
    }
  }
  return (hashString(parts.join("|")) >>> 0).toString(16);
}
