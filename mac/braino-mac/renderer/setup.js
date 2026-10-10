/* Set up Braino: what he needs to know about you, one thing at a time, with
   his notebook filling in live beside it. Every answer is saved the moment it
   is given (so closing halfway loses nothing) and becomes memory he keeps.
   Reopen it any time to watch the notebook sync with what he is picking up.
   House rule: no dashes of any kind in anything Braino says. */
const api = window.brainoMac;
const el = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let snap = null;          // the latest live snapshot from the Mac
let answers = {};         // what you have told him, saved as you go
let at = 0;               // which step
let lastNotebook = "";    // to mark what changed
let chromeProfileState = null; // { profiles, config } from Chrome's own list
void api.chromeProfiles?.().then((r) => { if (r?.ok) chromeProfileState = r; }).catch(() => {});
/* "Used for" words are saved when you leave the box. */
document.addEventListener("change", async (e) => {
  const dir = e.target?.dataset?.usefor;
  if (!dir || !chromeProfileState) return;
  const words = String(e.target.value || "").split(/\s*(?:,|\band\b)\s*/).map((w) => w.trim().toLowerCase()).filter(Boolean);
  const rules = (chromeProfileState.config.rules || []).filter((r) => r.dir !== dir);
  if (words.length) rules.push({ dir, words });
  chromeProfileState.config = (await api.chromeProfilesSave?.({ ...chromeProfileState.config, rules }))?.config || chromeProfileState.config;
});

const STEPS = [
  { id: "hello", say: "Hi. I'm Braino. Look up, at the top of your screen. That's me, in the notch.", notch: "Hi. I'm up here.", kicker: "Hello", title: "Hi. I'm Braino.", sub: "I live in your notch, right at the top of your screen. I hear you, I help you, and I remember what matters to you. Give me two minutes to get to know you.", kind: "go", cta: "Hi, Braino" },
  { id: "callMe", say: "First things first. What should I call you?", kicker: "You", title: "What should I call you?", sub: "I'll use this when I greet you, and when I talk about you to no one.", kind: "text", key: "callMe", prefill: () => snap?.name || "" , placeholder: "Your first name" },
  { id: "persona", say: "What do your days look like? Just tap one.", kicker: "Your days", title: "What do your days look like?", sub: "It changes what I watch for and what I bring you first.", kind: "choice", key: "persona", options: ["Student", "Founder", "Engineer", "Designer", "Creator", "Something else"] },
  { id: "org", say: "And where is that? Your school or your company.", kicker: "Your days", title: () => (answers.persona === "Student" ? "Where do you study?" : "Where do you work?"), sub: "So the timetable, the people and the deadlines make sense to me.", kind: "text", key: "org", prefill: () => (answers.persona === "Student" ? "Mesa School of Business" : ""), placeholder: "School or company", optional: true },
  { id: "rhythm", say: "When does your day start, and when do you call it a night?", kicker: "Your rhythm", title: "When does your day start, and end?", sub: "I'll greet you at the start and wrap up with you at the end.", kind: "rhythm" },
  { id: "focus", say: "What should I take off your plate? Pick as many as you like.", kicker: "Help", title: "What should I take off your plate first?", sub: "Pick as many as you like.", kind: "multi", key: "focus", options: ["Classes and deadlines", "Messages", "Meetings and notes", "Staying focused", "Music", "Everything"] },
  { id: "people", say: "These people messaged you most this week. Star the ones who matter.", kicker: "Your people", title: "Who matters most?", sub: "Their WhatsApps show quietly in the notch. Everyone else I remember, and only mention when you ask. These are the people who messaged you most this week.", kind: "people" },
  { id: "profiles", say: "Which Chrome profile is yours, and what are the others for?", kicker: "Chrome", title: "Which Chrome profile is for what?", sub: "Pick your main one. Say what the others are for, like Nexus or Mesa, and I'll open those there.", kind: "profiles" },
  { id: "connect", say: "Now let me into the places your day lives.", kicker: "Connections", title: "Let me into the places your day lives.", sub: "Each one is read on this Mac, the way you would read it.", kind: "connect" },
  { id: "permissions", say: "Four quick yeses from your Mac, and I can really help. Tap Allow on each one.", notch: "Tap Allow, one at a time.", kicker: "Permissions", title: "Four quick yeses.", sub: "Your Mac asks once for each. Tap Allow and say yes. Each one turns green the moment it works.", kind: "permissions" },
  { id: "memory", say: "Should I remember your day? It stays on this Mac, and you can delete anything.", kicker: "Memory", title: "Should I remember your day?", sub: "Apps, screen text and what you say to me, as text, on this Mac. Private windows and password apps are never written down. You can see and delete all of it in the Memory window.", kind: "memory" },
  { id: "voice", say: "When I have something to say, should I say it out loud?", kicker: "My voice", title: "When I have something to say?", sub: "You can change this any time.", kind: "choice", key: "voice", options: ["Talk out loud", "Stay quiet, show me in the notch"], map: { "Talk out loud": "aloud", "Stay quiet, show me in the notch": "quiet" } },
  { id: "never", say: "Anything I should never do? I'll hold to it.", kicker: "Boundaries", title: "Anything I should never do?", sub: "Optional. I'll hold to it.", kind: "textarea", key: "never", placeholder: "Never message my manager, never play music during class…", optional: true },
  { id: "try", say: "Now try me. Press Control twice, and ask me anything.", notch: "Press Control twice, then talk.", kicker: "Try me", title: "Now, say something to me.", sub: "Press Control twice, then ask me anything. Try: what can you do?", kind: "try" },
  { id: "done", kicker: "Done", title: () => `Nice to meet you, ${answers.callMe || snap?.name || "friend"}.`, sub: "I'm set up, and I already know a little about you. Call me any time: press Control twice, or just say Hey Braino.", kind: "done", cta: "Finish" },
];

