/* AffectiveOS Memory: the day, and what it knows about you, sorted so a
   person can read it. Separate from Braino on purpose: this is the layer,
   Braino is one of the things that reads it.

   2026-09-29 rebuild. The first map wired every app, site and person to the
   hour it happened in, with every hour a dot: forty hours-and-things all
   linked to each other, and Chrome (most of any day) one giant dot tied to
   everything. Itish: "jumble jumble, I could not understand anything". Now:

   - Two halves. TODAY on the left, WHAT I KNOW ABOUT YOU on the right.
   - Today is sorted into what you were doing (Building, Watching, Messages,
     Social, Errands, Study, Talking to Braino), each a hub with its things
     around it. A website counts as itself: Netflix is Watching, GitHub is
     Building, not both "Chrome".
   - The hours leave the map and become a strip along the bottom. Tap an
     hour to light up what happened in it.
   - What it knows is sorted into Who you are, What you like, Your people,
     Your work, Coming up, with what it learned today called out.
   - Fixed places, not physics: the same day always looks the same. */
const api = window.brainoMac;
const el = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── the categories ──────────────────────────────────────────────────────────
/* What you were doing. Order is the order they are listed when tied. */
const CATS = {
  build:   { label: "Building", tok: "--blue", blurb: "code, Claude and your own sites" },
  study:   { label: "Study", tok: "--sky", blurb: "classes, notes and reading" },
  people:  { label: "Messages", tok: "--rose", blurb: "WhatsApp, mail and chats" },
  social:  { label: "Social", tok: "--gold", blurb: "LinkedIn, X, Pinterest, Medium" },
  watch:   { label: "Watching & listening", tok: "--purple", blurb: "shows, videos and music" },
  errands: { label: "Errands & shopping", tok: "--green", blurb: "orders, deliveries, bookings" },
  braino:  { label: "Talking to Braino", tok: "--coral", blurb: "what you asked him" },
  other:   { label: "Everything else", tok: "--hourdot", blurb: "Finder, settings, searching" },
};
/* What it knows, in words a person uses. Keys are the memory engine's own
   categories (supabase/functions/_shared/memory-engine/extract.ts). */
const KNOW = {
  identity:     { label: "Who you are", blurb: "your name, where you live, what you do" },
  project:      { label: "Your work", blurb: "what you are building and studying" },
  relationship: { label: "Your people", blurb: "the people in your life" },
  preference:   { label: "What you like", blurb: "how you like things done" },
  event:        { label: "Coming up", blurb: "plans, dates and deadlines" },
  fact:         { label: "Other things", blurb: "everything else worth keeping" },
};

const SITE_RULES = [
  ["build", /github|gitlab|localhost|127\.0\.0\.1|supabase|vercel|netlify|trybraino|claude\.ai|anthropic|chatgpt|openai|stackoverflow|npmjs|figma|lovable|cursor|polar\.sh|cloudflare|render\.com|railway|huggingface|developer\.|console\./],
  ["study", /mesa|nexus|coursera|udemy|scholar\.google|wikipedia|edx|khanacademy|classroom|canvas|brilliant/],
  ["people", /mail\.google|gmail|outlook|web\.whatsapp|slack|discord|teams\.microsoft|telegram|messenger/],
  ["social", /linkedin|twitter|^x\.com|instagram|facebook|pinterest|reddit|medium|threads|substack|producthunt|quora/],
  ["watch", /netflix|youtube|youtu\.be|primevideo|hotstar|spotify|music\.apple|twitch|jiocinema|sonyliv|disneyplus|soundcloud|zee5|mxplayer/],
  ["errands", /amazon|flipkart|blinkit|zepto|swiggy|zomato|porter|uber|olacabs|myntra|bigbasket|instamart|paytm|phonepe|bank|irctc|makemytrip|booking|airbnb|nykaa|ajio|dunzo|rapido/],
];
const APP_RULES = [
  ["build", /cursor|terminal|iterm|warp|xcode|visual studio|^code$|github|claude|figma|simulator|docker|postman|tableplus|android studio/i],
  ["people", /whatsapp|^mail$|messages|slack|discord|telegram|zoom|facetime|teams|outlook/i],
  ["watch", /spotify|^music$|netflix|^tv$|vlc|iina|quicktime|podcasts|youtube/i],
  ["study", /notion|obsidian|^pages$|word|keynote|powerpoint|books|goodnotes|anki/i],
];
const BROWSER = /chrome|safari|^arc$|firefox|brave|edge|opera/i;
const siteCat = (d) => (SITE_RULES.find(([, re]) => re.test(d)) || ["other"])[0];
const appCat = (a) => (APP_RULES.find(([, re]) => re.test(a)) || ["other"])[0];

const KIND_WORDS = {
  site: "A website", app: "An app", person: "Someone who messaged you", song: "Something you played",
  project: "A Claude Code project", braino: "Talking to Braino", hub: "What you were doing", topic: "What I know about you",
  fact: "Something I remember for good", hour: "An hour of your day", you: "You",
};

let rows = [];
let photos = []; // [{ at, src }] from Apple Photos, only after "Today's photos"
const photosIn = (from, to) => photos.filter((p) => { const h = new Date(p.at).getHours(); return h >= from && h <= to; });
let hoursDigest = [];
let facts = [];
let paused = false;

// ── the look: Paper (Affective) or Mind (Braino OS) ─────────────────────────
let look = "mind";
try { look = localStorage.getItem("aosMemoryLook") || "mind"; } catch (_) {}
const INK = {};
var sprites = {};
function toHex(c) {
  const m = String(c).trim().match(/^rgba?\(([^)]+)\)$/);
  if (!m) return String(c).trim();
  const [r, g, b] = m[1].split(",").map((v) => Math.round(parseFloat(v)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const get = (t) => cs.getPropertyValue(t).trim();
  for (const c of Object.values(CATS)) c.color = toHex(get(c.tok)) || "#888888";
  INK.ink = get("--ink"); INK.ink2 = get("--ink2"); INK.ink3 = get("--ink3"); INK.line = get("--line"); INK.bg = get("--bg");
  INK.know = toHex(get("--teal")); INK.hour = toHex(get("--hourdot")); INK.you = toHex(get("--ink"));
  // One theme for both looks: the Paper palette and type (2026-09-30).
  INK.mind = false;
  INK.glow = matchMedia("(prefers-color-scheme: dark)").matches;
  INK.font = "-apple-system, BlinkMacSystemFont, sans-serif";
  sprites = {};
}
function setLook(next) {
  look = next === "mind" ? "mind" : "paper";
  document.documentElement.dataset.look = look;
  el("look-paper").setAttribute("aria-selected", String(look === "paper"));
  el("look-mind").setAttribute("aria-selected", String(look === "mind"));
  try { localStorage.setItem("aosMemoryLook", look); } catch (_) {}
  readPalette(); renderLegend(); renderRibbon(); renderRead();
  applyMindLook();
  if (selected) select(selected, "refresh");
}
/* Mind is the Braino OS body with the memory in it (memory-mind.js). */
function applyMindLook() {
  const mind = look === "mind" && window.MemoryMind;
  el("map").hidden = Boolean(mind); el("mind-stage").hidden = !mind;
  if (!window.MemoryMind) return;
  if (mind) { MemoryMind.mount(el("mind-stage")); pushMind(); MemoryMind.start(); } else MemoryMind.stop();
}
function pushMind() {
  if (!window.MemoryMind || look !== "mind") return;
  const groups = nodes.filter((n) => n.type === "hub").map((h) => ({ id: h.id, label: h.label, sub: h.seconds >= 60 ? dur(h.seconds) : `${h.count} thing${h.count === 1 ? "" : "s"}`, color: CATS[h.cat].color, items: h.items.slice(0, 14).map((x) => ({ id: x.id, label: x.label, weight: x.weight, with: relatedOf(x).slice(0, 4).map((r) => r.x.id) })) }));
  const know = byId.get("know");
  if (know) groups.push({ id: "know", label: "What I know about you", sub: `${know.count} remembered${know.fresh ? ` · ${know.fresh} new` : ""}`, color: INK.know,
    items: know.items.flatMap((t) => t.items).slice(0, 24).map((f) => ({ id: f.id, label: f.label, weight: f.fresh ? 2 : 1 })) });
  MemoryMind.setData(groups);
}
/* Which lobe a memory lives in. */
function groupIdOf(n) {
  if (!n) return null;
  if (n.type === "hub" || n.id === "know") return n.id;
  if (n.hub) return n.hub.id;
  if (n.type === "topic" || n.type === "fact") return byId.get("know") ? "know" : null;
  return null;
}
function mindFollow(n) {
  if (!window.MemoryMind || look !== "mind") return;
  if (!n) { MemoryMind.focus(null); MemoryMind.light(null); return; }
  if (n.type === "hour") {
    const ids = new Set(); for (const id of n.links) { const x = byId.get(id); if (x) { ids.add(x.id); if (x.hub) ids.add(x.hub.id); } }
    MemoryMind.focus(n.mainCat ? `cat:${n.mainCat}` : null); MemoryMind.light(ids);
  } else if (n.type === "you") { MemoryMind.focus(null); MemoryMind.light(null); }
  else if (n.type === "hub" || n.id === "know" || n.type === "topic") { MemoryMind.focus(groupIdOf(n)); MemoryMind.light(new Set([n.id, groupIdOf(n)])); }
  else { MemoryMind.focus(n.id); MemoryMind.light(new Set([n.id, groupIdOf(n), ...relatedOf(n).map((r) => r.x.id)])); }
}
if (window.MemoryMind) MemoryMind.onPick((id) => { stopRecap(); if (!id) { select(null); return; } const n = byId.get(id); if (n) select(n, selected ? "walk" : "tap"); });

/* "Play my day": the day, stretch by stretch, in the Mind. */
let recapTimer = 0, recapAt = -1;
function stopRecap() { clearTimeout(recapTimer); recapTimer = 0; recapAt = -1; el("recap")?.classList.remove("on"); if (el("recap")) el("recap").textContent = "▶ Play my day"; window.MemoryMind?.caption(""); }
function recapStep() {
  const list = spans.filter((sp) => sp.node);
  recapAt++;
  if (recapAt >= list.length) { stopRecap(); select(null); return; }
  const sp = list[recapAt];
  const things = [...sp.node.links].map((id) => byId.get(id)).filter((x) => x && x.cat).sort((a, b) => b.weight - a.weight).slice(0, 3).map((x) => x.label);
  select(sp.node);
  window.MemoryMind?.caption(`${sp.label}  ·  ${CATS[sp.cat].label}${things.length ? `  ·  ${things.join(", ")}` : ""}`, photosIn(sp.from, sp.to)[0]?.src);
  recapTimer = setTimeout(recapStep, 3800);
}
el("recap").addEventListener("click", () => {
  if (recapTimer) { stopRecap(); return; }
  if (look !== "mind") setLook("mind");
  el("recap").classList.add("on"); el("recap").textContent = "■ Stop";
  recapAt = -1; recapStep();
});
document.documentElement.dataset.look = look;
readPalette();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { readPalette(); renderLegend(); renderRibbon(); renderRead(); if (selected) select(selected, "refresh"); });

