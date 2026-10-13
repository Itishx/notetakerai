/* Welcome to Braino (2026-10-10). A new onboarding, written from scratch as a
   story: AffectiveOS, then Braino, then what is new, then making him yours,
   then trust, then talking to him, then what he knows about you.

   Story scenes are spoken in his real voice (setupSay, the same Fish voice as
   the notch) and the sentence lights up word by word as he says it. They move
   on by themselves; a click moves on sooner. Everything said here is about
   what works today. House rule: no dashes in anything Braino says. */
// Wrapped so the website page can load it again without "already declared".
(() => {
const api = window.brainoMac || {};
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let snap = null;              // name, permissions, saved answers (setupSnapshot)
const answers = {};
let heard = null;             // the first thing said to him, from "Try me"
let wakeOn = false;
let mesaState = { connected: false, name: "", program: "", error: "", busy: false };           // "Hey Braino", offered on the permissions step
let at = 0;
let muted = false;
try { muted = localStorage.getItem("obMuted") === "1"; } catch (_) {}
const spoken = new Set();

/* ── The pictures ── the homepage's pixel art, with a card on top.
   One file feeds both the Mac app and the website page /onboarding, so the
   page you design is the page the Mac shows. Each host says where its images
   live: the Mac bundles them as assets/ob-*.jpg, the website serves /*.jpg. */
const IMG_BASE = window.OB_IMG_BASE || "assets/ob-";
const IMG = { os: "affective-hero", new: "os-senses", meetings: "os-voice", lectures: "os-memory", day: "affective-hero", messages: "os-hands", do: "os-senses", dictate: "os-hands", memory: "os-memory" };
const ART = {
  os: () => `<div class="ob-card" style="width:auto;text-align:center;padding:22px 30px"><div class="ob-os"><b style="font-size:34px">AffectiveOS</b><span style="font-size:18px">it understands you</span></div></div>`,
  notch: () => `<div class="ob-mac"></div><div class="ob-notch"><i class="ob-eye"></i><i class="ob-eye"></i></div><div class="ob-arrow">↑ I live here</div>`,
  new: () => `<div class="ob-stack"><div class="ob-card"><small>Apps</small><div>You open them. You learn them. You do the work.</div></div><div class="ob-card"><small>Braino</small><div class="ob-said">Already here. Just ask.</div></div></div>`,
  meetings: () => `<div class="ob-card"><small>Product sync · 4:00</small>
      <div class="ob-line">Riya: the deck needs the new numbers.</div>
      <div class="ob-line">You: I'll send it by Friday.</div>
      <div class="ob-line">Arjun: let's ship the beta Monday.</div>
      <div class="ob-line ob-hl">You promised: send the deck by Friday.</div>
      <div class="ob-line" style="color:var(--ink-2)">Want me to remind you Thursday?</div></div>`,
  lectures: () => `<div class="ob-card"><small>Live · Venture Building</small>
      <div class="ob-line">Customer discovery starts with the problem, not the product.</div>
      <div class="ob-line">Talk to ten people before you build anything.</div>
      <div class="ob-line">Pay attention to what they already pay for.</div>
      <div class="ob-line ob-hl">Saved to your notes. Written live, the whole lecture.</div></div>`,
  day: () => `<div class="ob-card"><small>A day with Braino</small>
      <div class="ob-line ob-row"><time>8:30</time><span>"Good morning. Class at 9:30, one thing due today."</span></div>
      <div class="ob-line ob-row"><time>9:30</time><span>Lecture written down while you listen.</span></div>
      <div class="ob-line ob-row"><time>12:00</time><span>"Market sizing is due at 2."</span></div>
      <div class="ob-line ob-row"><time>4:00</time><span>Meeting notes, and what you promised.</span></div>
      <div class="ob-line ob-hl">5:50 · "Your call with Arjun is in ten minutes."</div></div>`,
  messages: () => `<div class="ob-stack"><div class="ob-card"><small>You said</small><div class="ob-said">"Send this to Riya on WhatsApp"</div></div>
      <div class="ob-card"><small>Braino</small><div>Which Riya?</div><span class="ob-pill first">Riya Khurana</span><span class="ob-pill">the other Riya</span></div></div>`,
  do: () => `<div class="ob-stack"><div class="ob-card"><small>You said</small><div class="ob-said">"Find me the cheapest flight to Goa"</div></div>
      <div class="ob-card"><small>Braino</small><div>Got it. Opening Google Flights. Comparing prices.</div><div class="ob-done" style="margin-top:8px">Cheapest: ₹4,200, Friday 7:10.</div></div></div>`,
  dictate: () => `<div class="ob-stack"><div class="ob-card"><small>You said</small><div>"um so tell him the deck is ready and uh we can meet friday"</div></div>
      <div class="ob-card"><small>Typed where your cursor is</small><div class="ob-said">The deck is ready. We can meet Friday.</div></div></div>`,
  memory: () => `<div class="ob-card"><small>What I remember</small>
      <div class="ob-line">You're vegetarian.</div>
      <div class="ob-line">Riya is your co-founder.</div>
      <div class="ob-line">You like music while you work.</div>
      <div class="ob-line ob-hl">You can see, edit or delete all of it.</div></div>`,
};

/* ── The story ── He is the one talking, so every line is in his own words,
   first person, the same on screen as out loud. *word* is the word the line
   turns on (underlined, like the homepage). */
const nameOf = () => answers.callMe || snap?.name || "friend";
const SCENES = [
  { id: "os", kind: "story", kicker: "Welcome to AffectiveOS", title: "A computer that finally *understands* you.", say: "Welcome to AffectiveOS. A computer that finally understands you.", art: "os" },
  { id: "braino", kind: "story", kicker: "Meet Braino", title: "Hi. I'm Braino. I live in your *notch.*", say: "Hi. I'm Braino. I live in your notch, right at the top of your screen.", art: "notch" },
  { id: "new", kind: "story", kicker: "Something new", title: "I'm not an app you open. I'm already *here.*", say: "I'm not an app you open. I'm already here. Just ask.", sub: "No windows to find, nothing to learn. Press Control twice, or just say Hey Braino.", art: "new" },
  { id: "meetings", kind: "story", kicker: "Meetings", title: "Your meetings will never be the *same.*", say: "Your meetings will never be the same. I listen, I write the notes, and I remember what you promised.", sub: "I listen, write the notes, and remember what you promised. Then I remind you before it's due.", art: "meetings" },
  { id: "lectures", kind: "story", kicker: "Lectures", title: "Every lecture, written down while you *listen.*", say: "Every lecture, written down while you listen. Live, the whole class.", sub: "Press Command Shift E in class. I write it all, live, so you can just pay attention.", art: "lectures" },
  { id: "day", kind: "story", kicker: "Your day", title: "I make your whole day a little *lighter.*", say: "From your first class to your last meeting, I make your whole day a little lighter.", sub: "A good morning that knows what's next, notes while you listen, and a heads up before things are due.", art: "day" },
  { id: "messages", kind: "story", kicker: "Your people", title: "Message anyone, just by *saying* it.", say: "Message anyone, just by saying it. And if two people share a name, I'll ask which one.", sub: "WhatsApp from your voice. Two people with the same name? I ask first.", art: "messages" },
  { id: "do", kind: "story", kicker: "Do it for me", title: "Say it. I'll get it *done.*", say: "Say it, and I'll get it done. And while I work, I'll tell you what I'm doing.", sub: "I open, search, compare and type for you. And I tell you what I'm doing as I go.", art: "do" },
  { id: "dictate", kind: "story", kicker: "Type with your voice", title: "Talk anywhere. I'll *type* it.", say: "Talk anywhere, and I'll type it. Press Option twice in any app.", sub: "Press Option twice in any app. Your words, cleaned up, right where your cursor is.", art: "dictate" },
  { id: "memory", kind: "story", kicker: "Memory", title: "Tell me once. I'll *remember.*", say: "Tell me once, and I'll remember. You never have to repeat yourself.", sub: "What matters to you stays with me. You can see, edit or delete anything I keep.", art: "memory" },
  { id: "name", kind: "name", banner: "affective-footer", kicker: "Make me yours", title: "First, what should I *call* you?", say: "Now, let me get to know you. What should I call you?" },
  { id: "persona", kind: "persona", kicker: "Make me yours", title: "And what do you *do?*", say: "And what do you do?", options: ["Student", "Founder", "Engineer", "Designer", "Creator", "Something else"] },
  /* Students: where, and for Mesa, their Nexus connected through Mesa's own
     API with a personal token, saved only on this Mac (2026-10-13). */
  { id: "school", kind: "school", when: () => answers.persona === "Student", kicker: "Make me yours", title: "Where do you *study?*", say: "Where do you study?", options: ["Mesa School of Business", "Somewhere else"] },
  { id: "mesa", kind: "mesa", when: () => answers.school === "Mesa School of Business", kicker: "Your Nexus", title: "Let me into *Nexus.*", say: "Let me into Nexus, and I'll always know your classes, deadlines and attendance.", sub: "Your classes, deadlines, grades and attendance, straight from Mesa. Your token stays on this Mac only." },
  { id: "perms", kind: "perms", kicker: "Trust", title: "Four quick *yeses.*", say: "Four quick yeses from your Mac, and I can really help. Tap Allow on each one.", sub: "Your Mac asks once for each. Every one turns green the moment it works." },
  /* How he learns (2026-10-13): the person picks, and the pick is applied
     (memoryOn switches the activity diary, improveBraino the conversation
     log). Every line here is what the code does today, including what goes
     to the cloud. */
  { id: "learn", kind: "learn", kicker: "Your choice", title: "How should I *learn* about you?", say: "One choice, and it's yours. How much should I learn about your day?", sub: "Here's exactly what each one means. You can change it anytime." },
  { id: "try", kind: "try", kicker: "Your first moment", title: "Now, *talk* to me.", say: "Now, talk to me. Press Control twice and ask me anything.", sub: "Press Control twice, then ask anything. Try: what can you do?" },
  { id: "done", kind: "done", banner: "affective-hero", kicker: "That's us", title: () => `Nice to meet you, *${nameOf()}.*`, say: () => `Nice to meet you, ${nameOf()}. I'm right up there whenever you need me.` },
];
const MODES = [
  { id: "day", name: "Learn my day", tag: "Recommended", line: "I keep a private diary of your day: the apps you use, the pages you open, the words on your screen. Then I can tell you what you worked on, pick up where you left off, and remember what you promised.",
    facts: ["The diary lives on this Mac and deletes itself after a week", "Once an hour I summarise it. Lasting things, like who Riya is, are saved to your account", "Never password managers, banking apps or private windows", "Say \"pause memory\" anytime and I stop"] },
  { id: "ask", name: "Only when I ask", tag: "", line: "I look at your screen only in the moment you ask me something. No diary, nothing in the background. I still help, you'll just explain a little more.",
    facts: ["Nothing is recorded in the background", "Things you tell me directly can still be remembered", "Switch to Learn my day anytime"] },
];
let learnMode = "day";
let improveOn = true;
const WHY = { microphone: "so I can hear you, and your meetings", accessibility: "so I can click and type for you", screen: "so I can see what you see", contacts: "so I know who's who" };
const GRANTED = { microphone: "Now I can hear you.", accessibility: "Now I can click and type for you.", screen: "Now I can see what you see.", contacts: "Now I know who's who." };

const val = (v) => (typeof v === "function" ? v() : v);
function lit(scene) {
  let accent = false;
  return val(scene.title).split(/\s+/).filter(Boolean).map((w) => {
    if (w.startsWith("*")) accent = true;
    const html = `<span class="ob-w${spoken.has(scene.id) ? " on" : ""}${accent ? " ob-d" : ""}">${esc(w.replace(/\*/g, ""))}</span> `;
    if (w.replace(/[.?!,]$/, "").endsWith("*")) accent = false;
    return html;
  }).join("");
}
function light(p) { const ws = [...document.querySelectorAll(".ob-big .ob-w")]; const k = Math.ceil(p * ws.length); ws.forEach((w, i) => w.classList.toggle("on", i < k)); }

/* ── His voice ── */
let audio = null, sayToken = 0;
function stopVoice() { sayToken += 1; if (audio) { try { audio.pause(); } catch (_) {} audio = null; } }
async function say(text, onProgress) {
  stopVoice();
  const token = sayToken;
  const silent = () => new Promise((resolve) => {
    const ms = Math.max(1600, Math.min(6500, text.length * 55)), t0 = performance.now();
    const step = () => { if (token !== sayToken) return resolve(false); const p = (performance.now() - t0) / ms; onProgress?.(Math.min(1, p)); p < 1 ? requestAnimationFrame(step) : resolve(true); };
    step();
  });
  if (muted || !api.setupSay) return silent();
  const res = await api.setupSay(text).catch(() => null);
  if (token !== sayToken) return false;
  if (!res?.ok) return silent();
  return new Promise((resolve) => {
    audio = new Audio(res.dataUrl);
    audio.addEventListener("timeupdate", () => { if (token === sayToken && audio?.duration) onProgress?.(audio.currentTime / audio.duration); });
    audio.addEventListener("ended", () => resolve(token === sayToken));
    audio.addEventListener("error", () => { if (token === sayToken) silent().then(resolve); });
    audio.play().catch(() => { if (token === sayToken) silent().then(resolve); });
  });
}

/* ── Drawing a scene ── */
function body(scene) {
  if (scene.kind === "story") return `<div class="ob-actions"><button class="ob-skip" data-next>Continue</button></div>`;
  if (scene.kind === "name") return `<input class="ob-input" id="ob-name" value="${esc(answers.callMe || snap?.name || "")}" placeholder="Your first name" /><div class="ob-actions"><button class="ob-go" data-next>Continue</button></div>`;
  if (scene.kind === "school") return `<div class="ob-choices">${scene.options.map((o) => `<button class="ob-choice${answers.school === o ? " on" : ""}" data-school="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  if (scene.kind === "mesa") {
    if (mesaState.connected) return `<div class="ob-perm ok" style="max-width:560px;margin-top:28px"><i></i><div><b>Connected</b><span>${esc(mesaState.name ? `as ${mesaState.name}${mesaState.program ? `, ${mesaState.program}` : ""}` : "to Nexus")}</span></div><em>Done</em></div><div class="ob-actions"><button class="ob-go" data-next>Continue</button></div>`;
    return `<ol class="ob-mesa-steps">
        <li>Open Nexus, then <b>Developer</b>. <button class="ob-skip" data-mesa-open style="margin-left:6px;padding:6px 14px">Open it for me</button></li>
        <li>Click <b>New token</b>, then <b>Copy</b>.</li>
        <li>Paste it here.</li>
      </ol>
      <input class="ob-input" id="ob-mesa" placeholder="mesa_pat_..." autocomplete="off" spellcheck="false" />
      ${mesaState.error ? `<p class="ob-sub" style="color:#b4472f;margin-top:10px">${esc(mesaState.error)}</p>` : ""}
      <div class="ob-actions"><button class="ob-go" data-mesa-save>${mesaState.busy ? "Checking…" : "Connect"}</button><button class="ob-skip" data-next>Skip for now</button></div>`;
  }
  if (scene.kind === "persona") return `<div class="ob-choices">${scene.options.map((o) => `<button class="ob-choice${answers.persona === o ? " on" : ""}" data-choice="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  if (scene.kind === "perms") {
    const ps = snap?.permissions || [];
    /* "Hey Braino" is a promise about a microphone, so it is offered here,
       never switched on by default. */
    const wake = `<div class="ob-perm${wakeOn ? " ok" : ""}"><i></i><div><b>Hey Braino</b><span>wake me by saying my name, heard on this Mac only</span></div>${wakeOn ? "<em>On</em>" : '<button data-wake="on">Turn on</button>'}</div>`;
    return `<div class="ob-perms">${ps.map((p) => `<div class="ob-perm${p.ok ? " ok" : ""}"><i></i><div><b>${esc(p.label)}</b><span>${esc(WHY[p.id] || p.why)}</span></div>${p.ok ? "<em>Allowed</em>" : `<button data-ask="${esc(p.id)}">Allow</button>`}</div>`).join("")}${api.namedMode ? wake : ""}</div>
      <div class="ob-actions"><button class="ob-go" data-next>${ps.length && ps.every((p) => p.ok) ? "Continue" : "Continue for now"}</button></div>`;
  }
  if (scene.kind === "learn") {
    return `<div class="ob-modes">${MODES.map((m) => `<button class="ob-mode${learnMode === m.id ? " on" : ""}" data-mode="${m.id}">
        <span class="ob-mode-top"><i></i><b>${esc(m.name)}</b>${m.tag ? `<em>${esc(m.tag)}</em>` : ""}</span>
        <span class="ob-mode-line">${esc(m.line)}</span>
        <ul>${m.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      </button>`).join("")}</div>
      <button class="ob-improve${improveOn ? " on" : ""}" data-improve><i></i><span><b>Help make Braino better</b>Let us learn from your conversations with me, what you say and what I answer, to improve Braino. Never sold. Turn it off anytime.</span></button>
      <div class="ob-actions"><button class="ob-go" data-next>Continue</button></div>`;
  }
  if (scene.kind === "try") {
    return heard
      ? `<div class="ob-card" style="width:auto;max-width:560px;margin-top:28px"><small>You said</small><div class="ob-said">"${esc(heard.you)}"</div>${heard.braino ? `<div style="margin-top:10px;color:var(--ink-2)">${esc(heard.braino)}</div>` : ""}</div><div class="ob-actions"><button class="ob-go" data-next>That's it. Continue</button></div>`
      : `<div class="ob-keys"><kbd>control</kbd><kbd>control</kbd><span>then talk</span></div><div class="ob-actions"><button class="ob-skip" data-next>Skip for now</button></div>`;
  }
  if (scene.kind === "done") {
    const ps = snap?.permissions || [];
    const rows = [["Your name", answers.callMe || snap?.name], ["What you do", answers.persona], ["How I learn", answers.learnMode ? (answers.learnMode === "day" ? "Learn my day" : "Only when I ask") : ""], ["Help improve Braino", typeof answers.improveBraino === "boolean" ? (answers.improveBraino ? "Yes" : "No") : ""], ["Permissions", ps.length ? `${ps.filter((p) => p.ok).length} of ${ps.length} allowed` : ""], ["First thing you said", heard?.you ? `"${heard.you}"` : ""], ["Call me", "Control twice, or \"Hey Braino\""]].filter((r) => r[1]);
    return `<div class="ob-know">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div><div class="ob-actions"><button class="ob-go" data-next>Start using Braino</button></div>`;
  }
  return "";
}

function render() {
  const scene = SCENES[at];
  const head = `<p class="ob-kicker">${esc(scene.kicker)}</p><h1 class="ob-big">${lit(scene)}</h1>${scene.sub ? `<p class="ob-sub">${esc(scene.sub)}</p>` : ""}`;
  $("ob-stage").innerHTML = scene.art
    ? `<section class="ob-scene"><div>${head}${body(scene)}</div><div class="ob-art${IMG[scene.art] ? " img" : ""}"${IMG[scene.art] ? ` style="background-image:url('${IMG_BASE}${IMG[scene.art]}.jpg')"` : ""}>${ART[scene.art]()}</div></section>`
    : `<section class="ob-scene solo"><div>${scene.banner ? `<div class="ob-banner" style="background-image:url('${IMG_BASE}${scene.banner}.jpg')"></div>` : ""}${head}${body(scene)}</div></section>`;
  $("ob-dots").innerHTML = SCENES.map((_, i) => `<i class="${i === at ? "on" : i < at ? "done" : ""}"></i>`).join("");
  $("ob-back").hidden = at === 0;
  $("ob-count").textContent = `${at + 1} of ${SCENES.length}`;
  $("ob-name")?.focus();
  void tell(scene);
}

/* He says each scene once. Story scenes move on a breath after he finishes. */
const started = new Set();
async function tell(scene) {
  // A re-render (a permission turning green) must not restart his line.
  if (spoken.has(scene.id) || started.has(scene.id)) return;
  started.add(scene.id);
  const finished = await say(val(scene.say), light);
  if (!finished || SCENES[at]?.id !== scene.id) return;
  spoken.add(scene.id);
  light(1);
  if (scene.kind === "story") setTimeout(() => { if (SCENES[at]?.id === scene.id) next(); }, 900);
}

async function save(patch) { Object.assign(answers, patch); await api.setupSave?.(patch).catch(() => null); }

function next() {
  const scene = SCENES[at];
  stopVoice();
  spoken.add(scene.id);
  if (scene.kind === "name") {
    const v = $("ob-name")?.value.trim();
    if (!v) { $("ob-name")?.focus(); return; }
    void save({ callMe: v });
  }
  if (scene.kind === "learn") void save({ learnMode, memoryOn: learnMode === "day", improveBraino: improveOn });
  if (scene.kind === "done") { void save({ completed: true }).then(() => window.close()); return; }
  at = Math.min(SCENES.length - 1, at + 1);
  while (SCENES[at].when && !SCENES[at].when() && at < SCENES.length - 1) at += 1;
  render();
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) {
    // A click anywhere on a story scene moves it on, like turning a page.
    if (SCENES[at].kind === "story" && e.target.closest(".ob-stage")) next();
    return;
  }
  if (t.id === "ob-back") { stopVoice(); at = Math.max(0, at - 1); while (at > 0 && SCENES[at].when && !SCENES[at].when()) at -= 1; started.delete(SCENES[at].id); render(); return; }
  if (t.id === "ob-sound") { muted = !muted; try { localStorage.setItem("obMuted", muted ? "1" : "0"); } catch (_) {} if (muted) stopVoice(); paintSound(); return; }
  if (t.hasAttribute("data-next")) { next(); return; }
  if (t.dataset.school) { await save({ school: t.dataset.school, org: t.dataset.school === "Somewhere else" ? "" : t.dataset.school }); render(); setTimeout(next, 350); return; }
  if (t.hasAttribute("data-mesa-open")) { void api.mesaOpenDeveloper?.(); return; }
  if (t.hasAttribute("data-mesa-save")) {
    const token = $("ob-mesa")?.value.trim();
    if (!token) { $("ob-mesa")?.focus(); return; }
    mesaState = { ...mesaState, busy: true, error: "" }; render();
    const r = await api.mesaTokenSave?.(token).catch(() => null);
    mesaState = r?.ok ? { connected: true, name: r.name || "", program: r.program || "", error: "", busy: false } : { ...mesaState, busy: false, error: r?.error || "That didn't work. Try again." };
    render();
    if (r?.ok) void say(`Got it${r.name ? `, ${r.name.split(" ")[0]}` : ""}. I can see Nexus now.`);
    return;
  }
  if (t.dataset.mode) { learnMode = t.dataset.mode; render(); return; }
  if (t.hasAttribute("data-improve")) { improveOn = !improveOn; render(); return; }
  if (t.dataset.choice) { await save({ persona: t.dataset.choice }); render(); setTimeout(next, 350); return; }
  if (t.dataset.wake) { const r = await api.namedMode?.({ enabled: true }).catch(() => null); wakeOn = Boolean(r?.enabled ?? true); render(); if (wakeOn) void say("Now just say Hey Braino."); return; }
  if (t.dataset.ask) { t.textContent = "Waiting…"; await api.setupAsk?.(t.dataset.ask); void checkPermissions(); }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.target.id === "ob-name" || SCENES[at].kind === "story")) next();
});

