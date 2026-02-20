import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StepButton } from "./StepButton";
import { ChevronRight, ChevronLeft, Power, Sliders, Shuffle } from "lucide-react";
import { cn } from "../../lib/utils";
import type { TrackId } from "../../core/types";

const DEFAULT_STEPS = new Array(16).fill(false);
const DEFAULT_VELS = new Array(16).fill(100);
const DEFAULT_PITCH_STEPS = new Array(16).fill(0);

function clampPitch(v: number): number {
  return Math.max(-12, Math.min(12, Math.round(v)));
}

const PITCH_MIN = -12;
const PITCH_MAX = 12;

interface PitchDialColumnProps {
  index: number;
  velocity: number;
  pitch: number;
  onPitchDelta: (delta: number) => void;
  onPitchReset: () => void;
}

function PitchDialColumn({ index, velocity, pitch, onPitchDelta, onPitchReset }: PitchDialColumnProps) {
  const startYRef = React.useRef(0);
  const startPitchRef = React.useRef(0);

  const handleDialMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startYRef.current = e.clientY;
    startPitchRef.current = pitch;
    const onMove = (ev: MouseEvent) => {
      const deltaY = startYRef.current - ev.clientY;
      const fine = ev.shiftKey;
      const step = fine ? 0.05 : 0.2;
      const delta = deltaY * step;
      onPitchDelta(delta);
      startYRef.current = ev.clientY;
      startPitchRef.current = clampPitch(startPitchRef.current + delta);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const rotation = ((pitch - PITCH_MIN) / (PITCH_MAX - PITCH_MIN)) * 270 - 135;

  return (
    <div className="flex-1 min-w-0 flex flex-col items-stretch gap-0.5 min-h-0">
      <div className="w-full h-[96px] bg-[#121212]/18 rounded-[2px] relative overflow-hidden flex-shrink-0">
        <div
          className="absolute bottom-0 left-0 right-0 bg-[#E66000] rounded-[2px] transition-[height] duration-100"
          style={{ height: `${Math.max(4, velocity)}%` }}
        />
      </div>
      <span className="text-[7px] font-mono font-bold text-[#121212]/30 tabular-nums text-center flex-none">{index + 1}</span>
      <div
        className="relative flex-none w-5 h-5 rounded-full border border-[#121212]/25 bg-[#121212]/08 flex items-center justify-center cursor-ns-resize select-none mx-auto"
        onMouseDown={handleDialMouseDown}
        onDoubleClick={(e) => { e.preventDefault(); onPitchReset(); }}
        role="slider"
        aria-valuenow={pitch}
        aria-valuemin={PITCH_MIN}
        aria-valuemax={PITCH_MAX}
      >
        <div
          className="absolute left-1/2 top-1/2 w-[1.5px] h-[5px] bg-[#121212] rounded-full origin-bottom"
          style={{
            transform: `translate(-50%, -100%) rotate(${rotation}deg)`,
            opacity: pitch !== 0 ? 0.6 : 0.35,
          }}
        />
      </div>
    </div>
  );
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
}) => {
  const [localSteps, setLocalSteps] = useState<boolean[]>(DEFAULT_STEPS);
  const [localVelocities, setLocalVelocities] = useState<number[]>(DEFAULT_VELS);
  const [pitchSteps, setPitchSteps] = useState<number[]>(DEFAULT_PITCH_STEPS);

  const isControlled = controlledSteps != null && controlledVelocities != null;
  const activeSteps = isControlled ? controlledSteps : localSteps;
  const velocities = isControlled ? controlledVelocities : localVelocities;
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

  const handlePitchChange = (index: number, delta: number) => {
    setPitchSteps((prev) => {
      const next = [...prev];
      next[index] = clampPitch((prev[index] ?? 0) + delta);
      return next;
    });
  };

  const handlePitchReset = (index: number) => {
    setPitchSteps((prev) => {
      const next = [...prev];
      next[index] = 0;
      return next;
    });
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

        {/* 16-Step Grid */}
        <div className="flex flex-1 gap-1.5 min-w-[500px]">
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

      {/* Expanded Content: Micro-timing + Velocity (Ableton-style) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 border-t border-[#121212]/08 px-8 py-3 flex flex-col gap-4 min-h-0 overflow-hidden"
          >
            <div className="flex flex-col gap-3 flex-none">
              <div className="flex items-center gap-2 text-[#121212]/40">
                <Sliders size={14} strokeWidth={2.5} />
                <span className="text-[10px] font-bold font-mono tracking-widest uppercase">Micro-timing</span>
              </div>
              <div className="flex gap-8">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold font-mono text-[#121212]/30 tracking-wider">SWING</span>
                  <div className="w-[160px] h-2 bg-[#121212]/12 rounded-[2px] relative overflow-hidden">
                    <motion.div 
                      className="absolute left-0 top-0 h-full bg-[#E66000]/60 rounded-[2px]"
                      initial={{ width: "35%" }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold font-mono text-[#121212]/30 tracking-wider">VELOCITY RANGE</span>
                  <div className="w-[160px] h-2 bg-[#121212]/12 rounded-[2px] relative overflow-hidden">
                    <motion.div 
                      className="absolute left-0 top-0 h-full bg-[#00D2FF]/60 rounded-[2px]"
                      initial={{ width: "65%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Velocity + Pitch: ~50% of expanded content; taller bars + per-step pitch dials */}
            <div className="flex flex-col gap-1.5 flex-1 min-h-[98px] min-w-0 overflow-hidden">
              <div className="flex items-center gap-4 flex-none">
                <div className="flex items-center gap-2 text-[#121212]/50">
                  <Shuffle size={14} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold font-mono tracking-widest uppercase">Velocity</span>
                </div>
                <span className="text-[8px] font-mono text-[#121212]/25 tracking-wider uppercase">Pitch</span>
              </div>
              <div className="flex items-start gap-6 flex-none min-w-0">
                <div className="flex-none w-[340px]" aria-hidden />
                <div className="flex flex-1 gap-1.5 min-w-[500px] min-h-[120px]">
                  {[...Array(16)].map((_, i) => (
                    <PitchDialColumn
                      key={i}
                      index={i}
                      velocity={velocities[i] ?? 100}
                      pitch={pitchSteps[i] ?? 0}
                      onPitchDelta={(delta) => handlePitchChange(i, delta)}
                      onPitchReset={() => handlePitchReset(i)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
