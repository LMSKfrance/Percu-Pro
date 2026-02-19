import { useReducer, useCallback } from "react";
import type { AppState, TrackId, EngineId } from "./types";

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

export const initialState: AppState = {
  ui: {
    activeTrackId: "kick",
    expandedTrackId: "kick",
    activeEngine: "Percussion Engine",
  },
  transport: {
    bpm: 132,
    isPlaying: false,
    isLooping: true,
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
  | { type: "setBpm"; payload: number };

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
  };

  return { state, dispatch, actions };
}
