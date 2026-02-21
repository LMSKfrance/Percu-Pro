/**
 * Web Audio engine: master chain, per-lane gains, voice dispatch.
 * Context is created/resumed in userGestureInit() (call from Play button).
 */

import type { PatternState } from "../patternTypes";
import type { TrackId } from "../types";
import type { AppState, HiPercInstrumentState } from "../types";
import type { TriggerStepFn } from "./scheduler";
import { startScheduler, stopScheduler, type OnStepTriggerFn } from "./scheduler";
import type { VoiceTrigger } from "./voices/types";
import { triggerKick } from "./voices/kick";
import { createHatClosedVoice } from "./voices/hat";
import { createClapVoice } from "./voices/clap";
import { createRimVoice } from "./voices/rim";
import { createPercVoice } from "./voices/perc";
import { triggerAcid } from "./voices/acid";
import { VerbosDsiFmPercVoice } from "../../audio/models/voices/VerbosDsiFmPercVoice";
import { FmDrumVoice } from "../../audio/models/voices/FmDrumVoice";
import { FmSnareVoice } from "../../audio/models/voices/FmSnareVoice";
import { verbosDsiFmPercModel } from "../../audio/models/instruments/verbosDsiFmPerc";
import {
  fmMdKickModel,
  fmMdKickApplyMacros,
  fmMdSnareModel,
  fmMdSnareApplyMacros,
  fmMdHatModel,
  fmMdHatApplyMacros,
} from "../../audio/models/instruments";
import { createH3KRack, type H3KRack, type H3KRackParams } from "../../audio/fx/h3kRack";

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
let sumGain: GainNode | null = null;
let h3kRack: H3KRack | null = null;
let h3kSendGains: Record<TrackId, GainNode> = {} as Record<TrackId, GainNode>;
const FFT_SIZE = 256;
let channelAnalysers: Record<TrackId, AnalyserNode> = {} as Record<TrackId, AnalyserNode>;
let masterAnalyser: AnalyserNode | null = null;

const HIPERC_POOL_SIZE = 8;
const HIPERC_FM_MD_MAX_DECAY_SEC = 1.2;
const HIPERC_VERBOS_MAX_DECAY_SEC = 0.95;

type HiPercFmMdEntry = { voice: FmDrumVoice | FmSnareVoice; freeAfter: number };
type HiPercVerbosEntry = { voice: VerbosDsiFmPercVoice; freeAfter: number };

let hiPercVerbosPool: HiPercVerbosEntry[] = [];
let hiPercFmMdPool: HiPercFmMdEntry[] = [];
let hiPercFmMdModelId: "FM_MD_KICK" | "FM_MD_SNARE" | "FM_MD_HAT" | null = null;

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

  sumGain = ctx.createGain();
  sumGain.gain.value = 1;
  // Bypass all master FX: dry path only (saturator, compressor, hpf, H3K rack left in place for UI only)
  masterFxInput.connect(masterGain!);
  h3kRack = createH3KRack(ctx);
  h3kRack.output.connect(sumGain!);
  // sumGain / saturator / compressor / hpf not in signal path

  saturator!.connect(compressor);
  compressor!.connect(hpf);
  hpf!.connect(masterGain);
  masterGain.connect(ctx.destination);

  for (const id of TRACK_IDS) {
    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(masterFxInput!);
    laneGains[id] = g;
    const sendG = ctx.createGain();
    sendG.gain.value = 0;
    g.connect(sendG);
    sendG.connect(h3kRack!.input);
    h3kSendGains[id] = sendG;
    const anal = ctx.createAnalyser();
    anal.fftSize = FFT_SIZE;
    anal.smoothingTimeConstant = 0.6;
    g.connect(anal);
    channelAnalysers[id] = anal;
  }

  masterAnalyser = ctx.createAnalyser();
  masterAnalyser.fftSize = FFT_SIZE;
  masterAnalyser.smoothingTimeConstant = 0.6;
  masterGain.connect(masterAnalyser);

  buildVoiceMap();
  return true;
}

