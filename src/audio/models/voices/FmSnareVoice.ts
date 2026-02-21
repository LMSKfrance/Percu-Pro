/**
 * FM snare voice: FM body (carrier + modulator) + noise layer, HPF. MD Drum Synth–style.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type FmSnareParams = {
  freq: number;
  modFreq: number;
  decay: number;
  modDecay: number;
  modIndex: number;
  noiseLevel: number;
  noiseDecay: number;
  hpf: number;
};

const DEFAULT_PARAMS: FmSnareParams = {
  freq: 200,
  modFreq: 1500,
  decay: 0.35,
  modDecay: 0.1,
  modIndex: 15,
  noiseLevel: 0.5,
  noiseDecay: 0.25,
  hpf: 400,
};

function getNoiseBuffer(ctx: AudioContext, shared: { buffer: AudioBuffer | null }): AudioBuffer {
  if (shared.buffer) return shared.buffer;
  const duration = 0.5;
  const sampleRate = ctx.sampleRate;
  const length = Math.min(sampleRate * duration, ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  shared.buffer = buffer;
  return buffer;
}

export class FmSnareVoice {
  private ctx: AudioContext;
  private carrier: OscillatorNode;
  private mod: OscillatorNode;
  private modGain: GainNode;
  private bodyGain: GainNode;
  private noiseGain: GainNode;
  private hpf: BiquadFilterNode;
  private out: GainNode;
  private params: FmSnareParams;
  private disposed = false;
  private sharedNoise: { buffer: AudioBuffer | null };

  constructor(
    ctx: AudioContext,
    destination: AudioNode,
    sharedNoise: { buffer: AudioBuffer | null },
    initial?: Partial<FmSnareParams>
  ) {
    this.ctx = ctx;
    this.sharedNoise = sharedNoise;
    this.params = { ...DEFAULT_PARAMS, ...initial };

    this.carrier = ctx.createOscillator();
    this.carrier.type = "sine";
    this.mod = ctx.createOscillator();
    this.mod.type = "sine";
    this.modGain = ctx.createGain();
    this.modGain.gain.value = 0;
    this.mod.connect(this.modGain);
    this.modGain.connect(this.carrier.frequency);

    this.bodyGain = ctx.createGain();
    this.bodyGain.gain.value = 0;
    this.carrier.connect(this.bodyGain);

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;

    this.hpf = ctx.createBiquadFilter();
    this.hpf.type = "highpass";
    this.hpf.frequency.value = this.params.hpf;
    this.hpf.Q.value = 0.7;

    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.bodyGain.connect(this.hpf);
    this.noiseGain.connect(this.hpf);
    this.hpf.connect(this.out);
    this.out.connect(destination);

    this.carrier.start();
    this.mod.start();
  }

  setParam(key: string, value: number): void {
    if (this.disposed) return;
    const p = this.params as Record<string, number>;
    if (key === "freq") p.freq = Math.max(50, Math.min(800, value));
    else if (key === "modFreq") p.modFreq = Math.max(200, Math.min(5000, value));
    else if (key === "decay") p.decay = Math.max(0.02, Math.min(1.2, value));
    else if (key === "modDecay") p.modDecay = Math.max(0.01, Math.min(0.5, value));
    else if (key === "modIndex") p.modIndex = Math.max(0, Math.min(60, value));
    else if (key === "noiseLevel") p.noiseLevel = clamp01(value);
    else if (key === "noiseDecay") p.noiseDecay = Math.max(0.01, Math.min(0.6, value));
    else if (key === "hpf") {
      p.hpf = Math.max(50, Math.min(3000, value));
      this.hpf.frequency.setTargetAtTime(p.hpf, this.ctx.currentTime, 0.01);
    }
  }

  trigger(time: number, velocity: number): void {
    if (this.disposed) return;

    const v = Math.max(0.001, Math.min(1, velocity));
    const p = this.params;

    const modDecay = lerp(0.02, 0.35, p.modDecay);
    const decay = lerp(0.05, 0.8, p.decay);
    const bodyPeak = 0.25 + 0.6 * v;
    const indexHz = p.modIndex * lerp(0.6, 1.2, v);
    const noisePeak = p.noiseLevel * (0.2 + 0.5 * v);
    const noiseDecay = lerp(0.03, 0.4, p.noiseDecay);

    this.mod.frequency.cancelScheduledValues(time);
    this.mod.frequency.setValueAtTime(p.modFreq, time);

    this.modGain.gain.cancelScheduledValues(time);
    this.modGain.gain.setValueAtTime(indexHz, time);
    this.modGain.gain.exponentialRampToValueAtTime(0.001, time + modDecay);

    this.bodyGain.gain.cancelScheduledValues(time);
    this.bodyGain.gain.setValueAtTime(0.0001, time);
    this.bodyGain.gain.exponentialRampToValueAtTime(bodyPeak, time + 0.002);
    this.bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

    this.noiseGain.gain.cancelScheduledValues(time);
    this.noiseGain.gain.setValueAtTime(0.0001, time);
    this.noiseGain.gain.exponentialRampToValueAtTime(noisePeak, time + 0.001);
    this.noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + noiseDecay);

    const buf = getNoiseBuffer(this.ctx, this.sharedNoise);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = false;
    noise.connect(this.noiseGain);
    noise.start(time);
    noise.stop(time + 0.15);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const t = this.ctx.currentTime;
    try {
      this.bodyGain.gain.setTargetAtTime(0.0001, t, 0.01);
      this.noiseGain.gain.setTargetAtTime(0, t, 0.01);
      this.modGain.gain.setTargetAtTime(0, t, 0.01);
      setTimeout(() => {
        try {
          this.carrier.stop();
          this.mod.stop();
        } catch {}
        try {
          this.out.disconnect();
        } catch {}
      }, 50);
    } catch {}
  }
}
