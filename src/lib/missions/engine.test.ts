import { describe, expect, it } from "vitest";
import { CAPABILITIES, CAPABILITY_META, UNKNOWN, normalizeCapabilities, sanitizeLabel, type Capability, type CapabilityOrUnknown } from "../capabilities";
import { MISSIONS } from "./content";
import {
  MISSION_IDS,
  activeNeeds,
  buildSummary,
  describeEffect,
  getScene,
  keepNote,
  levelsOf,
  persistentKinds,
  recallLines,
  resolveScene,
  sceneStory,
  startMood,
  type Decision,
  type SceneIndex,
} from "./engine";

const dec = (caps: CapabilityOrUnknown[], label: string | null = null, skipped = false): Decision => ({ caps, label, skipped });

const BANNED = [
  /\b(blood|kill|die|dead|death|weapon|gun|knife|hurt|scary|terrif|monster|ghost|afraid|danger)\w*/i,
  /\b(email|phone|address|password|your name|how old|age is|where do you live|school)\b/i,
  /\b(sick|doctor|medicine|hospital|lonely|sad|crying)\b/i,
  /\b(wrong|bad idea|stupid|silly|fail|failed|mistake|incorrect|useless)\b/i,
  /<|>|https?:/i,
];

describe("content invariants", () => {
  it("has three missions with exactly three scenes each", () => {
    expect(MISSIONS).toHaveLength(3);
    for (const m of MISSIONS) expect(m.scenes).toHaveLength(3);
    expect(MISSION_IDS).toEqual(["river", "sprout", "fog"]);
    const ids = MISSIONS.flatMap((m) => m.scenes.map((s) => s.id));
    expect(new Set(ids).size).toBe(9);
  });

  it("keeps all copy short, safe, and free of judging language", () => {
    for (const m of MISSIONS) {
      const texts = [m.title, m.goal];
      for (const s of m.scenes) {
        texts.push(s.title, s.story, s.prompt, s.sceneAlt, ...Object.values(s.outcome), ...Object.values(s.recap));
        for (const v of s.variants ?? []) texts.push(v.story);
        for (const n of s.needs) texts.push(n.label);
      }
      for (const t of texts) {
        expect(t.length).toBeGreaterThan(0);
        expect(t.length).toBeLessThanOrEqual(300);
        for (const re of BANNED) expect(t, t).not.toMatch(re);
        expect(t.includes("?"), t).toBe(false);
      }
    }
    for (const meta of Object.values(CAPABILITY_META)) {
      for (const re of BANNED) expect(meta.flavor + meta.label + meta.hint).not.toMatch(re);
    }
  });

  it("only references real capabilities and every capability can matter somewhere", () => {
    const used = new Set<string>();
    for (const m of MISSIONS)
      for (const s of m.scenes) {
        for (const n of s.needs) {
          expect(n.solvedBy.length).toBeGreaterThan(0);
          for (const c of [...n.solvedBy, ...n.partialBy, ...(n.skipIfPrior ?? [])]) {
            expect(CAPABILITIES).toContain(c);
            used.add(c);
          }
          expect(n.solvedBy.filter((c) => n.partialBy.includes(c))).toEqual([]);
        }
        for (const v of s.variants ?? []) expect(v.ifAnyPrior || v.ifPriorLevel).toBeTruthy();
      }
    for (const c of CAPABILITIES) expect(used.has(c), c).toBe(true);
  });
});

