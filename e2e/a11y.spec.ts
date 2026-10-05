import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ARC, MANUAL, VIEWPORTS, drawStroke, expect, nextScene, noHorizontalScroll, open, playScene, test } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
}

/** Visits every kind of stage across all three scenes, calling `check` on each. */
async function eachStage(page: Page, check: (label: string) => Promise<void>) {
  await check("intro");
  await page.getByRole("button", { name: "Start drawing" }).click();
  await check("s1-draw");
  await drawStroke(page, ARC);
  await check("s1-draw+line");
  await page.getByRole("button", { name: "I'm done drawing" }).click();
  await check("s1-describe");
  await page.getByRole("checkbox", { name: /Join two places/ }).check();
  await page.getByRole("checkbox", { name: /Hold weight/ }).check();
  await check("s1-describe+two");
  await page.getByRole("button", { name: "That's what it does" }).click();
  await check("s1-result");
  await nextScene(page);
  await check("s2-draw+persistent");
  await playScene(
    page,
    [/Hold things in place/],
    [
      [0.5, 0.35],
      [0.55, 0.62],
    ],
  );
  await check("s2-result");
  await nextScene(page);
  await playScene(page, [/Something else/]);
  await check("s3-result");
  await page.getByRole("button", { name: "See my adventure" }).click();
  await check("summary");
  await page.getByRole("button", { name: "Play this adventure again" }).click();
  await check("summary+confirm");
}

