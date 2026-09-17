# Calling and messaging people by name

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** September 17, 2026 (name matching and corrections)

## The simple version

"Braino, FaceTime Ilu" calls Ilu, however the name was heard.

- **By sound, not spelling.** The transcriber wrote "Iloo" and "Elu"; the contact is saved as "Ilu😍". Names are now compared by how they sound, and emoji in contact names are ignored.
- **People you call win a tie.** Braino remembers who you call and message, so "Ilu" is the Ilu you actually call, not "Ilu ki Murli Wife".
- **A real tie is a question.** "Call Tejas" with Tejas Sis and Tejas Mom saved: "Which one, Tejas Sis or Tejas Mom?"
- **Corrections carry the request.** If a name is not found, the call stays asked for 45 seconds. "Ilu", "ILU Braino", "No, I said Ilu" or "not Elu, Ilu" retries the same FaceTime with that name, instead of starting a chat about Ilu.
- **Names are said cleanly:** "Calling Ilu on FaceTime", not "Ilu smiling face".

## Why it exists

A person told "call Ilu" knows who Ilu is from who you usually call, not from the spelling. The September 17 log had "FaceTime Iloo" and "FaceTime Elu" both fail, then "ILU Braino" answered as "What's on your mind with Ilu?".

## What Braino knows or does

- `contact-match.cjs`: `soundKey` (oo/ou→u, ee/ea→i, kh/th/sh/bh→k/t/s/b, doubled letters, an opening e→i), `scoreContactName` (exact 100, first name 90 to 95, by sound 75 to 85, one slip on names of five letters or more 60), `findContactBySound` (adds up to 20 for people you contact; an equal tie with nobody contacted comes back as a question), `parseCorrectedName`, `speakableContactName`.
- `resolveWhatsAppRecipient` tries a saved alias, then the sound match, then the old spelling lookup, then Contacts itself.
- `contact-history.json` records every call and WhatsApp message. On a Mac with no history it is seeded once from the log (`call.started`, `whatsapp.sent`).
- The correction is a pending workflow (`type: "call"`, `stage: "call_recipient"`, `ttlMs: 45000`). While it waits, sentences arrive without his name, so anything that is not a name and does not say "Braino" is dropped quietly, never run.

## Honest limitations

- A name that sounds like nobody you have saved still fails; teach it with "remember X's number is …".
- Short names only match exactly or by sound, never by a one-letter slip, because a three-letter name is one letter from dozens of others.
- The correction window is 45 seconds.

## Technical shape

- `mac/braino-mac/contact-match.cjs` (pure), `main.cjs` (`resolveWhatsAppRecipient`, `startCall`, `sendWhatsAppMessage`, `handlePendingMacWorkflow`, `recordContactUse`, `seedContactHistoryFromLog`), `interrupt-intent.cjs` (`call_recipient` claims short names).
- Tests: `tests/mac-contact-match.test.mjs`.
