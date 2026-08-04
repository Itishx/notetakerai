import { useEffect, useRef } from "react";

/* ============================================================================
   HilTraceGraph — the Human Intelligence Layer thinking, as a firing graph.

   Five columns, left to right: command → goal → plan (one node per step) →
   the three ambiguity checks → verdict. The parent drives progress with
   `litCols` (how many columns have "thought" so far); a signal dot travels
   the lit stretch, check nodes flip green (clear) or amber (fired) once the
   check column lights, and the verdict node lands green (proceed) or amber
   (ask). Canvas technique adapted from EmotionNetwork.tsx, retinted for the
   black .bos shell and made prop-driven instead of auto-cycling.
   ============================================================================ */

export type HilChecks = {
  vague_referent: boolean;
  unresolved_person: boolean;
  delivery_fork: boolean;
};

// Light-canvas palette, matching apple.css tokens: the page is .apple (off-white),
// so this draws in near-black ink like EmotionNetwork does, not the dark-shell whites.
const GREEN: [number, number, number] = [58, 143, 95];    // --ap-green, proceed
const AMBER: [number, number, number] = [184, 132, 42];   // --ap-amber, ask
const BLUE: [number, number, number] = [47, 111, 237];    // --ap-blue, thinking
const INK = "29,29,31";

const COL_CAPTIONS = ["command", "goal", "plan", "checks", "verdict"];
const CHECK_LABELS = ["this / it", "person", "delivery"];

