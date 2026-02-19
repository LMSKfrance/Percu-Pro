/**
 * Lookahead scheduler for 16th-note steps. Deterministic probability via seeded RNG.
 */

import { mulberry32, hashStringToSeed } from "./rng";
import type { PatternState } from "../patternTypes";
import type { TrackId } from "../types";
import type { AppState } from "../types";
import { STEPS_PER_BAR } from "../patternTypes";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;

export type GetState = () => AppState;

export type TriggerStepFn = (
  laneId: TrackId,
  stepIndex: number,
  timeSec: number,
  velocity: number,
  accent: boolean
) => void;

export type GetAudioTime = () => number;

let schedulerId: number | null = null;
let running = false;

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

export function startScheduler(
  getState: GetState,
  getAudioTime: GetAudioTime,
  triggerStep: TriggerStepFn
): void {
  if (running) return;
  running = true;

  const state = getState();
  const pattern = state.pattern;
  const bpm = state.transport?.bpm ?? 120;
  const isLooping = state.transport?.isLooping !== false;

  if (!pattern?.lanes) {
    running = false;
    return;
  }

  const stepDurSec = 60 / bpm / 4;
  const lookaheadSec = LOOKAHEAD_MS / 1000;
  let nextStepTime = getAudioTime();
  let stepIndex = 0;
  let barIndex = 0;
  const seedBase = pattern.seed ?? 42;

  function tick() {
    const state = getState();
    if (!state.transport?.isPlaying) {
      running = false;
      if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
        console.log("[Percu Pro audio] scheduler stopped");
      }
      return;
    }

    const pattern = state.pattern;
    const bpm = state.transport.bpm;
    const stepDur = 60 / bpm / 4;
    const currentTime = getAudioTime();

    while (nextStepTime < currentTime + SCHEDULE_AHEAD_SEC) {
      const stepTime = nextStepTime;
      const laneIds = Object.keys(pattern?.lanes ?? {}) as TrackId[];

      for (const laneId of laneIds) {
        const lane = pattern?.lanes[laneId];
        if (!lane) continue;

        const offset = lane.playStartOffsetSteps ?? 0;
        const localIndex = (stepIndex - offset + STEPS_PER_BAR * 16) % STEPS_PER_BAR;
        const step = lane.steps[localIndex];
        if (!step || !step.on) continue;

        const prob = step.probability ?? 1;
        if (prob < 1) {
          const rng = mulberry32(
            hashStringToSeed(`${seedBase}-${barIndex}-${laneId}-${stepIndex}`)
          );
          if (rng() > prob) continue;
        }

        const globalSwing = pattern?.swingPct ?? 50;
        const laneSwing = lane.laneSwingPct ?? globalSwing;
        const effectiveSwing = (globalSwing + laneSwing) / 2;
        const swingAmount = clamp((effectiveSwing - 50) / 100, 0, 0.12);
        const swingDelaySec = swingAmount * stepDur;
        const isOddStep = stepIndex % 2 === 1;
        const microShiftSec = ((step.microShiftMs ?? 0) / 1000);
        let t = stepTime + microShiftSec;
        if (isOddStep) t += swingDelaySec;

        triggerStep(laneId, stepIndex, t, step.velocity ?? 0.8, step.accent ?? false);
      }

      if (typeof import.meta !== "undefined" && import.meta.env?.DEV && stepIndex % 8 === 0) {
        console.log("[Percu Pro audio] scheduled step", stepIndex);
      }

      stepIndex++;
      nextStepTime += stepDur;
      if (stepIndex >= STEPS_PER_BAR) {
        stepIndex = 0;
        barIndex++;
        if (!isLooping) {
          running = false;
          return;
        }
      }
    }

    schedulerId = window.setTimeout(tick, lookaheadSec * 1000);
  }

  tick();
}

export function stopScheduler(): void {
  running = false;
  if (schedulerId !== null) {
    clearTimeout(schedulerId);
    schedulerId = null;
  }
}
