# RepoPilot AI

Read-only AI assistant for understanding public GitHub repositories and turning repository context into useful engineering guidance.

## Status

Development harness ready; implementation has not started.

## Start here

- [Architecture](docs/ARCHITECTURE.md)
- [Development harness](docs/HARNESS.md)
- [Agent guide](AGENTS.md)

## Proposed MVP

- Analyze a user-selected public GitHub repository.
- Produce a navigable architecture and dependency overview.
- Answer repository-grounded questions with file references.
- Suggest implementation plans and candidate files for a requested change.
- Clearly separate retrieved evidence from model-generated recommendations.

## Proposed stack

- Next.js, React, TypeScript, and Tailwind CSS
- GitHub API
- Python and FastAPI
- LangGraph / LangChain
- An LLM and embeddings provider selected after technical validation
- Vercel for the web experience

## Data approach

The first version will process repository context per session and avoid unnecessary persistent storage. A vector database will only be introduced if evaluation shows that it materially improves retrieval quality or scale.

## What this project is meant to demonstrate

Code intelligence, retrieval-augmented generation, evidence-backed answers, API integration, agent workflows, and secure read-only design.

## Initial roadmap

1. Validate GitHub API limits and repository ingestion options.
2. Define supported repository sizes and languages.
3. Build deterministic repository parsing and code maps.
4. Add grounded question answering and change planning.
5. Evaluate answer quality, latency, and cost before deployment.


