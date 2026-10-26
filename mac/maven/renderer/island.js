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
function loop() { paint(); anim = island.classList.contains("listening") ? requestAnimationFrame(loop) : 0; }

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
island.addEventListener("mouseleave", () => { island.classList.remove("open"); window.maven.hover(false); });
island.querySelector(".x").addEventListener("click", () => window.maven.action("cancel"));
island.querySelector(".ok").addEventListener("click", () => window.maven.action("done"));
