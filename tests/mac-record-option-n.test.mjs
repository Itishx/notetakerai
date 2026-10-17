import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const preload = readFileSync(new URL("../mac/braino-mac/preload.cjs", import.meta.url), "utf8");

/* Option+N (2026-10-15): one way in and out of recording, lectures and meetings alike. */
test("Option+N asks when idle and stops when recording", () => {
  assert.match(main, /globalShortcut\.register\("Alt\+N", \(\) => \{ void recordHotkey\(\); \}\)/);
  assert.match(main, /if \(meetingState\) \{\n\s+logMac\("rec\.hotkey", \{ action: "stop"/);
  assert.match(main, /sendToRenderer\("braino-mac:record-ask", \{\}\)/);
});

test("the notch asks lecture or meeting, and the pick goes straight to the recorder", () => {
  assert.match(js, /options: \["Lecture", "Meeting"\]/);
  assert.match(js, /if \(nfChoice\?\.onPick\) \{ nfChoice\.onPick\(name\); return; \}/);
  assert.match(js, /window\.brainoMac\.recordStart\?\.\(\{ kind \}\)/);
  assert.match(js, /closeRecordAsk\("timeout"\)/);
});

test("one recorder: a lecture is transcribed as a lecture", () => {
  assert.match(main, /mode: meetingState\.kind === "lecture" \? "lecture" : "meeting"/);
  assert.match(main, /summary = \(await lectureNotes\(transcript, ""\)\)\.notes/);
});

test("saved on this Mac first, listed for the app", () => {
  assert.match(main, /\/\/ On this Mac first, so a recording is never lost to a failed sync\.\n\s+saveRecordingLocal\(/);
  assert.match(main, /ipcMain\.handle\("braino-mac:recordings-list"/);
  assert.match(preload, /recordingsList: \(\) => ipcRenderer\.invoke\("braino-mac:recordings-list"\)/);
});

test("every step is logged, including what was lost", () => {
  for (const ev of ["rec.start.requested", "rec.started", "rec.heartbeat", "rec.warn.no_audio", "rec.segment.sent", "rec.segment.done", "rec.segment.lost", "rec.stop.requested", "rec.stop.captured", "rec.notes.ok", "rec.saved.local", "rec.saved.cloud", "rec.saved.cloud_failed", "rec.empty"]) {
    assert.ok(main.includes(`"${ev}"`), ev);
  }
});

test("recording wears the thinking design: chip, arrow, transcript, Stop", () => {
  assert.match(js, /\} else if \(meetingRecording && !answerOwnsNotch\) \{/);
  assert.match(js, /const label = `Recording \$\{clock\}`;/);
  assert.match(js, /if \(recOwnsThinking\(\)\) \{\n\s+logRenderer\("rec\.stop\.tap", \{ from: "canvas" \}\);/);
  assert.match(main, /action: "transcript", text: meetingState\.transcriptText\.slice\(-2400\)/);
});

test("the Stop button goes straight to the recorder", () => {
  assert.match(main, /ipcMain\.handle\("braino-mac:record-stop"/);
  assert.doesNotMatch(js, /delegate\?\.\("stop recording"\)/);
});
