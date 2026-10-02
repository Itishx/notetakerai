# Hide Him

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-26

## The simple version

Double-click Braino and choose **Hide him**. There are three ways:
- **For an hour:** he's gone, and comes back by himself.
- **Until I call:** he's gone until you bring him back.
- **Stealth:** he stays where he is, almost invisible, and shows himself when your mouse comes near.

While he's hidden he still hears you, does things and answers in the notch. Only the walking figure is gone.

## How to bring him back

- Say **"Braino, come back."**
- Press **⌘⇧B** (it also hides him).
- **Click the notch.**
- Or wait out the hour.

You can also hide him by voice: "Braino, hide yourself", "hide for an hour".

## Why it exists

He was on screen all the time, and there was no way to put him away without quitting him.

## Honest limitations

- ⌘⇧B used to swap Braino and Brainelle. That's in his menu now, under Character.
- While he's hidden, a reply that would appear in his speech bubble shows in the notch instead.

## Technical shape

- Renderer: `setMascotHide`, `applyMascotHide`, `parseMascotHidePhrase` in `mac/braino-mac/renderer/braino-mac.js`. The state is saved in `localStorage` under `brainoMascotHide` (`{mode, until}`). The body classes are `mascot-hidden`, `mascot-stealth` and `mascot-peek`.
- While he's hidden, the mouse hit test skips him, so clicks reach the app underneath. In stealth, the hit test also drives the hover reveal.
- Main: ⌘⇧B still sends `braino-mac:character-toggle`, which now toggles hiding. The HIL hands `hide_braino` and `braino_summon` send `braino-mac:mascot-hide`.
- Tests: `tests/mac-hide-him.test.mjs`.

## Status

MVP.
