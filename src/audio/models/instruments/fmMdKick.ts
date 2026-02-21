import { FmDrumVoice, type FmDrumParams } from "../voices/FmDrumVoice";

export type FmMdKickPreset = {
  id: string;
  name: string;
  pitch: number;
  punch: number;
  decay: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function presetToParams(p: FmMdKickPreset): Partial<FmDrumParams> {
  return {
    freq: lerp(28, 110, p.pitch),
    modFreq: lerp(80, 350, 0.4 + p.pitch * 0.4),
    useRatio: true,
    decay: lerp(0.08, 1.0, p.decay),
    modDecay: lerp(0.04, 0.35, 1 - p.punch * 0.7),
    modIndex: lerp(5, 28, 0.3 + p.punch * 0.7),
    pitchDecayAmount: lerp(25, 120, 0.5 + p.punch * 0.5),
    pitchDecayTime: lerp(0.03, 0.12, 1 - p.punch * 0.5),
    feedback: lerp(0, 0.15, p.punch * 0.5),
  };
}

const PRESETS: FmMdKickPreset[] = [
  { id: "classic", name: "Classic", pitch: 0.5, punch: 0.5, decay: 0.5 },
  { id: "punchy", name: "Punchy", pitch: 0.45, punch: 0.85, decay: 0.25 },
  { id: "deep", name: "Deep", pitch: 0.2, punch: 0.3, decay: 0.7 },
  { id: "tight", name: "Tight", pitch: 0.55, punch: 0.8, decay: 0.2 },
  { id: "loose", name: "Loose", pitch: 0.4, punch: 0.35, decay: 0.8 },
  { id: "rumble", name: "Rumble", pitch: 0.25, punch: 0.4, decay: 0.9 },
];

export type FmMdKickMacro = "pitch" | "punch" | "decay";

export const fmMdKickModel = {
  id: "FM_MD_KICK" as const,
  name: "FM MD Kick",
  macros: [
    { id: "pitch" as const, label: "Pitch" },
    { id: "punch" as const, label: "Punch" },
    { id: "decay" as const, label: "Decay" },
  ],
  presets: PRESETS,
  createVoice(
    ctx: AudioContext,
    destination: AudioNode,
    presetOrParams?: FmMdKickPreset | Partial<FmDrumParams>
  ): FmDrumVoice {
    const initial: Partial<FmDrumParams> =
      presetOrParams && "pitch" in presetOrParams && typeof (presetOrParams as FmMdKickPreset).pitch === "number"
        ? presetToParams(presetOrParams as FmMdKickPreset)
        : (presetOrParams as Partial<FmDrumParams>) ?? {};
    return new FmDrumVoice(ctx, destination, initial);
  },
};

export type FmMdKickModel = typeof fmMdKickModel;

/** Apply macro values (0..1) to an FmDrumVoice used as kick */
export function fmMdKickApplyMacros(voice: FmDrumVoice, pitch: number, punch: number, decay: number): void {
  voice.setParam("freq", lerp(28, 110, pitch));
  voice.setParam("decay", lerp(0.08, 1.0, decay));
  voice.setParam("modDecay", lerp(0.04, 0.35, 1 - punch * 0.7));
  voice.setParam("modIndex", lerp(5, 28, 0.3 + punch * 0.7));
  voice.setParam("pitchDecayAmount", lerp(25, 120, 0.5 + punch * 0.5));
  voice.setParam("pitchDecayTime", lerp(0.03, 0.12, 1 - punch * 0.5));
  voice.setParam("feedback", lerp(0, 0.15, punch * 0.5));
}
