import { useEffect, useRef } from "react";
import "./braino-peek.css";

/* A huge thin-outlined Braino peeking up from the bottom of a section.
   Pupils follow the cursor; when idle (2s) or on touch they look around. */
type Props = { variant?: "braino" | "foundry"; className?: string };

const EYES = [{ cx: 430, cy: 300 }, { cx: 770, cy: 300 }];
const R = 70; // eye radius
const MAX = 34; // pupil travel

export function BrainoPeek({ variant = "braino", className = "" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const pupils = useRef<(SVGGElement | null)[]>([]);
  const lids = useRef<(SVGEllipseElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const touch = window.matchMedia("(hover: none)").matches;
    let target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let lastMove = touch ? -1e9 : 0, visible = false, raf = 0;
    let nextLook = 0, nextBlink = performance.now() + 3000, blinkAt = -1;
    const looks = [[-1, 0], [1, 0], [0, -1], [-0.6, -0.5], [0.6, -0.4], [0, 0]];

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const w = r.width / 1200;
      let best = { x: 0, y: 0 };
      // aim from the midpoint between the eyes
      const ex = r.left + 600 * w, ey = r.top + 300 * w;
      const dx = e.clientX - ex, dy = e.clientY - ey;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 400);
      best = { x: (dx / d) * k, y: (dy / d) * k };
      target = best;
      lastMove = performance.now();
    };

    const tick = (t: number) => {
      raf = 0;
      if (!visible) return;
      if (t - lastMove > 2000 && t > nextLook) {
        const l = looks[Math.floor(Math.random() * looks.length)];
        target = { x: l[0], y: l[1] };
        nextLook = t + 1400 + Math.random() * 1800;
      }
      if (t > nextBlink) { blinkAt = t; nextBlink = t + 2500 + Math.random() * 4000; }
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      const m = Math.hypot(cur.x, cur.y);
      const s = m > 1 ? 1 / m : 1;
      const px = cur.x * s * MAX, py = cur.y * s * MAX;
      pupils.current.forEach((p) => p?.setAttribute("transform", `translate(${px.toFixed(2)} ${py.toFixed(2)})`));
      const bt = blinkAt < 0 ? 1 : Math.min(1, Math.abs(t - blinkAt - 90) / 90);
      lids.current.forEach((l) => l?.setAttribute("ry", String(Math.max(2, R * bt))));
      if (bt >= 1) blinkAt = -1;
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={root} className={`bpk bpk-${variant} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1200 520" preserveAspectRatio="xMidYMin meet">
        {/* Brain silhouette: two lobes over a wide dome, with a few folds. */}
        <path className="bpk-head" d="M120 620 C110 330 230 150 420 110 C470 60 560 50 600 90 C640 50 730 60 780 110 C970 150 1090 330 1080 620" />
        <path className="bpk-fold" d="M600 90 C590 140 610 170 600 210" />
        <path className="bpk-fold" d="M300 200 C340 190 360 160 350 130" />
        <path className="bpk-fold" d="M900 200 C860 190 840 160 850 130" />
        <path className="bpk-fold" d="M200 380 C230 360 230 330 210 310" />
        <path className="bpk-fold" d="M1000 380 C970 360 970 330 990 310" />
        {EYES.map((e, i) => (
          <g key={i}>
            {variant === "foundry" && <circle className="bpk-glass" cx={e.cx} cy={e.cy} r={R + 26} />}
            <clipPath id={`bpk-c-${variant}-${i}`}>
              <ellipse ref={(n) => { lids.current[i] = n; }} cx={e.cx} cy={e.cy} rx={R} ry={R} />
            </clipPath>
            <circle className="bpk-eye" cx={e.cx} cy={e.cy} r={R} />
            <g clipPath={`url(#bpk-c-${variant}-${i})`}>
              <g ref={(n) => { pupils.current[i] = n; }}>
                <circle className="bpk-pupil" cx={e.cx} cy={e.cy} r={28} />
                <circle className="bpk-glint" cx={e.cx + 9} cy={e.cy - 10} r={7} />
              </g>
            </g>
          </g>
        ))}
        {variant === "foundry" && <>
          <path className="bpk-glass" d="M526 300 C560 278 640 278 674 300" />
          <path className="bpk-glass" d="M334 290 L170 250" />
          <path className="bpk-glass" d="M866 290 L1030 250" />
        </>}
      </svg>
    </div>
  );
}

export default BrainoPeek;
