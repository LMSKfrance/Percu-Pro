/**
 * Coarse scan: compute features over downmixed/downsampled mono and propose
 * 6 candidate loop regions (2, 4, 8 bars). Techno-oriented loopability scoring.
 */

/** Hop size in samples for frame-based analysis (≈23 ms at 11025 Hz) */
const HOP_SIZE = 256;

/** Frame length for FFT/energy (power of 2) */
const FRAME_LEN = 512;

/** Min BPM for tempo search */
const MIN_BPM = 80;

/** Max BPM for tempo search */
const MAX_BPM = 180;

/** Weights for loopability score: repetition, tempoStability, onsetDensity, novelty (negative) */
const W_REP = 0.35;
const W_TEMPO = 0.25;
const W_DENSITY = 0.25;
const W_NOVELTY = -0.15;

export type BarLength = 2 | 4 | 8;

export interface LoopCandidate {
  startSec: number;
  endSec: number;
  barLength: BarLength;
  label: string;
  /** 0..1, higher = better loop */
  score: number;
  /** Estimated BPM for this region (coarse) */
  bpmEstimate: number;
}

export interface ScanResult {
  /** Global tempo estimate from full track */
  bpmEstimate: number;
  /** Confidence 0..1 */
  bpmConfidence: number;
  candidates: LoopCandidate[];
}

/**
 * Compute frame-wise energy (RMS squared) and simple spectral flux (sum of rectified diff of magnitudes).
 * Uses a minimal FFT (real input) for spectral flux; fallback is energy-diff onset.
 */
function computeOnsetStrength(mono: Float32Array, sampleRate: number): Float32Array {
  const numFrames = Math.floor((mono.length - FRAME_LEN) / HOP_SIZE) + 1;
  const energy = new Float32Array(numFrames);
  const flux = new Float32Array(numFrames);

  // Hann window for framing
  const window = new Float32Array(FRAME_LEN);
  for (let i = 0; i < FRAME_LEN; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME_LEN - 1)));
  }

  // Simple FFT size (power of 2 >= FRAME_LEN)
  const fftSize = 512;
  const halfN = fftSize / 2;
  const prevMagnitudes = new Float32Array(halfN);

  for (let f = 0; f < numFrames; f++) {
    const start = f * HOP_SIZE;
    let sumSq = 0;
    for (let i = 0; i < FRAME_LEN; i++) {
      const s = (mono[start + i] ?? 0) * window[i];
      sumSq += s * s;
    }
    energy[f] = Math.sqrt(sumSq / FRAME_LEN);

    // Magnitude spectrum via DFT at halfN bins (coarse but fast)
    let fluxSum = 0;
    for (let k = 0; k < halfN; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < FRAME_LEN; n++) {
        const angle = (2 * Math.PI * k * n) / fftSize;
        const s = (mono[start + n] ?? 0) * window[n];
        re += s * Math.cos(angle);
        im -= s * Math.sin(angle);
      }
      const mag = Math.sqrt(re * re + im * im);
      fluxSum += Math.max(0, mag - prevMagnitudes[k]);
      prevMagnitudes[k] = mag;
    }
    flux[f] = fluxSum / halfN;
  }

  // Onset strength = weighted combo of energy rise and flux (normalize roughly 0..1)
  const onset = new Float32Array(numFrames);
  let maxOnset = 0;
  for (let f = 1; f < numFrames; f++) {
    const energyRise = Math.max(0, energy[f] - energy[f - 1]);
    const o = 0.6 * flux[f] + 0.4 * energyRise;
    onset[f] = o;
    if (o > maxOnset) maxOnset = o;
  }
  if (maxOnset > 0) {
    for (let f = 0; f < numFrames; f++) onset[f] /= maxOnset;
  }
  return onset;
}

/**
 * Estimate tempo (BPM) via autocorrelation on onset strength. Returns BPM and confidence.
 */
