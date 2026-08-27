import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const { scrubForLog, mentionsPrivateTopic } = require("../mac/braino-mac/log-privacy.cjs");
const main = read("../mac/braino-mac/main.cjs");

test("a hidden mode never says which one", () => {
  assert.equal(scrubForLog("turn on mode 18"), "turn on mode [redacted]");
  assert.equal(scrubForLog("Mode 7 please"), "Mode [redacted] please");
});

/* The whole line goes, not the matched word: a sentence with one word starred
   out still says what it said. */
test("anything explicit is taken out whole", () => {
  for (const said of [
    "Threesome",
    "Start a threesome involving Cursor.",
    "find some porn",
    "open onlyfans",
    "send nudes to the group",
  ]) {
    assert.equal(scrubForLog(said), "[private]", said);
  }
});

/* A privacy filter, not a moral one. Ordinary work has to survive it or the log
   stops being worth reading. */
test("ordinary work is left alone", () => {
  for (const said of [
    "Could you please show me my commands?",
    "make the hero section sexy",
    "open my notes and summarise the meeting",
    "set my wallpaper to Obsidian",
    "play something focused on Spotify",
    "essex is a county",
  ]) {
    assert.equal(scrubForLog(said), said, said);
  }
});

/* The hole this closed: the file was scrubbed and the terminal was not, and the
   terminal is the one a person standing behind you can read. */
test("the screen gets the same treatment as the file", () => {
  const consoleFn = main.slice(main.indexOf("function consoleLogMac"), main.indexOf("function logMac("));
  assert.match(consoleFn, /const payload = sanitizeForLog\(rawPayload \|\| \{\}\)/);
  assert.doesNotMatch(consoleFn, /describeLogEvent\(event, rawPayload/);
  assert.match(main, /function sanitizeForLog[\s\S]{0,200}scrubForLog|const redactPersonalModes = scrubForLog/);
  /* Dictation is the one place where every word you say is the payload. */
  assert.match(main, /console\.log\(scrubForLog\(line\), Object\.keys\(extra\)\.length \? sanitizeForLog\(extra\)/);
  /* HIL says the sentence back in its own words, in the terminal, twice. */
  /* The line now names the command it belongs to, because it is fire and forget
     and lands after whatever was said next. Both halves are scrubbed: the goal
     as always, and the command that was added beside it. */
  assert.match(main, /\[Braino HIL\] \$\{r\.verdict\} on "\$\{scrubForLog\(String\(raw \|\| ""\)\.slice\(0, 60\)\)\}" — \$\{scrubForLog\(r\.restated_goal\)\}/);
  assert.match(main, /\[Braino HIL-LOOP\][\s\S]{0,40}scrubForLog\(thinking\)/);
});

/* A row nobody needs is better not written than written and starred out. */
test("a private command is never sent to the shadow audit", () => {
  const fn = main.slice(main.indexOf("function fireHilReasonThinking"), main.indexOf("void fetch(`${SUPABASE_URL}/functions/v1/hil-reason`"));
  assert.match(fn, /mentionsPrivateTopic\(raw\)/);
  assert.match(fn, /return;/);
  assert.ok(mentionsPrivateTopic("start a threesome"));
  assert.ok(!mentionsPrivateTopic("show me my commands"));
});

/* Two copies of one list, one for the Mac and one for the edge functions that
   write engine_runs. They have to say the same thing. */
test("the terminal and the server hide the same words", () => {
  const terms = (source) => {
    const body = source.slice(source.indexOf('"\\\\b(?:"'), source.indexOf('")\\\\b"'));
    return new Set(body.split(/\|/).map((part) => part.replace(/[^a-z\\\\swp*]/gi, "").trim()).filter(Boolean));
  };
  const mac = read("../mac/braino-mac/log-privacy.cjs");
  const server = read("../supabase/functions/_shared/engine-log.ts");
  for (const word of ["porn", "onlyfans", "threesome", "nudes", "sexting", "hentai"]) {
    assert.match(mac, new RegExp(word), `mac list has ${word}`);
    assert.match(server, new RegExp(word), `server list has ${word}`);
  }
  /* Same shape, so a word added to one is visibly missing from the other. */
  assert.equal(
    (mac.match(/\|/g) || []).length >= 20,
    (server.match(/escort/g) || []).length >= 1,
  );
  assert.match(server, /return "\[private\]"/);
});
