import { useEffect, useRef, useState } from 'react';

const S = 56;
const GRAV = 0.42;
const FRIC = 0.91;
const BOUNCE = 0.5;
const WALK_SPD = 3.2;
const MAX_PUPIL = 1.6;
const THROW_SCALE = 0.11;
const FLOOR_PAD = 18;

interface V2 { x: number; y: number; }

interface ViewState {
  x: number; y: number;
  pl: V2; pr: V2;
  al: number; ar: number;
  squish: number;
  flipX: boolean;
  grabbing: boolean;
}

function BrainSVG({ pl, pr, al, ar, squish }: {
  pl: V2; pr: V2; al: number; ar: number; squish: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      style={{
        width: S, height: S, overflow: 'visible', display: 'block',
        transform: `scaleY(${squish})`,
        transformOrigin: '50% 100%',
      }}
    >
      <defs>
        <linearGradient id="bm-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2" />
          <stop offset="0.55" stopColor="#E8786E" />
          <stop offset="1" stopColor="#C9544A" />
        </linearGradient>
        <linearGradient id="bm-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9645A" />
          <stop offset="1" stopColor="#9C3E36" />
        </linearGradient>
        <radialGradient id="bm-glow" cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* White sticker outline layer */}
      <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
      <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
      <g style={{ transformOrigin: '22px 52px', transform: `rotate(${al}deg)` }}>
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      </g>
      <g style={{ transformOrigin: '78px 52px', transform: `rotate(${ar}deg)` }}>
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
      </g>
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="white"
        transform="scale(1.08) translate(-3.7, -3.7)"
      />

      {/* Brain stem */}
      <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#bm-dark)" />

      {/* Cerebellum */}
      <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#bm-dark)" />
      <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <path d="M 64 77 Q 70 79 76 77" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />

      {/* Brain body */}
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="url(#bm-fill)"
      />
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="url(#bm-glow)"
      />

      {/* Gyri (brain folds) */}
      <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />

      {/* Arms */}
      <g style={{ transformOrigin: '22px 52px', transform: `rotate(${al}deg)` }}>
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#bm-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="6" cy="63" r="5.5" fill="url(#bm-fill)" />
      </g>
      <g style={{ transformOrigin: '78px 52px', transform: `rotate(${ar}deg)` }}>
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#bm-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="94" cy="63" r="5.5" fill="url(#bm-fill)" />
      </g>

      {/* Eyes — pupils shift toward cursor */}
      <circle cx="38" cy="48" r="6.5" fill="white" />
      <circle cx={38 + pl.x} cy={48 + pl.y} r="3.2" fill="#1B1713" />
      <circle cx={38 + pl.x + 1} cy={47.6 + pl.y} r="1.1" fill="white" />

      <circle cx="62" cy="48" r="6.5" fill="white" />
      <circle cx={62 + pr.x} cy={48 + pr.y} r="3.2" fill="#1B1713" />
      <circle cx={62 + pr.x + 1} cy={47.6 + pr.y} r="1.1" fill="white" />

      {/* Cheeks */}
      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      {/* Smile */}
      <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function BrainMascot() {
  const initX = window.innerWidth - S - 24;
  const initY = window.innerHeight - S - FLOOR_PAD;

  const [view, setView] = useState<ViewState>({
    x: initX, y: initY,
    pl: { x: 0, y: 0 }, pr: { x: 0, y: 0 },
    al: 0, ar: 0,
    squish: 1,
    flipX: false,
    grabbing: false,
  });

  const s = useRef({
    pos: { x: initX, y: initY } as V2,
    vel: { x: 0, y: 0 } as V2,
    walkPhase: 0,
    idlePhase: 0,
    squish: 1,
    squishVel: 0,
    dragging: false,
    dragOff: { x: 0, y: 0 } as V2,
    mhist: [] as { x: number; y: number; t: number }[],
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 } as V2,
    flipX: false,
    lastT: 0,
    scrolling: false,
    scrollTimer: 0 as ReturnType<typeof setTimeout>,
  });

  // RAF physics + animation loop
  useEffect(() => {
    let raf: number;
    const r = s.current;

    const loop = (t: number) => {
      const dt = Math.min(t - (r.lastT || t), 50) / 16;
      r.lastT = t;
      r.idlePhase += 0.025 * dt;

      if (!r.dragging) {
        let { x, y } = r.pos;
        let { x: vx, y: vy } = r.vel;

        const floorY = window.innerHeight - S - FLOOR_PAD;
        const speed2 = vx * vx + vy * vy;
        const onFloor = y >= floorY - 1;
        const airborne = speed2 > 0.3 || !onFloor;

        if (airborne) {
          vy += GRAV * dt;
          vx *= Math.pow(FRIC, dt);
          x += vx * dt;
          y += vy * dt;

          // Floor bounce with squish
          if (y >= floorY) {
            const impact = Math.abs(vy);
            y = floorY;
            vy = -vy * BOUNCE;
            vx *= 0.8;
            if (Math.abs(vy) < 0.8) vy = 0;
            if (impact > 2.5) {
              r.squish = Math.max(0.65, 1 - impact * 0.045);
              r.squishVel = 0.07;
            }
          }

          // Ceiling
          if (y < 0) { y = 0; vy = Math.abs(vy) * 0.5; }
          // Walls
          if (x < 0) { x = 0; vx = Math.abs(vx) * 0.65; }
          if (x > window.innerWidth - S) { x = window.innerWidth - S; vx = -Math.abs(vx) * 0.65; }

          r.vel = { x: vx, y: vy };
          r.pos = { x, y };
          r.walkPhase += 0.07 * dt;
        } else {
          // Walk toward home (bottom-right corner)
          const homeX = window.innerWidth - S - 24;
          const dx = homeX - x;
          const dist = Math.abs(dx);

          if (dist > 3 || r.scrolling) {
            const spd = WALK_SPD * dt;
            x += dx > 0 ? Math.min(spd, dx) : Math.max(-spd, dx);
            y = floorY;
            r.flipX = dx < 0;
            r.walkPhase += 0.18 * dt;
          }
          r.vel = { x: 0, y: 0 };
          r.pos = { x, y };
        }

        // Squish spring back
        if (Math.abs(r.squish - 1) > 0.002) {
          r.squishVel += (1 - r.squish) * 0.25;
          r.squishVel *= 0.7;
          r.squish += r.squishVel;
          if (Math.abs(r.squish - 1) < 0.002 && Math.abs(r.squishVel) < 0.001) {
            r.squish = 1; r.squishVel = 0;
          }
        }
      }

      // Eye tracking toward cursor
      const eyeCx = r.pos.x + S / 2;
      const eyeCy = r.pos.y + S * 0.47;
      const mdx = r.mouse.x - eyeCx;
      const mdy = r.mouse.y - eyeCy;
      const md = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
      const mf = Math.min(md / 130, 1);
      const rawOx = (mdx / md) * MAX_PUPIL * mf;
      const oy = (mdy / md) * MAX_PUPIL * mf;
      // Mirror pupil offset x when brain faces left so eyes still look at cursor
      const ox = r.flipX ? -rawOx : rawOx;

      // Arm animation by state
      const wp = r.walkPhase;
      const ip = r.idlePhase;
      const floorY2 = window.innerHeight - S - FLOOR_PAD;
      const speed2v = r.vel.x ** 2 + r.vel.y ** 2;
      const onFloor2 = r.pos.y >= floorY2 - 2;
      const flying = speed2v > 0.3 || !onFloor2;
      const homeX = window.innerWidth - S - 24;
      const walking = !flying && (r.scrolling || Math.abs(r.pos.x - homeX) > 3);

      let al: number, ar: number;
      if (r.dragging) {
        al = -18; ar = 18; // raised arms when grabbed
      } else if (walking) {
        al = Math.sin(wp) * 26;
        ar = Math.sin(wp + Math.PI) * 26;
      } else if (flying) {
        al = Math.sin(wp * 0.8 + 0.8) * 20;
        ar = Math.sin(wp * 0.8 - 0.8) * 20;
      } else {
        // Gentle idle wave
        al = Math.sin(ip * 0.9) * 11;
        ar = Math.sin(ip * 0.9 + Math.PI) * 11;
      }

      const bob = walking ? Math.sin(wp * 2) * 2.8 : 0;

      setView({
        x: r.pos.x,
        y: r.pos.y + bob,
        pl: { x: ox, y: oy },
        pr: { x: ox, y: oy },
        al, ar,
        squish: r.squish,
        flipX: r.flipX,
        grabbing: r.dragging,
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Global pointer + scroll events
  useEffect(() => {
    const r = s.current;

    const onMouseMove = (e: MouseEvent) => {
      r.mouse = { x: e.clientX, y: e.clientY };
      if (r.dragging) {
        const now = Date.now();
        r.mhist.push({ x: e.clientX, y: e.clientY, t: now });
        // Slide a 120ms window — keeps only recent movement, not the whole drag
        while (r.mhist.length > 1 && now - r.mhist[0].t > 120) r.mhist.shift();
        r.pos = { x: e.clientX - r.dragOff.x, y: e.clientY - r.dragOff.y };
      }
    };

    const onMouseUp = () => {
      if (!r.dragging) return;
      r.dragging = false;
      const now = Date.now();
      // Only the last 80ms captures the actual throw flick, not the whole drag path
      const recent = r.mhist.filter(p => now - p.t <= 80);
      if (recent.length >= 2) {
        const last = recent[recent.length - 1];
        const first = recent[0];
        const dt = (last.t - first.t) / 1000;
        if (dt > 0.005) {
          r.vel = {
            x: Math.max(-20, Math.min(20, ((last.x - first.x) / dt) * THROW_SCALE)),
            y: Math.max(-20, Math.min(20, ((last.y - first.y) / dt) * THROW_SCALE)),
          };
        }
      }
      r.mhist = [];
    };

    const onScroll = () => {
      r.scrolling = true;
      clearTimeout(r.scrollTimer);
      r.scrollTimer = setTimeout(() => { r.scrolling = false; }, 900);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      r.mouse = { x: t.clientX, y: t.clientY };
      if (r.dragging) {
        const now = Date.now();
        r.mhist.push({ x: t.clientX, y: t.clientY, t: now });
        while (r.mhist.length > 1 && now - r.mhist[0].t > 120) r.mhist.shift();
        r.pos = { x: t.clientX - r.dragOff.x, y: t.clientY - r.dragOff.y };
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
      clearTimeout(s.current.scrollTimer);
    };
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = s.current;
    r.dragging = true;
    r.dragOff = { x: e.clientX - r.pos.x, y: e.clientY - r.pos.y };
    r.vel = { x: 0, y: 0 };
    r.mhist = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const r = s.current;
    r.dragging = true;
    r.dragOff = { x: t.clientX - r.pos.x, y: t.clientY - r.pos.y };
    r.vel = { x: 0, y: 0 };
    r.mhist = [{ x: t.clientX, y: t.clientY, t: Date.now() }];
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: 'fixed',
        left: view.x,
        top: view.y,
        width: S,
        height: S,
        zIndex: 99999,
        cursor: view.grabbing ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        transform: `scaleX(${view.flipX ? -1 : 1})`,
        transformOrigin: '50% 100%',
        filter: view.grabbing
          ? 'drop-shadow(0 18px 36px rgba(0,0,0,0.42))'
          : 'drop-shadow(0 5px 14px rgba(0,0,0,0.24))',
        willChange: 'left, top, transform, filter',
      }}
    >
      <BrainSVG
        pl={view.pl}
        pr={view.pr}
        al={view.al}
        ar={view.ar}
        squish={view.squish}
      />
    </div>
  );
}
