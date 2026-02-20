type MacroKey = "color" | "decay" | "drive";

export type VoiceParams = {
  color: number; // 0..1
  decay: number; // 0..1
  drive: number; // 0..1
  ratio: number; // 0.25..8
  tone: number;  // 0..1
  feedback: number; // 0..1 (will be clamped internally)
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function makeFoldShaper(curveLen = 2048, amount = 0.6) {
  const curve = new Float32Array(curveLen);
  const a = Math.max(0.01, amount);
  for (let i = 0; i < curveLen; i++) {
    const x = (i / (curveLen - 1)) * 2 - 1;
    const t = 1 / (1 + 2.5 * a);
    let y = x * (1 + 3.0 * a);
    if (y > 1) y = 1 - (y - 1);
    if (y < -1) y = -1 - (y + 1);
    y = Math.tanh(y / t) * t;
    curve[i] = y;
  }
  return curve;
}

export class VerbosDsiFmPercVoice {
  private ctx: AudioContext;

  private carrier: OscillatorNode;
  private mod: OscillatorNode;

  private modGain: GainNode;
  private amp: GainNode;

  private preDrive: WaveShaperNode;
  private postDrive: WaveShaperNode;

  private lp: BiquadFilterNode;

  private fbGain: GainNode;
  private fbDelay: DelayNode;

  private out: GainNode;

  private params: VoiceParams;
  private disposed = false;

  constructor(ctx: AudioContext, destination: AudioNode, initial?: Partial<VoiceParams>) {
    this.ctx = ctx;

    this.params = {
      color: 0.4,
      decay: 0.4,
      drive: 0.2,
      ratio: 2,
      tone: 0.6,
      feedback: 0.08,
      ...initial,
    };

    this.carrier = ctx.createOscillator();
    this.carrier.type = "sine";

    this.mod = ctx.createOscillator();
    this.mod.type = "sine";

    this.modGain = ctx.createGain();
    this.modGain.gain.value = 0;

    this.mod.connect(this.modGain);
    this.modGain.connect(this.carrier.frequency);

    this.preDrive = ctx.createWaveShaper();
    this.preDrive.curve = makeFoldShaper(2048, 0.5);
    this.preDrive.oversample = "2x";

    this.lp = ctx.createBiquadFilter();
    this.lp.type = "lowpass";
    this.lp.Q.value = 0.8;

    this.postDrive = ctx.createWaveShaper();
    this.postDrive.curve = makeFoldShaper(2048, 0.25);
    this.postDrive.oversample = "2x";

    this.amp = ctx.createGain();
    this.amp.gain.value = 0;

    this.fbDelay = ctx.createDelay(0.05);
    this.fbDelay.delayTime.value = 0.012;

    this.fbGain = ctx.createGain();
    this.fbGain.gain.value = 0;

    this.out = ctx.createGain();
    this.out.gain.value = 1;

    this.carrier.connect(this.preDrive);
    this.preDrive.connect(this.lp);
    this.lp.connect(this.postDrive);
    this.postDrive.connect(this.amp);
    this.amp.connect(this.out);
    this.out.connect(destination);

    this.postDrive.connect(this.fbDelay);
    this.fbDelay.connect(this.fbGain);
    this.fbGain.connect(this.preDrive);

    this.carrier.start();
    this.mod.start();

    this.applyStaticParams(ctx.currentTime);
  }

  connect(node: AudioNode) {
    this.out.disconnect();
    this.out.connect(node);
  }

  setParam(key: MacroKey | keyof VoiceParams, value: number, time = this.ctx.currentTime) {
    if (this.disposed) return;

    if (key === "color") this.params.color = clamp01(value);
    else if (key === "decay") this.params.decay = clamp01(value);
    else if (key === "drive") this.params.drive = clamp01(value);
    else if (key === "ratio") this.params.ratio = Math.max(0.25, Math.min(8, value));
    else if (key === "tone") this.params.tone = clamp01(value);
    else if (key === "feedback") this.params.feedback = clamp01(value);

    this.applyStaticParams(time);
  }

  private applyStaticParams(time: number) {
    const cutoff = lerp(120, 9000, Math.pow(this.params.tone, 1.3));
    this.lp.frequency.setTargetAtTime(cutoff, time, 0.01);

    const driveAmt = lerp(0.15, 0.95, Math.pow(this.params.drive, 1.2));
    this.preDrive.curve = makeFoldShaper(2048, lerp(0.25, 0.85, this.params.color));
    this.postDrive.curve = makeFoldShaper(2048, driveAmt);

    const fb = lerp(0.0, 0.18, Math.pow(this.params.feedback, 1.4));
    this.fbGain.gain.setTargetAtTime(fb, time, 0.02);
  }

  trigger(time: number, velocity = 1, noteHz?: number) {
    if (this.disposed) return;

    const v = Math.max(0.001, Math.min(1, velocity));
    const baseHz = noteHz ?? lerp(80, 280, this.params.tone) * lerp(0.9, 1.1, (v - 0.5) * 0.2);
    const modHz = baseHz * this.params.ratio;

    const indexDepthHz = lerp(20, 800, Math.pow(this.params.color, 1.35)) * lerp(0.6, 1.2, v);
    const dec = lerp(0.03, 0.9, Math.pow(this.params.decay, 1.4));

    const pitchEnvDepth = lerp(30, 220, Math.pow(this.params.color, 1.1));
    const pitchDecay = lerp(0.01, 0.07, 1 - this.params.decay);

    this.carrier.frequency.cancelScheduledValues(time);
    this.carrier.frequency.setValueAtTime(baseHz + pitchEnvDepth, time);
    this.carrier.frequency.exponentialRampToValueAtTime(Math.max(1, baseHz), time + pitchDecay);

    this.mod.frequency.cancelScheduledValues(time);
    this.mod.frequency.setValueAtTime(Math.max(1, modHz), time);

    this.modGain.gain.cancelScheduledValues(time);
    this.modGain.gain.setValueAtTime(indexDepthHz, time);
    this.modGain.gain.exponentialRampToValueAtTime(0.001, time + dec);

    this.amp.gain.cancelScheduledValues(time);
    const ampPeak = lerp(0.12, 1.0, v);
    this.amp.gain.setValueAtTime(0.0001, time);
    this.amp.gain.exponentialRampToValueAtTime(ampPeak, time + 0.0025);
    this.amp.gain.exponentialRampToValueAtTime(0.0001, time + dec);

    const transientCut = lerp(1000, 9000, this.params.color);
    this.lp.frequency.cancelScheduledValues(time);
    this.lp.frequency.setValueAtTime(transientCut, time);
    this.lp.frequency.exponentialRampToValueAtTime(lerp(180, 3500, this.params.tone), time + lerp(0.02, 0.12, this.params.decay));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const t = this.ctx.currentTime;
    try {
      this.amp.gain.setTargetAtTime(0.0001, t, 0.01);
      this.modGain.gain.setTargetAtTime(0.0, t, 0.01);
      this.fbGain.gain.setTargetAtTime(0.0, t, 0.01);
      setTimeout(() => {
        try { this.carrier.stop(); this.mod.stop(); } catch {}
        try { this.out.disconnect(); } catch {}
      }, 50);
    } catch {}
  }
}
