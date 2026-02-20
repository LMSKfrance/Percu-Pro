import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Dices, Settings, ChevronDown, RefreshCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import { usePercuProV1Store } from "../../core/store";
import { createInitialPatternState, applyPatternPatch } from "../../core/patternTypes";
import { generate } from "../../core/algorithm/generator";

const SPRING = { type: "spring" as const, damping: 26, stiffness: 260 };

const SWING_OPTIONS = [
  { id: "straight", name: "Straight (0%)", tag: "", swingDefault: 50, velSensDefault: 0 },
  { id: "mpc16", name: "MPC 16 Swing (classic)", tag: "MPC", swingDefault: 55, velSensDefault: 40 },
  { id: "mpc57", name: "MPC 57", tag: "MPC", swingDefault: 57, velSensDefault: 40 },
  { id: "mpc59", name: "MPC 59", tag: "MPC", swingDefault: 59, velSensDefault: 40 },
  { id: "ableton_swing", name: "Ableton Groove 16 Swing", tag: "ABLETON", swingDefault: 55, velSensDefault: 50 },
  { id: "ableton_shuffle", name: "Ableton Groove 16 Shuffle", tag: "ABLETON", swingDefault: 58, velSensDefault: 50 },
  { id: "logic_a", name: "Logic 16 Swing A", tag: "LOGIC", swingDefault: 55, velSensDefault: 35 },
  { id: "logic_c", name: "Logic 16 Swing C", tag: "LOGIC", swingDefault: 58, velSensDefault: 35 },
  { id: "tr909", name: "TR-909 Shuffle", tag: "909", swingDefault: 56, velSensDefault: 45 },
  { id: "tr909_heavy", name: "TR-909 Shuffle Heavy", tag: "909", swingDefault: 62, velSensDefault: 55 },
] as const;

const DEFAULT_SEED = 42;
const MAX_SEED = 999999;

const PRESET_TO_INFLUENCE: Record<string, string[]> = {
  straight: [],
  mpc16: ["AfroFunk"],
  mpc57: ["AfroFunk"],
  mpc59: ["AfroFunk"],
  ableton_swing: ["AfroFunk"],
  ableton_shuffle: ["AfroFunk"],
  logic_a: ["AfroFunk"],
  logic_c: ["AfroFunk"],
  tr909: ["AfroDisco"],
  tr909_heavy: ["AfroDisco"],
};

