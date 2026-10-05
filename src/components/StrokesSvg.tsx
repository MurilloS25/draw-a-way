import { PALETTE, WIDTHS, strokeToPath, type Stroke } from "@/lib/drawing/model";

/** Read-only rendering of the child's strokes; coordinates are plain numbers, never markup. */
export function StrokesSvg({
  strokes,
  className,
  fadeRound,
}: {
  strokes: readonly Stroke[];
  className?: string;
  /** Strokes from this round are drawn at full strength, the others softened. */
  fadeRound?: 1 | 2;
}) {
  return (
    <svg className={className} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {strokes.map((s, i) => (
        <path
          key={i}
          d={strokeToPath(s.p)}
          fill="none"
          stroke={PALETTE[s.c]?.hex}
          strokeWidth={WIDTHS[s.w]?.px}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={fadeRound && s.r !== fadeRound ? 0.45 : 1}
        />
      ))}
    </svg>
  );
}
