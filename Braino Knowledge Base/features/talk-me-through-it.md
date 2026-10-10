# Talk me through it

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 10, 2026

## The simple version

When you give Braino a long job, he tells you what he heard and what he's doing while he does it. "Got it. Finding the five cheapest flights to Goa." Then a short line as each real step starts: "Opening Google Flights." "Typing Goa." Then the answer, as before.

Quick things ("play Billie Jean", "open Chrome") stay instant and silent until they're done.

## Why it exists

On a long job he went quiet for 5 to 8 seconds a step while he clicked around your screen. The thinking panel showed what he was doing, but nobody opens it. A silent thing moving your mouse is unnerving; hearing what it's doing is someone helping you. Clicky does this well.

There was already a line meant to be spoken mid job, but it was his first technical thought ("The dead weight is valid now"), and it was dropped anyway because the notch never speaks while he is busy.

## How to use it

- Give him a job with more than one step. He'll talk you through it.
- Talk over him and he stops, like always.
- Turn it off: Braino app → Voice & listening → Talk me through it.

## What Braino knows or does

- Opens with "Got it" plus the goal he understood.
- Says each step in plain words, made from the step itself.
- At most one line every 4.5 seconds, never the same line twice, at most six lines a job.
- Never reads out his private thinking.
- The final answer cuts off any narration still playing.

## Honest limitations

- Not tested live yet; the automated tests cover the wording and the rules.
- Steps that run back to back faster than 4.5 seconds are not all said, by design.
- Some step labels read stiffly ("Retrying Continue").
- One shot jobs (a single tool) get no "Got it": they finish before it would help.

## Technical shape

- `mac/braino-mac/narrate.cjs`: `asDoing`, `ackLine`, `createNarrator` (pure, tested). No model call: lines come from the loop's `restated_goal` and `macPlainStep(step)`.
- `mac/braino-mac/main.cjs`: `narrate(text)` sends `braino-mac:narrate`. `runMacHilLoop` acks on the first turn's `restated_goal` and narrates each `step` decision; the old `speak-line` of the first thought is gone. `runPlanSteps` acks on step one and narrates the rest.
- `mac/braino-mac/renderer/braino-mac.js`: `onNarrate` speaks while busy, waits for a line already playing (newest wins, stale after 6s), and hands the notch back to "Working" afterwards. Setting `braino-narrate`, default on.
- `renderer/app.js`: the toggle under Voice & listening.
- `tests/mac-narrate.test.mjs`.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
