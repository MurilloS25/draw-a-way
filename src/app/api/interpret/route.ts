import { INTERPRET_LIMITS, readLimits } from "@/lib/interpret/config";
import { createLimiter } from "@/lib/interpret/limiter";
import { interpret, readConfig } from "@/lib/interpret/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Per-instance memory only. See docs/GROQ.md: this is not a global limit.
const limiter = createLimiter(readLimits(process.env));

const NO_STORE = { "cache-control": "no-store" } as const;

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: NO_STORE });
}

/** Reads at most `max` characters; returns null when the body is larger. */
async function readLimited(req: Request, max: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (text.length > max) {
      await reader.cancel();
      return null;
    }
  }
  return text + decoder.decode();
}

export async function POST(req: Request) {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > INTERPRET_LIMITS.maxBodyChars * 2) {
    return json({ error: "too_large" }, 413);
  }
  const rawBody = await readLimited(req, INTERPRET_LIMITS.maxBodyChars);
  if (rawBody === null) return json({ error: "too_large" }, 413);

  const config = readConfig(process.env);
  const result = await interpret(
    {
      rawBody,
      contentType: req.headers.get("content-type"),
      // Forwarded-for headers are client-controlled, so they are not trusted: one shared bucket.
      clientHint: "all",
      scenario: config.mode === "fake" ? req.headers.get("x-fake-scenario") : null,
      signal: req.signal,
    },
    { config, limiter, fetchImpl: (url, init) => fetch(url, init) },
  );
  return json(result.body, result.status);
}
