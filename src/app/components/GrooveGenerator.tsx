import React, { useState, createContext, useContext, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { 
  Sparkles, 
  ChevronLeft,
  ChevronRight,
  Layers, 
  Zap,
} from "lucide-react";
import { cn, CONTROL_STRIP_STYLE } from "../../lib/utils";
import { Knob } from "./Knob";
import { usePercuProV1Store } from "../../core/store";
import { createInitialPatternState, applyPatternPatch, type PatternState } from "../../core/patternTypes";
import type { GrooveCandidate, AppState } from "../../core/types";

type StoreActions = {
  setPattern: (p: PatternState) => void;
  applyPatternPatch: (ops: import("../../core/patternTypes").PatchOp[]) => void;
};
import {
  onGrooveButtonPressed,
  setGrooveBridge,
  setGrooveTemplate,
  applyGroove,
  generatePattern,
  mutatePatternEngine,
  enginePatternToStorePattern,
  storePatternToChannelStates,
  getDefaultGrooveTemplateId,
  exportPercuPayload,
  cityToDetroitBerlin,
} from "../../core/groove";

const GROOVE_PRESETS = [
  { id: "tight", name: "Studio Tight", color: "#00D2FF" },
  { id: "swing", name: "Classic Swing", color: "#E66000" },
  { id: "lazy", name: "Lazy 16ths", color: "#E66000" },
  { id: "chaos", name: "Generative Chaos", color: "#FF3B30" },
  { id: "ghost", name: "Ghost Note Flow", color: "#00D2FF" }
];

const DEFAULT_SEED = 42;
const MAX_SEED = 999999;

function presetToTemplateId(presetId: string): string {
  const map: Record<string, string> = {
    tight: "straight",
    swing: "ableton_16_57",
    lazy: "warehouse_drag",
    chaos: "broken_funk",
    ghost: "detroit_nudge",
  };
  return map[presetId] ?? getDefaultGrooveTemplateId();
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
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;
  const [activePreset, setActivePreset] = useState("swing");
  const [complexity, setComplexity] = useState(45);
  const [intensity, setIntensity] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(() => state.pattern?.seed ?? DEFAULT_SEED);

  useEffect(() => {
    const act = actions as unknown as StoreActions;
    const getState = (): AppState => stateRef.current;
    const getGrooveParams = () => {
      const s = getState();
      return {
        tempo: s.transport?.bpm ?? 120,
        swingPct: s.pattern?.swingPct ?? 50,
        grooveTemplateId: presetToTemplateId(activePreset),
        grooveAmount: intensity / 100,
      };
    };
    setGrooveBridge({
      setSwing(value) {
        const s = getState();
        const seedVal = s.pattern ? s.pattern.seed : DEFAULT_SEED;
        const pat = s.pattern ?? createInitialPatternState(s.transport?.bpm ?? 120, seedVal);
        act.setPattern({ ...pat, swingPct: Math.max(50, Math.min(70, value)) });
        const next = { ...pat, swingPct: Math.max(50, Math.min(70, value)) };
        const ops = applyGroove(next, { ...getGrooveParams(), swingPct: next.swingPct });
        if (ops.length) act.applyPatternPatch(ops);
      },
      setGrooveTemplate(id) {
        const s = getState();
        const pat = s.pattern;
        if (!pat) return;
        const ops = applyGroove(pat, { ...getGrooveParams(), grooveTemplateId: id });
        if (ops.length) act.applyPatternPatch(ops);
      },
      regeneratePattern(scope, seedOverride) {
        const s = getState();
        const seedToUse = seedOverride ?? s.pattern?.seed ?? seed;
        const pat = s.pattern ?? createInitialPatternState(s.transport?.bpm ?? 120, seedToUse);
        const projectState = {
          tempo: s.transport?.bpm ?? 120,
          loopBars: 1,
          stepsPerBar: 16,
          seed: seedToUse,
          swing: pat.swingPct ?? 50,
          grooveTemplateId: getGrooveParams().grooveTemplateId,
          grooveAmount: intensity / 100,
          variationIndex: 0,
        };
        const channelStates = storePatternToChannelStates(pat);
        const cityProfile = getState().ui?.cityProfile ?? "Tbilisi";
        const controls = {
          density: pat.density ?? 0.5,
          funkiness: complexity / 100,
          complexity: complexity / 100,
          fillAmount: intensity / 100,
          chaos: Math.min(0.3, intensity / 200),
          detroitBerlin: cityToDetroitBerlin(cityProfile),
          percussiveNoisy: intensity / 100,
        };
        const enginePattern = generatePattern(projectState, channelStates, controls, scope);
        const storePattern = enginePatternToStorePattern(
          enginePattern,
          projectState.tempo,
          projectState.seed,
          projectState.swing,
          controls.density
        );
        act.setPattern(storePattern);
        const grooveOps = applyGroove(storePattern, {
          tempo: projectState.tempo,
          swingPct: projectState.swing,
          grooveTemplateId: projectState.grooveTemplateId,
          grooveAmount: projectState.grooveAmount,
        });
        if (grooveOps.length) act.applyPatternPatch(grooveOps);
      },
      mutatePattern(_scope, mutIntensity) {
        const s = getState();
        const pat = s.pattern;
        if (!pat) return;
        const mutOps = mutatePatternEngine(pat, pat.seed ?? seed, mutIntensity);
        const nextPattern = applyPatternPatch(pat, mutOps);
        const grooveOps = applyGroove(nextPattern, getGrooveParams());
        if (mutOps.length || grooveOps.length) act.applyPatternPatch([...mutOps, ...grooveOps]);
      },
      applyGrooveTiming() {
        const s = getState();
        const pat = s.pattern;
        if (!pat) return;
        const ops = applyGroove(pat, getGrooveParams());
        if (ops.length) act.applyPatternPatch(ops);
      },
    });
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_DEBUG_GROOVE === "1") {
      (window as unknown as { percuExportGroove?: () => unknown }).percuExportGroove = () => {
        const s = getState();
        const pat = s.pattern;
        if (!pat) return null;
        const payload = exportPercuPayload({
          pattern: pat,
          tempo: s.transport?.bpm ?? 120,
          swing: pat.swingPct,
          grooveTemplateId: getGrooveParams().grooveTemplateId,
          grooveAmount: getGrooveParams().grooveAmount,
        });
        console.log("[Percu] export", payload);
        return payload;
      };
    }
    return () => {
      setGrooveBridge(null);
      if (typeof import.meta !== "undefined" && import.meta.env?.VITE_DEBUG_GROOVE === "1") {
        (window as unknown as { percuExportGroove?: () => unknown }).percuExportGroove = undefined;
      }
    };
  }, [actions, activePreset, intensity, complexity, seed]);

  const runGenerate = (seedToUse: number) => {
    const bpm = state.transport.bpm;
    const initialPattern = createInitialPatternState(bpm, seedToUse);
    const act = actions as unknown as {
      setPattern: (p: PatternState) => void;
      setGrooveLastCritique: (v: { reason: string; message: string }[]) => void;
      setGrooveLastAppliedCount: (v: number) => void;
      setGrooveTop3: (v: GrooveCandidate[] | null) => void;
    };
    act.setPattern(initialPattern);
    act.setGrooveLastCritique([]);
    act.setGrooveLastAppliedCount(0);
    act.setGrooveTop3(null);
  };

  const handleGenerate = () => {
    const seedToUse = seed;
    setIsGenerating(true);
    try {
      onGrooveButtonPressed({
        runCurrentBehavior: () => {
          runGenerate(seedToUse);
          setSeed((s) => Math.min(MAX_SEED, s + 1));
        },
        getSeedForThisRun: () => seedToUse,
        isGroovePanelOpen: () => true,
      });
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

/** Header center slot: Generate Groove button + Seed removed; container kept with id for adding a new button later. */
export const GrooveGeneratorHeaderBlock: React.FC = () => {
  return (
    <div id="groove-generator-header-block" className="flex items-center gap-4 justify-center shrink-0" />
  );
};

function applyPreset(setActivePreset: (id: string) => void, presetId: string) {
  setActivePreset(presetId);
  setGrooveTemplate(presetToTemplateId(presetId));
}

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

  const [presetDropdownOpen, setPresetDropdownOpen] = useState(false);
  const presetTriggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentIndex = GROOVE_PRESETS.findIndex((p) => p.id === activePreset);
  const prevPreset = () => {
    const idx = currentIndex <= 0 ? GROOVE_PRESETS.length - 1 : currentIndex - 1;
    applyPreset(setActivePreset, GROOVE_PRESETS[idx].id);
  };
  const nextPreset = () => {
    const idx = currentIndex >= GROOVE_PRESETS.length - 1 ? 0 : currentIndex + 1;
    applyPreset(setActivePreset, GROOVE_PRESETS[idx].id);
  };

  useEffect(() => {
    if (!presetDropdownOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        presetTriggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return;
      setPresetDropdownOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [presetDropdownOpen]);

  const dropdownContent = presetDropdownOpen && typeof document !== "undefined" && (
    createPortal(
      <div
        ref={dropdownRef}
        className="fixed bg-[#181818] rounded-[4px] border border-white/10 shadow-xl p-1 min-w-[180px] z-[9999]"
        style={{
          top: presetTriggerRef.current
            ? presetTriggerRef.current.getBoundingClientRect().bottom + 4
            : 0,
          left: presetTriggerRef.current
            ? presetTriggerRef.current.getBoundingClientRect().left
            : 0,
        }}
      >
        {GROOVE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              applyPreset(setActivePreset, p.id);
              setPresetDropdownOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-[2px] text-[11px] font-sans font-bold text-left transition-colors",
              activePreset === p.id ? "bg-[#E66000]/10 text-[#E66000]" : "text-white/40 hover:bg-white/05 hover:text-white/80"
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </button>
        ))}
      </div>,
      document.body
    )
  );

  return (
    <div className="w-full h-[80px] px-12 bg-[#F2F2EB] border-b border-[#121212]/05 grid grid-cols-[1fr_auto_1fr] items-center gap-8 relative z-30">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E66000]/02 to-transparent pointer-events-none overflow-hidden" />

      {/* Left Section: Presets + Parameters */}
      <div className="flex items-end gap-8 min-w-0">
        <div className="flex flex-col shrink-0 pb-0.5">
          <div className="flex items-center gap-2 text-[#121212]/20 mb-1">
            <Sparkles size={12} strokeWidth={2.5} />
            <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Algorithm Presets</span>
          </div>
          <div className="flex items-center gap-1">
            <div ref={presetTriggerRef} className={cn(CONTROL_STRIP_STYLE.container)}>
              <button
                type="button"
                onClick={prevPreset}
                className={cn(CONTROL_STRIP_STYLE.navButton, CONTROL_STRIP_STYLE.navButtonLeft)}
                aria-label="Previous preset"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPresetDropdownOpen((o) => !o)}
                className={cn(CONTROL_STRIP_STYLE.titleButton, "justify-center")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(230,96,0,0.4)]"
                    style={{ backgroundColor: GROOVE_PRESETS.find(p => p.id === activePreset)?.color }}
                  />
                  <span className="text-[12px] font-sans font-bold text-[#121212]/80">
                    {GROOVE_PRESETS.find(p => p.id === activePreset)?.name}
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={nextPreset}
                className={cn(CONTROL_STRIP_STYLE.navButton, CONTROL_STRIP_STYLE.navButtonRight)}
                aria-label="Next preset"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
        {dropdownContent}
        <div className="flex-1 min-w-0 flex items-end gap-x-8 max-w-[320px]">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-widest w-full px-0.5">
              <span className="text-[#121212]/20 flex items-center gap-1.5"><Layers size={10} /> Complexity</span>
              <span className="text-[#E66000] tabular-nums">{complexity}%</span>
            </div>
            <Knob
              value={complexity}
              min={0}
              max={100}
              onChange={(v) => setComplexity(Math.round(v))}
              size={28}
              accentColor="#E66000"
              variant="light"
            />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-widest w-full px-0.5">
              <span className="text-[#121212]/20 flex items-center gap-1.5"><Zap size={10} /> Velocity Variation</span>
              <span className="text-[#00D2FF] tabular-nums">{intensity}%</span>
            </div>
            <Knob
              value={intensity}
              min={0}
              max={100}
              onChange={(v) => setIntensity(Math.round(v))}
              size={28}
              accentColor="#00D2FF"
              variant="light"
            />
          </div>
        </div>
      </div>

      {/* Center: City (Detroit / Tbilisi / Berlin) — visually hidden; remove "hidden" to show again */}
      <div className="hidden flex items-center bg-[#121212]/03 p-1 rounded-[6px] relative w-[320px] shadow-inner border border-[#121212]/05">
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
