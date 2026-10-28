/* Maven for Chrome, the brain (2026-10-29).
   The same pipeline as the Mac app: record → transcribe-and-notes → clean up
   with dictation-refine → the safety gate (lib/dictation.cjs, unchanged) →
   write it at your cursor. Do mode asks dictation-refine's intent mode and
   runs the jobs a browser can do. */
importScripts("config.js", "dictation.js");
const { url: SUPABASE_URL, key: SUPABASE_KEY } = self.MAVEN_CONFIG;
const { assessDictationEdit } = self.MavenGate;

let phase = "idle"; // idle | starting | listening | working
let takeTab = null, takeMode = "write", takeStarted = 0, autoStop = 0, stillTimer = 0;
let pending = null; // the card that is asking: { onYes, tabId, draft, timer }

/* ---------- small helpers ---------- */
const look = async () => ({ layout: "bar", theme: (await chrome.storage.local.get("islandTheme")).islandTheme || "ink" });
async function toTab(tabId, msg) { if (tabId == null) return null; try { return await chrome.tabs.sendMessage(tabId, msg); } catch (_) { return null; } }
async function show(tabId, state, extra = {}) { await toTab(tabId, { t: "state", payload: { state, look: await look(), ...extra } }); }
let hideTimer = 0;
function hide(tabId, ms = 0) { clearTimeout(hideTimer); hideTimer = setTimeout(() => void show(tabId, "idle"), ms); }
const HELP_HINT = "Say “what can you do?”";
async function reply(tabId, text, face = "done", ms = 1700) {
  const refused = text === "Not my job.";
  await show(tabId, "reply", { note: text, face, ...(refused ? { hint: HELP_HINT } : {}) });
  hide(tabId, refused ? Math.max(ms, 3000) : ms);
}
async function post(fn, body, timeoutMs = 15000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST", signal: c.signal,
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok ? data : null;
  } catch (_) { return null; } finally { clearTimeout(t); }
}
async function language() { return (await chrome.storage.local.get("language")).language || "auto"; }

/* ---------- the microphone ---------- */
async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument?.()) return;
  try { await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["USER_MEDIA"], justification: "Record your voice while you dictate." }); } catch (_) {}
}
async function mic(t, extra = {}) { await ensureOffscreen(); return chrome.runtime.sendMessage({ to: "offscreen", t, ...extra }); }

/* ---------- a take: press to start, press to stop ---------- */
async function toggle(tabId, mode) {
  if (phase === "listening") { if (tabId === takeTab) return stopTake(false); return; }
  if (phase !== "idle") return;
  if (pending) await endAsk("interrupted by a new take");
  phase = "starting"; takeTab = tabId; takeMode = mode;
  const r = await mic("start").catch((e) => ({ ok: false, error: String(e) }));
  if (!r || !r.ok) {
    phase = "idle";
    await reply(tabId, "Mic is off.", "nope", 2600);
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html#mic") });
    return;
  }
  phase = "listening"; takeStarted = Date.now();
  await show(tabId, "listening", { mode });
  // A take left running by accident: ask at 2 min, stop and only copy at 5.
  clearTimeout(stillTimer); clearTimeout(autoStop);
  stillTimer = setTimeout(() => { if (phase === "listening") void show(takeTab, "note", { note: "Still talking?" }).then(() => setTimeout(() => phase === "listening" && show(takeTab, "listening", { mode: takeMode }), 2500)); }, 120000);
  autoStop = setTimeout(() => { if (phase === "listening") void stopTake(false, true); }, 300000);
}
async function stopTake(discard, longTake = false) {
  clearTimeout(stillTimer); clearTimeout(autoStop);
  const tabId = takeTab, mode = takeMode;
  phase = "working";
  const audio = await mic("stop", { discard }).catch(() => null);
  if (discard || !audio || !audio.audioBase64) { phase = "idle"; await show(tabId, "idle"); return; }
  if (audio.ms < 350) { phase = "idle"; await reply(tabId, "Again?", "again"); return; }
  if (mode === "do") await show(tabId, "think", { text: "Listening back…" });
  else await show(tabId, "thinking");
  const t0 = Date.now();
  const heard = await post("transcribe-and-notes", { mode: "lecture", audioBase64: audio.audioBase64, fileName: "maven.webm", mimeType: audio.mimeType, transcriptOnly: true, dictation: true, language: await language() }, 30000);
  const raw = collapseRepeats(String(heard?.transcript || "").trim());
  if (!raw) { phase = "idle"; await reply(tabId, "Again?", "again"); return; }
  try {
    if (mode === "do") await runDo(tabId, raw);
    else await write(tabId, raw, longTake);
  } catch (e) { await reply(tabId, "Not my job.", "nope"); }
  phase = "idle";
  log({ mode, heard: raw, ms: Date.now() - t0, spokenSec: +(audio.ms / 1000).toFixed(1) });
}

