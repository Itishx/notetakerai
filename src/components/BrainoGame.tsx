import { useEffect, useRef, useState } from "react";

/* ============================================================================
   BrainoGame — a tiny playable Mario-style platformer in the footer. Braino
   (his coral face) runs and jumps through a scrolling level of pipes, blocks,
   coins and goombas to a flag. A little WebAudio chiptune loops while you play,
   and the notch up top lights up "now playing" for as long as the game runs.
   Pure canvas + WebAudio, no assets. ← → move · ↑ / Space jump · tap to play.
   ============================================================================ */

export default function BrainoGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const H = 340, WORLD = 3000;
    let W = canvas.getBoundingClientRect().width || 640;
    let hovered = false, t = 0, camX = 0, score = 0, lastScore = -1;

    const GRAV = 0.62, JUMP = 11.8, SPD = 3.3;
    const groundY = () => H - 46;

    const player = { x: 60, y: 0, w: 30, h: 24, vx: 0, vy: 0, onGround: true, dir: 1 };
    let solids: { x: number; y: number; w: number; h: number; kind: "block" | "pipe" }[] = [];
    let coins: { x: number; y: number; got: boolean }[] = [];
    let enemies: { x: number; y: number; w: number; h: number; vx: number; min: number; max: number; alive: boolean }[] = [];
    const clouds = [{ x: 90, y: 44, s: 1 }, { x: 360, y: 28, s: 1.3 }, { x: 620, y: 58, s: 0.9 }];
    let flagX = WORLD - 150;

    function layout() {
      const g = groundY();
      solids = [
        { x: 360, y: g - 96, w: 36, h: 32, kind: "block" },
        { x: 900, y: g - 112, w: 36, h: 32, kind: "block" }, { x: 938, y: g - 112, w: 36, h: 32, kind: "block" },
        { x: 1600, y: g - 100, w: 36, h: 32, kind: "block" }, { x: 1650, y: g - 100, w: 36, h: 32, kind: "block" },
        { x: 2350, y: g - 116, w: 36, h: 32, kind: "block" },
        { x: 560, y: g - 60, w: 52, h: 60, kind: "pipe" },
        { x: 1250, y: g - 86, w: 52, h: 86, kind: "pipe" },
        { x: 2050, y: g - 60, w: 52, h: 60, kind: "pipe" },
      ];
      coins = [360, 918, 1625, 2350].map((x) => ({ x: x + 18, y: g - 150, got: false }))
        .concat([700, 1050, 1500, 1850, 2250, 2600].map((x) => ({ x, y: g - 28, got: false })));
      enemies = [
        { x: 800, y: g - 20, w: 24, h: 20, vx: -0.8, min: 680, max: 1000, alive: true },
        { x: 1750, y: g - 20, w: 24, h: 20, vx: 0.8, min: 1560, max: 1980, alive: true },
        { x: 2500, y: g - 20, w: 24, h: 20, vx: -0.8, min: 2380, max: 2760, alive: true },
      ];
      flagX = WORLD - 150;
      player.y = g - player.h; player.onGround = true;
    }

    const fit = () => { W = canvas.getBoundingClientRect().width || 640; canvas.width = W * dpr; canvas.height = H * dpr; layout(); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);

    /* ── chiptune: a little square-wave loop while the game runs ── */
    let actx: AudioContext | null = null, master: GainNode | null = null, schedId = 0, noteI = 0, nextT = 0;
    const MELODY: [number, number][] = [
      [659, 0.14], [659, 0.14], [0, 0.14], [659, 0.14], [0, 0.14], [523, 0.14], [659, 0.14], [0, 0.14],
      [784, 0.28], [0, 0.28], [392, 0.28], [0, 0.28], [523, 0.2], [0, 0.14], [392, 0.2], [0, 0.14], [330, 0.2], [0, 0.14],
      [440, 0.14], [494, 0.14], [466, 0.14], [440, 0.2], [392, 0.16], [659, 0.16], [784, 0.16], [880, 0.2],
    ];
    const playNote = (freq: number, at: number, dur: number) => {
      if (!actx || !master || freq <= 0) return;
      const o = actx.createOscillator(), gg = actx.createGain();
      o.type = "square"; o.frequency.value = freq;
      gg.gain.setValueAtTime(0.0001, at);
      gg.gain.linearRampToValueAtTime(0.5, at + 0.01);
      gg.gain.exponentialRampToValueAtTime(0.0001, at + dur * 0.9);
      o.connect(gg); gg.connect(master); o.start(at); o.stop(at + dur);
    };
    const scheduler = () => {
      if (!actx) return;
      while (nextT < actx.currentTime + 0.25) {
        const [f, d] = MELODY[noteI % MELODY.length];
        playNote(f, nextT, d); nextT += d; noteI++;
      }
    };
    const startMusic = () => {
      if (actx) return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        actx = new AC(); master = actx.createGain(); master.gain.value = 0.05; master.connect(actx.destination);
        nextT = actx.currentTime + 0.05; noteI = 0;
        schedId = window.setInterval(scheduler, 60);
        window.dispatchEvent(new CustomEvent("braino-music", { detail: true }));
      } catch { /* audio unavailable */ }
    };
    const stopMusic = () => {
      window.clearInterval(schedId);
      if (actx) { actx.close().catch(() => {}); actx = null; master = null; }
      window.dispatchEvent(new CustomEvent("braino-music", { detail: false }));
    };

    const begin = () => { if (!runningRef.current) { runningRef.current = true; setRunning(true); startMusic(); } };

    const keys: Record<string, boolean> = {};
    const gameKey = (k: string) => k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === " " || k === "Spacebar";
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key === "Spacebar" ? " " : e.key;
      if (!gameKey(k)) return;
      if (!(hovered || runningRef.current)) return;
      e.preventDefault(); keys[k] = down;
      if (down) begin();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd, { passive: false });
    window.addEventListener("keyup", ku);

    const onEnter = () => { hovered = true; };
    const onLeave = () => { hovered = false; keys["ArrowLeft"] = keys["ArrowRight"] = false; };
    const onTap = () => { begin(); keys[" "] = true; window.setTimeout(() => (keys[" "] = false), 130); };
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onTap);

    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath(); ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    };
    const drawCloud = (x: number, y: number, s: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      [[0, 0, 16], [16, -6, 20], [34, 0, 16], [16, 6, 18]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); });
    };

    let raf = 0;
    const step = () => {
      t++;
      const g = groundY();
      if (runningRef.current) {
        player.vx = 0;
        if (keys["ArrowLeft"]) { player.vx = -SPD; player.dir = -1; }
        if (keys["ArrowRight"]) { player.vx = SPD; player.dir = 1; }
        if ((keys["ArrowUp"] || keys[" "]) && player.onGround) { player.vy = -JUMP; player.onGround = false; }
        player.vy += GRAV;
        player.x += player.vx; player.y += player.vy;
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > WORLD) player.x = WORLD - player.w;
        player.onGround = false;
        if (player.y + player.h >= g) { player.y = g - player.h; player.vy = 0; player.onGround = true; }
        // solid boxes (blocks + pipes): min-penetration resolve
        solids.forEach((b) => {
          if (player.x + player.w > b.x && player.x < b.x + b.w && player.y + player.h > b.y && player.y < b.y + b.h) {
            const dT = player.y + player.h - b.y, dB = b.y + b.h - player.y, dL = player.x + player.w - b.x, dR = b.x + b.w - player.x;
            const m = Math.min(dT, dB, dL, dR);
            if (m === dT && player.vy >= 0) { player.y = b.y - player.h; player.vy = 0; player.onGround = true; }
            else if (m === dB && player.vy < 0) { player.y = b.y + b.h; player.vy = 0; }
            else if (m === dL) { player.x = b.x - player.w; }
            else { player.x = b.x + b.w; }
          }
        });
        coins.forEach((c) => { if (!c.got && Math.abs(player.x + player.w / 2 - c.x) < 20 && Math.abs(player.y + player.h / 2 - c.y) < 24) { c.got = true; score += 50; } });
        enemies.forEach((en) => {
          if (!en.alive) return;
          en.x += en.vx; if (en.x < en.min || en.x + en.w > en.max) en.vx *= -1;
          if (player.x + player.w > en.x && player.x < en.x + en.w && player.y + player.h > en.y && player.y < en.y + en.h) {
            if (player.vy > 0 && player.y + player.h - en.y < 16) { en.alive = false; score += 100; player.vy = -7.5; }
            else { player.x = 60; player.y = g - player.h; player.vx = 0; player.vy = 0; camX = 0; }
          }
        });
        if (player.x > flagX) { score += 500; player.x = 60; player.y = g - player.h; player.vy = 0; camX = 0; layout(); }
        camX = Math.max(0, Math.min(player.x - W * 0.38, WORLD - W));
      }

      // ── draw ──
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#69b8ff"); sky.addColorStop(1, "#cfebff");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      clouds.forEach((c) => { const sx = c.x - camX * 0.4; const wx = ((sx % (W + 140)) + W + 140) % (W + 140) - 70; drawCloud(wx, c.y, c.s); });
      // ground
      ctx.fillStyle = "#7a4a24"; ctx.fillRect(0, g, W, H - g);
      ctx.fillStyle = "#3fae5a"; ctx.fillRect(0, g, W, 8);
      ctx.strokeStyle = "rgba(0,0,0,0.13)"; ctx.lineWidth = 1;
      for (let x = -(camX % 32); x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, g + 8); ctx.lineTo(x, H); ctx.stroke(); }
      // flag
      const fsx = flagX - camX;
      if (fsx > -40 && fsx < W + 40) {
        ctx.fillStyle = "#cfd3d6"; ctx.fillRect(fsx, g - 130, 4, 130);
        ctx.fillStyle = "#3a8f5f"; ctx.beginPath(); ctx.moveTo(fsx + 4, g - 128); ctx.lineTo(fsx + 40, g - 118); ctx.lineTo(fsx + 4, g - 108); ctx.fill();
      }
      // solids
      solids.forEach((b) => {
        const sx = b.x - camX; if (sx < -60 || sx > W + 60) return;
        if (b.kind === "pipe") {
          ctx.fillStyle = "#2f9e4f"; rr(sx, b.y, b.w, b.h, 6); ctx.fill();
          ctx.fillStyle = "#37b85c"; rr(sx - 3, b.y, b.w + 6, 16, 6); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(sx + 7, b.y + 18, 5, b.h - 22);
        } else {
          ctx.fillStyle = "#c98a2e"; rr(sx, b.y, b.w, b.h, 5); ctx.fill();
          ctx.fillStyle = "#e8b45a"; rr(sx + 2, b.y + 2, b.w - 4, b.h - 6, 4); ctx.fill();
          ctx.fillStyle = "#8a5a12"; ctx.font = "bold 20px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", sx + b.w / 2, b.y + b.h / 2 + 1);
        }
      });
      // coins
      coins.forEach((c) => {
        if (c.got) return; const sx = c.x - camX; if (sx < -20 || sx > W + 20) return;
        const rw = Math.max(2.5, 8 * Math.abs(Math.cos(t * 0.06 + c.x)));
        ctx.fillStyle = "#f2c14e"; ctx.beginPath(); ctx.ellipse(sx, c.y, rw, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#c9922a"; ctx.lineWidth = 1.5; ctx.stroke();
      });
      // enemies
      enemies.forEach((en) => {
        if (!en.alive) return; const sx = en.x - camX; if (sx < -40 || sx > W + 40) return;
        ctx.fillStyle = "#8a4b2a"; rr(sx, en.y, en.w, en.h, 7); ctx.fill();
        ctx.fillStyle = "#f4d9c4"; rr(sx + 3, en.y + en.h - 7, en.w - 6, 6, 3); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx + 8, en.y + 8, 3.4, 0, Math.PI * 2); ctx.arc(sx + en.w - 8, en.y + 8, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1b1713"; ctx.beginPath(); ctx.arc(sx + 9, en.y + 8, 1.6, 0, Math.PI * 2); ctx.arc(sx + en.w - 7, en.y + 8, 1.6, 0, Math.PI * 2); ctx.fill();
      });
      // player (Braino face)
      const px = player.x - camX;
      const grad = ctx.createLinearGradient(px, player.y, px, player.y + player.h);
      grad.addColorStop(0, "#F6A8A2"); grad.addColorStop(0.6, "#E8786E"); grad.addColorStop(1, "#C9544A");
      ctx.fillStyle = grad; rr(px, player.y, player.w, player.h, 7); ctx.fill();
      const ex = player.dir * 2;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px + 10 + ex, player.y + 10, 5, 0, Math.PI * 2); ctx.arc(px + 20 + ex, player.y + 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1B1713"; ctx.beginPath(); ctx.arc(px + 11 + ex, player.y + 10, 2.4, 0, Math.PI * 2); ctx.arc(px + 21 + ex, player.y + 10, 2.4, 0, Math.PI * 2); ctx.fill();

      if (score !== lastScore) { lastScore = score; setScore(score); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const onVis = () => { if (document.hidden) { keys["ArrowLeft"] = keys["ArrowRight"] = false; } };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); stopMusic();
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerenter", onEnter); canvas.removeEventListener("pointerleave", onLeave); canvas.removeEventListener("pointerdown", onTap);
    };
  }, []);

  return (
    <div className="bf-game" aria-label="Play as Braino">
      <div className="bf-game-hud"><span className="bf-coin" />{score}</div>
      <canvas ref={canvasRef} className="bf-game-canvas" />
      {!running && (
        <div className="bf-game-start">
          <strong>Braino lives here.</strong>
          <span>Click / press Space to play · ← → move · ↑ jump</span>
        </div>
      )}
    </div>
  );
}
