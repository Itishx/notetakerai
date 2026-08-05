# Browser Notch Presence

**Type:** Design decision  
**Platform:** Braino Chrome extension  
**Status:** Released in Chrome extension v1.0.0
**Released:** August 5, 2026

## The simple version

Braino gets one permanent home at the top of the page. He is visible inside it while idle. The same notch becomes the input, listening surface, compact thinking hatch, expanded task-progress canvas, and speaking surface. Braino only leaves when the user asks him to hop down and walk the browser.

## Why it exists

The extension has a lot of ability, but ability spread across several surfaces is hard to understand. One persistent home makes Braino easier to learn without turning every webpage into a stage.

## How to use it

Open `/instagraphics?design=chrome-system` for the full-browser study. Choose idle, listening, working, short answer, or long answer to compare the states at real browser scale. The earlier notch-only motion study remains at `/instagraphics?design=browser-notch`.

The current v1.0.0 package can be downloaded directly from the primary button on `/`.

## What Braino knows or does

- Keeps Braino visible inside the idle notch.
- Turns the same physical object into input and listening UI.
- Shows a calm compact hatch while work continues.
- Expands on click to reveal the task summary and verified steps.
- Lets Braino hop down into the existing browser walk mode.
- Speaks the result, then shrinks back to the idle home.
- Tests answers directly inside the notch without opening liquid chat.
- Uses a compact notch tray for short answers and an anchored, scrollable liquid sheet for long answers.
- Gives the long-answer sheet a small walker lane above follow-up input, using Braino's full standing mascot rig.
- Keeps Braino visible inside idle, listening, and compact working states; listening radiates sonar from him.
- Sizes the long-answer sheet to its rendered content instead of reserving empty height.
- Cycles Hatching, Calibrating, and Thinking in the compact working notch.
- Expands on click into full-sentence, user-facing task progress before showing the answer.
- Includes a Readable/Liquid theme comparison for every expanded surface: input, mode menu, expanded thinking, and both answer sizes.
- Removes the detached mascot from this focused notch-only experiment.
- Injects the notch on every ordinary webpage through the extension content script; browser-owned pages such as `chrome://` remain unavailable to extensions.
- Uses Space twice as the primary invocation. The notch stays closed until invoked, then performs the real silent authentication handshake against both trusted Braino web origins.
- Shows the green authenticated state only after the extension validates the same stored session used by chat. If neither origin has a valid session, the notch presents an explicit sign-in state instead of opening a dead input.
- Keeps the approved mode menu inside the notch while the existing page, lecture, meeting, delegate, and team engines continue underneath it.
- Keeps compact work compact until the user clicks to expand the thinking process. Every normal chat reply is handed directly from the hidden response engine into short or long answer state, with a 30-second visible failure guard so the notch cannot remain stuck on Thinking.
- Treats the boot face as one layered animation: coral fills behind Braino, pupils disappear completely while the lids are closed, and the pupils return only with the authenticated eye-opening motion.

## Honest limitations

The InstaGraphics page remains a staged design preview, but the notch shell and its state mapping now ship in extension v1.0.0. Existing browser actions, modes, voice sessions, answers, and authentication are connected to the new surface. The preview’s sample webpage and sample copy remain fictional. Progress copy describes observable activity and does not expose private model chain-of-thought. Some specialist surfaces such as cinema mode and recording retain their existing internal layouts.

## Technical shape

The prototypes live in `src/pages/InstaGraphics.tsx` and `src/pages/insta-graphics.css`. The full Chrome system study is an edge-to-edge viewport rather than a 1080×1920 story frame. It uses the shared `BRAINO_WALKER_SVG` and the extension's Apple/system typography, warm ink and coral palette, compact input controls, and state-specific notch radii. A theme switch compares the light readable handoff with the extension's dark translucent liquid glass. The material changes while state dimensions, information hierarchy, mascot position, and perimeter signal stay fixed.

The extension service worker imports shared helpers with browser-native `.js` paths. Shared Mac code requires the same file directly; `.cjs` is avoided inside `importScripts()` because Chrome can classify it as `application/octet-stream` and refuse to execute it. The production notch is mounted in an isolated Shadow DOM so page CSS cannot distort the approved state geometry. The older bar and card remain hidden as the functional engine for sending, voice, mode routing, and rich-answer preparation.

## Product or design decisions

The notch-only system is now the Chrome extension’s primary mounted surface in v1.0.0 and remains shared in spirit with Mac/IOMI. Braino—not an abstract badge—anchors idle, listening, working, and speaking. Asking, voice, live task status, authentication, and answers happen from the top-centred notch. The readable and liquid themes are two presentations of the same interaction, not separate modes. Coral identity states stay coral; only expanded utility surfaces change material. The older bottom input bar and walker implementation remain in the source for safe rollback, but are no longer mounted in the standard extension experience. Compact thinking communicates that work is alive without exposing hidden chain-of-thought. Completion is temporary: after the answer, the notch returns to idle.

## What comes next

Test the visual hierarchy at real extension scale, then connect the strongest states to the extension task state, voice events, verifier, and undo history.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate

## v1.1.0 — verbatim Chrome system parity and the unstick pass (5 August 2026)

The extension notch is now a verbatim port of the final Chrome system layers, not an approximation. Listening no longer expands: it stays the 230×72 coral body with sonar rings only. Working is 440×88 with the compensated face and the dark-red status pill in the top right. Expanded thinking carries the closed-lid face strip, the coral shimmer, and the flowing spectrum perimeter. Speaking uses the two-tone talking mouth and glancing pupils on the unchanged body. Short answers render as the design's card: BRAINO label, one serif line, a Done pill, and the production walker rig pacing his lane. Long answers are the content-sized glass sheet with the dotted header, serif article, walker lane, and a live Ask-a-follow-up bar. Idle gained the design's pupil gaze cycle and hover growth.

Four freeze sources were removed. The 600ms settle timer and the voice-state sync no longer overwrite answers, the input, the menu, or sign-in — those states hold until the user acts. The hidden legacy card's open flag no longer swallows idle clicks. Every answer state has explicit exits: short click expands to long, Done returns to idle, and the follow-up bar sends. The fixed 30-second failure guard became a watchdog that keeps waiting while a delegate run is genuinely busy. The blue screen-edge glow while talking or listening was removed; only music and explicit Voice Command modes light the rim.
