import type { VoiceTrigger } from "./types";

/**
 * Acid: saw/square osc + lowpass filter + env to cutoff + accent support.
 */
export const triggerAcid: VoiceTrigger = (ctx, dest, timeSec, velocity01, accentBool, _params) => {
  const now = timeSec;
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 110;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(400, now);
  lp.frequency.exponentialRampToValueAtTime(2000, now + 0.05);
  lp.frequency.exponentialRampToValueAtTime(400, now + 0.2);
  lp.Q.value = 4;

  const gain = ctx.createGain();
  const vol = accentBool ? velocity01 * 0.5 : velocity01 * 0.35;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(lp);
  lp.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.16);
};
