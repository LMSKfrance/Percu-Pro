# Phase 0 — Pattern state inventory

## Store
- **Path**: `src/core/store.ts`
- **Hook**: `usePercuProV1Store()` → `{ state, dispatch, actions }`
- **Relevant state**: `state.pattern` (optional), `state.transport.bpm`, `state.ui` (activeTrackId, expandedTrackId, activeEngine)
- **Relevant actions**: `applyPatternPatch(ops)`, `setStep(laneId, stepIndex, on)`, `setStepVelocity(laneId, stepIndex, velocity)`

## Types
- **Paths**: `src/core/types.ts`, `src/core/patternTypes.ts`
- **TrackId**: `"kick" | "snare" | "hhc" | "hho" | "perc1" | "perc2" | "rim" | "clap"`
- **AppState**: `{ ui: UiState, transport: TransportState, pattern?: PatternState }`

## Pattern state shape (discovered)
- **PatternState** (`src/core/patternTypes.ts`):
  - `bars: number`
  - `stepsPerBar: number` (16)
  - `tempoBpm: number`
  - `seed: number`
  - `density: number`
  - `swingPct: number`
  - `lanes: Record<TrackId, LaneState>`

- **LaneState**:
  - `id: TrackId`
  - `role: LaneRole` ("ANCHOR"|"PULSE"|"OFFBEAT"|"TEXTURE"|"ACCENT"|"FILL")
  - `playStartOffsetSteps: number` (0..15)
  - `laneSwingPct: number`
  - `steps: StepData[]` (length 16)

- **StepData**:
  - `on: boolean`
  - `velocity: number` (0..1)
  - `probability: number` (0..1)
  - `microShiftMs: number`
  - `accent: boolean`

## Generate Groove UI
- **Path**: `src/app/components/GrooveGenerator.tsx`
- **Button**: Right section, label "Generate Groove", Dices icon, `onClick={handleGenerate}`
- **Current behavior**: `handleGenerate` uses `generate()` from `src/core/algorithm/generator.ts` and `actions.applyPatternPatch(patch)`

## SequencerRow
- **Path**: `src/app/components/SequencerRow.tsx`
- **Controlled props** (when from store): `steps?: boolean[]`, `velocities?: number[]` (0–100), `onToggleStep`, `onVelocityChange`
- **Data source**: App passes `state.pattern?.lanes[track.id]` → steps (step.on), velocities (step.velocity * 100)

## Exact file paths
| What | Path |
|------|------|
| Store | `src/core/store.ts` |
| Types | `src/core/types.ts` |
| Pattern types & create/apply | `src/core/patternTypes.ts` |
| Sequencer row | `src/app/components/SequencerRow.tsx` |
| Generate Groove button | `src/app/components/GrooveGenerator.tsx` |
| App | `src/app/App.tsx` |
