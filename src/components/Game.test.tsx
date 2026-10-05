// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Game } from "./Game";
import { SESSION_KEY, serializeSession } from "@/lib/session/storage";
import { initialState } from "@/lib/session/state";

vi.mock("@/lib/drawing/render", async (orig) => ({
  ...(await orig<typeof import("@/lib/drawing/render")>()),
  exportCompositeBase64: async () => "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
}));

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
type User = ReturnType<typeof userEvent.setup>;

function mockFetch(handler: Handler) {
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => handler(String(url), init));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const manual: Handler = (url) =>
  url.includes("capabilities") ? Response.json({ remote: false, source: null }) : new Response("no", { status: 500 });
const remote = (interpretReply: () => Response | Promise<Response>): Handler => (url) =>
  url.includes("capabilities") ? Response.json({ remote: true, source: "fake" }) : interpretReply();

beforeEach(() => {
  localStorage.clear();
  Element.prototype.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700, toJSON() {} }) as DOMRect;
});

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const pick = async (user: User, ...labels: (string | RegExp)[]) => {
  for (const l of labels) await user.click(screen.getByRole("checkbox", { name: l }));
};

async function startDrawing() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Start drawing" }));
  return user;
}

async function drawWithKeyboard(user: User) {
  const area = screen.getByRole("application");
  area.focus();
  await user.keyboard(" ");
  await user.keyboard("{ArrowRight}{ArrowRight}{ArrowDown}");
  await user.keyboard(" ");
}

/** Chooses capabilities without drawing and confirms: one full scene on the accessible path. */
async function playScene(user: User, ...labels: (string | RegExp)[]) {
  await user.click(button("Choose without drawing"));
  await pick(user, ...labels);
  await user.click(button("That's what it does"));
}

describe("three-scene flow", () => {
  it("opens straight to the first adventure with no request besides capabilities", async () => {
    const f = mockFetch(manual);
    render(<Game />);
    expect(screen.getByRole("heading", { level: 1, name: "Across the river" })).toBeInTheDocument();
    expect(screen.getByText(/Three short scenes/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1));
    expect(String(f.mock.calls[0]![0])).toBe("/api/capabilities");
  });

  it("completes an adventure without drawing: three scenes, remembered ideas, text summary", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();

    expect(button("I'm done drawing")).toHaveAttribute("aria-disabled", "true");
    await playScene(user, /Join two places/, /Hold weight/);
    expect(screen.getByRole("heading", { name: "Here is what happens" })).toBeInTheDocument();
    expect(screen.getByText(/joins the two sides/)).toBeInTheDocument();
    expect(screen.getByText("Your invention stays in the story.")).toBeInTheDocument();
    await user.click(button("Next scene"));

    expect(screen.getByRole("heading", { name: "Scene 2: The river rushes" })).toBeInTheDocument();
    expect(screen.getByText(/Your first idea still spans the water/)).toBeInTheDocument();
    expect(screen.getByText(/Scene 1: Your invention could join two places and hold weight/)).toBeInTheDocument();
    await playScene(user, /Hold things in place/);
    await user.click(button("Next scene"));

    expect(screen.getByRole("heading", { name: "Scene 3: Peeping on the rock" })).toBeInTheDocument();
    await playScene(user, /Carry someone/, /Float/);
    expect(screen.getByText(/floating ride/)).toBeInTheDocument();
    await user.click(button("See my adventure"));

    expect(screen.getByRole("heading", { name: "Your adventure trail" })).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem").filter((li) => li.className === "step");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Scene 1: The wide river");
    expect(steps[0]).toHaveTextContent("Your invention could join two places and hold weight.");
    expect(steps[0]).toHaveTextContent("Chosen without drawing.");
    expect(screen.getByText(/stayed in the story/)).toBeInTheDocument();
  });

  it("two different paths through the same adventure read differently", async () => {
    mockFetch(manual);
    const first = render(<Game />);
    let user = await startDrawing();
    await playScene(user, /Join two places/);
    await user.click(button("Next scene"));
    const a = screen.getByText(/Rain upstream|Your first idea/).textContent;
    first.unmount();
    localStorage.clear();

    render(<Game />);
    user = await startDrawing();
    await playScene(user, /Give light/);
    expect(screen.getByText(/Mossy watches it do its own thing/)).toBeInTheDocument();
    await user.click(button("Next scene"));
    const b = screen.getByText(/Rain upstream|Your first idea/).textContent;
    expect(a).not.toEqual(b);
  });

  it("allows at most two capabilities, with Something else on its own", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await user.click(button("Choose without drawing"));
    expect(button("That's what it does")).toHaveAttribute("aria-disabled", "true");
    await pick(user, /Float/, /Fly/);
    const rolls = screen.getByRole("checkbox", { name: /Roll/ });
    expect(rolls).toBeDisabled();
    expect(screen.getByText(/That is two/)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /Something else/ }));
    expect(screen.getByRole("checkbox", { name: /Something else/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Float/ })).not.toBeChecked();
    await user.click(button("That's what it does"));
    expect(screen.getByText(/nobody expected/)).toBeInTheDocument();
  });

  it("an unknown idea continues with a neutral, respectful result", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await playScene(user, /Something else/);
    expect(screen.getByText(/Mossy watches it do its own thing/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next scene" })).toBeInTheDocument();
  });
});

