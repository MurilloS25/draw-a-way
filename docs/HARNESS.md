# Development harness

## Active components

- `AGENTS.md`: canonical cross-agent contract. `CLAUDE.md`: Claude Code entry.
- `.claude/skills/frontend-design`: audited Anthropic skill pinned to a commit.
- `product-researcher`: read-only investigation of interaction, browser,
  accessibility, safety, provider, and cost questions.
- `change-reviewer`: read-only review of completed work.
- `docs/plans/` and `docs/decisions/`: durable reasoning outside standing context.

## Commands (each was run successfully during the MVP work)

Setup: `npm install`, then `npx playwright install chromium` once.

| Purpose | Command |
| --- | --- |
| Dev server (loopback) | `npm run dev` |
| Lint | `npm run lint` |
| Types | `npm run typecheck` |
| Unit + component tests (Vitest, jsdom) | `npm test` |
| Production build | `npm run build` |
| Production server (loopback) | `npm start` |
| E2E on the production build (Chromium; starts two servers on 3100/3101, manual and fake modes) | `npm run test:e2e` (run `npm run build` first) |
| Secret scan of tracked files | `npm run scan:secrets` |
| Review of client build output | `npm run scan:build` (after build) |
| Dependency audit | `npm audit` |

The e2e config starts `next start` itself; stop any server on ports 3100/3101
first. Tests fail on any console error, page error, or request that leaves the
origin. Unit tests replace `fetch` with a function that throws, so no test can
reach a real network or model.

## Working loop

Inspect first, research only real uncertainty, plan multi-boundary work,
implement one provider-independent vertical slice, verify pure state and safety
behavior before optional AI, review the diff, and record only decisions with
lasting impact.

## Deliberately absent

- No account, identity, profile, camera, photograph, location, public gallery,
  social feature, advertising, purchase, streak, or ranking.
- No remote storage, telemetry, analytics, authentication, or user tracking.
- No unrestricted chat or unbounded generated content.
- No provider key committed or used in this repository's tests.
- No backend, database, embeddings, vector store, or moderation service.
- No hooks yet; checks are run on demand.
