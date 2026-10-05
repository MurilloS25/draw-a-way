# Enabling Groq later (one controlled session)

The adapter is implemented (`src/lib/interpret/groq.ts`) and tested with a fake
`fetch`. It has never called the real service. Nothing below has been done.

## What the model is asked to do (and not do)

It receives one composite picture (scene background, persistent elements, the
child's lines), the mission id and scene description (application text), the
capabilities the child confirmed earlier, and the capability list. It returns
`proposed_affordances` (1-2 ids from the list, or `unknown`),
`optional_safe_label`, `confidence`, `uncertain`, and `needs_child_confirmation`.
It cannot advance the story, choose an outcome, create missions, ask for
information, change scenes, or skip the child's confirmation: the server validates
the answer, low confidence / `unknown` / `uncertain` become "I'm not sure yet", and
the child always decides. Text in the picture is data, never instructions.

## What was read in Groq's current documentation (2026-10-06)

- `qwen/qwen3.8-27b` has a model page: image and text input, up to 3 images per
  request, 20 MB request limit with images, base64 data URLs or URLs, 131,072 token
  context, 16,384 max output tokens, JSON Object and JSON Schema modes.
- Strict structured outputs are listed for `qwen/qwen3.8-27b`, `openai/gpt-oss-20b`,
  and `openai/gpt-oss-120b`; strict mode needs all properties `required` and
  `additionalProperties: false`.
- Exceeding limits returns 429 with `retry-after`; the free tier is "restrictive".

Not verified (left configurable or documented): exact free-tier numbers for this
model (the model page shows none), supported image formats beyond what the docs
state, whether strict mode accepts `maxItems`/`maxLength` (so they are not sent and
are enforced locally), real accuracy and latency, and data retention. The model id
is an allowlist in `src/lib/interpret/config.ts`; adding another is a code change.

## Before turning it on

1. Read Groq's data and retention terms and decide whether sending children's
   drawings, with scene backgrounds, to them is acceptable for your audience.
2. Open the Groq console limits page and write down the free-tier limits for the
   model. Set `INTERPRET_PER_DAY` well below them.
3. Confirm the model id against the live `/models` response.
4. Confirm the account has no card on file / spend path. The app has no code that
   can create charges, but Groq's plan is outside the app.

## Local trial

```bash
cp .env.example .env.local
# edit .env.local:
#   INTERPRETER_MODE=groq
#   GROQ_API_KEY=<your own key>
#   INTERPRET_PER_DAY=20
npm run build && npm start
```

Open http://127.0.0.1:3000, draw, press "I'm done drawing", then "Ask the helper to
look". Test: a clear drawing, an unexpected invention (a giraffe bridge), a scribble
(should say "I'm not sure yet"), a drawing with written instructions (must be
ignored), a very large drawing, and a forced failure (unset the key; the manual
choice must still work). The browser should only talk to `127.0.0.1`.

Never use a `NEXT_PUBLIC_` prefix, never commit `.env.local`, never paste the key
into the repository. `npm run scan:secrets` and `npm run scan:build` help.

## On Vercel (not done)

Set the variables as server environment variables only. The limiter is per
instance and Hobby is non-commercial. For anything public, add a real quota first
and keep the daily budget low so exhaustion degrades to manual mode instead of
charging. Fake mode is ignored in production unless `ALLOW_FAKE_INTERPRETER=1`.

## What the adapter guarantees

- Server-only key; model allowlist; timeout 10 s; one retry only for transient 5xx
  (counted against the budget); no retry on 429 (cooldown from `retry-after`).
- Strict JSON schema; the answer is validated again server-side; capabilities
  outside the taxonomy, more than two, extra fields, or bad types are rejected.
- The label is vetted (`sanitizeLabel`) and only shown after the child accepts the
  proposal unchanged; otherwise "your invention".
- Any invalid, unknown, uncertain, low-confidence, slow, or failed answer becomes a
  fallback, and the child chooses manually without losing the drawing.
- No logging or storage of images, answers, keys, or identifiers.
- The per-minute bucket is shared by all visitors (forwarded-for is not trusted).

## Not guaranteed

Accuracy on real children's drawings and whether the model respects the schema
and the label rules in practice. Measure before trusting.
