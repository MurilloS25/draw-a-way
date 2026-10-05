import type { Capability } from "../capabilities";

export type MissionId = "river" | "sprout" | "fog";
export type Level = "full" | "partial" | "neutral";
export type Mood = "hopeful" | "happy" | "unsure" | "curious";

/** Something the scene needs. Solved fully by `solvedBy`, helped by `partialBy`. */
export interface Need {
  id: string;
  /** Short plain phrase, used in the summary: "cross the river". */
  label: string;
  solvedBy: Capability[];
  partialBy: Capability[];
  /** Skipped when an earlier confirmed idea already covers it. */
  skipIfPrior?: Capability[];
}

export interface StoryVariant {
  /** Matches when any earlier confirmed idea had one of these capabilities. */
  ifAnyPrior?: Capability[];
  /** Matches when the previous scene ended at this level. */
  ifPriorLevel?: Level;
  story: string;
}

export interface Scene {
  id: string;
  title: string;
  story: string;
  variants?: StoryVariant[];
  prompt: string;
  /** Safe, plain description of the picture, for screen readers and the helper. */
  sceneAlt: string;
  needs: Need[];
  outcome: Record<Level, string>;
  recap: Record<Level, string>;
}

export interface Mission {
  id: MissionId;
  title: string;
  goal: string;
  hero: string;
  scenes: [Scene, Scene, Scene];
}
