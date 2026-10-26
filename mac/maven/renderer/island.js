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
let edgeT = 0;
function paintEdge() {
  const W = 58, H = 30, r = H / 2, L = W - H, per = 2 * L + Math.PI * H, k = 2; // canvas is 2x the 100x60 box
  edgeT += 0.004 + level * 0.022;
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
  ectx.shadowColor = "rgba(255,190,150,1)"; ectx.shadowBlur = 8;
  const head = (edgeT % 1) * per;
  for (let i = 0; i < 26; i++) {
    const [x, y] = at(head - i * 2);
    ectx.fillStyle = `rgba(255,236,220,${(1 - i / 26) * (0.6 + 0.4 * level)})`;
    ectx.beginPath(); ectx.arc(x, y, 1.6 - i * 0.04, 0, Math.PI * 2); ectx.fill();
  }
}
function loop() { paint(); paintWave(); paintEdge(); anim = island.classList.contains("listening") ? requestAnimationFrame(loop) : 0; }

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
  if (state === "listening") { setState("listening"); if (!anim) anim = requestAnimationFrame(loop); return; }
  if (state === "done") { setState("done"); return; }
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
