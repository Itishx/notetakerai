import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* "Open WhatsApp for me" came back as "What should I say to for me?". */
const src = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const parseWhatsAppIntent = new Function(
  `${src.match(/const WHATSAPP_NOT_A_NAME[^\n]*\n/)[0]}${src.match(/function parseWhatsAppIntent\(raw\) \{[\s\S]*?\n\}/)[0]}; return parseWhatsAppIntent;`,
)();

test("opening WhatsApp is not a message", () => {
  assert.equal(parseWhatsAppIntent("Braino, can you please open WhatsApp for me?"), null);
  assert.equal(parseWhatsAppIntent("whatsapp for me"), null);
});

test("real messages still parse", () => {
  assert.deepEqual(parseWhatsAppIntent("text Ilu on WhatsApp saying hello"), { recipient: "Ilu", message: "hello", needsMessage: false, needsRecipient: false });
  assert.equal(parseWhatsAppIntent("message Rahul on whatsapp").recipient, "Rahul");
});
