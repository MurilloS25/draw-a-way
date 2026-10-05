import { ARC, MANUAL, drawStroke, expect, finishMission, open, test, toConfirm } from "./helpers";

test.describe("provider-free flow (production build)", () => {
  test("mission 1: bridge to rail, with real mouse drawing", async ({ page }) => {
    await open(page);
    await toConfirm(page);
    await expect(page.getByRole("heading", { name: "What did you make?" })).toBeFocused();
    await finishMission(page, /A bridge/, /Add a rail/);
    await expect(page.getByRole("heading", { name: "Your story trail" })).toBeVisible();
    await expect(page.getByText("First idea")).toBeVisible();
    await expect(page.getByText("After your change")).toBeVisible();
    await expect(page.getByText("Add a rail to hold")).toBeVisible();
  });

  test("mission 2 and 3 complete with different outcomes", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "The windy hill" }).click();
    await toConfirm(page);
    await finishMission(page, /A wall or fence/, /Curve it around/);
    await expect(page.getByRole("heading", { name: "Your story trail" })).toBeVisible();
    await page.getByRole("button", { name: "Try another mission" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Lost in the fog" })).toBeVisible();
    await toConfirm(page);
    await finishMission(page, /A tall flag/, /Keep my flag as it is/);
    await expect(page.getByText("You kept it")).toBeVisible();
    await page.getByRole("button", { name: "Play this mission again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Lost in the fog" })).toBeVisible();
  });

  test("different confirmed ideas lead to different consequences", async ({ page }) => {
    await open(page);
    await toConfirm(page);
    await page.getByRole("radio", { name: /Stepping stones/ }).check();
    await page.getByRole("button", { name: "That's my idea" }).click();
    await expect(page.getByText(/Mossy hops from stone to stone/)).toBeVisible();
    await expect(page.getByText(/A few stones wobble/)).toBeVisible();
  });

  test("accessible path: no drawing and no pointer at all", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).press("Enter");
    await page.getByRole("button", { name: "Choose an idea without drawing" }).press("Enter");
    await page.getByRole("radio", { name: /A raft or boat/ }).focus();
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "That's my idea" }).press("Enter");
    await expect(page.getByText(/Mossy climbs aboard your boat/)).toBeVisible();
    await page.getByRole("button", { name: "Change my solution" }).press("Enter");
    await page.getByRole("button", { name: "Choose an idea without drawing" }).press("Enter");
    await page.getByRole("radio", { name: /Keep my boat/ }).focus();
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "That's my idea" }).press("Enter");
    await page.getByRole("button", { name: "See my story trail" }).press("Enter");
    await expect(page.getByText("Chosen without drawing.")).toBeVisible();
  });

  test("keyboard drawing: arrows move the pen, Space puts it down and lifts it", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("application").focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
    await expect(page.getByTestId("announcer")).toContainText("Line added");
    await page.keyboard.press("Control+z");
    await expect(page.getByTestId("line-count")).toHaveText("Nothing drawn yet.");
  });

  test("touch input draws through pointer events", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto(baseURL ?? MANUAL);
    await page.getByRole("button", { name: "Start drawing" }).click();
    const box = (await page.locator(".draw-area").boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const pt = (fx: number, fy: number) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(0.3, 0.5)] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(0.3 + i * 0.05, 0.5 - i * 0.02)] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
    // The page did not scroll while drawing (touch-action: none).
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await context.close();
  });

  test("stylus events (pen with pressure) draw like any other pointer", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.evaluate(() => {
      const c = document.querySelector("canvas")!;
      const r = c.getBoundingClientRect();
      const fire = (type: string, fx: number, fy: number, pressure: number) =>
        c.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 7, pointerType: "pen", isPrimary: true, pressure,
            clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, bubbles: true, button: 0,
          }),
        );
      fire("pointerdown", 0.2, 0.5, 0.4);
      for (let i = 1; i <= 6; i++) fire("pointermove", 0.2 + i * 0.05, 0.5, 0.7);
      fire("pointerup", 0.5, 0.5, 0);
    });
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
  });

  test("progress survives a reload and Start over erases it", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawStroke(page, ARC);
    await page.reload();
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["drawaway:session:v1"]);

    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Yes, erase and start over" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Across the river" })).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    await page.reload();
    await expect(page.getByRole("button", { name: "Start drawing" })).toBeVisible();
  });

  test("tampered storage is ignored", async ({ page }) => {
    await open(page);
    await page.evaluate(() => localStorage.setItem("drawaway:session:v1", '{"v":1,"savedAt":1,"state":{}}'));
    await page.reload();
    await expect(page.getByRole("button", { name: "Start drawing" })).toBeVisible();
  });

  test("works fully offline once loaded", async ({ page, context }) => {
    await open(page);
    await context.setOffline(true);
    await toConfirm(page);
    await finishMission(page, /A rope or vine/, /Add a seat/);
    await expect(page.getByRole("heading", { name: "Your story trail" })).toBeVisible();
    await context.setOffline(false);
  });

  test("several lines are counted", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    for (let i = 0; i < 3; i++) await drawStroke(page, [[0.1 + i * 0.05, 0.2], [0.2 + i * 0.05, 0.4]]);
    await expect(page.getByTestId("line-count")).toHaveText("3 lines on the page.");
  });
});
