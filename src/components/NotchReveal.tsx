/**
 * NotchReveal.tsx — the boot reveal, shared by /founder-letter and the
 * homepage. A self-running loop (no scrolling required): closed eyes form in
 * the dark, a slow white-to-blue light draws the island's outline,
 * authenticating, the coral wave, green verdict with eyes opening, the
 * caption-wide wink and "how you doing?", and he stays. This is the same
 * sequence the Mac app now performs at boot (runNotchBoot).
 */
import { useEffect, useRef } from "react";
import NotchFace, { setNotchStatus, typeNotchCaption } from "./NotchFace";
import "./notch-reveal.css";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ramp = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);

/* ── THE REVEAL: scroll-driven, sticky, after "it wasn't the final form".
   Everything is already black; two eyes form in the dark; a white-to-blue
   light (the keynote-glow look) draws the shape of the notch around them;
   authentication happens in a second — blue pulse, green verdict, eyes open
   with the glow; and Braino says hello. Then the page lets go. ── */
export default function NotchReveal() {
  const secRef = useRef<HTMLElement>(null);
  const notchRef = useRef<HTMLDivElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);
  const corePathRef = useRef<SVGPathElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sec = secRef.current, notch = notchRef.current,
      glowP = glowPathRef.current, coreP = corePathRef.current, bloom = bloomRef.current;
    if (!sec || !notch || !glowP || !coreP || !bloom) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      notch.className = "nf-face on home awake";
      return;
    }
    const len = coreP.getTotalLength();
    [glowP, coreP].forEach((p) => {
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
    });
    const wrap = notch.parentElement as HTMLElement;
    const DUR = 11500; /* one full loop, time-driven — no scrolling required */
    let raf = 0, lastCls = "";
    const t0 = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const r = sec.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= innerHeight) return; /* offscreen: idle */
      const p = ((now - t0) % DUR) / DUR;
      const out = ramp(p, 0.95, 1);
      /* the eyes form in the dark (pill is black on black) */
      wrap.style.opacity = String(ramp(p, 0.03, 0.09) * (1 - out));
      /* the light draws the notch, and stays lit while he authenticates */
      const sh = ramp(p, 0.1, 0.28);
      glowP.parentElement!.style.opacity = String(ramp(p, 0.08, 0.12) * (1 - ramp(p, 0.46, 0.52)));
      [glowP, coreP].forEach((el) => { el.style.strokeDashoffset = String(len * (1 - sh)); });
      bloom.style.opacity = String(sh * (1 - ramp(p, 0.48, 0.56)) * 0.9);
      /* the boot ladder — the instant auth succeeds, a FAST coral fill
         floods the island (his true colors) while the shimmer is still up;
         THEN the green glow opens his eyes; THEN, eyes open, he winks */
      const BEATS: { from: number; cls: string; status?: string; cap?: string }[] = [
        { from: 0.0,   cls: "dozing" },
        { from: 0.3,   cls: "dozing nf-auth", status: "authenticating" },
        { from: 0.42,  cls: "dozing nf-coral" },
        { from: 0.485, cls: "nf-auth-ok awake" },
        { from: 0.56,  cls: "captioning awake nf-wink", cap: "how you doing?" },
        { from: 0.76,  cls: "nf-greet awake" },
        { from: 0.88,  cls: "awake" },
      ];
      let beat = BEATS[0];
      for (const b of BEATS) if (p >= b.from) beat = b;
      const cls = `nf-face on home ${beat.cls}`;
      if (cls !== lastCls) {
        notch.className = cls;
        lastCls = cls;
        const capEl = notch.querySelector<HTMLElement>(".nf-cap-l");
        if (capEl) capEl.textContent = "";
        /* as he winks, the island spreads like it does for captions */
        if (beat.cap) typeNotchCaption(notch, beat.cap, 80);
      }
      setNotchStatus(notch, beat.status || "");
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <section className="fl-reveal" ref={secRef} aria-label="The notch reveals itself">
      <div className="stage">
        <div className="center">
          <div className="rv-bloom" ref={bloomRef} />
          <div className="rv-notchwrap">
            <NotchFace ref={notchRef} className="on home dozing" />
            <svg className="rv-shimmer" viewBox="0 0 190 55" aria-hidden="true">
              <defs>
                <linearGradient id="rv-glow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FFFFFF" />
                  <stop offset=".45" stopColor="#CFE0FF" />
                  <stop offset=".8" stopColor="#7AA2FF" />
                  <stop offset="1" stopColor="#F0A86B" />
                </linearGradient>
              </defs>
              <path ref={glowPathRef} className="rv-p rv-p-glow" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#rv-glow)" fill="none" />
              <path ref={corePathRef} className="rv-p rv-p-core" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z" stroke="url(#rv-glow)" fill="none" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}

