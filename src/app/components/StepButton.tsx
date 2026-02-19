import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn, clamp } from "../../lib/utils";

interface StepButtonProps {
  active?: boolean;
  accented?: boolean;
  onClick?: () => void;
  index: number;
  velocity: number;
  onVelocityChange: (val: number) => void;
}

export const StepButton: React.FC<StepButtonProps> = ({
  active = false,
  accented = false,
  onClick,
  index,
  velocity,
  onVelocityChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialVelocity, setInitialVelocity] = useState(velocity);

  const handleMouseDown = (e: React.MouseEvent) => {
    // If not active, clicking it should make it active first
    if (!active) {
      onClick?.();
    }
    
    setIsDragging(true);
    setDragStartY(e.clientY);
    setInitialVelocity(velocity);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = dragStartY - e.clientY;
    // Every 2 pixels is 1 unit of velocity (0-127 range)
    const newVelocity = clamp(initialVelocity + Math.round(deltaY / 2), 0, 127);
    onVelocityChange(newVelocity);
  }, [isDragging, dragStartY, initialVelocity, onVelocityChange]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const velocityOpacity = 0.3 + (velocity / 127) * 0.7;
  const glowIntensity = (velocity / 127) * 15;

  return (
    <div className="relative flex-1 aspect-square md:aspect-auto md:h-12 max-w-[48px]">
      <motion.button
        onMouseDown={handleMouseDown}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "w-full h-full rounded-[3px] border transition-all duration-150 relative overflow-hidden",
          // Default State (Smoother, less contrastive)
          "bg-[#2d2d2d] border-[#3d3d3d] shadow-[0_1px_2px_rgba(0,0,0,0.15)]",
          // Active State Base (Border & Glow)
          active && "border-[#FF8000]/60",
          // Accented (Less harsh)
          accented && !active && "border-[#4d4d4d] bg-[#353535]",
          isDragging && "ring-1 ring-white/30 z-20"
        )}
        style={{
          backgroundColor: active ? `rgba(230, 96, 0, ${velocityOpacity})` : undefined,
          boxShadow: active 
            ? `0 0 ${glowIntensity}px rgba(230, 96, 0, ${velocityOpacity * 0.4}), inset 0 1px 0 rgba(255, 255, 255, ${0.1 + velocityOpacity * 0.1})` 
            : undefined
        }}
      >
        {/* Velocity Indicator Fill (Subtle background) */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 w-full transition-all pointer-events-none bg-white/[0.03]"
          )}
          style={{ height: `${(velocity / 127) * 100}%` }}
        />

        {/* Top Light (Softer, affected by velocity) */}
        <div 
          className={cn(
            "absolute top-1.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full transition-all duration-200",
            active ? "bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)]" : "bg-white/5"
          )} 
          style={{ 
            opacity: active ? velocityOpacity : 1,
            backgroundColor: active ? `rgba(255, 255, 255, ${0.4 + (velocity / 127) * 0.6})` : undefined
          }}
        />
        
        <span className={cn(
          "absolute bottom-1 right-1.5 text-[7px] font-mono font-bold transition-colors select-none",
          active ? "text-white/80" : "text-white/15"
        )}>
          {(index % 16) + 1}
        </span>
      </motion.button>

      {/* Dragging Tooltip */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: -40 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 -translate-x-1/2 bg-[#121212] border border-white/10 px-2 py-1 rounded text-[9px] font-mono font-bold text-[#E66000] z-50 pointer-events-none whitespace-nowrap"
          >
            VEL {velocity}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
