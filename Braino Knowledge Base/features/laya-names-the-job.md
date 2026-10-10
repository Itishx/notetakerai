# Laya Names the Job

**Type:** Technical
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 4, 2026

## The simple version

Laya, the small model on your Mac, now does two things in about 80ms: it says what kind of sentence it is (chat, one job, many steps, unclear, not for him) and which job it is (open, play, message, call, files...). That guess stops its own mistakes and goes to HIL as a hint. HIL still decides.

## How to use it

Nothing to do. "decider stage off" puts the old behaviour back; "decider stage 2" turns it on again.

## What changed

- Laya v6, trained on 7,431 commands: 89% on recent real commands (was 70%), 80-81% on the older test sets (was 82-83%).
- Stage 1: the four risky shortcuts (Chrome profile, type and search, tab switching, "open it") stop deciding alone and go through HIL.
- Stage 2: questions and talk never go to the planner; a complete command whose job is clear is never asked back; HIL sees "layaGuess" in what is on screen.

## Honest limitations

- Job naming is 78% right on 37 real commands, so it is only ever a hint.
- Feelings ("I am dying") can still come out as a task; HIL sees the sentence and decides.
- Sending, buying and posting always keep HIL's confirmation.

## Technical shape

- `mac/braino-mac/laya-serve.py`: answers `action` when asked and the model has `action_question`; GET reports `actions`.
- `mac/braino-mac/main.cjs`: `layaKind` asks for the action at stage 2; `layaRoute` guards (`LAYA_TALK`, `LAYA_QUESTION`, `LAYA_ACTION_SURE` 0.3); `layaHintFor` → `layaGuess` in `hilRouterSurface`; `startLaya` replaces a running server with an older model.
- Model swap: `~/.braino-laya/models/braino-kind` = v6, old one in `braino-kind-prev-live`.
- Tests: `tests/mac-decider-stage2.test.mjs`, `tests/mac-laya.test.mjs`.

## Fixes from the first test run (October 5, 2026)

- A plain Chrome profile switch stays instant at stage 1 (HIL took 100 seconds clicking menus); "work" or "college" finds the one profile with a company or school email.
- The answer window to a question starts at that question, so an answer to a second question no longer runs as a new job.
- "Type Pune" with no box named types into the box already selected.
- "Stop the recording" stops whichever recording is running, lecture or screen.
- Test: `tests/mac-oct4-fixes.test.mjs`.

## Stage 3: Laya decides first (October 5, 2026)

Laya now sorts every sentence before any quick rule runs. When she is sure it is talk or not for Braino (0.72 or more), none of the quick rules (instant controls, battery, profiles, localhost, tabs, forms, web addresses, recipes, skills, shortcuts, timetable) may grab it, and it goes to HIL, which can still answer or act. Commands, and anything she is unsure about, take the quick rules as before. Stop, cancel, the small-talk reply, the memory page and answers to his own question stay ahead of her.

- Checked on 261 real commands: 58 were sure talk, none a plain command.
- "decider stage 3" turns it on (saved on), "decider stage 2" goes back.
- Code: `layaFirst` / `laya3Talk` / `LAYA_TALK_SURE` in `routeHilFirst`, mirrored in `traceWhoTakesIt`. Test: `tests/mac-decider-stage3.test.mjs`.

## Stage 4: one brain (October 5, 2026)

The one-brain diagram from 29 September, behind "decider stage 4" (saved on; "decider stage 3" goes back).

- **Rules are hands.** A quick rule may act only when Laya is sure the sentence is a command. Unsure goes to HIL, which picks the tool. If Laya is not running, the rules work as before.
- **HIL teaches Laya.** Every sentence HIL settles is appended to `~/.braino-laya/training/lessons.jsonl` with Laya's guess, for her next retrain. Private topics are never written.
- **One chat.** Talk HIL settles goes back to the live voice session (the same brain as every other spoken sentence), not the slower second chat. Typed turns keep the slower chat; questions needing today's facts get a web search. The voice side no longer re-checks a handed-back sentence for a job, so nothing runs twice.
- **No shadows.** The after-the-fact HIL router and HIL reason calls are off at stage 4.
- **"Repeat what you said"** now repeats his last answer word for word.
- Replay on 261 real sentences: 61% sure commands (rules act), 22% sure talk (no rule can grab it), 9% unsure (HIL), 6% unclear.
- The old pattern system is untouched; it still runs if HIL is unreachable.
- Test: `tests/mac-decider-stage4.test.mjs`.

### Fixes from the 4-day log review (October 5, 2026)

- A plan may not say "opened it" unless a page actually opened while it ran; otherwise the loop finishes the job (`planClaimsUnopened`).
- A plan that copies the previous job (the anatomy diagram planned as the earlier Sabrina Carpenter video) is thrown away and the loop does it (`planLeakedPreviousJob`).
- "Open the BYOB chat" / "open my chat with Param" opens that WhatsApp chat, by number when known, otherwise through WhatsApp's own search (`openWhatsAppChat`, tool `whatsapp_open_chat`; HIL learns the tool on its next deploy).

## Laya v7, with context (October 5, 2026)

Fine-tuned from v6 on 3,852 sentences, about half with the real context line (his last question, the app, what is playing). On sentences where context matters: 74% vs v6's 67% (multi-step 5/10 vs 2/10). Plain sentences: 79% vs 80-81%; recent commands 89% both; job naming 78% both. Switched on in `.env.local` (`BRAINO_LAYA_CONTEXT=1`, port 47832); remove the line to go back to v6. A retrain with HIL's saved lessons comes next.
- **The voice side's own decider is closed (October 5).** At stage 4 a spoken sentence goes to the quick voice chat only when Laya is sure it is plain talk about nothing of his own; everything else goes to the brain, including inside the 60-second follow-up window ("switch to my other profile" got "Switching, give me a moment" and nothing was done). `routing.one_brain` in the log.
- Fixed the same day: alarms given in seconds rang instantly; questions about his own day skipped the timetable.

### Listening, who is who, train of thought (October 5, 2026)

- **Listening history:** "my favourite song right now", "play the song I played last night". From the plays the activity log already keeps on this Mac, plus Spotify's top tracks and recent plays once Spotify is reconnected with the new `user-top-read` and `user-read-recently-played` permissions (`listeningTaste`, tool `listening_history`, `spotify-player-state` view "taste").
- **Who is who:** "what did my mother text", "text my bhai". Learned when told ("my mom is Shubha", kept in `relations.json`), guessed from how a contact is saved when only one fits, asked when several do. HIL sees the list (`relationsLine`).
- **Train of thought:** a reply whose thinking broke the JSON is now saved by its decision (`salvageDecision` in hil-loop); thinking is capped at 60 words without double quotes.
