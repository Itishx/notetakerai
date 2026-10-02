# Long jobs: faster, and he keeps the thread

Status: built 2026-10-01, behind a switch, off by default. Turn on with `npm run mac:fast` (or `BRAINO_HIL_FAST=1`).

## Why

Measured from the Mac log (22–30 Sep): a long job (4+ steps) took about 57 s and only about 1 in 4 clearly finished. Each step cost about 5 s of thinking, and on long jobs he lost the goal and went in circles.

## What changed (all inside HIL; Laya still makes the one decision, no new lanes)

| Fix | What it does |
|---|---|
| Task card | Every turn carries the goal, the moves that worked, and a note if the last one failed. |
| Pinned findings | What a search, script or look found is kept apart from reminders, so it is never pushed out. |
| Chained moves | A turn may add up to 3 more moves that need no fresh look (type then Enter, open then wait). The Mac runs them back to back with no thinking in between. Never a move that points at an element, never a send, post, buy or delete; stops at the first failure. |
| No repeat of a failed move | A move identical to the one that just failed goes straight to the "look properly, then stronger brain" rescue instead of being tried again. |
| Skills in any word order | A learned job also matches the same words in another order (same first word, same words). Only reversible jobs are ever saved. |

Already in place before this: plan once for jobs that don't need the screen, local checks after each step, ask before anything irreversible, 20 s "keep going?".

## Files

- `mac/braino-mac/main.cjs`: `macHilFastEnabled`, `macHilCard`, `macRunChain`, `macHilPin`, changes in `runMacHilLoop`.
- `mac/braino-mac/skill-memory.cjs`: `findSkill`.
- `supabase/functions/reasoning/hil-loop/index.ts`: renders `card` and `found`; `CHAIN_RULE` and `then` parsing only when the request has `batch: true`.
- Tests: `tests/mac-hil-fast.test.mjs`. Score: `node scripts/hil-long-score.mjs [since]`.

The server part needs `supabase functions deploy hil-loop` before chaining works. Without it, the card and pins are ignored by the old server and nothing breaks.

## Long-job test (run the same 10, switch off then on)

1. Open GitHub, find my last repo, and send the link to John on WhatsApp.
2. Find the five cheapest flights to Mumbai this Friday.
3. Open LinkedIn and write a post about AffectiveOS (stop before Post).
4. Switch to my Pinterest tab and open the first pin.
5. Go to Instagram, open Reels, and play the next one.
6. Find my last email from Mesa and draft a reply saying I will be there.
7. Open Notes, make a new note called Launch, and write three bullet points for 16 Oct.
8. Search YouTube for Billie Jean and play the official video.
9. Open my Google Calendar and tell me what is on tomorrow.
10. Sync with Nexus and tell me what is due this week.

Before: `node scripts/hil-long-score.mjs 2026-09-22` → long jobs median 57 s, 4 finished of 16.