/* ---------- Write ---------- */
function collapseRepeats(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const norm = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const out = []; let i = 0;
  while (i < words.length) {
    let done = false;
    for (let n = 3; n >= 1 && !done; n--) {
      const chunk = words.slice(i, i + n).map(norm).join(" ");
      if (!chunk) continue;
      let reps = 1;
      while (words.slice(i + reps * n, i + (reps + 1) * n).map(norm).join(" ") === chunk) reps++;
      if (reps >= 3) { out.push(...words.slice(i + (reps - 1) * n, i + reps * n)); i += reps * n; done = true; }
    }
    if (!done) { out.push(words[i]); i++; }
  }
  return out.join(" ");
}
function scriptSafe(raw, cand) {
  const c = String(cand || ""), r = String(raw || "");
  if (!c || /[ऀ-ॿ]/.test(c)) return false;
  const ratio = c.length / Math.max(1, r.length);
  if (ratio < 0.5 || ratio > 1.9) return false;
  return (r.match(/\d+/g) || []).every((d) => c.includes(d));
}
async function refine(raw) {
  const lang = await language();
  const convert = lang !== "hi" && /[ऀ-ॿ]/.test(raw); // Hinglish written in Devanagari: back to Roman letters
  const data = await post("dictation-refine", { transcript: convert ? "[lang: hinglish] " + raw : raw, language: lang }, 6000);
  const cand = String(data?.formatted || "").trim();
  if (!cand) return null;
  const ok = convert ? scriptSafe(raw, cand) : assessDictationEdit(raw, cand).accepted;
  return ok ? cand : null;
}
async function write(tabId, raw, longTake) {
  const text = (await refine(raw)) || raw;
  if (longTake) { await toTab(tabId, { t: "copy", text }); await reply(tabId, "On your clipboard.", "nope", 2200); return; }
  const r = await toTab(tabId, { t: "insert", text });
  if (r && r.ok) { await show(tabId, "done"); hide(tabId, 900); }
  else await reply(tabId, "Copied. No box.", "nope", 2000);
  await countWords(text);
}
async function countWords(text) {
  const n = String(text).split(/\s+/).filter(Boolean).length;
  const { words = 0 } = await chrome.storage.local.get("words");
  await chrome.storage.local.set({ words: words + n });
}

