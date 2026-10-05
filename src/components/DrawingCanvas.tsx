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
import { ERASER_RADIUS, emptyHistory, record, redo as redoOp, strokesAt, undo as undoOp, type History } from "@/lib/drawing/history";
import { paintAll, paintStroke } from "@/lib/drawing/render";

interface Props {
  strokes: Stroke[];
  scene: 0 | 1 | 2;
  onChange: (next: Stroke[]) => void;
  onAnnounce: (message: string) => void;
  /** Layer 1 and 2: the scene backdrop and the persistent elements. Never edited here. */
  layers: ReactNode;
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

export function DrawingCanvas({ strokes, scene, onChange, onAnnounce, layers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const live = useRef<number[] | null>(null);
  const livePressure = useRef<{ sum: number; n: number }>({ sum: 0, n: 0 });
  const erasing = useRef<Set<Stroke>>(new Set());
  const [color, setColor] = useState(0);
  const [width, setWidth] = useState(1);
  const [tool, setTool] = useState<"draw" | "erase">("draw");
  const [history, setHistory] = useState<History>(emptyHistory);
  const [cursor, setCursor] = useState({ x: CANVAS_W / 2, y: CANVAS_H / 2 });
  const [penDown, setPenDown] = useState(false);
  const [focused, setFocused] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // Latest values for the native listeners below.
  const latest = useRef({ strokes, scene, color, width, tool, onChange, onAnnounce, history, cursor });
  latest.current = { strokes, scene, color, width, tool, onChange, onAnnounce, history, cursor };

  const mine = strokes.filter((s) => s.s === scene);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / CANVAS_W;
    const cur = latest.current;
    paintAll(ctx, cur.strokes.filter((s) => s.s === cur.scene && !erasing.current.has(s)), scale);
    if (live.current && cur.tool === "draw") {
      const { sum, n } = livePressure.current;
      paintStroke(ctx, { c: cur.color, w: cur.width, p: live.current, pr: n ? Math.round((sum / n) * 100) || undefined : undefined }, scale);
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

  useEffect(repaint, [strokes, tool, repaint]);

  const apply = useCallback((next: Stroke[], hist: History) => {
    setHistory(hist);
    latest.current.onChange(next);
  }, []);

  const commit = useCallback(
    (raw: number[], pressure?: number) => {
      const { strokes: current, scene: s, color: c, width: w } = latest.current;
      // Never exceed the total point limit, or the saved session could not be restored.
      const p = normalizePoints(raw).slice(0, Math.max(0, pointsLeft(current)) * 2);
      if (p.length < 2) return;
      if (!canAddStroke(current)) {
        latest.current.onAnnounce("The page is full. Undo a line to add more.");
        repaint();
        return;
      }
      const stroke: Stroke = { c, w, s, p, ...(pressure ? { pr: pressure } : {}) };
      apply([...current, stroke], record(latest.current.history, { type: "add", stroke }));
      latest.current.onAnnounce(`Line added. ${current.filter((x) => x.s === s).length + 1} on the page.`);
    },
    [apply, repaint],
  );

  const eraseAt = useCallback(
    (x: number, y: number) => {
      const { strokes: current, scene: s } = latest.current;
      let changed = false;
      for (const hit of strokesAt(current, s, x, y, ERASER_RADIUS)) {
        if (!erasing.current.has(hit)) {
          erasing.current.add(hit);
          changed = true;
        }
      }
      if (changed) repaint();
    },
    [repaint],
  );

  const finishErase = useCallback(() => {
    const gone = [...erasing.current];
    erasing.current = new Set();
    if (gone.length === 0) {
      repaint();
      return;
    }
    const { strokes: current } = latest.current;
    const set = new Set(gone);
    apply(current.filter((s) => !set.has(s)), record(latest.current.history, { type: "remove", strokes: gone }));
    latest.current.onAnnounce(`Erased ${gone.length} ${gone.length === 1 ? "line" : "lines"}.`);
  }, [apply, repaint]);

  // Pointer Events: one code path for mouse, touch, and stylus.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let activeId: number | null = null;
    let penPointer = false;

    const toLogical = (e: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [
        clamp(((e.clientX - rect.left) / rect.width) * CANVAS_W, 0, CANVAS_W),
        clamp(((e.clientY - rect.top) / rect.height) * CANVAS_H, 0, CANVAS_H),
      ];
    };
    const sample = (ev: PointerEvent) => {
      // Pressure is a progressive enhancement: only a pen that reports it can thicken or thin a line.
      if (penPointer && ev.pressure > 0) {
        livePressure.current.sum += ev.pressure;
        livePressure.current.n += 1;
      }
    };
    const livePr = () => {
      const { sum, n } = livePressure.current;
      return n ? clamp(Math.round((sum / n) * 100), 1, 100) : undefined;
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
        const pt = toLogical(ev);
        live.current.push(...pt);
        if (latest.current.tool === "erase") {
          eraseAt(pt[0], pt[1]);
        } else {
          sample(ev);
          if (ctx) paintStroke(ctx, { c: latest.current.color, w: latest.current.width, p: live.current, pr: livePr() }, scale, from);
        }
      }
    };
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || activeId !== null || live.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      activeId = e.pointerId;
      penPointer = e.pointerType === "pen";
      livePressure.current = { sum: 0, n: 0 };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* capture is an enhancement */
      }
      areaRef.current?.focus({ preventScroll: true });
      const [x, y] = toLogical(e);
      live.current = [x, y];
      if (latest.current.tool === "erase") {
        eraseAt(x, y);
      } else {
        sample(e);
        const ctx = canvas.getContext("2d");
        if (ctx) paintStroke(ctx, { c: latest.current.color, w: latest.current.width, p: [x, y, x, y], pr: livePr() }, canvas.width / CANVAS_W);
      }
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
      if (latest.current.tool === "erase") {
        if (cancelled) {
          erasing.current = new Set();
          repaint();
        } else finishErase();
        return;
      }
      if (points && !cancelled) commit(points, penPointer ? livePr() : undefined);
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
  }, [commit, eraseAt, finishErase, repaint]);

  const undo = useCallback(() => {
    const r = undoOp(latest.current.strokes, latest.current.history);
    if (!r) return;
    apply(r.strokes, r.history);
    latest.current.onAnnounce("Undone.");
  }, [apply]);

  const redo = useCallback(() => {
    const r = redoOp(latest.current.strokes, latest.current.history);
    if (!r) return;
    if (r.strokes.length > latest.current.strokes.length && !canAddStroke(latest.current.strokes)) return;
    apply(r.strokes, r.history);
    latest.current.onAnnounce("Brought back.");
  }, [apply]);

  const clearMine = useCallback(() => {
    const { strokes: current, scene: s } = latest.current;
    const removed = current.filter((x) => x.s === s);
    setConfirmClear(false);
    if (!removed.length) return;
    apply(current.filter((x) => x.s !== s), record(latest.current.history, { type: "remove", strokes: removed }));
    latest.current.onAnnounce("This scene's drawing was cleared. Undo brings it back.");
  }, [apply]);

  // Keyboard drawing: arrows move, Space/Enter puts the pen down or lifts it.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const lift = () => {
      if (!live.current) return;
      const points = live.current;
      live.current = null;
      setPenDown(false);
      if (latest.current.tool === "erase") finishErase();
      else commit(points);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey) return;
      if (e.key.startsWith("Arrow") || e.key === " " || e.key === "Enter") setFocused(true);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        (e.shiftKey ? redo : undo)();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
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
          if (latest.current.tool === "erase") eraseAt(next.x, next.y);
          else repaint();
        }
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (live.current) {
          lift();
        } else if (!e.repeat) {
          const { x, y } = latest.current.cursor;
          live.current = [x, y];
          livePressure.current = { sum: 0, n: 0 };
          setPenDown(true);
          if (latest.current.tool === "erase") eraseAt(x, y);
          else repaint();
          latest.current.onAnnounce(
            latest.current.tool === "erase" ? "Eraser down. Move over a line to remove it." : "Pen down. Use the arrow keys to draw.",
          );
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
  }, [commit, eraseAt, finishErase, redo, repaint, undo]);

  const full = !canAddStroke(strokes);
  const toolText =
    tool === "erase" ? "Eraser. It removes whole lines it touches." : `Crayon, ${PALETTE[color]?.name}, ${WIDTHS[width]?.name.toLowerCase()}.`;

  return (
    <div className="drawing">
      <div className="paper">
        {layers}
        <div
          ref={areaRef}
          className={`draw-area tool-${tool}`}
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
        move and Space to put the pen down or lift it (Escape also lifts it). Prefer not to draw? Use the button below
        to choose what your idea does instead.
      </p>

      <div className="tools" role="group" aria-label="Drawing tools">
        <div className="tool-group" role="radiogroup" aria-label="Tool">
          {(["draw", "erase"] as const).map((t, i) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={tool === t}
              tabIndex={tool === t ? 0 : -1}
              className="btn small tool-btn"
              onKeyDown={radioKeys(2, i, (n) => setTool(n === 0 ? "draw" : "erase"))}
              onClick={() => setTool(t)}
            >
              {t === "draw" ? "Draw" : "Erase"}
            </button>
          ))}
        </div>
        <div className="tool-group" role="radiogroup" aria-label="Crayon color">
          {PALETTE.map((p, i) => (
            <button
              key={p.name}
              type="button"
              role="radio"
              aria-checked={color === i}
              aria-label={p.name}
              title={p.name}
              tabIndex={color === i ? 0 : -1}
              onKeyDown={radioKeys(PALETTE.length, color, (n) => {
                setColor(n);
                setTool("draw");
              })}
              className="swatch"
              style={{ ["--swatch" as string]: p.hex }}
              onClick={() => {
                setColor(i);
                setTool("draw");
              }}
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
              aria-label={w.name}
              title={w.name}
              tabIndex={width === i ? 0 : -1}
              onKeyDown={radioKeys(WIDTHS.length, width, setWidth)}
              className="size"
              onClick={() => setWidth(i)}
            >
              <span style={{ width: Math.max(w.px, 6), height: Math.max(w.px, 6) }} />
            </button>
          ))}
        </div>
        <div className="tool-group">
          <button type="button" className="btn small" onClick={undo} disabled={history.past.length === 0}>
            Undo
          </button>
          <button type="button" className="btn small" onClick={redo} disabled={history.future.length === 0 || full}>
            Redo
          </button>
          <button type="button" className="btn small" onClick={() => setConfirmClear(true)} disabled={mine.length === 0 || confirmClear}>
            Clear
          </button>
        </div>
      </div>
      {confirmClear && (
        <div className="confirm-row" role="group" aria-label="Clear this scene's drawing?">
          <span>Clear this scene&apos;s drawing?</span>
          <button type="button" className="btn small danger" onClick={clearMine}>
            Yes, clear it
          </button>
          <button type="button" className="btn small" onClick={() => setConfirmClear(false)}>
            Keep it
          </button>
        </div>
      )}
      <p className="count" data-testid="line-count">
        {mine.length === 0 ? "Nothing drawn yet." : `${mine.length} ${mine.length === 1 ? "line" : "lines"} on the page.`}
        {full ? " The page is full. Undo a line to add more." : ""}
      </p>
      <p className="fine tool-now" data-testid="tool-now">
        Now using: {toolText}
      </p>
    </div>
  );
}
