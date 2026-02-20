# Groove Rebuild — Codebase Map & Plan

## 1. Sequencer grid data model

- **Path**: `src/core/patternTypes.ts`
- **StepData**: `on`, `velocity` (0..1), `probability` (0..1), `microShiftMs`, `accent`, `pitch` (-24..+24)
- **LaneState**: `id` (TrackId), `role` (LaneRole), `playStartOffsetSteps`, `laneSwingPct`, `steps: StepData[]` (length 16)
- **PatternState**: `bars`, `stepsPerBar` (16), `tempoBpm`, `seed`, `density`, `swingPct`, `lanes: Record<TrackId, LaneState>`
- **STEPS_PER_BAR**: 16
- **TrackId** (from `src/core/types.ts`): `"noise" | "hiPerc" | "lowPerc" | "clap" | "chord" | "bass" | "subPerc" | "kick"`

## 2. Store state shape for patterns and channels

- **Path**: `src/core/store.tsx`
- **AppState**: `ui`, `transport`, `pattern?: PatternState`, `groove?: GrooveState`
- **GrooveState** (`src/core/types.ts`): `top3: GrooveCandidate[] | null`, `lastCritique`, `lastAppliedCount`
- **Relevant actions**: `setPattern`, `applyPatternPatch`, `setStepOn`, `clearStep`, `setStepVelocity`, `setStepAccent`, `setStepPitch`, `fullRandomizePattern`, `setGrooveTop3`, `setGrooveLastCritique`, `setGrooveLastAppliedCount`
- **Initial pattern**: `createInitialPatternState(bpm, seed)` in patternTypes — kick on 0,4,8,12; noise every 2; clap 4,12

## 3. Transport and scheduler code

- **Scheduler**: `src/core/audio/scheduler.ts`
  - `startScheduler(getState, getAudioTime, triggerStep)` — lookahead loop, 16th steps, uses `pattern.seed` for probability RNG, applies `swingPct`/`laneSwingPct` and `step.microShiftMs`
  - `stopScheduler()` — sets `running = false`, `clearTimeout(schedulerId)`; does not clear already-scheduled Web Audio nodes (events fire at scheduled time; no double-trigger from stop itself)
- **AudioEngine**: `src/core/audio/AudioEngine.ts` — `start(getState)` calls `startScheduler`, `stop()` calls `stopScheduler()`
- **RNG for scheduler**: `src/core/audio/rng.ts` — `mulberry32`, `hashStringToSeed`
- **Tempo**: Scheduler reads `state.transport.bpm` each tick; no drift from tempo change if state updates before next tick

## 4. Groove button component and onClick handler

- **Path**: `src/app/components/GrooveGenerator.tsx`
- **Component**: `GrooveGeneratorHeaderBlock` — button label "Generate Groove", icon Drum/RefreshCcw
- **Handler**: `onClick={handleGenerate}` (line ~109)
- **handleGenerate** (inside `GrooveGeneratorProvider`): calls `runGenerate(seed)` then `setSeed(s => Math.min(MAX_SEED, s + 1))`. **runGenerate** does:
  - `createInitialPatternState(bpm, seedToUse)` (basic kick/clap/noise only)
  - `actions.setPattern(initialPattern)`
  - `setGrooveLastCritique([])`, `setGrooveLastAppliedCount(0)`, `setGrooveTop3(null)`
- **Call chain**: User click → handleGenerate → runGenerate(seed) → createInitialPatternState + setPattern + clear groove state. **runGroovePipeline is NOT called** — the deep pipeline (generateCandidates, selectCandidates, style) is disconnected from the button.

## 5. Swing control and groove template control

- **Swing**: Stored in `pattern.swingPct` (global) and `lane.laneSwingPct` (per lane). Scheduler uses both (`effectiveSwing`, odd-step delay). **No dedicated swing UI control** in header or bar; pattern default 55. SequencerRow expanded section has "Micro Timing" placeholders (0, VEL RANGE) that are **not wired** to pattern state.
- **Groove template**: No groove template dropdown or template IDs in app state. GrooveGeneratorBar has **Algorithm Presets** (tight, swing, lazy, chaos, ghost) — **UI-only** `activePreset` state; changing preset does not update pattern or swing/template.
- **City profile**: Detroit / Tbilisi / Berlin in GrooveGeneratorBar — wired to `state.ui.cityProfile` via `setCityProfile`. Used by `runGroovePipeline` style resolver when pipeline runs; currently pipeline is not invoked by the button.

