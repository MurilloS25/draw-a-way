# Two tabs: detect, warn, never merge

- Status: accepted
- Date: 2026-10-06

## Context

Two tabs share one localStorage key. Silent last-write-wins could destroy a
child's drawing.

## Decision

The session envelope carries a random per-page-load `writer` id. A `storage`
event from another writer asks the child: "Keep what I have here" (this tab keeps
saving and overwrites) or "Use the newest version" (load the other tab's session;
lines are never mixed). While a conflict is unresolved this tab does not save.
A tab sitting in the intro has nothing to lose and adopts the other session. If
the other tab erased everything, the question is "Start over here too". The
storage key moved to `drawaway:session:v2`; v1 data is deleted, not migrated.

## Consequences

No remote sync, no merging. The writer id is a random value that lives only in
the page and in the stored session; it is not an account or a device identifier
and is erased by "Start over". Browsers that block storage events fall back to
last write wins.

## Alternatives considered

BroadcastChannel locking (more machinery, same outcome). Automatic merging of
strokes (can produce incoherent pictures).
