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
    flavor: "{Thing} does something we do not have a name for yet. It changes the scene in its own way.",
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

/** Plain, harmless words a decorative label may use. Anything else becomes "your invention". */
const LABEL_WORDS: ReadonlySet<string> = new Set([
  "airplane",
  "ant",
  "bag",
  "balloon",
  "barrel",
  "basket",
  "bat",
  "bear",
  "bed",
  "bee",
  "bell",
  "bicycle",
  "big",
  "bike",
  "bird",
  "black",
  "blanket",
  "blue",
  "board",
  "boat",
  "boots",
  "box",
  "brick",
  "bridge",
  "bright",
  "brown",
  "bucket",
  "bulb",
  "bunny",
  "bus",
  "bush",
  "butterfly",
  "candle",
  "canoe",
  "cape",
  "car",
  "cart",
  "castle",
  "cat",
  "cave",
  "chain",
  "climbing",
  "cloak",
  "cloud",
  "cow",
  "crab",
  "crane",
  "cushion",
  "dinosaur",
  "dog",
  "dolphin",
  "door",
  "dragon",
  "drum",
  "duck",
  "eagle",
  "elephant",
  "fast",
  "fence",
  "fire",
  "firefly",
  "fish",
  "flag",
  "floating",
  "flower",
  "fluffy",
  "flying",
  "fox",
  "friendly",
  "frog",
  "gate",
  "giant",
  "giraffe",
  "giraffe-bridge",
  "glowing",
  "golden",
  "grass",
  "green",
  "hammock",
  "happy",
  "hat",
  "helicopter",
  "hill",
  "horn",
  "horse",
  "house",
  "huge",
  "island",
  "jar",
  "jumping",
  "kangaroo",
  "kite",
  "ladder",
  "lake",
  "lamp",
  "lantern",
  "leaf",
  "light",
  "lighthouse",
  "lion",
  "little",
  "log",
  "long",
  "machine",
  "magic",
  "magical",
  "mirror",
  "monkey",
  "moon",
  "mountain",
  "mouse",
  "net",
  "night",
  "octopus",
  "orange",
  "owl",
  "paper",
  "parachute",
  "parrot",
  "path",
  "pebble",
  "penguin",
  "pig",
  "pillow",
  "pink",
  "plane",
  "plank",
  "pole",
  "pond",
  "pot",
  "purple",
  "rabbit",
  "raft",
  "rain",
  "rainbow",
  "red",
  "river",
  "road",
  "robot",
  "rock",
  "rocket",
  "rolling",
  "roof",
  "rope",
  "round",
  "sailboat",
  "sailing",
  "sea-horse",
  "seahorse",
  "shark",
  "sheep",
  "shining",
  "shiny",
  "ship",
  "shoes",
  "short",
  "sign",
  "signpost",
  "silver",
  "sleepy",
  "slide",
  "slow",
  "small",
  "snail",
  "snake",
  "snow",
  "soft",
  "spaceship",
  "spinning",
  "square",
  "stairs",
  "star",
  "stick",
  "stone",
  "string",
  "striped",
  "strong",
  "submarine",
  "sun",
  "swimming",
  "swing",
  "tall",
  "tent",
  "tiger",
  "tiny",
  "torch",
  "tower",
  "tractor",
  "trail",
  "train",
  "tree",
  "truck",
  "tunnel",
  "turtle",
  "umbrella",
  "unicorn",
  "vine",
  "wagon",
  "wall",
  "wave",
  "whale",
  "wheel",
  "whistle",
  "white",
  "wind",
  "wooden",
  "yellow",
]);

const LABEL_RE = /^[a-z]+(?:-[a-z]+)?(?: [a-z]+(?:-[a-z]+)?){0,1}$/;

/**
 * An optional decorative name for the invention. It is plain text, at most two
 * words, every word on a short allowlist of harmless nouns and adjectives, never
 * used to choose rules, and replaced by "your invention" when anything is off.
 * (A blocklist would always leak; an allowlist cannot carry an insult or an
 * instruction, whatever a model or a drawing says.)
 */
export function sanitizeLabel(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const t = input.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  if (t.length < 2 || t.length > 24 || !LABEL_RE.test(t)) return null;
  return t.split(" ").every((w) => LABEL_WORDS.has(w)) ? t : null;
}

export function thingName(label: string | null | undefined, capitalize = false): string {
  const t = label ? `your ${label}` : "your invention";
  return capitalize ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
