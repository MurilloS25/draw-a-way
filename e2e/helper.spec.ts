import type { Page } from "@playwright/test";
import { ARC, FAKE, drawAndDescribe, drawStroke, expect, nextScene, open, test } from "./helpers";

test.use({ baseURL: FAKE });

/** The fake server only honors this header because it runs in fake mode. */
async function scenario(page: Page, name: string) {
  await page.route("**/api/interpret", (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-fake-scenario": name } }),
  );
}

const ask = (page: Page) => page.getByRole("button", { name: "Ask the helper to look" });

test.describe("explicit helper with the deterministic fake provider", () => {
  test("nothing is sent until the child asks, and the child still confirms", async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (r) => r.url().includes("/api/interpret") && calls.push(r.url()));
    await open(page, FAKE);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawAndDescribe(page);
    await expect(ask(page)).toBeVisible();
    await expect(page.getByText(/sends a small copy of the scene/)).toBeVisible();
    expect(calls).toHaveLength(0);

    await ask(page).click();
    await expect(page.getByText(/I think your .* can .*Is that what you meant\?/)).toBeVisible();
    expect(calls).toHaveLength(1);
    await expect(page.getByRole("heading", { name: "Here is what happens" })).toHaveCount(0);
    await page.getByRole("button", { name: "Yes, that's it" }).click();
    await expect(page.getByRole("heading", { name: "Here is what happens" })).toBeVisible();
  });

  test("the child can remove, replace, or add a capability before confirming", async ({ page }) => {
    await open(page, FAKE);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawAndDescribe(page);
    await ask(page).click();
    await page.getByRole("button", { name: "No, let me change it" }).click();
    expect(await page.getByRole("checkbox", { checked: true }).count()).toBeGreaterThanOrEqual(1);
    for (const box of await page.getByRole("checkbox", { checked: true }).all()) await box.uncheck();
    await page.getByRole("checkbox", { name: /Hold things in place/ }).check();
    await page.getByRole("checkbox", { name: /Send a signal/ }).check();
    await page.getByRole("button", { name: "That's what it does" }).click();
    await expect(page.getByText(/It can also send a signal/)).toBeVisible();
  });

  for (const [name, text] of [
    ["fail", /could not look/],
    ["rate", /needs a rest/],
    ["invalid", /could not tell/],
    ["injection", /could not tell/],
    ["foreign", /could not tell/],
    ["too_many", /could not tell/],
    ["none", /I'm not sure yet/],
    ["lowconf", /I'm not sure yet/],
  ] as const) {
    test(`scenario ${name} keeps the drawing and falls back to choosing`, async ({ page }) => {
      await scenario(page, name);
      await open(page, FAKE);
      await page.getByRole("button", { name: "Start drawing" }).click();
      await drawAndDescribe(page);
      await ask(page).click();
      await expect(page.getByText(text).first()).toBeVisible();
      expect(await page.getByRole("checkbox").count()).toBeGreaterThan(10);
      await page.getByRole("button", { name: /Keep drawing/ }).click();
      await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
      if (name === "rate") await page.waitForTimeout(1300); // let the 1 s cooldown pass
    });
  }

  test("a hostile label is dropped; the capabilities are still only a proposal", async ({ page }) => {
    await scenario(page, "hostile_label");
    await open(page, FAKE);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawAndDescribe(page);
    await ask(page).click();
    await expect(page.locator(".note .story")).toContainText("I think your invention can");
    const text = await page.locator(".note .story").innerText();
    expect(text).not.toMatch(/ignore|address/i);
  });

  test("a slow request can be cancelled without losing anything", async ({ page }) => {
    await scenario(page, "slow");
    await open(page, FAKE);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawAndDescribe(page);
    await ask(page).click();
    await expect(page.getByText(/looking at your picture/).first()).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(ask(page)).toBeVisible();
    expect(await page.getByRole("checkbox").count()).toBeGreaterThan(10);
  });

  test.describe("network failure", () => {
    test.use({ expectedConsole: [/ERR_FAILED/] });
    test("a failing network request is handled", async ({ page }) => {
      await page.route("**/api/interpret", (route) => route.abort("failed"));
      await open(page, FAKE);
      await page.getByRole("button", { name: "Start drawing" }).click();
      await drawAndDescribe(page);
      await ask(page).click();
      await expect(page.getByText(/Your drawing is safe/).first()).toBeVisible();
    });
  });

  test("the request carries a small composite PNG: scene background, persistent layer, current strokes, no interface", async ({
    page,
  }) => {
    const bodies: Record<string, unknown>[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/interpret")) bodies.push(r.postDataJSON());
    });
    await open(page, FAKE);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawAndDescribe(page);
    await ask(page).click();
    await expect(page.getByText(/I think your/)).toBeVisible();

    const first = bodies[0]!;
    expect(Object.keys(first).sort()).toEqual(["imageBase64", "missionId", "scene"]);
    const png = Buffer.from(String(first.imageBase64), "base64");
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.length).toBeLessThan(400_000);
    for (const chunk of ["tEXt", "iTXt", "zTXt", "eXIf", "tIME"]) expect(png.includes(chunk)).toBe(false);

    // Decode in the browser and inspect real pixels.
    const probe = await page.evaluate(async (b64) => {
      const blob = new Blob([Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))], { type: "image/png" });
      const bmp = await createImageBitmap(blob);
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const px = (fx: number, fy: number) => [
        ...ctx.getImageData(Math.round(fx * (c.width - 1)), Math.round(fy * (c.height - 1)), 1, 1).data,
      ];
      return {
        w: c.width,
        h: c.height,
        sky: px(0.05, 0.05),
        bank: px(0.1, 0.9),
        river: px(0.5, 0.9),
        stroke: px(0.5, 0.45),
        corner: px(0.999, 0.999),
      };
    }, String(first.imageBase64));
    expect(probe.w).toBe(512);
    expect(probe.h).toBe(358);
    const near = (a: number[], b: number[], tol = 14) => a.slice(0, 3).every((v, i) => Math.abs(v - b[i]!) <= tol);
    expect(near(probe.sky, [220, 235, 232])).toBe(true); // scene backdrop is present
    expect(near(probe.river, [124, 192, 195])).toBe(true);
    expect(near(probe.stroke, [31, 42, 92], 30)).toBe(true); // the child's ink-blue line
    expect(near(probe.corner, [255, 255, 255], 5)).toBe(false); // no blank white sheet; no interface chrome
  });

  test("scene 2's picture includes the persistent structure and names earlier capabilities", async ({ page }) => {
    const bodies: Record<string, unknown>[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/interpret")) bodies.push(r.postDataJSON());
    });
    await open(page, FAKE);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawAndDescribe(page);
    await page.getByRole("checkbox", { name: /Join two places/ }).check();
    await page.getByRole("button", { name: "That's what it does" }).click();
    await nextScene(page);
    await drawStroke(page, [
      [0.2, 0.2],
      [0.3, 0.2],
    ]);
    await page.getByRole("button", { name: "I'm done drawing" }).click();
    await ask(page).click();
    await expect(page.getByText(/I think your/)).toBeVisible();

    const second = bodies[0]!;
    expect(second.scene).toBe(1);
    expect(second.priorCaps).toEqual(["connects_places"]);
    const probe = await page.evaluate(async (b64) => {
      const blob = new Blob([Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))], { type: "image/png" });
      const bmp = await createImageBitmap(blob);
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      return [...ctx.getImageData(Math.round(0.5 * 511), Math.round(0.45 * 357), 1, 1).data];
    }, String(second.imageBase64));
    // The scene-1 bridge (drawn there at the top of the arc) is still in the picture.
    expect(Math.abs(probe[0]! - 31) < 40 && Math.abs(probe[2]! - 92) < 40).toBe(true);
  });

  test("a later scene asks only about what the new drawing does", async ({ page }) => {
    await open(page, FAKE);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawAndDescribe(page, ARC);
    await page.getByRole("checkbox", { name: /Float/ }).check();
    await page.getByRole("button", { name: "That's what it does" }).click();
    await nextScene(page);
    await drawStroke(page, ARC);
    await page.getByRole("button", { name: "I'm done drawing" }).click();
    await ask(page).click();
    await expect(page.getByText(/I think your/)).toBeVisible();
    await page.getByRole("button", { name: "No, let me change it" }).click();
    expect(await page.getByRole("checkbox").count()).toBe(15);
  });
});
