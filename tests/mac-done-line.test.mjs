import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

/* "Play Samay Raina Still Alive on YouTube" worked in a second, then he read
   the whole title back. A finished action gets a short warm line instead. */
const require = createRequire(import.meta.url);
const { shortDoneLine } = require("../mac/braino-mac/done-line.cjs");

test("a finished action is not read back", () => {
  for (const say of ["Playing Samay Raina Still Alive | Stand Up Special on YouTube.", "Playing Blinding Lights by The Weeknd on Spotify."]) {
    const line = shortDoneLine({ ok: true, say });
    assert.ok(line && line.length < 40 && !/Samay|Weeknd/.test(line), `${say} -> ${line}`);
    assert.doesNotMatch(line, /[—–]/);
  }
});

test("answers, counts and failures keep their own words", () => {
  assert.equal(shortDoneLine({ ok: true, say: "This is Blinding Lights by The Weeknd." }), null);
  assert.equal(shortDoneLine({ ok: true, say: "Closed 14 tabs. Clean slate." }), null);
  assert.equal(shortDoneLine({ ok: false, say: "Playing failed because Spotify is not open on this Mac." }), null);
});
