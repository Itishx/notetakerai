import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const skills = require("../mac/braino-mac/skill-memory.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");

test("1. the screen check is never waited on, and a blocked one is skipped for a minute", () => {
  assert.match(main, /void readActiveMacContext\(\)\.then\(\(latestContext\) => \{/);
  assert.match(main, /if \(desktopConsentSettled && Date\.now\(\) < desktopReadBlockedUntil\) return null;/);
  assert.match(main, /if \(Date\.now\(\) < browserReadBlockedUntil\) return null;/);
});

test("2. chat that reached main goes back to the voice session", () => {
  assert.match(main, /else if \(options\.canTalk\) result = \{ ok: true, talk: true/);
  assert.match(js, /if \(result\?\.talk\) \{[\s\S]{0,300}answerViaRealtimeChat\(text, \{ force: true \}\)/);
  assert.match(js, /canTalk: Boolean\(realtimeActive && rtDc && rtDc\.readyState === "open"\)/);
});

test("3. the loop stops at 20 seconds and asks; a yes lifts the limit, a no stops", () => {
  assert.match(main, /const MAC_HIL_STUCK_MS = 180000;/);
  // "Keep going" buys a minute, never the rest of the seven (2026-09-27).
  assert.match(main, /let stuckAt = Date\.now\(\) \+ \(resume\?\.keepGoing \? MAC_HIL_KEEP_GOING_MS : MAC_HIL_STUCK_MS\);/);
  // 20 seconds with no move that worked, not 20 seconds from the start (2026-10-01).
  assert.match(main, /if \(settled\?\.ok !== false\) stuckAt = Math\.max\(stuckAt, Date\.now\(\) \+ MAC_HIL_STUCK_MS\);/);
  assert.match(main, /const MAC_HIL_KEEP_GOING_MS = 180000;/);
  assert.doesNotMatch(main, /keepGoing \? Infinity/);
  // One run's questions share one 90s clock, at most two of them.
  assert.match(main, /const HIL_ASK_TTL_MS = 90000;/);
  assert.match(main, /const HIL_ASK_MAX = 2;/);
  assert.match(main, /Want me to keep going\?/);
  assert.match(main, /if \(fresh && held\.keepGoing && !approved\) \{\n\s+if \(\/\^\(\?:no\|nope[^\n]+return \{ ok: true, say: "Okay, I stopped\."[^\n]+\n\s+return null;/);
});

test("4. think once gathers context at once, capped at 300ms, and the function is kept warm", () => {
  assert.match(main, /const \[slow, playing\] = await Promise\.all\(\[cap\(setupSlowFacts\(\), \{ facts: \[\] \}\), cap\(macNowPlayingForHil\(\), ""\)\]\);/);
  assert.match(main, /setInterval\(warmHilPlan, 10 \* 60 \* 1000\);/);
});

test("5. learned skills: exact phrase, nothing irreversible, never a lookup", () => {
  assert.equal(skills.skillKey("Braino, can you please open GitHub for me?"), "open github");
  assert.equal(skills.skillKey("open github"), "open github");
  assert.ok(skills.canSaveSkill([{ tool: "open_url", args: { url: "https://github.com" } }]));
  assert.ok(!skills.canSaveSkill([{ tool: "attendance_lookup", args: {} }]), "answers are looked up fresh");
  assert.ok(!skills.canSaveSkill([{ tool: "whatsapp_send", args: { recipientRaw: "Ilu", message: "hi" } }], (st) => st.tool === "whatsapp_send"));
  assert.ok(!skills.canSaveSkill([{ tool: "open_url", args: { url: "" } }]));
  assert.match(main, /maybeSaveSkill\(command, plan\.steps, plan\.done\);/);
  assert.match(main, /const run = await runPlanSteps\(learned\.steps, raw, "skill"\);/);
});

test("6. the notch says what he is doing", () => {
  assert.match(main, /sendTaskProgress\(\{ status: "thinking", text: `Step \$\{i \+ 1\} of \$\{steps\.length\}: \$\{macPlainStep\(step\)\}` \}\)/);
  assert.match(main, /sendTaskProgress\(\{ status: "thinking", text: "Planning" \}\)/);
});

test("a plan step you didn't ask for, that can't be undone, is checked first", () => {
  const a = main.indexOf("const PLAN_NEEDS_WORDS"); const b = main.indexOf("/* An empty request wakes", a);
  const surprise = new Function(`${main.slice(a, b)}; return planSurpriseStep;`)();
  assert.equal(surprise("switch all my tabs", [{ tool: "tabs_close_all" }])?.tool, "tabs_close_all");
  assert.equal(surprise("close all my tabs", [{ tool: "tabs_close_all" }]), null);
  assert.equal(surprise("start a meet and send the link to Ilu", [{ tool: "open_url" }, { tool: "whatsapp_send" }]), null);
  assert.match(main, /if \(pending\.type === "plan_confirm"\) \{/);
});

test("the four bugs from the 26 Sep run", () => {
  const a = main.indexOf("function macPlainStep(step) {"); const b = main.indexOf("\n}\n", a) + 2;
  const plain = new Function("PLAIN_STEP", `${main.slice(a, b)}; return macPlainStep;`)({ open_url: "opening the page" });
  assert.equal(plain({ intent: "Find the incognito window", action: { type: "look" } }), "find the incognito window");
  assert.equal(plain({ action: { type: "tool", tool: "open_url" } }), "opening the page");
  assert.doesNotMatch(main, /Run the nexus_sync_all tool to pull it/);
  const routing = require("../mac/braino-mac/hil-routing.cjs");
  assert.equal(routing.macWantsTheBrain("And how do you know that?"), false);
});
