/* Braino, in person, walking you through setup. The same drawing and the same
   walk, blink and talking mouth as the notch Braino (copied from braino-mac.js,
   not shared, so setup can never disturb the notch), with his real Fish voice.
   He lives on a clear layer above both panels, so he can walk over to anything.
   If his voice cannot load, the bubble still shows and setup carries on.
   House rule: no dashes of any kind in anything Braino says. */
(() => {
  const api = window.brainoMac || {};
  const W = 96, H = 117;           // drawn at 1.5x the notch size
  const layer = document.createElement("div");
  layer.className = "sb-layer";
  layer.innerHTML = `<div class="sb-bubble" id="sb-bubble"></div><div class="sb-walker" id="sb-walker"><div class="sb-flip" id="sb-flip"></div></div>`;
  document.body.appendChild(layer);
  const walker = layer.querySelector("#sb-walker");
  const flip = layer.querySelector("#sb-flip");
  const bubble = layer.querySelector("#sb-bubble");
  try { flip.innerHTML = (api.getWalkerSvgFor?.("braino") || api.getWalkerSvg?.() || ""); } catch (_) {}
  const root = flip.querySelector("#__sbwk_root__");
  const q = (s) => root?.querySelector(s);

  let x = -W, y = 0, dir = 1;      // start just off the left edge, then walk in
  let walk = null;                 // { x, y, speed, resolve }
  let pose = null;                 // held pose, same fields as the notch's startupPose
  let speaking = false;
  let waving = false, waveTimer = 0;
  let muted = false;
  try { muted = localStorage.getItem("sbSetupMuted") === "1"; } catch (_) {}
  let audio = null, sayToken = 0, bubbleTimer = 0;
  const start = performance.now();
  let last = start;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function walkTo(tx, ty, speed = 170) {
    tx = clamp(tx, -W, innerWidth);
    ty = clamp(ty, 0, innerHeight - H);
    return new Promise((resolve) => { if (walk) walk.resolve(); walk = { x: tx, y: ty, speed, resolve }; });
  }

  /* Where he stands by default: bottom right of the conversation panel. */
  function home() {
    const r = document.querySelector(".su-left")?.getBoundingClientRect();
    return r ? { x: r.right - W - 34, y: r.bottom - H - 58 } : { x: 40, y: innerHeight - H - 60 };
  }

  function wave() { waving = true; clearTimeout(waveTimer); waveTimer = setTimeout(() => { waving = false; }, 1600); }

  /* Walk beside an element, face it, hold his arm out at it and make it glow. */
  async function point(target, ms = 2600) {
    const el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const roomLeft = r.left - W - 8 > 0;
    const tx = roomLeft ? r.left - W - 8 : r.right + 8;
    const ty = clamp(r.top + r.height / 2 - H * 0.55, 0, innerHeight - H);
    await walkTo(tx, ty);
    dir = roomLeft ? 1 : -1;
    pose = { rightArm: -62, gazeX: 2.4 };
    el.classList.add("sb-pointed");
    setTimeout(() => { el.classList.remove("sb-pointed"); pose = null; }, ms);
  }

  function hop() {
    let n = 0;
    const beats = [{ rootY: -10, rootScaleY: 1.04, rightArm: -120, leftArm: 120 }, { rootY: 0, rootScaleY: 0.94 }, { rootY: -8, rightArm: -110, leftArm: 110 }, null];
    const next = () => { pose = beats[n++] || null; if (n < beats.length) setTimeout(next, 170); };
    next();
  }

  /* The bubble, lit word by word as he says it. */
  function showBubble(text) {
    const words = String(text).split(/\s+/).filter(Boolean);
    bubble.innerHTML = words.map((w) => `<span class="sb-w">${w.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))} </span>`).join("");
    bubble.classList.add("show");
    return [...bubble.querySelectorAll(".sb-w")];
  }
  function hideBubble() { bubble.classList.remove("show"); }

  function stop() {
    sayToken += 1;
    speaking = false;
    clearTimeout(bubbleTimer);
    if (audio) { try { audio.pause(); } catch (_) {} audio = null; }
    doneSaying();
  }

  /* Resolves when he has finished the line (or was cut off by the next one). */
  let doneSaying = () => {};
  function say(text) {
    stop();
    doneSaying();
    const token = sayToken;
    return new Promise(async (resolve) => {
      doneSaying = resolve;
      const finish = () => { if (token !== sayToken) return; speaking = false; light(1); bubbleTimer = setTimeout(hideBubble, 2600); resolve(); };
      const spans = showBubble(text);
      const light = (p) => { const k = Math.ceil(p * spans.length); spans.forEach((s, i) => s.classList.toggle("on", i < k)); };
      const silent = () => {
        // No voice: mouth moves for about as long as the line takes to read.
        const ms = clamp(text.length * 55, 1600, 6000);
        speaking = true;
        const t0 = performance.now();
        const step = () => { if (token !== sayToken) return; const p = (performance.now() - t0) / ms; light(p); if (p < 1) requestAnimationFrame(step); else finish(); };
        step();
      };
      if (muted || !api.setupSay) { silent(); return; }
      const res = await api.setupSay(text).catch(() => null);
      if (token !== sayToken) return;
      if (!res?.ok) { silent(); return; }
      audio = new Audio(res.dataUrl);
      audio.addEventListener("timeupdate", () => { if (token === sayToken && audio?.duration) light(audio.currentTime / audio.duration); });
      audio.addEventListener("ended", finish);
      audio.addEventListener("error", () => { if (token === sayToken) silent(); });
      speaking = true;
      audio.play().catch(() => { if (token === sayToken) silent(); });
    });
  }

  function setMuted(on) {
    muted = Boolean(on);
    try { localStorage.setItem("sbSetupMuted", muted ? "1" : "0"); } catch (_) {}
    if (muted && audio) { try { audio.pause(); } catch (_) {} audio = null; speaking = false; }
  }

  function updateMouth(t) {
    const smile = q("#__sbwk_smile__"), talk = q("#__sbwk_talk__"), outer = q("#__sbwk_te__"), inner = q("#__sbwk_ti__");
    if (!speaking) { if (smile) smile.style.display = ""; if (talk) talk.style.display = "none"; return; }
    const open = clamp((0.5 + 0.5 * Math.sin(t * 13.5)) * (0.55 + 0.45 * Math.sin(t * 7.7 + 1.3)) * (0.7 + 0.3 * Math.sin(t * 23)), 0, 1);
    const ry = 1.4 + open * 4.2, rx = 4 - open * 0.5;
    if (smile) smile.style.display = "none";
    if (talk) talk.style.display = "block";
    outer?.setAttribute("rx", String(rx)); outer?.setAttribute("ry", String(ry));
    if (inner) {
      if (open > 0.25) {
        const cy = parseFloat(outer?.getAttribute("cy")) || 61.8;
        inner.style.display = "block";
        inner.setAttribute("cy", String(cy + ry * 0.4)); inner.setAttribute("rx", String(rx * 0.62)); inner.setAttribute("ry", String(ry * 0.5));
      } else inner.style.display = "none";
    }
  }

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = (now - start) / 1000;
    let walking = false;
    if (walk) {
      const dx = walk.x - x, dy = walk.y - y;
      const dist = Math.max(0.01, Math.hypot(dx, dy));
      const stepLen = Math.min(dist, walk.speed * dt);
      x += (dx / dist) * stepLen; y += (dy / dist) * stepLen;
      if (Math.abs(dx) > 0.25) dir = dx >= 0 ? 1 : -1;
      walking = dist > 0.5;
      if (dist <= 2.5) { const r = walk.resolve; walk = null; walking = false; r(); }
    }
    walker.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    flip.style.transform = `scaleX(${dir})`;
    // The bubble sits above his head, kept inside the window.
    const bw = bubble.offsetWidth || 260;
    bubble.style.transform = `translate3d(${clamp(x + W / 2 - bw + 40, 14, innerWidth - bw - 14)}px, ${Math.max(14, y - bubble.offsetHeight - 6)}px, 0)`;

    if (pose) {
      const p = pose, sy = p.rootScaleY == null ? 1 : p.rootScaleY;
      root?.setAttribute("transform", `translate(0 ${(p.rootY || 0) + 101 * (1 - sy)}) scale(1 ${sy})`);
      const la = p.leftArm ? `rotate(${p.leftArm} 22 53)` : "", ra = p.rightArm ? `rotate(${p.rightArm} 78 53)` : "";
      q("#__sbwk_la_bg__")?.setAttribute("transform", la); q("#__sbwk_la__")?.setAttribute("transform", la);
      q("#__sbwk_ra_bg__")?.setAttribute("transform", ra); q("#__sbwk_ra__")?.setAttribute("transform", ra);
      q("#__sbwk_ll__")?.setAttribute("transform", ""); q("#__sbwk_rl__")?.setAttribute("transform", "");
      q("#__sbwk_pupil_l__")?.setAttribute("transform", `translate(${p.gazeX || 0} ${p.gazeY || 0})`);
      q("#__sbwk_pupil_r__")?.setAttribute("transform", `translate(${p.gazeX || 0} ${p.gazeY || 0})`);
    } else {
      const s = t * 4.5, amt = walking ? 1 : 0;
      const lp = Math.sin(s), rp = Math.sin(s + Math.PI);
      const waddle = Math.sin(s) * 3.4 * amt;
      const walkBob = (-Math.abs(Math.sin(s)) * 2 - 0.4) * amt;
      const breath = 1 + 0.014 * Math.sin(t * 1.7);
      const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
      root?.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
      q("#__sbwk_ll__")?.setAttribute("transform", `translate(0 ${-Math.max(0, lp) * 5 * amt}) rotate(${Math.max(0, lp) * 8 * amt} 44 74)`);
      q("#__sbwk_rl__")?.setAttribute("transform", `translate(0 ${-Math.max(0, rp) * 5 * amt}) rotate(${Math.max(0, rp) * 8 * amt} 56 74)`);
      const ra = waving ? `rotate(${-28 + Math.sin(t * 11) * 16} 78 53)` : "";
      q("#__sbwk_ra_bg__")?.setAttribute("transform", ra); q("#__sbwk_ra__")?.setAttribute("transform", ra);
      q("#__sbwk_la_bg__")?.setAttribute("transform", ""); q("#__sbwk_la__")?.setAttribute("transform", "");
      const gaze = walking ? 2.4 : 0;
      q("#__sbwk_pupil_l__")?.setAttribute("transform", `translate(${gaze} 0)`);
      q("#__sbwk_pupil_r__")?.setAttribute("transform", `translate(${gaze} 0)`);
    }
    const bp = t % 3.4, blink = bp < 0.13 ? Math.sin((bp / 0.13) * Math.PI) : 0, es = Math.max(0.06, 1 - blink);
    q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(38,48) scale(1,${es}) translate(-38,-48)`);
    q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(62,48) scale(1,${es}) translate(-62,-48)`);
    updateMouth(t);
    requestAnimationFrame(tick);
  }

  y = home().y;
  requestAnimationFrame(tick);
  addEventListener("resize", () => { if (!walk && !pose) { const h = home(); x = h.x; y = h.y; } });

  window.SetupBraino = {
    home: () => { const h = home(); return walkTo(h.x, h.y); },
    walkTo, point, wave, hop, say, stop, setMuted,
    get muted() { return muted; },
  };
})();
