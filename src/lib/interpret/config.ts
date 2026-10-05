/**
 * Server-side configuration. Reads only the variables documented in
 * .env.example and never exposes them to the client.
 */
export const GROQ_ALLOWED_MODELS = ["qwen/qwen3.8-27b"] as const;
export const DEFAULT_GROQ_MODEL = GROQ_ALLOWED_MODELS[0];

export const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export const INTERPRET_LIMITS = {
  maxBodyChars: 420_000,
  maxImageBytes: 300_000,
  minImageSide: 16,
  maxImageSide: 768,
  timeoutMs: 10_000,
  maxRetries: 1,
  maxResponseChars: 20_000,
  perClientPerMinute: 8,
  perDay: 300,
} as const;

export type Mode = "manual" | "fake" | "groq";

export interface InterpreterConfig {
  mode: Mode;
  groq?: { apiKey: string; model: string };
}

type Env = Record<string, string | undefined>;

/** Any problem degrades to "manual": the honest, provider-free mode. */
export function readConfig(env: Env): InterpreterConfig {
  const mode = (env.INTERPRETER_MODE ?? "manual").trim().toLowerCase();
  if (mode === "fake") return { mode: "fake" };
  if (mode !== "groq") return { mode: "manual" };

  const apiKey = (env.GROQ_API_KEY ?? "").trim();
  const model = (env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL).trim();
  const keyLooksValid = apiKey.length >= 20 && apiKey.length <= 200 && /^[\w-]+$/.test(apiKey);
  const modelAllowed = (GROQ_ALLOWED_MODELS as readonly string[]).includes(model);
  if (!keyLooksValid || !modelAllowed) return { mode: "manual" };
  return { mode: "groq", groq: { apiKey, model } };
}

/** What the browser is told. Never contains configuration values. */
export function publicCapabilities(config: InterpreterConfig): {
  remote: boolean;
  source: "fake" | "groq" | null;
} {
  return config.mode === "manual"
    ? { remote: false, source: null }
    : { remote: true, source: config.mode };
}

/**
 * Optional knobs for free-tier budgeting. Invalid values fall back to the
 * defaults and nothing can exceed the hard ceilings.
 */
export const LIMIT_CEILINGS = { perClientPerMinute: 60, perDay: 2000 } as const;

export function readLimits(env: Env): { perClientPerMinute: number; perDay: number } {
  const pick = (raw: string | undefined, fallback: number, ceiling: number) => {
    const n = Number.parseInt(raw ?? "", 10);
    return Number.isInteger(n) && n >= 1 ? Math.min(n, ceiling) : fallback;
  };
  return {
    perClientPerMinute: pick(env.INTERPRET_PER_MINUTE, INTERPRET_LIMITS.perClientPerMinute, LIMIT_CEILINGS.perClientPerMinute),
    perDay: pick(env.INTERPRET_PER_DAY, INTERPRET_LIMITS.perDay, LIMIT_CEILINGS.perDay),
  };
}
