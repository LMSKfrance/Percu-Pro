import React from "react";
import { Knob } from "../Knob";

export const BassPanel: React.FC = () => (
  <>
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">Mode</span>
      <div className="flex gap-1 p-0.5 bg-white/[0.03] rounded-[2px] border border-white/[0.05]">
        <button type="button" className="px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-wider rounded-[2px] bg-[#E66000]/20 text-[#E66000] border border-[#E66000]/30">
          Acid
        </button>
        <button type="button" className="px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-wider rounded-[2px] text-white/40 hover:text-white/70 transition-colors">
          Techno Rumble
        </button>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-6">
      <Knob label="Tune" value={35} size={44} />
      <Knob label="Decay" value={50} size={44} />
      <Knob label="Cutoff" value={45} size={44} />
      <Knob label="Reso" value={55} size={44} />
      <Knob label="Drive" value={25} size={44} />
      <Knob label="Rumble" value={40} size={44} />
    </div>
  </>
);
