import { candidatesFor, isCandidate, isMissionId, nextMissionId, type Round } from "../missions/engine";
import type { MissionId } from "../missions/types";
import { canAddStroke, type Stroke } from "../drawing/model";

export type Phase = "intro" | "draw" | "confirm" | "consequence" | "summary";

export interface SessionState {
  missionId: MissionId;
  round: Round;
  phase: Phase;
  strokes: Stroke[];
  /** Confirmed idea (round 1). Only ever set from the mission's own ideas. */
  ideaId?: string;
  /** Confirmed refinement (round 2). */
  refinementId?: string;
  /** True when the child chose an idea without drawing. */
  skippedDrawing: boolean;
}

export type Action =
  | { type: "selectMission"; missionId: MissionId }
  | { type: "startDrawing" }
  | { type: "setStrokes"; strokes: Stroke[] }
  | { type: "finishDrawing" }
  | { type: "chooseWithoutDrawing" }
  | { type: "backToDrawing" }
  | { type: "confirm"; candidateId: string }
  | { type: "revise" }
  | { type: "seeSummary" }
  | { type: "replay" }
  | { type: "nextMission" };

export function initialState(missionId: MissionId = "river"): SessionState {
  return { missionId, round: 1, phase: "intro", strokes: [], skippedDrawing: false };
}

export function currentCandidates(state: SessionState) {
  return candidatesFor(state.missionId, state.round, state.ideaId);
}

/** Pure, total transition function. Invalid actions return the same state. */
export function reduce(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "selectMission":
      if (state.phase !== "intro" || !isMissionId(action.missionId)) return state;
      return initialState(action.missionId);
    case "startDrawing":
      return state.phase === "intro" ? { ...state, phase: "draw" } : state;
    case "setStrokes":
      if (state.phase !== "draw") return state;
      return { ...state, strokes: action.strokes };
    case "finishDrawing":
      return state.phase === "draw" ? { ...state, phase: "confirm" } : state;
    case "chooseWithoutDrawing":
      return state.phase === "draw"
        ? { ...state, phase: "confirm", skippedDrawing: !state.strokes.some((s) => s.r === state.round) }
        : state;
    case "backToDrawing":
      return state.phase === "confirm" ? { ...state, phase: "draw", skippedDrawing: false } : state;
    case "confirm": {
      if (state.phase !== "confirm") return state;
      if (!isCandidate(state.missionId, state.round, state.ideaId, action.candidateId)) return state;
      return state.round === 1
        ? { ...state, phase: "consequence", ideaId: action.candidateId }
        : { ...state, phase: "consequence", refinementId: action.candidateId };
    }
    case "revise":
      if (state.phase !== "consequence" || state.round !== 1 || !state.ideaId) return state;
      return { ...state, round: 2, phase: "draw", skippedDrawing: false };
    case "seeSummary":
      if (state.phase !== "consequence" || state.round !== 2 || !state.refinementId) return state;
      return { ...state, phase: "summary" };
    case "replay":
      return state.phase === "summary" ? initialState(state.missionId) : state;
    case "nextMission":
      return state.phase === "summary" ? initialState(nextMissionId(state.missionId)) : state;
    default:
      return state;
  }
}

/** Gate used by the canvas so limits are enforced in one place. */
export function mayAddStroke(state: SessionState): boolean {
  return state.phase === "draw" && canAddStroke(state.strokes);
}
