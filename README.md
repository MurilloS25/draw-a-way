# Draw a Way

Draw a solution. See what it changes. Try again.

Draw a Way is a small creative experience for children (roughly 8-12). A short
story problem appears at once. The child draws a way to solve it, confirms what
they made, sees a consequence in the story, and gets one chance to change their
idea. It ends with a picture of how the idea evolved.

It is not a drawing contest, a chatbot, or an image generator. The child's own
lines are always the picture on the page, and the story only moves when the
child confirms what they meant.

## Status

Working MVP, ready for manual acceptance. It runs completely without accounts,
credentials, or network access.

- Three missions: crossing a river, protecting a sprout from weather, and
  guiding a traveler through fog. Each has four allowed solutions, distinct
  consequences, one revision, and a closing.
- Mouse, touch, stylus, and keyboard drawing, plus a path that needs no drawing.
- Provider-free by default. A server-only Groq adapter is implemented and
  tested against fakes, but has **never made a real call** and is off unless
  configured. See [docs/GROQ.md](docs/GROQ.md).
- Nothing is deployed. No real provider or model was called while building it.

## Run it

Requires Node.js 22 or newer.

```bash
npm install
npm run dev          # http://127.0.0.1:3000
```

Production build:

```bash
npm run build
npm start            # http://127.0.0.1:3000 (loopback only)
```

Checks (all are real commands that were run, see [docs/HARNESS.md](docs/HARNESS.md)):

```bash
npm run lint && npm run typecheck && npm test   # unit and component tests
npm run build && npm run test:e2e               # Chromium on the production build
npm run scan:secrets && npm run scan:build      # secret scan, build output review
```

First-time e2e setup: `npx playwright install chromium`.

## How it works without a provider

After drawing, the child presses "I'm done drawing". The app does **not** claim
to see the drawing. It says so plainly and asks the child to pick, from the
mission's few allowed ideas, the one closest to what they made. Only that
confirmed choice changes the story. The same structure is used when an optional
helper is configured; the helper's guess just arrives as a suggestion the child
can accept or correct.

## Privacy

- No account, name, age, email, photo, camera, location, analytics, or cookies.
- Drawings stay on the device. One local storage key (`drawaway:session:v1`)
  holds the current session as simplified lines. See [docs/PRIVACY.md](docs/PRIVACY.md).
- "Start over" erases everything the app stored.
- Nothing is sent anywhere unless a helper is configured *and* the child presses
  its button, which discloses the upload first. Only a small black-and-white
  copy of the lines is sent, with no page content or metadata.

## Accessibility

Pointer Events (mouse, touch, pen), keyboard drawing (arrows and Space), a
no-drawing path, visible focus, announced stage changes, 44 px targets, reflow
at 320 px, enlarged text, and `prefers-reduced-motion`. Automated axe checks run
on every stage at three widths. This is automated evidence, not a human audit.

## Documentation

- [Architecture](docs/ARCHITECTURE.md), [decisions](docs/decisions/), [plan](docs/plans/0001-draw-a-way-mvp.md)
- [Harness](docs/HARNESS.md), [Privacy and storage](docs/PRIVACY.md)
- [Enable Groq later](docs/GROQ.md), [Manual acceptance](docs/ACCEPTANCE.md)
- [Agent guide](AGENTS.md)

## Known limitations

- The Groq adapter is untested against the real service; accuracy on children's
  drawings is unmeasured. The helper sees only the lines, not the scene.
- The rate limiter is per server instance, not global. Keep Groq disabled for
  public use until a real quota policy exists.
- Stylus pressure is not used: strokes store a fixed width chosen by the child.
- Automated accessibility checks cannot replace testing with children and with
  assistive technology users. No human testing has been done.
- Minor gaps found in review and not fixed: a second browser tab at the intro can
  clear another tab's saved session; reloading resumes silently; "Play this
  mission again" discards the drawing without a warning; a resting palm can
  block the stylus; later stages use h2 rather than h1; changing mission after
  starting requires Start over.
- English only. Content has not been reviewed by an educator or child-safety
  specialist.
- Hobby-plan hosting is for non-commercial use; check the terms before launch.

## For developers

What the codebase demonstrates technically: a pure state machine
(`src/lib/session`) separate from content (`src/lib/missions`), canvas and
storage limits enforced as schemas, an adapter boundary for an untrusted model
(`src/lib/interpret`) whose output can only select an id from an application-
owned list, a nonce-based CSP, and an e2e suite that runs against the production
build.
