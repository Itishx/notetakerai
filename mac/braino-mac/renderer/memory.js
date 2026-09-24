/* AffectiveOS Memory: the raw day, readable, deletable. Separate from Braino on
   purpose: this is the layer, and Braino will be one of the things that reads
   it once it is right. */
const api = window.brainoMac;
const el = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ICON = { focus: "▣", screen: "≡", tabs: "⧉", playing: "♪", braino: "◉", claude_session: "✦", conversation: "❝", whatsapp: "✉" };
let rows = [];
let paused = false;

function hm(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function mins(sec) {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function describe(r) {
  switch (r.kind) {
    case "focus": return { title: `${r.app || "?"}${r.title ? ` · ${r.title}` : ""}`, meta: r.url || "" };
    case "screen": return { title: `Read the screen in ${r.app || "?"}${r.title ? ` · ${r.title}` : ""}`, meta: `${(r.lines || []).length} lines`, body: (r.lines || []).join("\n") };
    case "tabs": return { title: `${r.count} Chrome tabs open`, meta: (r.tabs || []).slice(0, 6).map((t) => t.title).filter(Boolean).join(" · "), body: (r.tabs || []).map((t) => `${t.title}\n  ${t.url}`).join("\n") };
    case "playing": return { title: `Playing ${r.track}${r.artist ? ` by ${r.artist}` : ""}`, meta: r.source || "" };
    case "braino": return { title: `Task: "${r.heard}"`, meta: `${r.ok ? "✓" : "✗"} ${r.said || ""}` };
    case "conversation": return { title: r.you ? `You (${r.channel}): "${r.you}"` : `Braino said`, meta: r.braino ? `Braino: ${r.braino}` : "" };
    case "whatsapp": return { title: `${r.from} messaged on WhatsApp${r.group ? " (group)" : ""}${r.important ? " ★" : ""}`, meta: r.kind === "text" ? "text kept in WhatsApp, not copied here" : r.kind };
    case "claude_session": return { title: `Claude Code conversation in ${r.project}`, meta: `${r.sizeKb} KB · session ${String(r.session || "").slice(0, 8)}` };
    default: return { title: r.kind, meta: "" };
  }
}

function renderStats() {
  // Time per app, from how long each window stayed in front.
  const perApp = new Map();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.kind !== "focus") continue;
    const next = rows.slice(i + 1).find((x) => x.kind === "focus");
    const sec = next?.prevSec ?? Math.max(0, (Date.now() - new Date(r.t)) / 1000);
    if (sec > 8 * 3600) continue;
    perApp.set(r.app, (perApp.get(r.app) || 0) + sec);
  }
  const top = [...perApp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const count = (k) => rows.filter((r) => r.kind === k).length;
  el("stats").innerHTML = [
    ...top.map(([appName, sec]) => `<div class="stat"><b>${esc(mins(sec))}</b><span>${esc(appName)}</span></div>`),
    `<div class="stat"><b>${count("screen")}</b><span>screens read</span></div>`,
    `<div class="stat"><b>${count("conversation")}</b><span>things said to Braino</span></div>`,
  ].join("") || "";
}

function renderList() {
  const q = el("q").value.toLowerCase().trim();
  const kind = el("kind").value;
  const shown = rows
    .map((r, index) => ({ r, index }))
    .filter(({ r }) => (!kind || r.kind === kind) && (!q || JSON.stringify(r).toLowerCase().includes(q)))
    .reverse();
  el("list").innerHTML = shown.length ? shown.map(({ r, index }) => {
    const d = describe(r);
    return `<div class="row">
      <span class="t">${esc(hm(r.t))}</span><span class="k">${esc(ICON[r.kind] || "·")}</span>
      <span class="b"><div class="ti">${esc(d.title)}</div>${d.meta ? `<div class="mt">${esc(d.meta)}</div>` : ""}
        ${d.body ? `<details><summary>What was saved</summary><pre>${esc(d.body)}</pre></details>` : ""}</span>
      <button class="x" title="Forget this" data-del="${index}">✕</button>
    </div>`;
  }).join("") : `<p class="empty">${rows.length ? "Nothing matches." : "Nothing saved for this day yet."}</p>`;
}

/* The facts already stored (braino_memories), so there is one place to see
   everything remembered, old and new. */
async function loadKnown() {
  const res = await api.dashboardData?.("memory").catch(() => null);
  const facts = res?.ok ? (res.rows || []) : [];
  el("known-count").textContent = facts.length ? `(${facts.length})` : "";
  el("known").innerHTML = facts.length
    ? facts.slice(0, 60).map((f) => `<div class="row"><span class="k">✳</span><span class="b"><div class="ti">${esc(f.content)}</div><div class="mt">${esc(f.category || "")}${f.created_at ? ` · ${esc(new Date(f.created_at).toLocaleDateString())}` : ""}</div></span></div>`).join("")
    : `<p class="empty">No stored facts yet, or you are signed out.</p>`;
}

/* The hour summaries: what the layer decided was worth remembering. */
async function loadDigests() {
  const res = await api.memoryDigests(el("day").value || "");
  const recall = res?.recall !== false;
  el("recall").textContent = `Braino can use this: ${recall ? "On" : "Off"}`;
  el("recall").dataset.on = recall ? "1" : "0";
  const hours = (res?.hours || []).slice().reverse();
  el("digests").innerHTML = hours.length ? hours.map((h) => `<div class="row">
      <span class="t">${esc(h.hour)}:00</span><span class="k">◆</span>
      <span class="b"><div class="ti">${esc(h.summary || "Nothing worth keeping.")}</div>
        ${(h.episodes || []).length ? `<div class="mt">${(h.episodes || []).map((e) => `${esc(e.from)} to ${esc(e.to)} ${esc(e.title)}${e.where ? ` · ${esc(e.where)}` : ""}`).join("<br>")}</div>` : ""}
        ${(h.looseEnds || []).length ? `<div class="mt">Loose ends: ${esc(h.looseEnds.join("; "))}</div>` : ""}
        ${(h.facts || []).length ? `<details><summary>${h.facts.length} fact${h.facts.length > 1 ? "s" : ""} remembered for good</summary><pre>${esc(h.facts.map((f) => `${f.op === "update" ? "updated" : "new"}: ${f.content}`).join("\n"))}</pre></details>` : ""}
      </span></div>`).join("") : `<p class="empty">No summaries yet. The first one appears after a full hour of use, or press "Summarise the last hour".</p>`;
}

async function loadState() {
  const s = await api.activityState();
  paused = Boolean(s?.paused);
  el("state").textContent = paused ? "Paused" : "Recording";
  el("state").className = paused ? "pill off" : "pill";
  el("pause").textContent = paused ? "Resume" : "Pause";
  const days = s?.days || [];
  const sel = el("day");
  const current = sel.value;
  sel.innerHTML = days.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("") || `<option value="">today</option>`;
  if (current && days.includes(current)) sel.value = current;
}

async function loadDay() {
  const res = await api.activityDay(el("day").value || "");
  rows = res?.rows || [];
  renderStats();
  renderList();
}

el("q").addEventListener("input", renderList);
el("recall").addEventListener("click", async () => {
  await api.memoryRecallSwitch(el("recall").dataset.on !== "1");
  await loadDigests();
});
el("digest-now").addEventListener("click", async () => {
  const b = el("digest-now");
  b.disabled = true; b.textContent = "Summarising…";
  try {
    const r = await api.memoryDigestNow();
    if (r && r.ok === false) el("ask-answer").textContent = `Could not summarise: ${r.error || "unknown error"}`;
    if (r?.empty) el("ask-answer").textContent = "Not enough in the last hour to summarise yet.";
  } finally {
    b.disabled = false; b.textContent = "Summarise the last hour";
    await loadDigests();
  }
});
el("ask-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const q = el("ask").value.trim();
  if (!q) return;
  el("ask-answer").textContent = "Looking…";
  const r = await api.memoryAsk(q);
  el("ask-answer").textContent = r?.say || "Nothing came back.";
});
el("kind").addEventListener("change", renderList);
el("day").addEventListener("change", () => { void loadDay(); void loadDigests(); });
el("pause").addEventListener("click", async () => { await api.activityPause(!paused); await loadState(); });
el("delday").addEventListener("click", async () => {
  if (!confirm(`Delete everything saved on ${el("day").value || "this day"}? This cannot be undone.`)) return;
  await api.activityDeleteDay(el("day").value || "");
  await loadState();
  await loadDay();
});
el("list").addEventListener("click", async (event) => {
  const b = event.target.closest("button[data-del]");
  if (!b) return;
  await api.activityDeleteRow(el("day").value || "", Number(b.dataset.del));
  await loadDay();
});

(async () => { await loadState(); await loadDay(); await loadDigests(); await loadKnown(); })();
setInterval(() => { if (!document.hidden && !el("q").value) void loadDay(); }, 15000);
