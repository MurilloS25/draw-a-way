import { z } from "zod";

/**
 * What an idea can DO, not what it is. The story reacts to these reusable
 * capabilities, so an unexpected invention (a giraffe bridge, a rocket with
 * floats) is still handled honestly. An idea combines at most two.
 */
export const CAPABILITIES = [
  "connects_places",
  "carries_someone",
  "floats",
  "flies",
  "rolls",
  "pushes_or_pulls",
  "shelters",
  "blocks",
  "anchors",
  "supports_weight",
  "lights_area",
  "signals",
  "marks_path",
  "delivers",
] as const;

export const UNKNOWN = "unknown" as const;

export type Capability = (typeof CAPABILITIES)[number];
export type CapabilityOrUnknown = Capability | typeof UNKNOWN;

export const MAX_CAPABILITIES = 2;

export const CapabilitySchema = z.enum(CAPABILITIES);
export const CapabilityOrUnknownSchema = z.enum([...CAPABILITIES, UNKNOWN]);

interface Meta {
  /** Button text. */
  label: string;
  /** Completes "Your idea can ...". */
  phrase: string;
  /** Short explanation for the picker and the model prompt. */
  hint: string;
  /** Story sentence; {Thing} and {hero} are filled in by the engine. */
  flavor: string;
}

export const CAPABILITY_META: Record<CapabilityOrUnknown, Meta> = {
  connects_places: {
    label: "Join two places",
    phrase: "join two places",
    hint: "Links one side to another.",
    flavor: "{Thing} joins the two sides, so {hero} can pass between them.",
  },
  carries_someone: {
    label: "Carry someone",
    phrase: "carry someone",
    hint: "Takes a character along with it.",
    flavor: "{hero} climbs aboard {thing} and gets carried along.",
  },
  floats: {
    label: "Float",
    phrase: "float",
    hint: "Stays up on water or soft ground.",
    flavor: "{Thing} floats and stays up, even where it is wet or soft.",
  },
  flies: {
    label: "Fly",
    phrase: "fly",
    hint: "Goes up into the air.",
    flavor: "{Thing} lifts into the air and goes above the trouble.",
  },
  rolls: {
    label: "Roll",
    phrase: "roll",
    hint: "Rolls or glides along.",
    flavor: "{Thing} rolls along smoothly, so the way goes quickly.",
  },
  pushes_or_pulls: {
    label: "Push or pull",
    phrase: "push or pull things",
    hint: "Moves things that are stuck or far.",
    flavor: "{Thing} pushes and pulls, moving what was stuck.",
  },
  shelters: {
    label: "Give shelter",
    phrase: "give shelter",
    hint: "Covers or protects a place.",
    flavor: "{Thing} makes a sheltered spot where it is calm and protected.",
  },
  blocks: {
    label: "Block things",
    phrase: "block things",
    hint: "Stands in the way of wind, water, or other things.",
    flavor: "{Thing} stands in the way of whatever was coming.",
  },
  anchors: {
    label: "Hold things in place",
    phrase: "hold things in place",
    hint: "Keeps something from sliding or blowing away.",
    flavor: "{Thing} holds everything firmly in place.",
  },
  supports_weight: {
    label: "Hold weight",
    phrase: "hold weight",
    hint: "Is strong enough to carry a load.",
    flavor: "{Thing} is strong enough to hold weight without bending.",
  },
  lights_area: {
    label: "Give light",
    phrase: "give light",
    hint: "Glows and lights up the area.",
    flavor: "{Thing} glows and lights up the area around it.",
  },
  signals: {
    label: "Send a signal",
    phrase: "send a signal",
    hint: "Can be seen or heard from far away.",
    flavor: "{Thing} sends a clear signal that can be noticed from far away.",
  },
  marks_path: {
    label: "Mark a path",
    phrase: "mark a path",
    hint: "Shows which way to go.",
    flavor: "{Thing} marks out a path that is easy to follow.",
  },
  delivers: {
    label: "Deliver or store things",
    phrase: "deliver or store things",
    hint: "Holds things and brings them somewhere.",
    flavor: "{Thing} holds things safely and brings them where they need to go.",
  },
  unknown: {
    label: "Something else",
    phrase: "do something we have not named yet",
    hint: "It does something different from these.",
    flavor: "{Thing} does something nobody expected. It is hard to say exactly what, but it changes the scene.",
  },
};

/** Picker layout. Groups only organise the buttons; they carry no rules. */
export const CAPABILITY_GROUPS: { title: string; items: Capability[] }[] = [
  { title: "Get somewhere", items: ["connects_places", "carries_someone", "floats", "flies", "rolls"] },
  { title: "Hold and protect", items: ["supports_weight", "anchors", "shelters", "blocks"] },
  { title: "Move things", items: ["pushes_or_pulls", "delivers"] },
  { title: "Show the way", items: ["lights_area", "signals", "marks_path"] },
];

/** Ideas that stay in the scene as a structure. */
export const STRUCTURAL: readonly Capability[] = [
  "connects_places",
  "supports_weight",
  "anchors",
  "shelters",
  "blocks",
  "lights_area",
  "signals",
  "marks_path",
];

/** Ideas that travel with the character as a companion. */
export const MOBILE: readonly Capability[] = ["carries_someone", "floats", "flies", "rolls", "pushes_or_pulls", "delivers"];

export const COMBO_LINES: { caps: [Capability, Capability]; text: string }[] = [
  { caps: ["carries_someone", "floats"], text: "A floating ride is a lovely way to travel." },
  { caps: ["carries_someone", "flies"], text: "Up in the air, the whole scene looks small and clear." },
  { caps: ["connects_places", "supports_weight"], text: "A strong link like that can hold a whole crowd." },
  { caps: ["flies", "signals"], text: "A flying signal can be seen from everywhere." },
  { caps: ["shelters", "anchors"], text: "Sheltered and held down, nothing is going anywhere." },
  { caps: ["lights_area", "marks_path"], text: "A lit path is easy to follow, even in the dark." },
];

/** Normalizes picked capabilities: unique, valid, at most two, "unknown" only on its own. */
export function normalizeCapabilities(input: unknown): CapabilityOrUnknown[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_CAPABILITIES) return null;
  const parsed = z.array(CapabilityOrUnknownSchema).safeParse(input);
  if (!parsed.success) return null;
  const unique = [...new Set(parsed.data)];
  if (unique.length !== parsed.data.length) return null;
  if (unique.includes(UNKNOWN) && unique.length > 1) return null;
  return unique;
}

export function describeCapabilities(caps: readonly CapabilityOrUnknown[]): string {
  return caps.map((c) => CAPABILITY_META[c].phrase).join(" and ");
}

const LABEL_RE = /^[A-Za-z][A-Za-z'-]*(?: [A-Za-z][A-Za-z'-]*){0,2}$/;
const LABEL_BLOCK =
  /(ignore|instruction|system|prompt|assistant|password|address|phone|email|http|www|click|follow|obey|name is|\bkill|\bdie\b|blood|weapon|gun\b)/i;

/**
 * An optional decorative name for the invention. It is plain text, short, never
 * used to choose rules, and replaced by "your invention" when anything is off.
 */
export function sanitizeLabel(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const t = input.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  if (t.length < 2 || t.length > 24) return null;
  if (!LABEL_RE.test(t) || LABEL_BLOCK.test(t)) return null;
  return t;
}

export function thingName(label: string | null | undefined, capitalize = false): string {
  const t = label ? `your ${label}` : "your invention";
  return capitalize ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
