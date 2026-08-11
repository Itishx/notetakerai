import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseMeetingIntent, mentionsMeeting } = require("../mac/braino-mac/meeting-intent.cjs");

/* ============================================================================
   "Braino, record this meeting for me."

   The whole promise is that you say one sentence and it happens, so the sentence
   cannot have to be phrased just so. The dangerous neighbour is "record this",
   which means the SCREEN — starting a note-taking session when somebody asked
   for a screen recording is a worse failure than not understanding them.
   ========================================================================= */

const start = (text) => parseMeetingIntent(text)?.action;

test("starting a recording", async (t) => {
  await t.test("the sentence people actually say", () => {
    assert.equal(start("Braino, record this meeting for me"), "start");
  });

  await t.test("every ordinary rephrasing of it", () => {
    for (const phrase of [
      "record this meeting",
      "record the call",
      "can you record this call",
      "start recording this meeting",
      "please record my 1:1",
      "record this standup",
      "take notes on this meeting",
      "take notes for this call",
      "listen in on this meeting and take notes",
      "hey braino, record the interview",
      "record this zoom",
    ]) {
      assert.equal(start(phrase), "start", `should start: "${phrase}"`);
    }
  });

  await t.test("names the kind of meeting back", () => {
    assert.equal(parseMeetingIntent("record this call").source, "call");
    assert.equal(parseMeetingIntent("record this standup").source, "standup");
    assert.equal(parseMeetingIntent("record the interview").source, "interview");
    assert.equal(parseMeetingIntent("record my one-on-one").source, "1:1");
    assert.equal(parseMeetingIntent("record this meeting").source, "meeting");
  });
});

test("stopping a recording", async (t) => {
  await t.test("stop always beats start, whatever the wording", () => {
    for (const phrase of [
      "stop recording",
      "stop recording this meeting",
      "braino stop the recording",
      "that's enough, stop recording",
      "wrap up the notes",
      "end the recording",
    ]) {
      assert.equal(start(phrase), "stop", `should stop: "${phrase}"`);
    }
  });
});

test("not losing the sentence to the screen recorder", async (t) => {
  // Screen recording is parsed BEFORE meetings, because bare "record this" means video.
  // Its guard used to carry its own short list of meeting words, so every word the meeting
  // parser learned quietly became a screen recording instead. Both now read one list, and
  // this is the test that would have caught it: anything the meeting parser starts on must
  // also be something the screen recorder agrees to stand down for.
  await t.test("every phrase that starts a meeting is recognised as a meeting", () => {
    for (const phrase of [
      "record this meeting",
      "record this standup",
      "record this huddle",
      "record my 1:1",
      "record this zoom",
      "record the interview",
      "record this sync",
      "record the session",
    ]) {
      assert.equal(parseMeetingIntent(phrase)?.action, "start", `should start: "${phrase}"`);
      assert.equal(mentionsMeeting(phrase), true, `screen recorder must stand down for: "${phrase}"`);
    }
  });

  await t.test("but a real screen request is left for the screen recorder", () => {
    for (const phrase of ["record this", "record my screen", "record it", "start recording"]) {
      assert.equal(mentionsMeeting(phrase), false, `screen recorder must keep: "${phrase}"`);
    }
  });
});

test("what it must not claim", async (t) => {
  await t.test("bare record is a screen recording, not a meeting", () => {
    // This is the boundary that matters most: silently taking meeting notes when
    // somebody asked to capture their screen is worse than not understanding.
    assert.equal(parseMeetingIntent("record this"), null);
    assert.equal(parseMeetingIntent("record my screen"), null);
    assert.equal(parseMeetingIntent("start recording"), null);
  });

  await t.test("questions about meetings are questions", () => {
    assert.equal(parseMeetingIntent("what meetings do I have today"), null);
    assert.equal(parseMeetingIntent("when is my next call"), null);
    assert.equal(parseMeetingIntent("did you record that meeting"), null);
  });

  await t.test("unrelated talk is left alone", () => {
    assert.equal(parseMeetingIntent("play billie jean"), null);
    assert.equal(parseMeetingIntent(""), null);
    assert.equal(parseMeetingIntent(null), null);
  });
});
