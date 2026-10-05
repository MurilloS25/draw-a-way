import { companionSlot, type PersistentLayers } from "@/lib/drawing/layers";
import { PALETTE, strokeToPath, strokeWidthPx, type Stroke } from "@/lib/drawing/model";

/** A soft light casing under each line keeps every crayon colour visible on any scene. */
const CASING = 6;

function Paths({ strokes, opacity = 1 }: { strokes: readonly Stroke[]; opacity?: number }) {
  return (
    <>
      {strokes.map((s, i) => (
        <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
          <path d={strokeToPath(s.p)} stroke="#ffffff" strokeOpacity={0.75} strokeWidth={strokeWidthPx(s) + CASING} />
          <path d={strokeToPath(s.p)} stroke={PALETTE[s.c]?.hex} strokeWidth={strokeWidthPx(s)} />
        </g>
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
  if (!layers.structure.length && !layers.companions.length) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      data-testid="persistent-layer"
    >
      <Paths strokes={layers.structure} opacity={0.9} />
      {layers.companions.map((group, i) => {
        const at = companionSlot(companionAt, i);
        return (
          <g key={i} transform={`translate(${at.x} ${at.y}) scale(${at.scale})`}>
            <Paths strokes={group} />
          </g>
        );
      })}
    </svg>
  );
}