function computeRmsPeak(analyser: AnalyserNode): { rms: number; peak: number } {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const x = data[i];
    sum += x * x;
    const a = Math.abs(x);
    if (a > peak) peak = a;
  }
  const rms = Math.sqrt(sum / data.length);
  return { rms, peak };
}

export type MeterLevels = {
  channels: Record<TrackId, { rms: number; peak: number }>;
  master: { rms: number; peak: number };
};

export function getMeterLevels(): MeterLevels {
  const channels = {} as Record<TrackId, { rms: number; peak: number }>;
  for (const id of TRACK_IDS) {
    const a = channelAnalysers[id];
    channels[id] = a ? computeRmsPeak(a) : { rms: 0, peak: 0 };
  }
  const master = masterAnalyser ? computeRmsPeak(masterAnalyser) : { rms: 0, peak: 0 };
  return { channels, master };
}

export function syncLaneGains(state: AppState): void {
  if (!ctx) return;
  const muted = state.ui?.laneMuted ?? {};
  const gains = state.ui?.laneGain ?? {};
  const t = ctx.currentTime;
  for (const id of TRACK_IDS) {
    const g = laneGains[id];
    if (!g) continue;
    const gain = muted[id] ? 0 : (gains[id] ?? 1);
    g.gain.setValueAtTime(gain, t);
  }
}

function buildTriggerStep(getState: GetState): TriggerStepFn {
  return (
    laneId: TrackId,
    _stepIndex: number,
    timeSec: number,
    velocity: number,
    accent: boolean,
    pitchSemitones: number
  ): void => {
    if (!ctx) return;
    const state = getState();
    const ui = state.ui ?? {};

    if (laneId === "hiPerc" && hiPercFmMdPool.length > 0) {
      let entry = hiPercFmMdPool.find((e) => e.freeAfter <= timeSec);
      if (!entry) entry = hiPercFmMdPool.reduce((a, b) => (a.freeAfter < b.freeAfter ? a : b));
      entry.voice.trigger(timeSec, velocity);
      entry.freeAfter = timeSec + HIPERC_FM_MD_MAX_DECAY_SEC;
      return;
    }
    if (laneId === "hiPerc" && hiPercVerbosPool.length > 0) {
      let entry = hiPercVerbosPool.find((e) => e.freeAfter <= timeSec);
      if (!entry) entry = hiPercVerbosPool.reduce((a, b) => (a.freeAfter < b.freeAfter ? a : b));
      entry.voice.trigger(timeSec, velocity);
      entry.freeAfter = timeSec + HIPERC_VERBOS_MAX_DECAY_SEC;
      return;
    }

    const voice = laneVoices[laneId];
    const dest = laneGains[laneId];
    if (!voice || !dest) return;

    const params: Record<string, unknown> = {};
    if (laneId === "kick" && ui.kickInstrument) {
      const k = ui.kickInstrument;
      params.pitch = k.pitch;
      params.decay = k.decay;
      params.punch = k.punch;
      params.tone = k.tone;
      params.drive = k.drive;
      params.sub = k.sub;
    } else if (laneId === "noise" && ui.noiseInstrument) {
      const n = ui.noiseInstrument;
      params.decay = n.decay;
      params.tone = n.tone;
      params.noise = n.noise;
      params.hpf = n.hpf;
    } else if (laneId === "lowPerc" && ui.lowPercInstrument) {
      const p = ui.lowPercInstrument;
      params.freq = 120 + p.tune * 600;
      params.decay = p.decay;
      params.punch = p.punch;
      params.color = p.color;
      params.shape = p.shape;
      params.noise = p.noise;
    } else if (laneId === "clap" && ui.clapInstrument) {
      const c = ui.clapInstrument;
      params.decay = c.decay;
      params.snap = c.snap;
      params.tone = c.tone;
      params.stereo = c.stereo;
      params.noise = c.noise;
      params.body = c.body;
    } else if (laneId === "chord" && ui.chordInstrument) {
      const c = ui.chordInstrument;
      params.freq = 200 + c.tone * 800;
      params.decay = c.decay;
      params.body = c.body;
    } else if (laneId === "bass" && ui.bassInstrument) {
      const b = ui.bassInstrument;
      params.pitch = pitchSemitones + (b.pitch - 0.5) * 24;
      params.cutoff = b.cutoff;
      params.resonance = b.resonance;
      params.decay = b.decay;
      params.drive = b.drive;
    } else if (laneId === "subPerc" && ui.subPercInstrument) {
      const s = ui.subPercInstrument;
      params.decay = s.decay;
      params.tone = s.tone;
      params.punch = s.punch;
    }

    if (laneId === "lowPerc" && !params.freq) params.freq = 280;
    if (laneId === "chord" && !params.freq) params.freq = 520;
    if (laneId === "bass" && params.pitch === undefined) (params as Record<string, number>).pitch = pitchSemitones;

    voice(ctx, dest, timeSec, velocity, accent, Object.keys(params).length ? params : undefined);
  };
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
  syncLaneGains(getState());
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    console.log("[Percu Pro audio] engine start");
  }
  startScheduler(
    getState,
    () => ctx!.currentTime,
    buildTriggerStep(getState),
    onStepTrigger,
    () => syncLaneGains(getState())
  );
}

