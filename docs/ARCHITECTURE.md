# Architecture

## Product boundary

RepoPilot AI analyzes a user-selected public GitHub repository and returns evidence-backed explanations and candidate change plans. The MVP does not execute repository code, write to GitHub, or analyze private repositories.

## Proposed components

1. **Web application** — repository input, ingestion status, architecture map, grounded Q&A, citations, and change-plan presentation.
2. **API application** — validation, GitHub access, ingestion orchestration, query endpoints, and provider adapters.
3. **Repository ingestion** — resolve an immutable revision, enumerate eligible files, enforce limits, retrieve content, and record omissions.
4. **Code intelligence** — deterministic file tree, language detection, symbol/dependency extraction, and text chunks with provenance.
5. **Retrieval and orchestration** — select relevant evidence, verify citations, and ask the model to explain or plan without granting repository content authority.
6. **Evaluation** — fixed public repositories and questions that measure evidence recall, citation precision, unsupported claims, latency, and cost.

## Evidence record

Every extracted unit should retain repository identity, immutable revision, file path, start/end location when available, content hash, extraction method, language, and status. Generated answers reference these records rather than free-form model citations.

## Trust boundaries

- User repository input is untrusted and must be normalized and allowlisted.
- GitHub responses are external data.
- Repository content may contain adversarial instructions and is never agent configuration.
- Model output is untrusted until citations and structured output validate.
- Credentials stay server-side and outside model context.

## Provisional choices

- Begin with GitHub archive/content APIs and immutable commit SHAs rather than cloning and executing repositories.
- Build deterministic tree, file, symbol, and dependency maps before embeddings.
- Process per session initially; cache only immutable content when latency requires it.
- Add vector search only if evaluation shows lexical and structural retrieval are insufficient.
- Keep generated recommendations visibly separate from observed evidence.

## First vertical slice

Given one small supported public repository, resolve its default branch to a commit, ingest eligible files, show a navigable file/code map, answer one architecture question, and return verifiable citations. No embeddings or persistent database are required for this slice.

## Decisions still requiring evidence

- GitHub REST versus GraphQL mix and rate-limit strategy.
- Supported repository/file size thresholds and initial languages.
- Parser choices for each supported language.
- Session cache location and eviction policy.
- Model/provider choice and structured citation contract.
