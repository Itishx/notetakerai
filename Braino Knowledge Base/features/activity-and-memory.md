# Activity and Memory

**Type:** Feature
**Platform:** Braino for Mac (the Braino app)
**Status:** MVP
**Released:** 2026-09-29

## The simple version

Two pages in the Braino app, under Library:
- **Activity:** everything Braino did for you, newest first, a day at a time. Each row shows what you asked, what he did or said, how he did it (Instant, Think once, Worked it out, Talk), how long it took, and a green or red dot. Search it, or filter to Done or Didn't work.
- **Memory:** **What he knows about you** at the top. Every fact he keeps, labelled (Who you are, People, Projects, How you like things, Dates, Other) and where it came from (you told me, I noticed, from your Mac). **Edit** fixes it, **Forget** removes it, and the box at the top adds something new. Your day remembered as text is still below.

Plus, in the morning: after "Good morning, Itish", he asks about **one thing you told him in the last two weeks** ("How did the 1v1 with Param go?"). Never the same one twice, and only inside the greeting you started. He does not interrupt you otherwise.

## Why it exists

You couldn't see what he had done, or fix what he got wrong about you. Meta's Muse shows both; Grok's companions showed that remembering something you said days ago is what makes people come back.

## Honest limitations

- Activity reads his own log on this Mac, so it covers the last few days of use, not forever.
- Forget archives the fact (he stops using it) rather than erasing it, so a slip can be undone.
- The morning question needs a recent fact worth asking about; with none, he just says good morning.
- Tested in a test window with pretend data, not yet end to end.

## Technical shape

- `renderer/app.js`: pages `activity` and the "What he knows about you" section of `memory`; styles in `app.css`.
- `main.cjs`: `braino-mac:app-activity` (reads `feature.executed` from the log, up to 3 MB back); `braino-mac:memories-list`, `memory-update`, `memory-delete` (sets `status: archived`), `memory-add` on `braino_memories` with the user's own session (row level security).
- Morning callback: `braino-mac:arrival-callback` picks one active fact from the last 14 days (event, project, relationship, fact; not from setup), phrases it as one question through `runMacConversation` (4 second cap), and records it in `arrival.json` so it is never repeated. Spoken after the good morning in `onArrivalHello` (`braino-mac.js`).
