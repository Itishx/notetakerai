/* Braino for Mac: one app for everything. Double-click Braino to open it.
   System Settings shape (categories on the left, panels on the right), in
   AffectiveOS glass and type. Companion and Foundry share Braino, Connections
   and System. Every panel reads and writes his real settings through the
   same calls the old dashboard and Set him up used; the few features that
   are not built yet say so plainly ("Coming soon") instead of faking numbers.
   House rule: no dashes of any kind in anything Braino says. */
const api = window.brainoMac || {};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const call = async (name, ...args) => { try { return typeof api[name] === "function" ? await api[name](...args) : null; } catch (_) { return null; } };
function toast(text) { const t = $("toast"); t.textContent = text; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2200); }

const I = {chat:'<path d="M5 5h14a1 1 0 011 1v9a1 1 0 01-1 1h-7l-5 4v-4H5a1 1 0 01-1-1V6a1 1 0 011-1z"/><path d="M8 9.5h8M8 12.5h5"/>',home:'<path d="M4 11l8-7 8 7v9H4z"/>',brain:'<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M9 15c2 1.5 4 1.5 6 0"/>',mem:'<path d="M5 5h14v14H5z"/><path d="M9 9h6M9 13h6M9 17h3"/>',face:'<circle cx="12" cy="10" r="4"/><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0012 0M12 17v4"/>',text:'<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',modes:'<path d="M4 6h16M4 12h10M4 18h13"/>',chrome:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 9h8M9.4 13.5L5.5 7M14.6 13.5L11 20"/>',people:'<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19c1-3 3.5-4.5 6-4.5s5 1.5 6 4.5M15 15c2 0 4 1 5 3.5"/>',school:'<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/>',music:'<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',spark:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',code:'<path d="M9 8l-5 4 5 4M15 8l5 4-5 4"/>',lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',key:'<circle cx="8" cy="14" r="4"/><path d="M11 11l8-8M16 6l2 2"/>',hand:'<path d="M8 13V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2.5 7-6 7s-5-2-6.5-5L3 11.5a1.5 1.5 0 012.5-1.5L8 13"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/>',repeat:'<path d="M17 2l3 3-3 3M3 11V9a4 4 0 014-4h13M7 22l-3-3 3-3M21 13v2a4 4 0 01-4 4H4"/>',pen:'<path d="M4 20l4-1 11-11-3-3L5 16z"/>',radar:'<circle cx="12" cy="12" r="8"/><path d="M12 12l6-4M12 4v2"/>',send:'<path d="M4 12l16-8-6 16-3-7z"/>',inbox:'<path d="M4 13l3-8h10l3 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0012 3z"/>',meet:'<rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3"/>'};
const ic = (n, c, lg) => `<span class="ic${lg ? " lg" : ""}" style="--c:var(--c-${c})"><svg viewBox="0 0 24 24">${I[n] || I.spark}</svg></span>`;
const tg = (on, key, label) => `<button class="tg" role="switch" data-set="${key}" aria-checked="${on ? "true" : "false"}" aria-label="${esc(label)}"></button>`;
const seg = (opts, sel, key, label) => `<div class="seg" role="group" aria-label="${esc(label)}" data-seg="${key}">${opts.map(([v, t]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === sel}">${esc(t)}</button>`).join("")}</div>`;
const row = (label, small, right, go) => `<div class="row${go ? " link" : ""}" ${go ? `data-go="${go}" tabindex="0"` : ""}><div class="lb"><b>${label}</b>${small ? `<small>${small}</small>` : ""}</div>${right || ""}${go ? '<span class="chev">›</span>' : ""}</div>`;
const m = (cls, inner, go) => `<section class="m ${cls}${go ? " link" : ""}" ${go ? `data-go="${go}" tabindex="0"` : ""}>${inner}</section>`;
const kicker = (t, x = "") => `<div class="k">${t}${x}</div>`;
const soon = (what) => m("", `${kicker("Coming soon")}<p class="sub">${what}</p>`);
const btn = (label, act, extra = "") => `<button class="btn" type="button" data-act="${act}" ${extra}>${label}</button>`;
const chip = (t, cls = "") => `<span class="chip ${cls}">${esc(t)}</span>`;

/* What he knows right now, refreshed as pages open. */
const S = { auth: null, snap: null, recent: [], skills: [], profiles: null, mesa: null, contacts: null, important: [], login: null, look: {} };
// Which notch you talk to (Settings in main, applied live to the notch).
call("notchStyle").then((r) => { S.notchStyle = r?.style || "braino"; });
try { S.look = JSON.parse(localStorage.getItem("braino-app-look") || "{}"); } catch (_) {}
const saveLook = () => { try { localStorage.setItem("braino-app-look", JSON.stringify(S.look)); } catch (_) {} };
async function load(kind) {
  if (kind === "auth" || !S.auth) S.auth = await call("authStatus");
  if (kind === "snap") S.snap = await call("setupSnapshot");
  if (kind === "recent") S.recent = (await call("appRecent"))?.rows || [];
  if (kind === "skills") S.skills = (await call("skillsList"))?.skills || [];
  if (kind === "profiles") S.profiles = await call("chromeProfiles");
  if (kind === "mesa") S.mesa = await call("mesaState");
  if (kind === "contacts") { S.contacts = await call("contactsList"); S.important = (await call("waImportant"))?.names || []; }
  if (kind === "login") S.login = await call("loginItem");
  if (kind === "activity") S.activity = (await call("appActivity", 400))?.rows || [];
  if (kind === "mems") { const r = await call("memoriesList"); S.mems = r?.ok ? r.rows : null; S.memsError = r?.ok ? "" : (r?.error || "unavailable"); }
}
const first = () => String(S.auth?.displayName || S.snap?.name || "").split(" ")[0];
window.__brainoFirstName = first;
const hello = () => { const h = new Date().getHours(); return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

const P = {
  /* Chat: the first page. Type to him; he answers or does it (chat.js). */
  chat: { t: "", nav: ["Chat", "chat"], r: () => window.BrainoChat?.html() || "" },
  /* Companion */
  /* Home: a stats board. Every number is counted from his real activity log
     and memory on this Mac; nothing is estimated or made up. */
  home: { t: "", nav: ["Home", "home"], need: ["snap", "activity", "mems"], r: () => {
    const all = S.activity || [];
    const day = (d) => new Date(d).toDateString();
    const today = new Date();
    const todays = all.filter((x) => day(x.at) === today.toDateString());
    const weekAgo = Date.now() - 7 * 864e5;
    const week = all.filter((x) => new Date(x.at).getTime() > weekAgo);
    const worked = week.filter((x) => x.ok && !x.stood).length;
    const rate = week.length ? Math.round((worked / week.length) * 100) : null;
    const fast = week.filter((x) => x.ms != null).map((x) => x.ms).sort((p, q) => p - q);
    const typical = fast.length ? (fast[Math.floor(fast.length / 2)] / 1000).toFixed(1) : null;
    const days = new Set(all.map((x) => day(x.at)));
    let streak = 0; for (let d = new Date(today); days.has(d.toDateString()); d.setDate(d.getDate() - 1)) streak += 1;
    const bars = [...Array(7)].map((_, i) => { const d = new Date(today); d.setDate(today.getDate() - 6 + i); return { label: d.toLocaleDateString([], { weekday: "narrow" }), n: all.filter((x) => day(x.at) === d.toDateString()).length, today: i === 6 }; });
    const top = Math.max(1, ...bars.map((b) => b.n));
    const mems = S.mems ? S.mems.length : (S.snap?.facts || []).length;
    const next = S.snap?.classesToday?.[0];
    const people = (S.snap?.important || []).slice(0, 5);
    const stat = (k, n, unit, sub) => `<div class="hs"><div class="k">${k}</div><div class="n">${n ?? "—"}${n != null && unit ? `<small>${unit}</small>` : ""}</div><p>${sub}</p></div>`;
    const setUp = Boolean(S.snap?.answers?.completedAt);
    return `<h1 class="greet">${hello()}${first() ? `, <em>${esc(first())}</em>` : ""}.</h1>
      ${setUp ? "" : `<section class="hero-photo"><h2>Let's finish <em>meeting</em>.</h2><p>Two minutes, and he knows enough to run your day.</p><button class="btn" type="button" data-act="setupOpen">Set him up</button></section>`}
      <label class="ask"><input id="ask" placeholder="Ask Braino anything, or tell him what to do" aria-label="Ask Braino"><span class="kb">⌃⌃ to talk</span></label>
      <div class="hs-row">${stat("Today", todays.length, "", "things you asked him")}${stat("This week", week.length, "", `${worked} done for you`)}${stat("Worked", rate, rate != null ? "%" : "", "of this week's asks")}${stat("Typical speed", typical, typical ? "s" : "", "his side of the work")}</div>
      <div class="hs-row">${stat("He knows", mems, "", "things about you")}${stat("Days in a row", streak, "", streak === 1 ? "day with Braino" : "days with Braino")}${stat("Your people", (S.snap?.important || []).length, "", "marked important")}${stat("Skills", S.skills.length, "", "jobs he learned")}</div>
      ${m("s8", `${kicker("Your week")}<div class="hs-week">${bars.map((b) => `<div class="${b.today ? "today" : ""}" title="${b.n}"><i style="height:${Math.round((b.n / top) * 100)}%"></i><span>${b.label}</span></div>`).join("")}</div>`, "activity")}
      ${m("s4", `${kicker("Next class")}${next ? `<h2>${esc(next.title)}</h2><p class="sub">${esc(next.at)}${next.room ? ` · ${esc(next.room)}` : ""}</p>` : `<p class="sub">Nothing left today.</p>`}${people.length ? `<div class="k" style="margin-top:16px">Your people</div><div class="chips">${people.map((n) => chip(`★ ${n}`)).join("")}</div>` : ""}`, "mesa")}
      ${m("", `${kicker("Recent")}<div class="rows">${todays.length ? todays.slice(0, 5).map((x) => row(esc(x.heard), esc(x.did || x.lane || ""), `<span class="val">${x.ms != null ? `${(x.ms / 1000).toFixed(1)}s` : ""}</span>`)).join("") : row("Nothing yet today", "Press Control twice and ask him something")}</div>`, "activity")}`;
  } },
  habits: { t: "Habits", l: "The few things you want to do every day. He notices them, so you never log anything.", nav: ["Habits", "repeat"], r: () => soon("Habits he notices by himself, from your day. Say \"I want to read 20 minutes a day\" and he'll keep an eye on it once this lands.") },
  focus: { t: "Focus", l: "He keeps you on the one thing, and holds messages until you're done.", nav: ["Focus", "target"], r: () => soon("Focus sessions with messages held and distractions closed.") },
  routines: { t: "Routines", l: "Your mornings and nights, run by one sentence.", nav: ["Routines", "sun"], r: () => soon("A morning and a wind down you start by saying it.") },
  /* Activity: everything he did, newest first, a day at a time. */
  activity: { t: "Activity", l: "Everything Braino did for you: what you asked, what he did, how long it took.", nav: ["Activity", "radar"], need: ["activity"], r: () => {
    const rows = (S.activity || []).filter((x) => (S.actFilter === "bad" ? !x.ok || x.stood : S.actFilter === "ok" ? x.ok && !x.stood : true))
      .filter((x) => !S.actQ || `${x.heard} ${x.did}`.toLowerCase().includes(S.actQ));
    const dayOf = (iso) => { const d = new Date(iso), t = new Date(); const y = new Date(t); y.setDate(t.getDate() - 1);
      return d.toDateString() === t.toDateString() ? "Today" : d.toDateString() === y.toDateString() ? "Yesterday" : d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }); };
    const groups = []; rows.forEach((x) => { const k = dayOf(x.at); const g = groups[groups.length - 1]; if (g && g.k === k) g.rows.push(x); else groups.push({ k, rows: [x] }); });
    const all = S.activity || [];
    const worked = all.filter((x) => x.ok && !x.stood).length;
    const head = `${m("s4", `${kicker("Done")}<div class="big">${worked}</div><p class="sub">jobs and answers</p>`)}${m("s4", `${kicker("Didn't work")}<div class="big">${all.length - worked}</div><p class="sub">or stood down</p>`)}${m("s4", `${kicker("Typical")}<div class="big">${(() => { const f = all.filter((x) => x.ms != null).map((x) => x.ms).sort((a, b) => a - b); return f.length ? `${(f[Math.floor(f.length / 2)] / 1000).toFixed(1)}s` : "—"; })()}</div><p class="sub">his side of the work</p>`)}`;
    const bar = `<div class="act-bar"><label class="act-find"><input id="act-q" placeholder="Search what you asked or what he did" value="${esc(S.actQ || "")}"></label>${seg([["all", "All"], ["ok", "Done"], ["bad", "Didn't work"]], S.actFilter || "all", "actFilter", "Filter")}</div>`;
    const body = groups.length ? groups.map((g) => `<section class="m act-day"><div class="k">${esc(g.k)}</div><div class="act-list">${g.rows.map((x) => `<div class="act-row ${x.stood ? "stood" : x.ok ? "ok" : "bad"}"><time>${esc(new Date(x.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }))}</time><span class="act-dot"></span><div class="act-main"><b>${esc(x.heard)}</b><span>${esc(x.stood ? "Stood down, you asked for something else" : x.did || "")}</span></div><span class="act-meta">${chip(x.lane)}${x.ms != null ? `<em>${(x.ms / 1000).toFixed(1)}s</em>` : ""}</span></div>`).join("")}</div></section>`).join("")
      : m("", `<p class="sub">${all.length ? "Nothing matches." : "Nothing yet. Ask him something in Chat or out loud."}</p>`);
    return head + bar + body;
  } },
  memory: { t: "Memory", l: "What Braino knows about you, and your day remembered as text on this Mac. See it, fix it, or make him forget it.", nav: ["Memory", "mem"], need: ["snap", "mems"], r: () => {
    const conn = (S.snap?.connections || []).find((c) => c.id === "memory");
    const on = S.snap?.answers?.memoryOn !== false && !/paused/.test(conn?.detail || "");
    const use = S.snap?.answers?.recallOn !== false && !/can't use/.test(conn?.detail || "");
    const cats = { identity: "Who you are", relationship: "People", project: "Projects", preference: "How you like things", event: "Dates", fact: "Other" };
    const mems = S.mems;
    const list = mems == null
      ? `<p class="sub">${S.memsError === "signed_out" ? "Sign in to see what he knows about you." : "Couldn't load his memory just now."}</p>`
      : mems.length ? `<div class="mem-list">${mems.filter((x) => !S.memQ || x.content.toLowerCase().includes(S.memQ)).map((x) => S.memEditing === x.id
          ? `<div class="mem-row editing"><select data-mem-cat="${x.id}">${Object.entries(cats).map(([k, v]) => `<option value="${k}"${k === x.category ? " selected" : ""}>${v}</option>`).join("")}</select><textarea data-mem-text="${x.id}" rows="2">${esc(x.content)}</textarea><div class="mem-acts">${btn("Cancel", "memCancel")}<button class="btn pr" type="button" data-mem-save="${x.id}">Save</button></div></div>`
          : `<div class="mem-row"><span class="mem-cat">${esc(cats[x.category] || "Other")}</span><p>${esc(x.content)}</p><span class="mem-src">${x.source === "user" || x.source === "onboarding" ? "you told me" : x.source === "mac" ? "from your Mac" : "I noticed"}</span><div class="mem-acts"><button class="btn" type="button" data-mem-edit="${x.id}">Edit</button><button class="btn" type="button" data-mem-del="${x.id}">Forget</button></div></div>`).join("")}</div>`
        : `<p class="sub">Nothing yet. Tell him something about you, or add it here.</p>`;
    const knows = m("", `${kicker("What he knows about you", mems ? chip(`${mems.length}`) : "")}<div class="mem-add"><input id="mem-new" placeholder="Add something he should know, like: I'm vegetarian" aria-label="Add a memory">${btn("Add", "memAdd")}</div>${mems && mems.length > 6 ? `<label class="act-find" style="margin:10px 0 2px"><input id="mem-q" placeholder="Search his memory" value="${esc(S.memQ || "")}"></label>` : ""}${list}`);
    return `${knows}${m("s4", `${kicker("Remember my day")}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><p class="sub">Apps, screen text, what you say</p>${tg(on, "memoryOn", "Remember my day")}</div>`)}
      ${m("s4", `${kicker("Braino can use it")}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><p class="sub">He answers and acts from it</p>${tg(use, "recallOn", "Braino can use it")}</div>`)}
      ${m("s4", `${kicker("Kept")}<div class="big">7 days</div><p class="sub">then deleted by itself</p>`)}
      ${m("", `${kicker("Today, hour by hour")}<div class="rows">${(S.snap?.summaries || []).length ? S.snap.summaries.map((d) => row(esc(d.hour), esc(d.summary))).join("") : row("No summaries yet", "The first one lands at the end of the hour")}</div><div style="margin-top:10px">${btn("Open the memory window", "memoryOpen")}</div>`)}`;
  } },
  notes: { t: "Notes & meetings", nav: ["Notes & meetings", "meet"], r: () => `${m("", `${kicker("Your notes and meetings")}<p class="sub">They still live in the full library for now.</p><div style="margin-top:10px">${btn("Open the library", "dashboardOpen")}</div>`)}` },
  dictation: { t: "Dictation", l: "Option twice, anywhere. Your words, cleaned up, where your cursor is.", nav: ["Dictation", "text"], r: () => m("", `<div class="rows">${row("Shortcut", "", '<span class="kc"><kbd>⌥</kbd><kbd>⌥</kbd></span>')}${row("Clean up my words", "Capitals, full stops, no \"um\"", chip("Always on", "ok"))}${row("Where it goes", "At your cursor. No box? It's copied for you.")}</div>`) },
  mesa: { t: "School", l: "Mesa Nexus, synced by himself every day.", nav: ["School", "school"], need: ["mesa", "snap"], r: () => {
    const ms = S.mesa || {};
    const due = S.snap?.dueSoon || [];
    return `${m("s6", `${kicker("Nexus", ms.connected ? chip("Connected", "ok") : chip("Not connected", "bad"))}<p class="sub">${ms.lastSyncAt ? `Last sync ${esc(new Date(ms.lastSyncAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }))}` : "Not synced yet"}</p><div style="margin-top:10px">${ms.connected ? btn("Sync now", "mesaSync") : btn("Connect Mesa", "mesaConnect")}</div>`)}
      ${m("s6", `${kicker("Due soon")}<div class="rows">${due.length ? due.map((d) => row(esc(d.title), esc(d.when))).join("") : row("Nothing due")}</div>`)}`;
  } },
  whatsapp: { t: "People", l: "Everyone who messages is remembered. Only your important people show in the notch, silently.", nav: ["People", "people"], need: ["contacts"], r: () => `
    ${m("s6", `${kicker("Important people")}<div class="chips">${S.important.length ? S.important.map((n) => `<button class="chip" data-unstar="${esc(n)}" title="Remove">★ ${esc(n)}</button>`).join("") : '<span class="sub">Nobody yet. Say "mark Ilu as important".</span>'}</div>`)}
    ${m("s6", `${kicker("Contacts")}<div class="big">${(S.contacts?.contacts || []).length || "—"}</div><p class="sub">from your Mac's address book</p><div style="margin-top:8px">${btn("Sync contacts", "contactsSync")}</div>`)}` },

  /* Foundry */
  fhome: { t: "", nav: ["Home", "home"], need: ["recent"], r: () => `<h1 class="greet">Your company, this week.</h1>
    <section class="hero-photo"><h2>Tell the world what you <em>shipped</em>.</h2><p>He drafts posts in your voice from what you built this week. Nothing goes out until you say so.</p><button class="btn" type="button" data-go="content">Draft a post</button></section>
    <label class="ask"><input id="ask" placeholder="Tell Braino what to ship, post or send" aria-label="Ask Braino"><span class="kb">⌃⌃ to talk</span></label>
    ${m("s6", `${kicker("Content")}<p class="sub">Posts in your voice, from what you shipped.</p>`, "content")}
    ${m("s6", `${kicker("Braino Code")}<p class="sub">What you're building, and who's on it.</p>`, "code")}
    ${soon("Optics, Outbound and the Approvals inbox. The four jobs of Foundry, one at a time.")}` },
  content: { t: "Content", l: "Post everywhere, in your voice.", nav: ["Content", "pen"], r: () => m("", `${kicker("X", chip("@brainosays"))}<p class="sub">Drafts, the queue and auto-posting live in X automation for now.</p><div style="margin-top:10px">${btn("Open X automation", "dashboardOpen")}</div>`) },
  optics: { t: "Optics", l: "Get named when people ask an AI for something like yours.", nav: ["Optics", "radar"], r: () => soon("He'll ask the AI assistants about your space every week and tell you when you're named.") },
  outbound: { t: "Outbound", l: "Find the right people and write to them, not to four hundred.", nav: ["Outbound", "send"], r: () => soon("He'll find the right people and draft notes you approve.") },
  approvals: { t: "Approvals", l: "Nothing goes out until you say so. One inbox for all of it.", nav: ["Approvals", "inbox"], r: () => soon("Every post, email and reply he wants to send, waiting for your yes.") },
  code: { t: "Braino Code", l: "What you're building, and who's working on it.", nav: ["Braino Code", "code"], r: () => m("", `${kicker("Cursor mode")}<p class="sub">Say "what am I working on" or "is Claude done". The full view lives in the library for now.</p><div style="margin-top:10px">${btn("Open Braino Code", "dashboardOpen")}</div>`) },
  ideas: { t: "Ideas", l: "Every idea you say out loud, kept and ranked.", nav: ["Ideas", "bulb"], r: () => soon("Ideas you say out loud, kept and ranked.") },

  /* Braino (shared) */
  appearance: { t: "Appearance", nav: ["Appearance", "face"], r: () => `
    ${m("", `${kicker("Subtitles")}${seg([["braino", "With subtitles"], ["affective", "Without subtitles"]], S.notchStyle || "braino", "notch", "Subtitles")}<p class="sub" style="margin-top:10px">With subtitles, you see what you said and read his reply in the notch. Without subtitles, you only hear him: the notch stays small, with a dot while he listens and bars while he speaks. It changes straight away.</p>`)}
    ${m("s6", `${kicker("Character")}${seg([["braino", "Braino"], ["brainelle", "Brainelle"], ["webb", "Webb"], ["ferro", "Ferro"]], S.look.mascot || "braino", "mascot", "Character")}<div style="margin-top:14px">${row("Size", "", `<input type="range" min="1" max="5" step=".1" value="${S.look.scale || 1}" data-range="scale" aria-label="Size" style="accent-color:#fff;width:150px">`)}</div>`)}
    ${m("s6", `${kicker("Where he stays")}${seg([["left", "Left"], ["top", "Top"], ["bottom", "Bottom"], ["right", "Right"], ["walk", "Walk"]], S.look.dock || "right", "dock", "Where he stays")}<p class="sub" style="margin-top:10px">Or drag him anywhere: he goes to the nearest spot.</p>`)}
    ${m("", `${kicker("Hide him")}${seg([["", "Shown"], ["hour", "For an hour"], ["hidden", "Until I call"], ["stealth", "Stealth"]], S.look.hide || "", "hide", "Hide him")}<p class="sub" style="margin-top:10px">He still hears you. Bring him back: "Braino, come back", ⌘⇧B, or click the notch.</p>`)}` },
  voice: { t: "Voice & listening", nav: ["Voice & listening", "mic"], r: () => `
    ${m("s6", `${kicker("Calling him")}<div class="rows">${row("Instant listening", "A ready connection, mic off until you call", tg(S.look.warmVoice !== false, "warmVoice", "Instant listening"))}${row("Clean hearing", "Mic rests while he talks; sounds that are not you are dropped", tg(S.look.cleanEar !== false, "cleanEar", "Clean hearing"))}${row("Shortcut", "", '<span class="kc"><kbd>⌃</kbd><kbd>⌃</kbd></span>')}</div>`)}
    ${m("s6", `${kicker("Talking")}<div class="rows">${row("Talk out loud", "Off: answers only in the notch", tg(S.look.talkOutLoud !== false, "talkOutLoud", "Talk out loud"))}${row("Talk me through it", "He says what he's doing while he works", tg(S.look.narrate !== false, "narrate", "Talk me through it"))}${row("Follow-ups", "No need to say Braino again", "<span class='val'>45s</span>")}</div>`)}` },
  commands: { t: "Commands & modes", nav: ["Commands & modes", "modes"], r: () => m("", `${kicker("Your voice commands and modes")}<p class="sub">Phrases that run a set of actions, and modes like Monday Mode. They live in the library for now.</p><div style="margin-top:10px">${btn("Open commands", "dashboardOpen")}</div>`) },
  skills: { t: "Skills he learned", l: "Jobs that worked, remembered under your words. Say them again and they run with no thinking. Nothing that can't be undone is ever learned.", nav: ["Skills he learned", "spark"], need: ["skills"], badge: () => S.skills.length || "", r: () => S.skills.length
    ? `<div class="tiles" style="grid-column:span 12">${S.skills.map((k) => `<div class="tile"><div class="t">${ic("spark", "coral")}<b>"${esc(k.phrase)}"</b></div><small>${esc(k.steps.join(" › "))} · used ${k.uses}×</small><div class="foot">${chip("Instant")}<button class="btn" type="button" data-forget="${esc(k.phrase)}">Forget</button></div></div>`).join("")}</div>`
    : m("", `<p class="sub">Nothing yet. When he plans a job that works, it shows up here.</p>`) },

  /* Connections */
  chrome: { t: "Chrome profiles", l: "Pick your main one and say what the others are for. A link with those words opens in that profile.", nav: ["Chrome profiles", "chrome"], need: ["profiles"], r: () => {
    const ps = S.profiles?.profiles || []; const cfg = S.profiles?.config || { primary: "", rules: [] };
    const used = (dir) => (cfg.rules || []).filter((r) => r.dir === dir).flatMap((r) => r.words).join(", ");
    return ps.length ? `<div class="tiles" style="grid-column:span 12">${ps.map((p) => `<div class="tile"><div class="t">${ic("chrome", cfg.primary === p.dir ? "green" : "gray")}<div><b>${esc(p.name)}</b><br><small>${esc(p.email || "not signed in")}</small></div></div><input data-usefor="${esc(p.dir)}" value="${esc(used(p.dir))}" placeholder="Used for: nexus, mesa…" aria-label="What ${esc(p.name)} is for" style="background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#fff;padding:6px 9px;font:12.5px var(--sans)"><div class="foot">${chip(cfg.primary === p.dir ? "★ Main" : p.lastUsed ? "Used last" : "Profile", cfg.primary === p.dir ? "ok" : "")}${cfg.primary === p.dir ? "" : `<button class="btn" type="button" data-primary="${esc(p.dir)}">Make main</button>`}</div></div>`).join("")}</div>` : m("", `<p class="sub">No Chrome profiles found on this Mac.</p>`);
  } },
  music: { t: "Music", nav: ["Music", "music"], r: () => `${m("s6", `${kicker("Spotify")}<p class="sub">Say "play Billie Jean". He uses the Spotify app.</p>`)}${m("s6", `${kicker("YouTube")}<p class="sub">Plays in Chrome.</p>`)}` },

  /* System */
  general: { t: "General", nav: ["General", "gear"], need: ["login"], r: () => `
    ${m("s8", `${kicker("Look")}<div class="looks"><button class="look" type="button" aria-pressed="true"><i></i>Glass</button><button class="look" type="button" aria-pressed="false" disabled title="Coming soon"><i></i>Dark · soon</button><button class="look" type="button" aria-pressed="false" disabled title="Coming soon"><i></i>Light · soon</button></div>`)}
    ${m("s4", `${kicker("Braino for Mac")}<div class="big">${esc(S.login?.version || "")}</div><p class="sub">This Mac</p>`)}
    ${m("s6", `${kicker("Start")}<div class="rows">${row("Open at login", "", tg(Boolean(S.login?.openAtLogin), "openAtLogin", "Open at login"))}</div>`)}
    ${m("s6", `${kicker("Language")}<div class="rows">${row("He speaks", "", "<span class='val'>English</span>")}${row("He understands", "English and Hinglish", "<span class='val'>Auto</span>")}</div>`)}` },
  permissions: { t: "Permissions", l: "macOS asks once for each. Anything missing has a Fix that opens the exact setting.", nav: ["Permissions", "lock"], need: ["snap"], badge: () => (S.snap?.permissions || []).filter((p) => !p.ok).length || "", r: () => {
    const p = S.snap?.permissions || []; const ok = p.filter((x) => x.ok).length;
    const icons = { microphone: ["mic", "blue"], accessibility: ["hand", "gray"], screen: ["eye", "purple"], contacts: ["people", "amber"], automation: ["key", "gray"] };
    return m("", `<div style="display:flex;align-items:center;gap:18px"><div class="ring" style="--p:${p.length ? Math.round(ok / p.length * 100) : 0}"><span>${ok}/${p.length}</span></div><div><h2>${p.length - ok ? `${p.length - ok} need a one-time OK` : "All set"}</h2><p class="sub">Automation (keys, Chrome, Spotify) comes up as macOS popups the first time he uses it. Click OK.</p></div></div>`)
      + `<div class="tiles" style="grid-column:span 12">${p.map((x) => { const [i, c] = icons[x.id] || ["lock", "gray"]; return `<div class="tile"><div class="t">${ic(i, c)}<b>${esc(x.label)}</b></div><small>${esc(x.why)}</small><div class="foot">${chip(x.ok ? "Allowed" : "Needs OK", x.ok ? "ok" : "bad")}${x.ok ? "" : `<button class="btn" type="button" data-pane="${esc(x.pane)}">Fix</button>`}</div></div>`; }).join("")}</div>`;
  } },
  keys: { t: "Shortcuts", nav: ["Shortcuts", "key"], r: () => `<div class="keys" style="grid-column:span 12">${[["Talk to Braino", ["⌃", "⌃"]], ["Dictate", ["⌥", "⌥"]], ["Hide and show him", ["⌘", "⇧", "B"]], ["Live lecture", ["⌘", "⇧", "E"]], ["Her mode", ["⌘", "⇧", "H"]], ["Braino OS", ["⌘", "⇧", "O"]], ["This window", "Double-click Braino"]].map(([n, k]) => `<div class="keyt"><b style="font-weight:500">${n}</b>${Array.isArray(k) ? `<span class="kc">${k.map((x) => `<kbd>${x}</kbd>`).join("")}</span>` : `<span class="val" style="color:var(--ink2)">${k}</span>`}</div>`).join("")}</div>` },
  privacy: { t: "Privacy", l: "What he keeps, where, and what never leaves your Mac.", nav: ["Privacy", "eye"], r: () => `
    ${m("s4", `<div class="head">${ic("lock", "green", 1)}<h2>On this Mac</h2></div><p class="sub">Your whole day, as text. Kept 7 days, then gone.</p><div style="margin-top:10px">${btn("Delete today", "deleteToday")}</div>`)}
    ${m("s4", `<div class="head">${ic("send", "blue", 1)}<h2>Leaves the Mac</h2></div><p class="sub">One short summary per hour, so he can recall it. Nothing else.</p><div style="margin-top:10px"><button class="btn" type="button" data-go="memory">See summaries</button></div>`)}
    ${m("s4", `<div class="head">${ic("eye", "purple", 1)}<h2>Never recorded</h2></div><p class="sub">Private windows, password apps, and his own windows.</p><div style="margin-top:10px">${btn("Pause memory", "pauseMemory")}</div>`)}` },
  setup: { t: "Set him up", l: "What he knows about you. Open it any time to watch his notebook fill in.", nav: ["Set him up", "hand"], need: ["snap"], r: () => {
    const a = S.snap?.answers || {};
    const steps = [["What to call you", a.callMe], ["Your days", a.persona], ["Your rhythm", a.dayStarts && a.dayEnds], ["What to take off your plate", (a.focus || []).length], ["Your people", (a.important || S.snap?.important || []).length], ["Chrome profiles", S.profiles?.config?.primary], ["Memory", typeof a.memoryOn === "boolean"], ["His voice", a.voice], ["Boundaries", a.never]];
    const d = steps.filter((x) => x[1]).length;
    return m("s4", `<div class="ring" style="--p:${Math.round(d / steps.length * 100)};margin-bottom:10px"><span>${d}/${steps.length}</span></div><h2>${steps.length - d ? `${steps.length - d} left` : "All done"}</h2><p class="sub">About a minute.</p><div style="margin-top:12px"><button class="btn primary" type="button" data-act="setupOpen">${d ? "Continue" : "Start"}</button></div>`)
      + m("s8", `${kicker("Steps")}<div class="steps">${steps.map(([n, ok], i) => `<div class="step${ok ? " done" : ""}"><span class="d">${ok ? "✓" : i + 1}</span><b>${n}</b>${ok ? "" : btn("Do it", "setupOpen")}</div>`).join("")}</div>`);
  } },
  account: { t: "Account", nav: ["Account", "user"], r: () => `${m("s6", `<div class="head"><div class="av" style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#ff9b82,#b24a36);display:grid;place-items:center;font:600 17px var(--ui)">${esc((first() || "·").charAt(0))}</div><div><h2>${esc(S.auth?.displayName || "Not signed in")}</h2><p class="sub">${esc(S.auth?.email || "")}</p></div></div>`)}${m("s6", `${kicker("This Mac")}<div class="rows">${row("Signed in", S.auth?.authenticated ? "Yes" : "No")}${row("Sign out", "", btn("Sign out", "signOut"))}</div>`)}` },
};
const NAV = {
  companion: [["", ["chat", "home"]], ["Your day", ["habits", "focus", "routines"]], ["Library", ["activity", "memory", "notes", "dictation"]], ["Your world", ["mesa", "whatsapp"]]],
  foundry: [["", ["chat", "fhome"]], ["The four jobs", ["content", "optics", "outbound", "approvals"]], ["Build", ["code", "ideas"]]],
  shared: [["Braino", ["appearance", "voice", "commands", "skills"]], ["Connections", ["chrome", "music"]], ["System", ["general", "permissions", "keys", "privacy", "setup"]]],
};

let product = "companion", cur = "chat";
function renderNav() {
  const f = $("q").value.toLowerCase();
  $("nav").innerHTML = [...NAV[product], ...NAV.shared].map(([g, ids]) => {
    const items = ids.filter((id) => !f || P[id].nav[0].toLowerCase().includes(f));
    if (!items.length) return "";
    return (g ? `<div class="gh">${g}</div>` : "") + items.map((id) => { const b = typeof P[id].badge === "function" ? P[id].badge() : ""; return `<button type="button" data-go="${id}" aria-current="${id === cur}" aria-label="${P[id].nav[0]}"><span class="ni"><svg viewBox="0 0 24 24">${I[P[id].nav[1]] || I.spark}</svg></span><span class="nm">${P[id].nav[0]}</span>${b ? `<span class="bdg">${b}</span>` : ""}</button>`; }).join("");
  }).join("");
}
function paint() {
  const p = P[cur];
  $("title").textContent = p.t || ""; $("lede").textContent = p.l || "";
  document.querySelector(".bar").style.display = p.t ? "flex" : "none";
  document.querySelector(".main").classList.toggle("bare", !p.t);
  document.querySelector(".main").classList.toggle("chatting", cur === "chat");
  const body = $("body"); body.innerHTML = p.r();
  if (cur === "chat") window.BrainoChat?.mount();
  [...body.children].forEach((el, i) => { el.style.animationDelay = `${Math.min(i, 10) * 40}ms`; });
  const bar = document.querySelector(".bar"); bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
  renderNav();
}
async function go(id) {
  if (!P[id]) return;
  cur = id; paint(); $("body").scrollTop = 0;
  try { localStorage.setItem("braino-app", JSON.stringify({ product, cur })); } catch (_) {}
  const need = P[id].need || [];
  if (need.length) { await Promise.all(need.map(load)); if (cur === id) paint(); }
}
function setProduct(pr) {
  product = pr; $("win").dataset.product = pr;
  document.querySelectorAll(".switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.product === pr)));
  void go("chat");
}

/* Changing him: the overlay owns his look, so the choice is sent there. */
function overlay(patch) { S.look = { ...S.look, ...patch }; saveLook(); void call("appOverlay", patch); }

document.addEventListener("click", async (e) => {
  const t = e.target;
  const sw = t.closest(".switch button"); if (sw) { setProduct(sw.dataset.product); return; }
  const tgl = t.closest(".tg");
  if (tgl) {
    const on = tgl.getAttribute("aria-checked") !== "true"; tgl.setAttribute("aria-checked", String(on));
    const k = tgl.dataset.set;
    if (k === "memoryOn" || k === "recallOn") { await call("setupSave", { [k]: on }); toast(on ? "On." : "Off."); }
    else if (k === "openAtLogin") { await call("loginItem", on); toast(on ? "He'll open when you log in." : "He won't open at login."); }
    else if (k === "warmVoice" || k === "talkOutLoud" || k === "cleanEar" || k === "narrate") { overlay({ [k]: on }); toast(on ? "On." : "Off."); }
    return;
  }
  const sb = t.closest(".seg button");
  if (sb) {
    sb.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === sb)));
    const key = sb.parentElement.dataset.seg, v = sb.dataset.v;
    if (key === "mascot") { overlay({ mascot: v }); await call("setMascot", v); }
    if (key === "dock") overlay({ dock: v });
    if (key === "hide") overlay({ hide: v });
    if (key === "actFilter") { S.actFilter = v; paint(); }
    if (key === "notch") { S.notchStyle = v; await call("notchStyle", v); toast(v === "affective" ? "Subtitles off. You'll just hear him." : "Subtitles on."); }
    return;
  }
  const act = t.closest("[data-act]")?.dataset.act;
  if (act) {
    if (act === "setupOpen") await call("setupOpen");
    if (act === "memoryOpen") await call("memoryOpen");
    if (act === "dashboardOpen") await call("dashboardOpen");
    if (act === "mesaSync") { toast("Syncing Nexus…"); await call("mesaSync"); await load("mesa"); paint(); toast("Synced."); }
    if (act === "mesaConnect") { await call("mesaConnect"); await load("mesa"); paint(); }
    if (act === "contactsSync") { toast("Reading your contacts…"); S.contacts = await call("contactsSync"); paint(); }
    if (act === "deleteToday") { await call("activityDeleteDay", new Date().toISOString().slice(0, 10)); toast("Today's memory is deleted."); }
    if (act === "pauseMemory") { await call("activityPause", true); toast("Memory paused. Say \"resume memory\" to start again."); }
    if (act === "signOut") { await call("authSignOut"); await load("auth"); paint(); }
    if (act === "memCancel") { S.memEditing = null; paint(); }
    if (act === "memAdd") {
      const input = $("mem-new"); const text = input?.value.trim(); if (!text) return;
      const r = await call("memoryAdd", text, "fact");
      if (r?.ok) { toast("He'll remember that."); await load("mems"); paint(); } else toast("Couldn't save that just now.");
    }
    return;
  }
  const pane = t.closest("[data-pane]")?.dataset.pane; if (pane) { await call("setupOpenPane", pane); return; }
  const me = t.closest("[data-mem-edit]")?.dataset.memEdit; if (me) { S.memEditing = me; paint(); document.querySelector(`[data-mem-text="${me}"]`)?.focus(); return; }
  const ms = t.closest("[data-mem-save]")?.dataset.memSave;
  if (ms) {
    const text = document.querySelector(`[data-mem-text="${ms}"]`)?.value.trim(); const cat = document.querySelector(`[data-mem-cat="${ms}"]`)?.value;
    if (!text) return;
    const r = await call("memoryUpdate", ms, text, cat);
    if (r?.ok) { S.memEditing = null; await load("mems"); paint(); toast("Updated."); } else toast("Couldn't save that just now.");
    return;
  }
  const md = t.closest("[data-mem-del]")?.dataset.memDel;
  if (md) {
    const r = await call("memoryDelete", md);
    if (r?.ok) { S.mems = (S.mems || []).filter((x) => x.id !== md); paint(); toast("Forgotten."); } else toast("Couldn't do that just now.");
    return;
  }
  const primary = t.closest("[data-primary]")?.dataset.primary;
  if (primary && S.profiles) { const r = await call("chromeProfilesSave", { ...S.profiles.config, primary }); if (r?.config) S.profiles.config = r.config; paint(); toast("That's your main profile now."); return; }
  const forget = t.closest("[data-forget]")?.dataset.forget; if (forget) { await call("skillsForget", forget); await load("skills"); paint(); toast("Forgotten."); return; }
  const unstar = t.closest("[data-unstar]")?.dataset.unstar; if (unstar) { S.important = (await call("waImportant", unstar, false))?.names || S.important.filter((n) => n !== unstar); paint(); return; }
  const g = t.closest("[data-go]"); if (g) { void go(g.dataset.go); }
});
document.addEventListener("change", async (e) => {
  const dir = e.target?.dataset?.usefor;
  if (dir && S.profiles) {
    const words = String(e.target.value || "").split(/\s*(?:,|\band\b)\s*/).map((w) => w.trim().toLowerCase()).filter(Boolean);
    const rules = (S.profiles.config.rules || []).filter((r) => r.dir !== dir); if (words.length) rules.push({ dir, words });
    const r = await call("chromeProfilesSave", { ...S.profiles.config, rules }); if (r?.config) S.profiles.config = r.config; toast("Saved.");
  }
  if (e.target?.dataset?.range === "scale") overlay({ scale: Number(e.target.value) });
});
document.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && e.target.id === "mem-new") { document.querySelector('[data-act="memAdd"]')?.click(); return; }
  if (e.key === "Enter" && e.target.id === "ask" && e.target.value.trim()) { const text = e.target.value.trim(); e.target.value = ""; toast("On it."); await call("delegate", text, { canTalk: false, reason: "app_ask" }); return; }
  if (e.key === "Enter") { const g = e.target.closest?.("[data-go]"); if (g) void go(g.dataset.go); }
});
$("q").addEventListener("input", renderNav);
document.addEventListener("input", (e) => {
  const id = e.target?.id;
  if (id !== "act-q" && id !== "mem-q") return;
  if (id === "act-q") S.actQ = e.target.value.trim().toLowerCase(); else S.memQ = e.target.value.trim().toLowerCase();
  const pos = e.target.selectionStart; paint();
  const again = $(id); if (again) { again.focus(); again.setSelectionRange(pos, pos); }
});
api.onAppGo?.((page) => { if (P[page]) { if ((NAV.foundry.flat(2)).includes(page) && product !== "foundry") setProduct("foundry"); void go(page); } });

(async () => {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem("braino-app") || "{}"); } catch (_) {}
  product = "companion"; $("win").dataset.product = product;   // Foundry hidden for now
  document.querySelectorAll(".switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.product === product)));
  await load("auth");
  $("me-name").textContent = S.auth?.displayName || "Braino"; $("me-plan").textContent = S.auth?.email || "Account"; $("me-av").textContent = (first() || "·").charAt(0);
  // Home is the front door once he's set up; before that, chat.
  await load("snap");
  void go(S.snap?.answers?.completedAt && product === "companion" ? "home" : "chat");
  void load("skills").then(renderNav); renderNav(); void load("profiles");
})();
