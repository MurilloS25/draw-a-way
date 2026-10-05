import { Game } from "@/components/Game";

// Rendered per request so the CSP nonce is fresh (docs/decisions/0004).
export const dynamic = "force-dynamic";

export default function Page() {
  return <Game />;
}
