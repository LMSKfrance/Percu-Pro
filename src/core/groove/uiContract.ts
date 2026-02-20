/**
 * Thin adapter layer for groove UI. Groove button and controls always call through here.
 * Implementation is wired in Phase 5 (store + engine). No React imports.
 */

export type GrooveScope = "all" | { channelIds: string[] };

export interface GrooveButtonContext {
  /** What the button used to do (e.g. reset pattern + clear groove state). Call this first. */
  runCurrentBehavior: () => void;
  /** Seed to use for this run (so each click gets a new pattern). If not set, bridge uses pattern/state seed. */
  getSeedForThisRun?: () => number;
  /** If groove bar / panel can be toggled, call to open it. No-op if bar is always visible. */
  openGroovePanel?: () => void;
  /** Whether groove UI is considered "open" (e.g. bar visible). Used to decide funkify vs open. */
  isGroovePanelOpen?: () => boolean;
}

export type GrooveBridge = {
  setSwing: (value: number) => void;
  setGrooveTemplate: (id: string) => void;
  regeneratePattern: (scope: GrooveScope, seedOverride?: number) => void;
  mutatePattern: (scope: GrooveScope, intensity: number) => void;
  applyGrooveTiming: () => void;
};

let grooveBridge: GrooveBridge | null = null;

export function setGrooveBridge(bridge: GrooveBridge | null): void {
  grooveBridge = bridge;
}

function isDebugGroove(): boolean {
  if (typeof import.meta === "undefined" || !import.meta.env) return false;
  return String(import.meta.env.VITE_DEBUG_GROOVE) === "1";
}

/**
 * Called when the user presses the Groove (Generate Groove) button.
 * Runs existing behavior first, then optional funkify/apply when bridge is set.
 */
export function onGrooveButtonPressed(ctx: GrooveButtonContext): void {
  const hadBridge = grooveBridge != null;
  ctx.runCurrentBehavior();

  if (grooveBridge) {
    const panelOpen = ctx.isGroovePanelOpen?.() ?? true;
    if (panelOpen) {
      const seedForRun = ctx.getSeedForThisRun?.();
      grooveBridge.regeneratePattern("all", seedForRun);
      grooveBridge.applyGrooveTiming();
    } else if (ctx.openGroovePanel) {
      ctx.openGroovePanel();
    }
  }

  if (isDebugGroove() && !hadBridge) {
    console.warn("[Percu Groove] Groove button pressed but groove bridge not set — no musical change from engine.");
  }
}

export function setSwing(value: number): void {
  grooveBridge?.setSwing(value);
  grooveBridge?.applyGrooveTiming();
}

export function setGrooveTemplate(id: string): void {
  grooveBridge?.setGrooveTemplate(id);
  grooveBridge?.applyGrooveTiming();
}

export function regeneratePattern(scope: GrooveScope, seedOverride?: number): void {
  grooveBridge?.regeneratePattern(scope, seedOverride);
  grooveBridge?.applyGrooveTiming();
}

export function mutatePattern(scope: GrooveScope, intensity: number): void {
  grooveBridge?.mutatePattern(scope, intensity);
  grooveBridge?.applyGrooveTiming();
}