test.describe("accessibility and layout", () => {
  for (const vp of VIEWPORTS) {
    test(`axe and no horizontal scroll at ${vp.name}px on every stage`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await open(page);
      await eachStage(page, async (label) => {
        await axe(page, `${vp.name}/${label}`);
        await noHorizontalScroll(page);
      });
    });
  }

  test("axe on the other adventures, the helper-free describe step, and the tab conflict banner", async ({
    page,
    browser,
    baseURL,
  }) => {
    await open(page);
    for (const title of ["The windy hill", "Lights in the fog"]) {
      await page.getByRole("button", { name: title }).click();
      await axe(page, title);
      await page.getByRole("button", { name: "Start drawing" }).click();
      await axe(page, `${title}/draw`);
      await page.getByRole("button", { name: "Choose without drawing" }).click();
      await axe(page, `${title}/describe`);
      await page.getByRole("button", { name: "Draw instead" }).click();
      await page.getByRole("button", { name: "Choose without drawing" }).click();
      await page.getByRole("checkbox").first().check();
      await page.getByRole("button", { name: "That's what it does" }).click();
      await axe(page, `${title}/result`);
      await page.getByRole("button", { name: "Start over" }).click();
      await page.getByRole("button", { name: "Yes, erase and start over" }).click();
    }
    const context = await browser.newContext();
    const a = await context.newPage();
    const b = await context.newPage();
    await a.goto(baseURL ?? MANUAL);
    await a.getByRole("button", { name: "Start drawing" }).click();
    await drawStroke(a, ARC);
    await b.goto(baseURL ?? MANUAL);
    await drawStroke(b, [
      [0.2, 0.3],
      [0.4, 0.3],
    ]);
    await expect(a.getByTestId("tab-conflict")).toBeVisible();
    await axe(a, "tab-conflict");
    await context.close();
  });

  test("text enlarged to 200% and 400% zoom keep everything reachable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page);
    await page.evaluate(() => document.documentElement.style.setProperty("font-size", "200%", "important"));
    await noHorizontalScroll(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawStroke(page, ARC);
    await noHorizontalScroll(page);
    const done = page.getByRole("button", { name: "I'm done drawing" });
    await done.scrollIntoViewIfNeeded();
    await expect(done).toBeVisible();
    await done.click();
    await noHorizontalScroll(page);
    const confirm = page.getByRole("button", { name: "That's what it does" });
    await expect(confirm).toBeInViewport(); // the main action stays in view while the choices scroll
    // 400% zoom equals a 320 CSS px wide viewport.
    await page.evaluate(() => document.documentElement.style.removeProperty("font-size"));
    await page.setViewportSize({ width: 320, height: 256 });
    await noHorizontalScroll(page);
    await axe(page, "400%-zoom");
    await expect(confirm).toBeInViewport();
  });

  test("reduced motion removes animation and still shows the consequence", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("button", { name: "Choose without drawing" }).click();
    await page.getByRole("checkbox", { name: /Join two places/ }).check();
    await page.getByRole("button", { name: "That's what it does" }).click();
    const hero = page.locator(".scene .hero");
    await expect(hero).toHaveCSS("animation-name", "none");
    // Final state is shown immediately: the snail is already across the river.
    const x = await hero.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    expect(x).toBe(640);
  });

  test("with motion allowed, the consequence animates toward the same end state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("button", { name: "Choose without drawing" }).click();
    await page.getByRole("checkbox", { name: /Join two places/ }).check();
    await page.getByRole("button", { name: "That's what it does" }).click();
    await expect(page.locator(".scene .hero")).not.toHaveCSS("animation-name", "none");
  });

  test("a partial result stops the character short, a full one reaches the goal", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("button", { name: "Choose without drawing" }).click();
    await page.getByRole("checkbox", { name: /Hold weight/ }).check();
    await page.getByRole("button", { name: "That's what it does" }).click();
    const x = await page.locator(".scene .hero").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    expect(x).toBeGreaterThan(100);
    expect(x).toBeLessThan(640);
  });

  test("focus is visible, ordered, and moves to each new scene heading", async ({ page }) => {
    await open(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to the mission" })).toBeFocused();
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe("none");
    await page.getByRole("button", { name: "Start drawing" }).focus();
    const ring = await page.getByRole("button", { name: "Start drawing" }).evaluate((e) => getComputedStyle(e).outlineWidth);
    expect(parseFloat(ring)).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Scene 1: The wide river" })).toBeFocused();
    await expect(page.getByTestId("announcer")).toContainText("Scene 1 of 3");
    await page.getByRole("button", { name: "Choose without drawing" }).press("Enter");
    await expect(page.getByRole("heading", { name: /What does your idea help Mossy do/ })).toBeFocused();
    await page.getByRole("checkbox", { name: /Float/ }).focus();
    const checkboxRing = await page.evaluate(() => getComputedStyle(document.activeElement!.closest("label")!).outlineStyle);
    expect(checkboxRing).not.toBe("none");
  });

  test("disabled-looking actions explain themselves and stay focusable", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    const done = page.getByRole("button", { name: "I'm done drawing" });
    await expect(done).toHaveAttribute("aria-disabled", "true");
    await expect(done).toHaveAccessibleDescription(/Draw a line first/);
    await done.focus();
    await expect(done).toBeFocused();
    await done.click({ force: true }); // Playwright treats aria-disabled as disabled
    await expect(page.getByRole("heading", { name: /Scene 1: The wide river/ })).toBeVisible();
    await page.getByRole("button", { name: "Choose without drawing" }).click();
    const ok = page.getByRole("button", { name: "That's what it does" });
    await expect(ok).toHaveAccessibleDescription(/Pick one or two things first/);
  });

  test("Start over confirmation returns focus and closes with Escape", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Keep going" }).focus();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Start over" })).toBeFocused();
  });

  test("confirmations move focus in and out without a mouse", async ({ page }) => {
    await open(page);
    // Start over
    await page.getByRole("button", { name: "Start over" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Yes, erase and start over" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Start over" })).toBeFocused();
    // Clear
    await page.getByRole("button", { name: "Start drawing" }).press("Enter");
    await page.getByRole("application").focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Clear", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Yes, clear it" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("application")).toBeFocused();
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
  });

  test("the summary confirmation takes focus and gives it back", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Choose without drawing" }).click();
      await page.getByRole("checkbox", { name: /Float/ }).check();
      await page.getByRole("button", { name: "That's what it does" }).click();
      if (i < 2) await page.getByRole("button", { name: "Next scene" }).click();
    }
    await page.getByRole("button", { name: "See my adventure" }).click();
    await page.getByRole("button", { name: "Play this adventure again" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Yes, clear them and play again" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Try another adventure" })).toBeFocused();
  });

  test("a repeated status message is announced again", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("application").focus();
    const announcer = page.getByTestId("announcer");
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press("Space");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Space");
    }
    await expect(announcer).toContainText("Line added. 2 on the page.");
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("button", { name: "Redo" }).click();
    await page.getByRole("button", { name: "Undo" }).click();
    // The same text twice in a row lands in alternating live regions.
    const regions = announcer.locator("[role=status]");
    expect((await regions.allInnerTexts()).filter(Boolean)).toEqual(["Undone."]);
  });

  test("strokes keep a light casing so every crayon shows on every scene", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("radio", { name: "Sun yellow" }).click();
    await drawStroke(page, [
      [0.5, 0.7],
      [0.62, 0.7],
    ]);
    await page.getByRole("button", { name: "I'm done drawing" }).click();
    const paths = page.locator(".strokes-layer path");
    // Two paths per line: the light casing under the crayon colour.
    expect(await paths.count()).toBe(2);
    await expect(paths.first()).toHaveAttribute("stroke", "#ffffff");
  });

  test("tool, color, and size radios use arrow keys and state is never color alone", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("radio", { name: "Ink blue" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Berry red" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Berry red" })).toBeFocused();
    await expect(page.getByTestId("tool-now")).toContainText("Berry red");
    await page.getByRole("radio", { name: "Erase" }).click();
    await expect(page.getByTestId("tool-now")).toContainText("Eraser");
    await expect(page.getByRole("radio", { name: "Erase" })).toHaveAttribute("aria-checked", "true");
  });

  test("landscape phone: the sheet fits the screen height so the page stays scrollable", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    const box = (await page.locator(".paper").boundingBox())!;
    expect(box.height).toBeLessThan(390);
    await noHorizontalScroll(page);
  });

  test("interactive targets are at least 44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("button, label.cap")]
        .map((b) => ({ n: b.getAttribute("aria-label") ?? b.textContent, r: b.getBoundingClientRect() }))
        .filter((b) => b.r.width > 0 && (b.r.width < 43.5 || b.r.height < 43.5))
        .map((b) => `${b.n}: ${Math.round(b.r.width)}x${Math.round(b.r.height)}`),
    );
    expect(small).toEqual([]);
    await page.getByRole("button", { name: "Choose without drawing" }).click();
    const smallCaps = await page.evaluate(
      () => [...document.querySelectorAll("label.cap")].filter((b) => b.getBoundingClientRect().height < 43.5).length,
    );
    expect(smallCaps).toBe(0);
  });

  test("every capability option has an icon and visible text, not color alone", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("button", { name: "Choose without drawing" }).click();
    const labels = page.locator("label.cap");
    expect(await labels.count()).toBe(15);
    for (const l of await labels.all()) {
      await expect(l.locator("svg.cap-icon")).toHaveCount(1);
      expect((await l.locator(".cap-label").innerText()).length).toBeGreaterThan(2);
    }
  });
});

