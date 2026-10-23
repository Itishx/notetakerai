import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* Flappy Founder (2026-10-23). Foundry's sibling to the Mario level in
   BrainoFooterGame: Braino in his Foundry glasses flaps through walls of
   "No users". One canvas, one requestAnimationFrame loop that only runs while
   a run is live, the footer is on screen and the tab is visible. */

type Phase = "idle" | "running" | "over";

type Wall = { x: number; gapY: number; label: string; color: string; passed: boolean };
type Coin = { x: number; y: number; gold: boolean; taken: boolean };

const HEIGHT = 330;
const GROUND = 34;
const WALL_W = 58;
const GAP = 196;
const SPACING = 310;
const SPEED = 138;
const GRAVITY = 980;
const FLAP = -330;
const BIRD = 46;
const PRICE = 49;
const STORAGE_KEY = "foundry-footer-best-v1";
const LABELS = ["No users", "Nobody came", "0 sign-ups"];
const ENGINE = ["#6b52c4", "#d9645b", "#3a8f5f"];

function readBest() {
  try {
    const n = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function money(users: number, paying: number) {
  return { users, revenue: paying * PRICE };
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function FoundryFooterGame() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actionRef = useRef({ flap: () => {}, start: () => {} });
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhase] = useState<Phase>("idle");
  const [users, setUsers] = useState(0);
  const [paying, setPaying] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => { setBest(readBest()); }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprite = new Image();
    sprite.src = "/braino-standing.svg";
    sprite.onload = () => draw();

    let width = wrap.clientWidth;
    let dpr = 1;
    let walls: Wall[] = [];
    let coins: Coin[] = [];
    let y = HEIGHT / 2;
    let vy = 0;
    let wallCount = 0;
    let coinCount = 0;
    let userCount = 0;
    let payCount = 0;
    let inView = false;
    let raf = 0;
    let last = 0;
    let colors = { bg: "#f4f2ec", ink: "#16150f" };
    let bgX = 0;
    // A fixed skyline, so the city does not reshuffle every frame.
    const city = (seed: number, n: number) => Array.from({ length: n }, (_, i) => { const r = Math.abs(Math.sin(seed * 97 + i * 12.9898) * 43758.5453) % 1; return { w: 34 + r * 46, h: 40 + ((r * 7.3) % 1) * 110 }; });
    const far = city(1, 24), near = city(2, 18);

    const birdX = () => Math.max(60, Math.min(160, width * 0.22));

    const readColors = () => {
      const s = getComputedStyle(wrap);
      colors = {
        bg: s.getPropertyValue("--a-bg").trim() || "#f4f2ec",
        ink: s.getPropertyValue("--a-ink").trim() || "#16150f",
      };
    };

    const resize = () => {
      width = wrap.clientWidth;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(HEIGHT * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${HEIGHT}px`;
      readColors();
      draw();
    };

    const addWall = (x: number) => {
      const top = 46;
      const bottom = HEIGHT - GROUND - 30;
      const gapY = top + GAP / 2 + Math.random() * (bottom - top - GAP);
      const i = wallCount++;
      walls.push({ x, gapY, label: LABELS[i % LABELS.length], color: ENGINE[i % ENGINE.length], passed: false });
      // A coin waits in roughly two of every three gaps, just past the wall.
      if (i > 0 && Math.random() < 0.68) {
        coinCount += 1;
        coins.push({ x: x + WALL_W + SPACING / 2 - 10, y: gapY + (Math.random() - 0.5) * 50, gold: coinCount % 10 === 0, taken: false });
      }
    };

    const reset = () => {
      walls = [];
      coins = [];
      wallCount = 0;
      coinCount = 0;
      userCount = 0;
      payCount = 0;
      y = HEIGHT / 2 - 20;
      vy = 0;
      for (let x = width + 260; x < width + SPACING * 4; x += SPACING) addWall(x);
      setUsers(0);
      setPaying(0);
    };

    const drawBraino = (cx: number, cy: number, tilt: number) => {
      const s = BIRD / 100;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.scale(s, s);
      ctx.translate(-50, -54);
      if (sprite.complete && sprite.naturalWidth) ctx.drawImage(sprite, -8, -34, 116, 142);
      else {
        ctx.fillStyle = "#e8786e";
        ctx.beginPath();
        ctx.arc(50, 54, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      // His Foundry glasses, the same strokes BrainoMascot draws.
      ctx.strokeStyle = "#1b1713";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.fillStyle = "rgba(255,255,255,.18)";
      for (const gx of [28, 52]) {
        ctx.beginPath();
        ctx.roundRect(gx, 39.5, 20, 16, 5);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(48, 46); ctx.quadraticCurveTo(50, 43.6, 52, 46);
      ctx.moveTo(28, 44); ctx.lineTo(19, 41);
      ctx.moveTo(72, 44); ctx.lineTo(81, 41);
      ctx.stroke();
      ctx.restore();
    };

    const drawWall = (w: Wall) => {
      const half = GAP / 2;
      const floor = HEIGHT - GROUND;
      ctx.fillStyle = w.color;
      ctx.beginPath(); ctx.roundRect(w.x, -10, WALL_W, w.gapY - half + 10, [0, 0, 10, 10]); ctx.fill();
      ctx.beginPath(); ctx.roundRect(w.x, w.gapY + half, WALL_W, floor - w.gapY - half, [10, 10, 0, 0]); ctx.fill();
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,.92)";
      ctx.font = "700 12px -apple-system, 'SF Pro Text', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = (cy: number) => {
        ctx.save();
        ctx.translate(w.x + WALL_W / 2, cy);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(w.label, 0, 0);
        ctx.restore();
      };
      if (w.gapY - half > 90) label((w.gapY - half) / 2);
      if (floor - (w.gapY + half) > 90) label((w.gapY + half + floor) / 2);
      ctx.restore();
    };

    const drawCoin = (c: Coin) => {
      const r = c.gold ? 17 : 13;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fillStyle = c.gold ? "#f2c14e" : colors.bg;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = c.gold ? "#b8861f" : "#3a8f5f";
      ctx.stroke();
      ctx.fillStyle = c.gold ? "#5a3e05" : "#3a8f5f";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `800 ${c.gold ? 13 : 11}px -apple-system, 'SF Pro Text', sans-serif`;
      ctx.fillText(c.gold ? "$" : "+1", c.x, c.y + 0.5);
      if (c.gold) {
        ctx.font = "700 10px -apple-system, 'SF Pro Text', sans-serif";
        ctx.fillStyle = colors.ink;
        ctx.fillText("Paying customer", c.x, c.y - r - 9);
      }
    };

    function drawSky() {
      const dark = colors.bg !== "#f4f2ec" && parseInt(colors.bg.replace("#", "").slice(0, 2), 16) < 90;
      const g = ctx!.createLinearGradient(0, 0, 0, HEIGHT);
      if (dark) { g.addColorStop(0, "#141a33"); g.addColorStop(1, "#2a2440"); } else { g.addColorStop(0, "#cfe3f2"); g.addColorStop(0.7, "#f6e9d6"); g.addColorStop(1, "#f4f2ec"); }
      ctx!.fillStyle = g; ctx!.fillRect(0, 0, width, HEIGHT);
      // Sun or moon.
      ctx!.fillStyle = dark ? "rgba(240,236,220,.9)" : "rgba(255,196,120,.85)";
      ctx!.beginPath(); ctx!.arc(width * 0.82, 64, dark ? 18 : 26, 0, Math.PI * 2); ctx!.fill();
      // Clouds, slow.
      ctx!.fillStyle = dark ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.75)";
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 260 - bgX * 0.12) % (width + 300) + width + 300) % (width + 300) - 150, cy = 40 + (i % 3) * 34;
        ctx!.beginPath(); ctx!.ellipse(cx, cy, 46, 14, 0, 0, Math.PI * 2); ctx!.ellipse(cx + 26, cy - 8, 30, 13, 0, 0, Math.PI * 2); ctx!.fill();
      }
      // Two layers of city.
      const layer = (b: { w: number; h: number }[], speed: number, color: string, win: string | null, scale: number) => {
        const total = b.reduce((a, x) => a + x.w + 6, 0);
        let x = -((bgX * speed) % total);
        const base = HEIGHT - GROUND;
        for (let k = 0; x < width; k++) {
          const bd = b[k % b.length]; const h = bd.h * scale;
          ctx!.fillStyle = color; ctx!.fillRect(x, base - h, bd.w, h);
          if (win) { ctx!.fillStyle = win; for (let wy = base - h + 10; wy < base - 10; wy += 16) for (let wx = x + 7; wx < x + bd.w - 9; wx += 12) if ((wx * 7 + wy * 3) % 5 < 2) ctx!.fillRect(wx, wy, 5, 7); }
          x += bd.w + 6;
        }
      };
      layer(far, 0.2, dark ? "rgba(90,96,140,.45)" : "rgba(140,150,175,.35)", null, 0.9);
      layer(near, 0.45, dark ? "rgba(40,44,70,.9)" : "rgba(110,116,140,.55)", dark ? "rgba(255,214,140,.7)" : "rgba(255,255,255,.55)", 0.75);
    }

    function draw() {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawSky();
      for (const w of walls) if (w.x < width + 10 && w.x + WALL_W > -10) drawWall(w);
      for (const c of coins) if (!c.taken && c.x < width + 30 && c.x > -30) drawCoin(c);
      ctx!.fillStyle = colors.ink;
      ctx!.globalAlpha = 0.1;
      ctx!.fillRect(0, HEIGHT - GROUND, width, GROUND);
      ctx!.globalAlpha = 1;
      const tilt = phaseRef.current === "running" ? Math.max(-0.45, Math.min(0.9, vy / 700)) : 0;
      drawBraino(birdX(), y, tilt);
    }

    const finish = () => {
      phaseRef.current = "over";
      setPhase("over");
      setBest((b) => {
        const next = Math.max(b, userCount);
        try { window.localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* storage blocked */ }
        return next;
      });
      wrap.classList.remove("is-flying");
    };

    const step = (dt: number) => {
      vy += GRAVITY * dt;
      y += vy * dt;
      const dx = SPEED * dt;
      bgX += dx;
      for (const w of walls) w.x -= dx;
      for (const c of coins) c.x -= dx;
      if (walls.length && walls[0].x + WALL_W < -20) walls.shift();
      coins = coins.filter((c) => c.x > -40);
      const lastWall = walls[walls.length - 1];
      if (lastWall && lastWall.x < width + SPACING) addWall(lastWall.x + SPACING);

      const bx = birdX();
      const r = BIRD * 0.3;
      if (y - r < 0) { y = r; vy = 0; }
      if (y + r > HEIGHT - GROUND) return finish();
      for (const w of walls) {
        if (bx + r > w.x + 9 && bx - r < w.x + WALL_W - 9) {
          if (y - r < w.gapY - GAP / 2 || y + r > w.gapY + GAP / 2) return finish();
        }
      }
      let changed = false;
      for (const c of coins) {
        if (c.taken) continue;
        const cr = c.gold ? 17 : 13;
        if (Math.hypot(c.x - bx, c.y - y) < cr + r) {
          c.taken = true;
          userCount += 1;
          if (c.gold) payCount += 1;
          changed = true;
        }
      }
      if (changed) {
        const m = money(userCount, payCount);
        setUsers(m.users);
        setPaying(payCount);
      }
    };

    const loop = (now: number) => {
      raf = 0;
      if (phaseRef.current !== "running" || !inView || document.hidden) return;
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      if (phaseRef.current === "running") raf = requestAnimationFrame(loop);
    };

    const resume = () => {
      if (raf || phaseRef.current !== "running" || !inView || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      readColors();
      reset();
      phaseRef.current = "running";
      setPhase("running");
      wrap.classList.add("is-flying");
      vy = FLAP;
      wrap.focus({ preventScroll: true });
      resume();
    };

    const flap = () => {
      if (phaseRef.current !== "running") return start();
      vy = FLAP;
    };

    actionRef.current = { flap, start };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "ArrowUp") return;
      const focused = document.activeElement === wrap;
      if (!focused && !(phaseRef.current === "running" && inView)) return;
      e.preventDefault();
      if (phaseRef.current === "over" && !focused) return;
      flap();
    };
    const onPointer = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      if (phaseRef.current === "over") return;
      e.preventDefault();
      flap();
    };
    const onVisibility = () => { if (!document.hidden) resume(); };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio > 0.15;
      if (inView) resume();
    }, { threshold: [0, 0.15, 0.5] });
    io.observe(wrap);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const mo = new MutationObserver(() => { readColors(); draw(); });
    mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ["data-theme"] });

    window.addEventListener("keydown", onKey, { passive: false });
    wrap.addEventListener("pointerdown", onPointer);
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    reset();
    draw();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("keydown", onKey);
      wrap.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const revenue = paying * PRICE;
  const reduced = prefersReducedMotion();

  return (
    <div
      className={`ff-game is-${phase}`}
      ref={wrapRef}
      role="region"
      tabIndex={0}
      aria-label="Flappy Founder, a small game. Press space or tap to flap."
    >
      <canvas ref={canvasRef} className="ff-canvas" aria-hidden="true" />

      <div className="ff-hud" aria-live="polite">
        <span>Users <b>{users}</b></span>
        <span>Revenue <b>${revenue}</b></span>
        <span className="ff-hud-best">Best <b>{best}</b></span>
      </div>

      {phase === "idle" ? (
        <div className={`ff-launch${reduced ? " is-still" : ""}`}>
          <p>Flappy Founder</p>
          <span>Fly Braino past the walls. Grab users. Every tenth one pays.</span>
          <button type="button" className="ff-btn" onClick={() => actionRef.current.start()}>Start the game</button>
          <small>Tap, click or press space to flap.</small>
        </div>
      ) : null}

      {phase === "over" ? (
        <div className="ff-over" role="status">
          <p>You reached {users} {users === 1 ? "user" : "users"} and ${revenue}. Braino Foundry gets you the real ones.</p>
          <div className="ff-over-go">
            <Link to="/foundry/app" className="ff-btn">Start free</Link>
            <button type="button" className="ff-btn ff-btn-ghost" onClick={() => actionRef.current.start()}>Play again</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
