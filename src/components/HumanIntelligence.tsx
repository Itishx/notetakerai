import { useEffect, useRef, useState } from "react";

/* ============================================================================
   HumanIntelligence — the "human intelligence layer" as a live graph. A vague
   request enters on the left; he pulls in what a person would (your screen,
   your memory, your chat, the time, where you are); those converge on a core
   that resolves the ambiguity; a specific action leaves on the right. The
   counterpart to the emotion engine — understanding, not feeling.
   ============================================================================ */

const EXAMPLES: { vague: string; resolved: string }[] = [
  { vague: "“book that”", resolved: "the one on your screen" },
  { vague: "“summarize this”", resolved: "the page you're reading" },
  { vague: "“remind me later”", resolved: "when you're back at your desk" },
  { vague: "“reply to her”", resolved: "the last person you texted" },
  { vague: "“play something”", resolved: "right where you left off" },
];
const CONTEXTS = ["Screen", "Memory", "Chat", "Time", "Location"];
const ACC = "47,111,237"; // blue — understanding, not feeling

function IntelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const W = 680, H = 460;
    const input = { x: 70, y: H / 2 };
    const core = { x: W * 0.68, y: H / 2 };
    const output = { x: W - 60, y: H / 2 };
    const ctxNodes = CONTEXTS.map((label, i) => ({ label, x: W * 0.36, y: 90 + (i * (H - 180)) / (CONTEXTS.length - 1) }));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => { const r = canvas.getBoundingClientRect(); canvas.width = r.width * dpr; canvas.height = r.width * (H / W) * dpr; };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);
    const t0 = performance.now();
    let raf = 0;

    const dot = (x: number, y: number, r: number, a: number) => { ctx.fillStyle = `rgba(${ACC},${a})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
    const edge = (a: { x: number; y: number }, b: { x: number; y: number }, alpha: number) => {
      ctx.strokeStyle = `rgba(${ACC},${alpha})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    };
    const flow = (a: { x: number; y: number }, b: { x: number; y: number }, p: number, r = 2.4) => {
      dot(a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p, r, 0.95);
    };

    const draw = (now: number) => {
      const el = (now - t0) / 1000;
      const sx = canvas.width / W, sy = canvas.height / H;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(sx, sy);
      ctx.font = "600 12px 'SF Pro Display', -apple-system, sans-serif";
      ctx.textBaseline = "middle";

      // edges: input → each context → core → output
      ctxNodes.forEach((n) => { edge(input, n, 0.14); edge(n, core, 0.14); });
      edge(core, output, 0.2);

      const beat = reduce ? 0.5 : Math.max(0, Math.sin(el * 2.4)) ** 2;

      // flowing pulses (staggered per context) input→ctx→core
      if (!reduce) ctxNodes.forEach((n, i) => {
        const ph = (el * 0.5 + i * 0.13) % 1;
        if (ph < 0.5) flow(input, n, ph / 0.5);
        else flow(n, core, (ph - 0.5) / 0.5);
      });
      // core → output pulse
      if (!reduce) { const op = (el * 0.5) % 1; flow(core, output, op, 3); }

      // input node + label
      dot(input.x, input.y, 6, 0.9);
      // context nodes + labels
      ctxNodes.forEach((n, i) => {
        const lit = reduce ? 0.6 : 0.35 + 0.55 * Math.max(0, Math.sin(el * 1.6 + i));
        dot(n.x, n.y, 7 + lit * 4, lit * 0.18);
        ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${ACC},${0.5 + lit * 0.5})`; ctx.stroke();
        ctx.fillStyle = "rgba(29,29,31,0.55)"; ctx.textAlign = "right"; ctx.fillText(n.label, n.x - 12, n.y);
      });
      // the understanding core (beats as context converges)
      const cr = 9 + beat * 5;
      dot(core.x, core.y, cr + 12, 0.22 + beat * 0.4);
      dot(core.x, core.y, cr, 0.95);
      ctx.fillStyle = "rgba(29,29,31,0.55)"; ctx.textAlign = "center"; ctx.fillText("understands", core.x, core.y + cr + 16);
      // output
      dot(output.x, output.y, 6.5, 0.95);

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className="apple-net" role="img" aria-label="Braino's human intelligence layer: a vague request pulls in your screen, memory, chat, time and location, converges on an understanding, and resolves to a specific action." />;
}

export default function HumanIntelligence({ caption = true }: { caption?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(t);
  }, []);
  const ex = EXAMPLES[i];
  return (
    <div className="apple-engine-live">
      {caption && (
        <div className="apple-engine-thought" aria-hidden="true">
          <span className="et-in">{ex.vague}</span>
          <span className="et-arrow">→</span>
          <span className="et-out">{ex.resolved}</span>
        </div>
      )}
      <IntelCanvas />
    </div>
  );
}
