# Thinking Trail

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-28

## The simple version

When Braino does a job with more than one step, a dark glass card drops down under the notch and shows it live:
- **At the top:** what you asked, and a running timer.
- **One row per step:** a spinner while it runs, then a tick, or a cross if it didn't work ("Opening Google Flights", "Picking 26 October").
- **Under each step:** what he was thinking, in small grey text ("Thought for 2.2s"). The newest thought stays open; older ones fold to one line.
- **At the end:** "Done in 14s · 4 steps", "Stopped after 20s", or "Waiting on you" when he asked a question. Then it fades.

The dot glows blue while he works, gold when the bigger brain (Astra) is thinking, green when done, red when he stopped.

## Why it exists

The notch showed one line at a time, each replacing the last, so you couldn't tell what he'd already done, what went wrong, or why he was slow.

## How to use it

Nothing to turn on. Give him a job with steps, such as "find me five cheapest flights to Mumbai" or "open the best charger on this page".

## Honest limitations

- **Only jobs with steps show it.** Instant things (open YouTube, a timer) are over before a card would help.
- **You can't click it.** It's see-through to clicks so it never gets in your way, which also means you can't expand an old thought.
- **Tested in a test window, not yet in the running app.**

## Technical shape

- `mac/braino-mac/renderer/task-trail.js` draws the card and listens to `braino-mac:task-trail`. Styles are the `#task-trail` block at the end of `braino-mac.css`.
- `mac/braino-mac/main.cjs` `macTrail()` sends `start`, `thought`, `step`, `result` and `end`:
  - `runMacHilLoop` (start, each thought, each step and its result)
  - `runPlanSteps` (plans of two or more steps)
  - the `braino-mac:delegate` handler closes it for every job, whatever happened.
- The one-line notch caption (`sendTaskProgress`) is unchanged.
