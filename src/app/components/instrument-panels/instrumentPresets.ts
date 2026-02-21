import type {
  KickInstrumentState,
  NoiseInstrumentState,
  LowPercInstrumentState,
  ClapInstrumentState,
  ChordInstrumentState,
  BassInstrumentState,
  SubPercInstrumentState,
} from "../../../core/types";

/** Preset id + param values (0..1). Applied on select to set instrument state. */
export type KickPreset = { id: string; name: string; params: Omit<KickInstrumentState, "presetId"> };
export type NoisePreset = { id: string; name: string; params: Omit<NoiseInstrumentState, "presetId"> };
export type LowPercPreset = { id: string; name: string; params: Omit<LowPercInstrumentState, "presetId"> };
export type ClapPreset = { id: string; name: string; params: Omit<ClapInstrumentState, "presetId"> };
export type ChordPreset = { id: string; name: string; params: Omit<ChordInstrumentState, "presetId"> };
export type BassPreset = { id: string; name: string; params: Omit<BassInstrumentState, "presetId"> };
export type SubPercPreset = { id: string; name: string; params: Omit<SubPercInstrumentState, "presetId"> };

export const KICK_PRESETS: KickPreset[] = [
  { id: "default", name: "Default", params: { pitch: 0.42, decay: 0.65, punch: 0.55, tone: 0.5, drive: 0.3, sub: 0.7 } },
  { id: "punchy", name: "Punchy", params: { pitch: 0.5, decay: 0.25, punch: 0.9, tone: 0.55, drive: 0.4, sub: 0.6 } },
  { id: "deep", name: "Deep", params: { pitch: 0.2, decay: 0.8, punch: 0.35, tone: 0.4, drive: 0.2, sub: 0.95 } },
  { id: "tight", name: "Tight", params: { pitch: 0.55, decay: 0.2, punch: 0.85, tone: 0.6, drive: 0.35, sub: 0.5 } },
  { id: "subby", name: "Subby", params: { pitch: 0.25, decay: 0.7, punch: 0.4, tone: 0.35, drive: 0.15, sub: 1 } },
  { id: "808", name: "808", params: { pitch: 0.35, decay: 0.6, punch: 0.7, tone: 0.45, drive: 0.25, sub: 0.85 } },
  { id: "acoustic", name: "Acoustic", params: { pitch: 0.5, decay: 0.5, punch: 0.6, tone: 0.55, drive: 0.2, sub: 0.5 } },
  { id: "lofi", name: "Lo-Fi", params: { pitch: 0.4, decay: 0.55, punch: 0.5, tone: 0.4, drive: 0.5, sub: 0.7 } },
  { id: "rumble", name: "Rumble", params: { pitch: 0.2, decay: 0.95, punch: 0.25, tone: 0.3, drive: 0.2, sub: 0.9 } },
  { id: "click", name: "Click", params: { pitch: 0.7, decay: 0.15, punch: 0.95, tone: 0.8, drive: 0.45, sub: 0.3 } },
];

export const NOISE_PRESETS: NoisePreset[] = [
  { id: "default", name: "Default", params: { decay: 0.4, tone: 0.65, noise: 0.8, hpf: 0.7 } },
  { id: "closed", name: "Closed", params: { decay: 0.08, tone: 0.7, noise: 0.75, hpf: 0.85 } },
  { id: "open", name: "Open", params: { decay: 0.5, tone: 0.5, noise: 0.85, hpf: 0.5 } },
  { id: "shaker", name: "Shaker", params: { decay: 0.35, tone: 0.6, noise: 0.9, hpf: 0.65 } },
  { id: "tambourine", name: "Tambourine", params: { decay: 0.45, tone: 0.55, noise: 0.85, hpf: 0.55 } },
  { id: "crash", name: "Crash", params: { decay: 0.7, tone: 0.4, noise: 0.9, hpf: 0.4 } },
  { id: "ride", name: "Ride", params: { decay: 0.6, tone: 0.5, noise: 0.7, hpf: 0.6 } },
  { id: "splash", name: "Splash", params: { decay: 0.25, tone: 0.65, noise: 0.8, hpf: 0.7 } },
  { id: "china", name: "China", params: { decay: 0.55, tone: 0.35, noise: 0.95, hpf: 0.45 } },
  { id: "bell", name: "Bell", params: { decay: 0.5, tone: 0.8, noise: 0.6, hpf: 0.8 } },
];

