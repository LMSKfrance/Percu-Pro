import { FmSnareVoice, type FmSnareParams } from "../voices/FmSnareVoice";

export type FmMdSnarePreset = {
  id: string;
  name: string;
  noiseMix: number;
  tone: number;
  snap: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const sharedNoiseFallback = { buffer: null as AudioBuffer | null };

function presetToParams(p: FmMdSnarePreset): Partial<FmSnareParams> {
  return {
    freq: lerp(120, 350, p.tone),
    modFreq: lerp(800, 2500, 0.4 + p.tone * 0.5),
    decay: lerp(0.15, 0.7, 1 - p.snap * 0.5),
    modDecay: lerp(0.03, 0.2, 1 - p.snap),
    modIndex: lerp(8, 35, 0.3 + p.snap * 0.6),
    noiseLevel: lerp(0.1, 0.85, p.noiseMix),
    noiseDecay: lerp(0.08, 0.4, 1 - p.snap * 0.4),
    hpf: lerp(200, 800, p.tone),
  };
}

const PRESETS: FmMdSnarePreset[] = [
  { id: "classic", name: "Classic", noiseMix: 0.5, tone: 0.5, snap: 0.5 },
  { id: "tight", name: "Tight", noiseMix: 0.4, tone: 0.6, snap: 0.85 },
  { id: "loose", name: "Loose", noiseMix: 0.6, tone: 0.4, snap: 0.25 },
  { id: "crack", name: "Crack", noiseMix: 0.8, tone: 0.55, snap: 0.9 },
  { id: "body", name: "Body", noiseMix: 0.2, tone: 0.45, snap: 0.4 },
  { id: "rim", name: "Rim", noiseMix: 0.35, tone: 0.75, snap: 0.7 },
];

export type FmMdSnareMacro = "noiseMix" | "tone" | "snap";

export const fmMdSnareModel = {
  id: "FM_MD_SNARE" as const,
  name: "FM MD Snare",
  macros: [
    { id: "noiseMix" as const, label: "Noise Mix" },
    { id: "tone" as const, label: "Tone" },
    { id: "snap" as const, label: "Snap" },
  ],
  presets: PRESETS,
  createVoice(
    ctx: AudioContext,
    destination: AudioNode,
    presetOrParams?: FmMdSnarePreset | Partial<FmSnareParams>,
    sharedNoise?: { buffer: AudioBuffer | null }
  ): FmSnareVoice {
    const initial: Partial<FmSnareParams> =
      presetOrParams && "noiseMix" in presetOrParams && typeof (presetOrParams as FmMdSnarePreset).noiseMix === "number"
        ? presetToParams(presetOrParams as FmMdSnarePreset)
        : (presetOrParams as Partial<FmSnareParams>) ?? {};
    return new FmSnareVoice(ctx, destination, sharedNoise ?? sharedNoiseFallback, initial);
  },
};

export type FmMdSnareModel = typeof fmMdSnareModel;

export function fmMdSnareApplyMacros(
  voice: FmSnareVoice,
  noiseMix: number,
  tone: number,
  snap: number
): void {
  voice.setParam("freq", lerp(120, 350, tone));
  voice.setParam("modFreq", lerp(800, 2500, 0.4 + tone * 0.5));
  voice.setParam("decay", lerp(0.15, 0.7, 1 - snap * 0.5));
  voice.setParam("modDecay", lerp(0.03, 0.2, 1 - snap));
  voice.setParam("modIndex", lerp(8, 35, 0.3 + snap * 0.6));
  voice.setParam("noiseLevel", noiseMix);
  voice.setParam("noiseDecay", lerp(0.08, 0.4, 1 - snap * 0.4));
  voice.setParam("hpf", lerp(200, 800, tone));
}
