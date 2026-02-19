import type { VoiceTrigger } from "./types";

function getNoiseBuffer(ctx: AudioContext, shared: { buffer: AudioBuffer | null }): AudioBuffer {
  if (shared.buffer) return shared.buffer;
  const duration = 0.5;
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  shared.buffer = buffer;
  return buffer;
}

/**
 * Snare: noise through bandpass + short env + quiet tone body.
 */
export function createSnareVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, _params) => {
    const now = timeSec;
    const buf = getNoiseBuffer(ctx, noiseBufferShared);

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = false;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    bp.Q.value = 1;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(velocity01 * 0.5, now + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(now);
    noise.stop(now + 0.1);

    const tone = ctx.createOscillator();
    tone.type = "triangle";
    tone.frequency.value = 180;
    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0, now);
    toneGain.gain.linearRampToValueAtTime(velocity01 * 0.15, now + 0.01);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    tone.connect(toneGain);
    toneGain.connect(dest);
    tone.start(now);
    tone.stop(now + 0.07);
  };
}
