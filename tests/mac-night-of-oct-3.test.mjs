// The rest of the 2026-10-03 run, each from its log line: an undo nobody asked
// for, Her mode from "talk to her", "call Param" as unclear three times,
// "open it" opening Spotify and a resume, "synced and ready" when nothing
// synced, "quit Finder and WhatsApp" quitting one, "both the Riyas" giving one,
// and no way to stop him mid-sentence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const lift = (src, start, end = "\n}\n") => { const i = src.indexOf(start); assert.ok(i >= 0, start); return src.slice(i, src.indexOf(end, i) + end.length); };

test("undo only when asked, and only for a recent change unless you name it", () => {
  const undoAllowed = Function(`${main.slice(main.indexOf("const UNDO_FRESH_MS"), main.indexOf("async function undoLastFileAction"))}; return undoAllowed;`)();
  const old = { type: "organize_desktop", description: "organizing Desktop files by type", createdAt: "2026-09-25T21:38:21.112Z" };
  const fresh = { ...old, createdAt: new Date(Date.now() - 60000).toISOString() };
  assert.equal(undoAllowed("add the pdf into the new folder", fresh).ok, false);
  assert.equal(undoAllowed("undo that", fresh).ok, true);
  assert.equal(undoAllowed("put them back", fresh).ok, true);
  assert.equal(undoAllowed("undo that", old).ok, false);
  assert.equal(undoAllowed("undo the Desktop organize", old).ok, true);
  assert.match(main, /file_action_undo: \(\) => undoLastFileAction\(macJobCommand\.text\)/);
});

test("Her mode is a whole command, never a phrase inside a sentence", () => {
  const RE = Function(js.split("\n").find((l) => l.startsWith("const HER_ENTER_RE")).replace("const HER_ENTER_RE =", "return"))();
  const n = (t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  for (const t of ["Her mode", "Braino, her mode", "switch to her mode", "Talk to her.", "Call her"]) assert.ok(RE.test(n(t)), t);
  for (const t of ["What do I do now? You texted the wrong person. I was not supposed to talk to her in my life again and you texted her.", "call her mom now and tell her", "open her chat on WhatsApp"]) assert.ok(!RE.test(n(t)), t);
});

test("Laya's 'say it again' only for a sentence that really stops short", () => {
  const real = Function(`${main.slice(main.indexOf("const LAYA_UNFINISHED_END"), main.indexOf("function layaRoute(sorted, raw"))}; return layaAskIsReal;`)();
  for (const t of ["call Param", "Braino can you please call Param", "Can you please call Param?"]) assert.equal(real(t), false, t);
  for (const t of ["Open the", "Turn on", "Make", "send it to"]) assert.equal(real(t), true, t);
  assert.match(main, /const route = layaRoute\(sorted, raw\);/);
});

test("'it' is what you were just talking about, and never an app called it", () => {
  assert.match(main, /\} else if \(contextRef && lastActed && macLastTalkAt > lastActed\.at\) \{/);
  assert.match(main, /PRONOUN_TARGET\.test\(cleanOpenTarget\(appName\)\.trim\(\)\)/);
  assert.match(lift(main, "async function openApp(appName"), /app\.open\.pronoun_refused/);
});

test("a sync says what it really got", () => {
  assert.match(main, /Nexus did not give me your attendance, so I still do not have it\./);
  assert.match(main, /_list\|_sync\|_sync_all\)\$/);
});

test("a list of apps closes every one, and 'and then' still means a second job", () => {
  const block = main.slice(main.indexOf("const closeList = cleanPrompt(raw)"), main.indexOf("const closeTarget = extractCloseShortcutTarget(raw);"));
  assert.match(block, /return closeOpenTarget\(closeList\[1\]\);/);
  assert.match(block, /then\|after\|open/);
  assert.match(lift(main, "async function closeOpenTarget(target)"), /closeOneOpenTarget\(part\)/);
});

test("a lookup gives everyone with the name, and a misheard surname still finds them", () => {
  const fn = lift(main, "async function lookupContactDetails(query)");
  assert.match(fn, /sameNameContacts\(asked, contactsCache\)/);
  assert.match(fn, /contacts\.lookup_surname_slip/);
});

test("a stop word heard live stops him straight away, his own voice never does", () => {
  assert.match(js, /if \(brainoAudible\(\) && text && BARGE_STOP\.test\(text\.replace\(\/\^\[\\s,\.\\-\]\+\/, ""\)\) && !isSelfEcho\(text\)\) \{/);
  assert.match(js, /interruptVoiceTurn\("barge_in", "hera_live"\);/);
});
