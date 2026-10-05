# Plan 0001: Draw a Way MVP

Status: implemented; awaiting manual acceptance and PR review.

## Outcome

A child opens the app, receives a short mission, draws (or chooses an idea
without drawing), explicitly asks to be understood, confirms or corrects a
bounded interpretation, sees a consequence, revises once, and finishes with a
visual summary of how the idea evolved. The whole loop works with no
credentials and no network. A server-only Groq adapter is implemented and
unit-tested against fakes, but never called for real in this work.

## Scope

Included: one Next.js web app; three missions; deterministic mission engine;
manual ("you tell me what you made") interpretation; fake and Groq
interpreters behind one interface; one API route; one versioned localStorage
key; accessibility alternatives; tests; docs; an open (unmerged) PR.

Excluded (by AGENTS.md or by decision): accounts, database, analytics, uploads,
camera, sharing, gallery, chat, free-text input, in-browser inference,
deployment, any real provider call, any paid service.

## Research findings

Verified this session from primary sources (fetched 2026-10-05):

- Groq vision docs: model `qwen/qwen3.8-27b`; up to 3 images per request;
  image max 20 MB; images accepted as URL or base64 data URL; supports JSON
  mode and tool use.
- Groq structured outputs: strict `json_schema` mode (constrained decoding)
  supported for `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, and
  `qwen/qwen3.8-27b`. Strict mode requires all properties `required` and
  `additionalProperties: false`.
- Groq rate limits: organization-level RPM/RPD/TPM/TPD; exceeding returns 429
  with a `retry-after` header; the free tier is "restrictive".
- Vercel Hobby: free; non-commercial personal use only; function max duration
  300 s; exceeding included usage means waiting (feature paused ~30 days), no
  on-demand overage billing on Hobby; 1,000,000 function invocations included.
- WCAG 2.2: SC 2.5.7 (AA) requires a non-dragging alternative unless dragging
  is essential; SC 2.5.8 (AA) requires 24x24 CSS px targets (we use >= 44 px).
- MDN Pointer Events: `pointerType` mouse/pen/touch, `pressure` 0-1,
  `setPointerCapture`, `touch-action: none` required for custom drawing.
- FTC COPPA FAQ: personal information includes persistent identifiers, photos,
  geolocation. Commercial operators of child-directed services are covered.

Decisions derived from the above:

- Freehand drawing is arguably essential (2.5.7 exception), but the product
  still offers a keyboard drawing mode and a no-drawing path.
- Collect nothing that is a persistent identifier beyond one local storage key
  that never leaves the device; no cookies, no analytics.
- Default Groq model `qwen/qwen3.8-27b`, selected from a code allowlist.

Inferences (not verified): a 512 px PNG of simple strokes is a few KB-tens of
KB, well inside any limit; one request per explicit action keeps free-tier use
low; in-memory rate limiting is per serverless instance and therefore only
best-effort on Vercel.

Unknown / not verified: exact Groq free-tier numbers for the chosen model
(look at the console limits page before enabling); Vercel's request body limit
(believed 4.5 MB, not re-fetched; we cap at 400 KB regardless); real-world
accuracy of the model on children's drawings (never measured; no real calls
were made); legal sufficiency of the privacy posture (not legal advice).
In-browser inference was not adopted: it would add large model downloads and
battery/CPU cost on ordinary devices for unmeasured benefit.

## Approach and phases

1. **Foundation** - plan, ADRs, Next.js + TypeScript scaffold, lint, test
   runners. Gate: `build`, `lint`, `typecheck` pass on an empty shell.
2. **Pure core** - mission content and schema, deterministic engine, session
   reducer, local persistence with migration/limits/reset. Gate: unit tests.
3. **Interpretation boundary** - interpreter interface, manual/fake/Groq
   adapters, request validation, budget and rate limit, API route. Gate:
   adversarial and failure tests, no network.
4. **Experience** - canvas (pointer, keyboard), mission scenes, stage flow,
   no-drawing path, summary, Start over, visual identity. Gate: component tests.
5. **Hardening** - CSP/headers, Playwright e2e on the production build, axe,
   viewport/zoom/reduced-motion, secret and bundle scans, dependency audit.
6. **Review** - independent change, security/privacy, and child-UX/a11y
   reviews; fix P0-P2; re-run affected checks; inspect real screenshots.
7. **Delivery** - docs, PR (open, not merged), local loopback acceptance
   session.

## Limits (enforced in code)

| Item                            | Limit                                        |
| ------------------------------- | -------------------------------------------- |
| Logical canvas                  | 1000 x 700 integer units                     |
| Strokes                         | 150                                          |
| Points per stroke               | 1,500                                        |
| Total points                    | 15,000                                       |
| Serialized session              | 200 KB                                       |
| Session age                     | 24 h, then discarded                         |
| Interpret image                 | PNG, <= 768 px each side, <= 300 KB decoded  |
| Interpret request body          | <= 420 KB                                    |
| Groq timeout / retries          | 10 s / at most 1 retry, never on 429         |
| Interpret budget (per instance) | 8 req/min shared, 300/day total, fail closed |

## Verification

Unit (Vitest): mission invariants, reducer transitions, persistence
(corrupt, old version, oversize, expired, reset), schema validation, Groq
adapter with fake `fetch` (timeout, 429, invalid JSON, injection text, unknown
ids), request validation (oversize, wrong type, bad PNG), rate limit.
Component (Testing Library): stage flow, no-drawing path, keyboard drawing,
undo/redo/clear, Start over, interpretation failure preserves drawing.
E2E (Playwright, Chromium, production build): three missions end to end,
accessible path, fake interpreter success/failure/429/slow/cancel, offline,
viewports 1440/390/320, zoom, reduced motion, no horizontal scroll, no console
errors, axe on each stage, headers/CSP, client bundle free of `GROQ_API_KEY`.
Other: secret scan, `npm audit`, build output review.

## Risks

- Child-facing copy might imply the app "sees" the drawing in manual mode:
  mitigated by honest wording and review.
- CSP nonces force dynamic rendering: accepted (tiny app).
- Groq model id or limits may change: allowlist is code-reviewed; docs say how
  to verify.
- In-memory limiter is not global: documented; Groq stays opt-in and disabled
  by default.
- Canvas is hard to test in jsdom: logic lives in pure modules; e2e covers
  real pointer input.

## Gates

- G1 after phase 3: no code path reaches a real provider in tests.
- G2 after phase 5: all automated checks green on the production build.
- G3 after phase 6: no open P0/P1 findings.
- G4: PR open and unmerged; nothing deployed.

## Progress

All phases 1-7 are complete except human acceptance. Gates:

- G1 met: unit tests replace `fetch` with a throwing stub; no real provider or model was called.
- G2 met: lint, typecheck, 81 unit/component tests (6 files), production build, 40 Chromium e2e tests (axe on every stage at 1440/390/320, 200% text, reduced motion, offline, CSP/headers, bundle secret check), secret scan (73 files), build review, and `npm audit` (0 vulnerabilities) all passed on the final tree.
- G3 met: three independent reviews (change, security/privacy, child UX/accessibility) found no P0. Fixed: P1 point-cap restore bug, P1 landscape touch trap, P1 focus loss, stale helper race, skipped-drawing flag, aria-disabled hints, spoofable per-client limit (now one shared bucket), retries counted against budget, fake mode ignored in production, copy honesty ("Nothing here looks at your drawing"), roving radio keys. Deferred (documented in README): cross-tab storage clearing, no restore announcement, no warning before replay discards a drawing, palm rejection, h1 on later stages, no "change mission" after starting.
- G4: PR open, not merged; nothing deployed.

Deviations from the original plan: per-client rate limiting became a single shared bucket because forwarded-for headers are client-controlled; the plan table's "per client bucket" no longer applies.
