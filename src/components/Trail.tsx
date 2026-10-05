import type { Phase } from "@/lib/session/state";

const STEPS = ["Scene 1", "Scene 2", "Scene 3", "Your trail"] as const;

/** A dashed path with four stops. Text and shape both carry the state, never color alone. */
export function Trail({ phase, scene }: { phase: Phase; scene: 0 | 1 | 2 }) {
  const current = phase === "summary" ? 3 : phase === "intro" ? 0 : scene;
  return (
    <ol className="trail" aria-label={phase === "summary" ? "Your adventure, finished" : `Your adventure. Scene ${scene + 1} of 3.`}>
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={label} className={`stop ${state}`} aria-current={state === "current" ? "step" : undefined}>
            <span className="dot" aria-hidden="true" />
            <span className="stop-label">
              {label}
              <span className="sr-only">{state === "done" ? ", done" : state === "current" ? ", you are here" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
