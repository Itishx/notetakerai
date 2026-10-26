"use strict";
/* Maven Hub renderer. All user text goes in via textContent. */
const api = window.maven;
const $ = (s) => document.querySelector(s);
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; }

/* ---------- navigation ---------- */
document.querySelectorAll("nav button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("on", p.id === b.dataset.page));
}));

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
  $("#set-mic").textContent = s.microphone;
  $("#set-version").textContent = `version ${s.version}`;
  $("#set-login").checked = s.launchAtLogin;
});
$("#set-login").addEventListener("change", (e) => api.setSetting("launchAtLogin", e.target.checked));
$("#set-onboard").addEventListener("click", () => api.showOnboarding());
$("#set-data").addEventListener("click", () => api.openDataFolder());
$("#set-delete").addEventListener("click", () => api.deleteHistory());
