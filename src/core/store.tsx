import React, { useReducer, useCallback, useContext, useMemo } from "react";
import type { AppState, TrackId, EngineId, GrooveCandidate, HiPercInstrumentState } from "./types";
import type { PatchOp, PatternState } from "./patternTypes";
import { createInitialPatternState, applyPatternPatch } from "./patternTypes";
import { buildFullRandomizeOps } from "./groove/fullRandomize";

const ENGINE_BY_TRACK: Record<TrackId, EngineId> = {
  noise: "Noise Engine",
  hiPerc: "Percussion Engine",
  lowPerc: "Percussion Engine",
  clap: "Noise Engine",
  chord: "Chord Engine",
  bass: "Bass Engine",
  subPerc: "Percussion Engine",
  kick: "Percussion Engine",
};

const initialBpm = 132;
const initialSeed = 42;

const defaultHiPercInstrument: HiPercInstrumentState = {
  modelId: "default",
  presetId: null,
  color: 0.4,
  decay: 0.4,
  drive: 0.2,
  ratio: 2,
  tone: 0.6,
  feedback: 0.08,
};

export const initialState: AppState = {
  ui: {
    activeTrackId: "kick",
    expandedTrackId: null,
    activeEngine: "Percussion Engine",
    cityProfile: "Berlin",
    laneMuted: {},
    hiPercInstrument: defaultHiPercInstrument,
  },
  transport: { bpm: initialBpm, isPlaying: false, isLooping: true },
  pattern: createInitialPatternState(initialBpm, initialSeed),
  groove: { top3: null, lastCritique: [], lastAppliedCount: 0 },
};

