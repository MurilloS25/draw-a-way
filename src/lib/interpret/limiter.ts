import { createHash, randomBytes } from "node:crypto";
import { INTERPRET_LIMITS } from "./config";

export type LimitDecision = { ok: true } | { ok: false };

export interface Limiter {
  check(clientHint: string): LimitDecision;
  /** Called when the provider says 429; pauses all calls until the time passes. */
  cooldown(seconds: number): void;
}

/**
 * Best-effort, in-memory limiter. On serverless platforms each instance has
 * its own memory, so this is NOT a global limit; it only reduces accidental
 * bursts and fails closed on this instance. Client hints are hashed with a
 * per-process random salt and are never written anywhere.
 */
export function createLimiter(options: { perClientPerMinute?: number; perDay?: number; now?: () => number } = {}): Limiter {
  const perMinute = options.perClientPerMinute ?? INTERPRET_LIMITS.perClientPerMinute;
  const perDay = options.perDay ?? INTERPRET_LIMITS.perDay;
  const now = options.now ?? Date.now;
  const salt = randomBytes(16);
  const buckets = new Map<string, { windowStart: number; count: number }>();
  let day = { start: now(), count: 0 };
  let pausedUntil = 0;
  const MAX_BUCKETS = 500;

  return {
    check(clientHint) {
      const t = now();
      if (t < pausedUntil) return { ok: false };
      if (t - day.start >= 86_400_000) day = { start: t, count: 0 };
      if (day.count >= perDay) return { ok: false };

      const key = createHash("sha256").update(salt).update(clientHint.slice(0, 200)).digest("hex").slice(0, 16);
      let bucket = buckets.get(key);
      if (!bucket || t - bucket.windowStart >= 60_000) {
        if (buckets.size >= MAX_BUCKETS) {
          for (const [k, b] of buckets) if (t - b.windowStart >= 60_000) buckets.delete(k);
          // Still full of live buckets: fail closed rather than grow.
          if (buckets.size >= MAX_BUCKETS) return { ok: false };
        }
        bucket = { windowStart: t, count: 0 };
        buckets.set(key, bucket);
      }
      if (bucket.count >= perMinute) return { ok: false };
      bucket.count++;
      day.count++;
      return { ok: true };
    },
    cooldown(seconds) {
      const capped = Math.min(Math.max(Math.floor(seconds) || 30, 1), 3600);
      pausedUntil = Math.max(pausedUntil, now() + capped * 1000);
    },
  };
}
