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

/** Sub perc / rim: short click. params: decay, tone (filter), punch. */
export function createRimVoice(noiseBufferShared: { buffer: AudioBuffer | null }): VoiceTrigger {
  return (ctx, dest, timeSec, velocity01, _accent, params) => {
    const now = Math.max(timeSec, ctx.currentTime);
    const decay = (params?.decay as number) ?? 0.5;
    const tone = (params?.tone as number) ?? 0.5;
    const punch = (params?.punch as number) ?? 0.4;
    const buf = getNoiseBuffer(ctx, noiseBufferShared);

    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = false;

    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1000 + tone * 4000;
    hp.Q.value = 0.5 + punch * 1;

    const gain = ctx.createGain();
    const decaySec = 0.02 + decay * 0.06;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(velocity01 * (0.25 + punch * 0.15), now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decaySec);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(dest);
    noise.start(now);
    noise.stop(now + Math.max(decaySec + 0.01, 0.06));
  };
}
