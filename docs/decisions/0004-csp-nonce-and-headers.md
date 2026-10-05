# Nonce-based CSP via proxy, plus hardening headers

- Status: accepted
- Date: 2026-10-05

## Context

Next.js emits inline bootstrap scripts. A static CSP would need
`script-src 'unsafe-inline'`.

## Decision

`src/proxy.ts` generates a per-request nonce and sets
`Content-Security-Policy` (`default-src 'self'`, `script-src 'self' 'nonce-...'
'strict-dynamic'` plus `'unsafe-eval'` only in development, `connect-src
'self'`, `img-src 'self' data: blob:`, `frame-ancestors 'none'`, `object-src
'none'`, `base-uri 'self'`, `form-action 'self'`). `style-src` keeps
`'unsafe-inline'` because React inline style attributes need it. Static
headers from `next.config.ts`: nosniff, no-referrer, restrictive
Permissions-Policy (camera, microphone, geolocation, payment off), COOP, CORP.

## Consequences

Pages are rendered per request. CSP is verified in the e2e suite. Style
`'unsafe-inline'` is a known, documented residual.

## Alternatives considered

Static CSP with `'unsafe-inline'` scripts: weaker. Hash-based CSP: brittle with
framework-generated scripts.
