# Mac Moonwalk Party Trick

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** August 5, 2026

## The simple version

Double-press Option and Braino gives his original Jarvis-and-moonwalk introduction, then turns the bottom Mac Dock into a tiny stage. He opens the real Spotify app, plays “Billie Jean” from 3:31, starts moonwalking immediately along the Dock while Spotify stays visible, pauses the song, and asks, “How was it?”

## Why it exists

Braino should occasionally feel like a character, not a command box. This is a deliberately unnecessary proof that actions, music, voice, and physical animation can land as one choreographed moment.

## How to use it

Open Braino for Mac and double-press Option. Spotify can be closed or already running.

## What Braino knows or does

- Opens and foregrounds the native Spotify app.
- Plays the fixed “Billie Jean” track URI and verifies the playhead at 3:31 before moving.
- Keeps the exact position where he was already standing when Option–Option was pressed.
- Starts moonwalking immediately after verified playback, without teleporting after “Watch.”
- Keeps the original introduction unchanged.
- Pauses Spotify without closing it, waves, and ends with exactly, “How was it?”
- Stops moving after “How was it?” and holds the final position outside.
- Refuses every automatic return to the notch from the moment the trick starts; only double-Command exits the mode and sends him home.

## Honest limitations

This is an MVP party trick for the Mac app. It needs Spotify installed and macOS Automation permission for Braino to control Spotify and System Events. The shortcut temporarily replaces BrainoHERA on double Option while the skit flag is enabled. Spotify playback also needs the local app to be able to play the track.

## Technical shape

The native Option event tap sends `double-option` to `mac/braino-mac/main.cjs`. Main opens Spotify and handles the fixed play, seek, and pause steps through AppleScript. For this trick, the normal blocking 2.5-second seek stability lock is disabled; an asynchronous guard keeps the playhead pinned without holding up the renderer. `mac/braino-mac/renderer/braino-mac.js` captures Braino's current position and begins the moonwalk there as soon as the play-and-seek command returns. The post-skit lock is engaged before any speech or Spotify work, so failure and cleanup paths cannot return him to the notch. After the closing line, the same lock suppresses autonomous movement and holds his final position. The double-Command handler explicitly releases the lock and sends him home in that same action. Manual dragging outside this mode preserves the exact dropped coordinates without snapping, then resumes normal walking from that point after a short beat. The flow does not require Braino's Spotify Web API connection.

## Product or design decisions

Spotify remains foregrounded because it is part of the visual joke. Playback must be locked to 3:31 before animation begins. The ending pauses the music but leaves Spotify open, so Braino does not visibly destroy the stage before asking for the reaction.

## What comes next

After the intended recording or demo window, decide whether the shortcut remains a hidden easter egg or double Option returns fully to BrainoHERA.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
