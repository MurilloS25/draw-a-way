# Draw a Way

Draw a solution. See what it changes. Try again.

Draw a Way is a small creative experience for children (roughly 8-12). Each
adventure is three short scenes. In every scene a story problem appears, the
child draws something that might help (or chooses without drawing), says what
the idea **does**, and sees the story react. Earlier ideas stay in the world and
change what comes next. It ends with a trail of the three ideas.

It is not a drawing contest, a chatbot, or an image generator. The child's own
lines are always the picture, and the story only moves from what the child
confirms.

## Status

Working version for a second round of manual acceptance. It runs completely
without accounts, credentials, or network access.

- Three adventures (a river, a windy hill, lights in the fog), three scenes each.
- Ideas are understood as **capabilities** (what an idea can do), not as a fixed
  list of objects, so unexpected inventions work. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Mouse, touch, stylus (pressure optional), and keyboard drawing, an eraser,
  undo/redo, clear with confirmation, and a complete path with no drawing at all.
- Provider-free by default. A server-only Groq adapter is implemented and tested
  against fakes, but has **never made a real call** and is off unless configured.
  See [docs/GROQ.md](docs/GROQ.md).
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

Checks (all were run; see [docs/HARNESS.md](docs/HARNESS.md)):

```bash
npm run format:check && npm run lint && npm run typecheck && npm test
npm run build && npm run test:e2e               # Chromium on the production build
npm run scan:secrets && npm run scan:build      # secret scan, build output review
```

First-time e2e setup: `npx playwright install chromium`.

## How it works without a provider

After drawing, the child presses "I'm done drawing". The app does **not** claim
to see the drawing. It says so and asks the child to pick up to two things the
idea can do (join two places, carry someone, float, give light, ...) or
"Something else". Only that confirmed choice changes the story. The same
structure is used when an optional helper is configured: the helper proposes
capabilities and the child accepts, changes, or replaces them.

## Privacy

- No account, name, age, email, photo, camera, location, analytics, or cookies.
- Drawings stay on the device. One local storage key (`drawaway:session:v2`) holds
  the current adventure as simplified lines and the confirmed capabilities. See
  [docs/PRIVACY.md](docs/PRIVACY.md).
- "Start over" erases everything the app stored. Replaying or starting a new
  adventure asks first, because it discards drawings.
- Two open tabs never overwrite each other silently: the app asks which version to keep.
- Nothing is sent anywhere unless a helper is configured _and_ the child presses
  its button, which discloses the upload first. Only a small picture of the
  scene and the child's lines is sent, with no interface and no metadata.

## Accessibility

Pointer Events, keyboard drawing (arrows and Space), a no-drawing path for all
three scenes, visible focus, focus moved to each new heading, announced changes,
44 px targets, reflow at 320 px, enlarged text, tools that never rely on color
alone, and `prefers-reduced-motion`. Automated axe checks run on every kind of
stage at three widths. This is automated evidence, not a human audit.

## Documentation

- [Architecture](docs/ARCHITECTURE.md), [decisions](docs/decisions/), [plan](docs/plans/0001-draw-a-way-mvp.md), [design notes](docs/DESIGN.md)
- [Harness](docs/HARNESS.md), [Privacy and storage](docs/PRIVACY.md)
- [Enable Groq later](docs/GROQ.md), [Manual acceptance](docs/ACCEPTANCE.md)
- [Agent guide](AGENTS.md)

## Known limitations

- The Groq adapter is untested against the real service; accuracy of any model at
  mapping children's drawings to capabilities is unmeasured. The strict-schema
  size limits (`maxItems`, `maxLength`) are enforced locally, not sent, because
  Groq's support for them is unverified.
- The rate limiter is per server instance, not global, and the minute bucket is
  shared by all visitors. Keep Groq disabled for public use until there is a real
  quota policy.
- Fifteen capability choices are a lot; whether children find them easy is
  untested. Outcome text is generic when two capabilities combine.
- No human testing, with children or with assistive technology. Content has not
  been reviewed by an educator or child-safety specialist.
- Stylus pressure only thickens or thins a line a little; palm rejection is
  not handled.
- Tab conflict detection relies on browser `storage` events.
- Sessions saved by the first MVP (storage v1) are discarded, not migrated.
- English only. Hobby-plan hosting is for non-commercial use; check the terms.

## For developers

What the codebase demonstrates technically: a declarative narrative engine
(needs, variants, outcome levels, branch-and-merge) separate from content, a pure
reducer that only advances from child-confirmed capability sets, canvas layers
with a composite raster for an optional model, an adapter boundary for an
untrusted model whose output can only select ids from an application-owned list,
versioned bounded storage with multi-tab conflict handling, a nonce-based CSP,
and an e2e suite that runs against the production build.
