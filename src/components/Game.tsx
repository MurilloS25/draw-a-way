"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Backdrop, motionFor } from "./Backdrop";
import { CapabilityPicker } from "./CapabilityPicker";
import { DrawingCanvas } from "./DrawingCanvas";
import { PersistentSvg, StrokesSvg } from "./StrokesSvg";
import { Summary } from "./Summary";
import { Trail } from "./Trail";
import {
  describeCapabilities,
  normalizeCapabilities,
  thingName,
  type Capability,
  type CapabilityOrUnknown,
} from "@/lib/capabilities";
import { companionAt, persistentLayers } from "@/lib/drawing/layers";
import { exportCompositeBase64 } from "@/lib/drawing/render";
import type { Stroke } from "@/lib/drawing/model";
import { fetchCapabilities, requestInterpretation, type Capabilities } from "@/lib/interpret/client";
import type { FallbackReason } from "@/lib/interpret/types";
import {
  MISSION_IDS,
  getMission,
  getScene,
  keepNote,
  recallLines,
  resolveScene,
  sceneStory,
  startMood,
  type SceneIndex,
} from "@/lib/missions/engine";
import {
  clearAllLocalData,
  loadSession,
  peekSession,
  readEnvelope,
  sameState,
  saveSession,
  SESSION_KEY,
} from "@/lib/session/storage";
import { initialState, priorDecisions, reduce, type Action, type Phase, type SessionState } from "@/lib/session/state";

type GameAction = Action | { type: "restore"; state: SessionState } | { type: "reset" };

function gameReducer(state: SessionState, action: GameAction): SessionState {
  if (action.type === "restore") return action.state;
  if (action.type === "reset") return initialState("river");
  return reduce(state, action);
}

type Helper =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "suggested"; caps: Capability[]; label: string | null }
  | { status: "failed"; reason: FallbackReason };

const FAILURE_COPY: Record<FallbackReason, string> = {
  disabled: "The helper is not available right now.",
  rate_limited: "The helper needs a rest.",
  unavailable: "The helper could not look this time.",
  invalid_response: "The helper could not tell what this is.",
  timeout: "The helper took too long.",
  unsure: "The helper was not sure what this is.",
};

function stepAnnouncement(phase: Phase, scene: number, title: string, resultText?: string): string {
  switch (phase) {
    case "intro":
      return `Adventure: ${title}.`;
    case "draw":
      return `Scene ${scene + 1} of 3. Draw your idea.`;
    case "describe":
      return `Scene ${scene + 1} of 3. Say what your idea does.`;
    case "result":
      return `Scene ${scene + 1} of 3. ${resultText ?? "See what happens."}`;
    case "summary":
      return "Your adventure trail.";
  }
}

