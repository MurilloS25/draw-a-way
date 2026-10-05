import { ARC, FAKE, drawStroke, expect, open, test, toConfirm } from "./helpers";
import type { Page } from "@playwright/test";

test.use({ baseURL: FAKE });

/** The fake server only honors this header because it runs in fake mode. */
async function scenario(page: Page, name: string) {
  await page.route("**/api/interpret", (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-fake-scenario": name } }),
  );
}

test.describe("explicit helper with the deterministic fake provider", () => {
  test("nothing is sent until the child asks, and the child still confirms", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (r) => r.url().includes("/api/interpret") && calls.push(r.url()));
    await open(page, FAKE);
    await toConfirm(page);
    await expect(page.getByRole("button", { name: "Ask the helper to look" })).toBeVisible();
    await expect(page.getByText(/sends a small black-and-white copy/)).toBeVisible();
    expect(calls).toHaveLength(0);

    await page.getByRole("button", { name: "Ask the helper to look" }).click();
    await expect(page.getByText(/I think you made/)).toBeVisible();
    expect(calls).toHaveLength(1);
    await expect(page.getByRole("heading", { name: /^Your idea/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Yes, that's it" }).click();
    await expect(page.getByRole("heading", { name: /^Your idea/ })).toBeVisible();
  });

  test("the child can correct the suggestion", async ({ page }) => {
    await open(page, FAKE);
    await toConfirm(page);
    await page.getByRole("button", { name: "Ask the helper to look" }).click();
    await page.getByRole("button", { name: "No, I'll choose" }).click();
    await page.getByRole("radio", { name: /A bridge/ }).check();
    await page.getByRole("button", { name: "That's my idea" }).click();
    await expect(page.getByRole("heading", { name: "Your idea: a bridge" })).toBeVisible();
  });

  for (const [name, text] of [
    ["fail", /could not look/],
    ["rate", /needs a rest/],
    ["invalid", /could not tell/],
    ["injection", /could not tell/],
    ["foreign", /could not tell/],
    ["none", /not sure/],
  ] as const) {
    test(`scenario ${name} keeps the drawing and falls back to choosing`, async ({ page }) => {
      await scenario(page, name);
      await open(page, FAKE);
      await toConfirm(page);
      await page.getByRole("button", { name: "Ask the helper to look" }).click();
      await expect(page.getByText(text).first()).toBeVisible();
      await expect(page.getByText(/Your drawing is safe/).first()).toBeVisible();
      await expect(page.getByRole("radio")).toHaveCount(4);
      await page.getByRole("button", { name: "Keep drawing" }).click();
      await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
      if (name === "rate") await page.waitForTimeout(1300); // let the 1 s cooldown pass
    });
  }

  test("a slow request can be cancelled without losing anything", async ({ page }) => {
    await scenario(page, "slow");
    await open(page, FAKE);
    await toConfirm(page);
    await page.getByRole("button", { name: "Ask the helper to look" }).click();
    await expect(page.getByText(/looking at your drawing/).first()).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Ask the helper to look" })).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(4);
  });

  test.describe("network failure", () => {
    test.use({ expectedConsole: [/ERR_FAILED/] });
  test("a failing network request is handled", async ({ page }) => {
    await page.route("**/api/interpret", (route) => route.abort("failed"));
    await open(page, FAKE);
    await toConfirm(page);
    await page.getByRole("button", { name: "Ask the helper to look" }).click();
    await expect(page.getByText(/Your drawing is safe/).first()).toBeVisible();
  });
  });

  test("the request carries only a small PNG and ids", async ({ page }) => {
    let body: Record<string, unknown> = {};
    page.on("request", (r) => {
      if (r.url().includes("/api/interpret")) body = r.postDataJSON();
    });
    await open(page, FAKE);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawStroke(page, ARC);
    await page.getByRole("button", { name: "I'm done drawing" }).click();
    await page.getByRole("button", { name: "Ask the helper to look" }).click();
    await expect(page.getByText(/I think you made/)).toBeVisible();
    expect(Object.keys(body).sort()).toEqual(["imageBase64", "missionId", "round"]);
    const png = Buffer.from(String(body.imageBase64), "base64");
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.length).toBeLessThan(300_000);
    // No ancillary metadata chunks (text, time, EXIF) from a canvas re-encode.
    for (const chunk of ["tEXt", "iTXt", "zTXt", "eXIf", "tIME"]) expect(png.includes(chunk)).toBe(false);
  });

  test("round 2 asks only about changes to the confirmed idea", async ({ page }) => {
    await open(page, FAKE);
    await toConfirm(page);
    await page.getByRole("radio", { name: /A bridge/ }).check();
    await page.getByRole("button", { name: "That's my idea" }).click();
    await page.getByRole("button", { name: "Change my solution" }).click();
    await drawStroke(page, ARC);
    await page.getByRole("button", { name: "I'm done drawing" }).click();
    await page.getByRole("button", { name: "Ask the helper to look" }).click();
    await expect(page.getByText(/I think you made/)).toBeVisible();
    await page.getByRole("button", { name: "No, I'll choose" }).click();
    await expect(page.getByRole("radio")).toHaveCount(3);
    await expect(page.getByRole("radio", { name: /Add a rail/ })).toBeVisible();
  });
});
