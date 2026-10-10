# Braino's Own Browser

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 5, 2026

## The simple version

Jobs Braino does for you on the web (book tickets, order, find the cheapest flights, compare prices) now run in his own browser, a window inside the Braino app that stays hidden. Your Chrome is never taken over. He reads and presses from inside the page, so each step is fast and lands where it should. Say "show me" to watch, "hide it" to put it away.

## How to use it

Ask as usual: "book me the tickets to Drishyam", "find me the five cheapest flights to Mumbai". The notch shows his progress; anything that pays, books or sends still asks you first. The first time a site needs a login, say "show me" and sign in once; he keeps it.

## Honest limitations

- His browser has its own logins, not your Chrome's.
- Some sites with bot checks (some banks and ticket sites) may refuse it.
- Thinking time is unchanged: each HIL decision still takes about 3 to 5 seconds. What got faster is everything between decisions.
- "Open", "show me" and "play" stay in your Chrome, because you want to see and use those yourself.

## Measured

On a test page: read 0.26s, type 0.2s, real click 0.6s. On duckduckgo.com: opened, read, typed and searched in about 4s.

## Technical shape

- `mac/braino-mac/own-browser.cjs`: a hidden `BrowserWindow` on `persist:braino-browser`, plain Chrome user agent; `read` runs the loop's own `READ_JS`; `click`/`type`/`press`/`scroll` send real input events (`sendInputEvent`, `insertText`), with the DOM press as a fallback; `run` for the loop's `exec_js`; `wantsOwnBrowser` picks the jobs.
- `mac/braino-mac/main.cjs`: `macOwnJob` set at the start of `runMacHilLoop`, kept for answers, cleared by the next job; `macBuildOwnObservation`, the own-hands branch in the action executor, `openChromeUrl`, `frontTabUrl`, `readPageLink`, `look`, `scroll` and `exec_js` follow it; `OWN_BROWSER_NOTE` tells HIL; "show me" / "hide it"; destroyed on quit. `BRAINO_OWN_BROWSER=0` turns it off. Needs decider stage 4.
- Test: `tests/mac-own-browser.test.mjs`.
