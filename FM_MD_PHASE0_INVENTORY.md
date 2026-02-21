# Phase 0 — FM MD Drum Inventory (no code)

## Lane configuration definitions (kick, snare, perc, etc)
- **TrackId type:** `src/core/types.ts` — `"noise" | "hiPerc" | "lowPerc" | "clap" | "chord" | "bass" | "subPerc" | "kick"`.
- **TRACK_IDS / lane list:** `src/core/audio/AudioEngine.ts` (line 20), `src/core/patternTypes.ts` (line 132), `src/core/groove/mapToStore.ts`, `src/core/groove/mutatePattern.ts`, `src/core/groove/exportPercuPayload.ts` — `["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"]`.
- **Lane state shape:** `src/core/patternTypes.ts` — `LaneState` (id, role, playStartOffsetSteps, laneSwingPct, steps), `PatternState.lanes: Record<TrackId, LaneState>`.

## Audio triggering logic (sequencer → voices)
- **triggerStep:** `src/core/audio/AudioEngine.ts` — function `triggerStep(laneId, stepIndex, timeSec, velocity, accent, pitchSemitones)` (lines 97–118). For hiPerc when Verbos voice exists it calls `hiPercVerbosVoice.trigger(timeSec, velocity)`; else uses `laneVoices[laneId](ctx, dest, ...)`.
- **Scheduler call:** `src/core/audio/scheduler.ts` line 116 — `triggerStep(laneId, stepIndex, t, step.velocity ?? 0.8, step.accent ?? false, step.pitch ?? 0)`.

## Per-lane UI (instrument dropdown + controls)
- **Router:** `src/app/components/InstrumentControlsPanel.tsx` — receives `selectedTrackId: TrackId | null`, renders header + one panel from `PANEL_BY_TRACK`.
- **Per-lane panels:** `src/app/components/instrument-panels/` — `NoisePanel.tsx`, `HiPercPanel.tsx`, `LowPercPanel.tsx`, `ClapPanel.tsx`, `ChordPanel.tsx`, `BassPanel.tsx`, `SubPercPanel.tsx`, `KickPanel.tsx`. HiPerc has model dropdown (Default / Verbos/DSI FM Perc), preset dropdown, and 3 macros (Color, Decay, Drive).
- **Constants:** `src/app/components/instrument-panels/constants.ts` — `INSTRUMENT_LABELS`.

## Per-lane channel GainNode / bus
- **Variable:** `laneGains: Record<TrackId, GainNode>` in `src/core/audio/AudioEngine.ts` (line 45).
- **Creation:** In `ensureGraph()` (lines 82–90) — for each `id` in `TRACK_IDS`, `laneGains[id] = ctx.createGain()`, `g.connect(masterFxInput!)`.
- **Usage:** Voices receive `laneGains[laneId]` as destination (e.g. Verbos voice for hiPerc connects to `laneGains.hiPerc`).
