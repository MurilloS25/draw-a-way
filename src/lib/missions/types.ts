export type MissionId = "river" | "sprout" | "fog";

export type Motion = "steady" | "bouncy" | "float" | "swing";

export interface Refinement {
  /** Unique within the mission, e.g. "bridge.rail". */
  id: string;
  label: string;
  hint: string;
  ending: string;
}

export interface Idea {
  /** Unique within the mission, e.g. "bridge". */
  id: string;
  label: string;
  /** Plain-language description, also used as accessible text. */
  hint: string;
  consequence: string;
  complication: string;
  motion: Motion;
  /** Two changes plus a final "keep it" refinement. */
  refinements: [Refinement, Refinement, Refinement];
}

export interface Mission {
  id: MissionId;
  title: string;
  story: string;
  goal: string;
  drawPrompt: string;
  /** Text description of the scene for non-visual use. */
  sceneAlt: string;
  ideas: Idea[];
}
