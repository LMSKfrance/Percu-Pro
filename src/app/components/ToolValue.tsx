import React from "react";
import { motion, AnimatePresence } from "motion/react";

export interface ToolValueProps {
  /** Label (e.g. "Velocity", "Pitch"). */
  label: string;
  /** Display value (e.g. "81", "C +2"). */
  value: string;
  /** When true, the tooltip is shown. Render this component inside the control being edited so it appears right above it. */
  show: boolean;
  /** Optional class for the wrapper (e.g. for positioning). */
  className?: string;
}

/**
 * Pop tooltip shown near the component being edited (e.g. mod value bar).
 * Position this as a child of the edited control so it appears directly above it.
 */
export const ToolValue: React.FC<ToolValueProps> = ({ label, value, show, className }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={[
          "absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 pointer-events-none whitespace-nowrap",
          "bg-[#121212] border border-white/10 px-2 py-1 rounded text-[9px] font-mono font-bold text-[#E66000]",
          className,
        ].filter(Boolean).join(" ")}
      >
        {label} {value}
      </motion.div>
    )}
  </AnimatePresence>
);
