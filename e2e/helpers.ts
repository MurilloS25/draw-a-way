import { expect, test as base, type Page } from "@playwright/test";

export const MANUAL = "http://127.0.0.1:3100";
export const FAKE = "http://127.0.0.1:3101";

export const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
  { name: "320", width: 320, height: 640 },
] as const;

/** Every test fails on console errors, page errors, or any request leaving the origin. */
export const test = base.extend<{ page: Page; expectedConsole: RegExp[] }>({
  expectedConsole: [[], { option: true }],
  page: async ({ page, baseURL, expectedConsole }, use) => {
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !expectedConsole.some((re) => re.test(m.text()))) problems.push(`console: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    page.on("request", (r) => {
      const u = r.url();
      if (!u.startsWith("data:") && !u.startsWith("blob:") && !u.startsWith(baseURL ?? "http://127.0.0.1")) {
        problems.push(`external request: ${u}`);
      }
    });
    await use(page);
    expect(problems, "console/page/network problems").toEqual([]);
  },
});

export { expect };

export async function open(page: Page, base = MANUAL) {
  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.goto(base);
  await expect(page.getByRole("button", { name: "Start drawing" })).toBeVisible();
}

export async function drawStroke(page: Page, points: [number, number][]) {
  await page.locator(".draw-area").scrollIntoViewIfNeeded();
  const box = (await page.locator(".draw-area").boundingBox())!;
  const at = ([fx, fy]: [number, number]) => [box.x + box.width * fx, box.y + box.height * fy] as const;
  const [x0, y0] = at(points[0]!);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (const p of points.slice(1)) {
    const [x, y] = at(p);
    await page.mouse.move(x, y, { steps: 6 });
  }
  await page.mouse.up();
}

export const ARC: [number, number][] = [
  [0.35, 0.62],
  [0.45, 0.45],
  [0.55, 0.45],
  [0.65, 0.62],
];

const done = (page: Page) => page.getByRole("button", { name: "I'm done drawing" });

/** Draws one line and moves to the "what does it do" step. */
export async function drawAndDescribe(page: Page, points: [number, number][] = ARC) {
  await drawStroke(page, points);
  await done(page).click();
  await expect(
    page.getByRole("heading", { name: /What does your idea help .* do\?|Is this what you meant\?|I'm not sure yet\./ }),
  ).toBeVisible();
}

export async function chooseCaps(page: Page, ...labels: RegExp[]) {
  for (const l of labels) await page.getByRole("checkbox", { name: l }).check();
  await page.getByRole("button", { name: "That's what it does" }).click();
  await expect(page.getByRole("heading", { name: "Here is what happens" })).toBeVisible();
}

/** One scene with real mouse drawing. */
export async function playScene(page: Page, caps: RegExp[], points: [number, number][] = ARC) {
  await drawAndDescribe(page, points);
  await chooseCaps(page, ...caps);
}

/** One scene without drawing. */
export async function playSceneNoDraw(page: Page, caps: RegExp[]) {
  await page.getByRole("button", { name: "Choose without drawing" }).click();
  await chooseCaps(page, ...caps);
}

export async function nextScene(page: Page) {
  await page.getByRole("button", { name: "Next scene" }).click();
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
