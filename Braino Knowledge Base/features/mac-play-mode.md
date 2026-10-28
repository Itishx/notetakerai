# Play Mode: Handle This For Me

**Type:** Mode  
**Platform:** Braino for Mac  
**Status:** MVP (built, not yet tried on a live run)  
**Released:** 2026-10-28

## The simple version

Say or type "handle this for me" and Braino does the thing on your screen himself: fills the form, clicks Next, goes through every page, plays the round of a browser business game, and stops to ask before anything final like Submit or Send.

## Why it exists

He used to fill a form and stop. The job was half done and you still had to finish it. Play mode carries it to the end.

## How to use it

- Put the window in front (Chrome page, app, or browser game).
- Say or type (⌘⌥T): "handle this for me", "take care of this", "do this for me", "fill this form for me", "finish this", "complete this", "play this game", "solve this", "next round".
- The notch shows "Handling" (or "Playing") with one line per step.
- Stop: say "stop", press Escape, or tap Stop in the notch.
- Before Submit / Send / Confirm / Book / Delete: a card asks. Enter or "yes", "send", "haan" = go. Esc or "no" = stop.

## What Braino knows or does

- Reads a Chrome page as numbered fields and buttons and acts on them directly (needs Chrome: View > Developer > Allow JavaScript from Apple Events).
- Reads other apps through the accessibility tree.
- Takes a screenshot of just that window only when there is nothing to read (canvas games) or every 6th step as a check.
- Up to 5 field fills in one step on the same page.
- Run log: `~/Library/Logs/Braino Mac/play-runs/<run>/actions.jsonl` plus screenshots; summary with estimated cost in braino-mac.log.

## Honest limitations

- Refuses anything that looks like an exam, quiz, test or graded assessment ("That looks like a test. Not doing that one."). The detector can be wrong, so the card offers "It's not a test, do it" (or say "do it anyway"). That override is logged and lasts for that page in that run only.
- Never types passwords, card numbers or OTPs, never solves CAPTCHAs, never clicks Pay / Buy / Place order / Delete account.
- Limits: 60 steps, 20 minutes, or three unchanged screens in a row.
- A Yes to a final button is remembered for that same button for the rest of the run (so a game's "Submit round" asks once).
- Safari and Arc are read through accessibility or screenshots, not the page itself.
- Double click is two quick clicks and may not register as a double click everywhere.

## Technical shape

- HIL tool `handle_screen` (alias `play_screen`) in `supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts`; HIL prompt section "Handling the screen" in `hil-system-prompt.ts` (HIL 2.1.0, catalog 1.12.0).
- Mac: "Play mode" section in `mac/braino-mac/main.cjs` (`startPlayMode`, `runPlayLoop`); pure rules in `mac/braino-mac/play-mode.cjs`; trigger phrases reach the brain via `MAC_SCREEN_JOB` in `hil-routing.cjs`.
- Model: `chat-about-notes` delegate door (BRAINO_TEXT_MODEL), fixed system prompt first so it caches; screenshots go through the same call's vision path. No new edge function.
- Cost (estimate): about $0.0008 to $0.001 per step either way, structure or vision.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
