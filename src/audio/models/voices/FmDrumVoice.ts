/**
 * Generalized FM drum/percussion voice (MD Drum Synth–style).
 * Two-operator FM: modulator -> carrier frequency; amp, mod-index, and optional pitch envelopes.
 * WebAudio only; no FFT, no convolution.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type FmDrumParams = {
  /** Carrier (base) frequency Hz */
  freq: number;
  /** Modulator frequency Hz (or ratio when useRatio) */
  modFreq: number;
  /** Use modFreq as ratio to carrier (e.g. 2 = 2:1) */
  useRatio: boolean;
  /** Amp envelope decay time (s) */
  decay: number;
  /** Modulator (FM index) envelope decay time (s) */
  modDecay: number;
  /** FM index (modulator gain into carrier freq) */
  modIndex: number;
  /** Pitch envelope amount (Hz) — sweep from freq+A_f to freq */
  pitchDecayAmount: number;
  /** Pitch envelope decay time (s) */
  pitchDecayTime: number;
  /** Modulator feedback 0..1 (clamped) */
  feedback: number;
};

const DEFAULT_PARAMS: FmDrumParams = {
  freq: 80,
  modFreq: 180,
  useRatio: false,
  decay: 0.4,
  modDecay: 0.12,
  modIndex: 15,
  pitchDecayAmount: 60,
  pitchDecayTime: 0.08,
  feedback: 0,
};

export class FmDrumVoice {
  private ctx: AudioContext;
  private carrier: OscillatorNode;
  private mod: OscillatorNode;
  private modGain: GainNode;
  private amp: GainNode;
  private out: GainNode;
  private params: FmDrumParams;
  private disposed = false;

  constructor(ctx: AudioContext, destination: AudioNode, initial?: Partial<FmDrumParams>) {
    this.ctx = ctx;
    this.params = { ...DEFAULT_PARAMS, ...initial };

    this.carrier = ctx.createOscillator();
    this.carrier.type = "sine";

    this.mod = ctx.createOscillator();
    this.mod.type = "sine";

    this.modGain = ctx.createGain();
    this.modGain.gain.value = 0;

    this.amp = ctx.createGain();
    this.amp.gain.value = 0;

    this.out = ctx.createGain();
    this.out.gain.value = 1;

    this.mod.connect(this.modGain);
    this.modGain.connect(this.carrier.frequency);
    this.carrier.connect(this.amp);
    this.amp.connect(this.out);
    this.out.connect(destination);

    this.carrier.start();
    this.mod.start();
  }

  setParam(key: string, value: number): void {
    if (this.disposed) return;
    const p = this.params as Record<string, number | boolean>;
    if (key === "freq") p.freq = Math.max(1, Math.min(2000, value));
    else if (key === "modFreq") p.modFreq = Math.max(0.1, Math.min(8000, value));
    else if (key === "useRatio") (this.params as Record<string, unknown>).useRatio = !!value;
    else if (key === "decay") p.decay = Math.max(0.01, Math.min(2, value));
    else if (key === "modDecay") p.modDecay = Math.max(0.001, Math.min(2, value));
    else if (key === "modIndex") p.modIndex = Math.max(0, Math.min(50, value));
    else if (key === "pitchDecayAmount") p.pitchDecayAmount = Math.max(0, Math.min(500, value));
    else if (key === "pitchDecayTime") p.pitchDecayTime = Math.max(0.001, Math.min(1, value));
    else if (key === "feedback") p.feedback = clamp01(value);
  }

  trigger(time: number, velocity: number, _note?: number): void {
    if (this.disposed) return;

    const v = Math.max(0.001, Math.min(1, velocity));
    const p = this.params;

    const baseHz = p.freq;
    const modHz = p.useRatio ? p.freq * Math.max(0.25, Math.min(40, p.modFreq)) : p.modFreq;

    const decay = lerp(0.03, 1.2, p.decay);
    const modDecay = lerp(0.01, 0.4, p.modDecay);
    const ampPeak = 0.3 + 0.7 * v;
    const indexHz = p.modIndex * lerp(0.5, 1.2, v);
    const pitchAmount = p.pitchDecayAmount * lerp(0.6, 1.2, v);
    const pitchDecay = Math.max(0.005, p.pitchDecayTime);

    this.carrier.frequency.cancelScheduledValues(time);
    this.carrier.frequency.setValueAtTime(baseHz + pitchAmount, time);
    this.carrier.frequency.exponentialRampToValueAtTime(Math.max(1, baseHz), time + pitchDecay);

    this.mod.frequency.cancelScheduledValues(time);
    this.mod.frequency.setValueAtTime(Math.max(1, modHz), time);

    this.modGain.gain.cancelScheduledValues(time);
    this.modGain.gain.setValueAtTime(indexHz, time);
    this.modGain.gain.exponentialRampToValueAtTime(0.001, time + modDecay);

    this.amp.gain.cancelScheduledValues(time);
    this.amp.gain.setValueAtTime(0.0001, time);
    this.amp.gain.exponentialRampToValueAtTime(ampPeak, time + 0.002);
    this.amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  }

  /** Cancel any scheduled envelopes and silence output (e.g. when transport stops). */
  silenceNow(): void {
    if (this.disposed) return;
    const t = this.ctx.currentTime;
    this.modGain.gain.cancelScheduledValues(t);
    this.modGain.gain.setValueAtTime(0, t);
    this.amp.gain.cancelScheduledValues(t);
    this.amp.gain.setValueAtTime(0.0001, t);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const t = this.ctx.currentTime;
    try {
      this.amp.gain.setTargetAtTime(0.0001, t, 0.01);
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
