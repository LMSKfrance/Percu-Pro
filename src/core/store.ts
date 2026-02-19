import { useReducer, useCallback } from "react";
import type { AppState, TrackId, EngineId, GrooveCandidate } from "./types";
import type { PatchOp } from "./patternTypes";
import { createInitialPatternState, applyPatternPatch } from "./patternTypes";
import { buildFullRandomizeOps } from "./groove/fullRandomize";
import { hashStringToSeed } from "./audio/rng";

/** Map track id -> engine for reducer (no UI dependency) */
const ENGINE_BY_TRACK: Record<TrackId, EngineId> = {
  kick: "Percussion Engine",
  snare: "Percussion Engine",
  hhc: "Percussion Engine",
  hho: "Percussion Engine",
  perc1: "Poly-Chord Engine",
  perc2: "Poly-Chord Engine",
  rim: "Acid Bass Line",
  clap: "Percussion Engine",
};

const initialBpm = 132;
const initialSeed = 42;

export const initialState: AppState = {
  ui: {
    activeTrackId: "kick",
    expandedTrackId: "kick",
    activeEngine: "Percussion Engine",
  },
  transport: {
    bpm: initialBpm,
    isPlaying: false,
    isLooping: true,
  },
  pattern: createInitialPatternState(initialBpm, initialSeed),
  groove: {
    top3: null,
    lastCritique: [],
    lastAppliedCount: 0,
  },
};

type Action =
  | { type: "setActiveTrack"; payload: TrackId }
  | { type: "toggleExpandedTrack"; payload: TrackId }
  | { type: "setActiveEngine"; payload: EngineId }
  | { type: "setActiveEngineFromActiveTrack" }
  | { type: "togglePlay" }
  | { type: "stop" }
  | { type: "toggleLoop" }
  | { type: "setBpm"; payload: number }
  | { type: "applyPatternPatch"; payload: PatchOp[] }
  | { type: "setStep"; payload: { laneId: TrackId; stepIndex: number; on: boolean } }
  | { type: "setStepVelocity"; payload: { laneId: TrackId; stepIndex: number; velocity: number } }
  | { type: "setGrooveTop3"; payload: GrooveCandidate[] | null }
  | { type: "setGrooveLastCritique"; payload: { reason: string; message: string }[] }
  | { type: "setGrooveLastAppliedCount"; payload: number }
  | { type: "setLastRandomize"; payload: { seedUsed: number; appliedCount: number } }
  | { type: "applyCandidate"; payload: string };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "setActiveTrack": {
      const trackId = action.payload;
      const activeEngine = ENGINE_BY_TRACK[trackId];
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTrackId: trackId,
          activeEngine,
        },
      };
    }
    case "toggleExpandedTrack": {
      const trackId = action.payload;
      const nextExpanded =
        state.ui.expandedTrackId === trackId ? null : trackId;
      return {
        ...state,
        ui: {
          ...state.ui,
          expandedTrackId: nextExpanded,
        },
      };
    }
    case "setActiveEngine":
      return {
        ...state,
        ui: {
          ...state.ui,
          activeEngine: action.payload,
        },
      };
    case "setActiveEngineFromActiveTrack":
      return {
        ...state,
        ui: {
          ...state.ui,
          activeEngine: ENGINE_BY_TRACK[state.ui.activeTrackId],
        },
      };
    case "togglePlay":
      return {
        ...state,
        transport: {
          ...state.transport,
          isPlaying: !state.transport.isPlaying,
        },
      };
    case "stop":
      return {
        ...state,
        transport: {
          ...state.transport,
          isPlaying: false,
        },
      };
    case "toggleLoop":
      return {
        ...state,
        transport: {
          ...state.transport,
          isLooping: !state.transport.isLooping,
        },
      };
    case "setBpm":
      return {
        ...state,
        transport: {
          ...state.transport,
          bpm: action.payload,
        },
      };
    case "applyPatternPatch": {
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, 42);
      return {
        ...state,
        pattern: applyPatternPatch(pattern, action.payload),
      };
    }
    case "setStep": {
      const { laneId, stepIndex, on } = action.payload;
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, 42);
      const lane = pattern.lanes[laneId];
      if (!lane || stepIndex < 0 || stepIndex >= lane.steps.length) return state;
      const steps = lane.steps.map((s, i) => (i === stepIndex ? { ...s, on } : s));
      return {
        ...state,
        pattern: {
          ...pattern,
          lanes: { ...pattern.lanes, [laneId]: { ...lane, steps } },
        },
      };
    }
    case "setStepVelocity": {
      const { laneId, stepIndex, velocity } = action.payload;
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, 42);
      const lane = pattern.lanes[laneId];
      if (!lane || stepIndex < 0 || stepIndex >= lane.steps.length) return state;
      const v = Math.max(0.15, Math.min(1, velocity));
      const steps = lane.steps.map((s, i) => (i === stepIndex ? { ...s, velocity: v } : s));
      return {
        ...state,
        pattern: {
          ...pattern,
          lanes: { ...pattern.lanes, [laneId]: { ...lane, steps } },
        },
      };
    }
    case "setGrooveTop3":
      return {
        ...state,
        groove: { ...(state.groove ?? { top3: null, lastCritique: [], lastAppliedCount: 0 }), top3: action.payload },
      };
    case "setGrooveLastCritique":
      return {
        ...state,
        groove: { ...(state.groove ?? { top3: null, lastCritique: [], lastAppliedCount: 0 }), lastCritique: action.payload },
      };
    case "setGrooveLastAppliedCount":
      return {
        ...state,
        groove: { ...(state.groove ?? { top3: null, lastCritique: [], lastAppliedCount: 0 }), lastAppliedCount: action.payload },
      };
    case "setLastRandomize": {
      const { seedUsed, appliedCount } = action.payload;
      return {
        ...state,
        groove: { ...(state.groove ?? { top3: null, lastCritique: [], lastAppliedCount: 0 }), lastRandomizeSeed: seedUsed, lastRandomizeApplied: appliedCount },
      };
    }
    case "applyCandidate": {
      const id = action.payload;
      const top3 = state.groove?.top3 ?? null;
      const candidate = top3?.find((c) => c.id === id);
      if (!candidate) return state;
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, 42);
      const nextPattern = applyPatternPatch(pattern, candidate.ops);
      const groove = state.groove ?? { top3: null, lastCritique: [], lastAppliedCount: 0 };
      return {
        ...state,
        pattern: nextPattern,
        groove: { ...groove, top3: null, lastAppliedCount: candidate.ops.length },
      };
    }
    default:
      return state;
  }
}

