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
 * Clap: quick noise bursts. params: decay, snap (spacing), tone, stereo, noise (level), body.
 */
export function createClapVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, params) => {
    const buf = getNoiseBuffer(ctx, noiseBufferShared);
    const snap = (params?.snap as number) ?? 0.55;
    const decay = (params?.decay as number) ?? 0.5;
    const noiseLevel = (params?.noise as number) ?? 0.7;
    const body = (params?.body as number) ?? 0.45;
    const spread = 0.004 + (1 - snap) * 0.02;
    const bursts = [0, spread, spread * 2, spread * 2.8];
    const level = velocity01 * (0.25 + body * 0.2) * noiseLevel;
    const decaySec = 0.02 + decay * 0.04;

    for (const offset of bursts) {
      const now = timeSec + offset;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = false;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + 0.0015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decaySec);

      noise.connect(gain);
      gain.connect(dest);
      noise.start(now);
      noise.stop(now + decaySec + 0.01);
    }
  };
}
