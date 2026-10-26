"use strict";
/* WhatsApp for Maven's Do mode: the Mac app first, the minimal reliable path.
   Ported (trimmed) from the send path that was proved out on the Braino Mac app:
   - the person comes from Contacts by name; two people with that name is a
     question ("Which Riya?"), ranked by how much you chat with each, never a guess
   - the deep link opens the chat with the text in the box, then we POLL until
     WhatsApp really has a window (never a blind sleep), re-fire the link once on
     a slow or cold start, and only then press Return.
   Nothing here runs until the person pressed Send in the island. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileP = promisify(execFile);

const WA_DB_PATH = path.join(os.homedir(), "Library", "Group Containers", "group.net.whatsapp.WhatsApp.shared", "ChatStorage.sqlite");
const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const clean = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const osa = (script, timeout = 8000) => execFileP("/usr/bin/osascript", ["-e", script], { timeout }).then((r) => String(r.stdout || "").trim());

/* Everyone in Contacts whose name contains the word(s) said, with a phone. */
async function contactsNamed(query) {
  // Contacts must be running or the query throws -600: launch it hidden first.
  try { await execFileP("/usr/bin/open", ["-gja", "Contacts"], { timeout: 4000 }); await sleep(500); } catch (_) {}
  const out = await osa(`
tell application "Contacts"
  set rows to ""
  repeat with p in (every person whose name contains "${esc(query)}")
    if (count of phones of p) > 0 then set rows to rows & (name of p) & tab & (value of first phone of p) & linefeed
  end repeat
  return rows
end tell`, 10000).catch(() => "");
  const seen = new Set();
  return out.split(/\r?\n/).map((l) => l.split("\t")).filter((r) => r[0] && r[1])
    .map(([name, phone]) => ({ name: name.trim(), phone: phone.trim() }))
    .filter((c) => { const k = c.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

/* How many messages you have with each name (WhatsApp's own database, by chat
   name: @lid chats carry no number). {} when the database can't be read. */
async function chatCounts(names) {
  const out = {};
  if (!fs.existsSync(WA_DB_PATH)) return out;
  try {
    const { stdout } = await execFileP("/usr/bin/sqlite3", ["-readonly", "-json", WA_DB_PATH,
      "SELECT s.ZPARTNERNAME AS name, COUNT(m.Z_PK) AS n FROM ZWACHATSESSION s JOIN ZWAMESSAGE m ON m.ZCHATSESSION = s.Z_PK WHERE s.ZSESSIONTYPE = 0 GROUP BY s.Z_PK;"], { timeout: 6000, maxBuffer: 8 * 1024 * 1024 });
    const rows = String(stdout || "").trim() ? JSON.parse(stdout) : [];
    for (const want of names) out[want] = rows.filter((r) => clean(r.name) === clean(want)).reduce((a, r) => a + (Number(r.n) || 0), 0);
  } catch (_) {}
  return out;
}

/* -> { ok, name, phone } | { ok:false, choices:[{name, phone, chats}] } | { ok:false } */
async function resolve(person) {
  const said = String(person || "").trim();
  if (!said) return { ok: false };
  const digits = said.replace(/[^\d]/g, "");
  if (digits.length >= 10 && digits.length >= said.replace(/\s/g, "").length - 1) return { ok: true, name: said, phone: digits };
  let found = await contactsNamed(said);
  const first = said.split(/\s+/)[0];
  if (!found.length && first !== said && first.length >= 3) found = await contactsNamed(first);
  if (!found.length) return { ok: false };
  if (found.length === 1) return { ok: true, ...found[0] };
  const exact = found.filter((c) => clean(c.name) === clean(said));
  if (exact.length === 1 && clean(said).includes(" ")) return { ok: true, ...exact[0] };
  const counts = await chatCounts(found.map((c) => c.name));
  const choices = found.map((c) => ({ ...c, chats: counts[c.name] || 0 })).sort((a, b) => b.chats - a.chats).slice(0, 3);
  return { ok: false, choices };
}

/* "myself", "me", "my own number", "self" -> WhatsApp's own chat ("Message
   yourself"). Your number from My details, else your Contacts card, else a
   contact lookup by your own name. -> { ok, name, phone } | { ok:false } */
const SELF_WORDS = /^(myself|me|my ?self|my own number|my number|self|my own chat|yourself)$/i;
function isSelf(person) { return SELF_WORDS.test(String(person || "").trim()); }
async function resolveSelf(details = {}) {
  const phone = String(details.phone || "").replace(/[^\d+]/g, "");
  if (phone.replace(/\D/g, "").length >= 10) return { ok: true, name: "You", phone, self: true };
  try { await execFileP("/usr/bin/open", ["-gja", "Contacts"], { timeout: 4000 }); await sleep(400); } catch (_) {}
  const card = await osa(`
tell application "Contacts"
  set p to my card
  if p is missing value then return ""
  if (count of phones of p) is 0 then return (name of p) & tab
  return (name of p) & tab & (value of first phone of p)
end tell`, 8000).catch(() => "");
  const [cardName, cardPhone] = card.split("\t");
  if (cardPhone && cardPhone.replace(/\D/g, "").length >= 10) return { ok: true, name: "You", phone: cardPhone.trim(), self: true };
  const myName = String(details.name || cardName || "").trim();
  if (myName) {
    const found = (await contactsNamed(myName)).filter((c) => clean(c.name) === clean(myName));
    if (found.length === 1) return { ok: true, name: "You", phone: found[0].phone, self: true };
  }
  return { ok: false };
}

function normalizePhone(phone) {
  let d = String(phone || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (/^0\d{10}$/.test(d)) d = d.slice(1);
  if (/^\d{10}$/.test(d)) d = `91${d}`; // a bare 10-digit number is an Indian mobile
  return d;
}

async function isRunning() {
  return /true/.test(await osa('tell application "System Events" to return (exists application process "WhatsApp")', 4000).catch(() => ""));
}
/* True once WhatsApp is really up: the process exists AND it has a window. */
async function waitForWhatsAppReady(maxMs) {
  const probe = 'tell application "System Events"\nif not (exists application process "WhatsApp") then return "no-app"\ntell application process "WhatsApp"\nif (count of windows) is 0 then return "no-window"\nend tell\nend tell\nreturn "ready"';
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (/ready/.test(await osa(probe, 4000).catch(() => ""))) return true;
    await sleep(500);
  }
  return false;
}
function installed() {
  return ["/Applications/WhatsApp.app", path.join(os.homedir(), "Applications", "WhatsApp.app")].some((p) => fs.existsSync(p));
}

/* -> { ok, why } */
async function send({ phone, text, openExternal, log = () => {} }) {
  const number = normalizePhone(phone);
  if (!number || number.length < 10) return { ok: false, why: "bad number" };
  if (!installed()) return { ok: false, why: "no app" };
  const link = `whatsapp://send?phone=${number}&text=${encodeURIComponent(String(text || "").trim())}`;
  const wasRunning = await isRunning();
  await openExternal(link);
  let ready = await waitForWhatsAppReady(wasRunning ? 9000 : 25000);
  if (!ready) { log("whatsapp.open_retry", { wasRunning }); await openExternal(link); ready = await waitForWhatsAppReady(12000); }
  if (!ready) return { ok: false, why: "WhatsApp did not open" };
  if (!wasRunning) await openExternal(link); // links fired during a cold boot are routinely dropped
  await sleep(wasRunning ? 1200 : 2200);
  const r = await osa('tell application "System Events"\nif not (exists application process "WhatsApp") then return "no-app"\ntell application process "WhatsApp"\nset frontmost to true\ndelay 0.25\nkey code 36\nend tell\nreturn "sent"\nend tell', 8000).catch((e) => String(e?.message || e));
  return /sent/.test(r) ? { ok: true } : { ok: false, why: "Return was not pressed" };
}

module.exports = { resolve, resolveSelf, isSelf, send, normalizePhone, waitForWhatsAppReady, installed };