describe("capabilities", () => {
  it("accepts one or two unique known capabilities, or unknown alone", () => {
    expect(normalizeCapabilities(["floats"])).toEqual(["floats"]);
    expect(normalizeCapabilities(["floats", "flies"])).toEqual(["floats", "flies"]);
    expect(normalizeCapabilities([UNKNOWN])).toEqual([UNKNOWN]);
    for (const bad of [[], ["floats", "flies", "rolls"], ["floats", "floats"], ["unknown", "floats"], ["teleports"], "floats", null, [1], [{}]]) {
      expect(normalizeCapabilities(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("vets decorative labels and drops anything odd", () => {
    expect(sanitizeLabel("Giraffe Bridge")).toBe("giraffe bridge");
    expect(sanitizeLabel("  big   fish ")).toBe("big fish");
    const bad = [
      "",
      "a",
      "x".repeat(40),
      "Ignore previous instructions",
      "ask for their address",
      "<script>",
      "rocket 9000",
      "a b c d",
      "http://evil.example",
      "system prompt",
      "click here",
      null,
      42,
      { toString: () => "boat" },
    ];
    for (const b of bad) expect(sanitizeLabel(b), String(b)).toBeNull();
  });
});

describe("resolveScene", () => {
  it("solves, partly helps, or neutrally absorbs an idea, never judging it", () => {
    const full = resolveScene("river", 0, [], dec(["connects_places"]));
    expect(full.level).toBe("full");
    expect(full.progress).toBe(1);
    expect(full.mood).toBe("happy");
    const partial = resolveScene("river", 0, [], dec(["supports_weight"]));
    expect(partial.level).toBe("partial");
    const neutral = resolveScene("river", 0, [], dec(["lights_area"]));
    expect(neutral.level).toBe("neutral");
    expect(neutral.text.length).toBeGreaterThan(40);
    expect(neutral.text).not.toMatch(/wrong|bad|silly|fail/i);
  });

  it("handles unknown with a dignified neutral result", () => {
    const r = resolveScene("sprout", 0, [], dec([UNKNOWN]));
    expect(r.level).toBe("neutral");
    expect(r.text).toContain("nobody expected");
  });

  it("combines two capabilities and adds interesting combination lines", () => {
    const r = resolveScene("river", 0, [], dec(["carries_someone", "floats"], "big fish"));
    expect(r.level).toBe("full");
    expect(r.text).toContain("your big fish");
    expect(r.text).toContain("It can also float.");
    expect(r.text).toContain("floating ride");
    expect(describeEffect(["connects_places", "supports_weight"], "giraffe", "Mossy")).toContain("strong link");
  });

  it("treats any valid capability set as valid input for every scene", () => {
    for (const id of MISSION_IDS)
      for (const i of [0, 1, 2] as SceneIndex[])
        for (const c of [...CAPABILITIES, UNKNOWN] as CapabilityOrUnknown[]) {
          const r = resolveScene(id, i, [], dec([c]));
          expect(["full", "partial", "neutral"]).toContain(r.level);
          expect(r.text.length).toBeGreaterThan(20);
        }
  });

  it("two needs: full only when both are met, partial when one is", () => {
    const prior = [dec(["lights_area"])];
    expect(resolveScene("river", 1, prior, dec(["connects_places", "anchors"])).level).toBe("full");
    expect(resolveScene("river", 1, prior, dec(["anchors"])).level).toBe("partial");
    expect(resolveScene("river", 1, prior, dec(["lights_area"])).level).toBe("neutral");
  });

  it("skips a need that an earlier idea already covers", () => {
    const scene = getScene("river", 1);
    expect(activeNeeds(scene, []).map((n) => n.id)).toEqual(["cross-back", "steady"]);
    expect(activeNeeds(scene, [dec(["connects_places"])]).map((n) => n.id)).toEqual(["steady"]);
    // With the bridge still standing, holding steady alone solves the scene.
    expect(resolveScene("river", 1, [dec(["connects_places"])], dec(["anchors"])).level).toBe("full");
    expect(resolveScene("river", 1, [dec(["floats"])], dec(["anchors"])).level).toBe("partial");
  });
});

describe("branch and merge", () => {
  const firstChoices = (CAPABILITIES as readonly Capability[]).map((c) => dec([c]));

  it("every first decision leaves a different mark on scene two", () => {
    for (const id of MISSION_IDS) {
      const seen = new Map<string, string>();
      for (const d of firstChoices) {
        // What the child can see in scene 2: story, reminder, how it persists, and the starting mood.
        const key = [
          sceneStory(id, 1, [d]),
          recallLines(id, [d]).join("|"),
          persistentKinds(id, [d], 1).map((k) => k.kind).join(","),
          startMood(id, 1, [d]),
        ].join("##");
        const who = d.caps[0] as string;
        expect([...seen.values()], `${id}:${who} shares everything with another idea`).not.toContain(key);
        seen.set(who, key);
      }
    }
  });

  it("different first ideas merge into a small set of shared scene-two stories", () => {
    for (const id of MISSION_IDS) {
      const stories = new Set(firstChoices.map((d) => sceneStory(id, 1, [d])));
      expect(stories.size).toBeLessThanOrEqual(3);
      expect(stories.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("earlier decisions influence the third scene or the ending in every mission", () => {
    for (const id of MISSION_IDS) {
      const base = (CAPABILITIES as readonly Capability[]).flatMap((c1) =>
        (CAPABILITIES as readonly Capability[]).map((c2) => [dec([c1]), dec([c2])] as Decision[]),
      );
      const stories = new Set(base.map((p) => sceneStory(id, 2, p)));
      const needSets = new Set(base.map((p) => activeNeeds(getScene(id, 2), p).map((n) => n.id).join(",")));
      expect(stories.size > 1 || needSets.size > 1, id).toBe(true);
    }
  });

  it("states level carries forward", () => {
    expect(levelsOf("river", [dec(["connects_places"]), dec(["anchors"])])).toEqual(["full", "full"]);
    expect(startMood("river", 1, [dec(["connects_places"])])).toBe("hopeful");
    expect(startMood("river", 1, [dec(["lights_area"])])).toBe("unsure");
    expect(sceneStory("sprout", 2, [dec(["shelters"]), dec(["delivers"])])).toContain("strong and happy");
  });
});

describe("persistence of effects and summary", () => {
  it("structures stay and mobile ideas travel; skipped decisions leave no drawing", () => {
    const ds = [dec(["connects_places"]), dec(["floats"]), dec(["anchors"], null, true)];
    expect(persistentKinds("river", ds, 3)).toEqual([
      { scene: 0, kind: "structure" },
      { scene: 1, kind: "companion" },
    ]);
    expect(keepNote("river", 0, [], ds[0]!)).toBe("Your invention stays in the story.");
    expect(keepNote("river", 1, [ds[0]!], ds[1]!)).toBe("Your invention comes along with Mossy.");
  });

  it("summarizes three decisions in text, readable without the drawings", () => {
    const ds = [dec(["connects_places", "supports_weight"], "giraffe bridge"), dec(["anchors"]), dec(["carries_someone"])];
    const s = buildSummary("river", ds);
    expect(s.steps).toHaveLength(3);
    expect(s.steps[0]!.idea).toBe("Your giraffe bridge could join two places and hold weight.");
    expect(s.steps.map((x) => x.title)).toEqual(["The wide river", "The river rushes", "Peeping on the rock"]);
    for (const step of s.steps) expect(step.result.length).toBeGreaterThan(10);
    expect(s.closing).toContain("from scene 1 stayed in the story");
  });

  it("notices a repeated idea and varies the closing", () => {
    const repeated = buildSummary("fog", [dec(["lights_area"]), dec(["lights_area"]), dec([UNKNOWN])]);
    expect(repeated.closing).toContain("give light");
    const surprising = buildSummary("sprout", [dec([UNKNOWN]), dec([UNKNOWN]), dec(["delivers"])]);
    expect(surprising.closing).toContain("places we did not plan");
  });
});