async function save(patch) {
  Object.assign(answers, patch);
  renderNotebook();
  await api.setupSave?.(patch).catch(() => null);
  void refresh();
}

function title(step) { return typeof step.title === "function" ? step.title() : step.title; }

function renderStep() {
  const step = STEPS[at];
  /* One step at a time, full width. His notebook stays hidden until the end,
     where it opens beside "Nice to meet you" as the summary of what he learned. */
  document.body.classList.toggle("su-solo", step.kind !== "done");
  el("su-progress").textContent = at === 0 || step.kind === "done" ? "" : `${at} of ${STEPS.length - 2}`;
  el("su-back").hidden = at === 0;
  const head = `<p class="su-kicker">${esc(step.kicker)}</p><h1 class="su-title">${esc(title(step))}</h1><p class="su-sub">${esc(step.sub)}</p>`;
  let body = "";
  if (step.kind === "go" || step.kind === "done") body = `<button class="su-next" data-next>${esc(step.cta)}</button>`;
  if (step.kind === "text") {
    const v = answers[step.key] ?? step.prefill?.() ?? "";
    body = `<input class="su-input" id="su-in" value="${esc(v)}" placeholder="${esc(step.placeholder || "")}" autofocus /><button class="su-next" data-next>Continue</button>`;
  }
  if (step.kind === "textarea") {
    body = `<textarea class="su-text" id="su-in" placeholder="${esc(step.placeholder || "")}">${esc(answers[step.key] || "")}</textarea><button class="su-next" data-next>${step.optional ? "Continue" : "Save"}</button>`;
  }
  if (step.kind === "choice" || step.kind === "multi") {
    const cur = answers[step.key];
    const on = (o) => (step.kind === "multi" ? (cur || []).includes(o) : (step.map ? cur === step.map[o] : cur === o));
    body = `<div class="su-choices">${step.options.map((o) => `<button class="su-choice${on(o) ? " on" : ""}" data-choice="${esc(o)}">${esc(o)}</button>`).join("")}</div>${step.kind === "multi" ? `<button class="su-next" data-next>Continue</button>` : ""}`;
  }
  if (step.kind === "rhythm") {
    const starts = ["6am", "7am", "8am", "9am", "10am", "Later"];
    const ends = ["10pm", "11pm", "Midnight", "1am", "Later"];
    body = `<p class="su-label">Starts</p><div class="su-choices">${starts.map((o) => `<button class="su-choice${answers.dayStarts === o ? " on" : ""}" data-start="${o}">${o}</button>`).join("")}</div>
      <p class="su-label">Ends</p><div class="su-choices">${ends.map((o) => `<button class="su-choice${answers.dayEnds === o ? " on" : ""}" data-end="${o}">${o}</button>`).join("")}</div>
      <button class="su-next" data-next ${answers.dayStarts && answers.dayEnds ? "" : "disabled"}>Continue</button>`;
  }
  if (step.kind === "people") {
    const important = answers.important || snap?.important || [];
    const names = [...new Set([...(snap?.topWhatsApp || []).map((p) => p.name), ...important])];
    body = `<div class="su-choices">${names.length ? names.map((n) => `<button class="su-choice${important.includes(n) ? " on" : ""}" data-person="${esc(n)}">${important.includes(n) ? "★ " : ""}${esc(n)}</button>`).join("") : `<span class="su-sub">Nobody yet. Add them below.</span>`}</div>
      <input class="su-input" id="su-add" placeholder="Add someone by name, then Enter" /><button class="su-next" data-next>Continue</button>`;
  }
  if (step.kind === "connect") {
    body = `<div class="su-rows">${(snap?.connections || []).map((c) => `<div class="su-row glass"><i class="su-dot${c.ok ? " ok" : ""}"></i><div class="grow"><b>${esc(c.label)}</b><span>${esc(c.detail)}</span></div>${!c.ok && (c.id === "mesa" || c.id === "contacts") ? `<button class="su-small" data-connect="${c.id}">${c.id === "mesa" ? "Connect" : "Sync"}</button>` : ""}</div>`).join("")}</div><button class="su-next" data-next>Continue</button>`;
  }
  if (step.kind === "profiles") {
    const cp = chromeProfileState || { profiles: [], config: { primary: "", rules: [] } };
    const usedFor = (dir) => (cp.config.rules || []).filter((r) => r.dir === dir).flatMap((r) => r.words).join(", ");
    body = cp.profiles.length
      ? `<div class="su-rows">${cp.profiles.map((p) => `<div class="su-row glass"><div class="grow"><b>${esc(p.name)}</b><span>${esc(p.email || "not signed in")}</span><input class="su-input" data-usefor="${esc(p.dir)}" value="${esc(usedFor(p.dir))}" placeholder="Used for, e.g. nexus, mesa" style="margin-top:6px" /></div><button class="su-small${cp.config.primary === p.dir ? " on" : ""}" data-primary="${esc(p.dir)}">${cp.config.primary === p.dir ? "★ Main" : "Make main"}</button></div>`).join("")}</div><button class="su-next" data-next>Continue</button>`
      : `<p class="su-sub">I can't see any Chrome profiles on this Mac.</p><button class="su-next" data-next>Continue</button>`;
  }
  if (step.kind === "permissions") {
    body = `<div class="su-rows">${(snap?.permissions || []).map((p) => `<div class="su-row glass"><i class="su-dot${p.ok ? " ok" : ""}"></i><div class="grow"><b>${esc(p.label)}</b><span>${esc(p.why)}</span></div>${p.ok ? `<span class="su-ok">Allowed</span>` : `<button class="su-small su-allow" data-ask="${esc(p.id)}">Allow</button>`}</div>`).join("")}</div><button class="su-next" data-next>${(snap?.permissions || []).every((p) => p.ok) ? "Continue" : "Continue for now"}</button>`;
  }
  if (step.kind === "memory") {
    const mem = answers.memoryOn !== false;
    const rec = answers.recallOn !== false;
    body = `<div class="su-rows">
      <div class="su-row glass"><div class="grow"><b>Remember my day</b><span>${mem ? "On" : "Off"}</span></div><button class="su-small" data-toggle="memoryOn">${mem ? "Turn off" : "Turn on"}</button></div>
      <div class="su-row glass"><div class="grow"><b>Braino can use it</b><span>${rec ? "On: he answers and acts from it" : "Off: recorded, not used"}</span></div><button class="su-small" data-toggle="recallOn">${rec ? "Turn off" : "Turn on"}</button></div>
    </div><button class="su-next" data-next>Continue</button>`;
  }
  if (step.kind === "try") {
    body = heard
      ? `<div class="su-heard"><p class="su-you">“${esc(heard.you || "…")}”</p>${heard.braino ? `<p class="su-him">${esc(heard.braino)}</p>` : ""}</div><button class="su-next" data-next>That's it. Continue</button>`
      : `<div class="su-keys"><kbd>⌃</kbd><kbd>⌃</kbd><span>then talk</span></div><button class="su-link" data-next>Skip for now</button>`;
  }
  el("su-stage").innerHTML = `<div class="su-step">${head}${body}</div>`;
  el("su-in")?.focus();
  void guide(step);
}

