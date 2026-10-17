# Channel Writers

**Type:** Technical system (shared library)
**Platform:** Supabase edge functions (`supabase/functions/_shared/channel-writers/`)
**Status:** MVP, used by the Outreach Engine
**Released:** October 17, 2026

## The simple version

One small writer per platform (email, LinkedIn, WhatsApp, X, Instagram, Reddit), each with its own rules for two jobs: **outreach** (a message to one person) and **content** (a post). Every writer writes in the founder's own voice. The Outreach Engine uses the outreach side now; the Content Engine will import the same writers, so a founder sounds like one person everywhere.

## Why it exists

One prompt writing all five channels produced the same message trimmed five ways. Each platform is now written by its own writer, called separately, with that platform's rules as the whole of its instructions.

## Shape

- `base.ts`: `ChannelWriter` type, `UNIVERSAL_RULES` (no invented facts, no em dashes, banned phrases, respect product status), `tidy()` (length limits enforced after the model).
- `voice.ts`: `VoiceProfile`, `VOICE_EXTRACT_SYSTEM` (learns a voice from samples), `voiceBlock()` (what the founder said about themselves outranks what was inferred, same rule as `x-voice-prompt.ts`).
- `email.ts`, `linkedin.ts` (connection note hard-capped at 280 chars), `whatsapp.ts`, `x.ts` (full X posting still lives in `x-voice-prompt.ts`), `instagram.ts`, `reddit.ts` (rules from `research/reddit-assistant`).
- `index.ts`: `WRITERS`, `outreachChannels`, `buildWriterSystem(channel, purpose, { voice, selfDescribed })`, `readDraft(channel, reply)`.

Each call caches its fixed prompt per platform (`prompt_cache_key: outreach-writer-<channel>`).

## Your voice

`writing_voices` table (one row per user): `self_described`, `samples` (pasted text and up to 25 sent Gmail messages, read only), `profile` (formality, sentence shape, openers, sign-offs, signature phrases, language mix, habits, never, verbatim examples). Built in Outreach → **Your voice** (`voice_build`). Every writer reads it.

## Honest limitations

- Writers are prompt-based, not fine-tuned models. "Trained" means each has its own rules and the founder's voice, not its own weights.
- Without a learnt voice, writers fall back to plain, warm, brief.
- Reddit and the content side are written but not yet called by anything.
