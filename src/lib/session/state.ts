import { normalizeCapabilities, sanitizeLabel, type CapabilityOrUnknown } from "../capabilities";
import { canAddStroke, type Stroke } from "../drawing/model";
import {
  isMissionId,
  nextMissionId,
  SCENE_COUNT,
  type Decision,
  type SceneIndex,
} from "../missions/engine";
import type { MissionId } from "../missions/types";

export type Phase = "intro" | "draw" | "describe" | "result" | "summary";

export interface SessionState {
  missionId: MissionId;
  scene: SceneIndex;
  phase: Phase;
  /** Every scene's strokes, each tagged with its scene. Backdrops are never stored. */
  strokes: Stroke[];
  /** One confirmed decision per finished scene (plus the current one in "result"). */
  decisions: Decision[];
  /** The child chose capabilities without drawing in the current scene. */
  skippedDrawing: boolean;
}

export type Action =
  | { type: "selectMission"; missionId: MissionId }
  | { type: "startDrawing" }
  | { type: "setStrokes"; strokes: Stroke[] }
  | { type: "finishDrawing" }
  | { type: "chooseWithoutDrawing" }
  | { type: "backToDrawing" }
  | { type: "confirm"; caps: CapabilityOrUnknown[]; label?: string | null }
  | { type: "nextScene" }
  | { type: "seeSummary" }
  | { type: "replay" }
  | { type: "nextMission" };

export function initialState(missionId: MissionId = "river"): SessionState {
  return { missionId, scene: 0, phase: "intro", strokes: [], decisions: [], skippedDrawing: false };
}

/** Decisions that came before the current scene. */
export function priorDecisions(state: SessionState): Decision[] {
  return state.decisions.slice(0, state.scene);
}

/** Pure, total transition function. Invalid actions return the same state. */
export function reduce(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "selectMission":
      if (state.phase !== "intro" || !isMissionId(action.missionId)) return state;
      return initialState(action.missionId);
    case "startDrawing":
      return state.phase === "intro" ? { ...state, phase: "draw" } : state;
    case "setStrokes": {
      if (state.phase !== "draw") return state;
      const earlier = state.strokes.filter((s) => s.s < state.scene);
      const next = action.strokes;
      const keptEarlier = next.filter((s) => s.s < state.scene);
      if (next.some((s) => s.s > state.scene)) return state;
      if (keptEarlier.length !== earlier.length || keptEarlier.some((s, i) => s !== earlier[i])) return state;
      return { ...state, strokes: next };
    }
    case "finishDrawing":
      return state.phase === "draw" ? { ...state, phase: "describe" } : state;
    case "chooseWithoutDrawing":
      return state.phase === "draw"
        ? { ...state, phase: "describe", skippedDrawing: !state.strokes.some((s) => s.s === state.scene) }
        : state;
    case "backToDrawing":
      return state.phase === "describe" ? { ...state, phase: "draw", skippedDrawing: false } : state;
    case "confirm": {
      if (state.phase !== "describe") return state;
      const caps = normalizeCapabilities(action.caps);
      if (!caps) return state;
      const decision: Decision = { caps, label: sanitizeLabel(action.label), skipped: state.skippedDrawing };
      return { ...state, phase: "result", decisions: [...priorDecisions(state), decision] };
    }
    case "nextScene":
      if (state.phase !== "result" || state.scene >= SCENE_COUNT - 1) return state;
      return { ...state, scene: (state.scene + 1) as SceneIndex, phase: "draw", skippedDrawing: false };
    case "seeSummary":
      return state.phase === "result" && state.scene === SCENE_COUNT - 1 ? { ...state, phase: "summary" } : state;
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
