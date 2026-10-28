"use strict";
const island = document.getElementById("island");
const note = document.getElementById("note");
const hint = document.getElementById("hint");
let hintTimer = 0;
/* The tiny second line under the pill after "Not my job.", for 3 s. */
function showHint(text) {
  clearTimeout(hintTimer);
  hint.textContent = String(text || "");
  hint.classList.toggle("on", Boolean(text));
  if (text) hintTimer = setTimeout(() => hint.classList.remove("on"), 3000);
}
const dots = [...island.querySelectorAll(".eye i")];
let level = 0, anim = 0, blinkTimer = 0;

/* The same wave in both eyes: dot i of one matches dot i of the other. */
function paint() {
  const t = performance.now() / 55;
  const per = Math.max(1, dots.length / 2);
  dots.forEach((d, k) => {
    const i = k % per;
    const wave = 0.5 + 0.5 * Math.sin(t + i * 1.2);
    d.style.setProperty("--d", (1 + level * 2.6 * wave).toFixed(2));
  });
}
/* The waveform: taller in the middle, moving with your voice, never flat. */
const bars = [...island.querySelectorAll(".wave b")];
const face = island.querySelector(".face");
function paintWave() {
  const t = performance.now() / 90;
  const n = bars.length, mid = (n - 1) / 2;
  bars.forEach((b, i) => {
    const centre = 1 - Math.abs(i - mid) / (mid + 1);
    const wobble = 0.55 + 0.45 * Math.sin(t + i * 0.9) * Math.cos(t * 0.7 - i * 0.5);
    const h = 3 + (2 + level * 15) * centre * wobble + level * 3;
    b.style.setProperty("--h", Math.max(3, Math.min(20, h)).toFixed(1) + "px");
  });
  face.style.setProperty("--lv", level.toFixed(3));
}
/* Edge light: a point with a fading tail travels round the capsule's outline. */
const edge = island.querySelector(".edge");
const ectx = edge.getContext("2d");
let edgeT = 0, doneAt = 0, warm = 1, tail = 26, fade = 1;
let tint = "warm"; // "warm" for Write (dictation), "blue" for Do (2026-10-27)
function paintEdge() {
  const W = 58, H = 30, r = H / 2, L = W - H, per = 2 * L + Math.PI * H, k = 2; // canvas is 2x the 100x60 box
  const done = island.classList.contains("done");
  if (done && !doneAt) doneAt = performance.now();
  if (!done) doneAt = 0;
  const since = doneAt ? performance.now() - doneAt : 0;
  // warm (listening) -> green (pasted), and the tail grows into a full ring, all eased
  warm += ((done ? 0 : 1) - warm) * 0.12;
  tail += ((done ? 90 : 26) - tail) * 0.1;
  fade = done ? Math.max(0, 1 - Math.max(0, since - 450) / 350) : 1;
  const thinking = island.classList.contains("thinking");
  edgeT += done ? 0.006 : thinking ? 0.0016 : 0.004 + level * 0.022;
  const cx = 50, cy = 30;
  const at = (d) => {
    d = ((d % per) + per) % per;
    if (d < L) return [cx - L / 2 + d, cy - r]; d -= L;
    if (d < Math.PI * r) { const a = -Math.PI / 2 + d / r; return [cx + L / 2 + Math.cos(a) * r, cy + Math.sin(a) * r]; } d -= Math.PI * r;
    if (d < L) return [cx + L / 2 - d, cy + r]; d -= L;
    const a = Math.PI / 2 + d / r; return [cx - L / 2 + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  ectx.setTransform(k, 0, 0, k, 0, 0);
  ectx.clearRect(0, 0, 100, 60);
  const mix = (a, b) => Math.round(b + (a - b) * warm); // warm peach (or Do's blue) -> green
  const blue = tint === "blue";
  const R = mix(blue ? 207 : 255, 120), G = mix(blue ? 227 : 236, 235), B = mix(blue ? 255 : 220, 160), gR = mix(blue ? 90 : 255, 70), gG = mix(blue ? 150 : 190, 220), gB = mix(blue ? 255 : 150, 120);
  ectx.shadowColor = `rgba(${gR},${gG},${gB},1)`; ectx.shadowBlur = 8;
  const head = (edgeT % 1) * per, n = Math.round(tail), bright = done ? 1 : thinking ? 0.45 : 0.6 + 0.4 * level;
  for (let i = 0; i < n; i++) {
    const [x, y] = at(head - i * (per / 90));
    ectx.fillStyle = `rgba(${R},${G},${B},${(1 - (i / n) * (done ? 0.35 : 1)) * bright * fade})`;
    ectx.beginPath(); ectx.arc(x, y, Math.max(0.5, 1.6 - (i / n) * 1.1), 0, Math.PI * 2); ectx.fill(); // never a negative radius (it threw and killed the loop)
  }
}
function loop() {
  // A drawing error must never stop the animation for good.
  try { paint(); paintWave(); paintEdge(); } catch (_) {}
  anim = ["listening", "done", "thinking"].some((c) => island.classList.contains(c)) ? requestAnimationFrame(loop) : 0;
}

/* Resting: a blink every few seconds, sometimes a double blink. */
function scheduleBlink() {
  clearTimeout(blinkTimer);
  blinkTimer = setTimeout(() => {
    if (island.classList.contains("idle")) {
      island.classList.add("blink");
      setTimeout(() => island.classList.remove("blink"), 120);
      if (Math.random() < 0.25) setTimeout(() => { island.classList.add("blink"); setTimeout(() => island.classList.remove("blink"), 110); }, 260);
    }
    scheduleBlink();
  }, 2600 + Math.random() * 3400);
}
scheduleBlink();

const FACES = ["idle", "listening", "done", "open", "thinking", "again", "nope", "curious", "wake"];
function setState(name, face) {
  island.classList.add("on");
  island.classList.remove(...FACES);
  island.classList.add(name);
  if (face) island.classList.add(face);
}
const startLoop = () => { if (!anim) anim = requestAnimationFrame(loop); };
let wakeTimer = 0;

function applyLook(look) {
  if (!look) return;
  const b = document.body;
  b.classList.toggle("l-bar", look.layout === "bar");
  for (const t of ["ink", "paper", "glass"]) b.classList.toggle("t-" + t, (look.theme || "ink") === t);
}
window.maven.onState((p) => {
  applyLook(p.look);
  const { state, note: text } = p || {};
  if (state === "ask") { note.classList.remove("on"); showHint(""); card.open(p.card || {}); return; }
  if (state === "think") { note.classList.remove("on"); showHint(""); card.open({ kind: "think", title: String(p.text || "Thinking…"), right: "" }); return; }
  if (state === "sent") { card.sent(String(p.text || "Sent.")); return; }
  // Any non-card state folds a thinking bar away first.
  if (state !== "ask" && state !== "sent" && state !== "think" && card.isOpen()) card.close();
  if (state === "reply" && p.note && p.face !== "done") {
    // Bar design: the pill stretches and the three words sit inside it.
    note.classList.remove("on");
    const face = { again: "again", nope: "nope", curious: "curious" }[p.face] || "";
    card.open({ kind: "pill", title: String(p.note), right: "", face });
    showHint(p.hint || "");
    return;
  }
  if (state === "note" || state === "reply") {
    // The 3-word reply beside the pill, with the face that goes with it.
    const face = { again: "again", nope: "nope", curious: "curious" }[p.face] || "";
    if (p.face === "done") { setState("done"); warm = 1; startLoop(); } else setState("idle", face);
    note.textContent = String(text || "");
    note.classList.add("on");
    showHint(p.hint || "");
    return;
  }
  note.classList.remove("on");
  if (state === "wake") {
    clearTimeout(wakeTimer);
    setState("wake");
    wakeTimer = setTimeout(() => { if (island.classList.contains("wake")) setState("idle"); }, 1150);
    return;
  }
  if (state === "listening") { tint = p.mode === "do" ? "blue" : "warm"; document.body.classList.toggle("do", tint === "blue"); setState("listening"); warm = 1; tail = 26; fade = 1; doneAt = 0; startLoop(); return; } // always starts warm (or blue), never green
  if (state === "thinking") { tint = "blue"; setState("thinking"); warm = 1; tail = 26; fade = 1; doneAt = 0; level = 0; startLoop(); return; }
  if (state === "done") { setState("done"); startLoop(); return; }
  // idle, hidden: the resting face (the listening state is gone the moment you press)
  setState("idle");
  level = 0;
  window.maven.hover(false);
});
window.maven.onAnchor(({ spot }) => {
  document.body.classList.remove("a-left", "a-centre", "a-right");
  document.body.classList.add(spot === "bottom-left" ? "a-left" : spot === "bottom-centre" ? "a-centre" : "a-right");
});
window.maven.onLevel(({ v }) => {
  const x = Math.max(0, Math.min(1, Number(v) || 0));
  level = level * 0.55 + x * 0.45;
});

// Click-through everywhere except the capsule, its buttons and the open card.
island.addEventListener("mouseenter", () => {
  island.classList.add("open"); window.maven.hover(true);
  // Resting and hovered: the two shortcuts, so nobody has to guess (2026-10-28).
  if (island.classList.contains("idle") && !card.isOpen()) showHint("⌃⌥ Write  ·  fn⌃ Do");
});
island.addEventListener("mouseleave", () => { if (dragging) return; island.classList.remove("open"); window.maven.hover(false); });

/* Manual drag: press on the capsule (not the buttons), main follows the cursor
   and on release glides it to the nearest of the three bottom spots. */
let dragging = false;
island.querySelector(".face").addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  dragging = true;
  island.classList.add("dragging");
  window.maven.drag("start");
});
function endDrag() {
  if (!dragging) return;
  dragging = false;
  island.classList.remove("dragging");
  window.maven.drag("end");
}
window.addEventListener("mouseup", endDrag);
window.addEventListener("blur", endDrag);
// Double-click Maven to open the app, like Braino.
island.querySelector(".face").addEventListener("dblclick", () => { endDrag(); window.maven.action("hub"); });
island.querySelector(".x").addEventListener("click", () => window.maven.action("cancel"));
island.querySelector(".ok").addEventListener("click", () => window.maven.action("done"));


