/* Braino for Mac: one app for everything. Double-click Braino to open it.
   System Settings shape (categories on the left, panels on the right), in
   AffectiveOS glass and type. Foundry comes later; only Companion ships. Every panel reads and writes his real settings through the
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
// How he hears you: on this Mac, or Sarvam's live stream (Settings > Appearance > Listening).
call("speechEngine").then((r) => { S.speechEngine = r?.engine || "on-device"; S.hasSarvamKey = Boolean(r?.hasSarvamKey); });
try { S.look = JSON.parse(localStorage.getItem("braino-app-look") || "{}"); } catch (_) {}
const saveLook = () => { try { localStorage.setItem("braino-app-look", JSON.stringify(S.look)); } catch (_) {} };
async function load(kind) {
  if (kind === "auth" || !S.auth) S.auth = await call("authStatus");
  if (kind === "snap") S.snap = await call("setupSnapshot");
  if (kind === "recent") S.recent = (await call("appRecent"))?.rows || [];
  if (kind === "skills") S.skills = (await call("skillsList"))?.skills || [];
  if (kind === "taught") { S.taught = (await call("taughtList")) || []; S.teach = (await call("teachState")) || { teaching: false }; }
  if (kind === "profiles") S.profiles = await call("chromeProfiles");
  if (kind === "mesa") S.mesa = await call("mesaState");
  if (kind === "contacts") { S.contacts = await call("contactsList"); S.important = (await call("waImportant"))?.names || []; }
  if (kind === "login") S.login = await call("loginItem");
  if (kind === "wake") S.wake = await call("namedMode");
  if (kind === "activity") S.activity = (await call("appActivity", 400))?.rows || [];
  if (kind === "notes") {
    const [lib, notes, docs] = await Promise.all([call("notesLibrary"), call("dashboardData", "notes"), call("dashboardData", "docs")]);
    const ms = (d) => (d ? new Date(d).getTime() || 0 : 0);
    S.notesLib = {
      items: [
        ...(lib?.pdfs || []).map((x) => ({ kind: x.kind, title: x.name.replace(/^\d{4}-\d{2}-\d{2} · /, ""), at: x.at, file: x.file, pdf: true })),
        ...(notes?.rows || []).filter((r) => NOTE_KINDS.has(r.use_case)).map((r) => ({ table: "notes", id: r.id, kind: r.use_case === "meeting" ? "meeting" : "note", title: r.title || "", at: ms(r.created_at), markdown: r.structured_notes || "", source: r.source_title || "" })),
        ...(docs?.rows || []).map((r) => ({ table: "braino_docs", id: r.id, kind: r.kind === "lecture" ? "lecture" : "note", title: r.title || "", at: ms(r.happened_on), markdown: r.markdown || "" })),
      ],
      signedOut: notes?.error === "signed_out",
    };
    for (const x of S.notesLib.items) x.title = niceTitle(x);
  }
  if (kind === "mems") { const r = await call("memoriesList"); S.mems = r?.ok ? r.rows : null; S.memsError = r?.ok ? "" : (r?.error || "unavailable"); }
}
const first = () => String(S.auth?.displayName || S.snap?.name || "").split(" ")[0];
window.__brainoFirstName = first;
const hello = () => { const h = new Date().getHours(); return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

/* Notes: the write-up and the transcript are one text in the database. Split
   them so the transcript can be its own view. No marker and no structure at
   all means it was only ever a transcript. */
S.nf = { kind: "all", sort: "new", range: "all", from: "", to: "", q: "" };
/* The notes table also holds memories, highlights and (until 15 Oct) every
   agent task the extension ran. Only real notes belong on this page. */
const NOTE_KINDS = new Set(["meeting", "lecture", "page", "general"]);
/* "Notetaker meeting" tells you nothing. A missing or generic title reads as
   what it was and when: "Meeting, 19 August". */
