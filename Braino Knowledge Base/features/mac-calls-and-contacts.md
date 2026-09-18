# Calling and messaging people by name

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** September 17, 2026 (name matching and corrections); September 18, 2026 (the whole address book, read properly)

## The simple version

"Braino, FaceTime Ilu" calls Ilu, however the name was heard.

- **By sound, not spelling.** The transcriber wrote "Iloo" and "Elu"; the contact is saved as "Ilu😍". Names are now compared by how they sound, and emoji in contact names are ignored.
- **People you call win a tie.** Braino remembers who you call and message, so "Ilu" is the Ilu you actually call, not "Ilu ki Murli Wife".
- **A real tie is a question.** "Call Tejas" with Tejas Sis and Tejas Mom saved: "Which one, Tejas Sis or Tejas Mom?"
- **Corrections carry the request.** If a name is not found, the call stays asked for 45 seconds. "Ilu", "ILU Braino", "No, I said Ilu" or "not Elu, Ilu" retries the same FaceTime with that name, instead of starting a chat about Ilu.
- **Names are said cleanly:** "Calling Ilu on FaceTime", not "Ilu smiling face".
- **Everyone, with everything.** Braino reads the Mac address book itself: 404 people with every number, every email, nicknames and companies, in about thirty milliseconds. He used to ask the Contacts app, which took one minute fifty-two seconds and gave back only a name and one number, so it was done once a day.
- **Any part of a name.** "Salvaji" finds Balraj Salvaji, "Abhi" finds him by nickname. A first name still beats somebody else's surname, and a company is the weakest match of the three.
- **The right number.** A mobile before a landline before a fax, so a call goes to the phone in their pocket.
- **Saved this morning, called this afternoon.** A name he does not know sends him back to the address book once (at most every thirty seconds) before he says "not in your contacts".
- **"Who is Prakhar?"** He can read someone out of the address book aloud: every number, the email, where they work.

## Why it exists

A person told "call Ilu" knows who Ilu is from who you usually call, not from the spelling. The September 17 log had "FaceTime Iloo" and "FaceTime Elu" both fail, then "ILU Braino" answered as "What's on your mind with Ilu?".

## What Braino knows or does

- `contact-match.cjs`: `soundKey` (oo/ou→u, ee/ea→i, kh/th/sh/bh→k/t/s/b, doubled letters, an opening e→i), `scoreContactName` (exact 100, first name 90 to 95, by sound 75 to 85, a later word in the name 62 to 80, the same words in another order 78, one slip on names of five letters or more 60), `scoreContactEntry` (name, then nickname capped at 88, then company capped at 62 and only for four letters or more), `findContactBySound` (adds up to 20 for people you contact; a tie goes to whoever has a number; the same person saved twice is one answer; an equal tie with nobody contacted comes back as a question), `contactPhone`, `parseCorrectedName`, `speakableContactName`.
- `importContactsFromDatabase` reads `~/Library/Application Support/AddressBook/**/AddressBook-v22.abcddb` read-only with `sqlite3` (`ZABCDRECORD`, `ZABCDPHONENUMBER`, `ZABCDEMAILADDRESS`), joins every number and email onto its owner, and picks the number to ring with `preferredContactPhone`. The old AppleScript read stays underneath for the day the schema changes.
- `refreshContactsIfStale` re-reads the address book on a miss, once every thirty seconds.
- `lookupContactDetails` is the `contact_lookup` tool: a name in, the whole card out loud.
- `resolveWhatsAppRecipient` tries a saved alias, then the sound match, then the old spelling lookup, then one fresh read of the address book, then Contacts itself.
- `contact-history.json` records every call and WhatsApp message. On a Mac with no history it is seeded once from the log (`call.started`, `whatsapp.sent`).
- The correction is a pending workflow (`type: "call"`, `stage: "call_recipient"`, `ttlMs: 45000`). While it waits, sentences arrive without his name, so anything that is not a name and does not say "Braino" is dropped quietly, never run.

## Honest limitations

- A name that sounds like nobody you have saved still fails; teach it with "remember X's number is …".
- 55 of 404 first names are shared by two or more people, so those ask "which one?" until you have called one of them.
- Contacts saved with no number at all (2 of 404 here) can be looked up but not called.
- Short names only match exactly or by sound, never by a one-letter slip, because a three-letter name is one letter from dozens of others.
- The correction window is 45 seconds.

## Technical shape

- `mac/braino-mac/contact-match.cjs` (pure), `main.cjs` (`addressBookDatabases`, `queryAddressBook`, `preferredContactPhone`, `importContactsFromDatabase`, `importAllContacts`, `refreshContactsIfStale`, `lookupContactDetails`, `resolveWhatsAppRecipient`, `startCall`, `sendWhatsAppMessage`, `handlePendingMacWorkflow`, `recordContactUse`, `seedContactHistoryFromLog`), `interrupt-intent.cjs` (`call_recipient` claims short names).
- HIL tools: `contact_lookup` and `call_start` are wired in `MAC_HIL_TOOLS`; `contact_lookup` is new in `hil-tool-catalog.ts`.
- Tests: `tests/mac-contact-match.test.mjs`.
