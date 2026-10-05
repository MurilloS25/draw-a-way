# Privacy and storage

## What the app collects

Nothing about the child. There is no name, age, email, login, photo, camera,
location, analytics, advertising, or marketing cookie. Fonts and images are
local; the page makes no third-party requests (the e2e suite fails on any
request that leaves the origin).

## Browser storage

| Key                   | Where          | Contents                                                                                                                                                                                                          | Written when                                        | Removed when                                                                                                                         |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `drawaway:session:v1` | `localStorage` | Version, save time, mission id, round, phase, confirmed idea id, confirmed change id, "chose without drawing" flag, and simplified strokes (integers in a 1000x700 space: color index, size index, round, points) | After every step once the child has started drawing | "Start over", finishing to the intro, corrupt/oversize data, expired data (on the next visit), or any keys starting with `drawaway:` |

Limits: 150 strokes, 1,500 points per stroke, 15,000 points total, 200 KB
serialized, 24 hours. Older or unknown versions are discarded, not migrated,
because only version 1 exists. No images are stored. No cookies or
`sessionStorage`/IndexedDB are used. Nothing is synced between devices.

If storage is unavailable (private mode), the app keeps working in memory.

## What can leave the device

Only if an operator sets `INTERPRETER_MODE` to `fake` or `groq` **and** the child
presses "Ask the helper to look":

- A JSON body: mission id, round, (in round 2) the confirmed first idea id, and a
  PNG of the child's lines on white, at most 512 px wide. A canvas re-encode
  carries no EXIF or text metadata (verified by an e2e check); the endpoint itself
  only checks the PNG header and size, so a direct API caller could send other bytes.
- The server validates it, forwards it to the provider (Groq mode only), and
  returns an id. It does not store, log, or cache the image or the answer.
- The provider receives the image and an application-written prompt. Its own
  retention is governed by its terms; review them before enabling.

The disclosure sentence appears next to the button. Default mode sends nothing.

## Server

No database, no logs written by the app, no IP storage. The in-memory limiter
hashes a client hint with a per-process random salt and keeps only counters.

## Regulation note

This is a design intent, not legal advice. The app avoids collecting personal
information and persistent identifiers, which is how it avoids needing parental
consent flows. Before a public launch, review applicable rules (for example
COPPA and GDPR-K), the hosting plan terms, and the provider's data terms.
