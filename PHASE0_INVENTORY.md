# Phase 0 — Inventory (Verbos/DSI FM Perc)

## 1) Lane definitions
- **Location:** `src/core/audio/AudioEngine.ts` (line 18), `src/core/patternTypes.ts` (line 132), `src/core/groove/mapToStore.ts`, `src/core/groove/mutatePattern.ts`, etc.
- **TrackId type:** `src/core/types.ts` — `"noise" | "hiPerc" | "lowPerc" | "clap" | "chord" | "bass" | "subPerc" | "kick"`.
- **Order:** `TRACK_IDS = ["noise", "hiPerc", "lowPerc", "clap", "chord", "bass", "subPerc", "kick"]`.
- **PERC1 equivalent:** `hiPerc` (Hi Perc) — first mid/hi percussion lane.

## 2) Audio triggering
- **Location:** `src/core/audio/AudioEngine.ts`: `triggerStep` (lines 93–108).
- **Signature:** `triggerStep(laneId, stepIndex, timeSec, velocity, accent, pitchSemitones)`.
- **Scheduler:** `src/core/audio/scheduler.ts` line 116: `triggerStep(laneId, stepIndex, t, step.velocity ?? 0.8, step.accent ?? false, step.pitch ?? 0)`.
- **Voice map:** `laneVoices[laneId]` is a `VoiceTrigger` function: `(ctx, dest, timeSec, velocity01, accentBool, params?) => void`.

## 3) Instrument UI for a lane
- **Location:** `src/app/components/InstrumentControlsPanel.tsx`.
- **Props:** `selectedTrackId: TrackId | null`. When a lane is selected, the panel shows that lane’s controls.
- **Current behavior:** No model dropdown. Per-track blocks with static `Knob` components (e.g. hiPerc/lowPerc: Tune, Decay, Punch, Color, Shape, Noise with fixed `value`; no `onChange` wired to state).
- **Knob component:** `src/app/components/Knob.tsx` — `value`, `min`, `max`, `onChange`, `size` (default 48; panel uses 44).

## 4) Per-lane channel bus (GainNode)
- **Location:** `src/core/audio/AudioEngine.ts`.
- **Variable:** `laneGains: Record<TrackId, GainNode>` (line 42).
- **Creation:** In `ensureGraph()` (lines 82–86): for each `id` in `TRACK_IDS`, `laneGains[id] = ctx.createGain()`, then `g.connect(masterFxInput!)`.
- **Usage:** In `triggerStep`, `dest = laneGains[laneId]`; voices receive this as their destination. So connecting the Verbos voice = `voice.connect(laneGains["hiPerc"])` (or pass `laneGains[laneId]` as destination when creating the voice).

## 5) Master fader (for later)
- **Component:** `src/app/components/Fader.tsx` — `Fader` with `height`, `label`, `value`.
- **Usage:** `src/app/App.tsx` in `MasterSectionBody`: `<Fader height={180} label="Gain" value={75} />`.
- **Dock:** `MasterDockCollapsed` in `App.tsx` (expand/collapse master section).
