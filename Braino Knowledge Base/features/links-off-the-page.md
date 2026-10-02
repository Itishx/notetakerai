# Links Off the Page

**Type:** Feature · **Platform:** Braino for Mac · **Status:** MVP · **Released:** 2026-09-27

## The simple version
Say "send the first photo to Param" on Pinterest, "share the second video with Ilu" on YouTube, or "send Param the top result" on Google. Braino reads the page itself (the way a browser sees it), finds that result's link in reading order, and WhatsApps it. There's no screenshot and no clicking around, and finding the link takes well under a second.

"This" means the page you're on: "send this link to Ilu" sends the page. On a page of results, "this photo" means the first one.

## Why it exists
"Send the link of the first photo to Param" went to the step-by-step loop, which looked at the screen and stopped at 20 seconds (2026-09-26).

## Honest limitations
- **Known sites:** Pinterest, YouTube, Google, Instagram, Amazon, Reddit and X. Other sites use a general rule: links around images and headings in the main content.
- **"First" means first in reading order**, top to bottom and left to right, as the page is laid out.
- **Chrome needs** View → Developer → Allow JavaScript from Apple Events.
- **Google** showed no results in a test browser, probably a consent page. Your own signed-in Chrome is the real test.

## Technical shape
- `mac/braino-mac/page-links.cjs` has `pageLinksJs(kind)`, `pickLink` and `parseSendPageLink`.
- In `main.cjs`, `readPageLink` is also the planner's `page_link(nth, kind)` hand. There is a direct recipe (page_link, then whatsapp_send) in `routeHilFirst`.
- The planner (`hil-plan`) knows about `page_link` (deployed 2026-09-27).
- **Tested:** 17 links in 67ms on a real YouTube results page, and a Pinterest-style grid in the right order.
- Tests: `tests/mac-page-links.test.mjs`.