export const GrooveGenerator: React.FC = () => {
  const { state, actions } = usePercuProV1Store();
  const [swingPreset, setSwingPreset] = useState<(typeof SWING_OPTIONS)[number]["id"]>("mpc16");
  const [swingPercent, setSwingPercent] = useState(55);
  const [velSens, setVelSens] = useState(40);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(() => state.pattern?.seed ?? DEFAULT_SEED);
  const [lastAppliedOps, setLastAppliedOps] = useState<number | null>(null);
  const [highlightApplied, setHighlightApplied] = useState(false);
  const [variationIndex, setVariationIndex] = useState(0);
  const variationCount = 1;
  const hasMultipleVariations = variationCount > 1;
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeOption = SWING_OPTIONS.find((o) => o.id === swingPreset) ?? SWING_OPTIONS[1];

  useEffect(() => {
    if (!highlightApplied) return;
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightApplied(false), 1800);
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, [highlightApplied]);

  const applyPreset = useCallback((option: (typeof SWING_OPTIONS)[number]) => {
    setSwingPreset(option.id);
    setSwingPercent(option.swingDefault);
    setVelSens(option.velSensDefault);
    setDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const el = triggerRef.current;
    if (!el) return;
    const i = SWING_OPTIONS.findIndex((o) => o.id === swingPreset);
    setFocusedIndex(i >= 0 ? i : 0);
  }, [dropdownOpen, swingPreset]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDropdownOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => (i + 1) % SWING_OPTIONS.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => (i - 1 + SWING_OPTIONS.length) % SWING_OPTIONS.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const opt = SWING_OPTIONS[focusedIndex];
        if (opt) applyPreset(opt);
        return;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dropdownOpen, focusedIndex, applyPreset]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setDropdownOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [dropdownOpen]);

  const runGenerate = useCallback(
    (seedToUse: number) => {
      const bpm = state.transport.bpm;
      const basePattern = createInitialPatternState(bpm, seedToUse);
      const cityProfile = state.ui.cityProfile || "Berlin";
      const influenceVector = PRESET_TO_INFLUENCE[swingPreset] ?? ["AfroFunk"];
      const result = generate({
        seed: seedToUse,
        density: 0.5,
        swingPct: swingPercent,
        tempoBpm: bpm,
        cityProfile,
        influenceVector,
        artistLenses: ["Huckaby", "Surgeon"],
        mode: "FUTURIST_FUNK",
        currentPattern: basePattern,
      });
      const opCount = result.patternPatch?.length ?? 0;
      const newPattern =
        opCount > 0
          ? applyPatternPatch(basePattern, result.patternPatch)
          : basePattern;
      actions.setPattern(newPattern);
      setLastAppliedOps(opCount);
      setHighlightApplied(true);
    },
    [state.transport.bpm, state.ui.cityProfile, swingPreset, swingPercent, actions]
  );

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

  const handlePrevVariation = () => {
    if (!hasMultipleVariations || isGenerating) return;
    setVariationIndex((i) => (i <= 0 ? variationCount - 1 : i - 1));
  };

  const handleNextVariation = () => {
    if (!hasMultipleVariations || isGenerating) return;
    setVariationIndex((i) => (i >= variationCount - 1 ? 0 : i + 1));
  };

  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  useEffect(() => {
    if (!dropdownOpen || !triggerRef.current) {
      setMenuStyle(null);
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 4,
      left: rect.left,
      minWidth: Math.max(rect.width, 220),
    });
  }, [dropdownOpen]);

  return (
    <div className="w-full h-[80px] px-12 bg-[#F2F2EB] border-b border-[#121212]/05 flex items-center justify-between gap-12 relative overflow-visible">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E66000]/02 to-transparent pointer-events-none" />

      {/* Swing dropdown + Swing % + Vel Sens (no container) */}
      <div className="flex-1 flex items-center gap-6 min-w-0 max-w-[720px]">
        {/* Swing dropdown (primary) */}
        <div className="flex flex-col flex-shrink-0">
          <span className="text-[8px] font-mono font-bold text-[#121212]/30 uppercase tracking-widest mb-1">
            Swing
          </span>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-label="Swing preset"
            className="flex items-center gap-2.5 px-4 py-2 bg-[#121212]/04 border border-[#121212]/06 rounded-[4px] hover:bg-[#121212]/07 transition-all min-w-[200px] justify-between text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[#E66000] shadow-[0_0_6px_rgba(230,96,0,0.35)] flex-shrink-0" />
              <span className="text-[12px] font-[Inter] font-bold text-[#121212]/90 truncate">
                {activeOption.name}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={cn(
                "text-[#121212]/25 flex-shrink-0 transition-transform",
                dropdownOpen && "rotate-180"
              )}
            />
          </button>
        </div>

        {/* Portal dropdown: fixed, high z-index, no clipping */}
        {dropdownOpen &&
          menuStyle &&
          createPortal(
            <div
              ref={menuRef}
              role="listbox"
              aria-label="Swing preset"
              className="fixed rounded-[6px] bg-[#181818] border border-[#121212]/20 shadow-xl py-1 z-[2000]"
              style={{
                top: menuStyle.top,
                left: menuStyle.left,
                minWidth: menuStyle.minWidth,
              }}
            >
              {SWING_OPTIONS.map((opt, i) => (
                <button
                  key={opt.id}
                  role="option"
                  aria-selected={swingPreset === opt.id}
                  onMouseEnter={() => setFocusedIndex(i)}
                  onClick={() => applyPreset(opt)}
                  className={cn(
                    "w-full flex flex-col items-start gap-0 px-4 py-2.5 text-left transition-colors",
                    focusedIndex === i && "bg-white/[0.06]",
                    swingPreset === opt.id
                      ? "bg-[#E66000]/12 text-[#E66000]"
                      : "text-white/70 hover:bg-white/[0.04] hover:text-white/90"
                  )}
                >
                  <span className="text-[12px] font-[Inter] font-bold">
                    {opt.name}
                  </span>
                  {opt.tag && (
                    <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">
                      {opt.tag}
                    </span>
                  )}
                </button>
              ))}
            </div>,
            document.body
          )}

        {/* One subtle vertical separator */}
        <div className="w-px h-8 bg-[#121212]/08 flex-shrink-0" />

        {/* Swing % (0–75%), micro hint "Amount" */}
        <div className="flex flex-col gap-1 flex-1 min-w-0 max-w-[180px]">
          <div className="flex justify-between items-baseline">
            <span className="text-[8px] font-mono font-bold text-[#121212]/30 uppercase tracking-wider">
              Swing %
            </span>
            <span
              className={cn(
                "text-[10px] font-mono font-bold tabular-nums",
                swingPercent > 50 ? "text-[#E66000]" : "text-[#121212]/50"
              )}
            >
              {swingPercent}%
            </span>
          </div>
          <span className="text-[7px] font-mono text-[#121212]/25 -mt-0.5">
            Amount
          </span>
          <div className="relative h-1.5 w-full bg-[#121212]/06 rounded-full overflow-hidden cursor-pointer">
            <motion.div
              className="absolute left-0 top-0 h-full bg-[#181818] rounded-full"
              animate={{ width: `${(swingPercent / 75) * 100}%` }}
              transition={SPRING}
            />
            <input
              type="range"
              min={0}
              max={75}
              value={swingPercent}
              onChange={(e) =>
                setSwingPercent(parseInt(e.target.value, 10))
              }
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Swing Velocity Sensitivity: 0–100%, cyan, "VEL SENS" */}
        <div className="flex flex-col gap-1 flex-1 min-w-0 max-w-[160px]">
          <div className="flex justify-between items-baseline">
            <span className="text-[8px] font-mono font-bold text-[#121212]/30 uppercase tracking-wider">
              Vel Sens
            </span>
            <span className="text-[10px] font-mono font-bold text-[#00D2FF] tabular-nums">
              {velSens}%
            </span>
          </div>
          <div className="relative h-1.5 w-full bg-[#121212]/06 rounded-full overflow-hidden cursor-pointer">
            <motion.div
              className="absolute left-0 top-0 h-full bg-[#00D2FF]/35 rounded-full"
              animate={{ width: `${velSens}%` }}
              transition={SPRING}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={velSens}
              onChange={(e) => setVelSens(parseInt(e.target.value, 10))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Right side unchanged: Variation, Generate Groove CTA, status, gear */}
      <div className="flex items-center gap-3 min-w-fit flex-shrink-0">
        <div className="h-10 w-px bg-[#121212]/08" />

        <div
          className="flex items-center rounded-full border border-[#121212]/08 bg-[#121212]/04"
          title="Browse top candidates"
        >
          <button
            type="button"
            onClick={handlePrevVariation}
            disabled={isGenerating || !hasMultipleVariations}
            aria-label="Previous variation"
            className={cn(
              "h-10 w-10 flex items-center justify-center text-[#121212]/50 transition-colors border-r border-[#121212]/08 rounded-l-full",
              hasMultipleVariations &&
                !isGenerating &&
                "hover:bg-[#121212]/08 hover:text-[#121212]/80",
              (!hasMultipleVariations || isGenerating) &&
                "opacity-50 cursor-default"
            )}
          >
            <span className="text-[13px] font-bold leading-none">&lt;</span>
          </button>
          <span className="px-3 text-[9px] font-mono text-[#121212]/45 min-w-[56px] text-center">
            Var {variationIndex + 1}/{variationCount}
          </span>
          <button
            type="button"
            onClick={handleNextVariation}
            disabled={isGenerating || !hasMultipleVariations}
            aria-label="Next variation"
            className={cn(
              "h-10 w-10 flex items-center justify-center text-[#121212]/50 transition-colors rounded-r-full",
              hasMultipleVariations &&
                !isGenerating &&
                "hover:bg-[#121212]/08 hover:text-[#121212]/80",
              (!hasMultipleVariations || isGenerating) &&
                "opacity-50 cursor-default"
            )}
          >
            <span className="text-[13px] font-bold leading-none">&gt;</span>
          </button>
        </div>

        <motion.button
          onClick={handleGenerate}
          disabled={isGenerating}
          whileTap={!isGenerating ? { scale: 0.97 } : undefined}
          transition={SPRING}
          className={cn(
            "h-12 px-7 rounded-full flex items-center gap-3 transition-all relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#E66000]/50 focus:ring-offset-2 focus:ring-offset-[#F2F2EB]",
            isGenerating
              ? "bg-[#181818] cursor-wait border border-[#121212]/10"
              : "bg-[#181818] border-2 border-[#E66000]/40 hover:border-[#E66000]/60 hover:bg-[#252525] shadow-md shadow-[#121212]/15"
          )}
        >
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 0.7,
                  ease: "linear",
                }}
              >
                <RefreshCcw size={18} className="text-[#E66000]" />
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={SPRING}
              >
                <Dices size={18} className="text-[#E66000]" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="text-[13px] font-[Inter] font-bold text-white uppercase tracking-widest">
            {isGenerating ? "Generating…" : "Generate Groove"}
          </span>
        </motion.button>

        <div className="flex flex-col items-start gap-0.5 min-w-[100px]">
          <AnimatePresence mode="wait">
            {lastAppliedOps !== null && (
              <motion.span
                key={lastAppliedOps}
                initial={{ opacity: 0, y: 2 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  color: highlightApplied
                    ? "rgba(230,96,0,0.95)"
                    : "rgba(18,18,18,0.5)",
                }}
                exit={{ opacity: 0 }}
                transition={SPRING}
                className="text-[9px] font-mono font-bold"
              >
                Applied: {lastAppliedOps} ops
              </motion.span>
            )}
          </AnimatePresence>
          <span className="text-[8px] font-mono text-[#121212]/35">
            Seed: Auto
          </span>
        </div>

        <button
          type="button"
          title="Generator options"
          className="h-10 w-10 rounded-full bg-[#121212]/04 border border-[#121212]/06 flex items-center justify-center hover:bg-[#121212]/08 transition-colors focus:outline-none focus:ring-1 focus:ring-[#121212]/20"
          aria-label="Generator options"
        >
          <Settings size={17} className="text-[#121212]/40" />
        </button>
      </div>
    </div>
  );
};
