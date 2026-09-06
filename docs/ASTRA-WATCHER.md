# Astra as HIL's watcher

Phase 3, the live rescue, is BUILT in the HIL loop. Phases 0 to 2, the counting
and the nightly learning, are still a plan.

## What is built, and where it stops

Built and tested:

- `supabase/functions/_shared/openai-models.ts` — `BRAINO_RESCUE_MODEL`, its own
  effort level and its own token ceiling. Separate constants because Astra has no
  "none" effort and bills its reasoning as completion.
- `supabase/functions/reasoning/hil-loop/index.ts` — `rescue: true` swaps the
  model and appends the handoff brief. The action allowlist and the irreversible
  gate never read the flag, so escalating cannot widen what an action may do.
- `src/lib/hilLoopEngine.ts` — the three triggers, the one-rescue rule, and
  Astra's own budget.
- `src/components/HilLoopRun.tsx` — the gold handoff card in the run.
- `extension/content.js` — the gold notch state and `__sbNotchAstraHandoff`.
- `src/lib/hilLoopEngine.rescue.test.ts` — three guards pinned as behaviour.

Where it stops, and this matters:

- It is wired into the HIL LOOP, which today runs on `/human-intelligence`
  against the pretend world. Real sites are not involved yet.
- The extension delegate and the Mac are separate runners. The gold notch state
  exists there and `__sbNotchAstraHandoff` is ready, but nothing in the extension
  calls it, because the escalation lives in the loop engine the extension does
  not use. That port is its own job.
- Nothing is deployed. `supabase functions deploy hil-loop` is what makes the
  rescue reachable at all.
- The release contract in `docs/MODE_RELEASES.md` is unmet: no skill contract, no
  public page, no journal entry. Those apply to a user-invoked mode and this is
  internal escalation, but the visual state is user-visible, so it is a judgement
  call rather than an exemption.

## The three triggers

- The same action failing twice with the same error. One strike before the
  backstop that ends the run, because escalating at the third would mean Astra
  only ever arrives to a dead run.
- He returns `blocked`. That is him saying he cannot see a way through, which is
  a request for a better thinker rather than a reason to stop.
- The budget down to its last three actions with the job still open. The quiet
  kind of stuck: nothing errored, nothing worked either.

Deliberately NOT a trigger: elapsed time. A real fourteen step job runs for
minutes while working perfectly. A timer fires Astra on the successful runs too,
which is the expensive half of the traffic.

## The caps

- One rescue per run. If Astra also gets stuck, the run ends. Retrying the
  expensive model against the same wall is how one bad task bills like fifty.
- Astra gets 10 actions, replacing what was left rather than adding to it, so a
  rescue costs the same whether it was called early or late.
- The ceiling is enforced by the loop's existing budget check, not by a second
  counter that could disagree with the first.

## The bugs it was built against

- **Skipping the safety gate.** Solved by construction: Astra is a flag on the
  turn, not a second runner, so the confirmation gate, the repeat guard and
  tier-zero verification all still stand between it and the page.
- **Two agents driving at once.** Same reason. Nothing is torn down at handoff;
  the loop carries on from where it stood, one action at a time.
- **Redoing finished work.** The brief names every step sitting at `ok: null`,
  says outright that any of them may have succeeded, and makes looking the first
  move. This is the one that turns an unsent message into two sent ones.
- **Rescue loops.** One rescue per run, hard flag.
- **Nobody watching.** Untouched on purpose: the gate already pauses and asks,
  and Astra is told it is not exempt.


## The idea

HIL stays the brain. `gpt-6-astra` sleeps. When a run goes wrong, Astra wakes
up, works out what HIL should have done, writes that down, and goes back to
sleep. HIL reads the note next time.

The point is that the bill shrinks. Routing hard jobs to an expensive model
means paying forever. Paying an expensive model once per *class of mistake*
means the cost decays as HIL gets better, and if it does not decay, the loop is
broken and the invoice says so.

## What this costs

`gpt-6-astra`, per million tokens:

| | Input | Cached | Output |
|---|---|---|---|
| Standard | $10 | $1 | $50 |
| Long context | $20 | $2 | $75 |
| Batch | $5 | $0.50 | $25 |

