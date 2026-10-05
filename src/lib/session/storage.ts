import { z } from "zod";
import { normalizeCapabilities, sanitizeLabel } from "../capabilities";
import { LIMITS, StrokesSchema } from "../drawing/model";
import { isMissionId, SCENE_COUNT } from "../missions/engine";
import { initialState, type SessionState } from "./state";

/** Every localStorage key this app uses. Documented in docs/PRIVACY.md. */
export const STORAGE_PREFIX = "drawaway:";
export const SESSION_KEY = `${STORAGE_PREFIX}session:v2`;
/** Version 1 (single-scene format) is deleted on sight, never migrated. */
const LEGACY_KEYS = [`${STORAGE_PREFIX}session:v1`];
export const SESSION_VERSION = 2;

const DecisionSchema = z
  .object({
    caps: z.array(z.string()).min(1).max(2),
    label: z.string().max(24).nullable(),
    skipped: z.boolean(),
  })
  .strict();

const EnvelopeSchema = z.object({
  v: z.literal(SESSION_VERSION),
  savedAt: z.number().int().positive(),
  /** Random id of the tab that wrote this, used only to notice another tab's writes. */
  writer: z.string().min(8).max(64),
  state: z.object({
    missionId: z.string(),
    scene: z
      .number()
      .int()
      .min(0)
      .max(SCENE_COUNT - 1),
    phase: z.enum(["draw", "describe", "result", "summary"]),
    strokes: StrokesSchema,
    decisions: z.array(DecisionSchema).max(SCENE_COUNT),
    skippedDrawing: z.boolean(),
  }),
});

export interface Envelope {
  state: SessionState;
  writer: string;
  savedAt: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

function getStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function serializeSession(state: SessionState, writer: string, now = Date.now()): string | null {
  const json = JSON.stringify({ v: SESSION_VERSION, savedAt: now, writer, state });
  return json.length <= LIMITS.maxSerializedBytes ? json : null;
}

/**
 * Parse stored text into a trusted state, or null. Everything is re-validated:
 * stored data is untrusted input (it may be corrupt, old, or edited by hand).
 */
export function readEnvelope(text: string | null, now = Date.now()): Envelope | null {
  if (!text || text.length > LIMITS.maxSerializedBytes) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = EnvelopeSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { savedAt, writer, state } = parsed.data;
  if (now - savedAt > LIMITS.sessionMaxAgeMs || savedAt - now > 60_000) return null;
  if (!isMissionId(state.missionId)) return null;

  const scene = state.scene as 0 | 1 | 2;
  const wanted = state.phase === "result" ? scene + 1 : state.phase === "summary" ? SCENE_COUNT : scene;
  if (state.decisions.length !== wanted) return null;
  if (state.phase === "summary" && scene !== SCENE_COUNT - 1) return null;

  const decisions = [];
  for (const d of state.decisions) {
    const caps = normalizeCapabilities(d.caps);
    if (!caps) return null;
    if (d.label !== null && sanitizeLabel(d.label) !== d.label) return null;
    decisions.push({ caps, label: d.label, skipped: d.skipped });
  }
  if (state.strokes.some((s) => s.s > scene)) return null;

  return {
    writer,
    savedAt,
    state: {
      ...initialState(state.missionId),
      scene,
      phase: state.phase,
      strokes: state.strokes,
      decisions,
      skippedDrawing: state.skippedDrawing,
    },
  };
}

export function parseSession(text: string | null, now = Date.now()): SessionState | null {
  return readEnvelope(text, now)?.state ?? null;
}

/** Reads the stored envelope without deleting anything. */
export function peekSession(now = Date.now()): Envelope | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return readEnvelope(storage.getItem(SESSION_KEY), now);
  } catch {
    return null;
  }
}

export function loadSession(now = Date.now()): SessionState | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    for (const k of LEGACY_KEYS) storage.removeItem(k);
    const text = storage.getItem(SESSION_KEY);
    const state = parseSession(text, now);
    if (!state && text !== null) storage.removeItem(SESSION_KEY);
    return state;
  } catch {
    return null;
  }
}

/** Writes the session; returns false when it could not be stored (full, blocked, too large). */
export function saveSession(state: SessionState, writer: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const json = serializeSession(state, writer);
    if (json === null) return false;
    storage.setItem(SESSION_KEY, json);
    return true;
  } catch {
    return false;
  }
}

/** Removes every key this app owns, including keys from other versions. */
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

/** Key-order independent JSON, so equal sessions compare equal however their objects were built. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(o)
        .filter((k) => o[k] !== undefined)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stable(o[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value) ?? "null";
}

/** Whether two states are the same session content (used to ignore echoes of our own saves). */
export function sameState(a: SessionState, b: SessionState): boolean {
  return stable(a) === stable(b);
}
