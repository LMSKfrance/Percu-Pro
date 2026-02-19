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
}

export interface AppState {
  ui: UiState;
  transport: TransportState;
}