// ── helpers ─────────────────────────────────────────────────────────────────
function hm(iso) { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function hourLabel(h) { const n = Number(h); return n === 0 ? "12 AM" : n < 12 ? `${n} AM` : n === 12 ? "12 PM" : `${n - 12} PM`; }
function hourShort(h) { const n = Number(h); return n === 0 ? "12a" : n < 12 ? `${n}a` : n === 12 ? "12p" : `${n - 12}p`; }
function dur(sec) {
  const m = Math.round(sec / 60);
  if (m < 1) return "under a minute";
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}
function times(n) { return n === 1 ? "once" : n === 2 ? "twice" : `${n} times`; }
function domainOf(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (_) { return ""; } }
function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
function listWords(items) {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || "";
  return `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
}
function dayKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function viewedDay() { return el("day").value || dayKey(new Date()); }
/* The memory engine writes "User lives in Bengaluru". Said to you, that is
   "You live in Bengaluru". */
function humanFact(text) {
  const t = String(text || "").trim().replace(/(?<=\S.*)\bthe user's\b/gi, "your").replace(/(?<=\S.*)\bthe user\b/gi, "you");
  const m = t.match(/^(?:the\s+)?user(?:'s)?\s+(\S+)(.*)$/i);
  if (!m) return t;
  if (/^user's/i.test(t)) return `Your ${m[1]}${m[2]}`;
  const w = m[1], rest = m[2];
  const verb = /^is$/i.test(w) ? "are" : /^was$/i.test(w) ? "were" : /^has$/i.test(w) ? "have" : /^does$/i.test(w) ? "do"
    : /[^aeiou]ies$/i.test(w) ? w.slice(0, -3) + "y" : /(?:s|sh|ch|x|z)es$/i.test(w) ? w.slice(0, -2) : /[^s]s$/i.test(w) ? w.slice(0, -1) : w;
  return `You ${verb}${rest}`;
}
const isLearnedOn = (f, day) => f.created_at && dayKey(new Date(f.created_at)) === day;

/* Seconds each focus row stayed in front. */
function focusSeconds() {
  const out = new Map();
  let next = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (r.kind !== "focus") continue;
    const end = next ? new Date(next.t) : Date.now();
    const sec = Math.max(0, (end - new Date(r.t)) / 1000);
    out.set(i, sec > 3 * 3600 ? 0 : sec);
    next = r;
  }
  return out;
}

// ── the graph ───────────────────────────────────────────────────────────────
let nodes = [];     // what is drawn
let edges = [];     // what is drawn
let byId = new Map(); // everything, hours included
let hourNodes = [];
let catTotals = new Map(); // cat -> seconds-ish
let hourCats = new Map();  // hour -> Map(cat -> seconds-ish)
let spans = [];            // the day as stretches of one thing: 9 to 11 AM, Building
let factIds = new Map();   // fact text -> node id, so Read can open them

const mainCatOf = (h) => { const m = hourCats.get(h); return m ? [...m.entries()].sort((a, b) => b[1] - a[1])[0][0] : null; };
/* Hours in a row doing the same main thing are one stretch. A stretch of
   one hour is that hour's own node; longer ones get their own. */
function buildSpans() {
  spans = [];
  if (!hourNodes.length) return;
  let cur = null;
  for (let h = hourNodes[0].hour; h <= hourNodes[hourNodes.length - 1].hour; h++) {
    const cat = mainCatOf(h);
    if (cur && cat && cur.cat === cat && cur.to === h - 1) { cur.to = h; continue; }
    if (cur && !cat && !cur.cat && cur.to === h - 1) { cur.to = h; continue; }
    cur = { from: h, to: h, cat }; spans.push(cur);
  }
  for (const sp of spans) {
    const list = []; for (let h = sp.from; h <= sp.to; h++) if (byId.get(`h:${h}`)) list.push(h);
    sp.label = sp.from === sp.to ? hourLabel(sp.from) : `${hourLabel(sp.from)} to ${hourLabel(sp.to + 1)}`;
    if (!sp.cat) { sp.node = null; continue; }
    if (list.length === 1) { const n = byId.get(`h:${list[0]}`); n.hoursList = list; n.mainCat = sp.cat; n.spanLabel = sp.label; sp.node = n; continue; }
    const n = { id: `span:${sp.from}-${sp.to}`, type: "hour", hour: sp.from, hoursList: list, mainCat: sp.cat, label: sp.label, spanLabel: sp.label, links: new Set(), hours: new Set(list), count: 0 };
    for (const h of list) { const hn = byId.get(`h:${h}`); for (const id of hn.links) n.links.add(id); n.count += hn.count; }
    byId.set(n.id, n); sp.node = n;
  }
}

function colorOf(n) {
  if (!n) return INK.ink3;
  if (n.type === "you") return INK.you;
  if (n.type === "hour") return n.mainCat ? CATS[n.mainCat].color : INK.hour;
  if (n.type === "topic" || n.type === "fact") return INK.know;
  return CATS[n.cat]?.color || INK.hour;
}
function kindOf(n) {
  if (n.type === "hub") return "What you were doing";
  if (n.type === "hour") return (n.hoursList || []).length > 1 ? "A stretch of your day" : "An hour of your day";
  if (n.cat && n.type !== "hub") return `${CATS[n.cat].label} · ${KIND_WORDS[n.type].replace(/^An? /, "").replace(/^Someone who messaged you$/, "a message")}`;
  return KIND_WORDS[n.type] || "";
}

/* "Time" for things that have no time: a message or a song counts as a
   minute, a word to Braino as half a minute. Only used to size and sort. */
const EVENT_SEC = { person: 60, song: 180, braino: 30, project: 300 };

function buildGraph() {
  const N = new Map();
  const node = (id, type, label, cat) => {
    let n = N.get(id);
    if (!n) { n = { id, type, label, cat, seconds: 0, count: 0, notes: [], hours: new Set(), links: new Set(), weight: 0 }; N.set(id, n); }
    return n;
  };
  const tie = (a, b) => { a.links.add(b.id); b.links.add(a.id); };
  catTotals = new Map(); hourCats = new Map();
  const addTime = (cat, h, sec) => {
    catTotals.set(cat, (catTotals.get(cat) || 0) + sec);
    const m = hourCats.get(h) || new Map(); m.set(cat, (m.get(cat) || 0) + sec); hourCats.set(h, m);
  };

  const secs = focusSeconds();
  rows.forEach((r, i) => {
    const h = new Date(r.t).getHours();
    let thing = null, sec = 0;
    if (r.kind === "focus" && r.app) {
      sec = secs.get(i) || 0;
      const d = r.url ? domainOf(r.url) : "";
      if (d && d !== "newtab" && BROWSER.test(r.app)) {
        thing = node(`site:${d}`, "site", d, siteCat(d));
      } else if (!BROWSER.test(r.app) || !d) {
        thing = node(`app:${r.app}`, "app", r.app, BROWSER.test(r.app) ? "other" : appCat(r.app));
      }
      if (thing && r.title && thing.notes.length < 30 && !thing.notes.includes(r.title)) thing.notes.push(r.title);
    } else if (r.kind === "playing" && r.track) {
      thing = node(`song:${r.track}|${r.artist || ""}`, "song", r.track, "watch");
      thing.artist = r.artist || ""; sec = EVENT_SEC.song;
    } else if (r.kind === "conversation" || r.kind === "braino") {
      thing = node("braino", "braino", "Braino", "braino");
      const said = r.kind === "conversation" ? r.you : r.heard;
      if (said && thing.notes.length < 80) thing.notes.push(`${hm(r.t)}  "${said}"`);
      sec = EVENT_SEC.braino;
    } else if (r.kind === "whatsapp" && r.from) {
      thing = node(`person:${r.from}`, "person", r.from, "people");
      thing.group = Boolean(r.group); thing.important = thing.important || Boolean(r.important); sec = EVENT_SEC.person;
    } else if (r.kind === "claude_session" && r.project) {
      const name = String(r.project).split("/").filter(Boolean).pop() || r.project;
      thing = node(`project:${r.project}`, "project", name, "build");
      thing.path = r.project; sec = EVENT_SEC.project;
    }
    if (!thing) return;
    thing.count++; thing.seconds += sec; thing.hours.add(h);
    const hour = node(`h:${h}`, "hour", hourLabel(h)); hour.hour = h; hour.count++;
    tie(hour, thing);
    addTime(thing.cat, h, sec);
  });
  // Real time only for apps and sites; the rest are counted, not timed.
  for (const n of N.values()) {
    n.weight = n.type === "site" || n.type === "app" ? n.seconds / 60 : n.count * (n.type === "person" ? 3 : n.type === "project" ? 5 : 1.5);
    if (n.type !== "site" && n.type !== "app") n.shownSeconds = 0; else n.shownSeconds = n.seconds;
  }

  const you = node("you", "you", "You");
  // A hub per thing you did, only if there is something in it. Tiny bits
  // (under a minute in front) fold away so a hub is not a cloud of specks.
  const items = [...N.values()].filter((n) => n.cat && n.type !== "hour" && !(["site", "app"].includes(n.type) && n.seconds < 45));
  const hubs = [];
  for (const key of Object.keys(CATS)) {
    const mine = items.filter((n) => n.cat === key);
    if (!mine.length) continue;
    const hub = node(`cat:${key}`, "hub", CATS[key].label, key);
    hub.items = mine.sort((a, b) => b.weight - a.weight);
    hub.seconds = mine.reduce((s, n) => s + (n.shownSeconds || 0), 0);
    hub.weight = mine.reduce((s, n) => s + n.weight, 0);
    hub.count = mine.length;
    for (const n of mine) { tie(hub, n); n.hub = hub; for (const h of n.hours) hub.hours.add(h); }
    tie(you, hub);
    hubs.push(hub);
  }
  hubs.sort((a, b) => b.weight - a.weight);

  // What it knows, by what kind of thing it is.
  const topics = [];
  const day = viewedDay();
  for (const key of Object.keys(KNOW)) {
    const list = facts.filter((f) => (KNOW[f.category] ? f.category : "fact") === key);
    if (!list.length) continue;
    const topic = node(`topic:${key}`, "topic", KNOW[key].label);
    topic.key = key; topic.items = [];
    list.slice(0, 30).forEach((f, i) => {
      const fact = node(`fact:${key}:${i}`, "fact", humanFact(f.content).slice(0, 64));
      fact.full = humanFact(f.content); fact.when = f.created_at; fact.fresh = isLearnedOn(f, day); fact.weight = 1; fact.count = 1;
      tie(topic, fact); topic.items.push(fact);
    });
    topic.count = list.length; topic.fresh = list.filter((f) => isLearnedOn(f, day)).length;
    tie(you, topic);
    topics.push(topic);
  }

  byId = N;
  hourNodes = [...N.values()].filter((n) => n.type === "hour").sort((a, b) => a.hour - b.hour);
  for (const h of hourNodes) h.digest = hoursDigest.find((d) => Number(d.hour) === h.hour) || null;
  buildSpans();
  factIds = new Map();
  for (const n of N.values()) if (n.type === "fact") factIds.set(n.full, n.id);
  /* What I know is one group on the circle, its kinds (Who you are, Your
     work...) around it; the facts themselves open from those. Fourteen
     groups on one ring overlapped; nine do not. */
  const know = topics.length ? node("know", "topic", "What I know about you") : null;
  if (know) {
    for (const t of topics) { you.links.delete(t.id); t.links.delete("you"); tie(know, t); t.parent = know; }
    tie(you, know);
    know.items = topics; know.count = facts.length; know.fresh = topics.reduce((a, t) => a + t.fresh, 0); know.isGroup = true;
  }
  for (const h of hubs) h.isGroup = true;
  layout(you, hubs, know);
  nodes = [you, ...hubs, ...hubs.flatMap((h) => h.shown), ...(know ? [know, ...topics] : [])];
  edges = [
    ...hubs.map((h) => ({ a: you, b: h, w: 3 })), ...hubs.flatMap((h) => h.shown.map((n) => ({ a: h, b: n, w: 1 }))),
    ...(know ? [{ a: you, b: know, w: 3 }, ...topics.map((t) => ({ a: know, b: t, w: 1 }))] : []),
  ];
}

/* One circle. You in the middle; every group (what you did, and what I
   know) on a ring around you, each given a slice as wide as what is in it;
   its things on the ring outside, in its slice. 2026-09-29: the halves and
   the grown fibres read as clutter ("no extra nodes, no extra design").
   The circle turns slowly (frame), so it is alive. */
const HUB_R = 215, ITEM_R = 320, ROW = 44, SLOT = 40, MAX_PER_HUB = 10;
function layout(you, hubs, know) {
  you.x = 0; you.y = 0; you.r = 30; you.bx = 0; you.by = 0;
  const maxW = Math.max(1, ...hubs.flatMap((h) => h.items.map((n) => n.weight)));
  for (const h of hubs) { h.shown = h.items.slice(0, MAX_PER_HUB); h.hidden = h.items.length - h.shown.length; h.items.forEach((n, i) => { n.top = i < 3; }); h.r = 9 + 7 * Math.sqrt(h.weight / Math.max(1, ...hubs.map((x) => x.weight))); }
  if (know) { know.items.sort((a, b) => b.count - a.count); know.items.forEach((t, i) => { t.top = i < 3; }); know.shown = know.items; know.r = 9 + Math.min(7, Math.sqrt(know.count) * 1.4); }
  const groups = [...hubs, ...(know ? [know] : [])];
  const share = (g) => 3.2 + g.shown.length * (g.id === "know" ? 1.9 : 0.8);
  const total = groups.reduce((a, g) => a + share(g), 0) || 1;
  let start = -Math.PI / 2;
  for (const g of groups) {
    const span = (share(g) / total) * Math.PI * 2;
    const a = start + span / 2;
    g.angle = a; g.span = span;
    g.bx = Math.cos(a) * HUB_R; g.by = Math.sin(a) * HUB_R;
    const list = g.shown;
    let placed = 0, row = 0;
    while (placed < list.length) {
      const R = ITEM_R + row * ROW;
      const cap = Math.max(1, Math.floor((span * 0.84 * R) / SLOT));
      const inRow = Math.min(cap, list.length - placed);
      for (let j = 0; j < inRow; j++) {
        const n = list[placed + j];
        const width = span * 0.84 * (inRow === cap ? 1 : inRow / cap);
        const aa = a + (inRow === 1 ? 0 : (j / (inRow - 1) - 0.5) * width) + (row % 2 ? span * 0.42 / cap : 0);
        n.bx = Math.cos(aa) * R; n.by = Math.sin(aa) * R;
        n.r = n.type === "topic" ? 5.5 + Math.min(5, Math.sqrt(n.count) * 1.6) : 4.5 + 8.5 * Math.sqrt(n.weight / maxW);
        n.phase = (seedOf(n.id) % 1000) / 159;
      }
      placed += inRow; row++;
    }
    start += span;
  }
  for (const n of [you, ...groups, ...groups.flatMap((g) => g.shown)]) { n.x = n.bx; n.y = n.by; if (n.phase == null) n.phase = (seedOf(n.id) % 1000) / 159; }
}

function seedOf(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }

/* Your face in the middle: the signed-in picture, or your initials. */
let avatarImg = null, initials = "";
async function loadAvatar() {
  try {
    const a = await api.authStatus?.();
    const name = String(a?.displayName || a?.email || "").trim();
    initials = name ? name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") : "";
    if (a?.avatarUrl) { const img = new Image(); img.referrerPolicy = "no-referrer"; img.onload = () => { avatarImg = img; }; img.src = a.avatarUrl; }
  } catch (_) {}
}

// ── drawing ─────────────────────────────────────────────────────────────────
const canvas = el("map");
const ctx = canvas.getContext("2d");
let W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: 0, k: 1 };
let hovered = null, selected = null;
const pulses = [];
let labelBoxes = [];

function sprite(color) {
  if (sprites[color]) return sprites[color];
  const s = document.createElement("canvas"); s.width = s.height = 64;
  const g = s.getContext("2d"); const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  const k = INK.glow ? 1 : 0.5;
  const hx = (a) => Math.round(a * k * 255).toString(16).padStart(2, "0");
  grad.addColorStop(0, color + hx(0.7)); grad.addColorStop(0.3, color + hx(0.26)); grad.addColorStop(1, color + "00");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return (sprites[color] = s);
}
function resize() {
  DPR = window.devicePixelRatio || 1;
  const box = canvas.parentElement.getBoundingClientRect();
  W = Math.round(box.width); H = Math.round(box.height);
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
}
const toScreen = (x, y) => ({ x: (x - cam.x) * cam.k + W / 2, y: (y - cam.y) * cam.k + H / 2 });
const toWorld = (x, y) => ({ x: (x - W / 2) / cam.k + cam.x, y: (y - H / 2) / cam.k + cam.y });

/* What lights up. A thing: itself, its hub, you, and what it shared hours
   with. A hub or topic: it and everything in it. An hour: what happened in
   it, and the hubs those belong to. */
function focusSet() {
  const f = selected || hovered;
  if (!f) return null;
  const s = new Set([f.id]);
  if (f.type === "hour") {
    for (const id of f.links) { const n = byId.get(id); if (n) { s.add(n.id); if (n.hub) s.add(n.hub.id); } }
    s.add("you");
  } else if (f.type === "hub" || f.type === "topic") {
    s.add("you"); if (f.parent) s.add(f.parent.id); for (const n of f.items || []) s.add(n.id);
  } else if (f.type === "you") {
    for (const n of nodes) if (n.isGroup) s.add(n.id);
  } else {
    s.add("you"); if (f.hub) s.add(f.hub.id);
    for (const id of f.links) { const n = byId.get(id); if (n?.type === "topic") s.add(n.id); }
    if (f === selected) for (const r of relatedOf(f).slice(0, 12)) { s.add(r.x.id); if (r.x.hub) s.add(r.x.hub.id); }
  }
  return s;
}

function draw(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const lit = focusSet();
  const c = toScreen(0, 0);

  // A heartbeat out of you, every few seconds.
  if (!reduce) {
    const beat = (t % 3600) / 3600;
    ctx.strokeStyle = INK.ink3; ctx.globalAlpha = 0.35 * (1 - beat); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(c.x, c.y, (34 + beat * (ITEM_R - 34)) * cam.k, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // Lines: you to each group, each group to its things. Nothing else.
  for (const e of edges) {
    const a = e.a, b = e.b;
    const on = lit && lit.has(a.id) && lit.has(b.id);
    const p = toScreen(a.x, a.y), q = toScreen(b.x, b.y);
    const col = colorOf(b);
    ctx.strokeStyle = col + (on ? "d0" : lit ? "10" : INK.glow ? "55" : "60");
    ctx.lineWidth = (e.w > 1 ? 1.8 : 1) * (on ? 1.4 : 1);
    const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.1, my = (p.y + q.y) / 2 - (q.x - p.x) * 0.1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(mx, my, q.x, q.y); ctx.stroke();
    e.mx = mx; e.my = my;
  }

  // Signals running out from you along the lines.
  if (!reduce && edges.length && Math.random() < 0.4 && pulses.length < 40) {
    const e = edges[Math.floor(Math.random() * edges.length)];
    pulses.push({ e, t0: t, dur: 900 + Math.random() * 600 });
  }
  for (let i = pulses.length - 1; i >= 0; i--) {
    const pu = pulses[i]; const u = (t - pu.t0) / pu.dur;
    if (u >= 1 || !edges.includes(pu.e)) { pulses.splice(i, 1); continue; }
    const p = toScreen(pu.e.a.x, pu.e.a.y), q = toScreen(pu.e.b.x, pu.e.b.y);
    const mx = pu.e.mx ?? (p.x + q.x) / 2, my = pu.e.my ?? (p.y + q.y) / 2;
    const x = (1 - u) * (1 - u) * p.x + 2 * (1 - u) * u * mx + u * u * q.x;
    const y = (1 - u) * (1 - u) * p.y + 2 * (1 - u) * u * my + u * u * q.y;
    ctx.globalAlpha = (lit ? 0.3 : 0.9) * Math.sin(Math.PI * u);
    ctx.drawImage(sprite(colorOf(pu.e.b)), x - 7, y - 7, 14, 14);
    ctx.globalAlpha = 1;
  }

  // Dots.
  for (const n of nodes) {
    const p = toScreen(n.x, n.y);
    const r = Math.max(2, n.r * Math.sqrt(cam.k));
    const dim = lit && !lit.has(n.id);
    const col = colorOf(n);
    const breathe = reduce ? 1 : 1 + 0.07 * Math.sin(t / 900 + n.x * 0.01);
    ctx.globalAlpha = dim ? 0.16 : 1;
    const g = r * (n.type === "hub" || n.type === "topic" || n.type === "you" ? 3.4 : 2.8) * breathe;
    ctx.drawImage(sprite(col), p.x - g, p.y - g, g * 2, g * 2);
    if (n.type === "you") {
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = INK.ink; ctx.fill();
      if (avatarImg) { ctx.clip(); ctx.drawImage(avatarImg, p.x - r, p.y - r, r * 2, r * 2); }
      else if (initials) { ctx.fillStyle = INK.bg; ctx.font = `600 ${Math.round(r * 0.72)}px ${INK.font}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(initials, p.x, p.y + 1); }
      ctx.restore();
      ctx.strokeStyle = INK.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.stroke();
    } else if (n.type === "hub" || n.type === "topic") {
      ctx.fillStyle = INK.bg; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.42, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (!INK.glow) { ctx.strokeStyle = INK.bg; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    if (n.fresh) { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2); ctx.stroke(); }
    if (n === selected) { ctx.strokeStyle = INK.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }

  // Names. Hubs and topics always, with their time or count; things when
  // big enough or lit; facts only when lit (they are sentences).
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  const placed = [];
  labelBoxes = [];
  const order = [...nodes].sort((a, b) => rank(b) - rank(a));
  for (const n of order) {
    const inFocus = lit && lit.has(n.id);
    const big = n.r * Math.sqrt(cam.k) > 6.5;
    const always = n.type === "you" || n.isGroup;
    const show = always || (lit ? inFocus && (n === selected || n === hovered || lit.size < 14) : n.top || n === hovered);
    if (!show || (lit && !inFocus && !always)) continue;
    if (n.type === "you" && (avatarImg || initials)) continue;
    const p = toScreen(n.x, n.y); const r = Math.max(2, n.r * Math.sqrt(cam.k));
    const isHub = Boolean(n.isGroup);
    let label = n.type === "you" ? "You" : n.label;
    if (label.length > 22) label = `${label.slice(0, 21)}…`;
    if (INK.mind && isHub) label = label.toUpperCase();
    const mainFont = isHub ? `600 ${INK.mind ? 11 : 12.5}px ${INK.font}` : n.type === "you" ? `600 13px ${INK.font}` : `${n.type === "topic" ? "600 " : ""}${INK.mind ? 10.5 : 11.5}px ${INK.font}`;
    const subFont = `${INK.mind ? 10 : 11}px ${INK.font}`;
    ctx.font = mainFont;
    const sub = n.type === "hub" ? (n.seconds >= 60 ? dur(n.seconds) : `${n.count} thing${n.count === 1 ? "" : "s"}`)
      : n.type === "topic" ? `${n.count} remembered${n.fresh ? ` · ${n.fresh} new` : ""}` : "";
    const lw = ctx.measureText(label).width;
    ctx.font = subFont;
    const w = Math.max(lw, sub ? ctx.measureText(sub).width : 0);
    const h = sub ? 30 : 16;
    /* Where the name goes: groups try the side towards you first, then under,
       then over their dot; things go under. The first spot that is free
       wins, so names never sit on each other. */
    const spots = [];
    if (isHub) {
      const side = n.x < 0 ? 1 : -1;
      const lx = p.x + side * (r + 9);
      spots.push({ lx, ly: p.y - (sub ? 8 : 0), align: side > 0 ? "left" : "right", base: "middle", box: { x: side > 0 ? lx : lx - w, y: p.y - (sub ? 16 : 8), w, h } });
    }
    spots.push({ lx: p.x, ly: p.y + r + 5, align: "center", base: "top", box: { x: p.x - w / 2 - 3, y: p.y + r + 3, w: w + 6, h } });
    if (isHub) spots.push({ lx: p.x, ly: p.y - r - 5 - h, align: "center", base: "top", box: { x: p.x - w / 2 - 3, y: p.y - r - 5 - h, w: w + 6, h } });
    const clash = (b) => placed.some((q) => b.x < q.x + q.w && q.x < b.x + b.w && b.y < q.y + q.h && q.y < b.y + b.h);
    let spot = spots.find((sp) => !clash(sp.box));
    const isFocus = n === selected || n === hovered || always;
    if (!spot) { if (!isFocus) continue; spot = spots[0]; }
    placed.push(spot.box); labelBoxes.push({ ...spot.box, n });
    ctx.globalAlpha = lit && !inFocus ? 0.35 : 1;
    ctx.textAlign = spot.align; ctx.textBaseline = spot.base;
    ctx.font = mainFont;
    ctx.fillStyle = isHub && INK.glow ? colorOf(n) : INK.ink;
    ctx.lineJoin = "round"; ctx.strokeStyle = INK.bg; ctx.lineWidth = 4;
    ctx.strokeText(label, spot.lx, spot.ly); ctx.fillText(label, spot.lx, spot.ly);
    if (sub) { ctx.font = subFont; ctx.fillStyle = INK.ink3; ctx.strokeText(sub, spot.lx, spot.ly + 15); ctx.fillText(sub, spot.lx, spot.ly + 15); }
    ctx.globalAlpha = 1;
  }

  if (nodes.length <= 1) {
    ctx.fillStyle = INK.ink3; ctx.font = `14px ${INK.font}`; ctx.textAlign = "center";
    ctx.fillText("Nothing saved for this day yet.", W / 2, H / 2 + 44);
  }
}
const rank = (n) => (n.type === "you" ? 5 : n.isGroup ? 4 : n.type === "topic" ? 3 : 1 + n.r / 20);

