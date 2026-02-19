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
 * Closed hat: noise through highpass + short env.
 */
export function createHatClosedVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, params) => {
    const now = timeSec;
    const decay = (params?.decay as number) ?? 0.04;
    const buf = getNoiseBuffer(ctx, noiseBufferShared);

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = false;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    hp.Q.value = 0.7;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity01 * 0.25, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    noise.start(now);
    noise.stop(now + Math.min(decay + 0.01, 0.12));
  };
}

/**
 * Open hat: noise through highpass + longer env.
 */
export function createHatOpenVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, _params) => {
    const now = timeSec;
    const buf = getNoiseBuffer(ctx, noiseBufferShared);

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = false;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    hp.Q.value = 0.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity01 * 0.22, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    noise.start(now);
    noise.stop(now + 0.22);
  };
}
