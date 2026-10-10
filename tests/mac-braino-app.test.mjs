import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../mac/braino-mac/${p}`, import.meta.url), "utf8");
const main = read("main.cjs"), js = read("renderer/braino-mac.js"), app = read("renderer/app.js"), preload = read("preload.cjs"), css = read("renderer/app.css");

test("double-click Braino opens the one app; Cmd+Shift+D does too", () => {
  assert.match(js, /if \(window\.brainoMac\.appOpen\) void window\.brainoMac\.appOpen\(\)/);
  assert.match(main, /dashboard: globalShortcut\.register\("CommandOrControl\+Shift\+D", \(\) => \{\n\s+openBrainoApp\(\);/);
  assert.match(main, /const APP_VIEW_PATH = path\.join\(__dirname, "renderer", "app\.html"\);/);
  for (const name of ["appOpen", "appRecent", "skillsList", "skillsForget", "appOverlay", "loginItem", "onAppGo", "onAppOverlay"]) assert.match(preload, new RegExp(`\\b${name}:`), name);
});

test("Companion and Foundry, with Braino, Connections and System shared", () => {
  // Chat is the front door of both (2026-09-28).
  assert.match(app, /companion: \[\["", \["chat", "home"\]\], \["Your day"/);
  assert.match(app, /foundry: \[\["", \["chat", "fhome"\]\], \["The four jobs", \["content", "optics", "outbound", "approvals"\]\]/);
  assert.match(app, /shared: \[\["Braino", \["appearance", "voice", "commands", "skills"\]\]/);
});

test("the app opens on Chat, which talks or does (2026-09-28)", () => {
  assert.match(app, /let product = "companion", cur = "chat";/);
  assert.match(app, /chat: \{ t: "", nav: \["Chat", "chat"\]/);
  const chat = readFileSync(new URL("../mac/braino-mac/renderer/chat.js", import.meta.url), "utf8");
  assert.match(chat, /call\("converse", t\)/);
  assert.match(chat, /call\("delegate", t, \{ canTalk: false, reason: "app_chat" \}\)/);
});

test("features not built yet say so, instead of faking numbers", () => {
  for (const id of ["habits", "focus", "routines", "optics", "outbound", "approvals", "ideas"]) assert.match(app, new RegExp(`${id}: \\{[^\\n]*soon\\(`), id);
});

test("AffectiveOS type and square glass tiles that animate", () => {
  assert.match(css, /--display:"Iowan Old Style"/);
  assert.match(css, /--mark:"Bodoni Moda"/);
  assert.match(css, /\.nav button\{position:relative;aspect-ratio:1;/);
  assert.match(css, /@keyframes pageIn/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("the app's changes reach him where he lives", () => {
  assert.match(js, /window\.brainoMac\.onAppOverlay\?\.\(\(patch\) => \{/);
  assert.match(js, /if \(patch\.dock\) \{/);
  assert.match(js, /if \(patch\.hide != null\) setMascotHide\(patch\.hide \|\| null, "app"\);/);
});
