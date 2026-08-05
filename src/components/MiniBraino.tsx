import { useEffect, useRef } from "react";
import { BRAINO_WALKER_SVG } from "./brainoWalkerSvg";

/* ============================================================================
   MiniBraino — a small, self-contained walking Braino that paces back and forth
   inside its own lane (not the global viewport mascot). Same art + walk cycle as
   BrainoWalker, trimmed to just walking: leg cycle, waddle, breath, blink. Used
   to give the character presence inside a section without the notch.
   ============================================================================ */

export default function MiniBraino({ size = 54 }: { size?: number }) {
  const laneRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lane = laneRef.current, walker = walkerRef.current;
    if (!lane || !walker) return;
    const root = walker.querySelector("#__sbwk_root__") as SVGGElement | null;
    const flip = walker.querySelector("#__sbwk_flip__") as HTMLElement | null;
    if (!root) return;
    const q = (s: string) => root.querySelector(s) as SVGElement | null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const start = performance.now();
    let last = start, posX = Math.random() * 40, dirX = 1;
    const maxX = () => Math.max(0, lane.clientWidth - size);

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - start) / 1000;

      let x = posX + dirX * 30 * dt;
      const mx = maxX();
      if (x >= mx) { x = mx; dirX = -1; } else if (x <= 0) { x = 0; dirX = 1; }
      posX = x;
      walker.style.transform = `translateX(${posX}px)`;
      if (flip) flip.style.transform = `scaleX(${dirX})`;

      const s = t * 4.5;
      const Lp = Math.sin(s), Rp = Math.sin(s + Math.PI);
      const ll = Math.max(0, Lp) * 5, rl = Math.max(0, Rp) * 5;
      const ls = Math.max(0, Lp) * 8, rs = Math.max(0, Rp) * 8;
      const waddle = Math.sin(s) * 3.4;
      const walkBob = -Math.abs(Math.sin(s)) * 2 - 0.4;
      const breath = 1 + 0.014 * Math.sin(t * 1.7);
      const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
      const bp = t % 3.4;
      const blink = bp < 0.13 ? Math.sin((bp / 0.13) * Math.PI) : 0;
      const eyeSy = Math.max(0.06, 1 - blink);

      root.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
      q("#__sbwk_ll__")?.setAttribute("transform", `translate(0 ${-ll}) rotate(${ls} 44 74)`);
      q("#__sbwk_rl__")?.setAttribute("transform", `translate(0 ${-rl}) rotate(${rs} 56 74)`);
      q("#__sbwk_eye_l__")?.setAttribute("transform", `translate(38,48) scale(1,${eyeSy}) translate(-38,-48)`);
      q("#__sbwk_eye_r__")?.setAttribute("transform", `translate(62,48) scale(1,${eyeSy}) translate(-62,-48)`);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <div ref={laneRef} className="mini-braino-lane" style={{ position: "relative", width: "100%", height: size }} aria-hidden="true">
      <div ref={walkerRef} style={{ position: "absolute", bottom: 0, width: size }}>
        <div id="__sbwk_flip__" style={{ transformOrigin: "center", display: "block" }} dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
      </div>
    </div>
  );
}
