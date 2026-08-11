/* Braino for Mac — dashboard window.
   Reads real state from the main process every few seconds. Nothing here is
   estimated or filled in: if a number is not something the app actually
   recorded, the row says so instead of inventing a figure. */

const api = window.brainoMac || {};
const el = (id) => document.getElementById(id);

const SHORTCUTS = [
  ["Option Option", "BrainoHERA", "Dictate into whatever field the caret is in."],
  ["Control Control", "Voice", "Talk to Braino and hear him answer."],
  ["Option Option Option", "Jarvis", "Full-screen, voice-first takeover."],
  ["Shift Shift", "Roam", "Braino leaves the bar and walks your screen."],
  ["Command Space", "Summon", "Bring Braino to the front."],
  ["Command Shift H", "Her mode", "Samantha takes the Mac."],
  ["Command Shift D", "This window", "Open the Braino dashboard."],
];

/* Starters, not a fixed menu — these are things the Mac side genuinely does
   today, taken from the skills list in main.cjs. */
const SUGGESTIONS = [
  "organize my desktop",
  "find my pitch deck",
  "what can you do on my mac",
  "play something focused",
  "make a note about today",
];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function n(value) {
  return Number(value || 0).toLocaleString();
}

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 5) return "Still up.";
  if (hour < 12) return "Good morning.";
  if (hour < 17) return "Good afternoon.";
  if (hour < 22) return "Good evening.";
  return "Late one.";
}

