# Task Board: Braino keeps track of every job

**Type:** Technical  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** October 24, 2026

## The simple version

Give Braino four jobs at once and he now keeps all four, like a to-do list in his head. If he gets stuck on one, or you say something else in the middle, nothing is forgotten. You can ask him "what are you stuck on?" and he tells you what's done, what's left, and what went wrong.

## Why it exists

On October 24 a four-job handoff (book a meeting, send the link to Manik, prompt Claude in Cursor, report back) fell apart:

- He couldn't find "Manik from Mesa" because the contact is saved as "Manik UG mesa RJ", and the word "from" broke the match.
- When he got the real number, the send looked it up as if it were a *name* and failed three times.
- He asked for numbers that were sitting in Contacts.
- "Send it to Abhishek instead and continue the tasks" started a brand new job, and the meeting and Cursor jobs were lost.
- "Just continue the Cursor task" was read as a "yes" to his question about Abhishek's number.

The cause: one slot for a waiting job, wiped by the next sentence and forgotten after five minutes.

## How to use it

- Hand him several jobs as usual.
- Talk to him mid-job. "X instead", "skip that", "continue the Cursor one" all go back to the job you mean.
- Ask "what are you doing?", "what are you stuck on?", "what's left?" or "kya kar rahe ho".
- "Clear my tasks" drops everything open.

## What Braino knows or does

- Every job the loop runs is on the board: what you asked, its parts, which are done, what he tried, and what it's waiting on.
- A job leaves the board only when it's done or cancelled. It survives new commands, app restarts and up to a day of waiting.
- A new command pauses the running job (one pair of hands). The paused job stays on the board, and when the new job finishes he says, once, "Still open: …".
- Before asking you for anyone's number he checks Contacts himself, by full name and then by first name.
- WhatsApp names are matched the way people say them ("Manik from Mesa", "Abhishek Gaur Mesa"), and a bare phone number is used as a number.
- Opening a WhatsApp chat checks WhatsApp's own chat list first, so he can't say "opened" when nothing opened.

### Second run, same day: he did it all and thought he hadn't

- After he typed the Claude Code prompt and pressed Enter, his self-check looked for the Send button. A send makes that button disappear, so the check failed. With two earlier slips that made "three fails in a row", and he stopped saying "nothing was sent". Now a missing element after a successful type or key press is a reason to look again, not a failure (`hil.loop.assert_soft`).
- The stop line is built from what his hands did ("So far: …"). "Nothing was sent or changed" is only said when nothing was.
- Parts are ticked off from successful moves, not only from HIL's `task_done`, and the report includes "what I actually did".
- "Have you completed all the tasks", "did you finish", "are you done", "kaam ho gaya" are understood. Typed chat also gets his job record, including jobs that just finished.
- Typed in the app's chat: his step lines are shown, not spoken. When he does speak, the chat's Braino moves his mouth for as long as the voice plays (`braino-mac:speaking`).

### Week-plan routine, same day: gaps found before running it

- Mid-job changes ("make it Saturday instead", "skip the music", "also send it to Param") are folded into the running job (`TELLS_RUNNING_JOB` → `macTellRunningJob`), not started as a new job that kills it. Handoff instructions now say that what the person says mid-job wins over the list.
- New loop tools: `file_move` (including "newest PDF in Downloads", into a new folder), `folder_create`, `file_latest`. Same move and undo as the voice command. These need `hil-loop`, `hil-plan` and `hil-router` redeployed so the brain sees them in the catalog.
- "Send it to myself" uses the owner's card in Contacts.
- Handoff time scales with steps (2 min each, at least 6).
- Own-browser jobs move only websites. Mac apps and tools work as normal.

## Honest limitations

- Laya (intent detection) still only sees "A job is running". Laya was trained on that exact line, so changing it would make routing worse until Laya is retrained with the board in its context.
- Telling which job a sentence is about uses words and a few phrases ("instead", "continue", "skip"), not a model. A sentence that names no job and has none of those words is treated as new.
- Jobs that finish in one go (fast plans, single commands) aren't put on the board. Only loop jobs are.
- If a step stops to ask "which Riya?", the job is marked done when the question is asked.
- A plain answer (like a number) given more than five minutes after his question is not matched back to the job unless it mentions the job.

## Technical shape

- `mac/braino-mac/task-board.cjs`: the board. A pure module saved to `~/Library/Application Support/Braino Mac/task-board.json`. Provides `start`, `progress`, `hold`, `finish`, `about`, `report`, `summary`, plus `asksAboutJobs` and `clearsJobs`.
- `main.cjs`:
  - `runMacHilLoop` is now a wrapper around `runMacHilLoopInner` that records how each run ended (waiting, paused, blocked, done).
  - Each turn writes its parts, plan, thinking and step results to the board.
  - `routeToTaskBoard` runs first in `routeHilFirst` and before `handlePendingMacWorkflow`. It answers questions about jobs, and resumes the held run of the job a sentence is about. Before resuming, it bumps `macHilGeneration` so the running job is paused.
  - The loop's context lists the other open jobs, and the Mac chat's page context lists all of them.
  - `numberAskedFor` plus the guard before `d.type === "ask"` runs `lookupContactDetails` once per name per run before he may ask for a number.
- `contact-match.cjs`: `spokenNameQuery` (drops "from", "at", "wala" and similar) and `phoneFromRecipient`.
- WhatsApp: `resolveWhatsAppRecipient` short-circuits on numbers and retries without the last word. `whatsAppChatNameFor` reads `ZWACHATSESSION` names before a search.
- Events: `task.added`, `task.held`, `task.finished`, `task.resumed`, `task.reported`, `hil.loop.contact_checked`.
- Tests: `tests/mac-task-board.test.mjs`.

## Product or design decisions

- No interruptions: the "Still open" line is attached to a reply to something you asked, once per job, never as a ping on its own.
- Laya stays untouched on purpose. Change the decider only with a before/after routing log.
- No extra model calls: the board and the router are local and free.

## What comes next

- Retrain Laya with the board summary in its context.
- Park a blocked part and carry on with the job's other parts automatically.
- Let the board route a bare answer back to its job after five minutes.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
