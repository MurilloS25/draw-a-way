import { UNKNOWN, normalizeCapabilities, sanitizeLabel, type Capability } from "../capabilities";
import { readConfig, type InterpreterConfig } from "./config";
import { createFakeInterpreter, parseScenario } from "./fake";
import { createGroqInterpreter, type FetchLike } from "./groq";
import type { Limiter } from "./limiter";
import { validateRequest } from "./request";
import { InterpretError, InterpretationSchema, type FallbackReason, type InterpretResponse, type Interpreter } from "./types";

export interface ServiceDeps {
  config: InterpreterConfig;
  limiter: Limiter;
  fetchImpl: FetchLike;
}

export interface ServiceResult {
  status: 200 | 400 | 413 | 415;
  body: InterpretResponse | { error: "bad_request" | "too_large" | "unsupported_media_type" };
}

const fallback = (reason: FallbackReason): ServiceResult => ({
  status: 200,
  body: { status: "fallback", reason },
});

function buildInterpreter(deps: ServiceDeps, scenarioHeader: string | null, clientHint: string): Interpreter | null {
  const { config } = deps;
  if (config.mode === "fake") return createFakeInterpreter(parseScenario(scenarioHeader));
  if (config.mode === "groq" && config.groq) {
    return createGroqInterpreter({
      ...config.groq,
      fetchImpl: deps.fetchImpl,
      allowRetry: () => deps.limiter.check(clientHint).ok,
    });
  }
  return null;
}

/**
 * Orchestrates one explicit interpretation request. Always resolves to a
 * child-safe result: a validated functional proposal or a named fallback. The
 * proposal is only a suggestion; the client still asks the child, and only
 * what the child confirms changes the story. Nothing here logs, stores, or
 * returns provider text.
 */
export async function interpret(
  input: { rawBody: string; contentType: string | null; clientHint: string; scenario: string | null; signal: AbortSignal },
  deps: ServiceDeps,
): Promise<ServiceResult> {
  if (!/^application\/json\b/i.test(input.contentType ?? "")) {
    return { status: 415, body: { error: "unsupported_media_type" } };
  }
  const checked = validateRequest(input.rawBody);
  if (!checked.ok) {
    return { status: checked.status, body: { error: checked.status === 413 ? "too_large" : "bad_request" } };
  }
  const interpreter = buildInterpreter(deps, input.scenario, input.clientHint);
  if (!interpreter) return fallback("disabled");

  const { missionId, scene, priorCaps, imageBase64 } = checked.value;
  if (!deps.limiter.check(input.clientHint).ok) return fallback("rate_limited");

  try {
    const raw = await interpreter.interpret({ missionId, scene, priorCaps, imageBase64, signal: input.signal });
    const parsed = InterpretationSchema.safeParse(raw);
    if (!parsed.success) return fallback("invalid_response");
    const { proposed_affordances, optional_safe_label, confidence, uncertain } = parsed.data;
    const caps = normalizeCapabilities(proposed_affordances);
    if (!caps) return fallback("invalid_response");
    // Low confidence, "unknown", or an uncertain model: ask the child instead of guessing.
    if (caps.includes(UNKNOWN) || uncertain || confidence === "low") return fallback("unsure");
    return {
      status: 200,
      body: {
        status: "ok",
        capabilities: caps as Capability[],
        label: sanitizeLabel(optional_safe_label),
        source: interpreter.name,
      },
    };
  } catch (error) {
    const kind = error instanceof InterpretError ? error.kind : "unavailable";
    if (kind === "rate_limited") {
      deps.limiter.cooldown((error as InterpretError).retryAfterSeconds ?? 30);
      return fallback("rate_limited");
    }
    if (kind === "timeout") return fallback("timeout");
    if (kind === "invalid") return fallback("invalid_response");
    return fallback("unavailable");
  }
}

export { readConfig };
