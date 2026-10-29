/* Maven for Chrome, the brain (2026-10-29).
   The same pipeline as the Mac app: record → transcribe-and-notes → clean up
   with dictation-refine → the safety gate (lib/dictation.cjs, unchanged) →
   write it at your cursor. Do mode asks dictation-refine's intent mode and
   runs the jobs a browser can do. */
importScripts("config.js", "dictation.js", "jobs.js");
const { url: SUPABASE_URL, key: SUPABASE_KEY } = self.MAVEN_CONFIG;
const { assessDictationEdit } = self.MavenGate;

let phase = "idle"; // idle | starting | listening | working
let takeTab = null, takeFrame = 0, takeMode = "write", takeStarted = 0, autoStop = 0, stillTimer = 0;
let pending = null; // the card that is asking: { onYes, tabId, draft, timer }

/* ---------- small helpers ---------- */
const look = async () => ({ layout: "bar", theme: (await chrome.storage.local.get("islandTheme")).islandTheme || "ink" });
/* Our own welcome page is not a content script, so it is reached by runtime message. */
const extTabs = new Set();
/* The pill is in the top page (frame 0); writing goes to the frame you were typing in. */
const FRAME_JOBS = new Set(["insert", "copy", "editable"]);
async function toTab(tabId, msg) {
  if (tabId == null) return null;
  const frameId = FRAME_JOBS.has(msg.t) && tabId === takeTab ? takeFrame : 0;
  try { return extTabs.has(tabId) ? await chrome.runtime.sendMessage({ ...msg, toPage: tabId }) : await chrome.tabs.sendMessage(tabId, msg, { frameId }); } catch (_) { return null; }
}
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
/* One recorder page, opened once: two callers at the same moment share the same opening. */
let offscreenOpening = null;
async function ensureOffscreen() {
  if (offscreenOpening) return offscreenOpening;
  offscreenOpening = openOffscreen().finally(() => { offscreenOpening = null; });
  return offscreenOpening;
}
async function openOffscreen() {
  if (await chrome.offscreen.hasDocument?.()) return;
  try { await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: ["USER_MEDIA"], justification: "Record your voice while you dictate." }); } catch (_) {}
}
async function mic(t, extra = {}) { await ensureOffscreen(); return chrome.runtime.sendMessage({ to: "offscreen", t, ...extra }); }

