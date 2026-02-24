/**
 * Fine analysis on trimmed fragment: onset detection at original sample rate,
 * then groove template (per-16th timing offset in ms and accent strength).
 */

/** 16th-note steps per bar for groove template */
export const GROOVE_STEPS = 16;

/** Hop for onset detection (samples); ~5 ms at 44.1k */
const ONSET_HOP = 256;

/** Window length for energy/onset (samples) */
const ONSET_WIN = 512;

export interface GrooveTemplate {
  /** Per-step timing offset in ms (positive = late, negative = early) */
  offsetsMs: number[];
  /** Per-step accent strength 0..1 */
  accents: number[];
  /** Detected or override BPM */
  bpm: number;
  /** Confidence 0..1 */
  bpmConfidence: number;
  /** Number of onsets found in fragment */
  onsetCount: number;
  /** Bar length used (2, 4, or 8) for grid */
  barLength: number;
}

/**
 * Extract mono Float32Array for a slice of the buffer (startSec to endSec).
 */
function getFragmentMono(buffer: AudioBuffer, startSec: number, endSec: number): Float32Array {
  const sr = buffer.sampleRate;
  const startSample = Math.floor(startSec * sr);
  const endSample = Math.floor(endSec * sr);
  const length = endSample - startSample;
  if (length <= 0) return new Float32Array(0);
  const numCh = buffer.numberOfChannels;
  const out = new Float32Array(length);
  for (let ch = 0; ch < numCh; ch++) {
    const chData = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) out[i] += chData[startSample + i] ?? 0;
  }
  const scale = 1 / numCh;
  for (let i = 0; i < length; i++) out[i] *= scale;
  return out;
}

/**
 * Simple onset strength: rectified energy rise (no FFT). Returns strength per hop.
 */
function onsetStrength(mono: Float32Array, sampleRate: number): { strength: Float32Array; hopSec: number } {
  const hopSec = ONSET_HOP / sampleRate;
  const numFrames = Math.floor((mono.length - ONSET_WIN) / ONSET_HOP) + 1;
  const energy = new Float32Array(numFrames);
  const window = new Float32Array(ONSET_WIN);
  for (let i = 0; i < ONSET_WIN; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (ONSET_WIN - 1)));
  }
  for (let f = 0; f < numFrames; f++) {
    const start = f * ONSET_HOP;
    let sumSq = 0;
    for (let i = 0; i < ONSET_WIN; i++) {
      const s = (mono[start + i] ?? 0) * window[i];
      sumSq += s * s;
    }
    energy[f] = Math.sqrt(sumSq / ONSET_WIN);
  }
  const strength = new Float32Array(numFrames);
  let maxStr = 0;
  for (let f = 1; f < numFrames; f++) {
    const rise = Math.max(0, energy[f] - energy[f - 1]);
    strength[f] = rise;
    if (rise > maxStr) maxStr = rise;
  }
  if (maxStr > 0) {
    for (let f = 0; f < numFrames; f++) strength[f] /= maxStr;
  }
  return { strength, hopSec };
}

/**
 * Peak-pick onsets: time in seconds (relative to fragment start) and strength.
 */
function pickOnsets(
  strength: Float32Array,
  hopSec: number,
  threshold: number
): { timeSec: number; strength: number }[] {
  const peaks: { timeSec: number; strength: number }[] = [];
  const radius = 2;
  for (let i = radius; i < strength.length - radius; i++) {
    if (strength[i]! < threshold) continue;
    let isMax = true;
    for (let r = -radius; r <= radius; r++) {
      if (r !== 0 && (strength[i + r] ?? 0) > (strength[i] ?? 0)) {
        isMax = false;
        break;
      }
    }
    if (isMax) peaks.push({ timeSec: i * hopSec, strength: strength[i]! });
  }
  return peaks;
}

/**
 * Extract groove template from fragment. Uses bpmOverride if provided, else estimated from onsets.
 * barLength is number of bars in the fragment (2, 4, or 8); grid is 16th notes over the fragment.
 */
export function extractGroove(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
  barLength: number,
  bpmOverride?: number
): GrooveTemplate {
  const fragmentDuration = endSec - startSec;
  const mono = getFragmentMono(buffer, startSec, endSec);
  const sampleRate = buffer.sampleRate;
  const { strength, hopSec } = onsetStrength(mono, sampleRate);
  const onsets = pickOnsets(strength, hopSec, 0.12);

  // Estimate BPM from inter-onset intervals if no override
  let bpm = bpmOverride ?? 120;
  let bpmConfidence = 0.5;
  if (!bpmOverride && onsets.length >= 4) {
    const beatPeriodSec = 60 / 120;
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i].timeSec - onsets[i - 1].timeSec);
    }
    const median = [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)]!;
    if (median > 0) {
      const estimatedBpm = 60 / median;
      bpm = Math.max(80, Math.min(180, estimatedBpm));
      bpmConfidence = 0.7;
    }
  }

  // One bar in seconds (4 beats)
  const barSec = 4 * (60 / bpm);
  const stepSec = barSec / GROOVE_STEPS;
  const totalSteps = barLength * GROOVE_STEPS;

  const offsetsMs: number[] = new Array(GROOVE_STEPS).fill(0);
  const accentSums: number[] = new Array(GROOVE_STEPS).fill(0);
  const counts: number[] = new Array(GROOVE_STEPS).fill(0);

  for (const o of onsets) {
    const timeInFragment = o.timeSec;
    const stepIndex = Math.floor(timeInFragment / stepSec) % GROOVE_STEPS;
    const gridTime = stepIndex * stepSec;
    const offsetSec = timeInFragment - gridTime;
    const offsetMs = offsetSec * 1000;
    offsetsMs[stepIndex] += offsetMs;
    accentSums[stepIndex] += o.strength;
    counts[stepIndex]++;
  }

  for (let i = 0; i < GROOVE_STEPS; i++) {
    if (counts[i]! > 0) {
      offsetsMs[i] = offsetsMs[i]! / counts[i]!;
      accentSums[i] = accentSums[i]! / counts[i]!;
    }
  }

  const maxAccent = Math.max(...accentSums, 0.001);
  const accents = accentSums.map((a) => Math.min(1, a / maxAccent));

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.log("[grooveExtract] onsets:", onsets.length, "offsets length:", offsetsMs.length, "accents length:", accents.length);
  }

  return {
    offsetsMs,
    accents,
    bpm,
    bpmConfidence,
    onsetCount: onsets.length,
    barLength,
  };
}
