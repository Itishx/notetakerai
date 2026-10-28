"use strict";
/* Maven Hub renderer. All user text goes in via textContent. */
const api = window.maven;
const $ = (s) => document.querySelector(s);
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; }

/* ---------- navigation ---------- */
function showPage(id) {
  if (!document.getElementById(id)) return;
  document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x.dataset.page === id));
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("on", p.id === id));
}
document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => showPage(b.dataset.page)));
if (api.onPage) api.onPage((id) => showPage(String(id || "")));

/* ---------- what Maven does (from lib/jobs.cjs, the one list) ---------- */
if (api.getJobs) api.getJobs().then((J) => {
  if (!J) return;
  const box = $("#jobs-list"); box.replaceChildren();
  for (const key of ["write", "do", "not"]) {
    const g = J[key]; if (!g) continue;
    const sec = el("div", `jobs-group g-${key}`);
    const h = el("h2", "subhead", g.title);
    if (g.shortcut) h.append(el("kbd", "", g.shortcut));
    sec.append(h);
    if (g.how) sec.append(el("p", "sub small", g.how));
    const ul = el("ul", "jobs");
    for (const j of g.jobs) {
      const li = el("li");
      if (typeof j === "string") { li.append(el("span", "a", j)); }
      else {
        li.append(el("span", "a", j.job));
        li.append(el("span", "ex", `“${j.example}”${j.example2 ? `  ·  “${j.example2}”` : ""}`));
      }
      ul.append(li);
    }
    sec.append(ul); box.append(sec);
  }
});

/* ---------- home ---------- */
let history = [];
const fmt = (n) => Number(n || 0).toLocaleString();
function dayLabel(d) {
  const x = new Date(d), t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
  if (x.toDateString() === t.toDateString()) return "Today";
  if (x.toDateString() === y.toDateString()) return "Yesterday";
  return x.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}
function renderStats(s) {
  $("#total").textContent = fmt(s.totalWords);
  $("#s-week").textContent = fmt(s.weekWords);
  $("#s-wpm").textContent = fmt(s.wpm);
  $("#s-streak").textContent = fmt(s.streak);
  $("#s-count").textContent = fmt(s.dictations);
}
function item(d) {
  const row = el("div", "item");
  row.append(el("time", "", new Date(d.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })));
  const body = el("div");
  const text = el("div", "text", d.final || d.raw || "");
  text.addEventListener("click", () => row.classList.toggle("open"));
  const meta = el("div", "meta");
  meta.append(el("span", "app", d.app ? `into ${d.app}` : (d.pasted === false ? "copied" : "")));
  const copy = el("button", "link", "Copy");
  copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(d.final || d.raw || ""); copy.textContent = "Copied"; setTimeout(() => (copy.textContent = "Copy"), 1200); } catch (_) {} });
  const wrong = el("button", "link", "Wrong?");
  wrong.addEventListener("click", () => {
    if (body.querySelector(".fix")) return;
    const fix = el("div", "fix");
    const ta = el("textarea"); ta.value = d.final || d.raw || ""; ta.placeholder = "Type what you meant";
    const btns = el("div");
    const save = el("button", "btn primary", "Save correction"), cancel = el("button", "btn", "Cancel");
    save.addEventListener("click", async () => {
      const ok = await api.saveCorrection({ at: d.at, raw: d.raw, final: d.final, corrected: ta.value });
      if (ok) { fix.remove(); wrong.textContent = "Thanks, saved"; }
    });
    cancel.addEventListener("click", () => fix.remove());
    btns.append(save, cancel); fix.append(ta, btns); body.append(fix); ta.focus();
  });
  meta.append(copy, wrong);
  body.append(text, meta); row.append(body);
  return row;
}
function renderHistory() {
  const q = $("#search").value.trim().toLowerCase();
  const list = q ? history.filter((d) => `${d.final || ""} ${d.raw || ""} ${d.app || ""}`.toLowerCase().includes(q)) : history;
  const box = $("#history"); box.replaceChildren();
  if (!list.length) { box.append(el("div", "empty", q ? "Nothing matches that." : "Nothing yet. Press ⌃⌥ and say something.")); return; }
  let last = "";
  for (const d of list.slice(0, 500)) {
    const label = dayLabel(d.at);
    if (label !== last) { box.append(el("div", "day", label)); last = label; }
    box.append(item(d));
  }
}
function onHistory(v) { history = (v && v.items) || []; renderStats((v && v.stats) || {}); renderHistory(); }
$("#search").addEventListener("input", renderHistory);
api.getHistory().then(onHistory);
api.onHistory(onHistory);

