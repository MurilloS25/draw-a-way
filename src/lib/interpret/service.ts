import { candidatesFor } from "../missions/engine";
import { readConfig, type InterpreterConfig } from "./config";
import { createFakeInterpreter, parseScenario } from "./fake";
import { createGroqInterpreter, type FetchLike } from "./groq";
import type { Limiter } from "./limiter";
import { validateRequest } from "./request";
import {
  InterpretError,
  InterpretationSchema,
  NO_MATCH,
  type FallbackReason,
  type InterpretResponse,
  type Interpreter,
} from "./types";

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
 * child-safe result: either a validated suggestion or a named fallback. The
 * suggestion is only ever a suggestion; the client still asks the child.
 * Nothing here logs, stores, or returns provider text.
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

  const { missionId, round, firstIdeaId, imageBase64 } = checked.value;
  const candidates = candidatesFor(missionId, round, firstIdeaId);
  if (candidates.length === 0) return { status: 400, body: { error: "bad_request" } };

  if (!deps.limiter.check(input.clientHint).ok) return fallback("rate_limited");

  try {
    const raw = await interpreter.interpret({
      missionId,
      round,
      candidates,
      imageBase64,
      signal: input.signal,
    });
    const parsed = InterpretationSchema.safeParse(raw);
    if (!parsed.success) return fallback("invalid_response");
    const { candidateId, confidence } = parsed.data;
    if (candidateId === NO_MATCH) return fallback("unsure");
    if (!candidates.some((c) => c.id === candidateId)) return fallback("invalid_response");
    return { status: 200, body: { status: "ok", candidateId, confidence, source: interpreter.name } };
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
