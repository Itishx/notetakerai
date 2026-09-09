/* Braino OS taking over a Mac.
 *
 * The reference is the symbiote, not a page transition: it starts at ONE point,
 * it crawls as branching tendrils rather than wiping, it follows the structure
 * of the host instead of ignoring it, and the black floods in BEHIND the tips
 * rather than arriving with them. Every one of those is what separates a
 * takeover from a fade to black.
 *
 * The payoff is the point of the whole thing. What eats the desktop is not a
 * black rectangle, it is his anatomy: the same four subsystems the real Braino
 * OS surface draws, in the same four colours, on the same additive bloom. The
 * tendrils that consumed your Mac ARE the nervous system, and they resolve into
 * it at the end.
 *
 * Palette and compositing are taken from mac/braino-mac/renderer/braino-os.js so
 * the last frame here and the real surface are the same picture.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./takeover.css";

/* The four subsystems, verbatim from the OS surface. */
const SUBSYSTEMS = [
  { id: "mind",   label: "THE MIND",   role: "Reasons, routes, decides", rgb: [168, 232, 255], at: [0.30, 0.30] },
  { id: "heart",  label: "THE HEART",  role: "Reads the room",           rgb: [255, 138, 176], at: [0.70, 0.34] },
  { id: "memory", label: "THE MEMORY", role: "Keeps what matters",       rgb: [122, 255, 214], at: [0.32, 0.70] },
  { id: "ears",   label: "THE EARS",   role: "Hears, and listens",       rgb: [186, 158, 255], at: [0.70, 0.68] },
];

const CORAL: [number, number, number] = [232, 120, 110];

type Phase = "idle" | "seed" | "crawl" | "flood" | "resolve";

type Pt = { x: number; y: number };

/* One growing filament. Tips move, the trail behind them is what gets drawn and
   what the darkness accumulates along. */
class Tendril {
  pts: Pt[];
  ang: number;
  speed: number;
  life: number;
  gen: number;
  dead = false;
  rgb: [number, number, number];
  born: Pt;

  constructor(x: number, y: number, ang: number, gen: number, rgb: [number, number, number]) {
    this.pts = [{ x, y }];
    this.ang = ang;
    this.gen = gen;
    this.rgb = rgb;
    /* Later generations are slower and shorter, so the growth thins out toward
       the edges instead of every branch racing the trunk. */
    this.speed = 5.2 - gen * 0.6 + Math.random() * 1.6;
    /* Long enough to cross a display. The first cut died at 150 and the organism
       never got past the menu bar, which made the takeover look like a stain
       along the top of the screen. */
    this.life = 420 - gen * 55 + Math.random() * 120;
    this.born = { x, y };
  }

  head() { return this.pts[this.pts.length - 1]; }

  /* `edges` are the host's own lines: window frames, the dock, the menu bar.
     Biasing growth toward the nearest one is what makes this read as taking
     over a Mac rather than as ink spilled on a photo of one. */
  step(w: number, h: number, edges: number[][], out: Tendril[]) {
    if (this.dead) return;
    const p = this.head();

    // wander
    this.ang += (Math.random() - 0.5) * 0.42;

    /* Spread down the display. Without this every tendril is happy to run along
       whichever edge it met first and the screen below stays untouched. */
    const wantDown = Math.PI / 2;
    let toDown = wantDown - this.ang;
    while (toDown > Math.PI) toDown -= Math.PI * 2;
    while (toDown < -Math.PI) toDown += Math.PI * 2;
    this.ang += toDown * 0.035;

    /* Pull toward the nearest structural line, but ONLY once the tendril has
       cleared its own origin. The menu bar is a full-width edge two pixels from
       the seed, so attraction from frame one dragged all seven seeds sideways
       along it and the takeover never left the top of the screen. */
    const escaped = Math.hypot(p.x - this.born.x, p.y - this.born.y) > 130;
    if (escaped) {
      let best = Infinity, bx = 0, by = 0;
      for (const [x1, y1, x2, y2] of edges) {
        const dx = x2 - x1, dy = y2 - y1;
        const t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy || 1)));
        const cx = x1 + dx * t, cy = y1 + dy * t;
        const d = Math.hypot(cx - p.x, cy - p.y);
        if (d < best) { best = d; bx = cx; by = cy; }
      }
      if (best < 150) {
        const want = Math.atan2(by - p.y, bx - p.x);
        let diff = want - this.ang;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.ang += diff * (1 - best / 150) * 0.09;
      }
    }

    const nx = p.x + Math.cos(this.ang) * this.speed;
    const ny = p.y + Math.sin(this.ang) * this.speed;
    this.pts.push({ x: nx, y: ny });
    if (this.pts.length > 320) this.pts.shift();

    this.life -= 1;
    if (this.life <= 0 || nx < -40 || ny < -40 || nx > w + 40 || ny > h + 40) this.dead = true;

    // branch. Rarer as generations go on, or the screen fills in one second.
    if (this.gen < 5 && Math.random() < 0.070 - this.gen * 0.010) {
      out.push(new Tendril(nx, ny, this.ang + (Math.random() < 0.5 ? 0.9 : -0.9), this.gen + 1, this.rgb));
    }
  }
}

