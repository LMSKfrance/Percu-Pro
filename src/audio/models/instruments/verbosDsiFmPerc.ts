import { VerbosDsiFmPercVoice, type VoiceParams } from "../voices/VerbosDsiFmPercVoice";

export type VerbosDsiFmPercPreset = {
  id: string;
  name: string;
  color: number;
  decay: number;
  drive: number;
  ratio: number;
  tone: number;
  feedback: number;
};

const PRESETS: VerbosDsiFmPercPreset[] = [
  { id: "tightZap", name: "TightZap", color: 0.65, decay: 0.18, drive: 0.25, ratio: 3, tone: 0.65, feedback: 0.05 },
  { id: "syncuTom", name: "SyncuTom", color: 0.45, decay: 0.55, drive: 0.18, ratio: 1, tone: 0.45, feedback: 0.06 },
  { id: "evolverGrit", name: "EvolverGrit", color: 0.7, decay: 0.4, drive: 0.55, ratio: 2, tone: 0.55, feedback: 0.14 },
  { id: "verbosBongo", name: "VerbosBongo", color: 0.5, decay: 0.35, drive: 0.22, ratio: 1.5, tone: 0.7, feedback: 0.04 },
  { id: "metallicTick", name: "MetallicTick", color: 0.85, decay: 0.12, drive: 0.38, ratio: 4, tone: 0.8, feedback: 0.05 },
  { id: "hardWaxPerc", name: "HardWaxPerc", color: 0.75, decay: 0.28, drive: 0.48, ratio: 2, tone: 0.6, feedback: 0.1 },
  { id: "dryClick", name: "DryClick", color: 0.35, decay: 0.1, drive: 0.15, ratio: 2, tone: 0.9, feedback: 0 },
  { id: "rumblePerc", name: "RumblePerc", color: 0.55, decay: 0.7, drive: 0.45, ratio: 1, tone: 0.4, feedback: 0.12 },
];

export type VerbosDsiFmPercMacro = "color" | "decay" | "drive";

export const verbosDsiFmPercModel = {
  id: "VERBOS_DSI_FM_PERC" as const,
  name: "Verbos/DSI FM Perc",
  macros: [
    { id: "color" as const, label: "Color" },
    { id: "decay" as const, label: "Decay" },
    { id: "drive" as const, label: "Drive" },
  ],
  presets: PRESETS,
  createVoice(
    ctx: AudioContext,
    destination: AudioNode,
    presetOrParams?: VerbosDsiFmPercPreset | Partial<VoiceParams>
  ): VerbosDsiFmPercVoice {
    const initial: Partial<VoiceParams> = presetOrParams
      ? "ratio" in presetOrParams && typeof (presetOrParams as VerbosDsiFmPercPreset).ratio === "number"
        ? (presetOrParams as VerbosDsiFmPercPreset)
        : (presetOrParams as Partial<VoiceParams>)
      : {};
    return new VerbosDsiFmPercVoice(ctx, destination, initial);
  },
};

export type VerbosDsiFmPercModel = typeof verbosDsiFmPercModel;
