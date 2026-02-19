import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StepButton } from "./StepButton";
import { ChevronRight, ChevronLeft, Power, Sliders, Dices } from "lucide-react";
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
  onToggleStep?: (index: number) => void;
  onVelocityChange?: (index: number, velocity: number) => void;
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
  onToggleStep,
  onVelocityChange,
}) => {
  const [localSteps, setLocalSteps] = useState<boolean[]>(DEFAULT_STEPS);
  const [localVelocities, setLocalVelocities] = useState<number[]>(DEFAULT_VELS);
  const [power, setPower] = useState(true);

  const isControlled = controlledSteps != null && controlledVelocities != null;
  const activeSteps = isControlled ? controlledSteps : localSteps;
  const velocities = isControlled ? controlledVelocities : localVelocities;

  const toggleStep = (index: number) => {
    if (isControlled && onToggleStep) onToggleStep(index);
    else {
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

  const handleRowClick = () => {
    onActivate?.();
    onToggleExpand?.();
  };

  return (
    <div 
      className={cn(
        "flex flex-col border-b border-[#121212]/5 overflow-hidden transition-all duration-400 ease-in-out",
        isExpanded ? "bg-[#121212]/[0.03] h-[220px]" : "bg-transparent h-[72px]",
        isActive && "bg-[#121212]/[0.05] border-l-4 border-l-[#E66000]"
      )}
    >
      {/* Main Row Bar */}
      <div className="flex items-center gap-6 h-[72px] px-8 flex-none">
        {/* Toggle & Label Section */}
        <div className="flex items-center gap-4 w-[240px] flex-none">
          <button 
            onClick={() => setPower(!power)}
            className={cn(
              "w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300",
              power 
                ? "bg-[#E66000] border-[#E66000] shadow-[0_0_10px_rgba(230,96,0,0.2)]"
                : "bg-white/10 border-black/5 text-black/15 hover:text-black/30"
            )}
          >
            <Power size={14} strokeWidth={3} color={power ? "white" : "currentColor"} />
          </button>
          
          <div className="flex flex-col cursor-pointer group select-none" onClick={handleRowClick}>
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
              <motion.div 
                animate={{ rotate: isExpanded ? 90 : 0 }}
                className="text-[#121212]/15 group-hover:text-[#121212]/30 transition-colors"
              >
                <ChevronRight size={12} />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Nudge controls (Softer) */}
        <div className="flex items-center gap-1 flex-none mr-4">
          <button className="p-1.5 text-[#121212]/15 hover:text-[#E66000] transition-colors"><ChevronLeft size={16} /></button>
          <button className="p-1.5 text-[#121212]/15 hover:text-[#E66000] transition-colors"><ChevronRight size={16} /></button>
        </div>

        {/* 16-Step Grid */}
        <div className="flex flex-1 gap-1.5 min-w-[500px]">
          {activeSteps.map((active, i) => (
            <StepButton 
              key={i}
              index={i}
              active={active && power}
              accented={i % 4 === 0}
              velocity={velocities[i]}
              onClick={() => toggleStep(i)}
              onVelocityChange={(val) => handleVelocityChange(i, val)}
            />
          ))}
        </div>
      </div>

      {/* Expanded Content: Micro-timing */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 border-t border-white/40 px-8 py-6 flex items-start gap-12"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#121212]/40">
                <Sliders size={14} strokeWidth={2.5} />
                <span className="text-[10px] font-bold font-mono tracking-widest uppercase">Micro-timing</span>
              </div>
              <div className="flex gap-8">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold font-mono text-[#121212]/30 tracking-wider">SWING</span>
                  <div className="w-[160px] h-2 bg-[#121212]/10 rounded-full relative overflow-hidden">
                    <motion.div 
                      className="absolute left-0 top-0 h-full bg-[#E66000]/60"
                      initial={{ width: "35%" }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-bold font-mono text-[#121212]/30 tracking-wider">VELOCITY RANGE</span>
                  <div className="w-[160px] h-2 bg-[#121212]/10 rounded-full relative overflow-hidden">
                    <motion.div 
                      className="absolute left-0 top-0 h-full bg-[#00D2FF]/60"
                      initial={{ width: "65%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[#121212]/40">
                <Dices size={14} strokeWidth={2.5} />
                <span className="text-[10px] font-bold font-mono tracking-widest uppercase">Step Probabilities</span>
              </div>
              <div className="flex gap-2">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-1.5 h-12 bg-[#121212]/5 rounded-full relative overflow-hidden">
                       <div 
                         className="absolute bottom-0 left-0 w-full bg-[#121212]/15 rounded-full" 
                         style={{ height: `${Math.random() * 100}%` }}
                        />
                    </div>
                    <span className="text-[7px] font-bold text-[#121212]/15">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
