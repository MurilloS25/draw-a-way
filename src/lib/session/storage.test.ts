// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS, type Stroke } from "../drawing/model";
import {
  SESSION_KEY,
  clearAllLocalData,
  loadSession,
  parseSession,
  saveSession,
  serializeSession,
} from "./storage";
import { initialState, type SessionState } from "./state";

const stroke: Stroke = { c: 1, w: 0, r: 1, p: [1, 2, 30, 40] };
const NOW = 1_800_000_000_000;

function state(over: Partial<SessionState> = {}): SessionState {
  return { ...initialState("river"), phase: "draw", strokes: [stroke], ...over };
}

function envelope(s: unknown, over: Record<string, unknown> = {}) {
  return JSON.stringify({ v: 1, savedAt: NOW, state: s, ...over });
}

beforeEach(() => localStorage.clear());

describe("session persistence", () => {
  it("round-trips a valid state", () => {
    const json = serializeSession(state({ phase: "consequence", ideaId: "bridge" }), NOW);
    expect(parseSession(json, NOW + 1000)).toMatchObject({ missionId: "river", ideaId: "bridge", strokes: [stroke] });
  });

  it("saves under the single documented key and reloads", () => {
    expect(saveSession(state())).toBe(true);
    expect(Object.keys(localStorage)).toEqual([SESSION_KEY]);
    expect(loadSession()?.strokes).toHaveLength(1);
  });

  it("discards corrupt, empty, and non-object data", () => {
    for (const t of [null, "", "{", "[]", "null", "123", '{"v":1}']) {
      expect(parseSession(t, NOW)).toBeNull();
    }
  });

  it("discards other versions", () => {
    expect(parseSession(envelope(state(), { v: 0 }), NOW)).toBeNull();
    expect(parseSession(envelope(state(), { v: 2 }), NOW)).toBeNull();
  });

  it("discards expired and future-dated sessions", () => {
    const text = envelope(state());
    expect(parseSession(text, NOW + LIMITS.sessionMaxAgeMs + 1)).toBeNull();
    expect(parseSession(text, NOW - 10 * 60_000)).toBeNull();
  });

  it("rejects unknown missions, ideas, and inconsistent phases", () => {
    expect(parseSession(envelope({ ...state(), missionId: "evil" }), NOW)).toBeNull();
    expect(parseSession(envelope({ ...state(), ideaId: "signpost" }), NOW)).toBeNull();
    expect(parseSession(envelope({ ...state(), round: 2 }), NOW)).toBeNull();
    expect(parseSession(envelope({ ...state(), phase: "consequence" }), NOW)).toBeNull();
    expect(parseSession(envelope({ ...state(), phase: "summary", ideaId: "bridge" }), NOW)).toBeNull();
    expect(parseSession(envelope({ ...state(), phase: "bogus" }), NOW)).toBeNull();
  });

  it("rejects out-of-bounds, fractional, and oversized strokes", () => {
    const bad: Stroke[] = [
      { c: 0, w: 0, r: 1, p: [2000, 5] },
      { c: 9, w: 0, r: 1, p: [1, 1] },
      { c: 0, w: 0, r: 1, p: [1.5, 1] },
      { c: 0, w: 0, r: 1, p: [1, 1, 5] },
    ];
    for (const s of bad) expect(parseSession(envelope({ ...state(), strokes: [s] }), NOW)).toBeNull();
    const many = Array.from({ length: LIMITS.maxStrokes + 1 }, () => stroke);
    expect(parseSession(envelope({ ...state(), strokes: many }), NOW)).toBeNull();
  });

  it("refuses to serialize or parse over the byte limit", () => {
    const long: Stroke = { c: 0, w: 0, r: 1, p: Array.from({ length: 3000 }, (_, i) => (i * 7) % 600) };
    const many = Array.from({ length: 60 }, () => long);
    expect(serializeSession(state({ strokes: many }), NOW)).toBeNull();
    expect(parseSession("x".repeat(LIMITS.maxSerializedBytes + 1), NOW)).toBeNull();
  });

  it("ignores extra, hostile fields", () => {
    const text = envelope({ ...state(), __proto__: { admin: true }, html: "<img onerror=x>" });
    const parsed = parseSession(text, NOW);
    expect(parsed).not.toBeNull();
    expect(JSON.stringify(parsed)).not.toContain("onerror");
  });

  it("removes corrupt data from storage when loading", () => {
    localStorage.setItem(SESSION_KEY, "{broken");
    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("start over removes every drawaway key and nothing else", () => {
    localStorage.setItem(SESSION_KEY, "x");
    localStorage.setItem("drawaway:future:v9", "y");
    localStorage.setItem("other-app", "keep");
    clearAllLocalData();
    expect(Object.keys(localStorage)).toEqual(["other-app"]);
  });
});
