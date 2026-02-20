import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Dices, 
  Settings, 
  ChevronDown, 
  Layers, 
  Zap,
  RefreshCcw,
  Gauge
} from "lucide-react";
import { cn } from "../../lib/utils";
import { usePercuProV1Store } from "../../core/store";
import { createInitialPatternState } from "../../core/patternTypes";
import type { GeneratorInput } from "../../core/algorithm/generator";
import { generateGroove } from "../../core/groove/generateGroove";

const GROOVE_PRESETS = [
  { id: "tight", name: "Studio Tight", color: "#00D2FF" },
  { id: "swing", name: "Classic Swing", color: "#E66000" },
  { id: "lazy", name: "Lazy 16ths", color: "#E66000" },
  { id: "chaos", name: "Generative Chaos", color: "#FF3B30" },
  { id: "ghost", name: "Ghost Note Flow", color: "#00D2FF" }
];

const DEFAULT_SEED = 42;
const MIN_SEED = 0;
const MAX_SEED = 999999;

/** Map preset id to generator influence (AfroFunk/AfroDisco when implied) */
const PRESET_TO_INFLUENCE: Record<string, string[]> = {
  tight: [],
  swing: ["AfroFunk"],
  lazy: ["AfroDisco"],
  chaos: ["AfroFunk", "AfroDisco"],
  ghost: ["AfroFunk"],
};

/** swingPct by preset (deterministic) */
const PRESET_TO_SWING: Record<string, number> = {
  tight: 50,
  swing: 55,
  lazy: 58,
  ghost: 54,
  chaos: 60,
};

/** Deterministic integer hash for seed derivation */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
  return h % 0x7fffffff;
}

