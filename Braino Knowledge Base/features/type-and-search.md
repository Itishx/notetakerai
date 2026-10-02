# Type and Search

**Type:** Feature · **Platform:** Braino for Mac · **Status:** MVP · **Released:** 2026-09-26

## The simple version
Say **"type Savannah Watson videos"** and Braino types it into the box you're in and presses Enter. Say **"search for Savannah"** and he searches right where you are: in the page's own search box (YouTube, Google, Amazon…) if it has one, otherwise on that site's results page, otherwise Google, in the same tab. "Search YouTube for lofi" and "search for cats on Pinterest" go straight to that site. In any other app, he pastes it at your cursor and presses Enter, then puts your clipboard back. No thinking involved.

## Why it exists
"Type Savannah Watson videos" went to the planner, which clicked around the screen for 20 seconds. A person saying "type this" means type it and press Enter.

## Honest limitations
- "Look up the weather" and "find me somewhere to eat" are not caught. You want those answers spoken.
- Jobs like "write an email to Param" or "search my email" are not caught either; they go to the planner.
- Pressing Enter in a chat app sends the message, which is what you asked for.
- Chrome needs View → Developer → Allow JavaScript from Apple Events for the in-page search box.

## Technical shape
- `mac/braino-mac/type-search.cjs`: `parseTypeSearch`, `siteOf`, `searchUrl`, `typeJs` (`execCommand("insertText")`, so React and YouTube see it).
- `runTypeSearch` in `main.cjs` runs first in `routeHilFirst`. Enter is pressed through System Events.
- Tested in a real browser: the search box was filled, its input event fired, and Enter submitted.
- Tests: `tests/mac-type-search.test.mjs`.
