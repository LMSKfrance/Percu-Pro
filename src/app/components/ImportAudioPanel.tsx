/**
 * Import Audio panel: file input, constraints, decode, scan progress, candidate cards.
 * Renders in the Pattern Sequencer area. Step 3: coarse scan + 6 candidate cards.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle, Play, Check, Square, Sparkles, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import * as audioDecode from "../../core/audio/audioDecode";
import * as audioEngine from "../../core/audio/AudioEngine";
import { runCoarseScan, type LoopCandidate, type ScanResult } from "../../core/audio/audioScan";
import { extractGroove, type GrooveTemplate } from "../../core/audio/grooveExtract";
import type { WarpFragment } from "../../core/audio/warpPlayer";
import { Knob } from "./Knob";

const MAX_MB = audioDecode.MAX_FILE_BYTES / (1024 * 1024);
const MAX_MIN = audioDecode.MAX_DURATION_SEC / 60;

type DecodeStatus = "idle" | "decoding" | "done" | "error";
type ScanStatus = "idle" | "scanning" | "done" | "error";

export interface DecodedAudio {
  buffer: AudioBuffer;
  durationSec: number;
}

export interface ImportAudioPanelState {
  decoded: DecodedAudio | null;
  scanResult: ScanResult | null;
  selectedCandidate: LoopCandidate | null;
}

interface ImportAudioPanelProps {
  onDecoded?: (decoded: DecodedAudio) => void;
  onScanDone?: (result: ScanResult) => void;
  onSelectCandidate?: (candidate: LoopCandidate | null) => void;
  onGrooveExtracted?: (template: GrooveTemplate | null, candidate: LoopCandidate | null) => void;
  /** Called when fragment is ready for warp (buffer + region + BPM). */
  onWarpFragmentReady?: (fragment: WarpFragment | null) => void;
  /** Whether warp loop is enabled to play with transport. */
  warpLoopEnabled?: boolean;
  onWarpLoopEnable?: (enabled: boolean) => void;
  /** Apply extracted groove to sequencer; strength 0..1. */
  onApplyGroove?: (template: GrooveTemplate, strength: number) => void;
  /** Sync sequencer BPM/start-stop to the selected audio. */
  onSyncToAudio?: (audioBpm: number) => void;
  /** Sync uploaded/selected audio to sequencer BPM/start-stop. */
  onSyncToSequencer?: () => void;
  /** Current transport playing state (for sync UI). */
  isTransportPlaying?: boolean;
  /** Current sequencer BPM (for sync UI). */
  sequencerBpm?: number;
  /** Warp clip gain 0..1. */
  warpGain?: number;
  /** Warp clip pitch in semitones (-12..12). */
  warpPitchSemitones?: number;
  onWarpGainChange?: (gain: number) => void;
  onWarpPitchChange?: (semitones: number) => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(2, "0")}`;
}

/** Draw waveform from AudioBuffer (mono, downsampled to fit width). */
function WaveformView({
  buffer,
  durationSec,
  width = 640,
  height = 56,
  className = "",
}: {
  buffer: AudioBuffer;
  durationSec: number;
  width?: number;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || buffer.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const numCh = buffer.numberOfChannels;
    const len = buffer.length;
    const samples = new Float32Array(len);
    if (numCh === 1) {
      samples.set(buffer.getChannelData(0));
    } else {
      for (let ch = 0; ch < numCh; ch++) {
        const chData = buffer.getChannelData(ch);
        for (let i = 0; i < len; i++) samples[i] += chData[i]!;
      }
      for (let i = 0; i < len; i++) samples[i] /= numCh;
    }

    const barCount = Math.min(width, Math.floor(len / 100));
    const step = len / barCount;
    const peaks: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const start = Math.floor(i * step);
      const end = Math.min(len, Math.floor((i + 1) * step));
      let max = 0;
      for (let j = start; j < end; j++) {
        const v = Math.abs(samples[j] ?? 0);
        if (v > max) max = v;
      }
      peaks.push(max);
    }

    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#F2F2EB";
    ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;
    const halfH = (height / 2) * 0.85;
    ctx.fillStyle = "#121212";
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < barCount; i++) {
      const x = (i / barCount) * width;
      const h = (peaks[i] ?? 0) * halfH;
      if (h >= 0.5) {
        ctx.fillRect(x, centerY - h, Math.max(1, width / barCount - 1), h * 2);
      }
    }
    ctx.globalAlpha = 1;
  }, [buffer, durationSec, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ display: "block", borderRadius: 4 }}
      aria-label="Audio waveform"
    />
  );
}

export function ImportAudioPanel({
  onDecoded,
  onScanDone,
  onSelectCandidate,
  onGrooveExtracted,
  onWarpFragmentReady,
  warpLoopEnabled = false,
  onWarpLoopEnable,
  onApplyGroove,
  onSyncToAudio,
  onSyncToSequencer,
  isTransportPlaying = false,
  sequencerBpm,
  warpGain = 1,
  warpPitchSemitones = 0,
  onWarpGainChange,
  onWarpPitchChange,
}: ImportAudioPanelProps) {
  const [status, setStatus] = useState<DecodeStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<DecodedAudio | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<LoopCandidate | null>(null);
  const [previewingCandidate, setPreviewingCandidate] = useState<LoopCandidate | null>(null);
  const [extractedGroove, setExtractedGroove] = useState<GrooveTemplate | null>(null);
  const [nudgeStartMs, setNudgeStartMs] = useState(0);
  const [manualBpm, setManualBpm] = useState<number | null>(null);
  const [manualBarLength, setManualBarLength] = useState<2 | 4 | 8 | null>(null);
  const [applyStrengthPct, setApplyStrengthPct] = useState(80);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewGainRef = useRef<GainNode | null>(null);

  const runScan = useCallback(
    (decodedInput?: DecodedAudio | null) => {
      const target = decodedInput ?? decoded;
      if (!target) return;
      setScanStatus("scanning");
      setScanProgress(0);
      setScanResult(null);
      setTimeout(() => {
        try {
          const mono = audioDecode.downmixToMono(target.buffer);
          const sr = target.buffer.sampleRate;
          const monoDown =
            sr <= audioDecode.DOWNSAMPLE_RATE
              ? mono
              : audioDecode.downsampleMono(mono, sr, audioDecode.DOWNSAMPLE_RATE);
          const result = runCoarseScan(
            monoDown,
            audioDecode.DOWNSAMPLE_RATE,
            target.durationSec,
            (pct) => setScanProgress(pct)
          );
          setScanResult(result);
          setScanStatus("done");
          onScanDone?.(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Scan failed.";
          toast.error(message);
          setScanStatus("error");
        }
      }, 0);
    },
    [decoded, onScanDone]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      const sizeCheck = audioDecode.validateFileSize(file);
      if (!sizeCheck.ok) {
        toast.error(sizeCheck.message);
        setStatus("error");
        setErrorMessage(sizeCheck.message);
        return;
      }

      setStatus("decoding");
      setErrorMessage(null);
      setScanStatus("idle");
      setScanResult(null);
      setSelectedCandidate(null);

      const ctx = audioEngine.getAudioContext();
      if (!ctx) {
        const msg = "Audio context not available.";
        toast.error(msg);
        setStatus("error");
        setErrorMessage(msg);
        return;
      }

      try {
        const result = await audioDecode.decodeFileToBuffer(file, ctx);
        const decodedState = { buffer: result.buffer, durationSec: result.durationSec };
        setDecoded(decodedState);
        setStatus("done");
        onDecoded?.(decodedState);
        runScan(decodedState);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Decode failed.";
        toast.error(message);
        setStatus("error");
        setErrorMessage(message);
        setDecoded(null);
      }
    },
    [onDecoded, runScan]
  );

  const triggerFileInput = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const stopPreview = useCallback(() => {
    const src = previewSourceRef.current;
    if (src) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
      previewSourceRef.current = null;
    }
    const gain = previewGainRef.current;
    if (gain) {
      gain.disconnect();
      previewGainRef.current = null;
    }
    setPreviewingCandidate(null);
  }, []);

  const handlePreview = useCallback(
    (c: LoopCandidate) => {
      if (!decoded) return;
      const ctx = audioEngine.getAudioContext();
      if (!ctx) {
        toast.error("Audio context not available.");
        return;
      }
      stopPreview();
      const startSec = c.startSec;
      const endSec = c.endSec;
      const duration = endSec - startSec;
      if (duration <= 0) return;
      const src = ctx.createBufferSource();
      src.buffer = decoded.buffer;
      src.loop = true;
      src.loopStart = startSec;
      src.loopEnd = endSec;
      const gain = ctx.createGain();
      gain.gain.value = 1;
      src.connect(gain);
      gain.connect(ctx.destination);
      const when = ctx.currentTime;
      src.start(when, startSec, duration);
      previewSourceRef.current = src;
      previewGainRef.current = gain;
      setPreviewingCandidate(c);
      src.onended = () => {
        previewSourceRef.current = null;
        previewGainRef.current = null;
        setPreviewingCandidate(null);
      };
    },
    [decoded, stopPreview]
  );

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  const handleSelectCandidate = useCallback(
    (c: LoopCandidate) => {
      const next = selectedCandidate === c ? null : c;
      setSelectedCandidate(next);
      setNudgeStartMs(0);
      setManualBpm(null);
      setManualBarLength(null);
      if (!next) {
        setExtractedGroove(null);
        onSelectCandidate?.(null);
        onGrooveExtracted?.(null, null);
        return;
      }
      onSelectCandidate?.(next);
    },
    [selectedCandidate, onSelectCandidate, onGrooveExtracted]
  );

  useEffect(() => {
    if (!selectedCandidate || !decoded) {
      setExtractedGroove(null);
      if (!selectedCandidate) {
        onGrooveExtracted?.(null, null);
        onWarpFragmentReady?.(null);
      }
      return;
    }
    const c = selectedCandidate;
    const startSec = Math.max(0, c.startSec + nudgeStartMs / 1000);
    const endSec = c.endSec;
    const bars = manualBarLength ?? c.barLength;
    const groove = extractGroove(
      decoded.buffer,
      startSec,
      endSec,
      bars,
      manualBpm ?? undefined
    );
    setExtractedGroove(groove);
    onGrooveExtracted?.(groove, selectedCandidate);
    onWarpFragmentReady?.({
      buffer: decoded.buffer,
      startSec,
      endSec,
      sourceBpm: groove.bpm,
      barLength: groove.barLength,
    });
  }, [decoded, selectedCandidate, nudgeStartMs, manualBpm, manualBarLength, onGrooveExtracted, onWarpFragmentReady]);

  return (
    <div className="border-b border-[#121212]/08 bg-[#F2F2EB]/60 px-8 py-4">
      <div className="flex items-center justify-between gap-6 flex-wrap mb-4">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono font-bold text-[#121212]/50 uppercase tracking-widest">
            Import Audio
          </span>
          <span className="text-[9px] font-mono text-[#121212]/35">
            ≤{MAX_MIN} min · ≤{MAX_MB} MB
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileSelect}
            aria-label="Choose audio file"
          />
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={status === "decoding"}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#121212]/12 bg-white/80 text-[11px] font-mono text-[#121212]/80 hover:bg-[#E66000]/10 hover:border-[#E66000]/30 transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            {status === "decoding" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Decoding…
              </>
            ) : (
              <>
                <Upload size={14} />
                Choose file
              </>
            )}
          </button>

          {status === "done" && decoded && scanStatus !== "scanning" && !scanResult && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#121212]/60">
              <CheckCircle size={12} className="text-green-600/80" />
              {(decoded.durationSec / 60).toFixed(2)} min · Ready for scan
            </span>
          )}
          {scanStatus === "scanning" && (
            <span className="flex items-center gap-2 text-[10px] font-mono text-[#121212]/60">
              <Loader2 size={12} className="animate-spin" />
              Scanning… {Math.round(scanProgress * 100)}%
            </span>
          )}
          {scanStatus === "done" && scanResult && (
            <span className="text-[10px] font-mono text-[#121212]/60">
              {scanResult.bpmEstimate.toFixed(0)} BPM · {scanResult.candidates.length} candidates
            </span>
          )}
          {status === "error" && errorMessage && (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-red-600/80" title={errorMessage}>
              <AlertCircle size={12} />
              Error
            </span>
          )}
        </div>
      </div>

      {decoded && (
        <div className="flex items-center gap-4 mb-4 p-3 rounded border border-[#121212]/08 bg-white/40">
          <div className="flex-1 min-w-0 rounded overflow-hidden border border-[#121212]/06">
            <WaveformView
              buffer={decoded.buffer}
              durationSec={decoded.durationSec}
              width={640}
              height={56}
              className="w-full"
            />
          </div>
          <button
            type="button"
            onClick={() => runScan(decoded)}
            disabled={scanStatus === "scanning"}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded border border-[#E66000]/30 bg-[#E66000]/10 text-[11px] font-mono font-bold text-[#E66000] hover:bg-[#E66000]/20 hover:border-[#E66000]/50 transition-colors disabled:opacity-60 disabled:pointer-events-none uppercase tracking-wide"
          >
            {scanStatus === "scanning" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Generate groove
              </>
            )}
          </button>
        </div>
      )}

      {selectedCandidate && extractedGroove && (
        <div className="mb-4 p-3 rounded border border-[#121212]/10 bg-white/50 flex flex-wrap items-center gap-4">
          <span className="text-[9px] font-mono font-bold text-[#121212]/50 uppercase tracking-widest">
            Fragment analysis
          </span>
          <span className="text-[10px] font-mono text-[#121212]/70">
            BPM {extractedGroove.bpm.toFixed(1)} ({Math.round(extractedGroove.bpmConfidence * 100)}% conf)
          </span>
          <span className="text-[10px] font-mono text-[#121212]/60">
            Onsets: {extractedGroove.onsetCount} · Groove: {extractedGroove.offsetsMs.length} steps
          </span>
          <div className="flex items-center gap-2">
            <label className="text-[8px] font-mono text-[#121212]/50 uppercase">Set BPM</label>
            <input
              type="number"
              min={60}
              max={200}
              step={0.1}
              placeholder={extractedGroove.bpm.toFixed(0)}
              className="w-14 px-1.5 py-0.5 rounded border border-[#121212]/15 text-[10px] font-mono bg-white/80"
              value={manualBpm ?? ""}
              onChange={(e) => {
                const v = e.target.valueAsNumber;
                setManualBpm(Number.isFinite(v) ? v : null);
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[8px] font-mono text-[#121212]/50 uppercase">Nudge start</label>
            <button
              type="button"
              className="w-7 h-6 rounded border border-[#121212]/15 text-[10px] font-mono hover:bg-[#121212]/05"
              onClick={() => setNudgeStartMs((n) => n - 10)}
            >
              −10ms
            </button>
            <span className="text-[10px] font-mono text-[#121212]/60 w-12 text-center">{nudgeStartMs}ms</span>
            <button
              type="button"
              className="w-7 h-6 rounded border border-[#121212]/15 text-[10px] font-mono hover:bg-[#121212]/05"
              onClick={() => setNudgeStartMs((n) => n + 10)}
            >
              +10ms
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[8px] font-mono text-[#121212]/50 uppercase">Bars</label>
            <select
              className="rounded border border-[#121212]/15 text-[10px] font-mono bg-white/80 px-1.5 py-0.5"
              value={manualBarLength ?? selectedCandidate.barLength}
              onChange={(e) => setManualBarLength(Number(e.target.value) as 2 | 4 | 8)}
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
            </select>
          </div>
          {onWarpLoopEnable && (
            <button
              type="button"
              onClick={() => onWarpLoopEnable(!warpLoopEnabled)}
              className={`px-3 py-1.5 rounded border text-[10px] font-mono ${
                warpLoopEnabled
                  ? "bg-[#E66000]/20 border-[#E66000]/50 text-[#E66000]"
                  : "border-[#121212]/15 text-[#121212]/70 hover:bg-[#121212]/05"
              }`}
              title="Warp clip to sequencer BPM; play/stop with master transport"
            >
              {warpLoopEnabled ? "Warp on" : "Warp"}
            </button>
          )}
          {onWarpGainChange && (
            <div className="flex items-center gap-1.5">
              <Knob
                label="Gain"
                size={32}
                min={0}
                max={100}
                value={Math.round(warpGain * 100)}
                onChange={(v) => onWarpGainChange(v / 100)}
                variant="light"
                accentColor="#E66000"
              />
            </div>
          )}
          {onWarpPitchChange && (
            <div className="flex items-center gap-1.5">
              <Knob
                label="Pitch"
                size={32}
                min={0}
                max={100}
                value={Math.round(((warpPitchSemitones + 12) / 24) * 100)}
                onChange={(v) => onWarpPitchChange(Math.round((v / 100) * 24 - 12))}
                variant="light"
                accentColor="#E66000"
              />
              <span className="text-[9px] font-mono text-[#121212]/50 w-6">
                {warpPitchSemitones === 0 ? "0" : warpPitchSemitones > 0 ? `+${warpPitchSemitones}` : warpPitchSemitones}st
              </span>
            </div>
          )}
          {onSyncToAudio && (
            <button
              type="button"
              onClick={() => onSyncToAudio(extractedGroove.bpm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#121212]/15 text-[10px] font-mono text-[#121212]/70 hover:bg-[#121212]/05 hover:border-[#00D2FF]/40 hover:text-[#00D2FF]/90"
              title="Set sequencer BPM to audio and sync start/stop"
            >
              <ArrowDownToLine size={12} />
              Sync to audio
            </button>
          )}
          {onSyncToSequencer && (
            <button
              type="button"
              onClick={onSyncToSequencer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#121212]/15 text-[10px] font-mono text-[#121212]/70 hover:bg-[#121212]/05 hover:border-[#00D2FF]/40 hover:text-[#00D2FF]/90"
              title="Sync audio to sequencer BPM and start/stop"
            >
              <ArrowUpFromLine size={12} />
              Sync to sequencer
            </button>
          )}
          {onApplyGroove && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-[8px] font-mono text-[#121212]/50 uppercase">Strength</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={applyStrengthPct}
                  onChange={(e) => setApplyStrengthPct(Number(e.target.value))}
                  className="w-20 h-1.5 accent-[#E66000]"
                />
                <span className="text-[10px] font-mono text-[#121212]/60 w-8">{applyStrengthPct}%</span>
              </div>
              <button
                type="button"
                onClick={() => extractedGroove && onApplyGroove(extractedGroove, applyStrengthPct / 100)}
                className="px-3 py-1.5 rounded border border-[#E66000]/40 bg-[#E66000]/10 text-[10px] font-mono text-[#E66000] hover:bg-[#E66000]/20"
              >
                Apply Groove
              </button>
            </>
          )}
        </div>
      )}

      {scanStatus === "done" && scanResult && scanResult.candidates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {scanResult.candidates.map((c) => (
            <div
              key={`${c.startSec}-${c.barLength}`}
              className={`rounded border p-2.5 bg-white/70 border-[#121212]/10 ${
                selectedCandidate === c ? "ring-2 ring-[#E66000]/60 border-[#E66000]/40" : ""
              }`}
            >
              <div className="text-[9px] font-mono font-bold text-[#121212]/70 uppercase tracking-wide mb-1">
                {c.label}
              </div>
              <div className="text-[10px] font-mono text-[#121212]/50 mb-1.5">
                {formatTime(c.startSec)} – {formatTime(c.endSec)}
              </div>
              <div className="text-[9px] font-mono text-[#121212]/40 mb-2">
                {c.barLength} bars · {c.bpmEstimate.toFixed(0)} BPM
              </div>
              <div className="flex gap-1.5">
                {previewingCandidate === c ? (
                  <button
                    type="button"
                    onClick={stopPreview}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded border border-[#E66000]/40 bg-[#E66000]/15 text-[9px] font-mono text-[#E66000] hover:bg-[#E66000]/25"
                  >
                    <Square size={10} />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePreview(c)}
                    disabled={!decoded}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded border border-[#121212]/15 text-[9px] font-mono text-[#121212]/70 hover:bg-[#121212]/05 disabled:opacity-50"
                    title="Preview loop"
                  >
                    <Play size={10} />
                    Preview
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectCandidate(c)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 rounded border text-[9px] font-mono ${
                    selectedCandidate === c
                      ? "bg-[#E66000]/20 border-[#E66000]/50 text-[#E66000]"
                      : "border-[#121212]/15 text-[#121212]/70 hover:bg-[#121212]/05"
                  }`}
                >
                  <Check size={10} />
                  {selectedCandidate === c ? "Selected" : "Select"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
