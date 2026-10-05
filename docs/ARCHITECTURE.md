# Architecture

## Product boundary

Draw a Way begins with a small narrative problem and invites a child to draw a
solution. The system forms a bounded interpretation, asks the child to confirm
or correct it, and applies the confirmed idea to the story. A consequence then
creates an opportunity to revise once. The session ends with a visual summary.

The product is not an unrestricted chatbot, image generator, social network,
drawing grader, developmental assessment, or substitute for a parent, teacher,
or professional.

## Core interaction contract

1. Present one age-appropriate mission immediately.
2. Accept a drawing through a canvas, or an idea chosen without drawing.
3. Produce a small, bounded set of candidates (the mission's ideas).
4. The child confirms or corrects in plain language.
5. Advance only from the confirmed id, never a hidden model guess.
6. Show a consequence and invite one purposeful revision (round 2).
7. End with a summary; offer replay, another mission, or Start over.

## Selected implementation

One Next.js 16 (App Router) + TypeScript application, no database or service
(ADR 0001). Server code is two stateless route handlers.

```
src/
  app/                    layout, page, api/interpret, api/capabilities, CSS
  proxy.ts                per-request CSP nonce (ADR 0004)
  components/             Game (flow), DrawingCanvas, Scene, StrokesSvg, Trail, Summary
  lib/
    missions/             content.ts (all story text), engine.ts (pure lookups)
    session/              state.ts (pure reducer), storage.ts (one local key)
    drawing/              model.ts (schemas, limits), render.ts (canvas, PNG export)
    interpret/            types, config, request, limiter, fake, groq, service, client
    csp.ts
e2e/                      Playwright against the production build
```

### Boundaries and who may do what

| Part                    | May                                                          | May not                                   |
| ----------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Mission content         | Define every story string and id                             | Be changed at runtime                     |
| Engine                  | Say which ids are valid for a mission, round, and prior idea | Touch DOM or network                      |
| Session reducer         | Change phase/ids from child actions; reject unknown ids      | Accept ids not in the engine's candidates |
| Storage                 | Persist and validate state under `drawaway:*`                | Store images; trust stored data           |
| Interpreter (fake/groq) | Return an untrusted answer                                   | Add text, ids, or state; log; store       |
| Service                 | Validate request and answer; map failures to fallbacks       | Return provider text                      |
| UI                      | Render content as text; ask the child                        | Use `innerHTML`; auto-send a drawing      |

### Interpretation data flow

Manual (default): draw -> child picks an idea -> reducer validates the id ->
consequence. No request is made.

Helper (opt-in server mode): draw -> child presses "Ask the helper" -> client
exports a 512 px white-background PNG of the strokes only -> `POST
/api/interpret` -> request validated (size, base64, PNG header, dimensions,
mission, round) -> budget check -> adapter -> answer validated against a strict
schema **and** the active candidate list -> suggestion shown ("I think you made
...") -> child accepts or corrects -> only then does the reducer move. Every
failure becomes a named fallback and the child picks manually; strokes are never
lost.

## Trust boundaries

- Drawings, strokes, storage, model output, and request bodies are untrusted.
- A drawing is data: words in it are never followed. The model's only output
  channel is an enum of ids.
- The key exists only in server environment variables; `scan:build` and an e2e
  test check the browser bundles and responses for it.
- The browser makes no third-party requests.
- Browser storage is persistence: one documented key, bounded, erasable.

## Limits

See the table in the plan (strokes, points, bytes, image size, timeouts,
budgets). They are constants in `src/lib/drawing/model.ts` and
`src/lib/interpret/config.ts` and are covered by tests.

## Accessibility architecture

The drawing area is a focusable application region with keyboard pen controls;
the no-drawing path is a first-class button available every round; stage changes
move focus to the heading and update a polite live region; native radio inputs
serve the choices; reduced-motion CSS shows the end state of each consequence.

## Deliberately not built

Accounts, database, analytics, uploads, sharing, chat, free-text input, in-browser
inference, deployment configuration, a global rate limiter.

## Open questions

Real-world accuracy of any model; educator and child-safety review of the
content; testing with children and assistive-technology users; a global quota
design for public use; localization.
