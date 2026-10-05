# Development harness

## Active components

- `AGENTS.md`: canonical cross-agent contract.
- `CLAUDE.md`: minimal Claude Code entry point.
- `.claude/skills/frontend-design`: audited Anthropic skill pinned to the
  reviewed commit.
- `product-researcher`: bounded, read-only investigation of child-centered
  interaction, browser capabilities, local inference, accessibility, safety,
  libraries, providers, and cost.
- `change-reviewer`: focused, read-only review of completed work.
- `docs/plans/` and `docs/decisions/`: durable reasoning kept outside standing
  context.

## Working loop

Inspect first, research only real uncertainty, plan multi-boundary work,
implement one provider-independent vertical slice, verify pure state and safety
behavior before optional AI, review the diff, and record only decisions with
lasting impact.

After updating Claude Code, prefer bundled `/run`, `/verify`, `/code-review`,
`/debug`, and `/security-review`. Once the application launches reliably, run
`/run-skill-generator` to capture the real startup recipe.

## Deliberately absent

- No account, identity, profile, camera, photograph, location, public gallery,
  social feature, advertising, purchase, streak, or ranking.
- No remote storage, telemetry, analytics, authentication, or user tracking.
- No unrestricted chat or unbounded generated content.
- No provider key or paid service before a reviewed need and a useful offline
  fallback.
- No backend, database, embeddings, vector store, or moderation service added
  speculatively.
- No hooks until stable checks exist.
- No blanket permissions or write-capable research tools.
- No agent team at the current repository size.

Real install, run, test, lint, browser, model, and evaluation commands do not
exist yet. Do not invent them. Update this file only after commands have been
selected and executed successfully.
