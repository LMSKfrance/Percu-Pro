"use client";

import { useState, useEffect, useRef } from "react";
import * as audioEngine from "../../core/audio/AudioEngine";
import type { TrackId } from "../../core/types";

const FPS = 30;
const INTERVAL_MS = 1000 / FPS;

/**
 * Lightweight meters: throttled to 30fps, reads RMS/peak from engine analysers.
 * Returns per-channel and master levels (0..1 range, not dB).
 */
export function useMeterLevels(): {
  channels: Partial<Record<TrackId, { rms: number; peak: number }>>;
  master: { rms: number; peak: number };
} {
  const [levels, setLevels] = useState<{
    channels: Partial<Record<TrackId, { rms: number; peak: number }>>;
    master: { rms: number; peak: number };
  }>({ channels: {}, master: { rms: 0, peak: 0 } });
  const rafRef = useRef<number>(0);
  const lastTick = useRef(0);

  useEffect(() => {
    let running = true;
    const tick = (now: number) => {
      if (!running) return;
      if (now - lastTick.current >= INTERVAL_MS) {
        lastTick.current = now;
        try {
          const next = audioEngine.getMeterLevels();
          setLevels({ channels: next.channels, master: next.master });
        } catch {
          // engine not ready
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return levels;
}
