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

/* ---------- reading what's on screen (Do mode "draft a reply to this") ----------
   Each returns { text, sender, app } or null. Read only; nothing is clicked. */
const SEP = "\u241E"; // a separator no email contains
async function readMail() {
  const out = await osa(`
tell application "Mail"
  set s to selection
  if (count of s) is 0 then return ""
  set m to item 1 of s
  set c to content of m
  if (length of c) > 3000 then set c to text 1 thru 3000 of c
  return (sender of m) & "${SEP}" & (subject of m) & "${SEP}" & c
end tell`, 8000).catch(() => "");
  const [sender, subject, body] = out.split(SEP);
  if (!body || !body.trim()) return null;
  return { app: "Mail", sender: (sender || "").trim(), text: `From: ${sender}\nSubject: ${subject}\n\n${body.trim()}` };
}
/* Chrome's active tab. Throws "javascript" when Allow JavaScript from Apple
   Events is off, so the caller can fall back to copying the selection. */
async function readChrome() {
  let out;
  try {
    out = await osa(`tell application "Google Chrome" to tell active tab of front window to return (URL & "${SEP}" & title & "${SEP}" & (execute javascript "document.body ? document.body.innerText.slice(0, 6000) : ''"))`, 8000);
  } catch (error) {
    const msg = String(error?.message || error);
    if (/javascript|Apple Events|-1723|AppleScript/i.test(msg)) { const e = new Error("javascript off"); e.code = "javascript"; throw e; }
    return null;
  }
  const [url, title, body] = out.split(SEP);
  if (!body || !body.trim()) return null;
  const gmail = /mail\.google\.com/.test(url || "");
  return { app: gmail ? "Gmail" : "Chrome", sender: "", text: `Page: ${title || url}\n\n${body.trim()}` };
}
/* Mail: the reply window is open when the front window's title starts "Re:". */
async function mailReplyOpen() {
  return /^re:/i.test(await osa('tell application "System Events" to tell application process "Mail" to return name of front window', 3000).catch(() => ""));
}
/* Opens Reply on the selected message (never sends). */
async function mailStartReply() {
  const r = await osa(`
tell application "Mail"
  activate
  set s to selection
  if (count of s) is 0 then return "none"
  reply (item 1 of s) with opening window
  return "ok"
end tell`, 8000).catch(() => "failed");
  return r === "ok";
}


/* ---------- fill a whole form in Chrome (2026-10-29) ----------
   Reads the visible fields of the active tab (label, name, autocomplete) and
   tags each with data-maven-i so the fill can find it again. The JS goes in
   base64 so no quote in it can break the AppleScript string. */
const FIELDS_JS = `(()=>{const skip=['hidden','submit','button','checkbox','radio','file','password','image','reset','range','color'];
const txt=(id)=>{const n=document.getElementById(id);return n?n.innerText:''};
const els=[...document.querySelectorAll('input,textarea')].filter(e=>{const t=(e.type||'').toLowerCase();if(skip.includes(t)||e.disabled||e.readOnly)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0});
return JSON.stringify(els.slice(0,60).map((e,i)=>{e.setAttribute('data-maven-i',i);let lab='';
if(e.id){const l=document.querySelector('label[for="'+CSS.escape(e.id)+'"]');if(l)lab=l.innerText}
if(!lab){const l=e.closest('label');if(l)lab=l.innerText}
if(!lab&&e.getAttribute('aria-labelledby'))lab=e.getAttribute('aria-labelledby').split(' ').map(txt).join(' ');
if(!lab)lab=e.getAttribute('aria-label')||'';
if(!lab){const q=e.closest('[role=listitem],[data-params],fieldset,.form-group');if(q){const h=q.querySelector('[role=heading],legend,label');if(h)lab=h.innerText}}
return{i,tag:e.tagName.toLowerCase(),type:(e.type||'').toLowerCase(),name:e.name||'',id:e.id||'',ac:e.autocomplete||'',ph:e.placeholder||'',label:lab.trim().slice(0,90),value:e.value||''}}))})()`;
const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
async function chromeJs(js) {
  const run = `eval(decodeURIComponent(escape(atob('${b64(js)}'))))`;
  try {
    return await osa(`tell application "Google Chrome" to tell active tab of front window to return (execute javascript "${run}")`, 8000);
  } catch (error) {
    const msg = String(error?.message || error);
    if (/javascript|Apple Events|-1723|AppleScript/i.test(msg)) { const e = new Error("javascript off"); e.code = "javascript"; throw e; }
    throw error;
  }
}
async function chromeFormFields() {
  const out = await chromeJs(FIELDS_JS);
  try { return JSON.parse(out || "[]"); } catch (_) { return []; }
}
/* Sets each value the way typing would, so React and Google Forms notice. Never submits. */
async function chromeFillForm(pairs) {
  const js = `(()=>{const p=${JSON.stringify(pairs)};let n=0;for(const [i,v] of Object.entries(p)){const e=document.querySelector('[data-maven-i="'+i+'"]');if(!e)continue;
const d=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),'value');e.focus();if(d&&d.set)d.set.call(e,v);else e.value=v;
e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();n++}return String(n)})()`;
  return Number(await chromeJs(js)) || 0;
}

module.exports = { chromeFormFields, chromeFillForm, findApp, openApp, siteFor, frontApp, activate, pressReturn, addToNote, emailFor, mailto, listApps, readMail, readChrome, mailReplyOpen, mailStartReply };
