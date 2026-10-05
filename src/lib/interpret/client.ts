import type { Round } from "../missions/engine";
import type { MissionId } from "../missions/types";
import { exportPngBase64 } from "../drawing/render";
import type { Stroke } from "../drawing/model";
import type { InterpretResponse } from "./types";

export interface Capabilities {
  remote: boolean;
  source: "fake" | "groq" | null;
}

const NONE: Capabilities = { remote: false, source: null };

export async function fetchCapabilities(signal?: AbortSignal): Promise<Capabilities> {
  try {
    const res = await fetch("/api/capabilities", { cache: "no-store", signal });
    if (!res.ok) return NONE;
    const data: unknown = await res.json();
    const d = data as Partial<Capabilities>;
    return d && d.remote === true && (d.source === "fake" || d.source === "groq")
      ? { remote: true, source: d.source }
      : NONE;
  } catch {
    return NONE;
  }
}

const REASONS = ["disabled", "rate_limited", "unavailable", "invalid_response", "timeout", "unsure"] as const;

/**
 * Sends one explicitly requested interpretation. Any failure, malformed reply,
 * or cancellation resolves to a fallback; the caller never needs a try/catch.
 */
export async function requestInterpretation(
  args: { missionId: MissionId; round: Round; firstIdeaId?: string; strokes: readonly Stroke[] },
  signal: AbortSignal,
): Promise<InterpretResponse> {
  const imageBase64 = exportPngBase64(args.strokes);
  if (!imageBase64) return { status: "fallback", reason: "unavailable" };
  try {
    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        missionId: args.missionId,
        round: args.round,
        ...(args.firstIdeaId ? { firstIdeaId: args.firstIdeaId } : {}),
        imageBase64,
      }),
    });
    if (!res.ok) return { status: "fallback", reason: "unavailable" };
    const data = (await res.json()) as Partial<InterpretResponse> & Record<string, unknown>;
    if (data.status === "ok" && typeof data.candidateId === "string") {
      return {
        status: "ok",
        candidateId: data.candidateId,
        confidence: data.confidence === "high" || data.confidence === "low" ? data.confidence : "medium",
        source: data.source === "groq" ? "groq" : "fake",
      };
    }
    const reason = (REASONS as readonly unknown[]).includes(data.reason) ? (data.reason as (typeof REASONS)[number]) : "unavailable";
    return { status: "fallback", reason };
  } catch {
    return { status: "fallback", reason: "unavailable" };
  }
}
