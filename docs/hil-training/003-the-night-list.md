# Round 003 — the night list

Everything wrong in the 2026-08-25 session (20:02 to 21:24, ~40 commands), what
kind of wrong it is, and whether it is fixed. Kept as a live list so it can be
read at a glance rather than reconstructed from a diff.

**Two piles, always.** *Harness* means his hands or his eyes lied to him.
*Brain* means the thinking was wrong. Confusing them wastes a round.

| # | What went wrong | Pile | Status |
| --- | --- | --- | --- |
| 1 | "Your task is over" fired 8 times in an hour, over live runs | Harness | **Done** |
| 2 | Three jobs in one sentence went to a pattern match because one of them said "play" | Harness | **Done** |
| 3 | "Close all the tabs please" → "I could not find an app called all the tabs" | Harness | **Done** |
| 4 | A cascade miss was spoken as an answer while HIL sat in shadow understanding it | Harness | **Done** |
| 5 | A half finished email workflow ate the next three commands, including a stop | Harness | **Done** |
| 6 | "Stop" never stopped: swallowed by the workflow, and the loop ran 20s past it | Harness | **Done** |
| 7 | The gate asked four times for one tweet: navigate, read and type all marked irreversible | Harness | **Done** |
| 8 | "Leave it unsent" still hit the gate and asked to send | Brain + harness | **Done** |
| 9 | Reads burned turns and then tripped the circling guard | Harness | **Done** |
| 10 | One malformed turn per run was fatal; a 37s run died on it | Harness | **Done** |
| 11 | "Delegate error: Error invoking remote method..." read out loud | Harness | **Done** |
| 12 | Thinking chip is left aligned and cut to four characters | UI | **Done** |
| 13 | Opening the thinking takes two clicks: it collapses, then reopens | UI | **Done** |
| 14 | Thinking chip wants centring, a shimmer, and a down arrow that expands it | UI | **Done** |
| 15 | Superseded runs spoke an empty answer and logged 139s of work | Harness | **Done** |
| 16 | Automation permission denied: tab scans, Spotify state and screen reads all fail | Environment | Yours |
| 17 | HIL has no verb for native powers, so multi job commands that include one cannot finish | Architecture | Next round |

| 18 | "Put up the idle screen" in a sentence went to a loop with no verb for it | Harness | **Done** |

## Done tonight

- [x] 1 to 15, and 18, which turned up while checking the routing of 2
- [x] 169 tests passing, five of which had been red long enough to hide the rest
- [x] Verified twice: the working tree, then a clean checkout of the commit
- [x] The notch proved with screenshots rather than by reading CSS
      (`tests/tools/notch-bench.mjs`, now a committed tool)
- [x] Tomorrow's commands, every one of them routed and checked for a real path
      to completion: [004](./004-commands-that-finish.md)

## Not tonight, and why

**17. HIL cannot close a tab.** Its action vocabulary is browser shaped:
navigate, click, type, read, look, search. Closing every tab, playing a song and
launching an app are native Mac powers that live in the cascade. Today a command
containing both kinds ("close all my tabs, open Cursor, then play something")
can only be half done by either side. The fix is to give the loop a verb for
native powers, which means editing the loop prompt and redeploying an edge
function. That is a deploy you have to run, so it is the first thing for the
next round rather than something to do while you sleep.

**16. Automation permission.** `tabs.scan.failed`, `desktop.context.read_failed`
and `spotify.mac_app.state.failed` all through the session. Nothing in the code
can grant it: System Settings, Privacy and Security, Automation, and let Braino
drive System Events, Chrome and Spotify.
