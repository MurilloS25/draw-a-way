"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { DrawingCanvas } from "./DrawingCanvas";
import { Scene } from "./Scene";
import { StrokesSvg } from "./StrokesSvg";
import { Summary } from "./Summary";
import { Trail } from "./Trail";
import { fetchCapabilities, requestInterpretation, type Capabilities } from "@/lib/interpret/client";
import type { FallbackReason } from "@/lib/interpret/types";
import {
  MISSION_IDS,
  consequenceFor,
  endingFor,
  getIdea,
  getMission,
} from "@/lib/missions/engine";
import { clearAllLocalData, loadSession, saveSession } from "@/lib/session/storage";
import { currentCandidates, initialState, reduce, type Action, type Phase, type SessionState } from "@/lib/session/state";
import type { Stroke } from "@/lib/drawing/model";

type GameAction = Action | { type: "restore"; state: SessionState } | { type: "reset" };

function gameReducer(state: SessionState, action: GameAction): SessionState {
  if (action.type === "restore") return action.state;
  if (action.type === "reset") return initialState("river");
  return reduce(state, action);
}

type Helper =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "suggested"; candidateId: string }
  | { status: "failed"; reason: FallbackReason };

const FAILURE_COPY: Record<FallbackReason, string> = {
  disabled: "The helper is not available right now.",
  rate_limited: "The helper needs a rest.",
  unavailable: "The helper could not look this time.",
  invalid_response: "The helper could not tell what this is.",
  timeout: "The helper took too long.",
  unsure: "The helper was not sure what this is.",
};

