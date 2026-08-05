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

Open `/instagraphics?design=chrome-system` for the full-browser study. Choose idle, listening, working, or chat to compare the surfaces at real browser scale. The earlier notch-only motion study remains at `/instagraphics?design=browser-notch`.

## What Braino knows or does

- Keeps Braino visible inside the idle notch.
- Turns the same physical object into input and listening UI.
- Shows a calm compact hatch while work continues.
- Expands on click to reveal the task summary and verified steps.
- Lets Braino hop down into the existing browser walk mode.
- Speaks the result, then shrinks back to the idle home.
- Keeps the existing liquid chat for history, sources, approvals, and follow-ups.
- Keeps the standing mascot as Braino's ambient presence and the way into chat.

## Honest limitations

This is a visual prototype, not the production extension UI. Buttons change staged states; they do not yet control a real tab, voice session, browser action, or undo operation. The sample webpage and conversation are fictional. The liquid panel matches production tokens but does not yet reuse the production DOM.

## Technical shape

The prototypes live in `src/pages/InstaGraphics.tsx` and `src/pages/insta-graphics.css`. The full Chrome system study is an edge-to-edge viewport rather than a 1080×1920 story frame. It uses the shared `BRAINO_WALKER_SVG` and the extension's Apple/system typography, warm ink and coral palette, 24px liquid-glass radius, readable glass treatment, and compact input controls.

## Product or design decisions

The three surfaces have different jobs. The mascot carries presence. The notch carries voice and live task status. The liquid chat carries depth, history, sources, approvals, and follow-ups. The notch must not become a second chat window. Compact thinking communicates that work is alive without exposing hidden chain-of-thought. Completion is temporary: after Braino speaks, the notch returns to idle.

## What comes next

Test the visual hierarchy at real extension scale, then connect the strongest states to the extension task state, voice events, verifier, and undo history.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