/* ---------- a take: press to start, press to stop ---------- */
async function toggle(tabId, mode, frameId = 0) {
  if (phase === "listening") { if (tabId === takeTab) return stopTake(false); return; }
  if (phase !== "idle") return;
  if (pending) await endAsk("interrupted by a new take");
  phase = "starting"; takeTab = tabId; takeFrame = frameId; takeMode = mode;
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
  else {
    // No text box: it is on your clipboard, and the words show in the pill (like the Mac's small box).
    await toTab(tabId, { t: "copy", text });
    await ask(tabId, { kind: "reply", title: "Copied. Paste anywhere.", right: "⌘V", preview: text, primary: "Done", foldMs: 9000 }, async () => {});
  }
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
  if (act === "send_message") return sendFlow(tabId, i);
  if (act === "reply" && i.draft === true && !String(i.message || "").trim()) return draftReply(tabId, i);
  if (act === "reply") {
    const message = String(i.message || "").trim();
    if (!message) return reply(tabId, "Again?", "again");
    return ask(tabId, { kind: "reply", title: "Reply here", right: "Written. Send?", preview: message, primary: "Send" }, async (text) => {
      const r = await toTab(tabId, { t: "insert", text });
      await reply(tabId, r && r.ok ? "Written." : "Copied. No box.", r && r.ok ? "done" : "nope");
    });
  }
  if (act === "add_to_list") {
    if (!i.item) return reply(tabId, "Again?", "again");
    const list = String(i.list || "List").replace(/\s+list$/i, "").trim() || "List";
    const { lists = {} } = await chrome.storage.local.get("lists");
    (lists[list] = lists[list] || []).push(String(i.item));
    await chrome.storage.local.set({ lists });
    return reply(tabId, "Added.");
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

/* ---------- send a message: WhatsApp Web, or a Gmail draft (the Mac's sendFlow) ---------- */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function whatsappTab() {
  let [t] = await chrome.tabs.query({ url: "https://web.whatsapp.com/*" });
  if (!t) t = await chrome.tabs.create({ url: "https://web.whatsapp.com", active: false });
  for (let k = 0; k < 40; k++) {
    const r = await chrome.tabs.sendMessage(t.id, { t: "wa-state" }).catch(() => null);
    if (r?.state === "ready") return { tab: t };
    if (r?.state === "login" && k > 4) return { tab: t, login: true };
    await wait(500);
  }
  return { tab: t, login: true };
}
async function sendFlow(tabId, i) {
  const person = String(i.person || "").trim(), message = String(i.message || "").trim();
  if (!person || !message) return reply(tabId, "Again?", "again");
  if (/mail|gmail|email/i.test(String(i.app || ""))) {
    const { memories = [] } = await chrome.storage.local.get("memories");
    const hit = memories.map((m) => String(m.fact || "")).find((f) => f.toLowerCase().includes(person.toLowerCase()) && /@/.test(f));
    const to = hit ? (hit.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [""])[0] : "";
    return ask(tabId, { kind: "send", title: `To ${person}${to ? "" : " (no email saved)"}`, right: "Drafted. Send?", preview: message, primary: "Send" }, async (text) => {
      await show(tabId, "sent", { text: "In Gmail." });
      const u = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(i.subject || "")}&body=${encodeURIComponent(text)}`;
      await chrome.tabs.create({ url: u });
      hide(tabId, 1400);
    });
  }
  await show(tabId, "think", { text: `Finding ${person}…` });
  const wa = await whatsappTab();
  if (wa.login) { await toTab(tabId, { t: "copy", text: message }); chrome.tabs.update(wa.tab.id, { active: true }); return reply(tabId, "Log in to WhatsApp.", "nope", 2600); }
  const found = await chrome.tabs.sendMessage(wa.tab.id, { t: "wa-search", name: person }).catch(() => null);
  const names = found?.names || [];
  const sendCard = (who) => ask(tabId, { kind: "send", title: `To ${who}`, right: "Drafted. Send?", preview: message, primary: "Send" }, async (text) => {
    await chrome.tabs.update(wa.tab.id, { active: true });
    await chrome.windows.update(wa.tab.windowId, { focused: true });
    const r = await chrome.tabs.sendMessage(wa.tab.id, { t: "wa-send", title: who, text }).catch(() => null);
    if (r?.ok && r.sent) { await show(wa.tab.id, "sent", { text: "Sent." }); hide(wa.tab.id, 1500); }
    else { await toTab(wa.tab.id, { t: "copy", text }); await reply(wa.tab.id, "Not sent. Copied.", "nope", 2200); }
  });
  if (!names.length) { await toTab(tabId, { t: "copy", text: message }); return reply(tabId, `Can't find ${person}.`, "nope", 2200); }
  const exact = names.filter((n) => n.toLowerCase() === person.toLowerCase());
  if (names.length === 1 || exact.length === 1) return sendCard(exact[0] || names[0]);
  // Two people with that name is always a question, never a guess.
  const first = person.split(/\s+/)[0];
  return askChoose(tabId, { kind: "choose", title: `Which ${first}?`, right: "Pick one", options: names.map((n) => ({ name: n, meta: "" })) }, (k) => sendCard(names[k] || names[0]));
}

/* ---------- "draft a reply to this": read the page, draft, ask (never sends) ---------- */
async function draftReply(tabId, i) {
  const seen = await toTab(tabId, { t: "read" });
  if (!seen || !String(seen.text || "").trim()) return reply(tabId, "Select it first.", "nope", 2200);
  await show(tabId, "think", { text: "Reading it…" });
  const data = await post("dictation-refine", { mode: "compose", transcript: String(i.subject || i.instruction || "reply"), context: seen.text, instruction: String(i.subject || i.instruction || "").trim() }, 9000);
  const draft = String(data?.formatted || "").trim();
  if (!draft) return reply(tabId, "Again?", "again");
  const who = String(seen.sender || "").replace(/<[^>]*>/g, "").replace(/"/g, "").trim() || "this";
  return ask(tabId, { kind: "reply", title: `Reply to ${who}`, right: "Drafted. Yours?", preview: draft, primary: "Send" }, async (text) => {
    const r = await toTab(tabId, { t: "insert", text }); // never presses send
    await reply(tabId, r && r.ok ? "Drafted. Your call." : "Copied. No box.", r && r.ok ? "done" : "nope", 2000);
  });
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
  pending = { tabId, onYes, draft: String(spec.preview || ""), kind: spec.kind, copied: /^Copied/.test(spec.title || "") };
  await show(tabId, "ask", { card: spec });
  pending.timer = setTimeout(() => void endAsk("folded"), spec.foldMs || 20000);
}
async function askChoose(tabId, spec, onChoose) {
  await ask(tabId, spec, async () => onChoose(0));
  pending.onChoose = onChoose;
}
async function endAsk(why) {
  const job = pending; if (!job) return;
  pending = null; clearTimeout(job.timer);
  if (/folded/.test(why) && job.draft && job.kind !== "help" && !job.copied) { await toTab(job.tabId, { t: "copy", text: job.draft }); await reply(job.tabId, "On your clipboard.", "nope", 1800); }
  else await show(job.tabId, "idle");
}
async function onCard(a) {
  const job = pending; if (!job || !a) return;
  if (a.do === "activity" || a.do === "editing") { clearTimeout(job.timer); job.timer = setTimeout(() => void endAsk("folded"), 20000); return; }
  if (a.do === "cancel") return endAsk("cancelled");
  if (a.do === "choose" && job.onChoose) { pending = null; clearTimeout(job.timer); await job.onChoose(Number(a.choice) || 0); return; }
  if (a.do === "primary") {
    pending = null; clearTimeout(job.timer);
    const text = typeof a.text === "string" && a.text.trim() ? a.text.trim() : job.draft;
    await show(job.tabId, "idle");
    try { await job.onYes(text); } catch (_) { await reply(job.tabId, "Not my job.", "nope"); }
  }
}

/* ---------- "what can you do?": the Mac's own list (lib/jobs.cjs, copied in by build.sh) ---------- */
const JOBS = self.MAVEN_JOBS;

/* ---------- a small local log, like the Mac's commands.jsonl ---------- */
async function log(entry) {
  const { history = [] } = await chrome.storage.local.get("history");
  history.push({ at: new Date().toISOString(), ...entry });
  await chrome.storage.local.set({ history: history.slice(-300) });
}

/* ---------- messages ---------- */
chrome.runtime.onMessage.addListener((m, sender, reply_) => {
  if (!m || m.to === "offscreen" || m.toPage != null) return;
  const tabId = sender.tab?.id;
  if (m.t === "toggle" && tabId != null) void toggle(tabId, m.mode === "do" ? "do" : "write", sender.frameId || 0);
  else if (m.t === "level") { if (phase === "listening") void toTab(takeTab, { t: "level", payload: { v: m.v } }); }
  else if (m.t === "island-action") {
    if (m.action === "cancel" && phase === "listening") void stopTake(true);
    else if (m.action === "done" && phase === "listening") void stopTake(false);
    else if (m.action === "hub") chrome.runtime.openOptionsPage();
  }
  else if (m.t === "card") void onCard(m.a);
  else if (m.t === "hello" && tabId != null && !sender.frameId) { if (m.ext) extTabs.add(tabId); void show(tabId, "idle"); }
});
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
/* Already-open tabs get Maven too, so he is there everywhere straight away. */
async function injectEverywhere() {
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const t of tabs) chrome.scripting.executeScript({ target: { tabId: t.id }, files: ["content.js"] }).catch(() => {});
}
chrome.runtime.onInstalled.addListener((d) => {
  void injectEverywhere();
  if (d.reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
});
chrome.runtime.onStartup.addListener(() => void injectEverywhere());

/* ---------- sign in with Google, through the website (same account as the site) ----------
   The site's /auth/extension page signs you in and sends the session here. */
const AUTH_ORIGIN = "https://affctve.com";
let authTab = null;
chrome.runtime.onMessage.addListener((m) => {
  if (m && m.t === "sign-in") chrome.tabs.create({ url: `${AUTH_ORIGIN}/auth/extension?ext=${chrome.runtime.id}` }, (t) => { authTab = t?.id ?? null; });
  if (m && m.t === "sign-out") chrome.storage.local.remove("account");
});
chrome.runtime.onMessageExternal.addListener((m, sender, reply_) => {
  if (!m || m.action !== "authToken" || !m.token) return;
  const account = { token: m.token, refreshToken: m.refreshToken || "", expiresAt: m.expiresAt || 0, userId: m.userId || "", email: m.email || "", name: m.displayName || "" };
  chrome.storage.local.set({ account }).then(async () => {
    reply_({ ok: true });
    if (authTab != null) { chrome.tabs.remove(authTab).catch(() => {}); authTab = null; }
    const [w] = await chrome.tabs.query({ url: chrome.runtime.getURL("welcome.html") });
    if (w) chrome.tabs.update(w.id, { active: true });
  });
  return true;
});
// A tab closed mid-take: let go of the mic.
chrome.tabs.onRemoved.addListener((id) => { if (id === takeTab && phase === "listening") void stopTake(true); });