function stepAnnouncement(phase: Phase, round: 1 | 2, title: string): string {
  switch (phase) {
    case "intro":
      return `Mission: ${title}.`;
    case "draw":
      return round === 1 ? "Step 2 of 4. Draw your idea." : "Step 2 of 4. Draw a change.";
    case "confirm":
      return round === 1 ? "Step 3 of 4. Tell us what you made." : "Step 3 of 4. Tell us what you changed.";
    case "consequence":
      return "Step 4 of 4. See what happens.";
    case "summary":
      return "Your story trail.";
  }
}

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => initialState("river"));
  const [hydrated, setHydrated] = useState(false);
  const [caps, setCaps] = useState<Capabilities>({ remote: false, source: null });
  const [helper, setHelper] = useState<Helper>({ status: "idle" });
  const [selected, setSelected] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [confirmingReset, setConfirmingReset] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastKey = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const mission = getMission(state.missionId);
  const announce = useCallback((m: string) => setAnnouncement(m), []);

  // Restore an interrupted session, then learn whether an explicit helper exists.
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      dispatch({ type: "restore", state: saved });
      lastKey.current = `${saved.missionId}-${saved.phase}-${saved.round}`;
    }
    setHydrated(true);
    const controller = new AbortController();
    fetchCapabilities(controller.signal).then(setCaps);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Nothing worth keeping before a drawing starts: store nothing.
    if (state.phase === "intro") clearAllLocalData();
    else saveSession(state);
  }, [state, hydrated]);

  // Stage changes: announce, move focus to the new heading, reset transient UI.
  useEffect(() => {
    const key = `${state.missionId}-${state.phase}-${state.round}`;
    if (!hydrated) return;
    setSelected(null);
    setHelper({ status: "idle" });
    abortRef.current?.abort();
    if (lastKey.current === null) {
      lastKey.current = key;
      return;
    }
    if (lastKey.current === key) return;
    lastKey.current = key;
    setAnnouncement(stepAnnouncement(state.phase, state.round, mission.title));
    headingRef.current?.focus({ preventScroll: false });
  }, [state.missionId, state.phase, state.round, hydrated, mission.title]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const setStrokes = useCallback((strokes: Stroke[]) => dispatch({ type: "setStrokes", strokes }), []);

  const askHelper = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setHelper({ status: "loading" });
    setAnnouncement("The helper is looking at your drawing.");
    const timeout = setTimeout(() => controller.abort(), 15000);
    const result = await requestInterpretation(
      { missionId: state.missionId, round: state.round, firstIdeaId: state.ideaId, strokes: state.strokes },
      controller.signal,
    );
    clearTimeout(timeout);
    if (controller.signal.aborted && abortRef.current !== controller) return;
    if (abortRef.current !== controller) return;
    const valid = result.status === "ok" && currentCandidates(state).some((c) => c.id === result.candidateId);
    if (result.status === "ok" && valid) {
      setHelper({ status: "suggested", candidateId: result.candidateId });
      setAnnouncement("The helper has a guess. Please check it.");
    } else {
      const reason: FallbackReason = result.status === "fallback" ? result.reason : "invalid_response";
      setHelper({ status: "failed", reason: controller.signal.aborted ? "timeout" : reason });
      setAnnouncement("The helper could not tell. Your drawing is safe. You can tell us what you made.");
    }
  };

  const cancelHelper = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setHelper({ status: "idle" });
    setAnnouncement("Cancelled. Your drawing is safe.");
  };

  const startOver = () => {
    abortRef.current?.abort();
    clearAllLocalData();
    dispatch({ type: "reset" });
    setConfirmingReset(false);
    lastKey.current = "river-intro-1";
    setAnnouncement("Everything was erased. Starting fresh.");
    headingRef.current?.focus();
  };

  const candidates = currentCandidates(state);
  const consequence = state.ideaId ? consequenceFor(state.missionId, state.ideaId) : undefined;
  const ending =
    state.ideaId && state.refinementId ? endingFor(state.missionId, state.ideaId, state.refinementId) : undefined;
  const idea = state.ideaId ? getIdea(state.missionId, state.ideaId) : undefined;
  const suggested =
    helper.status === "suggested" ? candidates.find((c) => c.id === helper.candidateId) : undefined;

  const showSummary = state.phase === "summary";
  const confirmHeading = state.round === 1 ? "What did you make?" : "What did you change?";

  return (
    <div className="shell" data-phase={state.phase} data-round={state.round} data-mission={state.missionId}>
      <header className="masthead">
        <p className="wordmark">
          Draw a Way
          <svg viewBox="0 0 120 14" aria-hidden="true" focusable="false">
            <path d="M2 9 C 20 1, 34 13, 54 7 S 92 2, 118 8" />
          </svg>
        </p>
        <div className="reset">
          {confirmingReset ? (
            <>
              <button type="button" className="btn small danger" onClick={startOver}>
                Yes, erase and start over
              </button>
              <button type="button" className="btn small" onClick={() => setConfirmingReset(false)}>
                Keep going
              </button>
            </>
          ) : (
            <button type="button" className="btn small quiet" onClick={() => setConfirmingReset(true)}>
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="layout" id="main">
        <section className="note" aria-labelledby="stage-title">
          <Trail phase={state.phase} round={state.round} />

          {state.phase === "intro" && (
            <>
              <h1 id="stage-title" ref={headingRef} tabIndex={-1}>
                {mission.title}
              </h1>
              <p className="story">{mission.story}</p>
              <p className="goal">{mission.goal}</p>
              <div className="picker" role="group" aria-label="Choose a mission">
                {MISSION_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="chip"
                    aria-pressed={state.missionId === id}
                    onClick={() => dispatch({ type: "selectMission", missionId: id })}
                  >
                    {getMission(id).title}
                  </button>
                ))}
              </div>
            </>
          )}

          {state.phase === "draw" && (
            <>
              <h2 id="stage-title" ref={headingRef} tabIndex={-1}>
                {state.round === 1 ? "Draw your idea" : "Draw a change"}
              </h2>
              <p className="story">{state.round === 1 ? mission.drawPrompt : consequence?.complication}</p>
              {state.round === 2 && <p className="goal">Add to your drawing, or keep it as it is.</p>}
            </>
          )}

          {state.phase === "confirm" && (
            <>
              <h2 id="stage-title" ref={headingRef} tabIndex={-1}>
                {suggested ? "Is this what you meant?" : confirmHeading}
              </h2>
              {suggested ? (
                <p className="story">
                  I think you made <strong>{suggested.label.toLowerCase()}</strong>. Is that what you meant?
                </p>
              ) : (
                <p className="story">
                  {state.skippedDrawing
                    ? "Pick the idea you want to try."
                    : "We cannot see your drawing yet, so you tell us. Pick the idea that is closest to yours."}
                </p>
              )}

              {!suggested && (
                <fieldset className="choices" disabled={helper.status === "loading"}>
                  <legend className="sr-only">{confirmHeading}</legend>
                  {candidates.map((c) => (
                    <label key={c.id} className="choice">
                      <input
                        type="radio"
                        name="idea"
                        value={c.id}
                        checked={selected === c.id}
                        onChange={() => setSelected(c.id)}
                      />
                      <span className="choice-body">
                        <span className="choice-label">{c.label}</span>
                        <span className="choice-hint">{c.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}

              {caps.remote && !state.skippedDrawing && state.strokes.length > 0 && !suggested && (
                <div className="helper">
                  {helper.status === "loading" ? (
                    <>
                      <p role="status">The helper is looking at your drawing…</p>
                      <button type="button" className="btn small" onClick={cancelHelper}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn small" onClick={askHelper}>
                        Ask the helper to look
                      </button>
                      <p className="fine">
                        This sends a small black-and-white copy of your lines to an online helper. It is not saved.
                      </p>
                      {helper.status === "failed" && (
                        <p className="fine alert" role="status">
                          {FAILURE_COPY[helper.reason]} Your drawing is safe. Tell us what you made instead.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {state.phase === "consequence" && state.round === 1 && consequence && idea && (
            <>
              <h2 id="stage-title" ref={headingRef} tabIndex={-1}>
                Your idea: {idea.label.toLowerCase()}
              </h2>
              <p className="story">{consequence.text}</p>
              <p className="goal">{consequence.complication}</p>
            </>
          )}

          {state.phase === "consequence" && state.round === 2 && ending && (
            <>
              <h2 id="stage-title" ref={headingRef} tabIndex={-1}>
                The story ends
              </h2>
              <p className="story">{ending.text}</p>
            </>
          )}

          {showSummary && (
            <>
              <h2 id="stage-title" ref={headingRef} tabIndex={-1}>
                Your story trail
              </h2>
              <p className="story">{mission.goal} You tried it, changed it, and saw what happened.</p>
              {ending && <p className="goal">{ending.text}</p>}
            </>
          )}
        </section>

        <section className="paper-col" aria-label="Story picture">
          {showSummary ? (
            <Summary state={state} />
          ) : state.phase === "draw" ? (
            <DrawingCanvas
                  strokes={state.strokes}
                  round={state.round}
                  onChange={setStrokes}
                  onAnnounce={announce}
                  scene={<Scene missionId={state.missionId} mode="idle" />}
                />
          ) : (
            <div className="paper">
              <>
                  <Scene
                    missionId={state.missionId}
                    mode={state.phase === "consequence" ? "result" : "idle"}
                    motion={(idea?.motion ?? "steady")}
                    playKey={`${state.round}-${state.phase}`}
                  />
                  <StrokesSvg strokes={state.strokes} className="strokes-layer" />
              </>
            </div>
          )}
          {state.phase !== "draw" && !showSummary && (
            <p className="sr-only">
              {mission.sceneAlt}{" "}
              {state.strokes.length
                ? `Your drawing has ${state.strokes.length} ${state.strokes.length === 1 ? "line" : "lines"}.`
                : "You chose without drawing."}
            </p>
          )}
        </section>

        <div className="actions">
          {state.phase === "intro" && (
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "startDrawing" })}>
              Start drawing
            </button>
          )}
          {state.phase === "draw" && (
            <>
              <button
                type="button"
                className="btn primary"
                disabled={state.round === 1 && state.strokes.length === 0}
                onClick={() => dispatch({ type: "finishDrawing" })}
              >
                I&apos;m done drawing
              </button>
              <button type="button" className="btn" onClick={() => dispatch({ type: "chooseWithoutDrawing" })}>
                Choose an idea without drawing
              </button>
            </>
          )}
          {state.phase === "confirm" && (
            <>
              {suggested ? (
                <>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => dispatch({ type: "confirm", candidateId: suggested.id })}
                  >
                    Yes, that&apos;s it
                  </button>
                  <button type="button" className="btn" onClick={() => setHelper({ status: "idle" })}>
                    No, I&apos;ll choose
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!selected}
                    onClick={() => selected && dispatch({ type: "confirm", candidateId: selected })}
                  >
                    That&apos;s my idea
                  </button>
                  <button type="button" className="btn" onClick={() => dispatch({ type: "backToDrawing" })}>
                    {state.skippedDrawing ? "Draw instead" : "Keep drawing"}
                  </button>
                </>
              )}
            </>
          )}
          {state.phase === "consequence" && state.round === 1 && (
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "revise" })}>
              Change my solution
            </button>
          )}
          {state.phase === "consequence" && state.round === 2 && (
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "seeSummary" })}>
              See my story trail
            </button>
          )}
          {showSummary && (
            <>
              <button type="button" className="btn primary" onClick={() => dispatch({ type: "nextMission" })}>
                Try another mission
              </button>
              <button type="button" className="btn" onClick={() => dispatch({ type: "replay" })}>
                Play this mission again
              </button>
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>
          Your drawing stays on this device.
          {caps.remote ? " It is only sent if you press the helper button." : " Nothing is sent anywhere."}
        </p>
      </footer>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="announcer">
        {announcement}
      </div>
    </div>
  );
}
