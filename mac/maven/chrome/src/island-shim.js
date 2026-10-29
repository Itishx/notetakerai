/* The Mac island's window.maven, rebuilt on postMessage (2026-10-29).
   island.html/css/js are copied from the Mac app unchanged; this file is the
   only thing between them and Chrome. The page around us is the content
   script; it relays to the background worker. */
(() => {
  const handlers = { state: [], level: [], cardkey: [], anchor: [], say: [] };
  const up = (type, payload) => parent.postMessage({ __maven: "up", type, payload }, "*");
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || m.__maven !== "down") return;
    const list = handlers[m.type];
    if (list) for (const fn of list) { try { fn(m.payload); } catch (_) {} }
    if (m.type === "state") setTimeout(reportRect, 30);
    if (m.type === "talking") document.getElementById("island")?.classList.toggle("talking", Boolean(m.payload));
  });
  /* The page needs to know where the pill and card are, so the rest of the
     iframe can stay click-through. */
  function reportRect() {
    const rects = [];
    for (const sel of ["#island", "#cardwrap", "#note"]) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) rects.push({ x: r.left, y: r.top, w: r.width, h: r.height });
    }
    up("rects", rects);
  }
  setInterval(reportRect, 600);
  window.maven = {
    onState: (fn) => handlers.state.push(fn),
    onLevel: (fn) => handlers.level.push(fn),
    onCardKey: (fn) => handlers.cardkey.push(fn),
    onAnchor: (fn) => handlers.anchor.push(fn),
    onSay: (fn) => handlers.say.push(fn),
    hover: (over) => up("hover", Boolean(over)),
    action: (a) => up("action", a),
    card: (a) => up("card", a),
    drag: () => {},
  };
  /* Drag (2026-10-29): the Mac moves its window; here the page moves the
     frame. Pointer capture keeps the moves coming even past the frame's edge. */
  window.addEventListener("DOMContentLoaded", () => {
    const face = document.querySelector(".face");
    let sx = null;
    face.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; sx = e.screenX; face.setPointerCapture(e.pointerId); up("drag", { phase: "start" }); });
    face.addEventListener("pointermove", (e) => { if (sx != null) up("drag", { phase: "move", dx: e.screenX - sx }); });
    const end = (e) => { if (sx == null) return; up("drag", { phase: "end", dx: e.screenX - sx }); sx = null; };
    face.addEventListener("pointerup", end); face.addEventListener("pointercancel", end);
    // Easier to spot on any web page: a thin light ring round the resting pill.
    const st = document.createElement("style");
    st.textContent = "body:not(.l-char) .face{box-shadow:0 0 0 1.5px rgba(255,255,255,.5),0 0 0 3px rgba(0,0,0,.25),0 8px 22px rgba(0,0,0,.35)}"
      // Listening has to be unmissable on a busy web page: a brighter, thicker light and a warm halo.
      + "body:not(.l-char) #island.listening .edge,body:not(.l-char) #island.done .edge,body:not(.l-char) #island.thinking .edge{filter:brightness(1.5) saturate(1.3) drop-shadow(0 0 3px rgba(255,190,120,.9)) drop-shadow(0 0 8px rgba(255,150,90,.7))}"
      + "body.do:not(.l-char) #island.listening .edge{filter:brightness(1.5) drop-shadow(0 0 3px rgba(140,190,255,.95)) drop-shadow(0 0 9px rgba(90,150,255,.75))}"
      + "body:not(.l-char) #island.listening .face{box-shadow:0 0 0 2px rgba(255,200,140,.95),0 0 18px 4px rgba(255,150,90,.55),0 8px 22px rgba(0,0,0,.35)!important;animation:mvPulse 1.4s ease-in-out infinite}"
      + "body.do:not(.l-char) #island.listening .face{box-shadow:0 0 0 2px rgba(150,195,255,.95),0 0 18px 4px rgba(90,150,255,.55),0 8px 22px rgba(0,0,0,.35)!important}"
      + "@keyframes mvPulse{50%{scale:1.06}}";
    document.head.appendChild(st);
  });
  /* If focus is in here (you clicked the pill or a card), the shortcuts still work. */
  let fn = false;
  window.addEventListener("keydown", (e) => {
    if (e.key === "Fn" || e.key === "Function") fn = true;
    if (e.repeat || !["Control", "Alt", "Meta", "Fn"].includes(e.key)) return;
    const write = e.ctrlKey && e.altKey && !e.metaKey && !e.shiftKey;
    const doIt = !e.shiftKey && ((e.altKey && e.metaKey && !e.ctrlKey) || (e.ctrlKey && (fn || (e.getModifierState && e.getModifierState("Fn"))) && !e.altKey));
    if (write || doIt) { e.preventDefault(); up("key", write ? "write" : "do"); }
  }, true);
  window.addEventListener("keyup", (e) => { if (e.key === "Fn" || e.key === "Function") fn = false; }, true);
  up("ready", true);
})();
