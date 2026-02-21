import { FmDrumVoice, type FmDrumParams } from "../voices/FmDrumVoice";

export type FmMdHatPreset = {
  id: string;
  name: string;
  decay: number;
  tone: number;
  bright: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function presetToParams(p: FmMdHatPreset): Partial<FmDrumParams> {
  return {
    freq: lerp(400, 2200, p.tone),
    modFreq: lerp(2, 12, p.bright),
    useRatio: true,
    decay: lerp(0.02, 0.35, p.decay),
    modDecay: lerp(0.008, 0.12, 0.3 + (1 - p.decay) * 0.6),
    modIndex: lerp(15, 45, 0.4 + p.bright * 0.6),
    pitchDecayAmount: lerp(0, 80, p.bright * 0.5),
    pitchDecayTime: lerp(0.01, 0.04, 1 - p.decay),
    feedback: lerp(0, 0.12, p.bright * 0.4),
  };
}

const PRESETS: FmMdHatPreset[] = [
  { id: "closed", name: "Closed", decay: 0.08, tone: 0.5, bright: 0.55 },
  { id: "open", name: "Open", decay: 0.35, tone: 0.45, bright: 0.5 },
  { id: "metallic", name: "Metallic", decay: 0.15, tone: 0.6, bright: 0.85 },
  { id: "digital", name: "Digital", decay: 0.1, tone: 0.7, bright: 0.9 },
  { id: "dark", name: "Dark", decay: 0.25, tone: 0.3, bright: 0.3 },
  { id: "tight", name: "Tight", decay: 0.04, tone: 0.55, bright: 0.65 },
];

export type FmMdHatMacro = "decay" | "tone" | "bright";

export const fmMdHatModel = {
  id: "FM_MD_HAT" as const,
  name: "FM MD Hat",
  macros: [
    { id: "decay" as const, label: "Decay" },
    { id: "tone" as const, label: "Tone" },
    { id: "bright" as const, label: "Bright" },
  ],
  presets: PRESETS,
  createVoice(
    ctx: AudioContext,
    destination: AudioNode,
    presetOrParams?: FmMdHatPreset | Partial<FmDrumParams>
  ): FmDrumVoice {
    const initial: Partial<FmDrumParams> =
      presetOrParams && "bright" in presetOrParams && typeof (presetOrParams as FmMdHatPreset).bright === "number"
        ? presetToParams(presetOrParams as FmMdHatPreset)
        : (presetOrParams as Partial<FmDrumParams>) ?? {};
    return new FmDrumVoice(ctx, destination, initial);
  },
};

export type FmMdHatModel = typeof fmMdHatModel;

export function fmMdHatApplyMacros(voice: FmDrumVoice, decay: number, tone: number, bright: number): void {
  voice.setParam("freq", lerp(400, 2200, tone));
  voice.setParam("modFreq", lerp(2, 12, bright));
  voice.setParam("decay", lerp(0.02, 0.35, decay));
  voice.setParam("modDecay", lerp(0.008, 0.12, 0.3 + (1 - decay) * 0.6));
  voice.setParam("modIndex", lerp(15, 45, 0.4 + bright * 0.6));
  voice.setParam("pitchDecayAmount", lerp(0, 80, bright * 0.5));
  voice.setParam("pitchDecayTime", lerp(0.01, 0.04, 1 - decay));
  voice.setParam("feedback", lerp(0, 0.12, bright * 0.4));
}
