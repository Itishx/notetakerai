"use strict";

/* The memory map as a mind ("Mind" look).
 *
 * The body is braino-os.js's anatomy, the "show me your mind" panel: a lit
 * filament mass grown from one seed, with its four fixed systems replaced by
 * the day's groups (Building, Messages, What I know...). Each group is a
 * lobe; its memories are the bright cells in it, named when you get close.
 *
 * 2026-09-30, Itish: a globe made no sense, a brain does; but keep the
 * globe's handling. So it moves like the Google Maps globe: drag turns it
 * any way, up and down included, with momentum; scroll zooms towards the
 * point under the pointer; double-click flies in; left alone it turns
 * slowly by itself, so things come to you. Tapping a lobe or a memory turns
 * the mind until it faces you and flies in.
 *
 * And it wears the Paper theme, not the old monospace HUD: warm paper and
 * ink, the page's own colours, Iowan names. On paper the filaments are ink;
 * in dark mode (the same Paper theme, dark) they glow, as Braino OS does.
 * memory.js talks to it through window.MemoryMind. */

(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hashOf = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  function mulberry32(seed) { let t = seed >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
  const css = (rgb, a) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a})`;
  const toRgb = (c) => {
    const s = String(c || "").trim();
    let m = s.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    m = s.match(/^rgba?\(([^)]+)\)/);
    if (m) return m[1].split(",").slice(0, 3).map((v) => parseFloat(v));
    return [120, 120, 120];
  };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── the body (from braino-os.js) ─────────────────────────────────────────
  function anchorFor(i, n) {
    const y = 1 - ((i + 0.5) / n) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = i * Math.PI * (3 - Math.sqrt(5)) + 0.6;
    return [Math.cos(th) * rr * 0.62, y * 0.56, Math.sin(th) * rr * 0.55];
  }
  function buildGraph(groups) {
    const rand = mulberry32(hashOf(groups.map((g) => g.id).join("|")) || 20260824);
    const nodes = [];
    const gaussian = () => { let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const push = (x, y, z, owner, lum, mem) => { nodes.push({ x, y, z, owner, lum, mem: mem || null, phase: rand() * TAU, rate: 0.6 + rand() * 1.5 }); return nodes.length - 1; };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
    const SWELLS = [];
    for (let i = 0; i < 9; i++) { const th = rand() * TAU, ph = Math.acos(2 * rand() - 1); SWELLS.push({ x: Math.sin(ph) * Math.cos(th), y: Math.sin(ph) * Math.sin(th), z: Math.cos(ph), w: 0.22 + rand() * 0.5, k: 1.6 + rand() * 3.4 }); }
    const surf = (ux, uy, uz) => { let r = 1; for (const s of SWELLS) r += s.w * Math.exp(-(1 - (ux * s.x + uy * s.y + uz * s.z)) * s.k); return r; };
    const CORE = 1300;
    for (let i = 0; i < CORE; i++) {
      const th = rand() * TAU, ph = Math.acos(2 * rand() - 1);
      const ux = Math.sin(ph) * Math.cos(th), uy = Math.sin(ph) * Math.sin(th), uz = Math.cos(ph);
      const r = 0.36 * surf(ux, uy, uz) * (1 + gaussian() * 0.09);
      push(ux * r * 1.06, uy * r * 0.88, uz * r * 0.97, null, rand() < 0.14 ? 0.85 + rand() * 0.15 : 0.25 + rand() * 0.4);
    }
    for (let i = 0; i < 450; i++) { const r = 0.24 * Math.cbrt(rand()), th = rand() * TAU, ph = Math.acos(2 * rand() - 1); push(r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph), null, 0.7 + rand() * 0.3); }
    const hubs = {}, cells = {};
    groups.forEach((g, gi) => {
      const [cx, cy, cz] = anchorFor(gi, groups.length);
      hubs[g.id] = push(cx, cy, cz, g.id, 1);
      const mass = 160 + Math.min(340, g.items.length * 34);
      for (let i = 0; i < mass; i++) {
        const pull = Math.pow(rand(), 1.7), sp = 0.3;
        push(cx * (1 - pull * 0.85) + gaussian() * sp, cy * (1 - pull * 0.85) + gaussian() * sp, cz * (1 - pull * 0.85) + gaussian() * sp * 0.8, g.id, rand() < 0.12 ? 0.9 + rand() * 0.1 : 0.2 + rand() * 0.45);
      }
      const maxW = Math.max(1, ...g.items.map((m) => m.weight || 1));
      g.items.forEach((m, mi) => {
        const d = 0.07 + 0.2 * (mi / Math.max(1, g.items.length)) + rand() * 0.04;
        const th = rand() * TAU, ph = Math.acos(2 * rand() - 1);
        cells[m.id] = push(cx + Math.sin(ph) * Math.cos(th) * d, cy + Math.sin(ph) * Math.sin(th) * d, cz + Math.cos(ph) * d * 0.8, g.id, 1,
          { id: m.id, label: m.label, size: 0.5 + Math.sqrt((m.weight || 1) / maxW), with: m.with || [] });
      });
    });
    const edges = [], seen = new Set();
    const link = (a, b, strut) => {
      if (a === b) return; const key = a < b ? a + ":" + b : b + ":" + a; if (seen.has(key)) return; seen.add(key);
      const owner = nodes[a].owner && nodes[a].owner === nodes[b].owner ? nodes[a].owner : null;
      edges.push({ a, b, strut, owner });
    };
    const CELL = 0.125, buckets = new Map();
    nodes.forEach((n, i) => { const k = `${Math.floor(n.x / CELL)},${Math.floor(n.y / CELL)},${Math.floor(n.z / CELL)}`; const l = buckets.get(k); if (l) l.push(i); else buckets.set(k, [i]); });
    nodes.forEach((node, i) => {
      const bx = Math.floor(node.x / CELL), by = Math.floor(node.y / CELL), bz = Math.floor(node.z / CELL);
      const near = [];
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const l = buckets.get(`${bx + dx},${by + dy},${bz + dz}`); if (!l) continue;
        for (const j of l) if (j !== i) near.push({ j, d: dist(node, nodes[j]) });
      }
      near.sort((p, q) => p.d - q.d);
      const want = node.mem ? 6 : node.owner ? 5 : 4;
      for (let k = 0; k < Math.min(want, near.length); k++) { if (near[k].d > CELL * 1.35) break; link(i, near[k].j, false); }
    });
    for (let i = 0; i < 26; i++) { const a = Math.floor(rand() * nodes.length), b = Math.floor(rand() * nodes.length), d = dist(nodes[a], nodes[b]); if (d >= 0.5 && d <= 1.05) link(a, b, true); }
    for (const g of groups) for (let i = 0; i < 12; i++) link(hubs[g.id], Math.floor(rand() * CORE), true);
    for (const g of groups) for (const m of g.items) link(hubs[g.id], cells[m.id], true);
    for (let i = 0; i < 34; i++) {
      let from = Math.floor(rand() * CORE);
      const dir = { x: nodes[from].x + gaussian() * 0.12, y: nodes[from].y + gaussian() * 0.12, z: nodes[from].z + gaussian() * 0.12 };
      const steps = 2 + Math.floor(rand() * 4);
      for (let s = 0; s < steps; s++) { const reach = 0.09 + rand() * 0.08; const next = push(nodes[from].x + dir.x * reach + gaussian() * 0.05, nodes[from].y + dir.y * reach + gaussian() * 0.05, nodes[from].z + dir.z * reach + gaussian() * 0.05, null, 0.3 + rand() * 0.5); link(from, next, false); from = next; }
    }
    const adjacency = nodes.map(() => []);
    edges.forEach((e) => { adjacency[e.a].push(e.b); adjacency[e.b].push(e.a); });
    return { nodes, edges, adjacency, hubs, cells };
  }
  function tracePath(graph, from, toward, maxSteps) {
    const target = graph.nodes[toward];
    const path = [from], visited = new Set([from]);
    let cur = from;
    for (let s = 0; s < maxSteps; s++) {
      const nb = graph.adjacency[cur]; if (!nb || !nb.length) break;
      let best = -1, bestScore = Infinity;
      for (const n of nb) { if (visited.has(n)) continue; const o = graph.nodes[n]; const sc = (o.x - target.x) ** 2 + (o.y - target.y) ** 2 + (o.z - target.z) ** 2 + Math.random() * 0.35; if (sc < bestScore) { bestScore = sc; best = n; } }
      if (best < 0) break; visited.add(best); path.push(best); cur = best; if (cur === toward) break;
    }
    return path;
  }

  // ── state ────────────────────────────────────────────────────────────────
  let host = null, canvas = null, ctx = null, glow = null, glowCtx = null, labels = null, capEl = null, footEl = null;
  let groups = [], byGroup = new Map(), graph = null;
  let running = false, focus = null, focusMem = null, pickCb = null, lit = null;
  let px, py, pd, flash;
  let width = 0, height = 0, dpr = 1, last = 0;
  // The view, globe-style: yaw and pitch turn the mind, zoom and pan frame it.
  const view = { yaw: 0.4, pitch: 0.18, zoom: 1, panX: 0, panY: 0, vyaw: 0, vpitch: 0 };
  let target = null, lastTouch = -1e9, drag = null;
  const pulses = [];
  let sinceFire = 0;
  const theme = { dark: false, bg: [244, 242, 236], ink: [22, 21, 15], ink3: [145, 141, 128] };
  let tint = [120, 120, 120];
  const groupLabels = new Map(), memLabels = new Map();
  let hitMem = [], hitHub = [];

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    theme.bg = toRgb(cs.getPropertyValue("--bg"));
    theme.ink = toRgb(cs.getPropertyValue("--ink"));
    theme.ink3 = toRgb(cs.getPropertyValue("--ink3"));
    theme.dark = (theme.bg[0] + theme.bg[1] + theme.bg[2]) / 3 < 110;
    tint = theme.dark ? [96, 190, 240] : theme.ink.slice();
  }

  const baseRadius = () => Math.min(width - leftRoom(), height - 120) * 0.4;
  const leftRoom = () => (host.closest(".split") || width < 760 ? 0 : 250);
  const center = () => [leftRoom() + (width - leftRoom()) / 2, (height - 120) / 2 + 12];
  const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  /* Turn the mind so a point of it faces you, and fly in. */
  function faceTo(n, zoom) {
    const yaw = Math.atan2(-n.x, n.z);
    const zf = Math.hypot(n.x, n.z);
    const pitch = Math.atan2(n.y, zf);
    target = { yaw: view.yaw + wrap(yaw - view.yaw), pitch: clamp(pitch, -1.3, 1.3), zoom, panX: 0, panY: 0 };
  }

  function el(tag, cls, parent) { const n = document.createElement(tag); if (cls) n.className = cls; if (parent) parent.appendChild(n); return n; }

  function mount(container) {
    host = el("div", "mm-root", container);
    canvas = el("canvas", "mm-canvas", host);
    ctx = canvas.getContext("2d");
    glow = document.createElement("canvas"); glowCtx = glow.getContext("2d");
    labels = el("div", "mm-labels", host);
    const bar = el("div", "mm-bar", host);
    el("span", "mm-title", bar).textContent = "Your mind today";
    footEl = el("div", "mm-foot", host);
    capEl = el("div", "mm-caption", host);
    el("div", "mm-hint", host).textContent = "Drag to turn it · scroll to zoom · double-click to fly in · tap anything to open it";

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
      view.vyaw = 0; view.vpitch = 0; target = null; lastTouch = performance.now();
      canvas.classList.add("grab");
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag) { hoverAt(e); return; }
      const R = Math.max(120, baseRadius() * view.zoom);
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(8, now - drag.t);
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
      if (e.shiftKey) { view.panX -= dx / view.zoom; view.panY -= dy / view.zoom; }
      else {
        view.yaw += dx / R * 1.4; view.pitch = clamp(view.pitch + dy / R * 1.4, -1.3, 1.3);
        view.vyaw = (dx / R * 1.4) / dt * 16; view.vpitch = (dy / R * 1.4) / dt * 16;
      }
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now; lastTouch = now;
    });
    const end = (e) => {
      if (!drag) return;
      const moved = drag.moved; drag = null; canvas.classList.remove("grab");
      if (performance.now() - lastTouch > 80) { view.vyaw = 0; view.vpitch = 0; }
      if (!moved) tapAt(e);
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    // Zoom towards the point under the pointer: that point stays put.
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const [mx, my] = localXY(e), [cx, cy] = center();
      const z0 = view.zoom, z1 = clamp(z0 * Math.exp(-e.deltaY * 0.0022), 0.6, 7);
      const wx = (mx - cx) / z0 + view.panX, wy = (my - cy) / z0 + view.panY;
      view.zoom = z1; view.panX = wx - (mx - cx) / z1; view.panY = wy - (my - cy) / z1;
      if (z1 < 1.05) { view.panX *= 0.8; view.panY *= 0.8; }
      target = null; lastTouch = performance.now();
    }, { passive: false });
    canvas.addEventListener("dblclick", (e) => {
      const [mx, my] = localXY(e), [cx, cy] = center();
      const z1 = Math.min(7, view.zoom * 1.9);
      const wx = (mx - cx) / view.zoom + view.panX, wy = (my - cy) / view.zoom + view.panY;
      target = { yaw: view.yaw, pitch: view.pitch, zoom: z1, panX: wx, panY: wy };
      lastTouch = performance.now();
    });
    new ResizeObserver(resize).observe(host);
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readTheme);
    readTheme(); resize();
  }
  function resize() {
    if (!host) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = host.clientWidth; height = host.clientHeight;
    canvas.width = Math.max(1, Math.floor(width * dpr)); canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = width + "px"; canvas.style.height = height + "px";
    glow.width = Math.max(1, Math.floor(width * 0.25)); glow.height = Math.max(1, Math.floor(height * 0.25));
  }
  function localXY(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  function pickAt(mx, my) {
    let best = null, bd = 16;
    for (const h of hitMem) { const d = Math.hypot(h.x - mx, h.y - my); if (d < bd) { bd = d; best = h.id; } }
    if (best) return best;
    bd = 50;
    for (const h of hitHub) { const d = Math.hypot(h.x - mx, h.y - my); if (d < bd) { bd = d; best = h.id; } }
    return best;
  }
  function tapAt(e) { const [mx, my] = localXY(e); const id = pickAt(mx, my); if (id) pickCb && pickCb(id); }
  function hoverAt(e) { const [mx, my] = localXY(e); canvas.style.cursor = pickAt(mx, my) ? "pointer" : "grab"; }

  function buildLabels() {
    labels.innerHTML = ""; groupLabels.clear(); memLabels.clear();
    for (const g of groups) {
      const b = el("button", "mm-glabel", labels); b.type = "button"; b.style.setProperty("--gc", css(g.rgb, 1));
      el("span", "mm-gname", b).textContent = g.label;
      if (g.sub) el("span", "mm-gsub", b).textContent = g.sub;
      b.addEventListener("click", (e) => { e.stopPropagation(); pickCb && pickCb(g.id); });
      groupLabels.set(g.id, b);
      for (const m of g.items) {
        const t = el("button", "mm-mlabel", labels); t.type = "button";
        t.textContent = m.label; t.style.setProperty("--c", css(g.rgb, 1));
        t.addEventListener("click", (e) => { e.stopPropagation(); pickCb && pickCb(m.id); });
        memLabels.set(m.id, { el: t, group: g.id, label: m.label });
      }
    }
  }

  function fire(fromIdx, toIdx, color, hot) {
    const path = tracePath(graph, fromIdx, toIdx, hot ? 34 : 22);
    if (path.length < 3) return;
    pulses.push({ path, head: 0, speed: (hot ? 15 : 9) + Math.random() * 6, color, width: hot ? 2.1 : 1.5 });
  }

  function draw(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!graph || !width) { requestAnimationFrame(draw); return; }
    const { nodes, edges } = graph, count = nodes.length;
    const dark = theme.dark;

    // Motion: a fly-to, else momentum, else a slow turn of its own.
    if (target) {
      const k = 1 - Math.pow(0.004, dt);
      view.yaw += (target.yaw - view.yaw) * k; view.pitch += (target.pitch - view.pitch) * k;
      view.zoom += (target.zoom - view.zoom) * k; view.panX += (target.panX - view.panX) * k; view.panY += (target.panY - view.panY) * k;
      if (Math.abs(target.yaw - view.yaw) < 0.002 && Math.abs(target.zoom - view.zoom) < 0.01 && Math.abs(target.panX - view.panX) < 0.5) target = null;
    } else if (!drag) {
      view.yaw += view.vyaw; view.pitch = clamp(view.pitch + view.vpitch, -1.3, 1.3);
      view.vyaw *= Math.pow(0.06, dt); view.vpitch *= Math.pow(0.06, dt);
      if (!reduce && now - lastTouch > 3500 && !focus) view.yaw += dt * 0.12 / Math.sqrt(view.zoom);
    }
    const fg = focus && byGroup.get(focus);
    const tt = fg ? fg.rgb : dark ? [96, 190, 240] : theme.ink;
    for (let c = 0; c < 3; c++) tint[c] += (tt[c] - tint[c]) * (1 - Math.pow(0.03, dt));

    const [cx, cy] = center(), R = baseRadius();
    const cY = Math.cos(view.yaw), sY = Math.sin(view.yaw), cP = Math.cos(view.pitch), sP = Math.sin(view.pitch);
    const Z = view.zoom;
    for (let i = 0; i < count; i++) {
      const n = nodes[i];
      const br = reduce ? 1 : 1 + Math.sin(now / 1000 * n.rate + n.phase) * 0.022;
      const x0 = n.x * br, y0 = n.y * br, z0 = n.z * br;
      const x1 = x0 * cY + z0 * sY, z1 = -x0 * sY + z0 * cY;
      const y1 = y0 * cP - z1 * sP, z2 = y0 * sP + z1 * cP;
      const persp = 2.6 / (2.6 - z2 * 0.85);
      px[i] = cx + (x1 * R * persp - view.panX) * Z;
      py[i] = cy + (y1 * R * persp - view.panY) * Z;
      pd[i] = clamp((z2 + 1.1) / 2.2, 0, 1);
      if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt * 1.6);
    }

    // Ground. On paper the mind is drawn in ink; in dark it glows.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = css(theme.bg, 1); ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
    const hazeFade = 1 / (1 + Math.max(0, Z - 1) * 1.6);
    const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * Z * 1.9);
    haze.addColorStop(0, css(tint, ((dark ? 0.16 : 0.07) * hazeFade).toFixed(3)));
    haze.addColorStop(0.5, css(tint, ((dark ? 0.05 : 0.025) * hazeFade).toFixed(3)));
    haze.addColorStop(1, css(tint, 0));
    ctx.fillStyle = haze; ctx.fillRect(0, 0, width, height);

    // Filaments.
    const B = 6, paths = []; for (let b = 0; b < B; b++) paths.push(new Path2D());
    const own = new Map();
    for (const e of edges) {
      const ax = px[e.a], ay = py[e.a], bx = px[e.b], by = py[e.b];
      if ((ax < -80 && bx < -80) || (ax > width + 80 && bx > width + 80) || (ay < -80 && by < -80) || (ay > height + 80 && by > height + 80)) continue;
      const depth = (pd[e.a] + pd[e.b]) / 2;
      let s = (e.strut ? 0.16 : 0.78) * (0.35 + depth * 0.9);
      if (focus && e.owner !== focus) s *= 0.3;
      if (e.owner && (!focus || e.owner === focus)) {
        let p = own.get(e.owner); if (!p) { p = [new Path2D(), new Path2D()]; own.set(e.owner, p); }
        const k = s > 0.5 ? 1 : 0; p[k].moveTo(ax, ay); p[k].lineTo(bx, by); continue;
      }
      const k = Math.min(B - 1, Math.max(0, Math.floor(s * B)));
      paths[k].moveTo(ax, ay); paths[k].lineTo(bx, by);
    }
    const strand = dark ? mix(tint, [205, 236, 255], 0.3) : mix(theme.ink, theme.bg, 0.15);
    for (let b = 0; b < B; b++) {
      const t = (b + 0.5) / B;
      ctx.strokeStyle = css(strand, ((dark ? 0.07 + t * 0.44 : 0.04 + t * 0.24)).toFixed(3));
      ctx.lineWidth = t > 0.7 ? 1.1 : 0.7; ctx.stroke(paths[b]);
    }
    const litGroups = new Set();
    if (lit) for (const [id, v] of memLabels) if (lit.has(id)) litGroups.add(v.group);
    for (const [id, [soft, strong]] of own) {
      const g = byGroup.get(id); if (!g) continue;
      const dim = lit && !lit.has(id) && !litGroups.has(id) ? 0.35 : 1;
      ctx.strokeStyle = css(g.rgb, ((dark ? 0.16 : 0.2) * dim).toFixed(3)); ctx.lineWidth = 0.75; ctx.stroke(soft);
      ctx.strokeStyle = css(g.rgb, ((dark ? 0.34 : 0.42) * dim).toFixed(3)); ctx.lineWidth = 1.1; ctx.stroke(strong);
    }

    // Cells; memories are the bright ones.
    hitMem = []; hitHub = [];
    for (let i = 0; i < count; i++) {
      const n = nodes[i], x = px[i], y = py[i];
      if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue;
      if (focus && n.owner && n.owner !== focus && !n.mem) continue;
      if (!n.mem && n.lum < 0.5 && flash[i] <= 0) continue;
      const tw = 0.75 + 0.25 * Math.sin(now / 700 * n.rate + n.phase);
      let a = n.lum * tw * (0.25 + pd[i] * 0.8);
      if (focus && !n.owner) a *= 0.45;
      if (n.mem && focus && n.owner !== focus) a *= 0.25;
      if (n.mem && lit && !lit.has(n.mem.id) && !lit.has(n.owner)) a *= 0.3;
      const f = flash[i]; if (f > 0) a = Math.min(1.6, a + f * 1.5);
      if (a < 0.06) continue;
      const g = n.owner ? byGroup.get(n.owner) : null;
      const col = g ? g.rgb : strand;
      if (n.mem) {
        const r = (2.4 + n.mem.size * 2.6) * (0.6 + pd[i] * 0.7) * Math.sqrt(Z) * (1 + f * 0.6);
        const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
        halo.addColorStop(0, css(col, ((dark ? 0.55 : 0.28) * Math.min(1, a)).toFixed(3))); halo.addColorStop(1, css(col, 0));
        ctx.fillStyle = halo; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
        ctx.fillStyle = css(dark ? mix(col, [255, 255, 255], 0.35) : col, Math.min(1, a).toFixed(3));
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        if (!dark) { ctx.strokeStyle = css(theme.bg, (0.9 * Math.min(1, a)).toFixed(3)); ctx.lineWidth = 1.2; ctx.stroke(); }
        if (pd[i] > 0.3) hitMem.push({ id: n.mem.id, x, y, z: pd[i] });
      } else {
        const size = (n.lum > 0.8 ? 1.5 : 1) * (0.6 + pd[i] * 0.9) * (1 + f * 1.8) * (dark ? 1 : 0.9);
        ctx.fillStyle = css(col, (Math.min(1, a) * (dark ? 1 : 0.7)).toFixed(3)); ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
    for (const g of groups) { const i = graph.hubs[g.id]; hitHub.push({ id: g.id, x: px[i], y: py[i], z: pd[i] }); }
    if (!focus && dark) {
      const coreR = R * 0.62 * Z, ox = cx - view.panX * Z, oy = cy - view.panY * Z;
      const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, coreR);
      core.addColorStop(0, css(mix(tint, [255, 255, 255], 0.8), 0.3)); core.addColorStop(0.5, css(tint, 0.08)); core.addColorStop(1, css(tint, 0));
      ctx.fillStyle = core; ctx.fillRect(0, 0, width, height);
    }

    // Signals: between lobes, and out to the memories you are looking at.
    sinceFire += dt;
    if (!reduce && sinceFire > (lit || fg ? 0.12 : 0.3) && groups.length) {
      sinceFire = 0;
      const from = fg || groups[Math.floor(Math.random() * groups.length)];
      if ((fg || lit) && from.items.length && Math.random() < 0.7) {
        const pool = lit ? from.items.filter((m) => lit.has(m.id)) : from.items;
        const list = pool.length ? pool : from.items;
        fire(graph.hubs[from.id], graph.cells[list[Math.floor(Math.random() * list.length)].id], from.rgb, true);
      } else {
        let to = groups[Math.floor(Math.random() * groups.length)]; if (to === from && groups.length > 1) to = groups[(groups.indexOf(from) + 1) % groups.length];
        fire(graph.hubs[from.id], graph.hubs[to.id], from.rgb, false);
      }
    }
    for (let p = pulses.length - 1; p >= 0; p--) {
      const pu = pulses[p]; pu.head += pu.speed * dt;
      const hi = Math.floor(pu.head);
      if (hi >= pu.path.length - 1) { flash[pu.path[pu.path.length - 1]] = 1; pulses.splice(p, 1); continue; }
      const TAIL = 7;
      for (let t = 0; t < TAIL; t++) {
        const i = hi - t; if (i < 0 || i >= pu.path.length - 1) continue;
        const a = pu.path[i], b = pu.path[i + 1], fade = Math.pow(1 - t / TAIL, 1.7);
        ctx.strokeStyle = css(pu.color, (fade * (dark ? 0.85 : 0.75)).toFixed(3)); ctx.lineWidth = pu.width * fade + 0.4;
        ctx.beginPath(); ctx.moveTo(px[a], py[a]); ctx.lineTo(px[b], py[b]); ctx.stroke();
        if (t === 0) flash[b] = 1;
      }
      const h = pu.path[hi];
      const bl = ctx.createRadialGradient(px[h], py[h], 0, px[h], py[h], 20);
      bl.addColorStop(0, css(pu.color, dark ? 0.5 : 0.3)); bl.addColorStop(1, css(pu.color, 0));
      ctx.fillStyle = bl; ctx.fillRect(px[h] - 20, py[h] - 20, 40, 40);
    }
    // Bloom, only where it can glow.
    if (dark) {
      glowCtx.globalCompositeOperation = "copy"; glowCtx.filter = "blur(2px)";
      glowCtx.drawImage(canvas, 0, 0, glow.width, glow.height); glowCtx.filter = "none";
      ctx.save(); ctx.globalAlpha = 0.85 / (1 + Math.max(0, Z - 1) * 0.7); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(glow, 0, 0, width, height); ctx.restore();
    }

    // Names: lobes that face you; memories when close, inside their lobe, or lit.
    // Nothing is named under the day strip or the Today card.
    const strip = document.getElementById("ribbon");
    const floor = strip && !strip.hidden ? strip.getBoundingClientRect().top - host.getBoundingClientRect().top - 8 : height - 20;
    const wall = leftRoom();
    const placed = [];
    if (focusMem && memLabels.has(focusMem)) {
      const i = graph.cells[focusMem], v = memLabels.get(focusMem);
      if (pd[i] > 0.2) placed.push({ id: focusMem, x: px[i] + 9, y: py[i] - 10, w: Math.min(190, v.label.length * 6.6 + 18), h: 22 });
    }
    for (const g of groups) {
      const i = graph.hubs[g.id], L = groupLabels.get(g.id); if (!L) continue;
      const vis = pd[i] > 0.28 && px[i] > wall && px[i] < width - 60 && py[i] > 20 && py[i] < floor - 30;
      L.style.pointerEvents = vis ? "auto" : "none";
      L.style.transform = `translate(${px[i].toFixed(1)}px, ${py[i].toFixed(1)}px)`;
      const fade = clamp((pd[i] - 0.28) * 3, 0, 1);
      if (!vis) { L.style.opacity = "0"; continue; }
      const stepAside = focusMem && focus === g.id;
      L.style.opacity = String(stepAside ? 0 : fade * (focus && focus !== g.id ? 0.3 : lit && !lit.has(g.id) && !litGroups.has(g.id) ? 0.45 : 1));
      if (stepAside) { L.style.pointerEvents = "none"; continue; }
      L.classList.toggle("on", focus === g.id);
      if (vis) placed.push({ x: px[i], y: py[i] - 14, w: 20 + g.label.length * 8, h: 44 });
    }
    const close = Z > 1.8;
    const shown = new Set(placed.filter((q) => q.id).map((q) => q.id));
    for (const q of placed) if (q.id) memLabels.get(q.id).el.style.transform = `translate(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px)`;
    const order = [...memLabels.entries()].map(([id, v]) => ({ id, v, i: graph.cells[id] })).sort((a, b) => pd[b.i] - pd[a.i]);
    for (const { id, v, i } of order) {
      const want = close || (focus && v.group === focus) || (lit && lit.has(id));
      if (shown.has(id) || !want || pd[i] < 0.35 || px[i] < wall || px[i] > width - 40 || py[i] < 20 || py[i] > floor - 22) continue;
      const box = { x: px[i] + 9, y: py[i] - 10, w: Math.min(190, v.label.length * 6.6 + 18), h: 22 };
      if (placed.some((q) => box.x < q.x + q.w && q.x < box.x + box.w && box.y < q.y + q.h && q.y < box.y + box.h)) continue;
      placed.push(box); shown.add(id);
      v.el.style.transform = `translate(${box.x.toFixed(1)}px, ${box.y.toFixed(1)}px)`;
    }
    for (const [id, v] of memLabels) v.el.classList.toggle("show", shown.has(id));
    requestAnimationFrame(draw);
  }

  window.MemoryMind = {
    mount(container) { if (!host) mount(container); },
    /* groups: [{ id, label, sub, color, items: [{ id, label, weight, with }] }] */
    setData(next) {
      const sig = JSON.stringify(next.map((g) => [g.id, g.items.map((m) => m.id)]));
      const names = JSON.stringify(next.map((g) => [g.label, g.sub, g.color, g.items.map((m) => m.label)]));
      groups = next.map((g) => ({ ...g, rgb: toRgb(g.color) }));
      byGroup = new Map(groups.map((g) => [g.id, g]));
      if (host) readTheme();
      if (sig !== this._sig || !graph) {
        this._sig = sig;
        graph = buildGraph(groups);
        const n = graph.nodes.length;
        px = new Float32Array(n); py = new Float32Array(n); pd = new Float32Array(n); flash = new Float32Array(n);
        pulses.length = 0; this._names = "";
      }
      if (labels && names !== this._names) { this._names = names; buildLabels(); }
      if (focus && !byGroup.has(focus)) focus = null;
      if (footEl) footEl.textContent = `${groups.length} parts of your day`;
    },
    start() { if (running) return; running = true; last = 0; if (host) readTheme(); resize(); requestAnimationFrame(draw); },
    stop() { running = false; },
    /* Turn to a lobe, or to a memory in it, and fly in; or pull back out. */
    focus(id) {
      if (!graph) return;
      const g = byGroup.get(id);
      const cell = !g ? graph.cells[id] : null;
      focusMem = cell != null ? id : null;
      if (g) { focus = g.id; faceTo(graph.nodes[graph.hubs[g.id]], 2.3); }
      else if (cell != null) { focus = graph.nodes[cell].owner; faceTo(graph.nodes[cell], 3.2); }
      else { focus = null; target = { yaw: view.yaw, pitch: view.pitch, zoom: 1, panX: 0, panY: 0 }; }
    },
    light(ids) { lit = ids && ids.size ? ids : null; },
    caption(text, photo) {
      if (!capEl) return;
      capEl.textContent = "";
      if (photo) { const img = document.createElement("img"); img.src = photo; img.alt = ""; capEl.appendChild(img); }
      capEl.appendChild(document.createTextNode(text || ""));
      capEl.classList.toggle("show", Boolean(text));
    },
    onPick(cb) { pickCb = cb; },
  };
})();