function estimateTempo(onset: Float32Array, sampleRate: number): { bpm: number; confidence: number } {
  const hopSec = HOP_SIZE / sampleRate;
  const minLagFrames = Math.floor(60 / (MAX_BPM * hopSec / 60)); // one beat at max BPM
  const maxLagFrames = Math.ceil(60 / (MIN_BPM * hopSec / 60));  // one beat at min BPM
  const len = onset.length;
  let bestLag = minLagFrames;
  let bestCorr = -1;

  for (let lag = minLagFrames; lag <= Math.min(maxLagFrames, len / 2); lag++) {
    let sum = 0;
    let norm = 0;
    for (let i = lag; i < len; i++) {
      sum += onset[i] * onset[i - lag];
      norm += onset[i] * onset[i];
    }
    const corr = norm > 0 ? sum / Math.sqrt(norm * (norm + 1e-10)) : 0;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  // Beat period in seconds (one quarter note)
  const beatPeriodSec = bestLag * hopSec;
  const bpm = beatPeriodSec > 0 ? 60 / beatPeriodSec : 120;
  const clampedBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
  const confidence = Math.max(0, Math.min(1, bestCorr * 1.2));
  return { bpm: clampedBpm, confidence };
}

/**
 * Get onset times (frame indices) by peak-picking on onset strength (threshold + local max).
 */
function getOnsetFrames(onset: Float32Array, threshold: number): number[] {
  const peaks: number[] = [];
  const radius = 3;
  for (let i = radius; i < onset.length - radius; i++) {
    if (onset[i] < threshold) continue;
    let isMax = true;
    for (let r = -radius; r <= radius; r++) {
      if (r !== 0 && (onset[i + r] ?? 0) > onset[i]) {
        isMax = false;
        break;
      }
    }
    if (isMax) peaks.push(i);
  }
  return peaks;
}

/**
 * Score a window: repetition (first half vs second half correlation), tempo stability, onset density, novelty.
 */
function scoreWindow(
  mono: Float32Array,
  onset: Float32Array,
  onsetFrames: number[],
  sampleRate: number,
  bpm: number,
  startFrame: number,
  endFrame: number
): { repetition: number; tempoStability: number; onsetDensity: number; novelty: number } {
  const hopSec = HOP_SIZE / sampleRate;
  const numFrames = endFrame - startFrame;
  const half = Math.floor(numFrames / 2);

  // Repetition: correlate first half vs second half of energy in window
  let repSum = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < half; i++) {
    const a = onset[startFrame + i] ?? 0;
    const b = onset[startFrame + half + i] ?? 0;
    repSum += a * b;
    normA += a * a;
    normB += b * b;
  }
  const repetition = normA > 0 && normB > 0 ? repSum / (Math.sqrt(normA * normB) + 1e-10) : 0;
  const repetitionNorm = (repetition + 1) / 2;

  // Onsets in window
  const windowOnsets = onsetFrames.filter((f) => f >= startFrame && f < endFrame);
  const windowSec = numFrames * hopSec;
  const bars = windowSec / (4 * (60 / bpm));
  const onsetDensity = bars > 0 ? windowOnsets.length / bars : 0;
  const onsetDensityNorm = Math.min(1, onsetDensity / 8);

  // Tempo stability: variance of inter-onset intervals (in beats)
  const beatPeriodFrames = (60 / bpm) / hopSec;
  let ioiVariance = 1;
  if (windowOnsets.length >= 3) {
    const intervals: number[] = [];
    for (let i = 1; i < windowOnsets.length; i++) {
      intervals.push((windowOnsets[i] - windowOnsets[i - 1]) / beatPeriodFrames);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((s, x) => s + (x - mean) ** 2, 0) / intervals.length;
    ioiVariance = Math.max(0.01, variance);
  }
  const tempoStability = 1 / (1 + ioiVariance);

  // Novelty: high change inside window (we want low novelty for loopability)
  let noveltySum = 0;
  for (let i = startFrame + 1; i < endFrame; i++) {
    noveltySum += Math.abs((onset[i] ?? 0) - (onset[i - 1] ?? 0));
  }
  const novelty = Math.min(1, (noveltySum / numFrames) * 2);

  return {
    repetition: repetitionNorm,
    tempoStability,
    onsetDensity: onsetDensityNorm,
    novelty,
  };
}

/**
 * Coarse scan: from mono downsampled buffer and duration, compute BPM and 6 loop candidates.
 */
export function runCoarseScan(
  monoDownsampled: Float32Array,
  sampleRate: number,
  durationSec: number,
  onProgress?: (pct: number) => void
): ScanResult {
  onProgress?.(0.1);
  const onset = computeOnsetStrength(monoDownsampled, sampleRate);
  onProgress?.(0.3);
  const { bpm, confidence } = estimateTempo(onset, sampleRate);
  const onsetFrames = getOnsetFrames(onset, 0.15);
  onProgress?.(0.5);

  const hopSec = HOP_SIZE / sampleRate;
  const frameToSec = (f: number) => f * hopSec;
  const secToFrame = (s: number) => Math.floor(s / hopSec);
  const barSec = 4 * (60 / bpm);
  const barLengths: BarLength[] = [2, 4, 8];

  interface ScoredWindow {
    startSec: number;
    endSec: number;
    barLength: BarLength;
    score: number;
    repetition: number;
    tempoStability: number;
    onsetDensity: number;
    novelty: number;
    energy: number;
  }

  const scored: ScoredWindow[] = [];
  const totalSteps = barLengths.length * Math.max(1, Math.floor(durationSec / barSec));
  let step = 0;

  for (const bars of barLengths) {
    const windowSec = bars * barSec;
    const windowFrames = Math.floor(windowSec / hopSec);
    const stepFrames = Math.max(1, Math.floor(windowFrames / 2));
    for (let startFrame = 0; startFrame + windowFrames <= onset.length; startFrame += stepFrames) {
      const endFrame = startFrame + windowFrames;
      const startSec = frameToSec(startFrame);
      const endSec = frameToSec(endFrame);
      if (endSec > durationSec) break;

      const s = scoreWindow(
        monoDownsampled,
        onset,
        onsetFrames,
        sampleRate,
        bpm,
        startFrame,
        endFrame
      );
      const score =
        W_REP * s.repetition +
        W_TEMPO * s.tempoStability +
        W_DENSITY * s.onsetDensity +
        W_NOVELTY * s.novelty;
      const energy = 0; // optional: average energy in window
      scored.push({
        startSec,
        endSec,
        barLength: bars,
        score: Math.max(0, score),
        ...s,
        energy,
      });
      step++;
      if (step % 20 === 0) onProgress?.(0.5 + (0.4 * step) / totalSteps);
    }
  }
  onProgress?.(0.9);

  // Top 2 per bar length, then dedupe by overlap, keep 6
  const byBar = new Map<BarLength, ScoredWindow[]>();
  for (const bar of barLengths) {
    const list = scored
      .filter((w) => w.barLength === bar)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    byBar.set(bar, list);
  }
  const top6: ScoredWindow[] = [];
  for (const bar of barLengths) {
    top6.push(...(byBar.get(bar) ?? []));
  }
  top6.sort((a, b) => b.score - a.score);
  const deduped: ScoredWindow[] = [];
  for (const w of top6) {
    const overlaps = deduped.some(
      (d) =>
        (w.startSec >= d.startSec && w.startSec < d.endSec) ||
        (w.endSec > d.startSec && w.endSec <= d.endSec)
    );
    if (!overlaps) deduped.push(w);
    if (deduped.length >= 6) break;
  }
  const final = deduped.slice(0, 6);

  // Assign labels: one per candidate (Most loopable, Most percussive, Tightest tempo, etc.)
  const byRep = [...final].sort((a, b) => b.repetition - a.repetition);
  const byDensity = [...final].sort((a, b) => b.onsetDensity - a.onsetDensity);
  const byTempo = [...final].sort((a, b) => b.tempoStability - a.tempoStability);
  const labels = ["Most loopable", "Most percussive", "Tightest tempo", "Highest energy", "Best overall", "Alternative"];
  const used = new Set<string>();
  const withLabel = final.map((w, i) => {
    let label = labels[Math.min(i, labels.length - 1)];
    if (byRep[0] === w && !used.has("Most loopable")) {
      label = "Most loopable";
      used.add(label);
    } else if (byDensity[0] === w && !used.has("Most percussive")) {
      label = "Most percussive";
      used.add(label);
    } else if (byTempo[0] === w && !used.has("Tightest tempo")) {
      label = "Tightest tempo";
      used.add(label);
    } else if (i === 0 && !used.has("Best overall")) {
      label = "Best overall";
      used.add(label);
    } else {
      label = `Region ${i + 1}`;
    }
    return { ...w, label };
  });

  onProgress?.(1);

  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.log("[audioScan] detected BPM:", bpm.toFixed(1), "confidence:", (confidence * 100).toFixed(0) + "%");
    if (final.length > 0) {
      const f = final[0]!;
      console.log("[audioScan] top candidate range:", f.startSec.toFixed(2), "–", f.endSec.toFixed(2), "s,", f.barLength, "bars");
    }
  }

  const candidates: LoopCandidate[] = withLabel.map((w) => ({
    startSec: w.startSec,
    endSec: w.endSec,
    barLength: w.barLength,
    label: w.label,
    score: w.score,
    bpmEstimate: bpm,
  }));

  return {
    bpmEstimate: bpm,
    bpmConfidence: confidence,
    candidates,
  };
}