function ago(iso) {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function rows(target, entries) {
  el(target).innerHTML = entries
    .map(([term, value, mono]) => `<div class="bd-field"><dt>${esc(term)}</dt><dd${mono ? ' class="bd-mono"' : ""}>${esc(value)}</dd></div>`)
    .join("");
}

function stats(target, entries) {
  el(target).innerHTML = entries
    .map(([value, label]) => `<div class="bd-st"><div class="bd-v">${esc(value)}</div><div class="bd-l">${esc(label)}</div></div>`)
    .join("");
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function chart(series) {
  const peak = Math.max(1, ...series.map((day) => day.sessions));
  const host = el("chart");
  host.textContent = "";
  const today = new Date().toDateString();
  series.forEach((day) => {
    const date = new Date(`${day.date}T00:00:00`);
    const column = document.createElement("div");
    column.className = date.toDateString() === today ? "bd-col today" : "bd-col";
    column.title = `${day.date} · ${day.sessions} session${day.sessions === 1 ? "" : "s"}`;

    const bar = document.createElement("i");
    bar.className = day.sessions ? "bd-bar" : "bd-bar empty";
    // Set through the CSSOM, never as a style attribute: the window runs under a
    // strict CSP with no 'unsafe-inline', which would drop the attribute and
    // leave every bar flat.
    bar.style.height = day.sessions ? `${Math.max(7, Math.round((day.sessions / peak) * 100))}%` : "3px";

    const label = document.createElement("small");
    label.textContent = DAY_INITIALS[date.getDay()];

    column.appendChild(bar);
    column.appendChild(label);
    host.appendChild(column);
  });
}

function permissionPill(state) {
  if (state === "granted" || state === true) return '<span class="bd-tag ok">Granted</span>';
  if (state === "denied" || state === false) return '<span class="bd-tag bad">Not granted</span>';
  return '<span class="bd-tag">Unknown</span>';
}

function renderPermissions(permissions) {
  el("perms").innerHTML = `
    <div class="bd-perm">
      <div>
        <h3>Accessibility</h3>
        <p>Lets Braino read the focused text field and type into it. Without it, BrainoHERA cannot place your words at the caret and falls back to the Notch and clipboard.</p>
      </div>
      <div>
        ${permissionPill(permissions.accessibility)}
        <button class="bd-btn" data-act="accessibility">Request</button>
      </div>
    </div>
    <div class="bd-perm">
      <div>
        <h3>Microphone</h3>
        <p>Needed for dictation, voice and the wake word. Braino never opens the mic on its own — a mode you started has to be running.</p>
      </div>
      <div>
        ${permissionPill(permissions.microphone)}
        <button class="bd-btn" data-act="microphone">Request</button>
      </div>
    </div>`;
}

function render(state) {
  lastState = state;
  el("version").textContent = `v${state.appVersion || "?"}`;
  el("greeting").textContent = greetingFor(new Date());

  const name = state.auth?.displayName || state.auth?.email;
  el("side-who").textContent = state.auth?.authenticated ? (name || "Signed in") : "Signed out";
  el("side-plan").textContent = state.auth?.authenticated ? "Braino for Mac" : "Not signed in";
  el("avatar").textContent = (name || "B").trim().charAt(0).toUpperCase();
  el("lede").textContent = state.auth?.authenticated
    ? `${name ? `Signed in as ${name}. ` : ""}Braino is in your notch, listening for a double Option.`
    : "Braino is running, but not signed in yet. Voice and delegate need an account.";

  const s = state.stats || {};
  stats("stats", [
    [n(s.dictationSessions), "Dictation sessions", "since you installed Braino"],
    [n(s.dictationInserts), "Insertions at the caret"],
    [n(s.dictationChars), "Characters typed for you"],
    [ago(s.lastUsedAt), "Last used"],
  ]);

  chart(state.series || []);

  const d = state.dictation || {};
  rows("now", [
    ["BrainoHERA", d.active ? "Listening" : "Idle"],
    ["Wake word", state.wakeWord ? "Armed" : "Off"],
    ["Accessibility", state.permissions?.accessibility ? "Granted" : "Not granted"],
    ["Microphone", state.permissions?.microphone || "unknown"],
    ["Account", state.auth?.authenticated ? "Signed in" : "Signed out"],
  ]);

  stats("hera-stats", [
    [n(s.dictationSessions), "Sessions"],
    [n(s.dictationInserts), "Insertions"],
    [n(s.dictationFallbacks), "Fell back to the Notch", "no editable field was focused"],
  ]);

  rows("hera-now", [
    ["State", d.active ? "Listening" : "Idle"],
    ["Target app", d.targetApp || "—"],
    ["Insertion mode", d.insertionMode || "—"],
    ["Focus status", d.focusStatus || "—"],
    ["Insertions this session", n(d.insertions)],
    ["Fallbacks this session", n(d.fallbacks)],
  ]);

  renderPermissions(state.permissions || {});

  el("keys").innerHTML = SHORTCUTS.map(([keys, mode, what]) => `
    <div class="bd-row">
      <span class="bd-ic">⌘</span>
      <span class="bd-bd">
        <span class="bd-ti">${esc(mode)}</span>
        <span class="bd-mt"><span class="bd-s">${esc(what)}</span></span>
      </span>
      <span class="bd-tm">${esc(keys)}</span>
    </div>`).join("");

  rows("account", [
    ["Status", state.auth?.authenticated ? "Signed in" : "Signed out"],
    ["Name", state.auth?.displayName || "—"],
    ["Email", state.auth?.email || "—"],
    ["Session source", state.auth?.source || "—"],
  ]);

  void updateCounts();

  rows("paths", [
    ["App version", state.appVersion || "—"],
    ["Log file", state.paths?.log || "—", true],
    ["Usage stats", state.paths?.usage || "—", true],
  ]);
}

/* The counts beside each nav row. Fetched once and cached, so switching
   sections does not re-pull four tables every four seconds. */
let countsLoadedAt = 0;

async function updateCounts() {
  if (!api.dashboardData || Date.now() - countsLoadedAt < 60000) return;
  countsLoadedAt = Date.now();
  const keys = { notes: "notes", memory: "memory", voice: "voice", modes: "modes", xauto: "xauto", high: "high" };
  await Promise.all(Object.entries(keys).map(async ([id, source]) => {
    const target = el(`ct-${id}`);
    if (!target) return;
    const result = await api.dashboardData(source).catch(() => null);
    target.textContent = result?.ok && result.rows.length ? String(result.rows.length) : "";
  }));
  const tasksCount = el("ct-tasks");
  if (tasksCount) tasksCount.textContent = taskHistory.length ? String(taskHistory.length) : "";
}

async function refresh() {
  if (!api.dashboardState) return;
  try {
    render(await api.dashboardState());
  } catch (error) {
    console.error("dashboard state failed", error);
  }
}

/* ── Left column navigation ──
   Data sections are fetched the first time you open them, then refreshed on
   every visit, so the window does not pull four tables on launch. */
const LOADERS = {
  memory: () => loadFeed("memory", "memory-list", memoryCard, "Braino has not remembered anything yet. He picks facts up as you work."),
  notes: () => loadFeed("notes", "notes-list", noteCard, "No notes yet. Anything you capture on the web shows up here."),
  voice: () => loadVoiceCommands(),
  modes: () => loadFeed("modes", "modes-list", modeCard, "No voice modes yet."),
  tasks: () => renderTasks(),
  xauto: () => loadXAuto(),
  high: () => loadFeed("high", "high-list", noteCard, "No highlights yet. Anything Braino marks as worth keeping shows up here."),
  search: () => { el("search-input").focus(); },
  settings: () => renderSettings(),
};

const xautoCard = (row) => card({
  icon: row.status === "posted" ? "✓" : "→",
  tone: row.status === "posted" ? "ok" : row.status === "failed" ? "bad" : "",
  title: row.content || "—",
  tags: [row.status],
  time: row.scheduled_at ? new Date(row.scheduled_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "",
});

async function loadXAuto() {
  const result = await api.dashboardData?.("xauto");
  const rows = result?.ok ? result.rows : [];
  const counts = rows.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  stats("xauto-stats", [
    [n(rows.length), "Scheduled posts"],
    [n(counts.posted), "Posted"],
    [n(counts.pending), "Pending"],
    [n(counts.failed), "Failed"],
  ]);
  await loadFeed("xauto", "xauto-list", xautoCard, "Nothing scheduled. Queue posts from the website dashboard and they appear here.");
}

/* Search runs over what is already loaded rather than a new query, so it works
   the instant you type and never hits the network mid-keystroke. */
async function runSearch(term) {
  const query = String(term || "").trim().toLowerCase();
  const host = el("search-list");
  if (!query) { host.innerHTML = '<div class="bd-empty">Type to search your notes and memory.</div>'; return; }
  host.innerHTML = '<div class="bd-empty">Searching…</div>';
  const [notes, memory] = await Promise.all([api.dashboardData?.("notes"), api.dashboardData?.("memory")]);
  const hits = [
    ...(notes?.rows || [])
      .filter((row) => `${row.title || ""} ${row.structured_notes || ""}`.toLowerCase().includes(query))
      .map(noteCard),
    ...(memory?.rows || [])
      .filter((row) => String(row.content || "").toLowerCase().includes(query))
      .map(memoryCard),
  ];
  host.innerHTML = hits.length
    ? hits.join("")
    : `<div class="bd-empty">Nothing matched “${esc(query)}”.</div>`;
}

let lastState = {};

function renderSettings() {
  rows("settings-appearance", [
    ["Theme", (document.documentElement.dataset.theme || "paper").replace(/^./, (c) => c.toUpperCase())],
    ["Window", "Opens with ⌘⇧D, or the Dock icon"],
  ]);
  rows("settings-behaviour", [
    ["Wake word", lastState.wakeWord ? "Armed" : "Off"],
    ["Accessibility", lastState.permissions?.accessibility ? "Granted" : "Not granted"],
    ["Microphone", lastState.permissions?.microphone || "unknown"],
    ["Log file", lastState.paths?.log || "—", true],
  ]);
}

function showView(name) {
  let label = name;
  document.querySelectorAll(".bd-nav-item").forEach((button) => {
    const on = button.dataset.view === name;
    button.classList.toggle("active", on);
    if (on) label = button.querySelector(".bd-nm")?.textContent || name;
  });
  document.querySelectorAll(".bd-view").forEach((view) => {
    view.classList.toggle("active", view.dataset.view === name);
  });
  el("crumb").textContent = label;
  document.querySelector(".bd-main").scrollTop = 0;
  LOADERS[name]?.();
}

el("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void runSearch(el("search-input").value);
});

el("search-input").addEventListener("input", (event) => {
  void runSearch(event.target.value);
});

el("nav").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (button) showView(button.dataset.view);
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-act]");
  if (!button) return;
  if (button.dataset.act === "accessibility") await api.requestAccessibility?.();
  if (button.dataset.act === "microphone") await api.requestMicrophone?.();
  setTimeout(refresh, 600);
});

