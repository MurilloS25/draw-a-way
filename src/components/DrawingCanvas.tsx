"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  CANVAS_H,
  CANVAS_W,
  PALETTE,
  WIDTHS,
  canAddStroke,
  clamp,
  normalizePoints,
  pointsLeft,
  type Stroke,
} from "@/lib/drawing/model";
import { paintAll, paintStroke } from "@/lib/drawing/render";

interface Props {
  strokes: Stroke[];
  round: 1 | 2;
  onChange: (next: Stroke[]) => void;
  onAnnounce: (message: string) => void;
  scene: ReactNode;
}

const KEY_STEP = 24;
const KEY_STEP_BIG = 80;

/** Arrow keys move through a radio group, as native radios do. */
function radioKeys(count: number, current: number, set: (n: number) => void) {
  return (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (current + dir + count) % count;
    const group = e.currentTarget.parentElement!;
    set(next);
    requestAnimationFrame(() => (group.querySelectorAll("[role=radio]")[next] as HTMLElement | undefined)?.focus());
  };
}

function mineAfter(current: Stroke[], r: 1 | 2): number {
  return current.filter((s) => s.r === r).length - 1;
}

export function DrawingCanvas({ strokes, round, onChange, onAnnounce, scene }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const live = useRef<number[] | null>(null);
  const [color, setColor] = useState(0);
  const [width, setWidth] = useState(1);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [cursor, setCursor] = useState({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const [penDown, setPenDown] = useState(false);
  const [focused, setFocused] = useState(false);

  // Latest values for the native listeners below.
  const latest = useRef({ strokes, round, color, width, onChange, onAnnounce, redo, cursor, penDown });
  latest.current = { strokes, round, color, width, onChange, onAnnounce, redo, cursor, penDown };

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / CANVAS_W;
    paintAll(ctx, latest.current.strokes, scale);
    if (live.current) {
      paintStroke(ctx, { c: latest.current.color, w: latest.current.width, p: live.current }, scale);
    }
  }, []);

  // Size the backing store to the displayed size (capped for performance).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      if (canvas.width !== w) {
        canvas.width = w;
        canvas.height = Math.round((w * CANVAS_H) / CANVAS_W);
        repaint();
      }
    };
    resize();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [repaint]);

  useEffect(repaint, [strokes, repaint]);

  const commit = useCallback(
    (raw: number[]) => {
      const { strokes: current, round: r, color: c, width: w } = latest.current;
      // Never exceed the total point limit, or the saved session could not be restored.
      const p = normalizePoints(raw).slice(0, Math.max(0, pointsLeft(current)) * 2);
      if (p.length < 2) return;
      if (!canAddStroke(current)) {
        latest.current.onAnnounce("The page is full. Undo a line to add more.");
        repaint();
        return;
      }
      setRedo([]);
      const next = [...current, { c, w, r, p } as Stroke];
      latest.current.onChange(next);
      latest.current.onAnnounce(`Line added. ${next.filter((s) => s.r === r).length} on the page.`);
    },
    [repaint],
  );

  // Pointer Events: one code path for mouse, touch, and stylus.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let activeId: number | null = null;

    const toLogical = (e: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [
        clamp(((e.clientX - rect.left) / rect.width) * CANVAS_W, 0, CANVAS_W),
        clamp(((e.clientY - rect.top) / rect.height) * CANVAS_H, 0, CANVAS_H),
      ];
    };
    const extend = (e: PointerEvent) => {
      if (!live.current) return;
      const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [];
      const list = events.length ? events : [e];
      const ctx = canvas.getContext("2d");
      const scale = canvas.width / CANVAS_W;
      for (const ev of list) {
        if (live.current.length >= 3000) break;
        const from = live.current.length;
        live.current.push(...toLogical(ev));
        if (ctx) {
          paintStroke(ctx, { c: latest.current.color, w: latest.current.width, p: live.current }, scale, from);
        }
      }
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || activeId !== null || live.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      activeId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* capture is an enhancement */
      }
      areaRef.current?.focus({ preventScroll: true });
      const [x, y] = toLogical(e);
      live.current = [x, y];
      const ctx = canvas.getContext("2d");
      if (ctx) paintStroke(ctx, { c: latest.current.color, w: latest.current.width, p: [x, y, x, y] }, canvas.width / CANVAS_W);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== activeId) return;
      extend(e);
    };
    const finish = (e: PointerEvent, cancelled: boolean) => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      const points = live.current;
      if (!cancelled) extend(e);
      live.current = null;
      if (points && !cancelled) commit(points);
      else repaint();
    };
    const up = (e: PointerEvent) => finish(e, false);
    const cancel = (e: PointerEvent) => finish(e, true);
    const noMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("contextmenu", noMenu);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("contextmenu", noMenu);
    };
  }, [commit, repaint]);

  const undo = useCallback(() => {
    const { strokes: current, round: r, redo: stack } = latest.current;
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i]!.r === r) {
        setRedo([...stack, current[i]!]);
        latest.current.onChange(current.filter((_, j) => j !== i));
        latest.current.onAnnounce(`Last line removed. ${mineAfter(current, r)} left.`);
        return;
      }
    }
  }, []);

  const redoOne = useCallback(() => {
    const { strokes: current, redo: stack } = latest.current;
    const s = stack[stack.length - 1];
    if (!s || !canAddStroke(current) || s.p.length / 2 > pointsLeft(current)) return;
    setRedo(stack.slice(0, -1));
    latest.current.onChange([...current, s]);
    latest.current.onAnnounce("Line brought back.");
  }, []);

  const clearMine = useCallback(() => {
    const { strokes: current, round: r, redo: stack } = latest.current;
    const removed = current.filter((s) => s.r === r);
    if (!removed.length) return;
    setRedo([...stack, ...[...removed].reverse()]);
    latest.current.onChange(current.filter((s) => s.r !== r));
    latest.current.onAnnounce(r === 1 ? "Drawing cleared. Redo brings lines back." : "Your changes were cleared. Redo brings them back.");
  }, []);

  // Keyboard drawing: arrows move, Space/Enter puts the pen down or lifts it.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const lift = () => {
      if (!live.current) return;
      const points = live.current;
      live.current = null;
      setPenDown(false);
      commit(points);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey) return;
      if (e.key.startsWith("Arrow") || e.key === " " || e.key === "Enter") setFocused(true);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoOne();
        return;
      }
      if (mod) return;
      const step = e.shiftKey ? KEY_STEP_BIG : KEY_STEP;
      const delta: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const d = delta[e.key];
      if (d) {
        e.preventDefault();
        const next = {
          x: clamp(latest.current.cursor.x + d[0], 0, CANVAS_W),
          y: clamp(latest.current.cursor.y + d[1], 0, CANVAS_H),
        };
        latest.current.cursor = next;
        setCursor(next);
        if (live.current) {
          live.current.push(next.x, next.y);
          repaint();
        }
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (live.current) {
          lift();
        } else if (e.repeat) {
          return;
        } else {
          const { x, y } = latest.current.cursor;
          live.current = [x, y];
          setPenDown(true);
          repaint();
          latest.current.onAnnounce("Pen down. Use the arrow keys to draw.");
        }
        return;
      }
      if (e.key === "Escape" && live.current) {
        e.preventDefault();
        lift();
      }
    };
    const onBlur = () => {
      setFocused(false);
      lift();
    };
    const onFocus = () => setFocused(area.matches(":focus-visible"));
    area.addEventListener("keydown", onKey);
    area.addEventListener("blur", onBlur);
    area.addEventListener("focus", onFocus);
    return () => {
      area.removeEventListener("keydown", onKey);
      area.removeEventListener("blur", onBlur);
      area.removeEventListener("focus", onFocus);
    };
  }, [commit, redoOne, repaint, undo]);

  const mine = strokes.filter((s) => s.r === round).length;
  const full = !canAddStroke(strokes);

  return (
    <div className="drawing">
      <div className="paper">
        {scene}
        <div
          ref={areaRef}
          className="draw-area"
          role="application"
          aria-roledescription="drawing area"
          aria-label="Drawing area"
          aria-describedby="draw-help"
          // The keyboard-drawing surface is intentionally focusable (role=application).
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          <canvas ref={canvasRef} className="draw-canvas" aria-hidden="true" />
          {focused && (
            <span
              className={`key-cursor ${penDown ? "is-down" : ""}`}
              style={{ left: `${(cursor.x / CANVAS_W) * 100}%`, top: `${(cursor.y / CANVAS_H) * 100}%` }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
      <p id="draw-help" className="help">
        Draw with your finger, pen, or mouse. With a keyboard, click the page or tab to it, then use the arrow keys to
        move and Space to put the pen down or lift it (Escape also lifts it). Prefer not to draw? Use the
        button below to choose an idea instead.
      </p>

      <div className="tools" role="group" aria-label="Drawing tools">
        <div className="tool-group" role="radiogroup" aria-label="Crayon color">
          {PALETTE.map((p, i) => (
            <button
              key={p.name}
              type="button"
              role="radio"
              aria-checked={color === i}
              tabIndex={color === i ? 0 : -1}
              onKeyDown={radioKeys(PALETTE.length, color, setColor)}
              aria-label={p.name}
              className="swatch"
              style={{ ["--swatch" as string]: p.hex }}
              onClick={() => setColor(i)}
            />
          ))}
        </div>
        <div className="tool-group" role="radiogroup" aria-label="Crayon size">
          {WIDTHS.map((w, i) => (
            <button
              key={w.name}
              type="button"
              role="radio"
              aria-checked={width === i}
              tabIndex={width === i ? 0 : -1}
              onKeyDown={radioKeys(WIDTHS.length, width, setWidth)}
              aria-label={w.name}
              className="size"
              onClick={() => setWidth(i)}
            >
              <span style={{ width: Math.max(w.px, 6), height: Math.max(w.px, 6) }} />
            </button>
          ))}
        </div>
        <div className="tool-group">
          <button type="button" className="btn small" onClick={undo} disabled={mine === 0}>
            Undo
          </button>
          <button type="button" className="btn small" onClick={redoOne} disabled={redo.length === 0 || full}>
            Redo
          </button>
          <button type="button" className="btn small" onClick={clearMine} disabled={mine === 0}>
            Clear
          </button>
        </div>
      </div>
      <p className="count" data-testid="line-count">
        {mine === 0 ? "Nothing drawn yet." : `${mine} ${mine === 1 ? "line" : "lines"} on the page.`}
        {full ? " The page is full. Undo a line to add more." : ""}
      </p>
    </div>
  );
}
