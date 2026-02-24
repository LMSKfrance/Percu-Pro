# Step 1: Transport and Audio Engine Summary

## Where BPM and scheduling live

- **State**: `src/core/types.ts` — `TransportState`: `{ bpm, isPlaying, isLooping }`. App state in `src/core/store.tsx`: `state.transport.bpm`, actions `setBpm`, `togglePlay`, `stop`, `toggleLoop`.
- **Scheduler**: `src/core/audio/scheduler.ts` — `startScheduler(getState, getAudioTime, triggerStep, onStepTrigger?, onTick?)`. Uses `state.transport?.bpm` and `state.transport?.isPlaying` each tick. Step duration = `60 / bpm / 4` (16th notes). Lookahead ~25ms, schedules ~120ms ahead. Applies `swingPct`/`laneSwingPct` and per-step `microShiftMs` when triggering.
- **Audio time**: `getAudioTime` is `() => ctx.currentTime` (Web Audio `AudioContext.currentTime`). Passed from `AudioEngine.start()` into `startScheduler`. So all scheduling is driven by `ctx.currentTime`; warp/import playback must use the same context and schedule at `ctx.currentTime` (e.g. start at next bar).
- **AudioEngine**: `src/core/audio/AudioEngine.ts` — `userGestureInit()` creates/resumes `AudioContext`. `start(getState, onStepTrigger)` builds the graph, syncs gains, then calls `startScheduler(getState, () => ctx!.currentTime, buildTriggerStep(getState), ...)`. `stop()` calls `stopScheduler()` and silences voices. BPM is read from `getState()` each tick (no cached BPM in engine).

## Pattern / step model (for Apply Groove)

- **Types**: `src/core/patternTypes.ts` — `StepData`: `on`, `velocity` (0..1), `probability`, `microShiftMs`, `accent`, `pitch`. `LaneState`: `steps[]`, `laneSwingPct`, `playStartOffsetSteps`. Patch ops include `SET_MICROSHIFT`, `SET_STEP` (velocity/accent), `SCALE_VELOCITY`, `SET_LANE_SWING`.
- **Apply groove**: Will need to apply per-step timing offsets → `microShiftMs` and optionally accent/velocity from extracted groove; use `applyPatternPatch` with `SET_MICROSHIFT` / `SET_STEP` / `SCALE_VELOCITY`.

## UI placement (red-marked area)

- Pattern Sequencer is in `App.tsx`: the `<section>` with "Pattern Sequencer" header and `SEQUENCER_TRACKS.map` → `SequencerRow`. Import Audio panel will be added in this section (e.g. above or as a collapsible block above the track rows), consistent with the existing design.
