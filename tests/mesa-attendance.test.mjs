import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const sql = readFileSync(
  new URL("../supabase/migrations/20260918000003_attendance.sql", import.meta.url), "utf8");

/* How much of it they actually turned up to.
 *
 * These numbers decide whether someone is allowed to sit an exam, so the rule
 * that matters most is that they are never guessed.
 */

test("the upsert key is plain columns, again", () => {
  /* The overall row needs a course value, and a nullable one would need
     COALESCE in the key, which makes it an expression index, which ON CONFLICT
     cannot resolve through PostgREST. That is exactly what made schedule_events
     refuse every write. An empty-string sentinel is worth a key that works. */
  assert.match(sql, /course TEXT NOT NULL DEFAULT ''/);
  assert.match(sql, /ADD CONSTRAINT attendance_summary_course_key\s+UNIQUE \(user_id, source, course\)/);
  // Comments explain the trap, so strip them before checking the DDL itself.
  const ddl = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.doesNotMatch(ddl, /COALESCE/, "no expression may appear in the upsert key");
});

test("the percentage is the school's, not ours", () => {
  // A school may round or weight differently, and the number a student is
  // judged on is the one their school shows them.
  assert.match(sql, /percent NUMERIC\(5,2\)/);
  assert.match(sql, /required_percent NUMERIC\(5,2\)/);
  assert.match(main, /percent: macPickNumber\(c, \["percent", "percentage"/);
});

test("it answers in sessions, not just percentages", () => {
  /* "You are on 68%" does not tell anyone whether one more class fixes it. The
     question actually asked is how many in a row from here, or how many are
     still spare. */
  assert.match(main, /needs \$\{n\} more in a row to reach/);
  assert.match(main, /can miss \$\{n\} before dropping under/);

  // The maths, checked against his real figures rather than asserted.
  const need = 75;
  const spare = (attended, total) => {
    let a = attended, t = total, n = 0;
    while (t > 0 && (a / (t + 1)) * 100 >= need && n < 200) { t += 1; n += 1; }
    return n;
  };
  const inARow = (attended, total) => {
    let a = attended, t = total, n = 0;
    while (t > 0 && (a / t) * 100 < need && n < 200) { a += 1; t += 1; n += 1; }
    return n;
  };
  assert.equal(spare(19, 23), 2, "19 of 23 is 82.6%, and 19 of 26 is 73.1%");
  assert.equal(spare(3, 4), 0, "75% exactly has nothing spare");
  assert.equal(inARow(1, 4), 8, "25% needs eight straight to reach 75%");
});

test("an unreadable shape is said, not invented", () => {
  // The endpoint was never seen before it was written against, so the parser
  // looks for numbers rather than a schema. Failing to find them must report
  // that, because a made-up attendance figure is worse than none.
  assert.match(main, /nexus\.attendance\.unreadable/);
  assert.match(main, /could not read its numbers yet/);
  assert.match(main, /function macPickNumber/);
});

test("asking about attendance reaches the brain", () => {
  const r = require("../mac/braino-mac/hil-routing.cjs");
  for (const said of [
    "what is my attendance",
    "am I below 75 in marketing",
    "how many classes can I bunk",
    "can I miss tomorrow",
  ]) {
    assert.equal(r.macWantsTheBrain(said), true, said);
  }
  assert.equal(r.macWantsTheBrain("play billie jean"), false);
});

test("one probe maps the API instead of five screenshots", () => {
  /* The alternative was five rounds of "open DevTools and send me this". These
     are read-only GETs against an API the person is already authenticated to; a
     wrong path costs a 404, and what answers gets logged with its shape so the
     working paths can be pinned and the probing deleted. */
  assert.match(main, /const MAC_NEXUS_PROBES = \[/);
  assert.match(main, /logMac\("nexus\.probe"/);
  assert.match(main, /keys: v\?\.body && typeof v\.body === "object"/);
});
