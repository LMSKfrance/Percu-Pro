/**
 * Audio import: decode file to AudioBuffer, downmix to mono, downsample for analysis.
 * Hard caps: 30MB file size, 180s duration (3 min).
 */

/** Max file size in bytes (30 MB) */
export const MAX_FILE_BYTES = 30 * 1024 * 1024;

/** Max duration in seconds (3 minutes) */
export const MAX_DURATION_SEC = 180;

/** Target sample rate for coarse scan (balance quality vs speed). */
export const DOWNSAMPLE_RATE = 11025;

export interface DecodeResult {
  buffer: AudioBuffer;
  durationSec: number;
  sampleRate: number;
  channelCount: number;
}

/**
 * Validate file size before decoding. Call this first to avoid loading huge files.
 */
export function validateFileSize(file: File): { ok: true } | { ok: false; message: string } {
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `File too large. Max ${MAX_FILE_BYTES / (1024 * 1024)} MB.`,
    };
  }
  return { ok: true };
}

/**
 * Decode audio file to AudioBuffer. Rejects if duration > MAX_DURATION_SEC.
 * Uses OfflineAudioContext for deterministic decode; returns buffer suitable for playback and analysis.
 */
export async function decodeFileToBuffer(
  file: File,
  audioContext: AudioContext
): Promise<DecodeResult> {
  const sizeCheck = validateFileSize(file);
  if (!sizeCheck.ok) throw new Error(sizeCheck.message);

  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  const durationSec = audioBuffer.duration;
  if (durationSec > MAX_DURATION_SEC) {
    throw new Error(
      `Audio too long (${durationSec.toFixed(1)} s). Max ${MAX_DURATION_SEC} s (3 min).`
    );
  }

  return {
    buffer: audioBuffer,
    durationSec,
    sampleRate: audioBuffer.sampleRate,
    channelCount: audioBuffer.numberOfChannels,
  };
}

/**
 * Downmix multichannel buffer to mono (average of channels).
 * Returns a Float32Array of length buffer.length * buffer.numberOfChannels, but we return
 * mono length = buffer.length (one channel).
 */
export function downmixToMono(buffer: AudioBuffer): Float32Array {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const out = new Float32Array(length);
  if (numChannels === 1) {
    out.set(buffer.getChannelData(0));
    return out;
  }
  for (let ch = 0; ch < numChannels; ch++) {
    const chData = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) out[i] += chData[i];
  }
  const scale = 1 / numChannels;
  for (let i = 0; i < length; i++) out[i] *= scale;
  return out;
}

/**
 * Downsample mono Float32Array to target sample rate using linear interpolation.
 * Used for coarse scan to reduce CPU (target 11025 Hz or 22050 Hz).
 */
export function downsampleMono(
  mono: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (targetSampleRate >= sourceSampleRate) return mono;
  const ratio = sourceSampleRate / targetSampleRate;
  const outLength = Math.floor(mono.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const frac = srcIdx - lo;
    const a = mono[lo] ?? 0;
    const b = mono[Math.min(lo + 1, mono.length - 1)] ?? 0;
    out[i] = a + frac * (b - a);
  }
  return out;
}

/**
 * Full pipeline: decode file, then produce mono downsampled Float32Array for analysis.
 * Caller must provide an AudioContext (e.g. from user gesture).
 */
export async function decodeAndPrepareForScan(
  file: File,
  audioContext: AudioContext,
  targetSampleRate: number = DOWNSAMPLE_RATE
): Promise<{ buffer: AudioBuffer; monoDownsampled: Float32Array; durationSec: number }> {
  const result = await decodeFileToBuffer(file, audioContext);
  const mono = downmixToMono(result.buffer);
  const monoDownsampled =
    result.sampleRate <= targetSampleRate
      ? mono
      : downsampleMono(mono, result.sampleRate, targetSampleRate);
  return {
    buffer: result.buffer,
    monoDownsampled,
    durationSec: result.durationSec,
  };
}
