import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Knob } from "./Knob";
import { ChevronDown, Volume2, Maximize2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface SidebarAccordionProps {
  title: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isActive?: boolean;
}

export const SidebarAccordion: React.FC<SidebarAccordionProps> = ({
  title,
  isExpanded = false,
  onToggleExpand,
  isActive = false,
}) => {
  return (
    <div className={cn(
      "flex flex-col border-b border-white/[0.03] bg-[#181818] overflow-hidden transition-all duration-500",
      isActive && "bg-[#222222] ring-1 ring-inset ring-[#E66000]/20"
    )}>
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className={cn(
          "flex items-center justify-between h-[64px] px-6 transition-all group relative overflow-hidden",
          isExpanded ? "bg-white/[0.02]" : "hover:bg-white/[0.01]"
        )}
      >
        {/* Active Indicator Bar */}
        <AnimatePresence>
          {isActive && (
            <motion.div 
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              className="absolute left-0 top-0 w-1 h-full bg-[#E66000]" 
            />
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-start">
            <span className={cn(
              "text-[12px] font-bold font-sans uppercase tracking-widest transition-colors duration-300",
              isActive ? "text-[#E66000]" : "text-[#D1D1CA]"
            )}>
              {title}
            </span>
            <span className="text-[8px] font-mono text-white/10 tracking-[0.2em] font-bold uppercase">
              DSP CORE V2.4
            </span>
          </div>
          
          {/* LED Meter (Smoother) */}
          <div className="flex gap-1 ml-4 items-center">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  opacity: i < (isActive ? 4 : 2) ? [0.2, 0.5, 0.2] : 0.05,
                  backgroundColor: i > 5 ? "#E66000" : "#00D2FF"
                }}
                transition={{ repeat: Infinity, duration: 1 + i * 0.15 }}
                className="w-1.5 h-1.5 rounded-full"
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className="text-white/10 group-hover:text-white/20 transition-colors"
          >
            <ChevronDown size={14} />
          </motion.div>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-[#121212] border-t border-white/[0.02]"
          >
            <div className="p-8 flex flex-col gap-10">
              {/* Primary Controls Group */}
              <div className="grid grid-cols-3 gap-8">
                <Knob label="Tune" value={50} size={48} />
                <Knob label="Decay" value={70} size={48} />
                <Knob label="Punch" value={30} size={48} />
                <Knob label="Color" value={20} size={48} />
                <Knob label="Shape" value={45} size={48} />
                <Knob label="Sync" value={80} size={48} />
              </div>

              {/* Visualization / Filter */}
              <div className="flex flex-col gap-4 bg-[#0a0a0a] p-4 rounded-[3px] border border-white/[0.03]">
                <div className="flex items-center justify-between text-[8px] font-bold font-mono text-white/20 uppercase tracking-widest">
                  <span>Spectral Distribution</span>
                  <span className="text-[#00D2FF]/60">HPF 1.2KHZ</span>
                </div>
                <div className="h-12 flex items-end gap-[1px]">
                  {[...Array(40)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: [`${20 + Math.random() * 60}%`, `${10 + Math.random() * 30}%`] }}
                      transition={{ repeat: Infinity, duration: 1.5, repeatType: "mirror" }}
                      className="flex-1 bg-white/5"
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 h-10 bg-white/[0.02] border border-white/[0.05] rounded-[2px] flex items-center justify-center gap-2 group hover:bg-white/[0.04] transition-colors">
                  <Volume2 size={12} className="text-white/20 group-hover:text-white/60" />
                  <span className="text-[9px] font-bold font-mono tracking-widest text-white/30 group-hover:text-white/60">PATCH BROWSER</span>
                </button>
                <button className="w-10 h-10 bg-white/[0.02] border border-white/[0.05] rounded-[2px] flex items-center justify-center group hover:bg-white/[0.04] transition-colors">
                  <Maximize2 size={12} className="text-white/20 group-hover:text-white/60" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
