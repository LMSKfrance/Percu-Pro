import React from "react";
import { motion } from "motion/react";
import { Knob } from "./Knob";
import type { TrackId } from "../../core/types";

const INSTRUMENT_LABELS: Record<TrackId, string> = {
  noise: "Noise (Hats)",
  hiPerc: "Hi Perc",
  lowPerc: "Low Perc",
  clap: "Clap",
  chord: "Chord",
  bass: "Bass",
  subPerc: "Sub Perc",
  kick: "Kick",
};

interface InstrumentControlsPanelProps {
  selectedTrackId: TrackId | null;
}

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
        {selectedTrackId === "noise" && (
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
        )}
        {(selectedTrackId === "hiPerc" || selectedTrackId === "lowPerc") && (
          <div className="grid grid-cols-3 gap-6">
            <Knob label="Tune" value={selectedTrackId === "hiPerc" ? 62 : 38} size={44} />
            <Knob label="Decay" value={55} size={44} />
            <Knob label="Punch" value={35} size={44} />
            <Knob label="Color" value={45} size={44} />
            <Knob label="Shape" value={50} size={44} />
            <Knob label="Noise" value={25} size={44} />
          </div>
        )}
        {selectedTrackId === "clap" && (
          <div className="grid grid-cols-3 gap-6">
            <Knob label="Decay" value={60} size={44} />
            <Knob label="Snap" value={55} size={44} />
            <Knob label="Tone" value={50} size={44} />
            <Knob label="Stereo" value={40} size={44} />
            <Knob label="Noise" value={70} size={44} />
            <Knob label="Body" value={45} size={44} />
          </div>
        )}
        {selectedTrackId === "chord" && (
          <div className="grid grid-cols-3 gap-6">
            <Knob label="Root" value={50} size={44} />
            <Knob label="Shape" value={40} size={44} />
            <Knob label="Decay" value={55} size={44} />
            <Knob label="Detune" value={15} size={44} />
            <Knob label="Filter" value={60} size={44} />
            <Knob label="Reso" value={30} size={44} />
          </div>
        )}
        {selectedTrackId === "bass" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">Mode</span>
              <div className="flex gap-1 p-0.5 bg-white/[0.03] rounded-[2px] border border-white/[0.05]">
                <button type="button" className="px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-wider rounded-[2px] bg-[#E66000]/20 text-[#E66000] border border-[#E66000]/30">
                  Acid
                </button>
                <button type="button" className="px-3 py-1.5 text-[9px] font-bold font-mono uppercase tracking-wider rounded-[2px] text-white/40 hover:text-white/70 transition-colors">
                  Techno Rumble
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <Knob label="Tune" value={35} size={44} />
              <Knob label="Decay" value={50} size={44} />
              <Knob label="Cutoff" value={45} size={44} />
              <Knob label="Reso" value={55} size={44} />
              <Knob label="Drive" value={25} size={44} />
              <Knob label="Rumble" value={40} size={44} />
            </div>
          </>
        )}
        {selectedTrackId === "subPerc" && (
          <div className="grid grid-cols-3 gap-6">
            <Knob label="Tune" value={28} size={44} />
            <Knob label="Decay" value={50} size={44} />
            <Knob label="Punch" value={40} size={44} />
            <Knob label="Shape" value={35} size={44} />
            <Knob label="Noise" value={15} size={44} />
            <Knob label="Filter" value={45} size={44} />
          </div>
        )}
        {selectedTrackId === "kick" && (
          <div className="grid grid-cols-3 gap-6">
            <Knob label="Pitch" value={42} size={44} />
            <Knob label="Decay" value={65} size={44} />
            <Knob label="Punch" value={55} size={44} />
            <Knob label="Tone" value={50} size={44} />
            <Knob label="Drive" value={30} size={44} />
            <Knob label="Sub" value={70} size={44} />
          </div>
        )}
      </div>
    </div>
  );
};
