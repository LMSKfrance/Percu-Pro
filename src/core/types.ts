/** Track ids matching SEQUENCER_TRACKS: Noise, Hi Perc, Low Perc, Clap, Chord, Bass, Sub Perc, Kick */
export type TrackId =
  | "noise"
  | "hiPerc"
  | "lowPerc"
  | "clap"
  | "chord"
  | "bass"
  | "subPerc"
  | "kick";

/** Engine / instrument family (for internal mapping) */
export type EngineId =
  | "Noise Engine"
  | "Percussion Engine"
  | "Chord Engine"
  | "Bass Engine";

export interface TransportState {
  bpm: number;
  isPlaying: boolean;
  isLooping: boolean;
}

/** Hi Perc lane instrument: model + macro/hidden params (backward-compatible addition) */
export interface HiPercInstrumentState {
  modelId: "default" | "VERBOS_DSI_FM_PERC" | "FM_MD_KICK" | "FM_MD_SNARE" | "FM_MD_HAT";
  presetId: string | null;
  color: number;
  decay: number;
  drive: number;
  ratio: number;
  tone: number;
  feedback: number;
  /** FM MD model preset id */
  fmMdPresetId?: string | null;
  /** FM MD macros 0..1 (interpretation depends on model: kick=pitch/punch/decay, snare=noiseMix/tone/snap, hat=decay/tone/bright) */
  fmMdMacro1?: number;
  fmMdMacro2?: number;
  fmMdMacro3?: number;
}

export interface UiState {
  activeTrackId: TrackId;
  expandedTrackId: TrackId | null;
  activeEngine: EngineId;
  /** City profile for groove generator (e.g. Detroit, Berlin, Tbilisi) */
  cityProfile: string;
  /** Per-lane mute (power off); when true, instrument is silent but triggers stay visible */
  laneMuted: Partial<Record<TrackId, boolean>>;
  /** Hi Perc (PERC1) instrument model + macros (optional; when absent, lane uses default perc) */
  hiPercInstrument?: HiPercInstrumentState;
}

export interface GrooveCandidate {
  id: string;
  label: string;
  ops: import("./patternTypes").PatchOp[];
}

export interface GrooveState {
  top3: GrooveCandidate[] | null;
  lastCritique: { reason: string; message: string }[];
  lastAppliedCount: number;
  lastRandomizeSeed?: number;
  lastRandomizeApplied?: number;
}

/** Pattern state is optional; when present, sequencer rows are controlled from store (patternPatch applies here). */
export interface AppState {
  ui: UiState;
  transport: TransportState;
  pattern?: import("./patternTypes").PatternState;
  groove?: GrooveState;
}

export type { PatternState } from "./patternTypes";