/* Until you touch it, the camera keeps the whole map in view. */
let autoFit = true;
function fit() {
  if (!nodes.length || !W) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodes) { x0 = Math.min(x0, n.x - 90); y0 = Math.min(y0, n.y - 90); x1 = Math.max(x1, n.x + 90); y1 = Math.max(y1, n.y + 80); }
  /* Room for the card on the left and the day along the bottom. */
  const left = W > 760 ? 268 : 0, bottom = 120;
  const k = Math.max(0.3, Math.min(1.25, (W - left - 40) / (x1 - x0 || 1), (H - bottom - 60) / (y1 - y0 || 1)));
  cam.k += (k - cam.k) * 0.25;
  cam.x += ((x0 + x1) / 2 - (left / 2) / k - cam.x) * 0.25;
  cam.y += ((y0 + y1) / 2 + (bottom / 2 - 20) / k - cam.y) * 0.25;
}
let camTo = null;
function glideTo(n) { if (!n || n.x == null) return; camTo = { n, until: performance.now() + 900 }; autoFit = false; }
/* Alive: the whole circle turns, slowly, and slows to a stop while you
   point at something or have it open, so it never moves under your hand.
   Every dot also drifts a little on its own. */
let rot = 0, spin = 1, lastT = 0;
const TURN_MS = 180000;
function turn(t) {
  const dt = lastT ? Math.min(64, t - lastT) : 16; lastT = t;
  const want = reduce || hovered || selected || down ? 0 : 1;
  spin += (want - spin) * 0.05;
  rot += spin * dt * (Math.PI * 2 / TURN_MS);
  const cs = Math.cos(rot), sn = Math.sin(rot);
  for (const n of nodes) {
    if (n.bx == null) continue;
    const wob = reduce || n.type === "you" ? 0 : 3 * Math.sin(t / 1700 + n.phase);
    const len = Math.hypot(n.bx, n.by) || 1, k2 = (len + wob) / len;
    n.x = (n.bx * cs - n.by * sn) * k2; n.y = (n.bx * sn + n.by * cs) * k2;
  }
}
function frame(t) {
  turn(t);
  const box = canvas.parentElement.getBoundingClientRect();
  if (Math.round(box.width) !== W || Math.round(box.height) !== H) resize();
  if (autoFit) fit();
  else if (camTo) {
    cam.x += (camTo.n.x - cam.x) * 0.14; cam.y += (camTo.n.y - cam.y) * 0.14;
    if (t > camTo.until) camTo = null;
  }
  draw(t);
  requestAnimationFrame(frame);
}