export const LOW_PERC_PRESETS: LowPercPreset[] = [
  { id: "default", name: "Default", params: { tune: 0.38, decay: 0.55, punch: 0.35, color: 0.45, shape: 0.5, noise: 0.25 } },
  { id: "conga", name: "Conga", params: { tune: 0.35, decay: 0.5, punch: 0.5, color: 0.5, shape: 0.45, noise: 0.2 } },
  { id: "bongo", name: "Bongo", params: { tune: 0.55, decay: 0.4, punch: 0.6, color: 0.55, shape: 0.5, noise: 0.15 } },
  { id: "timbale", name: "Timbale", params: { tune: 0.6, decay: 0.35, punch: 0.65, color: 0.6, shape: 0.55, noise: 0.2 } },
  { id: "tabla", name: "Tabla", params: { tune: 0.4, decay: 0.6, punch: 0.4, color: 0.4, shape: 0.5, noise: 0.3 } },
  { id: "rim", name: "Rim", params: { tune: 0.7, decay: 0.2, punch: 0.8, color: 0.7, shape: 0.6, noise: 0.1 } },
  { id: "woodblock", name: "Wood Block", params: { tune: 0.5, decay: 0.3, punch: 0.7, color: 0.45, shape: 0.55, noise: 0.2 } },
  { id: "cowbell", name: "Cowbell", params: { tune: 0.65, decay: 0.45, punch: 0.55, color: 0.6, shape: 0.5, noise: 0.25 } },
  { id: "clave", name: "Clave", params: { tune: 0.7, decay: 0.25, punch: 0.75, color: 0.65, shape: 0.6, noise: 0.15 } },
  { id: "agogo", name: "Agogo", params: { tune: 0.6, decay: 0.4, punch: 0.6, color: 0.55, shape: 0.5, noise: 0.2 } },
];

export const CLAP_PRESETS: ClapPreset[] = [
  { id: "default", name: "Default", params: { decay: 0.6, snap: 0.55, tone: 0.5, stereo: 0.4, noise: 0.7, body: 0.45 } },
  { id: "tight", name: "Tight", params: { decay: 0.35, snap: 0.9, tone: 0.6, stereo: 0.3, noise: 0.6, body: 0.4 } },
  { id: "loose", name: "Loose", params: { decay: 0.75, snap: 0.25, tone: 0.45, stereo: 0.5, noise: 0.8, body: 0.5 } },
  { id: "snappy", name: "Snappy", params: { decay: 0.4, snap: 0.85, tone: 0.65, stereo: 0.35, noise: 0.65, body: 0.35 } },
  { id: "layered", name: "Layered", params: { decay: 0.65, snap: 0.5, tone: 0.5, stereo: 0.55, noise: 0.75, body: 0.55 } },
  { id: "classic", name: "Classic", params: { decay: 0.55, snap: 0.6, tone: 0.5, stereo: 0.45, noise: 0.7, body: 0.45 } },
  { id: "rim", name: "Rim", params: { decay: 0.3, snap: 0.95, tone: 0.7, stereo: 0.2, noise: 0.5, body: 0.3 } },
  { id: "verb", name: "Verb", params: { decay: 0.8, snap: 0.4, tone: 0.4, stereo: 0.6, noise: 0.8, body: 0.5 } },
  { id: "short", name: "Short", params: { decay: 0.25, snap: 0.9, tone: 0.6, stereo: 0.3, noise: 0.6, body: 0.35 } },
  { id: "stutter", name: "Stutter", params: { decay: 0.5, snap: 0.7, tone: 0.55, stereo: 0.5, noise: 0.75, body: 0.4 } },
];

