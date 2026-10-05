import type { PersistentLayers } from "@/lib/drawing/layers";
import { PALETTE, strokeToPath, strokeWidthPx, type Stroke } from "@/lib/drawing/model";

function Paths({ strokes, opacity = 1 }: { strokes: readonly Stroke[]; opacity?: number }) {
  return (
    <>
      {strokes.map((s, i) => (
        <path
          key={i}
          d={strokeToPath(s.p)}
          fill="none"
          stroke={PALETTE[s.c]?.hex}
          strokeWidth={strokeWidthPx(s)}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={opacity}
        />
      ))}
    </>
  );
}

/** Read-only rendering of the child's strokes; coordinates are plain numbers, never markup. */
export function StrokesSvg({ strokes, className }: { strokes: readonly Stroke[]; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <Paths strokes={strokes} />
    </svg>
  );
}

/**
 * Layer 2: elements from earlier decisions that stay in the story. Structures
 * keep their place; companions shrink and travel beside the character.
 */
export function PersistentSvg({
  layers,
  companionAt,
  className,
}: {
  layers: PersistentLayers;
  companionAt: { x: number; y: number; scale: number };
  className?: string;
}) {
  if (!layers.structure.length && !layers.companion.length) return null;
  return (
    <svg className={className} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-testid="persistent-layer">
      <Paths strokes={layers.structure} opacity={0.9} />
      {layers.companion.length > 0 && (
        <g transform={`translate(${companionAt.x} ${companionAt.y}) scale(${companionAt.scale})`}>
          <Paths strokes={layers.companion} />
        </g>
      )}
    </svg>
  );
}
