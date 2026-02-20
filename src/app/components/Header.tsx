import React from "react";
import { motion } from "motion/react";
import { Cpu, Clock, Activity } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePercuProV1Store } from "../../core/store";
import { GrooveGeneratorHeaderBlock } from "./GrooveGenerator";

export const Header: React.FC = () => {
  const { state } = usePercuProV1Store();
  const bpm = state.transport.bpm;

  return (
    <header className="h-[80px] w-full px-12 flex items-center justify-between border-b border-[#121212]/05 bg-[#F2F2EB] sticky top-0 z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 select-none">
        <div className="w-8 h-8 bg-[#181818] flex items-center justify-center rounded-[3px] shadow-sm">
          <div className="w-3 h-3 rounded-full border-2 border-[#E66000]" />
        </div>
        <div className="flex flex-col">
          <span className="text-[18px] font-sans font-bold uppercase tracking-tight text-[#181818]/90">
            PERCU <span className="text-[#E66000]">PRO</span>
          </span>
          <span className="text-[8px] font-mono tracking-[0.3em] text-[#121212]/30 font-bold -mt-0.5 uppercase">
            Workstation v1.0
          </span>
        </div>
      </div>

      {/* Center: Generate Groove + Seed */}
      <GrooveGeneratorHeaderBlock />

      {/* Right: Stats (Less contrast) */}
      <div className="flex items-center gap-10 font-mono">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-[#121212]/20">
            <Cpu size={12} strokeWidth={2.5} />
            <span className="text-[9px] uppercase font-bold tracking-widest">CPU_CORE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-1 bg-[#121212]/05 rounded-full overflow-hidden">
              <motion.div 
                animate={{ width: ["15%", "22%", "18%"] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="h-full bg-[#00D2FF]/40" 
              />
            </div>
            <span className="text-[11px] font-bold text-[#121212]/60">18.4%</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-[#121212]/20">
            <Clock size={12} strokeWidth={2.5} />
            <span className="text-[9px] uppercase font-bold tracking-widest">MASTER_CLK</span>
          </div>
          <span className="text-[13px] font-bold text-[#121212]/80 flex items-center gap-1">
            {bpm.toFixed(2)} <span className="text-[9px] text-[#121212]/20">BPM</span>
          </span>
        </div>

        <div className="w-[1px] h-6 bg-[#121212]/05 mx-1" />

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 text-[#121212]/20">
            <Activity size={12} strokeWidth={2.5} />
            <span className="text-[9px] uppercase font-bold tracking-widest">PEAK_OUT</span>
          </div>
          <div className="flex items-center gap-[2px] mt-1">
            {[...Array(12)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ height: [6, 10, 4, 14, 8, 6][i % 6] }}
                transition={{ repeat: Infinity, duration: 0.6 + Math.random() }}
                className={cn(
                  "w-[2px] rounded-full",
                  i > 9 ? "bg-[#E66000]/40" : "bg-[#121212]/15"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
