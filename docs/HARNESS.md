# Development harness

## Active components

- `AGENTS.md`: canonical cross-agent contract.
- `CLAUDE.md`: minimal Claude Code entry point.
- `.claude/skills/frontend-design`: audited Anthropic skill pinned to the reviewed commit.
- `product-researcher`: bounded, read-only investigation.
- `change-reviewer`: focused, read-only review of completed work.
- `docs/plans/` and `docs/decisions/`: durable reasoning kept outside standing context.

## Working loop

Inspect first, research only real uncertainty, plan multi-boundary work, implement one vertical slice, verify deterministic behavior before model behavior, review the diff, and record only decisions with lasting impact.

After updating Claude Code, prefer bundled `/run`, `/verify`, `/code-review`, `/debug`, and `/security-review`. Once the application launches reliably, run `/run-skill-generator` to capture the real startup recipe.

## Deliberately absent

- No GitHub MCP for the MVP implementation: application code should integrate with the documented GitHub API, while development can use existing CLI/API tooling.
- No vector database before retrieval evaluation.
- No hooks until stable checks exist.
- No blanket permissions or write-capable target-repository tools.
- No agent team at the current repository size.

Update this file whenever real install, run, test, lint, or evaluation commands are introduced. Remove harness pieces that do not earn their maintenance or context cost.
