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
 * Short percussive (low perc / chord): bandpass noise. params: freq, decay, punch, color (Q), shape, noise (level).
 */
export function createPercVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, params) => {
    const now = Math.max(timeSec, ctx.currentTime);
    const freq = (params?.freq as number) ?? 400;
    const decay = (params?.decay as number) ?? 0.5;
    const punch = (params?.punch as number) ?? 0.4;
    const color = (params?.color as number) ?? 0.5;
    const noiseLevel = (params?.noise as number) ?? 0.25;
    const buf = getNoiseBuffer(ctx, noiseBufferShared);

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = false;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 0.5 + color * 3;

    const gain = ctx.createGain();
    const decaySec = 0.04 + decay * 0.12;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity01 * (0.3 + punch * 0.2) * (1 - noiseLevel * 0.5), now + 0.002 + (1 - punch) * 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decaySec);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(dest);
    noise.start(now);
    noise.stop(now + Math.max(decaySec + 0.02, 0.12));
  };
}
