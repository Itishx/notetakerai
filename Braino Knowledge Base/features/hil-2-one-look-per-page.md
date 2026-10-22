# HIL 2.0: One Look Per Page

**Type:** Technical
**Platform:** Braino for Mac (Human Intelligence Layer, web tasks)
**Status:** MVP
**Released:** 2026-10-23

## The simple version

Braino used to stop and think before every single click. Now he looks at a page once, plans everything that page needs, and does it back to back, the way a person fills in a form without pausing between boxes.

## Why it exists

Asked to sign up for n8n, he took 17 thinking turns and two minutes for something a person does in four clicks. He couldn't see the empty email box, typed through a script the site ignored, clicked a greyed-out button six times, and nothing made him stop and rethink.

## How to use it

Nothing to switch on. Give Braino a web task ("sign me up for this", "open the bug issues on GitHub") and he works the new way. `BRAINO_HIL_FAST=0` turns it off.

## What Braino knows or does

- Sees every box on a page, including empty ones, what each one holds, greyed-out buttons, dropdown choices, and new words like "Sent." or an error.
- Plans the whole page in one turn: fills every box, picks dropdowns, ticks boxes, then clicks submit.
- Types and clicks like a person. Script shortcuts are refused until the normal way has failed twice.
- Waits a beat after a click before deciding it did nothing.
- A watchdog stops him after three moves that changed nothing, and makes him look again and change approach.
- After any failure he follows a fixed order: wait, scroll, find it by its label, fill what is missing, look, then ask.
- Asks real choices (which email owns the account) at the start, never halfway through.
- A reply to something he just asked is never dropped as "not for him" (45 second window).

## Honest limitations

- The batching cap of 3 moves per turn is still enforced by the deployed engine until the new engine is deployed; after that it is 8.
- First run on a new site still costs one thinking turn per page (about 4-5 seconds). Replaying a saved route with no thinking at all is the next step, not built yet.
- Tested on a headless bench (9 jobs, real sites plus local forms), not yet in a long live session on the Mac.
- Clicks inside embedded frames are aimed from the frame, so a real-mouse click there can land off target.

## Technical shape

- `mac/braino-mac/chrome-page.cjs`: new page read (labels for empty boxes, values, disabled, dropdown choices, shadow DOM and same-origin frames, `PAGE SAYS` and `NEW:` lines), dropdown picking, typing sends keyup and focusout.
- `mac/braino-mac/web-runner.cjs`: shared rules: chain size, script guard, watchdog, retry order.
- `mac/braino-mac/main.cjs`: fast mode on by default, chains gated like single steps, `selectOption` hand (was offered by the engine but never wired), click checks wait up to 2.5s, `macInConversation` for the not-for-him fix.
- `supabase/functions/reasoning/hil-loop/index.ts`: HIL 2.0 page rules in `CHAIN_RULE`, chain cap 7 follow-ups. `HIL_VERSION` 2.0.0, `HIL_LOOP_VERSION` 3.0.0.
- `scripts/hil-web-bench.mjs`: headless bench. `node scripts/hil-web-bench.mjs --rules` tests the new rules before deploy.

## Product or design decisions

- Think once per page, act at script speed. The model is the eyes, not the hands.
- Hands act like a person because real sites ignore anything else.
- Success is judged from the page, never from what he says about it.
- Not to be confused with "HIL Version 2: He Remembers" (September), which was a doc name; the code version goes 1.2 to 2.0 here.

## What comes next

Saved routes replayed with no thinking (Playwright speed on the second run), shared through the engine so every Braino learns.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
