// "Send this link to Riya on WhatsApp" went to Riya 🐣 with nobody asked
// (2026-10-02, 23:53). Two people share the name; he must ask which, offer the
// one you actually chat with first, take the answer by voice or by tap, and
// never choose for you. Numbers here are fake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sameNameContacts, pickContactChoice, contactChoiceQuestion } = require("../mac/braino-mac/contact-match.cjs");
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");

const BOOK = {
  a: { name: "Riya 🐣", phone: "+91 90000 00001" },
  b: { name: "Riya Khurana Mesa", phone: "+91 90000 00002" },
  c: { name: "Priya Natesh Mam ICFAI EG", phone: "+91 90000 00003" },
  d: { name: "Ilu😍", phone: "+91 90000 00004" },
  e: { name: "Ilu", phone: "9000000004" },
  f: { name: "Rahul Sharma", phone: "+91 90000 00005" },
  g: { name: "Rahul Verma", phone: "+91 90000 00006" },
};

test("a bare first name two people share is a question", () => {
  const names = sameNameContacts("Riya", BOOK).map((c) => c.name).sort();
  assert.deepEqual(names, ["Riya Khurana Mesa", "Riya 🐣"].sort());
  assert.equal(sameNameContacts("Rahul", BOOK).length, 2);
});

test("a fuller name is one person, and Priya is not a Riya", () => {
  assert.deepEqual(sameNameContacts("Riya Khurana", BOOK).map((c) => c.name), ["Riya Khurana Mesa"]);
  assert.deepEqual(sameNameContacts("Khurana", BOOK).map((c) => c.name), ["Riya Khurana Mesa"]);
  assert.deepEqual(sameNameContacts("Priya", BOOK).map((c) => c.name), ["Priya Natesh Mam ICFAI EG"]);
});

test("the same person saved twice is still one person", () => {
  assert.equal(sameNameContacts("Ilu", BOOK).length, 1);
});

test("the question names them, the one you chat with most first", () => {
  assert.equal(
    contactChoiceQuestion("Riya", [{ name: "Riya Khurana Mesa", chats: 435 }, { name: "Riya 🐣", chats: 11 }]),
    "Which Riya? Riya Khurana Mesa, who you talk to most, or the other Riya?",
  );
  assert.equal(contactChoiceQuestion("Rahul", [{ name: "Rahul Sharma", chats: 0 }, { name: "Rahul Verma", chats: 0 }]), "Which Rahul? Rahul Sharma or Rahul Verma?");
});

test("every way of answering picks the right person", () => {
  const choices = [{ name: "Riya Khurana Mesa" }, { name: "Riya 🐣" }];
  assert.equal(pickContactChoice("Khurana", choices), 0);
  assert.equal(pickContactChoice("Riya Khurana", choices), 0);
  assert.equal(pickContactChoice("the first one", choices), 0);
  assert.equal(pickContactChoice("the one I talk to most", choices), 0);
  assert.equal(pickContactChoice("the other one", choices), 1);
  assert.equal(pickContactChoice("second", choices), 1);
  assert.equal(pickContactChoice("no one, cancel", choices), -2);
  // Just the shared name again is not an answer; he asks once more.
  assert.equal(pickContactChoice("Riya", choices), -1);
});

test("resolving a recipient asks before matching by sound or by history", () => {
  const resolve = main.slice(main.indexOf("async function resolveWhatsAppRecipient"));
  assert.ok(resolve.indexOf("sameNameContacts(") < resolve.indexOf("findContactBySound("), "the same-name check has to run first");
  assert.match(main, /return askWhichContact\(recipientRaw, resolved\.choices, \{ kind: "whatsapp"/);
  assert.match(main, /return askWhichContact\(intent\.recipient, resolved\.choices, \{ kind: "call"/);
});

test("a question stops the plan, the loop and the chain instead of sending", () => {
  assert.match(main, /if \(out && out\.asks\) return \{ failed: false, asked: true/);
  assert.match(main, /if \(out\?\.asks\) return \{ ok: true, asks: true/);
  assert.match(main, /if \(chained\.asked\) return/);
  assert.equal((main.match(/if \(run\.asked\) return/g) || []).length, 5);
});

test("the answer, spoken or tapped, sends to exactly the one chosen", () => {
  assert.match(main, /pending\.type === "contact_pick"/);
  assert.match(main, /return sendWhatsAppMessage\(pick\.name, job\.message \|\| "", pick\)/);
  assert.match(main, /chosen\?\.phone \? \{ ok: true, name: chosen\.name, phone: chosen\.phone/);
  assert.match(renderer, /function renderNotchChoices/);
  assert.match(renderer, /__brainoRunDelegate\?\.\(name\)/);
});
