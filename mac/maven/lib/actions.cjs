"use strict";
/* Maven's Do mode, the hands: each function is one step on this Mac.
   Nothing that sends or fills lives here without the island's yes (main.cjs
   asks first); these only open, find and append. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileP = promisify(execFile);

const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const osa = (script, timeout = 8000) => execFileP("/usr/bin/osascript", ["-e", script], { timeout }).then((r) => String(r.stdout || "").trim());
const squash = (s) => String(s || "").toLowerCase().replace(/\.app$/, "").replace(/[^a-z0-9]/g, "");

/* ---------- apps ---------- */
const APP_DIRS = ["/Applications", "/System/Applications", "/System/Applications/Utilities", "/Applications/Utilities", path.join(os.homedir(), "Applications"), "/System/Library/CoreServices"];
const APP_ALIASES = { chrome: "Google Chrome", vscode: "Visual Studio Code", code: "Visual Studio Code", settings: "System Settings", systempreferences: "System Settings", terminal: "Terminal", mail: "Mail", messages: "Messages", imessage: "Messages", word: "Microsoft Word", excel: "Microsoft Excel", powerpoint: "Microsoft PowerPoint", teams: "Microsoft Teams", appstore: "App Store" };
let appCache = null, appCacheAt = 0;
function listApps() {
  if (appCache && Date.now() - appCacheAt < 60000) return appCache;
  const out = [];
  for (const dir of APP_DIRS) {
    try { for (const f of fs.readdirSync(dir)) if (f.endsWith(".app")) out.push({ name: f.slice(0, -4), path: path.join(dir, f) }); } catch (_) {}
  }
  appCache = out; appCacheAt = Date.now();
  return out;
}
/* "slack" -> Slack, "chrome" -> Google Chrome, "whats app" -> WhatsApp. null when nothing is close. */
function findApp(name) {
  const want = squash(APP_ALIASES[squash(name)] || name);
  if (!want) return null;
  const apps = listApps();
  return apps.find((a) => squash(a.name) === want)
    || apps.find((a) => squash(a.name).startsWith(want) && want.length >= 3)
    || apps.find((a) => want.length >= 4 && squash(a.name).includes(want))
    || apps.find((a) => want.length >= 4 && a.name.split(/\s+/).some((w) => squash(w) === want))
    || null;
}
async function openApp(app) { await execFileP("/usr/bin/open", ["-a", app.path], { timeout: 8000 }); }

/* ---------- websites ---------- */
const SITES = {
  youtube: "https://www.youtube.com", gmail: "https://mail.google.com", googlemail: "https://mail.google.com", notion: "https://www.notion.so",
  twitter: "https://x.com", x: "https://x.com", linkedin: "https://www.linkedin.com", github: "https://github.com", google: "https://www.google.com",
  googledocs: "https://docs.google.com", docs: "https://docs.google.com", googlesheets: "https://sheets.google.com", sheets: "https://sheets.google.com",
  googledrive: "https://drive.google.com", drive: "https://drive.google.com", googlecalendar: "https://calendar.google.com", calendar: "https://calendar.google.com",
  googlemaps: "https://maps.google.com", maps: "https://maps.google.com", instagram: "https://www.instagram.com", facebook: "https://www.facebook.com",
  reddit: "https://www.reddit.com", netflix: "https://www.netflix.com", amazon: "https://www.amazon.in", chatgpt: "https://chatgpt.com", claude: "https://claude.ai",
  figma: "https://www.figma.com", canva: "https://www.canva.com", whatsappweb: "https://web.whatsapp.com", spotify: "https://open.spotify.com",
  hotstar: "https://www.hotstar.com", primevideo: "https://www.primevideo.com", wikipedia: "https://www.wikipedia.org", medium: "https://medium.com",
};
const SITE_NAMES = { youtube: "YouTube", gmail: "Gmail", linkedin: "LinkedIn", github: "GitHub", x: "X", twitter: "X", chatgpt: "ChatGPT" };
function siteFor(name, url) {
  const key = squash(name);
  const u = String(url || "").trim();
  const known = SITES[key];
  const href = known || (/^https?:\/\/[^\s]+$/i.test(u) ? u : key ? `https://${key}.com` : "");
  const label = SITE_NAMES[key] || String(name || "").trim().replace(/\b\w/g, (c) => c.toUpperCase()) || (href ? new URL(href).hostname.replace(/^www\./, "") : "");
  return href ? { href, label } : null;
}

/* ---------- the front app (to give focus back after the island asks) ---------- */
async function frontApp() {
  return osa('tell application "System Events" to return name of first application process whose frontmost is true', 3000).catch(() => "");
}
async function activate(name) {
  if (!name) return;
  await osa(`tell application "${esc(name)}" to activate`, 3000).catch(() => {});
}
async function pressReturn() { await osa('tell application "System Events" to key code 36', 3000).catch(() => {}); }

/* ---------- Apple Notes list ---------- */
const html = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
async function addToNote(list, item) {
  const title = String(list || "").trim() || "List";
  const line = `<div>- ${html(String(item || "").trim())}</div>`;
  const r = await osa(`
tell application "Notes"
  set hits to (every note whose name is "${esc(title)}")
  if (count of hits) is 0 then
    make new note with properties {name:"${esc(title)}", body:"<h1>${esc(html(title))}</h1>${esc(line)}"}
    return "created"
  else
    set n to item 1 of hits
    set body of n to (body of n) & "${esc(line)}"
    return "added"
  end if
end tell`, 12000);
  return r;
}

/* ---------- Mail: an address for the person, from Contacts ---------- */
async function emailFor(person) {
  const said = String(person || "").trim();
  if (/^\S+@\S+\.\S+$/.test(said)) return said;
  if (!said) return "";
  try { await execFileP("/usr/bin/open", ["-gja", "Contacts"], { timeout: 4000 }); } catch (_) {}
  return osa(`
tell application "Contacts"
  repeat with p in (every person whose name contains "${esc(said)}")
    if (count of emails of p) > 0 then return value of first email of p
  end repeat
  return ""
end tell`, 8000).catch(() => "");
}
function mailto(to, subject, body) {
  const q = [];
  if (subject) q.push(`subject=${encodeURIComponent(subject)}`);
  if (body) q.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${encodeURIComponent(to || "").replace(/%40/g, "@")}${q.length ? "?" + q.join("&") : ""}`;
}

module.exports = { findApp, openApp, siteFor, frontApp, activate, pressReturn, addToNote, emailFor, mailto, listApps };