/* ---------- editable lists (dictionary, snippets) ---------- */
function listPage({ form, list, get, save, a, b }) {
  let rows = [];
  const render = () => {
    const ul = $(list); ul.replaceChildren();
    if (!rows.length) { ul.append(el("li", "empty", "Nothing here yet.")); return; }
    rows.forEach((r, i) => {
      const li = el("li");
      const view = () => {
        li.replaceChildren(el("span", "a", r[a]), el("span", "b", r[b] ? (a === "word" ? `heard as "${r[b]}"` : r[b]) : ""));
        const edit = el("button", "link", "Edit"), del = el("button", "link danger", "Delete");
        edit.addEventListener("click", () => {
          const ia = el("input"); ia.value = r[a]; const ib = el("input"); ib.value = r[b] || "";
          const ok = el("button", "link", "Save"), no = el("button", "link", "Cancel");
          ok.addEventListener("click", async () => { if (!ia.value.trim()) return; rows[i] = { [a]: ia.value.trim(), [b]: ib.value }; rows = await save(rows); render(); });
          no.addEventListener("click", view);
          li.replaceChildren(ia, ib, ok, no); ia.focus();
        });
        del.addEventListener("click", async () => { rows.splice(i, 1); rows = await save(rows); render(); });
        li.append(edit, del);
      };
      view(); ul.append(li);
    });
  };
  $(form).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, va = f[a].value.trim(), vb = f[b].value.trim();
    if (!va) return;
    rows = await save([...rows, { [a]: va, [b]: vb }]); f.reset(); f[a].focus(); render();
  });
  get().then((v) => { rows = v || []; render(); });
}
listPage({ form: "#dict-form", list: "#dict-list", get: api.getDictionary, save: api.saveDictionary, a: "word", b: "from" });
listPage({ form: "#snip-form", list: "#snip-list", get: api.getSnippets, save: api.saveSnippets, a: "trigger", b: "text" });

/* ---------- settings ---------- */
api.getSettings().then((s) => {
  $("#set-shortcut").textContent = s.shortcut;
  $("#set-do").textContent = s.doShortcut || "fn ⌃";
  $("#set-mic").textContent = s.microphone;
  $("#set-version").textContent = `version ${s.version}`;
  $("#set-login").checked = s.launchAtLogin;
  paintLangs(Array.isArray(s.languages) ? s.languages : [s.language || "auto"]);
  paintTheme(s.islandTheme || "ink");
});
/* Languages: Auto, or any mix of English, Hindi and Hinglish. */
let langs = ["auto"];
function paintLangs(v) {
  langs = v && v.length ? v : ["auto"];
  document.querySelectorAll("#set-langs button").forEach((b) => b.setAttribute("aria-pressed", langs.includes(b.dataset.l)));
}
document.querySelectorAll("#set-langs button").forEach((b) => b.addEventListener("click", () => {
  const l = b.dataset.l;
  let next = l === "auto" ? ["auto"] : langs.filter((x) => x !== "auto");
  if (l !== "auto") next = next.includes(l) ? next.filter((x) => x !== l) : [...next, l];
  if (!next.length) next = ["auto"];
  paintLangs(next); api.setSetting("languages", next);
}));
/* My details */
api.getDetails().then((d) => { const f = $("#details-form"); for (const k of ["name", "email", "phone", "address"]) f[k].value = (d && d[k]) || ""; });
$("#details-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, d = {};
  for (const k of ["name", "email", "phone", "address"]) d[k] = f[k].value;
  await api.saveDetails(d);
  $("#details-status").textContent = "Saved.";
  setTimeout(() => ($("#details-status").textContent = ""), 1500);
});
$("#set-login").addEventListener("change", (e) => api.setSetting("launchAtLogin", e.target.checked));
$("#set-onboard").addEventListener("click", () => api.showOnboarding());
$("#set-data").addEventListener("click", () => api.openDataFolder());
$("#set-delete").addEventListener("click", () => api.deleteHistory());

