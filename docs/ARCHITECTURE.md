# Architecture

## Product boundary

Draw a Way is a set of short story adventures. In each of three scenes a child
draws (or chooses without drawing) something that might solve a problem, says
what the idea does, and sees the story react. The app proposes, the child
confirms, and only the confirmed meaning changes the story. It is not an
unrestricted chatbot, image generator, social network, drawing grader,
developmental assessment, or substitute for a parent, teacher, or professional.

## Core interaction contract (per scene)

1. A new or evolved problem is shown (the story reads earlier confirmed ideas).
2. The child draws, or chooses without drawing.
3. An explicit button asks "what does your idea do?". Nothing is interpreted or sent before it.
4. The child picks one or two capabilities, or "Something else" (manual mode), or
   accepts, changes, or replaces a helper's proposal.
5. Only the confirmed capabilities go to the engine; the consequence is shown.
6. Persistent effects carry into the next scene. After scene three: a text and
   picture summary of the three decisions.

## Selected implementation

One Next.js 16 (App Router) + TypeScript application, no database or service
(ADR 0001). Server code is two stateless route handlers.

```
src/
  app/                    layout, page, api/interpret, api/capabilities, CSS
  proxy.ts                per-request CSP nonce (ADR 0004)
  components/             Game (flow), DrawingCanvas, Backdrop (scenes), CapabilityPicker,
                          StrokesSvg (+ persistent layer), Trail, Summary, icons
  lib/
    capabilities.ts       taxonomy, phrases, combos, label vetting
    missions/             content.ts (all story text), engine.ts (pure rules)
    session/              state.ts (pure reducer), storage.ts (one local key, tab writer id)
    drawing/              model.ts (schemas, limits), history.ts (undo/redo/erase),
                          layers.ts (persistent layers, hero anchors), render.ts (canvas, composite PNG)
    interpret/            types, config, request, limiter, fake, groq, service, client
    csp.ts
e2e/                      Playwright against the production build
```

### Narrative model (ADR 0005, 0006)

- **Capability**: one of 14 reusable verbs (`connects_places`, `carries_someone`,
  `floats`, `flies`, `rolls`, `pushes_or_pulls`, `shelters`, `blocks`, `anchors`,
  `supports_weight`, `lights_area`, `signals`, `marks_path`, `delivers`) or
  `unknown`. An idea has at most two.
- **Scene** = story (+ variants keyed to earlier capabilities or the previous
  level) + needs + three outcomes (`full`, `partial`, `neutral`) + recaps.
- **Need** = solved by some capabilities, helped by others, skipped when an
  earlier idea covers it. Level: all active needs solved -> `full`; any solved or
  helped -> `partial`; else `neutral` (never "wrong").
- **Decision** = `{caps, label|null, skipped}`. Everything else (level, mood,
  persistence, summary) is derived from decisions, so restored data is re-derived,
  not trusted.
- **Branch-and-merge**: many ideas share a few story variants; each still leaves a
  mark (reminder line, starting mood, persistent drawing). Tests assert both.
- Effects that persist: structures stay on the scene; moving ideas travel with the
  character as a miniature; skipped (no-drawing) decisions persist as text and mood.

### Boundaries and who may do what

| Part                    | May                                                        | May not                                              |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| Mission content         | Define every story string                                  | Be changed at runtime                                |
| Engine                  | Compute needs, level, text, persistence, summary           | Touch DOM, network, or storage                       |
| Session reducer         | Advance only on a validated child-confirmed capability set | Accept unknown capabilities, >2, or edit past scenes |
| Storage                 | Persist and validate state under `drawaway:*`              | Store images, backdrops, or trust stored data        |
| Interpreter (fake/groq) | Return an untrusted proposal                               | Add text, rules, ids, scenes; log; store             |
| Service                 | Validate request and answer; map failures to fallbacks     | Return provider text; decide the story               |
| UI                      | Render content as text; ask the child                      | Use `innerHTML`; auto-send a drawing                 |

### Canvas layers (ADR 0007)

SVG backdrop (never stored) -> persistent layer (earlier strokes that stay) ->
current strokes (canvas) -> interface. Strokes are vector data tagged with a
scene index, so undo/redo, erase (whole lines, current scene only), persistence,
comparison and the summary share one list. The helper image is a 512 px
composite of the first three layers.

### Interpretation data flow

Manual (default): draw -> child picks capabilities -> reducer validates -> consequence.
No request is made.

Helper (opt-in server mode): draw -> child presses "Ask the helper" -> client builds
the composite PNG -> `POST /api/interpret` with mission id, scene index, earlier
capabilities, and the image -> request validated (size, base64, PNG header,
dimensions, enums) -> budget check -> adapter -> answer validated against a strict
schema (`proposed_affordances` 1-2 taxonomy ids, `optional_safe_label`,
`confidence`, `uncertain`, `needs_child_confirmation`) -> unknown, uncertain, or
low confidence becomes "I'm not sure yet" -> otherwise a proposal ("I think your
invention can carry someone and float. Is that what you meant?") -> the child
accepts, changes, or replaces it -> only then does the reducer move. Every
failure becomes a named fallback and the child picks manually; strokes are never lost.

## Trust boundaries

- Drawings, strokes, labels, storage, model output, and request bodies are untrusted.
- A drawing is data: words in it are never followed. The model's only output
  channel is a short list of taxonomy ids and a vetted decorative label.
- The key exists only in server environment variables; `scan:build` and an e2e
  test check the browser bundles and responses for it.
- The browser makes no third-party requests.
- Browser storage is persistence: one documented key, bounded, erasable, with
  multi-tab conflict handling (ADR 0008).

## Limits

Constants in `src/lib/drawing/model.ts` and `src/lib/interpret/config.ts`, covered
by tests: 150 strokes, 1,500 points per stroke, 15,000 points, 200 KB session,
24 h; helper image PNG <= 768 px per side and <= 400 KB, body <= 560 KB, timeout
10 s, one counted retry on 5xx only, 8 requests per minute (shared) and 300 per
day per instance (hard ceilings 60 and 2,000).

## Accessibility architecture

The drawing area is a focusable application region with keyboard pen/eraser
controls; "Choose without drawing" is a first-class button in every scene; the
capability picker uses native checkboxes with icon plus text; scene changes move
focus to the heading and update a polite live region; reduced-motion CSS shows the
end state of each consequence.

## Deliberately not built

Accounts, database, analytics, uploads, sharing, chat, free-text input, in-browser
inference, deployment configuration, a global rate limiter, cross-device sync.

## Open questions

Real-world accuracy of any model; educator and child-safety review of content;
testing with children and assistive-technology users; a global quota design for
public use; localization.
