import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* The app chat: answers come back with cards, and many chats nested in the sidebar (2026-10-15). */
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const main = read("../mac/braino-mac/main.cjs");
const chat = read("../mac/braino-mac/renderer/chat.js");
const app = read("../mac/braino-mac/renderer/app.js");

test("a chat task runs in the notch and its answer comes back to the chat", () => {
  assert.match(main, /chatForward = \{ resolve, started: false, at: Date\.now\(\) \}/);
  assert.match(main, /fwd\.resolve\(\{ \.\.\.result, \.\.\.\(ui \? \{ ui \} : \{\}\) \}\)/);
});

test("every tool is wrapped once so its result can become a card", () => {
  assert.match(main, /for \(const \[name, fn\] of Object\.entries\(MAC_HIL_TOOLS\)\)/);
  assert.match(main, /ui = \{ type: "day", events/);
  assert.match(main, /ui = \{ type: "connections"/);
  assert.match(main, /ui = \{ type: "choices"/);
});

test("the chat draws day, connections, choices and sources, and a tap answers", () => {
  for (const t of ['u.type === "day"', 'u.type === "connections"', 'u.type === "choices"', 'u.type === "sources"']) assert.ok(chat.includes(t), t);
  assert.match(chat, /closest\("\.chat-sg, \.ui-chip, \.ui-btn"\)/);
  assert.match(chat, /if \(r\?\.ui\) reply\.ui = r\.ui;/);
});

test("many chats, listed under Chat", () => {
  assert.match(chat, /const ALL = "braino-chats", CUR = "braino-chat-cur"/);
  assert.match(chat, /list: \(\) => chats\.filter/);
  assert.match(app, /\$\{id === "chat" \? chatSubNav\(\) : ""\}/);
  assert.match(app, /data-chat="new">\+ New chat</);
});
