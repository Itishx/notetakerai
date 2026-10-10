import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const arrival = require("../mac/braino-mac/arrival.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const preload = readFileSync(new URL("../mac/braino-mac/preload.cjs", import.meta.url), "utf8");
const view = readFileSync(new URL("../mac/braino-mac/renderer/arrival.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../mac/braino-mac/renderer/arrival.html", import.meta.url), "utf8");

const at = (h, m = 0, day = 27) => new Date(2026, 8, day, h, m).getTime();
const MIN = 60 * 1000;

test("first unlock of the day always arrives", () => {
  assert.equal(arrival.shouldArrive({ now: at(8), lastArrivalAt: 0 }), true);
  assert.equal(arrival.shouldArrive({ now: at(8), lastArrivalAt: at(23, 0, 26) }), true);
});

test("coming back after 30 minutes away arrives; a quick lock does not", () => {
  const last = at(8);
  assert.equal(arrival.shouldArrive({ now: at(8, 20), lockedAt: at(8, 10), lastArrivalAt: last }), false);
  assert.equal(arrival.shouldArrive({ now: at(11), lockedAt: at(10, 55), lastArrivalAt: last }), false);
  assert.equal(arrival.shouldArrive({ now: at(11), lockedAt: at(10, 20), lastArrivalAt: last }), true);
  assert.equal(arrival.shouldArrive({ now: at(11), lockedAt: 0, lastArrivalAt: last }), false);
});

test("switched off means never", () => {
  assert.equal(arrival.shouldArrive({ now: at(8), disabled: true }), false);
});

test("the greeting follows the clock and the name", () => {
  assert.equal(arrival.greetingTitle({ name: "Itish Pande", hour: 8 }), "Morning, Itish.");
  assert.equal(arrival.greetingTitle({ name: "", hour: 19 }), "Evening.");
  assert.equal(arrival.greetingTitle({ name: "Itish", hour: 2 }), "Late one, Itish.");
});

test("the summary is real facts only, people first, four rows at most, no em-dash", () => {
  const rows = arrival.summaryRows({
    whatsapp: [{ name: "Mom", count: 3 }, { name: "Rahul", count: 1 }],
    classesToday: [{ title: "Venture Design", at: "11:00 AM" }],
    dueSoon: [{ title: "P·TAL deck", when: "Tue 9 AM" }, { title: "Reading \u2014 week 4", when: "Wed" }, { title: "Extra", when: "Thu" }],
  });
  assert.deepEqual(rows.map((r) => r.kind), ["whatsapp", "class", "due", "due"]);
  assert.equal(rows[0].text, "Mom and 1 other messaged, 4 new");
  assert.equal(rows[1].text, "Venture Design at 11:00 AM");
  assert.equal(rows[2].text, "P·TAL deck, due Tue 9 AM");
  for (const r of rows) assert.doesNotMatch(r.text, /[\u2013\u2014]/);
  assert.equal(arrival.summaryRows({ whatsapp: [{ name: "Mom", count: 1 }] })[0].text, "Mom sent 1 message");
  assert.deepEqual(arrival.summaryRows({}), []);
  assert.equal(arrival.summaryLead([]), "Nothing waiting. Clean start.");
  assert.equal(arrival.summaryLead(rows), "4 things waiting for you.");
  assert.ok(arrival.summaryRows({ classesToday: [{ title: "x".repeat(200) }] })[0].text.length <= 52);
});

test("Touch ID comes before anything personal", () => {
  const order = ["lookForFace(7000)", "api.arrivalTouchID()", "api.arrivalSummary()", "finish({ face: seen, touch });\n  }"].map((x) => view.indexOf(x));
  assert.ok(order.every((i) => i > 0), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(main, /if \(needsTouch && !arrivalTouchPassed\) return \{ ok: false, rows: \[\] \};/);
  assert.doesNotMatch(view, /arrivalMood/);
});

test("then Braino comes out and says good morning, never twice", () => {
  assert.match(main, /dockWindow\.webContents\.send\("braino-mac:arrival-hello"/);
  assert.match(main, /const bootJustGreeted = arrivalBootAt && Date\.now\(\) - arrivalBootAt < 90000;/);
  const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
  const hello = js.slice(js.indexOf("window.brainoMac.onArrivalHello?."), js.indexOf("window.brainoMac.onWakeDetected?."));
  assert.match(hello, /if \(herMode \|\| realtimeActive \|\| processing \|\| brainoAudible\(\)\)/);
  assert.match(hello, /if \(walkerHome\) await runIomiBootMascotExit\(\)/);
  assert.match(hello, /await speak\(line, \{ captions: false \}\);/);
});

test("the window is its own, clicks pass through, and it cannot hang", () => {
  assert.match(main, /const ARRIVAL_VIEW_PATH = path\.join\(__dirname, "renderer", "arrival\.html"\);/);
  assert.match(main, /win\.setIgnoreMouseEvents\(true, \{ forward: true \}\);/);
  assert.match(main, /setTimeout\(\(\) => \{ if \(!win\.isDestroyed\(\)\) win\.close\(\); \}, 60000\)/);
  assert.match(main, /process\.env\.BRAINO_ARRIVAL === "0"/);
  assert.match(main, /powerMonitor\.on\("unlock-screen"[\s\S]{0,400}arrival\.shouldArrive/);
  assert.match(main, /startArrival\(\);/);
});

test("the face check is presence only, on this Mac, and the frame is deleted", () => {
  assert.match(main, /execFileP\(SCREEN_TEXT_BIN, \[file, "--faces"\]/);
  assert.match(main, /fs\.promises\.unlink\(file\)/);
  assert.match(view, /stream\.getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/);
  const swift = readFileSync(new URL("../mac/braino-mac/native/BrainoScreenText/main.swift", import.meta.url), "utf8");
  assert.match(swift, /VNDetectFaceRectanglesRequest/);
});

test("Touch ID is the real check, and the bridge exposes only arrival calls", () => {
  assert.match(main, /systemPreferences\.promptTouchID\("come in to AffectiveOS"\)/);
  for (const name of ["arrivalInit", "arrivalFace", "arrivalSummary", "arrivalTouchID", "arrivalMouse", "arrivalDone", "onArrivalHello"]) assert.match(preload, new RegExp(`${name}:`));
  assert.match(html, /<script src="arrival\.js"><\/script>/);
  assert.doesNotMatch(html + view, /[–—]/);
});

test("Arrival never plays over the launch greeting", () => {
  assert.match(main, /if \(!arrivalBootDone\) \{ arrivalPending = reason;/);
  assert.match(main, /boot\\\.iomi\\\.\(complete\|auth_failed\)[\s\S]{0,40}arrivalBootFinished\(payload\.event/);
  assert.match(main, /setTimeout\(\(\) => arrivalBootFinished\(\), 25000\)/);
});
