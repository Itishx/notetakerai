# The quiet notch, and stealth

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** September 17, 2026

## The simple version

The notch stops covering what you are doing.

- **Status lives in the menu bar.** While he listens, the black band beside the camera housing says *Listening* with a dot on the right: coral means the next thing you say is his, grey means say "Braino" first. While he connects it says *Connecting*. While he works, an amber shimmer and the step he is on. While he talks, a white dot and his name.
- **One line, then gone.** What you said shows as one line under the band for about two seconds. His answer shows as one line for as long as he is saying it, with **✕** to dismiss it and **More** when it is too long for one line.
- **Clicks go through.** Only the band and those buttons take a click. The line lets every click through to the tabs underneath.
- **Stealth.** Everything he draws in the notch fades to 1%. Point at the notch and it comes back.
- **Resting is unchanged.** With nothing going on, the notch looks exactly as it did.

## Why it exists

Every sheet that dropped out of the notch (listening at 250 × 76, "You said" at 480 × 136, answers up to 580 wide) sat over the tab strip of whatever was open, and took its clicks while it was up. The design review at [Quiet Notch](https://claude.ai/artifact/QvZ3syhChTKaD3KeW3KDCB) compared the two; this is the approved version: *Listening* as a word rather than a waveform, working approved as drawn, and no countdown bar under answers.

## How to use it

- Nothing to turn on: it is the default.
- Click the band while he works to see every step, with the Stop button.
- Click **More** on a long answer to read all of it in the full sheet.
- **Stealth:** say *"Braino, go stealth"* (or *"stealth mode"*), or flip **Stealth** in the settings panel (double-click Braino). Say *"Braino, stealth mode off"*, *"come back"* while hidden, or flip it back.

## What Braino knows or does

- The ears are 80pt either side of the camera housing, so the band is about 340pt wide on a 14-inch MacBook. The design mock had 40pt ears, which the housing would have cut in half.
- The full surfaces still run underneath, hidden, and take over whenever you open something on purpose: the thinking steps, the whole answer, the settings panel, dictation, the meeting recorder, music, the timer alarm.
- A long answer's line shows the words he has said so far, newest last, trimmed from the front by measured width.
- Stealth never hides what you opened on purpose, a failed task, or a sign-in error.
- Stealth is remembered across launches.

## Honest limitations

- A long answer can only be read in full through **More**.
- In stealth his voice is unchanged. Turn off *Talk out loud* as well for a fully silent Braino.
- The settings still live in the notch panel. The menu bar icon from the design review is the next step, not this one.
- To go back to the old notch: `localStorage.brainoQuietNotch = "0"` in the renderer.

## Technical shape

- `mac/braino-mac/renderer/braino-mac.js`
  - `renderQuietNotch(ctx)`, called at the end of `updateNotchFace` and from `paintNotchAnswer`; `quietStateFor` picks one of `listen | asleep | starting | work | speak | heard | answer`, or nothing.
  - `nfSetZone` / `nfPushZone`: every notch zone request goes through here. While a quiet state is up, main is asked for the band only (`width + 16`, `notch height + 6`). `nfPointInNotchZone` takes the pointer on the band and on `.nf-q button` only.
  - `nfFitFront`, `nfTextWidth`, `nfQuietLineRoom`, `quietAnswerLine`.
  - Stealth: `stealthOn`, `setStealth`, `applyStealth`, `parseStealthPhrase`, `handleStealthPhrase`; localStorage `brainoStealth`. `nf-reveal` follows main's cursor-zone watcher.
- `renderer/index.html`: `.nf-q` (band, ears, line, More, ✕) and the Stealth row in the panel.
- `renderer/braino-mac.css`: the quiet notch and stealth blocks at the end. The hidden pill and the two surfaces that force `visibility: visible` are overridden under `.nf-quiet-on`.
- `main.cjs`: the expanded zone floor is 30pt, down from 90.
- `/notch-lab` states 10 to 14.
- Tests: `tests/mac-quiet-notch.test.mjs`.

## Product or design decisions

- A layer over the existing surfaces, not a rewrite, a month before launch: turning it off restores the old notch exactly.
- Resting stayed as it is: it was already right.
- The menu bar control centre was recommended and is left for its own step.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