// ── interaction ─────────────────────────────────────────────────────────────
function hit(sx, sy) {
  for (const b of labelBoxes) if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return b.n;
  const w = toWorld(sx, sy);
  let best = null, bestD = Infinity;
  for (const n of nodes) {
    const d = Math.hypot(n.x - w.x, n.y - w.y);
    const reach = n.r + 14 / cam.k;
    if (d < reach && d < bestD) { best = n; bestD = d; }
  }
  return best;
}
let down = null;
canvas.addEventListener("pointerdown", (e) => {
  camTo = null;
  down = { x: e.offsetX, y: e.offsetY, cx: cam.x, cy: cam.y, node: hit(e.offsetX, e.offsetY), moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!down) { const n = hit(e.offsetX, e.offsetY); if (n !== hovered) { hovered = n; canvas.style.cursor = n ? "pointer" : "grab"; } return; }
  const dx = e.offsetX - down.x, dy = e.offsetY - down.y;
  if (!down.moved && Math.hypot(dx, dy) > 4) { down.moved = true; autoFit = false; canvas.classList.add("drag"); }
  if (down.moved) { cam.x = down.cx - dx / cam.k; cam.y = down.cy - dy / cam.k; }
});
canvas.addEventListener("pointerup", () => {
  if (down && !down.moved) select(down.node);
  down = null; canvas.classList.remove("drag");
});
canvas.addEventListener("pointerleave", () => { if (!down) hovered = null; });
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  autoFit = false;
  const before = toWorld(e.offsetX, e.offsetY);
  cam.k = Math.max(0.3, Math.min(3.5, cam.k * Math.exp(-e.deltaY * 0.0015)));
  const after = toWorld(e.offsetX, e.offsetY);
  cam.x += before.x - after.x; cam.y += before.y - after.y;
}, { passive: false });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") { stopRecap(); select(null); } });
window.addEventListener("resize", resize);

