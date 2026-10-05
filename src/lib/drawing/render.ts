import { companionSlot } from "./layers";
import { CANVAS_H, CANVAS_W, PALETTE, strokeWidthPx, type Stroke } from "./model";

/** Extra width (logical units) of the light casing that keeps any crayon visible on any scene. */
export const CASING = 6;

function trace(
  ctx: CanvasRenderingContext2D,
  p: readonly number[],
  scale: number,
  fromIndex: number,
  color: string,
  width: number,
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width * scale;
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

/**
 * Paints one stroke (or the newest segments of one) onto a 2D context. With
 * `casing`, a soft white line goes underneath first. Live segments are painted
 * without it so earlier segments are not overpainted; the full repaint adds it.
 */
export function paintStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Pick<Stroke, "c" | "w" | "p" | "pr">,
  scale: number,
  fromIndex = 0,
  casing = false,
): void {
  const p = stroke.p;
  if (p.length < 2) return;
  const width = strokeWidthPx(stroke);
  if (casing) {
    ctx.save();
    ctx.globalAlpha *= 0.75;
    trace(ctx, p, scale, fromIndex, "#ffffff", width + CASING);
    ctx.restore();
  }
  trace(ctx, p, scale, fromIndex, PALETTE[stroke.c]?.hex ?? PALETTE[0].hex, width);
}

export function paintAll(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[], scale: number): void {
  for (const s of strokes) paintStroke(ctx, s, scale, 0, true);
}

export interface CompositeInput {
  /** The scene backdrop element, or null to leave it out. */
  backdrop: SVGSVGElement | null;
  structure: readonly Stroke[];
  companions: readonly (readonly Stroke[])[];
  companionAt: { x: number; y: number; scale: number };
  current: readonly Stroke[];
}

export const COMPOSITE_WIDTH = 512;

function loadSvg(svg: SVGSVGElement): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(CANVAS_W));
    clone.setAttribute("height", String(CANVAS_H));
    clone.removeAttribute("class");
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
    const img = new Image();
    const done = (v: HTMLImageElement | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    const timer = setTimeout(() => done(null), 3000);
    img.onload = () => {
      clearTimeout(timer);
      done(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    img.src = url;
  });
}

/**
 * Builds the picture the optional helper may receive: the scene background,
 * persistent elements from earlier decisions, and the child's current strokes,
 * on one white raster. Interface elements are never part of it. A canvas
 * re-encode carries no metadata. Returns base64 without a data URL prefix.
 */
export async function exportCompositeBase64(input: CompositeInput): Promise<string | null> {
  try {
    return await buildComposite(input);
  } catch {
    // A tainted or unsupported canvas must never leave the helper flow hanging.
    return null;
  }
}

async function buildComposite(input: CompositeInput): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const width = COMPOSITE_WIDTH;
  const height = Math.round((width * CANVAS_H) / CANVAS_W);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const scale = width / CANVAS_W;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  if (input.backdrop) {
    const img = await loadSvg(input.backdrop);
    if (img) ctx.drawImage(img, 0, 0, width, height);
  }
  // Same look as the screen: structures at 90% strength, companions as miniatures beside the character.
  ctx.save();
  ctx.globalAlpha = 0.9;
  paintAll(ctx, input.structure, scale);
  ctx.restore();
  input.companions.forEach((group, i) => {
    const { x, y, scale: cs } = companionSlot(input.companionAt, i);
    ctx.save();
    ctx.translate(x * scale, y * scale);
    paintAll(ctx, group, scale * cs);
    ctx.restore();
  });
  paintAll(ctx, input.current, scale);
  const url = canvas.toDataURL("image/png");
  const prefix = "data:image/png;base64,";
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
