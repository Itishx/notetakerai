# Trace

**Type:** Technical
**Platform:** Braino for Mac + localhost:8080/trace
**Status:** MVP
**Released:** October 3, 2026

## The simple version

Type a command and watch how Braino understands it, live, step by step, with real timings. **Show me** follows the real path and does nothing on the Mac. **Run it for real** lets him do it and streams every step as it happens.

## How to use it

1. Run the Mac app (`npm run mac:fast`) and the site (`npm run dev`).
2. Open localhost:8080/trace. The badge says "Braino Mac connected".
3. Type a command, press **Show me**, or **Run it for real** (it asks once more before it acts).

## What you see

- **Fills in what you meant:** "open it" becomes the thing it points to.
- **Quick checks, in the real order:** about 20 rules that run before any model (memory, small talk, battery, Chrome profile, type and search, instant controls, localhost, tab switch, forms, spoken web address, old fast path, stop words, close all tabs, one word, page links, recipes, learned skills, shortcuts, timetable). The first one that takes the command, and the real run stops there.
- **Laya:** what she says, how sure, how fast, and whether the real run would skip her (it only waits 300ms).
- **HIL router:** the first call: fire a tool, hand to the loop, ask, or just talk.
- **HIL thinks it through:** what it sees on your screen, its reasoning, plan, the action it would take, and whether it would ask first.
- **Real path** and a timing bar of where the time went.

## Honest limitations

- Works only on the Mac running Braino, from localhost pages.
- Show me shows HIL's first turn, not every turn; Run it for real shows them all.
- The quick checks are a copy of the real order; `tests/mac-trace.test.mjs` fails if the two drift.

## Technical shape

- `mac/braino-mac/main.cjs`: `startTraceServer` on 127.0.0.1:47824 (localhost origins only), `traceWhoTakesIt` (routeHilFirst's checks, in order, acting on nothing), `traceThink` (streams NDJSON stages), `/trace/run` (runDelegate with macTrace and key log events streamed). `traceSink`/`TRACE_EVENTS` are declared above `logMac`.
- `src/pages/Trace.tsx`, `trace.css`.