// ── connections ─────────────────────────────────────────────────────────────
/* A thing is connected to the other things in the hours it happened in:
   GitHub at 2 PM sits next to Cursor at 2 PM and Mom's message at 2 PM. */
function relatedOf(n) {
  if (!n || !n.cat || n.type === "hub") return [];
  const out = new Map();
  for (const hid of n.links) {
    const h = byId.get(hid); if (!h || h.type !== "hour") continue;
    for (const oid of h.links) {
      const o = byId.get(oid);
      if (!o || o === n || !o.cat || o.type === "hub" || o.type === "hour") continue;
      const r = out.get(o.id) || { x: o, w: 0, shared: [] };
      r.w += 1; r.shared.push(h.hour); out.set(o.id, r);
    }
  }
  return [...out.values()].sort((a, b) => b.w - a.w || b.x.weight - a.x.weight);
}
function hoursOf(n) { return [...(n.hours || [])].sort((a, b) => a - b).map((h) => byId.get(`h:${h}`)).filter(Boolean); }
function togetherLine(r) {
  const hs = [...r.shared].sort((a, b) => a - b).map(hourLabel);
  return hs.length > 3 ? `Together in ${hs.length} hours, ${listWords(hs.slice(0, 2))} and more` : `Together at ${listWords(hs)}`;
}
const shortLabel = (x, len) => { const s = x.label; return s.length > len ? `${s.slice(0, len - 1)}…` : s; };
function timeOf(n) {
  if (n.shownSeconds >= 45) return dur(n.shownSeconds);
  if (n.type === "person") return `${n.count} message${n.count === 1 ? "" : "s"}`;
  if (n.type === "song") return `played ${times(n.count)}`;
  if (n.type === "braino") return `${n.count} thing${n.count === 1 ? "" : "s"} said`;
  if (n.type === "project") return `${n.count} session${n.count === 1 ? "" : "s"}`;
  return n.count ? times(n.count) : "";
}

