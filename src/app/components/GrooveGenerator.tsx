import React, { useState, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Drum,
  ChevronDown, 
  Layers, 
  Zap,
  RefreshCcw
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

type GrooveGeneratorContextValue = {
  seed: number;
  setSeed: (v: number | ((prev: number) => number)) => void;
  handleGenerate: () => void;
  isGenerating: boolean;
  activePreset: string;
  setActivePreset: (v: string) => void;
  complexity: number;
  setComplexity: (v: number) => void;
  intensity: number;
  setIntensity: (v: number) => void;
};

const GrooveGeneratorContext = createContext<GrooveGeneratorContextValue | null>(null);

export function useGrooveGenerator(): GrooveGeneratorContextValue {
  const ctx = useContext(GrooveGeneratorContext);
  if (!ctx) throw new Error("useGrooveGenerator must be used within GrooveGeneratorProvider");
  return ctx;
}

const VARIANTS = ["Detroit", "Tbilisi", "Berlin"];

export function GrooveGeneratorProvider({ children }: { children: React.ReactNode }) {
  const { state, actions } = usePercuProV1Store();
  const [activePreset, setActivePreset] = useState("swing");
  const [complexity, setComplexity] = useState(45);
  const [intensity, setIntensity] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(() => state.pattern?.seed ?? DEFAULT_SEED);

  const runGenerate = (seedToUse: number) => {
    const bpm = state.transport.bpm;
    const currentPattern = state.pattern ?? createInitialPatternState(bpm, seedToUse);
    const effectiveSeed = seedToUse + hashStr(`${activePreset}-${complexity}-${intensity}`);

    const density = 0.15 + (complexity / 100) * 0.7;
    const swingPct = PRESET_TO_SWING[activePreset] ?? 55;
    const cityProfile = state.ui.cityProfile?.trim() || "Berlin";
    const influenceVector = PRESET_TO_INFLUENCE[activePreset] ?? [];
    const artistLenses: string[] = [];
    const mode = activePreset === "ghost" || activePreset === "chaos" ? "FUTURIST_FUNK" : "";

    const input: GeneratorInput = {
      seed: effectiveSeed,
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
    const act = actions as typeof actions & {
      setGrooveLastCritique?: (v: { reason: string; message: string }[]) => void;
      setGrooveLastAppliedCount?: (v: number) => void;
      setGrooveTop3?: (v: unknown) => void;
    };
    act.setGrooveLastCritique?.(critique);
    act.setGrooveLastAppliedCount?.(opCount);
    act.setGrooveTop3?.(top3);
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

  const value: GrooveGeneratorContextValue = {
    seed,
    setSeed,
    handleGenerate,
    isGenerating,
    activePreset,
    setActivePreset,
    complexity,
    setComplexity,
    intensity,
    setIntensity,
  };

  return (
    <GrooveGeneratorContext.Provider value={value}>
      {children}
    </GrooveGeneratorContext.Provider>
  );
}

/** Generate Groove button + Seed (no <>). For use in Header. */
export const GrooveGeneratorHeaderBlock: React.FC = () => {
  const { seed, handleGenerate, isGenerating } = useGrooveGenerator();
  return (
    <div className="flex items-center gap-4 justify-center shrink-0">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className={cn(
          "h-11 px-6 rounded-[6px] flex items-center gap-3 transition-all duration-300 relative overflow-hidden group",
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
              <Drum size={16} className="text-[#E66000]" />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="text-[12px] font-sans font-bold text-white uppercase tracking-widest">
          Generate Groove
        </span>
        <motion.div
          className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
          animate={{ left: isGenerating ? "100%" : "-100%" }}
          transition={{ duration: 0.8 }}
        />
      </button>
      <div className="h-8 w-px bg-[#121212]/08" aria-hidden />
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#121212]/20 mb-1">Seed</span>
        <div className="flex items-center justify-center bg-[#121212]/03 border border-[#121212]/05 rounded-[4px] px-3 py-1.5 min-w-[3ch]">
          <span className="text-[11px] font-mono font-medium text-[#121212]/80 tabular-nums">
            {seed}
          </span>
        </div>
      </div>
    </div>
  );
};

export const GrooveGeneratorBar: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const selectedVariant = state.ui.cityProfile;
  const setSelectedVariant = (actions as unknown as { setCityProfile: (v: string) => void }).setCityProfile;
  const {
    activePreset,
    setActivePreset,
    complexity,
    setComplexity,
    intensity,
    setIntensity,
  } = useGrooveGenerator();

  return (
    <div className="w-full h-[80px] px-12 bg-[#F2F2EB] border-b border-[#121212]/05 grid grid-cols-[1fr_auto_1fr] items-center gap-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E66000]/02 to-transparent pointer-events-none" />

      {/* Left Section: Presets + Parameters */}
      <div className="flex items-end gap-8 min-w-0">
        <div className="flex flex-col shrink-0 pb-0.5">
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
                  <span className="text-[12px] font-sans font-bold text-[#121212]/80">
                    {GROOVE_PRESETS.find(p => p.id === activePreset)?.name}
                  </span>
                </div>
                <ChevronDown size={14} className="text-[#121212]/20" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-full bg-[#181818] rounded-[4px] border border-white/10 shadow-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all z-[100] p-1">
                {GROOVE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setActivePreset(p.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-[2px] text-[11px] font-sans font-bold text-left transition-colors",
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
        <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-8 max-w-[420px] content-end">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-widest h-4">
              <span className="text-[#121212]/20 flex items-center gap-1.5"><Layers size={10} /> Complexity</span>
              <span className="text-[#E66000]">{complexity}%</span>
            </div>
            <div className="relative h-2 w-full rounded-[2px] overflow-hidden cursor-pointer bg-[#121212]/12">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-[#181818] rounded-[2px]"
                animate={{ width: `${complexity}%` }}
              />
              <input 
                type="range" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                value={complexity}
                onChange={(e) => setComplexity(parseInt(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-widest h-4">
              <span className="text-[#121212]/20 flex items-center gap-1.5"><Zap size={10} /> Velocity Variation</span>
              <span className="text-[#00D2FF]">{intensity}%</span>
            </div>
            <div className="relative h-2 w-full rounded-[2px] overflow-hidden cursor-pointer bg-[#121212]/12">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-[#181818] rounded-[2px]"
                animate={{ width: `${intensity}%` }}
              />
              <input 
                type="range" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                value={intensity}
                onChange={(e) => setIntensity(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Center: City (Detroit / Tbilisi / Berlin) */}
      <div className="flex items-center bg-[#121212]/03 p-1 rounded-[6px] relative w-[320px] shadow-inner border border-[#121212]/05">
        {VARIANTS.map((v) => (
          <button
            key={v}
            onClick={() => setSelectedVariant(v)}
            className={cn(
              "flex-1 relative z-10 py-1.5 text-[10px] font-sans font-bold uppercase tracking-[0.2em] transition-colors duration-400 rounded-[4px]",
              selectedVariant === v ? "text-white" : "text-[#121212]/30 hover:text-[#121212]/60"
            )}
          >
            {v}
          </button>
        ))}
        <motion.div
          className="absolute h-[calc(100%-8px)] rounded-[4px] bg-[#181818] shadow-[0_2px_4px_rgba(0,0,0,0.1)] top-1 left-1"
          initial={false}
          animate={{
            x: VARIANTS.indexOf(selectedVariant) * (312 / 3),
            width: 312 / 3 - 8,
          }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      </div>

      <div className="min-w-0" aria-hidden />
    </div>
  );
}
