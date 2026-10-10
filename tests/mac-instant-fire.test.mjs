import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

/* Instant fire: every one of these went to the step-by-step loop or the wrong
   feature on 2026-09-25, at 10 to 77 seconds each. */
const require = createRequire(import.meta.url);
const { parseInstantFire, appleScriptForKeys } = require("../mac/braino-mac/instant-fire.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const ig = { appName: "Google Chrome", browserUrl: "https://www.instagram.com/", browserTitle: "(8) Instagram" };

test("the log's failures become one keystroke, address or volume change", () => {
  assert.deepEqual(parseInstantFire("Braino, scroll down to the next reel.", ig).keys, "down");
  assert.equal(parseInstantFire("Open the Reels tab", ig).url, "https://www.instagram.com/reels/");
  assert.equal(parseInstantFire("Cool. Now can you please navigate to the Reels tab?", ig).url, "https://www.instagram.com/reels/");
  assert.equal(parseInstantFire("No, go back to Instagram and navigate to the Reels tab. I want to watch Reels.", ig).url, "https://www.instagram.com/reels/");
  assert.equal(parseInstantFire("Braino open an incognito window", ig).kind, "incognito");
  const v = parseInstantFire("Reduce the volume by 20%.", ig);
  assert.equal(v.direction, -1);
  assert.equal(v.value, 20);
  assert.equal(parseInstantFire("I want you to reduce the volume.", ig).direction, -1);
  assert.equal(parseInstantFire("close this tab", ig).keys, "cmd+w");
});

test("anything with a second job, or a real task, is not instant", () => {
  assert.equal(parseInstantFire("open YouTube and play Samay Raina", ig), null);
  assert.equal(parseInstantFire("send this reel to Ilu", ig), null);
  assert.equal(parseInstantFire("find me the best keyboards under 10k", ig), null);
});

test("keys become System Events lines", () => {
  assert.equal(appleScriptForKeys("down"), 'tell application "System Events" to key code 125');
  assert.equal(appleScriptForKeys("cmd+shift+t"), 'tell application "System Events" to keystroke "t" using {command down, shift down}');
});

test("instant fire runs before everything, and mid-job without a model call", () => {
  const route = main.slice(main.indexOf("async function routeHilFirst(raw) {"));
  assert.ok(route.indexOf("parseInstantFire(raw") < route.indexOf("isInstantCommand(raw)"), "before the other checks");
  assert.match(main, /if \(running && parseInstantFire\(String\(payload\?\.text \|\| ""\), activeMacContext \|\| \{\}\)\)/);
  assert.match(main, /\/\\b\(\?:tab\|page\|section\|icon\|screen\|menu/);
});

test("the friends' session: volume, room chat and the loop", () => {
  // "raise funding for 100 crores" is not a volume command.
  assert.match(main, /if \(!soundOnly \|\| source\.split\(\/\\s\+\/\)\.length > 7\) return null;/);
  // A sentence that is not a task never goes to the step-by-step loop.
  assert.match(main, /if \(macCascadeMissed\(result\) && macHilEnabled\(\) && !macLooksLikeTask\(raw\)\) \{/);
  assert.match(main, /if \(!macLooksLikeTask\(raw\)\) return talkOrConverse\(raw\);/);
  // Current facts go to one web search.
  // 2026-09-26: with voice live, chat goes back to the voice session (talk hand-back).
  assert.match(main, /if \(macNeedsWebFacts\(raw\)\) result = await runMacWebSearch\(raw\);\n\s+else if \(options\.canTalk\) result = \{ ok: true, talk: true, say: "", source: "talk" \};\n\s+else result = await runMacConversation\(raw\);/);
  const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  assert.match(renderer, /const wokenForThis = !namedModeOn \|\| \(!namedBusyOnly\(\) && \(namedSpeechAwake \|\| Date\.now\(\) < namedGraceUntil\)\);/);
  assert.match(renderer, /\(words >= 3 && \/\\b\(\?:you\|your\|you're\|yours\|braino\|brainelle\)\\b\/i\.test/);
});