export function usePercuProV1Store() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions = {
    setActiveTrack: useCallback((trackId: TrackId) => {
      dispatch({ type: "setActiveTrack", payload: trackId });
    }, []),
    toggleExpandedTrack: useCallback((trackId: TrackId) => {
      dispatch({ type: "toggleExpandedTrack", payload: trackId });
    }, []),
    setActiveEngine: useCallback((engineId: EngineId) => {
      dispatch({ type: "setActiveEngine", payload: engineId });
    }, []),
    setActiveEngineFromActiveTrack: useCallback(() => {
      dispatch({ type: "setActiveEngineFromActiveTrack" });
    }, []),
    togglePlay: useCallback(() => {
      dispatch({ type: "togglePlay" });
    }, []),
    stop: useCallback(() => {
      dispatch({ type: "stop" });
    }, []),
    toggleLoop: useCallback(() => {
      dispatch({ type: "toggleLoop" });
    }, []),
    setBpm: useCallback((bpm: number) => {
      dispatch({ type: "setBpm", payload: bpm });
    }, []),
    applyPatternPatch: useCallback((ops: PatchOp[]) => {
      dispatch({ type: "applyPatternPatch", payload: ops });
    }, []),
    setStep: useCallback((laneId: TrackId, stepIndex: number, on: boolean) => {
      dispatch({ type: "setStep", payload: { laneId, stepIndex, on } });
    }, []),
    setStepVelocity: useCallback((laneId: TrackId, stepIndex: number, velocity: number) => {
      dispatch({ type: "setStepVelocity", payload: { laneId, stepIndex, velocity } });
    }, []),
    /** Turn step ON with defaults (patch op). Default velocity 0.75, probability 1, microShiftMs 0, accent false. */
    setStepOn: useCallback((laneId: TrackId, stepIndex: number, velocity = 0.75) => {
      dispatch({
        type: "applyPatternPatch",
        payload: [
          { op: "SET_STEP", laneId, stepIndex, on: true, velocity: Math.max(0.25, Math.min(1, velocity)), probability: 1, microShiftMs: 0, accent: false },
        ],
      });
    }, []),
    /** Turn step OFF (patch op). */
    clearStep: useCallback((laneId: TrackId, stepIndex: number) => {
      dispatch({
        type: "applyPatternPatch",
        payload: [{ op: "CLEAR_STEP", laneId, stepIndex }],
      });
    }, []),
    /** Set step accent (patch op). Step must exist; other fields preserved. */
    setStepAccent: useCallback((laneId: TrackId, stepIndex: number, accent: boolean) => {
      dispatch({
        type: "applyPatternPatch",
        payload: [{ op: "SET_STEP", laneId, stepIndex, on: true, accent }],
      });
    }, []),
    fullRandomizePattern: useCallback((currentState: AppState, options?: { unsafe?: boolean }) => {
      const pattern = currentState.pattern ?? createInitialPatternState(currentState.transport.bpm, 42);
      const baseSeed = pattern.seed ?? 1;
      const ops = buildFullRandomizeOps(pattern, baseSeed, options ?? {});
      if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
        const checksum = hashStringToSeed(JSON.stringify(ops));
        console.log("[fullRandomize] seedUsed:", baseSeed, "ops:", ops.length, "checksum:", checksum);
      }
      dispatch({ type: "applyPatternPatch", payload: ops });
      dispatch({ type: "setLastRandomize", payload: { seedUsed: baseSeed, appliedCount: ops.length } });
    }, []),
    setGrooveTop3: useCallback((payload: GrooveCandidate[] | null) => {
      dispatch({ type: "setGrooveTop3", payload });
    }, []),
    setGrooveLastCritique: useCallback((payload: { reason: string; message: string }[]) => {
      dispatch({ type: "setGrooveLastCritique", payload });
    }, []),
    setGrooveLastAppliedCount: useCallback((payload: number) => {
      dispatch({ type: "setGrooveLastAppliedCount", payload });
    }, []),
    applyCandidate: useCallback((id: string) => {
      dispatch({ type: "applyCandidate", payload: id });
    }, []),
  };

  return { state, dispatch, actions };
}
