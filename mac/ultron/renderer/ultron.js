/* Ultron, drawn (2026-10-29): a smooth silver machine face, angled red eyes
   and a red mouth light, on a gunmetal pixel body with a red core. Same recipe
   as Maven's final pick (smooth face, pixel body), Ultron's colours. */
(() => {
  const cv = document.getElementById("him");
  const ctx = cv.getContext("2d");
  const card = document.getElementById("card");
  const words = document.getElementById("words");
  const hint = document.getElementById("hint");
  const P = 4; // one body pixel = 4 px
  const BX = 12, BY = 54; // body origin
  const PAL = { A: "#4b5059", L: "#8a919b", K: "#23262b", H: "#b9bfc7", B: "#3a3e45", S: "#1b1d21" };
  const BODY = [
    "......LLLL......",
    "...AAAAAAAAAA...",
    "..AALAAAAAALAA..",
    ".HAALAA..AALAAH.",
    ".HAAAAA..AAAAAH.",
    ".HHAAAAAAAAAAHH.",
    "...AAAKKKKAAA...",
    "...BBBBBBBBBB...",
    "...BBBB..BBBB...",
    "...BBBB..BBBB...",
    "...BBBB..BBBB...",
    "..SSSSS..SSSSS..",
    "..SSSSS..SSSSS..",
  ];

  let state = "idle", talking = false, level = 0, voiceLevel = 0, listenAt = 0;
  let glance = 0, nextGlance = 0;

  function body(y, t) {
    BODY.forEach((r, j) => { for (let i = 0; i < 16; i++) { const c = r[i]; if (c === ".") continue; ctx.fillStyle = PAL[c]; ctx.fillRect(BX + i * P, y + j * P, P, P); } });
    // the core: a red light in the chest, faster when he talks
    const pulse = talking ? 0.65 + 0.35 * Math.abs(Math.sin(t / 120)) : 0.55 + 0.25 * Math.sin(t / 900);
    ctx.save(); ctx.shadowColor = "#ff2a1f"; ctx.shadowBlur = 8 * pulse;
    ctx.fillStyle = `rgba(255,${Math.round(60 + 60 * pulse)},${Math.round(40 + 30 * pulse)},${0.75 + 0.25 * pulse})`;
    ctx.fillRect(BX + 7 * P, y + 3 * P, 2 * P, 2 * P);
    ctx.restore();
  }
  function headPath(y) {
    ctx.beginPath();
    ctx.moveTo(23, y + 14);
    ctx.quadraticCurveTo(44, y - 4, 65, y + 14);  // the dome
    ctx.lineTo(68, y + 30);                        // temple
    ctx.lineTo(61, y + 43);                        // cheek plate
    ctx.lineTo(50, y + 53);                        // jaw
    ctx.quadraticCurveTo(44, y + 56, 38, y + 53);  // chin
    ctx.lineTo(27, y + 43);
    ctx.lineTo(20, y + 30);
    ctx.closePath();
  }
  function head(y, t, o) {
    ctx.save();
    ctx.translate(44, y + 28); ctx.rotate(o.tilt || 0); ctx.translate(-44, -(y + 28));
    // silver skull
    const g = ctx.createLinearGradient(0, y, 0, y + 56);
    g.addColorStop(0, "#eef0f3"); g.addColorStop(0.45, "#a7adb6"); g.addColorStop(1, "#5c626b");
    headPath(y); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(20,22,26,.55)"; ctx.lineWidth = 1; ctx.stroke();
    // seams: forehead line, cheek plates
    ctx.strokeStyle = "rgba(40,44,50,.6)"; ctx.lineWidth = 0.9; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(44, y + 4); ctx.lineTo(44, y + 17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(27, y + 42); ctx.lineTo(37, y + 35); ctx.moveTo(61, y + 42); ctx.lineTo(51, y + 35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, y + 22); ctx.lineTo(29, y + 19); ctx.moveTo(64, y + 22); ctx.lineTo(59, y + 19); ctx.stroke();
    // shine
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(34, y + 9, 7, 2.2, -0.35, 0, Math.PI * 2); ctx.fill();
    // brow: the scowl
    ctx.fillStyle = "#3a3f47";
    ctx.beginPath(); ctx.moveTo(27, y + 23); ctx.lineTo(41, y + 26); ctx.lineTo(41, y + 28); ctx.lineTo(27, y + 25.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(61, y + 23); ctx.lineTo(47, y + 26); ctx.lineTo(47, y + 28); ctx.lineTo(61, y + 25.5); ctx.closePath(); ctx.fill();
    // eyes: angled red light
    const dx = o.glance || 0, glow = o.eyes;
    ctx.save(); ctx.shadowColor = "#ff1a10"; ctx.shadowBlur = 6 + 8 * glow;
    ctx.fillStyle = `rgba(255,${Math.round(40 + 90 * glow)},${Math.round(30 + 60 * glow)},${0.55 + 0.45 * glow})`;
    ctx.beginPath(); ctx.moveTo(29 + dx, y + 29); ctx.lineTo(40 + dx, y + 30.5); ctx.lineTo(39 + dx, y + 33.5); ctx.lineTo(30 + dx, y + 32); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(59 + dx, y + 29); ctx.lineTo(48 + dx, y + 30.5); ctx.lineTo(49 + dx, y + 33.5); ctx.lineTo(58 + dx, y + 32); ctx.closePath(); ctx.fill();
    // mouth: a thin red line; it opens and brightens while he talks
    const open = talking ? 1.2 + 4.5 * voiceLevel : 1.1;
    ctx.shadowBlur = talking ? 10 : 4;
    ctx.fillStyle = talking ? "#ff4a3a" : "rgba(255,60,45,.75)";
    ctx.beginPath(); ctx.roundRect(37, y + 44 - open / 2, 14, open, open / 2); ctx.fill();
    ctx.restore();
    // thinking: a scan line across the face
    if (o.scan != null) {
      ctx.save(); headPath(y); ctx.clip();
      const sy = y + 4 + ((t / 9) % 52);
      const sg = ctx.createLinearGradient(0, sy - 4, 0, sy + 4);
      sg.addColorStop(0, "rgba(255,40,30,0)"); sg.addColorStop(0.5, "rgba(255,60,45,.55)"); sg.addColorStop(1, "rgba(255,40,30,0)");
      ctx.fillStyle = sg; ctx.fillRect(16, sy - 4, 56, 8);
      ctx.restore();
    }
    // listening: a red light running round his head
    if (o.ring) {
      ctx.save(); headPath(y);
      ctx.lineWidth = 2.2; ctx.strokeStyle = "#ff5a48"; ctx.shadowColor = "#ff2a1f"; ctx.shadowBlur = 8;
      const per = 190;
      ctx.setLineDash([per * 0.24, per * 0.76]); ctx.lineDashOffset = -((t * (0.06 + level * 0.18)) % per);
      ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }

  function frame(t) {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 88, 116);
    if (t > nextGlance) { glance = state === "idle" && !talking && Math.random() > 0.4 ? (Math.random() - 0.5) * 3 : 0; nextGlance = t + 2500 + Math.random() * 4000; }
    voiceLevel = talking ? Math.max(0, Math.min(1, 0.35 + 0.65 * Math.abs(Math.sin(t / 95) * Math.sin(t / 260 + 1)))) : 0;
    const o = { eyes: 0.55 + 0.15 * Math.sin(t / 1100), glance: state === "idle" ? glance : 0 };
    let bob = 0;
    if (state === "listening") { o.eyes = 1; o.ring = true; o.tilt = -0.05; }
    if (state === "thinking") { o.eyes = 0.6 + 0.4 * (Math.floor(t / 90) % 2); o.scan = true; }
    if (talking) { o.eyes = 0.95; bob = Math.abs(Math.sin(t / 180)) * 1.5; }
    const y = 6 - bob + (state === "idle" && !talking ? (Math.floor(t / 1000) % 2) * 0.6 : 0);
    body(BY - bob, t);
    head(y, t, o);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- speaking ---------- */
  let voice = null, hideTimer = 0, revealTimer = 0;
  function showWords(text, msPerWord) {
    clearTimeout(hideTimer); clearInterval(revealTimer);
    words.replaceChildren();
    const parts = String(text).split(/(\s+)/);
    const spans = parts.map((w) => { const s = document.createElement("span"); s.textContent = w; words.append(s); return s; });
    card.classList.add("on");
    let i = 0;
    revealTimer = setInterval(() => { while (i < spans.length && !spans[i].textContent.trim()) spans[i++].classList.add("in"); if (i < spans.length) spans[i++].classList.add("in"); else clearInterval(revealTimer); }, msPerWord);
  }
  function foldLater(ms) { clearTimeout(hideTimer); hideTimer = setTimeout(() => card.classList.remove("on"), ms); }
  async function speak(text, cfg) {
    if (!window.AffectiveVoice) { showWords(text, 60); foldLater(4000 + text.length * 60); return; }
    if (!voice) voice = AffectiveVoice.create({
      ...cfg,
      onStart: () => { talking = true; const n = text.split(/\s+/).length; showWords(text, Math.max(110, Math.min(330, (text.length * 62) / Math.max(1, n)))); window.ultron.spoke("start"); },
      onEnd: () => { talking = false; foldLater(3500); window.ultron.spoke("end"); },
    });
    voice.set(cfg);
    const ok = await voice.speak(text);
    if (!ok && !talking) { showWords(text, 70); foldLater(4000 + text.length * 55); }
  }

  window.ultron.onLevel((v) => { level = level * 0.6 + (Number(v) || 0) * 0.4; });
  window.ultron.onState((p) => {
    if (!p) return;
    if (p.state === "listening") { voice && voice.stop(); talking = false; card.classList.remove("on"); state = "listening"; listenAt = performance.now(); return; }
    if (p.state === "thinking") { state = "thinking"; return; }
    if (p.state === "say") { state = "idle"; void speak(String(p.text || ""), p.voice || {}); return; }
    state = "idle";
  });

  // Drag him: press on him and move; let go anywhere.
  let dragging = false;
  cv.addEventListener("mousedown", (e) => { if (e.button !== 0) return; e.preventDefault(); dragging = true; cv.style.cursor = "grabbing"; window.ultron.drag("start"); });
  const endDrag = () => { if (!dragging) return; dragging = false; cv.style.cursor = "grab"; window.ultron.drag("end"); };
  window.addEventListener("mouseup", endDrag); window.addEventListener("blur", endDrag);
  cv.style.cursor = "grab";

  // Hover: the window is click-through except over him and his card.
  document.addEventListener("mousemove", (e) => {
    const r = cv.getBoundingClientRect(), c = card.getBoundingClientRect();
    const inHim = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    const inCard = card.classList.contains("on") && e.clientX >= c.left && e.clientX <= c.right && e.clientY >= c.top && e.clientY <= c.bottom;
    hint.classList.toggle("on", inHim && !card.classList.contains("on"));
    if (!dragging) window.ultron.hover(inHim || inCard);
  });
  document.addEventListener("mouseleave", () => { hint.classList.remove("on"); if (!dragging) window.ultron.hover(false); });
})();
