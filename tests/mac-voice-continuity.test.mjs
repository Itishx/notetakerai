import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");

test("the sentence right after his name is never dropped as speaker bleed", () => {
  assert.match(js, /const justWoken = namedModeOn && \(namedSpeechAwake \|\| Date\.now\(\) < namedGraceUntil\);/);
  assert.match(js, /mediaMaybePlaying\(\) && !justWoken/);
});

test("what main answered is written into the voice session, so a follow-up follows", () => {
  assert.match(js, /rememberLocalChat\("assistant", result\.say\);\n\s+noteTurnInRealtime\(text, result\?\.say\);/);
  assert.match(js, /role: "assistant", content: \[\{ type: "output_text"/);
});

test("and what the voice session answered reaches main's history", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(js, /window\.brainoMac\.noteChat\?\.\(\{ user: text, assistant: finalText \}\)/);
  assert.match(main, /ipcMain\.handle\("braino-mac:note-chat"/);
  assert.match(main, /rememberMacChat\("assistant", result\.fullSay \|\| result\.say\);/);
});

test("small talk said any way round stays quick chat", async () => {
  const { createRequire } = await import("node:module");
  const r = createRequire(import.meta.url)("../mac/braino-mac/hil-routing.cjs");
  for (const s of ["How you doing?", "I am doing good, how are you?", "thanks man", "i am tired"]) assert.equal(r.macWantsTheBrain(s), false, s);
  for (const s of ["what are my classes tomorrow", "compare iphone and pixel"]) assert.equal(r.macWantsTheBrain(s), true, s);
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /if \(sorted\?\.kind === "chat" && sorted\.confidence >= 0\.65\)/);
});