/* ---------- Do ---------- */
const FORM_ASK = /\b(fill|feel|bhar|bharo|bhar do)\b.{0,25}\b(form|फॉर्म)\b|\bform\b.{0,12}\b(bhar|fill)|फॉर्म.{0,12}भर/i;
const SITES = { youtube: "https://www.youtube.com", gmail: "https://mail.google.com", "google mail": "https://mail.google.com", whatsapp: "https://web.whatsapp.com", slack: "https://app.slack.com", "google docs": "https://docs.google.com", docs: "https://docs.google.com", "google drive": "https://drive.google.com", drive: "https://drive.google.com", calendar: "https://calendar.google.com", "google calendar": "https://calendar.google.com", linkedin: "https://www.linkedin.com", twitter: "https://x.com", x: "https://x.com", instagram: "https://www.instagram.com", spotify: "https://open.spotify.com", netflix: "https://www.netflix.com", amazon: "https://www.amazon.in", github: "https://github.com", chatgpt: "https://chatgpt.com", claude: "https://claude.ai", notion: "https://www.notion.so", figma: "https://www.figma.com", maps: "https://maps.google.com", "google maps": "https://maps.google.com", reddit: "https://www.reddit.com", google: "https://www.google.com" };
function siteFor(name, url) {
  if (url && /^https?:\/\//.test(url)) return url;
  const k = String(name || "").toLowerCase().replace(/\.(com|in|org)$/, "").trim();
  if (SITES[k]) return SITES[k];
  if (/^[a-z0-9-]+\.[a-z.]+$/.test(String(name || "").trim())) return "https://" + String(name).trim();
  return null;
}
async function findTab(name) {
  const q = String(name || "").toLowerCase().trim(); if (!q) return null;
  const site = siteFor(name, "");
  const host = site ? new URL(site).hostname.replace(/^www\./, "") : "";
  const tabs = await chrome.tabs.query({});
  return tabs.find((t) => host && (t.url || "").includes(host)) || tabs.find((t) => (t.title || "").toLowerCase().includes(q)) || null;
}
async function runDo(tabId, raw) {
  await show(tabId, "think", { text: raw.length > 46 ? raw.slice(0, 44).trimEnd() + "…" : raw });
  if (raw.split(/\s+/).length <= 12 && FORM_ASK.test(raw)) return fillForm(tabId);
  const data = await post("dictation-refine", { mode: "intent", transcript: raw, language: await language() }, 8000);
  const i = data?.intent;
  if (!i || !i.action) return reply(tabId, "Again?", "again");
  const act = i.action;
  if (act === "fill" && !i.detail) return fillForm(tabId);
  if (act === "open_url" || act === "open_app") {
    const site = siteFor(i.app, i.url);
    if (!site) return reply(tabId, `Can't open ${i.app || "that"}.`, "nope");
    await chrome.tabs.create({ url: site });
    return reply(tabId, i.reply3 || "Open.");
  }
  if (act === "switch_app") {
    const t = await findTab(i.app);
    if (t) { await chrome.tabs.update(t.id, { active: true }); await chrome.windows.update(t.windowId, { focused: true }); return reply(t.id, "There."); }
    const site = siteFor(i.app, i.url);
    if (site) { await chrome.tabs.create({ url: site }); return reply(tabId, `${i.app}. Open.`); }
    return reply(tabId, `Can't find ${i.app || "that"}.`, "nope");
  }
  if (act === "fill") {
    const d = await details();
    const v = String(d[i.detail] || "").trim();
    if (!v) return reply(tabId, `No ${i.detail} saved.`, "nope", 2200);
    const r = await toTab(tabId, { t: "insert", text: v });
    return reply(tabId, r && r.ok ? "Filled. Your call." : "Copied. No box.", r && r.ok ? "done" : "nope", 2000);
  }
  if (act === "reply" || act === "send_message") {
    const message = String(i.message || "").trim();
    if (!message) return reply(tabId, "Again?", "again");
    return ask(tabId, { kind: "reply", title: i.person ? `To ${i.person}` : "Reply here", right: "Written. Write it?", preview: message, primary: "Write" }, async (text) => {
      const r = await toTab(tabId, { t: "insert", text });
      await reply(tabId, r && r.ok ? "Written." : "Copied. No box.", r && r.ok ? "done" : "nope");
    });
  }
  if (act === "remember") {
    const { memories = [] } = await chrome.storage.local.get("memories");
    if (!i.fact) return reply(tabId, "Again?", "again");
    memories.push({ fact: i.fact, word: i.word || "", at: Date.now() });
    await chrome.storage.local.set({ memories });
    return reply(tabId, "Got it.");
  }
  if (act === "help") {
    return ask(tabId, { kind: "help", title: "What I can do", right: "My jobs.", jobs: JOBS, primary: "Settings", foldMs: 12000 }, async () => { await show(tabId, "idle"); chrome.runtime.openOptionsPage(); });
  }
  if (act === "add_to_list") return reply(tabId, "Mac app only.", "nope", 2200);
  // Said in Do, meant for Write: offer to write it.
  const again = /again/i.test(String(i.reply3 || ""));
  if (!again && raw.split(/\s+/).length >= 6) {
    const cleaned = (await refine(raw)) || raw;
    return ask(tabId, { kind: "reply", title: "Meant to write this?", right: "Write it?", preview: cleaned, primary: "Write" }, async (text) => {
      const r = await toTab(tabId, { t: "insert", text });
      await reply(tabId, r && r.ok ? "Written." : "On your clipboard.", r && r.ok ? "done" : "nope");
    });
  }
  return reply(tabId, again ? "Again?" : "Not my job.", again ? "again" : "nope");
}
async function fillForm(tabId) {
  const d = await details();
  if (!d.name && !d.email && !d.phone && !d.address) { await reply(tabId, "Save your details first.", "nope", 2600); chrome.runtime.openOptionsPage(); return; }
  const r = await toTab(tabId, { t: "fill", details: d });
  if (!r || !r.fields) return reply(tabId, "No form here.", "nope", 2000);
  if (!r.filled) return reply(tabId, "Nothing I know.", "nope", 2200);
  return reply(tabId, `Filled ${r.filled}. Your call.`, "done", 2200);
}
async function details() { return (await chrome.storage.local.get("details")).details || {}; }

/* ---------- the card asking ---------- */
async function ask(tabId, spec, onYes) {
  if (pending) clearTimeout(pending.timer);
  pending = { tabId, onYes, draft: String(spec.preview || ""), kind: spec.kind };
  await show(tabId, "ask", { card: spec });
  pending.timer = setTimeout(() => void endAsk("folded"), spec.foldMs || 20000);
}
async function endAsk(why) {
  const job = pending; if (!job) return;
  pending = null; clearTimeout(job.timer);
  if (/folded/.test(why) && job.draft && job.kind !== "help") { await toTab(job.tabId, { t: "copy", text: job.draft }); await reply(job.tabId, "On your clipboard.", "nope", 1800); }
  else await show(job.tabId, "idle");
}
async function onCard(a) {
  const job = pending; if (!job || !a) return;
  if (a.do === "activity" || a.do === "editing") { clearTimeout(job.timer); job.timer = setTimeout(() => void endAsk("folded"), 20000); return; }
  if (a.do === "cancel") return endAsk("cancelled");
  if (a.do === "primary") {
    pending = null; clearTimeout(job.timer);
    const text = typeof a.text === "string" && a.text.trim() ? a.text.trim() : job.draft;
    await show(job.tabId, "idle");
    try { await job.onYes(text); } catch (_) { await reply(job.tabId, "Not my job.", "nope"); }
  }
}

/* ---------- jobs list for "what can you do?" (the Mac list, Chrome's share) ---------- */
const JOBS = {
  write: { title: "Write", shortcut: "⌃⌥", how: "Control+Option, press to start, press again to stop", jobs: [
    { job: "Type anything, cleaned up", example: "the deck is done numbers by five no wait six" },
    { job: "Lists, ₹, numbers, emails", short: "Lists, ₹, numbers, emails", example: "the budget is twenty five thousand" },
  ] },
  do: { title: "Do", shortcut: "⌃⌘", how: "Control+Command, press to start, press again to stop", jobs: [
    { job: "Open a site", example: "open YouTube" },
    { job: "Go to a tab", example: "go to my Gmail tab" },
    { job: "Fill this form", example: "fill this form for me" },
    { job: "Write a reply", example: "reply, Friday works" },
    { job: "Remember something", example: "remember Riya is R-I-Y-A" },
  ] },
};

/* ---------- a small local log, like the Mac's commands.jsonl ---------- */
async function log(entry) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.push({ at: new Date().toISOString(), ...entry });
  await chrome.storage.local.set({ history: history.slice(-300) });
}

/* ---------- messages ---------- */
chrome.runtime.onMessage.addListener((m, sender, reply_) => {
  if (!m || m.to === "offscreen") return;
  const tabId = sender.tab?.id;
  if (m.t === "toggle" && tabId != null) void toggle(tabId, m.mode === "do" ? "do" : "write");
  else if (m.t === "level") { if (phase === "listening") void toTab(takeTab, { t: "level", payload: { v: m.v } }); }
  else if (m.t === "island-action") {
    if (m.action === "cancel" && phase === "listening") void stopTake(true);
    else if (m.action === "done" && phase === "listening") void stopTake(false);
    else if (m.action === "hub") chrome.runtime.openOptionsPage();
  }
  else if (m.t === "card") void onCard(m.a);
  else if (m.t === "hello" && tabId != null) void show(tabId, "idle");
});
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.runtime.onInstalled.addListener((d) => { if (d.reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") }); });
// A tab closed mid-take: let go of the mic.
chrome.tabs.onRemoved.addListener((id) => { if (id === takeTab && phase === "listening") void stopTake(true); });
