# HIL First

**Type:** Technical
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-24

## The simple version

Braino used to decide what you meant with a list of fixed word patterns, and HIL only got a command when none of them matched. The patterns grab whatever comes after a trigger word, so "open WhatsApp for me" asked what to say to "for me", and "close your eyes" looked for an app called "your eyes".

Now HIL reads every command first and decides. The old patterns only carry out what HIL picked. Quick controls like pause, next and volume still skip straight through so they stay instant.

## Why it exists

We went through the Mac log (24 July to 18 September 2026, 1,616 commands) and found **171 commands Braino misunderstood**, about 1 in 10. They fall into 14 kinds, and every one comes from a pattern deciding before anything read the whole sentence:

- a question left waiting grabs your next, unrelated command (29)
- leftover words become a Mac file search (26)
- filler words taken literally ("play that song" played "That Song") (20)
- one word fires the wrong feature ("stop the task" paused Spotify) (18)
- and 10 smaller kinds

The worst one: on 6 August an email went to the wrong recipient, because an earlier half-finished email grabbed the command.

HIL's router already ran on every command, but only in the background. Its answer was logged and thrown away.

## How to use it

Nothing to turn on. It's on by default.

- **Turn it off:** set `BRAINO_HIL_FIRST=0` in the Mac env file, or in the shell, and restart. The old order comes back with no rebuild.
- **See it working:** every routed command logs a `hil.first` line in `~/Library/Logs/Braino Mac/braino-mac.log`. It shows what HIL decided (`fire`, `loop`, `ask`, `chat` or `legacy`), the tool, and how long it took.
- **Watch it in the terminal** (`npm run mac:dev`): every command prints one readable line per decision:
  - `▶ HEARD`, then who decided: `⏩ INSTANT`, `✋ STOP`, `💬 ANSWER`, `🧹 RELEASED`, `🧭 HIL-FIRST` (with the verdict, tool and seconds) or `↩ FALLBACK`.
  - Inside a job: `🎵 NOW PLAYING`, `🗺 PLAN`, `⏱ STEP` (total, prep and model time), `📥 FOLDED IN`, `🔁 REPLAN`, `👍 APPROVED` and `👀 RECHECK`.
  - At the end: `✅ DONE` or `❌ FAILED`, with the seconds and the route.
  - `feature.executed` in the log file now carries `route` too.
- **The 171 misreads:** `docs/HIL-MISREADS.md` is the readable list and `tests/fixtures/hil-misreads.json` is the data. `npm run hil:misreads` sends every one to the live router and prints what HIL-first would do now. `-- --only C` runs one category. It needs OpenAI credit.
- **Tests:** `npm run test:hil` includes `tests/mac-hil-first.test.mjs`.

## What Braino knows or does

- Reads every command with the HIL router before any fixed pattern.
- One-move job: runs the tool straight away.
- Multi-step job: hands it to the full HIL loop.
- Needs one fact: asks one question, then finishes the job with your answer.
- Just talking: talks back, with no tool fired.
- Drops a waiting question when your next sentence isn't an answer to it, instead of letting it eat the command.
- Lets bare controls (pause, next, skip, volume, mute) skip the router so they stay instant.
- Falls back to the old patterns whenever the router is down, slow (over 4 seconds) or picks something this Mac can't run yet. You never lose a command.

## Same day, from the first real run

- **Close all tabs stays instant.** It skips HIL and uses the native one-shot, which closes every window and reports a real count.
- **One yes, not two.** If he asks "close all tabs?" himself and you say yes, the gate doesn't ask again.
- **Done means seen.** He reports what actually happened ("Closed 14 tabs"), not what he expected to happen.
- **"Which tabs did you close?" is conversation.** He answers from what just happened instead of asking you what you mean. HIL now sees what's playing and the last exchange.
- **WhatsApp means the Mac app.** The loop can't drive WhatsApp Web while the Mac app is installed. With no Mac app, it uses a signed-in WhatsApp Web tab if one is open. With neither, he says "You don't seem to be logged into WhatsApp anywhere on this device."
- **Short done lines.** After an action he says something like "Playing it now, enjoy" instead of reading the whole title back. Answers, counts and failures keep their own words (`done-line.cjs`).
- **12 more existing Mac functions are connected as tools:** segment loops, recent download, undo, wallpaper from the web, Mac-wide search, screen point, close all tabs and the first six.

