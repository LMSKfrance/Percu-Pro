# Sticky Footer Tools — Working Notes

<!--
PHASE 0 — INVENTORY (paths only, no code changes)

- Sticky footer component:
  src/app/components/MasterDockCollapsed.tsx  (DOCK_HEIGHT=64; fixed bottom-0 when not embedded)

- Expandable panel/rack:
  App.tsx: MasterSectionBody inside motion.div (height 0 | EXPANDED_TOOLS_HEIGHT 300); no dedicated BottomSheet.
  src/app/components/ui/sheet.tsx  (Radix Sheet, side bottom/left/right/top).

- Main layout / scroll container:
  src/app/App.tsx — root div min-h-screen flex flex-col; main flex-1 flex overflow-hidden; section sequencer has overflow-y-auto.
  Footer: fixed bottom-0 div containing expanded area + MasterDockCollapsed.

- Mixer component (channel strips):
  No dedicated mixer component. Per-lane mute in store (laneMuted); MasterSectionBody has static Fader + meter mock.
  SequencerRow has mute/solo (onMuteToggle). Fader: src/app/components/Fader.tsx.

- Audio bus graph / master bus:
  src/core/audio/AudioEngine.ts — masterGain, laneGains[TrackId], masterFxInput; ensureGraph() connects
  laneGains[id] -> masterFxInput -> saturator -> compressor -> hpf -> masterGain -> destination.

- Delay/reverb buses:
  No dedicated delay/reverb send buses. VerbosDsiFmPercVoice has internal fbDelay (createDelay). No global FX return.
-->

## Phase 0 — Done (inventory only)

## Phase 1 — Sticky footer + BottomSheet architecture

- FooterBar: ResizeObserver -> --footer-h on document or root.
- BottomSheet: position fixed; left/right 16px; bottom: calc(var(--footer-h) + 12px); max-height; overflow auto; overscroll-behavior contain.
- Backdrop: fixed inset 0; low opacity + blur; click closes; ESC closes.
- App shell: padding-bottom: calc(var(--footer-h) + 16px). --header-h: 80px for max-height calc.

## Phase 2 — Done: simplified footer bar (transport, BPM, Export, chevron)

## Phase 3 — Done: FooterToolsPanel 3-column grid (mixer | H3K | master)

## Phase 4 — Done: MiniMixer with lane faders, M/S, H3K send; lane gain in store + syncLaneGains

## Phase 5 — Done: AnalyserNode per channel + master, getMeterLevels(), useMeterLevels() 30fps

## Phase 6 — Done: h3kRack.ts (microPitch, dual delay, diffusion), per-channel send gains, sumGain in engine

## Phase 7 — Done: H3K sends/params wired; export path unchanged (sumGain → saturator → destination)

## Phase 8 — Done: Hit targets 28–32px, rounded-md + soft shadows, scroll position session memory
