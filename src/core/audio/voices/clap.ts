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
 * Clap: 3-4 quick noise bursts.
 */
export function createClapVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, _params) => {
    const buf = getNoiseBuffer(ctx, noiseBufferShared);
    const bursts = [0, 0.008, 0.016, 0.024];
    const level = velocity01 * 0.35;

    for (const offset of bursts) {
      const now = timeSec + offset;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = false;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      noise.connect(gain);
      gain.connect(dest);
      noise.start(now);
      noise.stop(now + 0.035);
    }
  };
}
