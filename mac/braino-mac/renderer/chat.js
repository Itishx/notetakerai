/* Braino Chat: the first page of the Braino app. Type to him and he talks back
   or does it, with the same brain and the same hands as voice, silently, so it
   works in class. Talk goes to his conversation brain; anything he should DO
   goes down the delegate pipe voice uses, with the same checks ("Go ahead?"
   is answered by typing yes). While he works, the thinking trail draws inside
   his reply: each step, a tick or a cross, and what he thought, folded away
   once it is done. Replies read in Newsreader, like a letter, not a log.
   House rule: no dashes of any kind in anything Braino says. */
(() => {
  const api = window.brainoMac || {};
  const call = async (name, ...args) => { try { return typeof api[name] === "function" ? await api[name](...args) : null; } catch (_) { return null; } };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "braino-chat";
  const SOUND = "braino-chat-sound";

  /* Many chats, like Claude and ChatGPT (2026-10-15): each one kept with a
     title from its first message; the app's sidebar lists the recent ones
     nested under Chat. The single old chat becomes the first of them. */
  const ALL = "braino-chats", CUR = "braino-chat-cur";
  let chats = [];
  try { chats = JSON.parse(localStorage.getItem(ALL) || "[]"); } catch (_) {}
  if (!Array.isArray(chats)) chats = [];
  if (!chats.length) {
    let old = [];
    try { old = JSON.parse(localStorage.getItem(KEY) || "[]").filter((m) => !m.pending).slice(-80); } catch (_) {}
    if (old.length) chats.push({ id: `c${Date.now()}`, title: "", at: old[old.length - 1]?.at || Date.now(), msgs: old });
  }
  let curId = "";
  try { curId = localStorage.getItem(CUR) || ""; } catch (_) {}
  let current = chats.find((c) => c.id === curId) || chats[0] || null;
  let msgs = current ? current.msgs : [];
  const titleOf = (list) => { const first = list.find((m) => m.role === "you"); return first ? String(first.text).replace(/\s+/g, " ").trim().slice(0, 42) : "New chat"; };
  const announce = () => window.dispatchEvent(new CustomEvent("braino-chats-changed"));
  let sound = false;
  try { sound = localStorage.getItem(SOUND) === "1"; } catch (_) {}
  let busy = null;          // the reply being written right now
  let lastSent = "";
  let root = null;
  let audio = null;

  /* ── Braino himself, in the chat ─────────────────────────────────────────
     The real walker, not a dot. Big on the empty page; sitting on the box
     once you talk. One copy at a time, driven by his mood: idle (breathe,
     blink, glance at what you wrote), think (quicker bob, eyes up), talk
     (mouth moving while his words write in), happy (a hop), sad (a droop). */
  let mood = "idle", moodUntil = 0, mascotHost = null, waveUntil = 0;
  const setMood = (m, ms = 0) => { mood = m; moodUntil = ms ? Date.now() + ms : 0; };
  function mountMascot(host) {
    if (!host) return;
    let svg = "";
    try { svg = api.getWalkerSvgFor?.("braino") || api.getWalkerSvg?.() || ""; } catch (_) {}
    host.innerHTML = svg;
    mascotHost = host;
  }
  const t0 = performance.now();
  function rig(now) {
    requestAnimationFrame(rig);
    const host = mascotHost;
    if (!host || !host.isConnected) return;
    const r = host.querySelector("#__sbwk_root__");
    if (!r) return;
    const q = (sel) => r.querySelector(sel);
    if (moodUntil && Date.now() > moodUntil) { mood = "idle"; moodUntil = 0; }
    const t = (now - t0) / 1000;
    const think = mood === "think", talk = mood === "talk", happy = mood === "happy", sad = mood === "sad";
    let y = Math.sin(t * (think ? 4.2 : 1.7)) * (think ? 1.6 : 0.8);
    let rot = think ? Math.sin(t * 2.1) * 4 : sad ? -7 : 0;
    if (happy) { const k = ((moodUntil - Date.now()) / 700); y -= Math.max(0, Math.sin((1 - k) * Math.PI * 2)) * 9; }
    const breath = 1 + 0.016 * Math.sin(t * 1.7);
    r.setAttribute("transform", `rotate(${rot} 50 50) translate(0 ${y}) scale(${breath})`);
    const waving = Date.now() < waveUntil;
    const ra = waving ? `rotate(${-28 + Math.sin(t * 11) * 16} 78 53)` : happy ? "rotate(-110 78 53)" : "";
    const la = happy ? "rotate(110 22 53)" : "";
    q("#__sbwk_ra__")?.setAttribute("transform", ra); q("#__sbwk_ra_bg__")?.setAttribute("transform", ra);
    q("#__sbwk_la__")?.setAttribute("transform", la); q("#__sbwk_la_bg__")?.setAttribute("transform", la);
    const bp = t % 3.6, blink = bp < 0.13 ? Math.sin((bp / 0.13) * Math.PI) : 0;
    const es = Math.max(0.06, (think ? 0.72 : sad ? 0.6 : 1) - blink);
    q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(38,48) scale(1,${es}) translate(-38,-48)`);
    q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(62,48) scale(1,${es}) translate(-62,-48)`);
    const gx = think ? 1.2 : 1.8 + Math.sin(t * 0.5) * 0.8, gy = think ? -2.4 : sad ? 1.6 : -1;
    q("#__sbwk_pupil_l__")?.setAttribute("transform", `translate(${gx} ${gy})`);
    q("#__sbwk_pupil_r__")?.setAttribute("transform", `translate(${gx} ${gy})`);
    const smile = q("#__sbwk_smile__"), mouth = q("#__sbwk_talk__"), outer = q("#__sbwk_te__"), inner = q("#__sbwk_ti__");
    if (talk) {
      const open = Math.max(0, Math.min(1, (0.5 + 0.5 * Math.sin(t * 13.5)) * (0.55 + 0.45 * Math.sin(t * 7.7 + 1.3))));
      if (smile) smile.style.display = "none";
      if (mouth) mouth.style.display = "block";
      outer?.setAttribute("ry", String(1.4 + open * 4.2)); outer?.setAttribute("rx", String(4 - open * 0.5));
      if (inner) inner.style.display = open > 0.3 ? "block" : "none";
    } else {
      if (smile) smile.style.display = "";
      if (mouth) mouth.style.display = "none";
    }
  }
  requestAnimationFrame(rig);

  const save = () => {
    const kept = msgs.filter((m) => !m.pending).slice(-80);
    if (kept.length) {
      if (!current) { current = { id: `c${Date.now()}`, title: "", at: Date.now(), msgs }; chats.unshift(current); }
      current.msgs = msgs; current.title = titleOf(kept); current.at = Date.now();
    }
    chats = chats.filter((c) => c.msgs && c.msgs.some((m) => !m.pending)).sort((a, b) => b.at - a.at).slice(0, 40);
    try {
      localStorage.setItem(ALL, JSON.stringify(chats.map((c) => ({ ...c, msgs: c.msgs.filter((m) => !m.pending).slice(-80) }))));
      localStorage.setItem(CUR, current?.id || "");
    } catch (_) {}
    announce();
  };
  function openChat(id) {
    if (busy) return false;
    const c = chats.find((x) => x.id === id);
    current = c || null; msgs = c ? c.msgs : [];
    try { localStorage.setItem(CUR, current?.id || ""); } catch (_) {}
    const page = document.querySelector(".chat");
    if (page) { page.outerHTML = html(); mount(); }
    announce();
    return true;
  }
  function newChat() { if (busy) return false; current = null; msgs = []; try { localStorage.setItem(CUR, ""); } catch (_) {} const page = document.querySelector(".chat"); if (page) { page.outerHTML = html(); mount(); } announce(); return true; }
  const hello = () => { const h = new Date().getHours(); return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
  const SUGGEST = [
    ["What's my next class?", "Your day"],
    ["Open YouTube", "Instant"],
    ["Find me five cheapest flights to Mumbai for next Friday", "He works it out"],
    ["Send this page to Param on WhatsApp", "Asks before anything odd"],
  ];

  function paras(text, reveal = false) {
    let w = 0;
    return String(text || "").trim().split(/\n{2,}/).map((p) => {
      if (!reveal) return `<p>${esc(p).replace(/\n/g, "<br>")}</p>`;
      // Each word fades up in turn, as if he is writing it; capped so a long
      // answer is readable in about a second and a half.
      return `<p>${p.split(/(\s+)/).map((part) => /^\s+$/.test(part) ? (part.includes("\n") ? "<br>" : " ") : `<span class="rw" style="animation-delay:${Math.min(1500, (w++) * 22)}ms">${esc(part)}</span>`).join("")}</p>`;
    }).join("");
  }
  const revealMs = (text) => Math.min(1500, String(text || "").split(/\s+/).length * 22) + 350;
  function secs(ms) { return `${Math.max(0.1, (ms || 0) / 1000).toFixed(1)}s`; }

  function workHtml(m) {
    const w = m.work;
    if (!w || !w.steps.length) return m.pending ? `<div class="cw-think"><span class="cw-shimmer">${esc(w?.thought ? "Thinking" : m.lane === "talk" ? "Thinking" : "Working on it")}</span></div>` : "";
    const rows = w.steps.map((s) => `<li class="cw-step ${s.state}"><span class="cw-dot"></span><div><div class="cw-label">${esc(s.label)}</div>${s.thought ? `<details class="cw-thought"><summary>Thought for ${secs(s.ms)}</summary><p>${esc(s.thought)}</p></details>` : ""}</div></li>`).join("");
    const n = `${w.steps.length} step${w.steps.length === 1 ? "" : "s"}`;
    if (m.pending) return `<div class="cw-work live"><ol>${rows}</ol></div>`;
    const took = w.endedAt && w.startedAt ? `${Math.max(1, Math.round((w.endedAt - w.startedAt) / 1000))}s` : "";
    return `<details class="cw-work done"><summary>${w.asked ? "Waiting on you" : w.ok === false ? "Stopped" : "Done"}${took ? ` in ${took}` : ""} · ${n}</summary><ol>${rows}</ol></details>`;
  }
  function msgHtml(m, i) {
    if (m.role === "you") return `<div class="cm you" data-i="${i}"><div class="cm-b">${paras(m.text)}</div></div>`;
    return `<div class="cm him${m.pending ? " pending" : ""}${m.ok === false ? " bad" : ""}" data-i="${i}"><div class="cm-t">${workHtml(m)}${m.text ? `<div class="cm-text">${paras(m.text, Boolean(m.fresh))}</div>` : ""}${uiHtml(m)}${approvalHtml(m)}</div></div>`;
  }
  /* Intelligent answers (2026-10-15): what a tool returned, drawn as a card
     under his words. A choice is tappable and answers him. */
  function uiHtml(m) {
    const u = m.ui;
    if (!u || m.pending) return "";
    const time = (iso) => { const d = new Date(iso); return Number.isFinite(d.getTime()) ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""; };
    if (u.type === "day" && u.events?.length) {
      return `<div class="ui-card ui-day"><div class="ui-k">Your calendar</div>${u.events.map((e) => `<div class="ui-ev"><span class="ui-time">${esc(e.allDay ? "All day" : time(e.start))}</span><span class="ui-ev-t"><b>${esc(e.title || "Event")}</b>${e.calendar || e.location ? `<small>${esc([e.calendar, e.location].filter(Boolean).join(" · "))}</small>` : ""}</span></div>`).join("")}</div>`;
    }
    if (u.type === "connections" && u.items?.length) {
      return `<div class="ui-card ui-conn"><div class="ui-k">Connections</div>${u.items.map((c) => `<div class="ui-row"><span class="ui-dot ${c.connected ? "on" : "off"}"></span><span class="ui-name">${esc(c.name)}</span><span class="ui-as">${esc(c.connected ? (c.as || "Connected") : "Not connected")}</span>${c.connected === false ? `<button type="button" class="ui-btn" data-say="Connect ${esc(c.name)}">Connect</button>` : ""}</div>`).join("")}</div>`;
    }
    if (u.type === "choices" && u.options?.length) {
      return `<div class="ui-choices">${u.options.map((o) => `<button type="button" class="ui-chip" data-say="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
    }
    if (u.type === "sources" && u.sources?.length) {
      return `<div class="ui-card ui-src"><div class="ui-k">Sources</div>${u.sources.map((x) => { const url = typeof x === "string" ? x : (x.url || ""); let host = ""; try { host = new URL(url).hostname.replace(/^www\./, ""); } catch (_) {} return `<div class="ui-row"><span class="ui-name">${esc((typeof x === "object" && x.title) || host || url)}</span><span class="ui-as">${esc(host)}</span></div>`; }).join("")}</div>`;
    }
    return "";
  }
  /* The approval card: exactly what is about to happen, Approve or Cancel.
     Answered, cancelled or timed out, it stays as a quiet line of record. */
  function approvalHtml(m) {
    const a = m.approval;
    if (!a) return "";
    if (a.state) return `<div class="ca-done ${a.state}">${a.state === "yes" ? (a.kind === "keep_going" ? "You said keep going" : "You approved") : a.state === "no" ? (a.kind === "keep_going" ? "You stopped it" : "You cancelled") : "Timed out, nothing was done"}</div>`;
    return `<div class="ca-card ${a.kind === "keep_going" ? "keep" : ""}"><div class="ca-head"><span class="ca-orb"></span>${esc(a.title || "Before I do this")}</div><div class="ca-detail">${esc(a.detail || "")}</div><div class="ca-row"><button type="button" class="ca-no" data-approve="no">${esc(a.no || "Cancel")}</button><button type="button" class="ca-yes" data-approve="yes">${esc(a.yes || "Approve")}</button></div></div>`;
  }

  function html() {
    const empty = !msgs.length;
    const name = window.__brainoFirstName?.() || "";
    return `<div class="chat${empty ? " empty" : ""}">
      <div class="chat-scroll" id="chat-scroll"><div class="chat-col" id="chat-col">
        ${empty ? `<div class="chat-hello"><div class="chat-mascot big" id="chat-mascot" aria-hidden="true"></div><h1>${hello()}${name ? `, <em>${esc(name)}</em>` : ""}.</h1><p>Type to me. I'll answer, or just do it.</p></div>
          <div class="chat-suggest">${SUGGEST.map(([t, k]) => `<button type="button" class="chat-sg" data-say="${esc(t)}"><b>${esc(t)}</b><span>${esc(k)}</span></button>`).join("")}</div>`
        : msgs.map(msgHtml).join("")}
      </div></div>
      <form class="chat-box" id="chat-box" autocomplete="off">
        ${empty ? "" : `<div class="chat-mascot perch" id="chat-mascot" aria-hidden="true"></div>`}
        <textarea id="chat-in" rows="1" placeholder="Ask Braino anything, or tell him what to do" aria-label="Message Braino" spellcheck="true"></textarea>
        <div class="chat-tools">
          <button type="button" class="chat-sound" id="chat-sound" aria-pressed="${sound}">${sound ? "Sound on" : "Silent"}</button>
          <button type="button" class="chat-clear" id="chat-clear">New chat</button>
          <span class="chat-hint">Enter to send · Shift Enter for a new line</span>
          <button type="submit" class="chat-send" id="chat-send" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg></button>
        </div>
      </form>
    </div>`;
  }

  function repaintMessages() {
    if (!root || !document.body.contains(root)) return;
    const col = root.querySelector("#chat-col");
    const scroller = root.querySelector("#chat-scroll");
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
    root.classList.toggle("empty", !msgs.length);
    col.innerHTML = msgs.map(msgHtml).join("");
    if (nearBottom) scroller.scrollTop = scroller.scrollHeight;
  }
  function repaintOne(m) {
    if (!root || !document.body.contains(root)) return;
    const i = msgs.indexOf(m);
    const el = root.querySelector(`.cm[data-i="${i}"]`);
    if (!el) return repaintMessages();
    const open = [...el.querySelectorAll("details[open]")].map((d) => d.className);
    el.outerHTML = msgHtml(m, i);
    const fresh = root.querySelector(`.cm[data-i="${i}"]`);
    open.forEach((c) => fresh?.querySelector(`details.${c.split(" ").join(".")}`)?.setAttribute("open", ""));
    const scroller = root.querySelector("#chat-scroll");
    if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 200) scroller.scrollTop = scroller.scrollHeight;
  }

  function fit(ta) { ta.style.height = "auto"; ta.style.height = `${Math.min(180, ta.scrollHeight)}px`; }

  async function speak(text) {
    if (!sound || !text) return;
    const r = await call("tts", text);
    if (!r?.ok || !r.dataUrl) return;
    try { audio?.pause(); } catch (_) {}
    audio = new Audio(r.dataUrl);
    audio.play().catch(() => {});
  }

  /* Talk or do: the same split voice makes. A question he just asked is always
     answered on the do side, where it is waiting. */
  async function lane(text) {
    const last = [...msgs].reverse().find((m) => m.role === "him" && !m.pending);
    if (last && last.lane === "do" && /\?\s*$/.test(String(last.text || "").trim())) return "do";
    const v = await call("wantsBrain", text);
    return v && v.brain === false ? "talk" : "do";
  }

  async function send(text, opts = {}) {
    const t = String(text || "").trim();
    if (!t || busy) return;
    lastSent = t;
    const wasEmpty = !msgs.length;
    msgs.push({ role: "you", text: opts.display || t, at: Date.now() });
    const reply = { role: "him", text: "", pending: true, at: Date.now(), work: null, lane: "" };
    msgs.push(reply);
    busy = reply;
    setMood("think");
    // The first message moves him from the middle of the page onto the box.
    if (wasEmpty) { const page = document.querySelector(".chat"); if (page) { page.outerHTML = html(); mount(); } }
    else repaintMessages();
    const box = root?.querySelector("#chat-in");
    if (box) { box.value = ""; fit(box); }
    try {
      reply.lane = await lane(t);
      repaintOne(reply);
      const r = reply.lane === "talk"
        ? await call("converse", t)
        : await call("delegate", t, { canTalk: false, reason: "app_chat" });
      reply.text = String(r?.fullSay || r?.say || "").trim() || (r?.superseded ? "Stopped, you asked for something else." : r?.ok === false ? "That didn't work." : "Done.");
      reply.ok = r?.ok !== false;
      if (r?.ui) reply.ui = r.ui;
    } catch (_) {
      reply.text = "Something went wrong on my side. Try that again?";
      reply.ok = false;
    }
    reply.pending = false;
    if (reply.work) { reply.work.endedAt = reply.work.endedAt || Date.now(); reply.work.steps.forEach((s) => { if (s.state === "run") s.state = reply.ok ? "ok" : "bad"; }); }
    busy = null;
    reply.fresh = true;
    save();
    repaintOne(reply);
    delete reply.fresh;
    // He says it as it writes in, then reacts to how it went.
    setMood("talk", revealMs(reply.text));
    setTimeout(() => { if (!busy) setMood(reply.ok ? (reply.lane === "do" ? "happy" : "idle") : "sad", reply.ok ? 700 : 1400); }, revealMs(reply.text));
    void speak(reply.text);
    root?.querySelector("#chat-in")?.focus();
  }

  /* Approval cards for what was typed here (voice ones go to the notch). */
  let approvalMsg = null;
  api.onApproval?.((p) => {
    if (p.cleared) {
      if (approvalMsg?.approval && !approvalMsg.approval.state) { approvalMsg.approval.state = "gone"; save(); repaintOne(approvalMsg); }
      approvalMsg = null;
      return;
    }
    if (p.surface !== "chat") return;
    const m = busy || [...msgs].reverse().find((x) => x.role === "him");
    if (!m) return;
    m.approval = { kind: p.kind, title: p.title, detail: p.detail, yes: p.yes, no: p.no, expiresAt: p.expiresAt };
    approvalMsg = m;
    repaintOne(m);
  });

  /* The thinking trail, drawn inside the reply that is being written. */
  api.onTaskTrail?.((p) => {
    const m = busy;
    if (!m || !p?.kind) return;
    if (p.kind === "start") { if (!m.work || !p.resumed) m.work = m.work || { steps: [], startedAt: Date.now() }; m.work.thought = null; }
    if (!m.work) return;
    if (p.kind === "thought") m.work.thought = { text: p.text, ms: p.ms };
    if (p.kind === "step") {
      m.work.steps.push({ label: p.label || "Working", state: "run", thought: m.work.thought?.text || "", ms: m.work.thought?.ms || 0 });
      m.work.thought = null;
      if (m.work.steps.length > 12) m.work.steps = m.work.steps.slice(-12);
    }
    if (p.kind === "result") { const s = m.work.steps[m.work.steps.length - 1]; if (s) s.state = p.ok ? "ok" : "bad"; }
    if (p.kind === "end") { m.work.endedAt = Date.now(); m.work.ok = p.ok; m.work.asked = p.asked; }
    repaintOne(m);
  });

  function mount() {
    root = document.querySelector(".chat");
    if (!root) return;
    const box = root.querySelector("#chat-in");
    const scroller = root.querySelector("#chat-scroll");
    scroller.scrollTop = scroller.scrollHeight;
    mountMascot(root.querySelector("#chat-mascot"));
    if (!msgs.length) waveUntil = Date.now() + 1800;
    box.addEventListener("input", () => fit(box));
    box.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); void send(box.value); }
      if (e.key === "ArrowUp" && !box.value && lastSent) { e.preventDefault(); box.value = lastSent; fit(box); }
    });
    root.querySelector("#chat-box").addEventListener("submit", (e) => { e.preventDefault(); void send(box.value); });
    root.querySelector("#chat-sound").addEventListener("click", (e) => {
      sound = !sound;
      try { localStorage.setItem(SOUND, sound ? "1" : "0"); } catch (_) {}
      e.currentTarget.setAttribute("aria-pressed", String(sound));
      e.currentTarget.textContent = sound ? "Sound on" : "Silent";
      if (!sound) { try { audio?.pause(); } catch (_) {} }
    });
    root.querySelector("#chat-clear")?.addEventListener("click", () => {
      if (busy) return;
      newChat();
      setMood("idle");
    });
    root.addEventListener("click", (e) => {
      const sg = e.target.closest(".chat-sg, .ui-chip, .ui-btn");
      if (sg && !busy) void send(sg.dataset.say);
      const ap = e.target.closest("[data-approve]");
      if (ap && approvalMsg?.approval && !approvalMsg.approval.state && !busy) {
        const yes = ap.dataset.approve === "yes";
        const m = approvalMsg;
        m.approval.state = yes ? "yes" : "no";
        approvalMsg = null;
        save(); repaintOne(m);
        void send(yes ? "yes" : "cancel", { display: yes ? (m.approval.kind === "keep_going" ? "Keep going" : "Approve") : (m.approval.kind === "keep_going" ? "Stop" : "Cancel") });
      }
    });
    box.focus();
  }

  window.BrainoChat = {
    html, mount, open: openChat, newChat,
    list: () => chats.filter((c) => c.msgs?.length).map((c) => ({ id: c.id, title: c.title || titleOf(c.msgs), at: c.at, current: c === current })),
  };
})();
