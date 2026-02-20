# Percu Pro — UI Spec (Single Screen)

## 1. Groove Generator (top bar)

- **Position & width**: Unchanged; full-width top bar below header.
- **Hierarchy**: Primary action is **Generate Groove**, visually and logically tied to preset + parameters.
- **Groove Settings cluster**:
  - One grouped block: preset dropdown + parameters.
  - Subtle container background and thin dividers between preset, sliders, and preview.
- **Parameter labels**:
  - **Complexity** → sublabel **"Density"** (implies step density).
  - **Velocity Variation** → sublabel **"Dynamics"** (implies velocity dynamics).
  - Inline value chips next to percent: e.g. **LOW** / **MED** / **HIGH** for quick meaning.
- **Mini histogram**:
  - Small label: **"Preview"**.
  - Tooltip: *"Expected density over 16 steps"*.
- **Generate Groove + arrows**:
  - Arrows = **Variations** (prev/next variation).
  - Micro-label or segmented style: **"Var 1/3"** with arrows.
  - When no variation: arrows disabled, reduced opacity.
- **Naming**:
  - Sequencer header: **"Shuffle"** → **"Randomize"** (random pattern, unsafe).
  - **Generate Groove** = intelligent generator (curated from preset + parameters).
  - Tooltips:
    - Generate Groove: *"Creates a curated pattern based on preset and parameters"*.
    - Randomize: *"Random pattern (unsafe)"*.
- **Options**: Gear icon labeled **"Options"**; opens a small dropdown/popover menu (no new screen).

---

## 2. Pattern sequencer

- **Step indices**: At top of grid: **1, 5, 9, 13** emphasized; **2–4, 6–8, 10–12, 14–16** faint. Minimal.
- **Step contrast**:
  - Inactive steps: slightly lighter.
  - Active steps: clearer fill and border (no extra decoration).
- **Beat grouping**: Every 4 steps, faint vertical separator across the grid.
- **Playback**: Current step = visible, subtle indicator (thin vertical line or soft glow on step).
- **Lane header**:
  - Consolidate: PATCH label, chevron, nudge arrows.
  - Nudge = **"Start"** with current offset, e.g. **"Start: 0"**.
- **Expanded lane panel**:
  - **Micro-timing — Swing**: Small **"ms"** indicator; tiny per-step offset ticks.
  - **Velocity Range**: Show min/max as two values (e.g. *min — max*).
  - **Step probabilities**: Label **"Probability per step"**; small **"Randomize probabilities"** button only in expanded panel.
- **Expansion**: Row hover shows **"Expand"**; chevron rotates. Active lane keeps subtle left accent bar; reduce background tint.

---

## 3. Right engine rack

- **Focus**: Dark rack look; less competition for attention.
- **Inactive engines**: Lower contrast (muted labels, no accent).
- **Active engine**: Single orange accent; slightly brighter labels.
- **Linking**: When a sequencer track is selected, only its engine is expanded; others show title row only.
- **Header**: Small line **"Linked to: [Track name]"** (e.g. *Linked to: Kick Drum*) in rack header.

---

## 4. Bottom transport dock

- **Layout**: Sticky, compact, non-intrusive.
- **Sections**: Clear separation between **Transport** and **Export**.
- **BPM**: Editable (stepper or drag). Tooltip on hover: **"Tap"** (for tap tempo).
- **Visual weight**: Dock does not compete with Groove Generator: reduced glow, restrained highlights.

---

## 5. Motion & interaction (Apple-style)

- **Spring animations** for:
  - Sequencer row expand/collapse
  - Engine accordion expand/collapse
  - Groove generation loading state
  - Button press and hover
- **Micro-interactions**:
  - Disabled arrows clearly disabled (opacity/cursor).
  - Tooltips on ambiguous controls.
  - Focus styles for keyboard navigation.
- **Style**: Crisp type and spacing; no decorative clutter.

---

## UI states (short list)

| State              | Description |
|--------------------|-------------|
| **Default**        | No generation in progress; no variation loaded; one track/engine selected; transport stopped. |
| **Generating**    | Generate Groove in progress; loading indicator; primary button in loading state. |
| **Variation available** | At least one variation exists; Var 1/3 (or n) shown; prev/next arrows enabled. |
| **Row expanded**  | One sequencer row expanded; micro-timing, velocity range, probability per step visible. |
| **Engine expanded** | One engine accordion expanded in rack; "Linked to: [Track]" shown. |
| **Playback running** | Transport playing; current-step indicator moving; BPM/loop state active. |