/* ── Data sections ──
   Each row is rendered from what the table actually returned. Nothing is
   padded out with placeholder entries: an empty table says it is empty. */
function when(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function card({ title, body, tags = [], time, icon = "·", tone = "" }) {
  return `<div class="bd-row">
    <span class="bd-ic">${esc(icon)}</span>
    <span class="bd-bd">
      <span class="bd-ti wrap">${esc(title)}</span>
      <span class="bd-mt">
        ${tags.filter(Boolean).map((tag) => `<span class="bd-tag${tone ? ` ${tone}` : ""}">${esc(tag)}</span>`).join("")}
        ${body ? `<span class="bd-s">${esc(body)}</span>` : ""}
      </span>
    </span>
    ${time ? `<span class="bd-tm">${esc(time)}</span>` : ""}
  </div>`;
}

const memoryCard = (row) => card({ icon: "✳", title: row.content || "—", tags: [row.category], time: when(row.created_at) });
const noteCard = (row) => card({
  icon: "▤",
  title: row.title || row.source_title || "Untitled note",
  body: String(row.structured_notes || "").replace(/[#*_`>]/g, "").slice(0, 220),
  tags: [row.use_case],
  time: when(row.created_at),
});
const modeCard = (row) => card({ icon: "◆", title: row.name || "—", tags: [row.is_active ? "active" : ""], tone: row.is_active ? "ok" : "" });

/* Voice commands are not a flat list: every phrase belongs to a mode, and the
   modes are the folders. Rendering them flat lost that entirely, so they are
   grouped under their mode here and loose ones fall into "Ungrouped". */
async function loadVoiceCommands() {
  const host = el("voice-list");
  if (!api.dashboardData) return;
  host.innerHTML = '<div class="bd-empty">Loading…</div>';
  try {
    const [modes, commands] = await Promise.all([
      api.dashboardData("modes"),
      api.dashboardData("voice"),
    ]);
    if (commands?.error === "signed_out") {
      host.innerHTML = '<div class="bd-empty">Sign in to Braino to see your voice commands.</div>';
      return;
    }
    if (!commands?.ok) {
      host.innerHTML = `<div class="bd-empty">Could not load these (${esc(commands?.error || "unknown")}).${commands?.detail ? `<br><small>${esc(commands.detail)}</small>` : ""}</div>`;
      return;
    }
    const rows = commands.rows || [];
    if (!rows.length) {
      host.innerHTML = '<div class="bd-empty">No voice commands yet. Add phrases from the website dashboard and they appear here.</div>';
      return;
    }
    const modeById = new Map((modes?.rows || []).map((mode) => [mode.id, mode]));
    const folders = new Map();
    for (const command of rows) {
      const key = command.mode_id || "__loose";
      if (!folders.has(key)) folders.set(key, []);
      folders.get(key).push(command);
    }
    host.innerHTML = Array.from(folders.entries())
      .map(([key, list]) => {
        const mode = modeById.get(key);
        const name = mode?.name || (key === "__loose" ? "Ungrouped" : "Mode");
        return `<section class="bd-folder">
          <h3 class="bd-folder-head">${esc(name)}${mode?.is_active ? '<span class="bd-tag ok">active</span>' : ""}<em>${list.length}</em></h3>
          <div class="bd-list">${list.map((command) => card({ icon: "❝", title: command.phrase || "—", tags: [command.open_mode ? "opens a mode" : ""] })).join("")}</div>
        </section>`;
      })
      .join("");
  } catch (error) {
    host.innerHTML = `<div class="bd-empty">Could not load these: ${esc(error?.message || error)}</div>`;
  }
}

async function loadFeed(key, target, toCard, emptyMessage) {
  const host = el(target);
  if (!api.dashboardData) return;
  host.innerHTML = '<div class="bd-empty">Loading…</div>';
  let result;
  try {
    result = await api.dashboardData(key);
  } catch (error) {
    // Without this the pane sat on "Loading…" forever on any IPC failure.
    host.innerHTML = `<div class="bd-empty">Could not load this: ${esc(error?.message || error)}</div>`;
    return;
  }
  if (result?.error === "signed_out") {
    host.innerHTML = '<div class="bd-empty">Sign in to Braino to see this. Voice and delegate need an account too.</div>';
    return;
  }
  if (!result?.ok) {
    host.innerHTML = `<div class="bd-empty">Could not load this right now (${esc(result?.error || "unknown")}).${result?.detail ? `<br><small>${esc(result.detail)}</small>` : ""}</div>`;
    return;
  }
  if (!result.rows.length) {
    host.innerHTML = `<div class="bd-empty">${esc(emptyMessage)}</div>`;
    return;
  }
  host.innerHTML = result.rows.map(toCard).join("");
}

/* Task history is local to this window: the commands you ran from here, this
   session. It is not persisted, and it does not pretend to be. */
const taskHistory = [];

function renderTasks() {
  const host = el("tasks-list");
  if (!taskHistory.length) {
    host.innerHTML = '<div class="bd-empty">Nothing yet. Run something from the Overview tab and it lands here.</div>';
    return;
  }
  host.innerHTML = taskHistory
    .map((task) => card({
      icon: task.ok ? "✓" : "!",
      tone: task.ok ? "ok" : "bad",
      title: task.prompt,
      body: task.reply,
      tags: [task.ok ? "done" : "failed"],
      time: new Date(task.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    }))
    .join("");
}

/* ── Running a command from the window ──
   Same delegate path the notch and voice use, so this is not a second brain
   with its own rules — it is the same one, reached by typing. */
const runForm = el("runner");
const runInput = el("run-input");
const runButton = el("run-go");
const runOut = el("run-out");
let running = false;

function showRun(kind, label, message) {
  runOut.hidden = false;
  runOut.className = `bd-answer${kind ? ` is-${kind}` : ""}`;
  runOut.innerHTML = `<span class="bd-eyebrow">${esc(label)}</span>${esc(message)}`;
}

async function runCommand(prompt) {
  const text = String(prompt || "").trim();
  if (!text || running || !api.delegate) return;
  running = true;
  runButton.disabled = true;
  runInput.disabled = true;
  showRun("working", "Working", text);
  try {
    const result = await api.delegate(text);
    const said = String(result?.say || "").trim();
    taskHistory.unshift({ prompt: text, reply: said, ok: result?.ok !== false, at: Date.now() });
    renderTasks();
    if (result?.ok === false) {
      showRun("error", "Did not run", said || result?.error || "Braino could not complete that.");
    } else {
      showRun("", "Done", said || "Braino finished that.");
      runInput.value = "";
    }
  } catch (error) {
    showRun("error", "Failed", String(error?.message || error));
  } finally {
    running = false;
    runButton.disabled = false;
    runInput.disabled = false;
    runInput.focus();
    void refresh();
  }
}

runForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void runCommand(runInput.value);
});

el("run-suggest").innerHTML = SUGGESTIONS
  .map((text) => `<button class="bd-chip" type="button" data-run="${esc(text)}">${esc(text)}</button>`)
  .join("");

el("run-suggest").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-run]");
  if (!button) return;
  runInput.value = button.dataset.run;
  void runCommand(button.dataset.run);
});

