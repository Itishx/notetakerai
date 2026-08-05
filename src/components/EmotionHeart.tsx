import { useEffect, useRef, useState } from "react";
import {
  MOMENT_ORDER,
  MOMENT_LABEL,
  MOMENT_CUES,
  ORDERED_TRAITS,
  type Moment,
} from "@/lib/emotional-engine-viz";

/* ============================================================================
   EmotionHeart — Braino's emotion engine as a beating heart. Twelve traits sit
   on a heart curve; one continuous pulse flows node-to-node (the thinking);
   the moment's leading traits stay lit + named and thread into a beating core
   (the felt response). Auto-cycles real moments so what fires depends on what
   he feels. Shared by the overview preview and the deep-dive article.
   ============================================================================ */

const NET_ACCENTS: Partial<Record<Moment, [number, number, number]>> = {
  grief: [107, 82, 196], heartbreak: [217, 100, 91], venting: [184, 132, 42],
  anxiety: [47, 111, 237], celebration: [58, 143, 95], conflict: [217, 100, 91],
  banter: [58, 143, 95], focused_task: [47, 111, 237], building: [107, 82, 196],
  crisis: [217, 100, 91],
};

function HeartCanvas({ moment }: { moment: Moment }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const momentRef = useRef(moment);
  momentRef.current = moment;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const W = 560, H = 460, CX = W / 2, CY = H / 2 + 18, S = 15.5;
    const heart = (t: number) => ({
      x: CX + S * 16 * Math.pow(Math.sin(t), 3),
      y: CY - S * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
    });
    const N = ORDERED_TRAITS.length;
    const nodes = ORDERED_TRAITS.map((t, i) => ({ t, ...heart((i / N) * Math.PI * 2) }));
    const core = { x: CX, y: CY - S * 2.4 };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.width * (H / W) * dpr;
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);
    const t0 = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const elapsed = (now - t0) / 1000;
      const sx = canvas!.width / W, sy = canvas!.height / H;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.save(); ctx!.scale(sx, sy);
      ctx!.font = "600 12px 'SF Pro Display', -apple-system, sans-serif";
      ctx!.textBaseline = "middle";

      const m = momentRef.current;
      const [rr, gg, bb] = NET_ACCENTS[m] || [217, 100, 91];
      const acc = `${rr},${gg},${bb}`;
      const leadSet = new Set(ORDERED_TRAITS.map((t, i) => (t.leadsOn.includes(m) ? i : -1)).filter((i) => i >= 0).slice(0, 3));

      const beat = reduce ? 0 : (() => { const ph = (elapsed % 1.7) / 1.7; return Math.exp(-Math.pow(ph * 6, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.18) * 6, 2)); })();

      ctx!.beginPath();
      for (let k = 0; k <= 240; k++) { const pt = heart((k / 240) * Math.PI * 2); k === 0 ? ctx!.moveTo(pt.x, pt.y) : ctx!.lineTo(pt.x, pt.y); }
      ctx!.closePath();
      ctx!.strokeStyle = "rgba(29,29,31,0.12)"; ctx!.lineWidth = 1; ctx!.stroke();

      const speed = reduce ? 0 : 0.14;
      const head = (elapsed * speed) % 1;
      const trail = 0.12;
      ctx!.lineCap = "round";
      for (let s = 0; s < 1; s += 1 / 320) {
        const d = ((head - s) + 1) % 1;
        if (d > trail) continue;
        const a = heart(s * Math.PI * 2), b = heart((s + 1 / 320) * Math.PI * 2);
        const alpha = 1 - d / trail;
        ctx!.strokeStyle = `rgba(${acc},${alpha * 0.95})`;
        ctx!.lineWidth = 1 + alpha * 2.5;
        ctx!.beginPath(); ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y); ctx!.stroke();
      }
      const hp = heart(head * Math.PI * 2);
      ctx!.fillStyle = `rgba(${acc},0.95)`; ctx!.beginPath(); ctx!.arc(hp.x, hp.y, 3.2, 0, Math.PI * 2); ctx!.fill();

      nodes.forEach((n, i) => {
        const nodeT = i / N;
        const dPulse = Math.min(((head - nodeT) + 1) % 1, ((nodeT - head) + 1) % 1);
        const passGlow = Math.max(0, 1 - dPulse / 0.09);
        const isLead = leadSet.has(i);
        const glow = Math.max(passGlow, isLead ? 0.6 + 0.4 * beat : 0);
        if (glow > 0.04) { ctx!.fillStyle = `rgba(${acc},${glow * 0.24})`; ctx!.beginPath(); ctx!.arc(n.x, n.y, 6 + glow * 12, 0, Math.PI * 2); ctx!.fill(); }
        ctx!.beginPath(); ctx!.arc(n.x, n.y, isLead ? 6.5 : 5, 0, Math.PI * 2);
        ctx!.fillStyle = "#fff"; ctx!.fill();
        ctx!.lineWidth = 2; ctx!.strokeStyle = glow > 0.04 ? `rgba(${acc},${0.55 + glow * 0.45})` : "rgba(29,29,31,0.45)"; ctx!.stroke();
        if (isLead) {
          ctx!.strokeStyle = `rgba(${acc},${0.18 + 0.25 * beat})`; ctx!.lineWidth = 1;
          ctx!.beginPath(); ctx!.moveTo(n.x, n.y); ctx!.lineTo(core.x, core.y); ctx!.stroke();
          ctx!.fillStyle = `rgba(${acc},0.95)`;
          const left = n.x < CX;
          ctx!.textAlign = left ? "right" : "left";
          ctx!.fillText(n.t.name, n.x + (left ? -12 : 12), n.y);
        }
      });

      const cr = 8 + beat * 4;
      ctx!.fillStyle = `rgba(${acc},${0.25 + beat * 0.5})`; ctx!.beginPath(); ctx!.arc(core.x, core.y, cr + 10, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillStyle = `rgba(${acc},0.95)`; ctx!.beginPath(); ctx!.arc(core.x, core.y, cr, 0, Math.PI * 2); ctx!.fill();

      ctx!.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className="apple-net" role="img" aria-label="Braino's emotion engine as a beating heart: a signal flows through his traits, the ones that lead on the moment light up, and converge into the core" />;
}

export default function EmotionHeart({ caption = true }: { caption?: boolean }) {
  const moments = MOMENT_ORDER.filter((m) => m !== "neutral");
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % moments.length), 2600);
    return () => clearInterval(t);
  }, [moments.length]);
  const moment: Moment = moments[i];
  const cue = MOMENT_CUES[moment]?.[0] || "";
  return (
    <div className="apple-engine-live">
      {caption && (
        <div className="apple-engine-thought" aria-hidden="true">
          <span className="dot" />
          <span>{cue ? <>You say {cue} — he feels <b>{MOMENT_LABEL[moment].replace(/^an? /, "")}</b></> : "listening…"}</span>
        </div>
      )}
      <HeartCanvas moment={moment} />
    </div>
  );
}
