"use client";

import React from "react";

const panelClass =
  "rounded-[6px] border border-white/[0.03] bg-[#181818] flex flex-col min-h-0 overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_2px_8px_rgba(0,0,0,0.08)]";

type FooterToolsPanelProps = {
  /** Left: Mini Mixer */
  left: React.ReactNode;
  /** Center: H3K FX Rack */
  center: React.ReactNode;
  /** Right: Master tools (export, meters, session) */
  right: React.ReactNode;
};

/**
 * Three-panel tools layout inside the bottom sheet.
 * Desktop: 320px | 1fr | 320px. Tablet: single column.
 */
export function FooterToolsPanel({ left, center, right }: FooterToolsPanelProps) {
  return (
    <div className="p-4 pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-4 w-full max-w-full min-w-0">
        <div className={`${panelClass} p-4 min-h-[180px] md:min-h-[220px]`}>{left}</div>
        <div className={`${panelClass} p-4 min-h-[180px] md:min-h-[220px]`}>{center}</div>
        <div className={`${panelClass} p-4 min-h-[180px] md:min-h-[220px]`}>{right}</div>
      </div>
    </div>
  );
}
