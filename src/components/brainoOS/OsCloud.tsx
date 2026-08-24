import { useCallback, useEffect, useRef } from "react";
import {
  buildGraph,
  SUBSYSTEMS,
  tracePath,
  type Graph,
  type SubsystemId,
} from "./osGraph";

/* Braino OS, drawn.
 *
 * Everything is additive: filaments are laid down with `lighter` compositing so
 * that where many of them cross, the canvas burns toward white on its own. That
 * is what gives the core its heat without painting a fake blob in the middle,
 * and it is the single thing that makes this read like the reference plates
 * rather than like a network diagram.
 *
 * Edges are batched into a handful of brightness buckets and stroked once per
 * bucket. Stroking four thousand individual paths a frame is what kills canvas;
 * stroking six is free.
 */

type Props = {
  focus: SubsystemId | null;
  onPick: (id: SubsystemId | null) => void;
  onHubs: (hubs: { id: SubsystemId; x: number; y: number; depth: number }[]) => void;
  /* 0..1. Rises while Braino is thinking or speaking; the whole mass leans into
     it, which is how you can tell from across the room that he is working. */
  energy: number;
  thinking: boolean;
  reducedMotion: boolean;
};

type Pulse = {
  path: number[];
  head: number;
  speed: number;
  color: [number, number, number];
  width: number;
};

const CORE_COLOR: [number, number, number] = [150, 226, 255];

