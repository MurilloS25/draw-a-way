# Plan 0001: Match analysis foundation

- Status: proposed (awaiting review; no implementation started)
- Date: 2026-10-03
- Scope of this document: research, product definition, and a phased plan. It authorises no code, dependency, dataset download, database, deployment, or external service.

Labels used throughout: **[Verified]** observed in a primary source on 2026-10-03; **[Choice]** a product or design decision proposed here; **[Unknown]** not established, with an owner phase.

## 1. Outcome and portfolio value

A visitor opens a small, curated set of historical matches and sees, for any one of them: who played, what happened and when, where every shot was taken, how expected goals (xG) accumulated, and a transparent team comparison. Every number can be traced to a source record, a formula, and a calculation version, and every chart has a table equivalent.

Portfolio value:

- Shows end-to-end data engineering: licensed-source acquisition, validation, provenance, idempotent import, coordinate and time normalisation.
- Shows analytical rigour: documented formulas, known-value tests, and honest coverage notices.
- Shows accessible data visualisation without a charting monolith.
- Shows restraint: a deterministic product that is complete without any model, and a clearly fenced optional AI phase.

The deterministic analytics and visualisations **are** the product. No LLM, provider key, live API, database service, or authentication is needed for the core experience.

## 2. Target user and primary workflow

Target user **[Choice]**: a football-curious portfolio visitor or recruiter who recognises the matches, is not an analyst, and wants to understand one match quickly and check whether the numbers can be trusted.

Primary workflow:

1. Land on the match selector; pick a match (grouped by stage).
2. Read the header: teams, score (with extra time and shootout stated), date, competition, stage, and a coverage notice.
3. Scan the shot map and the cumulative xG timeline; switch to the table view of either.
4. Read the team comparison and the key-event timeline.
5. Open "Data and method" to see sources, formulas, limitations, and attribution.
6. Open the print-friendly summary page to save or share.

## 3. Verified dataset research

All facts below come from the StatsBomb Open Data repository, its bundled documents, and the GitHub API, read on 2026-10-03. Event files were read in memory for research only; nothing was written into the repository.

### 3.1 Repository and structure **[Verified]**

- Canonical repository: `https://github.com/hudl/open-data`. The README and licence still refer to `statsbomb/open-data`, which resolves to the same repository. This project's `README.md` already links the current name.
- Head commit at research time: `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb` (2026-09-07). It is a CI-labels commit, not a data change. Data files carry their own `last_updated` timestamps.
- Repository size reported by the GitHub API: about 7.4 GB. A full clone is out of bounds for this project; acquisition must fetch individual files.
- Layout:
  - `data/competitions.json` (80 competition-season entries on this date).
  - `data/matches/<competition_id>/<season_id>.json`.
  - `data/events/<match_id>.json` and `data/lineups/<match_id>.json`.
  - `data/three-sixty/<match_id>.json` for selected matches.
  - `doc/` with specification PDFs: Competitions v2.0.0, Matches v3.0.0, Lineups v2.0.0, Events v4.0.0, 360 Frames v1.0.0, and an Open Data Specification v1.1.
- Match records carry `metadata.data_version` (`1.1.0` for the 2022 World Cup), `shot_fidelity_version` and `xy_fidelity_version` (both `2`), `last_updated`, `match_status`, and `match_status_360`.

### 3.2 Terms and attribution **[Verified]**

Two documents apply: the README "Terms & Conditions" and `LICENSE.pdf` ("StatsBomb Public Data User Agreement", last updated 8 September 2023). The GitHub API reports the licence as `NOASSERTION`, so there is no standard open licence such as CC or ODbL.

README: "If you publish, share or distribute any research, analysis or insights based on this data, please state the data source as StatsBomb and use our logo, available in our Media Pack." The data is offered "for public use for research projects and genuine interest in football analytics."

User Agreement clauses relevant to MatchLens (paraphrased from the extracted text; the PDF is the authority and must be re-read by a human before release):

- 1.2.1: the User may not "edit, distort, distribute, reproduce, sell or in any way provide the data to any external or third party".
- 1.2.2: the User may not "commercially exploit the data or any analysis derived from the use of the Service".
- 1.2.4: no defamatory or damaging material about any individual or organisation.
- 1.4: the User "is required to accredit any publication of analysis formed from StatsBomb Data with the StatsBomb brand logo".
- 2.1: StatsBomb may withhold the Service at any time without notice.
- 2.2: StatsBomb asks Users to register their name and email at its resource centre before accessing the data.
- 3.4: no warranty of accuracy, reliability, or completeness.
- 7: all data is StatsBomb's property; no modification, transfer, distribution, licensing, or other exploitation without express prior written consent.
- The agreement states that conclusions drawn from the data "are not necessarily the opinions or analytical insights of StatsBomb".

### 3.3 Consequences for MatchLens **[Choice, derived from 3.2]**

