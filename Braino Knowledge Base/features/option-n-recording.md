# Option+N Recording

**Type:** Feature
**Platform:** Braino for Mac
**Status:** MVP
**Released:** October 15, 2026

## The simple version

Press Option+N. The notch asks "Lecture or meeting?". Tap one and he records. Press Option+N again and he turns it into notes, saved on your Mac and in your account.

## Why it exists

Recording was two separate, messy flows: lectures on Cmd+Shift+E with a full panel, meetings by voice. One shortcut and one recorder is easier to trust.

## Update: one lane (October 16, 2026)

- **Cmd+Shift+E is now a lecture through this recorder.** It skips the "Lecture or meeting?" question and starts a lecture; pressing it again stops, exactly like Option+N. The old separate LIVE panel no longer opens from it.
- **Live captions now come from the one listening lane** (the same one HERA and dictation use), not the separate caption helper. That helper is only the fallback if the lane is busy or not warm yet.
- **Listening switch:** Settings > Appearance > Listening: On this Mac (default, Parakeet, private) or Sarvam (`saaras:v3-realtime` over a WebSocket, strong on Indian English and Hinglish). Needs `SARVAM_API_KEY` in `.env.local`. Applies to everything that listens.
- On device, the helper now updates every 160ms (was 320ms): decode is ~9ms, so the old setting only cost speed.
- Honest limit: Sarvam sends your audio to Sarvam's servers. On this Mac still lags speech by about a second while the model firms up each word.
- Technical: `main.cjs` `parakeetSend` routes start/stop/rotate to the dock renderer when Sarvam is on (`braino-mac:sarvam-command`); the renderer client in `braino-mac.js` answers with helper-shaped events through `braino-mac:sarvam-event` into `handleParakeetLine`. Recorder captions: `startRecordCaptions` / `stopRecordCaptions` / `handleRecordCaptionEvent`. Logs: `sarvam.*`, `rec.captions.lane`, `speech_engine.set`.

## How to use it

1. Option+N, then tap Lecture or Meeting (10 seconds to choose, or Cancel).
2. While it records, the notch looks like the thinking chip: "Recording 02:31" with an arrow. Tap the arrow to open the live transcript and a Stop button; tap again to fold it.
3. Option+N again. The notch says it is writing your notes, then Braino says it is done.

## What it does

- One recorder for both: your mic, plus the Mac's sound (the other side of a call) when allowed.
- Transcribed every 30 seconds (was 75s, which made the notch look dead for over a minute), in lecture or meeting style.
- Stop (in the open sheet, or the old meeting sheet) goes straight to the recorder, not through the voice pipeline.
- Saved on this Mac first (`userData/recordings/<id>.json`), then a PDF, then the cloud.
- Logs every step under `rec.*` with the recording id.

## Honest limitations

- Needs to be signed in to transcribe. Signed out, audio chunks are lost and logged as `rec.segment.lost`; only the on-device captions remain.
- A chunk that fails to transcribe is not retried yet; it is logged with how many seconds were lost.
- The recordings list in the Mac app is being designed separately; the data and IPC are ready.

## Technical shape

- `main.cjs`: `recordHotkey` (Alt+N), IPC `braino-mac:record-start {kind}`, `startMeetingRecording(source, { kind, via })`, `stopMeetingRecording` (lecture notes via `transcribe-and-notes` lecture mode, fallback `lectureNotes`), `saveRecordingLocal`, `listRecordingsLocal`, IPC `recordings-list`, `recording-get`, `recording-state`; event `braino-mac:recordings-changed`.
- Record shape: `{ id, kind: "lecture"|"meeting", title, startedAt, endedAt, durationMs, transcript, notes (markdown), status: "ready"|"notes_missing"|"empty", problems: { audioError, failedSegments, lostS, transcriptSource } }`.
- Renderer `braino-mac.js`: `onRecordAsk` shows the question with tap choices (`nfChoice.onPick`); "without subtitles" steps aside while it is open; `onRecordPhase` shows saving.
- Logs: `rec.hotkey`, `rec.ask.*`, `rec.picked`, `rec.start.requested`, `rec.started`, `rec.heartbeat` (every 30s), `rec.warn.no_audio` (90s with no audio), `rec.segment.sent|done|lost`, `rec.stop.requested|captured`, `rec.notes.ok|missing|failed`, `rec.saved.local|cloud|cloud_failed`, `rec.empty`.
- Tests: `tests/mac-record-option-n.test.mjs`.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
