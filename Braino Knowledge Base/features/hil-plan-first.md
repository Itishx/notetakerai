# HIL Plans First

**Type:** Technical
**Platform:** Human Intelligence Layer (Braino for Mac, the /human-intelligence lab; the server change reaches the Chrome extension too)
**Status:** MVP
**Released:** 2026-09-24

## The simple version

Give Braino a long job and he used to work the whole thing out again on every single step. Nothing was written down, so step six had to rebuild what steps one to five had figured out, just by looking at the screen. That's where he got lost, went in circles, and slowed down.

Now he writes a short plan on the first step, the moves he expects to make, and he is shown that plan on every step after. He still does one thing at a time and the screen still decides. He just always knows where he is.

He also stopped re-fetching everything he knows about you on every step. That happens once per job now.

Two shortcuts, the way a person would do it:

- **The link is already there.** "Send this song to Ilu" used to give him only the song's name, so he went hunting for a link the Mac had already read. Now he's handed what's playing with its link (Spotify or the YouTube tab) on the first step.
- **A yes just does it.** When he asks "that can't be undone, go ahead?" and you say yes, he runs the exact step he showed you. He used to spend another whole step deciding again.

## Why it exists

The Mac log, 24 July to 18 September 2026:

- 376 HIL runs started, and 64 of them went in circles ("the screen is not changing, so I have stopped").
- Every step took about 7 to 8 seconds. Runs of four steps or more averaged about 113 seconds.
- On /engine-log, a normal step was about 20,000 prompt tokens and 5.5 seconds on the server.

The prompt told him "Never plan a sequence." That kept each step honest, but it also meant every turn started from nothing. A person doing a long job keeps a list in their head. He didn't have one.

Separately, every step re-ran the same prep work before the model saw anything: signing the user in, reading their memories, their history, the lessons and the routes for the site. None of that changes between step two and step nine of one job.

## How to use it

Nothing to turn on. Any job that goes to the loop gets a plan.

To see it working:

- In the Mac terminal, the log now prints `hil.loop.plan` when he writes one, and `hil.loop.replan` if he rewrites it.
- Every `hil.loop.turn` line in `~/Library/Logs/Braino Mac/braino-mac.log` now carries `ms`, `prepMs`, `prepCached`, `modelMs` and `plan`, so where each step's time went is written down instead of guessed.
- `npm run test:hil` includes `tests/hil-plan.test.mjs`.

## What Braino knows or does

- Writes 2 to 8 short moves on the first turn, in plain words, never element indices
- Is shown the plan every turn and works out which move he has reached
- Rewrites the rest of the plan with `replan` when the screen proves it wrong
- Rewrites it too when you correct or add something while he's working, so what you add goes onto the plan instead of being passed over (prompt 2.13.1)
- Still takes exactly one action a turn, still checks each one, and still stops at the confirmation gate
- Reads memories, history, lessons and routes once per job, not once per step
- Gets what's playing, with its Spotify or YouTube link, on the first step when the command could be about it
- Runs an approved step straight away after your yes, without another model call

## Honest limitations

- **Not measured on a real Mac yet.** This is source-level: tests and parse checks. The claim that it circles less and finishes faster is a prediction until the log says so.
- **A plan doesn't make a step faster.** It cuts wasted steps. Each step is still one model call. Cutting the number of calls needs the next change (the Jev router, and doing whole moves in one script where the page allows it).
- **The prep saving only lands on a warm server.** If the server instance is cold or restarts mid-job, that step pays the old cost. The log's `prepCached` shows how often it hits.
- **Deployed 2026-09-24, not yet exercised.** The server half is live. OpenAI credit ran out at deploy time, so no live turn has run on it yet. The Mac half (link, yes-shortcut, keeping the plan) needs the Mac app restarted.
- **"Send this song to Ilu" is still about 2 steps plus your yes, roughly 15 to 20 seconds.** Human speed (about 3 seconds) needs the quick router to handle it without the full loop. That's the Jev work.
- **The Chrome extension doesn't keep the plan yet.** It still gets the server-side prep saving, but it doesn't send the plan back between steps.

## Technical shape

- `supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts`: `split.plan` and `replan` in the output contract, and the "map, not a script" rule. `HIL_LOOP_VERSION` 2.13.0, so /engine-log separates before from after.
- `supabase/functions/reasoning/hil-loop/index.ts`:
  - `cleanPlan` parses the plan.
  - `LoopState.plan` holds it, and `renderState` shows it back as YOUR PLAN.
  - `runPrepCache` is keyed on run id + a hash of the caller's token and command + the site. It lives 10 minutes and holds at most 200 runs. Different users can never share an entry.
  - `meta.prepMs`, `meta.prepCached` and `meta.modelMs` are sent back to the client.
- `mac/braino-mac/main.cjs` (`runMacHilLoop`): keeps `state.plan` from `split.plan`, replaces it on `replan`, and logs the timing split.
- `mac/braino-mac/main.cjs`: `spotifyShareLink` turns `spotify:track:ID` into an open.spotify.com link. `macNowPlayingForHil` goes into the first turn's context (capped at 1.5s), and it's also what the `now_playing` and `spotify_now_playing` loop tools return. `pendingHilRun.gatedStep` plus `replayStep` run an approved step without a model call, logged as `hil.loop.replay_approved`.
- `src/lib/hilLoopEngine.ts`: the lab engine keeps and sends the plan the same way.
