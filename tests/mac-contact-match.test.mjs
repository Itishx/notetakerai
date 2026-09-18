import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  findContactBySound,
  scoreContactEntry,
  contactPhone,
  soundKey,
  speakableContactName,
  parseCorrectedName,
} = require("../mac/braino-mac/contact-match.cjs");
const { workflowClaimsUtterance } = require("../mac/braino-mac/interrupt-intent.cjs");

const contacts = {
  "ilu😍": { name: "Ilu😍", phone: "+91 90000 00001" },
  "ilu ki murli wife": { name: "Ilu ki Murli Wife", phone: "+91 90000 00002" },
  "prakhar brother": { name: "Prakhar Brother", phone: "+91 90000 00003" },
  "aditi karra": { name: "Aditi Karra", phone: "+91 90000 00004" },
  "aditi mesa": { name: "Aditi Mesa", phone: "+91 90000 00005" },
  "tejas sis": { name: "Tejas Sis", phone: "+91 90000 00006" },
  "tejas mom": { name: "Tejas Mom", phone: "+91 90000 00007" },
  "eesha bhoola": { name: "Eesha Bhoola", phone: "+91 90000 00008" },
  "balraj salvaji": { name: "Balraj Salvaji", phone: "+91 90000 00009" },
  "abhinav tarkshaya": { name: "Abhinav Tarkshaya", phone: "+91 90000 00010", nickname: "Abhi", company: "Tarkshaya Labs" },
};

/* "FaceTime Iloo" and "FaceTime Elu" both failed; the contact is "Ilu😍". */
test("a misheard name finds the person it sounds like", () => {
  for (const heard of ["Iloo", "Elu", "ILU", "ilu"]) {
    assert.equal(findContactBySound(heard, contacts, {})?.contact?.name, "Ilu😍", heard);
  }
  assert.equal(findContactBySound("Prakar", contacts, {})?.contact?.name, "Prakhar Brother");
  assert.equal(findContactBySound("Esha", contacts, {})?.contact?.name, "Eesha Bhoola");
  assert.equal(soundKey("Iloo"), soundKey("Elu"));
  assert.equal(findContactBySound("xyz", contacts, {}), null);
  assert.equal(findContactBySound("Bruno", contacts, {}), null);
});

test("people you call win a tie, and a real tie is a question", () => {
  const tie = findContactBySound("Aditi", contacts, {});
  assert.deepEqual(tie.ambiguous.map((c) => c.name), ["Aditi Mesa", "Aditi Karra"]);
  assert.equal(findContactBySound("Aditi", contacts, { "aditi karra": { count: 2 } })?.contact?.name, "Aditi Karra");
  assert.equal(findContactBySound("Tejas", contacts, {}).ambiguous.length, 2);
});

test("names are said without their emoji", () => {
  assert.equal(speakableContactName("Ilu😍"), "Ilu");
  assert.equal(speakableContactName("Aditi Mesa  🧑‍🚒"), "Aditi Mesa");
});

/* "ILU Braino" after the failed call was answered as small talk about Ilu. */
test("a correction is read as the name that was meant", () => {
  assert.equal(parseCorrectedName("ILU Braino"), "ILU");
  assert.equal(parseCorrectedName("No, I said Ilu."), "Ilu");
  assert.equal(parseCorrectedName("not Elu, Ilu"), "Ilu");
  assert.equal(parseCorrectedName("it's Ilu please"), "Ilu");
  assert.equal(parseCorrectedName("Prakhar Brother"), "Prakhar Brother");
  for (const said of ["Braino open YouTube", "what is the time", "stop", "never mind", "I think we should go for dinner tonight"]) {
    assert.equal(parseCorrectedName(said), "", said);
  }
  assert.equal(workflowClaimsUtterance({ stage: "call_recipient" }, "ILU Braino"), true);
});

test("a failed call waits briefly for the right name, and nothing else runs meanwhile", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /const CALL_REPAIR_MS = 45000;/);
  assert.match(main, /setPendingMacWorkflow\(\{ type: "call", stage: "call_recipient", ttlMs: CALL_REPAIR_MS, data: \{ intent \} \}\);/);
  assert.match(main, /\(Number\(pending\.ttlMs\) \|\| MAC_WORKFLOW_CONFIRM_MS\)/);
  const branch = main.slice(main.indexOf('if (pending.type === "call" && pending.stage === "call_recipient") {'));
  assert.match(branch.slice(0, 700), /const name = parseCorrectedName\(raw\);[\s\S]*return startCall\(\{ \.\.\.pending\.data\.intent, recipient: name \}\);/);
  // Not a name and not addressed to him: dropped quietly, never run as a command.
  assert.match(main, /if \(pending\.type === "call" && !\/\\bbrain\(\?:o\|elle\)\\b\/i\.test\(String\(raw \|\| ""\)\)\) \{\s*return \{ ok: true, superseded: true, say: "" \};/);
  // Sound first, then the old spelling lookup; and who you call is remembered.
  const resolve = main.slice(main.indexOf("async function resolveWhatsAppRecipient"));
  assert.ok(resolve.indexOf("findContactBySound(") < resolve.indexOf("findContactInCache("));
  assert.match(main, /recordContactUse\(resolved\.name, "facetime"\);/);
  assert.match(main, /recordContactUse\(resolved\.name, "whatsapp"\);/);
  assert.match(main, /setTimeout\(\(\) => void seedContactHistoryFromLog\(\), 12000\);/);
});


