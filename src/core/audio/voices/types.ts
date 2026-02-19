/**
 * Trigger a one-shot voice at timeSec into destination.
 * velocity01 in [0,1], accentBool for accent handling where supported.
 */
export type VoiceTrigger = (
  ctx: AudioContext,
  dest: AudioNode,
  timeSec: number,
  velocity01: number,
  accentBool: boolean,
  params?: Record<string, unknown>
) => void;
