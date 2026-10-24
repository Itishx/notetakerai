# Type to Braino (⌘⌥T)

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** October 25, 2026

## The simple version

Press ⌘⌥T anywhere. A single line of glass appears in the middle of your screen. Type, press Enter, and the answer shows up in the notch. He doesn't say it out loud: typed means quiet.

## Why it exists

The Chrome extension had a Space bar that brought Braino up as a glowing search box, and people loved it. On the Mac, typing meant a small field inside the notch. Talking is great, but sometimes you're in a room, in a call, or you just want to type.

## How to use it

- **⌘⌥T** opens it, wherever you are, even in full screen.
- **Enter** sends. **Esc** or clicking away closes it. **↑** brings back the last thing you typed.

## What Braino knows or does

- Everything typed here goes through the same brain as voice: jobs, questions, follow-ups, approvals.
- Answers appear in the notch. He never speaks a typed turn, including his step lines.

## Honest limitations

- One line only, no attachments.
- The glass is macOS's own blur, so its corners are the window's standard rounding.
- If another app already owns ⌘⌥T, he falls back to ⌘⇧Space, then ⌘⌥K.

## Technical shape

- `mac/braino-mac/renderer/type-bar.html` + `type-bar.js`: the bar (vibrancy `hud` window, blue glow on typing and send).
- `main.cjs`: `toggleTypeBar`, IPC `braino-mac:type-bar-send` / `type-bar-close`. Sends to the notch on `braino-mac:run-input`, where it runs as a typed turn (`typed: true`, silent).
- Typed turns on the realtime chat route now pass `silent`.
- Tests: `tests/mac-type-bar.test.mjs`.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
