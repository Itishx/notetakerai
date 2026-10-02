# Think Once, Then Do

**Type:** Technical
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-26

## The simple version

When you ask Braino for something with several steps, he no longer stops to think before every step. He works out the whole job once, then his hands do each step straight after the last.

For the jobs people ask most, he doesn't even think once. The steps are already written down. We call those recipes.

And before any of that, a small model on your Mac (Laya) sorts what you said in about 40 milliseconds: one action, many steps, chat, unclear, or not meant for him.

## Why it exists

"Start a Google Meet and send the link to Ilu" used to go through the step-by-step loop, which thinks for 4 to 8 seconds before every single step. That's 40 to 90 seconds, and it often gave up halfway. Thinking between steps was the slow part, not the doing.

## How to use it

Just ask. Try:
- "Start a Google Meet and send the link to Ilu." (recipe)
- "Send this link to Param." (recipe)
- "Open a new Google Doc." (recipe)
- "What's my current attendance?" (thinks once, then answers with your real numbers)
- "Open GitHub, find my last repo and send it to Param." (Laya sorts it as many steps, so it goes straight to think-once)

## What happens, in order

1. Instant controls (next reel, volume, back) fire with no thinking.
2. A recipe runs if the sentence matches one.
3. The known fast rules run (WhatsApp someone, play a song, open an app).
4. Laya sorts the sentence. If it's sure the job has many steps, it goes straight to step 5. If it's sure the sentence is garbled, he asks you to say it again.
5. **Think once:** one call writes every step, knowing the time, the front tab, what's playing and today's memory.
6. The steps run back to back. Each step's result feeds the next one, so the Meet link goes into the WhatsApp.
7. If a step fails, the job hands over to the step-by-step loop, which can look at the screen and carry on from there.
8. If the last step fetched something (attendance, timetable, who messaged), he says what it found, not a generic "Done."

## Honest limitations

- Recipes only cover three jobs so far.
- Laya is right 85% of the time on commands it has never seen. When it isn't sure (about 12% of the time), Braino ignores its answer and routes as before.
- Laya thinks questions about your own day ("what are my classes tomorrow") are chat. So its chat answers are logged only, not acted on, until it's retrained.
- Laya's "not meant for him" answer is logged only, too. Dropping a real command would be worse than answering room chatter.
- Sending on WhatsApp is now the slowest step (about 13 seconds in the first Meet test).

## Technical shape

- Recipes and argument filling: `mac/braino-mac/plan-runner.cjs` (`recipeFor`, `fillArgs`, `stepValue`).
- Runner and plan call: `runPlanSteps`, `planOnce`, `planReply` in `mac/braino-mac/main.cjs`. The plan comes from the `hil-plan` edge function.
- Plan-only hands: `current_tab_url`, `wait_for_url`, `press_keys`, `wait`.
- Laya: `mac/braino-mac/laya-serve.py`, a local server on `127.0.0.1:47831`, started by the app from `~/.braino-laya` and stopped when it quits. `BRAINO_LAYA=0` turns it off. The model was fine-tuned on 1,542 labelled commands (85% held-out accuracy, about 35ms on an M4).
- Reply fixes: the record-this-meeting offer takes only a yes or a no, and there's no offer when Braino opened the Meet himself.
- Logs: terminal `🧩 RECIPE`, `🧩 PLAN`, `🪶 LAYA` lines; `plan.ran` and `laya.kind` in the Mac log.
- Tests: `tests/mac-plan-replies.test.mjs`, `tests/mac-laya.test.mjs`.

## Status

MVP. The Meet recipe was tested live (the link was sent correctly). Plan-once has been seen working on attendance and timetable questions.
