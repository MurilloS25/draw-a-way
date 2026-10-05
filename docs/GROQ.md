# Enabling Groq later (one controlled session)

The adapter is implemented (`src/lib/interpret/groq.ts`) and tested with a fake
`fetch`. It has never called the real service. Nothing below has been done.

## Before turning it on

1. Read Groq's current data and retention terms and decide whether sending
   children's line drawings to them is acceptable for your audience.
2. Open the Groq console limits page and write down the free-tier request and
   token limits for the model you will use. Set `INTERPRET_PER_DAY` well below
   them. (This repository never verified the numbers.)
3. Confirm the model id in Groq's docs. The allowlist in
   `src/lib/interpret/config.ts` currently holds `qwen/qwen3.8-27b`, taken from
   Groq's vision docs on 2026-10-05. Changing it is a code change on purpose.
4. Confirm the account has no card on file / no spend path. The app has no
   code that can create charges, but Groq's plan is outside the app.

## Local trial

```bash
cp .env.example .env.local
# edit .env.local:
#   INTERPRETER_MODE=groq
#   GROQ_API_KEY=<your own key>
#   INTERPRET_PER_DAY=20
npm run build && npm start
```

Open http://127.0.0.1:3000, draw, press "I'm done drawing", then "Ask the
helper to look". Expect "I think you made ... Is that what you meant?".
Test: a good drawing, a scribble (should say it is unsure), a drawing with
written instructions in it (must be ignored), and a forced failure (unset the
key; the manual choice must still work). Check the console and network tab:
the browser should only talk to `127.0.0.1`.

Never use a `NEXT_PUBLIC_` prefix, never commit `.env.local`, and never paste
the key into the repository. `npm run scan:secrets` and `npm run scan:build`
help catch mistakes.

## On Vercel (not done)

Set the three variables as server environment variables only. Note the limiter
is per instance and Hobby is non-commercial. For anything public, add a real
quota (for example an edge-level rate limit) first, and keep the daily budget
low so exhaustion degrades to the manual mode instead of charging.

## What the adapter guarantees

- Server-only key; model from an allowlist; timeout 10 s; one retry only for
  transient 5xx; no retry on 429 (and a cooldown from `retry-after`).
- Strict JSON schema whose only free value is an enum of the active mission's
  ids plus `none`; the answer is validated again server-side.
- Text inside the drawing is treated as data. The prompt says so, and the
  output channel cannot carry text anyway.
- Any invalid, unknown, foreign-mission, slow, or failed answer becomes a
  fallback, and the child chooses manually.
- No logging of images, answers, keys, or identifiers.

## Not guaranteed

Accuracy on real children's drawings. Only the lines are sent (not the scene),
which may hurt placement-based ideas such as "bridge". Measure before trusting.
