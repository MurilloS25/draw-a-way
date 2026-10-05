import { Backdrop } from "./Backdrop";
import { PersistentSvg, StrokesSvg } from "./StrokesSvg";
import { companionAt, persistentLayers } from "@/lib/drawing/layers";
import { buildSummary, startMood, type SceneIndex } from "@/lib/missions/engine";
import type { SessionState } from "@/lib/session/state";

/**
 * The whole adventure as an ordered list. Every step is fully described in
 * text, so the story can be understood without seeing the drawings.
 */
export function Summary({ state }: { state: SessionState }) {
  const { steps, closing } = buildSummary(state.missionId, state.decisions);
  return (
    <div className="summary">
      <ol className="steps">
        {steps.map((step, i) => {
          const scene = i as SceneIndex;
          const layers = persistentLayers(state.missionId, state.decisions, state.strokes, i);
          return (
            <li key={step.title} className="step">
              <figure className="snap">
                <div className="paper small">
                  <Backdrop
                    missionId={state.missionId}
                    scene={scene}
                    mode="idle"
                    mood={startMood(state.missionId, scene, state.decisions.slice(0, i))}
                  />
                  <PersistentSvg className="strokes-layer" layers={layers} companionAt={companionAt(state.missionId, scene)} />
                  <StrokesSvg className="strokes-layer" strokes={state.strokes.filter((s) => s.s === i)} />
                </div>
                <figcaption>
                  <strong>
                    Scene {i + 1}: {step.title}
                  </strong>
                  <span>{step.idea}</span>
                  <span>{step.result}</span>
                  {state.decisions[i]?.skipped && <span className="fine">Chosen without drawing.</span>}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ol>
      <p className="story closing">{closing}</p>
    </div>
  );
}