export default function OsCloud({ focus, onPick, onHubs, energy, thinking, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const focusRef = useRef<SubsystemId | null>(focus);
  const energyRef = useRef(energy);
  const thinkingRef = useRef(thinking);
  const reducedRef = useRef(reducedMotion);
  const zoomRef = useRef(1);
  const hitRef = useRef<{ id: SubsystemId; x: number; y: number; r: number }[]>([]);
  const onPickRef = useRef(onPick);
  const onHubsRef = useRef(onHubs);

  focusRef.current = focus;
  energyRef.current = energy;
  thinkingRef.current = thinking;
  reducedRef.current = reducedMotion;
  onPickRef.current = onPick;
  onHubsRef.current = onHubs;

  if (!graphRef.current) graphRef.current = buildGraph();

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    const next = zoomRef.current * (event.deltaY > 0 ? 0.92 : 1.08);
    zoomRef.current = Math.min(6, Math.max(0.65, next));
  }, []);

  const handleClick = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    let picked: SubsystemId | null = null;
    let best = Infinity;
    for (const hub of hitRef.current) {
      const d = Math.hypot(hub.x - mx, hub.y - my);
      if (d < hub.r && d < best) {
        best = d;
        picked = hub.id;
      }
    }
    onPickRef.current(picked);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const graph = graphRef.current;
    if (!canvas || !graph) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("click", handleClick);

    /* Bloom. The reference plates glow because light bleeds; filaments drawn at
       one pixel wide never will, however bright you make them. So the finished
       frame is copied down to half resolution, blurred, and added back under
       itself. This is the single change that takes it from a network diagram to
       something that looks lit from inside. */
    const glow = document.createElement("canvas");
    const glowCtx = glow.getContext("2d");

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      glow.width = Math.max(1, Math.floor(width * 0.25));
      glow.height = Math.max(1, Math.floor(height * 0.25));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const { nodes, edges } = graph;
    const count = nodes.length;
    const px = new Float32Array(count);
    const py = new Float32Array(count);
    const pd = new Float32Array(count); // depth 0..1, 1 = nearest
    const flash = new Float32Array(count);

    /* Camera. Targets are set from the focus; the live values chase them with a
       critically damped feel, which is the whole "fly into it" gesture. */
    const cam = { x: 0, y: 0, scale: 1, tx: 0, ty: 0, tscale: 1 };
    let spin = 0;
    let tilt = 0;
    const pulses: Pulse[] = [];
    let last = performance.now();
    let sinceFire = 0;
    let raf = 0;

    const systemById = new Map(SUBSYSTEMS.map((s) => [s.id, s]));

    const firePulse = (fromId: SubsystemId, toId: SubsystemId, hot: boolean) => {
      const from = graph.hubs[fromId];
      const to = graph.hubs[toId];
      const path = tracePath(graph, from, to, hot ? 34 : 22);
      if (path.length < 3) return;
      const system = systemById.get(fromId);
      pulses.push({
        path,
        head: 0,
        speed: (hot ? 15 : 9) + Math.random() * 6,
        color: system ? system.color : CORE_COLOR,
        width: hot ? 2.1 : 1.5,
      });
    };

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const reduced = reducedRef.current;
      const nrg = energyRef.current;
      const focused = focusRef.current;

      /* Rotation slows right down once you are inside something, so that going
         in feels like leaning closer rather than being spun around. */
      const spinRate = reduced ? 0.02 : (focused ? 0.045 : 0.13) * (1 + nrg * 0.5);
      spin += dt * spinRate;
      tilt = Math.sin(now / 7000) * 0.22;

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.33;

      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      // Project once; everything below reads these arrays.
      for (let i = 0; i < count; i += 1) {
        const n = nodes[i];
        const breathe = reduced
          ? 1
          : 1 + Math.sin(now / 1000 * n.rate + n.phase) * (0.022 + nrg * 0.05);
        const x0 = n.x * breathe;
        const y0 = n.y * breathe;
        const z0 = n.z * breathe;
        // Yaw then pitch.
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

      // Camera targets follow the focused system's live projected position.
      if (focused) {
        const hub = graph.hubs[focused];
        cam.tx += ((px[hub] - cx) / cam.scale + cam.x - cam.tx) * 0.12;
        cam.ty += ((py[hub] - cy) / cam.scale + cam.y - cam.ty) * 0.12;
        cam.tscale = 2.9 * zoomRef.current;
      } else {
        cam.tx += (0 - cam.tx) * 0.08;
        cam.ty += (0 - cam.ty) * 0.08;
        cam.tscale = 1 * zoomRef.current;
      }
      const ease = reduced ? 1 : 1 - Math.pow(0.0016, dt);
      cam.x += (cam.tx - cam.x) * ease;
      cam.y += (cam.ty - cam.y) * ease;
      cam.scale += (cam.tscale - cam.scale) * ease;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#02050a";
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";

      /* The haze the mass sits in. Without it the filaments float on flat black
         and the whole thing looks like line art. */
      const hazeFade = 1 / (1 + Math.max(0, cam.scale - 1) * 1.6);
      const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.4);
      haze.addColorStop(0, `rgba(70,160,225,${((0.16 + nrg * 0.12) * hazeFade).toFixed(3)})`);
      haze.addColorStop(0.45, `rgba(30,90,150,${(0.05 * hazeFade).toFixed(3)})`);
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);

      // Filaments, bucketed by brightness so this is six strokes, not thousands.
      const BUCKETS = 6;
      const paths: Path2D[] = [];
      for (let b = 0; b < BUCKETS; b += 1) paths.push(new Path2D());
      const dim = focused ? 0.32 : 1;

      for (let e = 0; e < edges.length; e += 1) {
        const edge = edges[e];
        const ax = px[edge.a];
        const ay = py[edge.a];
        const bx = px[edge.b];
        const by = py[edge.b];
        // Cheap cull; zoomed in this throws away most of the work.
        if (
          (ax < -80 && bx < -80) ||
          (ax > width + 80 && bx > width + 80) ||
          (ay < -80 && by < -80) ||
          (ay > height + 80 && by > height + 80)
        ) {
          continue;
        }
        const depth = (pd[edge.a] + pd[edge.b]) / 2;
        let strength = edge.strut ? 0.16 : 0.78;
        strength *= 0.35 + depth * 0.9;
        if (focused && edge.owner !== focused) strength *= dim;
        const bucket = Math.min(BUCKETS - 1, Math.max(0, Math.floor(strength * BUCKETS)));
        const path = paths[bucket];
        path.moveTo(ax, ay);
        path.lineTo(bx, by);
      }

      for (let b = 0; b < BUCKETS; b += 1) {
        const t = (b + 0.5) / BUCKETS;
        ctx.strokeStyle = `rgba(${52 + Math.round(t * 60)},${150 + Math.round(t * 85)},${205 + Math.round(t * 50)},${(0.07 + t * 0.44).toFixed(3)})`;
        ctx.lineWidth = t > 0.7 ? 1.15 : 0.75;
        ctx.stroke(paths[b]);
      }

      // Node lights.
      for (let i = 0; i < count; i += 1) {
        const n = nodes[i];
        const x = px[i];
        const y = py[i];
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue;
        const owned = n.owner;
        if (focused && owned && owned !== focused) continue;
        if (n.lum < 0.5 && flash[i] <= 0) continue;
        const twinkle = reduced ? 1 : 0.75 + 0.25 * Math.sin(now / 700 * n.rate + n.phase);
        let a = n.lum * twinkle * (0.25 + pd[i] * 0.8);
        if (focused && !owned) a *= 0.45;
        const f = flash[i];
        if (f > 0) a = Math.min(1.6, a + f * 1.5);
        if (a < 0.06) continue;
        const colour = owned ? (systemById.get(owned)?.color ?? CORE_COLOR) : CORE_COLOR;
        const size = (n.lum > 0.8 ? 1.5 : 1) * (0.6 + pd[i] * 0.9) * (1 + f * 1.8);
        ctx.fillStyle = `rgba(${colour[0]},${colour[1]},${colour[2]},${Math.min(1, a).toFixed(3)})`;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }

      /* The centre. A hot little sun that answers to how hard he is working. */
      if (!focused) {
        const coreR = radius * (0.62 + nrg * 0.14) * cam.scale;
        const core = ctx.createRadialGradient(cx - cam.x * cam.scale, cy - cam.y * cam.scale, 0, cx - cam.x * cam.scale, cy - cam.y * cam.scale, coreR);
        core.addColorStop(0, `rgba(232,250,255,${0.34 + nrg * 0.26})`);
        core.addColorStop(0.18, `rgba(150,225,255,${0.22 + nrg * 0.18})`);
        core.addColorStop(0.5, `rgba(70,170,240,${0.09 + nrg * 0.08})`);
        core.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = core;
        ctx.fillRect(0, 0, width, height);
      }

      /* Firing. A pulse lights a run of filament and leaves a decaying tail, so
         you see a signal moving through tissue rather than a dot on a wire. */
      sinceFire += dt;
      const interval = thinkingRef.current ? 0.09 : 0.34 - nrg * 0.18;
      if (!reduced && sinceFire > interval) {
        sinceFire = 0;
        const ids = SUBSYSTEMS.map((s) => s.id);
        const from = focused ?? ids[Math.floor(Math.random() * ids.length)];
        let to = ids[Math.floor(Math.random() * ids.length)];
        if (to === from) to = ids[(ids.indexOf(from) + 1) % ids.length];
        firePulse(from, to, thinkingRef.current || nrg > 0.4);
      }

      for (let p = pulses.length - 1; p >= 0; p -= 1) {
        const pulse = pulses[p];
        pulse.head += pulse.speed * dt;
        const headIndex = Math.floor(pulse.head);
        if (headIndex >= pulse.path.length - 1) {
          pulses.splice(p, 1);
          continue;
        }
        const [r, g, b] = pulse.color;
        const TAIL = 7;
        for (let t = 0; t < TAIL; t += 1) {
          const i = headIndex - t;
          if (i < 0 || i >= pulse.path.length - 1) continue;
          const a = pulse.path[i];
          const bIdx = pulse.path[i + 1];
          const fade = (1 - t / TAIL) ** 1.7;
          ctx.strokeStyle = `rgba(${r},${g},${b},${(fade * 0.85).toFixed(3)})`;
          ctx.lineWidth = pulse.width * fade + 0.4;
          ctx.beginPath();
          ctx.moveTo(px[a], py[a]);
          ctx.lineTo(px[bIdx], py[bIdx]);
          ctx.stroke();
          if (t === 0) flash[bIdx] = 1;
        }
        // A bloom on the head, so the signal has a bright nose.
        const headNode = pulse.path[headIndex];
        const glow = ctx.createRadialGradient(px[headNode], py[headNode], 0, px[headNode], py[headNode], 22);
        glow.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(px[headNode] - 22, py[headNode] - 22, 44, 44);
      }

      if (glowCtx) {
        glowCtx.globalCompositeOperation = "copy";
        glowCtx.filter = "blur(2px)";
        glowCtx.drawImage(canvas, 0, 0, glow.width, glow.height);
        glowCtx.filter = "none";
        ctx.save();
        ctx.globalAlpha = 0.9 / (1 + Math.max(0, cam.scale - 1) * 0.7);
        ctx.globalCompositeOperation = "lighter";
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(glow, 0, 0, width, height);
        ctx.restore();
        ctx.globalCompositeOperation = "lighter";
      }

      // Hub positions, for labels and for hit testing.
      const hubs = SUBSYSTEMS.map((s) => {
        const i = graph.hubs[s.id];
        return { id: s.id, x: px[i], y: py[i], depth: pd[i] };
      });
      hitRef.current = hubs.map((h) => ({ id: h.id, x: h.x, y: h.y, r: 58 }));
      onHubsRef.current(hubs);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("click", handleClick);
    };
  }, [handleClick, handleWheel]);

  // Pulling back out resets the manual zoom, so the gesture is always the same.
  useEffect(() => {
    if (!focus) zoomRef.current = 1;
  }, [focus]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair" />;
}
