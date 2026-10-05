import { z } from "zod";
import type { Candidate, Round } from "../missions/engine";
import type { MissionId } from "../missions/types";

export const CONFIDENCES = ["low", "medium", "high"] as const;

/** The only shape an interpreter may produce. Anything else is discarded. */
export const InterpretationSchema = z
  .object({
    candidateId: z.string().min(1).max(64),
    confidence: z.enum(CONFIDENCES),
  })
  .strict();

export type Interpretation = z.infer<typeof InterpretationSchema>;

export type FailureKind = "unavailable" | "rate_limited" | "timeout" | "invalid" | "aborted";

export class InterpretError extends Error {
  constructor(
    public readonly kind: FailureKind,
    public readonly retryAfterSeconds?: number,
  ) {
    // Deliberately generic: never include provider text, keys, or content.
    super(kind);
    this.name = "InterpretError";
  }
}

export interface InterpretInput {
  missionId: MissionId;
  round: Round;
  candidates: Candidate[];
  /** Validated PNG, base64 without a data URL prefix. */
  imageBase64: string;
  signal: AbortSignal;
}

/**
 * Adapter boundary. Implementations return untrusted, unvalidated data; the
 * service validates it against InterpretationSchema and the candidate list.
 */
export interface Interpreter {
  readonly name: "fake" | "groq";
  interpret(input: InterpretInput): Promise<unknown>;
}

export type FallbackReason =
  | "disabled"
  | "rate_limited"
  | "unavailable"
  | "invalid_response"
  | "timeout"
  | "unsure";

export type InterpretResponse =
  | { status: "ok"; candidateId: string; confidence: Interpretation["confidence"]; source: "fake" | "groq" }
  | { status: "fallback"; reason: FallbackReason };

export const NO_MATCH = "none";
