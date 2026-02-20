/**
 * Web Audio engine: master chain, per-lane gains, voice dispatch.
 * Context is created/resumed in userGestureInit() (call from Play button).
 */

import type { PatternState } from "../patternTypes";
import type { TrackId } from "../types";
import type { AppState } from "../types";
import { startScheduler, stopScheduler, type OnStepTriggerFn } from "./scheduler";
import type { VoiceTrigger } from "./voices/types";
import { triggerKick } from "./voices/kick";
import { createHatClosedVoice } from "./voices/hat";
import { createClapVoice } from "./voices/clap";
import { createRimVoice } from "./voices/rim";
import { createPercVoice } from "./voices/perc";
import { triggerAcid } from "./voices/acid";

const TRACK_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];

export type GetState = () => AppState;

let ctx: AudioContext | null = null;
const sharedNoise = { buffer: null as AudioBuffer | null };

const laneVoices: Record<TrackId, VoiceTrigger> = {} as Record<TrackId, VoiceTrigger>;

function buildVoiceMap(): void {
  if (laneVoices.kick) return;
  laneVoices.noise = createHatClosedVoice(sharedNoise);
  laneVoices.hiPerc = createPercVoice(sharedNoise);
  laneVoices.lowPerc = createPercVoice(sharedNoise);
  laneVoices.clap = createClapVoice(sharedNoise);
  laneVoices.chord = createPercVoice(sharedNoise);
  laneVoices.bass = triggerAcid;
  laneVoices.subPerc = createRimVoice(sharedNoise);
  laneVoices.kick = triggerKick;
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
  masterGain.gain.value = 0.88;

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
  accent: boolean,
  pitchSemitones: number
): void {
  if (!ctx) return;
  const voice = laneVoices[laneId];
  const dest = laneGains[laneId];
  if (!voice || !dest) return;
  const params: Record<string, unknown> =
    laneId === "hiPerc" ? { freq: 400 } : laneId === "lowPerc" ? { freq: 280 } : laneId === "chord" ? { freq: 520 } : {};
  if (laneId === "bass") (params as Record<string, number>).pitch = pitchSemitones;
  voice(ctx, dest, timeSec, velocity, accent, Object.keys(params).length ? params : undefined);
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

export function start(getState: GetState, onStepTrigger?: OnStepTriggerFn): void {
  userGestureInit();
  if (!ctx) return;
  ensureGraph();
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.log("[Percu Pro audio] engine start");
  }
  startScheduler(
    getState,
    () => ctx!.currentTime,
    triggerStep,
    onStepTrigger
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