export default function HilTraceGraph({
  litCols,
  stepCount = 3,
  checks = null,
  verdict = null,
  vertical = false,
}: {
  litCols: number;                       // 0..5 — stages that have fired so far
  stepCount?: number;                    // plan stage's node count (2..5)
  checks?: HilChecks | null;             // known once the checks stage lights
  verdict?: "proceed" | "ask" | null;    // known once the verdict stage lights
  vertical?: boolean;                    // top-to-bottom "table of stages", not left-to-right
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef({ litCols, stepCount, checks, verdict });
  state.current = { litCols, stepCount, checks, verdict };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Vertical is a portrait design space: five stage-rows top to bottom, each
    // row's nodes spread out horizontally — a "table" of stages, not a diagram.
    const W = vertical ? 560 : 680, H = vertical ? 640 : 380;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.width * (H / W) * dpr;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    const t0 = performance.now();
    let raf = 0;
    const LABEL_COL = 108; // reserved left margin for the row label, vertical mode only

    const draw = (now: number) => {
      const el = (now - t0) / 1000;
      const { litCols: lit, stepCount: sc, checks: ck, verdict: vd } = state.current;
      // 1 at the floor, not 2: the server's parse-failure fallback returns a single step,
      // and the graph must not draw a node the Plan card isn't listing.
      const layers = [1, 1, Math.min(Math.max(sc, 1), 5), 3, 1];

      const stages = layers.map((n, li) => {
        if (vertical) {
          const y = 46 + (li / (layers.length - 1)) * (H - 46 - 40);
          const x0 = LABEL_COL + 24, x1 = W - 24;
          const gap = Math.min(74, (x1 - x0) / Math.max(1, n - 1));
          const cx = (x0 + x1) / 2;
          return Array.from({ length: n }, (_, i) => ({ x: cx + (i - (n - 1) / 2) * gap, y }));
        }
        const x = 70 + (li / (layers.length - 1)) * (W - 140);
        const gap = Math.min(58, (H - 130) / Math.max(1, n - 1));
        return Array.from({ length: n }, (_, i) => ({ x, y: (H - 40) / 2 + (i - (n - 1) / 2) * gap }));
      });

      const sx = canvas.width / W, sy = canvas.height / H;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(sx, sy);

      // Everything here is drawn in the fixed design space and then uniformly
      // scaled to the container, which would shrink baked-in font sizes in a
      // narrow column. fpx() pre-divides by that scale so a label asked for at
      // 11px lands at 11px on screen at any width. The 1.6x cap stops labels
      // from ballooning in design space (and colliding) on phones.
      const cssW = Math.max(canvas.width / dpr, 1);
      const fpx = (px: number) => Math.min((px * W) / cssW, px * 1.6);

      const acc = vd === "proceed" && lit >= 5 ? GREEN : vd === "ask" && lit >= 5 ? AMBER : BLUE;
      const accStr = `${acc[0]},${acc[1]},${acc[2]}`;

      // all edges, faint
      ctx.lineWidth = 1;
      for (let l = 0; l < stages.length - 1; l++) {
        const litEdge = l + 1 < lit;
        ctx.strokeStyle = litEdge ? `rgba(${accStr},0.45)` : `rgba(${INK},0.10)`;
        for (const a of stages[l]) for (const b of stages[l + 1]) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }

      // the signal running the lit stretch (stage centers, in sequence)
      if (!reduce && lit >= 2) {
        const centers = stages.slice(0, lit).map((s) => ({
          x: s.reduce((sum, n) => sum + n.x, 0) / s.length,
          y: s.reduce((sum, n) => sum + n.y, 0) / s.length,
        }));
        const segs = centers.length - 1;
        const prog = (el * 0.7) % segs;
        const si = Math.floor(prog), f = prog - si;
        const a = centers[si], b = centers[si + 1];
        const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
        ctx.fillStyle = `rgba(${accStr},0.95)`;
        ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${accStr},0.25)`;
        ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
      }

      // nodes
      stages.forEach((stage, li) => stage.forEach((n, ni) => {
        const isLit = li < lit;
        let node = isLit ? accStr : INK;
        let alpha = isLit ? 0.95 : 0.3;
        // check nodes get their own verdict color once the checks stage has fired
        if (li === 3 && isLit && ck) {
          const fired = [ck.vague_referent, ck.unresolved_person, ck.delivery_fork][ni];
          const c = fired ? AMBER : GREEN;
          node = `${c[0]},${c[1]},${c[2]}`;
          alpha = 0.95;
        }
        if (isLit) {
          ctx.fillStyle = `rgba(${node},0.18)`;
          ctx.beginPath(); ctx.arc(n.x, n.y, 13, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(${node},${alpha})`;
        ctx.beginPath(); ctx.arc(n.x, n.y, isLit ? 7 : 4.5, 0, Math.PI * 2); ctx.fill();

        // check-node labels
        if (li === 3) {
          ctx.fillStyle = isLit ? `rgba(${node},0.95)` : `rgba(${INK},0.62)`;
          ctx.font = `500 ${fpx(11)}px 'SF Pro Display',sans-serif`;
          if (vertical) { ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(CHECK_LABELS[ni], n.x, n.y + 16); }
          else { ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(CHECK_LABELS[ni], n.x + 16, n.y); }
        }
        // verdict label once known
        if (li === 4 && lit >= 5 && vd) {
          ctx.fillStyle = `rgba(${accStr},0.95)`;
          ctx.font = `700 ${fpx(13)}px 'SF Pro Display',sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText(vd, n.x, n.y + 18);
        }
      }));

      // stage captions — a left-hand label column (vertical) or a bottom row (horizontal)
      ctx.font = `600 ${fpx(11.5)}px 'SF Pro Display',sans-serif`;
      stages.forEach((stage, li) => {
        ctx.fillStyle = li < lit ? `rgba(${INK},0.9)` : `rgba(${INK},0.62)`;
        if (vertical) { ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(COL_CAPTIONS[li], LABEL_COL, stage[0].y); }
        else { ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(COL_CAPTIONS[li], stage[0].x, H - 14); }
      });

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [vertical]);

  return (
    <canvas
      ref={canvasRef}
      className="hil-trace-canvas"
      role="img"
      aria-label="The Human Intelligence Layer thinking: a command fires through goal, plan, and three ambiguity checks, landing on a proceed or ask verdict."
    />
  );
}
