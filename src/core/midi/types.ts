import type { TrackId } from "../types";

/** Step trigger payload used for MIDI note-out and optional listeners */
export interface StepTriggerPayload {
  laneId: TrackId;
  stepIndex: number;
  timeSec: number;
  velocity: number;
  accent: boolean;
  pitchSemitones: number;
}

export type StepTriggerCallback = (payload: StepTriggerPayload) => void;

/** MIDI access state for UI */
export interface MidiPortInfo {
  id: string;
  name: string;
  manufacturer: string;
}

export type MidiSyncMode = "internal" | "receive" | "send";
