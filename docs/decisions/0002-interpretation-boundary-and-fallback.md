# Interpretation boundary, honest manual fallback, server-only Groq

- Status: accepted
- Date: 2026-10-05

## Context

Visual interpretation of children's drawings is uncertain and optional. Drawings
are untrusted data and must not be transmitted by default. Groq offers vision
models with strict structured outputs and a restrictive free tier with 429s.

## Decision

- The child always confirms. Narrative state changes only from a confirmed idea
  id that belongs to the active mission and round.
- Interpreter interface: `interpret({missionId, round, candidates, image}) ->
{ideaId | "none", confidence}`. Implementations: `manual` (default, no call,
  child picks from the mission's ideas, worded as "tell us what you made", never
  as recognition), `fake` (deterministic, for tests and acceptance), `groq`
  (server-only).
- The client never talks to a provider. It posts a downscaled PNG to
  `/api/interpret` only after an explicit button press that discloses the
  upload. Default mode sends nothing.
- Model output is parsed against a strict schema whose only free value is an
  enum of the active candidate ids. Any deviation yields the manual fallback.
  Text found inside a drawing is data; the prompt says so and the output
  channel cannot carry instructions.
- Groq is enabled only when `INTERPRETER_MODE=groq` and `GROQ_API_KEY` is set;
  the model must be in a code allowlist; per-instance rate and daily budgets
  fail closed. The in-memory limiter is documented as per-instance, not global.
- No image, answer, key, or identifier is logged or stored.

## Consequences

The product is fully usable without a provider. Real accuracy is unmeasured
until a controlled session is run (see docs/GROQ.md). A global limiter would
need external storage and is deliberately deferred.

## Alternatives considered

In-browser inference: heavy downloads, unmeasured accuracy, device variance.
Free-text or open model output: violates bounded narrative. Client-side calls
with a key: leaks secrets.