function niceTitle(x) {
  const t = String(x.title || "").trim();
  const generic = !t || /^(?:untitled|notetaker(?:\s+(?:meeting|note|recording))?|meeting|lecture|note|recording|new note)$/i.test(t);
  if (!generic) return t;
  const kind = { meeting: "Meeting", lecture: "Lecture" }[x.kind] || "Note";
  return x.at ? `${kind}, ${new Date(x.at).toLocaleDateString([], { day: "numeric", month: "long" })}` : kind;
}
function splitNote(md) {
  const text = String(md || "");
  const marks = [/\n\s*[—-]+\s*Full transcript\s*[—-]+\s*\n/i, /\n-{3,}\s*\n+#{1,3}\s*(?:Full\s+)?transcript\s*\n/i, /\n#{1,3}\s*(?:Full\s+)?transcript\s*\n/i];
  for (const re of marks) { const m = text.match(re); if (m) return { notes: text.slice(0, m.index).trim(), transcript: text.slice(m.index + m[0].length).trim() }; }
  if (!/^\s*(#|[-*] |\d+[.)] |\|)/m.test(text)) return { notes: "", transcript: text.trim() };
  return { notes: text.trim(), transcript: "" };
}
const txHtml = (t) => String(t || "").split(/\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
function noteView(o) {
  const x = o.item;
  const views = [...(x.pdf ? [["pdf", "Document"]] : [["notes", "Notes"]]), ["transcript", "Transcript"]];
  const head = `<div class="note-head">${seg(views, o.view, "nview", "View")}<span style="flex:1"></span>${x.pdf ? btn("Show the PDF in Finder", "noteReveal") : o.notes ? btn("Save as PDF", "noteSavePdf") : ""}</div>`;
  let body;
  if (o.view === "pdf") body = `<iframe class="note-pdf" title="${esc(x.title)}" src="${esc(encodeURI("file://" + x.file))}#toolbar=0&view=FitH"></iframe>`;
  else if (o.view === "transcript") body = `<article class="note-doc tx">${o.transcript ? txHtml(o.transcript) : '<p class="sub">No transcript was kept for this one.</p>'}</article>`;
  else body = `<article class="note-doc">${o.notes ? (o.html || '<p class="sub">Opening…</p>') : `<p>This one is only a transcript so far.</p><p>${btn(o.writing ? "Writing it up…" : "Write it up as notes", "noteWriteUp", o.writing ? "disabled" : "")}</p>`}</article>`;
  const qa = (o.qa || []).map((q) => `<div class="qa ${q.role}">${q.role === "user" ? esc(q.content) : (q.html || esc(q.content))}</div>`).join("");
  const ask = m("", `${kicker("Ask about this " + (x.kind === "lecture" ? "lecture" : x.kind === "meeting" ? "meeting" : "note"))}<div class="qa-list">${qa || '<p class="sub">Like a tutor who sat through it. Try "explain the main idea simply", "what did we decide about pricing", or "quiz me on this".</p>'}${o.asking ? '<div class="qa assistant sub">Thinking…</div>' : ""}</div><label class="ask qa-ask"><input id="note-ask" placeholder="Ask anything about it" aria-label="Ask about this note"${o.asking ? " disabled" : ""}></label>`);
  return `${head}${body}${ask}`;
}
async function openNote(x) {
  S.noteOpen = { item: x, view: x.pdf ? "pdf" : "notes", notes: "", transcript: "", html: "", qa: [] };
  if (x.pdf) {
    const t = await call("notesText", x.file);
    if (t?.ok) { S.noteOpen.notes = t.markdown || ""; S.noteOpen.transcript = t.transcript || ""; }
  } else {
    const sp = splitNote(x.markdown);
    Object.assign(S.noteOpen, sp);
    if (!sp.notes) S.noteOpen.view = "transcript";
    paint();
    if (sp.notes) { const r = await call("notesRender", sp.notes); if (S.noteOpen?.item === x) S.noteOpen.html = r?.html || ""; }
  }
  paint();
}
async function askNote(question) {
  const o = S.noteOpen; if (!o || o.asking) return;
  const context = [o.notes, o.transcript ? `Transcript:\n${o.transcript}` : ""].filter(Boolean).join("\n\n") || o.item.markdown || "";
  if (!context) { toast("There is no text in this one to ask about."); return; }
  const history = o.qa.map(({ role, content }) => ({ role, content }));
  o.qa.push({ role: "user", content: question }); o.asking = true; paint();
  const r = await call("notesAsk", { notes: context, question, history });
  o.asking = false;
  if (r?.ok) { const h = await call("notesRender", r.reply); o.qa.push({ role: "assistant", content: r.reply, html: h?.html || "" }); }
  else o.qa.push({ role: "assistant", content: "I couldn't answer that just now. Try again in a moment." });
  if (S.noteOpen === o) { paint(); const box = $("note-ask"); box?.focus(); document.querySelector(".qa-list")?.lastElementChild?.scrollIntoView({ block: "nearest" }); }
}

const P = {
  /* Chat: the first page. Type to him; he answers or does it (chat.js). */
  chat: { t: "", nav: ["Chat", "chat"], r: () => (S.chatView === "thread" ? chatThread() : chatsPage()) },
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
    return `${knows}${m("s4", `${kicker("Learn my day")}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><p class="sub">A private diary of your day on this Mac. Off means he only looks when you ask</p>${tg(on, "memoryOn", "Learn my day")}</div>`)}
      ${m("s4", `${kicker("Help make Braino better")}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><p class="sub">Let us learn from your conversations with him. Never sold</p>${tg(S.snap?.answers?.improveBraino !== false, "improveBraino", "Help make Braino better")}</div>`)}
      ${m("s4", `${kicker("Braino can use it")}<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><p class="sub">He answers and acts from it</p>${tg(use, "recallOn", "Braino can use it")}</div>`)}
      ${m("s4", `${kicker("Kept")}<div class="big">7 days</div><p class="sub">then deleted by itself</p>`)}
      ${m("", `${kicker("Today, hour by hour")}<div class="rows">${(S.snap?.summaries || []).length ? S.snap.summaries.map((d) => row(esc(d.hour), esc(d.summary))).join("") : row("No summaries yet", "The first one lands at the end of the hour")}</div><div style="margin-top:10px">${btn("Open the memory window", "memoryOpen")}</div>`)}`;
  } },
  /* Notes, meetings and lectures, read right here (2026-10-15). Filter by kind
     and date, open one, flip between the notes and the raw transcript (like a
     Notion toggle), and ask it questions like a tutor. */
  notes: { t: "Notes & meetings", l: "Every meeting and lecture, written up. Filter, read, flip to the transcript, or ask it anything.", nav: ["Notes & meetings", "meet"], need: ["notes"], r: () => {
    const o = S.noteOpen;
    if (o) return noteView(o);
    const L = S.notesLib || {};
    const f = S.nf;
    const day0 = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
    const now = Date.now();
    const lo = f.range === "week" ? now - 7 * 864e5 : f.range === "month" ? now - 31 * 864e5 : f.range === "custom" && f.from ? day0(f.from) : 0;
    const hi = f.range === "custom" && f.to ? day0(f.to) + 864e5 - 1 : Infinity;
    const all = L.items || [];
    const items = all
      .filter((x) => f.kind === "all" || x.kind === f.kind)
      .filter((x) => x.at >= lo && x.at <= hi)
      .filter((x) => !f.q || x.title.toLowerCase().includes(f.q))
      .sort((a, b) => (f.sort === "old" ? a.at - b.at : b.at - a.at));
    const KIND = { meeting: "Meeting", lecture: "Lecture", assignment: "Assignment", note: "Note" };
    const count = (k) => all.filter((x) => x.kind === k).length;
    let month = "";
    const list = items.map((x) => {
      const mo = x.at ? new Date(x.at).toLocaleDateString([], { month: "long", year: "numeric" }) : "No date";
      const head = mo !== month ? `<div class="nl-month">${esc((month = mo))}</div>` : "";
      const idx = all.indexOf(x);
      return `${head}<div class="row link" data-note="${idx}" tabindex="0"><div class="lb"><b>${esc(x.title)}</b><small>${x.at ? esc(new Date(x.at).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })) : ""}${x.pdf ? " · PDF on this Mac" : ""}</small></div>${chip(KIND[x.kind] || "Note", `nk-${x.kind}`)}<span class="chev">›</span></div>`;
    }).join("");
    const filters = `<div class="nf">
      ${seg([["all", `All ${all.length}`], ["meeting", `Meetings ${count("meeting")}`], ["lecture", `Lectures ${count("lecture")}`], ["note", `Notes ${count("note")}`]], f.kind, "nkind", "Kind")}
      ${seg([["new", "Newest"], ["old", "Oldest"]], f.sort, "nsort", "Sort")}
      ${seg([["all", "All time"], ["week", "This week"], ["month", "This month"], ["custom", "Dates"]], f.range, "nrange", "When")}
      ${f.range === "custom" ? `<span class="nf-dates"><input type="date" id="nf-from" value="${esc(f.from)}" aria-label="From"> to <input type="date" id="nf-to" value="${esc(f.to)}" aria-label="To"></span>` : ""}
      <label class="act-find nf-q"><input id="nf-q" placeholder="Search titles" value="${esc(f.q)}"></label>
    </div>`;
    return `${m("", `${filters}${kicker("Showing", chip(`${items.length}`))}${items.length ? `<div class="rows nl">${list}</div>` : `<p class="sub">${L.signedOut ? "Sign in to see notes from your other devices." : all.length ? "Nothing matches these filters." : 'Nothing yet. Say "record this meeting" or press ⌘⇧E in a lecture.'}</p>`}${all.some((x) => x.pdf) ? `<div style="margin-top:10px">${btn("Show all PDFs in Finder", "notesFolder")}</div>` : ""}`)}`;
  } },
  dictation: { t: "Dictation", l: "Talk instead of type, in any app. Your words, cleaned up, typed where your cursor is.", nav: ["Dictation", "text"], r: () => `
    ${m("dict-hero", `<div class="dict-keys"><span class="kc"><kbd>⌥</kbd><kbd>⌥</kbd></span></div><h2>Press Option twice. Talk. Press it again.</h2><p class="sub">Works in Mail, Slack, WhatsApp, Notes, Google Docs, a search box, anywhere you can type. You talk the way you talk, and the text comes out the way you would have written it.</p>`)}
    ${m("s4", `${kicker("1 · Start")}<div class="big">⌥ ⌥</div><p class="sub">Click where the text should go, then tap Option twice. The notch shows he is listening.</p>`)}
    ${m("s4", `${kicker("2 · Talk")}<div class="big">🎙</div><p class="sub">Say it naturally. Pause, restart, say "um". Nothing is typed until you finish.</p>`)}
    ${m("s4", `${kicker("3 · Done")}<div class="big">⌥ ⌥</div><p class="sub">Tap Option twice again. Clean text appears at your cursor in about a second.</p>`)}
    ${m("s6", `${kicker("What you say")}<p class="dict-say">"um so can we move the call to uh thursday actually friday at four"</p>`)}
    ${m("s6", `${kicker("What gets typed")}<p class="dict-out">Can we move the call to Friday at 4?</p>`)}
    ${m("", `${kicker("Good to know")}<div class="rows">${row("Clean up my words", "Capitals, full stops, numbers. \"Um\" and false starts are dropped.", chip("Always on", "ok"))}${row("No text box?", "If nothing is selected to type into, the text is copied so you can paste it.")}${row("Silent", "He never talks back in dictation. It is only for writing.")}${row("Private", "Your voice is turned into text and then thrown away. Nothing is kept as audio.")}</div>`)}` },
  mesa: { t: "School", l: "Mesa Nexus, synced by himself every day.", nav: ["School", "school"], need: ["mesa", "snap"], r: () => {
    const ms = S.mesa || {};
    const due = S.snap?.dueSoon || [];
    return `${m("s6", `${kicker("Nexus", ms.connected ? chip("Connected", "ok") : chip("Not connected", "bad"))}<p class="sub">${ms.lastSyncAt ? `Last sync ${esc(new Date(ms.lastSyncAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }))}` : "Not synced yet"}</p><div style="margin-top:10px">${ms.connected ? btn("Sync now", "mesaSync") : btn("Connect Mesa", "mesaConnect")}</div>`)}
      ${m("s6", `${kicker("Due soon")}<div class="rows">${due.length ? due.map((d) => row(esc(d.title), esc(d.when))).join("") : row("Nothing due")}</div>`)}`;
  } },
  whatsapp: { t: "People", l: "Everyone who messages is remembered. Only your important people show in the notch, silently.", nav: ["People", "people"], need: ["contacts"], r: () => `
    ${m("s6", `${kicker("Important people")}<div class="chips">${S.important.length ? S.important.map((n) => `<button class="chip" data-unstar="${esc(n)}" title="Remove">★ ${esc(n)}</button>`).join("") : '<span class="sub">Nobody yet. Say "mark Ilu as important".</span>'}</div>`)}
    ${m("s6", `${kicker("Contacts")}<div class="big">${(S.contacts?.contacts || []).length || "—"}</div><p class="sub">from your Mac's address book</p><div style="margin-top:8px">${btn("Sync contacts", "contactsSync")}</div>`)}
    ${(() => {
      /* Every contact, as a grid you can scroll and search (2026-10-15). */
      const all = S.contacts?.contacts || [];
      const q = S.peopleQ || "";
      const shown = q ? all.filter((c) => `${c.name} ${c.nickname} ${c.company} ${(c.phones || []).join(" ")}`.toLowerCase().includes(q)) : all;
      const ini = (n) => String(n || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
      const card = (c) => `<div class="pc"><span class="pc-av">${esc(ini(c.name))}</span><div class="pc-tx"><b>${esc(c.name || "No name")}</b><small>${esc(c.company || c.phone || (c.emails || [])[0] || "")}</small></div>${S.important.includes(c.name) ? '<span class="pc-star" title="Important">★</span>' : ""}</div>`;
      return m("", `${kicker("Everyone", chip(q ? `${shown.length} of ${all.length}` : String(all.length)))}<label class="act-find" style="margin:0 0 12px"><input id="people-q" placeholder="Search by name, company or number" value="${esc(q)}"></label>${shown.length ? `<div class="pgrid">${shown.map(card).join("")}</div>` : `<p class="sub">${all.length ? "Nobody matches that." : "No contacts yet. Press Sync contacts."}</p>`}`);
    })()}` },

  /* Braino (shared) */
  appearance: { t: "Appearance", nav: ["Appearance", "face"], r: () => `
    ${m("", `${kicker("Listening")}${seg([["on-device", "On this Mac"], ["sarvam", "Sarvam"]], S.speechEngine || "on-device", "engine", "Listening")}<p class="sub" style="margin-top:10px">How he turns your voice into words, for everything: talking to him, dictation, and lecture or meeting recordings. On this Mac is private and free. Sarvam streams to Sarvam's servers and is strong on Indian accents and Hinglish.${S.hasSarvamKey ? "" : " Sarvam needs a key in .env.local first."} It changes from the next time he listens.</p>`)}
    ${m("", `${kicker("Subtitles")}${seg([["braino", "With subtitles"], ["affective", "Without subtitles"]], S.notchStyle || "braino", "notch", "Subtitles")}<p class="sub" style="margin-top:10px">With subtitles, you see what you said and read his reply in the notch. Without subtitles, you only hear him: the notch stays small, with a dot while he listens and bars while he speaks. It changes straight away.</p>`)}
    ${m("s6", `${kicker("Character")}${seg([["braino", "Braino"], ["brainelle", "Brainelle"], ["webb", "Webb"], ["ferro", "Ferro"]], S.look.mascot || "braino", "mascot", "Character")}<div style="margin-top:14px">${row("Size", "", `<input type="range" min="1" max="5" step=".1" value="${S.look.scale || 1}" data-range="scale" aria-label="Size" style="accent-color:#fff;width:150px">`)}</div>`)}
    ${m("s6", `${kicker("Where he stays")}${seg([["left", "Left"], ["top", "Top"], ["bottom", "Bottom"], ["right", "Right"], ["walk", "Walk"]], S.look.dock || "right", "dock", "Where he stays")}<p class="sub" style="margin-top:10px">Or drag him anywhere: he goes to the nearest spot.</p>`)}
    ${m("", `${kicker("Hide him")}${seg([["", "Shown"], ["hour", "For an hour"], ["hidden", "Until I call"], ["stealth", "Stealth"]], S.look.hide || "", "hide", "Hide him")}<p class="sub" style="margin-top:10px">He still hears you. Bring him back: "Braino, come back", ⌘⇧B, or click the notch.</p>`)}` },
  voice: { t: "Voice & listening", nav: ["Voice & listening", "mic"], need: ["wake"], r: () => `
    ${m("s6", `${kicker("Calling him")}<div class="rows">${row("Hey Braino", "Wake him by saying his name. Heard on this Mac only, nothing is sent until he wakes.", tg(Boolean(S.wake?.enabled), "wake", "Hey Braino"))}${row("Instant listening", "A ready connection, mic off until you call", tg(S.look.warmVoice !== false, "warmVoice", "Instant listening"))}${row("Clean hearing", "Mic rests while he talks; sounds that are not you are dropped", tg(S.look.cleanEar !== false, "cleanEar", "Clean hearing"))}${row("Pause music while I talk", "Calling him pauses what is playing; it comes back once he has understood you", tg(S.look.mediaHold === true, "mediaHold", "Pause music while I talk"))}${row("Shortcut", "", '<span class="kc"><kbd>⌃</kbd><kbd>⌃</kbd></span>')}</div>`)}
    ${m("s6", `${kicker("Talking")}<div class="rows">${row("Talk out loud", "Off: answers only in the notch", tg(S.look.talkOutLoud !== false, "talkOutLoud", "Talk out loud"))}${row("Talk me through it", "He says what he's doing while he works", tg(S.look.narrate !== false, "narrate", "Talk me through it"))}${row("Follow-ups", "No need to say Braino again", "<span class='val'>45s</span>")}</div>`)}` },
  commands: { t: "Commands & modes", nav: ["Commands & modes", "modes"], r: () => m("", `${kicker("Your voice commands and modes")}<p class="sub">Phrases that run a set of actions, and modes like Monday Mode. They live in the library for now.</p><div style="margin-top:10px">${btn("Open commands", "dashboardOpen")}</div>`) },
  skills: { t: "Skills he learned", l: "Jobs that worked, remembered under your words. Say them again and they run with no thinking. Nothing that can't be undone is ever learned.", nav: ["Skills he learned", "spark"], need: ["skills"], badge: () => S.skills.length || "", r: () => S.skills.length
    ? `<div class="tiles" style="grid-column:span 12">${S.skills.map((k) => `<div class="tile"><div class="t">${ic("spark", "coral")}<b>"${esc(k.phrase)}"</b></div><small>${esc(k.steps.join(" › "))} · used ${k.uses}×</small><div class="foot">${chip("Instant")}<button class="btn" type="button" data-forget="${esc(k.phrase)}">Forget</button></div></div>`).join("")}</div>`
    : m("", `<p class="sub">Nothing yet. When he plans a job that works, it shows up here.</p>`) },

  /* Teach Braino (2026-10-20): show him a job once, then just ask. */
  teach: { t: "Teach Braino", l: "Do a job once while he watches. He learns what it is for, what changes each time, and the steps. Next time, just ask.", nav: ["Teach Braino", "spark"], need: ["taught"], badge: () => (S.taught || []).length || "", r: () => {
    const live = S.teach?.teaching;
    const secs = live ? Math.max(0, Math.round((Date.now() - (S.teach.startedAt || Date.now())) / 1000)) : 0;
    const head = live
      ? m("s12", `${kicker("Watching")}<h2>Do it the way you normally would.</h2><p class="sub">${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} · he sees every app, page and button you click. Password fields are never read.</p><div style="margin-top:12px;display:flex;gap:8px">${btn("Done, learn it", "teachDone").replace('class="btn"', 'class="btn primary"')}${btn("Cancel", "teachCancel")}</div>`)
      : m("s12", `${kicker("New lesson")}<h2>Show him how.</h2><p class="sub">Say what the job is, press Start, then do it. This window steps aside while you work.</p><div style="margin-top:12px;display:flex;gap:8px;align-items:center"><input id="teach-said" placeholder="e.g. Buy a book on Amazon (optional)" style="flex:1;min-width:0;padding:9px 12px;border-radius:10px;border:1px solid var(--rim2, rgba(0,0,0,.14));background:transparent;color:inherit;font:inherit">${btn("Start", "teachStart").replace('class="btn"', 'class="btn primary"')}</div>`);
    const jobs = S.taught || [];
    const list = jobs.length
      ? `<div class="tiles" style="grid-column:span 12">${jobs.map((j) => `<div class="tile"><div class="t">${ic("spark", "coral")}<b>${esc(j.name)}</b></div><small>${esc(j.goal || "")}</small><small>${esc(j.steps.length)} steps${j.inputs?.length ? ` · asks for ${esc(j.inputs.map((i) => i.name.replace(/_/g, " ")).join(", "))}` : ""}${j.say ? ` · say "${esc(j.say)}"` : ""}</small><div class="foot"><button class="btn" type="button" data-teach-run="${esc(j.id)}">Run</button><button class="btn" type="button" data-teach-del="${esc(j.id)}">Forget</button></div></div>`).join("")}</div>`
      : m("s12", `<p class="sub">Nothing taught yet. Your first lesson shows up here.</p>`);
    return head + list;
  } },

  /* Connections */
  chrome: { t: "Chrome profiles", l: "Pick your main one and say what the others are for. A link with those words opens in that profile.", nav: ["Chrome profiles", "chrome"], need: ["profiles"], r: () => {
    const ps = S.profiles?.profiles || []; const cfg = S.profiles?.config || { primary: "", rules: [] };
    const used = (dir) => (cfg.rules || []).filter((r) => r.dir === dir).flatMap((r) => r.words).join(", ");
    return ps.length ? `<div class="tiles" style="grid-column:span 12">${ps.map((p) => `<div class="tile"><div class="t">${ic("chrome", cfg.primary === p.dir ? "green" : "gray")}<div><b>${esc(p.name)}</b><br><small>${esc(p.email || "not signed in")}</small></div></div><input data-usefor="${esc(p.dir)}" value="${esc(used(p.dir))}" placeholder="Used for: nexus, mesa…" aria-label="What ${esc(p.name)} is for" style="background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#fff;padding:6px 9px;font:12.5px var(--sans)"><div class="foot">${chip(cfg.primary === p.dir ? "★ Main" : p.lastUsed ? "Used last" : "Profile", cfg.primary === p.dir ? "ok" : "")}${cfg.primary === p.dir ? "" : `<button class="btn" type="button" data-primary="${esc(p.dir)}">Make main</button>`}</div></div>`).join("")}</div>` : m("", `<p class="sub">No Chrome profiles found on this Mac.</p>`);
  } },
  music: { t: "Music", nav: ["Music", "music"], r: () => `${m("s6", `${kicker("Spotify")}<p class="sub">Say "play Billie Jean". He uses the Spotify app.</p>`)}${m("s6", `${kicker("YouTube")}<p class="sub">Plays in Chrome.</p>`)}` },

  /* System */
  general: { t: "General", nav: ["General", "gear"], need: ["login"], r: () => `
    ${m("s8", `${kicker("Look")}<div class="looks"><button class="look" type="button" aria-pressed="true"><i></i>Paper</button><button class="look" type="button" aria-pressed="false" disabled title="Coming soon"><i></i>Dark · soon</button><button class="look" type="button" aria-pressed="false" disabled title="Coming soon"><i></i>Light · soon</button></div>`)}
    ${m("s4", `${kicker("Braino for Mac")}<div class="big">${esc(S.login?.version || "")}</div><p class="sub">This Mac</p>`)}
    ${m("s6", `${kicker("Start")}<div class="rows">${row("Open at login", "", tg(Boolean(S.login?.openAtLogin), "openAtLogin", "Open at login"))}${row("Quit Braino", "He stops listening until you open him again. Or press \u2318Q with this window in front.", btn("Quit", "quitBraino"))}</div>`)}
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
  companion: [["", ["chat", "home", "teach"]], ["Library", ["activity", "memory", "notes", "dictation"]], ["Your world", ["mesa", "whatsapp"]]],
  shared: [["Braino", ["appearance", "voice", "commands", "skills"]], ["Connections", ["chrome", "music"]], ["System", ["general", "permissions", "keys", "privacy", "setup"]]],
};

let product = "companion", cur = "chat";
/* Chat is two pages, like Claude (2026-10-18): Chats, every conversation as a
   calm list, and one conversation open, with Back to the list. The sidebar
   never unfolds a list under Chat any more; that dropdown could not be closed. */
S.chatView = "list";
const ago = (at) => {
  const d = new Date(at), now = new Date(), mins = Math.round((now - d) / 60000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
};
function chatsPage() {
  const list = window.BrainoChat?.list?.() || [];
  const q = S.chatsQ || "";
  const shown = q ? list.filter((c) => String(c.title).toLowerCase().includes(q)) : list;
  const head = `<div class="chats-head"><label class="act-find chats-find"><input id="chats-q" placeholder="Search your chats" value="${esc(q)}" aria-label="Search your chats"></label><button type="button" class="btn primary" data-chat="new">New chat</button></div>`;
  const rows = shown.map((c) => `<button type="button" class="chats-row" data-chat="${esc(c.id)}"><span class="chats-t">${esc(c.title || "New chat")}</span><time>${esc(ago(c.at))}</time></button>`).join("");
  const empty = `<div class="chats-empty"><p>${list.length ? "No chat matches that." : "No chats yet. Start one and it shows up here."}</p></div>`;
  return `<section class="chats">${head}${list.length ? `<div class="k chats-k">${list.length} ${list.length === 1 ? "chat" : "chats"}</div>` : ""}${shown.length ? `<div class="chats-list">${rows}</div>` : empty}</section>`;
}
function chatThread() {
  const c = (window.BrainoChat?.list?.() || []).find((x) => x.current);
  return `<div class="chat-top"><button type="button" class="chat-back" data-chat="list" aria-label="Back to all chats"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>Chats</button><span class="chat-top-t" id="chat-top-t">${esc(c?.title || "New chat")}</span><button type="button" class="chat-top-new" data-chat="new" aria-label="New chat" title="New chat"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div>${window.BrainoChat?.html() || ""}`;
}
function openChatView(id) {
  const B = window.BrainoChat; if (!B) return;
  if (id === "list") { S.chatView = "list"; if (cur !== "chat") void go("chat"); else paint(); return; }
  const ok = id === "new" ? B.newChat() : B.open(id);
  if (ok === false) { toast("He's still answering. One moment."); return; }
  S.chatView = "thread";
  if (cur !== "chat") void go("chat"); else paint();
}
window.addEventListener("braino-chats-changed", () => {
  if (cur !== "chat") return;
  if (S.chatView === "list") { paint(); return; }
  const c = (window.BrainoChat?.list?.() || []).find((x) => x.current);
  const t = $("chat-top-t"); if (t) t.textContent = c?.title || "New chat";
});
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
  /* Inside a note you are in that note: its title, editable in place, replaces the page name. */
  if (cur === "notes" && S.noteOpen) {
    const x = S.noteOpen.item;
    $("title").innerHTML = `<button class="back" type="button" data-act="noteBack" aria-label="All notes">‹</button><input id="note-title" class="title-edit" value="${esc(x.title)}" aria-label="Title" spellcheck="false" title="Click to rename">`;
    $("lede").textContent = [{ meeting: "Meeting", lecture: "Lecture" }[x.kind] || "Note", x.at ? new Date(x.at).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""].filter(Boolean).join(" · ");
  }
  const chatList = cur === "chat" && S.chatView !== "thread";
  if (chatList) { $("title").textContent = "Chats"; $("lede").textContent = "Every conversation you've had with Braino. Open one to pick it up again."; }
  document.querySelector(".bar").style.display = p.t || chatList ? "flex" : "none";
  document.querySelector(".main").classList.toggle("bare", !p.t && !chatList);
  document.querySelector(".main").classList.toggle("chatting", cur === "chat" && !chatList);
  const body = $("body"); body.innerHTML = p.r();
  if (cur === "chat" && !chatList) window.BrainoChat?.mount();
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
    if (k === "memoryOn" || k === "recallOn" || k === "improveBraino") { await call("setupSave", { [k]: on }); toast(on ? "On." : "Off."); }
    else if (k === "wake") { S.wake = await call("namedMode", { enabled: on }); toast(on ? "Say \u201cHey Braino\u201d any time." : "He won't wake on his name now."); }
    else if (k === "openAtLogin") { await call("loginItem", on); toast(on ? "He'll open when you log in." : "He won't open at login."); }
    else if (k === "warmVoice" || k === "mediaHold" || k === "talkOutLoud" || k === "cleanEar" || k === "narrate") { overlay({ [k]: on }); toast(on ? "On." : "Off."); }
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
    if (key === "nkind") { S.nf.kind = v; paint(); }
    if (key === "nsort") { S.nf.sort = v; paint(); }
    if (key === "nrange") { S.nf.range = v; paint(); }
    if (key === "nview" && S.noteOpen) { S.noteOpen.view = v; paint(); }
    if (key === "engine") { const r = await call("speechEngine", v); S.speechEngine = r?.engine || v; toast(v === "sarvam" ? (S.hasSarvamKey ? "Listening with Sarvam." : "Add SARVAM_API_KEY to .env.local first.") : "Listening on this Mac."); paint(); }
    if (key === "notch") { S.notchStyle = v; await call("notchStyle", v); toast(v === "affective" ? "Subtitles off. You'll just hear him." : "Subtitles on."); }
    return;
  }
  const act = t.closest("[data-act]")?.dataset.act;
  if (act) {
    if (act === "setupOpen") await call("setupOpen");
    if (act === "memoryOpen") await call("memoryOpen");
    if (act === "dashboardOpen") await call("dashboardOpen");
    if (act === "noteBack") { S.noteOpen = null; paint(); }
    if (act === "notesFolder") await call("notesReveal", "root");
    if (act === "noteReveal" && S.noteOpen?.item?.file) await call("notesReveal", S.noteOpen.item.file);
    if (act === "noteSavePdf" && S.noteOpen?.notes) {
      toast("Saving as PDF…");
      const o = S.noteOpen;
      const r = await call("notesSavePdf", { kind: o.item.kind === "lecture" ? "lecture" : "meeting", title: o.item.title, markdown: `${o.notes}`, date: o.item.at });
      if (r?.ok) { toast("Saved in Documents › Braino."); await load("notes"); } else toast("Couldn't save that just now.");
    }
    if (act === "noteWriteUp" && S.noteOpen?.transcript && !S.noteOpen.writing) {
      const o = S.noteOpen; o.writing = true; paint(); toast("Writing it up. About a minute.");
      const r = await call("notesWriteUp", { kind: o.item.kind, transcript: o.transcript, date: o.item.at, source: o.item.source });
      o.writing = false;
      if (r?.ok) { await load("notes"); const x = (S.notesLib?.items || []).find((i) => i.file === r.file); if (x) await openNote(x); else paint(); toast("Done. Saved as a PDF too."); }
      else { paint(); toast("Couldn't write it up just now."); }
    }
    if (act === "mesaSync") { toast("Syncing Nexus…"); await call("mesaSync"); await load("mesa"); paint(); toast("Synced."); }
    if (act === "mesaConnect") { await call("mesaConnect"); await load("mesa"); paint(); }
    if (act === "contactsSync") { toast("Reading your contacts…"); S.contacts = await call("contactsSync"); paint(); }
    if (act === "deleteToday") { await call("activityDeleteDay", new Date().toISOString().slice(0, 10)); toast("Today's memory is deleted."); }
    if (act === "pauseMemory") { await call("activityPause", true); toast("Memory paused. Say \"resume memory\" to start again."); }
    if (act === "quitBraino") { await call("quitBraino"); return; }
    if (act === "teachStart") {
      const said = $("teach-said")?.value.trim() || "";
      const r = await call("teachStart", said);
      if (r?.ok === false) { toast(r.say || "Could not start."); return; }
      S.teach = { teaching: true, startedAt: Date.now() }; paint(); return;
    }
    if (act === "teachDone" || act === "teachCancel") {
      toast(act === "teachDone" ? "Learning how you did it…" : "Cancelled.");
      const r = await call("teachStop", { cancel: act === "teachCancel" });
      await load("taught"); paint(); if (r?.say) toast(r.say); return;
    }
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
  const nt = t.closest("[data-note]")?.dataset.note;
  if (nt != null) { const x = S.notesLib?.items?.[Number(nt)]; if (x) await openNote(x); return; }
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
  const teachRun = t.closest("[data-teach-run]")?.dataset.teachRun; if (teachRun) { toast("On it."); await call("taughtRun", teachRun); return; }
  const teachDel = t.closest("[data-teach-del]")?.dataset.teachDel; if (teachDel) { await call("taughtDelete", teachDel); await load("taught"); paint(); toast("Forgotten."); return; }
  const forget = t.closest("[data-forget]")?.dataset.forget; if (forget) { await call("skillsForget", forget); await load("skills"); paint(); toast("Forgotten."); return; }
  const unstar = t.closest("[data-unstar]")?.dataset.unstar; if (unstar) { S.important = (await call("waImportant", unstar, false))?.names || S.important.filter((n) => n !== unstar); paint(); return; }
  const ch = t.closest("[data-chat]");
  if (ch) { openChatView(ch.dataset.chat); return; }
  if (t.closest("#side-toggle")) { setSide(!sideOpen); return; }
  const g = t.closest("[data-go]"); if (g) { if (g.dataset.go === "chat") S.chatView = "list"; void go(g.dataset.go); }
});
/* The sidebar folds away, like Claude's (2026-10-18). Remembered on this Mac. */
let sideOpen = true;
try { sideOpen = localStorage.getItem("braino-app-side") !== "0"; } catch (_) {}
function setSide(open, quiet) {
  sideOpen = open;
  $("win").classList.toggle("side-closed", !open);
  const b = $("side-toggle"); b.setAttribute("aria-expanded", String(open));
  b.setAttribute("aria-label", open ? "Hide sidebar" : "Show sidebar"); b.title = `${open ? "Hide" : "Show"} sidebar (\u2318\\)`;
  $("side").inert = !open;
  if (!quiet) { try { localStorage.setItem("braino-app-side", open ? "1" : "0"); } catch (_) {} }
}
setSide(sideOpen, true);
document.addEventListener("keydown", (e) => { if (e.metaKey && e.key === "\\") { e.preventDefault(); setSide(!sideOpen); } });
document.addEventListener("change", async (e) => {
  const dir = e.target?.dataset?.usefor;
  if (dir && S.profiles) {
    const words = String(e.target.value || "").split(/\s*(?:,|\band\b)\s*/).map((w) => w.trim().toLowerCase()).filter(Boolean);
    const rules = (S.profiles.config.rules || []).filter((r) => r.dir !== dir); if (words.length) rules.push({ dir, words });
    const r = await call("chromeProfilesSave", { ...S.profiles.config, rules }); if (r?.config) S.profiles.config = r.config; toast("Saved.");
  }
  if (e.target?.id === "nf-from" || e.target?.id === "nf-to") { S.nf[e.target.id === "nf-from" ? "from" : "to"] = e.target.value; paint(); return; }
  if (e.target?.dataset?.range === "scale") overlay({ scale: Number(e.target.value) });
});
document.addEventListener("keydown", async (e) => {
  if (e.target.id === "note-title" && (e.key === "Enter" || e.key === "Escape")) { if (e.key === "Escape") e.target.value = S.noteOpen?.item?.title || ""; e.target.blur(); return; }
  if (e.key === "Enter" && e.target.id === "note-ask" && e.target.value.trim()) { const q = e.target.value.trim(); e.target.value = ""; await askNote(q); return; }
  if (e.key === "Enter" && e.target.id === "mem-new") { document.querySelector('[data-act="memAdd"]')?.click(); return; }
  if (e.key === "Enter" && e.target.id === "ask" && e.target.value.trim()) { const text = e.target.value.trim(); e.target.value = ""; toast("On it."); await call("delegate", text, { canTalk: false, reason: "app_ask" }); return; }
  if (e.key === "Enter") { const g = e.target.closest?.("[data-go]"); if (g) void go(g.dataset.go); }
});
$("q").addEventListener("input", renderNav);
document.addEventListener("input", (e) => {
  const id = e.target?.id;
  if (id !== "act-q" && id !== "mem-q" && id !== "people-q" && id !== "nf-q" && id !== "chats-q") return;
  const v = e.target.value.trim().toLowerCase();
  if (id === "chats-q") S.chatsQ = v; else if (id === "act-q") S.actQ = v; else if (id === "people-q") S.peopleQ = v; else if (id === "nf-q") S.nf.q = v; else S.memQ = v;
  const pos = e.target.selectionStart; paint();
  const again = $(id); if (again) { again.focus(); again.setSelectionRange(pos, pos); }
});
api.onAppGo?.((page) => {
  /* "note:<file>": a recording just finished; open its note, not just the list. */
  if (typeof page === "string" && page.startsWith("note:")) {
    const file = page.slice(5);
    void go("notes").then(async () => {
      if (!S.notesLib) await load("notes");
      const x = S.notesLib?.items?.find((i) => i.file === file);
      if (x) { await openNote(x); paint(); }
    });
    return;
  }
  if (P[page]) void go(page);
});

document.addEventListener("focusout", async (e) => {
  if (e.target?.id !== "note-title" || !S.noteOpen) return;
  const x = S.noteOpen.item; const title = e.target.value.trim();
  if (!title || title === x.title) { e.target.value = x.title; return; }
  const r = await call("notesRename", x.file ? { file: x.file, title } : { table: x.table, id: x.id, title });
  if (r?.ok) { x.title = title; if (r.file) x.file = r.file; toast("Renamed."); }
  else { e.target.value = x.title; toast(r?.error === "signed_out" ? "Sign in to rename synced notes." : "Couldn't rename that just now."); }
});
api.onTeach?.(() => { void load("taught").then(() => { if (cur === "teach") paint(); }); });
api.onTaughtChanged?.(() => { void load("taught").then(() => { if (cur === "teach") paint(); }); });
api.onNotesChanged?.(() => { if (cur === "notes") void load("notes").then(() => { if (!S.noteOpen) paint(); }); });

(async () => {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem("braino-app") || "{}"); } catch (_) {}
  product = "companion"; $("win").dataset.product = product;   // Foundry comes later (removed 2026-10-15)
  document.querySelectorAll(".switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.product === product)));
  await load("auth");
  $("me-name").textContent = S.auth?.displayName || "Braino"; $("me-plan").textContent = S.auth?.email || "Account"; $("me-av").textContent = (first() || "·").charAt(0);
  // Home is the front door once he's set up; before that, chat.
  await load("snap");
  void go(S.snap?.answers?.completedAt && product === "companion" ? "home" : "chat");
  void load("skills").then(renderNav); renderNav(); void load("profiles");
})();
