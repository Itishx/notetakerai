import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const fire = require("../mac/braino-mac/instant-fire.cjs");
const cp = require("../mac/braino-mac/chrome-profiles.cjs");
const ts = require("../mac/braino-mac/tab-switch.cjs");

test("battery is one instant read", () => {
  assert.match(main, /\["-g", "batt"\], \{ timeout: 3000 \}/);
  assert.match(main, /source: "instant_fire:battery"/);
});

test("quitting an app answers as soon as the app quits; tabs close behind", () => {
  assert.match(main, /void closeBrowserTabsMatching\(host\)\.then/);
  assert.match(main, /set u to URL of every tab of w/);
});

test("corrections, questions and key-pressing plans are never learned", () => {
  const a = main.indexOf("const NOT_A_SKILL"); const re = new Function(`${main.slice(a, main.indexOf("\n", a))}; return NOT_A_SKILL;`)();
  for (const s of ["no i asked you to search for samir rana", "you are opening the pinterest image", "what is my battery"]) assert.ok(re.test(s), s);
  assert.ok(!re.test("go to youtube homepage"));
  assert.match(main, /press_keys\|click_element\|click_last_pointed\|screen_point\|wait/);
});

test("maximise, minimise, full screen are instant", () => {
  assert.equal(fire.parseInstantFire("Braino maximize my Chrome tab", {}).kind, "maximize");
  assert.equal(fire.parseInstantFire("minimize this window", {}).keys, "cmd+m");
  assert.equal(fire.parseInstantFire("go full screen", {}).keys, "ctrl+cmd+f");
});

test("a profile or tab heard slightly wrong still matches", () => {
  assert.deepEqual(cp.parseProfileIntent("Braino can you please switch to my other chrome profile which is Messa"), { action: "switch", profile: "Messa" });
  const ps = [{ dir: "Profile 3", name: "forge27.mesaschool.co", email: "itish_pande@forge27.mesaschool.co" }, { dir: "Profile 2", name: "Braino", email: "talk2braino@gmail.com" }];
  assert.equal(cp.findProfile(ps, "Messa").dir, "Profile 3");
  const tabs = [{ w: 1, i: 1, url: "https://youtube.com/watch", title: "Samir Rana - Still Alive - YouTube" }, { w: 1, i: 2, url: "https://pinterest.com", title: "Pinterest" }];
  assert.equal(ts.pickTab(tabs, ts.parseTabSwitch("switch to the Samir Ana tab")).i, 1);
});

test("a lone stop after he replies, and plain orders while he works, get in", () => {
  assert.match(js, /if \(\/\^\(\?:stop\|pause\|play\|resume\|next\|skip/);
  assert.match(js, /const plainOrder = isLikelyMacActionTranscript\(text\)/);
  const r = require("../mac/braino-mac/hil-routing.cjs");
  assert.equal(r.macWantsTheBrain("go on spotify"), false);
});