function newTabId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `t${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => initialState("river"));
  const [hydrated, setHydrated] = useState(false);
  const [caps, setCaps] = useState<Capabilities>({ remote: false, source: null });
  const [helper, setHelper] = useState<Helper>({ status: "idle" });
  const [picked, setPicked] = useState<CapabilityOrUnknown[]>([]);
  const [editing, setEditing] = useState(false);
  // Two live regions used alternately, so a repeated message is announced again.
  const [announcements, setAnnouncements] = useState<[string, string]>(["", ""]);
  const flip = useRef(0);
  const setAnnouncement = useCallback((m: string) => {
    flip.current = 1 - flip.current;
    setAnnouncements(flip.current === 0 ? [m, ""] : ["", m]);
  }, []);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<null | "replay" | "next">(null);
  const [conflict, setConflict] = useState<null | { other: SessionState | null }>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  /** Bumped when another tab's version replaces ours, so the canvas drops its undo history. */
  const [epoch, setEpoch] = useState(0);
  /** True once this tab owns the stored session (it loaded it, saved it, or the child chose to keep it). */
  const claimed = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const conflictRef = useRef<HTMLButtonElement>(null);
  const paperColRef = useRef<HTMLElement>(null);
  const lastKey = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tabId = useRef("");
  const stateRef = useRef(state);
  stateRef.current = state;

  const mission = getMission(state.missionId);
  const scene = state.scene;
  const sceneDef = getScene(state.missionId, scene);
  const prior = priorDecisions(state);
  const announce = setAnnouncement;

  // Restore an interrupted session, then learn whether an explicit helper exists.
  useEffect(() => {
    tabId.current = newTabId();
    const saved = loadSession();
    if (saved) {
      dispatch({ type: "restore", state: saved });
      claimed.current = true;
      lastKey.current = `${saved.missionId}-${saved.phase}-${saved.scene}`;
      setAnnouncement("Welcome back. Your adventure is still here.");
    }
    setHydrated(true);
    const controller = new AbortController();
    fetchCapabilities(controller.signal).then(setCaps);
    return () => controller.abort();
  }, [setAnnouncement]);

  // Save after every step once drawing has started. Saving pauses while another tab's change is unresolved.
  useEffect(() => {
    if (!hydrated || conflict || state.phase === "intro") return;
    if (!claimed.current) {
      // First save from a tab that did not load the stored session: never replace another tab's adventure silently.
      const other = peekSession();
      if (other && other.writer !== tabId.current && !sameState(other.state, state)) {
        setConflict({ other: other.state });
        setAnnouncement("Another tab has an adventure in progress. Choose which version to keep.");
        return;
      }
      claimed.current = true;
    }
    setSaveFailed(!saveSession(state, tabId.current));
  }, [state, hydrated, conflict, setAnnouncement]);

  // Another tab wrote (or erased) the session: never overwrite silently, never merge strokes.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== SESSION_KEY) return;
      const env = e.newValue ? readEnvelope(e.newValue) : null;
      if (env && env.writer === tabId.current) return;
      const mine = stateRef.current;
      // A tab still on the first screen has nothing to lose; it is asked at its first save instead.
      if (mine.phase === "intro") return;
      if (env && sameState(env.state, mine)) return;
      if (!env && e.newValue !== null) return; // unreadable write: ignore, we keep ours
      setConflict({ other: env ? env.state : null });
      setAnnouncement("Another tab changed this adventure. Choose which version to keep.");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setAnnouncement]);

  useEffect(() => {
    if (conflict) conflictRef.current?.focus();
  }, [conflict]);

  // Stage changes: announce, move focus to the new heading, reset transient UI.
  useEffect(() => {
    const key = `${state.missionId}-${state.phase}-${state.scene}`;
    if (!hydrated) return;
    setPicked([]);
    setEditing(false);
    setHelper({ status: "idle" });
    setConfirmLeave(null);
    abortRef.current?.abort();
    abortRef.current = null;
    if (lastKey.current === null) {
      lastKey.current = key;
      return;
    }
    if (lastKey.current === key) return;
    lastKey.current = key;
    const resultText =
      state.phase === "result" && state.decisions[state.scene]
        ? resolveScene(state.missionId, state.scene, state.decisions.slice(0, state.scene), state.decisions[state.scene]!).text
        : undefined;
    setAnnouncement(stepAnnouncement(state.phase, state.scene, mission.title, resultText));
    headingRef.current?.focus({ preventScroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.missionId, state.phase, state.scene, hydrated, mission.title]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Keep keyboard focus somewhere sensible when the reset confirmation closes.
  const resetBtn = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  const resetYes = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirmingReset) resetYes.current?.focus();
    else if (wasConfirming.current) resetBtn.current?.focus();
    wasConfirming.current = confirmingReset;
  }, [confirmingReset]);

  // The same for the "clear this adventure?" question on the summary.
  const leaveYes = useRef<HTMLButtonElement>(null);
  const leaveFirst = useRef<HTMLButtonElement>(null);
  const wasLeaving = useRef(false);
  useEffect(() => {
    if (confirmLeave) leaveYes.current?.focus();
    else if (wasLeaving.current) leaveFirst.current?.focus();
    wasLeaving.current = confirmLeave !== null;
  }, [confirmLeave]);

  // While the helper works, "Ask" is replaced by "Cancel": keep focus on the live control.
  const cancelBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (helper.status === "loading") cancelBtn.current?.focus();
  }, [helper.status]);

  /** After a banner or dialog closes, put focus back where the child was working. */
  const restoreFocus = () =>
    requestAnimationFrame(() => {
      const area = document.querySelector<HTMLElement>(".draw-area");
      (area ?? headingRef.current)?.focus();
    });

  const setStrokes = useCallback((strokes: Stroke[]) => dispatch({ type: "setStrokes", strokes }), []);

  const currentStrokes = state.strokes.filter((s) => s.s === scene);
  const layers = persistentLayers(state.missionId, state.decisions, state.strokes, scene);
  const compAt = companionAt(state.missionId, scene);

  const askHelper = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setEditing(false);
    setHelper({ status: "loading" });
    setAnnouncement("The helper is looking at your picture.");
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);
    const backdrop = paperColRef.current?.querySelector<SVGSVGElement>("svg.scene") ?? null;
    let result: Awaited<ReturnType<typeof requestInterpretation>> = { status: "fallback", reason: "unavailable" };
    try {
      const image = await exportCompositeBase64({
        backdrop,
        structure: layers.structure,
        companions: layers.companions,
        companionAt: compAt,
        current: currentStrokes,
      });
      if (image) {
        result = await requestInterpretation(
          {
            missionId: state.missionId,
            scene,
            priorCaps: [...new Set(prior.flatMap((d) => d.caps.filter((c): c is Capability => c !== "unknown")))],
            imageBase64: image,
          },
          controller.signal,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
    // Ignore the answer if the child cancelled, moved on, or started over meanwhile.
    if (abortRef.current !== controller || (controller.signal.aborted && !timedOut)) return;
    abortRef.current = null;
    if (result.status === "ok") {
      setHelper({ status: "suggested", caps: result.capabilities, label: result.label });
      setAnnouncement(
        `The helper has a guess: your ${thingName(result.label, false).replace("your ", "")} can ${describeCapabilities(result.capabilities)}. Is that what you meant?`,
      );
    } else {
      setHelper({ status: "failed", reason: timedOut ? "timeout" : result.reason });
      setAnnouncement("The helper could not tell. Your drawing is safe. You can tell us what your idea does.");
    }
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const cancelHelper = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setHelper({ status: "idle" });
    setAnnouncement("Cancelled. Your drawing is safe.");
  };

  const startOver = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearAllLocalData();
    dispatch({ type: "reset" });
    setConfirmingReset(false);
    setConflict(null);
    lastKey.current = "river-intro-0";
    claimed.current = false;
    setEpoch((e) => e + 1);
    setAnnouncement("Everything was erased. Starting fresh.");
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const leaveSummary = (kind: "replay" | "next") => {
    clearAllLocalData();
    dispatch({ type: kind === "replay" ? "replay" : "nextMission" });
  };

  const keepMine = () => {
    setConflict(null);
    restoreFocus();
    claimed.current = true;
    setSaveFailed(!saveSession(stateRef.current, tabId.current));
    setAnnouncement("Kept this tab's version.");
  };
  const useOther = () => {
    const other = conflict?.other;
    setConflict(null);
    restoreFocus();
    if (other) {
      lastKey.current = `${other.missionId}-${other.phase}-${other.scene}`;
      dispatch({ type: "restore", state: other });
      claimed.current = true;
      setEpoch((e) => e + 1);
      setAnnouncement("Loaded the newest version.");
    } else {
      startOver();
    }
  };

  const hero = mission.hero;
  const suggested = helper.status === "suggested" && !editing ? helper : null;
  const normalized = normalizeCapabilities(picked);
  const needsPick = !normalized;
  const needsLine = currentStrokes.length === 0;
  const unsureHelper = helper.status === "failed" && helper.reason === "unsure";

  const decision = state.decisions[scene];
  const result = state.phase === "result" && decision ? resolveScene(state.missionId, scene, prior, decision) : null;
  const next = scene < 2 ? getScene(state.missionId, (scene + 1) as SceneIndex) : null;
  const showSummary = state.phase === "summary";

  const mood = result ? result.mood : startMood(state.missionId, scene, prior);
  const backdrop = (
    <Backdrop
      missionId={state.missionId}
      scene={scene}
      mode={state.phase === "result" ? "result" : "idle"}
      level={result?.level}
      mood={mood}
      motion={state.phase === "result" && decision ? motionFor(decision.caps) : "steady"}
      playKey={`${scene}-${state.phase === "result" ? "r" : "i"}`}
    />
  );
  const persistent = <PersistentSvg className="strokes-layer" layers={layers} companionAt={compAt} />;

  const story = sceneStory(state.missionId, scene, prior);

  const actionButtons = (
    <>
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
            aria-disabled={needsLine}
            aria-describedby={needsLine ? "action-hint" : undefined}
            onClick={() =>
              needsLine
                ? announce("Draw a line first, or choose what your idea does without drawing.")
                : dispatch({ type: "finishDrawing" })
            }
          >
            I&apos;m done drawing
          </button>
          {needsLine && (
            <p className="fine hint" id="action-hint">
              Draw a line first, or choose what your idea does without drawing.
            </p>
          )}
          <button type="button" className="btn" onClick={() => dispatch({ type: "chooseWithoutDrawing" })}>
            Choose without drawing
          </button>
        </>
      )}
      {state.phase === "describe" && (
        <>
          {suggested ? (
            <>
              <button
                type="button"
                className="btn primary"
                onClick={() => dispatch({ type: "confirm", caps: suggested.caps, label: suggested.label })}
              >
                Yes, that&apos;s it
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setPicked(suggested.caps);
                  setEditing(true);
                  requestAnimationFrame(() => headingRef.current?.focus());
                }}
              >
                No, let me change it
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn primary"
                aria-disabled={needsPick}
                aria-describedby={needsPick ? "action-hint" : undefined}
                onClick={() =>
                  normalized ? dispatch({ type: "confirm", caps: normalized }) : announce("Pick one or two things first.")
                }
              >
                That&apos;s what it does
              </button>
              {needsPick && (
                <p className="fine hint" id="action-hint">
                  Pick one or two things first.
                </p>
              )}
              <button type="button" className="btn" onClick={() => dispatch({ type: "backToDrawing" })}>
                {state.skippedDrawing ? "Draw instead" : "Keep drawing"}
              </button>
            </>
          )}
        </>
      )}
      {state.phase === "result" && next && (
        <button type="button" className="btn primary" onClick={() => dispatch({ type: "nextScene" })}>
          Next scene
        </button>
      )}
      {state.phase === "result" && !next && (
        <button type="button" className="btn primary" onClick={() => dispatch({ type: "seeSummary" })}>
          See my adventure
        </button>
      )}
      {showSummary && !confirmLeave && (
        <>
          <button ref={leaveFirst} type="button" className="btn primary" onClick={() => setConfirmLeave("next")}>
            Try another adventure
          </button>
          <button type="button" className="btn" onClick={() => setConfirmLeave("replay")}>
            Play this adventure again
          </button>
        </>
      )}
      {showSummary && confirmLeave && (
        <div className="confirm-row" role="group" aria-label="Clear this adventure?">
          <span>This clears your drawings from this adventure.</span>
          <button
            ref={leaveYes}
            type="button"
            className="btn small danger"
            onClick={() => leaveSummary(confirmLeave)}
            onKeyDown={(e) => e.key === "Escape" && setConfirmLeave(null)}
          >
            {confirmLeave === "replay" ? "Yes, clear them and play again" : "Yes, clear them and go on"}
          </button>
          <button
            type="button"
            className="btn small"
            onClick={() => setConfirmLeave(null)}
            onKeyDown={(e) => e.key === "Escape" && setConfirmLeave(null)}
          >
            No, keep my drawings
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="shell" data-phase={state.phase} data-scene={scene} data-mission={state.missionId}>
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
              <button
                ref={resetYes}
                type="button"
                className="btn small danger"
                onClick={startOver}
                onKeyDown={(e) => e.key === "Escape" && setConfirmingReset(false)}
              >
                Yes, erase and start over
              </button>
              <button
                type="button"
                className="btn small"
                onClick={() => setConfirmingReset(false)}
                onKeyDown={(e) => e.key === "Escape" && setConfirmingReset(false)}
              >
                Keep going
              </button>
            </>
          ) : (
            <button ref={resetBtn} type="button" className="btn small quiet" onClick={() => setConfirmingReset(true)}>
              Start over
            </button>
          )}
        </div>
      </header>

      {conflict && (
        <div className="banner" role="alert" data-testid="tab-conflict">
          <p>
            <strong>Another tab changed this adventure.</strong>{" "}
            {conflict.other
              ? "It has a different version. Lines are never mixed together, so pick one. Keeping this one replaces the other."
              : "It started over. Pick what happens here."}
          </p>
          <div className="banner-actions">
            <button ref={conflictRef} type="button" className="btn small" onClick={keepMine}>
              Keep what I have here
            </button>
            <button type="button" className="btn small" onClick={useOther}>
              {conflict.other ? "Use the newest version" : "Start over here too"}
            </button>
          </div>
        </div>
      )}
      {saveFailed && !conflict && (
        <p className="fine banner-quiet" role="status">
          This device could not keep your drawing for later. It is safe while this page stays open.
        </p>
      )}

      <main className="layout" id="main">
        <section className="note" aria-labelledby="stage-title">
          <Trail phase={state.phase} scene={scene} />

          {state.phase === "intro" && (
            <>
              <h1 id="stage-title" ref={headingRef} tabIndex={-1}>
                {mission.title}
              </h1>
              <p className="story">{mission.scenes[0].story}</p>
              <p className="goal">{mission.goal} Three short scenes.</p>
              <div className="picker" role="group" aria-label="Choose an adventure">
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
                Scene {scene + 1}: {sceneDef.title}
              </h2>
              <p className="story">{story}</p>
              <p className="goal">{sceneDef.prompt}</p>
              {prior.length > 0 && (
                <div className="recall">
                  <p className="fine">The story remembers:</p>
                  <ul>
                    {recallLines(state.missionId, prior).map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {state.phase === "describe" && (
            <>
              <h2 id="stage-title" ref={headingRef} tabIndex={-1}>
                {suggested
                  ? "Is this what you meant?"
                  : unsureHelper
                    ? "I'm not sure yet."
                    : `What does your idea help ${hero} do?`}
              </h2>
              {suggested ? (
                <p className="story">
                  I think {thingName(suggested.label)} can {describeCapabilities(suggested.caps)}. Is that what you meant?
                </p>
              ) : (
                <>
                  <p className="story">
                    {unsureHelper
                      ? `What does your idea help ${hero} do?`
                      : state.skippedDrawing
                        ? "Pick up to two things your idea can do."
                        : caps.remote
                          ? "Pick up to two things your idea can do, or ask the helper for a guess."
                          : "Nothing here looks at your drawing, so you tell us. Pick up to two things your idea can do."}
                  </p>
                  <CapabilityPicker selected={picked} onChange={setPicked} disabled={helper.status === "loading"} />
                </>
              )}

              {caps.remote && !state.skippedDrawing && currentStrokes.length > 0 && !suggested && (
                <div className="helper">
                  {helper.status === "loading" ? (
                    <>
                      <p role="status">The helper is looking at your picture…</p>
                      <button ref={cancelBtn} type="button" className="btn small" onClick={cancelHelper}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="fine" id="helper-note">
                        This sends a small copy of the scene and your lines to an online helper. We do not keep it. The helper
                        service may keep it for a short while. You always decide what your idea does.
                      </p>
                      <button type="button" className="btn small" onClick={askHelper} aria-describedby="helper-note">
                        Ask the helper to look
                      </button>
                      {helper.status === "failed" && !unsureHelper && (
                        <p className="fine alert" role="status">
                          {FAILURE_COPY[helper.reason]} Your drawing is safe. Tell us what your idea does instead.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {state.phase === "describe" && <div className="actions in-note">{actionButtons}</div>}

          {state.phase === "result" && result && decision && (
            <>
              <h2 id="stage-title" ref={headingRef} tabIndex={-1}>
                Here is what happens
              </h2>
              <p className="story">{result.text}</p>
              <p className="goal">{keepNote(state.missionId, scene, prior, decision)}</p>
              {next && <p className="fine">Next scene: {next.title}.</p>}
            </>
          )}

          {showSummary && (
            <>
              <h2 id="stage-title" ref={headingRef} tabIndex={-1}>
                Your adventure trail
              </h2>
              <p className="story">{mission.goal} You made three ideas, and the story answered each one.</p>
            </>
          )}
        </section>

        <section className="paper-col" aria-label="Story picture" ref={paperColRef}>
          {showSummary ? (
            <Summary state={state} />
          ) : state.phase === "draw" ? (
            <DrawingCanvas
              key={`${state.missionId}-${scene}-${epoch}`}
              strokes={state.strokes}
              scene={scene}
              onChange={setStrokes}
              onAnnounce={announce}
              layers={
                <>
                  {backdrop}
                  {persistent}
                </>
              }
            />
          ) : (
            <div className="paper">
              {backdrop}
              {persistent}
              <StrokesSvg strokes={currentStrokes} className="strokes-layer" />
            </div>
          )}
          {state.phase !== "draw" && !showSummary && (
            <p className="sr-only">
              {sceneDef.sceneAlt}{" "}
              {currentStrokes.length
                ? `Your drawing has ${currentStrokes.length} ${currentStrokes.length === 1 ? "line" : "lines"}.`
                : "You chose without drawing."}
            </p>
          )}
        </section>

        {state.phase !== "describe" && <div className="actions">{actionButtons}</div>}
      </main>

      <footer className="footer">
        <p>
          Your drawing stays on this device.
          {caps.remote ? " It is only sent if you press the helper button." : " Nothing is sent anywhere."}
        </p>
      </footer>

      <div className="sr-only" data-testid="announcer">
        <div role="status" aria-live="polite" aria-atomic="true">
          {announcements[0]}
        </div>
        <div role="status" aria-live="polite" aria-atomic="true">
          {announcements[1]}
        </div>
      </div>
    </div>
  );
}
