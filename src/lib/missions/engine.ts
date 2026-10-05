import {
  CAPABILITY_META,
  COMBO_LINES,
  MOBILE,
  STRUCTURAL,
  UNKNOWN,
  describeCapabilities,
  thingName,
  type Capability,
  type CapabilityOrUnknown,
} from "../capabilities";
import { MISSIONS } from "./content";
import type { Level, Mission, MissionId, Mood, Need, Scene } from "./types";

export const SCENE_COUNT = 3;
export type SceneIndex = 0 | 1 | 2;

export const MISSION_IDS = MISSIONS.map((m) => m.id) as MissionId[];

/** What the child confirmed for one scene. Never contains model text except the vetted label. */
export interface Decision {
  caps: CapabilityOrUnknown[];
  label: string | null;
  skipped: boolean;
}

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === "string" && (MISSION_IDS as string[]).includes(value);
}

export function isSceneIndex(value: unknown): value is SceneIndex {
  return value === 0 || value === 1 || value === 2;
}

export function getMission(id: MissionId): Mission {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error("Unknown mission");
  return mission;
}

export function getScene(id: MissionId, index: SceneIndex): Scene {
  return getMission(id).scenes[index];
}

export function nextMissionId(id: MissionId): MissionId {
  return MISSION_IDS[(MISSION_IDS.indexOf(id) + 1) % MISSION_IDS.length] as MissionId;
}

const realCaps = (caps: readonly CapabilityOrUnknown[]): Capability[] => caps.filter((c): c is Capability => c !== UNKNOWN);

const priorCapsOf = (decisions: readonly Decision[]): Capability[] => [...new Set(decisions.flatMap((d) => realCaps(d.caps)))];

const intersects = (a: readonly Capability[], b: readonly Capability[]) => a.some((x) => b.includes(x));

/** Needs that still apply given the earlier ideas. */
export function activeNeeds(scene: Scene, prior: readonly Decision[]): Need[] {
  const earlier = priorCapsOf(prior);
  return scene.needs.filter((n) => !(n.skipIfPrior && intersects(n.skipIfPrior, earlier)));
}

/** The story text for a scene, shaped by earlier confirmed ideas. */
export function sceneStory(missionId: MissionId, index: SceneIndex, prior: readonly Decision[]): string {
  const scene = getScene(missionId, index);
  const earlier = priorCapsOf(prior);
  const priorLevel = prior.length ? levelsOf(missionId, prior).at(-1) : undefined;
  for (const v of scene.variants ?? []) {
    const capsOk = v.ifAnyPrior ? intersects(v.ifAnyPrior, earlier) : true;
    const levelOk = v.ifPriorLevel ? v.ifPriorLevel === priorLevel : true;
    if ((v.ifAnyPrior || v.ifPriorLevel) && capsOk && levelOk) return v.story;
  }
  return scene.story;
}

export type NeedStatus = "solved" | "helped" | "open";

export interface Consequence {
  level: Level;
  /** Full text: effect sentence(s) plus the scene's outcome. */
  text: string;
  mood: Mood;
  /** 0..1: how far the character travels in the scene. */
  progress: number;
  needs: { id: string; label: string; status: NeedStatus }[];
  keeps: "structure" | "companion" | "none";
}

const PROGRESS: Record<Level, number> = { full: 1, partial: 0.6, neutral: 0.3 };
const MOOD: Record<Level, Mood> = { full: "happy", partial: "unsure", neutral: "curious" };

function fill(template: string, thing: string, hero: string): string {
  return template
    .replace("{Thing}", thing.charAt(0).toUpperCase() + thing.slice(1))
    .replace("{thing}", thing)
    .replace("{hero}", hero);
}

/** What the idea does, from the confirmed capabilities alone. */
export function describeEffect(caps: readonly CapabilityOrUnknown[], label: string | null, hero: string): string {
  const [first, second] = caps;
  if (!first) return "";
  const thing = thingName(label);
  let text = fill(CAPABILITY_META[first].flavor, thing, hero);
  if (second) {
    text += ` It can also ${CAPABILITY_META[second].phrase}.`;
    const combo = COMBO_LINES.find(
      (c) => (c.caps[0] === first && c.caps[1] === second) || (c.caps[0] === second && c.caps[1] === first),
    );
    if (combo) text += ` ${combo.text}`;
  }
  return text;
}

/**
 * Resolves one scene from the confirmed capabilities. Pure and total: any
 * valid capability set yields a dignified result, including "unknown".
 */
