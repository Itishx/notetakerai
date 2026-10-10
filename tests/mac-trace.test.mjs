// /trace must show the REAL mechanism. "Show me" asks traceWhoTakesIt, a copy
// of routeHilFirst's checks that does nothing; if someone adds or moves a check
// in routeHilFirst and not in the copy, the trace would lie. This keeps them
// in the same order (2026-10-03).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const body = (start) => { const i = main.indexOf(start); assert.ok(i >= 0, start); return main.slice(i, main.indexOf("\n}\n", i)); };
const route = body("async function routeHilFirst(raw) {");
const twin = body("async function traceWhoTakesIt(raw) {") + body("async function traceThink(command, send) {");

const ORDER = [
  "MAC_CHITCHAT.test", "chromeProfiles.parseProfileIntent", "typeSearch.parseTypeSearch", "parseInstantFire(",
  "devServers.asksForLocalhost", "tabSwitch.parseTabSwitch", "formFill.parseFormIntent", "webAddress.spokenWebsite",
  "isInstantCommand(", "parseInterruptIntent(", "macClosesAllTabs(", "parseMondayModeIntent(", "pageLinks.parseSendPageLink",
  "recipeFor(", "skillMemory.findSkill", "macShortcutFor(", "macAnswerScheduleFast(", "layaKind(", "callHilRouterLive(",
];

const positions = (src, label) => ORDER.map((needle) => {
  // Stage 3 sorts with Laya before the rules; the order is checked from where the rules start.
  const from = label === "twin" ? Math.max(0, src.indexOf("const checks = [")) : Math.max(0, src.indexOf("if (quickRulesOn) {"));
  const at = needle === "layaKind(" && label === "twin" ? src.indexOf("LAYA_PORT") : (src.indexOf(needle, from) >= 0 ? src.indexOf(needle, from) : src.indexOf(needle));
  assert.ok(at >= 0, `${label} is missing ${needle}`);
  return at;
});

test("Show me checks the same things as the real run, in the same order", () => {
  const real = positions(route, "routeHilFirst");
  const copy = positions(twin, "twin");
  for (let i = 1; i < ORDER.length; i++) {
    assert.ok(real[i] > real[i - 1], `routeHilFirst: ${ORDER[i]} should come after ${ORDER[i - 1]}`);
    assert.ok(copy[i] > copy[i - 1], `trace copy: ${ORDER[i]} should come after ${ORDER[i - 1]} (routeHilFirst changed? update traceWhoTakesIt)`);
  }
});

test("the trace is local-only and cannot crash startup", () => {
  assert.match(main, /traceServer\.listen\(BRAINO_TRACE_PORT, "127\.0\.0\.1"/);
  assert.ok(main.includes("(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?$/.test(origin)"), "only localhost pages may call it");
  assert.ok(main.indexOf("let traceSink = null;") < main.indexOf("function logMac("), "traceSink must exist before the first log line");
  assert.match(main, /if \(traceRunBusy\) \{ res\.writeHead\(409\)/);
});

test("both modes stream live", () => {
  assert.match(main, /res\.writeHead\(200, \{ "Content-Type": "application\/x-ndjson" \}\);\n\s+const send = \(o\) =>/);
  assert.match(main, /send\(\{ kind: "working", name \}\)/);
});

test("the one-decider switch is off by default and moves the risky rules to HIL", () => {
  assert.match(main, /deciderStageCache = Number\.isFinite\(n\) && n >= 0 && n <= 4 \? Math\.floor\(n\) : 0;/);
  // Profile: only rule-writing goes to HIL; a plain switch stays instant (mac-oct4-fixes).
  for (const rule of ["typeSearch.parseTypeSearch(raw)", "tabSwitch.parseTabSwitch(raw)", "parseContextualReference(raw)"]) {
    assert.ok(main.includes(`deciderStage() >= 1 ? null : ${rule}`), `${rule} stands down at stage 1`);
  }
  // the trace copy follows the same switch, so Show me stays real
  assert.equal((twin.match(/deciderStage\(\) >= 1/g) || []).length >= 4, true);
  assert.match(main, /decider\\s\+stage/);
});
