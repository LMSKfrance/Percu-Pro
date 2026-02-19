"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Repeat, Square, Play, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import { clamp } from "../../lib/utils";

const DRAG_SENSITIVITY = 0.001; // 100px mouse => 10% param change
const DOCK_HEIGHT = 64;

export type MasterDockCollapsedProps = {
  isPlaying: boolean;
  isLooping: boolean;
  bpm: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  onBpmChange: (bpm: number) => void;
  onExpand: () => void;
  /** When expanded, show chevron down and call this to collapse */
  onCollapse?: () => void;
  isExpanded?: boolean;
  /** When user clicks the bar (e.g. label area), scroll footer into view */
  onBarClick?: () => void;
  /** When true, bar is inside footer container (no fixed positioning) so it doesn't overlap panel */
  embedded?: boolean;
};

// Spark meter: 2px full-width, cyan signal, orange for peaks above -3dB (mock)
function SparkMeter() {
  const level = 0.65;
  const peakAbove = 0.88;
  return (
    <div className="absolute left-0 right-0 top-0 h-[2px] overflow-hidden bg-[#1F2128]">
      <div className="h-full w-full flex">
        <div className="h-full bg-[#00D2FF]" style={{ width: `${level * 100}%` }} />
        {peakAbove > 0.85 && <div className="h-full w-[2px] flex-shrink-0 bg-[#E66000]" />}
      </div>
    </div>
  );
}

// Fine-grain draggable: 100px => 10%. Shift+Click => reset to default. Tooltip on hover.
function useFineDrag(
  value: number,
  min: number,
  max: number,
  defaultVal: number,
  onChange: (v: number) => void,
  tooltipLabel: string
) {
  const [isDragging, setIsDragging] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const startRef = useRef({ y: 0, value: 0 });

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        onChange(defaultVal);
        return;
      }
      startRef.current = { y: e.clientY, value };
      setIsDragging(true);
    },
    [value, defaultVal, onChange]
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const delta = startRef.current.y - e.clientY;
      const range = max - min;
      const change = delta * DRAG_SENSITIVITY * range;
      const next = clamp(startRef.current.value + change, min, max);
      onChange(next);
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, min, max, onChange]);

  const onMouseEnter = () => setTooltip(tooltipLabel);
  const onMouseLeave = () => setTooltip(null);

  return { onMouseDown, onMouseEnter, onMouseLeave, tooltip, isDragging };
}

// Mini knob 20px with fine-grain drag and shift+click reset
function MiniKnob({
  value,
  min,
  max,
  defaultVal,
  onChange,
  tooltipLabel,
}: {
  value: number;
  min: number;
  max: number;
  defaultVal: number;
  onChange: (v: number) => void;
  tooltipLabel: string;
}) {
  const { onMouseDown, onMouseEnter, onMouseLeave, tooltip } = useFineDrag(
    value,
    min,
    max,
    defaultVal,
    onChange,
    tooltipLabel
  );
  const rotation = ((value - min) / (max - min)) * 270 - 135;
  return (
    <div className="relative flex flex-col items-center">
      <div
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="w-5 h-5 rounded-full bg-[#1F2128] border border-[#2a2d35] flex items-center justify-center cursor-ns-resize"
      >
        <div
          className="w-px h-1 bg-[#00D2FF]"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#0D0E12] border border-[#1F2128] rounded text-[10px] font-mono text-white/90 whitespace-nowrap z-50 pointer-events-none">
          {tooltipLabel}: {value.toFixed(1)}
        </div>
      )}
    </div>
  );
}

// Value dragger: vertical drag changes number, shift+click reset
function ValueDragger({
  value,
  min,
  max,
  defaultVal,
  onChange,
  format = (v) => v.toFixed(1),
  tooltipLabel,
}: {
  value: number;
  min: number;
  max: number;
  defaultVal: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  tooltipLabel: string;
}) {
  const { onMouseDown, onMouseEnter, onMouseLeave, tooltip } = useFineDrag(
    value,
    min,
    max,
    defaultVal,
    onChange,
    tooltipLabel
  );
  return (
    <div className="relative flex flex-col items-center">
      <div
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className="text-[11px] font-mono text-white/80 cursor-ns-resize px-1 py-0.5 border border-transparent hover:border-white/10 rounded"
      >
        {format(value)}
      </div>
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#0D0E12] border border-[#1F2128] rounded text-[10px] font-mono text-white/90 whitespace-nowrap z-50 pointer-events-none">
          {tooltipLabel}: {format(value)}
        </div>
      )}
    </div>
  );
}

