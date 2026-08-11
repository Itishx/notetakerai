# GPT-5.6 Luna Across Braino

**Type:** Technical  
**Platform:** Braino website, Chrome extension, and Mac-backed services  
**Status:** MVP  
**Released:** August 9, 2026

## The simple version

Braino's everyday text and vision work now points to GPT-5.6 Luna. Luna was the cheaper of the two GPT-5.6 options we considered, so the model bill falls without asking people to choose a model on every device.

## Why it exists

Braino had the same GPT-5.4 Mini default repeated across chat, notes, research, HIL, X helpers, and the browser extension. A separate stronger fallback also remained in the extension. That made cost harder to predict and a model change easy to miss on one surface.

At OpenAI's standard short-context rates per one million tokens:

- GPT-5.6 Luna costs $0.20 for input, $0.02 for cached input, and $1.20 for output.
- GPT-5.6 Terra costs $2.00 for input, $0.20 for cached input, and $12.00 for output.
- The previous GPT-5.4 Mini costs $0.75 for input, $0.075 for cached input, and $4.50 for output.

Luna is 90% cheaper than Terra on those three rates, and roughly 73% cheaper than GPT-5.4 Mini. The source is OpenAI's [API pricing page](https://developers.openai.com/api/docs/pricing).

## How to use it

There is no new switch. Braino chooses Luna behind the scenes after the updated Edge Functions and device builds are released.

## What Braino knows or does

- Uses one shared Luna default across Braino's Edge Function text and vision routes.
- Pins both normal extension steps and rare strategist steps to Luna.
- Keeps GPT-5.4 Mini's effective no-reasoning behavior explicit, avoiding a silent latency and cost jump from GPT-5.6's default reasoning level.
- Leaves realtime voice, transcription, text-to-speech, embeddings, moderation, and other purpose-built model contracts alone.
- Keeps web-search environment overrides available for deliberate experiments.

## Honest limitations

Luna is the cost-first choice, not the strongest GPT-5.6 model. Braino still needs representative quality and latency checks across chat, long notes, vision pointing, HIL routing, and research before this moves from MVP to Live. Existing Edge Function deployments and installed extension builds do not change until they are released. A configured `OPENAI_WEB_SEARCH_MODEL` or `OPENAI_WEB_SEARCH_FAST_MODEL` can still override Luna for research.

## Technical shape

`supabase/functions/_shared/openai-models.ts` is the server-side source of truth. Chat, notes, research, HIL, vision, and X Edge Functions import `BRAINO_TEXT_MODEL` from it. Chat Completions routes also use `BRAINO_TEXT_REASONING_EFFORT` to preserve the previous `none` behavior.

The extension cannot import a Deno module, so `extension/lib/models.js` carries the same model ID and a lower per-turn cost estimate. Its model fallbacks are mirrored in `public/sidebrain-extension` and `dist/sidebrain-extension`. `tests/openai-models.test.mjs` prevents those copies and the backend callers from drifting back to an older GPT-5 default.

## Product or design decisions

Cost wins this round. Terra may produce better results on harder work, but using it everywhere would cost ten times Luna's standard short-context token rates. Braino keeps one predictable default now and can add an evaluated escalation route later if real failures justify it.

## What comes next

Run a small cross-surface eval set, deploy the affected Edge Functions, publish a fresh extension build, then compare real token cost, latency, parse reliability, and user-visible quality against the previous model.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
