import type { VoiceTrigger } from "./types";

/**
 * Rim: short click / hat variant (noise burst through highpass).
 */
function getNoiseBuffer(ctx: AudioContext, shared: { buffer: AudioBuffer | null }): AudioBuffer {
  if (shared.buffer) return shared.buffer;
  const duration = 0.2;
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  shared.buffer = buffer;
  return buffer;
}

export function createRimVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, _params) => {
    const now = timeSec;
    const buf = getNoiseBuffer(ctx, noiseBufferShared);

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = false;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 2000;
    hp.Q.value = 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity01 * 0.3, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    noise.start(now);
    noise.stop(now + 0.05);
  };
}