export default function Takeover() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLCanvasElement>(null);   // what has been consumed
  const litRef = useRef<HTMLCanvasElement>(null);    // the filaments themselves
  const rafRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [labels, setLabels] = useState(false);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setPhase("idle");
    setLabels(false);
    for (const c of [darkRef.current, litRef.current]) {
      if (!c) continue;
      const x = c.getContext("2d");
      x?.clearRect(0, 0, c.width, c.height);
    }
  }, []);

  const run = useCallback(() => {
    const wrap = wrapRef.current, dark = darkRef.current, lit = litRef.current;
    if (!wrap || !dark || !lit) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    for (const c of [dark, lit]) {
      c.width = w * dpr; c.height = h * dpr;
      c.style.width = w + "px"; c.style.height = h + "px";
      c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const dctx = dark.getContext("2d")!;
    const lctx = lit.getContext("2d")!;
    dctx.clearRect(0, 0, w, h);
    lctx.clearRect(0, 0, w, h);

    /* The host's own lines. Read from the rendered desktop so the tendrils
       actually follow what is on screen rather than a guess about it. */
    const edges: number[][] = [];
    wrap.querySelectorAll<HTMLElement>("[data-edge]").forEach((el) => {
      const r = el.getBoundingClientRect(), o = wrap.getBoundingClientRect();
      const x1 = r.left - o.left, y1 = r.top - o.top, x2 = x1 + r.width, y2 = y1 + r.height;
      edges.push([x1, y1, x2, y1], [x2, y1, x2, y2], [x2, y2, x1, y2], [x1, y2, x1, y1]);
    });

    // The seed is the notch, because that is where he actually lives.
    const sx = w / 2, sy = 4;
    let live: Tendril[] = [];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.18 + (Math.PI * 0.64 * i) / 6 + (Math.random() - 0.5) * 0.2;
      live.push(new Tendril(sx, sy, a, 0, CORAL));
    }

    setPhase("seed");
    const t0 = performance.now();
    let floodStarted = false, resolved = false;

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      if (t > 0.45 && phaseRef.current === "seed") { phaseRef.current = "crawl"; setPhase("crawl"); }

      const born: Tendril[] = [];
      for (const td of live) td.step(w, h, edges, born);
      live = live.concat(born).filter((td) => !td.dead || td.pts.length > 2);

      /* DARK PASS. Never cleared: the consumed area only ever grows, which is
         what makes it look eaten rather than animated. The blobs trail the tips
         by a few points, so the tendril is always ahead of the darkness. */
      dctx.globalCompositeOperation = "source-over";
      for (const td of live) {
        const back = td.pts.slice(0, Math.max(0, td.pts.length - 6));
        for (let i = back.length - 1; i >= 0 && i > back.length - 4; i--) {
          const p = back[i];
          const rad = 68 - td.gen * 9;
          const g = dctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
          g.addColorStop(0, "rgba(6,6,8,0.34)");
          g.addColorStop(1, "rgba(6,6,8,0)");
          dctx.fillStyle = g;
          dctx.beginPath(); dctx.arc(p.x, p.y, rad, 0, Math.PI * 2); dctx.fill();
        }
      }

      /* LIGHT PASS. Cleared each frame and redrawn additively, so crossings burn
         toward white on their own. This is the OS surface's own trick. */
      lctx.clearRect(0, 0, w, h);
      lctx.globalCompositeOperation = "lighter";
      lctx.lineCap = "round";
      for (const td of live) {
        const [r, g, b] = td.rgb;
        lctx.beginPath();
        for (let i = 0; i < td.pts.length; i++) {
          const p = td.pts[i];
          i === 0 ? lctx.moveTo(p.x, p.y) : lctx.lineTo(p.x, p.y);
        }
        lctx.strokeStyle = `rgba(${r},${g},${b},0.42)`;
        lctx.lineWidth = td.gen > 1 ? 0.75 : 1.15;
        lctx.stroke();

        const hd = td.head();
        if (!td.dead) {
          const bl = lctx.createRadialGradient(hd.x, hd.y, 0, hd.x, hd.y, 22);
          bl.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
          bl.addColorStop(1, "rgba(0,0,0,0)");
          lctx.fillStyle = bl;
          lctx.beginPath(); lctx.arc(hd.x, hd.y, 22, 0, Math.PI * 2); lctx.fill();
        }
      }

      if (t > 1.5 && !floodStarted) { floodStarted = true; phaseRef.current = "flood"; setPhase("flood"); }

      /* Resolution. The tendrils stop being coral and become the four
         subsystems, which is the whole argument: the thing that ate the desktop
         is his anatomy, not a black rectangle. */
      if (t > 4.2 && !resolved) {
        resolved = true;
        phaseRef.current = "resolve";
        setPhase("resolve");
        /* The network is NOT thrown away and replaced. Wiping it and spawning
           four fresh clusters read as four separate stains appearing on a grey
           desktop, which is the opposite of the argument. The same organism
           stays on screen and simply takes on the colour of whichever subsystem
           it is nearest, so the thing that ate the Mac becomes the anatomy in
           front of you rather than being swapped for it. */
        for (const td of live) {
          const hd = td.head();
          let near = SUBSYSTEMS[0], bd = Infinity;
          for (const sub of SUBSYSTEMS) {
            const d = Math.hypot(sub.at[0] * w - hd.x, sub.at[1] * h - hd.y);
            if (d < bd) { bd = d; near = sub; }
          }
          td.rgb = near.rgb as [number, number, number];
          td.life = Math.max(td.life, 60);
          td.dead = false;
        }
        SUBSYSTEMS.forEach((sub, n) => {
          const cx = sub.at[0] * w, cy = sub.at[1] * h;
          for (let i = 0; i < 7; i++) {
            const a = (Math.PI * 2 * i) / 7 + n;
            const td = new Tendril(cx, cy, a, 2, sub.rgb as [number, number, number]);
            td.life = 70;
            live.push(td);
          }
        });
        window.setTimeout(() => setLabels(true), 700);
      }

      if (t < 9) rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, []);

  /* phase is read inside the loop, so it needs a ref as well as state: reading
     the state variable in there would close over the value at start. */
  const phaseRef = useRef<Phase>("idle");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const taken = phase === "flood" || phase === "resolve";

  return (
    <div className="tk">
      <div className={"tk-screen" + (taken ? " is-taken" : "") + (phase === "resolve" ? " is-resolved" : "")} ref={wrapRef}>

        {/* An ordinary Mac. Deliberately mundane, because the takeover only
            means something if what it takes over is somebody's normal Tuesday. */}
        <div className="tk-desktop">
          <div className="tk-menubar" data-edge>
            <span className="tk-apple" />
            <span>Finder</span><span>File</span><span>Edit</span><span>View</span>
            <span className="tk-menu-right">100%  ▮  Wed 9:41</span>
          </div>

          <div className="tk-notch" />

          <div className="tk-win tk-win-a" data-edge>
            <div className="tk-bar"><i /><i /><i /><em>Assignment.pages</em></div>
            <div className="tk-body">
              <p className="l w80" /><p className="l w60" /><p className="l w90" />
              <p className="l w40" /><p className="l w70" />
            </div>
          </div>

          <div className="tk-win tk-win-b" data-edge>
            <div className="tk-bar"><i /><i /><i /><em>Safari</em></div>
            <div className="tk-body">
              <p className="l w70" /><p className="l w50" /><p className="l w85" />
            </div>
          </div>

          <div className="tk-dock" data-edge>
            {Array.from({ length: 7 }).map((_, i) => <span key={i} />)}
          </div>
        </div>

        <canvas ref={darkRef} className="tk-canvas tk-dark" />
        <canvas ref={litRef} className="tk-canvas tk-lit" />

        {labels && (
          <div className="tk-labels">
            {SUBSYSTEMS.map((s) => (
              <div
                key={s.id}
                className="tk-label"
                style={{
                  left: `${s.at[0] * 100}%`,
                  top: `${s.at[1] * 100}%`,
                  ["--c" as string]: `rgb(${s.rgb.join(",")})`,
                }}
              >
                <b>{s.label}</b>
                <span>{s.role}</span>
              </div>
            ))}
          </div>
        )}

        {phase === "idle" && (
          <button className="tk-go" onClick={run}>
            <span>Let him in</span>
          </button>
        )}
      </div>

      <div className="tk-under">
        <p className="tk-caption">
          {phase === "idle"    && "A Mac. Wallpaper, two windows, a dock. Nothing unusual."}
          {phase === "seed"    && "It starts at the notch. It always starts at the notch."}
          {phase === "crawl"   && "Not a wipe. It follows the windows, the dock, the edges."}
          {phase === "flood"   && "The dark arrives behind the tips, never with them."}
          {phase === "resolve" && "What ate the desktop is his anatomy. It was never a black screen."}
        </p>
        <div className="tk-actions">
          {phase !== "idle" && <button className="tk-btn" onClick={reset}>Again</button>}
          <Link className="tk-btn ghost" to="/os">The real surface</Link>
        </div>
      </div>
    </div>
  );
}