type Action =
  | { type: "setActiveTrack"; payload: TrackId }
  | { type: "toggleExpandedTrack"; payload: TrackId }
  | { type: "setActiveEngine"; payload: EngineId }
  | { type: "setActiveEngineFromActiveTrack" }
  | { type: "setCityProfile"; payload: string }
  | { type: "setLaneMuted"; payload: { laneId: TrackId; muted: boolean } }
  | { type: "togglePlay" }
  | { type: "stop" }
  | { type: "toggleLoop" }
  | { type: "setBpm"; payload: number }
  | { type: "applyPatternPatch"; payload: PatchOp[] }
  | { type: "setPattern"; payload: PatternState }
  | { type: "setStepVelocity"; payload: { laneId: TrackId; stepIndex: number; velocity: number } }
  | { type: "setStepOn"; payload: { laneId: TrackId; stepIndex: number; velocity?: number } }
  | { type: "clearStep"; payload: { laneId: TrackId; stepIndex: number } }
  | { type: "setStepAccent"; payload: { laneId: TrackId; stepIndex: number; accent: boolean } }
  | { type: "setStepPitch"; payload: { laneId: TrackId; stepIndex: number; pitch: number } }
  | { type: "setGrooveTop3"; payload: GrooveCandidate[] | null }
  | { type: "setGrooveLastCritique"; payload: { reason: string; message: string }[] }
  | { type: "setGrooveLastAppliedCount"; payload: number }
  | { type: "setHiPercModel"; payload: "default" | "VERBOS_DSI_FM_PERC" }
  | { type: "setHiPercPreset"; payload: string | null }
  | { type: "setHiPercMacro"; payload: { color?: number; decay?: number; drive?: number } }
  | { type: "setHiPercInstrumentFull"; payload: HiPercInstrumentState };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "setActiveTrack": {
      const trackId = action.payload;
      return { ...state, ui: { ...state.ui, activeTrackId: trackId, activeEngine: ENGINE_BY_TRACK[trackId] } };
    }
    case "toggleExpandedTrack": {
      const trackId = action.payload;
      return { ...state, ui: { ...state.ui, expandedTrackId: state.ui.expandedTrackId === trackId ? null : trackId } };
    }
    case "setActiveEngine":
      return { ...state, ui: { ...state.ui, activeEngine: action.payload } };
    case "setActiveEngineFromActiveTrack":
      return { ...state, ui: { ...state.ui, activeEngine: ENGINE_BY_TRACK[state.ui.activeTrackId] } };
    case "setCityProfile":
      return { ...state, ui: { ...state.ui, cityProfile: action.payload } };
    case "setLaneMuted": {
      const { laneId, muted } = action.payload;
      return {
        ...state,
        ui: {
          ...state.ui,
          laneMuted: { ...state.ui.laneMuted, [laneId]: muted },
        },
      };
    }
    case "togglePlay":
      return { ...state, transport: { ...state.transport, isPlaying: !state.transport.isPlaying } };
    case "stop":
      return { ...state, transport: { ...state.transport, isPlaying: false } };
    case "toggleLoop":
      return { ...state, transport: { ...state.transport, isLooping: !state.transport.isLooping } };
    case "setBpm":
      return { ...state, transport: { ...state.transport, bpm: action.payload } };
    case "applyPatternPatch": {
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, initialSeed);
      return { ...state, pattern: applyPatternPatch(pattern, action.payload) };
    }
    case "setPattern":
      return { ...state, pattern: action.payload };
    case "setStepVelocity": {
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, initialSeed);
      const ops: PatchOp[] = [{ op: "SET_VELOCITY", ...action.payload }];
      return { ...state, pattern: applyPatternPatch(pattern, ops) };
    }
    case "setStepOn": {
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, initialSeed);
      const { laneId, stepIndex, velocity = 0.75 } = action.payload;
      const ops: PatchOp[] = [{ op: "SET_STEP", laneId, stepIndex, on: true, velocity }];
      return { ...state, pattern: applyPatternPatch(pattern, ops) };
    }
    case "clearStep": {
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, initialSeed);
      const ops: PatchOp[] = [{ op: "CLEAR_STEP", ...action.payload }];
      return { ...state, pattern: applyPatternPatch(pattern, ops) };
    }
    case "setStepAccent": {
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, initialSeed);
      const { laneId, stepIndex, accent } = action.payload;
      const lane = pattern.lanes[laneId];
      if (!lane || stepIndex < 0 || stepIndex >= lane.steps.length) return state;
      const step = lane.steps[stepIndex];
      const ops: PatchOp[] = [{
        op: "SET_STEP",
        laneId,
        stepIndex,
        on: step.on,
        velocity: step.velocity,
        probability: step.probability,
        microShiftMs: step.microShiftMs,
        accent,
        pitch: step.pitch,
      }];
      return { ...state, pattern: applyPatternPatch(pattern, ops) };
    }
    case "setStepPitch": {
      const pattern = state.pattern ?? createInitialPatternState(state.transport.bpm, initialSeed);
      const ops: PatchOp[] = [{ op: "SET_PITCH", ...action.payload }];
      return { ...state, pattern: applyPatternPatch(pattern, ops) };
    }
    case "setGrooveTop3": {
      const groove = state.groove ?? { top3: null, lastCritique: [], lastAppliedCount: 0 };
      return { ...state, groove: { ...groove, top3: action.payload } };
    }
    case "setGrooveLastCritique": {
      const groove = state.groove ?? { top3: null, lastCritique: [], lastAppliedCount: 0 };
      return { ...state, groove: { ...groove, lastCritique: action.payload } };
    }
    case "setGrooveLastAppliedCount": {
      const groove = state.groove ?? { top3: null, lastCritique: [], lastAppliedCount: 0 };
      return { ...state, groove: { ...groove, lastAppliedCount: action.payload } };
    }
    case "setHiPercModel": {
      const prev = state.ui.hiPercInstrument ?? defaultHiPercInstrument;
      return {
        ...state,
        ui: {
          ...state.ui,
          hiPercInstrument: { ...prev, modelId: action.payload },
        },
      };
    }
    case "setHiPercPreset": {
      const prev = state.ui.hiPercInstrument ?? defaultHiPercInstrument;
      return {
        ...state,
        ui: {
          ...state.ui,
          hiPercInstrument: { ...prev, presetId: action.payload },
        },
      };
    }
    case "setHiPercMacro": {
      const prev = state.ui.hiPercInstrument ?? defaultHiPercInstrument;
      const { color, decay, drive } = action.payload;
      return {
        ...state,
        ui: {
          ...state.ui,
          hiPercInstrument: {
            ...prev,
            ...(color !== undefined && { color }),
            ...(decay !== undefined && { decay }),
            ...(drive !== undefined && { drive }),
          },
        },
      };
    }
    case "setHiPercInstrumentFull": {
      return {
        ...state,
        ui: { ...state.ui, hiPercInstrument: action.payload },
      };
    }
    default:
      return state;
  }
}

type StoreValue = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  actions: {
    setActiveTrack: (trackId: TrackId) => void;
    toggleExpandedTrack: (trackId: TrackId) => void;
    setActiveEngine: (engineId: EngineId) => void;
    setActiveEngineFromActiveTrack: () => void;
    setCityProfile: (cityProfile: string) => void;
    setLaneMuted: (laneId: TrackId, muted: boolean) => void;
    togglePlay: () => void;
    stop: () => void;
    toggleLoop: () => void;
    setBpm: (bpm: number) => void;
    applyPatternPatch: (ops: PatchOp[]) => void;
    setPattern: (pattern: PatternState) => void;
    setStepVelocity: (laneId: TrackId, stepIndex: number, velocity: number) => void;
    setStepOn: (laneId: TrackId, stepIndex: number, velocity?: number) => void;
    clearStep: (laneId: TrackId, stepIndex: number) => void;
    setStepAccent: (laneId: TrackId, stepIndex: number, accent: boolean) => void;
    setStepPitch: (laneId: TrackId, stepIndex: number, pitch: number) => void;
    fullRandomizePattern: (currentState: AppState, options?: { unsafe?: boolean }) => void;
    setGrooveTop3: (top3: GrooveCandidate[] | null) => void;
    setGrooveLastCritique: (critique: { reason: string; message: string }[]) => void;
    setGrooveLastAppliedCount: (count: number) => void;
    setHiPercModel: (modelId: "default" | "VERBOS_DSI_FM_PERC") => void;
    setHiPercPreset: (presetId: string | null) => void;
    setHiPercMacro: (payload: { color?: number; decay?: number; drive?: number }) => void;
    setHiPercInstrumentFull: (payload: HiPercInstrumentState) => void;
  };
};