describe("canvas", () => {
  it("draws with the keyboard; undo, redo, and clear (with confirmation) work", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await drawWithKeyboard(user);
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line on the page.");
    expect(button("I'm done drawing")).not.toHaveAttribute("aria-disabled", "true");

    await user.click(button("Undo"));
    expect(screen.getByTestId("line-count")).toHaveTextContent("Nothing drawn yet.");
    await user.click(button("Redo"));
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");

    await user.click(button("Clear"));
    expect(screen.getByText("Clear this scene's drawing?")).toBeInTheDocument();
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
    await user.click(button("Keep it"));
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
    await user.click(button("Clear"));
    await user.click(button("Yes, clear it"));
    expect(screen.getByTestId("line-count")).toHaveTextContent("Nothing drawn yet.");
    await user.click(button("Undo"));
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
  });

  it("draws with pointer events, erases whole lines, and ignores other pointers", async () => {
    mockFetch(manual);
    render(<Game />);
    await startDrawing();
    const user = userEvent.setup();
    const canvas = document.querySelector("canvas")!;
    const base = { pointerId: 1, isPrimary: true, pointerType: "touch", button: 0 };
    fireEvent.pointerDown(canvas, { ...base, pointerId: 2, isPrimary: false, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { ...base, pointerId: 2, isPrimary: false, clientX: 20, clientY: 20 });
    fireEvent.pointerDown(canvas, { ...base, pointerType: "mouse", button: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { ...base, pointerType: "mouse", button: 2, clientX: 20, clientY: 20 });
    expect(screen.getByTestId("line-count")).toHaveTextContent("Nothing drawn yet.");

    fireEvent.pointerDown(canvas, { ...base, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { ...base, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(canvas, { ...base, clientX: 300, clientY: 100 });
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");

    // A cancelled stroke is discarded.
    fireEvent.pointerDown(canvas, { ...base, clientX: 100, clientY: 300 });
    fireEvent.pointerMove(canvas, { ...base, clientX: 300, clientY: 300 });
    fireEvent.pointerCancel(canvas, base);
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");

    await user.click(screen.getByRole("radio", { name: "Erase" }));
    expect(screen.getByTestId("tool-now")).toHaveTextContent("Eraser");
    fireEvent.pointerDown(canvas, { ...base, clientX: 200, clientY: 104 });
    fireEvent.pointerUp(canvas, { ...base, clientX: 200, clientY: 104 });
    expect(screen.getByTestId("line-count")).toHaveTextContent("Nothing drawn yet.");
    await user.click(button("Undo"));
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
    await user.click(screen.getByRole("radio", { name: "Berry red" }));
    expect(screen.getByTestId("tool-now")).toHaveTextContent("Crayon, Berry red, medium");
  });

  it("a stylus with pressure draws like any other pointer", async () => {
    mockFetch(manual);
    render(<Game />);
    await startDrawing();
    const canvas = document.querySelector("canvas")!;
    const pen = { pointerId: 7, isPrimary: true, pointerType: "pen", button: 0 };
    fireEvent.pointerDown(canvas, { ...pen, pressure: 0.4, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { ...pen, pressure: 0.8, clientX: 200, clientY: 150 });
    fireEvent.pointerUp(canvas, { ...pen, pressure: 0, clientX: 300, clientY: 200 });
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).toContain('"pr":'));
  });
});

describe("persistence", () => {
  it("stores progress, restores it in every scene, and Start over erases it", async () => {
    mockFetch(manual);
    const first = render(<Game />);
    let user = await startDrawing();
    await drawWithKeyboard(user);
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).toContain('"phase":"draw"'));
    first.unmount();

    const second = render(<Game />);
    expect(await screen.findByTestId("line-count")).toHaveTextContent("1 line");
    expect(screen.getByTestId("announcer")).toHaveTextContent("Welcome back");
    await user.click(button("I'm done drawing"));
    await pick(user, /Float/);
    await user.click(button("That's what it does"));
    await user.click(button("Next scene"));
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).toContain('"scene":1'));
    second.unmount();

    render(<Game />);
    expect(await screen.findByRole("heading", { name: "Scene 2: The river rushes" })).toBeInTheDocument();
    expect(screen.getByText(/Scene 1: Your invention could float/)).toBeInTheDocument();
    user = userEvent.setup();
    await user.click(button("Start over"));
    await user.click(button("Yes, erase and start over"));
    expect(screen.getByRole("heading", { level: 1, name: "Across the river" })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("ignores corrupt or old stored data and starts fresh", async () => {
    localStorage.setItem(SESSION_KEY, '{"v":2,"savedAt":1,"writer":"abcdefgh","state":{"missionId":"<img src=x onerror=alert(1)>"}}');
    localStorage.setItem("drawaway:session:v1", "{}");
    mockFetch(manual);
    render(<Game />);
    expect(await screen.findByRole("heading", { level: 1, name: "Across the river" })).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(localStorage.getItem("drawaway:session:v1")).toBeNull();
  });

  it("warns before replay or a new adventure discards the drawings", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await playScene(user, /Join two places/);
    await user.click(button("Next scene"));
    await playScene(user, /Hold things in place/);
    await user.click(button("Next scene"));
    await playScene(user, /Carry someone/);
    await user.click(button("See my adventure"));

    await user.click(button("Play this adventure again"));
    expect(screen.getByText(/This clears your drawings from this adventure/)).toBeInTheDocument();
    await user.click(button("Not yet"));
    expect(screen.getByRole("heading", { name: "Your adventure trail" })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();

    await user.click(button("Try another adventure"));
    await user.click(button("Yes, clear them and go on"));
    expect(screen.getByRole("heading", { level: 1, name: "The windy hill" })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe("two tabs", () => {
  const otherTab = (over: object = {}) => {
    const s = { ...initialState("fog"), phase: "draw" as const, ...over };
    return serializeSession(s, "other-tab-uuid-1234")!;
  };

  it("never overwrites silently: asks which version to keep", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await drawWithKeyboard(user);
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).not.toBeNull());
    const mine = localStorage.getItem(SESSION_KEY);

    const theirs = otherTab();
    act(() => {
      localStorage.setItem(SESSION_KEY, theirs);
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY, newValue: theirs }));
    });
    expect(await screen.findByTestId("tab-conflict")).toHaveTextContent("Another tab changed this adventure");
    // While undecided, further drawing does not overwrite the other tab's save.
    await drawWithKeyboard(user);
    expect(localStorage.getItem(SESSION_KEY)).toBe(theirs);

    await user.click(button("Keep what I have here"));
    expect(screen.queryByTestId("tab-conflict")).toBeNull();
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).not.toBe(theirs));
    expect(mine).not.toBeNull();
    expect(screen.getByTestId("line-count")).toHaveTextContent(/lines? on the page/);
  });

  it("can load the newest version instead; strokes are never merged", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await drawWithKeyboard(user);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY, newValue: otherTab() }));
    });
    await user.click(await screen.findByRole("button", { name: "Use the newest version" }));
    expect(screen.getByRole("heading", { name: "Scene 1: Lost in the mist" })).toBeInTheDocument();
    expect(screen.getByTestId("line-count")).toHaveTextContent("Nothing drawn yet.");
  });

  it("an echo of this tab's own write, or a tab in the intro, causes no prompt", async () => {
    mockFetch(manual);
    render(<Game />);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY, newValue: otherTab() }));
    });
    // A fresh intro has nothing to lose, so it simply adopts the other tab's session.
    expect(await screen.findByRole("heading", { name: "Scene 1: Lost in the mist" })).toBeInTheDocument();
    expect(screen.queryByTestId("tab-conflict")).toBeNull();
  });

  it("another tab starting over asks before this tab does the same", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await drawWithKeyboard(user);
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_KEY, newValue: null }));
    });
    expect(await screen.findByRole("button", { name: "Start over here too" })).toBeInTheDocument();
    await user.click(button("Keep what I have here"));
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
  });
});