/* ---------- the island card (Do mode, 2026-10-27) ----------
   One element, revealed by one clip-path: it starts as exactly the pill's
   rect (same colour, same radius), springs open to the card, the content fades
   in a beat later. Closing is the reverse, a little faster. Only clip-path,
   transform and opacity move. */
const card = (() => {
  const el = document.getElementById("card");
  const wrap = document.getElementById("cardwrap");
  const eyes = el.querySelector(".ceyes");
  const $ = (s) => el.querySelector(s);
  const PW = 58, PH = 30;
  // Bar is wide and low; the help list keeps the taller card width.
  const cardW = () => (kind === "pill" ? Math.min(260, 64 + Math.round(String(pillText || "").length * 7.4)) : document.body.classList.contains("l-bar") && kind !== "help" ? 480 : 300);
  let pillText = "";
  let ch = 150, open = false, closeTimer = 0, sel = 0, kind = "";
  const anchor = () => document.body.classList.contains("a-left") ? "left" : document.body.classList.contains("a-centre") ? "centre" : "right";
  const rectX = (w) => anchor() === "left" ? 0 : anchor() === "right" ? CW - w : (CW - w) / 2;
  function clip(w, h, r) {
    const x = rectX(w);
    el.style.setProperty("--clip", `inset(${ch - h}px ${CW - w - x}px 0px ${x}px round ${r}px)`);
  }
  function eyesAt(cx, cy, s = 1, rot = 0) { eyes.style.transform = `translate(${cx - 8}px, ${cy - 5.5}px) scale(${s}) rotate(${rot}deg)`; }
  const eyesOnPill = () => eyesAt(rectX(PW) + PW / 2, ch - PH / 2, 1.25);
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  function fill(c) {
    kind = String(c.kind || "send");
    pillText = kind === "pill" ? String(c.title || "") : "";
    el.className = `k-${kind}` + (kind === "choose" ? " curious" : "");
    $(".title").textContent = String(c.title || "");
    $(".right").textContent = String(c.right || "");
    $(".preview").textContent = String(c.preview || "");
    $(".editor").value = String(c.preview || "");
    $(".ptxt").textContent = String(c.primary || "Send");
    const opts = $(".opts"); opts.replaceChildren(); sel = 0;
    (c.options || []).slice(0, 3).forEach((o, i) => {
      const b = document.createElement("button"); b.type = "button";
      const k = document.createElement("kbd"); k.textContent = String(i + 1);
      const t = document.createElement("span");
      const n = document.createElement("b"); n.textContent = String(o.name || o);
      const m = document.createElement("small"); m.textContent = o.meta ? String(o.meta) : "";
      t.append(n, m); b.append(k, t); if (i === 0) b.classList.add("sel");
      b.addEventListener("click", () => choose(i));
      opts.append(b);
    });
    // "What I can do": two groups, one line per job with a short example.
    const jobs = $(".jobs"); jobs.replaceChildren();
    if (kind === "help" && c.jobs) {
      for (const key of ["write", "do"]) {
        const g = c.jobs[key]; if (!g) continue;
        const grp = document.createElement("div"); grp.className = "jg";
        const h = document.createElement("div"); h.className = "jh";
        const t = document.createElement("b"); t.textContent = g.title;
        const k = document.createElement("kbd"); k.textContent = g.shortcut || "";
        h.append(t, k);
        const rows = document.createElement("div");
        for (const j of g.jobs) {
          const r = document.createElement("div"); r.className = "jr";
          const n = document.createElement("span"); n.textContent = j.short || j.job;
          const e = document.createElement("i"); e.textContent = `“${j.example}”`;
          r.append(n, e); rows.append(r);
        }
        grp.append(h, rows); jobs.append(grp);
      }
    }
  }
  async function openCard(c) {
    clearTimeout(closeTimer);
    const wasOpen = open;
    fill(c);
    document.body.style.setProperty("--cw", cardW() + "px"); // width first, so the height is measured at the bar's width
    // Measure the natural height with the content laid out (still invisible).
    // Lay the body out in flow for a moment, so its real height is measured
    // (as an absolute child it measured short and the card cut off the buttons).
    const body = $(".body");
    const prev = body.getAttribute("style") || "";
    body.style.position = "relative"; body.style.inset = "auto"; body.style.transform = "none"; body.style.transition = "none";
    const natural = Math.ceil(body.getBoundingClientRect().height);
    body.setAttribute("style", prev);
    ch = Math.min(212, Math.max(96, natural));
    el.style.setProperty("--ch", ch + "px");
    if (!wasOpen) {
      // Start as the pill, exactly, with no transition; then spring open.
      el.classList.remove("anim", "closing");
      clip(PW, PH, PH / 2); eyesOnPill();
      el.classList.add("live");
      island.classList.add("away");
      await frame();
    }
    el.classList.add("anim", "open");
    clip(cardW(), ch, 20);
    eyesAt(22, 21.5, 1, kind === "choose" ? -6 : 0);
    open = true;
    window.maven.hover(true);
    setTimeout(() => { const b = kind === "choose" ? $(".opts button") : $(".yes"); if (b && open) b.focus({ preventScroll: true }); }, 60);
  }
  function closeCard() {
    if (!el.classList.contains("live")) return;
    open = false;
    el.classList.remove("open", "editing", "sent");
    el.classList.add("anim", "closing");
    clip(PW, PH, PH / 2); eyesOnPill();
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      island.classList.remove("away");
      el.classList.remove("live", "anim", "closing");
      window.maven.hover(false);
    }, 370);
  }
  function sent(text) {
    if (!el.classList.contains("live")) { note.textContent = text; note.classList.add("on"); setState("done"); startLoop(); return; }
    el.classList.remove("open", "editing", "closing");
    el.classList.add("anim", "sent");
    const w = 120, h = 44;
    clip(w, h, h / 2);
    const x = rectX(w);
    eyesAt(x + 22, ch - h / 2, 1.1);
    const lbl = $(".sentlbl"); lbl.textContent = text; lbl.style.left = (x + 44) + "px";
    closeTimer = setTimeout(closeCard, 900);
  }
  function primary() {
    if (!open) return;
    if (kind === "choose") return choose(sel);
    window.maven.card({ do: "primary", text: el.classList.contains("editing") ? $(".editor").value : undefined });
  }
  function choose(i) { if (open) window.maven.card({ do: "choose", choice: i }); }
  function cancel() { if (open) window.maven.card({ do: "cancel" }); }
  function edit() {
    el.classList.add("editing");
    const ed = $(".editor"); ed.focus(); ed.setSelectionRange(ed.value.length, ed.value.length);
    window.maven.card({ do: "editing" }); // main focuses the island only now, and stops catching Enter/Esc system-wide
  }
  $(".yes").addEventListener("click", primary);
  $(".no").addEventListener("click", cancel);
  $(".edit").addEventListener("click", edit);
  $(".editor").addEventListener("input", () => window.maven.card({ do: "activity" }));
  document.addEventListener("keydown", (e) => {
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); cancel(); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); primary(); return; }
    if (kind === "choose") {
      const bs = [...el.querySelectorAll(".opts button")];
      if (/^[1-3]$/.test(e.key) && bs[+e.key - 1]) { e.preventDefault(); choose(+e.key - 1); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        sel = (sel + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length;
        bs.forEach((b, i) => b.classList.toggle("sel", i === sel)); bs[sel].focus({ preventScroll: true });
      }
    }
  });
  wrap.addEventListener("mouseenter", () => { if (open) window.maven.hover(true); });
  wrap.addEventListener("mouseleave", () => { if (open && !document.hasFocus()) window.maven.hover(false); });
  /* Enter / Esc caught system-wide by the key watcher while the card asks
     (2026-10-27): the island never needs key focus to be answered. */
  window.maven.onCardKey((k) => { if (k === "enter") primary(); else if (k === "esc") cancel(); });
  return { open: openCard, close: closeCard, sent, isOpen: () => open };
})();