/* "Salvaji" is a person in the address book, and Braino said "who's that?" */
test("a surname, a middle name or a nickname finds the person too", () => {
  assert.equal(findContactBySound("Salvaji", contacts, {})?.contact?.name, "Balraj Salvaji");
  assert.equal(findContactBySound("Tarkshaya", contacts, {})?.contact?.name, "Abhinav Tarkshaya");
  assert.equal(findContactBySound("Abhi", contacts, {})?.contact?.name, "Abhinav Tarkshaya");
  // The words in the other order is still the same person.
  assert.equal(findContactBySound("Salvaji Balraj", contacts, {})?.contact?.name, "Balraj Salvaji");
  // A first name always outranks somebody else's surname.
  assert.ok(scoreContactEntry("balraj", { name: "Balraj Salvaji" }) > scoreContactEntry("salvaji", { name: "Balraj Salvaji" }));
  // Where someone works is the weakest of the three, so it never steals a name.
  const company = scoreContactEntry("tarkshaya labs", { name: "Someone Else", company: "Tarkshaya Labs" });
  assert.ok(company > 0 && company < scoreContactEntry("tarkshaya", { name: "Abhinav Tarkshaya" }));
  // Two letters of a company name is not a reason to call anyone.
  assert.equal(scoreContactEntry("lab", { name: "Someone Else", company: "Lab" }), 0);
});

test("the same person saved twice is one answer, not a question", () => {
  const twice = {
    "ravi kumar": { name: "Ravi Kumar", phone: "+91 90000 00011" },
    "ravi kumar ": { name: "Ravi Kumar ", phone: "+91 90000 00011" },
  };
  assert.equal(findContactBySound("Ravi", twice, {})?.contact?.phone, "+91 90000 00011");
});

test("a name with no number never wins over a name you can call", () => {
  const mixed = {
    "sam a": { name: "Sam A" },
    "sam b": { name: "Sam B", phone: "+91 90000 00012" },
  };
  assert.equal(findContactBySound("Sam", mixed, {})?.contact?.name, "Sam B");
  assert.equal(contactPhone({ phones: [{ label: "Mobile", value: "+91 90000 00013" }] }), "+91 90000 00013");
});

test("contacts are read from the address book itself, with every number", async () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  // Read-only, and the database rather than a minute and a half of AppleScript.
  assert.match(main, /"\/usr\/bin\/sqlite3", \["-readonly"/);
  assert.match(main, /ZABCDRECORD/);
  assert.match(main, /ZABCDPHONENUMBER/);
  assert.match(main, /ZABCDEMAILADDRESS/);
  assert.match(main, /source: "database"/);

  const lift = (start, end = "\n}\n") => {
    const at = main.indexOf(start);
    return main.slice(at, main.indexOf(end, at) + end.length);
  };
  const { preferredContactPhone, tidyPhoneLabel } = Function(`
    ${lift("function preferredContactPhone(phones = []) {")}
    ${lift("function tidyPhoneLabel(label) {")}
    return { preferredContactPhone, tidyPhoneLabel };
  `)();
  assert.equal(tidyPhoneLabel("_$!<Mobile>!$_"), "Mobile");
  // The phone in their pocket, not the fax nobody has answered since 2009.
  assert.equal(preferredContactPhone([{ label: "Work Fax", value: "111" }, { label: "iPhone", value: "222" }]), "222");
  assert.equal(preferredContactPhone([{ label: "", value: "333" }, { label: "old", value: "444" }]), "333");
  assert.equal(preferredContactPhone([]), "");
});

/* A contact saved this morning used to be unknown until the next launch. */
test("a name he does not know sends him back to the address book once", () => {
  const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
  assert.match(main, /if \(Date\.now\(\) - lastContactRefreshAt < 30000\) return false;/);
  const resolve = main.slice(main.indexOf("async function resolveWhatsAppRecipient"), main.indexOf("function normalizeWhatsAppPhone"));
  assert.ok(resolve.indexOf("findContactInCache(") < resolve.indexOf("refreshContactsIfStale("));
  assert.match(resolve, /source: "refresh"/);
  // And the loop can read the address book out loud instead of searching the web.
  assert.match(main, /contact_lookup: \(a\) => lookupContactDetails\(/);
  assert.match(main, /call_start: \(a\) => \{/);
  const catalog = readFileSync(new URL("../supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts", import.meta.url), "utf8");
  assert.match(catalog, /name: "contact_lookup"/);
});
