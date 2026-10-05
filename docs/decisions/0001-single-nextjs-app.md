# Single Next.js application with no backend services

- Status: accepted
- Date: 2026-10-05

## Context
The product must run at zero cost, deploy later to Vercel Hobby, keep drawings
on the device, and work without a provider. Vercel Hobby is free but limited to
non-commercial use, and exceeding included usage pauses features rather than
billing (checked against Vercel docs on 2026-10-05).

## Decision
One Next.js (App Router) + TypeScript application. The experience is a client
component tree driven by a pure state reducer. The only server code is one
route handler (`/api/interpret`) plus a capability route, both stateless. No
database, accounts, queue, or separate service. Styling is hand-written CSS and
fonts are system stacks, so there are no runtime requests to third parties.

## Consequences
Small surface, easy to audit. Server rendering is dynamic because of CSP nonces
(ADR 0004). Switching framework later is possible because mission, session, and
interpretation logic live in plain TypeScript modules under `src/lib`.

## Alternatives considered
Vite SPA plus serverless function: fewer framework features but a second
deployment shape for the API. Rejected for deployment simplicity. Separate API
service (Render/Supabase): violates the no-persistent-service constraint.
