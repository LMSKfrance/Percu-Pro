import React from "react";
import { cn } from "../../lib/utils";

/** Value range 0–127 (MIDI-style). */
const MIN = 0;
const MAX = 127;

export interface ModValueProps {
  /** Current value in 0–127. */
  value: number;
  onPointerDown: (e: React.PointerEvent) => void;
  isDragging?: boolean;
  /** Bar fill color (default orange). */
  barColor?: string;
  /** Optional class for the track/container. */
  className?: string;
  /** Optional role for a11y (e.g. "slider"). */
  role?: string;
  ariaValuenow?: number;
  ariaValuemin?: number;
  ariaValuemax?: number;
}

/**
 * Single mod value bar (velocity, notes, mods). Value 0–127.
 * Aligns with sequencer steps when used inside a 16-column grid.
 */
export const ModValue: React.FC<ModValueProps> = ({
  value,
  onPointerDown,
  isDragging = false,
  barColor = "#E66000",
  className,
  role = "slider",
  ariaValuenow = value,
  ariaValuemin = MIN,
  ariaValuemax = MAX,
}) => {
  const clamped = Math.max(MIN, Math.min(MAX, value));
  const heightPct = Math.max(4, (clamped / MAX) * 100);

  return (
    <div className={cn("min-w-0 w-full h-full flex flex-col", className)}>
      <div
        className={cn(
          "w-full h-full bg-[#121212]/18 rounded-[2px] relative overflow-hidden cursor-ns-resize select-none border hover:border-[#121212]/15",
          isDragging && "border-[#E66000] ring-2 ring-[#E66000]/40 ring-inset"
        )}
        onPointerDown={onPointerDown}
        role={role}
        aria-valuenow={ariaValuenow}
        aria-valuemin={ariaValuemin}
        aria-valuemax={ariaValuemax}
      >
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 rounded-[2px]",
            isDragging ? "transition-none" : "transition-[height] duration-100"
          )}
          style={{ height: `${heightPct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
};