export function stop(): void {
  stopScheduler();
  if (ctx) {
    const t = ctx.currentTime;
    for (const e of hiPercFmMdPool) e.voice.silenceNow();
    for (const e of hiPercVerbosPool) e.voice.silenceNow();
    for (const id of TRACK_IDS) {
      const g = laneGains[id];
      if (g) g.gain.setValueAtTime(0, t);
    }
  }
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

function disposeHiPercVerbosVoice(): void {
  for (const e of hiPercVerbosPool) e.voice.dispose();
  hiPercVerbosPool = [];
}

function disposeHiPercFmMdVoice(): void {
  for (const e of hiPercFmMdPool) e.voice.dispose();
  hiPercFmMdPool = [];
  hiPercFmMdModelId = null;
}

export function setHiPercInstrumentState(config: HiPercInstrumentState | undefined): void {
  if (!config) {
    disposeHiPercVerbosVoice();
    disposeHiPercFmMdVoice();
    return;
  }

  const m1 = config.fmMdMacro1 ?? 0.5;
  const m2 = config.fmMdMacro2 ?? 0.5;
  const m3 = config.fmMdMacro3 ?? 0.5;

  if (config.modelId === "FM_MD_KICK" || config.modelId === "FM_MD_SNARE" || config.modelId === "FM_MD_HAT") {
    disposeHiPercVerbosVoice();
    if (!ctx) return;
    ensureGraph();
    const dest = laneGains.hiPerc;
    if (!dest) return;

    if (hiPercFmMdPool.length > 0 && config.modelId === hiPercFmMdModelId) {
      for (const e of hiPercFmMdPool) {
        if (config.modelId === "FM_MD_KICK") fmMdKickApplyMacros(e.voice as FmDrumVoice, m1, m2, m3);
        else if (config.modelId === "FM_MD_SNARE") fmMdSnareApplyMacros(e.voice as FmSnareVoice, m1, m2, m3);
        else fmMdHatApplyMacros(e.voice as FmDrumVoice, m1, m2, m3);
      }
      return;
    }

    disposeHiPercFmMdVoice();
    hiPercFmMdModelId = config.modelId;
    const presetKick = { pitch: m1, punch: m2, decay: m3 } as import("../../audio/models/instruments/fmMdKick").FmMdKickPreset;
    const presetSnare = { noiseMix: m1, tone: m2, snap: m3 } as import("../../audio/models/instruments/fmMdSnare").FmMdSnarePreset;
    const presetHat = { decay: m1, tone: m2, bright: m3 } as import("../../audio/models/instruments/fmMdHat").FmMdHatPreset;
    for (let i = 0; i < HIPERC_POOL_SIZE; i++) {
      let voice: FmDrumVoice | FmSnareVoice;
      if (config.modelId === "FM_MD_KICK") {
        voice = fmMdKickModel.createVoice(ctx, dest, presetKick);
        fmMdKickApplyMacros(voice as FmDrumVoice, m1, m2, m3);
      } else if (config.modelId === "FM_MD_SNARE") {
        voice = fmMdSnareModel.createVoice(ctx, dest, presetSnare, sharedNoise);
        fmMdSnareApplyMacros(voice as FmSnareVoice, m1, m2, m3);
      } else {
        voice = fmMdHatModel.createVoice(ctx, dest, presetHat);
        fmMdHatApplyMacros(voice as FmDrumVoice, m1, m2, m3);
      }
      hiPercFmMdPool.push({ voice, freeAfter: 0 });
    }
    return;
  }

  disposeHiPercFmMdVoice();
  hiPercFmMdModelId = null;
  if (config.modelId !== "VERBOS_DSI_FM_PERC") {
    disposeHiPercVerbosVoice();
    return;
  }

  if (!ctx) return;
  ensureGraph();
  const dest = laneGains.hiPerc;
  if (!dest) return;
  const t = ctx.currentTime;
  if (hiPercVerbosPool.length > 0) {
    for (const e of hiPercVerbosPool) {
      e.voice.setParam("color", config.color, t);
      e.voice.setParam("decay", config.decay, t);
      e.voice.setParam("drive", config.drive, t);
      e.voice.setParam("ratio", config.ratio, t);
      e.voice.setParam("tone", config.tone, t);
      e.voice.setParam("feedback", config.feedback, t);
    }
    return;
  }
  const initial = {
    color: config.color,
    decay: config.decay,
    drive: config.drive,
    ratio: config.ratio,
    tone: config.tone,
    feedback: config.feedback,
  };
  for (let i = 0; i < HIPERC_POOL_SIZE; i++) {
    const voice = verbosDsiFmPercModel.createVoice(ctx, dest, initial);
    voice.setParam("color", config.color, t);
    voice.setParam("decay", config.decay, t);
    voice.setParam("drive", config.drive, t);
    voice.setParam("ratio", config.ratio, t);
    voice.setParam("tone", config.tone, t);
    voice.setParam("feedback", config.feedback, t);
    hiPercVerbosPool.push({ voice, freeAfter: 0 });
  }
}

export function setHiPercVerbosParam(
  key: "color" | "decay" | "drive" | "ratio" | "tone" | "feedback",
  value: number
): void {
  for (const e of hiPercVerbosPool) e.voice.setParam(key, value);
}

const H3K_SMOOTH = 0.03;

export function setH3kSend(laneId: TrackId, value: number): void {
  const g = h3kSendGains[laneId];
  if (g && ctx) g.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), ctx.currentTime, H3K_SMOOTH);
}

export function setH3kParams(p: Partial<H3KRackParams>): void {
  if (h3kRack) h3kRack.setParams(p);
}

export function killH3kFx(): void {
  if (h3kRack) h3kRack.killFx();
}

export function setIsLooping(_value: boolean): void {
  // Scheduler reads isLooping from getState()
}

export function dispose(): void {
  stop();
  disposeHiPercVerbosVoice();
  disposeHiPercFmMdVoice();
  if (ctx) {
    ctx.close();
    ctx = null;
  }
  (window as unknown as { __percuAudioContext?: AudioContext }).__percuAudioContext = undefined;
  if (h3kRack) {
    h3kRack.dispose();
    h3kRack = null;
  }
  masterGain = null;
  saturator = null;
  compressor = null;
  hpf = null;
  masterFxInput = null;
  sumGain = null;
  laneGains = {} as Record<TrackId, GainNode>;
  h3kSendGains = {} as Record<TrackId, GainNode>;
  channelAnalysers = {} as Record<TrackId, AnalyserNode>;
  masterAnalyser = null;
  sharedNoise.buffer = null;
}