export const CHORD_PRESETS: ChordPreset[] = [
  { id: "default", name: "Default", params: { tone: 0.52, decay: 0.4, body: 0.5 } },
  { id: "pad", name: "Pad", params: { tone: 0.4, decay: 0.75, body: 0.6 } },
  { id: "stab", name: "Stab", params: { tone: 0.55, decay: 0.2, body: 0.45 } },
  { id: "pluck", name: "Pluck", params: { tone: 0.6, decay: 0.35, body: 0.4 } },
  { id: "strings", name: "Strings", params: { tone: 0.45, decay: 0.6, body: 0.55 } },
  { id: "brass", name: "Brass", params: { tone: 0.5, decay: 0.45, body: 0.5 } },
  { id: "synth", name: "Synth", params: { tone: 0.58, decay: 0.4, body: 0.5 } },
  { id: "organ", name: "Organ", params: { tone: 0.48, decay: 0.65, body: 0.55 } },
  { id: "mellow", name: "Mellow", params: { tone: 0.42, decay: 0.55, body: 0.6 } },
  { id: "bright", name: "Bright", params: { tone: 0.7, decay: 0.3, body: 0.4 } },
];

export const BASS_PRESETS: BassPreset[] = [
  { id: "default", name: "Default", params: { pitch: 0.5, cutoff: 0.5, resonance: 0.4, decay: 0.35, drive: 0.3 } },
  { id: "sub", name: "Sub", params: { pitch: 0.5, cutoff: 0.25, resonance: 0.2, decay: 0.5, drive: 0.2 } },
  { id: "pluck", name: "Pluck", params: { pitch: 0.5, cutoff: 0.6, resonance: 0.5, decay: 0.2, drive: 0.35 } },
  { id: "reese", name: "Reese", params: { pitch: 0.5, cutoff: 0.45, resonance: 0.65, decay: 0.4, drive: 0.45 } },
  { id: "acid", name: "Acid", params: { pitch: 0.5, cutoff: 0.55, resonance: 0.75, decay: 0.3, drive: 0.5 } },
  { id: "round", name: "Round", params: { pitch: 0.5, cutoff: 0.4, resonance: 0.35, decay: 0.45, drive: 0.25 } },
  { id: "gritty", name: "Gritty", params: { pitch: 0.5, cutoff: 0.6, resonance: 0.5, decay: 0.25, drive: 0.6 } },
  { id: "soft", name: "Soft", params: { pitch: 0.5, cutoff: 0.35, resonance: 0.3, decay: 0.5, drive: 0.2 } },
  { id: "punchy", name: "Punchy", params: { pitch: 0.5, cutoff: 0.5, resonance: 0.4, decay: 0.2, drive: 0.4 } },
  { id: "808", name: "808", params: { pitch: 0.5, cutoff: 0.45, resonance: 0.45, decay: 0.55, drive: 0.3 } },
];

export const SUB_PERC_PRESETS: SubPercPreset[] = [
  { id: "default", name: "Default", params: { decay: 0.5, tone: 0.5, punch: 0.4 } },
  { id: "subkick", name: "Sub Kick", params: { decay: 0.7, tone: 0.25, punch: 0.5 } },
  { id: "thud", name: "Thud", params: { decay: 0.45, tone: 0.4, punch: 0.6 } },
  { id: "boomy", name: "Boomy", params: { decay: 0.8, tone: 0.35, punch: 0.35 } },
  { id: "tight", name: "Tight", params: { decay: 0.25, tone: 0.6, punch: 0.7 } },
  { id: "rumble", name: "Rumble", params: { decay: 0.85, tone: 0.3, punch: 0.3 } },
  { id: "dry", name: "Dry", params: { decay: 0.35, tone: 0.55, punch: 0.5 } },
  { id: "wet", name: "Wet", params: { decay: 0.65, tone: 0.45, punch: 0.45 } },
  { id: "layered", name: "Layered", params: { decay: 0.55, tone: 0.5, punch: 0.5 } },
  { id: "minimal", name: "Minimal", params: { decay: 0.3, tone: 0.6, punch: 0.55 } },
];
