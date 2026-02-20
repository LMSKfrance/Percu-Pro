import React from "react";
import type { TrackId } from "../../core/types";
import {
  INSTRUMENT_LABELS,
  NoisePanel,
  HiPercPanel,
  LowPercPanel,
  ClapPanel,
  ChordPanel,
  BassPanel,
  SubPercPanel,
  KickPanel,
} from "./instrument-panels";

interface InstrumentControlsPanelProps {
  selectedTrackId: TrackId | null;
}

const PANEL_BY_TRACK: Record<TrackId, React.FC> = {
  noise: NoisePanel,
  hiPerc: HiPercPanel,
  lowPerc: LowPercPanel,
  clap: ClapPanel,
  chord: ChordPanel,
  bass: BassPanel,
  subPerc: SubPercPanel,
  kick: KickPanel,
};

export const InstrumentControlsPanel: React.FC<InstrumentControlsPanelProps> = ({ selectedTrackId }) => {
  if (!selectedTrackId) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center border-t border-white/[0.03]">
        <span className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-widest">
          Select an instrument
        </span>
        <span className="text-[9px] font-mono text-white/10 mt-2 block">
          Click a lane in the sequencer to show its controls here.
        </span>
      </div>
    );
  }

  const label = INSTRUMENT_LABELS[selectedTrackId];
  const Panel = PANEL_BY_TRACK[selectedTrackId];

  return (
    <div className="flex flex-col border-t border-white/[0.03] bg-[#121212] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.02]">
        <span className="text-[11px] font-bold font-sans uppercase tracking-widest text-[#E66000]">
          {label}
        </span>
        <span className="text-[8px] font-mono text-white/10 tracking-[0.2em] font-bold uppercase block mt-0.5">
          INSTRUMENT CONTROLS
        </span>
      </div>
      <div className="p-6 flex flex-col gap-8 overflow-y-auto">
        <Panel />
      </div>
    </div>
  );
};
