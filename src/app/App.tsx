import React from "react";
import { Header } from "./components/Header";
import { GrooveGenerator } from "./components/GrooveGenerator";
import { SequencerRow } from "./components/SequencerRow";
import { SidebarAccordion } from "./components/SidebarAccordion";
import { FXCard } from "./components/FXCard";
import { Fader } from "./components/Fader";
import { Knob } from "./components/Knob";
import { 
  Waves, 
  Settings2, 
  AudioLines, 
  Wind, 
  Maximize2, 
  ExternalLink,
  Save,
  Play,
  Square,
  Repeat
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { usePercuProV1Store } from "../core/store";
import type { TrackId, EngineId } from "../core/types";

const SEQUENCER_TRACKS: { id: TrackId; label: string; engine: EngineId }[] = [
  { id: "kick", label: "Kick Drum", engine: "Percussion Engine" },
  { id: "snare", label: "Snare Drum", engine: "Percussion Engine" },
  { id: "hhc", label: "Hi-Hat Closed", engine: "Percussion Engine" },
  { id: "hho", label: "Hi-Hat Open", engine: "Percussion Engine" },
  { id: "perc1", label: "Percussion 1", engine: "Poly-Chord Engine" },
  { id: "perc2", label: "Percussion 2", engine: "Poly-Chord Engine" },
  { id: "rim", label: "Rimshot", engine: "Acid Bass Line" },
  { id: "clap", label: "Clap", engine: "Percussion Engine" }
];

type MasterSectionProps = {
  isPlaying: boolean;
  isLooping: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
};

const MasterSection = ({ isPlaying, isLooping, onTogglePlay, onStop, onToggleLoop }: MasterSectionProps) => (
  <div className="flex flex-col border-t border-white/[0.03] bg-[#181818] flex-none z-20">
    <div className="flex items-center justify-between px-12 h-[60px] border-b border-white/[0.03]">
      <div className="flex items-center gap-8">
        <span className="text-[13px] font-[Inter] font-bold uppercase tracking-widest text-[#D1D1CA]">
          Stereo Master Output
        </span>
        <div className="flex items-center gap-4 border-l border-white/[0.05] pl-8">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#E66000]" />
             <span className="text-[9px] font-mono font-bold text-white/10 tracking-widest uppercase">REC</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#00D2FF]" />
             <span className="text-[9px] font-mono font-bold text-white/10 tracking-widest uppercase">SYNC_LOCKED</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 px-4 h-9 rounded-[2px] border border-white/[0.05] hover:bg-white/[0.02] transition-colors text-[9px] font-bold font-mono tracking-widest text-white/20">
           <Save size={14} /> PERSIST STATE
        </button>
        <button className="flex items-center gap-2 px-4 h-9 rounded-[2px] bg-[#E66000]/10 border border-[#E66000]/30 hover:bg-[#E66000]/20 transition-colors text-[9px] font-bold font-mono tracking-widest text-[#E66000]">
           <ExternalLink size={14} /> EXPORT BUFFER
        </button>
      </div>
    </div>

    <div className="flex h-[300px]">
      {/* Master Controls Section */}
      <div className="w-[380px] border-r border-white/[0.03] p-8 flex flex-col justify-between">
        <div className="flex flex-col gap-6">
           <div className="flex justify-between items-center">
             <span className="text-[10px] font-mono font-bold text-white/10 uppercase tracking-widest">Main Volume</span>
             <span className="text-[10px] font-mono font-bold text-[#E66000]/80">+1.2 db</span>
           </div>
           <div className="flex items-end gap-10">
             <Fader height={180} label="Gain" value={75} />
             <div className="flex-1 h-[180px] bg-[#0a0a0a] rounded-[2px] border border-white/[0.02] p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <motion.div 
                    animate={{ x: [0, -100, 0] }}
                    transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                    className="h-full w-[200%] border-b border-[#00D2FF]/20 flex items-end"
                  >
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="w-16 h-16 border-l border-white/[0.05]" />
                    ))}
                  </motion.div>
                </div>
                <div className="z-10 flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-white/10 uppercase tracking-widest">Oscilloscope_Ch_1/2</span>
                  <div className="flex items-center gap-2">
                    <AudioLines size={14} className="text-[#00D2FF]/40" />
                    <span className="text-[11px] font-mono text-white/40 tracking-tight">MASTER_DRY_WET_OUT</span>
                  </div>
                </div>
                <div className="z-10 h-10 flex items-end gap-[1px]">
                  {[...Array(48)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: [4, 18, 6, 28, 8, 14, 4][i % 7] }}
                      transition={{ repeat: Infinity, duration: 0.8 + Math.random() }}
                      className="w-[2px] bg-[#00D2FF]/20 rounded-full" 
                    />
                  ))}
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* FX Grid Section */}
      <div className="flex-1 p-8 flex flex-col gap-6">
        <span className="text-[10px] font-mono font-bold text-white/10 uppercase tracking-widest">Processing Bus</span>
        <div className="flex gap-4">
          <FXCard label="Saturate" icon={<Waves size={16} />} />
          <FXCard label="Limit" icon={<Settings2 size={16} />} />
          <FXCard label="Filter" icon={<Wind size={16} />} />
          <FXCard label="Phase" icon={<Maximize2 size={16} />} />
        </div>
      </div>
      
      {/* Transport Controls */}
      <div className="w-[320px] bg-[#121212] p-8 flex flex-col gap-6 border-l border-white/[0.03]">
         <span className="text-[10px] font-mono font-bold text-white/10 uppercase tracking-widest">Session Control</span>
         <div className="flex items-center justify-between">
           <button onClick={onToggleLoop} className="w-12 h-12 rounded-full border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.02] transition-colors group">
             <Repeat size={18} className={`group-hover:text-[#00D2FF]/60 ${isLooping ? "text-white/10" : "text-white/5"}`} />
           </button>
           <button onClick={onStop} className="w-12 h-12 rounded-full border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.02] transition-colors group">
             <Square size={18} className="text-white/10 group-hover:text-[#E66000]/60" fill="currentColor" />
           </button>
           <button onClick={onTogglePlay} className={`w-20 h-20 rounded-full border flex items-center justify-center hover:scale-105 transition-all group ${isPlaying ? "border-[#E66000]/40 shadow-[0_0_20px_rgba(230,96,0,0.2)] bg-[#E66000]/10" : "border-[#E66000]/20 shadow-[0_0_20px_rgba(230,96,0,0.1)] bg-[#E66000]/05"}`}>
             <Play size={24} className="text-[#E66000]/80 ml-1" fill="currentColor" />
           </button>
         </div>
         <div className="bg-[#0a0a0a] rounded-[2px] border border-white/[0.02] py-4 px-6 flex flex-col items-center">
            <span className="text-[20px] font-mono font-bold text-white/60 tracking-tight">01 : 04 : 128</span>
            <span className="text-[8px] font-mono text-white/10 uppercase tracking-[0.2em] mt-1">TRANSPORT_CLK</span>
         </div>
      </div>
    </div>
  </div>
);

