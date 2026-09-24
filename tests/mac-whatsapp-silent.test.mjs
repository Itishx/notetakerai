import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* WhatsApp, known silently: remembered, shown for important people only,
   never spoken by itself, groups never shown, text never copied. */
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
const lift = (re) => main.match(re)[0];
const fromRow = new Function(`${lift(/const WA_APPLE_EPOCH[^\n]*\n/)}${lift(/const WA_MEDIA[^\n]*\n/)}${lift(/function waMessageFromRow\(row\) \{[\s\S]*?\n\}/)}; return waMessageFromRow;`)();

test("a row from WhatsApp's database becomes a message", () => {
  const m = fromRow({ pk: 5, stype: 0, partner: "Ilu", jid: "91@s.whatsapp.net", type: 0, text: "reached", date: 780000000, fromme: 0 });
  assert.equal(m.name, "Ilu");
  assert.equal(m.group, false);
  assert.equal(m.text, "reached");
  assert.equal(m.at, (780000000 + 978307200) * 1000);
  assert.equal(fromRow({ pk: 6, stype: 1, partner: "FoundersCrew", jid: "1203@g.us", type: 3, date: 1, fromme: 0 }).text, "sent a voice note");
  assert.equal(fromRow({ pk: 6, stype: 1, partner: "FoundersCrew", jid: "1203@g.us", type: 0, date: 1, fromme: 0 }).group, true);
});

test("never spoken by itself, groups never shown, text never copied", () => {
  assert.doesNotMatch(main, /sendToRenderer\("braino-mac:speak-line", \{ text: `\$\{sender\} says: \$\{row\.body\}` \}\)/);
  assert.match(main, /const important = !msg\.group && isWaImportant\(msg\.name\);/);
  assert.match(main, /activityLog\.record\("whatsapp", \{ app: "WhatsApp", from: msg\.name, group: msg\.group, kind: msg\.kind, important, hash: String\(msg\.pk\) \}\)/);
});

test("asked, it answers; and HIL knows the tool", () => {
  assert.match(main, /whatsapp_messages: \(a\) => lookupWhatsAppMessages\(/);
  assert.match(catalog, /name: "whatsapp_messages", params: \["contact", "sinceHours"\]/);
  assert.match(main, /AND s\.ZSESSIONTYPE = 0 AND m\.ZMESSAGEDATE > \$\{since\}/);
});
