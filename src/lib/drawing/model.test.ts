import { describe, expect, it } from "vitest";
import { emptyHistory, record, redo, strokesAt, undo, type History } from "./history";
import { LIMITS, canAddStroke, normalizePoints, pointCount, pointsLeft, strokeToPath, strokeWidthPx, type Stroke } from "./model";

const big = (n: number): Stroke => ({ c: 0, w: 0, s: 0, p: Array.from({ length: n * 2 }, (_, i) => i % 600) });
const line = (s: 0 | 1 | 2, x1 = 100, y1 = 100, x2 = 300, y2 = 100): Stroke => ({ c: 0, w: 1, s, p: [x1, y1, x2, y2] });

describe("drawing limits", () => {
  it("caps points per stroke and rounds, clamps, and de-duplicates", () => {
    const raw = Array.from({ length: 6000 }, (_, i) => i * 3);
    expect(normalizePoints(raw).length).toBeLessThanOrEqual(LIMITS.maxPointsPerStroke * 2);
    expect(normalizePoints([-50, 5000, -50, 5000])).toEqual([0, 700, 0, 700]);
    expect(normalizePoints([10.4, 10.4, 10.9, 10.6, 50, 50])).toEqual([10, 10, 50, 50]);
    expect(normalizePoints([5, 5])).toEqual([5, 5, 5, 5]);
  });

  it("reports the room left so a new stroke can be truncated to fit", () => {
    const nearly = Array.from({ length: 9 }, () => big(1500));
    expect(pointCount(nearly)).toBe(13500);
    expect(pointsLeft(nearly)).toBe(1500);
    expect(canAddStroke(nearly)).toBe(true);
    const full = [...nearly, big(1499)];
    expect(pointsLeft(full)).toBe(1);
    expect(canAddStroke(full)).toBe(false);
  });

  it("stops at the stroke count limit", () => {
    expect(canAddStroke(Array.from({ length: LIMITS.maxStrokes }, () => big(2)))).toBe(false);
  });

  it("builds path data from numbers only and scales width with pen pressure", () => {
    expect(strokeToPath([1, 2, 3, 4])).toBe("M1 2L3 4");
    expect(strokeToPath([])).toBe("");
    expect(strokeWidthPx({ w: 1 })).toBe(11);
    expect(strokeWidthPx({ w: 1, pr: 100 })).toBeGreaterThan(11);
    expect(strokeWidthPx({ w: 1, pr: 1 })).toBeLessThan(11);
  });
});

describe("undo, redo, erase", () => {
  it("undoes and redoes additions and removals", () => {
    const a = line(0);
    let strokes: Stroke[] = [a];
    let h: History = record(emptyHistory, { type: "add", stroke: a });
    const b = line(0, 100, 200, 300, 200);
    strokes = [...strokes, b];
    h = record(h, { type: "add", stroke: b });
    h = record(h, { type: "remove", strokes: [a, b] });
    strokes = [];
    let r = undo(strokes, h)!;
    expect(r.strokes).toEqual([a, b]);
    r = undo(r.strokes, r.history)!;
    expect(r.strokes).toEqual([a]);
    r = redo(r.strokes, r.history)!;
    expect(r.strokes).toEqual([a, b]);
    r = redo(r.strokes, r.history)!;
    expect(r.strokes).toEqual([]);
    expect(redo(r.strokes, r.history)).toBeNull();
    expect(undo([], emptyHistory)).toBeNull();
  });

  it("a new action discards the redo branch", () => {
    const a = line(0);
    let h = record(emptyHistory, { type: "add", stroke: a });
    const r = undo([a], h)!;
    h = record(r.history, { type: "add", stroke: line(0) });
    expect(h.future).toEqual([]);
  });

  it("the eraser only touches lines of the current scene, never other scenes", () => {
    const mine = line(1, 100, 100, 300, 100);
    const earlier = line(0, 100, 100, 300, 100);
    expect(strokesAt([earlier, mine], 1, 200, 105, 25)).toEqual([mine]);
    expect(strokesAt([earlier, mine], 1, 200, 400, 25)).toEqual([]);
    expect(strokesAt([earlier], 1, 200, 100, 25)).toEqual([]);
    expect(strokesAt([{ c: 0, w: 0, s: 1, p: [50, 50] }], 1, 52, 52, 10)).toHaveLength(1);
  });
});
