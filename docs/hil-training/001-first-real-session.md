# Round 001 — the first real session

**Date:** 2026-08-25
**Loop version:** 2.5.0 (`gpt-5.6-luna`)
**Source:** ~20 minutes of live voice commands on the Mac, unscripted.

## What he got right

Worth recording, because the failures below are all harness failures and it
would be easy to read this round as "HIL is bad". It is not.

- **Google Meet, seven steps.** Opened Meet, dismissed a help bubble, dismissed
  an install dialog, found "New meeting", chose "Start an instant meeting", then
  read the room URL off the address bar and handed it over. No hard-coded Meet
  support exists anywhere in Braino.
- **The Anthropic invoice, eight steps.** Recovered from a stale element index
  *twice*, in his own words: "the previous click used a stale index and landed on
  the ICICI alert", then found the right row and downloaded the PDF.
- **Chrome profile switch, three steps.** Opened the profile menu, found
  "Braino", selected it, confirmed the switch.
- **X profile, two jobs.** Opened X, went to the profile, read "2 Followers",
  then answered the follower-growth question separately.

## What was wrong, and which pile it belongs in

Every single one is the harness, not the thinking.

| What you saw | Actually |
| --- | --- |
| Asked to confirm the same delete four times | A clarifying question threw the whole run away and restarted the planning |
| Two jobs, only the first happened | Every navigation reported failure, so job one could never finish |
| Opened and closed the same tab repeatedly | Same cause: he was told he had not arrived |
| Gave up on "click Faro then Done" | The control was past the 120 element cap, and scroll did not exist |
| "Inspected the screen" five times, saw the same thing | `look` returned the accessibility list, not a screenshot |
| Answered "stop recording" while opening an email | Two runs were alive at once, both clicking |
| Stopped mid-work after 100 seconds | A fourteen step budget, hit while still making progress |
| "rename this file" → "I searched the Mac" | Never reached the loop; a pattern match guessed |

## Changed this round

- **No step budget.** Sixty steps and seven minutes are runaway backstops, not a
  budget. What ends a run now is repeating the same action three times in six
  moves, which is the honest signal that the screen is not answering him.
- **He speaks as he works.** One breath per step, first sentence of his own
  thinking, never the same line twice.
- **A question holds the run.** Previously only the irreversible gate did, so any
  clarifying question restarted everything.
- **A new command cancels the old run.**
- **`look` is a real screenshot** handed to a vision model.
- **`scroll` exists**, via the page keys, because the accessibility API has no
  scroll verb.
- **Element cap 120 to 220.**
- **Anything pointing at the screen goes to the loop** — "this file", "on my
  screen", "that invoice you just downloaded" — because resolving a referent
  needs looking.

Previous round (the same day, from the earlier session) fixed the two that made
him look broken at all: `url_contains` was compared against the window title, so
every navigation "failed", and the irreversible gate threw its run away.

## Eval set

Commands from this session. The first four are the ones that failed.

```
open my gmail and star the latest email
close all my tabs                          → then answer "yes go ahead"
rename this file to invoice one
look at my screen and click Faro, then click Done
open gmail and delete the latest email
start an instant google meet and give me the link
switch my chrome profile to braino
open the email from Anthropic PBC and download the invoice
open x.com, go to my profile, tell me my follower count
open the braino cowork folder and tell me what is inside
look at my screen and tell me what is using energy
close all my tabs, open cursor, then play a song on spotify
```

## Round 001b — the interruption

Found immediately after the above, from the second session: giving him a new
task while he was working did nothing at all.

The main process could already drop a running loop when a new command arrived.
The command never got that far. The renderer drops every transcript while a turn
is in flight, and a HIL run holds that flag for minutes, so the interruption
never left the renderer and `hil.loop.superseded` never fired once.

A new instruction is now an interruption once the running turn is more than two
and a half seconds old. Under that it is still ignored, because his own voice
coming back through the microphone must not be able to cut him off mid-sentence.
The abandoned turn's answer is discarded rather than spoken over the new job.

## Round 001c — the six that made him feel slow

From a third session, mostly latency and mis-hearing rather than reasoning.

- **Spotify had no hands.** Every route to it goes through AppleScript, which
  macOS was refusing: the state script failed 21 times and `spotify-playback`,
  the web route that was answering 200 for reads in the same session, was never
  called once. He searched, found the track, and had nothing to play it with.
  He now falls back to the account when the app refuses, and says what is wrong
  once instead of failing silently.
- **He could not remember his own answer.** Asked for "the Italian restaurant
  you just told me about", fourteen seconds after saying Tre-Forni, he tried to
  read it off the screen and then asked which restaurant was meant. The loop got
  the screen and the command and nothing else. It now gets the last few
  exchanges too.
- **Six of twenty four commands went to the pattern matcher.** "find three
  dictation apps and tell me what they charge" was answered about the local
  disk. Two causes: research verbs like "compare" and "look up" did not count as
  a task at all, and the app-launch pattern was swallowing any lowercase
  sentence beginning with "open".
- **Speaking every step cost about six seconds a turn**, serially, while the
  work waited. Every step is now shown in the notch as it happens and only the
  first is spoken.
- **"well" started a whole turn.** Sounds people make while thinking are now
  ignored. "yes", "okay" and "no" deliberately are not, because that is how you
  answer him.
- **The address was re-read on every observation**, twice per step, through an
  AppleScript call that fails slowly when Automation is denied. My own fix from
  round 001 caused that. Cached for a beat now.

## Still open

- **Stale indices.** He reads, thinks, and the page has moved by the time he
  clicks. He recovers, but it costs a turn every time. The fix is probably
  re-reading immediately before a click rather than trusting the turn's map.
- **The cascade still answers things it should not.** "open the Downloads
  folder" came back with an Apple Notes result about a Shah Rukh interview.
  That is a bug inside the file intent, not routing.
- **He cannot leave a Google Meet.** No verb for it; he said so honestly rather
  than pretending, which is the correct failure.
- **AppleScript automation errors** filled the log this session
  (`is Automation allowed in System Settings › Privacy?`). Unrelated to the
  loop, but it makes every log harder to read.