// ── the panel: every dot in plain words ─────────────────────────────────────
function explain(n) {
  const hs = hoursOf(n).map((h) => h.label);
  const when = hs.length ? ` around ${listWords(hs.slice(0, 4))}${hs.length > 4 ? " and later" : ""}` : "";
  const hubs = nodes.filter((x) => x.type === "hub");
  switch (n.type) {
    case "you": {
      const top = hubs.slice(0, 3).map((h) => `${h.label.toLowerCase()}${h.seconds >= 60 ? ` (${dur(h.seconds)})` : ""}`);
      const known = facts.length;
      return { text: `${top.length ? `Today you were mostly ${listWords(top)}.` : "Nothing saved for today yet."} I know ${known} thing${known === 1 ? "" : "s"} about you for good${nodes.some((x) => x.fresh) ? `, and learned ${nodes.filter((x) => x.fresh).length} of them today` : ""}.` };
    }
    case "hub": {
      const top = n.items.slice(0, 3).map((x) => x.label);
      const t = n.seconds >= 60 ? `${dur(n.seconds)} today` : `${n.count} thing${n.count === 1 ? "" : "s"} today`;
      return { text: `${CATS[n.cat].label}: ${t}, mostly ${listWords(top)}. This is ${CATS[n.cat].blurb}.` };
    }
    case "topic": if (n.id === "know") return { text: `${n.count} thing${n.count === 1 ? "" : "s"} I remember about you for good, in ${n.items.length} group${n.items.length === 1 ? "" : "s"}.${n.fresh ? ` ${n.fresh} learned today.` : ""} Open a group to read them.` };
      return { text: `${n.count} thing${n.count === 1 ? "" : "s"} I remember about ${KNOW[n.key].blurb}.${n.fresh ? ` ${n.fresh} learned today.` : ""} These stay until you delete them.` };
    case "fact": return { text: n.full, extra: n.when ? [["Remembered on", [`${new Date(n.when).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })}${n.fresh ? " (today)" : ""}`]]] : [] };
    case "hour": {
      const list = n.hoursList || [n.hour];
      if (list.length > 1) {
        const lines = list.map((h) => `${hourLabel(h)}: ${byId.get(`h:${h}`)?.digest?.summary || hourSentence(h)}`);
        return { text: `Mostly ${CATS[n.mainCat].label.toLowerCase()}, from ${n.label.replace(" to ", " to ")}.`, extra: [["Hour by hour", lines]] };
      }
      const text = n.digest?.summary || hourSentence(n.hour);
      const extra = [];
      if (n.digest?.episodes?.length) extra.push(["What happened", n.digest.episodes.map((e) => `${e.from} to ${e.to}: ${e.title}${e.detail ? `. ${e.detail}` : ""}`)]);
      if (n.digest?.looseEnds?.length) extra.push(["Left unfinished", n.digest.looseEnds]);
      return { text, extra };
    }
    case "site": return { text: `You spent ${dur(n.seconds)} on ${n.label}${when}.`, extra: n.notes.length ? [["Pages", n.notes.slice(0, 8)]] : [] };
    case "app": return { text: `You had ${n.label} open for ${dur(n.seconds)}${when}.`, extra: n.notes.length ? [["Windows", n.notes.slice(0, 8)]] : [] };
    case "person": return { text: `${n.label} messaged you ${times(n.count)} on WhatsApp${n.group ? " in a group" : ""}${when}.${n.important ? " You marked them as important." : ""} I only note that they wrote. The messages stay in WhatsApp.` };
    case "song": return { text: `You played ${n.label}${n.artist ? ` by ${n.artist}` : ""} ${times(n.count)}${when}.` };
    case "project": return { text: `You worked with Claude Code on ${n.label}${when}.`, extra: [["Folder", [n.path]]] };
    case "braino": return { text: `You talked to Braino ${times(n.count)}${when}.`, extra: n.notes.length ? [["What you said", n.notes.slice(-10).reverse()]] : [] };
    default: return { text: "" };
  }
}
function hourSentence(h) {
  const m = hourCats.get(h);
  if (!m) return "A quiet hour.";
  const hour = byId.get(`h:${h}`);
  const things = [...(hour?.links || [])].map((id) => byId.get(id)).filter((x) => x && x.cat);
  const [topCat] = [...m.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  const topThings = things.filter((x) => x.cat === topCat).sort((a, b) => b.weight - a.weight).slice(0, 2).map((x) => x.label);
  const bits = [];
  if (topCat) bits.push(`Mostly ${CATS[topCat].label.toLowerCase()}${topThings.length ? `, in ${listWords(topThings)}` : ""}.`);
  const people = things.filter((x) => x.type === "person").map((x) => x.label);
  if (people.length && topCat !== "people") bits.push(`${listWords(people.slice(0, 3))} messaged.`);
  if (things.some((x) => x.type === "braino") && topCat !== "braino") bits.push("You talked to Braino.");
  const songs = things.filter((x) => x.type === "song").map((x) => x.label);
  if (songs.length && topCat !== "watch") bits.push(`Played ${listWords(songs.slice(0, 2))}.`);
  return bits.join(" ");
}
function statsFor(n) {
  const s = [];
  if (n.type === "hub") { if (n.seconds >= 60) s.push(dur(n.seconds)); s.push(`${n.count} thing${n.count === 1 ? "" : "s"}`); s.push(`${n.hours.size} hour${n.hours.size === 1 ? "" : "s"}`); }
  else if (n.type === "topic") { s.push(`${n.count} remembered`); if (n.id === "know") s.push(`${n.items.length} groups`); if (n.fresh) s.push(`${n.fresh} new today`); }
  else if (n.type === "hour") { const hl = n.hoursList || [n.hour]; if (hl.length > 1) s.push(`${hl.length} hours`); if (n.mainCat) s.push(`mostly ${CATS[n.mainCat].label.toLowerCase()}`); s.push(`${n.links.size} thing${n.links.size === 1 ? "" : "s"}`); }
  else if (n.cat) { const t = timeOf(n); if (t) s.push(t); if (n.hours.size) s.push(`${n.hours.size} hour${n.hours.size === 1 ? "" : "s"}`); const rel = relatedOf(n).length; if (rel) s.push(`${rel} connected`); }
  return s;
}

/* The little web: this memory in the middle, what it is connected to around. */
function renderWeb(n, list, title = "Connected memories") {
  const shown = list.slice(0, 12);
  const W0 = 480, H0 = shown.length <= 4 ? 190 : 250, cx = W0 / 2, cy = H0 / 2;
  const catOrder = Object.keys(CATS);
  if (n.type !== "you") shown.sort((a, b) => catOrder.indexOf(a.x.cat) - catOrder.indexOf(b.x.cat) || b.w - a.w);
  const maxW = Math.max(1, ...shown.map((s) => s.w));
  const col = n.type === "hour" && n.mainCat ? CATS[n.mainCat].color : colorOf(n);
  const k = shown.length;
  const wires = [], dots = [];
  shown.forEach((s, i) => {
    const ang = -Math.PI / 2 + (i / Math.max(1, k)) * Math.PI * 2 + (k === 2 ? Math.PI / 2 : 0);
    const rx = k <= 4 ? 130 : 160, ry = k <= 4 ? 62 : 90;
    const x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
    const c = colorOf(s.x);
    const mx = (cx + x) / 2 - (y - cy) * 0.18, my = (cy + y) / 2 + (x - cx) * 0.18;
    const delay = reduce ? 0 : 60 + i * 45;
    const below = y > cy + 4, above = y < cy - 4;
    const ty = below ? y + 20 : above ? y - 13 : y + 4;
    const anchor = Math.abs(x - cx) < 30 ? "middle" : x > cx ? "start" : "end";
    const tx = anchor === "middle" ? x : x > cx ? x + (above || below ? -6 : 12) : x - (above || below ? -6 : 12);
    wires.push(`<path class="wire draw" d="M${cx},${cy} Q${mx.toFixed(1)},${my.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}" stroke="${c}" stroke-opacity=".55" stroke-width="${(0.8 + 2.2 * (s.w / maxW)).toFixed(2)}" style="animation-delay:${delay}ms"/>`);
    dots.push(`<g class="nb pop" tabindex="0" role="button" data-node="${esc(s.x.id)}" aria-label="${esc(s.x.label)}" style="animation-delay:${delay + 140}ms">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="14" fill="${c}" fill-opacity=".1"/>
      <circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" fill="${c}" stroke="var(--box)" stroke-width="2"/>
      <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}">${esc(shortLabel(s.x, 20))}</text>
    </g>`);
  });
  const more = list.length - shown.length;
  const center = `<g class="pop"><circle cx="${cx}" cy="${cy}" r="30" fill="${col}" fill-opacity=".1"/>
    <circle cx="${cx}" cy="${cy}" r="20" fill="${col}" fill-opacity=".22" stroke="${col}" stroke-opacity=".6"/>
    <circle cx="${cx}" cy="${cy}" r="11" fill="${col}"/></g>`;
  el("p-web").innerHTML = k ? `<h3>${esc(title)}</h3><svg viewBox="0 0 ${W0} ${H0}" role="img" aria-label="${esc(n.label)} and the ${list.length} memories connected to it">
    ${wires.join("")}${center}${dots.join("")}
    ${more > 0 ? `<text class="more" x="${W0 - 10}" y="${H0 - 8}" text-anchor="end">+${more} more below</text>` : ""}
  </svg>` : "";
}

/* Rows under a heading, each a thing you can walk to. */
function rowsHtml(list, why, color, limit) {
  const maxW = Math.max(1, ...list.map((s) => s.w));
  const cut = showAll ? list : list.slice(0, limit);
  return `<div class="rows">${cut.map((s) => `<button type="button" class="lrow" data-node="${esc(s.x.id)}">
      <span class="nm">${s.x.fresh ? `<em class="new">New</em>` : ""}${esc(s.x.type === "fact" ? s.x.full || s.x.label : s.x.label)}</span>
      <span class="str"><b style="width:${Math.round(12 + 88 * (s.w / maxW))}%;background:${color(s.x)}"></b></span>
      <span class="go">›</span>
      <span class="why">${esc(why(s))}</span>
    </button>`).join("")}</div>${list.length > limit && !showAll ? `<button type="button" class="showall" data-all="1">Show all ${list.length}</button>` : ""}`;
}

let trail = [];
function renderTrail() {
  const t = el("p-trail");
  if (trail.length < 2) { t.innerHTML = ""; t.hidden = true; return; }
  t.hidden = false;
  const bits = trail.slice(-5);
  const cut = trail.length - bits.length;
  t.innerHTML = `<button type="button" class="back" data-back="1" aria-label="Back">‹ Back</button>` +
    (cut ? `<span class="sep">…</span>` : "") +
    bits.map((id, i) => {
      const x = byId.get(id); if (!x) return "";
      const idx = cut + i;
      return `${i ? `<span class="sep">›</span>` : ""}<button type="button" data-trail="${idx}"${idx === trail.length - 1 ? ' aria-current="true"' : ""}>${esc(x.type === "fact" ? "Remembered" : shortLabel(x, 18))}</button>`;
    }).join("");
}

let showAll = false;
function select(n, how = "tap") {
  selected = n || null;
  const panel = el("panel");
  renderRibbon();
  mindFollow(n);
  if (!n) { panel.hidden = true; trail = []; el("map-view").classList.remove("split"); return; }
  if (how === "tap") trail = [n.id];
  else if (how === "walk" && trail[trail.length - 1] !== n.id) trail.push(n.id);
  if (how !== "refresh") showAll = false;
  const info = explain(n);
  const c = colorOf(n);
  el("p-orb").style.setProperty("--c", c);
  el("p-kind").textContent = kindOf(n); el("p-kind").style.color = n.type === "you" || n.type === "hour" ? "var(--ink3)" : c;
  el("p-title").textContent = n.type === "fact" ? "Remembered" : n.type === "hour" ? `${n.label}` : n.label;
  el("p-stats").innerHTML = statsFor(n).map((x) => `<span>${esc(x)}</span>`).join("");
  el("p-text").textContent = info.text || "";
  el("p-extra").innerHTML = (info.extra || []).map(([h, items]) => `<div><h3>${esc(h)}</h3><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`).join("");

  const groups = [];
  if (n.type === "hub") {
    renderWeb(n, n.items.map((x) => ({ x, w: x.weight })), `In ${CATS[n.cat].label.toLowerCase()}`);
    groups.push({ title: `In ${CATS[n.cat].label.toLowerCase()}`, color: c, count: n.items.length, list: n.items.map((x) => ({ x, w: x.weight })), why: (s) => [timeOf(s.x), hoursOf(s.x).length ? `around ${listWords(hoursOf(s.x).slice(0, 3).map((h) => h.label))}` : ""].filter(Boolean).join(", ") });
  } else if (n.id === "know") {
    renderWeb(n, n.items.map((x) => ({ x, w: x.count })), "What I know, by kind");
    groups.push({ title: "What I know about you", color: c, count: n.items.length, list: n.items.map((x) => ({ x, w: x.count })), why: (s) => `${s.x.count} remembered${s.x.fresh ? `, ${s.x.fresh} new today` : ""}` });
  } else if (n.type === "topic") {
    renderWeb(n, n.items.map((x) => ({ x, w: x.fresh ? 2 : 1 })), KNOW[n.key].label);
    const list = n.items.map((x) => ({ x, w: x.fresh ? 2 : 1 })).sort((a, b) => b.w - a.w);
    groups.push({ title: KNOW[n.key].label, color: c, count: list.length, list, why: (s) => (s.x.when ? `Remembered ${new Date(s.x.when).toLocaleDateString([], { day: "numeric", month: "short" })}` : "") });
  } else if (n.type === "you") {
    const hubs = nodes.filter((x) => x.type === "hub"), topics = nodes.filter((x) => x.type === "topic");
    renderWeb(n, [...hubs.map((x) => ({ x, w: x.weight })), ...topics.map((x) => ({ x, w: x.count }))], "Everything connects back to you");
    if (hubs.length) groups.push({ title: "Today", color: INK.ink3, count: hubs.length, list: hubs.map((x) => ({ x, w: x.weight })), why: (s) => `${s.x.seconds >= 60 ? `${dur(s.x.seconds)}, ` : ""}${s.x.count} thing${s.x.count === 1 ? "" : "s"}` });
    if (topics.length) groups.push({ title: "What I know about you", color: INK.know, count: topics.length, list: topics.map((x) => ({ x, w: x.count })), why: (s) => `${s.x.count} remembered${s.x.fresh ? `, ${s.x.fresh} new today` : ""}` });
  } else if (n.type === "hour") {
    const things = [...n.links].map((id) => byId.get(id)).filter((x) => x && x.cat);
    renderWeb(n, things.map((x) => ({ x, w: x.weight })).sort((a, b) => b.w - a.w), "What happened then");
    for (const key of Object.keys(CATS)) {
      const list = things.filter((x) => x.cat === key).map((x) => ({ x, w: x.weight })).sort((a, b) => b.w - a.w);
      if (list.length) groups.push({ title: CATS[key].label, color: CATS[key].color, count: list.length, list, why: (s) => timeOf(s.x) });
    }
  } else if (n.type === "fact") {
    const topic = [...n.links].map((id) => byId.get(id)).find((x) => x?.type === "topic");
    const sib = topic ? topic.items.filter((x) => x !== n).map((x) => ({ x, w: 1 })) : [];
    renderWeb(n, sib, topic ? `Also in ${topic.label.toLowerCase()}` : "Connected memories");
    if (sib.length) groups.push({ title: topic.label, color: INK.know, count: sib.length, list: sib, why: (s) => (s.x.when ? `Remembered ${new Date(s.x.when).toLocaleDateString([], { day: "numeric", month: "short" })}` : "") });
  } else {
    const list = relatedOf(n);
    renderWeb(n, list);
    for (const key of Object.keys(CATS)) {
      const g = list.filter((s) => s.x.cat === key);
      if (g.length) groups.push({ title: CATS[key].label, color: CATS[key].color, count: g.length, list: g, why: togetherLine });
    }
  }
  const hl = n.type === "hour" ? (n.hoursList || [n.hour]) : null;
  const shots = hl ? photosIn(Math.min(...hl), Math.max(...hl)) : [];
  el("p-photos").innerHTML = shots.length ? `<h3>Photos from then</h3><div class="pgrid">${shots.map((p) => `<img src="${p.src}" alt="">`).join("")}</div>` : "";
  const when = n.cat ? hoursOf(n) : [];
  el("p-when").hidden = !when.length;
  el("p-when").innerHTML = when.length ? `<h3>When</h3><div class="when">${when.map((h) => `<button type="button" data-node="${esc(h.id)}">${esc(h.label)}</button>`).join("")}</div>` : "";
  el("p-links").innerHTML = groups.map((g) => `<div class="grp"><h3><i style="background:${g.color}"></i>${esc(g.title)} <small>${g.count}</small></h3>
    ${rowsHtml(g.list, g.why, colorOf, 6)}</div>`).join("");
  renderTrail();
  panel.hidden = false;
  if (!el("map-view").classList.contains("split")) { el("map-view").classList.add("split"); }
  if (how !== "refresh") {
    panel.scrollTop = 0;
    if (n.x != null && n.type !== "you") glideTo(n);
    else if (n.type === "hour") {
      /* An hour has no place of its own: go to the middle of what happened. */
      const pts = [...n.links].map((id) => byId.get(id)).filter((x) => x && x.x != null && nodes.includes(x));
      if (pts.length) glideTo({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length });
    }
  }
}
function walk(id) { const n = byId.get(id); if (!n) return; select(n, "walk"); }
el("p-links").addEventListener("click", (e) => {
  if (e.target.closest("[data-all]")) { showAll = true; select(selected, "refresh"); return; }
  const b = e.target.closest("button[data-node]"); if (b) walk(b.dataset.node);
});
el("p-when").addEventListener("click", (e) => { const b = e.target.closest("button[data-node]"); if (b) walk(b.dataset.node); });
el("p-web").addEventListener("click", (e) => { const g = e.target.closest("[data-node]"); if (g) walk(g.dataset.node); });
el("p-web").addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const g = e.target.closest("[data-node]"); if (g) { e.preventDefault(); walk(g.dataset.node); }
});
el("p-trail").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.back) { if (trail.length > 1) trail.pop(); }
  else trail = trail.slice(0, Number(b.dataset.trail) + 1);
  const n = byId.get(trail[trail.length - 1]); if (!n) return;
  select(n, "back");
});
el("panel-close").addEventListener("click", () => { stopRecap(); select(null); });

