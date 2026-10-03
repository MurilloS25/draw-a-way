# Architecture

## Product boundary

MatchLens explains a curated set of historical football matches through deterministic metrics, accessible visualisations, and a narrowly scoped AI analyst. The MVP optimises for learning, traceability, and portfolio depth rather than comprehensive product coverage.

It does not provide live scores, predictions, betting advice, paid-data access, professional scouting claims, or unrestricted conversational football knowledge.

## Proposed components

1. **Web application** — match selection, coverage notices, shot map, xG timeline, team/event comparison, evidence panels, and analyst questions.
2. **API application** — validated query endpoints, analytical services, evidence assembly, and model-provider adapters.
3. **Dataset importer** — acquire an approved snapshot, validate source records, normalize identifiers and coordinates, and make repeatable imports idempotent.
4. **Relational store** — competitions, seasons, teams, players, matches, lineups, events, source provenance, and explicitly versioned derived metrics.
5. **Analytics layer** — deterministic SQL and pure functions that calculate the values shown in the UI and exposed to the analyst.
6. **Analyst orchestration** — allowlisted question/tool flows that explain validated results without granting the model direct authority over facts or calculations.
7. **Evaluation** — fixed match fixtures and questions that measure numerical correctness, evidence selection, unsupported claims, latency, and cost.

## Evidence record

Every source or derived fact exposed to the analyst should retain enough information to verify it: provider, dataset snapshot or retrieval date, competition/season, match ID, event IDs when applicable, metric name and version, calculation inputs, units, and coverage status.

Generated prose references these evidence records rather than free-form model citations.

## Data flow

1. An operator imports one approved, bounded dataset snapshot.
2. The importer validates and normalizes source records while preserving provenance.
3. Deterministic analytics calculate documented metrics from normalized data.
4. The API returns chart-ready values and evidence records.
5. The web application visualizes the same values users can inspect as tables or text.
6. For supported questions, the model receives only the user question plus bounded, validated tool results.
7. The application validates the structured answer and evidence references before display.

## Trust and rights boundaries

- Dataset files and free-text fields are external, untrusted input.
- Provider terms determine whether raw data may be stored, committed, redistributed, or deployed.
- StatsBomb attribution must remain visible wherever required by its current open-data terms.
- Club branding, player imagery, broadcast media, and third-party editorial content are not implicitly licensed by an event dataset.
- Model output is untrusted until its structure, numbers, and evidence references validate.
- Provider credentials and database secrets stay server-side and out of prompts and logs.

## Provisional choices

- Start with one StatsBomb Open Data snapshot and roughly 10–20 matches, subject to a terms review and final dataset selection.
- Use relational tables and explicit analytical queries; no embeddings or vector database are needed for the first vertical slice.
- Keep raw-source identity and normalized data distinct.
- Use one canonical pitch coordinate system and document every conversion.
- Calculate metrics in application code or SQL, never in the language-model prompt.
- Use deterministic fake model responses until the evidence contract and offline evaluations are stable.
- Keep large raw datasets and generated databases out of Git unless their redistribution and size have been deliberately approved.

## First vertical slice

Given one approved historical match fixture, import it repeatably, display its teams and scoreline, render a verified shot map and xG timeline, expose the underlying evidence, and answer one predefined analytical question using only deterministic tool results. No live API, authentication, embeddings, or broad chatbot is required.

## Decisions still requiring evidence

- Exact competition, season, and 10–20 match sample.
- Current StatsBomb terms, attribution placement, and safe dataset distribution strategy.
- PostgreSQL hosting versus a lightweight local store during the first slice.
- Charting approach and accessible non-visual equivalents.
- Initial metric definitions and tolerances.
- The small set of analyst question types supported by the MVP.
- Model/provider and production hosting choices after offline evaluation.
