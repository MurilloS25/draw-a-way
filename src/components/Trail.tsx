import type { Phase } from "@/lib/session/state";

const STEPS = ["Mission", "Draw", "Check", "Story"] as const;

const INDEX: Record<Phase, number> = { intro: 0, draw: 1, confirm: 2, consequence: 3, summary: 4 };

/** A dashed path with four stops. Text and shape both carry the state, never color alone. */
export function Trail({ phase, round }: { phase: Phase; round: 1 | 2 }) {
  const current = INDEX[phase];
  return (
    <ol className="trail" aria-label={`Your steps. Try ${round} of 2.`}>
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
