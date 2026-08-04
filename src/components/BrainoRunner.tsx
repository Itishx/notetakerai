import { useEffect, useRef, useState } from "react";

/* ============================================================================
   BrainoRunner — the footer IS the game. A blue Mario-style sky band with a
   brick ground, hills and clouds; Braino (his coral face) is the mascot. Press
   Play, then jump (click / Space / ↑) over goombas and pipes that scroll in.
   A chiptune loops while you play and the notch up top shows "now playing".
   Pure DOM + WebAudio, no assets.
   ============================================================================ */

export default function BrainoRunner() {
  const areaRef = useRef<HTMLDivElement>(null);
  const brainoRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"idle" | "playing" | "over">("idle");
  const [score, setScore] = useState(0);
  const phaseRef = useRef<"idle" | "playing" | "over">("idle");
  phaseRef.current = phase;

  useEffect(() => {
    const area = areaRef.current, braino = brainoRef.current, layer = layerRef.current;
    if (!area || !braino || !layer) return;

    const GROUND = 46, BW = 44;
    let y = 0, vy = 0, onGround = true;
    const GRAV = 0.9, JUMP = 15.5;
    let obstacles: { el: HTMLDivElement; x: number; w: number; h: number }[] = [];
    let speed = 5, spawnTimer = 0, spawnGap = 90, score = 0, lastScore = -1, frame = 0, hovered = false, raf = 0;

    // chiptune
    let actx: AudioContext | null = null, master: GainNode | null = null, schedId = 0, noteI = 0, nextT = 0;
    const MELODY: [number, number][] = [[659, 0.14], [659, 0.14], [0, 0.14], [659, 0.14], [0, 0.14], [523, 0.14], [659, 0.14], [0, 0.14], [784, 0.28], [0, 0.28], [392, 0.28], [0, 0.28], [523, 0.2], [0, 0.14], [392, 0.2], [0, 0.14], [330, 0.2], [0, 0.14], [440, 0.14], [494, 0.14], [466, 0.14], [440, 0.2], [392, 0.16], [659, 0.16], [784, 0.16], [880, 0.2]];
    const playNote = (f: number, at: number, d: number) => {
      if (!actx || !master || f <= 0) return;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "square"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.5, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + d * 0.9);
      o.connect(g); g.connect(master); o.start(at); o.stop(at + d);
    };
    const sched = () => { if (!actx) return; while (nextT < actx.currentTime + 0.25) { const [f, d] = MELODY[noteI % MELODY.length]; playNote(f, nextT, d); nextT += d; noteI++; } };
    const startMusic = () => {
      if (actx) return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        actx = new AC(); master = actx.createGain(); master.gain.value = 0.05; master.connect(actx.destination);
        nextT = actx.currentTime + 0.05; noteI = 0; schedId = window.setInterval(sched, 60);
        window.dispatchEvent(new CustomEvent("braino-music", { detail: true }));
      } catch { /* audio unavailable */ }
    };
    const stopMusic = () => { window.clearInterval(schedId); if (actx) { actx.close().catch(() => {}); actx = null; master = null; } window.dispatchEvent(new CustomEvent("braino-music", { detail: false })); };

    const reset = () => { obstacles.forEach((o) => o.el.remove()); obstacles = []; y = 0; vy = 0; onGround = true; speed = 5; score = 0; frame = 0; spawnTimer = 0; braino.style.transform = "translateY(0)"; };
    const start = () => { if (phaseRef.current === "playing") return; reset(); phaseRef.current = "playing"; setPhase("playing"); startMusic(); };
    const jump = () => { if (onGround) { vy = JUMP; onGround = false; } };
    const over = () => { phaseRef.current = "over"; setPhase("over"); stopMusic(); };
    const act = () => { if (phaseRef.current === "playing") jump(); else start(); };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key === "Spacebar" ? " " : e.key;
      if (k !== " " && k !== "ArrowUp") return;
      if (!(hovered || phaseRef.current === "playing")) return;
      e.preventDefault(); act();
    };
    const onEnter = () => { hovered = true; }, onLeave = () => { hovered = false; };
    area.addEventListener("pointerdown", act);
    area.addEventListener("pointerenter", onEnter);
    area.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onKey, { passive: false });

    const spawn = () => {
      const el = document.createElement("div");
      const tall = Math.random() < 0.32;
      const w = tall ? 28 : 26, h = tall ? 44 : 26;
      el.className = "bf-ob " + (tall ? "pipe" : "goomba");
      el.style.width = w + "px"; el.style.height = h + "px"; el.style.bottom = GROUND + "px";
      layer.appendChild(el);
      obstacles.push({ el, x: area.clientWidth + 20, w, h });
    };

    const loop = () => {
      const W = area.clientWidth;
      if (phaseRef.current === "playing") {
        frame++;
        vy -= GRAV; y += vy; if (y <= 0) { y = 0; vy = 0; onGround = true; }
        braino.style.transform = `translateY(${-y}px)`;
        spawnTimer++; if (spawnTimer >= spawnGap) { spawn(); spawnTimer = 0; spawnGap = 66 + Math.random() * 72; }
        speed = 5 + Math.min(4.5, frame / 800);
        const bx = Math.max(38, W * 0.14);
        obstacles.forEach((o) => {
          o.x -= speed; o.el.style.transform = `translateX(${o.x}px)`;
          if (o.x < bx + BW - 8 && o.x + o.w > bx + 8 && y < o.h - 6) over();
        });
        obstacles = obstacles.filter((o) => { if (o.x + o.w < 0) { o.el.remove(); score++; return false; } return true; });
        if (score !== lastScore) { lastScore = score; setScore(score); }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf); stopMusic();
      window.removeEventListener("keydown", onKey);
      area.removeEventListener("pointerdown", act); area.removeEventListener("pointerenter", onEnter); area.removeEventListener("pointerleave", onLeave);
      obstacles.forEach((o) => o.el.remove());
    };
  }, []);

  return (
    <div className="bf-runner" ref={areaRef} role="button" tabIndex={0} aria-label="Play as Braino">
      <div className="bf-r-cloud a" /><div className="bf-r-cloud b" />
      <div className="bf-r-hill a" /><div className="bf-r-hill b" />
      <div className="bf-r-ground" />
      <div className="bf-r-obstacles" ref={layerRef} />
      <div className="bf-runner-braino" ref={brainoRef}><span className="bf-face big"><i /><i /></span></div>
      <div className="bf-r-score">Score {score}</div>
      {phase !== "playing" && (
        <div className="bf-r-overlay">
          <div className="bf-play">▶</div>
          <strong>{phase === "over" ? `Game over · ${score}` : "Play as Braino"}</strong>
          <span>Click / Space to {phase === "over" ? "play again" : "play"} · ↑ to jump</span>
        </div>
      )}
    </div>
  );
}