1.05M context, 128k max output, cutoff 30 Apr 2026, `reasoning.effort` up to
`max`. No Realtime endpoint, so it can never be the voice model. Compare
`gpt-5.6-luna`, which every Braino surface runs on today
(`supabase/functions/_shared/openai-models.ts`).

Phases 0 to 2 run on Batch, because a post-mortem is not urgent. That halves
the rate before a single optimisation.

## What is already built

Most of the detection exists. It was built for other reasons and never counted.

- `src/lib/hilLoopEngine.ts:474` — `end()` is the one choke point every run
  passes through, and every ending is already named: `all_done`, `declined`,
  `blocked`, `budget`, `error`.
- `src/lib/hilLoopEngine.ts:434` — the same action failing three times already
  ends the run. That is the strongest struggle signal there is, already computed.
- `src/lib/hilLoopEngine.ts:463` — the per-task budget of 14 actions running out.
- `engine_runs` already stores `run_id`, per-turn `ok`, `error`, and a
  hand-written `rating` of good or bad plus a `note`
  (`supabase/migrations/20260805000001_engine_run_rating.sql`).

That last one matters more than it looks. The rating column exists because the
tuning pass is done by hand, one run at a time. Astra's job in this plan is to
do that pass automatically. It is not a new idea being bolted on, it is the
existing workflow with the reader swapped out.

HIL is also still shadow and demo only, running against the pretend world in
`hilLoopWorld`. So none of this touches a real user's machine yet, and Phase 0
cannot break anything.

## Phase 0: count the struggles. No Astra.

Before spending anything, find out how often HIL actually gets stuck and on what.

- Add `outcome` and `struggled` to `engine_runs`, written once per run at `end()`.
  `struggled` is true for `blocked`, `budget` and `error`. `declined` is not a
  struggle, it is the user saying no, and counting it as failure would teach the
  wrong lesson.
- Also record which of the three tripped: repeat failure, budget exhaustion, or
  a thrown error.
- Surface it on `/engine-log` as a table of task type against struggle rate.

Cost: zero. Output: the number that decides whether the rest is worth building.
If HIL is stuck on nine percent of runs the answer is different than if it is
stuck on sixty.

## Phase 1: Astra as post-mortem, offline

Astra never sits in the live path. A nightly job takes the struggled runs from
the day, pulls the full turn trace by `run_id`, and asks Astra one question per
run: what should HIL have done here, and what is the general rule.

Two guards:

- Astra sees the trace, the tool catalog and the ending. Not the live machine.
  It is reading a transcript, not driving anything.
- A lesson is only written if Astra can state the rule in one or two lines. A
  rambling answer is a sign it did not understand the failure either, and that
  is a row for a human to look at, not a lesson to install.

## Phase 2: the lessons reach HIL

A `hil_lessons` table: the task type, the rule, the run it came from, and
whether it is live.

Injected into the HIL prompt by task type, not all at once. Ten lessons is a
paragraph. Four hundred is a second instruction manual that costs more than the
mistakes did.

Nothing goes live automatically. A lesson is proposed, shown on `/engine-log`
next to the run that produced it, and switched on by hand. Astra can be wrong
too, and a wrong lesson installed with authority is worse than no lesson,
because it will be obeyed.

## Phase 3: live rescue, only if the first three earn it

Astra takes over a run in progress, at the moment `end()` would have fired for
`blocked` or `budget`.

Two rules learned before writing any of it:

- Astra finishes the job. It does not hand back mid-task. Once it has acted,
  tabs are open and forms are half filled, and asking HIL to resume from a world
  it did not create is a bug class nobody wants to debug.
- Gate it on `isPremium`, at the same choke point as every other paid surface.
  A rescue is worth somewhere around a dollar. At $15 a month, this cannot be a
  free tier feature.

## How to know it is working

One number: struggle rate per task type, week over week.

- Falling means HIL is learning and the Astra bill is shrinking on its own.
- Flat means the lessons are not landing. Stop and fix the loop before Phase 3,
  because a live rescue on top of a broken learning loop is just an expensive
  model with extra steps.

## Open questions

- Which task types to install lessons for first. Phase 0 answers this.
- Whether the router tier needs its own lessons or shares the loop's. The router
  returns one tool and stops, so it may need a different shape of note.
- Whether a lesson should ever expire. A rule learned against a website that has
  since been redesigned is a lie HIL will believe.
