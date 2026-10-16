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
let peek = { calendar: null, spotify: null };   // what Connect read back, live
let peekTimer = 0;
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
/* ── The pictures (rebuilt 2026-10-16) ─────────────────────────────────────
 * "The Mac, alive": every scene is the same small MacBook screen, the
 * homepage's pixel art as its desktop, a real notch at the top, and the one
 * moment the sentence is about, playing as a short loop. Drawn in code, so it
 * is sharp at any size and identical on the website and in the app. The old
 * pictures were a wallpaper with a text card on it, seven times. */
const IMG = { os: "affective-hero", notch: "os-senses", new: "os-hands", meetings: "os-voice", lectures: "os-memory", day: "affective-hero", messages: "os-hands", do: "os-senses", dictate: "os-voice", memory: "os-memory" };
const L = (t, d, cls = "") => `<div class="mx-l ${cls}" style="--d:${d}s">${t}</div>`;
function mac(art, { app = "Finder", sheet = "", win = "", desk = "", notch = "" } = {}) {
  return `<div class="mx" data-art="${art}">
    <div class="mx-screen" style="background-image:url('${IMG_BASE}${IMG[art] || "affective-hero"}.jpg')">
      <div class="mx-bar"><b></b><b>${app}</b><span>File</span><span>Edit</span><span>View</span><i>9:41</i></div>
      ${desk}
      ${win}
      <div class="mx-notch ${notch}"></div>
      ${sheet ? `<div class="mx-sheet">${sheet}</div>` : ""}
    </div>
  </div>`;
}
const win = (title, body, cls = "") => `<div class="mx-win ${cls}"><div class="mx-win-top"><i></i><i></i><i></i><span>${title}</span></div><div class="mx-win-body">${body}</div></div>`;
const ART = {
  os: () => mac("os", { notch: "is-wide", sheet: `
      <div class="mx-os-mark">Affective<span>OS</span></div>
      <div class="mx-os-senses">${["Sees", "Listens", "Acts", "Remembers"].map((t, i) => `<span style="--d:${0.8 + i * 0.45}s">${t}</span>`).join("")}</div>` }),
  notch: () => mac("notch", { notch: "is-eyes", desk: `<div class="mx-keys"><kbd>control</kbd><kbd>control</kbd></div><div class="mx-ring"></div>` }),
  new: () => mac("new", {
    desk: ["Calendar", "Mail", "WhatsApp", "Chrome"].map((t, i) => `<div class="mx-clutter" style="--i:${i}">${win(t, '<p class="mx-bar-g"></p><p class="mx-bar-g s"></p><p class="mx-bar-g"></p>')}</div>`).join(""),
    sheet: L("“Move my 4pm to 5.”", 2.6, "is-said") + L("✓ Done. Moved, and Riya knows.", 3.6, "is-done") }),
  meetings: () => mac("meetings", { app: "Google Meet",
    win: win("Product sync", `<div class="mx-call">${[["R", "Riya"], ["A", "Arjun"], ["Y", "You"]].map(([i, n], k) => `<div class="mx-tile" style="--k:${k}"><b>${i}</b><span>${n}</span></div>`).join("")}</div>`, "is-call"),
    sheet: L("Notes", 0.4, "is-kick") + L("Riya: the deck needs the new numbers.", 1.0) + L("You: I’ll send it by Friday.", 2.0) + L("You promised · deck by Friday", 3.0, "is-pin") }),
  lectures: () => mac("lectures", { app: "Keynote",
    win: win("Venture Building · Lecture 6", `<div class="mx-slide"><h4>Customer discovery</h4><p class="mx-bar-g"></p><p class="mx-bar-g s"></p><p class="mx-bar-g m"></p></div>`, "is-slide"),
    sheet: `<div class="mx-live"><i></i>LIVE<div class="mx-wave">${Array.from({ length: 14 }, (_, i) => `<b style="--w:${i}"></b>`).join("")}</div></div>` + L("Start with the problem, not the product.", 0.9) + L("Talk to ten people before you build.", 2.0) + L("Watch what they already pay for.", 3.1) }),
  stealth: () => mac("stealth", { app: "Google Meet", notch: "is-eyes",
    desk: `<div class="mx-present">You are presenting your screen</div>
      <div class="mx-shh" aria-hidden="true">\u{1F92B}</div>
      <div class="mx-seen"><small>What they see</small><div class="mx-seen-screen"><div class="mx-seen-bar"></div><div class="mx-seen-win"></div></div></div>` }),
  day: () => peek.calendar?.items?.length ? mac("day", { app: "Calendar", notch: "is-pulse",
    win: win("From your calendar", peek.calendar.items.map((e, i) => `<div class="mx-hour" style="--i:${i}"><time>${esc(e.when.replace(/^(today|tomorrow) at /i, ""))}</time><span>${esc(e.title)}${e.meet ? " \u00b7 Meet" : ""}</span></div>`).join(""), "is-day") }) : mac("day", { app: "Calendar",
    win: win("Today", ["8:30|Good morning, one thing is due", "9:30|Lecture, written down live", "12:00|Market sizing is due at 2", "4:00|Meeting notes and promises", "5:50|Your call with Arjun in 10 min"].map((r, i) => { const [t, x] = r.split("|"); return `<div class="mx-hour" style="--i:${i}"><time>${t}</time><span>${x}</span></div>`; }).join(""), "is-day"),
    notch: "is-pulse" }),
  messages: () => mac("messages", { app: "WhatsApp",
    win: win("WhatsApp", `<div class="mx-wa"><div class="mx-wa-list"><p><b>Riya Khurana</b><span>see you at 5</span></p><p><b>Riya</b><span>ok!</span></p><p><b>Arjun</b><span>deck?</span></p></div><div class="mx-wa-chat"><div class="mx-bubble">Running 10 minutes late <i>✓✓</i></div></div></div>`, "is-wa"),
    sheet: L("“Tell Riya I’m running late.”", 0.4, "is-said") + L("Which Riya?", 1.2) + `<div class="mx-l mx-chips" style="--d:1.6s"><span class="is-pick">Riya Khurana</span><span>the other Riya</span></div>` }),
  do: () => mac("do", { app: "Chrome",
    win: win("Google Flights", `<div class="mx-flights">${[["IndiGo", "6:05", "₹4,212"], ["Akasa", "7:40", "₹4,390"], ["Air India", "9:15", "₹4,875"], ["Vistara", "11:00", "₹5,120"]].map(([a, t, p], i) => `<p class="${i === 0 ? "is-best" : ""}"><b>${a}</b><span>BLR → BOM · ${t}</span><em>${p}</em></p>`).join("")}</div>`, "is-chrome"),
    sheet: L("✓ Opened Google Flights", 0.6, "is-step") + L("✓ Compared 23 flights", 1.5, "is-step") + L("Cheapest: IndiGo, ₹4,212", 2.4, "is-done") }),
  dictate: () => mac("dictate", { app: "Mail",
    win: win("New message", `<div class="mx-mail"><p><span>To</span>Arjun</p><p><span>Subject</span>Deck</p><div class="mx-type"><span>The deck is ready. We can meet Friday.</span><i></i></div></div>`, "is-mail"),
    sheet: `<div class="mx-l is-kick" style="--d:.3s">You said</div>` + L("um so tell him the deck is ready and uh we can meet friday", 0.6, "is-raw") }),
  memory: () => mac("memory", { app: "Braino",
    win: win("What I remember", ["You’re vegetarian.", "You like music while you work.", "Riya is your co-founder.", "Your mom’s birthday is 12 Nov."].map((t, i) => `<div class="mx-fact" style="--i:${i}">${t}<span>${i === 2 ? "you told me" : "I noticed"}</span></div>`).join(""), "is-mem"),
    notch: "is-pulse" }),
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
  /* Real: in a meeting he is hidden from screen recording (setContentProtection). */
  { id: "stealth", kind: "story", kicker: "Meetings", title: "Share your screen. I'll *vanish.*", say: "Share your screen in a meeting, and I vanish. You still see me. Nobody else does.", sub: "In a meeting, I stay on your screen and stay off everyone else's. Nobody on the call sees me.", art: "stealth" },
  { id: "lectures", kind: "story", kicker: "Lectures", title: "Every lecture, written down while you *listen.*", say: "Every lecture, written down while you listen. Live, the whole class.", sub: "Press Command Shift E in class. I write it all, live, so you can just pay attention.", art: "lectures" },
  { id: "messages", kind: "story", kicker: "Your people", title: "Message anyone, just by *saying* it.", say: "Message anyone, just by saying it. And if two people share a name, I'll ask which one.", sub: "WhatsApp from your voice. Two people with the same name? I ask first.", art: "messages" },
  { id: "do", kind: "story", kicker: "Do it for me", title: "Say it. I'll get it *done.*", say: "Say it, and I'll get it done. And while I work, I'll tell you what I'm doing.", sub: "I open, search, compare and type for you. And I tell you what I'm doing as I go.", art: "do" },
  { id: "dictate", kind: "story", kicker: "Type with your voice", title: "Talk anywhere. I'll *type* it.", say: "Talk anywhere, and I'll type it. Press Option twice in any app.", sub: "Press Option twice in any app. Your words, cleaned up, right where your cursor is.", art: "dictate" },
  { id: "memory", kind: "story", kicker: "Memory", title: "Tell me once. I'll *remember.*", say: "Tell me once, and I'll remember. You never have to repeat yourself.", sub: "What matters to you stays with me. You can see, edit or delete anything I keep.", art: "memory" },
  { id: "name", kind: "name", banner: "affective-footer", kicker: "Make me yours", title: "First, what should I *call* you?", say: "Now, let me get to know you. What should I call you?" },
  { id: "persona", kind: "persona", kicker: "Make me yours", title: "And what do you *do?*", say: "And what do you do?", options: ["Student", "Founder", "Engineer", "Designer", "Creator", "Something else"] },
  /* Students: where, and for Mesa, their Nexus connected through Mesa's own
     API with a personal token, saved only on this Mac (2026-10-13). */
  { id: "mesa", kind: "mesa", when: () => answers.school === "Mesa School of Business", kicker: "Your Nexus", title: "Let me into *Nexus.*", say: "Let me into Nexus, and I'll always know your classes, deadlines and attendance.", sub: "Your classes, deadlines, grades and attendance, straight from Mesa. Your token stays on this Mac only." },
  { id: "perms", kind: "perms", kicker: "Trust", title: "Four quick *yeses.*", say: "Four quick yeses from your Mac, and I can really help. Tap Allow on each one.", sub: "Your Mac asks once for each. Every one turns green the moment it works." },
  /* How he learns (2026-10-13): the person picks, and the pick is applied
     (memoryOn switches the activity diary, improveBraino the conversation
     log). Every line here is what the code does today, including what goes
     to the cloud. */
  { id: "learn", kind: "learn", kicker: "Your choice", title: "How should I *learn* about you?", say: "One choice, and it's yours. How much should I learn about your day?", sub: "Here's exactly what each one means. You can change it anytime." },
  { id: "try", kind: "try", kicker: "Your first moment", title: "Now, *talk* to me.", say: "Now, talk to me. Press Control twice and ask me anything.", sub: "Press Control twice, then ask anything. Try: what can you do?" },
  /* Connect, then the payoff: he pulls from what you just connected, live
     (2026-10-16). Your day sits here, at the end, with your real day in it. */
  { id: "connect", kind: "connect", kicker: "Your world", title: "Let me into your *day.*", say: "Two more, and I can really run your day. Connect your calendar and your music.", sub: "Read only. I never change or post anything without asking you first." },
  { id: "day", kind: "story", kicker: "Your day", title: () => (peek.calendar?.items?.length ? "Here\u2019s your day, *already.*" : "I make your whole day a little *lighter.*"), say: () => (peek.calendar?.items?.length ? `Here\u2019s what\u2019s next. ${peek.calendar.items[0].title}, ${peek.calendar.items[0].when}.` : "From your first class to your last meeting, I make your whole day a little lighter."), sub: "A good morning that knows what's next, notes while you listen, and a heads up before things are due.", art: "day" },
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
  /* Onboarding stays general. Nexus is only for Mesa students, so it is a
     small optional box here, not a question everyone answers (2026-10-15). */
  if (scene.kind === "connect") {
    const cal = peek.calendar, sp = peek.spotify;
    const calRow = cal?.connected
      ? `<div class="ob-perm ok"><i></i><div><b>Google Calendar</b><span>Pulling your next ${cal.items.length || ""} events\u2026</span><ul class="ob-pull">${cal.items.slice(0, 3).map((e, i) => `<li style="--i:${i}"><time>${esc(e.when)}</time>${esc(e.title)}</li>`).join("") || "<li>Nothing on in the next two days.</li>"}</ul></div><em>Connected</em></div>`
      : `<div class="ob-perm"><i></i><div><b>Google Calendar</b><span>so I can book Meets and tell you what\u2019s next</span></div><button data-connect="calendar">${peekTimer && peek.waiting === "calendar" ? "Waiting\u2026" : "Connect"}</button></div>`;
    const spRow = sp?.connected
      ? `<div class="ob-perm ok"><i></i><div><b>Spotify</b><span>${sp.top ? `Your song this month: <strong class="ob-song">${esc(sp.top.title)}</strong>${sp.top.artist ? ` by ${esc(sp.top.artist)}` : ""}` : `Lately: ${esc(sp.recent.map((r) => r.title).join(", "))}`}</span></div><em>Connected</em></div>`
      : `<div class="ob-perm"><i></i><div><b>Spotify</b><span>so I can play what you love, and know your taste</span></div><button data-connect="spotify">${peekTimer && peek.waiting === "spotify" ? "Waiting\u2026" : "Connect"}</button></div>`;
    return `<div class="ob-perms">${calRow}${spRow}</div><div class="ob-actions"><button class="ob-go" data-next>${cal?.connected || sp?.connected ? "Continue" : "Continue for now"}</button></div>`;
  }
  if (scene.kind === "persona") return `<div class="ob-choices">${scene.options.map((o) => `<button class="ob-choice${answers.persona === o ? " on" : ""}" data-choice="${esc(o)}">${esc(o)}</button>`).join("")}</div>
      <button type="button" class="ob-mesa-box${answers.school === "Mesa School of Business" ? " on" : ""}" data-mesa-start aria-pressed="${answers.school === "Mesa School of Business"}"><b>At Mesa School of Business?</b><span>${answers.school === "Mesa School of Business" ? "\u2713 Nexus is next. Now pick what you do." : "Connect Nexus and I'll know your classes and deadlines"}</span><i aria-hidden="true">${answers.school === "Mesa School of Business" ? "\u2713" : "\u2192"}</i></button>`;
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
    ? `<section class="ob-scene"><div>${head}${body(scene)}</div><div class="ob-art-mx">${ART[scene.art]()}</div></section>`
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
  // Designing on the website: ?hold=1 keeps a scene up instead of moving on.
  if (scene.kind === "story" && !window.OB_HOLD) setTimeout(() => { if (SCENES[at]?.id === scene.id) next(); }, 900);
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
  if (t.dataset.connect) {
    const kind = t.dataset.connect;
    await api.onbConnect?.(kind).catch(() => null);
    peek.waiting = kind;
    const started = Date.now();
    window.clearInterval(peekTimer);
    peekTimer = window.setInterval(async () => {
      const r = await api.onbPeek?.(kind).catch(() => null);
      if (r?.connected) {
        window.clearInterval(peekTimer); peekTimer = 0; peek.waiting = "";
        peek[kind] = r;
        render();
        if (kind === "spotify" && r.top) void say(`Your song this month is ${r.top.title}. Good taste.`);
        if (kind === "calendar") void say(r.items?.length ? `Got it. Next up, ${r.items[0].title}.` : "Got it. Your calendar is clear for now.");
      } else if (Date.now() - started > 3 * 60000) { window.clearInterval(peekTimer); peekTimer = 0; peek.waiting = ""; render(); }
    }, 2500);
    render();
    return;
  }
  if (t.hasAttribute("data-mesa-start")) {
    // Marks them as Mesa; they still pick what they do, then Nexus comes next.
    const on = answers.school !== "Mesa School of Business";
    await save({ school: on ? "Mesa School of Business" : "", org: on ? "Mesa School of Business" : "" });
    render();
    return;
  }
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
  // Already connected (a returning person): show what he reads, no buttons.
  try { const [c, sp] = await Promise.all([api.onbPeek?.("calendar"), api.onbPeek?.("spotify")]); if (c?.connected) peek.calendar = c; if (sp?.connected) peek.spotify = sp; } catch (_) {}
  // Designing on the website: ?scene=meetings opens that scene directly.
  if (window.OB_START) { const k = SCENES.findIndex((x) => x.id === window.OB_START); if (k >= 0) at = k; }
  try { const m = await api.mesaTokenStatus?.(); if (m?.connected) mesaState = { connected: true, name: m.name || "", program: m.program || "", error: "", busy: false }; } catch (_) {}
  render();
})();
})();
