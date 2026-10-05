# Interpret ideas as capabilities, not a closed list of objects

- Status: accepted
- Date: 2026-10-06

## Context

The first MVP matched a drawing to four fixed objects per mission (a bridge, a
raft, ...). Manual acceptance showed that children draw things nobody planned
(a giraffe that works as a bridge, a fish that carries the character, a rocket
with floats). A closed object list either rejects those ideas or forces them
into the wrong box, and it makes a model's guess far too powerful.

## Decision

- The story reacts to a small taxonomy of reusable **capabilities** (what an idea
  can do), not to object names: `connects_places`, `carries_someone`, `floats`,
  `flies`, `rolls`, `pushes_or_pulls`, `shelters`, `blocks`, `anchors`,
  `supports_weight`, `lights_area`, `signals`, `marks_path`, `delivers`, plus
  `unknown`. Fourteen real capabilities is the smallest set that covered all
  nine scenes without leaving a capability that could never matter (a test
  enforces that every capability is useful somewhere).
- An idea has one or two confirmed capabilities, or `unknown` alone.
- Four separate things stay separate: what the drawing seems to be (an optional
  decorative label), what the app proposes it does, what the **child confirms**,
  and the resulting capabilities. Only confirmed capabilities reach the engine.
- `unknown` is a first-class, respectful result with a neutral consequence.
- The optional label is plain text, 2-24 letters, at most three words, vetted by
  `sanitizeLabel`, shown only after the child accepts the proposal unchanged, and
  never used to select rules. Anything odd becomes "your invention".
- Dropped from the first list of candidates: `bends` and `resists_wind`, which
  overlapped `blocks`, `anchors`, and `shelters`; `pushes` and `pulls` were merged.

## Consequences

New missions only need needs, outcomes, and variants; no new object art or
matching. The taxonomy is a contract with any future model: it is the schema
enum. Capability phrases are generic, so some outcomes read broadly. Real
accuracy of any model at mapping drawings to capabilities is unmeasured.

## Alternatives considered

Open vocabulary from a model: unbounded and unsafe. A longer taxonomy (30+):
hard for a child to choose from. Free-text description by the child: forbidden by
the privacy and safety rules.
