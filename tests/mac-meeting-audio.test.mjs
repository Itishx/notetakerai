import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  selectAudibleStreams,
  streamLooksSilent,
  looksInPerson,
  inviteeDisplayName,
  rosterFromInviteNames,
} = require("../mac/braino-mac/meeting-audio.cjs");

/* ============================================================================
   What the Mac decides to send for transcription.

   Two things matter here. Silence must not be uploaded — not to save money, but
   because transcribers hallucinate on it, and "Thanks for watching" has no
   business in anyone's meeting notes. And the two streams must keep their
   identity, because which one a voice arrived on is the only speaker
   attribution in the whole system that cannot be wrong.
   ========================================================================= */

const seconds = (n) => n * 1000;
// A talking minute of Opus is comfortably past 3KB/s; a muted one sits near 0.5KB/s.
const speech = (secs) => ({ durationMs: seconds(secs), bytes: secs * 3500 });
const silence = (secs) => ({ durationMs: seconds(secs), bytes: secs * 400 });

test("silence detection", async (t) => {
  await t.test("a muted stretch is recognised as silence", () => {
    assert.equal(streamLooksSilent(silence(75)), true);
  });

  await t.test("a talking stretch is not", () => {
    assert.equal(streamLooksSilent(speech(75)), false);
  });

  await t.test("a short clip gets the benefit of the doubt", () => {
    // Two seconds of one quiet word can look like silence by the numbers, and
    // throwing it away would lose a real answer to a real question.
    assert.equal(streamLooksSilent({ durationMs: seconds(2), bytes: 700 }), false);
  });

  await t.test("an empty stream is always silence", () => {
    assert.equal(streamLooksSilent({ durationMs: seconds(75), bytes: 0 }), true);
    assert.equal(streamLooksSilent(null), true);
  });
});

test("choosing what to upload", async (t) => {
  await t.test("keeps the side that was talking and drops the side that was not", () => {
    // The ordinary shape of listening on a call: they talk, you are quiet.
    const { audible, skipped } = selectAudibleStreams([
      { role: "system", audioBase64: "aaa", ...speech(75) },
      { role: "mic", audioBase64: "bbb", ...silence(75) },
    ]);
    assert.deepEqual(audible.map((s) => s.role), ["system"]);
    assert.deepEqual(skipped, ["mic"]);
  });

  await t.test("keeps both when both sides spoke", () => {
    const { audible } = selectAudibleStreams([
      { role: "system", audioBase64: "aaa", ...speech(75) },
      { role: "mic", audioBase64: "bbb", ...speech(75) },
    ]);
    assert.deepEqual(audible.map((s) => s.role), ["system", "mic"]);
  });

  await t.test("refuses anything without a role or without audio", () => {
    const { audible } = selectAudibleStreams([
      { role: "speakers", audioBase64: "aaa", ...speech(75) },
      { role: "mic", audioBase64: "", ...speech(75) },
      null,
      "nonsense",
    ]);
    assert.deepEqual(audible, []);
  });

  await t.test("falls back to a sane mime type", () => {
    const { audible } = selectAudibleStreams([
      { role: "mic", audioBase64: "aaa", mimeType: "video/mp4", ...speech(75) },
    ]);
    assert.equal(audible[0].mimeType, "audio/webm");
  });

  await t.test("survives being handed nothing", () => {
    assert.deepEqual(selectAudibleStreams(undefined), { audible: [], skipped: [] });
  });
});

test("the guest list off the calendar invite", async (t) => {
  await t.test("takes the attendee's name when EventKit has one", () => {
    assert.equal(inviteeDisplayName("Priya Nair"), "Priya Nair");
  });

  await t.test("reads a name out of the address when it does not", () => {
    assert.equal(inviteeDisplayName("mailto:marcus.lee@acme.com"), "Marcus Lee");
    assert.equal(inviteeDisplayName("sowmya@acme.com"), "Sowmya");
  });

  await t.test("refuses mailboxes that are not people", () => {
    // A wrong name in the notes is worse than an honest "Speaker 2".
    assert.equal(inviteeDisplayName("mailto:noreply@acme.com"), "");
    assert.equal(inviteeDisplayName("mailto:team@acme.com"), "");
    assert.equal(inviteeDisplayName("mailto:x1@acme.com"), "");
  });

  await t.test("builds a deduped roster from the pipe-joined blob", () => {
    assert.deepEqual(
      rosterFromInviteNames("Priya Nair|mailto:priya.nair@acme.com|mailto:marcus.lee@acme.com|mailto:noreply@acme.com"),
      ["Priya Nair", "Marcus Lee"],
    );
  });

  await t.test("survives an event with nobody on it", () => {
    assert.deepEqual(rosterFromInviteNames(""), []);
    assert.deepEqual(rosterFromInviteNames(undefined), []);
  });
});

test("telling a call from a room", async (t) => {
  await t.test("mic only, all meeting, means everyone is in the room with you", () => {
    assert.equal(looksInPerson(["mic", "mic"]), true);
  });

  await t.test("anything off the speakers means it was a call", () => {
    assert.equal(looksInPerson(["mic", "system"]), false);
  });

  await t.test("hearing nothing at all is not an in-person meeting", () => {
    assert.equal(looksInPerson([]), false);
  });
});
