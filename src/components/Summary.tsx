import { StrokesSvg } from "./StrokesSvg";
import { Scene } from "./Scene";
import { getIdea, getRefinement } from "@/lib/missions/engine";
import type { SessionState } from "@/lib/session/state";

/** Two pictures side by side: the first idea, then the idea after the change. */
export function Summary({ state }: { state: SessionState }) {
  const idea = state.ideaId ? getIdea(state.missionId, state.ideaId) : undefined;
  const refinement =
    state.ideaId && state.refinementId ? getRefinement(state.missionId, state.ideaId, state.refinementId) : undefined;
  const first = state.strokes.filter((s) => s.r === 1);
  const kept = refinement?.id.endsWith(".keep") ?? false;

  return (
    <div className="summary">
      <figure className="snap">
        <div className="paper small">
          <Scene missionId={state.missionId} mode="idle" />
          <StrokesSvg strokes={first} className="strokes-layer" />
        </div>
        <figcaption>
          <strong>First idea</strong>
          <span>{idea?.label ?? "An idea"}</span>
          {first.length === 0 && <span className="fine">Chosen without drawing.</span>}
        </figcaption>
      </figure>
      <div className="arrow" aria-hidden="true">
        <svg viewBox="0 0 80 40" focusable="false">
          <path d="M4 22 C 24 6, 44 36, 74 18 M62 8 L74 18 L60 28" />
        </svg>
      </div>
      <figure className="snap">
        <div className="paper small">
          <Scene missionId={state.missionId} mode="idle" />
          <StrokesSvg strokes={state.strokes} className="strokes-layer" fadeRound={2} />
        </div>
        <figcaption>
          <strong>{kept ? "You kept it" : "After your change"}</strong>
          <span>{refinement?.label ?? "A change"}</span>
          {!kept && state.strokes.some((s) => s.r === 2) && <span className="fine">Your new lines are the bold ones.</span>}
        </figcaption>
      </figure>
    </div>
  );
}
