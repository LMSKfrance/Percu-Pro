import type { VoiceTrigger } from "./types";

/** Map 0..1 to Hz (kick start freq: low ~60, high ~180) */
function pitchToHz(p: number): number {
  return 50 + p * 140;
}

/** Map 0..1 to decay time in seconds */
function decayToSec(d: number): number {
  return 0.06 + d * 0.35;
}

/**
 * Kick: sine osc with pitch envelope (fast drop) + gain envelope.
 * params: pitch (0..1), decay (0..1), punch (0..1), tone, drive, sub.
 */
export const triggerKick: VoiceTrigger = (ctx, dest, timeSec, velocity01, _accent, params) => {
  const now = timeSec;
  const pitch = (params?.pitch as number) ?? 0.5;
  const decay = (params?.decay as number) ?? 0.5;
  const punch = (params?.punch as number) ?? 0.5;
  const sub = (params?.sub as number) ?? 0.7;

  const startFreq = pitchToHz(pitch);
  const endFreq = 28 + (1 - sub) * 25;
  const decaySec = decayToSec(decay);
  const attackSec = 0.001 + (1 - punch) * 0.004;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + attackSec + 0.03);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(velocity01 * (0.85 + punch * 0.15), now + attackSec);
  gain.gain.exponentialRampToValueAtTime(0.001, now + decaySec);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + Math.max(decaySec + 0.02, 0.3));
};
