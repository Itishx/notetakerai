import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* His name is not a command, and a remark is not a new job.
 *
 * Both of these were survivable when a turn took under two seconds, because
 * there was barely a window in which to interrupt. Astra takes five to ten, so
 * every run is long enough to be killed by the next thing the room says, and in
 * the 07-09 session every single test died this way: seventeen seconds, thirty
 * four seconds, six seconds, all "stood down, you asked for something else"
 * when nothing else had been asked for.
 *
 * Read out of the source rather than imported, because the renderer is a
 * browser file that expects a window and an Electron bridge to exist.
 */
const src = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const pattern = src.match(/const BARE_WAKE_WORD = (\/.+\/i);/);
assert.ok(pattern, "BARE_WAKE_WORD must exist in the renderer");
const BARE_WAKE_WORD = eval(pattern[1]);
const isBareWakeWord = (t) => BARE_WAKE_WORD.test(String(t || "").trim());

test("his name alone is never a command", () => {
  for (const said of ["Braino", "braino", "Braino.", "hey braino", "Hey Braino!", "okay braino", "Braina"]) {
    assert.equal(isBareWakeWord(said), true, said);
  }
});

test("his name attached to an actual instruction is a command", () => {
  for (const said of [
    "Braino please start an instant Google Meet",
    "braino stop",
    "Braino, look up what GPT-6 Astra costs",
    "hey braino research jarvis and put it in a doc",
  ]) {
    assert.equal(isBareWakeWord(said), false, said);
  }
});

test("a remark while working protects the job instead of replacing it", () => {
  /* The one line that mattered. Returning false here means the caller reads it
     as a new command and supersedes a run that was going fine. */
  const fn = src.slice(src.indexOf("async function routeInterjectionIntoRunningJob"));
  const body = fn.slice(0, fn.indexOf("\nasync function ", 1));
  assert.match(body, /if \(kind === "chat"\)[\s\S]{0,400}return true;/,
    "chat while working must return handled, or the caller kills the running job");
});

/* "Braino" on its own showed "Working on it" with nothing running, and the
   notch sat there until Stop was pressed. */
test("his name alone only counts as an interjection while he is working", () => {
  const fn = src.slice(src.indexOf("async function routeInterjectionIntoRunningJob"));
  const bare = fn.slice(0, fn.indexOf("if (interjectionInFlight) return false;"));
  assert.match(bare, /let busy = voiceTurnInFlight \|\| processing;/);
  assert.match(bare, /busy = Boolean\(\(await window\.brainoMac\.jobRunning\(\)\)\?\.running\);/);
  assert.match(bare, /if \(!busy\) return false;\s*logRenderer\("voice\.wake_word_only", \{ ignored: true \}\);\s*return true;/);
  /* And the caller settles a bare name as listening when nothing is running. */
  const flush = src.slice(src.indexOf("async function flushRealtimeTranscript("));
  const afterRoute = flush.slice(flush.indexOf("const handled = await routeInterjectionIntoRunningJob(transcript);"));
  assert.match(afterRoute.slice(0, 1600), /if \(isBareWakeWord\(transcript\)\) \{\s*logRenderer\("voice\.wake_word_only", \{ ignored: true, hadJob: voiceTurnInFlight \}\);\s*setStatus\(voiceTurnInFlight \? "thinking" : "listening"/);
});