/* Braino walks you through it (setup-braino.js): he says each step once, in
   his own words, and points at whatever needs you. Re-renders of the same
   step (a tap on a choice) do not make him repeat himself. */
const B = window.SetupBraino;
let guidedStep = "";
let showedNotebook = true;   // the notebook is the ending now, not shown mid-way
async function guide(step) {
  if (!B || guidedStep === step.id) return;
  guidedStep = step.id;
  if (step.id === "hello") { await B.home(); B.wave(); }
  else if (step.id === "done") { await B.home(); B.hop(); }
  else if (step.id === "permissions" && document.querySelector("[data-ask]")) { void B.point("[data-ask]", 4200); }
  else void B.home();
  const name = answers.callMe || snap?.name || "";
  // The notch says it too, so the window and the notch move as one.
  void api.setupNotch?.(step.id === "done" ? `Nice to meet you${name ? `, ${name}` : ""}.` : (step.notch || step.say || ""), 4500);
  B.say(step.id === "done" ? `Nice to meet you${name ? `, ${name}` : ""}. I'm right up there whenever you need me.` : step.say || "");
}

async function next() {
  const step = STEPS[at];
  const input = el("su-in");
  if (input && step.key) {
    const v = input.value.trim();
    if (!v && !step.optional) { input.focus(); return; }
    if (v) await save({ [step.key]: v });
  }
  if (step.id === "callMe" && B && !showedNotebook && answers.callMe) {
    // The first answer: show him writing it down, on the right.
    showedNotebook = true;
    at += 1;
    guidedStep = STEPS[at].id;   // claim the step first, so renderStep does not start its line
    renderStep();
    B.stop();
    await B.point(".nb-props", 2600);
    const here = guidedStep;
    await B.say(`See, ${answers.callMe}? It's in my notebook already.`);
    if (STEPS[at].id === here) { guidedStep = ""; void guide(STEPS[at]); }
    return;
  }
  if (step.kind === "done") { B?.stop(); await save({ completed: true }); window.close(); return; }
  if (step.id === "hello") void save({ startedAt: answers.startedAt || Date.now() });
  at = Math.min(STEPS.length - 1, at + 1);
  renderStep();
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  const step = STEPS[at];
  if (t.id === "su-back") { at = Math.max(0, at - 1); renderStep(); return; }
  if (t.id === "su-sound") { B?.setMuted(!B.muted); paintSound(); return; }
  if (t.hasAttribute("data-next")) { void next(); return; }
  if (t.dataset.choice) {
    const o = t.dataset.choice;
    if (step.kind === "multi") {
      const cur = new Set(answers[step.key] || []);
      cur.has(o) ? cur.delete(o) : cur.add(o);
      await save({ [step.key]: [...cur] });
      renderStep();
    } else {
      await save({ [step.key]: step.map ? step.map[o] : o });
      if (step.id === "voice" && B) { B.setMuted(o.startsWith("Stay quiet")); paintSound(); }
      if (step.id === "persona" && o !== "Student" && o !== "Founder" && o !== "Engineer" && o !== "Designer") { at += 2; renderStep(); return; }
      void next();
    }
    return;
  }
  if (t.dataset.start) { await save({ dayStarts: t.dataset.start }); renderStep(); return; }
  if (t.dataset.end) { await save({ dayEnds: t.dataset.end }); renderStep(); return; }
  if (t.dataset.person) {
    const cur = new Set(answers.important || snap?.important || []);
    const n = t.dataset.person;
    cur.has(n) ? cur.delete(n) : cur.add(n);
    await save({ important: [...cur] });
    renderStep();
    return;
  }
  if (t.dataset.primary) {
    chromeProfileState.config.primary = t.dataset.primary;
    chromeProfileState.config = (await api.chromeProfilesSave?.(chromeProfileState.config))?.config || chromeProfileState.config;
    renderStep();
    return;
  }
  if (t.dataset.connect) { t.textContent = "…"; await api.setupConnect?.(t.dataset.connect); await refresh(); renderStep(); return; }
  if (t.dataset.pane) { await api.setupOpenPane?.(t.dataset.pane); return; }
  if (t.dataset.ask) { t.textContent = "Waiting…"; await api.setupAsk?.(t.dataset.ask); void checkPermissions(); return; }
  if (t.dataset.toggle) { const k = t.dataset.toggle; await save({ [k]: answers[k] === false }); renderStep(); }
});
document.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  if (e.target.id === "su-add") {
    const n = e.target.value.trim();
    if (!n) return;
    const cur = new Set(answers.important || snap?.important || []);
    cur.add(n);
    await save({ important: [...cur] });
    renderStep();
    return;
  }
  if (e.target.id === "su-in" && e.target.tagName === "INPUT") void next();
});

