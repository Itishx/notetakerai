import { useEffect, useRef, useState } from "react";
import {
  MOMENT_ORDER, MOMENT_LABEL, MOMENT_CUES, ORDERED_TRAITS, type Moment,
} from "@/lib/emotional-engine-viz";

/* ============================================================================
   EmotionNetwork — Braino's emotion engine as a dense, firing neural network
   (no heart, no hardware body). A message enters on the left, cascades through
   fully-connected hidden layers of trait nodes, the ones that lead on the
   moment light up, and a response resolves on the right. Ambient pulses fire
   continuously so it reads as a live, complex net. Auto-cycles real moments.
   ============================================================================ */

const NET_ACCENTS: Partial<Record<Moment, [number, number, number]>> = {
  grief: [107, 82, 196], heartbreak: [217, 100, 91], venting: [184, 132, 42],
  anxiety: [47, 111, 237], celebration: [58, 143, 95], conflict: [217, 100, 91],
  banter: [58, 143, 95], focused_task: [47, 111, 237], building: [107, 82, 196],
  crisis: [217, 100, 91],
};

const LAYERS = [1, 5, 7, 9, 7, 5, 1]; // input · hidden ×5 (dense) · output

function NetCanvas({ moment }: { moment: Moment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const momentRef = useRef(moment);
  momentRef.current = moment;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const W = 680, H = 460;
    const cols = LAYERS.map((n, li) => {
      const x = 70 + (li / (LAYERS.length - 1)) * (W - 140);
      const gap = Math.min(54, (H - 90) / Math.max(1, n - 1));
      return Array.from({ length: n }, (_, i) => ({ x, y: H / 2 + (i - (n - 1) / 2) * gap }));
    });
    type Node = { x: number; y: number };
    const edges: { a: Node; b: Node }[] = [];
    for (let l = 0; l < cols.length - 1; l++)
      for (const a of cols[l]) for (const b of cols[l + 1]) edges.push({ a, b });

    // ambient pulses on random edges, always left→right
    const pulses = Array.from({ length: 30 }, () => ({ e: Math.floor(Math.random() * edges.length), p: Math.random(), sp: 0.006 + Math.random() * 0.014 }));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => { const r = canvas.getBoundingClientRect(); canvas.width = r.width * dpr; canvas.height = r.width * (H / W) * dpr; };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);
    const t0 = performance.now();
    let raf = 0;

    // per-moment lit path: one node per hidden layer, deterministic by moment
    const litPath = (mi: number): Node[] => {
      const path: Node[] = [cols[0][0]];
      for (let l = 1; l < cols.length - 1; l++) path.push(cols[l][(mi * 3 + l * 2) % cols[l].length]);
      path.push(cols[cols.length - 1][0]);
      return path;
    };

    const draw = (now: number) => {
      const el = (now - t0) / 1000;
      const sx = canvas.width / W, sy = canvas.height / H;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(sx, sy);

      const m = momentRef.current;
      const mi = Math.max(0, MOMENT_ORDER.indexOf(m));
      const [rr, gg, bb] = NET_ACCENTS[m] || [217, 100, 91];
      const acc = `${rr},${gg},${bb}`;
      const path = litPath(mi);
      const litSet = new Set(path);

      // edges — visible on white
      ctx.lineWidth = 1;
      edges.forEach((e) => {
        ctx.strokeStyle = "rgba(29,29,31,0.10)";
        ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke();
      });

      // lit path edges (brighter, moment-tinted)
      ctx.lineWidth = 2;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        if (!a || !b) continue;
        ctx.strokeStyle = `rgba(${acc},0.5)`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // ambient pulses
      if (!reduce) pulses.forEach((pu) => {
        pu.p += pu.sp; if (pu.p > 1) { pu.p = 0; pu.e = Math.floor(Math.random() * edges.length); }
        const e = edges[pu.e];
        if (!e) return;
        const x = e.a.x + (e.b.x - e.a.x) * pu.p, y = e.a.y + (e.b.y - e.a.y) * pu.p;
        ctx.fillStyle = `rgba(${acc},0.6)`; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
      });

      // the signal running the lit path
      if (!reduce) {
        const segs = path.length - 1;
        const prog = (el * 0.5) % segs;
        const si = Math.floor(prog), f = prog - si;
        const a = path[si], b = path[si + 1];
        if (a && b) {
          const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
          ctx.fillStyle = `rgba(${acc},0.95)`; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(${acc},0.28)`; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
        }
      }

      // nodes — solid dots so the graph reads clearly on white
      cols.forEach((col, li) => col.forEach((n) => {
        const lit = litSet.has(n);
        if (lit) { ctx.fillStyle = `rgba(${acc},0.20)`; ctx.beginPath(); ctx.arc(n.x, n.y, 13, 0, Math.PI * 2); ctx.fill(); }
        ctx.beginPath(); ctx.arc(n.x, n.y, lit ? 7 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = lit ? `rgba(${acc},0.95)` : "rgba(29,29,31,0.30)"; ctx.fill();
        if (li === 0) { ctx.fillStyle = "rgba(29,29,31,0.55)"; ctx.font = "600 12px 'SF Pro Display',sans-serif"; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText("message", n.x - 14, n.y); }
        if (li === cols.length - 1) { ctx.fillStyle = `rgba(${acc},0.95)`; ctx.font = "600 12px 'SF Pro Display',sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("response", n.x + 14, n.y); }
      }));

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="apple-net" role="img" aria-label="Braino's emotion engine as a dense neural network: a message enters, fires through trait layers, the leading traits light up, and a response resolves." />;
}

export default function EmotionNetwork({
  caption = true,
  moment: controlledMoment,
}: {
  caption?: boolean;
  moment?: Moment;
}) {
  const moments = MOMENT_ORDER.filter((m) => m !== "neutral");
  const [i, setI] = useState(0);
  useEffect(() => {
    if (controlledMoment) return;
    const t = setInterval(() => setI((n) => (n + 1) % moments.length), 2600);
    return () => clearInterval(t);
  }, [controlledMoment, moments.length]);
  const moment: Moment = controlledMoment || moments[i];
  const cue = MOMENT_CUES[moment]?.[0] || "";
  return (
    <div className="apple-engine-live">
      {caption && (
        <div className="apple-engine-thought" aria-hidden="true">
          {cue ? (
            <>
              <span className="et-in">{cue}</span>
              <span className="et-arrow">→</span>
              <span className="et-out">{MOMENT_LABEL[moment].replace(/^an? /, "")}</span>
            </>
          ) : <span>reading the moment…</span>}
        </div>
      )}
      <NetCanvas moment={moment} />
    </div>
  );
}