// ── legend and the day strip ────────────────────────────────────────────────
function renderLegend() {
  const hubs = nodes.filter((n) => n.type === "hub");
  const topics = nodes.filter((n) => n.type === "topic");
  el("legend").innerHTML = (hubs.length ? `<h4>Today</h4>${hubs.map((h) => `<button type="button" data-node="${esc(h.id)}"><i style="background:${CATS[h.cat].color}"></i><span>${esc(h.label)}</span><small>${esc(h.seconds >= 60 ? dur(h.seconds) : `${h.count}`)}</small></button>`).join("")}` : "")
    + (topics.length ? `<h4>What I know about you</h4>${topics.map((t) => `<button type="button" data-node="${esc(t.id)}"><i style="background:${INK.know}"></i><span>${esc(t.label)}</span><small>${t.count}${t.fresh ? ` · ${t.fresh} new` : ""}</small></button>`).join("")}` : "")
    + `<p class="lg-hint">Tap anything to open it.</p>`;
  el("legend").hidden = !hubs.length && !topics.length;
}
el("legend").addEventListener("click", (e) => { const b = e.target.closest("button[data-node]"); if (b) walk(b.dataset.node); });

/* The day as a sentence you can tap: "9 to 11 AM, Building", then "11 AM,
   Social". Each stretch as wide as its hours, in its colour, named. */
function ribbonHtml() {
  if (!spans.length) return "";
  const selSpan = selected?.type === "hour" ? selected.id : "";
  return spans.map((sp) => {
    const hours = sp.to - sp.from + 1;
    if (!sp.node) return `<div class="span quiet" style="flex:${hours * 0.6}" title="Nothing saved"><span class="sl">${esc(sp.label)}</span></div>`;
    const c = CATS[sp.cat];
    const on = selSpan === sp.node.id;
    const ph = photosIn(sp.from, sp.to)[0];
    return `<button type="button" class="span${on ? " on" : ""}${ph ? " has-ph" : ""}" style="flex:${hours};--c:${c.color}" data-node="${esc(sp.node.id)}" title="${esc(`${sp.label}: ${c.label}`)}">
      <span class="sn">${esc(c.label)}</span><span class="sl">${esc(sp.label)}</span>${ph ? `<img class="ph" src="${ph.src}" alt="">` : ""}</button>`;
  }).join("");
}
/* Moments: the day's photos along the top of the map. Tap one to see the
   part of the day it was taken in. */
function renderMoments() {
  const m = el("moments"); if (!m) return;
  m.hidden = !photos.length;
  m.innerHTML = photos.map((p, i) => `<button type="button" data-photo="${i}" title="Taken at ${esc(new Date(p.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))}"><img src="${p.src}" alt=""><small>${esc(new Date(p.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))}</small></button>`).join("");
  const g = el("glance-photos"); if (g) g.innerHTML = photos.map((p) => `<img src="${p.src}" alt="">`).join("");
}
function spanAt(h) { return spans.find((sp) => sp.node && h >= sp.from && h <= sp.to) || null; }
el("moments").addEventListener("click", (e) => {
  const b = e.target.closest("[data-photo]"); if (!b) return;
  const p = photos[Number(b.dataset.photo)]; const sp = p && spanAt(new Date(p.at).getHours());
  if (sp) { stopRecap(); select(sp.node); }
});
el("add-photos").addEventListener("click", async () => {
  const b = el("add-photos"); b.disabled = true; const was = b.textContent; b.textContent = "Getting photos…";
  try {
    const r = await api.memoryPhotosFetch?.(el("day").value || "");
    if (r?.photos) photos = r.photos;
    if (r?.say) { b.textContent = r.say.length > 40 ? "No access to Photos" : r.say; b.title = r.say; setTimeout(() => { b.textContent = was; }, 5000); }
    else b.textContent = was;
  } finally { b.disabled = false; renderMoments(); renderRibbon(); renderRead(); if (selected) select(selected, "refresh"); }
});
function renderRibbon() {
  const r = el("ribbon"); if (!r) return;
  el("ribbon-strip").innerHTML = ribbonHtml();
  r.hidden = !spans.length;
}
el("ribbon").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-node]"); if (!b) return;
  stopRecap();
  const n = byId.get(b.dataset.node);
  if (selected === n) select(null); else select(n);
});

