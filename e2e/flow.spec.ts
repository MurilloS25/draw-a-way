import { ARC, MANUAL, drawStroke, expect, nextScene, open, playScene, playSceneNoDraw, test } from "./helpers";

test.describe("provider-free adventures (production build)", () => {
  test("river: three scenes with real mouse drawing, remembered ideas, and a text summary", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await expect(page.getByRole("heading", { name: "Scene 1: The wide river" })).toBeFocused();
    await playScene(page, [/Join two places/, /Hold weight/]);
    await expect(page.locator("#main").getByText(/joins the two sides/)).toBeVisible();
    await expect(page.getByTestId("persistent-layer")).toHaveCount(0);
    await nextScene(page);

    await expect(page.getByRole("heading", { name: "Scene 2: The river rushes" })).toBeFocused();
    await expect(page.locator("#main").getByText(/Your first idea is still by the river/)).toBeVisible();
    await expect(page.locator("#main").getByText(/Scene 1: Your invention could join two places and hold weight/)).toBeVisible();
    // The earlier structure stays in the scene as its own layer.
    await expect(page.getByTestId("persistent-layer")).toHaveCount(1);
    await playScene(
      page,
      [/Hold things in place/],
      [
        [0.5, 0.35],
        [0.55, 0.62],
      ],
    );
    await nextScene(page);

    await expect(page.getByRole("heading", { name: "Scene 3: Peeping on the rock" })).toBeVisible();
    await playScene(
      page,
      [/Carry someone/, /Float/],
      [
        [0.3, 0.7],
        [0.45, 0.55],
        [0.6, 0.7],
      ],
    );
    await expect(page.locator("#main").getByText(/floating ride/)).toBeVisible();
    await page.getByRole("button", { name: "See my adventure" }).click();

    await expect(page.getByRole("heading", { name: "Your adventure trail" })).toBeFocused();
    const steps = page.locator("li.step");
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText("Your invention could join two places and hold weight.");
    await expect(steps.nth(1)).toContainText("Your invention could hold things in place.");
    await expect(steps.nth(2)).toContainText("could carry someone and float.");
    await expect(page.locator("#main").getByText(/stayed in the story/)).toBeVisible();
  });

  test("the other two adventures complete with different outcomes", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "The windy hill" }).click();
    await page.getByRole("button", { name: "Start drawing" }).click();
    await playScene(page, [/Give shelter/]);
    await expect(page.locator("#main").getByText(/rain rolls away/)).toBeVisible();
    await nextScene(page);
    await playScene(page, [/Deliver or store things/]);
    await nextScene(page);
    await expect(
      page
        .locator("#main")
        .getByText(/Your first idea kept Sprig safe|strong and happy|still a bit bumped|The sun is warm/)
        .first(),
    ).toBeVisible();
    await playScene(page, [/Give light/]);
    await page.getByRole("button", { name: "See my adventure" }).click();
    await expect(page.locator("li.step")).toHaveCount(3);
    await page.getByRole("button", { name: "Try another adventure" }).click();
    await page.getByRole("button", { name: "Yes, clear them and go on" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Lights in the fog" })).toBeVisible();
    await page.getByRole("button", { name: "Start drawing" }).click();
    await playScene(page, [/Give light/]);
    await expect(page.locator("#main").getByText(/Bix sees it through the mist/)).toBeVisible();
    await nextScene(page);
    await expect(page.locator("#main").getByText(/Your lights glow near a fork/)).toBeVisible();
    await playScene(page, [/Mark a path/, /Hold weight/]);
    await nextScene(page);
    await expect(page.locator("#main").getByText(/could help Rue see the way down/)).toBeVisible();
    await playScene(page, [/Carry someone/]);
    await page.getByRole("button", { name: "See my adventure" }).click();
    await expect(page.locator("li.step")).toHaveCount(3);
  });

  test("two different routes through the same adventure diverge and then merge", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await playSceneNoDraw(page, [/Join two places/]);
    await nextScene(page);
    const bridgeStory = await page.locator(".note .story").innerText();
    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Yes, erase and start over" }).click();

    await page.getByRole("button", { name: "Start drawing" }).click();
    await playSceneNoDraw(page, [/Carry someone/]);
    await expect(page.locator("#main").getByText(/Mossy climbs aboard your invention/)).toBeVisible();
    await nextScene(page);
    const rideStory = await page.locator(".note .story").innerText();
    expect(rideStory).not.toEqual(bridgeStory);
    await expect(page.locator("#main").getByText(/Your first idea waits by the bank/)).toBeVisible();
  });

  test("an unexpected invention: a giraffe bridge is a capability, not a lookup", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    // Whatever the child draws, they say what it does: join two places and hold weight.
    await playScene(
      page,
      [/Join two places/, /Hold weight/],
      [
        [0.3, 0.5],
        [0.32, 0.2],
        [0.36, 0.2],
        [0.4, 0.5],
        [0.6, 0.5],
      ],
    );
    await expect(page.locator("#main").getByText(/Mossy reaches the berry bush/)).toBeVisible();
  });

  test("something else: an idea we did not name still continues with respect", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await playScene(page, [/Something else/]);
    await expect(page.locator("#main").getByText(/do not have a name for/)).toBeVisible();
    await expect(page.locator("#main").getByText(/The river stays wide for now/)).toBeVisible();
    await nextScene(page);
    await expect(page.getByRole("heading", { name: "Scene 2: The river rushes" })).toBeVisible();
  });

  test("capability limits: at most two, and Something else stands alone", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("button", { name: "Choose without drawing" }).click();
    await page.getByRole("checkbox", { name: /Float/ }).check();
    await page.getByRole("checkbox", { name: /Fly/ }).check();
    await expect(page.getByRole("checkbox", { name: /Roll/ })).toBeDisabled();
    await expect(page.locator("#main").getByText(/That is two/)).toBeVisible();
    await page.getByRole("checkbox", { name: /Something else/ }).check();
    await expect(page.getByRole("checkbox", { name: /Float/ })).not.toBeChecked();
  });

  test("accessible path: three scenes with the keyboard only and no drawing", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).press("Enter");
    for (let scene = 0; scene < 3; scene++) {
      await page.getByRole("button", { name: "Choose without drawing" }).press("Enter");
      await page.getByRole("checkbox", { name: /Float/ }).focus();
      await page.keyboard.press("Space");
      await page.getByRole("button", { name: "That's what it does" }).press("Enter");
      await expect(page.getByRole("heading", { name: "Here is what happens" })).toBeFocused();
      if (scene < 2) await page.getByRole("button", { name: "Next scene" }).press("Enter");
    }
    await page.getByRole("button", { name: "See my adventure" }).press("Enter");
    await expect(page.locator("li.step")).toHaveCount(3);
    await expect(page.locator("#main").getByText("Chosen without drawing.")).toHaveCount(3);
    await expect(page.locator("#main").getByText(/came back to the idea of how to float/)).toBeVisible();
  });

  test("keyboard drawing, eraser, undo/redo, and clear with confirmation", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.getByRole("application").focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Shift+ArrowDown");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
    await expect(page.getByTestId("announcer")).toContainText("Line added");

    await page.getByRole("radio", { name: "Erase" }).click();
    await expect(page.getByTestId("tool-now")).toContainText("Eraser");
    await page.getByRole("application").focus();
    await page.keyboard.press("Space");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Space");
    await expect(page.getByTestId("line-count")).toHaveText("Nothing drawn yet.");
    await page.keyboard.press("Control+z");
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.locator("#main").getByText("Clear this scene's drawing?")).toBeVisible();
    await page.getByRole("button", { name: "Keep it" }).click();
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await page.getByRole("button", { name: "Yes, clear it" }).click();
    await expect(page.getByTestId("line-count")).toHaveText("Nothing drawn yet.");
  });

  test("the eraser works with the mouse and never touches an earlier scene's drawing", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await playScene(page, [/Join two places/]);
    await nextScene(page);
    await drawStroke(page, [
      [0.2, 0.3],
      [0.8, 0.3],
    ]);
    await page.getByRole("radio", { name: "Erase" }).click();
    // Sweep across where the scene-1 bridge was drawn and across the new line.
    await drawStroke(page, [
      [0.2, 0.3],
      [0.8, 0.3],
    ]);
    await drawStroke(page, [
      [0.35, 0.62],
      [0.45, 0.45],
      [0.55, 0.45],
      [0.65, 0.62],
    ]);
    await expect(page.getByTestId("line-count")).toHaveText("Nothing drawn yet.");
    await expect(page.getByTestId("persistent-layer")).toHaveCount(1);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
  });

  test("touch input draws through pointer events without scrolling the page", async ({ browser, baseURL }) => {
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
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await context.close();
  });

  test("stylus events with pressure draw and are stored with the pressure", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await page.evaluate(() => {
      const c = document.querySelector("canvas")!;
      const r = c.getBoundingClientRect();
      const fire = (type: string, fx: number, fy: number, pressure: number) =>
        c.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 7,
            pointerType: "pen",
            isPrimary: true,
            pressure,
            clientX: r.left + r.width * fx,
            clientY: r.top + r.height * fy,
            bubbles: true,
            button: 0,
          }),
        );
      fire("pointerdown", 0.2, 0.5, 0.4);
      for (let i = 1; i <= 6; i++) fire("pointermove", 0.2 + i * 0.05, 0.5, 0.8);
      fire("pointerup", 0.5, 0.5, 0);
    });
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
    const stored = await page.evaluate(() => localStorage.getItem("drawaway:session:v2"));
    expect(stored).toMatch(/"pr":\d+/);
  });

  test("progress survives a reload in every scene, and Start over erases it", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await drawStroke(page, ARC);
    await page.reload();
    await expect(page.getByTestId("line-count")).toHaveText("1 line on the page.");
    await expect(page.getByTestId("announcer")).toContainText("Welcome back");
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(["drawaway:session:v2"]);

    await page.getByRole("button", { name: "I'm done drawing" }).click();
    await page.reload();
    await expect(page.getByRole("heading", { name: /What does your idea help Mossy do\?/ })).toBeVisible();
    await page.getByRole("checkbox", { name: /Float/ }).check();
    await page.getByRole("button", { name: "That's what it does" }).click();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Here is what happens" })).toBeVisible();
    await nextScene(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Scene 2: The river rushes" })).toBeVisible();
    await expect(page.locator("#main").getByText(/Scene 1: Your invention could float/)).toBeVisible();

    await page.getByRole("button", { name: "Start over" }).click();
    await page.getByRole("button", { name: "Yes, erase and start over" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Across the river" })).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
    await page.reload();
    await expect(page.getByRole("button", { name: "Start drawing" })).toBeVisible();
  });

  test("replay asks before discarding drawings", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await playScene(page, [/Join two places/]);
    await nextScene(page);
    await playScene(page, [/Hold things in place/]);
    await nextScene(page);
    await playScene(page, [/Carry someone/]);
    await page.getByRole("button", { name: "See my adventure" }).click();
    await page.getByRole("button", { name: "Play this adventure again" }).click();
    await expect(page.locator("#main").getByText(/This clears your drawings from this adventure/)).toBeVisible();
    await page.getByRole("button", { name: "No, keep my drawings" }).click();
    await expect(page.getByRole("heading", { name: "Your adventure trail" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your adventure trail" })).toBeVisible();
    await page.getByRole("button", { name: "Play this adventure again" }).click();
    await page.getByRole("button", { name: "Yes, clear them and play again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Across the river" })).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  });

  test("two tabs never overwrite each other silently", async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const a = await context.newPage();
    const b = await context.newPage();
    await a.goto(baseURL ?? MANUAL);
    await a.getByRole("button", { name: "Start drawing" }).click();
    await drawStroke(a, ARC);
    await expect(a.getByTestId("line-count")).toHaveText("1 line on the page.");

    await b.goto(baseURL ?? MANUAL);
    // The second tab loads tab A's session, then changes it.
    await expect(b.getByTestId("line-count")).toHaveText("1 line on the page.");
    await drawStroke(b, [
      [0.2, 0.3],
      [0.4, 0.3],
    ]);
    await expect(b.getByTestId("line-count")).toHaveText("2 lines on the page.");

    await expect(a.getByTestId("tab-conflict")).toBeVisible();
    await expect(a.getByTestId("tab-conflict")).toContainText("Another tab changed this adventure");
    await expect(a.getByRole("button", { name: "Keep what I have here" })).toBeFocused();
    // Lines are never merged: tab A still has its own single line.
    await expect(a.getByTestId("line-count")).toHaveText("1 line on the page.");
    await a.getByRole("button", { name: "Use the newest version" }).click();
    await expect(a.getByTestId("line-count")).toHaveText("2 lines on the page.");
    await expect(a.getByTestId("tab-conflict")).toHaveCount(0);
    await context.close();
  });

  test("tampered or old storage is ignored", async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      localStorage.setItem("drawaway:session:v2", '{"v":2,"savedAt":1,"writer":"abcdefgh","state":{}}');
      localStorage.setItem("drawaway:session:v1", "{}");
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "Start drawing" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("drawaway:session:v1"))).toBeNull();
  });

  test("works fully offline once loaded", async ({ page, context }) => {
    await open(page);
    await context.setOffline(true);
    await page.getByRole("button", { name: "Start drawing" }).click();
    await playScene(page, [/Fly/]);
    await nextScene(page);
    await playScene(page, [/Block things/]);
    await nextScene(page);
    await playScene(page, [/Send a signal/]);
    await page.getByRole("button", { name: "See my adventure" }).click();
    await expect(page.getByRole("heading", { name: "Your adventure trail" })).toBeVisible();
    await context.setOffline(false);
  });
});
