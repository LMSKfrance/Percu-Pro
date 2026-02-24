/**
 * Warp loop player: time-stretch the selected fragment to match global BPM
 * and play in sync with transport. Uses playbackRate for MVP (pitch shifts with tempo).
 * Start at bar boundary when transport starts; loop seamlessly.
 */

export interface WarpFragment {
  buffer: AudioBuffer;
  startSec: number;
  endSec: number;
  sourceBpm: number;
  barLength: number;
}

let ctx: AudioContext | null = null;
let fragment: WarpFragment | null = null;
let targetBpm = 120;
let pitchSemitones = 0;
let gainValue = 1;
let nextStartTime = 0;
let scheduledId: ReturnType<typeof setTimeout> | null = null;
let gainNode: GainNode | null = null;
let isRunning = false;

/**
 * Base playback rate = targetBpm / sourceBpm (warp to sequencer).
 * Pitch multiplier 2^(semitones/12) applied on top (Ableton-style transpose).
 */
function getPlaybackRate(): number {
  if (!fragment || fragment.sourceBpm <= 0) return 1;
  const baseRate = targetBpm / fragment.sourceBpm;
  const pitchMult = Math.pow(2, pitchSemitones / 12);
  return baseRate * pitchMult;
}

/**
 * Duration of one loop in context time (seconds).
 */
function getLoopDurationSec(): number {
  if (!fragment) return 0;
  const srcDuration = fragment.endSec - fragment.startSec;
  return srcDuration / getPlaybackRate();
}

function scheduleNextLoop(): void {
  if (!ctx || !fragment || !gainNode || !isRunning) return;
  const rate = getPlaybackRate();
  const srcDuration = fragment.endSec - fragment.startSec;
  const when = nextStartTime;
  const src = ctx.createBufferSource();
  src.buffer = fragment.buffer;
  src.loop = false;
  src.playbackRate.value = rate;
  src.connect(gainNode);
  src.start(when, fragment.startSec, srcDuration);
  nextStartTime = when + srcDuration / rate;
  src.onended = () => {
    if (isRunning && ctx) scheduleNextLoop();
  };
}

export function setContext(context: AudioContext | null): void {
  if (scheduledId) {
    clearTimeout(scheduledId);
    scheduledId = null;
  }
  ctx = context;
  gainNode = context ? context.createGain() : null;
  if (gainNode) gainNode.gain.value = gainValue;
  isRunning = false;
}

export function setFragment(f: WarpFragment | null): void {
  fragment = f;
}

export function setTargetBpm(bpm: number): void {
  targetBpm = Math.max(20, Math.min(300, bpm));
}

export function getTargetBpm(): number {
  return targetBpm;
}

/** Gain 0..1 for warp output. */
export function setGain(value: number): void {
  gainValue = Math.max(0, Math.min(1, value));
  if (gainNode) gainNode.gain.value = gainValue;
}

export function getGain(): number {
  return gainValue;
}

/** Pitch in semitones (-12 to +12). Applied as playbackRate multiplier. */
export function setPitchSemitones(sem: number): void {
  pitchSemitones = Math.max(-24, Math.min(24, sem));
}

export function getPitchSemitones(): number {
  return pitchSemitones;
}

/**
 * Start warp loop at given context time (e.g. next bar boundary or now).
 * Connect gain to destination so audio is heard.
 */
export function start(atTime: number): void {
  if (!ctx || !fragment || !gainNode) return;
  if (isRunning) return;
  gainNode.connect(ctx.destination);
  nextStartTime = atTime;
  isRunning = true;
  scheduleNextLoop();
}

export function stop(): void {
  isRunning = false;
  if (scheduledId) {
    clearTimeout(scheduledId);
    scheduledId = null;
  }
  nextStartTime = 0;
}

export function isPlaying(): boolean {
  return isRunning;
}

export function getGainNode(): GainNode | null {
  return gainNode;
}

export function connectTo(destination: AudioNode): void {
  if (gainNode) gainNode.connect(destination);
}

export function disconnect(): void {
  if (gainNode) gainNode.disconnect();
}
