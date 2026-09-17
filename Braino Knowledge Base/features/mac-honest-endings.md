# Never saying it is done when it is not

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** September 18, 2026

## The simple version

Braino can only claim he did something if he actually did something.

- **Every run counts its real actions.** Looking, reading and thinking are not actions. Clicking, typing, opening, sending and running a tool are.
- **A claim with nothing behind it is refused.** If a run changed nothing and tries to end with "Done" or "the light was turned on", he says instead: *"I could not do that, and nothing on the Mac changed. I was trying to turn on the light."*
- **A claim he could not check keeps the doubt.** "Opened the file, but I could not confirm it on screen."
- **Answers are not claims.** A run that only looked can still answer a question ("Your desktop has 12 files"), because that is a finding, not a boast.
- **Words on a screen are never proof.** A terminal, a log, a chat or an editor shows what somebody wrote, including what Braino said a minute ago.

## Why it exists

On 2026-09-17, "Braino, turn on the light" ran for 55 seconds across four thinking steps, opened the Home app, looked at the screen, read a terminal that happened to contain the words, and finished with:

> "Done. The light was turned on through the Mac controls."

Nothing had been turned on. Braino has no way to control lights. That is the one failure a person cannot catch without redoing the work themselves.

## What Braino knows or does

- `macActionChangedSomething` decides what counted: observation actions (`read`, `look`, `observe`, `screenshot`, `wait`) and reporting tools (`screen_vision`, `now_playing`, `take_screenshot`, `tabs_census`, `web_search`, `deep_research`, `front_window_summary`, `read_selection`, `spotify_now_playing`) change nothing, and a failed action changes nothing either.
- `macClaimsAction` recognises a completion claim by shape: "Done…", a sentence-initial past tense ("Opened Language Chooser"), first person ("I sent it"), or passive ("the light was turned on"). Anything hedged ("could not", "about to", "do you want me to") is not a claim.
- `honestEnding` runs on all three endings that can claim: `answer`, `all_done` and `task_done`. Refusals are logged as `hil.loop.unbacked_claim`, doubts as `hil.loop.unverified_claim`.
- Both vision calls, the loop's `look` and `screen_vision`, are told to describe only what is visible, to say when something is too small or covered, and that text on screen is never evidence that an action succeeded.
- The loop's own instructions carry the same two rules server side (11a and 11b in `hil-loop-prompt.ts`), deployed 2026-09-18.

## Honest limitations

- The guard catches a claim with no action behind it. A run that did something real but the wrong thing can still describe it wrongly; the doubt clause only fires when the check after the last action failed.
- Recognising a claim is by sentence shape, so an unusual phrasing could slip through.

## Technical shape

- `mac/braino-mac/hil-verify.cjs`: `macClaimsAction`, `macActionChangedSomething`.
- `mac/braino-mac/main.cjs`: `honestEnding`, the `actionsDone` and `lastCheckFailed` counters in `runMacHilLoop`, the two vision prompts.
- `supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts`: rules 11a and 11b.
- Tests: `tests/mac-honest-endings.test.mjs`.
