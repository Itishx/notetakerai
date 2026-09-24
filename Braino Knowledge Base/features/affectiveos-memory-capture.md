# AffectiveOS Memory: Capture, Digest, Recall

**Type:** Technical
**Platform:** AffectiveOS on the Mac (runs inside the Braino Mac app for now)
**Status:** MVP
**Released:** 2026-09-24

## The simple version

AffectiveOS is the part that remembers. Braino is one of the things that will read it. Step 1 is capture: while you use your Mac, a quiet log writes down what you're doing, as text, on your Mac:
- which app and window you're in, and for how long
- the text on your screen when it changes
- your open tabs and what's playing
- your Claude Code conversations
- everything you say to Braino, by voice or typing

Every hour, the layer turns that into memory:
- a short summary
- the main blocks of the hour, with the names you'd search for
- loose ends
- facts worth keeping for good

Braino can use it. Ask "what was that movie site I was on at 2am?" and he answers. Ask him to open it and he does. If two sites fit, he asks which.

You see all of it in its own window, **AffectiveOS Memory**, and one switch there decides whether Braino may use it.

## Why it exists

Braino's memory was half built: only website text chat saved anything. The Mac read your context every few seconds and then threw it away. "Remembers" is one of the two missing verbs, and it belongs to the layer, not to Braino. It has to work even if you never talk to him.

## How to use it

- **Open it:** say "Braino, open memory" (or "what have you been saving?"), or run `npm run mac:memory`.
- **The window shows:**
  - time per app
  - how many screens were read and how many things were said to Braino
  - what's already remembered (the facts Braino stored before)
  - the day's timeline, with search and filters
  - "What was saved", which opens the exact text for any row
- **Forget:** ✕ on a row, or "Delete this day".
- **Pause:** the Pause button, or say "pause memory" / "resume memory". `BRAINO_ACTIVITY=0` turns it off entirely.

## What Braino knows or does

The layer records:
- **Focus:** app, window title and URL each time they change, with how long the last one was in front.
- **Screen text:** read on the Mac by Apple's own text recognition when the window changes (at most every 20 seconds), and again every minute while the same window stays in front. **The screenshot is deleted straight away. Only text is kept.**
- **Tabs:** the Chrome tabs you have open.
- **Playing:** the track, with its link.
- **Conversation:** everything you say to Braino and everything he says back, through any channel on the Mac.
- **Braino tasks:** what you asked and whether it worked.
- **Claude sessions:** which Claude Code conversations changed, so the digest (step 2) knows which to read.

## Digest and recall (added the same day)

- **Every completed hour** is condensed on the Mac. The condensed hour includes:
  - what was in front and for how long
  - screen text
  - tabs, music, and what you and Braino said
  - who messaged, with the text only for people you marked important
  - your Claude Code conversations from that hour
- That condensed hour goes to `memory-digest`, which returns the summary, blocks, loose ends and facts.
- **Facts go into `braino_memories`** through the memory engine, so they're de-duplicated like every other memory.
- **Summaries stay on the Mac permanently.** The raw day still goes after 7 days.
- **Recall:** HIL uses the `memory_search` tool. It works out the time window from "now", finds candidates in the local log, and `memory-recall` picks what answers the question.
  - One clear match: he does what you asked and says which.
  - Several matches: he asks which, in one line.
  - "What was…": he answers and offers to open it.
- **Braino also knows today in general.** The last few hour summaries are added to his conversation and HIL context, so "what have I been doing today?" works without a tool.
- **Memory window additions:**
  - the day's summaries (loose ends, and facts kept for good)
  - "Summarise the last hour"
  - an "Ask your memory" box
  - the **Braino can use this** switch, on by default

## Honest limitations

- **The raw hour does go to the model to be summarised.** It isn't stored on the server, and nothing about it goes to `/engine-log`, which is a public page. Only the summary and facts are kept, and only counts are logged.
- **Recall looks back 7 days in detail**, because that's how long the raw log lasts. Older questions rely on the hour summaries.

- **Not tested live yet.** The text reader was tested on a real screenshot: 0.5 seconds once warm, and the first run takes about 13 seconds while the model loads. The full capture loop hasn't run on your Mac.
- **It needs Screen Recording permission for Braino.** Without it, screen text comes back empty. Everything else still works.
- **Web and Chrome extension conversations are stored on the server, not in this local log.** The viewer shows the facts the server already remembers, but not every web message.
- **It runs inside the Braino Mac app process,** because that app holds the permissions. It can become its own background app later.
- **Skipped as private:** password managers, banking, incognito and private windows, and any app you add. Nothing else is filtered yet.

## Technical shape

- `mac/braino-mac/activity-log.cjs`: pure capture rules.
  - `isPrivate` and `isSelf` run before anything is written, and before any screenshot is taken.
  - Duplicate and unchanged screens are skipped.
  - One JSONL file per day in `~/Library/Application Support/Braino Mac/activity/`.
  - `prune` enforces the 7-day retention.
- `mac/braino-mac/native/BrainoScreenText/main.swift`: reads the text in an image with Vision's `VNRecognizeTextRequest` (English and Hindi). Build it with `npm run mac:screentext:build`.
- `mac/braino-mac/main.cjs`:
  - `startActivityCapture` runs the 5-second focus poll and `captureScreenTextForActivity` (`screencapture -R` on the front window, read, delete).
  - `scanClaudeSessionsForActivity` runs every 5 minutes.
  - Hooks feed it from `checkAllTabsSnapshot`, `pollNowPlaying`, the delegate handler, and `logInteraction` (every conversation).
  - `routeHilFirst` handles the voice switches.
  - `openMemoryWindow` opens the viewer, backed by the `braino-mac:activity-*` IPC handlers.
- `mac/braino-mac/renderer/memory.html` and `memory.js`: the viewer.
- The terminal shows `🧠 MEMORY`, `🧠 FOCUS` and `🧠 SCREEN` lines.