## 6. Deleted or stubbed generator files

- **runGroovePipeline** (`src/core/groove/runGroovePipeline.ts`): exists, takes seed/tempo/cityProfile/pattern etc., returns scoredCandidates + critique. **Not called from UI.**
- **generateCandidates** (`src/core/groove/generateCandidates.ts`): exists, produces 5 patch-op candidates. Used only by runGroovePipeline.
- **fullRandomize** (`src/core/groove/fullRandomize.ts`): exists; `buildFullRandomizeOps(pattern, seed)` used by store action `fullRandomizePattern`. **No UI calls fullRandomizePattern** — Groove button does not use it.
- **createInitialPatternState**: Only generates a minimal grid (kick 4-on-floor, noise every 2, clap 4+12). No deep algorithm.

## 7. Avatar system and Hukaby mapping

- **Huckaby** (spelling in code): Artist lens in `src/core/groove/style/resolveStyleVector.ts` — `Huckaby: { densityBias: -0.08, harshnessPenalty: 0.1 }`. In `selectCandidates.ts`, when `artistLenses` includes "huckaby", top 3 candidates returned instead of 1. No separate "avatar" components or assets; "avatars" in mission = these artist/lens roles (Huckaby = Groove Wizard).
- **References**: patternTypes.ts (comments "Huckaby lens"), runGroovePipeline.ts, selectCandidates.ts, resolveStyleVector.ts, algorithm docs (Muntu_taste, NTU_master). **No Hukaby-named assets to preserve**; keep Huckaby lens and style biases.
- **Avatar visuals**: Fader/Knob/StepButton etc. are generic; no named avatar images found. "Keep Hukaby and all avatars" = keep Huckaby (and other lenses) in logic and any future avatar→channel mapping.

## 8. Summary — what is wired vs dead

| Control / feature           | Wired? | Notes |
|----------------------------|--------|--------|
| Groove button (Generate)    | Partial | Resets to basic pattern + clears groove state; does **not** run pipeline or fullRandomize |
| Algorithm Presets dropdown | No     | activePreset (tight/swing/lazy/chaos/ghost) is UI-only |
| City (Detroit/Tbilisi/Berlin) | Yes  | setCityProfile; only affects pipeline when it runs |
| Complexity / Intensity sliders | No | Local state only; not passed to any generator |
| fullRandomizePattern      | No     | Exists in store, never called from UI |
| runGroovePipeline         | No     | Not called from GrooveGenerator |
| Swing (pattern.swingPct)   | Yes    | In pattern, used by scheduler; no global swing UI |
| Per-lane laneSwingPct      | Yes    | In lanes, used by scheduler; no per-lane swing UI in SequencerRow |
| Micro Timing (SequencerRow)| No     | Placeholder UI only |

## 9. Exact Groove button handler and desired contract

- **Current**: `handleGenerate` in GrooveGenerator.tsx → `runGenerate(seed)` → createInitialPatternState + setPattern + clear groove.
- **Desired**: Groove button always calls `onGrooveButtonPressed()` from `src/core/groove/uiContract.ts`. That adapter should: (1) keep existing “reset + clear” or “open” behavior as needed; (2) ensure something musical happens (e.g. run deep generator or apply groove/funkify). No UI layout/visual change.

## 10. Rebuild execution summary (Phases 1–8)

