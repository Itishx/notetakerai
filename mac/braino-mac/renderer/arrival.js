/* Arrival: looking for you → Touch ID → "Morning, Itish." → what is waiting
   → out, and Braino comes out of the notch to say good morning.
   main.cjs opens this window over the notch and owns the camera check,
   Touch ID and what gets saved; this file is the island and the timing. */
(() => {
  const api = window.brainoMac;
  const $ = (s) => document.querySelector(s);
  const island = $("#island"), glow = $("#glow"), fp = $("#fp");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // A real spring, sampled into a CSS linear() curve.
  (function spring() {
    if (reduce || !CSS.supports("transition-timing-function", "linear(0, 1)")) return;
    const k = 240, c = 21; let x = 0, v = 0; const pts = [0]; const dt = 1 / 60;
    for (let i = 0; i < 90; i++) { v += (-k * (x - 1) - c * v) * dt; x += v * dt; pts.push(+x.toFixed(4)); if (i > 20 && Math.abs(x - 1) < .002 && Math.abs(v) < .01) break; }
    pts[pts.length - 1] = 1;
    document.documentElement.style.setProperty("--spring", `linear(${pts.join(", ")})`);
    document.documentElement.style.setProperty("--spring-dur", `${(pts.length / 60).toFixed(2)}s`);
  })();

  let SIZES = {};
  function sizes(notch) {
    // The physical notch covers the top band; content sits below it.
    const top = notch?.height || 0, w0 = notch?.width || 186;
    document.documentElement.style.setProperty("--top", `${top}px`);
    SIZES = {
      rest:       { w: w0,                      h: Math.max(top, 32), r: 14, tint: null },
      scanning:   { w: Math.max(w0 + 110, 300), h: top + 44,          r: 22, tint: "#FFB547" },
      touchid:    { w: 560,                     h: top + 120,         r: 42, tint: "#FFB547" },
      recognised: { w: 600,                     h: top + 112,         r: 42, tint: "#5BE3A6" },
      summary:    { w: 600,                     h: top + 112,         r: 42, tint: "#5BE3A6" },
      in:         { w: Math.max(w0 + 110, 300), h: top + 44,          r: 22, tint: "#5BE3A6" },
    };
  }

  function go(state) {
    const s = SIZES[state];
    island.dataset.state = state;
    for (const el of [island, glow]) { el.style.setProperty("--w", `${s.w}px`); el.style.setProperty("--h", `${s.h}px`); }
    island.style.setProperty("--r", `${s.r}px`);
    glow.classList.toggle("on", Boolean(s.tint)); if (s.tint) glow.style.setProperty("--tint", s.tint);
    document.querySelectorAll(".lay").forEach((l) => l.classList.toggle("on", l.dataset.for.split(" ").includes(state)));
  }

  // Clicks pass through the window except over the island itself.
  island.addEventListener("mouseenter", () => api.arrivalMouse?.(true));
  island.addEventListener("mouseleave", () => api.arrivalMouse?.(false));

  /* Camera: one still frame at a time to Apple's on-device face check, until
     a face shows up or time runs out. Nothing is kept. */
  async function lookForFace(ms) {
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
    } catch (_) { return "no-camera"; }
    const video = $("#cam"), canvas = $("#frame"), ctx = canvas.getContext("2d");
    video.srcObject = stream;
    try { await video.play(); } catch (_) {}
    const until = Date.now() + ms;
    let result = "nobody";
    await wait(350); // the first frames out of a waking camera are dark
    while (Date.now() < until) {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const res = await api.arrivalFace(canvas.toDataURL("image/jpeg", 0.7));
        if (res?.faces > 0) { result = "face"; break; }
        if (res?.ok === false && res?.error === "no-helper") { result = "no-camera"; break; }
      } catch (_) {}
      await wait(300);
    }
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    return result;
  }

  window.addEventListener("keydown", (e) => { if (e.key === "Escape") void finish({ skipped: true }); });

  const ICONS = {
    whatsapp: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5BE3A6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.1A8 8 0 1 1 20 12z"/></svg>',
    class: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C7BFF" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    due: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFB547" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l2.5 2.5L16 9"/><rect x="4" y="4" width="16" height="16" rx="4"/></svg>',
  };
  function renderRows(rows) {
    const box = $("#rows");
    box.textContent = "";
    for (const r of rows) {
      const row = document.createElement("div"); row.className = "row";
      const ico = document.createElement("div"); ico.className = "ico"; ico.innerHTML = ICONS[r.kind] || ICONS.due;
      const text = document.createElement("span"); text.textContent = r.text;
      row.append(ico, text); box.append(row);
    }
    // The island grows to hold exactly these rows.
    SIZES.summary = { ...SIZES.recognised, h: SIZES.recognised.h + rows.length * 40 + 14 };
  }

  let finished = false;
  async function finish(outcome) {
    if (finished) return; finished = true;
    go("rest");
    await wait(650);
    api.arrivalDone?.(outcome);
  }

  async function run() {
    const info = await api.arrivalInit();
    sizes(info?.notch);
    go("rest");
    await wait(250);

    go("scanning");
    const seen = await lookForFace(7000);
    if (seen === "nobody") return finish({ face: "nobody" });

    // Touch ID first, the way you unlock anything. Nothing personal before it.
    let touch = "skipped";
    if (info?.touchId) {
      go("touchid");
      fp.classList.add("waiting");
      await wait(450);
      const res = await api.arrivalTouchID();
      touch = res?.result || "failed";
      fp.classList.remove("waiting");
      if (touch !== "ok") {
        $("#touchTitle").textContent = "Okay. Another time.";
        $("#touchLine").textContent = "Your Mac is open, I will stay quiet.";
        await wait(1400);
        return finish({ face: seen, touch });
      }
      fp.classList.add("done");
      await wait(650);
    }

    const sum = await api.arrivalSummary().catch(() => null);
    const rows = sum?.rows || [];
    $("#greet").textContent = sum?.title || "Welcome back.";
    $("#lead").textContent = sum?.lead || "Good to have you back.";
    renderRows(rows);

    go("recognised");
    await wait(1700);
    if (rows.length) {
      go("summary");
      await wait(2600 + rows.length * 900);
    }

    // Straight back into the notch, and Braino comes out of it to say hello.
    finish({ face: seen, touch });
  }

  run().catch(() => finish({ error: true }));
})();
