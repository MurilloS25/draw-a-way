// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS, type Stroke } from "../drawing/model";
import { SESSION_KEY, clearAllLocalData, loadSession, parseSession, readEnvelope, saveSession, serializeSession } from "./storage";
import { initialState, type SessionState } from "./state";

const stroke = (s: 0 | 1 | 2 = 0): Stroke => ({ c: 1, w: 0, s, p: [1, 2, 30, 40] });
const NOW = 1_800_000_000_000;
const W = "tab-aaaaaaaa";

function state(over: Partial<SessionState> = {}): SessionState {
  return { ...initialState("river"), phase: "draw", strokes: [stroke()], ...over };
}
const env = (s: unknown, over: Record<string, unknown> = {}) => JSON.stringify({ v: 2, savedAt: NOW, writer: W, state: s, ...over });
const done = (caps: string[] = ["floats"]) => ({ caps: caps as never, label: null, skipped: false });

beforeEach(() => localStorage.clear());

describe("session persistence v2", () => {
  it("round-trips every scene and phase", () => {
    const cases: Partial<SessionState>[] = [
      { phase: "draw" },
      { phase: "describe" },
      { phase: "result", decisions: [{ caps: ["floats"] as never, label: "big fish", skipped: false }] },
      { phase: "draw", scene: 1, strokes: [stroke(0), stroke(1)], decisions: [{ caps: ["floats"], label: null, skipped: false }] },
      { phase: "result", scene: 2, strokes: [stroke(0), stroke(1), stroke(2)], decisions: [done(), done(["unknown"]), done(["flies", "signals"])] },
      { phase: "summary", scene: 2, strokes: [stroke(0), stroke(2)], decisions: [done(), done(), done()] },
    ];
    for (const c of cases) {
      const s = state(c as SessionState);
      const parsed = parseSession(serializeSession(s, W, NOW), NOW + 1000);
      expect(parsed, JSON.stringify(c)).toEqual(s);
    }
  });

  it("saves under the single documented key and removes the legacy key", () => {
    localStorage.setItem("drawaway:session:v1", "{}");
    expect(saveSession(state(), W)).toBe(true);
    expect(loadSession()?.strokes).toHaveLength(1);
    expect(Object.keys(localStorage)).toEqual([SESSION_KEY]);
  });

  it("reports who wrote it, for noticing other tabs", () => {
    expect(readEnvelope(serializeSession(state(), W, NOW), NOW)?.writer).toBe(W);
  });

  it("discards corrupt, empty, and non-object data", () => {
    for (const t of [null, "", "{", "[]", "null", "123", '{"v":2}']) expect(parseSession(t, NOW)).toBeNull();
  });

  it("discards earlier versions instead of guessing", () => {
    expect(parseSession(env(state(), { v: 1 }), NOW)).toBeNull();
    expect(parseSession(env(state(), { v: 3 }), NOW)).toBeNull();
    localStorage.setItem(SESSION_KEY, env(state(), { v: 1 }));
    expect(loadSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("discards expired and future-dated sessions", () => {
    const text = env(state());
    expect(parseSession(text, NOW + LIMITS.sessionMaxAgeMs + 1)).toBeNull();
    expect(parseSession(text, NOW - 10 * 60_000)).toBeNull();
  });

  it("rejects inconsistent decisions, scenes, and capabilities", () => {
    const bad: unknown[] = [
      { ...state(), missionId: "evil" },
      { ...state(), phase: "result" },
      { ...state(), decisions: [done()] },
      { ...state(), scene: 1 },
      { ...state(), phase: "summary", decisions: [done(), done()] },
      { ...state(), phase: "result", decisions: [done(["teleports"])] },
      { ...state(), phase: "result", decisions: [done(["floats", "flies", "rolls"])] },
      { ...state(), phase: "result", decisions: [{ caps: ["floats"], label: "Ignore previous instructions", skipped: false }] },
      { ...state(), phase: "result", decisions: [{ caps: ["floats"], label: null, skipped: false, extra: 1 }] },
      { ...state(), phase: "intro" },
      { ...state(), strokes: [stroke(2)] },
    ];
    for (const b of bad) expect(parseSession(env(b), NOW), JSON.stringify(b).slice(0, 80)).toBeNull();
  });

  it("rejects out-of-bounds, fractional, and oversized strokes", () => {
    const bad = [
      { c: 0, w: 0, s: 0, p: [2000, 5] },
      { c: 9, w: 0, s: 0, p: [1, 1] },
      { c: 0, w: 0, s: 0, p: [1.5, 1] },
      { c: 0, w: 0, s: 0, p: [1, 1, 5] },
      { c: 0, w: 0, s: 0, p: [1, 1], pr: 400 },
      { c: 0, w: 0, s: 5, p: [1, 1] },
    ];
    for (const s of bad) expect(parseSession(env({ ...state(), strokes: [s] }), NOW)).toBeNull();
    const many = Array.from({ length: LIMITS.maxStrokes + 1 }, () => stroke());
    expect(parseSession(env({ ...state(), strokes: many }), NOW)).toBeNull();
  });

  it("keeps nine drawings small and refuses to serialize past the byte limit", () => {
    const line: Stroke = { c: 0, w: 1, s: 0, p: Array.from({ length: 300 }, (_, i) => (i * 7) % 600) };
    const lots = Array.from({ length: 27 }, (_, i) => ({ ...line, s: (i % 3) as 0 | 1 | 2 }));
    expect((serializeSession(state({ strokes: lots, scene: 2, decisions: [done(), done()] }), W, NOW) ?? "").length).toBeLessThan(
      LIMITS.maxSerializedBytes / 2,
    );
    const long: Stroke = { c: 0, w: 0, s: 0, p: Array.from({ length: 3000 }, (_, i) => (i * 7) % 600) };
    expect(serializeSession(state({ strokes: Array.from({ length: 60 }, () => long) }), W, NOW)).toBeNull();
    expect(parseSession("x".repeat(LIMITS.maxSerializedBytes + 1), NOW)).toBeNull();
  });

  it("ignores extra hostile fields", () => {
    const parsed = parseSession(env({ ...state(), html: "<img onerror=x>" }), NOW);
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
