import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StepButton } from "./StepButton";
import { ChevronRight, ChevronLeft, ChevronDown, Power, Shuffle } from "lucide-react";
import { Knob } from "./Knob";
import { cn } from "../../lib/utils";
import type { TrackId } from "../../core/types";
import { quantizeToScale } from "../../core/scale";

const DEFAULT_STEPS = new Array(16).fill(false);
const DEFAULT_VELS = new Array(16).fill(100);
const DEFAULT_PITCH_STEPS = new Array(16).fill(0);

const PITCH_MIN = -24;
const PITCH_MAX = 24;

function clampPitch(v: number): number {
  return Math.max(PITCH_MIN, Math.min(PITCH_MAX, Math.round(v)));
}

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function semitoneToNote(p: number): string {
  const i = ((p % 12) + 12) % 12;
  return NOTE_NAMES[i];
}

/** Base hue per note (0–11). Same note in different octaves = same hue, different lightness. */
const NOTE_HUES: number[] = [0, 30, 50, 90, 120, 170, 190, 220, 270, 300, 330, 15];
function getNoteColor(semitone: number): string {
  const noteIndex = ((semitone % 12) + 12) % 12;
  const octave = Math.floor(semitone / 12);
  const hue = NOTE_HUES[noteIndex];
  const lightness = Math.max(28, Math.min(72, 50 + octave * 10));
  return `hsl(${hue}, 65%, ${lightness}%)`;
}

interface SequencerRowProps {
  trackId?: TrackId;
  label: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isActive?: boolean;
  onActivate?: () => void;
  /** When true, instrument is muted (no sound); triggers stay visible, shown grey */
  isMuted?: boolean;
  onMuteToggle?: () => void;
  steps?: boolean[];
  velocities?: number[];
  accents?: boolean[];
  currentStepIndex?: number;
  onToggleStep?: (index: number) => void;
  onVelocityChange?: (index: number, velocity: number) => void;
  onStepAdd?: (index: number) => void;
  onStepClear?: (index: number) => void;
  onStepAccentToggle?: (index: number) => void;
  /** Per-step pitch in semitones (-24..+24). When provided with onPitchChange, pitch is controlled from store. */
  pitches?: number[];
  onPitchChange?: (index: number, pitch: number) => void;
  /** Lane swing 50–62 (micro timing). When provided with onLaneSwingChange, dial is shown and wired. */
  laneSwingPct?: number;
  onLaneSwingChange?: (laneSwingPct: number) => void;
  /** Lane velocity scale 0..1 (velocity range). When provided with onLaneVelocityScaleChange, dial is shown and wired. */
  laneVelocityScale?: number;
  onLaneVelocityScaleChange?: (scale: number) => void;
}

