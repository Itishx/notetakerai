# Stopping the sound, wherever it is coming from

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** September 18, 2026

## The simple version

"Braino, stop the video" stops the thing that is actually making noise, in about a second and a half.

- **He asks, he does not assume.** Spotify and every open browser tab are asked at the same time: which of you is playing something? Whatever answers is what he acts on.
- **Volume goes to the same place.** "Turn it down" while a YouTube video plays changes that video, not Spotify. With nothing playing, it is the Mac's own volume.
- **"By 50%" means half.** Not fifty points off.
- **He checks, then speaks.** After pausing he looks again: "Paused the YouTube video, Tame Impala, Loser." If it did not stop, he says so instead of claiming it did.
- **"Braino, stop" with nothing running** pauses whatever is playing rather than answering "nothing's running".
- **"What's playing?"** names the track or the video.

## Why it exists

Three failures in one session on 2026-09-17, all the same mistake. A YouTube video was playing and:

| Said | What happened |
|---|---|
| "Reduce the volume also for this" | Spotify went 58 to 57. The video kept playing at full volume. |
| "Braino, please reduce the volume by 50%" | Spotify went 57 to 6: fifty points off, not half. |
| "Braino please stop the video playing on YouTube" | Paused Spotify, read the YouTube page three times, then gave up after 53 seconds with "I lost my train of thought." |

## How to use it

- "Braino, stop the video", "pause the song", "stop whatever is playing", "mute it", "unmute", "next song".
- "Braino, turn it down a bit" (10 points), "turn it down" (20), "turn it down a lot" (30), "reduce the volume by 50%" (half), "set the volume to 40", "full volume".
- "Braino, what's playing?"

## What Braino knows or does

- Spotify answers in about 300ms. Browsers are asked with one AppleScript each, which runs a few lines of JavaScript in the tabs worth asking: the tab in front of each window, plus any whose address looks like it plays something, up to eight. Only browsers that are actually open are asked.
- A tab counts as playing when it holds a `<video>` or `<audio>` that is not paused, not ended, and has data. That is the truth about the page, not a guess from its title.
- Verification is part of every action: after pausing, the same scan runs again, and only what really stopped is claimed.
- Volume is always computed from what the target is actually at, read fresh, so repeated commands cannot compound off a remembered number. Everything is clamped to 0 to 100 and read back afterwards.
- Muting Spotify sets its volume to 0 and remembers the old one, so "unmute" puts it back. Muting a video mutes the element.
- Skipping a track is Spotify's alone; asked inside a video he says so rather than pretending.
- The thinking loop gets the same three tools (`media_control`, `media_volume`, `now_playing`), so it no longer has to reason about Spotify against a YouTube tab.

## Honest limitations

- Chrome, Brave and Chromium only. Safari and Arc do not expose tabs the same way, so a video there is not found.
- It needs Chrome's "Allow JavaScript from Apple Events" (View, Developer). Without it, browser media cannot be seen.
- A page that plays sound through the Web Audio API with no media element is invisible to this.
- Skipping tracks is Spotify only.
- The loop only gains the three tools once `hil-loop` and `hil-router` are deployed.

## Technical shape

- `mac/braino-mac/media-control.cjs` (pure): `parseMediaControlIntent`, `parseVolumeCommand`, `applyVolumeCommand`, `parseNowPlayingIntent`, `speakableMediaTitle`.
- `main.cjs`: `runningBrowsers`, `browserMediaScript` / `runBrowserMediaScript` (fields joined with the unit separator, because `tab` inside a Chrome tell block is Chrome's tab class and produced the literal text "tab", which made every playing video parse as silence), `findBrowserMediaPlaying`, `resolveAudioSources`, `controlPlayingMedia`, `setPlayingMediaVolume`, `describePlayingMedia`, `readSystemVolume` / `writeSystemVolume`, the `braino-mac:media-control` IPC.
- Routed before the thinking loop in `runDelegate`; `nothingToStop` in the renderer uses the IPC.
- HIL catalog entries in `supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts` (used by `hil-loop` and `hil-router`).
- Tests: `tests/mac-media-control.test.mjs`, plus a live end-to-end run against a real YouTube tab (detect, pause, verify, volume, restore).
