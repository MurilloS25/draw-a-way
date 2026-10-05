import { MISSIONS } from "./content";
import type { Idea, Mission, MissionId, Refinement } from "./types";

export const MISSION_IDS = MISSIONS.map((m) => m.id) as MissionId[];

export type Round = 1 | 2;

/** A choice the child can confirm: an idea in round 1, a refinement in round 2. */
export interface Candidate {
  id: string;
  label: string;
  hint: string;
}

export function isMissionId(value: unknown): value is MissionId {
  return typeof value === "string" && (MISSION_IDS as string[]).includes(value);
}

export function getMission(id: MissionId): Mission {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error("Unknown mission");
  return mission;
}

export function getIdea(missionId: MissionId, ideaId: string): Idea | undefined {
  return getMission(missionId).ideas.find((i) => i.id === ideaId);
}

export function nextMissionId(id: MissionId): MissionId {
  const i = MISSION_IDS.indexOf(id);
  return MISSION_IDS[(i + 1) % MISSION_IDS.length] as MissionId;
}

/**
 * The only values that may be confirmed for the given round. Round 2 depends
 * on the idea confirmed in round 1; with no such idea there are no candidates.
 */
export function candidatesFor(
  missionId: MissionId,
  round: Round,
  firstIdeaId?: string,
): Candidate[] {
  if (round === 1) {
    return getMission(missionId).ideas.map(({ id, label, hint }) => ({ id, label, hint }));
  }
  const idea = firstIdeaId ? getIdea(missionId, firstIdeaId) : undefined;
  return idea ? idea.refinements.map(({ id, label, hint }) => ({ id, label, hint })) : [];
}

export function isCandidate(
  missionId: MissionId,
  round: Round,
  firstIdeaId: string | undefined,
  candidateId: unknown,
): candidateId is string {
  return (
    typeof candidateId === "string" &&
    candidatesFor(missionId, round, firstIdeaId).some((c) => c.id === candidateId)
  );
}

export function getRefinement(
  missionId: MissionId,
  ideaId: string,
  refinementId: string,
): Refinement | undefined {
  return getIdea(missionId, ideaId)?.refinements.find((r) => r.id === refinementId);
}

export interface Consequence {
  text: string;
  motion: Idea["motion"];
  complication: string;
}

export function consequenceFor(missionId: MissionId, ideaId: string): Consequence | undefined {
  const idea = getIdea(missionId, ideaId);
  if (!idea) return undefined;
  return { text: idea.consequence, motion: idea.motion, complication: idea.complication };
}

export function endingFor(
  missionId: MissionId,
  ideaId: string,
  refinementId: string,
): { text: string; kept: boolean } | undefined {
  const refinement = getRefinement(missionId, ideaId, refinementId);
  return refinement ? { text: refinement.ending, kept: refinement.id.endsWith(".keep") } : undefined;
}
