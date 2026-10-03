# Development harness

## Active components

- `AGENTS.md`: canonical cross-agent contract.
- `CLAUDE.md`: minimal Claude Code entry point.
- `.claude/skills/frontend-design`: audited Anthropic skill pinned to the reviewed commit.
- `product-researcher`: bounded, read-only investigation of data, football metrics, libraries, and provider terms.
- `change-reviewer`: focused, read-only review of completed work.
- `docs/plans/` and `docs/decisions/`: durable reasoning kept outside standing context.

## Working loop

Inspect first, research only real uncertainty, plan multi-boundary work, implement one vertical slice, verify source ingestion and numerical calculations before model explanations, review the diff, and record only decisions with lasting impact.

After updating Claude Code, prefer bundled `/run`, `/verify`, `/code-review`, `/debug`, and `/security-review`. Once the application launches reliably, run `/run-skill-generator` to capture the real startup recipe.

## Deliberately absent

- No live-score or paid-data integration in the MVP.
- No betting or prediction model.
- No embeddings or vector database before a demonstrated analytical need.
- No authentication or collaboration before the single-user historical explorer works.
- No large or unreviewed raw dataset committed to Git.
- No hooks until stable checks exist.
- No blanket permissions or write-capable external-data tools.
- No agent team at the current repository size.

Update this file whenever real install, import, run, test, lint, or evaluation commands are introduced. Remove harness pieces that do not earn their maintenance or context cost.
