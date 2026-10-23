import { useEffect, useRef } from "react";
import "./braino-peek.css";

/* Our Braino as pencil line art, traced from /braino-standing.svg in its own
   coordinates (eyes at 38,47.4 and 62,47.4), peeking up from the bottom edge
   of a closing section: head, folds, arms, smile and live eyes: pupils follow the cursor, look around when idle or on touch, and
   blink now and then. Foundry wears his glasses as strokes. */
type Props = { variant?: "braino" | "foundry"; className?: string };

const EYES = [{ cx: 38, cy: 47.4 }, { cx: 62, cy: 47.4 }];
const R = 7.8; // eye white radius (matches the mascot)
const MAX = 3.3; // pupil travel

const HEAD = "M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 68 80.5 60 79.5 50 79 C 40 79.5 32 80.5 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z";
const FOLDS = [
  "M 50 8 Q 49 30 50 50 Q 50.5 60 50 65",
  "M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72",
  "M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74",
  "M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72",
  "M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74",
];

export function BrainoPeek({ variant = "braino", className = "" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const pupils = useRef<(SVGGElement | null)[]>([]);
  const lids = useRef<(SVGEllipseElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const touch = window.matchMedia("(hover: none)").matches;
    let target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let lastMove = touch ? -1e9 : 0, visible = false, raf = 0;
    let nextLook = 0, nextBlink = performance.now() + 3000, blinkAt = -1;
    const looks = [[-1, 0], [1, 0], [0, -1], [-0.6, -0.5], [0.6, -0.4], [0, 0]];

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const svg = el.querySelector("svg");
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      // midpoint between the eyes: x=50 (from -2, 104 wide), y=47.4 (from 2, 66 tall)
      const ex = r.left + (52 / 104) * r.width, ey = r.top + (45.4 / 66) * r.height;
      const dx = e.clientX - ex, dy = e.clientY - ey;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 300);
      target = { x: (dx / d) * k, y: (dy / d) * k };
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
      pupils.current.forEach((p) => p?.setAttribute("transform", `translate(${px.toFixed(3)} ${py.toFixed(3)})`));
      const bt = blinkAt < 0 ? 1 : Math.min(1, Math.abs(t - blinkAt - 90) / 90);
      lids.current.forEach((l) => l?.setAttribute("ry", String(Math.max(0.3, R * bt))));
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
      {/* Pencil line art traced from /braino-standing.svg, cropped to y 2..68. */}
      <svg viewBox="-2 2 104 66" preserveAspectRatio="xMidYMin meet">
        <path className="bpk-head" d={HEAD} />
        <path className="bpk-arm" d="M 23 53 Q 11 52 8 59" />
        <path className="bpk-arm" d="M 77 53 Q 89 52 92 59" />
        {FOLDS.map((d, i) => <path key={i} className="bpk-fold" d={d} />)}
        <path className="bpk-line" d="M 32 41.5 Q 37 40 43 41.8" />
        <path className="bpk-line" d="M 68 41.5 Q 63 40 57 41.8" />
        <path className="bpk-line" d="M 43.5 60 Q 50 67.5 56.5 60" />
        {EYES.map((e, i) => (
          <g key={i}>
            <clipPath id={`bpk-c-${variant}-${i}`}>
              <ellipse ref={(n) => { lids.current[i] = n; }} cx={e.cx} cy={e.cy} rx={R} ry={R} />
            </clipPath>
            <circle className="bpk-eye" cx={e.cx} cy={e.cy} r={R} />
            <g clipPath={`url(#bpk-c-${variant}-${i})`}>
              <g ref={(n) => { pupils.current[i] = n; }}>
                <circle className="bpk-pupil" cx={e.cx} cy={e.cy + 0.6} r={3.4} />
                <circle className="bpk-glint" cx={e.cx + 1} cy={e.cy - 0.8} r={1.1} />
              </g>
            </g>
          </g>
        ))}
        {variant === "foundry" && (
          <g className="bpk-glass">
            <rect x="28" y="39.5" width="20" height="16" rx="5" />
            <rect x="52" y="39.5" width="20" height="16" rx="5" />
            <path d="M48 46 Q50 43.6 52 46" />
            <path d="M28 44 L19 41" />
            <path d="M72 44 L81 41" />
          </g>
        )}
      </svg>
    </div>
  );
}

export default BrainoPeek;
