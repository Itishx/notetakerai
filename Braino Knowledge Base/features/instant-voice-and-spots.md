# Instant Voice, Four Spots

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-26

## The simple version

- **Instant listening.** Press Control twice or say "Hey Braino" and he's listening straight away, the way Wispr Flow is. It used to take about 4 seconds.
- **Four spots.** He no longer wanders the screen. He lives in one of four places: the middle of the left edge, the top, the bottom, or the middle of the right edge. Drag him anywhere and let go: he goes to the nearest spot and stays.
- **He glows when he listens.** The moment you call him he lights up in the same coral as the notch, so you can see the two are one.

- **No waking screen.** When the ready session is there, the notch skips "waking" and "you can speak now". He goes straight to listening and glows.
- **Small talk stays quick.** "How you doing?" and "I'm doing good, how are you?" used to go to the job loop (16 to 19 seconds). Now small talk anywhere in a short sentence stays with the quick chat. When the rules aren't sure, Laya decides, but only if the sentence isn't about your own day.

## Why it exists

Every call opened a new voice session from nothing: 3.3 seconds asking OpenAI for one, 0.7 seconds connecting, 4.3 seconds in all (measured 2026-09-26). By then you'd already started talking.

## How to use it

- Call him: Control twice, or "Hey Braino".
- Move him: drag and drop, or double-click him → **Where he stays** → Left, Top, Bottom or Right. **Walk around** brings the old wandering back.

## Honest limitations

- The very first call after the app opens can still take a few seconds, if it comes before the ready session has finished connecting (about 4 seconds after launch).
- The microphone still takes a moment to switch on when you call him (roughly a tenth of a second).
- A ready session is renewed every 20 minutes and after every use. It sends no audio until you call him.

## Technical shape

- `createVoiceStandby` in `mac/braino-mac/renderer/braino-mac.js` opens a WebRTC session in the background with an audio transceiver and no track. Nothing is sent, and its events are ignored until it's used.
- `startRealtimeVoice` takes it (`takeVoiceStandby`), puts the microphone on it with `replaceTrack`, sends the session update and is live. If there's no ready session, it falls back to the old path.
- After every stop, `stopRealtimeVoice` schedules the next ready session. A dropped one is rebuilt. It never asks you to sign in.
- Switch: `localStorage brainoWarmVoice = "0"` turns it off.
- Spots: `dockSpotPoint`, `nearestDockSpot`, `dockAt`. Stored as the pin walk area with a `spot` field. On the first launch after this change he goes to the right spot once.
- Glow: `#walker.connecting` and `#walker.listening` use the notch's coral glow.
- Logs: `realtime.standby.ready`, `realtime.standby.used` (with `sinceWakeMs`), `realtime.standby.dropped`, `walker.dock`.
- Tests: `tests/mac-instant-voice.test.mjs`.

## Status

MVP. Measured live on 2026-09-26: the ready session was used 147 to 188ms after the call (it used to take 4.3s).
