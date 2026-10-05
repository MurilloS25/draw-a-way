import { describe, expect, it } from "vitest";
import { LIMITS, canAddStroke, normalizePoints, pointCount, pointsLeft, strokeToPath, type Stroke } from "./model";

const big = (n: number): Stroke => ({ c: 0, w: 0, r: 1, p: Array.from({ length: n * 2 }, (_, i) => i % 600) });

describe("drawing limits", () => {
  it("caps points per stroke and rounds, clamps, and de-duplicates", () => {
    const raw = Array.from({ length: 6000 }, (_, i) => i * 3);
    expect(normalizePoints(raw).length).toBeLessThanOrEqual(LIMITS.maxPointsPerStroke * 2);
    expect(normalizePoints([-50, 5000, -50, 5000])).toEqual([0, 700, 0, 700]);
    expect(normalizePoints([10.4, 10.4, 10.9, 10.6, 50, 50])).toEqual([10, 10, 50, 50]);
    expect(normalizePoints([5, 5])).toEqual([5, 5, 5, 5]);
  });

  it("reports the room left so a new stroke can be truncated to fit", () => {
    const nearly = Array.from({ length: 9 }, () => big(1500)); // 13,500 points
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

  it("builds path data from numbers only", () => {
    expect(strokeToPath([1, 2, 3, 4])).toBe("M1 2L3 4");
    expect(strokeToPath([])).toBe("");
  });
});