describe("explicit helper (fake provider)", () => {
  const ok = (caps: string[], label: string | null = null) => () =>
    Response.json({ status: "ok", capabilities: caps, label, source: "fake" });

  async function toDescribe(user: User) {
    await drawWithKeyboard(user);
    await user.click(button("I'm done drawing"));
  }

  it("shows no helper button in manual mode", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await toDescribe(user);
    expect(screen.queryByRole("button", { name: /helper/i })).toBeNull();
    expect(screen.getByText(/Nothing here looks at your drawing/)).toBeInTheDocument();
  });

  it("asks only on request, proposes capabilities, and only the child's confirmation advances", async () => {
    const f = mockFetch(remote(ok(["carries_someone", "floats"], "big fish")));
    render(<Game />);
    const user = await startDrawing();
    await toDescribe(user);
    const calls = () => f.mock.calls.filter(([u]) => String(u).includes("/api/interpret"));
    expect(calls()).toHaveLength(0);
    expect(screen.getByText(/sends a small copy of the scene/)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
    expect(await screen.findByText(/I think your big fish can carry someone and float/)).toBeInTheDocument();
    expect(calls()).toHaveLength(1);
    const sent = JSON.parse(String(calls()[0]![1]!.body));
    expect(Object.keys(sent).sort()).toEqual(["imageBase64", "missionId", "scene"]);
    expect(screen.queryByRole("heading", { name: "Here is what happens" })).toBeNull();

    await user.click(button("Yes, that's it"));
    expect(screen.getByRole("heading", { name: "Here is what happens" })).toBeInTheDocument();
    expect(screen.getByText(/Your big fish/)).toBeInTheDocument();
  });

  it("lets the child change the proposal: remove, replace, or add a capability", async () => {
    mockFetch(remote(ok(["carries_someone", "floats"], "big fish")));
    render(<Game />);
    const user = await startDrawing();
    await toDescribe(user);
    await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
    await user.click(await screen.findByRole("button", { name: "No, let me change it" }));
    expect(screen.getByRole("checkbox", { name: /Carry someone/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Float/ })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: /Float/ }));
    await user.click(screen.getByRole("checkbox", { name: /Fly/ }));
    await user.click(button("That's what it does"));
    // The label belonged to the helper's guess, so it is dropped once the child changes it.
    expect(screen.getByText(/Your invention/)).toBeInTheDocument();
    expect(screen.queryByText(/big fish/)).toBeNull();
    expect(screen.getByText(/It can also fly/)).toBeInTheDocument();
  });

  it("an unsure helper says so honestly and the child chooses", async () => {
    mockFetch(remote(() => Response.json({ status: "fallback", reason: "unsure" })));
    render(<Game />);
    const user = await startDrawing();
    await toDescribe(user);
    await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
    expect(await screen.findByRole("heading", { name: "I'm not sure yet." })).toBeInTheDocument();
    expect(screen.getByText("What does your idea help Mossy do?")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(10);
  });

  it("keeps the drawing and offers manual choice when the helper fails or sends nonsense", async () => {
    for (const reply of [
      () => Response.json({ status: "fallback", reason: "rate_limited" }),
      () => new Response("down", { status: 503 }),
      () => Response.json({ status: "ok", capabilities: ["teleports"], label: null, source: "groq" }),
      () => Response.json({ status: "ok", capabilities: ["floats", "flies", "rolls"], label: null, source: "groq" }),
      () => Promise.reject(new Error("offline")),
    ]) {
      mockFetch(remote(reply));
      const view = render(<Game />);
      const user = await startDrawing();
      await toDescribe(user);
      await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
      expect((await screen.findAllByText(/Your drawing is safe/)).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(10);
      await user.click(button(/Keep drawing/));
      expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
      view.unmount();
      localStorage.clear();
    }
  });

  it("ignores a late helper answer after the child went back to drawing", async () => {
    let release: (r: Response) => void = () => {};
    mockFetch(remote(() => new Promise<Response>((res) => (release = res))));
    render(<Game />);
    const user = await startDrawing();
    await toDescribe(user);
    await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
    await user.click(button(/Keep drawing/));
    await act(async () => {
      release(Response.json({ status: "ok", capabilities: ["floats"], label: null, source: "fake" }));
    });
    expect(screen.getByRole("heading", { name: "Scene 1: The wide river" })).toBeInTheDocument();
    expect(screen.queryByText(/I think/)).toBeNull();
    expect(screen.getByTestId("announcer")).not.toHaveTextContent(/helper/i);
  });

  it("can cancel a slow helper request", async () => {
    mockFetch(remote(() => new Promise<Response>(() => {})));
    render(<Game />);
    const user = await startDrawing();
    await toDescribe(user);
    await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
    expect(screen.getAllByText(/The helper is looking/).length).toBeGreaterThan(0);
    await act(async () => {
      await user.click(button("Cancel"));
    });
    expect(button("Ask the helper to look")).toBeEnabled();
    expect(within(document.body).getAllByRole("checkbox").length).toBeGreaterThan(10);
  });

  it("is not offered when the child chose without drawing", async () => {
    mockFetch(remote(ok(["floats"])));
    render(<Game />);
    const user = await startDrawing();
    await user.click(button("Choose without drawing"));
    expect(screen.queryByRole("button", { name: "Ask the helper to look" })).toBeNull();
  });
});