test.describe("security surface", () => {
  test("page carries a nonce CSP and hardening headers", async ({ request }) => {
    const res = await request.get(MANUAL);
    const h = res.headers();
    const csp = h["content-security-policy"]!;
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[\w=+/]+' 'strict-dynamic'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("img-src 'self' data: blob:");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("no-referrer");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["x-powered-by"]).toBeUndefined();
    const nonce1 = /nonce-([^']+)/.exec(csp)![1];
    const nonce2 = /nonce-([^']+)/.exec((await request.get(MANUAL)).headers()["content-security-policy"]!)![1];
    expect(nonce1).not.toBe(nonce2);
  });

  test("API headers and cache rules", async ({ request }) => {
    const res = await request.get(`${MANUAL}/api/capabilities`);
    expect(await res.json()).toEqual({ remote: false, source: null });
    expect(res.headers()["cache-control"]).toBe("no-store");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("interpret endpoint refuses hostile input and never calls out in manual mode", async ({ request }) => {
    const json = { "content-type": "application/json" };
    const bad = [
      { data: "not json", headers: json, status: 400 },
      { data: "x".repeat(600_000), headers: json, status: 413 },
      { data: "{}", headers: { "content-type": "text/plain" }, status: 415 },
      { data: '{"missionId":"river","scene":0,"imageBase64":"AAAA"}', headers: json, status: 400 },
      { data: '{"missionId":"river","scene":9,"imageBase64":"AAAAAAAAAAAAAAAAAAAA"}', headers: json, status: 400 },
    ];
    for (const b of bad) {
      const res = await request.post(`${MANUAL}/api/interpret`, { data: b.data, headers: b.headers });
      expect(res.status(), String(b.data).slice(0, 30)).toBe(b.status);
    }
    expect((await request.get(`${MANUAL}/api/interpret`)).status()).toBe(405);
  });

  test("the browser never receives a key or provider secret", async ({ page }) => {
    const bodies: string[] = [];
    page.on("response", async (r) => {
      const ct = r.headers()["content-type"] ?? "";
      if (/javascript|json|html|css/.test(ct)) bodies.push(await r.text().catch(() => ""));
    });
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.waitForLoadState("networkidle");
    const all = bodies.join("\n");
    expect(all).not.toMatch(/GROQ_API_KEY|gsk_[A-Za-z0-9]|api\.groq\.com/);
    expect(bodies.length).toBeGreaterThan(2);
  });
});
