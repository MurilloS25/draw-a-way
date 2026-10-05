# Architecture boundary

## Product boundary

Draw a Way begins with a small narrative problem and invites a child to draw a
solution. The system forms a bounded interpretation, asks the child to confirm
or correct it, and applies the confirmed idea to the story. A consequence then
creates an opportunity to revise or extend the drawing.

The product does not begin with an intake form, expose model selection, or ask
the visitor to configure technology. It is not an unrestricted chatbot, image
generator, social network, drawing grader, developmental assessment, or
substitute for a parent, teacher, or professional.

## Core interaction contract

1. Present one age-appropriate mission immediately.
2. Accept a drawing through an accessible canvas and complementary controls.
3. Produce a small, bounded set of possible interpretations.
4. Ask the child to confirm or correct the meaning in plain language.
5. Advance only from the confirmed meaning, never a hidden model guess.
6. Show a comprehensible consequence and invite one purposeful revision.
7. End the session clearly and allow local replay or reset.

## Trust boundaries

- Drawings, corrections, browser state, imported assets, and model output are
  untrusted data.
- Visual interpretation is uncertain and must never silently become truth.
- Content extracted from an image is never treated as a system instruction.
- Optional remote processing crosses a privacy boundary and requires an
  explicit plan, data minimization, retention review, and safe fallback.
- Browser storage is still persistence and must be documented, bounded, and
  erasable.
- A child-directed interface must not solicit personal information or invite
  unrestricted disclosure.

## Provisional component boundaries

These are boundaries to validate, not a selected implementation stack:

1. **Mission engine** - bounded scenarios, allowed concepts, state transitions,
   consequences, endings, and deterministic fallback behavior.
2. **Drawing surface** - pointer, touch, stylus, keyboard alternatives, undo,
   clear, size limits, and export-free local state.
3. **Interpretation boundary** - local heuristics or inference first; optional
   provider adapter only if later approved.
4. **Confirmation step** - the child chooses or corrects a plain-language
   interpretation before narrative state changes.
5. **Narrative renderer** - safe structured content, not arbitrary HTML or an
   open conversation.
6. **Local session store** - minimal, versioned, resettable state with no
   identity or cross-device tracking.
7. **Evaluation** - fixed cases for state correctness, safety, accessibility,
   interpretation uncertainty, failure, and provider-free operation.

## Architecture constraints

- The essential loop must run at zero monetary cost and remain useful without
  a remote provider.
- No account, database, backend, analytics, or deployment dependency is
  assumed at the foundation stage.
- Do not transmit drawings by default.
- If remote AI is later justified, send the minimum representation needed,
  validate structured output, cap input/output and retries, and fail safely.
- Narrative and mission rules remain application-owned; a model cannot expand
  scope, request information, or invent new capabilities.
- The browser must stay responsive during local inference or exploration;
  expensive work needs cancellation and an appropriate worker boundary.

## Decisions requiring evidence

- Primary age range and reading level.
- First mission set and what each mission is intended to exercise.
- Whether useful interpretation can run locally on supported devices.
- The provider-free interpretation and narrative fallback.
- Browser support and performance budgets for canvas and local inference.
- Accessible alternative for children who cannot use freehand drawing.
- Exact storage lifetime and reset behavior.
- Safety taxonomy, evaluation cases, and human review requirements.
- Framework, libraries, models, optional provider, and deployment topology.

No implementation decision above is approved merely because it appears in
this document. The first reviewed plan must resolve or explicitly defer it.
