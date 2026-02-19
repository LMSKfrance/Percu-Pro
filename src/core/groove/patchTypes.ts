/**
 * Pattern patch op union matching the discovered pattern model.
 * Optional meta: role (for Surgeon lens), reasonCode for critique.
 */

import type { TrackId } from "../types";

export type LaneRole =
  | "ANCHOR"
  | "PULSE"
  | "OFFBEAT"
  | "TEXTURE"
  | "ACCENT"
  | "FILL";

export interface PatchOpMeta {
  role?: LaneRole;
  reasonCode?: string;
}

export type PatternPatchOp =
  | { op: "SET_STEP"; laneId: TrackId; stepIndex: number; on: boolean; velocity?: number; probability?: number; microShiftMs?: number; accent?: boolean; meta?: PatchOpMeta }
  | { op: "SET_VELOCITY"; laneId: TrackId; stepIndex: number; velocity: number; meta?: PatchOpMeta }
  | { op: "SET_PROBABILITY"; laneId: TrackId; stepIndex: number; probability: number; meta?: PatchOpMeta }
  | { op: "SET_MICROSHIFT"; laneId: TrackId; stepIndex: number; microShiftMs: number; meta?: PatchOpMeta }
  | { op: "SHIFT_LANE"; laneId: TrackId; deltaSteps: number; meta?: PatchOpMeta }
  | { op: "SET_LANE_START"; laneId: TrackId; playStartOffsetSteps: number; meta?: PatchOpMeta }
  | { op: "SET_LANE_SWING"; laneId: TrackId; laneSwingPct: number; meta?: PatchOpMeta }
  | { op: "CLEAR_STEP"; laneId: TrackId; stepIndex: number; meta?: PatchOpMeta }
  | { op: "SCALE_VELOCITY"; laneId: TrackId; stepIndex?: number; scale: number; meta?: PatchOpMeta };

export interface ApplyPatternPatchResult {
  nextPattern: import("../patternTypes").PatternState;
  appliedOps: PatternPatchOp[];
  rejectedOps: PatternPatchOp[];
}
