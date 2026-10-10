/* Welcome to Braino (2026-10-10). A new onboarding, written from scratch as a
   story: AffectiveOS, then Braino, then what is new, then making him yours,
   then trust, then talking to him, then what he knows about you.

   Story scenes are spoken in his real voice (setupSay, the same Fish voice as
   the notch) and the sentence lights up word by word as he says it. They move
   on by themselves; a click moves on sooner. Everything said here is about
   what works today. House rule: no dashes in anything Braino says. */
const api = window.brainoMac || {};
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let snap = null;              // name, permissions, saved answers (setupSnapshot)
const answers = {};
let heard = null;             // the first thing said to him, from "Try me"
let at = 0;
let muted = false;
try { muted = localStorage.getItem("obMuted") === "1"; } catch (_) {}
const spoken = new Set();

/* ── The pictures ── */
const ART = {
  os: () => `<div class="ob-os"><b>AffectiveOS</b><span>it understands you</span></div>`,
  notch: () => `<div class="ob-mac"></div><div class="ob-notch"><i class="ob-eye"></i><i class="ob-eye"></i></div><div class="ob-arrow">↑ Braino lives here</div>`,
  new: () => `<div class="ob-stack"><div class="ob-card"><small>Apps</small><div>You open them. You learn them. You do the work.</div></div><div class="ob-card"><small>Braino</small><div class="ob-said">Already here. Just ask.</div></div></div>`,
  meetings: () => `<div class="ob-card"><small>Product sync · 4:00</small>
      <div class="ob-line">Riya: the deck needs the new numbers.</div>
      <div class="ob-line">You: I'll send it by Friday.</div>
      <div class="ob-line">Arjun: let's ship the beta Monday.</div>
      <div class="ob-line ob-hl">You promised: send the deck by Friday.</div></div>`,
  day: () => `<div class="ob-card"><small>Good morning</small>
      <div class="ob-line ob-row"><time>9:30</time><span>Venture Building, Room 2</span></div>
      <div class="ob-line ob-row"><time>2:00</time><span>Market sizing due today</span></div>
      <div class="ob-line ob-row"><time>6:00</time><span>Call with Arjun</span></div>
      <div class="ob-line ob-hl">One thing due today. I'll remind you at noon.</div></div>`,
  messages: () => `<div class="ob-stack"><div class="ob-card"><small>You said</small><div class="ob-said">"Send this to Riya on WhatsApp"</div></div>
      <div class="ob-card"><small>Braino</small><div>Which Riya?</div><span class="ob-pill first">Riya Khurana</span><span class="ob-pill">the other Riya</span></div></div>`,
  do: () => `<div class="ob-stack"><div class="ob-card"><small>You said</small><div class="ob-said">"Play Billie Jean"</div></div>
      <div class="ob-card"><small>Braino</small><div class="ob-done">Playing on Spotify.</div></div></div>`,
};

/* ── The story ── *word* is the word the line turns on. */
const SCENES = [
  { id: "os", kind: "story", kicker: "Welcome to AffectiveOS", title: "A computer that finally *understands* you.", say: "Welcome to AffectiveOS. A computer that finally understands you.", art: "os" },
  { id: "braino", kind: "story", kicker: "Meet Braino", title: "This is Braino. He lives in your *notch.*", say: "And this is me, Braino. I live in your notch, right at the top of your screen.", art: "notch" },
  { id: "new", kind: "story", kicker: "Something new", title: "Not an app you open. Someone who's already *there.*", say: "I'm not an app you open. I'm already here. Just ask.", art: "new" },
  { id: "meetings", kind: "story", kicker: "Meetings", title: "Your meetings will never be the *same.*", say: "Your meetings will never be the same. I listen, I write the notes, and I remember what you promised.", sub: "He listens, writes the notes, and remembers what you promised.", art: "meetings" },
  { id: "day", kind: "story", kicker: "Your day", title: "He knows your day before you *ask.*", say: "I know your day. Your classes, your deadlines, and what's due today.", sub: "Classes, deadlines, and a good morning that knows what's next.", art: "day" },
  { id: "messages", kind: "story", kicker: "Your people", title: "Message anyone, just by *saying* it.", say: "Message anyone just by saying it. And if two people share a name, I'll ask which one.", sub: "WhatsApp from your voice. Two people with the same name? He asks first.", art: "messages" },
  { id: "do", kind: "story", kicker: "Do it for me", title: "Say it. It's *done.*", say: "Say it, and it's done. I open, play, type and search for you.", sub: "Open, play, type, search. Out loud, from anywhere.", art: "do" },
  { id: "name", kind: "name", kicker: "Make him yours", title: "First, what should I *call* you?", say: "Now, let me get to know you. What should I call you?" },
  { id: "persona", kind: "persona", kicker: "Make him yours", title: "And what do you *do?*", say: "And what do you do?", options: ["Student", "Founder", "Engineer", "Designer", "Creator", "Something else"] },
  { id: "perms", kind: "perms", kicker: "Trust", title: "Four quick *yeses.*", say: "Four quick yeses from your Mac, and I can really help. Tap Allow on each one.", sub: "Your Mac asks once for each. Every one turns green the moment it works." },
  { id: "try", kind: "try", kicker: "Your first moment", title: "Now, *talk* to me.", say: "Now, talk to me. Press Control twice and ask me anything.", sub: "Press Control twice, then ask anything. Try: what can you do?" },
  { id: "done", kind: "done", kicker: "That's us", title: () => `Nice to meet you, *${answers.callMe || snap?.name || "friend"}.*`, say: () => `Nice to meet you, ${answers.callMe || snap?.name || "friend"}. I'm right up there whenever you need me.` },
];
const WHY = { microphone: "so I can hear you, and your meetings", accessibility: "so I can click and type for you", screen: "so I can see what you see", contacts: "so I know who's who" };
const GRANTED = { microphone: "Now I can hear you.", accessibility: "Now I can click and type for you.", screen: "Now I can see what you see.", contacts: "Now I know who's who." };

