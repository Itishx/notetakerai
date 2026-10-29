/* Maven, the character (2026-10-29): the smooth capsule face on a pixel body,
   red tee, black jeans, blue sneakers. Same art as the "Final" pick in the
   Pixel Maven artifact. He reads the island's own state classes (idle,
   listening, thinking, done, again, nope, glint, talking) and acts them out,
   so nothing in island.js has to know he exists beyond turning him on. */
(() => {
  const PAL = { K: "#0d0d0c", W: "#f6f3ea", P: "#d8322b", D: "#a8221d", B: "#26252b", S: "#2f6fed", G: "#0d0d0c" };
  const BODY = [
    "......KKKK......",
    "...PPPPPPPPPP...",
    "..PPPPPPPPPPPP..",
    ".GPPPPPPPPPPPPG.",
    ".GPPPPPPPPPPPPG.",
    ".GGPPPPPPPPPPGG.",
    "...PPPPPPPPPP...",
    "...BBBBBBBBBB...",
  ];
  const LEGS = [
    ["...BBBB..BBBB...", "...BBBB..BBBB...", "...BBBB..BBBB...", "..SSSSS..SSSSS..", "..SSSSS..SSSSS.."],
    ["...BBBB..BBBB...", "..BBBB....BBBB..", ".BBBB......BBBB.", "SSSSS......SSSSS", "SSSS........SSSS"],
  ];
  const U = 4;               // one pixel of him = 4 css px
  const HEAD = 9;            // head height in his pixels
  const W = 16, H = HEAD + BODY.length + 5;
  const TOP = 6;             // room above the head for a hop

  const island = document.getElementById("island");
  const cv = document.createElement("canvas");
  cv.className = "mv-char";
  cv.width = W * U * 2; cv.height = (H + TOP) * U * 2;  // 2x for a crisp face
  island.querySelector(".face").appendChild(cv);
  const ctx = cv.getContext("2d");
  const has = (c) => island.classList.contains(c);
  const tint = () => document.body.classList.contains("do") ? "blue" : "warm";

  function rr(x, y, w, h, r, fill) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }
  function body(y, legs) {
    const rows = [...BODY, ...LEGS[legs]];
    rows.forEach((r, j) => { for (let i = 0; i < W; i++) { const c = r[i]; if (c === ".") continue; ctx.fillStyle = PAL[c]; ctx.fillRect(i * U, y + (HEAD + j) * U, U, U); } });
  }
  function head(y, o, t) {
    const u = U;
    ctx.save();
    ctx.translate(8 * u, y + 4.5 * u); ctx.rotate(o.tilt || 0); ctx.translate(-8 * u, -(y + 4.5 * u));
    rr(1 * u, y, 14 * u, 9 * u, 4.5 * u, PAL.K);
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.beginPath(); ctx.ellipse(4.2 * u, y + 1.9 * u, 1.8 * u, 0.7 * u, -0.3, 0, Math.PI * 2); ctx.fill();
    let dx = 0, dy = 0, h = 3 * u, ly = 0;
    if (o.eyes === "up") { dy = -0.7 * u; dx = 0.5 * u; h = 2.6 * u; }
    if (o.eyes === "away") { dx = 1.4 * u; dy = -0.3 * u; }
    if (o.eyes === "lower") ly = 0.8 * u;
    if (o.eyes === "happy") { h = 1.6 * u; dy = 0.6 * u; }
    if (o.blink) { h = 0.45 * u; dy = 1.3 * u; }
    dx += o.gx || 0;
    if (o.talking) dy -= 0.6 * u;
    rr(4.9 * u + dx, y + 2.8 * u + dy, 1.3 * u, h, 0.65 * u, PAL.W);
    rr(9.8 * u + dx, y + 2.8 * u + dy + ly, 1.3 * u, h, 0.65 * u, PAL.W);
    if (o.talking) { // a small mouth while he speaks
      const m = 0.25 + 0.6 * Math.abs(Math.sin(t / 85)) * (0.6 + 0.4 * Math.sin(t / 230));
      rr(7.2 * u, y + 6.4 * u, 1.6 * u, Math.max(0.3, m) * u, 0.5 * u, PAL.W);
    }
    if (o.ring) {
      ctx.beginPath(); ctx.roundRect(1 * u, y, 14 * u, 9 * u, 4.5 * u);
      ctx.lineWidth = 0.7 * u; ctx.strokeStyle = o.ring.c1; ctx.shadowColor = o.ring.c2; ctx.shadowBlur = 2.2 * u;
      const per = 10 * u + Math.PI * 9 * u;
      if (!o.ring.full) { ctx.setLineDash([per * 0.22, per * 0.78]); ctx.lineDashOffset = -((t * o.ring.speed / 6) % per); }
      ctx.stroke();
    }
    ctx.restore();
  }
  const WARM = { c1: "#ffcf6e", c2: "#ffb347" }, BLUE = { c1: "#a9c9ff", c2: "#5a96ff" }, GREEN = { c1: "#7be3a0", c2: "#3fd47c", full: true }, PURPLE = { c1: "#c9a2ff", c2: "#b07cff" };

  let gx = 0, nextGlance = 0, level = 0;
  window.addEventListener("maven-level", (e) => { level = e.detail || 0; });
  function frame(t) {
    if (!document.body.classList.contains("l-char")) { requestAnimationFrame(frame); return; }
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, W * U, (H + TOP) * U);
    const blink = (t % 3200) < 130 && has("idle");
    if (t > nextGlance) { gx = has("idle") && Math.random() > 0.35 ? (Math.random() - 0.5) * 2.4 * U : 0; nextGlance = t + 2200 + Math.random() * 3600; }
    const o = { eyes: "open", blink, gx: has("idle") ? gx : 0, talking: has("talking") };
    let hop = 0, legs = 0;
    if (has("listening")) { o.eyes = "up"; o.ring = { ...(tint() === "blue" ? BLUE : WARM), speed: 1.4 + level * 2.4 }; }
    else if (has("thinking")) { o.eyes = "up"; o.ring = { ...BLUE, speed: 0.35 }; }
    else if (has("done")) { o.eyes = "happy"; o.ring = GREEN; hop = Math.abs(Math.sin(t / 200)) * 2.5 * U; }
    else if (has("again")) { o.eyes = "lower"; o.tilt = -0.18; }
    else if (has("nope")) { o.eyes = "away"; o.tilt = 0.12; }
    else if (has("curious")) { o.tilt = 0.08; }
    if (has("glint")) o.ring = { ...PURPLE, speed: 2.4 };
    if (o.talking) { hop = Math.abs(Math.sin(t / 170)) * 0.8 * U; legs = Math.floor(t / 340) % 2 && has("done") ? 1 : 0; }
    const y = TOP * U - hop + (has("idle") && !o.talking ? (Math.floor(t / 900) % 2) : 0);
    body(y, legs);
    head(y, o, t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
