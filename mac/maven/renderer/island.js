"use strict";
const island = document.getElementById("island");
const note = document.getElementById("note");
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
  edgeT += done ? 0.006 : 0.004 + level * 0.022;
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
  const mix = (a, b) => Math.round(b + (a - b) * warm); // warm peach -> green
  const R = mix(255, 120), G = mix(236, 235), B = mix(220, 160), gR = mix(255, 70), gG = mix(190, 220), gB = mix(150, 120);
  ectx.shadowColor = `rgba(${gR},${gG},${gB},1)`; ectx.shadowBlur = 8;
  const head = (edgeT % 1) * per, n = Math.round(tail), bright = done ? 1 : 0.6 + 0.4 * level;
  for (let i = 0; i < n; i++) {
    const [x, y] = at(head - i * (per / 90));
    ectx.fillStyle = `rgba(${R},${G},${B},${(1 - (i / n) * (done ? 0.35 : 1)) * bright * fade})`;
    ectx.beginPath(); ectx.arc(x, y, Math.max(0.5, 1.6 - (i / n) * 1.1), 0, Math.PI * 2); ectx.fill(); // never a negative radius (it threw and killed the loop)
  }
}
function loop() {
  // A drawing error must never stop the animation for good.
  try { paint(); paintWave(); paintEdge(); } catch (_) {}
  anim = island.classList.contains("listening") || island.classList.contains("done") ? requestAnimationFrame(loop) : 0;
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

function setState(name) {
  island.classList.add("on");
  island.classList.remove("idle", "listening", "done", "open");
  island.classList.add(name);
}

window.maven.onState(({ state, note: text }) => {
  if (state === "note") {
    setState("idle");
    note.textContent = String(text || "");
    note.classList.add("on");
    return;
  }
  note.classList.remove("on");
  if (state === "listening") { setState("listening"); warm = 1; tail = 26; fade = 1; doneAt = 0; if (!anim) anim = requestAnimationFrame(loop); return; } // always starts warm, never green
  if (state === "done") { setState("done"); if (!anim) anim = requestAnimationFrame(loop); return; }
  // idle, hidden, thinking: the resting face (the listening state is gone the moment you press)
  setState("idle");
  level = 0;
  window.maven.hover(false);
});
window.maven.onLevel(({ v }) => {
  const x = Math.max(0, Math.min(1, Number(v) || 0));
  level = level * 0.55 + x * 0.45;
});

// Click-through everywhere except the capsule and its buttons.
island.addEventListener("mouseenter", () => { island.classList.add("open"); window.maven.hover(true); });
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
