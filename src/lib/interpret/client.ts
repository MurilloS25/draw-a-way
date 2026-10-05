import { CapabilitySchema, normalizeCapabilities, sanitizeLabel, type Capability } from "../capabilities";
import type { SceneIndex } from "../missions/engine";
import type { MissionId } from "../missions/types";
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
    const d = (await res.json()) as Partial<Capabilities>;
    return d && d.remote === true && (d.source === "fake" || d.source === "groq")
      ? { remote: true, source: d.source }
      : NONE;
  } catch {
    return NONE;
  }
}

const REASONS = ["disabled", "rate_limited", "unavailable", "invalid_response", "timeout", "unsure"] as const;

/**
 * Sends one explicitly requested interpretation of the composite picture. Any
 * failure, malformed reply, or cancellation resolves to a fallback; the caller
 * never needs a try/catch, and re-validates what comes back.
 */
export async function requestInterpretation(
  args: { missionId: MissionId; scene: SceneIndex; priorCaps: Capability[]; imageBase64: string },
  signal: AbortSignal,
): Promise<InterpretResponse> {
  try {
    const res = await fetch("/api/interpret", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        missionId: args.missionId,
        scene: args.scene,
        ...(args.priorCaps.length ? { priorCaps: args.priorCaps } : {}),
        imageBase64: args.imageBase64,
      }),
    });
    if (!res.ok) return { status: "fallback", reason: "unavailable" };
    const data = (await res.json()) as Record<string, unknown>;
    if (data.status === "ok") {
      const caps = normalizeCapabilities(data.capabilities);
      if (caps && caps.every((c) => CapabilitySchema.safeParse(c).success)) {
        return {
          status: "ok",
          capabilities: caps as Capability[],
          label: sanitizeLabel(data.label),
          source: data.source === "groq" ? "groq" : "fake",
        };
      }
      return { status: "fallback", reason: "invalid_response" };
    }
    const reason = (REASONS as readonly unknown[]).includes(data.reason) ? (data.reason as (typeof REASONS)[number]) : "unavailable";
    return { status: "fallback", reason };
  } catch {
    return { status: "fallback", reason: "unavailable" };
  }
}
