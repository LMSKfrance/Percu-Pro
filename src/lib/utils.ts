import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/** Reusable control-strip style: light border, rounded corners, subtle bg. Use for preset strips, nav groups, etc. */
export const CONTROL_STRIP_STYLE = {
  container:
    "flex items-center rounded-[4px] border border-[#121212]/05 bg-[#121212]/03 overflow-visible",
  navButton:
    "p-2 text-[#121212]/50 hover:text-[#121212]/80 hover:bg-[#121212]/06 transition-colors",
  navButtonLeft: "rounded-l-[3px]",
  navButtonRight: "rounded-r-[3px]",
  titleButton: "flex items-center gap-3 px-3 py-2 hover:bg-[#121212]/06 transition-all min-w-[160px] rounded-[2px]",
} as const;