/* Permissions, live: checked every second while that scene is up. */
async function checkPermissions() {
  const r = await api.setupPermissions?.().catch(() => null);
  if (!r?.ok || !snap) return;
  const before = Object.fromEntries((snap.permissions || []).map((p) => [p.id, p.ok]));
  snap.permissions = r.permissions;
  const fresh = r.permissions.filter((p) => p.ok && before[p.id] === false);
  if (fresh.length && SCENES[at].kind === "perms") { render(); const line = GRANTED[fresh[0].id]; if (line) void say(line); }
}
setInterval(() => { if (!document.hidden && SCENES[at]?.kind === "perms") void checkPermissions(); }, 1000);

/* Try me: the first real thing said to him shows up here. */
api.onSetupHeard?.((h) => { if (SCENES[at]?.kind !== "try" || !h?.you) return; heard = h; void save({ firstWords: h.you }); render(); });

function paintSound() { $("ob-sound").textContent = muted ? "Sound off" : "Sound on"; }

(async () => {
  paintSound();
  try { const s = await api.setupSnapshot?.(); if (s?.ok) { snap = s; Object.assign(answers, { callMe: s.answers?.callMe, persona: s.answers?.persona }); if (s.answers?.learnMode) learnMode = s.answers.learnMode; if (typeof s.answers?.improveBraino === "boolean") improveOn = s.answers.improveBraino; } } catch (_) {}
  try { const m = await api.mesaTokenStatus?.(); if (m?.connected) mesaState = { connected: true, name: m.name || "", program: m.program || "", error: "", busy: false }; } catch (_) {}
  render();
})();
})();
