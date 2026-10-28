/* The Mac island's window.maven, rebuilt on postMessage (2026-10-29).
   island.html/css/js are copied from the Mac app unchanged; this file is the
   only thing between them and Chrome. The page around us is the content
   script; it relays to the background worker. */
(() => {
  const handlers = { state: [], level: [], cardkey: [], anchor: [] };
  const up = (type, payload) => parent.postMessage({ __maven: "up", type, payload }, "*");
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || m.__maven !== "down") return;
    const list = handlers[m.type];
    if (list) for (const fn of list) { try { fn(m.payload); } catch (_) {} }
    if (m.type === "state") setTimeout(reportRect, 30);
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
    hover: (over) => up("hover", Boolean(over)),
    action: (a) => up("action", a),
    card: (a) => up("card", a),
    drag: () => {},
  };
  up("ready", true);
})();
