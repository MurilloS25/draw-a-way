import { CANVAS_H, CANVAS_W, strokeWidthPx, type Stroke } from "./model";

/** Undo/redo as operations, so erasing and clearing can be undone too. */
export type Op = { type: "add"; stroke: Stroke } | { type: "remove"; strokes: Stroke[] };

export interface History {
  past: Op[];
  future: Op[];
}

export const emptyHistory: History = { past: [], future: [] };

const MAX_OPS = 200;

export function record(history: History, op: Op): History {
  return { past: [...history.past, op].slice(-MAX_OPS), future: [] };
}

export function undo(strokes: readonly Stroke[], history: History): { strokes: Stroke[]; history: History } | null {
  const op = history.past.at(-1);
  if (!op) return null;
  const past = history.past.slice(0, -1);
  const future = [...history.future, op];
  if (op.type === "add") return { strokes: strokes.filter((s) => s !== op.stroke), history: { past, future } };
  return { strokes: [...strokes, ...op.strokes], history: { past, future } };
}

export function redo(strokes: readonly Stroke[], history: History): { strokes: Stroke[]; history: History } | null {
  const op = history.future.at(-1);
  if (!op) return null;
  const future = history.future.slice(0, -1);
  const past = [...history.past, op];
  if (op.type === "add") return { strokes: [...strokes, op.stroke], history: { past, future } };
  const gone = new Set(op.strokes);
  return { strokes: strokes.filter((s) => !gone.has(s)), history: { past, future } };
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Strokes of this scene touched by an eraser of the given radius at (x, y). Other scenes are never hit. */
export function strokesAt(strokes: readonly Stroke[], scene: number, x: number, y: number, radius: number): Stroke[] {
  const hits: Stroke[] = [];
  for (const s of strokes) {
    if (s.s !== scene) continue;
    const reach = radius + strokeWidthPx(s) / 2;
    const p = s.p;
    let hit = false;
    if (p.length === 2) hit = Math.hypot(x - (p[0] as number), y - (p[1] as number)) <= reach;
    for (let i = 0; !hit && i + 3 < p.length; i += 2) {
      hit = distToSegment(x, y, p[i]!, p[i + 1]!, p[i + 2]!, p[i + 3]!) <= reach;
    }
    if (hit) hits.push(s);
  }
  return hits;
}

export const ERASER_RADIUS = Math.round(Math.min(CANVAS_W, CANVAS_H) * 0.035);