- **Raw files must not be committed or redistributed.** Clause 1.2.1 and clause 7 make even small excerpts of real events risky. Raw files are downloaded by the operator at setup and git-ignored. This also resolves the "commit versus download" question in favour of download.
- **Committed test fixtures must be synthetic**: hand-authored files with the same schema but fictional teams, players, and values. Real-data golden tests are opt-in and run only where an operator has fetched the snapshot.
- **Aggregate derived numbers** (for example a match's shot count or total xG) may appear in docs and `evals/` as published analysis, with attribution. Per-event rows (coordinates, event IDs, player-level event lists) are treated as data and are not committed. This line is a project choice, not a verified permission; it is recorded as an ADR in Phase 0 and flagged for review.
- **Public deployment is a separate, unresolved rights question.** Serving shot coordinates, lineups, and event timelines to anonymous visitors may count as providing the data to third parties. The terms permit publishing "analysis", and the README encourages it, but they do not clearly define the boundary. Deployment is gated (section 19). Local use is not blocked.
- **The logo is required for published analysis, and it is a third-party media asset** whose own usage terms are in the Media Pack, which has not been reviewed. Until that review, the product shows textual attribution only and no logo file is added.
- **Non-commercial only.** MatchLens must carry no advertising, payment, or paid tier.
- **Registration is a human task**: the operator registers at the StatsBomb resource centre. Nothing in this plan submits personal data on their behalf.
- Attribution wording to be used in the app, README, and summary export, pending review: "Data: StatsBomb Open Data (hudl/open-data, revision `<sha>`, retrieved `<date>`). Analysis by MatchLens; not StatsBomb's opinion."

### 3.4 Competitions and seasons relevant to a bounded set **[Verified]**

Matches files were read for five candidate seasons. Counts and availability flags are from the matches files; event content was inspected only for the 2022 World Cup knockout set.

| Competition-season | IDs | Matches in file | Knockout matches | 360 status |
|---|---|---|---|---|
| FIFA World Cup 2022 | 43 / 106 | 64 | 16 (R16 8, QF 4, SF 2, third place 1, final 1) | all available |
| FIFA World Cup 2018 | 43 / 3 | 64 | 16 | `scheduled` (none) |
| UEFA Euro 2020 | 55 / 43 | 51 | 15 | available |
| UEFA Euro 2024 | 55 / 282 | 51 | 15 | available |
| Women's World Cup 2023 | 72 / 107 | 64 | 16 | available |

Other entries (Champions League finals, La Liga, Copa America 2024, and so on) exist in `competitions.json` and are out of scope.

### 3.5 What the 2022 World Cup knockout data contains **[Verified]**

All 16 knockout matches have `match_status` and `match_status_360` equal to `available`. Observations from an exploratory read; these are **research observations, not test oracles**, and must be re-derived by the Phase 1 code:

- **Matches**: ID, date, kick-off, stage, home and away team with IDs, managers, stadium, referee, provider home and away score, and the metadata above.
- **Lineups**: per team, players with ID, jersey number, country, cards (time, type, reason, period), and position spells with from/to time, period, and start/end reason.
- **Events**: 4,407 events in the final. Each has a UUID `id`, a sequential `index`, `period`, `timestamp` (relative to the period), `minute`, `second`, type, team, player, position, and `location` as `[x, y]`.
- **Periods**: 1 and 2 (regulation), 3 and 4 (extra time), and 5 (penalty shootout) all appear in the matches that went the distance.
- **Shots**: every shot event across the 16 matches has `statsbomb_xg` and a `location`. Zero missing xG values were found. Shot fields include outcome, type (Open Play, Penalty, Free Kick, and so on), technique, body part, `end_location` (`[x, y, z]`), and an embedded `freeze_frame`.
- **Shootout kicks** are shot events in period 5, each carrying a constant xG (0.7835 in the final), so summing xG over all periods would add roughly 3.1 xG per team of non-comparable value. Shootout shots must be excluded from match xG and shown separately.
- **Provider match score excludes the shootout**: the final is stored as 3-3 and Croatia v Brazil as 1-1. The shootout winner has to be derived from period-5 events and labelled as derived.
- **Own goals** are recorded as paired "Own Goal For" and "Own Goal Against" events, not as shots. In Argentina v Australia the provider score is 2-1, but only two shot goals exist (both Argentina); Australia's goal is an own-goal event. Score must therefore be derived from shots plus own goals, not from shots alone.
- **Clock quirks**: `minute` resets to 45, 90, and 105 at period starts, and stoppage time makes labels overlap (in the final, period 1 reaches minute 52 while period 2 starts at 45). Ordering must use period and `index`, never `minute`.
- **Direction convention**: in 16 knockout matches, 386 of 387 regular and extra-time shot locations have `x >= 60` (one Morocco v Spain shot is at `x < 60`, to be reviewed). This is consistent with events being stored with the acting team attacking toward `x = 120` in every period. The 360 specification states the same for freeze frames ("the actor's team attacking 0 to 120 on the X axis"). Goal-scoring shots end at `y` between 36.4 and 43.7, consistent with goal posts at about 36 and 44 on an 80-wide pitch.
- **360 data**: a frame per event with `visible_area` and unlabelled player positions. The specification warns that not all players are visible, `visible_area` is not always present, not all events get frames, and the actor is sometimes unmarked. For 16 matches, the 360 files total about 125 MB versus about 54 MB of events and 0.4 MB of lineups.

Sizes for the 16 knockout matches: roughly 54 MB events, 0.4 MB lineups, and 125 MB 360, so about 180 MB with 360 and about 55 MB without.

### 3.6 Unknowns **[Unknown]**

| Unknown | Resolved in |
|---|---|
| The exact scope of "provide the data to any external or third party" for a public site showing derived per-event visuals. | Phase 0 review; deployment gate |
| Whether StatsBomb will give written consent for public display, if the terms are read strictly. | Deployment gate |
| Media Pack terms for the logo, and whether a logo is required on every page or once per publication. | Phase 0 |
| Pitch units. Coordinates run 0-120 by 0-80; it is widely described as yards, but the diagram in the specification is an image and the text says only "(x, y)". | Phase 0; until then label values "pitch units" and do not convert to metres |
| Which of "Post", "Saved To Post", "Saved Off Target" count as on target. | Phase 0 metric definitions and ADR |
| Pass completion encoding (absent `outcome` presumed complete) and card sources (events versus lineups). | Phase 1 against the Events v4.0.0 specification |
| Whether per-event xG from `statsbomb_xg` is documented as a model with a published version. | Phase 0; state "provider-calculated" until known |
| Whether data for a match changes after retrieval (files carry `last_updated`; several knockout matches updated in 2024-2025). | Pinned revision and hash policy (section 7) |

## 4. Dataset options and recommendation

| Option | Matches | Recognisability | Data depth | Verdict |
|---|---|---|---|---|
| **A. 2022 World Cup knockout stage** (16 matches) | 16 | Highest. Final, penalty drama, Morocco's run | Events, lineups, xG, shots with freeze frames, and 360 all available; shootouts, extra time, an own goal, and in-play penalties all occur | **Recommended** |
| B. Euro 2020 knockout stage (15 matches) | 15 | High | Same specification; contents not inspected | Fallback if A is blocked |
| C. 2018 World Cup knockout stage (16 matches) | 16 | High | No 360 data (`scheduled`); event depth not inspected | Fallback; 360 is deferred anyway |
| D. Women's World Cup 2023 knockout stage (16 matches) | 16 | High | 360 available; contents not inspected | Valid alternative; no stronger on any axis checked |

The 2022 World Cup knockout stage was evaluated explicitly. It is selected because: (1) the open dataset contains it completely, with every match `available`; (2) the terms permit local, non-commercial research use with attribution; (3) it has exactly the edge cases the importer must handle (extra time, shootouts, own goals, in-play penalties). It is selected **for local development and analysis only**. Public hosting remains blocked by the rights questions in 3.3, and options B-D carry the same terms, so switching dataset would not remove that block.

### First showcase match **[Choice]**

**2022 FIFA World Cup Final, Argentina v France** (match ID `3869685`, 2022-12-18, provider score 3-3, shootout decided in period 5, provider `last_updated` 2024-12-16). It exercises all five periods, in-play penalties, extra-time goals, a long stoppage-time overlap in the clock, and the shootout exclusion rule.

Preliminary observations from the exploratory read (not oracles until re-derived in Phase 1):

- 30 shots in periods 1-4 (Argentina 20, France 10).
- Summed `statsbomb_xg` in periods 1-4: Argentina about 2.76, France about 2.27.
- 3 goals each from period 1-4 shots, matching the provider score.
- Period 5: 8 attempts, Argentina 4 goals and France 2 goals.
- 4,407 events in total, and no own-goal events.

Second fixture target for tests: **Argentina v Australia** (`3869151`), the own-goal case (two shot goals, one own-goal pair, provider score 2-1).

The bounded set is the 16 knockout matches. Phase 1 imports the final alone first, then widens to the other 15 only after the single-match slice passes.

## 5. Scope and explicit exclusions

### In scope (MVP)

1. A curated set of 16 matches (the 2022 World Cup knockout stage), imported by an operator-run command.
2. A match selector grouped by stage.
3. Match header: teams, score, date, competition, stage, shootout result when applicable, and a coverage notice.
4. Lineups, where the source provides them (starters, substitutes, minutes, cards).
5. Shot map: team, player, minute, outcome, coordinates, xG.
6. Cumulative xG timeline per team.
7. A transparent team comparison, restricted to metrics in section 9.
8. A chronological key-event view.
9. A table alternative for every visualisation.
10. A print-friendly match-summary route that works as the shareable artefact.
11. A data-source and attribution section on every page that shows data.
12. Formulas and limitations on a "Data and method" page.

### Explicitly excluded initially

- Live scores and live match tracking.
- Scraping of any site.
- Betting, gambling guidance, and winner or outcome prediction.
- Professional scouting or tactical-quality claims.
- Paid feeds and exhaustive competition coverage.
- User accounts, social, and community features.
- Club crests, player photographs, broadcast footage, and other media without confirmed rights.
- 360 data in the MVP (large, with documented caveats, and not needed for the chosen views).
- Supabase, Groq, Render, Vercel, or any deployment or hosting mutation.
- A language model of any kind in the core, and any real provider call.
- Committing any raw or large dataset file.
- Possession percentage, territory, momentum, passing networks, pressing metrics, expected threat, and any other metric not listed in section 9.

## 6. Architecture and trust boundaries

Separate boundaries, each testable alone:

1. **Acquisition** (operator-run, the only code that touches the network). Downloads an allowlisted manifest of files at a pinned revision into a git-ignored directory, records size and SHA-256, and refuses anything off the allowlist or above a size cap.
2. **Validation**. Parses raw JSON against explicit schemas; rejects or quarantines malformed records with a reason.
3. **Normalisation**. Maps validated records to normalised entities, converts coordinates and time, and keeps raw source fields next to normalised ones.
4. **Analytics**. Pure functions (and plain SQL where simpler) from normalised rows to metrics. No I/O, no network, no model.
5. **API** (FastAPI). Read-only query endpoints returning chart-ready values, tables, evidence records, and coverage notes.
6. **Web** (Next.js). Presentation only. It renders values the API returns and recalculates nothing.
7. **Optional analyst** (deferred, section 17). Consumes only API results.

Trust rules:

- Imported JSON, names, and free-text fields are untrusted. They are length-limited, rendered as text only, and never interpolated into SQL, HTML, or prompts.
- Secrets: none exist in the MVP. `.env` files stay git-ignored and are never read by agents.
- Ordinary tests run with the network disabled.
- Source facts, calculated metrics, and interpretation have separate fields in API responses, separate sections in the UI, and separate test suites.

## 7. Provenance, acquisition, and idempotency

**Snapshot identity [Choice].** Pin the data repository to a full commit SHA (candidate: `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb`, to be re-confirmed in Phase 0). The manifest committed to Git lists, for each file: provider path, byte size, and SHA-256. Hashes and sizes are metadata, not data, and may be committed. Fetch URLs use the pinned SHA, not `master`.

**Provenance record per import** (`source_file` and `import_run` tables): provider, repository, revision SHA, retrieval timestamp, provider path, SHA-256, byte size, provider `last_updated` where present, importer version, schema version.

**Git policy.** Ignore `data/raw/`, local database files, and generated outputs. Phase 0 extends `.gitignore` (today it ignores `.env*`, build outputs, and caches, but nothing for data or SQLite). Committed: manifest, synthetic fixtures, aggregate expected values.

**Idempotent import.** Natural keys come from the provider (competition, season, match, team, player IDs; event UUIDs). A run keyed on file hash:

- Same hash already imported: no-op, reported as such.
- New hash for an already imported match: replace that match atomically in one transaction, record the old and new hash, and surface "source changed since last import" instead of silently overwriting.
- Partial failure rolls the match back; other matches are unaffected and the run report lists skipped and failed files with reasons.

**Volume bounds.** At most 16 matches, three files per match, plus competition and match index files. A hard cap on bytes downloaded per run. No crawling, no pagination of unknown size, and no call to any API other than the pinned raw-file host.

## 8. Normalised data model

Raw fields are kept in a per-event raw JSON column (or a separate `*_raw` table) so a normalised value can always be compared with its source. Entities:

| Entity | Key fields |
|---|---|
| `source_file`, `import_run` | as in section 7 |
| `competition`, `season` | provider IDs, names, gender, provider `match_updated` |
| `team` | provider ID, name, country (text only; no crest) |
| `player` | provider ID, name (text only; no photograph) |
| `match` | provider ID, date, kick-off, stage, home/away team, provider home/away score, status, provider metadata versions, source file reference |
| `lineup_entry` | match, team, player, jersey number; `lineup_position_spell` for position, from/to period and clock; `card` rows |
| `event` | event UUID, match, `index`, period, `timestamp_ms` (period-relative), provider minute and second, type, team, player, position, raw x/y, normalised x/y, raw JSON |
| `shot` (one-to-one with a shot event) | xG, outcome, shot type, technique, body part, raw and normalised end location (with z), key pass ID. Freeze frames stay in raw JSON and are not used in the MVP. |
| `match_coverage` | counts of events, shots, shots missing xG, lineups present, rejected records, 360 status (provider flag) |

Derived metrics are computed on request by pure functions over these tables, not stored. Every response carries `calculation_version`, so nothing stale can persist. Materialising metrics is deferred until a measured performance need.

## 9. Metric catalogue

Every metric has a definition, unit, denominator, coverage, and limitation shown in the app. Version `metrics-v1`. Source-fact fields and calculated fields are labelled differently.

Common rules: use periods 1-4 only unless a metric says otherwise; period 5 (shootout) is reported in its own table; a shot belongs to the team in `event.team`; own goals are not shots.

| Metric | Formula | Unit | Limitations |
|---|---|---|---|
| Shots | count of shot events, periods 1-4 | count | Includes blocked and off-target shots; penalties included, shootout excluded |
| Shots on target | shots with outcome in the on-target set (Goal, Saved, and others per ADR; "Post" handling decided in Phase 0) | count | Depends on provider outcome labels; unknown labels fail validation instead of being guessed |
| Goals (shot) | shots with outcome Goal, periods 1-4 | count | Excludes own goals |
| Own goals credited | own-goal events, credited to the beneficiary team | count | Shown separately from shot goals |
| Score | goals (shot) + own goals credited, per team | count | Must equal the provider score; a mismatch is a validation failure surfaced in the coverage notice |
| Shootout result | goals in period-5 shots, per team | count | Derived; the provider score excludes it |
| xG | sum of `statsbomb_xg` over the team's shots, periods 1-4 | goals | Provider-calculated model; MatchLens does not recompute or adjust it. A missing xG excludes that shot from the sum and is counted in coverage |
| Non-penalty xG | xG minus xG of shots of type Penalty | goals | Shown beside xG so in-play penalties are visible |
| xG per shot | xG divided by shots, undefined when shots = 0 | goals/shot | Shown as "n/a" with zero shots, never 0 |
| xG difference | team xG minus opponent xG | goals | Descriptive; not a prediction |
| Shot distance | Euclidean distance from normalised shot location to the goal centre (120, 40) | pitch units | Unit unconfirmed (see 3.6) |
| Passes attempted / completed / completion % | counts of pass events; completed when `outcome` is absent (to be verified); percentage uses attempts as denominator | count / % | Verified against the specification in Phase 1; if not verifiable, dropped |
| Fouls committed, cards | counts of provider events | count | Card source reconciled between events and lineups in Phase 1 |

**Not in the MVP, and not to be approximated:** possession percentage, territory, field tilt, momentum, passing networks, pressure or press metrics, expected threat, player ratings, and anything built from 360 frames. If a later metric cannot be computed reliably from the selected fields, it is excluded, not approximated.

**Interpretation layer.** The only text the MVP generates is limited to statements that follow mechanically from the metrics, such as "France recorded fewer shots than Argentina." Tactical or causal wording ("dominated", "deserved", "momentum") is not generated by the core. Any interpretation is labelled as interpretation (Phase 4 and later).

## 10. Coordinate and match-time conventions

**Coordinates [Choice, with verified basis in 3.5].**

- Original coordinates are stored as given: pitch 0-120 on `x` and 0-80 on `y`, the acting team attacking toward `x = 120`. In the 2022 data, goal-scoring shots end around `y` 36.4-43.7.
- Normalised coordinates are the canonical pitch used by the UI and metrics: every team attacks left to right (`x` toward 120), so both teams' shots are drawn on the same half or on a shared pitch with the second team mirrored (`x' = 120 - x`, `y' = 80 - y`) when both teams appear on one pitch. The mirror is applied in presentation, and the stored normalised value stays in the acting team's frame.
- Rejection rules: `x` outside 0-120, `y` outside 0-80, non-finite values, or a missing location on a shot reject the record with a reason. Shot `end_location` `z` is optional. An unexpected shot location with `x < 60` is accepted but flagged for review (it occurs once in the knockout set), not corrected.
- No coordinate unit conversion until the unit question (3.6) is closed.

**Match time [Choice].**

- Ordering key: `(period, index)`. Never sort by `minute`.
- Per-event time: period, `timestamp_ms` from the provider timestamp (period-relative), and the provider's `minute`/`second` kept as the display label. Labels such as "45+7'" are not synthesised; the display shows the provider minute and period together, for example "period 1, provider minute 52".
- Timeline axis: each period is a segment whose width is its actual duration (maximum event timestamp in that period). Period segments are placed end to end, so stoppage time extends its segment and never overlaps the next. Segment boundaries are labelled, and the table shows period, timestamp, and provider minute.
- Extra time (periods 3-4) is labelled on the axis. The shootout (period 5) is not drawn on the xG timeline and appears in a separate table.
- Own goals, in-play penalties, and shootout attempts are tested explicitly (section 14).

## 11. Local store and technology decisions

| Question | Proposal | Status |
|---|---|---|
| Local database | **SQLite** through Python's standard `sqlite3` (library version 3.50.4 present). One file, git-ignored, zero services. | **[Choice]**, ADR in Phase 0 |
| PostgreSQL | **Deferred.** Not needed for 16 matches (about 55 MB of source JSON; roughly 70,000 events, estimated from about 4,400 per match). A local PostgreSQL client exists on this machine (18.6), but the project does not depend on a running server. Reconsider only for a deployment that needs a hosted database, or when concurrent writes or query needs justify it. | **[Choice]** |
| API | FastAPI, Python 3.13 present locally. Read-only endpoints; OpenAPI used to generate web types, so a separate `packages/contracts` is not created unless sharing is demonstrably needed. | **[Choice]** |
| Web | Next.js, TypeScript. Node 22 and pnpm are present locally. | **[Choice]**, consistent with README |
| Package and run commands | Not chosen here. `uv` is not installed; the Python environment tool, test runner, linter, and type checker are chosen in Phase 0. | **[Unknown]**, Phase 0 |
| Charting | Hand-authored SVG in React components, with a small scale utility for axes if worthwhile. No general charting dependency unless Phase 3 proves one is accessible and justified. Pitch and timeline are simple enough that custom SVG gives full control of text alternatives and keyboard behaviour. | **[Choice]**, ADR in Phase 0 |
| Shareable summary | A server-rendered, print-styled route per match (`/matches/<id>/summary`). The browser's print-to-PDF is the export. No image rendering service and no stored exports. | **[Choice]** |
| Performance | The 16-match set is small enough that endpoints compute metrics from SQLite per request. Budget: a match page's API responses return in under 300 ms locally; the largest match's event payload for the page (shots, key events) stays under 200 KB, because the full event stream is not sent to the browser. Budgets are checked in Phase 2 and 3. | **[Choice]** |

## 12. Implementation phases

Plan 0001 covers Phases 0-3 and Gate A. Phase 4 and later gates are scoped but not committed.

### Phase 0: decisions, toolchain, real commands, ADRs

Work:
- Re-read `LICENSE.pdf` and the Media Pack terms; record conclusions.
- ADRs: raw-data and fixture policy; SQLite for the local slice; custom SVG charting; metric definitions v1 (including the on-target set); time and coordinate conventions; data-revision pinning.
- Choose the Python and Node toolchains, test runners, linters, and type checkers.
- Extend `.gitignore` for raw data and local databases.
- Update `README.md`, `docs/ARCHITECTURE.md`, and `docs/HARNESS.md` to match this plan (see section 21).
- Confirm that the operator has registered with StatsBomb (their action).

Acceptance:
- Every **[Unknown]** blocking Phase 1 is closed or has an explicit workaround.
- Commands documented in `docs/HARNESS.md` were actually run once.
- No raw data, secret, or media in the diff.

### Phase 1: bounded importer, provenance, validation, fixtures

Work:
- Manifest for the 16 matches, with the final (`3869685`) first.
- Acquisition command (allowlist, byte cap, pinned revision, hash recording).
- Schemas, validators, normaliser, SQLite loader, and an import report.
- Synthetic fixtures covering the cases in section 14.

Acceptance:
- Import of the final from a local snapshot is repeatable: a second run changes nothing and reports "unchanged".
- Provenance rows exist for every source file.
- Derived score equals the provider score for the final; mismatch cases fail loudly in fixtures.
- Chronology and coordinate tests pass offline.
- Only then widen to the 15 other matches, with the same checks on each.

### Phase 2: normalised match API and deterministic metrics

Work:
- Pure metric functions for the section 9 catalogue and `metrics-v1` versioning.
- Read-only endpoints: match list, match detail with coverage, lineups, shots, xG timeline, comparison, key events, and a "method" payload listing formulas.
- Evidence records tying each value to the match, event IDs, source file hash, and calculation version.

Acceptance:
- Known-value tests for shot counts, xG sums, score, and shootout result pass on fixtures; opt-in real-data tests match the aggregate expectations.
- Every metric response carries unit, coverage, and version.
- No endpoint calls the network or a model.

### Phase 3: accessible match explorer and visualisations

Work: selector, header and coverage notice, lineups, shot map, xG timeline, comparison, key events, tables, summary route, attribution and method pages.

Acceptance: section 15 requirements met, and the manual and automated checks listed there pass and are reported only when actually run.

### Gate A: complete non-AI MatchLens review

Review the whole product for analytical correctness, false certainty, coverage disclosure, attribution, accessibility, resource limits, and prohibited media. Nothing after this gate starts without an explicit decision.

### Phase 4 (optional): deterministic match-insights layer

Rule-based statements generated from `metrics-v1` with thresholds documented, each tagged as a calculated observation with evidence references. No tactical or causal language. Decided only after Gate A.

### Gate B: product review

Decide whether insights are accurate and useful enough to keep.

### Later, separate gate: optional LLM analyst (section 17)

### Later, separate gate: public deployment (section 19)

## 13. Offline verification strategy

- No network access in ordinary test runs; the acquisition code is the only networked module and is excluded from them, and a test fails if any other module opens a socket.
- Fixture-based importer tests, using synthetic files.
- Opt-in "real-snapshot" tests (marked and skipped by default) that compare against aggregate expected values only.
- Only checks actually run may be reported as passing.

## 14. Test cases required

Importer and data quality:
- Idempotent re-import (second run no-op; changed hash handled as a controlled replacement).
- Malformed JSON; unknown event type; unknown shot outcome label; missing xG; duplicate event IDs; out-of-order `index`; missing required fields; oversized or off-allowlist file.
- Malformed coordinates: out of range, non-numeric, wrong length, missing on a shot.

Conventions:
- Coordinate normalisation and mirrored rendering round trip.
- Chronology: period 1 stoppage minutes overlapping period 2 labels; extra time; shootout ordering; ordering by `(period, index)` when `minute` disagrees.

Calculations:
- Known values: shot counts, shots on target, goals, xG, non-penalty xG, xG per shot (including zero shots), and score on the fixtures.
- Own goal credited to the correct team and not counted as a shot.
- In-play penalty included, shootout excluded from xG, shootout result reported separately.
- Score mismatch with the provider value surfaces a coverage warning.

Product:
- Attribution and coverage notice present on every data page.
- Secret scan, prohibited-media scan (no crests, photos, or logos without confirmed permission), and a check that no raw data or per-event real rows are in Git.

## 15. UI, responsive design, and accessibility requirements

Target: WCAG 2.2 level AA **[Choice]**.

- **Tables first.** Every chart has an adjacent, equally complete table (shots: team, player, period, clock, outcome, xG, location; timeline: step values per shot; comparison: all metrics with units; events: chronological list). The tables are not hidden on desktop.
- **Chart text alternatives.** Each SVG has an accessible name and description (for example, total shots and xG per team), and marks are not the only carrier of information.
- **Not colour alone.** Outcome is encoded by shape and label as well as colour; team by position and label; palette verified for contrast and common colour-vision deficiencies.
- **Keyboard and focus.** Shot markers or the corresponding table rows are reachable by keyboard, with a visible focus indicator, and activating one shows its details in text. No keyboard traps.
- **Zoom and reflow.** Usable at 400% zoom and a 320 CSS pixel width without two-dimensional scrolling for content; the pitch scales and tables scroll within a labelled region.
- **Motion.** No essential animation; respect reduced-motion settings.
- **Screen reader naming.** Landmarks, headings, table captions, header associations, and labelled controls.
- **Coverage notice** at the top of each match page, in text, listing what is missing or excluded (no 360 in the MVP, shootout excluded from xG, rejected records, provider caveats).
- **Responsive.** Mobile-first layout; selector, header, and tables work at phone width.
- **Attribution placement.** Footer on every page, plus a full "Data and attribution" section on the method page and in the summary export.
- **Checks to run in Phase 3** (reported only if run): automated accessibility scan (axe-core class) in a browser test runner, keyboard walk-through, zoom/reflow check, and a screen-reader spot check by a person.

## 16. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Terms read strictly forbid public display of derived event data | Local-first scope; deployment gate; request written confirmation; fallback to aggregate-only public pages |
| Logo requirement conflicts with the no-protected-assets rule | Review Media Pack terms; text attribution until confirmed |
| StatsBomb withdraws or changes the data (clause 2.1) | Pinned revision plus hashes; synthetic fixtures keep tests working; coverage notice shows revision |
| Data corrections change numbers after retrieval | Hash comparison on import; surfaced source-change notice |
| xG is a provider model that users may over-trust | Label "provider-calculated"; show limitations; never describe xG as deserved result |
| Score mismatch from own goals or shootouts | Score derived from shots plus own goals and reconciled to provider score; tested |
| Direction convention differs in some match | Invariant check on shot locations; flag outliers (one known `x < 60` shot) |
| Accessibility debt in custom SVG | Tables-first design; automated and manual checks in the definition of done |
| Scope creep into 360, passing networks, or xT | Exclusion list; any addition needs a metric definition and a plan update |
| Large files slow the app | Never send event streams to the browser; payload budgets; compute server-side |
| Personal data in data files (names, managers, referees, birth dates in match records) | Import only fields the MVP shows; do not display birth dates; no tracking or analytics |
| Defamation concern (clause 1.2.4) | Descriptive, source-labelled statements only; no evaluative claims about individuals |

## 17. Deferred AI analyst phase

Not part of this plan's implementation. Boundaries fixed now so the core is never built to depend on it:

- Optional "Match analyst" explains only deterministic tool results produced by MatchLens (the section 9 metrics and evidence records).
- It never calculates a statistic, never supplies evidence of its own, and its output is rejected unless every number and evidence reference matches a result returned for that exact match.
- The application is complete and useful when the analyst is unavailable or disabled; its absence is a normal state in the UI.
- Provider, credentials, hosting, and cost limits are not chosen here, no keys are added, and no live call is made. A deterministic fake adapter comes first, then evaluation cases in `evals/`, before any real model.
- A rule-based insights layer (Phase 4) is considered before any LLM.
- Precondition: an explicit decision after Gate B, and confirmation that the data terms allow sending derived match values to a model provider.

## 18. Cost and resource bounds

- Dataset: 16 matches, about 55 MB of source JSON without 360.
- Runtime: no paid service, no API key, and no network after import.
- Model use: none in the MVP.
- Build tooling cost: free tiers only, and not needed until the deployment gate.

## 19. Deployment gate

Deferred until the product works locally and Gate A passes. Not part of this plan, and no hosting service is touched here.

Entry conditions:
1. Written outcome of the data-terms review for public display, ideally with StatsBomb's written confirmation.
2. Media Pack terms reviewed and logo use settled.
3. A free-tier option that needs no database service. Candidate shape: precomputed JSON baked into a static site, so there is no runtime API or database. Provider selection happens at the gate.
4. Attribution and coverage notices checked in the built output.
5. A secret scan and a check that no raw data ships in the build.

If conditions 1 or 2 cannot be met, the public artefact is limited to what the terms clearly allow (for example, aggregate analysis with attribution), or the project stays local with screenshots and a recorded walkthrough.

## 20. Decisions made and deferred

Made in this plan (to be recorded as ADRs in Phase 0): download-not-commit raw data; synthetic fixtures; pinned revision with hashes; SQLite first; custom SVG; calculation on request with a version; period-and-index ordering; shootout excluded from xG; score reconciled to provider.

Deferred: PostgreSQL; 360 data; logo use; public deployment and hosting; any model provider; Python and Node tool selection (Phase 0); the exact on-target set (Phase 0); pitch unit label; material for `packages/contracts` (only if sharing is needed).

## 21. Documentation conflicts found during preflight

Existing documents disagree with this plan's direction, or are stale. None was edited in this planning pass; fixes are Phase 0 work.

| Document | Statement | Conflict |
|---|---|---|
| `README.md` (MVP, roadmap step 5) | MVP supports predefined analytical questions through an AI analyst | The analyst is now optional and deferred beyond Gate A |
| `README.md` (Proposed stack) | PostgreSQL for normalised data | Local slice uses SQLite; PostgreSQL deferred |
| `README.md` (Data and attribution) | Links `hudl/open-data` and describes attribution only | Omits the no-redistribution and non-commercial clauses; should link the User Agreement |
| `docs/ARCHITECTURE.md` (First vertical slice) | Slice includes answering one predefined question via deterministic tool results | The first slice has no analyst; the question belongs to the optional phase |
| `docs/ARCHITECTURE.md` (Proposed components 6-7) | Analyst orchestration and evaluation are core components | Analyst is optional; evals begin with the deterministic metrics |
| `docs/ARCHITECTURE.md` (Provisional choices) | "Use deterministic fake model responses until..." | Still valid, but only for the deferred phase |
| `.gitignore` | No entries for raw data or local databases | Needed before any import |

## 22. Definition of done (Phases 0-3 and Gate A)

- Source and calculations are traceable to provider, revision, file hash, match, and event IDs, with calculation version.
- Import is repeatable and idempotent; failures are reported, not hidden.
- Every displayed metric has a documented definition, unit, denominator, coverage, and tested edge cases.
- Source facts, calculated metrics, and interpretation are separate in code, API, and UI.
- Every chart has a complete table equivalent; accessibility checks listed in section 15 were run and their results reported honestly.
- Coverage limits are visible: no 360, shootout excluded from xG, rejected records, provider caveats.
- Attribution is present; no protected media; no raw data or per-event real rows in Git.
- No LLM, provider key, or network call is required at runtime.
- `README.md`, `docs/ARCHITECTURE.md`, and `docs/HARNESS.md` are current, and ADRs are recorded.
- The final report lists only checks actually run.

## 23. Explicit stop gates

Stop and ask for a decision before:

1. Downloading any dataset file (Phase 1 start; the operator must have registered with StatsBomb).
2. Committing anything derived from real events beyond aggregate expected values.
3. Adding the StatsBomb logo or any third-party media.
4. Adding a dependency that is not in the Phase 0 toolchain decision.
5. Adding any metric not in section 9, or any tactical interpretation.
6. Widening beyond the 16-match set, or adding 360 data.
7. Introducing PostgreSQL, a hosted database, authentication, or background infrastructure.
8. Any model provider, credential, or live model call.
9. Any deployment, hosting account, domain, or public URL.
10. Anything that sends data to an external service.
11. A terms review that comes out unfavourable, which blocks the affected step.

Gate A and Gate B are review stops, and the LLM analyst and deployment are separate later decisions.

## Sources

- `https://github.com/hudl/open-data`: README, `data/competitions.json`, `data/matches/43/106.json`, `data/events/3869685.json`, `data/events/3869321.json`, the 16 knockout event, lineup, and 360 files (read in memory), `LICENSE.pdf`, and `doc/` PDFs (Events v4.0.0, 360 Frames v1.0.0).
- GitHub REST API for `hudl/open-data` (repository metadata, head commit, `doc/` listing).