// Live progress from the main process while a command is in flight. The window
// now receives the same task-progress stream the notch does.
api.onTaskProgress?.((payload) => {
  if (!running) return;
  const note = payload?.label || payload?.step || payload?.status;
  if (note && note !== "ready") showRun("working", "Working", String(note));
});

/* ── Theme ──
   Liquid keeps the real window vibrancy. White and Black are opaque, so the
   main process has to drop the vibrancy layer too — CSS alone cannot stop a
   vibrancy-backed window from showing the desktop through it. */
const THEMES = ["paper", "white", "black"];

function applyTheme(theme, persist = true) {
  const next = THEMES.includes(theme) ? theme : "paper";
  document.documentElement.dataset.theme = next;
  document.querySelectorAll("[data-theme-set]").forEach((button) => {
    button.classList.toggle("on", button.dataset.themeSet === next);
  });
  if (persist) {
    try { localStorage.setItem("braino-mac-theme", next); } catch (_) { /* private mode */ }
  }
  void api.setWindowTheme?.(next);
}

el("theme-switch").addEventListener("click", (event) => {
  const button = event.target.closest("[data-theme-set]");
  if (button) applyTheme(button.dataset.themeSet);
});

let savedTheme = "paper";
try { savedTheme = localStorage.getItem("braino-mac-theme") || "paper"; } catch (_) { /* private mode */ }
applyTheme(savedTheme, false);

void refresh();
setInterval(refresh, 4000);
