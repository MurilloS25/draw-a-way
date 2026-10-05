import { publicCapabilities, readConfig } from "@/lib/interpret/config";

export const dynamic = "force-dynamic";

/** Tells the browser only whether an explicit "ask the helper" button may be offered. */
export function GET() {
  return Response.json(publicCapabilities(readConfig(process.env)), {
    headers: { "cache-control": "no-store" },
  });
}