export const GrooveGenerator: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const [activePreset, setActivePreset] = useState("swing");
  const [complexity, setComplexity] = useState(45);
  const [intensity, setIntensity] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(() => state.pattern?.seed ?? DEFAULT_SEED);

  const runGenerate = (seedToUse: number) => {
    const bpm = state.transport.bpm;
    const currentPattern = state.pattern ?? createInitialPatternState(bpm, seedToUse);
    const seed = seedToUse + hashStr(`${activePreset}-${complexity}-${intensity}`);

    const density = 0.15 + (complexity / 100) * 0.7;
    const swingPct = PRESET_TO_SWING[activePreset] ?? 55;
    const cityProfile = state.ui.cityProfile?.trim() || "Berlin";
    const influenceVector = PRESET_TO_INFLUENCE[activePreset] ?? [];
    const artistLenses: string[] = [];
    const mode = activePreset === "ghost" || activePreset === "chaos" ? "FUTURIST_FUNK" : "";

    const input: GeneratorInput = {
      seed,
      density,
      swingPct,
      tempoBpm: bpm,
      cityProfile,
      influenceVector,
      artistLenses,
      mode,
      currentPattern,
    };

    const { replacePatchOps, critique, opCount, top3 } = generateGroove(input, currentPattern);
    actions.applyPatternPatch(replacePatchOps);
    actions.setGrooveLastCritique(critique);
    actions.setGrooveLastAppliedCount(opCount);
    actions.setGrooveTop3(top3);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      runGenerate(seed);
      setSeed((s) => Math.min(MAX_SEED, s + 1));
    } catch (err) {
      console.warn("[GrooveGenerator] pipeline error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrevSeed = () => {
    setSeed((s) => Math.max(MIN_SEED, s - 1));
  };

  const handleNextSeed = () => {
    const nextSeed = Math.min(MAX_SEED, seed + 1);
    setSeed(nextSeed);
    setIsGenerating(true);
    try {
      runGenerate(nextSeed);
    } catch (err) {
      console.warn("[GrooveGenerator] pipeline error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full h-[80px] px-12 bg-[#F2F2EB] border-b border-[#121212]/05 flex items-center justify-between gap-12 relative overflow-hidden">
      {/* Background Accent Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E66000]/02 to-transparent pointer-events-none" />

      {/* Left Section: Preset Selection */}
      <div className="flex items-center gap-8 min-w-fit">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-[#121212]/20 mb-1">
            <Sparkles size={12} strokeWidth={2.5} />
            <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Algorithm Presets</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="flex items-center gap-3 px-4 py-2 bg-[#121212]/03 border border-[#121212]/05 rounded-[4px] hover:bg-[#121212]/06 transition-all min-w-[180px] justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(230,96,0,0.4)]" 
                    style={{ backgroundColor: GROOVE_PRESETS.find(p => p.id === activePreset)?.color }} 
                  />
                  <span className="text-[12px] font-[Inter] font-bold text-[#121212]/80">
                    {GROOVE_PRESETS.find(p => p.id === activePreset)?.name}
                  </span>
                </div>
                <ChevronDown size={14} className="text-[#121212]/20" />
              </button>
              
              {/* Dropdown Menu (Hidden for demo, just visual) */}
              <div className="absolute top-full left-0 mt-1 w-full bg-[#181818] rounded-[4px] border border-white/10 shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all z-[100] p-1">
                {GROOVE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePreset(p.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-[2px] text-[11px] font-[Inter] font-bold text-left transition-colors",
                      activePreset === p.id ? "bg-[#E66000]/10 text-[#E66000]" : "text-white/40 hover:bg-white/05 hover:text-white/80"
                    )}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Variabilities / Parameters */}
      <div className="flex-1 flex items-center gap-12 max-w-[800px]">
        {/* Complexity Parameter */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-widest">
            <span className="text-[#121212]/20 flex items-center gap-1.5"><Layers size={10} /> Complexity</span>
            <span className="text-[#E66000]">{complexity}%</span>
          </div>
          <div className="relative h-1.5 w-full bg-[#121212]/05 rounded-full overflow-hidden cursor-pointer group">
            <motion.div 
              className="absolute left-0 top-0 h-full bg-[#181818] rounded-full"
              animate={{ width: `${complexity}%` }}
            />
            <input 
              type="range" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={complexity}
              onChange={(e) => setComplexity(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Intensity Parameter */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-widest">
            <span className="text-[#121212]/20 flex items-center gap-1.5"><Zap size={10} /> Velocity Variation</span>
            <span className="text-[#00D2FF]">{intensity}%</span>
          </div>
          <div className="relative h-1.5 w-full bg-[#121212]/05 rounded-full overflow-hidden cursor-pointer group">
            <motion.div 
              className="absolute left-0 top-0 h-full bg-[#181818] rounded-full"
              animate={{ width: `${intensity}%` }}
            />
            <input 
              type="range" 
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Probability Map Visualization */}
        <div className="w-[180px] h-10 flex items-end gap-[2px] px-2 bg-[#121212]/03 rounded-[4px] border border-[#121212]/05">
          {[...Array(16)].map((_, i) => {
            const h = i % 4 === 0 ? 80 : 30 + Math.random() * 40;
            return (
              <motion.div 
                key={i}
                animate={{ height: `${h}%` }}
                className={cn(
                  "flex-1 rounded-t-[1px]",
                  i % 4 === 0 ? "bg-[#E66000]/40" : "bg-[#121212]/10"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Right Section: < | Generate | > */}
      <div className="flex items-center gap-2 min-w-fit">
        <div className="h-10 w-[1px] bg-[#121212]/05 mx-2" />
        <button
          type="button"
          onClick={handlePrevSeed}
          disabled={isGenerating}
          className="h-11 w-11 rounded-full bg-[#121212]/05 border border-[#121212]/05 flex items-center justify-center hover:bg-[#121212]/10 transition-colors text-[#121212]/60 hover:text-[#121212]/90 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Previous seed"
        >
          <span className="text-[16px] font-bold leading-none">&lt;</span>
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            "h-11 px-6 rounded-full flex items-center gap-3 transition-all duration-300 relative overflow-hidden group",
            isGenerating ? "bg-[#181818] scale-95" : "bg-[#181818] hover:bg-[#2a2a2a] shadow-lg shadow-[#181818]/10"
          )}
        >
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.5, ease: "linear" }}
              >
                <RefreshCcw size={16} className="text-[#E66000]" />
              </motion.div>
            ) : (
              <motion.div key="icon" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <Dices size={16} className="text-[#E66000]" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-[12px] font-[Inter] font-bold text-white uppercase tracking-widest">
            Generate Groove
          </span>
          <motion.div
            className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            animate={{ left: isGenerating ? "100%" : "-100%" }}
            transition={{ duration: 0.8 }}
          />
        </button>
        <button
          type="button"
          onClick={handleNextSeed}
          disabled={isGenerating}
          className="h-11 w-11 rounded-full bg-[#121212]/05 border border-[#121212]/05 flex items-center justify-center hover:bg-[#121212]/10 transition-colors text-[#121212]/60 hover:text-[#121212]/90 disabled:opacity-50 disabled:pointer-events-none"
          aria-label="Next seed and generate"
        >
          <span className="text-[16px] font-bold leading-none">&gt;</span>
        </button>
        <button className="w-11 h-11 rounded-full bg-[#121212]/03 border border-[#121212]/05 flex items-center justify-center hover:bg-[#121212]/06 transition-all group">
          <Settings size={18} className="text-[#121212]/30 group-hover:text-[#121212]/60" />
        </button>
      </div>
    </div>
  );
};
