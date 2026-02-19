import React, { useState } from "react";
import { motion, useMotionValue, useTransform, useDragControls } from "motion/react";

interface FaderProps {
  label?: string;
  value?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  height?: number;
}

export const Fader: React.FC<FaderProps> = ({
  label,
  value = 50,
  min = 0,
  max = 100,
  onChange,
  height = 160,
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const trackHeight = height - 24; // Account for cap height
  const dragY = useMotionValue((1 - (internalValue - min) / (max - min)) * trackHeight);

  const handleDrag = () => {
    const y = dragY.get();
    const percent = 1 - y / trackHeight;
    const newValue = Math.round(min + percent * (max - min));
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative" style={{ height: height, width: 32 }}>
        {/* Track Groove */}
        <div className="absolute left-1/2 -translate-x-1/2 top-3 bottom-3 w-2 bg-[#0a0a0a] rounded-full border border-[#2a2a2a] shadow-inner" />
        
        {/* Cap (Handle) */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: trackHeight }}
          dragElastic={0}
          dragMomentum={false}
          style={{ y: dragY }}
          onDrag={handleDrag}
          className="absolute left-1/2 -translate-x-1/2 w-8 h-6 bg-[#d1d1ca] rounded-[2px] cursor-ns-resize shadow-[0_4px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.4)] border border-[#a1a19a] flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          {/* Cap Details (Grooves) */}
          <div className="w-5 h-[2px] bg-[#FF6B00] shadow-[0_0_4px_rgba(255,107,0,0.4)]" />
          <div className="w-5 h-[1px] bg-[#a1a19a]" />
          <div className="w-5 h-[1px] bg-[#a1a19a]" />
        </motion.div>
      </div>
      {label && (
        <span className="text-[10px] uppercase font-medium tracking-wider text-[#F2F2EB]/60 font-mono">
          {label}
        </span>
      )}
    </div>
  );
};
