/** Track ids matching SEQUENCER_TRACKS */
export type TrackId =
  | "kick"
  | "snare"
  | "hhc"
  | "hho"
  | "perc1"
  | "perc2"
  | "rim"
  | "clap";

/** Engine panel ids */
export type EngineId =
  | "Percussion Engine"
  | "Poly-Chord Engine"
  | "Acid Bass Line";

export interface TransportState {
  bpm: number;
  isPlaying: boolean;
  isLooping: boolean;
}

export interface UiState {
  activeTrackId: TrackId;
  expandedTrackId: TrackId | null;
  activeEngine: EngineId;
  /** City profile for groove generator (e.g. Detroit, Berlin, Tbilisi) */
  cityProfile: string;
  /** Per-lane mute (power off); when true, instrument is silent but triggers stay visible */
  laneMuted: Partial<Record<TrackId, boolean>>;
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
