# MatchLens

Evidence-backed football match analysis built as a focused learning and portfolio project.

MatchLens turns a small, curated set of historical matches into understandable visual evidence and bounded AI explanations. It is intentionally not a live-score service, betting product, professional scouting platform, or attempt to cover all of world football.

## Status

Development harness ready; implementation has not started.

## Start here

- [Architecture](docs/ARCHITECTURE.md)
- [Development harness](docs/HARNESS.md)
- [Agent guide](AGENTS.md)

## Why this project exists

The goal is to learn and demonstrate the engineering behind trustworthy sports analytics:

- ingesting and validating real event data;
- modelling historical matches in a relational database;
- calculating reproducible metrics with transparent formulas;
- building useful football visualisations;
- letting an AI analyst explain only evidence the application can verify;
- evaluating factual accuracy, unsupported claims, latency, and cost.

The first release will be deliberately small enough to finish and explain well. Product breadth is secondary to data quality, traceability, and engineering depth.

## Proposed MVP

- Import one curated historical dataset, initially targeting roughly 10–20 matches.
- Browse teams, matches, scorelines, lineups, and key events.
- Present three core views: a shot map, an xG timeline, and a team/event comparison.
- Support a small set of predefined analytical questions through an AI analyst.
- Ground every numerical or factual answer in deterministic calculations and match evidence.
- Make formulas, data coverage, omissions, and limitations visible.
- Produce a shareable match summary without inventing statistics.

## Explicitly out of scope

- Live scores or real-time match tracking.
- Betting, gambling advice, or outcome prediction.
- Exhaustive league and season coverage.
- Paid data feeds.
- User accounts, social features, and collaboration in the first release.
- Unlicensed club crests, player photographs, or broadcast footage.
- Claims that the product replaces a professional analyst or scout.

## Proposed stack

- Next.js, React, TypeScript, and Tailwind CSS
- Accessible SVG or a lightweight charting layer for pitch and timeline views
- Python and FastAPI for ingestion, analytics, and model orchestration
- PostgreSQL for normalized match, lineup, event, and derived-metric data
- An LLM provider selected only after the deterministic analytics slice works
- Version-controlled fixtures and evaluation cases

Final provider, library, and hosting choices require technical validation before implementation.

## Data and attribution

The proposed primary source is [StatsBomb Open Data](https://github.com/hudl/open-data), which makes selected historical football data available for research and genuine interest in football analytics.

StatsBomb requires published analysis based on its open data to identify StatsBomb as the data source and use its logo. MatchLens will preserve that attribution in the product and documentation. Attribution is credit, not a payment. The exact dataset and distribution approach must be reviewed against the current source terms before data is committed or deployed.

## Initial roadmap

1. Select one legally usable open dataset and freeze the initial scope.
2. Define source provenance, normalized schemas, and metric formulas.
3. Build an idempotent importer with validation and small test fixtures.
4. Deliver one match page with deterministic visualisations.
5. Add a narrowly scoped, evidence-backed AI analyst.
6. Evaluate correctness and usability before expanding coverage.

