# Layered canvas and a composite raster for the optional helper

- Status: accepted
- Date: 2026-10-06

## Context

The helper previously received only the child's lines, without the scene, which
loses placement ("across the river"). The scene must still never be editable or
stored as the child's work.

## Decision

Layers, bottom to top: (1) SVG scene backdrop, never edited or stored; (2)
persistent elements from earlier decisions, derived from stored strokes; (3) the
child's current strokes on a canvas; (4) interface (cursor, controls), which is
never in any raster. Strokes stay vector data tagged with their scene, so edit,
undo/redo, persistence, comparison, and the summary all work from the same list.

An explicit helper request builds one 512 px PNG from layers 1-3 (the backdrop
SVG is serialized and drawn through a blob URL; a canvas re-encode carries no
metadata). The request also carries only the mission id, the scene index, and the
capabilities confirmed earlier. The server derives the scene description and
the taxonomy from application-owned content.

## Consequences

Context improves, at the cost of a larger image (tens of KB) and a dependency on
SVG-to-canvas rendering (3 s timeout, falls back to the strokes alone). The
backdrop is part of what leaves the device when the child presses the helper
button; the disclosure text says "a small copy of the scene and your lines".

## Alternatives considered

Sending only strokes (loses context). Sending strokes and a text scene
description only (cheaper but the model cannot see the placement).
