"use client";

import React, { useState } from "react";
import type { H3KRackParams } from "../../audio/fx/h3kRack";

const PARAM_SMOOTH = 0.03;

export type H3KRackPanelProps = {
  params: H3KRackParams;
  onParamsChange: (p: Partial<H3KRackParams>) => void;
};

const defaultParams: H3KRackParams = {
  width: 0.3,
  time: 0.4,
  chaos: 0.2,
  feedbackTone: 0.5,
  diffuseAmount: 0.4,
  returnLevel: 0.6,
};

export function H3KRackPanel({
  params = defaultParams,
  onParamsChange,
}: H3KRackPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const macro = (label: string, value: number, onChange: (v: number) => void, min = 0, max = 1) => (
    <div key={label} className="flex flex-col items-center gap-1">
      <span className="text-[8px] font-mono text-white/50 uppercase tracking-wider">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value * 100}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="w-16 h-1.5 accent-[#00D2FF] rounded-full bg-[#1F2128]"
        aria-label={label}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">H3K FX Rack</span>
      <p className="text-[10px] font-mono text-white/25">Micro-pitch · Delay · Diffusion</p>

      <div className="flex gap-4 flex-wrap">
        {macro("WIDTH", params.width, (v) => onParamsChange({ width: v }))}
        {macro("TIME", params.time, (v) => onParamsChange({ time: v }))}
        {macro("CHAOS", params.chaos, (v) => onParamsChange({ chaos: v }))}
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((o) => !o)}
        className="text-[9px] font-mono text-white/40 hover:text-white/60 uppercase tracking-wider"
      >
        {advancedOpen ? "− Advanced" : "+ Advanced"}
      </button>

      {advancedOpen && (
        <div className="flex gap-4 flex-wrap border-t border-white/[0.06] pt-3">
          {macro("Feedback tone", params.feedbackTone, (v) => onParamsChange({ feedbackTone: v }))}
          {macro("Diffuse", params.diffuseAmount, (v) => onParamsChange({ diffuseAmount: v }))}
          {macro("Return", params.returnLevel, (v) => onParamsChange({ returnLevel: v }))}
        </div>
      )}
    </div>
  );
}
