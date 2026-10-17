# Pause Music While You Talk

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP (off by default)
**Released:** October 15, 2026

## The simple version

Call Braino while music or a video is playing and it pauses. Once he has understood what you asked, it comes back on its own, and he gets on with the task in the background.

## Why it exists

Music through the speakers drowns the mic. Before this, Braino only turned Spotify or Apple Music down for the whole session and never touched YouTube in Chrome. Wispr Flow showed the better feel: the room goes quiet the moment you start, and comes back the moment you are done.

## How to use it

Turn it on in the Braino app, under Calling him, then Pause music while I talk. Then say "Hey Braino" or press Control twice.

## What it does

- Pauses Spotify, Apple Music, and any playing video or audio in Chrome tabs.
- Resumes them as soon as your sentence is understood, before the task runs.
- Leaves things paused when the command was about the sound itself: "pause", "play Billie Jean", "next song", "stop the music".
- Resumes only what he paused. A Spotify track that changed, or a Chrome player you paused yourself, is left alone.
- While the mic is open, every sound goes down to about 20%: Spotify, Apple Music and Chrome videos. This runs even with the pause switch off. Music that resumes for a follow-up comes back at that low level, and goes back up when the session closes. Before this, only Spotify was turned down, and only when Braino knew a song was on: under music just 7 of 46 sentences got through.
- A sentence he ignores (no "Braino" in it) brings the music back straight away.
- Lets the music go if you say nothing for 8 seconds, if the session ends, or if the voice session fails to start.

## Honest limitations

- Off by default until it has been tried on real music.
- Safari, Netflix in other apps, and other players are not paused yet. That needs the system play key, which can start something by mistake.
- Chrome needs "Allow JavaScript from Apple Events" on. Without it, Chrome videos keep playing.
- Pausing every Chrome tab takes a moment when many tabs are open.
- If you talk for more than 15 seconds without a finished sentence, the music comes back early.

## Technical shape

- Renderer `mac/braino-mac/renderer/braino-mac.js`: `holdMedia` on wake in `startListening` and when the name is heard inside a live session; `releaseMediaForTurn` at `voice.in`; `releaseMedia` at session end, start failure and the switch turning off. Timers: 8s with no speech, 15s after speech starts. Setting `localStorage.brainoMediaHold === "1"`.
- Main `mac/braino-mac/main.cjs`: IPC `braino-mac:media-hold`. AppleScript pauses Spotify and Music only if playing and records the track name; Chrome gets a JS pass on every tab that pauses playing media and marks it `data-braino-held`. Release replays only marked elements and only the same paused track. A release waits for an in-flight hold.
- Logs: `media_hold.start`, `media.hold`, `media.release` (with why: understood, media_command, no_speech, no_turn, session_end, start_failed, switched_off).
- Tests: `tests/mac-media-hold.test.mjs`.

## Product or design decisions

- Pause, not duck: a ducked song still fires the voice detector.
- Resume at "understood", not at the end of the task, so the music is gone only for as long as you are speaking.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
