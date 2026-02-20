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

/** Hi Perc lane instrument: model + Verbos/DSI FM macro/hidden params (backward-compatible addition) */
export interface HiPercInstrumentState {
  modelId: "default" | "VERBOS_DSI_FM_PERC";
  presetId: string | null;
  color: number;
  decay: number;
  drive: number;
  ratio: number;
  tone: number;
  feedback: number;
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