const StoreContext = React.createContext<StoreValue | null>(null);

export function PercuProStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const actions: StoreValue["actions"] = {
    setActiveTrack: useCallback((trackId: TrackId) => dispatch({ type: "setActiveTrack", payload: trackId }), []),
    toggleExpandedTrack: useCallback((trackId: TrackId) => dispatch({ type: "toggleExpandedTrack", payload: trackId }), []),
    setActiveEngine: useCallback((engineId: EngineId) => dispatch({ type: "setActiveEngine", payload: engineId }), []),
    setActiveEngineFromActiveTrack: useCallback(() => dispatch({ type: "setActiveEngineFromActiveTrack" }), []),
    setCityProfile: useCallback((cityProfile: string) => dispatch({ type: "setCityProfile", payload: cityProfile }), []),
    setLaneMuted: useCallback((laneId: TrackId, muted: boolean) => dispatch({ type: "setLaneMuted", payload: { laneId, muted } }), []),
    togglePlay: useCallback(() => dispatch({ type: "togglePlay" }), []),
    stop: useCallback(() => dispatch({ type: "stop" }), []),
    toggleLoop: useCallback(() => dispatch({ type: "toggleLoop" }), []),
    setBpm: useCallback((bpm: number) => dispatch({ type: "setBpm", payload: bpm }), []),
    applyPatternPatch: useCallback((ops: PatchOp[]) => dispatch({ type: "applyPatternPatch", payload: ops }), []),
    setPattern: useCallback((pattern: PatternState) => dispatch({ type: "setPattern", payload: pattern }), []),
    setStepVelocity: useCallback((laneId: TrackId, stepIndex: number, velocity: number) => {
      dispatch({ type: "setStepVelocity", payload: { laneId, stepIndex, velocity } });
    }, []),
    setStepOn: useCallback((laneId: TrackId, stepIndex: number, velocity = 0.75) => {
      dispatch({ type: "setStepOn", payload: { laneId, stepIndex, velocity } });
    }, []),
    clearStep: useCallback((laneId: TrackId, stepIndex: number) => {
      dispatch({ type: "clearStep", payload: { laneId, stepIndex } });
    }, []),
    setStepAccent: useCallback((laneId: TrackId, stepIndex: number, accent: boolean) => {
      dispatch({ type: "setStepAccent", payload: { laneId, stepIndex, accent } });
    }, []),
    setStepPitch: useCallback((laneId: TrackId, stepIndex: number, pitch: number) => {
      dispatch({ type: "setStepPitch", payload: { laneId, stepIndex, pitch } });
    }, []),
    fullRandomizePattern: useCallback((currentState: AppState, options?: { unsafe?: boolean }) => {
      const pattern = currentState.pattern ?? createInitialPatternState(currentState.transport.bpm, initialSeed);
      const seed = pattern.seed ?? initialSeed;
      const ops = buildFullRandomizeOps(pattern, seed, options);
      dispatch({ type: "applyPatternPatch", payload: ops });
    }, []),
    setGrooveTop3: useCallback((top3: GrooveCandidate[] | null) => dispatch({ type: "setGrooveTop3", payload: top3 }), []),
    setGrooveLastCritique: useCallback((critique: { reason: string; message: string }[]) => dispatch({ type: "setGrooveLastCritique", payload: critique }), []),
    setGrooveLastAppliedCount: useCallback((count: number) => dispatch({ type: "setGrooveLastAppliedCount", payload: count }), []),
    setHiPercModel: useCallback((modelId: "default" | "VERBOS_DSI_FM_PERC") => dispatch({ type: "setHiPercModel", payload: modelId }), []),
    setHiPercPreset: useCallback((presetId: string | null) => dispatch({ type: "setHiPercPreset", payload: presetId }), []),
    setHiPercMacro: useCallback((payload: { color?: number; decay?: number; drive?: number }) => dispatch({ type: "setHiPercMacro", payload }), []),
    setHiPercInstrumentFull: useCallback((payload: HiPercInstrumentState) => dispatch({ type: "setHiPercInstrumentFull", payload }), []),
  };

  const value = useMemo<StoreValue>(() => ({ state, dispatch, actions }), [state, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePercuProV1Store(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error("usePercuProV1Store must be used within PercuProStoreProvider");
  return v;
}