export const SequencerRow: React.FC<SequencerRowProps> = ({
  trackId,
  label,
  isExpanded = false,
  onToggleExpand,
  isActive = false,
  onActivate,
  isMuted = false,
  onMuteToggle,
  steps: controlledSteps,
  velocities: controlledVelocities,
  accents: controlledAccents,
  currentStepIndex,
  onToggleStep,
  onVelocityChange,
  onStepAdd,
  onStepClear,
  onStepAccentToggle,
  pitches: controlledPitches,
  onPitchChange,
  laneSwingPct,
  onLaneSwingChange,
  laneVelocityScale = 1,
  onLaneVelocityScaleChange,
}) => {
  const [localSteps, setLocalSteps] = useState<boolean[]>(DEFAULT_STEPS);
  const [localVelocities, setLocalVelocities] = useState<number[]>(DEFAULT_VELS);
  const [pitchSteps, setPitchSteps] = useState<number[]>(DEFAULT_PITCH_STEPS);
  const [scaleKey, setScaleKey] = useState<string>("Chromatic");
  const [scaleOn, setScaleOn] = useState<boolean>(false);
  const [scaleSlave, setScaleSlave] = useState<boolean>(true);

  const isControlled = controlledSteps != null && controlledVelocities != null;
  const activeSteps = isControlled ? controlledSteps : localSteps;
  const velocities = isControlled ? controlledVelocities : localVelocities;
  const pitchStepsResolved = controlledPitches != null && onPitchChange != null ? controlledPitches : pitchSteps;
  const usePatchCallbacks = isControlled && onStepAdd != null && onStepClear != null;

  const toggleStep = (index: number) => {
    if (!usePatchCallbacks && isControlled && onToggleStep) onToggleStep(index);
    else if (!isControlled) {
      const next = [...localSteps];
      next[index] = !next[index];
      setLocalSteps(next);
    }
    onActivate?.();
  };

  const handleVelocityChange = (index: number, val: number) => {
    if (isControlled && onVelocityChange) onVelocityChange(index, val);
    else {
      const next = [...localVelocities];
      next[index] = val;
      setLocalVelocities(next);
    }
  };

  const handleBarClick = () => {
    onActivate?.();
  };

  const handleBarDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onToggleExpand?.();
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand?.();
  };

  const applyScaleQuantize = (p: number): number => {
    if (scaleOn && !scaleSlave) return quantizeToScale(p, scaleKey);
    return p;
  };

  const handlePitchDelta = (index: number, delta: number) => {
    const raw = clampPitch((pitchStepsResolved[index] ?? 0) + delta);
    const value = clampPitch(applyScaleQuantize(raw));
    if (onPitchChange) onPitchChange(index, value);
    else setPitchSteps((prev) => { const next = [...prev]; next[index] = value; return next; });
  };

  const handlePitchReset = (index: number) => {
    if (onPitchChange) onPitchChange(index, 0);
    else setPitchSteps((prev) => { const next = [...prev]; next[index] = 0; return next; });
  };

  const handleRandomVelocity = () => {
    for (let i = 0; i < 16; i++) {
      const v = 20 + Math.floor(Math.random() * 21);
      handleVelocityChange(i, v);
    }
  };

  const pitchBarDragRef = React.useRef<{ index: number; startY: number; startPitch: number; didMove: boolean } | null>(null);

  const handlePitchBarMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    pitchBarDragRef.current = { index, startY: e.clientY, startPitch: pitchStepsResolved[index] ?? 0, didMove: false };
    const onMove = (ev: MouseEvent) => {
      if (!pitchBarDragRef.current || pitchBarDragRef.current.index !== index) return;
      pitchBarDragRef.current.didMove = true;
      const deltaY = pitchBarDragRef.current.startY - ev.clientY;
      const step = ev.shiftKey ? 1 : 2; // semitones per drag
      const delta = Math.round(deltaY / 8) * step;
      if (delta !== 0) {
        const raw = clampPitch((pitchBarDragRef.current.startPitch ?? 0) + delta);
        const value = clampPitch(applyScaleQuantize(raw));
        pitchBarDragRef.current.startY = ev.clientY;
        pitchBarDragRef.current.startPitch = value;
        if (onPitchChange) onPitchChange(pitchBarDragRef.current.index, value);
        else setPitchSteps((prev) => { const next = [...prev]; next[pitchBarDragRef.current!.index] = value; return next; });
      }
    };
    const onUp = () => {
      const hadMovement = pitchBarDragRef.current?.didMove ?? false;
      const idx = pitchBarDragRef.current?.index ?? index;
      pitchBarDragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (!hadMovement) handlePitchDelta(idx, 1);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div 
      className={cn(
        "flex flex-col border-b border-[#121212]/5 overflow-hidden transition-all duration-400 ease-in-out relative",
        isExpanded ? "bg-[#121212]/[0.03] min-h-[268px]" : "bg-transparent h-[72px]",
        isActive && "bg-[#E8E4DC]"
      )}
    >
      {/* Orange selection marker: absolutely positioned so it does not push row content */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E66000] z-10 pointer-events-none" aria-hidden />
      )}
      {/* Main Row Bar — single-click to select, double-click to expand/collapse */}
      <div 
        className="flex items-center gap-6 h-[72px] px-8 flex-none cursor-pointer" 
        onClick={handleBarClick} 
        onDoubleClick={handleBarDoubleClick}
      >
        {/* Toggle & Label Section */}
        <div className="flex items-center gap-4 w-[240px] flex-none">
          <button 
            onClick={(e) => { e.stopPropagation(); onMuteToggle?.(); }}
            onDoubleClick={(e) => e.stopPropagation()}
            className={cn(
              "w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300",
              !isMuted 
                ? "bg-[#E66000] border-[#E66000] shadow-[0_0_10px_rgba(230,96,0,0.2)]"
                : "bg-[#6b6b6b] border-[#5a5a5a] text-white/70 hover:bg-[#5a5a5a] hover:border-[#4d4d4d]"
            )}
          >
            <Power size={14} strokeWidth={3} color={!isMuted ? "white" : "currentColor"} />
          </button>
          
          <div className="flex flex-col flex-1 cursor-pointer group select-none min-w-0" onClick={handleBarClick}>
            <span className={cn(
              "text-[13px] font-bold font-sans tracking-wide uppercase transition-colors duration-300",
              isActive ? "text-[#E66000]" : "text-[#121212]/80 group-hover:text-[#121212]"
            )}>
              {label}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] font-mono text-[#121212]/30 font-bold tracking-widest uppercase">
                PATCH_A{label.charCodeAt(0) % 10}
              </span>
              <button
                type="button"
                onClick={handleChevronClick}
                className={cn(
                  "p-1 rounded-[4px] transition-colors flex items-center justify-center",
                  isActive ? "text-[#E66000] hover:bg-[#E66000]/10" : "text-[#121212]/60 hover:bg-[#121212]/08 hover:text-[#121212]/80"
                )}
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                <motion.div 
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </motion.div>
              </button>
            </div>
          </div>
        </div>

        {/* Nudge controls (Softer) */}
        <div className="flex items-center gap-1 flex-none mr-4">
          <button type="button" className="p-1.5 text-[#121212]/15 hover:text-[#E66000] transition-colors"><ChevronLeft size={16} /></button>
          <button type="button" className="p-1.5 text-[#121212]/15 hover:text-[#E66000] transition-colors"><ChevronRight size={16} /></button>
        </div>

        {/* 16-Step Grid — flex-none so row doesn't reserve empty space; future controls can sit here */}
        <div className="flex flex-none gap-1.5 min-w-[500px]">
          {activeSteps.map((active, i) => (
            <StepButton 
              key={i}
              index={i}
              active={active ?? false}
              muted={isMuted}
              accented={controlledAccents?.[i] ?? (i % 4 === 0)}
              velocity={velocities[i] ?? 100}
              isCurrentStep={currentStepIndex === i}
              onClick={!usePatchCallbacks ? () => toggleStep(i) : undefined}
              onVelocityChange={(val) => handleVelocityChange(i, val)}
              onAdd={usePatchCallbacks ? () => { onStepAdd?.(i); onActivate?.(); } : undefined}
              onClear={usePatchCallbacks ? () => { onStepClear?.(i); onActivate?.(); } : undefined}
              onAccentToggle={usePatchCallbacks ? () => { onStepAccentToggle?.(i); onActivate?.(); } : undefined}
            />
          ))}
        </div>
      </div>

      {/* Expanded Content: same horizontal layout as main row so velocity/pitch bars align with steps */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 border-t border-[#121212]/08 px-8 py-3 overflow-hidden"
          >
            <div className="flex gap-6 items-start min-h-0">
              {/* Spacer: match main row left (label + nudge) so bar strip aligns with step grid */}
              <div className="w-[240px] flex-none flex-shrink-0" aria-hidden />
              <div className="w-[76px] flex-none flex-shrink-0" aria-hidden />

              {/* Bar strip: same flex-none + gap-1.5 + min-w as step grid for perfect alignment */}
              <div className="flex-none min-w-[500px] flex flex-col gap-3 min-h-0">
                <div className="flex items-center justify-between flex-none flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[#121212]/50">
                    {onLaneSwingChange != null && laneSwingPct != null && (
                      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center">
                        <Knob
                          value={Math.round(((laneSwingPct - 50) / 12) * 100)}
                          min={0}
                          max={100}
                          size={28}
                          accentColor="#E66000"
                          onChange={(v) => onLaneSwingChange(50 + (v / 100) * 12)}
                        />
                        <span className="text-[7px] font-mono font-bold text-[#121212]/40 tracking-wider uppercase mt-0.5">Micro</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRandomVelocity(); }}
                      className="p-1 rounded-[4px] hover:bg-[#121212]/10 hover:text-[#E66000] transition-colors flex items-center justify-center"
                      title="Randomize velocity (20–40%)"
                      aria-label="Randomize velocity"
                    >
                      <Shuffle size={14} strokeWidth={2.5} />
                    </button>
                    <span className="text-[10px] font-bold font-mono tracking-widest uppercase">Velocity</span>
                    {onLaneVelocityScaleChange != null && (
                      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center">
                        <Knob
                          value={Math.round((laneVelocityScale ?? 1) * 100)}
                          min={0}
                          max={100}
                          size={28}
                          accentColor="#A855F7"
                          onChange={(v) => onLaneVelocityScaleChange(v / 100)}
                        />
                        <span className="text-[7px] font-mono font-bold text-[#121212]/40 tracking-wider uppercase mt-0.5">Range</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex items-center">
                      <select
                        value={scaleKey}
                        onChange={(e) => setScaleKey(e.target.value)}
                        disabled={scaleSlave}
                        className={cn(
                          "appearance-none bg-[#121212]/08 border border-[#121212]/12 rounded-[4px] pl-2 pr-6 py-1.5 text-[9px] font-mono font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-[#E66000]/40",
                          scaleSlave ? "cursor-not-allowed opacity-50 text-[#121212]/50" : "cursor-pointer text-[#121212]/80"
                        )}
                      >
                        <option value="Chromatic">Chromatic</option>
                        <option value="Major">Major</option>
                        <option value="Minor">Minor</option>
                        <option value="Dorian">Dorian</option>
                        <option value="Phrygian">Phrygian</option>
                        <option value="Lydian">Lydian</option>
                        <option value="Mixolydian">Mixolydian</option>
                        <option value="Pentatonic">Pentatonic</option>
                      </select>
                      <ChevronDown size={12} className="absolute right-1.5 text-[#121212]/40 pointer-events-none" />
                    </div>
                    <label className={cn("flex items-center gap-1.5", scaleSlave ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
                      <input
                        type="checkbox"
                        checked={scaleOn}
                        onChange={(e) => setScaleOn(e.target.checked)}
                        disabled={scaleSlave}
                        className="w-3.5 h-3.5 rounded border border-[#121212]/25 accent-[#E66000]"
                      />
                      <span className="text-[8px] font-mono font-bold text-[#121212]/50 tracking-wider uppercase">Scale</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scaleSlave}
                        onChange={(e) => setScaleSlave(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border border-[#121212]/25 accent-[#00D2FF]"
                      />
                      <span className="text-[8px] font-mono font-bold text-[#121212]/50 tracking-wider uppercase">Slave</span>
                    </label>
                  </div>
                  <span className="text-[8px] font-mono text-[#121212]/25 tracking-wider uppercase">Pitch</span>
                </div>

                <div className="flex flex-col gap-3 min-w-0 min-h-0">
                  {/* Velocity bars: height reduced by 30% (132 → 92) */}
                  <div className="h-[92px] min-w-0 flex items-end gap-1.5">
                    {[...Array(16)].map((_, i) => (
                      <div key={i} className="flex-1 min-w-0 h-full">
                        <div className="w-full h-full bg-[#121212]/18 rounded-[2px] relative overflow-hidden">
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-[#E66000] rounded-[2px] transition-[height] duration-100"
                            style={{ height: `${Math.max(4, velocities[i] ?? 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pitch bars: -24..+24, note name in center (white circle, bigger font), semitone at bottom; fill by note color (lighter/darker per octave) */}
                  <div className="h-[92px] min-w-0 flex items-end gap-1.5">
                    {[...Array(16)].map((_, i) => {
                      const p = pitchStepsResolved[i] ?? 0;
                      const fillPercent = Math.max(4, Math.min(100, ((p - PITCH_MIN) / (PITCH_MAX - PITCH_MIN)) * 100));
                      const keyLabel = p === 0 ? "0" : p > 0 ? `+${p}` : `${p}`;
                      const noteName = semitoneToNote(p);
                      const fillColor = getNoteColor(p);
                      return (
                        <div key={i} className="flex-1 min-w-0 h-full flex flex-col">
                          <div
                            className="w-full flex-1 min-h-0 bg-[#121212]/18 rounded-[2px] relative overflow-hidden cursor-ns-resize select-none border border-transparent hover:border-[#121212]/15 flex flex-col items-center justify-center"
                            onMouseDown={(e) => handlePitchBarMouseDown(i, e)}
                            onDoubleClick={(e) => { e.preventDefault(); handlePitchReset(i); }}
                            role="slider"
                            aria-valuenow={p}
                            aria-valuemin={PITCH_MIN}
                            aria-valuemax={PITCH_MAX}
                          >
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-[2px] transition-[height] duration-100 bg-[#7DD3FC]"
                              style={{ height: `${fillPercent}%` }}
                            />
                            <span
                              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E8E4DC] text-[8px] font-mono font-bold text-[#121212]/80 pointer-events-none z-10 border-[2.5px] border-solid"
                              style={{ borderColor: fillColor }}
                            >
                              {noteName}
                            </span>
                            <span className="absolute bottom-0.5 left-0 right-0 text-center text-[7px] font-mono font-bold text-[#121212]/60 tabular-nums pointer-events-none z-10">
                              {keyLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5 min-w-0">
                    {[...Array(16)].map((_, i) => (
                      <span key={i} className="flex-1 min-w-0 text-[7px] font-mono font-bold text-[#121212]/30 tabular-nums text-center">{i + 1}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
