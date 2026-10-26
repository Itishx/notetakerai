"use strict";
const island = document.getElementById("island");
const note = document.getElementById("note");
const dots = [...island.querySelectorAll(".dots i")];
let level = 0, anim = 0;

function paint() {
  const t = performance.now() / 55;
  const perBar = Math.max(1, dots.length / 2);
  // The same wave in both bars: dot i of one matches dot i of the other.
  dots.forEach((d, k) => {
    const i = k % perBar;
    const wave = 0.5 + 0.5 * Math.sin(t + i * 1.1);
    const centre = 1 - Math.abs(i - (perBar - 1) / 2) / perBar;
    d.style.setProperty("--d", (1 + level * 3.2 * wave * (0.6 + centre)).toFixed(2));
  });
}
function loop() { paint(); anim = island.classList.contains("on") ? requestAnimationFrame(loop) : 0; }

window.maven.onState(({ state, note: text }) => {
  if (state === "hidden") {
    island.classList.remove("on", "open", "thinking");
    note.classList.remove("on");
    level = 0; paint();
    window.maven.hover(false);
    return;
  }
  if (state === "note") {
    island.classList.remove("on", "open", "thinking");
    note.textContent = String(text || "");
    note.classList.add("on");
    return;
  }
  note.classList.remove("on");
  island.classList.add("on");
  island.classList.toggle("thinking", state === "thinking");
  if (!anim) anim = requestAnimationFrame(loop);
});
window.maven.onLevel(({ v }) => {
  const x = Math.max(0, Math.min(1, Number(v) || 0));
  level = level * 0.55 + x * 0.45; // smooth, so it breathes rather than flickers
});

// Click-through everywhere except the mark and its buttons.
island.addEventListener("mouseenter", () => { island.classList.add("open"); window.maven.hover(true); });
island.addEventListener("mouseleave", () => { island.classList.remove("open"); window.maven.hover(false); });
island.querySelector(".x").addEventListener("click", () => window.maven.action("cancel"));
island.querySelector(".ok").addEventListener("click", () => { island.classList.remove("open"); island.classList.add("thinking"); window.maven.action("done"); });
