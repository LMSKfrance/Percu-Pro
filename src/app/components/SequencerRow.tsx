import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StepButton } from "./StepButton";
import { ChevronRight, ChevronLeft, Power, Sliders, Shuffle } from "lucide-react";
import { cn } from "../../lib/utils";
import type { TrackId } from "../../core/types";

const DEFAULT_STEPS = new Array(16).fill(false);
const DEFAULT_VELS = new Array(16).fill(100);

interface SequencerRowProps {
  trackId?: TrackId;
  label: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isActive?: boolean;
  onActivate?: () => void;
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
  const [power, setPower] = useState(true);

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

  return (
    <div 
      className={cn(
        "flex flex-col border-b border-[#121212]/5 overflow-hidden transition-all duration-400 ease-in-out relative",
        isExpanded ? "bg-[#121212]/[0.03] h-[196px]" : "bg-transparent h-[72px]",
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
            onClick={(e) => { e.stopPropagation(); setPower(!power); }}
            onDoubleClick={(e) => e.stopPropagation()}
            className={cn(
              "w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300",
              power 
                ? "bg-[#E66000] border-[#E66000] shadow-[0_0_10px_rgba(230,96,0,0.2)]"
                : "bg-white/10 border-black/5 text-black/15 hover:text-black/30"
            )}
          >
            <Power size={14} strokeWidth={3} color={power ? "white" : "currentColor"} />
          </button>
          
          <div className="flex flex-col flex-1 cursor-pointer group select-none min-w-0" onClick={handleBarClick}>
            <span className={cn(
              "text-[13px] font-bold font-[Inter] tracking-wide uppercase transition-colors duration-300",
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
              active={(active ?? false) && power}
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

            {/* Velocity lane: title then bars at max height down to bottom */}
            <div className="flex flex-col gap-1.5 flex-1 min-h-[56px] min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 text-[#121212]/50 flex-none">
                <Shuffle size={14} strokeWidth={2.5} />
                <span className="text-[10px] font-bold font-mono tracking-widest uppercase">Velocity</span>
              </div>
              <div className="flex items-end gap-6 flex-1 min-h-0 min-w-0">
                <div className="flex-none w-[340px]" aria-hidden />
                <div className="flex flex-1 gap-1.5 min-w-[500px] min-h-[44px] h-full">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="flex-1 min-w-0 flex flex-col items-stretch gap-0.5 min-h-0 flex-1">
                      <div className="w-full flex-1 min-h-[36px] bg-[#121212]/18 rounded-[2px] relative overflow-hidden">
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-[#E66000] rounded-[2px] transition-[height] duration-100"
                          style={{ height: `${Math.max(4, velocities[i] ?? 100)}%` }}
                        />
                      </div>
                      <span className="text-[7px] font-mono font-bold text-[#121212]/30 tabular-nums text-center flex-none">{i + 1}</span>
                    </div>
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
