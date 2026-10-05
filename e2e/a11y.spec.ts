import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { MANUAL, VIEWPORTS, drawStroke, ARC, expect, noHorizontalScroll, open, test } from "./helpers";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(
    results.violations.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.html.slice(0, 120)}`),
  ).toEqual([]);
}

/** Visits every stage of one mission, calling `check` on each. */
async function eachStage(page: Page, check: (label: string) => Promise<void>) {
  await check("intro");
  await page.getByRole("button", { name: "Start drawing" }).click();
  await check("draw");
  await drawStroke(page, ARC);
  await check("draw+line");
  await page.getByRole("button", { name: "I'm done drawing" }).click();
  await check("confirm");
  await page.getByRole("radio", { name: /A bridge/ }).check();
  await check("confirm+selected");
  await page.getByRole("button", { name: "That's my idea" }).click();
  await check("consequence1");
  await page.getByRole("button", { name: "Change my solution" }).click();
  await check("draw2");
  await page.getByRole("button", { name: "I'm done drawing" }).click();
  await page.getByRole("radio", { name: /Add a rail/ }).check();
  await page.getByRole("button", { name: "That's my idea" }).click();
  await check("consequence2");
  await page.getByRole("button", { name: "See my story trail" }).click();
  await check("summary");
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

  test("axe on the other two missions and the helper-free confirm step", async ({ page }) => {
    await open(page);
    for (const title of ["The windy hill", "Lost in the fog"]) {
      await page.getByRole("button", { name: title }).click();
      await axe(page, title);
      await page.getByRole("button", { name: "Start drawing" }).click();
      await page.getByRole("button", { name: "Choose an idea without drawing" }).click();
      await axe(page, `${title}/confirm`);
      await page.getByRole("button", { name: "Draw instead" }).click();
      await page.getByRole("button", { name: "Choose an idea without drawing" }).click();
      await page.getByRole("radio").first().check();
      await page.getByRole("button", { name: "That's my idea" }).click();
      await axe(page, `${title}/consequence`);
      await page.getByRole("button", { name: "Start over" }).click();
      await page.getByRole("button", { name: "Yes, erase and start over" }).click();
    }
  });

  test("text enlarged to 200% and browser zoom keep everything reachable", async ({ page }) => {
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
    // 400% zoom equals a 320 CSS px wide viewport.
    await page.setViewportSize({ width: 320, height: 256 });
    await noHorizontalScroll(page);
    await axe(page, "400%-zoom");
  });

  test("reduced motion removes animation and still shows the consequence", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("button", { name: "Choose an idea without drawing" }).click();
    await page.getByRole("radio", { name: /A bridge/ }).check();
    await page.getByRole("button", { name: "That's my idea" }).click();
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
    await page.getByRole("button", { name: "Choose an idea without drawing" }).click();
    await page.getByRole("radio", { name: /A bridge/ }).check();
    await page.getByRole("button", { name: "That's my idea" }).click();
    await expect(page.locator(".scene .hero")).not.toHaveCSS("animation-name", "none");
  });

  test("focus is visible, ordered, and moves to each new stage heading", async ({ page }) => {
    await open(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to the mission" })).toBeFocused();
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe("none");
    await page.getByRole("button", { name: "Start drawing" }).focus();
    const ring = await page.getByRole("button", { name: "Start drawing" }).evaluate((e) => getComputedStyle(e).outlineWidth);
    expect(parseFloat(ring)).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Draw your idea" })).toBeFocused();
    await expect(page.getByTestId("announcer")).toContainText("Step 2 of 4");
  });

  test("interactive targets are at least 44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("button")]
        .map((b) => ({ n: b.getAttribute("aria-label") ?? b.textContent, r: b.getBoundingClientRect() }))
        .filter((b) => b.r.width > 0 && (b.r.width < 43.5 || b.r.height < 43.5))
        .map((b) => `${b.n}: ${Math.round(b.r.width)}x${Math.round(b.r.height)}`),
    );
    expect(small).toEqual([]);
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
    const bad = [
      { data: "not json", headers: { "content-type": "application/json" }, status: 400 },
      { data: "x".repeat(500_000), headers: { "content-type": "application/json" }, status: 413 },
      { data: "{}", headers: { "content-type": "text/plain" }, status: 415 },
      { data: '{"missionId":"river","round":1,"imageBase64":"AAAA"}', headers: { "content-type": "application/json" }, status: 400 },
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
