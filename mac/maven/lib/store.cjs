"use strict";
/* Maven's local data: history (training/dictations.jsonl), corrections, dictionary, snippets.
   Everything lives in userData. No network. */
const fs = require("fs");
const path = require("path");

let base = "";
function init(dir) { base = dir; }
function dataDir() { return base; }
const p = (...parts) => path.join(base, ...parts);
const historyPath = () => p("training", "dictations.jsonl");

function readJson(file, fallback) {
  try { const v = JSON.parse(fs.readFileSync(file, "utf8")); return v ?? fallback; } catch (_) { return fallback; }
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}

/* ---------- history ---------- */
function getHistory() {
  let text = "";
  try { text = fs.readFileSync(historyPath(), "utf8"); } catch (_) { return []; }
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try { const d = JSON.parse(line); if (d && d.at) out.push(d); } catch (_) {}
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}
function countWords(t) { return String(t || "").trim().split(/\s+/).filter(Boolean).length; }
function dayKey(d) { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`; }

function stats(history, now = new Date()) {
  const weekAgo = now.getTime() - 7 * 864e5;
  let total = 0, week = 0, words = 0, spoken = 0;
  const days = new Set();
  for (const d of history) {
    const w = countWords(d.final || d.raw);
    total += w;
    if (new Date(d.at).getTime() >= weekAgo) week += w;
    if (d.spokenSec > 0) { words += w; spoken += d.spokenSec; }
    days.add(dayKey(d.at));
  }
  let streak = 0;
  const cur = new Date(now);
  if (!days.has(dayKey(cur))) cur.setDate(cur.getDate() - 1); // today not done yet keeps yesterday's streak
  while (days.has(dayKey(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
  return { totalWords: total, weekWords: week, wpm: spoken ? Math.round(words / spoken * 60) : 0, streak, dictations: history.length };
}

function deleteHistory() {
  try { fs.rmSync(historyPath(), { force: true }); } catch (_) {}
}

function saveCorrection(c) {
  const row = { at: String(c?.at || ""), raw: String(c?.raw || ""), final: String(c?.final || ""), corrected: String(c?.corrected || "").slice(0, 20000), savedAt: new Date().toISOString() };
  if (!row.corrected.trim()) return false;
  fs.mkdirSync(p("training"), { recursive: true });
  fs.appendFileSync(p("training", "corrections.jsonl"), JSON.stringify(row) + "\n");
  return true;
}

/* Watch the history file (and its folder, since it may not exist yet). */
function watchHistory(onChange) {
  let timer = 0, watcher = null;
  const fire = () => { clearTimeout(timer); timer = setTimeout(() => onChange(getHistory()), 250); };
  try {
    fs.mkdirSync(p("training"), { recursive: true });
    watcher = fs.watch(p("training"), (_e, name) => { if (!name || name === "dictations.jsonl") fire(); });
  } catch (_) {}
  return () => { clearTimeout(timer); try { watcher && watcher.close(); } catch (_) {} };
}

/* ---------- dictionary ---------- */
// [{ word: "Maven", from: "maven" }]  from empty = just a word Maven should know.
function getDictionary() {
  const v = readJson(p("dictionary.json"), []);
  return Array.isArray(v) ? v.filter((e) => e && String(e.word || "").trim()).map((e) => ({ word: String(e.word).trim(), from: String(e.from || "").trim() })) : [];
}
function saveDictionary(list) { writeJson(p("dictionary.json"), (Array.isArray(list) ? list : []).filter((e) => e && String(e.word || "").trim()).map((e) => ({ word: String(e.word).trim().slice(0, 200), from: String(e.from || "").trim().slice(0, 200) }))); return getDictionary(); }

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function applyDictionary(text) {
  let out = String(text || "");
  for (const e of getDictionary()) {
    if (!e.from) continue;
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${esc(e.from)}(?=$|[^\\p{L}\\p{N}_])`, "giu");
    out = out.replace(re, (_m, pre) => pre + e.word);
  }
  return out;
}
function dictionaryHint() { return getDictionary().map((e) => e.word).join(", "); }

/* ---------- snippets ---------- */
// [{ trigger: "my calendar link", text: "https://cal.com/itish" }]
function getSnippets() {
  const v = readJson(p("snippets.json"), []);
  return Array.isArray(v) ? v.filter((e) => e && String(e.trigger || "").trim()).map((e) => ({ trigger: String(e.trigger).trim(), text: String(e.text || "") })) : [];
}
function saveSnippets(list) { writeJson(p("snippets.json"), (Array.isArray(list) ? list : []).filter((e) => e && String(e.trigger || "").trim()).map((e) => ({ trigger: String(e.trigger).trim().slice(0, 200), text: String(e.text || "").slice(0, 20000) }))); return getSnippets(); }
const norm = (t) => String(t || "").trim().replace(/[\s.,!?;:…]+$/u, "").trim().toLowerCase();
function expandSnippet(text) {
  const n = norm(text);
  if (!n) return text;
  const hit = getSnippets().find((s) => norm(s.trigger) === n);
  return hit ? hit.text : text;
}


/* ---------- my details (for "fill in my address") ---------- */
const DETAIL_KEYS = ["name", "email", "phone", "address"];
function getDetails() {
  const v = readJson(p("details.json"), {});
  const out = {};
  for (const k of DETAIL_KEYS) out[k] = String((v && v[k]) || "");
  return out;
}
function saveDetails(d) {
  const out = {};
  for (const k of DETAIL_KEYS) out[k] = String((d && d[k]) || "").trim().slice(0, 2000);
  writeJson(p("details.json"), out);
  return getDetails();
}

/* ---------- memory ("remember Riya is spelled R-I-Y-A") ---------- */
function getMemories() { const v = readJson(p("memories.json"), []); return Array.isArray(v) ? v.filter((m) => m && m.fact) : []; }
function addMemory(fact, word = "") {
  const f = String(fact || "").trim().slice(0, 1000);
  if (!f) return false;
  writeJson(p("memories.json"), [...getMemories(), { fact: f, at: new Date().toISOString() }]);
  const w = String(word || "").trim();
  if (w && !getDictionary().some((e) => e.word.toLowerCase() === w.toLowerCase() && !e.from)) saveDictionary([...getDictionary(), { word: w, from: "" }]);
  return true;
}

/* ---------- settings (language for dictation) ---------- */
const LANGUAGES = ["en", "hi", "hinglish"];
function getSettings() { const v = readJson(p("settings.json"), {}); return v && typeof v === "object" ? v : {}; }
function setSetting(k, v) { const s = getSettings(); s[k] = v; writeJson(p("settings.json"), s); return s; }
function getLanguage() { const l = String(getSettings().language || "en"); return LANGUAGES.includes(l) ? l : "en"; }
function setLanguage(l) { setSetting("language", LANGUAGES.includes(String(l)) ? String(l) : "en"); return getLanguage(); }

/* ---------- the record of every Do command ---------- */
function appendCommand(row) {
  try { fs.mkdirSync(p("training"), { recursive: true }); fs.appendFileSync(p("training", "commands.jsonl"), JSON.stringify(row) + "\n"); } catch (_) {}
}

module.exports = { LANGUAGES, getSettings, setSetting, getLanguage, setLanguage, getDetails, saveDetails, getMemories, addMemory, appendCommand, DETAIL_KEYS, init, dataDir, getHistory, stats, deleteHistory, saveCorrection, watchHistory, getDictionary, saveDictionary, applyDictionary, dictionaryHint, getSnippets, saveSnippets, expandSnippet, countWords };
