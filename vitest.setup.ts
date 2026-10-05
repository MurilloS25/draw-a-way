import { afterEach, vi } from "vitest";

// Safety net: no unit test may reach a real network.
const blockedFetch = vi.fn(async () => {
  throw new Error("Real network access is blocked in tests; inject a fake fetch.");
});
vi.stubGlobal("fetch", blockedFetch);

afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
  vi.stubGlobal("fetch", blockedFetch);
});
