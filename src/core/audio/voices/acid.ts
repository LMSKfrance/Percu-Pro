import type { VoiceTrigger } from "./types";

/** Bass root C2 in Hz; pitch is applied as semitones relative to this. */
const BASS_ROOT_HZ = 65.41;

/**
 * Acid bass: saw + lowpass + env. params: pitch (semitones), cutoff, resonance, decay, drive.
 */
export const triggerAcid: VoiceTrigger = (ctx, dest, timeSec, velocity01, accentBool, params) => {
  const now = timeSec;
  const pitchSemitones = (params?.pitch as number | undefined) ?? 0;
  const cutoff = (params?.cutoff as number) ?? 0.5;
  const resonance = (params?.resonance as number) ?? 0.4;
  const decay = (params?.decay as number) ?? 0.35;
  const drive = (params?.drive as number) ?? 0.3;
  const freqHz = BASS_ROOT_HZ * Math.pow(2, pitchSemitones / 12);

  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freqHz;

  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  const cutHz = 200 + cutoff * 3000;
  lp.frequency.setValueAtTime(cutHz * 0.3, now);
  lp.frequency.exponentialRampToValueAtTime(cutHz, now + 0.04);
  lp.frequency.exponentialRampToValueAtTime(cutHz * 0.4, now + 0.1 + decay * 0.15);
  lp.Q.value = 1 + resonance * 8;

  const gain = ctx.createGain();
  const vol = (accentBool ? velocity01 * 0.55 : velocity01 * 0.4) * (0.9 + drive * 0.3);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(vol, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + decay * 0.12);

  osc.connect(lp);
  lp.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.18);
};
