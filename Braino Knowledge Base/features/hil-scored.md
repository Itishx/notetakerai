# HIL, Scored

**Type:** Technical
**Platform:** Everywhere HIL runs (Mac and Chrome)
**Status:** Live
**Released:** October 3, 2026

## The simple version

The Human Intelligence Layer now has a test of its own: 22 real hard commands, each with the screen it saw and a written right answer, scored three times each against the live service. Before tonight it passed 12 of 22. After the fixes it passes 22 of 22, three runs out of three, and answers a little faster.

## Why it exists

A night of hard commands went badly, and it was not random. Six patterns: questions answered with actions, harmless steps called "cannot be undone", a sign-in screen chosen over the Docs page already open, a half-loaded page called "logged out", slow multi-turn asks, and follow-ups treated as new jobs. Underneath them, one more: in one run 7 of 32 replies came back "unreadable", which is where "I lost my train of thought" came from. Every one was a bracket the model dropped or added.

## What changed

- **Bracket repair.** A reply with one closer too many or too few is fixed instead of thrown away.
- **Looking is never gated.** Opening, reading, scrolling, following a link or tab and typing a draft are marked "can be undone" on the server, whatever the model said. Buy, post, send and delete still ask.
- **Five new rules (HIL 2.16.0):** a question gets an answer; ask for the missing piece on turn one; a page that just opened is still loading, and only a real login form means logged out (use the saved login when there is one); a follow-up is the same job; "repeat it back" means say it.
- **Google Docs never sends you to a sign-in.** If Drive is not connected, Braino opens a new doc in Chrome and pastes the text in.
- **Unreadable replies say why**, to the Mac as well as the server log.

## Laya, the same night

Laya was retrained (v5) with 108 of the night's sentences on top of the old data, with every test sentence kept out of training. It scored 80% / 82% / 73% against the current model's 82% / 83% / 70%: within noise, so the current model stays live and v5 is kept as a candidate. A hundred examples cannot move a model trained on two thousand; the 10 to 20 person beta is how the next thousands arrive.

## How to use it

- `node scripts/hil-hard-eval.mjs` scores live HIL; `--runs 3` for the strict version, `--only <id>` for one case.
- Add a case to `tests/fixtures/hil-hard-commands.json` for every new HIL failure: command, context, screen, and the right behaviour.

## Honest limitations

- The test reconstructs the screen; it is faithful, not a recording.
- It scores one decision per command, not whole multi-step runs.
- Twenty-two cases tuned against tonight is a start, not a guarantee: the regression cases (real gates, plain jobs) are there so a fix cannot quietly break the rest.

## Technical shape

- `supabase/functions/reasoning/hil-loop/index.ts`: `balanceJson`, `markHarmlessStepsUndoable`, `parse` in the response.
- `supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts` 2.16.0; `hil-tool-catalog.ts` google_doc_create gloss.
- `mac/braino-mac/main.cjs`: `pasteIntoNewGoogleDoc`.
- `scripts/hil-hard-eval.mjs`, `tests/fixtures/hil-hard-commands.json`, results in `tests/fixtures/hil-hard-results/` (before-full, after-final), `tests/hil-hard-commands.test.mjs`.
- Laya: `~/.braino-laya/training/labeled_tonight.jsonl`, `test_tonight.json`, `labeled_v5.jsonl`; model `~/.braino-laya/models/braino-kind-v5` (not live).