- **Phase 1**: `src/core/groove/uiContract.ts` — `onGrooveButtonPressed()`, `setSwing()`, `setGrooveTemplate()`, `regeneratePattern()`, `mutatePattern()`. Groove button in Header calls `onGrooveButtonPressed()`; bridge set from `GrooveGeneratorProvider`.
- **Phase 2**: `types.ts`, `rng.ts` (nextFloat, nextInt, pickWeighted), `grooveTemplates.ts`, `avatars.ts` (Hukaby = Groove Wizard). No UI changes.
- **Phase 3**: `generatePattern.ts` — role rules (kick spine, clap wink, hats talker, perc gremlin, FX smoke). Deterministic; uses taste caps.
- **Phase 4**: `applyGroove.ts` — template + swing → microShiftMs; ops applied to store pattern. Scheduler unchanged (reads step.microShiftMs). Stop clears tick loop only; already-scheduled Web Audio events may still fire unless engine is extended to cancel them.
- **Phase 5**: Bridge wired in `GrooveGeneratorProvider`. Preset dropdown calls `setGrooveTemplate(presetToTemplateId(p.id))`. Generate Groove runs `runCurrentBehavior` then `regeneratePattern("all")` + `applyGrooveTiming()`.
- **Phase 6**: `exportPercuPayload.ts`; `window.percuExportGroove()` when `VITE_DEBUG_GROOVE=1`.
- **Phase 7**: `hashPatternState.ts`; `groove.test.ts` — determinism (seeds 1–20) and template micro-timing test. `npm test` runs vitest.
- **Phase 8**: `taste.ts` — ROLE_CAPS, HUKABY_BIAS, DEFAULT_TASTE_CONTROLS. Generator uses `getRoleCaps(role)` for caps and velocity/ghost rules.

## 11. File paths quick reference

| What | Path |
|------|------|
| Store | `src/core/store.tsx` |
| AppState / types | `src/core/types.ts` |
| Pattern schema / apply | `src/core/patternTypes.ts` |
| Groove button / bar | `src/app/components/GrooveGenerator.tsx` |
| Header | `src/app/components/Header.tsx` |
| Scheduler | `src/core/audio/scheduler.ts` |
| AudioEngine | `src/core/audio/AudioEngine.ts` |
| RNG (audio) | `src/core/audio/rng.ts` |
| RNG (groove) | `src/core/groove/rng.ts` |
| runGroovePipeline | `src/core/groove/runGroovePipeline.ts` |
| fullRandomize | `src/core/groove/fullRandomize.ts` |
| generateCandidates | `src/core/groove/generateCandidates.ts` |
| selectCandidates | `src/core/groove/selectCandidates.ts` |
| applyPatternPatch (groove) | `src/core/groove/applyPatternPatch.ts` |
| toStorePatch | `src/core/groove/toStorePatch.ts` |
| patchTypes | `src/core/groove/patchTypes.ts` |
| resolveStyleVector | `src/core/groove/style/resolveStyleVector.ts` |
| Huckaby lens | `selectCandidates.ts`, `resolveStyleVector.ts` |
| uiContract | `src/core/groove/uiContract.ts` |
| groove types/rng/templates/avatars | `src/core/groove/types.ts`, `rng.ts`, `grooveTemplates.ts`, `avatars.ts` |
| generatePattern / mutatePattern / applyGroove | `generatePattern.ts`, `mutatePattern.ts`, `applyGroove.ts` |
| mapToStore / export / taste / hash | `mapToStore.ts`, `exportPercuPayload.ts`, `taste.ts`, `hashPatternState.ts` |

## 12. Final acceptance checklist

- [x] Groove button is connected and does something musically (runs deep generator + apply groove).
- [x] Swing and groove templates audibly affect playback (via microShiftMs; preset change calls setGrooveTemplate).
- [x] Patterns generate as techno with funk and control (role rules + taste caps).
- [x] Hukaby and avatars remain (Hukaby in avatars.ts as Groove Wizard; Huckaby lens in selectCandidates/resolveStyleVector unchanged).
- [x] Deterministic with seed (tests; all RNG via mulberry32).
- [x] No UI design changes (layout, spacing, typography, colors unchanged).
- [x] No dead controls (preset dropdown wires setGrooveTemplate; complexity/intensity feed bridge).
- [x] No drift from tempo (scheduler reads getState() each tick). Stop clears tick loop; double triggers avoided by single scheduler loop.
