# Clean Hearing

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 4, 2026

## The simple version

Braino used to write down things you never said: his own voice coming back through the speakers, music, a fan, or the room turned into words like "Open the door". Clean hearing stops most of that before it becomes a command.

## How to use it

It is on by default. Turn it off in the Braino app under Calling him, then Clean hearing.

## What it does

- While Braino is talking, plus a short moment after, the mic sends nothing. Say "stop" and he still stops, because the Mac hears that word on its own.
- If the mic never heard a voice during a "turn", the words are dropped.
- If the transcriber says it was unsure of the words, they are dropped.
- Each transcript stays with the turn it belongs to, so late words never land on your next sentence.
- On a long sentence OpenAI sometimes writes its own short version. If HERA, the live words on your Mac, heard clearly more of the same turn without Braino's voice in it, HERA's words are used.
- Fixed alongside: since July 25 the "you started talking" step crashed on a leftover line, so turns never started clean. One line removed.

## Talking slowly, and what you see

- Pauses no longer cut you off. A sentence that stops mid-thought (no full stop, ends on a comma or a word like "and") waits up to about two seconds for the rest, then the whole thing is judged once. Say his name anywhere in it and all of it counts.
- While you talk, the notch glows softly with your voice instead of showing rough words. When you stop, it shows the exact words that are sent.

## Honest limitations

- While he talks, only stop words cut him off. A whole new sentence over him is not heard until he stops.
- Music loud enough to sound like a voice can still pass the mic check. The older music filter still applies.
- The thresholds are first guesses. Every turn logs `clean_ear.turn`, so they get tuned from real use.
- English only, as before.

## Technical shape

- `mac/braino-mac/renderer/braino-mac.js`: clean-ear block next to `setRealtimeMicEnabled`. Switch `brainoCleanEar` in localStorage, `cleanEar` app-overlay patch. Mutes the mic track while `brainoAudible()` or for 450ms after; `cleanEarMeterStart` keeps 50ms voice samples for the last minute; `cleanEarVerdict` drops turns that have no voiced samples or a mean logprob under -1.0. Asks for `item.input_audio_transcription.logprobs` in its own `session.update`, and a refusal is silent. Transcripts are tracked by `item_id`, and an earlier turn's final transcript flushes as its own turn.
- `mac/braino-mac/renderer/app.js`: the Clean hearing toggle.
- Logs: `clean_ear.mic`, `clean_ear.turn`, `clean_ear.final_missing`, `clean_ear.confidence_unavailable`.
- Test: `tests/mac-clean-ear.test.mjs`.
- Next step, not built yet: Apple's own echo cancelling and an on-device speech detector in the HERA helper, with one mic for everything.
