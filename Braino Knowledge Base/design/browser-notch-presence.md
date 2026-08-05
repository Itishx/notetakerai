# Browser Notch Presence

**Type:** Design decision  
**Platform:** Braino Chrome extension  
**Status:** Exploring  
**Released:** July 31, 2026

## The simple version

Braino gets one permanent home at the top of the page. He is visible inside it while idle. The same notch becomes the input, listening surface, compact thinking hatch, expanded task-progress canvas, and speaking surface. Braino only leaves when the user asks him to hop down and walk the browser.

## Why it exists

The extension has a lot of ability, but ability spread across several surfaces is hard to understand. One persistent home makes Braino easier to learn without turning every webpage into a stage.

## How to use it

Open `/instagraphics?design=chrome-system` for the full-browser study. Choose idle, listening, working, short answer, or long answer to compare the states at real browser scale. The earlier notch-only motion study remains at `/instagraphics?design=browser-notch`.

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
- Removes the detached mascot from this focused notch-only experiment.

## Honest limitations

This is a visual prototype, not the production extension UI. Buttons change staged states; they do not yet control a real tab, voice session, browser action, or undo operation. The sample webpage, progress sentences, and answers are fictional. Progress copy must describe observable actions and must not expose private model chain-of-thought. Citations, persistent history, approvals, keyboard behavior, and multi-turn conversations still need implementation decisions.

## Technical shape

The prototypes live in `src/pages/InstaGraphics.tsx` and `src/pages/insta-graphics.css`. The full Chrome system study is an edge-to-edge viewport rather than a 1080×1920 story frame. It uses the shared `BRAINO_WALKER_SVG` and the extension's Apple/system typography, warm ink and coral palette, 24px liquid-glass radius, readable glass treatment, and compact input controls.

## Product or design decisions

The current experiment deliberately tests a notch-only system shared by Chrome and Mac/IOMI. Braino—not an abstract badge—remains the visual anchor in idle, listening, and working states. Asking, voice, live task status, and the immediate answer all happen in one place. Liquid chat, the detached ambient mascot, explanatory page copy, and design legends are removed from this prototype. Braino appears again inside the expanded long-answer surface as a small walker above follow-up input, driven by the production extension gait math. Compact thinking communicates that work is alive without exposing hidden chain-of-thought. Completion is temporary: after the answer, the notch returns to idle.

## What comes next

Test the visual hierarchy at real extension scale, then connect the strongest states to the extension task state, voice events, verifier, and undo history.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
