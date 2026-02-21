import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { clamp } from "../../lib/utils";

interface KnobProps {
  label?: string;
  value?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: number;
  /** Accent color for indicator and glow (default #E66000) */
  accentColor?: string;
}

export const Knob: React.FC<KnobProps> = ({
  label,
  value = 50,
  min = 0,
  max = 100,
  onChange,
  size = 48,
  accentColor = "#E66000",
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const startY = useRef(0);
  const startValue = useRef(0);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const rotation = ((internalValue - min) / (max - min)) * 270 - 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    startY.current = e.clientY;
    startValue.current = internalValue;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = startY.current - e.clientY;
    const newValue = clamp(startValue.current + deltaY, min, max);
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const handleMouseUp = () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        onMouseDown={handleMouseDown}
        className="relative cursor-ns-resize group"
        style={{ width: size, height: size }}
      >
        {/* Shadow/Glow (Softer) */}
        <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-5 blur-[8px] transition-opacity" style={{ backgroundColor: accentColor }} />
        
        {/* Knob Body (Less contrast) */}
        <div className="absolute inset-0 rounded-full bg-[#2a2a2a] border border-[#3a3a3a] shadow-[0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.05)]" />
        
        {/* Indicator Dial */}
        <motion.div
          className="absolute inset-0 flex items-start justify-center"
          animate={{ rotate: rotation }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="w-[1.5px] h-3 mt-1.5 rounded-full" style={{ backgroundColor: accentColor, boxShadow: `0 0 4px ${accentColor}66` }} />
        </motion.div>
      </div>
      {label && (
        <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-white/20 font-mono">
          {label}
        </span>
      )}
    </div>
  );
};
