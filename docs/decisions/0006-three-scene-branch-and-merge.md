# Three-scene adventures with branch-and-merge state

- Status: accepted
- Date: 2026-10-06

## Context

One decision and one revision felt linear: the scenery barely changed and earlier
choices were forgotten. A full decision tree would explode (14 capabilities, up
to two per idea, three scenes).

## Decision

- Each mission is exactly three scenes with a fixed need structure, written once.
- A scene declares **needs** (solved by some capabilities, helped by others,
  optionally skipped when an earlier idea already covers it), three outcomes
  (`full`, `partial`, `neutral`), and **variants** of its story keyed to earlier
  capabilities or the previous level. Different earlier ideas therefore merge
  into a few shared story variants (tested: at most three per scene) while each
  idea still leaves a visible mark.
- Visible persistence of every decision: a text reminder in later scenes, the
  character's starting mood, and the drawing itself as a persistent layer
  (structures stay in place; mobile ideas shrink and travel with the character).
  A test checks that every first idea differs from every other in at least one of
  these ways. At least one earlier idea also changes scene three (story or needs).
- No rule says "wrong": `neutral` means the idea did something surprising and
  the story goes on; `partial` names what is still open as a chance to improve.
- The level of each scene is recomputed from the stored capabilities on restore
  and never stored.
- The ending summary lists the three decisions in plain text, so the story can be
  understood without the drawings.

## Consequences

Content volume stays linear (nine scenes). Outcomes read slightly generic when
two capabilities combine. Adding a scene or mission is data plus tests.

## Alternatives considered

A decision tree per idea (exponential). A physics or rules simulation (out of
scope and unverifiable). Generating outcomes with a model (violates "the model
does not control the story").