/* ── The notebook ── */
function hm(iso) { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  return s < 60 ? "just now" : s < 3600 ? `${Math.round(s / 60)}m ago` : hm(iso);
}
const KIND_ICON = { focus: "▣", screen: "≡", conversation: "❝", playing: "♪", whatsapp: "✉" };
const FACT_GROUPS = [["identity", "Who you are"], ["relationship", "People"], ["project", "Projects"], ["preference", "How you like things"], ["event", "Dates"], ["fact", "Other things"]];
function section(title, count, body) {
  return `<section class="nb-sec"><div class="nb-sec-h"><h2>${esc(title)}</h2>${count ? `<span class="nb-count">${count}</span>` : ""}</div>${body}</section>`;
}
function prop(label, value) {
  return `<dt>${esc(label)}</dt><dd class="${value ? "" : "empty"}">${value || "not yet"}</dd>`;
}

function renderNotebook() {
  const a = { ...(snap?.answers || {}), ...answers };
  const name = a.callMe || snap?.name || "";
  const important = a.important || snap?.important || [];
  const now = snap?.now || {};

  const props = `<dl class="nb-props glass">
    ${prop("Name", name && esc(name))}
    ${prop("Days", a.persona && `${esc(a.persona)}${a.org ? ` at ${esc(a.org)}` : ""}`)}
    ${prop("Rhythm", a.dayStarts && a.dayEnds && `${esc(a.dayStarts)} to ${esc(a.dayEnds)}`)}
    ${prop("Help with", (a.focus || []).length && esc((a.focus || []).join(", ")))}
    ${prop("My voice", a.voice && (a.voice === "quiet" ? "Quiet, in the notch" : "Out loud"))}
    ${prop("Never", a.never && esc(a.never))}
  </dl>`;

  const day = [
    ...(snap?.classesToday || []).map((c) => `<li><time>${esc(c.at)}</time><span class="k">◷</span><span>${esc(c.title)}${c.room ? ` <span class="nb-tag">${esc(c.room)}</span>` : ""}</span></li>`),
    ...(snap?.dueSoon || []).map((d) => `<li><time>due</time><span class="k">◆</span><span>${esc(d.title)} <span class="muted">${esc(d.when)}</span></span></li>`),
  ];
  const others = (snap?.topWhatsApp || []).filter((p) => !important.includes(p.name)).slice(0, 6);
  const people = [
    ...important.map((n) => `<span class="nb-chip star glass">★ ${esc(n)}</span>`),
    ...others.map((p) => `<span class="nb-chip glass">${esc(p.name)}<small>${p.count}</small></span>`),
  ];
  const feed = (snap?.recent || []).map((r) => `<li><time>${esc(ago(r.t))}</time><span class="k">${KIND_ICON[r.kind] || "·"}</span><span>${esc(r.text)}</span></li>`);
  const summaries = (snap?.summaries || []).map((d) => `<div class="nb-entry"><b>${esc(d.hour)}:00</b>${esc(d.summary)}</div>`);
  const facts = snap?.facts || [];
  const grouped = FACT_GROUPS.map(([cat, label]) => {
    const rows = facts.filter((f) => (f.category || "fact") === cat);
    return rows.length ? `<p class="su-label" style="margin-top:14px">${esc(label)}</p><ul class="nb-facts">${rows.map((f) => `<li>${esc(f.content)}${f.source === "onboarding" ? '<span class="nb-tag">you told me</span>' : f.source === "mac" ? '<span class="nb-tag">from your Mac</span>' : ""}</li>`).join("")}</ul>` : "";
  }).join("");
  const tiles = [...(snap?.connections || []), ...(snap?.permissions || []).map((p) => ({ label: p.label, ok: p.ok, detail: p.ok ? "allowed" : p.why }))]
    .map((c) => `<div class="nb-tile glass"><b><i class="su-dot${c.ok ? " ok" : ""}"></i>${esc(c.label)}</b><span>${esc(c.detail || "")}</span></div>`);

  const html = `
    <div class="nb-head"><div class="nb-icon glass">🧠</div><h1>${esc(name ? `${name}'s notebook` : "Your notebook")}</h1></div>
    <div class="nb-sub"><span class="nb-live">Live</span><span>Written by Braino</span><span>${a.completedAt ? "Set up" : "Setting up"}</span></div>
    ${props}
    ${section("Right now", "", `<div class="nb-callout glass"><span>👀</span><span>${now.app ? `You're in <b>${esc(now.app)}</b>${now.title ? `, ${esc(now.title)}` : ""}.` : "Nothing in front that I can read."}${now.playing ? ` Playing <b>${esc(now.playing)}</b>.` : ""}</span></div>`)}
    ${section("Your day", day.length || "", day.length ? `<ul class="nb-tl">${day.join("")}</ul>` : `<p class="muted">No classes or deadlines I can see today.</p>`)}
    ${section("Your people", people.length || "", people.length ? `<div class="nb-chips">${people.join("")}</div>` : `<p class="muted">No one yet.</p>`)}
    ${section("What I'm picking up", feed.length || "", feed.length ? `<ul class="nb-tl">${feed.join("")}</ul>` : `<p class="muted">Nothing captured yet today${a.memoryOn === false ? ", memory is off" : ""}.</p>`)}
    ${section("Today so far", summaries.length || "", summaries.length ? summaries.join("") : `<p class="muted">The first summary appears after an hour of use.</p>`)}
    ${section("What I remember", facts.length || "", facts.length ? grouped : `<p class="muted">Nothing remembered yet.</p>`)}
    ${section("Connected", "", `<div class="nb-tiles">${tiles.join("")}</div>`)}`;
  const nb = el("nb");
  const top = nb.scrollTop;
  if (html !== lastNotebook) { nb.innerHTML = html; lastNotebook = html; }
  nb.scrollTop = top;
}

async function refresh() {
  try {
    const s = await api.setupSnapshot();
    if (s?.ok) {
      snap = s;
      if (!Object.keys(answers).length && s.answers) answers = { ...s.answers };
    }
  } catch (_) {}
  renderNotebook();
}

/* Permissions, live: while that step is up, ask the Mac every second, and the
   moment one turns on, the row goes green and he says what it lets him do. */
const GRANTED = { microphone: "Now I can hear you.", accessibility: "Now I can click and type for you.", screen: "Now I can see what you see.", contacts: "Now I know who's who." };
async function checkPermissions() {
  const r = await api.setupPermissions?.().catch(() => null);
  if (!r?.ok || !snap) return;
  const before = Object.fromEntries((snap.permissions || []).map((p) => [p.id, p.ok]));
  snap.permissions = r.permissions;
  const fresh = r.permissions.filter((p) => p.ok && before[p.id] === false);
  if (!fresh.length) return;
  if (STEPS[at]?.kind === "permissions") renderStep();
  const line = GRANTED[fresh[0].id];
  if (line) { void api.setupNotch?.(line, 2600); B?.say(line); }
}
setInterval(() => { if (!document.hidden && STEPS[at]?.kind === "permissions") void checkPermissions(); }, 1000);

/* Try me: the first real thing said to him, by voice, shows up here. */
let heard = null;
api.onSetupHeard?.((h) => {
  if (STEPS[at]?.kind !== "try" || !h?.you) return;
  heard = h;
  renderStep();
  B?.hop();
});

function paintSound() { const b = el("su-sound"); if (b && B) b.textContent = B.muted ? "Sound off" : "Sound on"; }

(async () => {
  paintSound();
  await refresh();
  // Already set up: open on the notebook's story, not at "Hi" again.
  if (answers.completedAt) at = STEPS.length - 1;
  renderStep();
  setInterval(() => { if (!document.hidden) void refresh(); }, 3000);
})();
