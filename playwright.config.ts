import { defineConfig, devices } from "@playwright/test";

// Both servers run the production build (`npm run build` first), bound to loopback.
export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npx next start -H 127.0.0.1 -p 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      env: { INTERPRETER_MODE: "manual" },
    },
    {
      command: "npx next start -H 127.0.0.1 -p 3101",
      url: "http://127.0.0.1:3101",
      reuseExistingServer: false,
      env: { INTERPRETER_MODE: "fake", ALLOW_FAKE_INTERPRETER: "1", INTERPRET_PER_MINUTE: "60" },
    },
  ],
});
