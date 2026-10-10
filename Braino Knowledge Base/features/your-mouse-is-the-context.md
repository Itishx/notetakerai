# Your Mouse Is the Context

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 3, 2026

## The simple version

Point at something and ask "what is this?". Braino looks where your mouse was when you started speaking: a highlight first, then the exact text under the pointer on a web page, otherwise a small picture around the pointer that the vision model reads. The notch shows what he picked up before he answers.

## How to use it

Hover over a word, a button, a part of a diagram or a photo, and say "Braino, what is this?" or "what part is this?". Highlight text first if you want him to look at exactly that.

## Honest limitations

- A highlight wins even if it is old; clear it if you are pointing at something else.
- In Mac apps (not Chrome), text is read from a picture around the pointer, not exactly, so very small text can be missed.
- An image answer takes a few seconds (one vision call).
- Not tested live yet.

## Technical shape

- `mac/braino-mac/main.cjs`: `notePointer` (the notch's cursor poll keeps 20s of positions), `pointerWhenAsked` (the position at speech start, from `braino-mac:speech-started`), `lookAtPointer` (highlight via BrainoAX "selected", Chrome `caretRangeFromPoint`, else `screencapture -R` crop to chat-about-notes vision), tool `look_at_pointer`, `pointer.look` log events (shown in /trace).
- `hil-tool-catalog.ts`: `look_at_pointer`, with when and when not to use it. HIL scored 26/26 including three pointer cases.
- `tests/mac-pointer.test.mjs`.
