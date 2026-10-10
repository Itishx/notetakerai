// Decider stage 4 (2026-10-05), the one-brain diagram: Laya decides, HIL
// settles the rest and teaches Laya, the quick rules are only hands, talk goes
// to one chat, no HIL shadows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const renderer = read("../mac/braino-mac/renderer/braino-mac.js");
const route = main.slice(main.indexOf("async function routeHilFirst(raw) {"), main.indexOf("\nasync function runDelegate("));

test("rules are hands: they act only when Laya is sure it is a command, or Laya is down", () => {
  const fn = Function("layaReady", "LAYA_TALK_SURE", main.slice(main.indexOf("function quickRulesAllowed"), main.indexOf("\n}\n", main.indexOf("function quickRulesAllowed")) + 3) + "; return quickRulesAllowed;");
  const up = fn(true, 0.72), down = fn(false, 0.72);
  assert.equal(up({ kind: "one_tool", confidence: 0.77 }), true);
  assert.equal(up({ kind: "multi_step", confidence: 0.76 }), true);
  assert.equal(up({ kind: "one_tool", confidence: 0.4 }), false, "unsure goes to HIL");
  assert.equal(up({ kind: "chat", confidence: 0.77 }), false);
  assert.equal(up(null), false, "Laya running but timed out: HIL");
  assert.equal(down(null), true, "Laya not running: rules as before");
  assert.match(route, /const quickRulesOn = deciderStage\(\) >= 4 \? quickRulesAllowed\(layaFirst\) : !laya3Talk;/);
  assert.equal((route.match(/if \(quickRulesOn\) \{/g) || []).length, 2);
});

test("HIL teaches Laya: every settled sentence is written as a lesson, never a private one", () => {
  assert.match(route, /noteLayaLesson\(raw, sorted, plan\);/);
  const fn = main.slice(main.indexOf("function noteLayaLesson"), main.indexOf("\n}\n", main.indexOf("function noteLayaLesson")));
  assert.match(fn, /mentionsPrivateTopic\(text\)/);
  assert.match(main, /const HIL_TO_LAYA_KIND = \{ fire: "one_tool", loop: "multi_step", plan: "multi_step", ask: "ask", chat: "chat" \};/);
  assert.match(main, /\.braino-laya", "training", "lessons\.jsonl"/);
});

test("no shadows at stage 4", () => {
  for (const f of ["function fireHilRouterShadow", "function fireHilReasonThinking"]) {
    const body = main.slice(main.indexOf(f), main.indexOf(f) + 400);
    assert.match(body, /if \(deciderStage\(\) >= 4\) return;/, f);
  }
});

test("one chat: talk HIL settles goes to the live voice session, never a second job", () => {
  assert.match(route, /if \(plan\.kind === "chat"\) return talkOrConverse\(raw\);/);
  const fn = main.slice(main.indexOf("function talkOrConverse"), main.indexOf("\n}\n", main.indexOf("function talkOrConverse")));
  assert.match(fn, /deciderStage\(\) >= 4 && macTurnCanTalk\.on/);
  assert.match(fn, /if \(macNeedsWebFacts\(raw\)\) return runMacWebSearch\(raw\);/);
  assert.match(main, /macTurnCanTalk = \{ on: Boolean\(options\.canTalk\), at: Date\.now\(\) \};/);
  assert.match(renderer, /const understandingPromise = options\.force\s+\? Promise\.resolve\(null\)/);
});

test("repeat what you said repeats it", () => {
  assert.match(route, /source: "hil_first:repeat"/);
});

test("the switch reaches 4", () => {
  assert.match(main, /\(zero\|one\|two\|three\|four\|off\|0\|1\|2\|3\|4\)/);
  assert.match(main, /n >= 0 && n <= 4 \? Math\.floor\(n\) : 0/);
});

test("a plan never says it opened something it did not open", () => {
  const src = main.slice(main.indexOf("function planClaimsUnopened"), main.indexOf("\nasync function runPlanSteps"));
  const f = Function("macLastOpenedUrl", `${src}; return planClaimsUnopened;`)({ at: 0 });
  assert.equal(f("Open any article and open that for me", { done: "Opened it for you.", steps: [{ tool: "web_search" }, { tool: "page_link" }] }, 1), true);
  assert.equal(f("open youtube", { done: "Opened it", steps: [{ tool: "open_url" }] }, 1), false);
  assert.match(main, /if \(!run\.failed && planClaimsUnopened\(command, plan, planStarted\)\)/);
});

test("a plan that copies the previous job is thrown away", () => {
  const src = main.slice(main.indexOf("function planWords"), main.indexOf("\nconst MAC_WANTS_RESULTS"));
  const f = Function("macChatHistory", `${src}; return planLeakedPreviousJob;`)([{ role: "user", content: "show me the first video Sabrina Carpenter ever posted" }]);
  assert.equal(f("open the diagram of a human body anatomy", [{ tool: "youtube_play", args: { query: "Sabrina Carpenter earliest video" } }]), true);
  assert.equal(f("play something calm", [{ tool: "spotify_play", args: { query: "calm music" } }]), false);
  assert.match(main, /if \(plan && planLeakedPreviousJob\(raw, plan\.steps\)\)/);
});

test("open the X chat opens that WhatsApp chat, not just WhatsApp", () => {
  const src = main.slice(main.indexOf("function whatsAppChatTarget"), main.indexOf("\nasync function openWhatsAppChat"));
  const f = Function(`${src}; return whatsAppChatTarget;`)();
  assert.equal(f("open the VivaObit chat", "VivaObit chat"), "VivaObit");
  assert.equal(f("open WhatsApp and the BYOB chat", "WhatsApp and the BYOB chat"), "BYOB");
  assert.equal(f("open my chat with Param", "my chat with Param"), "Param");
  assert.equal(f("open a new chat", "a new chat"), "");
  assert.equal(f("open Claude chat", "Claude chat"), "");
  assert.match(main, /const chatName = whatsAppChatTarget\(raw, target\);\n    if \(chatName\) return openWhatsAppChat\(chatName\);/);
});

test("the planner and the loop get Laya's hint, only for the sentence it was made for", () => {
  assert.match(main, /layaHintSentence = String\(raw \|\| ""\)\.trim\(\);/);
  assert.match(main, /layaHintLine\(command\),\n/);
  assert.match(main, /layaHintLine\(raw\),\n/);
  const src = main.slice(main.indexOf("function layaHintLine"), main.indexOf("\n}\n", main.indexOf("function layaHintLine")) + 3);
  const f = Function("layaHintForRouter", "layaHintSentence", `${src}; return layaHintLine;`);
  assert.match(f("probably one media job", "play billie jean")("play billie jean"), /guesses: probably one media job/);
  assert.equal(f("probably one media job", "play billie jean")("open github"), "");
});

test("an alarm time in seconds is not read as 1970 (it rang instantly, 5 Oct)", () => {
  assert.match(main, /if \(Number\.isFinite\(fireAt\) && fireAt > 0 && fireAt < 1e12\) fireAt \*= 1000;/);
  assert.match(main, /alarm\.refused_past/);
});

test("a question about his own day skips quick chat and goes to the brain", () => {
  assert.match(renderer, /&& !ASKS_ABOUT_HIS_DATA\.test\(String\(text \|\| ""\)\)\) \{/);
  const re = eval(renderer.match(/const ASKS_ABOUT_HIS_DATA = (\/.*\/i);/)[1]);
  assert.ok(re.test("What does my day look like today?"));
  assert.ok(!re.test("yeah the launch mostly"));
});

test("the voice side does not decide chat on its own at stage 4: Laya does", () => {
  const h = main.slice(main.indexOf('ipcMain.handle("braino-mac:wants-brain"'), main.indexOf("// ── AffectiveOS capture"));
  assert.match(h, /if \(deciderStage\(\) >= 4\) \{\n      const sorted = await layaKind\(raw\);/);
  assert.match(h, /const talk = sorted\.kind === "chat" && sorted\.confidence >= LAYA_TALK_SURE && !MAC_OWN_DATA\.test\(raw\)/);
  assert.match(h, /return \{ brain: !talk, oneBrain: true, laya: true \};/);
  assert.match(renderer, /if \(one\?\.oneBrain && one\.brain\) \{/);
});

test("who is this / what is this looks at the screen, never quick chat", () => {
  const re = eval(main.match(/const SCREEN_DEIXIS_RE = (\/.*\/i);/)[1]);
  for (const t of ["Braino who is this?", "No Braino, who is this.", "what is this", "what am I looking at"]) assert.ok(re.test(t), t);
  for (const t of ["who are you", "what is this project about? tell me the plan"]) assert.ok(!re.test(t), t);
  assert.match(main, /if \(SCREEN_DEIXIS_RE\.test\(String\(raw \|\| ""\)\.trim\(\)\)\) return lookAtPointer\(String\(raw \|\| ""\)\);/);
  assert.match(main, /!MAC_OWN_DATA\.test\(raw\) && !SCREEN_DEIXIS_RE\.test\(raw\.trim\(\)\) && !macLooksLikeTask\(raw\) && !parseVolumeCommand\(raw\);/);
});

test("a search that names no query is asked at once, not after a 34s loop", () => {
  assert.match(main, /source: "hil_first:bare_search"/);
  assert.match(main, /data: \{ command: raw, question, fromRouter: true \}/);
});

test("text that did not come out as English is never acted on", () => {
  const src = main.slice(main.indexOf("const MAC_ENGLISH_WORDS"), main.indexOf("\nconst SEE_ME_RE"));
  const f = Function(`${src}; return macLooksMisheard;`)();
  for (const t of ["असे हिटिंग करता", "¿Qué dejaba tú?", "میرا درکھول", "Kurum profayl zəminini verin"]) assert.ok(f(t), t);
  for (const t of ["play Billie Jean", "Spicejet one", "Riya Khurana", "Ajmera Greens", "Abhishek Gour Mesa", "call Param"]) assert.ok(!f(t), t);
  assert.match(main, /if \(!pendingMacWorkflow && macLooksMisheard\(raw\)\) \{/);
  assert.match(main, /ipcMain\.handle\("braino-mac:top-contact-names"/);
});
