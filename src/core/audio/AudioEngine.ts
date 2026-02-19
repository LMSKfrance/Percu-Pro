/**
 * Web Audio engine: master chain, per-lane gains, voice dispatch.
 * Context is created/resumed in userGestureInit() (call from Play button).
 */

import type { PatternState } from "../patternTypes";
import type { TrackId } from "../types";
import type { AppState } from "../types";
import { startScheduler, stopScheduler } from "./scheduler";
import type { VoiceTrigger } from "./voices/types";
import { triggerKick } from "./voices/kick";
import { createSnareVoice } from "./voices/snare";
import { createHatClosedVoice, createHatOpenVoice } from "./voices/hat";
import { createClapVoice } from "./voices/clap";
import { createRimVoice } from "./voices/rim";
import { createPercVoice } from "./voices/perc";

const TRACK_IDS: TrackId[] = ["kick", "snare", "hhc", "hho", "perc1", "perc2", "rim", "clap"];

export type GetState = () => AppState;

let ctx: AudioContext | null = null;
const sharedNoise = { buffer: null as AudioBuffer | null };

const laneVoices: Record<TrackId, VoiceTrigger> = {} as Record<TrackId, VoiceTrigger>;

function buildVoiceMap(): void {
  if (laneVoices.kick) return;
  laneVoices.kick = triggerKick;
  laneVoices.snare = createSnareVoice(sharedNoise);
  laneVoices.hhc = createHatClosedVoice(sharedNoise);
  laneVoices.hho = createHatOpenVoice(sharedNoise);
  laneVoices.clap = createClapVoice(sharedNoise);
  laneVoices.rim = createRimVoice(sharedNoise);
  laneVoices.perc1 = createPercVoice(sharedNoise);
  laneVoices.perc2 = createPercVoice(sharedNoise);
}

let masterGain: GainNode | null = null;
let saturator: WaveShaperNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let hpf: BiquadFilterNode | null = null;
let laneGains: Record<TrackId, GainNode> = {} as Record<TrackId, GainNode>;
let masterFxInput: GainNode | null = null;

function ensureGraph(): boolean {
  if (!ctx) return false;
  if (masterGain) return true;

  masterGain = ctx.createGain();
  masterGain.gain.value = 0.7;

  saturator = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128 - 1) * 3;
    curve[i] = (Math.tanh(x) * 0.5 + 0.5) * 2 - 1;
  }
  saturator.curve = curve;

  compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;

  hpf = ctx.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = 40;
  hpf.Q.value = 0.7;

  masterFxInput = ctx.createGain();
  masterFxInput.gain.value = 1;

  masterFxInput.connect(saturator);
  saturator!.connect(compressor);
  compressor!.connect(hpf);
  hpf!.connect(masterGain);
  masterGain.connect(ctx.destination);

  for (const id of TRACK_IDS) {
    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(masterFxInput!);
    laneGains[id] = g;
  }

  buildVoiceMap();
  return true;
}

function triggerStep(
  laneId: TrackId,
  _stepIndex: number,
  timeSec: number,
  velocity: number,
  accent: boolean
): void {
  if (!ctx) return;
  const voice = laneVoices[laneId];
  const dest = laneGains[laneId];
  if (!voice || !dest) return;
  const params = laneId === "perc1" ? { freq: 400 } : laneId === "perc2" ? { freq: 280 } : undefined;
  voice(ctx, dest, timeSec, velocity, accent, params);
}

export function userGestureInit(): void {
  if (typeof window === "undefined") return;
  if (!ctx) {
    ctx = new AudioContext();
    (window as unknown as { __percuAudioContext?: AudioContext }).__percuAudioContext = ctx;
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

export function start(getState: GetState): void {
  userGestureInit();
  if (!ctx) return;
  ensureGraph();
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.log("[Percu Pro audio] engine start");
  }
  startScheduler(
    getState,
    () => ctx!.currentTime,
    triggerStep
  );
}

export function stop(): void {
  stopScheduler();
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.log("[Percu Pro audio] engine stop");
  }
}

export function setBpm(_bpm: number): void {
  // Scheduler reads bpm from getState() each tick; no-op here unless we add caching
}

export function setPattern(_pattern: PatternState): void {
  // Scheduler reads pattern from getState() each tick; no-op here unless we throttle
}

export function setIsLooping(_value: boolean): void {
  // Scheduler reads isLooping from getState()
}

export function dispose(): void {
  stop();
  if (ctx) {
    ctx.close();
    ctx = null;
  }
  (window as unknown as { __percuAudioContext?: AudioContext }).__percuAudioContext = undefined;
  masterGain = null;
  saturator = null;
  compressor = null;
  hpf = null;
  masterFxInput = null;
  laneGains = {} as Record<TrackId, GainNode>;
  sharedNoise.buffer = null;
}
