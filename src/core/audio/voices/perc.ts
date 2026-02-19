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
 * Short percussive noise "bongo" placeholder: bandpass noise.
 */
export function createPercVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, params) => {
    const now = timeSec;
    const freq = (params?.freq as number) ?? 400;
    const buf = getNoiseBuffer(ctx, noiseBufferShared);

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = false;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity01 * 0.4, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(dest);
    noise.start(now);
    noise.stop(now + 0.1);
  };
}
