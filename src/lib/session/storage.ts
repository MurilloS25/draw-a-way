import { z } from "zod";
import { LIMITS, StrokesSchema } from "../drawing/model";
import { isCandidate, isMissionId } from "../missions/engine";
import type { SessionState } from "./state";
import { initialState } from "./state";

/** Every localStorage key this app uses. Documented in docs/PRIVACY.md. */
export const STORAGE_PREFIX = "drawaway:";
export const SESSION_KEY = `${STORAGE_PREFIX}session:v1`;
export const SESSION_VERSION = 1;

const EnvelopeSchema = z.object({
  v: z.literal(SESSION_VERSION),
  savedAt: z.number().int().positive(),
  state: z.object({
    missionId: z.string(),
    round: z.union([z.literal(1), z.literal(2)]),
    phase: z.enum(["intro", "draw", "confirm", "consequence", "summary"]),
    strokes: StrokesSchema,
    ideaId: z.string().max(40).optional(),
    refinementId: z.string().max(60).optional(),
    skippedDrawing: z.boolean(),
  }),
});

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

function getStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function serializeSession(state: SessionState, now = Date.now()): string | null {
  const json = JSON.stringify({ v: SESSION_VERSION, savedAt: now, state });
  return json.length <= LIMITS.maxSerializedBytes ? json : null;
}

/**
 * Parse stored text into a trusted state, or null. Everything is re-validated:
 * stored data is untrusted input (it may be corrupt, old, or edited by hand).
 */
export function parseSession(text: string | null, now = Date.now()): SessionState | null {
  if (!text || text.length > LIMITS.maxSerializedBytes) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = EnvelopeSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { savedAt, state } = parsed.data;
  if (now - savedAt > LIMITS.sessionMaxAgeMs || savedAt - now > 60_000) return null;
  if (!isMissionId(state.missionId)) return null;

  const missionId = state.missionId;
  const base = initialState(missionId);
  if (state.round === 2 && !state.ideaId) return null;
  if (state.ideaId !== undefined && !isCandidate(missionId, 1, undefined, state.ideaId)) return null;
  if (
    state.refinementId !== undefined &&
    !isCandidate(missionId, 2, state.ideaId, state.refinementId)
  ) {
    return null;
  }
  const needsIdea = state.phase === "summary" || (state.phase === "consequence" && state.round === 1);
  if (needsIdea && !state.ideaId) return null;
  if ((state.phase === "summary" || (state.phase === "consequence" && state.round === 2)) && !state.refinementId) {
    return null;
  }
  // A saved "intro" is just a fresh mission; keep it simple and typed.
  return {
    ...base,
    round: state.round,
    phase: state.phase,
    strokes: state.strokes,
    ideaId: state.ideaId,
    refinementId: state.refinementId,
    skippedDrawing: state.skippedDrawing,
  };
}

export function loadSession(now = Date.now()): SessionState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const text = storage.getItem(SESSION_KEY);
    const state = parseSession(text, now);
    if (!state && text !== null) storage.removeItem(SESSION_KEY);
    return state;
  } catch {
    return null;
  }
}

export function saveSession(state: SessionState): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const json = serializeSession(state);
    if (json === null) return false;
    storage.setItem(SESSION_KEY, json);
    return true;
  } catch {
    return false;
  }
}

/** Removes every key this app owns, including keys from future versions. */
export function clearAllLocalData(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => storage.removeItem(k));
  } catch {
    /* storage unavailable: nothing to clear */
  }
}
