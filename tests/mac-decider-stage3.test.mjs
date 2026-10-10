// Decider stage 3 (2026-10-05): Laya sorts first; when she is sure a sentence
// is talk or not for him, no quick rule may grab it and it goes on to HIL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const route = main.slice(main.indexOf("async function routeHilFirst(raw) {"), main.indexOf("const sorted = layaFirst || await layaKind(raw);"));

test("Laya runs first at stage 3, before the quick rules", () => {
  assert.match(route, /const layaFirst = deciderStage\(\) >= 3 && !pendingMacWorkflow && !parseInterruptIntent\(raw\) \? await layaKind\(raw\) : null;/);
  assert.ok(route.indexOf("const layaFirst") < route.indexOf("parseInstantFire(raw"), "before instant controls");
  assert.ok(route.indexOf("const layaFirst") < route.indexOf("webAddress.spokenWebsite(raw)"), "before web addresses");
  assert.ok(route.indexOf("const layaFirst") > route.indexOf("MAC_CHITCHAT.test"), "small talk keeps its instant reply");
});

test("sure talk skips every quick rule; stop, cancel and a yes to an offer never do", () => {
  // The two gated stretches: from each "if (!laya3Talk) {" to the "  }" just
  // before the offer block, and to the one just before the voice-mode check.
  const g1 = [route.indexOf("if (quickRulesOn) {"), route.indexOf("/* Yes to what chat just offered")];
  const g2 = [route.indexOf("if (quickRulesOn) {", g1[1]), route.indexOf("if (voiceModesCache.modes.some")];
  const gated = (needle) => { const i = route.indexOf(needle); return (i > g1[0] && i < g1[1]) || (i > g2[0] && i < g2[1]); };
  for (const n of ["parseInstantFire(raw", "chromeProfiles.parseProfileIntent(raw)", "devServers.asksForLocalhost(raw)", "webAddress.spokenWebsite(raw)", "macClosesAllTabs(raw)", "recipeFor(raw)", "macShortcutFor(raw)", "macAnswerScheduleFast("]) assert.ok(gated(n), n);
  for (const n of ["const offer = macChatOffer", "isWorkflowCancelIntent(raw)", "MAC_CHITCHAT.test"]) assert.ok(!gated(n), n);
  assert.match(main, /const LAYA_TALK_SURE = 0\.72;/);
});

test("the switch goes to 3 and back, by voice or file", () => {
  assert.match(main, /\(zero\|one\|two\|three\|four\|off\|0\|1\|2\|3\|4\)/);
  assert.match(main, /n >= 0 && n <= 4 \? Math\.floor\(n\) : 0/);
  assert.match(main, /Math\.min\(4, Math\.floor/);
  assert.match(main, /deciderStage\(\) >= 3 && !pendingMacWorkflow && !parseInterruptIntent\(r\)/); // trace twin
});
