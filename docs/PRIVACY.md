# Privacy and storage

## What the app collects

Nothing about the child. There is no name, age, email, login, photo, camera,
location, analytics, advertising, or marketing cookie. Fonts and images are
local; the page makes no third-party requests (the e2e suite fails on any
request that leaves the origin).

## Browser storage

| Key                   | Where          | Contents                                                                                                                                                                                                                                                                                                                                  | Written when                                       | Removed when                                                                                                                                                         |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drawaway:session:v2` | `localStorage` | Version, save time, a random per-page-load writer id, mission id, scene, phase, "chose without drawing" flag, one decision per finished scene (one or two capability ids, an optional vetted label, a skipped flag), and simplified strokes (integers in a 1000x700 space: color index, size index, scene, optional pen pressure, points) | After each step once the child has started drawing | "Start over"; confirming "clear" when replaying or starting another adventure; corrupt, oversize, or expired data (on next visit); any key starting with `drawaway:` |

The old key `drawaway:session:v1` (first MVP) is deleted when found, never read.

Limits: 150 strokes, 1,500 points per stroke, 15,000 points total, 200 KB
serialized, 24 hours. Unknown versions are discarded, not migrated. No images or
scene backdrops are stored. No cookies, `sessionStorage`, or IndexedDB. Nothing is
synced between devices.

The writer id is random, regenerated on every page load, and used only to tell
this tab's writes from another tab's (see ADR 0008). It identifies nobody.

If storage is unavailable (private mode) or full, the app keeps working in memory
and says so quietly.

## What can leave the device

Only if an operator sets `INTERPRETER_MODE` to `fake` or `groq` **and** the child
presses "Ask the helper to look":

- A JSON body: mission id, scene index, the capabilities the child confirmed in
  earlier scenes, and one PNG (512 px wide) made of the scene background, earlier
  elements that stay in the scene, and the child's current lines. Interface
  elements are not included. The app's own canvas re-encode carries no EXIF or text
  metadata (verified by an e2e check); the endpoint itself only checks the PNG
  header and size, so a direct API caller could send other bytes.
- The server validates it, forwards it to the provider (Groq mode only), and
  returns capability ids and an optional vetted label. It does not store, log, or
  cache the image or the answer.
- The provider receives the image and an application-written prompt. Its own
  retention is governed by its terms; review them before enabling.

The disclosure sentence appears before the button. Default mode sends nothing.

## Server

No database, no logs written by the app, no IP storage. The in-memory limiter keeps
only counters in one shared bucket.

## Regulation note

This is a design intent, not legal advice. The app avoids collecting personal
information and persistent identifiers, which is how it avoids needing parental
consent flows. Before a public launch, review applicable rules (for example
COPPA and GDPR-K), the hosting plan terms, and the provider's data terms.
