import { describe, expect, it } from "vitest";
import type { Stroke } from "../drawing/model";
import { initialState, reduce, type Action, type SessionState } from "./state";

const stroke: Stroke = { c: 0, w: 1, r: 1, p: [10, 10, 50, 50] };

function run(actions: Action[], from: SessionState = initialState()): SessionState {
  return actions.reduce(reduce, from);
}

describe("session reducer", () => {
  it("walks the full happy path", () => {
    let s = run([{ type: "startDrawing" }, { type: "setStrokes", strokes: [stroke] }]);
    expect(s.phase).toBe("draw");
    s = run([{ type: "finishDrawing" }, { type: "confirm", candidateId: "bridge" }], s);
    expect(s).toMatchObject({ phase: "consequence", round: 1, ideaId: "bridge" });
    s = run([{ type: "revise" }], s);
    expect(s).toMatchObject({ phase: "draw", round: 2 });
    expect(s.strokes).toHaveLength(1);
    s = run([{ type: "finishDrawing" }, { type: "confirm", candidateId: "bridge.rail" }], s);
    expect(s).toMatchObject({ phase: "consequence", round: 2, refinementId: "bridge.rail" });
    s = run([{ type: "seeSummary" }], s);
    expect(s.phase).toBe("summary");
  });

  it("supports the no-drawing path with an empty canvas", () => {
    const s = run([
      { type: "startDrawing" },
      { type: "chooseWithoutDrawing" },
      { type: "confirm", candidateId: "stones" },
    ]);
    expect(s).toMatchObject({ phase: "consequence", ideaId: "stones", skippedDrawing: true });
    expect(s.strokes).toEqual([]);
  });

  it("only a confirmed, in-mission idea changes the story", () => {
    const confirming = run([{ type: "startDrawing" }, { type: "finishDrawing" }]);
    for (const bad of ["signpost", "bridge.rail", "", "__proto__", "BRIDGE"]) {
      expect(reduce(confirming, { type: "confirm", candidateId: bad })).toBe(confirming);
    }
    expect(confirming.ideaId).toBeUndefined();
  });

  it("ignores actions in the wrong phase", () => {
    const s = initialState();
    expect(reduce(s, { type: "confirm", candidateId: "bridge" })).toBe(s);
    expect(reduce(s, { type: "finishDrawing" })).toBe(s);
    expect(reduce(s, { type: "setStrokes", strokes: [stroke] })).toBe(s);
    expect(reduce(s, { type: "seeSummary" })).toBe(s);
    expect(reduce(s, { type: "revise" })).toBe(s);
  });

  it("can go back from confirm to keep drawing without losing strokes", () => {
    const s = run([
      { type: "startDrawing" },
      { type: "setStrokes", strokes: [stroke] },
      { type: "finishDrawing" },
      { type: "backToDrawing" },
    ]);
    expect(s.phase).toBe("draw");
    expect(s.strokes).toHaveLength(1);
  });

  it("drawing after choosing without drawing clears the skipped flag", () => {
    const s = run([
      { type: "startDrawing" },
      { type: "chooseWithoutDrawing" },
      { type: "backToDrawing" },
      { type: "setStrokes", strokes: [stroke] },
      { type: "finishDrawing" },
    ]);
    expect(s.skippedDrawing).toBe(false);
    const drawn = run([{ type: "startDrawing" }, { type: "setStrokes", strokes: [stroke] }, { type: "chooseWithoutDrawing" }]);
    expect(drawn.skippedDrawing).toBe(false);
  });

  it("switches missions only from the intro", () => {
    expect(reduce(initialState(), { type: "selectMission", missionId: "fog" }).missionId).toBe("fog");
    const drawing = run([{ type: "startDrawing" }]);
    expect(reduce(drawing, { type: "selectMission", missionId: "fog" })).toBe(drawing);
    expect(
      reduce(initialState(), { type: "selectMission", missionId: "nope" as never }).missionId,
    ).toBe("river");
  });

  it("replay and next mission start clean from the summary", () => {
    const done = run([
      { type: "startDrawing" },
      { type: "setStrokes", strokes: [stroke] },
      { type: "finishDrawing" },
      { type: "confirm", candidateId: "raft" },
      { type: "revise" },
      { type: "finishDrawing" },
      { type: "confirm", candidateId: "raft.keep" },
      { type: "seeSummary" },
    ]);
    expect(done.phase).toBe("summary");
    expect(reduce(done, { type: "replay" })).toEqual(initialState("river"));
    expect(reduce(done, { type: "nextMission" })).toEqual(initialState("sprout"));
  });
});
