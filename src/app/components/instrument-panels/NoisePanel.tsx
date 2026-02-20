import React from "react";
import { motion } from "motion/react";
import { Knob } from "../Knob";

export const NoisePanel: React.FC = () => (
  <>
    <div className="grid grid-cols-3 gap-6">
      <Knob label="Decay" value={40} size={44} />
      <Knob label="Tone" value={65} size={44} />
      <Knob label="Noise" value={80} size={44} />
      <Knob label="HPF" value={70} size={44} />
      <Knob label="Ring" value={20} size={44} />
      <Knob label="Stereo" value={50} size={44} />
    </div>
    <div className="h-10 flex items-end gap-[1px] bg-[#0a0a0a] rounded-[2px] border border-white/[0.03] p-2">
      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ height: [`${15 + Math.random() * 50}%`, `${20 + Math.random() * 40}%`] }}
          transition={{ repeat: Infinity, duration: 1.2, repeatType: "mirror" }}
          className="flex-1 bg-[#00D2FF]/20 rounded-[1px]"
        />
      ))}
    </div>
  </>
);