const val = (v) => (typeof v === "function" ? v() : v);
function lit(scene) {
  let accent = false;
  return val(scene.title).split(/\s+/).filter(Boolean).map((w) => {
    if (w.startsWith("*")) accent = true;
    const html = `<span class="ob-w${spoken.has(scene.id) ? " on" : ""}${accent ? " ob-d" : ""}">${esc(w.replace(/\*/g, ""))} </span>`;
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
  if (scene.kind === "persona") return `<div class="ob-choices">${scene.options.map((o) => `<button class="ob-choice${answers.persona === o ? " on" : ""}" data-choice="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  if (scene.kind === "perms") {
    const ps = snap?.permissions || [];
    return `<div class="ob-perms">${ps.map((p) => `<div class="ob-perm${p.ok ? " ok" : ""}"><i></i><div><b>${esc(p.label)}</b><span>${esc(WHY[p.id] || p.why)}</span></div>${p.ok ? "<em>Allowed</em>" : `<button data-ask="${esc(p.id)}">Allow</button>`}</div>`).join("")}</div>
      <div class="ob-actions"><button class="ob-go" data-next>${ps.length && ps.every((p) => p.ok) ? "Continue" : "Continue for now"}</button></div>`;
  }
  if (scene.kind === "try") {
    return heard
      ? `<div class="ob-card" style="width:auto;max-width:560px;margin-top:28px"><small>You said</small><div class="ob-said">"${esc(heard.you)}"</div>${heard.braino ? `<div style="margin-top:10px;color:var(--ink-2)">${esc(heard.braino)}</div>` : ""}</div><div class="ob-actions"><button class="ob-go" data-next>That's it. Continue</button></div>`
      : `<div class="ob-keys"><kbd>control</kbd><kbd>control</kbd><span>then talk</span></div><div class="ob-actions"><button class="ob-skip" data-next>Skip for now</button></div>`;
  }
  if (scene.kind === "done") {
    const ps = snap?.permissions || [];
    const rows = [["Your name", answers.callMe || snap?.name], ["What you do", answers.persona], ["Permissions", ps.length ? `${ps.filter((p) => p.ok).length} of ${ps.length} allowed` : ""], ["First thing you said", heard?.you ? `"${heard.you}"` : ""], ["Call him", "Control twice, or \"Hey Braino\""]].filter((r) => r[1]);
    return `<div class="ob-know">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}</div><div class="ob-actions"><button class="ob-go" data-next>Start using Braino</button></div>`;
  }
  return "";
}

function render() {
  const scene = SCENES[at];
  const head = `<p class="ob-kicker">${esc(scene.kicker)}</p><h1 class="ob-big">${lit(scene)}</h1>${scene.sub ? `<p class="ob-sub">${esc(scene.sub)}</p>` : ""}`;
  $("ob-stage").innerHTML = scene.art
    ? `<section class="ob-scene"><div>${head}${body(scene)}</div><div class="ob-art">${ART[scene.art]()}</div></section>`
    : `<section class="ob-scene solo"><div>${head}${body(scene)}</div></section>`;
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
  if (scene.kind === "done") { void save({ completed: true }).then(() => window.close()); return; }
  at = Math.min(SCENES.length - 1, at + 1);
  render();
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) {
    // A click anywhere on a story scene moves it on, like turning a page.
    if (SCENES[at].kind === "story" && e.target.closest(".ob-stage")) next();
    return;
  }
  if (t.id === "ob-back") { stopVoice(); at = Math.max(0, at - 1); started.delete(SCENES[at].id); render(); return; }
  if (t.id === "ob-sound") { muted = !muted; try { localStorage.setItem("obMuted", muted ? "1" : "0"); } catch (_) {} if (muted) stopVoice(); paintSound(); return; }
  if (t.hasAttribute("data-next")) { next(); return; }
  if (t.dataset.choice) { await save({ persona: t.dataset.choice }); render(); setTimeout(next, 350); return; }
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
  try { const s = await api.setupSnapshot?.(); if (s?.ok) { snap = s; Object.assign(answers, { callMe: s.answers?.callMe, persona: s.answers?.persona }); } } catch (_) {}
  render();
})();
