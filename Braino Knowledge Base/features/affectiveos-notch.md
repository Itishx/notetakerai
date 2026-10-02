# AffectiveOS notch

**Type:** Feature
**Platform:** Braino for Mac (AffectiveOS)
**Status:** MVP. Built in the Braino Mac app, not yet tested on real hardware.
**Released:** 2026-09-28

## The simple version

AffectiveOS is the soul of Braino's tech. Braino is the face. This gives AffectiveOS its own look in the notch, and you choose which one you talk to.

Open the Braino app (double-click Braino, or ⌘⇧D), go to **Appearance**, and under **Notch** pick:

- **Braino.** The notch as it has always been. This is the default.
- **AffectiveOS.** The same notch, the same words, the same behaviour, dressed as AffectiveOS.

It switches the moment you pick. No restart.

## What the AffectiveOS notch looks like

- **His replies carry the Affective wordmark** in white, where the notch used to say "BRAINO".
- **A soft light sits along the notch's lower edge** whenever it is open.
- **That light changes colour** every ten seconds: blue, red, green, violet, amber, cyan, magenta, easing from one into the next.
- **While he thinks** ("You said · THINKING"), a glow circles the whole island.

- **There is no Braino in it.** The character stays away while the AffectiveOS notch is on. Switch back to the Braino notch and he is right back, exactly as you had him (your own "hide him" setting is kept separately).
- **Thinking stays in the island.** No list of thinking steps drops down beneath it; you see "You said · THINKING" and the glow.

Your side is unchanged: "You're saying", "You said", the live words, the thinking shimmer.

## Why it exists

Braino is the character people meet. AffectiveOS is what runs underneath him: the reasoning, the memory, the feeling. It needed a face of its own that still lives in the one place people already watch, the notch, without a second screen to learn.

## How to use it

Braino app › Appearance › Notch › AffectiveOS. Talk to him as usual. Switch back to Braino the same way. (It is also under Settings › Notch in the older library window.)

## Honest limitations

- It is a look, not a new mode. Voice, words, timing and sizes are exactly the Braino notch.
- The design explored an orb (full screen, then inside the notch). Those versions were tried and set aside; there is no orb in this.
- The separate fix that makes the notch hold one steady shape through a conversation is not part of this and not done yet.
- Built into the Mac app, not yet tested on real hardware.

## Technical shape

- Setting: `~/Library/Application Support/Braino Mac/notch-style.json`, `{"style":"braino"|"affective"}`, default `braino`. `readNotchStyle` / `writeNotchStyle` in `mac/braino-mac/main.cjs`, IPC `braino-mac:notch-style` (get, or set with a style), broadcast to the notch window on change.
- Bridge: `notchStyle(style?)` and `onNotchStyle(cb)` in `preload.cjs`.
- Notch: `applyNotchStyle` in `renderer/braino-mac.js` toggles `.nf-aos` on `#notch-face` and sets `--aos-tint` every 150ms from `NF_AOS_SPECTRUM`. Every rule lives under `#notch-face.nf-aos` in the "AffectiveOS notch style" block at the end of `renderer/braino-mac.css`, so the Braino notch is untouched. The thinking glow is the pill's own box-shadow orbiting via `@property --aos-spin` (the pill clips its children, never its shadow).
- No Braino: `applyNotchStyle` also toggles `body.aos-notch`, which hides `#walker`, `#speech-bubble` and `#status-pill` (separate from the `mascot-hidden` hide setting). The thinking-steps sheet (`.nf-thinking-canvas`, `.nf-think-chip`) is hidden and `nfSetThinkingOpen` refuses to open it while `.nf-aos` is on.
- Markup: `.nf-aos-logo` beside the two "Braino" labels in the answer surface, `.nf-aos-band` inside `.nf-pill`. Logo asset `renderer/assets/affective-logo-white.png`, cut from `affective-logo.png`.
- Switch: the "Notch" segment on the Appearance page of the Braino app (`renderer/app.js`, key `notch`), and `#notch-style` in the older library window (`renderer/dashboard.html` / `dashboard.js`).
- Tests: `tests/mac-notch-style.test.mjs` (default stays Braino, live apply, every rule scoped, logo and edge light present, Settings offers both).
- Design mockup (internal): https://claude.ai/artifact/EKdLbNDU6s1KxAxxM8JtbJ

## Status

MVP, 2026-09-28. In the Mac app build, not released.