- **The room stays out.** Someone presenting near the mic ("So let's start", "we will note the form for collecting those doubts") got taken as commands, through three holes in named mode:
  - A waiting question switched the "was this said to him?" filter off.
  - Room speech that started while he was talking counted as awake.
  - A waiting HIL question took "Open the file." as its answer.

  Now a waiting question accepts only a short answer or something said to him, and while he talks or works only speech aimed at him gets in ("stop" always does). An order-shaped sentence releases a waiting question. Look for `named.ignored_busy` in the log.

- **Tool audit and P0.** All 125 tools were audited in `docs/HIL-TOOL-AUDIT.md`.
  - **22 everyday tools were connected**, taking the Mac from 41 to 63:
    - open folder, find file, repeat, time
    - stop meeting or screen recording
    - maps and directions
    - Spotify seek, queue, volume, shuffle and repeat
    - timers, alarms and the stopwatch
    - click, close
    - WhatsApp reply, send to phone, email, Notion
  - Email always asks first. A click asks only when the button sends, pays, posts or deletes. WhatsApp stays instant.
  - **Fixes:**
    - WhatsApp and Spotify through HIL were getting empty inputs (fixed earlier the same day).
    - A Google Doc with Drive disconnected now opens the Google sign-in instead of failing four times.
    - Attendance and grades now use Braino's own Mesa login and run after each daily sync.

## Honest limitations

- **Costs about 1.4 seconds per command.** That's the router's measured speed today. Jev should bring it to about 0.3 seconds.
- **Not tested on a real Mac yet.** It's tested in code only, and OpenAI credit ran out while we were building it. **With no credit the router fails, so every command quietly uses the old patterns.**
- **About 1 in 3 of the router's picks were tools the Mac didn't have wired** (74 of 229 in the background log). Six of the most common ones are now connected: YouTube, Netflix, random wallpaper, Spotify playlists and albums, meeting recording and screen recording. The rest still fall back to the old patterns, and each one is logged as `legacy` with the tool's name, so the gap is countable.
- **Only the Mac.** The Chrome extension has its own delegate and isn't changed.
- **WhatsApp sends still go through the full loop.** The router never fires anything that can't be undone, so "send this to Ilu" takes the loop's step or two.

## Technical shape

- `mac/braino-mac/hil-first.cjs`: pure decisions, no side effects.
  - `isInstantCommand` is the anchored list of bare controls that skip the router.
  - `planFromVerdict` maps the router verdict to fire, loop, ask, chat or legacy.
  - `hilFirstEnabled` is the switch.
- `mac/braino-mac/main.cjs`:
  - `callHilRouterLive`: 4-second timeout, and it shares the shadow router's breaker.
  - `routeHilFirst`: stop words, voice-locked modes and real answers to a waiting question keep the old path. A question that wasn't answered is released.
  - `runDelegate` calls it before the fast Spotify lane and before `routeMacDelegate`.
  - The background shadow call is skipped when HIL-first has already decided.
- `MAC_HIL_TOOLS` gets two fixes:
  - It now reads the catalog's own argument names, `songQuery` and `recipientRaw`. Before this, HIL's song and HIL's WhatsApp contact both arrived empty.
  - It connects six Mac functions that existed but were never wired.
- `mac/braino-mac/main.cjs` `parseWhatsAppIntent` has a patch: "open WhatsApp for me" is no longer read as a message to "for me".
