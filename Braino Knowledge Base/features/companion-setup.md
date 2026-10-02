# Set Him Up

**Type:** Feature
**Platform:** Braino for Mac (Companion)
**Status:** MVP
**Released:** 2026-09-26

## The simple version

Double-click Braino and choose **Set him up**. A split window opens:
- **Left:** he asks what he needs to know, one thing at a time.
- **Right:** his **notebook** fills in as you answer, laid out like a clean document. It also shows what he's picking up from your Mac right now: the app you're in, what's playing, what he just read on screen, who messaged, today's classes and what he remembers.

Braino himself is there too. He walks in, says each step out loud in his real voice, points at what needs you (like the Fix buttons), and shows you your first answer landing in his notebook. The window is Apple's clear Liquid Glass, so your desktop shows through.

Open it again any time to watch that notebook stay in sync.

## Why it exists

Companion had no real start. Braino could do a lot, but he didn't know who you were, what your day looks like, or who matters to you. Without that he can't greet you well, can't know what to bring up, and can't tell which messages matter.

## How to use it

1. Double-click Braino.
2. Choose **Set him up**.
3. Answer the questions: most are taps, a couple are a name or a line of text.
4. Watch the notebook on the right fill in.

## What Braino knows or does

He asks for:
- what to call you
- what your days look like, and where you study or work
- when your day starts and ends
- what to take off your plate first
- who matters most (their WhatsApps show in the notch)
- connecting Mesa and syncing contacts
- the four macOS permissions, each with a Fix button that opens the right setting
- whether to remember your day, and whether he can use it
- talking out loud or staying quiet
- anything he should never do

Also:
- Every answer is saved the moment you give it, as memory he keeps. Answering again replaces the old answer rather than adding a duplicate.
- Your choices take effect straight away: important contacts, memory on or off, and whether Braino can use it.
- The notebook refreshes every 3 seconds.
- Braino walks you through it: a short spoken line per step (his Fish voice, lit word by word in a bubble), he points at the notebook after your name and at Fix on permissions, waves hello and hops at the end.
- **Sound on / off** sits in the footer. Choosing "Stay quiet" on the voice step also silences him for the rest of setup. If his voice can't load, the bubble still shows and setup carries on.

## Honest limitations

- **Tried in a test window, not yet in the full running app.** Glass, walking, pointing and the bubble were checked with screenshots; the voice service was checked on its own.
- **Liquid Glass needs macOS 26.** Older Macs get the old frosted blur.
- **Each new line costs one voice call the first time.** After that it's saved on the Mac and replays free. Lines that include your name are new per person.
- **The morning greeting and the rhythm don't use these answers yet.** They're saved as memory, and the greeting comes with the Shows Up work.
- **"Talk out loud or stay quiet" is saved as a preference but doesn't change his behaviour yet.**
- **The Download for Mac button on /braino is deliberately empty** until there's a build to ship.

## Technical shape

- `mac/braino-mac/renderer/setup.html`, `setup.css` and `setup.js` hold the steps in a plain `STEPS` array and the notebook renderer.
- `mac/braino-mac/main.cjs`:
  - `openSetupWindow` opens a transparent window with Apple's Liquid Glass behind it (`electron-liquid-glass`, an optional Mac-only package), falling back to vibrancy.
  - `braino-mac:setup-say` fetches his Fish voice for a line and caches it in `setup-voice/` next to `setup.json`.
  - `setupSnapshot` builds the live data: the front window, recent captures, today's summaries, today's Mesa classes and deadlines, the top WhatsApp contacts this week, important contacts, recent `braino_memories`, connection status and permissions.
  - `saveSetup` writes `setup.json`, replaces the `source = onboarding` facts, and applies your settings.
  - IPC handlers: `braino-mac:setup-open`, `-snapshot`, `-save`, `-connect`, `-open-pane`.
- `mac/braino-mac/renderer/setup-braino.js` is Braino in the window: a copy of the notch walker's walk, blink, pose and talking-mouth code (copied, not shared, so setup cannot affect the notch), exposed as `window.SetupBraino` (`home`, `walkTo`, `point`, `wave`, `hop`, `say`, `stop`, `setMuted`). Each step's spoken line is its `say` field in `STEPS`.
- Entry point: the "Set him up" button in `#braino-customizer`, shown on double-click.
- Type matches the affective website: Iowan Old Style headlines, SF Pro for everything else, Bodoni only for the "Braino" wordmark.
