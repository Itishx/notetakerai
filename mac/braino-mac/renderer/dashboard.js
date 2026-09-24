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
  ["Shift Shift", "Idle screen", "The clock and your shortcuts, over everything."],
  ["Command Space", "Summon", "Bring Braino to the front."],
  ["Command Shift H", "Her mode", "Samantha takes the Mac."],
  ["Command Shift B", "Brainelle", "Same mind, her name and her voice."],
  ["Command Shift D", "This window", "Open the Braino dashboard."],
  ["Command Shift L", "Launch film", "Braino introduces the film, then plays it."],
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
  contacts: () => loadContacts(false),
  mesa: () => loadMesa("state"),
  settings: () => {
    renderSettings();
    if (!idleSettings) void loadIdleEditor();
  },
};

/* ── Mesa ──
   Connected or not, last sync, and what is due, overdue first. */
function renderMesa(state) {
  const status = el("mesa-status");
  const at = state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never";
  status.innerHTML = state.connected
    ? `<span class="bd-tag ok">Connected</span> Last synced ${esc(at)}, ${esc(String(state.lastCount || 0))} events.${state.newAssignments ? ` ${esc(String(state.newAssignments))} new assignment${state.newAssignments > 1 ? "s" : ""}.` : ""}`
    : `<span class="bd-tag bad">Not connected</span> ${esc(state.lastError === "login expired" ? "Your Mesa login expired. Connect again." : "Connect once with your Mesa email and password.")}`;
  el("mesa-connect").textContent = state.connected ? "Reconnect" : "Connect Mesa";
  const rows = state.assignments || [];
  el("mesa-list").innerHTML = rows.length
    ? rows.map((a) => card({ icon: a.overdue ? "!" : "·", tone: a.overdue ? "bad" : "", title: a.title, tags: [a.overdue ? "overdue" : "due", a.course], time: a.when })).join("")
    : `<p class="bd-empty">${state.connected ? "Nothing due in the next three weeks." : "Connect Mesa to see your assignments."}</p>`;
  const ct = el("ct-mesa");
  if (ct) ct.textContent = rows.filter((a) => a.overdue).length ? "!" : "";
}
async function loadMesa(action) {
  const buttons = [el("mesa-connect"), el("mesa-sync")];
  if (action !== "state") buttons.forEach((b) => { if (b) b.disabled = true; });
  if (action === "sync") el("mesa-sync").textContent = "Syncing…";
  try {
    const state = action === "connect" ? await api.mesaConnect?.() : action === "sync" ? await api.mesaSync?.() : await api.mesaState?.();
    if (state?.ok) renderMesa(state);
    if (state?.result && state.result.ok === false && state.result.say) el("mesa-status").textContent = state.result.say;
  } finally {
    buttons.forEach((b) => { if (b) b.disabled = false; });
    if (el("mesa-sync")) el("mesa-sync").textContent = "Sync now";
  }
}
el("mesa-connect")?.addEventListener("click", () => { void loadMesa("connect"); });
el("mesa-sync")?.addEventListener("click", () => { void loadMesa("sync"); });

/* ── Contacts ──
   The same address book Braino reads when you say "call Ilu", shown whole, so
   you can see exactly who he knows. Sync reads it again, which takes a blink. */
