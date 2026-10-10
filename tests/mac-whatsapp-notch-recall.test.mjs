import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

// 2026-09-29: notch showed "Ilu, 1 message"; "what did Elu text me?" got
// "you've never told me". Chat must see what the notch showed, and a name
// heard by sound must still find the sender.
const src = fs.readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const grab = (name) => src.slice(src.indexOf(`function ${name}(`), src.indexOf("\n}\n", src.indexOf(`function ${name}(`)) + 2);
const fns = new Function(`${grab("waLooseName")}\n${grab("waNameDistance")}\n${grab("waSoundsLike")}\nreturn { waSoundsLike };`)();

test("a name heard by sound finds the WhatsApp sender", () => {
  const names = ["Ilu😍", "Mom", "Rohan Mehta"];
  assert.equal(fns.waSoundsLike("Elu", names), "Ilu😍");
  assert.equal(fns.waSoundsLike("ilu", names), "Ilu😍");
  assert.equal(fns.waSoundsLike("Rohan", names), "Rohan Mehta");
  assert.equal(fns.waSoundsLike("Priya", names), "");
});

test("chat is handed the messages the notch already showed", () => {
  const chat = src.slice(src.indexOf("async function runMacConversation("), src.indexOf("async function runMacConversation(") + 3000);
  assert.match(chat, /\.\.\.notchWhatsAppLines\(\)/);
  assert.match(src, /noteNotchWhatsApp\(msg\.name, msg\.text, msg\.at\);\s*\n\s*sendToRenderer\("braino-mac:wa-card"/);
});
