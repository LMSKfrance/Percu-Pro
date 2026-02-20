import type { VoiceTrigger } from "./types";

/** Bass root C2 in Hz; pitch is applied as semitones relative to this. */
const BASS_ROOT_HZ = 65.41;

/**
 * Acid: saw/square osc + lowpass filter + env to cutoff + accent support.
 * params.pitch: semitones -24..+24 (0 = C2); applied to oscillator frequency.
 */
export const triggerAcid: VoiceTrigger = (ctx, dest, timeSec, velocity01, accentBool, params) => {
  const now = timeSec;
  const pitchSemitones = (params?.pitch as number | undefined) ?? 0;
  const freqHz = BASS_ROOT_HZ * Math.pow(2, pitchSemitones / 12);

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freqHz;

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