export default function App() {
  const { state, actions } = usePercuProV1Store();
  const { activeTrackId, expandedTrackId, activeEngine } = state.ui;
  const { isPlaying, isLooping } = state.transport;

  return (
    <div className="min-h-screen bg-[#F2F2EB] flex flex-col overflow-x-hidden selection:bg-[#E66000]/20">
      <Header />
      <GrooveGenerator />

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Left: Sequencer */}
        <section className="flex-1 min-w-[880px] flex flex-col overflow-y-auto scrollbar-hide border-r border-[#121212]/5">
          <div className="flex items-center justify-between px-8 h-[64px] border-b border-[#121212]/5 flex-none bg-[#F2F2EB]/80 backdrop-blur-md sticky top-0 z-30">
             <div className="flex items-center gap-4">
               <span className="text-[12px] font-[Inter] font-bold uppercase tracking-widest text-[#121212]/60">
                 Pattern Sequencer
               </span>
               <div className="w-[1px] h-3 bg-[#121212]/10" />
               <span className="text-[9px] font-mono text-[#121212]/30 font-bold uppercase tracking-widest">
                 16 STEPS_32B
               </span>
             </div>
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-[8px] font-mono text-[#121212]/30 font-bold uppercase tracking-widest">SHUFFLE</span>
                  <div className="w-16 h-1 bg-[#121212]/05 rounded-full"><div className="w-[45%] h-full bg-[#E66000]/40 rounded-full" /></div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[8px] font-mono text-[#121212]/30 font-bold uppercase tracking-widest">QUANTIZE</span>
                  <span className="text-[11px] font-mono font-bold text-[#121212]/80">1/16_SWING</span>
                </div>
             </div>
          </div>

          <div className="flex flex-col">
            {SEQUENCER_TRACKS.map((track) => (
              <SequencerRow 
                key={track.id} 
                label={track.label} 
                isActive={activeTrackId === track.id}
                isExpanded={expandedTrackId === track.id}
                onActivate={() => actions.setActiveTrack(track.id)}
                onToggleExpand={() => actions.toggleExpandedTrack(track.id)}
              />
            ))}
          </div>
        </section>

        {/* Sidebar Right: Engine Panels */}
        <aside className="w-[560px] flex-none bg-[#181818] flex flex-col overflow-y-auto border-l border-white/[0.03]">
           <div className="flex items-center justify-between px-6 h-[64px] border-b border-white/[0.03] flex-none sticky top-0 z-30 bg-[#181818]/90 backdrop-blur-md">
              <span className="text-[11px] font-[Inter] font-bold uppercase tracking-widest text-white/40">
                DSP Rack Engines
              </span>
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-[#00D2FF]/40 animate-pulse" />
                 <span className="text-[8px] font-mono text-white/20 font-bold uppercase tracking-[0.2em]">LOW_LATENCY_DA_CORE</span>
              </div>
           </div>

           <SidebarAccordion 
             title="Percussion Engine" 
             isActive={activeEngine === "Percussion Engine"}
             isExpanded={activeEngine === "Percussion Engine"}
             onToggleExpand={() => activeEngine === "Percussion Engine" ? actions.setActiveEngineFromActiveTrack() : actions.setActiveEngine("Percussion Engine")}
           />
           <SidebarAccordion 
             title="Poly-Chord Engine" 
             isActive={activeEngine === "Poly-Chord Engine"}
             isExpanded={activeEngine === "Poly-Chord Engine"}
             onToggleExpand={() => activeEngine === "Poly-Chord Engine" ? actions.setActiveEngineFromActiveTrack() : actions.setActiveEngine("Poly-Chord Engine")}
           />
           <SidebarAccordion 
             title="Acid Bass Line" 
             isActive={activeEngine === "Acid Bass Line"}
             isExpanded={activeEngine === "Acid Bass Line"}
             onToggleExpand={() => activeEngine === "Acid Bass Line" ? actions.setActiveEngineFromActiveTrack() : actions.setActiveEngine("Acid Bass Line")}
           />
           
           <div className="mt-auto p-8 border-t border-white/[0.03] bg-white/[0.01]">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-white/10 uppercase tracking-widest">Global Oversampling</span>
                  <span className="text-[10px] font-mono font-bold text-[#00D2FF]/60">x4 MODE</span>
                </div>
                <div className="flex gap-6">
                  <div className="flex-1"><Knob label="Sample" size={40} value={20} /></div>
                  <div className="flex-1"><Knob label="Bits" size={40} value={80} /></div>
                  <div className="flex-1"><Knob label="Drive" size={40} value={0} /></div>
                </div>
              </div>
           </div>
        </aside>
      </main>

      <MasterSection isPlaying={isPlaying} isLooping={isLooping} onTogglePlay={actions.togglePlay} onStop={actions.stop} onToggleLoop={actions.toggleLoop} />
    </div>
  );
}
