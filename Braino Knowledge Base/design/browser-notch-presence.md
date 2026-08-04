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

Open `/instagraphics?design=browser-notch`, let the sequence play, or choose any state manually. Replay runs the full idle-to-done story again.

## What Braino knows or does

- Keeps Braino visible inside the idle notch.
- Turns the same physical object into input and listening UI.
- Shows a calm compact hatch while work continues.
- Expands on click to reveal the task summary and verified steps.
- Lets Braino hop down into the existing browser walk mode.
- Speaks the result, then shrinks back to the idle home.

## Honest limitations

This is a visual prototype, not the production extension UI. Buttons change staged states; they do not yet control a real tab, voice session, browser action, or undo operation. The sample webpage is fictional.

## Technical shape

The prototype lives in `src/pages/InstaGraphics.tsx` and `src/pages/insta-graphics.css`. It uses a timed React state sequence, the shared `BRAINO_WALKER_SVG`, manual phase controls, replay, reduced-motion handling, and the existing 1080×1920 InstaGraphics export frame.

## Product or design decisions

The notch is Braino's home, not a separate status card. Every state is a transformation of the same object. Compact thinking communicates that work is alive; expanded thinking shows useful progress without exposing hidden chain-of-thought. Completion is temporary: after Braino speaks, the notch returns to idle.

## What comes next

Test the visual hierarchy at real extension scale, then connect the strongest states to the extension task state, voice events, verifier, and undo history.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
