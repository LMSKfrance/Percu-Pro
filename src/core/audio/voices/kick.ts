import type { VoiceTrigger } from "./types";

/**
 * Kick: sine osc with pitch envelope (fast drop) + gain envelope + optional soft saturator.
 */
export const triggerKick: VoiceTrigger = (ctx, dest, timeSec, velocity01, _accent, _params) => {
  const now = timeSec;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(40, now + 0.04);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(velocity01 * 0.9, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.26);
};
