import { z } from "zod";

export const CANVAS_W = 1000;
export const CANVAS_H = 700;

export const LIMITS = {
  maxStrokes: 150,
  maxPointsPerStroke: 1500,
  maxTotalPoints: 15000,
  maxSerializedBytes: 200_000,
  sessionMaxAgeMs: 24 * 60 * 60 * 1000,
} as const;

/** Crayon colors. Index is what is stored; names are what is announced. */
export const PALETTE = [
  { name: "Ink blue", hex: "#1f2a5c" },
  { name: "Berry red", hex: "#b3264f" },
  { name: "Sun yellow", hex: "#e8a800" },
  { name: "Moss green", hex: "#3f7a34" },
  { name: "Sky blue", hex: "#2478b8" },
  { name: "Soil brown", hex: "#6b4426" },
] as const;

export const WIDTHS = [
  { name: "Thin", px: 5 },
  { name: "Medium", px: 11 },
  { name: "Thick", px: 20 },
] as const;

/** A stroke is a flat array of integers [x0, y0, x1, y1, ...] in logical units. */
export const StrokeSchema = z.object({
  c: z
    .number()
    .int()
    .min(0)
    .max(PALETTE.length - 1),
  w: z
    .number()
    .int()
    .min(0)
    .max(WIDTHS.length - 1),
  /** Scene the stroke belongs to (0-2). */
  s: z.number().int().min(0).max(2),
  /** Average stylus pressure 0-100, only when a pen reported it. */
  pr: z.number().int().min(1).max(100).optional(),
  p: z
    .array(z.number().int())
    .min(2)
    .max(LIMITS.maxPointsPerStroke * 2)
    .refine((a) => a.length % 2 === 0, "odd coordinate count")
    .refine((a) => a.every((n, i) => n >= 0 && n <= (i % 2 === 0 ? CANVAS_W : CANVAS_H)), "coordinate out of bounds"),
});

export type Stroke = z.infer<typeof StrokeSchema>;

export const StrokesSchema = z
  .array(StrokeSchema)
  .max(LIMITS.maxStrokes)
  .refine((s) => s.reduce((n, st) => n + st.p.length / 2, 0) <= LIMITS.maxTotalPoints, "too many points");

/** Stroke width in logical units; a pen with pressure thickens or thins it a little. */
export function strokeWidthPx(stroke: Pick<Stroke, "w" | "pr">): number {
  const base = WIDTHS[stroke.w]?.px ?? WIDTHS[1].px;
  return stroke.pr ? base * (0.6 + 0.8 * (stroke.pr / 100)) : base;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function pointCount(strokes: readonly Stroke[]): number {
  return strokes.reduce((n, s) => n + s.p.length / 2, 0);
}

/** Room left for new points before the total limit is reached. */
export function canAddStroke(strokes: readonly Stroke[]): boolean {
  return strokes.length < LIMITS.maxStrokes && pointCount(strokes) < LIMITS.maxTotalPoints - 2;
}

/** Points still available before the total limit. */
export function pointsLeft(strokes: readonly Stroke[]): number {
  return LIMITS.maxTotalPoints - pointCount(strokes);
}

/**
 * Round to integers, clamp into the canvas, drop near-duplicate points and cap
 * the length. A single tap becomes a two-point dot so it stays visible.
 */
export function normalizePoints(raw: readonly number[], minDistance = 2): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const x = clamp(Math.round(raw[i] as number), 0, CANVAS_W);
    const y = clamp(Math.round(raw[i + 1] as number), 0, CANVAS_H);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const lx = out[out.length - 2];
    const ly = out[out.length - 1];
    if (lx !== undefined && ly !== undefined && Math.hypot(x - lx, y - ly) < minDistance) continue;
    out.push(x, y);
    if (out.length >= LIMITS.maxPointsPerStroke * 2) break;
  }
  if (out.length === 2) out.push(out[0] as number, out[1] as number);
  return out;
}

export function strokeToPath(p: readonly number[]): string {
  if (p.length < 2) return "";
  let d = `M${p[0]} ${p[1]}`;
  if (p.length === 4 && p[0] === p[2] && p[1] === p[3]) return `${d}l0.01 0`;
  for (let i = 2; i + 1 < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`;
  return d;
}
