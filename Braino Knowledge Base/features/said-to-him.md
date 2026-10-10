# Said To Him, Not About Him

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 3, 2026

## The simple version

Braino now tells the difference between being called and being talked about. "Braino, open YouTube" calls him. "After Braino is done asking me a question..." is about him, and he stays out of it. And when he has just answered you, you can reply without his name: a short answer to his question, a correction ("but that's wrong"), or a sentence on the same topic.

## Why it exists

From the October 3 run: while Itish explained a bug to someone else ("after Braino is done asking me a question", "I have to say Braino every single time"), his name woke Braino, who started a job and began clicking. Meanwhile, real replies were dropped for having no name: "But that's wrong, today was a holiday", and "The first chrome profile" in answer to "Tell me which one is your main".

## How to use it

- Call him the way you call a person: name first ("Braino, ..."), or at the end ("..., Braino?"), or "hey Braino".
- After he speaks, just reply. While music or a video plays, replies still need to sound aimed at him.

## Honest limitations

- Not tested live yet.
- Live words in the notch during conversation: the engine hears you within a few hundred milliseconds, but something holds the words back. A new log line (`hera_voice.live_shown` / `hera_voice.live_hidden`) now records, per sentence, how fast they showed or which check held them, so the next run names the cause.

## Technical shape

- `mac/braino-mac/address-intent.cjs`: `nameIsAddressed` (start, end, commas, or followed by an order means calling; after "say", "after", "or", or followed by "is", "keeps", "'s" means a mention).
- `renderer/braino-mac.js`: `voiceExplicitlyAddressesBraino` and the on-device wake word skip mentions; `followsHisReply` accepts short answers (only after a real question), corrections and same-topic sentences; `noteSpoken` counts a question mark anywhere, or "tell me which", as asking; `heraLiveReport` logs live-word timing.
- `tests/mac-said-to-him.test.mjs`, plus updated `mac-voice-name-every-time`, `mac-notch-voice-states`, `mac-hera-voice`.
