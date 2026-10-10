import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const lift = (src, start, end = "\n}\n") => { const at = src.indexOf(start); assert.ok(at >= 0, start); return src.slice(at, src.indexOf(end, at) + end.length); };
const liftLine = (src, start) => { const at = src.indexOf(start); assert.ok(at >= 0, start); return src.slice(at, src.indexOf("\n", at) + 1); };

/* Bug 1, 2026-10-05: with the mic shut while he speaks, nothing but a stop
   word could cut him off. HERA hearing words he is not saying is you. */
const talksOver = (hisLine, heard, chat = "") => Function("lastSpokenLine", "realtimeResponseText", `
  ${lift(js, "function normalizeForVoiceMatch(value) {")}
  ${lift(js, "function heraTalksOverHim(text) {")}
  return heraTalksOverHim(${JSON.stringify(heard)});
`)({ text: hisLine }, chat);

test("your own words over his voice cut him off", () => {
  assert.equal(talksOver("pinterest is open with mac ui animation inspiration", "wait open behance instead please"), true);
});

test("his own voice coming back through the speakers never does", () => {
  assert.equal(talksOver("pinterest is open with mac ui animation inspiration", "pinterest is open with mac ui"), false);
  // Streamed chat replies count as his line too.
  assert.equal(talksOver("", "got it clicking over to", "Got it. Clicking over to Behance now."), false);
});

test("two words, or no known line of his, never interrupt", () => {
  assert.equal(talksOver("pinterest is open", "hey wait"), false);
  assert.equal(talksOver("", "open behance instead please"), false);
});

