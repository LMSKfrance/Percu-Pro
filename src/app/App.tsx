import React, { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { MasterDockCollapsed, DOCK_HEIGHT } from "./components/MasterDockCollapsed";
import { GrooveGeneratorProvider, GrooveGeneratorBar } from "./components/GrooveGenerator";
import { SequencerRow } from "./components/SequencerRow";
import { InstrumentControlsPanel } from "./components/InstrumentControlsPanel";
import { FXCard } from "./components/FXCard";
import { Fader } from "./components/Fader";
import { Knob } from "./components/Knob";
import {
  Waves,
  Settings2,
  AudioLines,
  Wind,
  Maximize2,
  Play,
  Square,
  Repeat,
} from "lucide-react";
import { motion } from "motion/react";
import { usePercuProV1Store } from "../core/store";
import type { TrackId, AppState } from "../core/types";
import { STEPS_PER_BAR } from "../core/patternTypes";
import * as audioEngine from "../core/audio/AudioEngine";
import * as midi from "../core/midi";
import type { MidiSyncMode } from "../core/midi";

const EMPTY_STEPS = Object.freeze(new Array(STEPS_PER_BAR).fill(false));
const DEFAULT_VELS = Object.freeze(new Array(STEPS_PER_BAR).fill(100));
const EMPTY_ACCENTS = Object.freeze(new Array(STEPS_PER_BAR).fill(false));
const DEFAULT_PITCHES = Object.freeze(new Array(STEPS_PER_BAR).fill(0));

const SEQUENCER_TRACKS: { id: TrackId; label: string }[] = [
  { id: "noise", label: "Noise (Hats)" },
  { id: "hiPerc", label: "Hi Perc" },
  { id: "lowPerc", label: "Low Perc" },
  { id: "clap", label: "Clap" },
  { id: "chord", label: "Chord" },
  { id: "bass", label: "Bass" },
  { id: "subPerc", label: "Sub Perc" },
  { id: "kick", label: "Kick" },
];

const STORAGE_KEY_MASTER = "percu_master_expanded";
const EXPANDED_TOOLS_HEIGHT = 300;

type MasterSectionProps = {
  isPlaying: boolean;
  isLooping: boolean;
  onTogglePlay: () => void;
  onStop: () => void;
  onToggleLoop: () => void;
  midiReady: boolean;
  midiOutputId: string | null;
  midiInputId: string | null;
  midiSyncMode: MidiSyncMode;
  onInitMidi: () => void;
  onMidiOutputChange: (id: string | null) => void;
  onMidiInputChange: (id: string | null) => void;
  onMidiSyncModeChange: (mode: MidiSyncMode) => void;
};

const MasterSectionBody = ({
  isPlaying,
  isLooping,
  onTogglePlay,
  onStop,
  onToggleLoop,
  midiReady,
  midiOutputId,
  midiInputId,
  midiSyncMode,
  onInitMidi,
  onMidiOutputChange,
  onMidiInputChange,
  onMidiSyncModeChange,
}: MasterSectionProps) => (
  <div className="flex h-full min-h-0">
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
    <div className="flex-1 p-8 flex flex-col gap-6">
      <span className="text-[10px] font-mono font-bold text-white/10 uppercase tracking-widest">Processing Bus</span>
      <div className="flex gap-4">
        <FXCard label="Saturate" icon={<Waves size={16} />} />
        <FXCard label="Limit" icon={<Settings2 size={16} />} />
        <FXCard label="Filter" icon={<Wind size={16} />} />
        <FXCard label="Phase" icon={<Maximize2 size={16} />} />
      </div>
    </div>
    <div className="w-[320px] bg-[#121212] p-8 flex flex-col gap-6 border-l border-white/[0.03]">
      <span className="text-[10px] font-mono font-bold text-white/10 uppercase tracking-widest">Session Control</span>
      <div className="flex items-center justify-between">
        <button onClick={onToggleLoop} className="w-12 h-12 rounded-full border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.02] transition-colors group">
          <Repeat size={18} className={`group-hover:text-[#00D2FF]/60 ${isLooping ? "text-white/10" : "text-white/5"}`} />
        </button>
        <button onClick={onStop} className="w-12 h-12 rounded-full border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.02] transition-colors group">
          <Square size={18} className="text-white/10 group-hover:text-[#E66000]/60" fill="currentColor" />
        </button>
        <button onClick={onTogglePlay} className="w-14 h-14 rounded-full bg-[#E66000] flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg shadow-[#E66000]/20">
          <Play size={22} className="text-white ml-0.5" fill="currentColor" />
        </button>
      </div>
      <span className="text-[8px] font-mono text-white/10 uppercase tracking-[0.2em] mt-1">TRANSPORT_CLK</span>

      <div className="border-t border-white/[0.06] pt-6 flex flex-col gap-3">
        <span className="text-[10px] font-mono font-bold text-white/10 uppercase tracking-widest">MIDI</span>
        {!midiReady ? (
          <button
            onClick={onInitMidi}
            className="px-4 py-2 rounded border border-white/10 text-[11px] font-mono text-white/70 hover:bg-white/[0.04] hover:border-[#00D2FF]/40"
          >
            Enable MIDI
          </button>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-mono text-white/30 uppercase">Out</label>
              <select
                value={midiOutputId ?? ""}
                onChange={(e) => onMidiOutputChange(e.target.value || null)}
                className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded px-2 py-1.5 text-[11px] font-mono text-white/80"
              >
                <option value="">—</option>
                {midi.getOutputs().map((o) => (
                  <option key={o.id} value={o.id}>{o.name || o.id}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-mono text-white/30 uppercase">In (sync)</label>
              <select
                value={midiInputId ?? ""}
                onChange={(e) => onMidiInputChange(e.target.value || null)}
                className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded px-2 py-1.5 text-[11px] font-mono text-white/80"
              >
                <option value="">—</option>
                {midi.getInputs().map((i) => (
                  <option key={i.id} value={i.id}>{i.name || i.id}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-mono text-white/30 uppercase">Sync</label>
              <select
                value={midiSyncMode}
                onChange={(e) => onMidiSyncModeChange(e.target.value as MidiSyncMode)}
                className="w-full bg-[#0a0a0a] border border-white/[0.06] rounded px-2 py-1.5 text-[11px] font-mono text-white/80"
              >
                <option value="internal">Internal</option>
                <option value="send">Send (master)</option>
                <option value="receive">Receive (slave)</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
);

export default function App() {
  const { state, actions } = usePercuProV1Store();
  const { activeTrackId, expandedTrackId } = state.ui;
  const { isPlaying, isLooping, bpm } = state.transport;

  const stateRef = useRef(state);
  stateRef.current = state;
  const playStartTimeRef = useRef<number>(0);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);

  const [midiReady, setMidiReady] = useState(false);
  const [midiOutputId, setMidiOutputId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("percu_midi_output") : null
  );
  const [midiInputId, setMidiInputId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("percu_midi_input") : null
  );
  const [midiSyncMode, setMidiSyncMode] = useState<MidiSyncMode>(() =>
    (typeof window !== "undefined" ? localStorage.getItem("percu_midi_sync") : null) as MidiSyncMode || "internal"
  );

  useEffect(() => {
    if (midiOutputId !== null) localStorage.setItem("percu_midi_output", midiOutputId);
    else localStorage.removeItem("percu_midi_output");
  }, [midiOutputId]);
  useEffect(() => {
    if (midiInputId !== null) localStorage.setItem("percu_midi_input", midiInputId);
    else localStorage.removeItem("percu_midi_input");
  }, [midiInputId]);
  useEffect(() => {
    localStorage.setItem("percu_midi_sync", midiSyncMode);
  }, [midiSyncMode]);

  useEffect(() => {
    if (midiOutputId) midi.selectOutput(midiOutputId);
    else midi.selectOutput(null);
  }, [midiOutputId]);
  useEffect(() => {
    if (midiInputId) midi.selectInput(midiInputId);
    else midi.selectInput(null);
  }, [midiInputId]);

  const initMidiOnce = useCallback(async () => {
    if (midiReady || !midi.isMidiSupported()) return;
    const ok = await midi.initMidi();
    setMidiReady(ok);
    if (ok && midiOutputId) midi.selectOutput(midiOutputId);
    if (ok && midiInputId) midi.selectInput(midiInputId);
  }, [midiReady, midiOutputId, midiInputId]);

  useEffect(() => {
    if (midiSyncMode !== "receive") return;
    midi.setTransportCallbacks({
      onStart: () => {
        if (!stateRef.current.transport.isPlaying) actions.togglePlay();
      },
      onContinue: () => {
        if (!stateRef.current.transport.isPlaying) actions.togglePlay();
      },
      onStop: () => actions.stop(),
      onClock: () => {},
      onBpmFromClock: (bpm) => actions.setBpm(bpm),
    });
    return () => midi.setTransportCallbacks(null);
  }, [midiSyncMode, actions.togglePlay, actions.stop, actions.setBpm]);

  const handleTogglePlay = useCallback(() => {
    audioEngine.userGestureInit();
    initMidiOnce();
    actions.togglePlay();
  }, [actions.togglePlay, initMidiOnce]);

  useEffect(() => {
    if (state.transport.isPlaying) {
      playStartTimeRef.current = performance.now();
      const onStepTrigger =
        midiReady && midi.getSelectedOutputId()
          ? (laneId: import("../core/types").TrackId, stepIndex: number, timeSec: number, velocity: number, accent: boolean, pitchSemitones: number) => {
              midi.sendStepTrigger({ laneId, stepIndex, timeSec, velocity, accent, pitchSemitones });
            }
          : undefined;
      audioEngine.start((): AppState => stateRef.current, onStepTrigger);
      if (midiSyncMode === "send" && midi.getSelectedOutputId()) {
        midi.setTransportBpm(state.transport.bpm);
        midi.sendTransportStart();
      }
    } else {
      if (midiSyncMode === "send") midi.sendTransportStop();
      audioEngine.stop();
      setCurrentStepIndex(-1);
    }
  }, [state.transport.isPlaying, midiReady, midiSyncMode]);

  useEffect(() => {
    if (!state.transport.isPlaying || state.transport.bpm <= 0) return;
    const stepDurMs = (60 / state.transport.bpm) * 1000 / 4;
    const tick = () => {
      const elapsed = performance.now() - playStartTimeRef.current;
      const step = Math.floor(elapsed / stepDurMs) % 16;
      setCurrentStepIndex(step);
    };
    tick();
    const id = setInterval(tick, Math.max(20, Math.floor(stepDurMs / 4)));
    return () => clearInterval(id);
  }, [state.transport.isPlaying, state.transport.bpm]);

  useEffect(() => {
    audioEngine.setBpm(state.transport.bpm);
    if (midiSyncMode === "send") midi.setTransportBpm(state.transport.bpm);
  }, [state.transport.bpm, midiSyncMode]);

  useEffect(() => {
    if (state.pattern) audioEngine.setPattern(state.pattern);
  }, [state.pattern]);

  useEffect(() => {
    audioEngine.setHiPercInstrumentState(state.ui.hiPercInstrument);
  }, [state.ui.hiPercInstrument]);

  const [masterExpanded, setMasterExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem(STORAGE_KEY_MASTER);
    if (saved === "true") return true;
    if (saved === "false") return false;
    return false;
  });

  const footerRef = useRef<HTMLDivElement>(null);

  const scrollFooterIntoView = useCallback(() => {
    footerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const handleExpandMaster = useCallback(() => {
    setMasterExpanded(true);
    requestAnimationFrame(() => {
      footerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MASTER, String(masterExpanded));
  }, [masterExpanded]);

  return (
    <div
      className="min-h-screen bg-[#F2F2EB] flex flex-col overflow-x-hidden selection:bg-[#E66000]/20"
      style={!masterExpanded ? { paddingBottom: DOCK_HEIGHT } : undefined}
    >
      <GrooveGeneratorProvider>
        <Header />
        <GrooveGeneratorBar />

      </GrooveGeneratorProvider>

      <main className="flex-1 flex overflow-hidden min-h-0">
        <section className="flex-1 min-w-[880px] flex flex-col overflow-y-auto scrollbar-hide border-r border-[#121212]/5">
          <div className="flex items-center justify-between px-8 h-[64px] border-b border-[#121212]/5 flex-none bg-[#F2F2EB]/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <span className="text-[12px] font-sans font-bold uppercase tracking-widest text-[#121212]/60">
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
            {SEQUENCER_TRACKS.map((track) => {
              const lane = state.pattern?.lanes[track.id];
              const steps = lane?.steps?.length === STEPS_PER_BAR
                ? lane.steps.map((s) => s.on)
                : [...EMPTY_STEPS];
              const velocities = lane?.steps?.length === STEPS_PER_BAR
                ? lane.steps.map((s) => Math.round(s.velocity * 100))
                : [...DEFAULT_VELS];
              const accents = lane?.steps?.length === STEPS_PER_BAR
                ? lane.steps.map((s) => s.accent)
                : [...EMPTY_ACCENTS];
              const pitches = lane?.steps?.length === STEPS_PER_BAR
                ? lane.steps.map((s) => s.pitch ?? 0)
                : [...DEFAULT_PITCHES];
              return (
                <SequencerRow
                  key={track.id}
                  trackId={track.id}
                  label={track.label}
                  isActive={activeTrackId === track.id}
                  isExpanded={expandedTrackId === track.id}
                  isMuted={state.ui.laneMuted?.[track.id] ?? false}
                  onMuteToggle={() => actions.setLaneMuted(track.id, !(state.ui.laneMuted?.[track.id] ?? false))}
                  onActivate={() => actions.setActiveTrack(track.id)}
                  onToggleExpand={() => actions.toggleExpandedTrack(track.id)}
                  steps={steps}
                  velocities={velocities}
                  accents={accents}
                  pitches={pitches}
                  currentStepIndex={currentStepIndex}
                  onVelocityChange={(i, v) => actions.setStepVelocity(track.id, i, Math.max(0.15, Math.min(1, v / 100)))}
                  onPitchChange={(i, p) => actions.setStepPitch(track.id, i, p)}
                  onStepAdd={(i) => actions.setStepOn(track.id, i)}
                  onStepClear={(i) => actions.clearStep(track.id, i)}
                  onStepAccentToggle={(i) => actions.setStepAccent(track.id, i, !accents[i])}
                />
              );
            })}
          </div>
        </section>

        <aside className="w-[560px] flex-none bg-[#181818] flex flex-col overflow-y-auto border-l border-white/[0.03]">
          <div className="flex items-center justify-between px-6 h-[64px] border-b border-white/[0.03] flex-none sticky top-0 z-30 bg-[#181818]/90 backdrop-blur-md">
            <span className="text-[11px] font-sans font-bold uppercase tracking-widest text-white/40">
              Instrument Controls
            </span>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D2FF]/40 animate-pulse" />
              <span className="text-[8px] font-mono text-white/20 font-bold uppercase tracking-[0.2em]">DSP RACK</span>
            </div>
          </div>

          <InstrumentControlsPanel selectedTrackId={activeTrackId} />

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

      <div ref={footerRef} className="flex-none" aria-hidden />

      <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
        <motion.div
          initial={false}
          animate={{ height: masterExpanded ? EXPANDED_TOOLS_HEIGHT : 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 260 }}
          className="overflow-hidden bg-[#181818] border-t border-white/[0.03] flex-shrink-0"
        >
          <div className="h-full min-h-0 w-full">
            <MasterSectionBody
              isPlaying={isPlaying}
              isLooping={isLooping}
              onTogglePlay={handleTogglePlay}
              onStop={actions.stop}
              onToggleLoop={actions.toggleLoop}
              midiReady={midiReady}
              midiOutputId={midiOutputId}
              midiInputId={midiInputId}
              midiSyncMode={midiSyncMode}
              onInitMidi={initMidiOnce}
              onMidiOutputChange={setMidiOutputId}
              onMidiInputChange={setMidiInputId}
              onMidiSyncModeChange={setMidiSyncMode}
            />
          </div>
        </motion.div>
        <MasterDockCollapsed
          isPlaying={isPlaying}
          isLooping={isLooping}
          bpm={bpm}
          onTogglePlay={handleTogglePlay}
          onStop={actions.stop}
          onToggleLoop={actions.toggleLoop}
          onBpmChange={actions.setBpm}
          onExpand={handleExpandMaster}
          onCollapse={() => setMasterExpanded(false)}
          isExpanded={masterExpanded}
          onBarClick={scrollFooterIntoView}
        />
      </div>
    </div>
  );
}
