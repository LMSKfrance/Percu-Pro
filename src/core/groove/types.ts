/**
 * Groove engine types. No React. Used for deterministic generation and export.
 */

export interface ProjectState {
  tempo: number;
  loopBars: number;
  stepsPerBar: number;
  seed: number;
  swing: number;
  grooveTemplateId: string;
  grooveAmount: number;
  variationIndex: number;
}

export interface ChannelState {
  id: string;
  name: string;
  role: ChannelRole;
  mute: boolean;
  solo: boolean;
  volume: number;
  tone: number;
  avatarId: string;
}

export type ChannelRole = "kick" | "hat" | "clap" | "perc" | "fx" | "bass" | "chord" | "noise";

export interface StepState {
  active: boolean;
  velocity: number;
  probability: number;
  microShiftMs: number;
  ratchetCount: number;
  accent: boolean;
  flam: boolean;
}

export interface PatternState {
  channels: ChannelState[];
  /** steps[channelIndex][stepIndex] for one bar */
  steps: StepState[][];
}

export interface GrooveTemplate {
  id: string;
  name: string;
  /** Per-step timing offset as fraction of step length. Length = stepsPerBar. */
  offsetsByStep: number[];
  stepsPerBar: number;
}

export interface AvatarProfile {
  id: string;
  name: string;
  densityBias: number;
  syncopationBias: number;
  accentBias: number;
  ratchetBias: number;
  microShiftBias: number;
  swingTaste: number;
}