// Tiny vertical GR meter
function MiniGRMeter({ gr = 0 }: { gr?: number }) {
  const pct = clamp(gr, 0, 100);
  return (
    <div className="w-1 h-8 bg-[#1F2128] rounded-full overflow-hidden flex flex-col justify-end">
      <div className="w-full bg-[#00D2FF]/60" style={{ height: `${pct}%` }} />
    </div>
  );
}

// Tiny horizontal Wet slider
function MiniWetSlider({
  value,
  onChange,
  tooltipLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  tooltipLabel: string;
}) {
  const [tooltip, setTooltip] = useState(false);
  const { onMouseDown, onMouseEnter, onMouseLeave, tooltip: dragTooltip } = useFineDrag(
    value,
    0,
    100,
    50,
    onChange,
    tooltipLabel
  );
  const showTooltip = tooltip || dragTooltip;
  return (
    <div className="relative flex items-center gap-1">
      <div
        className="w-12 h-1.5 bg-[#1F2128] rounded-full overflow-hidden cursor-ns-resize"
        onMouseDown={onMouseDown}
        onMouseEnter={() => { setTooltip(true); onMouseEnter(); }}
        onMouseLeave={() => { setTooltip(false); onMouseLeave(); }}
      >
        <div className="h-full bg-[#00D2FF]/70 rounded-full" style={{ width: `${value}%` }} />
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#0D0E12] border border-[#1F2128] rounded text-[10px] font-mono text-white/90 z-50 pointer-events-none">
          {tooltipLabel}: {value.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

export function MasterDockCollapsed({
  isPlaying,
  isLooping,
  bpm,
  onTogglePlay,
  onStop,
  onToggleLoop,
  onBpmChange,
  onExpand,
  onCollapse,
  isExpanded,
  onBarClick,
  embedded,
}: MasterDockCollapsedProps) {
  const [dynamicsThresh, setDynamicsThresh] = useState(50);
  const [driveDb, setDriveDb] = useState(0);
  const [rumOn, setRumOn] = useState(false);
  const [wet, setWet] = useState(50);
  const [bpmInput, setBpmInput] = useState(String(bpm));
  const [bpmFocused, setBpmFocused] = useState(false);
  const bpmDragStart = useRef({ y: 0, value: 0, moved: false });

  useEffect(() => {
    if (!bpmFocused) setBpmInput(String(bpm));
  }, [bpm, bpmFocused]);

  const commitBpm = () => {
    const n = parseFloat(bpmInput);
    if (!Number.isNaN(n) && n >= 20 && n <= 300) onBpmChange(n);
    setBpmFocused(false);
  };

  const onBpmMouseDown = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      onBpmChange(128);
      setBpmInput("128");
      return;
    }
    bpmDragStart.current = { y: e.clientY, value: bpm, moved: false };
    const onMove = (ev: MouseEvent) => {
      if (Math.abs(ev.clientY - bpmDragStart.current.y) > 2) bpmDragStart.current.moved = true;
      const delta = (bpmDragStart.current.y - ev.clientY) * 0.1;
      const next = clamp(Math.round((bpmDragStart.current.value + delta) * 10) / 10, 20, 300);
      onBpmChange(next);
    };
    const onUp = () => {
      if (!bpmDragStart.current.moved) setBpmFocused(true);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      className={`flex flex-col border-t border-[#1F2128] bg-[#0D0E12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] flex-shrink-0 ${embedded ? "" : "fixed bottom-0 left-0 right-0 z-50"}`}
      style={{ height: DOCK_HEIGHT }}
    >
      <SparkMeter />
      <div className="flex-1 flex items-center justify-between px-6 gap-6 min-h-0">
        {/* Status (Left) - clickable to scroll footer into view */}
        <div
          {...(onBarClick && {
            role: "button" as const,
            tabIndex: 0,
            onClick: onBarClick,
            onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && onBarClick(),
            "aria-label": "Scroll to footer",
          })}
          className={`flex items-center gap-4 flex-shrink-0 select-none ${onBarClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
        >
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/50">
            STEREO MASTER OUTPUT
          </span>
          <div className="flex items-center gap-3 border-l border-[#1F2128] pl-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#E66000]" />
              <span className="text-[8px] font-mono font-bold text-white/30 uppercase tracking-widest">REC</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D2FF]" />
              <span className="text-[8px] font-mono font-bold text-white/30 uppercase tracking-widest">SYNC_LOCKED</span>
            </div>
          </div>
        </div>

        {/* Transport + BPM (Center) */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={onToggleLoop}
            className="w-11 h-11 rounded-full border border-[#1F2128] flex items-center justify-center hover:bg-white/[0.04] transition-colors group"
          >
            <Repeat size={14} className={`${isLooping ? "text-white/40" : "text-white/20"} group-hover:text-[#00D2FF]/60`} />
          </button>
          <button
            onClick={onStop}
            className="w-11 h-11 rounded-full border border-[#1F2128] flex items-center justify-center hover:bg-white/[0.04] transition-colors group"
          >
            <Square size={14} className="text-white/30 group-hover:text-[#E66000]/60" fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            className={`rounded-full border flex items-center justify-center transition-all group ${isPlaying ? "border-[#E66000]/50 shadow-[0_0_12px_rgba(230,96,0,0.25)] bg-[#E66000]/10" : "border-[#1F2128] hover:border-[#E66000]/30 bg-white/[0.02]"}`}
            style={{ width: 44, height: 44 }}
          >
            <Play size={18} className="text-[#E66000]/90 ml-0.5" fill="currentColor" />
          </button>
          <div
            className="flex items-center min-w-[88px] h-9 px-2 border border-[#1F2128] rounded cursor-ns-resize"
            onMouseDown={onBpmMouseDown}
          >
            {bpmFocused ? (
              <input
                autoFocus
                value={bpmInput}
                onChange={(e) => setBpmInput(e.target.value)}
                onBlur={commitBpm}
                onKeyDown={(e) => e.key === "Enter" && commitBpm()}
                className="w-full bg-transparent text-[14px] font-mono font-bold text-white/90 outline-none"
              />
            ) : (
              <span
                className="text-[14px] font-mono font-bold text-white/80"
                onClick={() => setBpmFocused(true)}
              >
                {bpm.toFixed(2)} BPM
              </span>
            )}
          </div>
        </div>

        {/* Mini-FX (Center-Right) */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-[8px] font-mono font-bold text-white/30 uppercase tracking-widest h-8 flex items-center" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>MINI-FX</span>
          <div className="flex items-center gap-3 border-l border-[#1F2128] pl-4">
            <div className="flex items-center gap-2" title="THRESH: 0dB (Shift+Click reset)">
              <MiniGRMeter gr={12} />
              <MiniKnob value={dynamicsThresh} min={0} max={100} defaultVal={50} onChange={setDynamicsThresh} tooltipLabel="THRESH" />
            </div>
            <div className="flex items-center gap-1 border-l border-[#1F2128] pl-3">
              <span className="text-[7px] font-mono text-white/25 uppercase">Drive</span>
              <ValueDragger value={driveDb} min={-12} max={12} defaultVal={0} onChange={setDriveDb} format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}dB`} tooltipLabel="DRIVE" />
            </div>
            <div className="flex items-center gap-2 border-l border-[#1F2128] pl-3">
              <button
                onClick={(e) => { if (e.shiftKey) setRumOn(false); else setRumOn((o) => !o); }}
                className={`w-5 h-5 rounded border flex items-center justify-center text-[9px] font-mono font-bold ${rumOn ? "border-[#00D2FF] shadow-[0_0_6px_rgba(0,210,255,0.4)] bg-[#00D2FF]/10 text-[#00D2FF]" : "border-[#1F2128] text-white/30 hover:bg-white/[0.04]"}`}
                title="RUM (Shift+Click reset)"
              >
                R
              </button>
              <MiniWetSlider value={wet} onChange={setWet} tooltipLabel="WET" />
            </div>
          </div>
        </div>

        {/* Export + Expand/Collapse (Right) */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button className="flex items-center gap-2 px-3 h-8 rounded border border-[#E66000]/40 hover:border-[#E66000]/60 hover:bg-[#E66000]/10 transition-colors text-[9px] font-bold font-mono tracking-widest text-[#E66000]">
            <ExternalLink size={12} /> EXPORT
          </button>
          <button
            onClick={isExpanded ? onCollapse : onExpand}
            className="w-9 h-9 rounded-full border border-[#1F2128] flex items-center justify-center hover:bg-white/[0.04] hover:border-white/10 transition-colors text-white/40 hover:text-white/60"
            aria-label={isExpanded ? "Collapse master section" : "Expand master section"}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export { DOCK_HEIGHT };
