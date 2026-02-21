"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, useMotionValue } from "motion/react";
import type { TrackId } from "../../core/types";

const TRACK_IDS: TrackId[] = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"];
const SHORT_LABELS: Record<TrackId, string> = {
  noise: "Hat",
  hiPerc: "Mid",
  lowPerc: "Low",
  clap: "Clap",
  chord: "Chord",
  bass: "Acid",
  subPerc: "Sub",
  kick: "Kick",
};

const FADER_HEIGHT = 72;
const FADER_TRACK = FADER_HEIGHT - 14;

type MiniMixerProps = {
  laneMuted: Partial<Record<TrackId, boolean>>;
  laneGain: Partial<Record<TrackId, number>>;
  h3kSend: Partial<Record<TrackId, number>>;
  onMuteToggle: (laneId: TrackId) => void;
  onGainChange: (laneId: TrackId, gain: number) => void;
  onH3kSendChange: (laneId: TrackId, send: number) => void;
  onKillFx?: () => void;
  /** Placeholder until Phase 5: 0..1 per channel */
  meterLevels?: Partial<Record<TrackId, { rms: number; peak: number }>>;
  masterGain?: number;
  onMasterGainChange?: (gain: number) => void;
  /** Placeholder for master meter */
  masterMeter?: { rms: number; peak: number };
};

function MiniFader({
  value,
  onChange,
  meterRms = 0,
  meterPeak = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  meterRms?: number;
  meterPeak?: number;
}) {
  const trackHeight = FADER_TRACK;
  const yFromValue = (v: number) => (1 - v) * trackHeight;
  const dragY = useMotionValue(yFromValue(value));
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) dragY.set(yFromValue(value));
  }, [value, isDragging]);

  const handleDragEnd = useCallback(() => {
    const y = dragY.get();
    const v = Math.max(0, Math.min(1, 1 - y / trackHeight));
    onChange(v);
    setIsDragging(false);
  }, [onChange]);

  return (
    <div className="relative flex flex-col items-center" style={{ width: 28, height: FADER_HEIGHT }}>
      <div className="absolute left-1/2 -translate-x-1/2 top-1.5 bottom-1.5 w-1.5 bg-[#0a0a0a] rounded-full border border-[#2a2a2a] shadow-inner overflow-hidden">
        {/* Mini meter bar (glowing, reflects level) */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-[#00D2FF]/50 rounded-full transition-all duration-75"
          style={{ height: `${Math.min(100, (meterRms * 100) | 0)}%` }}
        />
        {meterPeak > meterRms && (
          <div
            className="absolute left-0 right-0 w-0.5 bg-[#E66000]/80 rounded-full"
            style={{ bottom: `${(meterPeak * 100) | 0}%`, height: 2 }}
          />
        )}
      </div>
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: trackHeight }}
        dragElastic={0}
        dragMomentum={false}
        style={{ y: dragY }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onDrag={handleDragEnd}
        className="absolute left-1/2 -translate-x-1/2 w-6 h-3 bg-[#d1d1ca] rounded-[2px] cursor-ns-resize shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] border border-[#a1a19a] z-10"
      />
    </div>
  );
}

/** Hit area min 28px for M/S */
function MuteSoloButton({
  active,
  label,
  onClick,
  "aria-label": ariaLabel,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`min-w-[28px] min-h-[28px] w-7 h-7 rounded border flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
        active
          ? "border-[#E66000]/60 bg-[#E66000]/20 text-[#E66000]"
          : "border-[#1F2128] text-white/40 hover:bg-white/[0.04] hover:border-white/10"
      }`}
    >
      {label}
    </button>
  );
}

export function MiniMixer({
  laneMuted,
  laneGain,
  h3kSend,
  onMuteToggle,
  onGainChange,
  onH3kSendChange,
  onKillFx,
  meterLevels = {},
  masterGain = 1,
  onMasterGainChange,
  masterMeter = { rms: 0, peak: 0 },
}: MiniMixerProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">Mini Mixer</span>
      <div className="flex gap-2 overflow-x-auto pb-1 min-h-0">
        {TRACK_IDS.map((id) => {
          const gain = laneGain[id] ?? 1;
          const muted = laneMuted[id] ?? false;
          const send = h3kSend[id] ?? 0;
          const meter = meterLevels[id] ?? { rms: 0, peak: 0 };
          return (
            <div
              key={id}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 p-1.5 rounded border border-white/[0.03] bg-white/[0.02] min-w-[56px]"
            >
              <span className="text-[9px] font-mono font-bold text-white/60 truncate w-full text-center" title={id}>
                {SHORT_LABELS[id]}
              </span>
              <div className="flex gap-0.5">
                <MuteSoloButton
                  active={muted}
                  label="M"
                  onClick={() => onMuteToggle(id)}
                  aria-label={`Mute ${SHORT_LABELS[id]}`}
                />
                <MuteSoloButton active={false} label="S" onClick={() => {}} aria-label={`Solo ${SHORT_LABELS[id]}`} />
              </div>
              <MiniFader
                value={gain}
                onChange={(v) => onGainChange(id, v)}
                meterRms={meter.rms}
                meterPeak={meter.peak}
              />
              <div className="flex flex-col items-center gap-0.5 min-h-[32px] justify-center">
                <span className="text-[7px] font-mono text-white/30">H3K</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={(send * 100) | 0}
                  onChange={(e) => onH3kSendChange(id, Number(e.target.value) / 100)}
                  className="w-10 h-2 accent-[#00D2FF] rounded-full bg-[#1F2128] min-h-[28px] touch-manipulation"
                  aria-label={`H3K send ${SHORT_LABELS[id]}`}
                />
              </div>
            </div>
          );
        })}
        {/* Master strip */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 p-1.5 rounded border border-[#E66000]/20 bg-[#E66000]/5 min-w-[56px]">
          <span className="text-[9px] font-mono font-bold text-[#E66000]/80">Master</span>
          <div className="flex-1" />
          <MiniFader
            value={masterGain}
            onChange={onMasterGainChange ?? (() => {})}
            meterRms={masterMeter.rms}
            meterPeak={masterMeter.peak}
          />
          {onKillFx && (
            <button
              type="button"
              onClick={onKillFx}
              className="min-w-[28px] min-h-[28px] px-1.5 py-0.5 rounded border border-[#E66000]/40 text-[8px] font-mono font-bold text-[#E66000]/80 hover:bg-[#E66000]/10 transition-colors"
            >
              Kill FX
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
