# One versioned local storage key holding simplified strokes

- Status: accepted
- Date: 2026-10-05

## Context

Interrupted sessions should resume, but drawings are children's data.

## Decision

A single `localStorage` key, `drawaway:session:v1`, stores a versioned JSON
object: mission id, round, phase, confirmed idea ids, and simplified integer
strokes in a 1000x700 logical space. No image data URLs. Hard limits on
strokes, points, serialized size, and a 24 h lifetime. Corrupt, oversize,
expired, or unknown-version data is discarded. "Start over" removes every key
beginning with `drawaway:`. Nothing is synced or sent anywhere.

## Consequences

Strokes redraw crisply at any size and let the summary compare rounds. Storage
may be unavailable (private mode); the app works in memory and says nothing
scary. Future versions add a migration function per version.

## Alternatives considered

Persisting a bitmap: larger, blurrier, less structured. IndexedDB: unnecessary.
No persistence: loses work on accidental reload.
