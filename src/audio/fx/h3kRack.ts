/**
 * Global H3K-style FX rack: micro-pitch (width) + dual delay + diffusion.
 * CPU-safe: no convolution, no FFT, no granular pitch. One send/return.
 */

const FEEDBACK_CAP = 0.85;
const SMOOTH_TIME = 0.03;

export interface H3KRackParams {
  width: number;   // 0..1 microPitch depth + stereo spread
  time: number;   // 0..1 delay time range + diffusion amount
  chaos: number;  // 0..1 modulation + feedback + filter movement
  feedbackTone: number;  // 0..1 darker to brighter (filter in fb)
  diffuseAmount: number;  // 0..1
  returnLevel: number;  // 0..1
}

const defaultParams: H3KRackParams = {
  width: 0.3,
  time: 0.4,
  chaos: 0.2,
  feedbackTone: 0.5,
  diffuseAmount: 0.4,
  returnLevel: 0.6,
};

export interface H3KRack {
  input: GainNode;
  output: GainNode;
  setParams(p: Partial<H3KRackParams>): void;
  killFx(): void;
  dispose(): void;
}

export function createH3KRack(ctx: AudioContext): H3KRack {
  const params: H3KRackParams = { ...defaultParams };
  const input = ctx.createGain();
  input.gain.value = 1;

  // MicroPitch: two short modulated delays L/R (8–25ms)
  const delL = ctx.createDelay(0.03);
  const delR = ctx.createDelay(0.03);
  delL.delayTime.value = 0.012;
  delR.delayTime.value = 0.018;
  const microPitchGainL = ctx.createGain();
  const microPitchGainR = ctx.createGain();
  input.connect(delL);
  input.connect(delR);
  delL.connect(microPitchGainL);
  delR.connect(microPitchGainR);

  // Dual Delay: stereo delay with feedback cap, filter in fb
  const delayTimeL = ctx.createDelay(2);
  const delayTimeR = ctx.createDelay(2);
  delayTimeL.delayTime.value = 0.25;
  delayTimeR.delayTime.value = 0.375;
  const fbGain = ctx.createGain();
  fbGain.gain.value = 0.5;
  const fbFilter = ctx.createBiquadFilter();
  fbFilter.type = "lowpass";
  fbFilter.frequency.value = 4000;
  fbFilter.Q.value = 0.5;
  const softClip = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 128 - 1) * 2;
    curve[i] = Math.tanh(x);
  }
  softClip.curve = curve;

  const mergeL = ctx.createGain();
  const mergeR = ctx.createGain();
  microPitchGainL.connect(mergeL);
  microPitchGainR.connect(mergeR);
  mergeL.connect(delayTimeL);
  mergeR.connect(delayTimeR);

  const wetGainL = ctx.createGain();
  const wetGainR = ctx.createGain();
  delayTimeL.connect(wetGainL);
  delayTimeR.connect(wetGainR);
  wetGainL.connect(fbFilter);
  wetGainR.connect(fbFilter);
  fbFilter.connect(softClip);
  softClip.connect(fbGain);
  fbGain.connect(mergeL);
  fbGain.connect(mergeR);

  // Diffusion: 3 short delays into sum
  const sumLR = ctx.createGain();
  wetGainL.connect(sumLR);
  wetGainR.connect(sumLR);
  const diffDelays = [ctx.createDelay(0.1), ctx.createDelay(0.1), ctx.createDelay(0.1)];
  const diffGains = [ctx.createGain(), ctx.createGain(), ctx.createGain()];
  diffDelays[0].delayTime.value = 0.005;
  diffDelays[1].delayTime.value = 0.011;
  diffDelays[2].delayTime.value = 0.017;
  diffGains[0].gain.value = 0.7;
  diffGains[1].gain.value = 0.5;
  diffGains[2].gain.value = 0.3;
  const diffSum = ctx.createGain();
  sumLR.connect(diffSum);
  sumLR.connect(diffDelays[0]);
  sumLR.connect(diffDelays[1]);
  sumLR.connect(diffDelays[2]);
  diffDelays[0].connect(diffGains[0]);
  diffDelays[1].connect(diffGains[1]);
  diffDelays[2].connect(diffGains[2]);
  diffGains[0].connect(diffSum);
  diffGains[1].connect(diffSum);
  diffGains[2].connect(diffSum);

  // Return gain + limiter
  const returnGain = ctx.createGain();
  returnGain.gain.value = params.returnLevel;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 8;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;
  diffSum.connect(returnGain);
  returnGain.connect(limiter);

  const output = ctx.createGain();
  output.gain.value = 1;
  limiter.connect(output);

  function applyParams() {
    const t = ctx.currentTime;
    const w = params.width;
    const tm = params.time;
    const c = params.chaos;
    delL.delayTime.setTargetAtTime(0.008 + w * 0.008 + c * 0.004, t, SMOOTH_TIME);
    delR.delayTime.setTargetAtTime(0.016 + w * 0.009 + c * 0.005, t, SMOOTH_TIME);
    microPitchGainL.gain.setTargetAtTime(0.7 + w * 0.3, t, SMOOTH_TIME);
    microPitchGainR.gain.setTargetAtTime(0.7 + w * 0.3, t, SMOOTH_TIME);

    const baseTime = 0.15 + tm * 0.4;
    delayTimeL.delayTime.setTargetAtTime(baseTime, t, SMOOTH_TIME);
    delayTimeR.delayTime.setTargetAtTime(baseTime * 1.5, t, SMOOTH_TIME);
    const fb = Math.min(FEEDBACK_CAP, 0.3 + tm * 0.4 + c * 0.2);
    fbGain.gain.setTargetAtTime(fb, t, SMOOTH_TIME);
    const freq = 2000 + params.feedbackTone * 6000;
    fbFilter.frequency.setTargetAtTime(freq, t, SMOOTH_TIME);

    const diff = params.diffuseAmount * 0.5 + c * 0.2;
    diffGains[0].gain.setTargetAtTime(0.5 + diff, t, SMOOTH_TIME);
    diffGains[1].gain.setTargetAtTime(0.3 + diff * 0.8, t, SMOOTH_TIME);
    diffGains[2].gain.setTargetAtTime(0.2 + diff * 0.6, t, SMOOTH_TIME);

    returnGain.gain.setTargetAtTime(params.returnLevel, t, SMOOTH_TIME);
  }

  function setParams(p: Partial<H3KRackParams>) {
    if (p.width !== undefined) params.width = p.width;
    if (p.time !== undefined) params.time = p.time;
    if (p.chaos !== undefined) params.chaos = p.chaos;
    if (p.feedbackTone !== undefined) params.feedbackTone = p.feedbackTone;
    if (p.diffuseAmount !== undefined) params.diffuseAmount = p.diffuseAmount;
    if (p.returnLevel !== undefined) params.returnLevel = p.returnLevel;
    applyParams();
  }

  function killFx() {
    const t = ctx.currentTime;
    returnGain.gain.setValueAtTime(0, t);
    fbGain.gain.setValueAtTime(0, t);
    setTimeout(() => {
      const t2 = ctx.currentTime;
      fbGain.gain.setValueAtTime(Math.min(FEEDBACK_CAP, 0.3 + params.time * 0.4 + params.chaos * 0.2), t2);
      returnGain.gain.setTargetAtTime(params.returnLevel, t2, SMOOTH_TIME);
    }, 100);
  }

  applyParams();

  return {
    input,
    output,
    setParams,
    killFx,
    dispose() {
      input.disconnect();
    },
  };
}