export function resolveScene(
  missionId: MissionId,
  index: SceneIndex,
  prior: readonly Decision[],
  decision: Decision,
): Consequence {
  const mission = getMission(missionId);
  const scene = mission.scenes[index];
  const caps = realCaps(decision.caps);
  const needs = activeNeeds(scene, prior).map((n) => ({
    id: n.id,
    label: n.label,
    status: (intersects(n.solvedBy, caps) ? "solved" : intersects(n.partialBy, caps) ? "helped" : "open") as NeedStatus,
  }));
  const solved = needs.filter((n) => n.status === "solved").length;
  const helped = needs.filter((n) => n.status === "helped").length;
  let level: Level;
  if (needs.length > 0 && solved === needs.length) level = "full";
  else if (solved + helped > 0) level = "partial";
  else level = "neutral";

  const keeps: Consequence["keeps"] = intersects(caps, STRUCTURAL)
    ? "structure"
    : intersects(caps, MOBILE)
      ? "companion"
      : "none";
  const effect = describeEffect(decision.caps, decision.label, mission.hero);
  return {
    level,
    text: `${effect} ${scene.outcome[level]}`.trim(),
    mood: MOOD[level],
    progress: PROGRESS[level],
    needs,
    keeps,
  };
}

/** Levels for each decided scene, recomputed from the decisions (never trusted from storage). */
export function levelsOf(missionId: MissionId, decisions: readonly Decision[]): Level[] {
  return decisions.map((d, i) => resolveScene(missionId, i as SceneIndex, decisions.slice(0, i), d).level);
}

export function startMood(missionId: MissionId, index: SceneIndex, prior: readonly Decision[]): Mood {
  if (index === 0 || prior.length === 0) return "hopeful";
  return levelsOf(missionId, prior).at(-1) === "full" ? "hopeful" : "unsure";
}

/** One line telling the child what an earlier idea left behind. */
export function keepNote(missionId: MissionId, index: SceneIndex, prior: readonly Decision[], decision: Decision): string {
  const hero = getMission(missionId).hero;
  const keeps = resolveScene(missionId, index, prior, decision).keeps;
  const thing = thingName(decision.label);
  // A decision made without drawing leaves nothing on the page; only the story remembers it.
  if (decision.skipped) return `The story remembers what ${thing} did.`;
  if (keeps === "structure") return `${thing.charAt(0).toUpperCase()}${thing.slice(1)} stays in the story.`;
  if (keeps === "companion") return `${thing.charAt(0).toUpperCase()}${thing.slice(1)} comes along with ${hero}.`;
  return `The story remembers what ${thing} did.`;
}

export interface SummaryStep {
  title: string;
  idea: string;
  result: string;
  level: Level;
}

export interface Summary {
  steps: SummaryStep[];
  closing: string;
}

/** A complete text account of the three decisions, readable without the drawings. */
export function buildSummary(missionId: MissionId, decisions: readonly Decision[]): Summary {
  const mission = getMission(missionId);
  const levels = levelsOf(missionId, decisions);
  const steps: SummaryStep[] = decisions.map((d, i) => {
    const scene = mission.scenes[i as SceneIndex];
    const level = levels[i] as Level;
    return {
      title: scene.title,
      idea: `${thingName(d.label, true)} could ${describeCapabilities(d.caps)}.`,
      result: scene.recap[level],
      level,
    };
  });

  const fulls = levels.filter((l) => l === "full").length;
  const neutrals = levels.filter((l) => l === "neutral").length;
  let closing: string;
  if (fulls >= 2)
    closing = `Your ideas worked well together, and ${mission.hero} finished the adventure with things in good shape.`;
  else if (neutrals >= 2)
    closing = `Several ideas did not change the problem this time, but ${mission.hero} kept going, and the story remembered each one.`;
  else closing = `Some ideas helped a lot and some helped a little. ${mission.hero} kept going every time.`;

  const counts = new Map<Capability, number>();
  for (const d of decisions) for (const c of realCaps(d.caps)) counts.set(c, (counts.get(c) ?? 0) + 1);
  const repeated = [...counts].find(([, n]) => n >= 2)?.[0];
  if (repeated)
    closing += ` You came back to the idea of how to ${CAPABILITY_META[repeated].phrase} more than once, and the story remembered.`;

  const keepIndex = persistentKinds(missionId, decisions, 2).find((k) => k.kind === "structure")?.scene ?? -1;
  if (keepIndex >= 0) {
    closing += ` ${thingName(decisions[keepIndex]!.label, true)} from scene ${keepIndex + 1} stayed in the story.`;
  }
  return { steps, closing };
}

/** Plain-text reminders of earlier confirmed ideas, shown at the start of later scenes. */
export function recallLines(missionId: MissionId, prior: readonly Decision[]): string[] {
  return buildSummary(missionId, prior).steps.map((s, i) => `Scene ${i + 1}: ${s.idea}`);
}

/** Which earlier drawings stay on the scene, and how. Pure; used by the screen and the helper image. */
export function persistentKinds(
  missionId: MissionId,
  decisions: readonly Decision[],
  upTo: number,
): { scene: number; kind: "structure" | "companion" }[] {
  const out: { scene: number; kind: "structure" | "companion" }[] = [];
  for (let i = 0; i < Math.min(upTo, decisions.length); i++) {
    const d = decisions[i]!;
    if (d.skipped) continue;
    const keeps = resolveScene(missionId, i as SceneIndex, decisions.slice(0, i), d).keeps;
    if (keeps === "structure" || keeps === "companion") out.push({ scene: i, kind: keeps });
  }
  return out;
}