// ── Read: the same day in words, sorted ─────────────────────────────────────
function renderRead() {
  if (!el("glance")) return;
  const hubs = nodes.filter((n) => n.type === "hub");
  const timed = hubs.filter((h) => h.seconds >= 60).sort((a, b) => b.seconds - a.seconds);
  const total = timed.reduce((s, h) => s + h.seconds, 0);
  const top = timed.slice(0, 2).map((h) => `${h.label.toLowerCase()} (${dur(h.seconds)})`);
  el("glance-text").textContent = hubs.length
    ? `${top.length ? `Most of your day went to ${listWords(top)}.` : ""} ${hubs.filter((h) => !h.seconds || h.seconds < 60).map((h) => `${h.label}: ${h.count} thing${h.count === 1 ? "" : "s"}.`).join(" ")}`.trim()
    : "Nothing saved for this day yet.";
  el("glance-bar").innerHTML = timed.map((h) => `<b style="flex:${h.seconds};background:${CATS[h.cat].color}" title="${esc(h.label)} ${esc(dur(h.seconds))}"></b>`).join("");
  el("glance-bar").hidden = !total;
  el("glance-key").innerHTML = hubs.map((h) => `<span><i style="background:${CATS[h.cat].color}"></i>${esc(h.label)} <small>${esc(h.seconds >= 60 ? dur(h.seconds) : `${h.count}`)}</small></span>`).join("");
  el("glance-ribbon").innerHTML = ribbonHtml();

  // What Braino knows about you: new first, then sorted cards.
  const day = viewedDay();
  const fresh = facts.filter((f) => isLearnedOn(f, day));
  el("known-count").textContent = facts.length ? `${facts.length} things, kept until you delete them` : "";
  el("learned").innerHTML = fresh.length
    ? `<div class="fresh"><h3>Learned ${day === dayKey(new Date()) ? "today" : "this day"}</h3><ul>${fresh.map((f) => `<li><button type="button" data-open="${esc(factIds.get(humanFact(f.content)) || "")}">${esc(humanFact(f.content))}</button><small>${esc((KNOW[f.category] || KNOW.fact).label)}</small></li>`).join("")}</ul></div>` : "";
  const cards = Object.keys(KNOW).map((key) => ({ key, list: facts.filter((f) => (KNOW[f.category] ? f.category : "fact") === key) })).filter((g) => g.list.length);
  el("facts").innerHTML = cards.length ? cards.map(({ key, list }) => `<div class="kcard"><h3>${esc(KNOW[key].label)} <small>${list.length}</small></h3><p class="kb">${esc(cap(KNOW[key].blurb))}</p>
      <ul>${list.slice(0, 12).map((f) => `<li${isLearnedOn(f, day) ? ' class="isnew"' : ""}><button type="button" data-open="${esc(factIds.get(humanFact(f.content)) || "")}">${esc(humanFact(f.content))}</button></li>`).join("")}</ul>
      ${list.length > 12 ? `<p class="kb">and ${list.length - 12} more</p>` : ""}</div>`).join("")
    : `<p class="empty">Nothing remembered for good yet, or you are signed out.</p>`;

  // Hour by hour, each tagged with what it mostly was.
  el("hours").innerHTML = hourNodes.length ? hourNodes.map((n) => {
    const m = hourCats.get(n.hour) || new Map();
    const [topCat] = [...m.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const things = [...n.links].map((id) => byId.get(id)).filter((x) => x && x.cat).sort((a, b) => Object.keys(CATS).indexOf(a.cat) - Object.keys(CATS).indexOf(b.cat) || b.weight - a.weight).slice(0, 8);
    const summary = n.digest?.summary || hourSentence(n.hour);
    const loose = n.digest?.looseEnds?.length ? `<div class="e">Left unfinished: ${esc(n.digest.looseEnds.join("; "))}</div>` : "";
    return `<div class="hour"><div class="h">${esc(hourLabel(n.hour))}${topCat ? `<span class="tag" style="--c:${CATS[topCat].color}">${esc(CATS[topCat].label)}</span>` : ""}</div><div><div class="s">${esc(summary)}</div>${loose}
      ${things.length ? `<div class="chips">${things.map((x) => `<button type="button" class="chip" data-open="${esc(x.id)}"><i style="background:${CATS[x.cat].color}"></i>${esc(x.label)}</button>`).join("")}</div>` : ""}</div></div>`;
  }).join("") : `<p class="empty">Nothing saved for this day yet.</p>`;

  // Where the time went, by what you were doing, each opening to its things.
  const maxH = Math.max(1, ...hubs.map((h) => h.weight));
  el("bars").innerHTML = hubs.length ? hubs.map((h) => `<details class="cat"><summary><span class="cn"><i style="background:${CATS[h.cat].color}"></i>${esc(h.label)}</span>
      <span class="track"><b style="width:${Math.max(3, (h.weight / maxH) * 100).toFixed(1)}%;background:${CATS[h.cat].color}"></b></span><span class="ct">${esc(h.seconds >= 60 ? dur(h.seconds) : `${h.count}`)}</span></summary>
      <div class="sub">${h.items.slice(0, 14).map((x) => `<button type="button" class="si" data-open="${esc(x.id)}"><span>${esc(x.label)}</span><span>${esc(timeOf(x))}</span></button>`).join("")}</div></details>`).join("")
    : `<p class="empty">Nothing yet.</p>`;
}

function describe(r) {
  switch (r.kind) {
    case "focus": return { title: `${r.app || "?"}${r.title ? ` · ${r.title}` : ""}`, meta: r.url || "" };
    case "screen": return { title: `Read the screen in ${r.app || "?"}${r.title ? ` · ${r.title}` : ""}`, meta: `${(r.lines || []).length} lines`, body: (r.lines || []).join("\n") };
    case "tabs": return { title: `${r.count} Chrome tabs open`, meta: (r.tabs || []).slice(0, 6).map((t) => t.title).filter(Boolean).join(" · "), body: (r.tabs || []).map((t) => `${t.title}\n  ${t.url}`).join("\n") };
    case "playing": return { title: `Played ${r.track}${r.artist ? ` by ${r.artist}` : ""}`, meta: r.source || "" };
    case "braino": return { title: `Asked Braino: "${r.heard}"`, meta: `${r.ok ? "Done" : "Did not work"}${r.said ? `. ${r.said}` : ""}` };
    case "conversation": return { title: r.you ? `You said (${r.channel}): "${r.you}"` : "Braino said", meta: r.braino ? `Braino: ${r.braino}` : "" };
    case "whatsapp": return { title: `${r.from} messaged on WhatsApp${r.group ? " (group)" : ""}`, meta: "The message stays in WhatsApp, not copied here" };
    case "claude_session": return { title: `Claude Code conversation in ${r.project}`, meta: `${r.sizeKb} KB` };
    case "arrival": return { title: "You came back to your Mac", meta: "" };
    default: return { title: r.kind, meta: "" };
  }
}
function renderList() {
  const q = el("q").value.toLowerCase().trim();
  const kind = el("kind").value;
  const shown = rows.map((r, index) => ({ r, index }))
    .filter(({ r }) => (!kind || r.kind === kind) && (!q || JSON.stringify(r).toLowerCase().includes(q))).reverse().slice(0, 400);
  el("list").innerHTML = shown.length ? shown.map(({ r, index }) => {
    const d = describe(r);
    return `<div class="row"><span class="t">${esc(hm(r.t))}</span>
      <span class="b"><div>${esc(d.title)}</div>${d.meta ? `<div class="mt">${esc(d.meta)}</div>` : ""}${d.body ? `<details><summary class="mt">What was saved</summary><pre>${esc(d.body)}</pre></details>` : ""}</span>
      <button class="x" type="button" title="Forget this" aria-label="Forget this" data-del="${index}">×</button></div>`;
  }).join("") : `<p class="empty">${rows.length ? "Nothing matches." : "Nothing saved for this day yet."}</p>`;
}

// ── loading ─────────────────────────────────────────────────────────────────
async function loadState() {
  const s = await api.activityState();
  paused = Boolean(s?.paused);
  el("state").textContent = paused ? "Paused" : "Remembering";
  el("state").className = paused ? "pill off" : "pill";
  el("pause").textContent = paused ? "Resume remembering" : "Pause remembering";
  const days = s?.days || [];
  const sel = el("day"); const current = sel.value;
  const label = (d) => { const y = new Date(Date.now() - 86400000);
    return d === dayKey(new Date()) ? "Today" : d === dayKey(y) ? "Yesterday" : new Date(`${d}T12:00`).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" }); };
  sel.innerHTML = days.map((d) => `<option value="${esc(d)}">${esc(label(d))}</option>`).join("") || `<option value="">Today</option>`;
  if (current && days.includes(current)) sel.value = current;
}
async function loadAll() {
  const day = el("day").value || "";
  const [act, dig, known] = await Promise.all([
    api.activityDay(day).catch(() => null),
    api.memoryDigests(day).catch(() => null),
    api.dashboardData?.("memory").catch(() => null),
  ]);
  rows = act?.rows || [];
  photos = (await api.memoryPhotos?.(day).catch(() => null))?.photos || [];
  hoursDigest = dig?.hours || [];
  facts = known?.ok ? (known.rows || []) : facts;
  const recall = dig?.recall !== false;
  el("recall").textContent = `Braino can use this: ${recall ? "On" : "Off"}`;
  el("recall").dataset.on = recall ? "1" : "0";
  const keep = selected?.id;
  buildGraph();
  renderLegend();
  renderRibbon();
  renderRead();
  renderList();
  pushMind();
  renderMoments();
  if (keep) select(byId.get(keep) || null, "refresh");
}

// ── controls ────────────────────────────────────────────────────────────────
function showTab(which) {
  const map = which === "map";
  el("tab-map").setAttribute("aria-selected", String(map));
  el("tab-read").setAttribute("aria-selected", String(!map));
  el("map-view").hidden = !map; el("read").hidden = map;
  if (map) resize();
  try { localStorage.setItem("aosMemoryTab", which); } catch (_) {}
}
el("tab-map").addEventListener("click", () => showTab("map"));
/* Anything in Read opens where it lives on the map. */
function openOnMap(id) { const n = byId.get(id); if (!n) return; showTab("map"); select(n); }
el("read").addEventListener("click", (e) => {
  const b = e.target.closest("[data-open],[data-node]"); if (!b || b.closest("#ribbon")) return;
  const id = b.dataset.open || b.dataset.node; if (id) { e.preventDefault(); openOnMap(id); }
});
el("tab-read").addEventListener("click", () => showTab("read"));
el("look-paper").addEventListener("click", () => setLook("paper"));
el("look-mind").addEventListener("click", () => setLook("mind"));
el("q").addEventListener("input", renderList);
el("kind").addEventListener("change", renderList);
el("day").addEventListener("change", () => { select(null); autoFit = true; void loadAll(); });
el("recall").addEventListener("click", async () => { await api.memoryRecallSwitch(el("recall").dataset.on !== "1"); await loadAll(); });
el("pause").addEventListener("click", async () => { await api.activityPause(!paused); await loadState(); });
el("delday").addEventListener("click", async () => {
  if (!confirm(`Delete everything saved on ${el("day").selectedOptions[0]?.textContent || "this day"}? This cannot be undone.`)) return;
  await api.activityDeleteDay(el("day").value || "");
  await loadState(); await loadAll();
});
el("list").addEventListener("click", async (event) => {
  const b = event.target.closest("button[data-del]"); if (!b) return;
  await api.activityDeleteRow(el("day").value || "", Number(b.dataset.del));
  await loadAll();
});
el("digest-now").addEventListener("click", async () => {
  const b = el("digest-now"); b.disabled = true; b.textContent = "Summarising…";
  try {
    const r = await api.memoryDigestNow();
    if (r && r.ok === false) el("ask-answer").textContent = `Could not summarise: ${r.error || "unknown error"}`;
    if (r?.empty) el("ask-answer").textContent = "Not enough in the last hour to summarise yet.";
  } finally { b.disabled = false; b.textContent = "Summarise the last hour"; await loadAll(); }
});
el("ask-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const q = el("ask").value.trim(); if (!q) return;
  el("ask-answer").textContent = "Looking…";
  const r = await api.memoryAsk(q);
  el("ask-answer").textContent = r?.say || "Nothing came back.";
});

(async () => {
  let tab = "map"; try { tab = localStorage.getItem("aosMemoryTab") || "map"; } catch (_) {}
  showTab(tab);
  setLook(look);
  resize();
  requestAnimationFrame(frame);
  void loadAvatar();
  await loadState();
  await loadAll();
})();
// Keeps up with the day without moving what you are looking at.
setInterval(() => { if (!document.hidden && !el("q").value && !down) void loadAll(); }, 60000);