let contactsRows = [];
let importantNames = [];
const isImportant = (name) => importantNames.some((n) => n.toLowerCase() === String(name || "").toLowerCase());
function renderContacts() {
  const q = String(el("contacts-input")?.value || "").toLowerCase().trim();
  const rows = q
    ? contactsRows.filter((c) => [c.name, c.nickname, c.company, c.phone, ...(c.emails || [])].join(" ").toLowerCase().includes(q))
    : contactsRows;
  el("contacts-list").innerHTML = rows.length
    ? rows.slice(0, 500).map((c) => card({
      icon: String(c.name || "?").trim().charAt(0).toUpperCase() || "·",
      title: c.name + (c.nickname && c.nickname !== c.name ? ` (${c.nickname})` : ""),
      body: [c.phone || "no number", ...(c.emails || []).slice(0, 1)].join("  ·  "),
      tags: [isImportant(c.name) ? "important" : "", c.company, (c.phones || []).length > 1 ? `${c.phones.length} numbers` : ""],
    }).replace(/<\/div>$/, `<button class="bd-btn" data-star="${esc(c.name)}" title="Show their WhatsApps in the notch">${isImportant(c.name) ? "★ Important" : "☆ Mark important"}</button></div>`)).join("")
    : `<p class="bd-empty">${q ? "Nobody matches that." : "No contacts yet. Press Sync contacts."}</p>`;
  const ct = el("ct-contacts");
  if (ct) ct.textContent = contactsRows.length ? String(contactsRows.length) : "";
}
async function loadContacts(sync) {
  const status = el("contacts-status");
  const button = el("contacts-sync");
  if (sync && button) { button.disabled = true; button.textContent = "Syncing…"; }
  try {
    const result = sync ? await api.contactsSync?.() : await api.contactsList?.();
    if (!result?.ok) {
      status.textContent = result?.error || "Could not read contacts. Check that Braino has Contacts access in System Settings → Privacy & Security.";
      return;
    }
    contactsRows = result.contacts || [];
    importantNames = (await api.waImportant?.())?.names || [];
    // Important people first: they are the ones this list is usually for.
    contactsRows.sort((a, b) => Number(isImportant(b.name)) - Number(isImportant(a.name)));
    const withPhone = contactsRows.filter((c) => c.phone).length;
    const at = result.syncedAt ? new Date(result.syncedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "not yet";
    status.textContent = `${contactsRows.length} contacts, ${withPhone} with a number. Last synced ${at}.`;
    renderContacts();
  } finally {
    if (button) { button.disabled = false; button.textContent = "Sync contacts"; }
  }
}
el("contacts-input")?.addEventListener("input", renderContacts);
el("contacts-list")?.addEventListener("click", async (event) => {
  const b = event.target.closest("button[data-star]");
  if (!b) return;
  const name = b.dataset.star;
  importantNames = (await api.waImportant?.(name, !isImportant(name)))?.names || importantNames;
  renderContacts();
});
el("contacts-form")?.addEventListener("submit", (event) => { event.preventDefault(); renderContacts(); });
el("contacts-sync")?.addEventListener("click", () => { void loadContacts(true); });

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

/* ── Wallpaper and screensaver ─────────────────────────────────────────────
   Two jobs, kept apart because they are genuinely different: the wallpaper sits
   behind your work all day, the screensaver is what the Mac shows when you are
   not there. They draw from the same set of looks, which is the whole trick.
   Saves as you touch it: a Save button over a grid of pictures is a button
   nobody needs, and the screen it edits is usually up on another display. */

const IDLE_ICONS = {
  speak: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
  ask: "M4 5h16v11H8l-4 4V5Z",
  play: "M8 5.5v13l11-6.5-11-6.5Z",
  os: "M12 3.5c2 0 3 1.4 3 2.8 1.7.2 3 1.6 3 3.4 0 1-.4 1.9-1 2.5.6.6 1 1.5 1 2.5 0 1.9-1.6 3.4-3.5 3.4-.6 1.3-1.9 2-3.5 2s-2.9-.7-3.5-2C5.6 18.1 4 16.6 4 14.7c0-1 .4-1.9 1-2.5-.6-.6-1-1.5-1-2.5 0-1.8 1.3-3.2 3-3.4 0-1.4 1-2.8 3-2.8Z",
};

const IDLE_DEFAULTS = [
  { id: "speak", label: "Speak", kind: "action", action: "speak" },
  { id: "ask", label: "Ask", kind: "action", action: "ask" },
  { id: "play", label: "Play", kind: "action", action: "play" },
  { id: "os", label: "Braino OS", kind: "action", action: "os" },
];

let idleSettings = null;
let idleLooks = [];
let idleSaveTimer = null;

function idleFavicon(url) {
  try {
    const value = String(url || "").trim();
    if (!value) return "";
    const host = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch { return ""; }
}

/* Typing a URL should not write a file on every keystroke. */
function idleSave() {
  if (idleSaveTimer) clearTimeout(idleSaveTimer);
  idleSaveTimer = setTimeout(() => {
    idleSaveTimer = null;
    api.idleScreenSettings?.(idleSettings);
  }, 350);
}

/* A swatch is the picture itself, at a tenth of the size. The name under it is
   there to be said out loud later: "Braino, set my wallpaper to Obsidian". */
function renderSwatches(host, selectedId, onPick) {
  if (!host) return;
  host.innerHTML = "";
  for (const look of idleLooks) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bd-swatch" + (look.id === selectedId ? " active" : "");

    const art = document.createElement("span");
    art.className = "bd-swatch-art";
    art.style.background = look.background;
    const mark = document.createElement("span");
    mark.className = "bd-swatch-mark";
    mark.style.color = look.inkSoft;
    mark.textContent = "Braino OS";
    art.appendChild(mark);
    button.appendChild(art);

    const name = document.createElement("span");
    name.className = "bd-swatch-name";
    name.textContent = look.name;
    const family = document.createElement("span");
    family.className = "bd-swatch-family";
    family.textContent = " " + look.family;
    name.appendChild(family);
    button.appendChild(name);

    button.addEventListener("click", () => onPick(look));
    host.appendChild(button);
  }
}

function renderIdleEditor() {
  const host = el("idle-rows");
  if (!host || !idleSettings) return;
  host.innerHTML = "";

  idleSettings.shortcuts.forEach((row, index) => {
    const line = document.createElement("div");
    line.className = "bd-idle-row";

    const icon = document.createElement("span");
    icon.className = "bd-idle-ic";
    const path = row.kind === "action" ? IDLE_ICONS[row.action] : "";
    const favicon = row.kind === "link" && !row.emoji ? idleFavicon(row.url) : "";
    if (path) icon.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
    else if (row.emoji) icon.textContent = row.emoji;
    else if (favicon) icon.innerHTML = `<img src="${esc(favicon)}" alt="" />`;
    else icon.textContent = (row.label || "?").slice(0, 1).toUpperCase();
    line.appendChild(icon);

    const name = document.createElement("input");
    name.type = "text";
    name.className = "bd-idle-name";
    name.placeholder = "Name";
    name.value = row.label || "";
    name.addEventListener("input", () => { idleSettings.shortcuts[index].label = name.value; idleSave(); });
    line.appendChild(name);

    if (row.kind === "link") {
      const url = document.createElement("input");
      url.type = "text";
      url.className = "bd-idle-url";
      url.placeholder = "example.com";
      url.value = row.url || "";
      url.addEventListener("input", () => { idleSettings.shortcuts[index].url = url.value; idleSave(); });
      url.addEventListener("change", renderIdleEditor);
      line.appendChild(url);

      const emoji = document.createElement("input");
      emoji.type = "text";
      emoji.className = "bd-idle-emoji";
      emoji.placeholder = "🙂";
      emoji.value = row.emoji || "";
      emoji.setAttribute("aria-label", "Emoji instead of the site icon");
      emoji.addEventListener("input", () => {
        idleSettings.shortcuts[index].emoji = emoji.value.slice(0, 2);
        idleSave();
        renderIdleEditor();
      });
      line.appendChild(emoji);
    } else {
      const built = document.createElement("span");
      built.className = "bd-idle-built";
      built.textContent = "Built in";
      line.appendChild(built);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "bd-idle-x";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${row.label || "shortcut"}`);
    remove.addEventListener("click", () => {
      idleSettings.shortcuts.splice(index, 1);
      renderIdleEditor();
      idleSave();
    });
    line.appendChild(remove);

    host.appendChild(line);
  });

  const add = el("idle-add");
  if (add) add.hidden = idleSettings.shortcuts.length >= 8;
}

function renderWallpaperPanels() {
  if (!idleSettings) return;

  document.querySelectorAll("#idle-mode button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === idleSettings.mode);
  });
  /* Picking one look only means anything when you are showing one look. */
  const swatches = el("idle-swatches");
  if (swatches) swatches.hidden = idleSettings.mode !== "one";
  renderSwatches(swatches, idleSettings.look, (look) => {
    idleSettings.look = look.id;
    renderWallpaperPanels();
    idleSave();
  });

  renderSwatches(el("wp-swatches"), idleSettings.wallpaperLook, (look) => {
    idleSettings.wallpaperLook = look.id;
    renderWallpaperPanels();
    /* Picking a wallpaper means putting it on, not saving a preference. */
    void api.wallpaperApply?.(look.id);
  });

  const every = el("idle-every");
  if (every) every.value = String(idleSettings.cycleSeconds || 10);
  const quotes = el("idle-quotes");
  if (quotes) quotes.checked = idleSettings.quotes !== false;
  const dynamic = el("wp-dynamic");
  if (dynamic) dynamic.checked = idleSettings.wallpaperMode === "dynamic";
  const auto = el("idle-auto");
  if (auto) auto.checked = idleSettings.idleEnabled !== false;
  const mins = el("idle-mins");
  if (mins) mins.value = String(idleSettings.idleMinutes || 5);
}

async function loadIdleEditor() {
  if (!api.idleScreenSettings) return;
  idleSettings = await api.idleScreenSettings(null).catch(() => null);
  if (!idleSettings) return;
  if (!Array.isArray(idleSettings.shortcuts) || !idleSettings.shortcuts.length) {
    idleSettings.shortcuts = IDLE_DEFAULTS.slice();
  }
  idleLooks = (await api.wallpaperLooks?.().catch(() => null))?.looks || [];
  renderIdleEditor();
  renderWallpaperPanels();

  el("idle-add")?.addEventListener("click", () => {
    if (idleSettings.shortcuts.length >= 8) return;
    idleSettings.shortcuts.push({ id: `link-${Date.now().toString(36)}`, label: "", kind: "link", url: "", emoji: "" });
    renderIdleEditor();
  });
  el("idle-reset")?.addEventListener("click", () => {
    idleSettings.shortcuts = IDLE_DEFAULTS.slice();
    renderIdleEditor();
    idleSave();
  });
  document.querySelectorAll("#idle-mode button").forEach((button) => {
    button.addEventListener("click", () => {
      idleSettings.mode = button.dataset.mode || "shuffle";
      renderWallpaperPanels();
      idleSave();
    });
  });
  el("idle-every")?.addEventListener("change", (event) => {
    idleSettings.cycleSeconds = Number(event.target.value) || 10;
    idleSave();
  });
  el("idle-quotes")?.addEventListener("change", (event) => {
    idleSettings.quotes = Boolean(event.target.checked);
    idleSave();
  });
  el("wp-dynamic")?.addEventListener("change", (event) => {
    idleSettings.wallpaperMode = event.target.checked ? "dynamic" : "one";
    idleSave();
  });
  el("wp-restore")?.addEventListener("click", () => { void api.wallpaperRestore?.(); });
  el("idle-auto")?.addEventListener("change", (event) => {
    idleSettings.idleEnabled = Boolean(event.target.checked);
    idleSave();
  });
  el("idle-mins")?.addEventListener("change", (event) => {
    const value = Math.min(120, Math.max(1, Number(event.target.value) || 5));
    idleSettings.idleMinutes = value;
    event.target.value = String(value);
    idleSave();
  });
  el("idle-preview")?.addEventListener("click", () => { void api.idleScreenToggle?.(); });
}

function showView(name) {
  // Two levels now: a tab owns a group of views, chips pick one inside it. The
  // tab cannot key off its own data-view, or opening Memory would drop Library.
  let activeTab = null;
  document.querySelectorAll(".bd-tab").forEach((tab) => {
    const owns = (tab.dataset.group || "").split(" ").includes(name);
    tab.classList.toggle("active", owns);
    if (owns) activeTab = tab.dataset.tab;
  });

  document.querySelectorAll("[data-chips]").forEach((group) => {
    group.hidden = group.dataset.chips !== activeTab;
  });

  document.querySelectorAll(".bd-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.view === name);
  });

  document.querySelectorAll(".bd-view").forEach((view) => {
    view.classList.toggle("active", view.dataset.view === name);
  });

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

document.querySelector(".bd-top").addEventListener("click", (event) => {
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
// Light only, by choice. A stored "black" from before this change falls back
// to paper rather than leaving somebody stuck in a theme with no button.
const THEMES = ["paper", "white"];

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

/* ── Braino Code ────────────────────────────────────────────────────────────
   The same thing /code does on the website, native.

   Everything goes through main over IPC, because the renderer has no Supabase
   keys and should not get any. The preview is an iframe fed by srcdoc rather
   than pointed at a URL: Supabase serves the built file as text/plain (and the
   function gateway rewrites text/html on navigations), so a src would show
   source instead of a site. srcdoc never consults a content type. */

(function brainoCode() {
  const api = window.brainoMac || {};
  const el = (id) => document.getElementById(id);

  const ask = el("code-ask");
  const split = el("code-split");
  const beats = el("code-beats");
  const screen = el("code-screen");
  const briefInput = el("code-brief");
  const goButton = el("code-go");
  const noteText = el("code-note");
  const openButton = el("code-open");
  const newButton = el("code-new");
  const tabPreview = el("code-tab-preview");
  const tabSource = el("code-tab-source");
  if (!split || !api.brainoCodeStart) return;

  const STATUS_LINE = {
    queued: "Getting started",
    designing: "Reading the brief",
    writing: "Writing the page",
    editing: "Making that change",
    ready: "Done",
    failed: "That did not work",
  };

  let build = null;
  let html = null;
  let htmlFor = null;
  let view = "preview";
  let timer = null;
  let startedAt = 0;

  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  const elapsed = () => {
    if (!startedAt) return "";
    const s = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  };

  const isWorking = () => Boolean(build) && build.status !== "ready" && build.status !== "failed";

  function renderBeats() {
    if (!build) { beats.innerHTML = ""; return; }
    const spec = build.spec || null;
    const clock = isWorking() ? `<span class="bc-clock">${elapsed()}</span>` : "";
    const parts = [];

    parts.push(`<section class="bc-card">
      <div class="bc-head"><p class="bc-label">What you said</p>${clock}</div>
      <p class="bc-said">${escape(build.brief)}</p>
    </section>`);

    if (spec) {
      const swatches = Object.entries(spec.palette || {}).map(([key, value]) => `
        <div class="bc-swatch" data-colour="${escape(value)}"><i></i><b>${escape(key)}</b><span>${escape(value)}</span></div>`).join("");
      parts.push(`<section class="bc-card">
        <p class="bc-label">How it should look</p>
        <h2 class="bc-title">${escape(spec.name)}</h2>
        <p class="bc-sub">${escape(spec.tagline)}</p>
        <div class="bc-swatches">${swatches}</div>
        <dl class="bc-facts">
          <div class="bc-fact"><dt>Mood</dt><dd>${escape(spec.mood)}</dd></div>
          <div class="bc-fact"><dt>Type</dt><dd>${escape(spec.fonts?.display)} headings, ${escape(spec.fonts?.body)} text</dd></div>
          ${spec.referenceRead ? `<div class="bc-fact"><dt>Reference</dt><dd>${escape(spec.referenceRead)}</dd></div>` : ""}
        </dl>
      </section>`);
    } else {
      parts.push(`<section class="bc-card">
        <div class="bc-head"><p class="bc-label">${escape(STATUS_LINE[build.status] || "Working")}</p>${clock}</div>
        <p class="bc-sub">Deciding the colours, the type and the shape of the page before writing a word of it.</p>
      </section>`);
    }

    if (spec && Array.isArray(spec.sections) && spec.sections.length) {
      const items = spec.sections.map((section) => `
        <li class="bc-item"><span class="bc-bead"></span>
          <div><h3>${escape(section.title)}</h3><p>${escape(section.intent)}</p></div>
        </li>`).join("");
      parts.push(`<section class="bc-card${build.status === "writing" ? " bc-live" : ""}">
        <div class="bc-head"><p class="bc-label">${build.status === "writing" ? "Writing" : "The page"}</p>${clock}</div>
        <ul class="bc-list">${items}</ul>
      </section>`);
    }

    if (build.change_summary && build.status === "ready") {
      parts.push(`<section class="bc-card"><p class="bc-label">Changed</p>
        <p class="bc-sub">${escape(build.change_summary)}</p></section>`);
    }

    if (build.status === "ready") {
      parts.push(`<div class="bc-after">
        <textarea id="code-change" class="bc-input" rows="2" placeholder="make the background red. add a team section." aria-label="Change something about this site"></textarea>
        <div class="bc-row">
          <button class="bc-go" id="code-change-go">Change it</button>
          <span class="bc-note">He keeps everything else the same.</span>
        </div>
      </div>`);
    }

    if (build.status === "failed") {
      parts.push(`<div class="bc-oops">${escape(build.error || "That did not work.")}</div>`);
    }

    beats.innerHTML = parts.join("");

    // Paint the swatches from script. A style="" attribute would be dropped by
    // this window's Content-Security-Policy (style-src 'self'), which is why
    // they came out blank the first time.
    beats.querySelectorAll(".bc-swatch").forEach((swatch) => {
      const chip = swatch.querySelector("i");
      if (chip) chip.style.background = swatch.getAttribute("data-colour") || "transparent";
    });

    const changeGo = el("code-change-go");
    if (changeGo) {
      changeGo.addEventListener("click", () => {
        const text = (el("code-change")?.value || "").trim();
        if (text) startBuild(text, build.id);
      });
    }
  }

  function renderStage() {
    openButton.hidden = !(build && build.status === "ready");
    if (html && view === "preview") {
      // No allow-same-origin: the built site runs in an opaque origin and
      // cannot reach back into the dashboard.
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("title", build?.spec?.name || "The website");
      // Not srcdoc and not a data: URL. Both are local schemes, so the document
      // inherits this window's CSP (style-src 'self') and the site's own <style>
      // gets stripped, rendering it as naked HTML. brainosite:// is a custom
      // scheme registered in main, inherits no policy, and serves real
      // text/html. Still sandboxed, still no allow-same-origin.
      frame.setAttribute("src", `brainosite://build/${build.id}`);
      screen.replaceChildren(frame);
      return;
    }
    if (html && view === "code") {
      const pre = document.createElement("pre");
      pre.className = "bc-code";
      pre.textContent = html;
      screen.replaceChildren(pre);
      return;
    }
    const holding = document.createElement("div");
    holding.className = "bc-holding";
    holding.innerHTML = `<strong>${escape(build ? STATUS_LINE[build.status] : "Nothing yet")}</strong>
      <p>${build && build.status === "failed" ? "Nothing to show for this one." : "The site appears here the moment he finishes it."}</p>`;
    screen.replaceChildren(holding);
  }

  async function loadSource() {
    if (!build || build.status !== "ready" || htmlFor === build.id) return;
    const result = await api.brainoCodeSource(build.id);
    if (result?.ok && result.html) {
      html = result.html;
      htmlFor = build.id;
      renderStage();
    }
  }

  async function tick() {
    if (!build) return;
    const result = await api.brainoCodeStatus(build.id);
    if (result?.ok && result.build) {
      build = { ...build, ...result.build };
      renderBeats();
      if (!isWorking()) {
        window.clearInterval(timer);
        timer = null;
        await loadSource();
        renderStage();
      }
    }
  }

  async function startBuild(brief, parentBuildId) {
    goButton.disabled = true;
    noteText.textContent = parentBuildId ? "Changing it..." : "Starting...";
    const result = await api.brainoCodeStart(brief, parentBuildId);
    goButton.disabled = false;
    noteText.textContent = "Three to eight minutes. Changes after that are instant.";

    if (!result?.ok) {
      ask.hidden = false;
      noteText.textContent = result?.error || "Could not start the build.";
      return;
    }

    // On a change, keep the current site on screen. Blanking back to a spinner
    // is what made an edit feel like starting over.
    if (!parentBuildId) { html = null; htmlFor = null; }
    startedAt = Date.now();
    build = { id: result.buildId, brief, spec: null, status: "queued", error: null };
    ask.hidden = true;
    split.hidden = false;
    view = "preview";
    setTab();
    renderBeats();
    renderStage();
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(tick, 2500);
    window.setInterval(() => { if (isWorking()) renderBeats(); }, 1000);
  }

  function setTab() {
    tabPreview.setAttribute("aria-pressed", String(view === "preview"));
    tabSource.setAttribute("aria-pressed", String(view === "code"));
  }

  tabPreview.addEventListener("click", () => { view = "preview"; setTab(); renderStage(); });
  tabSource.addEventListener("click", () => { view = "code"; setTab(); renderStage(); });
  goButton.addEventListener("click", () => {
    const text = (briefInput.value || "").trim();
    if (text) startBuild(text, null);
  });
  newButton.addEventListener("click", () => {
    if (timer) window.clearInterval(timer);
    timer = null;
    build = null; html = null; htmlFor = null;
    split.hidden = true;
    ask.hidden = false;
    briefInput.value = "";
  });

  // Spoken "build me a website" opens this window and points it at the build.
  if (api.onBrainoCodeOpen) {
    api.onBrainoCodeOpen(async ({ buildId }) => {
      if (!buildId) return;
      document.querySelector('button[data-view="code"]')?.click();
      const result = await api.brainoCodeStatus(buildId);
      if (!result?.ok || !result.build) return;
      const sameSite = build && build.id !== buildId && result.build.status !== "ready";
      if (!sameSite) { html = null; htmlFor = null; }
      startedAt = Date.now();
      build = result.build;
      ask.hidden = true;
      split.hidden = false;
      setTab();
      renderBeats();
      await loadSource();
      renderStage();
      if (timer) window.clearInterval(timer);
      if (isWorking()) timer = window.setInterval(tick, 2500);
    });
  }
})();
