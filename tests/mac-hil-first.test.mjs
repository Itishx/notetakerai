import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

/* HIL first. 171 of 1616 logged Mac commands were misread by the regex cascade
   deciding before anything read the sentence. These pin who decides now. */
const require = createRequire(import.meta.url);
const { isInstantCommand, planFromVerdict, hilFirstEnabled } = require("../mac/braino-mac/hil-first.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const wired = { spotify_play: () => {}, whatsapp_send: () => {}, now_playing: () => {} };

test("only bare controls skip the router", () => {
  for (const c of ["pause", "Braino, next song", "volume up", "skip this song", "mute", "play", "resume the music"]) {
    assert.equal(isInstantCommand(c), true, c);
  }
  // The misreads from the log start with the same words and must be read.
  for (const c of ["play that song on Spotify", "stop the current task", "play my favorite song", "open WhatsApp for me", "close your eyes", "pause the video and send it to Ilu"]) {
    assert.equal(isInstantCommand(c), false, c);
  }
});

test("each verdict goes where it should", () => {
  assert.deepEqual(planFromVerdict({ v: "fire", t: "spotify_play", a: { songQuery: "Billie Jean" } }, wired), { kind: "fire", tool: "spotify_play", args: { songQuery: "Billie Jean" } });
  assert.equal(planFromVerdict({ v: "fire", t: "tabs_close_all" }, wired).kind, "legacy");
  assert.equal(planFromVerdict({ v: "escalate", why: "two moves" }, wired).kind, "loop");
  assert.deepEqual(planFromVerdict({ v: "ask", q: "Which Rahul?" }, wired), { kind: "ask", question: "Which Rahul?" });
  assert.equal(planFromVerdict({ v: "ask", q: "" }, wired).kind, "loop");
  assert.equal(planFromVerdict({ v: "say" }, wired).kind, "chat");
  assert.equal(planFromVerdict(null, wired).kind, "legacy");
});

test("one switch puts the old order back", () => {
  assert.equal(hilFirstEnabled({}, {}), true);
  assert.equal(hilFirstEnabled({ BRAINO_HIL_FIRST: "0" }, {}), false);
  assert.equal(hilFirstEnabled({}, { BRAINO_HIL_FIRST: "0" }), false);
});

test("the router runs before the cascade, and failure falls back to it", () => {
  const i = main.indexOf("} else if (!spiteSwap && (hilFirstResult = await routeHilFirst(raw))) {");
  assert.ok(i > 0 && i < main.indexOf("result = await routeMacDelegate(prompt, raw);"), "router must come before the cascade");
  assert.match(main, /if \(!routed\) \{ macTrace\("↩ FALLBACK"[^\n]*return null; \}/);
  assert.match(main, /if \(isInstantCommand\(raw\)\) \{ macTrace\("⏩ INSTANT"[^\n]*return null; \}/);
  assert.match(main, /if \(parseInterruptIntent\(raw\)\) \{ macTrace\("✋ STOP"[^\n]*return null; \}/);
});

test("the catalog's own argument names reach the Mac's hands", () => {
  assert.match(main, /a\.songQuery \|\| a\.query/);
  assert.match(main, /a\.recipientRaw \|\| a\.recipient/);
});

test("a yes only replays a click if the same control is still there", () => {
  assert.match(main, /gatedTarget: macElementIdentity\(obs\.elements, stepObj\.action\?\.index\)/);
  assert.match(main, /hil\.loop\.replay_skipped/);
});

test("HIL first keeps the old path's rules for a waiting question", () => {
  assert.match(main, /isWorkflowCancelIntent\(raw\) \|\| workflowClaimsUtterance\(pendingMacWorkflow, raw\)\) \{\n\s+macTrace\("💬 ANSWER"/);
  assert.match(main, /source: "hil_first:dropped"/);
});

test("the router is asked once per command", () => {
  assert.match(main, /if \(shadowSurface && !hilFirstResult && !hilFirstAsked\)/);
});

test("every decision prints a readable line", () => {
  for (const tag of ["▶ HEARD", "🧭 HIL-FIRST", "↩ FALLBACK", "🗺 PLAN", "🔁 REPLAN", "📥 FOLDED IN", "⏱ STEP", "🎵 NOW PLAYING"]) {
    assert.ok(main.includes(`macTrace("${tag}"`), tag);
  }
  assert.match(main, /route: String\(result\?\.source \|\| "cascade"\)/);
});

test("close all tabs stays native and instant", () => {
  assert.match(main, /if \(macClosesAllTabs\(raw\)\) \{ macTrace\("⏩ INSTANT"/);
  assert.match(main, /tabs_close_all: \(\) => closeAllBrowserTabs\(\),/);
});

test("a yes to his own question is not asked again at the gate", () => {
  assert.match(main, /askedConsent: String\(d\.question \|\| ""\),/);
  assert.match(main, /consentFromAnswer: approved && !held\.gatedSig && Boolean\(held\.askedConsent\),/);
  assert.match(main, /hil\.loop\.consent_carried/);
});

test("WhatsApp means the Mac app when it is installed", () => {
  assert.match(main, /if \(aimsAtWhatsAppWeb && macWhatsAppAppInstalled\(\)\)/);
  assert.match(main, /Never WhatsApp Web\./);
  const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /through the WhatsApp Mac app in about a second/);
});

test("WhatsApp: Mac app, then a signed-in web tab, then say so", () => {
  assert.match(main, /if \(macWhatsAppAppInstalled\(\)\) return sendWhatsAppMessage\(/);
  assert.match(main, /You don't seem to be logged into WhatsApp anywhere on this device\./);
});

test("the second batch of existing Mac functions is connected", () => {
  for (const t of ["music_play_segment_loop", "recent_download", "file_action_undo", "wallpaper_set_from_web", "mac_wide_deep_search", "screen_point"]) {
    assert.match(main, new RegExp(`\\n  ${t}: `), t);
  }
});

test("next class says the one you should be in first, and skips the router", () => {
  assert.match(main, /say = `Right now you should be in \$\{live\.title\}/);
  const i = main.indexOf('const schedule = await macAnswerScheduleFast(String(raw).toLowerCase());');
  assert.ok(i > 0 && i < main.indexOf("const routed = await callHilRouterLive(raw);"), "timetable before the router");
  const prompt = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts", import.meta.url), "utf8");
  assert.match(prompt, /An answer is short too: the one thing they asked/);
});

test("P0 connect: the 22 everyday tools reach the Mac's hands", () => {
  for (const t of ["open_folder", "file_find", "repeat_last", "time_query", "stop_meeting_recording", "stop_screen_recording",
    "maps_show", "maps_directions", "spotify_seek", "spotify_queue_track", "spotify_set_volume", "spotify_set_mode",
    "timer_cancel", "alarm_cancel", "alarm_control", "stopwatch_control", "click_element", "close_target",
    "whatsapp_reply_last", "send_to_phone", "mail_send", "notion_page"]) {
    assert.match(main, new RegExp(`\\n  ${t}: `), t);
  }
});

test("email asks first, a click asks only on send/buy/delete, WhatsApp stays instant", () => {
  const fn = new Function(`${main.match(/const MAC_GATED_CLICK[^\n]*\n/)[0]}${main.match(/function macToolStepCanBeIrreversible\(action\) \{[\s\S]*?\n\}/)[0]}; return macToolStepCanBeIrreversible;`)();
  assert.equal(fn({ tool: "mail_send", args: { action: "send" } }), true);
  assert.equal(fn({ tool: "mail_send", args: { action: "draft" } }), false);
  assert.equal(fn({ tool: "click_element", args: { target: "Place order" } }), true);
  assert.equal(fn({ tool: "click_element", args: { target: "Downloads" } }), false);
  assert.equal(fn({ tool: "whatsapp_send", args: {} }), false);
});
