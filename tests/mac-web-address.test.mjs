import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

/* 2026-09-27, a real run: "open your website" opened braino.ai (a guess),
   "ites try braino.com" was "say it again", "trybraino.com" was "I only caught
   trybraino.com", "yes" to "want me to try it now?" did nothing, a private
   thought was read out, and he commented on the screen right after "stop". */
const require = createRequire(import.meta.url);
const web = require("../mac/braino-mac/web-address.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const SITE = "https://trybraino.com";

test("every way he was told his own site opens trybraino.com", () => {
  for (const said of [
    "trybraino.com", "Braino ites try braino.com", "try braino dot com", "open trybraino.com",
    "Braino can you please open your website?", "open your own website", "go to Braino's website", "trybrino.com",
  ]) {
    assert.equal(web.spokenWebsite(said)?.url, SITE, said);
  }
});

test("other addresses open as said", () => {
  assert.equal(web.spokenWebsite("open github.com")?.url, "https://github.com");
  assert.equal(web.spokenWebsite("nexus.mesaschool.co")?.url, "https://nexus.mesaschool.co");
  assert.equal(web.spokenWebsite("go to youtube dot com please")?.url, "https://youtube.com");
});

test("an address inside another job is left for the router", () => {
  for (const said of ["send trybraino.com to Mom", "search for trybraino.com reviews", "trybraino.com is really slow today, why", "what the fuck", "open Spotify"]) {
    assert.equal(web.spokenWebsite(said), null, said);
  }
});

test("it runs before the one-word and say-it-again guards", () => {
  const at = main.indexOf("const saidSite = webAddress.spokenWebsite(raw);");
  assert.ok(at > 0);
  assert.ok(at < main.indexOf('macTrace("🤔 ONE WORD"'));
  assert.ok(at < main.indexOf('if (route === "ask") return { ok: true, say: "I didn\'t quite get that. Say it again?"'));
  assert.match(main, /Braino\\'s own website is trybraino\.com/);
});

test("yes to what chat offered is done, not dropped", () => {
  assert.match(main, /macChatOffer = \/\\b\(\?:want me to\|should i\|shall i\|do you want me to\)/);
  const at = main.indexOf("const offer = macChatOffer; macChatOffer = null;");
  assert.ok(at > 0 && at < main.indexOf("const saidSite = webAddress.spokenWebsite(raw);"));
  assert.match(main.slice(at, at + 600), /macHilAnswerApproves\(raw\)[\s\S]*runMacHilLoop\(/);
});

test("private thinking is never read out, and only while acting", () => {
  assert.match(main, /const aboutToAct = turn\.decision\?\.type === "step";/);
  assert.match(main, /if \(!spokenLast && aloud && aboutToAct && !privateNote\) \{/);
});

test("the screen glance waits for real quiet, and longer after stop", () => {
  assert.match(renderer, /if \(now - lastEngagedAt < AMBIENT_CHECK_INTERVAL_MS\) return;/);
  assert.match(renderer, /ambientQuietUntil = Date\.now\(\) \+ AMBIENT_AWAKE_WINDOW_MS;\s*stopListeningNow\("voice_phrase"\);/);
});