/* Island theme: Ink (default), Paper, Glass. */
function paintTheme(t) { document.querySelectorAll("#set-theme button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.t === t)); }
document.querySelectorAll("#set-theme button").forEach((b) => b.addEventListener("click", () => { paintTheme(b.dataset.t); api.setSetting("islandTheme", b.dataset.t); }));

/* ---------- Insights (2026-10-28) ---------- */
const LANG_NAMES = { en: "English", hi: "Hindi", hinglish: "Hinglish" };
async function renderInsights() {
  const i = await api.getInsights().catch(() => null);
  if (!i) return;
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
  $("#i-wpm").textContent = fmt(i.wpm);
  $("#i-gauge").setAttribute("stroke-dasharray", `${Math.min(100, Math.round(i.wpm / 2.2))} 100`);
  $("#i-wpm-note").textContent = i.wpm ? `About ${Math.max(1, Math.round(i.wpm / 40 * 10) / 10)}× faster than typing (~40).` : "Typing is about 40.";
  $("#i-cleaned").textContent = fmt(i.cleaned);
  $("#i-dict").textContent = fmt(i.dictations);
  $("#i-cmds").textContent = fmt(i.commandsDone);
  $("#i-total").textContent = fmt(i.total);
  const month = $("#i-month");
  if (i.monthChange != null) { month.hidden = false; month.textContent = `${i.monthChange >= 0 ? "↗ " : "↘ "}${Math.abs(i.monthChange)}% this month`; } else month.hidden = true;
  $("#i-pages").textContent = i.books >= 1 ? `That's ${i.books} books' worth of writing.` : `That's about ${fmt(i.pages)} pages you didn't type.`;
  const langs = $("#i-langs"); langs.textContent = "";
  for (const l of i.languages) { const d = document.createElement("span"); d.style.flex = String(Math.max(1, l.pct)); d.textContent = `${LANG_NAMES[l.k] || l.k} ${l.pct}%`; langs.append(d); }
  $("#i-apps-n").textContent = `${i.topApps.length ? "Top: " + i.topApps[0].k : ""}`;
  const kinds = $("#i-kinds"); kinds.textContent = "";
  for (const k of i.kinds) {
    const r = document.createElement("div"); r.className = "in-kind";
    const bar = document.createElement("span"); bar.className = "in-bar"; const fill = document.createElement("i"); fill.style.width = Math.max(4, k.pct) + "%"; fill.textContent = k.pct + "%"; bar.append(fill);
    const lab = document.createElement("b"); lab.textContent = `${k.n} ${k.k.toLowerCase()}`;
    r.append(bar, lab); kinds.append(r);
  }
  $("#i-streak").textContent = i.streak; $("#i-longest").textContent = i.longest;
  const heat = $("#i-heat"); heat.textContent = "";
  const max = Math.max(1, ...i.heat.map((h) => h.words));
  for (const h of i.heat) { const c = document.createElement("i"); const lv = h.future ? "f" : h.words === 0 ? 0 : Math.min(4, 1 + Math.floor(h.words / max * 3.99)); c.className = "l" + lv; c.title = `${h.day}: ${h.words} words`; heat.append(c); }
}
document.querySelector('[data-page="insights"]')?.addEventListener("click", renderInsights);
api.onHistory?.(() => { if (document.querySelector("#insights.on")) renderInsights(); });

/* Theme slider: Light / Auto / Dark, remembered in Settings. */
function applyTheme(v) {
  const root = document.documentElement;
  if (v === "light" || v === "dark") root.setAttribute("data-theme", v); else root.removeAttribute("data-theme");
  const sl = $("#theme-slider"); sl.dataset.v = v;
  sl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === v));
}
api.getSettings().then((s) => applyTheme(s.appTheme || "system"));
document.querySelectorAll("#theme-slider button").forEach((b) => b.addEventListener("click", () => { applyTheme(b.dataset.v); api.setSetting("appTheme", b.dataset.v); }));
