# Meeting Recorder: Both Sides, With Names

**Type:** Feature
**Platform:** Braino for Mac and the Braino browser extension
**Status:** MVP
**Released:** August 10, 2026

## The simple version

Say "Braino, record this meeting for me" and he does. He hears the people on the call and he hears you, keeps the two apart, and writes notes that say who said what.

Before this, meetings mostly did not work. A long meeting came back as its first seventy-five seconds, and nobody in it had a name.

## Why it exists

Meeting notes are only useful if they are attributable. "Someone said they would send the deck by Friday" is a fact you cannot act on. "Marcus said he would send the deck by Friday" is.

Getting there meant fixing the recording first. There is no clever prompt that recovers audio that was never saved, or a speaker split that was thrown away before the recorder started.

## How to use it

Say it out loud on the Mac:

> Braino, record this meeting for me.

It works for a Zoom call, a Google Meet tab, a Teams call, or four people around a table. Say "stop recording" when you are done. The notes land on your dashboard.

In the browser, open Meeting mode from Braino's menu and press Start. The browser requires a real click before it will hand over tab audio, so a spoken command shows the Start card rather than beginning on its own. The Mac has no such rule, which is why the Mac is the better recorder.

## What it looks like while it runs

The notch says "recording" the moment you ask, then a translucent sheet drops out of it. The physical notch is untouched: a black cap the exact width of the housing keeps it looking normal, and the sheet grows downward out of it.

Inside, while the meeting runs: a pulsing REC clock, who is speaking right now with a level meter that only moves when somebody is actually talking, the last few lines as they are said, and the note bullets building underneath. A Stop button, and an eye toggle for screen shares.

It is deliberately translucent rather than the opaque black the other notch surfaces use. Those own the screen for a few seconds; this one is up for the whole meeting, over the work you are actually doing.

**Screen shares.** The overlay is kept out of the capture pipeline by default, so people you share your screen with never see it while you still do. The eye toggle turns that off if you want it visible, and the choice survives a restart. It stays on by default because live meeting notes leaking into a shared screen is a bug, not a preference.

If Braino has to answer something mid-meeting, the answer takes the island and the meeting surface steps back. The recording never stops, only its surface does.

## What Braino knows or does

- Records the call and your microphone as two separate streams and never mixes them
- Names speakers from the meeting UI: the Meet page in the browser, the Zoom or Teams window through accessibility on the Mac
- Reads the guest list off your calendar invite before anyone speaks, and tells the transcriber how those names are spelled
- Picks up a name when someone introduces themselves
- Writes notes as the meeting runs, so stopping is instant rather than a wait
- Pulls out action items and follow-ups, and offers to put a follow-up on your calendar
- Stays invisible if you share your screen

## Honest limitations

- Speaker names depend on evidence from outside the audio. In a Meet tab or a native Zoom window there is plenty. In a plain audio call with no calendar invite there is none, and speakers stay as "Speaker 1" and "Speaker 2". That is deliberate: a guessed name on an action item is worse than an honest label.
- The browser cannot start recording from a voice command alone. That is a Chrome rule about tab audio, not a Braino decision.
- On the Mac, system audio needs a permission the stock development build does not declare. Braino adds it the first time you record and asks you to restart once. That restart also resets the microphone and screen permissions macOS had already granted, so it happens exactly once and he says so out loud.
- Speaker identity does not yet persist across segments by voice. Each stretch is named from the evidence available during that stretch. Voiceprint continuity is the obvious next step.
- Recording is not on by default and never starts without being asked.

## Technical shape

**One naming engine, two capture heads.**

Capture differs by platform. Everything after capture is shared.

| | Browser | Mac |
|---|---|---|
| Call audio | `getDisplayMedia` on the tab | Electron loopback capture (Core Audio taps) |
| Your audio | `getUserMedia`, echo cancellation on | `getUserMedia`, echo cancellation on |
| Speaker names | Google Meet page | Zoom / Teams / Webex accessibility tree |
| Guest list | Meet participant list | EventKit invite attendees |

**Files**

- `supabase/functions/_shared/meeting-speakers.ts` is the naming engine. Diarizer output onto a meeting clock, then cluster-to-person binding from UI evidence, self-introductions, and the roster.
- `supabase/functions/chat/transcribe-and-notes/index.ts` transcribes each stream, merges them onto one timeline, and writes the notes.
- `extension/content.js` and `extension/offscreen.js` hold the browser's two recorders.
- `mac/braino-mac/main.cjs` holds the loopback handler, the segment uploader, and the accessibility poll.
- `mac/braino-mac/meeting-audio.cjs` and `mac/braino-mac/meeting-intent.cjs` hold the decisions worth testing on their own.
- `mac/braino-mac/native/BrainoAX.swift` gained a `meeting` command that reads participant names and the active speaker out of a native meeting window.

**Four defects this replaced**

1. Only the first segment of any recording was a valid audio file. `MediaRecorder` writes the WebM header into its first blob only, so slicing chunks off a long-running recorder produced headerless fragments the transcription API could not open. Every segment after the first was discarded in silence. Segments are now taken by rotating the recorder, so each one is complete.
2. Your microphone and the call were summed into one mono track before recording. That destroyed the only speaker attribution that cannot be wrong, one line before the recorder started, and then asked a model to guess it back.
3. When Google Meet captions were on, the speaker-attributed audio transcript was thrown away and the lossy caption feed used instead. Audio is now the transcript; captions supply names and a cross-check.
4. Diarizer timestamps restart at zero for every upload, but the UI's speaker timeline runs on the meeting clock. Without an offset the two never overlapped, so the strongest naming evidence went unused for every segment after the first.

**Tests**

`src/test/meeting-speakers.test.ts` covers the naming engine end to end, including the timestamp bug and the cases where it must refuse to guess. `tests/mac-meeting-audio.test.mjs` covers silence detection and the guest list. `tests/mac-meeting-intent.test.mjs` covers the phrasings people actually use, and the boundary against "record this", which means the screen.

## Product or design decisions

**Names are a metadata problem, not an audio problem.** Diarization tells you how many people there are and when they change. It never tells you who. Every product that gets names right takes them from outside the audio, and so does this.

**Refusing to guess is a feature.** With one unknown voice and one silent invitee, that is them. With two of either it is a coin flip, and a coin flip that puts a name on an action item does more harm than an anonymous label.

**Silence is not free.** Transcription models hallucinate on silence, which is how "Thanks for watching" ends up in meeting notes. Near-empty segments are dropped before upload.

**The overlap on segment boundaries is deliberate.** The replacement recorder starts before the outgoing one stops. A duplicated syllable is nothing; a dropped word is gone forever.

## Where it is sold

`/meetings` is the public page, and chapter 04 of the waitlist home page carries the headline claim. How that claim is worded, and the one claim we deliberately refuse to make, is recorded in [meetings-positioning.md](../design/meetings-positioning.md).

## What comes next

- Voiceprint continuity so a speaker keeps their name across the whole meeting rather than being re-derived each segment
- Local buffering so a network drop cannot cost a segment
- Reading the Meet participant list on the Mac too, for a Meet tab recorded from the desktop app

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
