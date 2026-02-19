import React, { useState } from "react";
import { motion } from "motion/react";
import { Knob } from "./Knob";
import { Power } from "lucide-react";
import { cn } from "../../lib/utils";

interface FXCardProps {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export const FXCard: React.FC<FXCardProps> = ({ label, icon, active: initialActive = true }) => {
  const [active, setActive] = useState(initialActive);

  return (
    <div 
      className={cn(
        "flex flex-col p-4 bg-[#1a1a1a] rounded-[2px] border border-[#2a2a2a] shadow-inner flex-1 transition-opacity",
        !active && "opacity-50 grayscale-[0.5]"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-[#FF6B00]/80">{icon}</div>
          <span className="text-[12px] font-bold uppercase tracking-widest text-[#F2F2EB]/90 font-mono">
            {label}
          </span>
        </div>
        <button 
          onClick={() => setActive(!active)}
          className={cn(
            "p-1.5 rounded-full border transition-all duration-200",
            active 
              ? "bg-[#FF6B00]/10 border-[#FF6B00]/40 text-[#FF6B00] shadow-[0_0_8px_rgba(255,107,0,0.3)]"
              : "bg-white/5 border-white/10 text-white/30"
          )}
        >
          <Power size={12} strokeWidth={3} />
        </button>
      </div>

      <div className="flex items-center justify-center py-2">
        <Knob size={64} value={45} />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[9px] uppercase font-mono tracking-wider text-white/40">
          <span>DRY</span>
          <span>WET</span>
        </div>
        <div className="h-1 bg-[#0a0a0a] rounded-full relative overflow-hidden">
          <motion.div 
            initial={{ width: "45%" }}
            className="absolute top-0 left-0 h-full bg-[#FF6B00]" 
          />
        </div>
      </div>
    </div>
  );
};
