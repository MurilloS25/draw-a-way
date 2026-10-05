import { z } from "zod";
import { CapabilityOrUnknownSchema, type Capability } from "../capabilities";
import type { SceneIndex } from "../missions/engine";
import type { MissionId } from "../missions/types";

export const CONFIDENCES = ["low", "medium", "high"] as const;

/**
 * The only shape an interpreter may produce: a functional proposal. It cannot
 * carry story text, rules, or instructions; the child still confirms.
 */
export const InterpretationSchema = z
  .object({
    proposed_affordances: z.array(CapabilityOrUnknownSchema).min(1).max(2),
    optional_safe_label: z.string().max(60).nullable(),
    confidence: z.enum(CONFIDENCES),
    uncertain: z.boolean(),
    needs_child_confirmation: z.boolean(),
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
  scene: SceneIndex;
  /** Capabilities the child confirmed in earlier scenes. */
  priorCaps: Capability[];
  /** Validated PNG (scene, persistent elements, current strokes), base64 without a prefix. */
  imageBase64: string;
  signal: AbortSignal;
}

/**
 * Adapter boundary. Implementations return untrusted, unvalidated data; the
 * service validates it against InterpretationSchema and the capability list.
 */
export interface Interpreter {
  readonly name: "fake" | "groq";
  interpret(input: InterpretInput): Promise<unknown>;
}

export type FallbackReason = "disabled" | "rate_limited" | "unavailable" | "invalid_response" | "timeout" | "unsure";

export type InterpretResponse =
  | {
      status: "ok";
      /** One or two real capabilities (never "unknown"; that is a fallback). */
      capabilities: Capability[];
      /** Vetted decorative name, or null. */
      label: string | null;
      source: "fake" | "groq";
    }
  | { status: "fallback"; reason: FallbackReason };
