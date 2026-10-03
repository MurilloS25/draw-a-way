# MatchLens agent guide

## Mission

Build a portfolio-quality learning project that explains a bounded set of historical football matches through reproducible analytics, clear visualisations, and AI answers grounded in verified match evidence.

## Canonical sources

Read `README.md`, `docs/ARCHITECTURE.md`, and the closest executable schemas and tests before non-trivial work. If documentation and behavior disagree, identify the conflict and update the stale source when appropriate.

## Product invariants

- The MVP covers a deliberately small historical dataset; it is not a live-score, betting, prediction, or professional scouting product.
- Preserve the original provider, dataset version or retrieval date, competition, season, match, and event identifiers needed to trace every result.
- Separate source facts, deterministic calculations, and model interpretation in code, tests, and user-facing answers.
- Never let a model invent, alter, or silently calculate a statistic that deterministic application code can derive.
- Every displayed metric has a documented definition, units, coverage, and tested edge cases.
- AI answers may use only validated tool results and approved context; unsupported claims must be rejected or clearly labelled as interpretation.
- Disclose skipped, unavailable, malformed, or unsupported data instead of implying complete coverage.
- Keep dataset scope, ingestion volume, provider calls, model use, and deployment cost explicitly bounded.
- Preserve required data attribution. Do not use club crests, player photographs, broadcast footage, or other protected assets without confirmed permission.
- Treat imported data, labels, free text, and model output as untrusted input. Secrets remain server-side and never enter prompts, logs, fixtures, or reports.

## Intended repository shape

- `apps/web`: Next.js match explorer, accessible visualisations, evidence display, and analyst interface.
- `apps/api`: FastAPI ingestion, deterministic analytics, query endpoints, and model adapters.
- `packages/contracts`: shared match, metric, evidence, and analyst schemas when sharing them is useful.
- `data` or `fixtures`: only legally distributable, bounded, documented test material; large/raw datasets stay out of Git unless explicitly approved.
- `evals`: version-controlled analytical questions, expected evidence, numerical tolerances, and unsupported-claim checks.
- `docs`: architecture, metric definitions, attribution, decisions, and active implementation plans.

Do not create empty layers solely to match this outline.

## Engineering rules

- Keep source acquisition, validation, normalization, analytical queries, visual presentation, and model explanation as separate boundaries.
- Make imports idempotent and record source identity plus content hash before transforming data.
- Use explicit schemas and reject malformed coordinates, timestamps, identifiers, or impossible values.
- Store raw source fields separately from normalized and derived values when that distinction matters for auditability.
- Version metric formulas and calculate them outside prompts. Prefer SQL or pure functions with fixtures and known outputs.
- Represent football coordinates and attacking direction consistently, and test halves, extra time, own goals, penalties, and missing data where supported.
- Verify every model citation or evidence reference against the exact match and calculated result returned by application tools.
- Put model providers behind small adapters and provide deterministic fakes for offline development.
- Do not add embeddings, a vector database, live-data APIs, authentication, or background infrastructure until measured product needs justify them.
- Do not scrape websites or import a dataset until its current terms, attribution, redistribution, and deployment constraints are documented.

## Workflow

1. Inspect relevant code, documentation, data definitions, and trust boundaries.
2. Research only real uncertainty, using primary provider documentation where possible.
3. For multi-boundary work, create a concise plan under `docs/plans/`.
4. Implement the smallest evidence-backed vertical slice.
5. Test ingestion and calculations independently from visualisation and model behavior.
6. Run narrow checks, followed by documented broader checks.
7. Review the diff for analytical correctness, data leakage, false certainty, attribution, accessibility, resource limits, and missing failure states.
8. Record durable architecture or metric choices under `docs/decisions/`.

Until scaffolding provides real commands, do not invent them. Update `docs/HARNESS.md` when installation, execution, or validation commands become stable.

## Definition of done

A change is complete when its source and calculations are traceable, numerical behavior is tested, limitations and coverage are visible, attribution is preserved, AI output cannot bypass deterministic evidence, documentation is current, and the final report lists only checks actually run.
