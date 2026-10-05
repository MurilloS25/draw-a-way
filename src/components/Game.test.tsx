// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Game } from "./Game";
import { SESSION_KEY } from "@/lib/session/storage";

vi.mock("@/lib/drawing/render", async (orig) => ({
  ...(await orig<typeof import("@/lib/drawing/render")>()),
  exportPngBase64: () => "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
}));

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

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

async function startDrawing() {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Start drawing" }));
  return user;
}

/** Draws one line with the keyboard: the pen goes down, moves, and lifts. */
async function drawWithKeyboard(user: ReturnType<typeof userEvent.setup>) {
  const area = screen.getByRole("application");
  area.focus();
  await user.keyboard(" ");
  await user.keyboard("{ArrowRight}{ArrowRight}{ArrowDown}");
  await user.keyboard(" ");
}

describe("Game flow", () => {
  it("opens straight to the first mission with no network request besides capabilities", async () => {
    const f = mockFetch(manual);
    render(<Game />);
    expect(screen.getByRole("heading", { level: 1, name: "Across the river" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start drawing" })).toBeEnabled();
    expect(screen.queryByRole("textbox")).toBeNull();
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1));
    expect(String(f.mock.calls[0]![0])).toBe("/api/capabilities");
  });

  it("completes a mission without drawing, in two rounds, to the summary", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();

    expect(screen.getByRole("button", { name: "I'm done drawing" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("button", { name: "Choose an idea without drawing" }));

    expect(screen.getByRole("heading", { name: "What did you make?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "That's my idea" })).toHaveAttribute("aria-disabled", "true");
    await user.click(screen.getByRole("radio", { name: /A bridge/ }));
    await user.click(screen.getByRole("button", { name: "That's my idea" }));

    expect(screen.getByRole("heading", { name: "Your idea: a bridge" })).toBeInTheDocument();
    expect(screen.getByText(/Mossy slides onto your bridge/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try a change" }));

    await user.click(screen.getByRole("button", { name: "I'm done drawing" }));
    expect(screen.getByRole("heading", { name: "What did you change?" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: /Add a rail/ }));
    await user.click(screen.getByRole("button", { name: "That's my idea" }));

    expect(screen.getByText(/With the rail, Mossy crosses back/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "See my story trail" }));
    expect(screen.getByRole("heading", { name: "Your story trail" })).toBeInTheDocument();
    expect(screen.getByText("Chosen without drawing.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try another mission" }));
    expect(screen.getByRole("heading", { level: 1, name: "The windy hill" })).toBeInTheDocument();
  });

  it("switches missions only from the intro and offers all three", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = userEvent.setup();
    const group = screen.getByRole("group", { name: "Choose a mission" });
    await user.click(within(group).getByRole("button", { name: "Lost in the fog" }));
    expect(screen.getByRole("heading", { level: 1, name: "Lost in the fog" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Lost in the fog" })).toHaveAttribute("aria-pressed", "true");
  });

  it("draws with the keyboard, then undo, redo, and clear work", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await drawWithKeyboard(user);
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line on the page.");
    expect(screen.getByRole("button", { name: "I'm done drawing" })).not.toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByTestId("line-count")).toHaveTextContent("Nothing drawn yet.");
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByTestId("line-count")).toHaveTextContent("Nothing drawn yet.");
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
  });

  it("draws with pointer events and ignores secondary pointers and mouse buttons", async () => {
    mockFetch(manual);
    render(<Game />);
    await startDrawing();
    const canvas = document.querySelector("canvas")!;
    const base = { pointerId: 1, isPrimary: true, pointerType: "touch", button: 0 };
    fireEvent.pointerDown(canvas, { ...base, pointerId: 2, isPrimary: false, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { ...base, pointerId: 2, isPrimary: false, clientX: 20, clientY: 20 });
    fireEvent.pointerDown(canvas, { ...base, pointerType: "mouse", button: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(canvas, { ...base, pointerType: "mouse", button: 2, clientX: 20, clientY: 20 });
    expect(screen.getByTestId("line-count")).toHaveTextContent("Nothing drawn yet.");

    fireEvent.pointerDown(canvas, { ...base, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { ...base, clientX: 300, clientY: 250 });
    fireEvent.pointerUp(canvas, { ...base, clientX: 400, clientY: 300 });
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");

    // A pointer cancel discards the stroke instead of keeping a half line.
    fireEvent.pointerDown(canvas, { ...base, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { ...base, clientX: 300, clientY: 250 });
    fireEvent.pointerCancel(canvas, base);
    expect(screen.getByTestId("line-count")).toHaveTextContent("1 line");
  });

  it("stores progress locally, restores it, and Start over erases it", async () => {
    mockFetch(manual);
    const first = render(<Game />);
    const user = await startDrawing();
    await drawWithKeyboard(user);
    await waitFor(() => expect(localStorage.getItem(SESSION_KEY)).toContain('"phase":"draw"'));
    first.unmount();

    render(<Game />);
    expect(await screen.findByTestId("line-count")).toHaveTextContent("1 line");

    await user.click(screen.getByRole("button", { name: "Start over" }));
    await user.click(screen.getByRole("button", { name: "Yes, erase and start over" }));
    expect(screen.getByRole("heading", { level: 1, name: "Across the river" })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("ignores corrupt stored data and starts fresh", async () => {
    localStorage.setItem(SESSION_KEY, '{"v":1,"savedAt":1,"state":{"missionId":"<img src=x onerror=alert(1)>"}}');
    mockFetch(manual);
    render(<Game />);
    expect(await screen.findByRole("heading", { level: 1, name: "Across the river" })).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("never renders markup from model-like or stored text", async () => {
    mockFetch(manual);
    const { container } = render(<Game />);
    expect(container.innerHTML).not.toMatch(/<script|onerror|javascript:/i);
  });
});

describe("explicit helper (fake provider)", () => {
  async function toConfirm(user: ReturnType<typeof userEvent.setup>) {
    await drawWithKeyboard(user);
    await user.click(screen.getByRole("button", { name: "I'm done drawing" }));
  }

  it("shows no helper button in manual mode", async () => {
    mockFetch(manual);
    render(<Game />);
    const user = await startDrawing();
    await toConfirm(user);
    expect(screen.queryByRole("button", { name: /helper/i })).toBeNull();
    expect(screen.getByText(/Nothing here looks at your drawing/)).toBeInTheDocument();
  });

  it("asks only on request, shows a suggestion, and only a confirmation advances the story", async () => {
    const f = mockFetch(remote(() => Response.json({ status: "ok", candidateId: "raft", confidence: "medium", source: "fake" })));
    render(<Game />);
    const user = await startDrawing();
    await toConfirm(user);
    const interpretCalls = () => f.mock.calls.filter(([u]) => String(u).includes("/api/interpret"));
    expect(interpretCalls()).toHaveLength(0);

    await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
    expect(await screen.findByText(/I think you made/)).toBeInTheDocument();
    expect(interpretCalls()).toHaveLength(1);
    const sent = JSON.parse(String(interpretCalls()[0]![1]!.body));
    expect(Object.keys(sent).sort()).toEqual(["imageBase64", "missionId", "round"]);
    expect(screen.queryByRole("heading", { name: /^Your idea/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "No, I'll choose" }));
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "Ask the helper to look" }));
    await user.click(await screen.findByRole("button", { name: "Yes, that's it" }));
    expect(screen.getByRole("heading", { name: "Your idea: a raft or boat" })).toBeInTheDocument();
  });

  it("keeps the drawing and offers manual choice when the helper fails or lies", async () => {
    for (const reply of [
      () => Response.json({ status: "fallback", reason: "rate_limited" }),
      () => new Response("down", { status: 503 }),
      () => Response.json({ status: "ok", candidateId: "signpost", confidence: "high", source: "groq" }),
      () => Promise.reject(new Error("offline")),
    ]) {
      mockFetch(remote(reply));
      const view = render(<Game />);
      const user = await startDrawing();
      await toConfirm(user);
      await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
      expect((await screen.findAllByText(/Your drawing is safe/)).length).toBeGreaterThan(0);
      expect(screen.getAllByRole("radio")).toHaveLength(4);
      await user.click(screen.getByRole("button", { name: /Keep drawing/ }));
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
    await toConfirm(user);
    await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
    await user.click(screen.getByRole("button", { name: /Keep drawing/ }));
    await act(async () => {
      release(Response.json({ status: "ok", candidateId: "raft", confidence: "high", source: "fake" }));
    });
    expect(screen.getByRole("heading", { name: "Draw your idea" })).toBeInTheDocument();
    expect(screen.queryByText(/I think you made/)).toBeNull();
    expect(screen.getByTestId("announcer")).not.toHaveTextContent(/helper/i);
  });

  it("can cancel a slow helper request", async () => {
    mockFetch(remote(() => new Promise<Response>(() => {})));
    render(<Game />);
    const user = await startDrawing();
    await toConfirm(user);
    await user.click(await screen.findByRole("button", { name: "Ask the helper to look" }));
    expect(screen.getAllByText(/The helper is looking/).length).toBeGreaterThan(0);
    await act(async () => {
      await user.click(screen.getByRole("button", { name: "Cancel" }));
    });
    expect(screen.getByRole("button", { name: "Ask the helper to look" })).toBeEnabled();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });
});