test("in a room, only words meant for him stop him; anyone else only lowers his voice", () => {
  const handler = lift(js, "window.brainoMac.onVoiceCaption?.((event) => {", "\n});\n");
  assert.match(handler, /if \(heraOverHim && namedModeOn && !heraMeantForHim\(text\)\) \{\s*duckSpeech\(true, "not_for_him"\);/);
  const meant = lift(js, "function heraMeantForHim(text) {");
  assert.match(meant, /voiceExplicitlyAddressesBraino\(soFar\) \|\| BARGE_STOP\.test\(soFar\)/);
  assert.match(meant, /saidToBraino\(soFar\) && !isSelfEcho\(soFar\)/);
});

test("the talk-over path stops him, opens the mic at once, and keeps your words", () => {
  const handler = lift(js, "window.brainoMac.onVoiceCaption?.((event) => {", "\n});\n");
  const at = handler.indexOf("heraTalksOverHim(text)");
  assert.ok(at > 0 && at < handler.indexOf("heraVoice.dirty = true;"), "checked before his-voice text is discarded");
  assert.match(handler, /interruptVoiceTurn\("barge_in", "hera_talk_over"\);[\s\S]{0,200}heraVoice\.settled = text;[\s\S]{0,120}lastSpokenLine\.endedTs = Date\.now\(\) - CLEAN_EAR_ECHO_TAIL_MS;/);
});

/* Bug 2, 2026-10-05: a bug report typed into Cursor's Claude Code box five
   times, each time correctly, because the box reports only the start of long
   text; and "meta+a" was an unknown key. */
const { macVerifyAssert } = require("../mac/braino-mac/hil-verify.cjs");
const report = "There are two bugs in Reno right now. First, when he is speaking I cannot talk over him to make him stop.";

test("long text typed into a chat box that reports only its start is verified", () => {
  const obs = { elements: [{ index: 2, role: "textarea", name: report.slice(0, 60) }] };
  assert.equal(macVerifyAssert({ assert: "value_equals", index: 2, value: report }, obs).ok, true);
});

test("a box that does not hold the text still fails", () => {
  const obs = { elements: [{ index: 2, role: "textarea", name: "Plan, search, build anything" }] };
  assert.equal(macVerifyAssert({ assert: "value_equals", index: 2, value: report }, obs).ok, false);
  assert.equal(macVerifyAssert({ assert: "value_equals", index: 2, value: "hello" }, { elements: [{ index: 2, name: "help" }] }).ok, false);
});

test("key combinations are real keystrokes, not unknown keys", () => {
  const parse = Function(`${liftLine(main, "const MAC_KEY_MODS =")}${lift(main, "function macParseKeyCombo(name) {")} return macParseKeyCombo;`)();
  assert.deepEqual(parse("meta+a"), { key: "a", mods: ["command down"] });
  assert.deepEqual(parse("cmd+shift+v"), { key: "v", mods: ["command down", "shift down"] });
  assert.equal(parse("return"), null);
  assert.equal(parse("meta+pagedown"), null);
  assert.match(lift(main, '  if (type === "pressKey") {', "\n  }\n"), /const combo = macParseKeyCombo\(action\.key\);/);
});

test("a plan step that types text exists, pastes, and gives your clipboard back", () => {
  const tool = lift(main, "  type_text: async (a) => {", "\n  },\n");
  assert.match(tool, /clipboard\.writeText\(text\);/);
  assert.match(tool, /keystroke "v" using \{command down\}/);
  assert.match(tool, /if \(clipboard\.readText\(\) === text\) clipboard\.writeText\(before\);/);
});

/* 2026-10-05: an old job's pending question ate new commands, so a command
   from minutes ago resumed on top of the present one. */
const released = (() => {
  const approves = require("../extension/lib/hilShared.js").answerApproves;
  return Function("macHilAnswerApproves", `
    ${liftLine(main, "const HIL_ANSWER_NEW_JOB =")}
    ${liftLine(main, "const HIL_ANSWER_STOPWORDS =")}
    ${lift(main, "function hilAnswerNamesAnOption(reply, question) {")}
    ${lift(main, "function hilAnswerReleasedBy(raw, pending = null) {")}
    return hilAnswerReleasedBy;
  `)(approves);
})();
const keepGoing = { data: { approval: { kind: "keep_going" } } };
const question = { data: { question: "Which item should I open?" } };

test("'keep going?' takes only a yes or a no; anything else is a new command", () => {
  assert.equal(released("Yes please", keepGoing), false);
  assert.equal(released("no", keepGoing), false);
  assert.equal(released("Braino maximize the tabs.", keepGoing), true);
  assert.equal(released("we know command paste it come on paste it", keepGoing), true);
});

test("a real question keeps its answer, but lets new commands go", () => {
  assert.equal(released("the second one", question), false);
  assert.equal(released("Braino maximize the tabs.", question), true);
  assert.equal(released("Okay, Braino, I said paste the prompt", question), true);
  assert.equal(released("Yes, open it", question), false, "a short yes is still an answer");
});

test("naming one of his options is an answer, even when it starts with a verb", () => {
  const flight = { data: { question: "Which flight should I book: SpiceJet or IndiGo?" } };
  assert.equal(released("book the SpiceJet one", flight), false);
  assert.equal(released("Spicejet one", flight), false);
  assert.equal(released("Braino maximize the tabs.", flight), true);
  // "Keep going?" names no options, so this never lets a new command in there.
  assert.equal(released("book the SpiceJet one", keepGoing), true);
});

/* 2026-10-05: the planner copied the previous job (Sabrina Carpenter) into
   "open the diagram of a human body's anatomy" and saved it to replay. */
test("a plan that searches for something you never said is never saved as a shortcut", () => {
  const skills = require("../mac/braino-mac/skill-memory.cjs");
  const leaked = [{ tool: "open_url", args: { url: "https://www.innerbody.com/anatomy" } }, { tool: "youtube_play", args: { query: "Sabrina Carpenter earliest video" } }];
  assert.equal(skills.canSaveSkill(leaked, () => false, "open the diagram of a human bodys anatomy"), false);
  const good = [{ tool: "youtube_play", args: { query: "Sabrina Carpenter earliest videos" } }];
  assert.equal(skills.canSaveSkill(good, () => false, "play sabrina carpenters earliest videos"), true);
  assert.equal(skills.canSaveSkill([{ tool: "tabs_close_all", args: {} }], () => false, "close all the tabs"), true);
});

test("his own voice is never let in as a reply to him", () => {
  const follows = lift(js, "function followsHisReply(text) {");
  assert.ok(follows.indexOf("if (isSelfEcho(text)) return false;") < follows.indexOf("ANSWER_REPLY"), "checked before any reply rule");
});

test("a long nameless sentence right after his reply is a lecture, not a reply", () => {
  const follows = lift(js, "function followsHisReply(text) {");
  assert.match(follows, /length > 15\) \{\s*return voiceExplicitlyAddressesBraino\(text\) \|\| saidToBraino\(text\);/);
  assert.ok(follows.indexOf("length > 15") < follows.indexOf("ANSWER_REPLY"), "checked before the reply rules");
});
