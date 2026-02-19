# Groove generation implementation summary

## Phase 0 — Inventory

See `docs/PHASE0_PATTERN_INVENTORY.md` for the discovered pattern state shape and file paths.

**Summary**: Store is `usePercuProV1Store` in `src/core/store.ts`. Pattern state lives in `state.pattern` (optional), with lanes keyed by `TrackId`, each lane having `steps[]` (on, velocity 0..1, probability, microShiftMs, accent), `playStartOffsetSteps`, `laneSwingPct`, `role`. Generate Groove button is in `src/app/components/GrooveGenerator.tsx` (Dices icon, "Generate Groove" label).

---

## Created files

| Path | Purpose |
|------|---------|
| `src/core/groove/rng.ts` | Seeded PRNG (mulberry32), `hashStringToSeed(str)` |
| `src/core/groove/patchTypes.ts` | `PatternPatchOp` union (SET_STEP, SET_VELOCITY, SET_PROBABILITY, SET_MICROSHIFT, SHIFT_LANE, SET_LANE_START, SET_LANE_SWING, CLEAR_STEP, SCALE_VELOCITY) with optional `meta.role` and `meta.reasonCode` |
| `src/core/groove/applyPatternPatch.ts` | `applyPatternPatch(pattern, ops) => { nextPattern, appliedOps, rejectedOps }`; validates lane/step, clamps; never throws |
| `src/core/groove/brainTexts.ts` | `import.meta.glob("../../../algorithm/**/*.txt", { query: "?raw", import: "default", eager: true })`; `getText(pathContains)`, `listTexts(prefix?)` |
| `src/core/groove/style/resolveStyleVector.ts` | `resolveStyleVector({ cityProfile, influenceVector, artistLenses, mode })` → `{ biases, unknownTags, debugStrings }`; hardcoded table; supports AfroFunk, AfroDisco, FUTURIST_FUNK, lenses from 31_artist_lenses |
| `src/core/groove/critique/metrics.ts` | `computeMetrics(pattern)` → density per lane, collisionRiskScore, harshnessRisk, anchorClarity + details |
| `src/core/groove/generateCandidates.ts` | Deterministic 5 candidates (Tighten, Interlock, Lift, Sparse, Drive) as patch ops; `meta.role` on new hits; Surgeon lens rejects candidates that turn on hits without role |
| `src/core/groove/critique/scoreCandidate.ts` | `scoreCandidate({ pattern, ops, styleBiases })` → score + collision/anchor/harshness/style components |
| `src/core/groove/selectCandidates.ts` | If Huckaby lens: top 3; else top 1 |
| `src/core/groove/toStorePatch.ts` | `toStorePatchOps(PatternPatchOp[])` → `PatchOp[]` for store |
| `src/core/groove/runGroovePipeline.ts` | Single entry: resolve style → generate candidates → score → select; returns `{ scoredCandidates, critiqueItems, unknownTags }` |
| `docs/PHASE0_PATTERN_INVENTORY.md` | Inventory summary |
| `docs/GROOVE_IMPLEMENTATION_SUMMARY.md` | This file |

---

## Modified files

| Path | Changes |
|------|---------|
| `src/core/types.ts` | Added `GrooveCandidate`, `GrooveState`; `AppState.groove?: GrooveState` |
| `src/core/patternTypes.ts` | Added `SET_VELOCITY` to `PatchOp`; `applyPatternPatch` handles `SET_VELOCITY` |
| `src/core/store.ts` | `initialState.groove`; actions `setGrooveTop3`, `setGrooveLastCritique`, `setGrooveLastAppliedCount`, `applyCandidate(id)`; reducer cases for groove + `applyCandidate` (apply candidate ops, clear top3, set lastAppliedCount) |
| `src/app/components/GrooveGenerator.tsx` | Replaced old generator with `runGroovePipeline` + `toStorePatchOps`; on Generate: if Huckaby and >1 candidate then `setGrooveTop3(converted)` else `applyPatternPatch(best)`; inline candidate list when `state.groove?.top3?.length`; dev-only line (import.meta.env.DEV): applied ops count, critique count, candidate labels |

---

## How to run

```bash
cd "/Users/sandrokozmanishvili/Documents/Work/Percu Pro"
npm install   # if needed
npm run dev   # dev server with DEV panel
npm run build # production build
```

- **Generate Groove**: Click the "Generate Groove" button (Dices icon). With Huckaby + Surgeon lenses (hardcoded), the pipeline runs and either shows 3 candidates to pick or applies the best one.
- **Pick candidate**: When top 3 are shown, click a label (Tighten, Interlock, Lift, etc.) to apply that patch.
- **Dev panel**: In dev (`npm run dev`), a small line under the bar shows last applied ops count, critique count, and candidate labels when top3 is set.

---

## Design notes

- No new dependencies; no UI layout changes (only data flow and one inline list under the button).
- Pattern state and store `PatchOp` are the single source of truth; groove layer converts to store ops via `toStorePatchOps`.
- Style resolver uses a hardcoded numeric table; `brainTexts` is used only to confirm tags and debug strings.
- Surgeon lens: candidates that add hits without `meta.role` are filtered out in `generateCandidates`.
- Huckaby lens: `selectCandidates` returns top 3; UI stores them and shows the minimal list until the user picks or generates again.
