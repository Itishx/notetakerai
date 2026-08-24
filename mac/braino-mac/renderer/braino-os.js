"use strict";

/* Braino OS, inside the Mac app.
 *
 * Not a web page in a window. This draws into the overlay Braino already owns,
 * which is why it can take the whole screen with nothing else on it, work with
 * the network off, and let him talk over it in the same voice he always uses.
 *
 * The geometry and the drawing are a port of the website surface at /os, kept
 * deliberately identical so the app and the browser are never two different
 * pictures of the same anatomy. Plain script, no framework: this file is loaded
 * by renderer/index.html alongside the notch.
 *
 * Everything is additive. Filaments are laid down with `lighter` compositing so
 * that where many cross, the canvas burns toward white on its own, and the
 * finished frame is copied down small, blurred and added back underneath itself.
 * That bloom is what makes it read as lit from inside rather than as line art.
 */

(function () {
  const SUBSYSTEMS = [
    {
      id: "mind",
      label: "THE MIND",
      role: "Reasons, routes, decides",
      parts: ["reasoning", "router", "planner", "delegate", "tools"],
      color: [168, 232, 255],
      at: [0.02, -0.6, 0.1],
    },
    {
      id: "heart",
      label: "THE HEART",
      role: "Feels, and colours everything else",
      parts: ["traits", "moments", "tone", "restraint", "warmth"],
      color: [255, 138, 176],
      at: [-0.62, 0.28, -0.16],
    },
    {
      id: "ears",
      label: "THE EARS",
      role: "Hears, always, before anything happens",
      parts: ["wake", "capture", "transcribe", "silence", "intent"],
      color: [122, 255, 214],
      at: [0.64, 0.25, 0.14],
    },
    {
      id: "memory",
      label: "THE MEMORY",
      role: "Keeps what matters, forgets what does not",
      parts: ["capture", "recall", "people", "places", "decay"],
      color: [186, 158, 255],
      at: [-0.04, 0.66, -0.06],
    },
  ];
  const CORE_COLOR = [150, 226, 255];

  /* Deterministic, so the shape of Braino OS is the same body every time it
     opens. One that rearranges itself reads as noise, not as anatomy. */
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t = (t + 0x6d2b79f5) >>> 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildGraph(seed) {
    const rand = mulberry32(seed || 20260824);
    const nodes = [];
    const gaussian = () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = rand();
      while (v === 0) v = rand();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    const push = (x, y, z, owner, lum) => {
      nodes.push({ x, y, z, owner, lum, phase: rand() * Math.PI * 2, rate: 0.6 + rand() * 1.5 });
      return nodes.length - 1;
    };
    const distance = (a, b) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    /* The outline. Periodic lumps produced something that read as a snowflake,
       so the radius is pushed out by a handful of randomly placed swellings
       instead and nothing repeats. */
    const SWELLS = [];
    for (let i = 0; i < 9; i += 1) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      SWELLS.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        weight: 0.22 + rand() * 0.5,
        tightness: 1.6 + rand() * 3.4,
      });
    }
    const SQUASH = { x: 1.06, y: 0.88, z: 0.97 };
    const surfaceRadius = (ux, uy, uz) => {
      let r = 1;
      for (const s of SWELLS) r += s.weight * Math.exp(-(1 - (ux * s.x + uy * s.y + uz * s.z)) * s.tightness);
      return r;
    };

    const CORE = 1900;
    for (let i = 0; i < CORE; i += 1) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const ux = Math.sin(phi) * Math.cos(theta);
      const uy = Math.sin(phi) * Math.sin(theta);
      const uz = Math.cos(phi);
      const r = 0.36 * surfaceRadius(ux, uy, uz) * (1 + gaussian() * 0.09);
      push(ux * r * SQUASH.x, uy * r * SQUASH.y, uz * r * SQUASH.z, null,
        rand() < 0.14 ? 0.85 + rand() * 0.15 : 0.25 + rand() * 0.4);
    }
    // The knot that makes the middle burn white instead of being a hole.
    for (let i = 0; i < 700; i += 1) {
      const r = 0.24 * Math.cbrt(rand());
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi),
        null, 0.7 + rand() * 0.3);
    }

    const hubs = {};
    for (const system of SUBSYSTEMS) {
      const cx = system.at[0];
      const cy = system.at[1];
      const cz = system.at[2];
      hubs[system.id] = push(cx, cy, cz, system.id, 1);
      for (let i = 0; i < 500; i += 1) {
        const pull = Math.pow(rand(), 1.7);
        const spread = 0.4;
        push(
          cx * (1 - pull * 0.85) + gaussian() * spread,
          cy * (1 - pull * 0.85) + gaussian() * spread,
          cz * (1 - pull * 0.85) + gaussian() * spread * 0.8,
          system.id,
          rand() < 0.12 ? 0.9 + rand() * 0.1 : 0.2 + rand() * 0.45,
        );
      }
    }

    const edges = [];
    const seen = new Set();
    const link = (a, b, strut) => {
      if (a === b) return;
      const key = a < b ? a + ":" + b : b + ":" + a;
      if (seen.has(key)) return;
      seen.add(key);
      const owner = nodes[a].owner && nodes[a].owner === nodes[b].owner ? nodes[a].owner : null;
      edges.push({ a, b, strut, owner });
    };

    const CELL = 0.125;
    const buckets = new Map();
    nodes.forEach((n, i) => {
      const key = Math.floor(n.x / CELL) + "," + Math.floor(n.y / CELL) + "," + Math.floor(n.z / CELL);
      const list = buckets.get(key);
      if (list) list.push(i);
      else buckets.set(key, [i]);
    });
    nodes.forEach((node, i) => {
      const bx = Math.floor(node.x / CELL);
      const by = Math.floor(node.y / CELL);
      const bz = Math.floor(node.z / CELL);
      const near = [];
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            const list = buckets.get((bx + dx) + "," + (by + dy) + "," + (bz + dz));
            if (!list) continue;
            for (const j of list) {
              if (j !== i) near.push({ j, d: distance(node, nodes[j]) });
            }
          }
        }
      }
      near.sort((p, q) => p.d - q.d);
      const wanted = node.owner ? 5 : 4;
      for (let k = 0; k < Math.min(wanted, near.length); k += 1) {
        if (near[k].d > CELL * 1.35) break;
        link(i, near[k].j, false);
      }
    });

    // Scaffolding. A few of these give scale; many turn it into wool.
    for (let i = 0; i < 26; i += 1) {
      const a = Math.floor(rand() * nodes.length);
      const b = Math.floor(rand() * nodes.length);
      const d = distance(nodes[a], nodes[b]);
      if (d < 0.5 || d > 1.05) continue;
      link(a, b, true);
    }
    for (const system of SUBSYSTEMS) {
      for (let i = 0; i < 14; i += 1) link(hubs[system.id], Math.floor(rand() * CORE), true);
    }

    // The wisps trailing off the surface, which is most of what makes it look
    // grown rather than generated.
    for (let i = 0; i < 34; i += 1) {
      let from = Math.floor(rand() * CORE);
      const dir = { x: nodes[from].x + gaussian() * 0.12, y: nodes[from].y + gaussian() * 0.12, z: nodes[from].z + gaussian() * 0.12 };
      const steps = 2 + Math.floor(rand() * 4);
      for (let step = 0; step < steps; step += 1) {
        const reach = 0.09 + rand() * 0.08;
        const next = push(
          nodes[from].x + dir.x * reach + gaussian() * 0.05,
          nodes[from].y + dir.y * reach + gaussian() * 0.05,
          nodes[from].z + dir.z * reach + gaussian() * 0.05,
          null, 0.3 + rand() * 0.5,
        );
        link(from, next, false);
        from = next;
      }
    }

    const adjacency = nodes.map(() => []);
    edges.forEach((e) => { adjacency[e.a].push(e.b); adjacency[e.b].push(e.a); });
    return { nodes, edges, adjacency, hubs };
  }

  /* A firing path walks real filaments toward a target, which is what makes it
     read as a signal moving through something rather than a dot on a wire. */
  function tracePath(graph, from, toward, maxSteps) {
    const target = graph.nodes[toward];
    const path = [from];
    const visited = new Set([from]);
    let current = from;
    for (let step = 0; step < maxSteps; step += 1) {
      const neighbours = graph.adjacency[current];
      if (!neighbours || !neighbours.length) break;
      let best = -1;
      let bestScore = Infinity;
      for (const n of neighbours) {
        if (visited.has(n)) continue;
        const node = graph.nodes[n];
        const dx = node.x - target.x;
        const dy = node.y - target.y;
        const dz = node.z - target.z;
        const score = dx * dx + dy * dy + dz * dz + Math.random() * 0.35;
        if (score < bestScore) { bestScore = score; best = n; }
      }
      if (best < 0) break;
      visited.add(best);
      path.push(best);
      current = best;
      if (current === toward) break;
    }
    return path;
  }

  // ── The surface ──────────────────────────────────────────────────────────
  let root = null;
  let canvas = null;
  let ctx = null;
  let glow = null;
  let glowCtx = null;
  let labelLayer = null;
  let panel = null;
  let statusEl = null;
  let footEl = null;
  let captionEl = null;
  let graph = null;
  let raf = 0;
  let open = false;
  let focus = null;
  let zoom = 1;
  let energy = 0;
  let thinking = false;
  let hits = [];
  const labelEls = new Map();

  function el(tag, className, parent) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  function build() {
    root = el("div", "bos-root");
    root.setAttribute("aria-hidden", "true");
    canvas = el("canvas", "bos-canvas", root);
    ctx = canvas.getContext("2d", { alpha: false });
    glow = document.createElement("canvas");
    glowCtx = glow.getContext("2d");
    labelLayer = el("div", "bos-labels", root);

    const chrome = el("div", "bos-chrome", root);
    const bar = el("div", "bos-bar", chrome);
    const title = el("span", "bos-title", bar);
    title.textContent = "BRAINO O.S.";
    el("div", "bos-rule", bar);
    const ticks = el("div", "bos-ticks", bar);
    for (let i = 0; i < 5; i += 1) el("span", null, ticks);
    const frame = el("div", "bos-frame", chrome);
    for (const corner of ["tl", "tr", "bl", "br"]) el("span", "bos-corner bos-" + corner, frame);
    footEl = el("div", "bos-foot", chrome);
    footEl.textContent = "FOUR SYSTEMS / ONE MIND";
    statusEl = el("div", "bos-status", chrome);
    statusEl.textContent = "IDLE";

    panel = el("div", "bos-panel", root);
    captionEl = el("div", "bos-caption", root);
    captionEl.textContent = "SAY WHAT YOU WANT TO SEE / CLICK A SYSTEM TO GO INSIDE / SCROLL TO ZOOM / ESC TO LEAVE";

    for (const system of SUBSYSTEMS) {
      const label = el("button", "bos-label", labelLayer);
      label.type = "button";
      label.style.color = "rgb(" + system.color.join(",") + ")";
      const name = el("span", "bos-label-name", label);
      name.textContent = system.label;
      el("span", "bos-label-rule", label);
      label.addEventListener("click", (event) => {
        event.stopPropagation();
        setFocus(focus === system.id ? null : system.id);
      });
      labelEls.set(system.id, label);
    }

    canvas.addEventListener("click", (event) => {
      const rect = canvas.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      let picked = null;
      let best = Infinity;
      for (const hit of hits) {
        const d = Math.hypot(hit.x - mx, hit.y - my);
        if (d < 58 && d < best) { best = d; picked = hit.id; }
      }
      setFocus(picked);
    });
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoom = Math.min(6, Math.max(0.65, zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
    }, { passive: false });

    document.body.appendChild(root);
  }

  function renderPanel() {
    if (!panel) return;
    const system = SUBSYSTEMS.find((s) => s.id === focus);
    if (!system) { panel.classList.remove("is-open"); panel.innerHTML = ""; return; }
    panel.innerHTML = "";
    const head = el("div", "bos-panel-title", panel);
    head.textContent = system.label;
    head.style.color = "rgb(" + system.color.join(",") + ")";
    const role = el("p", "bos-panel-role", panel);
    role.textContent = system.role;
    const list = el("ul", "bos-panel-parts", panel);
    for (const part of system.parts) {
      const item = el("li", null, list);
      el("span", "bos-dash", item);
      item.appendChild(document.createTextNode(part));
    }
    const back = el("button", "bos-back", panel);
    back.type = "button";
    back.textContent = "PULL BACK";
    back.addEventListener("click", (event) => { event.stopPropagation(); setFocus(null); });
    panel.classList.add("is-open");
  }

  function setFocus(next) {
    focus = next || null;
    if (!focus) zoom = 1;
    renderPanel();
    if (footEl) {
      const system = SUBSYSTEMS.find((s) => s.id === focus);
      footEl.textContent = system ? system.label : "FOUR SYSTEMS / ONE MIND";
    }
  }

  function start() {
    if (!graph) graph = buildGraph();
    const nodes = graph.nodes;
    const edges = graph.edges;
    const count = nodes.length;
    const px = new Float32Array(count);
    const py = new Float32Array(count);
    const pd = new Float32Array(count);
    const flash = new Float32Array(count);
    const cam = { x: 0, y: 0, scale: 1, tx: 0, ty: 0, tscale: 1 };
    const pulses = [];
    let spin = 0;
    let last = performance.now();
    let sinceFire = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const systemById = new Map(SUBSYSTEMS.map((s) => [s.id, s]));

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = root.clientWidth;
      height = root.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      glow.width = Math.max(1, Math.floor(width * 0.25));
      glow.height = Math.max(1, Math.floor(height * 0.25));
    };
    resize();
    window.addEventListener("resize", resize);

    const fire = (fromId, toId, hot) => {
      const path = tracePath(graph, graph.hubs[fromId], graph.hubs[toId], hot ? 34 : 22);
      if (path.length < 3) return;
      const system = systemById.get(fromId);
      pulses.push({
        path, head: 0,
        speed: (hot ? 15 : 9) + Math.random() * 6,
        color: system ? system.color : CORE_COLOR,
        width: hot ? 2.1 : 1.5,
      });
    };

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const nrg = energy;

      const spinRate = (focus ? 0.045 : 0.13) * (1 + nrg * 0.5);
      spin += dt * spinRate;
      const tilt = Math.sin(now / 7000) * 0.22;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.33;
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      for (let i = 0; i < count; i += 1) {
        const n = nodes[i];
        const breathe = 1 + Math.sin(now / 1000 * n.rate + n.phase) * (0.022 + nrg * 0.05);
        const x0 = n.x * breathe;
        const y0 = n.y * breathe;
        const z0 = n.z * breathe;
        const x1 = x0 * cosS + z0 * sinS;
        const z1 = -x0 * sinS + z0 * cosS;
        const y1 = y0 * cosT - z1 * sinT;
        const z2 = y0 * sinT + z1 * cosT;
        const persp = 2.6 / (2.6 - z2 * 0.85);
        px[i] = cx + x1 * radius * persp * cam.scale - cam.x * cam.scale;
        py[i] = cy + y1 * radius * persp * cam.scale - cam.y * cam.scale;
        pd[i] = Math.min(1, Math.max(0, (z2 + 1.1) / 2.2));
        if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt * 1.9);
      }

      if (focus) {
        const hub = graph.hubs[focus];
        cam.tx += ((px[hub] - cx) / cam.scale + cam.x - cam.tx) * 0.12;
        cam.ty += ((py[hub] - cy) / cam.scale + cam.y - cam.ty) * 0.12;
        cam.tscale = 2.9 * zoom;
      } else {
        cam.tx += (0 - cam.tx) * 0.08;
        cam.ty += (0 - cam.ty) * 0.08;
        cam.tscale = zoom;
      }
      const ease = 1 - Math.pow(0.0016, dt);
      cam.x += (cam.tx - cam.x) * ease;
      cam.y += (cam.ty - cam.y) * ease;
      cam.scale += (cam.tscale - cam.scale) * ease;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#02050a";
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const hazeFade = 1 / (1 + Math.max(0, cam.scale - 1) * 1.6);
      const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.4);
      haze.addColorStop(0, "rgba(70,160,225," + ((0.16 + nrg * 0.12) * hazeFade).toFixed(3) + ")");
      haze.addColorStop(0.45, "rgba(30,90,150," + (0.05 * hazeFade).toFixed(3) + ")");
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);

      const BUCKETS = 6;
      const paths = [];
      for (let b = 0; b < BUCKETS; b += 1) paths.push(new Path2D());
      for (let e = 0; e < edges.length; e += 1) {
        const edge = edges[e];
        const ax = px[edge.a];
        const ay = py[edge.a];
        const bx = px[edge.b];
        const by = py[edge.b];
        if ((ax < -80 && bx < -80) || (ax > width + 80 && bx > width + 80)
          || (ay < -80 && by < -80) || (ay > height + 80 && by > height + 80)) continue;
        const depth = (pd[edge.a] + pd[edge.b]) / 2;
        let strength = edge.strut ? 0.16 : 0.78;
        strength *= 0.35 + depth * 0.9;
        if (focus && edge.owner !== focus) strength *= 0.32;
        const bucket = Math.min(BUCKETS - 1, Math.max(0, Math.floor(strength * BUCKETS)));
        paths[bucket].moveTo(ax, ay);
        paths[bucket].lineTo(bx, by);
      }
      for (let b = 0; b < BUCKETS; b += 1) {
        const t = (b + 0.5) / BUCKETS;
        ctx.strokeStyle = "rgba(" + (52 + Math.round(t * 60)) + "," + (150 + Math.round(t * 85)) + ","
          + (205 + Math.round(t * 50)) + "," + (0.07 + t * 0.44).toFixed(3) + ")";
        ctx.lineWidth = t > 0.7 ? 1.15 : 0.75;
        ctx.stroke(paths[b]);
      }

      for (let i = 0; i < count; i += 1) {
        const n = nodes[i];
        const x = px[i];
        const y = py[i];
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue;
        if (focus && n.owner && n.owner !== focus) continue;
        if (n.lum < 0.5 && flash[i] <= 0) continue;
        const twinkle = 0.75 + 0.25 * Math.sin(now / 700 * n.rate + n.phase);
        let a = n.lum * twinkle * (0.25 + pd[i] * 0.8);
        if (focus && !n.owner) a *= 0.45;
        const f = flash[i];
        if (f > 0) a = Math.min(1.6, a + f * 1.5);
        if (a < 0.06) continue;
        const colour = n.owner ? (systemById.get(n.owner) || {}).color || CORE_COLOR : CORE_COLOR;
        const size = (n.lum > 0.8 ? 1.5 : 1) * (0.6 + pd[i] * 0.9) * (1 + f * 1.8);
        ctx.fillStyle = "rgba(" + colour[0] + "," + colour[1] + "," + colour[2] + "," + Math.min(1, a).toFixed(3) + ")";
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }

      if (!focus) {
        const coreR = radius * (0.62 + nrg * 0.14) * cam.scale;
        const ox = cx - cam.x * cam.scale;
        const oy = cy - cam.y * cam.scale;
        const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, coreR);
        core.addColorStop(0, "rgba(232,250,255," + (0.34 + nrg * 0.26).toFixed(3) + ")");
        core.addColorStop(0.18, "rgba(150,225,255," + (0.22 + nrg * 0.18).toFixed(3) + ")");
        core.addColorStop(0.5, "rgba(70,170,240," + (0.09 + nrg * 0.08).toFixed(3) + ")");
        core.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, width, height);
      }

      sinceFire += dt;
      const interval = thinking ? 0.09 : 0.34 - nrg * 0.18;
      if (sinceFire > interval) {
        sinceFire = 0;
        const ids = SUBSYSTEMS.map((s) => s.id);
        const from = focus || ids[Math.floor(Math.random() * ids.length)];
        let to = ids[Math.floor(Math.random() * ids.length)];
        if (to === from) to = ids[(ids.indexOf(from) + 1) % ids.length];
        fire(from, to, thinking || nrg > 0.4);
      }

      for (let p = pulses.length - 1; p >= 0; p -= 1) {
        const pulse = pulses[p];
        pulse.head += pulse.speed * dt;
        const headIndex = Math.floor(pulse.head);
        if (headIndex >= pulse.path.length - 1) { pulses.splice(p, 1); continue; }
        const r = pulse.color[0];
        const g = pulse.color[1];
        const b = pulse.color[2];
        const TAIL = 7;
        for (let t = 0; t < TAIL; t += 1) {
          const i = headIndex - t;
          if (i < 0 || i >= pulse.path.length - 1) continue;
          const a = pulse.path[i];
          const bIdx = pulse.path[i + 1];
          const fade = Math.pow(1 - t / TAIL, 1.7);
          ctx.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + (fade * 0.85).toFixed(3) + ")";
          ctx.lineWidth = pulse.width * fade + 0.4;
          ctx.beginPath();
          ctx.moveTo(px[a], py[a]);
          ctx.lineTo(px[bIdx], py[bIdx]);
          ctx.stroke();
          if (t === 0) flash[bIdx] = 1;
        }
        const head = pulse.path[headIndex];
        const bloom = ctx.createRadialGradient(px[head], py[head], 0, px[head], py[head], 22);
        bloom.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",0.5)");
        bloom.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = bloom;
        ctx.fillRect(px[head] - 22, py[head] - 22, 44, 44);
      }

      if (glowCtx) {
        glowCtx.globalCompositeOperation = "copy";
        glowCtx.filter = "blur(2px)";
        glowCtx.drawImage(canvas, 0, 0, glow.width, glow.height);
        glowCtx.filter = "none";
        ctx.save();
        ctx.globalAlpha = 0.9 / (1 + Math.max(0, cam.scale - 1) * 0.7);
        ctx.globalCompositeOperation = "lighter";
        ctx.drawImage(glow, 0, 0, width, height);
        ctx.restore();
      }

      hits = [];
      for (const system of SUBSYSTEMS) {
        const i = graph.hubs[system.id];
        hits.push({ id: system.id, x: px[i], y: py[i] });
        const label = labelEls.get(system.id);
        if (!label) continue;
        label.style.left = px[i] + "px";
        label.style.top = py[i] + "px";
        label.style.opacity = focus && focus !== system.id ? "0.2" : String(0.7 + pd[i] * 0.3);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
  }

  const api = {
    open(system) {
      if (!root) build();
      if (!raf) start();
      open = true;
      root.classList.add("is-open");
      setFocus(system || null);
      // The overlay is click-through until something on it needs the mouse.
      try { window.brainoMac && window.brainoMac.setMousePassthrough(false); } catch (_) {}
      return true;
    },
    close() {
      if (!root) return false;
      open = false;
      root.classList.remove("is-open");
      setFocus(null);
      try { window.brainoMac && window.brainoMac.setMousePassthrough(true); } catch (_) {}
      return true;
    },
    isOpen() { return open; },
    focus(system) { if (open) setFocus(system || null); },
    /* Driven from the voice pipeline, so the mass leans into the light while he
       is thinking and burns while he speaks. */
    setState(state) {
      energy = Math.max(0, Math.min(1, Number(state && state.energy) || 0));
      thinking = Boolean(state && state.thinking);
      if (statusEl) statusEl.textContent = (state && state.label) || "IDLE";
      if (statusEl) statusEl.dataset.live = state && state.live ? "1" : "0";
    },
    say(text) {
      if (!captionEl) return;
      captionEl.textContent = String(text || "");
    },
  };

  window.__brainoOs = api;
})();
