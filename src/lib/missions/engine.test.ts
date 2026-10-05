import { describe, expect, it } from "vitest";
import { MISSIONS } from "./content";
import {
  candidatesFor,
  consequenceFor,
  endingFor,
  isCandidate,
  isMissionId,
  nextMissionId,
} from "./engine";

const BANNED = [
  /\b(blood|kill|die|dead|death|weapon|gun|knife|hurt|scary|terrif|monster|ghost)\w*/i,
  /\b(email|e-mail|phone|address|password|your name|how old|age is|where do you live|school)\b/i,
  /\b(sick|doctor|medicine|hospital|lonely|sad)\b/i,
  /<|>|https?:/i,
];

describe("mission content invariants", () => {
  it("has three missions with distinct ids and titles", () => {
    expect(MISSIONS).toHaveLength(3);
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(3);
    expect(new Set(MISSIONS.map((m) => m.title)).size).toBe(3);
  });

  for (const mission of MISSIONS) {
    describe(mission.id, () => {
      it("offers at least three allowed solutions with unique ids", () => {
        expect(mission.ideas.length).toBeGreaterThanOrEqual(3);
        expect(new Set(mission.ideas.map((i) => i.id)).size).toBe(mission.ideas.length);
      });

      it("gives each idea a distinct consequence, complication, and three refinements", () => {
        const consequences = new Set(mission.ideas.map((i) => i.consequence));
        expect(consequences.size).toBe(mission.ideas.length);
        for (const idea of mission.ideas) {
          expect(idea.refinements).toHaveLength(3);
          expect(idea.refinements[2].id).toBe(`${idea.id}.keep`);
          for (const r of idea.refinements) expect(r.id.startsWith(`${idea.id}.`)).toBe(true);
          expect(new Set(idea.refinements.map((r) => r.ending)).size).toBe(3);
        }
      });

      it("keeps all copy short, simple, and free of banned themes", () => {
        const texts: string[] = [mission.title, mission.story, mission.goal, mission.drawPrompt, mission.sceneAlt];
        for (const idea of mission.ideas) {
          texts.push(idea.label, idea.hint, idea.consequence, idea.complication);
          for (const r of idea.refinements) texts.push(r.label, r.hint, r.ending);
        }
        for (const t of texts) {
          expect(t.length).toBeLessThanOrEqual(260);
          expect(t.length).toBeGreaterThan(0);
          for (const re of BANNED) expect(t, t).not.toMatch(re);
          // No question that solicits information from the child inside story text.
          expect(t.includes("?")).toBe(false);
        }
      });
    });
  }
});

describe("candidates", () => {
  it("round 1 candidates are exactly the mission ideas", () => {
    const ids = candidatesFor("river", 1).map((c) => c.id);
    expect(ids).toEqual(["bridge", "stones", "raft", "rope"]);
  });

  it("round 2 candidates depend on the confirmed idea", () => {
    expect(candidatesFor("river", 2, "bridge").map((c) => c.id)).toEqual([
      "bridge.rail",
      "bridge.wide",
      "bridge.keep",
    ]);
    expect(candidatesFor("river", 2)).toEqual([]);
    expect(candidatesFor("river", 2, "nonsense")).toEqual([]);
  });

  it("rejects ids from another mission, round, or idea", () => {
    expect(isCandidate("river", 1, undefined, "signpost")).toBe(false);
    expect(isCandidate("river", 1, undefined, "bridge.rail")).toBe(false);
    expect(isCandidate("river", 2, "bridge", "stones.more")).toBe(false);
    expect(isCandidate("river", 2, "bridge", "bridge.rail")).toBe(true);
    expect(isCandidate("river", 1, undefined, { id: "bridge" })).toBe(false);
    expect(isCandidate("river", 1, undefined, "__proto__")).toBe(false);
  });
});

describe("consequences and endings", () => {
  it("returns content only for known ids", () => {
    expect(consequenceFor("river", "bridge")?.text).toContain("bridge");
    expect(consequenceFor("river", "unknown")).toBeUndefined();
    expect(endingFor("river", "bridge", "bridge.keep")?.kept).toBe(true);
    expect(endingFor("river", "bridge", "bridge.rail")?.kept).toBe(false);
    expect(endingFor("river", "bridge", "stones.more")).toBeUndefined();
  });

  it("cycles missions", () => {
    expect(nextMissionId("river")).toBe("sprout");
    expect(nextMissionId("fog")).toBe("river");
    expect(isMissionId("river")).toBe(true);
    expect(isMissionId("constructor")).toBe(false);
  });
});
