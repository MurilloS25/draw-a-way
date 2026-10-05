import { CANVAS_H, CANVAS_W, PALETTE, WIDTHS, type Stroke } from "./model";

/** Paints one stroke (or the newest segments of one) onto a 2D context. */
export function paintStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Pick<Stroke, "c" | "w" | "p">,
  scale: number,
  fromIndex = 0,
): void {
  const p = stroke.p;
  if (p.length < 2) return;
  ctx.strokeStyle = PALETTE[stroke.c]?.hex ?? PALETTE[0].hex;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = (WIDTHS[stroke.w]?.px ?? WIDTHS[1].px) * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const single = p.length === 2 || (p.length === 4 && p[0] === p[2] && p[1] === p[3]);
  if (single) {
    ctx.beginPath();
    ctx.arc((p[0] as number) * scale, (p[1] as number) * scale, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  const start = Math.max(0, fromIndex - 2);
  ctx.moveTo((p[start] as number) * scale, (p[start + 1] as number) * scale);
  for (let i = start + 2; i + 1 < p.length; i += 2) {
    ctx.lineTo((p[i] as number) * scale, (p[i + 1] as number) * scale);
  }
  ctx.stroke();
}

export function paintAll(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], scale: number): void {
  for (const s of strokes) paintStroke(ctx, s, scale);
}

/**
 * Renders the strokes alone (no scene, no page content) on a white background
 * as a PNG. A canvas re-encode carries no metadata, so nothing from the
 * browser or device can ride along. Returns base64 without a data URL prefix.
 */
export function exportPngBase64(strokes: readonly Stroke[], width = 512): string | null {
  if (typeof document === "undefined") return null;
  const height = Math.round((width * CANVAS_H) / CANVAS_W);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  paintAll(ctx, strokes, width / CANVAS_W);
  const url = canvas.toDataURL("image/png");
  const prefix = "data:image/png;base64,";
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
