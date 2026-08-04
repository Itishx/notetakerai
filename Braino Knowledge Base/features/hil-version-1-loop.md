# HIL Version 1: The Loop

**Type:** Technical
**Platform:** Braino website (/human-intelligence, Loop tab)
**Status:** MVP
**Released:** 2026-08-01

## The simple version

The Human Intelligence page used to show one pass of Braino's thinking: restate, plan, check, verdict. The new Loop tab actually walks the plan. Give Braino a command, even two jobs in one breath, and he splits it, takes one small step at a time against a pretend world, checks every step actually worked, asks you things exactly when a step needs them, and stops dead before anything that cannot be taken back. You can even break his world mid-run, close his tab, jam the site, and watch him notice and recover.

## Why it exists

Two philosophies needed to become one. Itish's version of human intelligence: understand the ask like a person would, look at the screen before asking questions, split compound commands into jobs, fire tiny steps, and recalibrate when the world changes underneath you. Claude's starter (the hil.py loop): hard guardrails, a gate before irreversible actions, verification after every step, endings that always have a name. Braino once really deleted items from a user's cart, which is why the gate is code, not a polite prompt instruction. The Loop tab is where the combined brain gets watched and tuned before it is trusted anywhere real.

## How to use it

Open /human-intelligence, pick the Loop tab, type a command or tap a sample. Watch the feed: his thinking, the step, the result, the check. When an amber gate card appears, the run is paused on you; nothing irreversible fires without your click. While he works, use "Close his tab" or "Jam the site" to break his world and watch the recovery.

## What Braino knows or does

- Splits one command into its separate jobs and finishes each job completely before the next begins
- Fires the same actions the real extension and Mac app fire: navigate, read the page into a numbered element list, click, type, press a key, scroll, wait, web search. No made-up helper verbs
- Handles a referent like "this email" the way a person does. If the thread is already open he replies to it on the spot, one click, no reopening and no re-searching. If only an inbox is showing with several plausible senders he asks which one instead of guessing
- Sets aside what he cannot resolve instead of front-loading questions, then asks at the exact action that needs the answer, like the wording of an email once the draft is open
- Takes exactly one action per turn and re-decides after every result
- Verifies each action in tiers: an error result fails instantly in code, the model judges the rest next turn
- Notices when the world shifted (a closed tab, a jammed site), says so, and recovers before continuing instead of firing into nothing
- Refuses to click send, checkout, or anything else that cannot be undone without a live confirmation, every time, no matter how clearly it was requested
- Never reads the same page twice in a row, because a fresh view arrives every turn without asking
- Ends every run with a named outcome: done, held at the gate, blocked with a reason, out of budget

## Honest limitations

- The world is a stage prop. Fake Gmail, Spotify, YouTube, and a Blinkit-style shop live in browser memory; no real tab opens and no real email exists.
- The loop is not wired into the real extension or the Mac app yet. That port happens only after the thinking holds up here.
- One model turn per step means a long run takes a while; this page optimizes for legibility, not speed.
- The same-failure backstop stops a run after three identical errors even if the model wants to keep trying.

## Technical shape

- `supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts` is the literal source of truth for the loop's thinking, exactly like hil-system-prompt.ts is for the single-shot layer. HIL_LOOP_VERSION lives here.
- `supabase/functions/reasoning/hil-loop/index.ts` is the edge function: public, model hardcoded server-side, Emotional Engine personality appended live per request, one call per turn. The browser holds all run state and sends a fresh snapshot each call; there is no growing transcript, so step nine thinks as clearly as step one.
- Reversibility is enforced server-side in code: gmail_send and shop_checkout always come back reversible false regardless of what the model says.
- `src/lib/hilLoopWorld.ts` is the pretend world (the tools.py idea in the browser) plus the two sabotage functions.
- `src/lib/hilLoopEngine.ts` is the state machine: it executes steps, applies tier-zero verification, enforces the gate and the failure backstop, and names every ending.
- `src/components/HilLoopRun.tsx` renders the run as a feed of cards inside the existing /human-intelligence page.

## Product or design decisions

- The gate pauses on explicit requests too. "Check out" in the command does not skip the confirmation, because clarity of intent and reversibility of consequence are different things.
- Questions arrive mid-run, at the exact step that needs them, never as an upfront interrogation. That is the human rhythm: start moving, ask when you get there.
- The sabotage buttons exist because recalibration is the whole point. A demo that only shows the happy path would prove nothing about the part that matters.
- Nothing on this page can touch the real world, on purpose, so the brain can be tested in public without a single risky side effect.

## What comes next

Grow an eval set against this loop the way the starter's evals.jsonl intended, then port the loop's shape, state snapshots, the gate, tiered verification, named stops, into the real Delegate pipeline once the eval numbers hold.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
