import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const ts = require("../mac/braino-mac/tab-switch.cjs");
const routing = require("../mac/braino-mac/hil-routing.cjs");

const tabs = [
  { w: 1, i: 1, url: "https://www.youtube.com/watch?v=a", title: "War 2 - YouTube" },
  { w: 1, i: 2, url: "https://www.netflix.com/watch/1", title: "Netflix" },
  { w: 1, i: 3, url: "https://ie.pinterest.com/pin/1/", title: "Profile card" },
  { w: 1, i: 7, url: "https://www.youtube.com/", title: "YouTube" },
  { w: 1, i: 8, url: "https://meet.google.com/abc-defg-hij", title: "Google Meet", active: true },
];
const pick = (s) => ts.pickTab(tabs, ts.parseTabSwitch(s));

test("the tab you mean, by name, by alias, by order", () => {
  assert.equal(pick("Braino can you please now switch to the pinterest tab").i, 3);
  assert.equal(pick("go to the second youtube tab").i, 7);
  assert.equal(pick("switch to netflix").i, 2);
  assert.equal(pick("switch to the meet").i, 8);
  assert.equal(pick("switch to the last youtube tab").i, 7);
});

test("not a tab: the instant keys and apps are left alone", () => {
  assert.equal(ts.parseTabSwitch("switch to the next tab"), null);
  assert.equal(pick("switch to spotify"), null);
  assert.equal(ts.parseTabSwitch("switch to youtube and play lofi"), null);
  const t = ts.parseTabList("1\t1\ttrue\thttps://a.com\tA\n1\t2\tfalse\thttps://b.com\tB\n");
  assert.equal(t.length, 2);
  assert.equal(t[0].active, true);
});

test("a bare open is instant, and his name at the end changes nothing", () => {
  for (const s of ["Open Chrome.", "Braino, can you please open Spotify"]) assert.equal(routing.macWantsTheBrain(s), false, s);
  assert.equal(routing.macBareWebOpen("open youtube")?.url, "https://youtube.com"); // websites: their own instant path
  assert.equal(routing.macWantsTheBrain("open chrome and search for shoes"), true);
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  const body = main.slice(main.indexOf("function cleanPrompt(input)"), main.indexOf("function isLikelyUrl"));
  const cleanPrompt = new Function(`${body}; return cleanPrompt;`)();
  assert.equal(cleanPrompt("Close all tabs, Braino."), "Close all tabs");
  assert.match(main, /const tabAsk = tabSwitch\.parseTabSwitch\(raw\);/);
});
