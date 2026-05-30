import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Physics constants ────────────────────────────────────────────────────────
const S = 56;
const GRAV = 0.42;
const FRIC = 0.91;
const BOUNCE = 0.5;
const WALK_SPD = 3.2;
const MAX_PUPIL = 1.6;
const THROW_SCALE = 0.11;
const FLOOR_PAD = 18;

// ─── Chat constants ───────────────────────────────────────────────────────────
const OPENING_LINES = [
  "Checking me out, are we?",
  "Hello there, human. How may I help?",
  "Oh good, a visitor. I was getting lonely.",
  "I've read every word on this page. Test me.",
  "Psst — click me. I know things.",
  "Still deciding? Let me make it easy.",
  "Braino online. Neurons firing. Ready.",
  "Don't just stare. Ask me something.",
  "I exist, therefore I assist.",
  "New visitor detected. Initiating charm sequence.",
  "92% of people who click me end up installing me. Just saying.",
  "Your cursor is suspiciously close. Coincidence? I think not.",
];

const BRAINO_NOTES_CONTEXT = `You are Braino, the AI mascot for trybraino.com. A browser extension that floats as a brain mascot on every tab.

About Braino:
- Extension for Chrome, Arc, Brave, Edge (Mac/Windows/Linux)
- Free: 25 Delegate tasks/month | Pro: $12/mo (₹399 in India)
- Features: reads any page (live DOM, not screenshots), voice chat, lecture recording, Delegate (autonomous browser agent, ~1s per step — much faster than Claude Computer Use which takes ~6s per step via screenshots)
- Install: download from trybraino.com
- Built by a solo founder

You are chatting with website visitors as a preview. Be witty, sharp, direct — like a smart friend who's an AI, NOT a corporate chatbot. Keep answers SHORT (2-3 sentences max). If you don't know something, say so briefly and point them to install the extension.`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface V2 { x: number; y: number; }

interface ViewState {
  x: number; y: number;
  pl: V2; pr: V2;
  al: number; ar: number;
  squish: number;
  flipX: boolean;
  grabbing: boolean;
}

interface Message { role: 'braino' | 'user'; text: string; }

// ─── Confetti ─────────────────────────────────────────────────────────────────
function triggerConfetti() {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:999997;overflow:hidden;';
  const colors = ['#E8786E', '#F6A8A2', '#F7B26B', '#6BD4A0', '#7BB2F7', '#F7E26B', '#C9544A'];
  for (let i = 0; i < 75; i++) {
    const p = document.createElement('div');
    const c = colors[Math.floor(Math.random() * colors.length)];
    const sz = 6 + Math.random() * 9;
    const dur = 1.4 + Math.random() * 1.6;
    const del = Math.random() * 0.7;
    const x = Math.random() * 100;
    p.style.cssText = `position:absolute;top:-20px;left:${x}%;width:${sz}px;height:${sz}px;background:${c};border-radius:${Math.random() > 0.5 ? '50%' : '3px'};animation:brainoConfettiFall ${dur}s ease-in ${del}s forwards;`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4500);
}

// ─── Party tricks ─────────────────────────────────────────────────────────────
function handlePartyTrick(input: string): { text: string; action?: () => void } | null {
  const lower = input.toLowerCase().trim();

  const playMatch = lower.match(/^play\s+(.+)/);
  if (playMatch) {
    const query = playMatch[1];
    return {
      text: `Opening YouTube for "${query}" — enjoy! 🎵`,
      action: () => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank'),
    };
  }

  if (/see it happen|delegate.*demo|demo.*delegate/.test(lower)) {
    return {
      text: "Opening a browser automation demo — this is exactly what Delegate does, pointed at your actual tabs. 🤖",
      action: () => window.open('https://www.youtube.com/results?search_query=ai+browser+automation+demo', '_blank'),
    };
  }

  if (/pricing|how much|cost/.test(lower) && /take|show|go|scroll|where/.test(lower)) {
    return {
      text: "Scrolling to pricing — spoiler: free plan exists. 💰",
      action: () => {
        const el = document.getElementById('pricing') ?? document.querySelector('[id*="pricing"]');
        el ? el.scrollIntoView({ behavior: 'smooth' }) : window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      },
    };
  }
  if (/take.*features|show.*features/.test(lower)) {
    return {
      text: "Let me show you what I'm made of! ✨",
      action: () => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }),
    };
  }
  if (/take.*delegate|show.*delegate/.test(lower)) {
    return {
      text: "Heading to Delegate — the autonomous mode. 🤖",
      action: () => document.getElementById('delegate')?.scrollIntoView({ behavior: 'smooth' }),
    };
  }
  if (/back.*top|scroll.*top|go.*top/.test(lower)) {
    return {
      text: "Back to the top! 🚀",
      action: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    };
  }

  if (/how.*install|install me|download|add.*chrome|get.*extension/.test(lower)) {
    return {
      text: "Downloading now! Unzip, open chrome://extensions, enable developer mode, drag it in. ~15 seconds.",
      action: () => window.open('/braino-extension.zip', '_blank'),
    };
  }

  if (/celebrat|confetti|party|woohoo|let'?s? go/.test(lower)) {
    return {
      text: "🎉🎉🎉 THAT'S THE ENERGY! (Install me and every tab gets this vibe.)",
      action: triggerConfetti,
    };
  }

  if (/tell.*joke|joke|make.*laugh/.test(lower)) {
    const jokes = [
      "Why do developers prefer dark mode? Light attracts bugs. 🐛",
      "What's the difference between me and ChatGPT? I actually read the page you're on. 😌",
      "Why did the browser agent take 40 seconds? It was waiting for screenshots. (Not my problem.)",
      "I tried to write a joke about AI. It kept finishing my sentences and ruining the punchline.",
    ];
    return { text: jokes[Math.floor(Math.random() * jokes.length)] };
  }

  if (/^will .+\?|magic 8|8.?ball|should i/.test(lower)) {
    const answers = [
      "Signs point to yes ✨", "Without a doubt 💯", "Ask again after installing me 🤔",
      "My sources say no 🚫", "Outlook good 🌟", "Very doubtful 😬",
      "It is certain ✅", "Better not tell you now 🙊",
    ];
    return { text: answers[Math.floor(Math.random() * answers.length)] };
  }

  if (/roast|compare.*claude|claude computer|computer use/.test(lower)) {
    return { text: "Claude Computer Use: screenshot → vision model → 6s/step. Me: read DOM → act → 1s/step. Five steps: them 30-40s, me 8-12s. Not competitive though. 😇" };
  }

  if (/meaning of life/.test(lower)) {
    return { text: "42. Obviously. Now stop philosophizing and install me. 🧠" };
  }

  return null;
}

// ─── AI call ──────────────────────────────────────────────────────────────────
async function callBrainoAI(message: string, history: Message[]): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const chatHistory = history.slice(-8).map(m => ({
    role: m.role === 'braino' ? 'assistant' : 'user',
    content: m.text,
  }));

  const res = await fetch(`${supabaseUrl}/functions/v1/chat-about-notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ message, chatHistory, notes: BRAINO_NOTES_CONTEXT }),
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  return (data.reply as string) || "My neurons hiccuped. Try again?";
}

type WakePhase = 'sleeping' | 'yellow' | 'green' | 'awake';

// ─── BrainSVG ─────────────────────────────────────────────────────────────────
function BrainSVG({ pl, pr, al, ar, squish, wakePhase = 'awake' }: {
  pl: V2; pr: V2; al: number; ar: number; squish: number; wakePhase?: WakePhase;
}) {
  const eyesClosed = wakePhase === 'sleeping' || wakePhase === 'yellow';
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
        fill="white" transform="scale(1.08) translate(-3.7, -3.7)"
      />
      <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#bm-dark)" />
      <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#bm-dark)" />
      <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      <path d="M 64 77 Q 70 79 76 77" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="url(#bm-fill)"
      />
      <path
        d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="url(#bm-glow)"
      />
      <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      <g style={{ transformOrigin: '22px 52px', transform: `rotate(${al}deg)` }}>
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#bm-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="6" cy="63" r="5.5" fill="url(#bm-fill)" />
      </g>
      <g style={{ transformOrigin: '78px 52px', transform: `rotate(${ar}deg)` }}>
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#bm-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="94" cy="63" r="5.5" fill="url(#bm-fill)" />
      </g>
      <circle cx="38" cy="48" r="6.5" fill="white" />
      {eyesClosed
        ? <path d="M 31.5 48 Q 38 54 44.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
        : <><circle cx={38 + pl.x} cy={48 + pl.y} r="3.2" fill="#1B1713" /><circle cx={38 + pl.x + 1} cy={47.6 + pl.y} r="1.1" fill="white" /></>
      }
      <circle cx="62" cy="48" r="6.5" fill="white" />
      {eyesClosed
        ? <path d="M 55.5 48 Q 62 54 68.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
        : <><circle cx={62 + pr.x} cy={48 + pr.y} r="3.2" fill="#1B1713" /><circle cx={62 + pr.x + 1} cy={47.6 + pr.y} r="1.1" fill="white" /></>
      }
      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── BrainMascot ─────────────────────────────────────────────────────────────
export default function BrainMascot() {
  const initX = window.innerWidth - S - 24;
  const initY = window.innerHeight - S - FLOOR_PAD;

  const [wakePhase, setWakePhase] = useState<WakePhase>('sleeping');

  useEffect(() => {
    const t1 = setTimeout(() => setWakePhase('yellow'), 800);
    const t2 = setTimeout(() => setWakePhase('green'), 2000);
    const t3 = setTimeout(() => setWakePhase('awake'), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const [view, setView] = useState<ViewState>({
    x: initX, y: initY,
    pl: { x: 0, y: 0 }, pr: { x: 0, y: 0 },
    al: 0, ar: 0, squish: 1, flipX: false, grabbing: false,
  });

  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [widgetAnchor, setWidgetAnchor] = useState({ right: 92, bottom: 18 });
  const [widgetDragging, setWidgetDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const openChatCallbackRef = useRef<() => void>(() => {});
  const widgetDragRef = useRef({ dragging: false, startX: 0, startY: 0, startRight: 92, startBottom: 18 });

  const s = useRef({
    pos: { x: initX, y: initY } as V2,
    vel: { x: 0, y: 0 } as V2,
    walkPhase: 0, idlePhase: 0,
    squish: 1, squishVel: 0,
    dragging: false,
    dragOff: { x: 0, y: 0 } as V2,
    dragStartX: 0, dragStartY: 0,
    mhist: [] as { x: number; y: number; t: number }[],
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 } as V2,
    flipX: false, lastT: 0,
    scrolling: false,
    scrollTimer: null as ReturnType<typeof setTimeout> | null,
  });

  // ── 10-second auto-open ───────────────────────────────────────────────────
  useEffect(() => {
    const skipPaths = ['/auth', '/dashboard', '/assistant-panel'];
    if (skipPaths.some(p => window.location.pathname.startsWith(p))) return;
    const t = setTimeout(() => {
      setChatOpen(true);
    }, 10000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-scroll messages ──────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiLoading]);

  // ── Focus input when chat opens ───────────────────────────────────────────
  useEffect(() => {
    if (chatOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [chatOpen]);

  // ── Physics RAF loop ──────────────────────────────────────────────────────
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
          if (y >= floorY) {
            const impact = Math.abs(vy);
            y = floorY; vy = -vy * BOUNCE; vx *= 0.8;
            if (Math.abs(vy) < 0.8) vy = 0;
            if (impact > 2.5) { r.squish = Math.max(0.65, 1 - impact * 0.045); r.squishVel = 0.07; }
          }
          if (y < 0) { y = 0; vy = Math.abs(vy) * 0.5; }
          if (x < 0) { x = 0; vx = Math.abs(vx) * 0.65; }
          if (x > window.innerWidth - S) { x = window.innerWidth - S; vx = -Math.abs(vx) * 0.65; }
          r.vel = { x: vx, y: vy };
          r.pos = { x, y };
          r.walkPhase += 0.07 * dt;
        } else {
          const homeX = window.innerWidth - S - 24;
          const dx = homeX - x;
          if (Math.abs(dx) > 3 || r.scrolling) {
            const spd = WALK_SPD * dt;
            x += dx > 0 ? Math.min(spd, dx) : Math.max(-spd, dx);
            y = floorY;
            r.flipX = dx < 0;
            r.walkPhase += 0.18 * dt;
          }
          r.vel = { x: 0, y: 0 };
          r.pos = { x, y };
        }

        if (Math.abs(r.squish - 1) > 0.002) {
          r.squishVel += (1 - r.squish) * 0.25;
          r.squishVel *= 0.7;
          r.squish += r.squishVel;
          if (Math.abs(r.squish - 1) < 0.002 && Math.abs(r.squishVel) < 0.001) { r.squish = 1; r.squishVel = 0; }
        }
      }

      const eyeCx = r.pos.x + S / 2;
      const eyeCy = r.pos.y + S * 0.47;
      const mdx = r.mouse.x - eyeCx;
      const mdy = r.mouse.y - eyeCy;
      const md = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
      const mf = Math.min(md / 130, 1);
      const rawOx = (mdx / md) * MAX_PUPIL * mf;
      const oy = (mdy / md) * MAX_PUPIL * mf;
      const ox = r.flipX ? -rawOx : rawOx;

      const wp = r.walkPhase;
      const ip = r.idlePhase;
      const floorY2 = window.innerHeight - S - FLOOR_PAD;
      const speed2v = r.vel.x ** 2 + r.vel.y ** 2;
      const onFloor2 = r.pos.y >= floorY2 - 2;
      const flying = speed2v > 0.3 || !onFloor2;
      const homeX = window.innerWidth - S - 24;
      const walking = !flying && (r.scrolling || Math.abs(r.pos.x - homeX) > 3);

      let al: number, ar: number;
      if (r.dragging) { al = -18; ar = 18; }
      else if (walking) { al = Math.sin(wp) * 26; ar = Math.sin(wp + Math.PI) * 26; }
      else if (flying) { al = Math.sin(wp * 0.8 + 0.8) * 20; ar = Math.sin(wp * 0.8 - 0.8) * 20; }
      else { al = Math.sin(ip * 0.9) * 11; ar = Math.sin(ip * 0.9 + Math.PI) * 11; }

      const bob = walking ? Math.sin(wp * 2) * 2.8 : 0;

      setView({
        x: r.pos.x, y: r.pos.y + bob,
        pl: { x: ox, y: oy }, pr: { x: ox, y: oy },
        al, ar, squish: r.squish, flipX: r.flipX, grabbing: r.dragging,
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Global pointer + scroll events ────────────────────────────────────────
  useEffect(() => {
    const r = s.current;

    const onMouseMove = (e: MouseEvent) => {
      r.mouse = { x: e.clientX, y: e.clientY };
      if (r.dragging) {
        const now = Date.now();
        r.mhist.push({ x: e.clientX, y: e.clientY, t: now });
        while (r.mhist.length > 1 && now - r.mhist[0].t > 120) r.mhist.shift();
        r.pos = { x: e.clientX - r.dragOff.x, y: e.clientY - r.dragOff.y };
      }
      const wd = widgetDragRef.current;
      if (wd.dragging) {
        const dx = e.clientX - wd.startX;
        const dy = e.clientY - wd.startY;
        setWidgetAnchor({
          right: Math.max(0, wd.startRight - dx),
          bottom: Math.max(0, wd.startBottom - dy),
        });
      }
    };

    const onMouseUp = () => {
      if (widgetDragRef.current.dragging) {
        widgetDragRef.current.dragging = false;
        setWidgetDragging(false);
      }
      if (!r.dragging) return;
      r.dragging = false;

      const first = r.mhist[0];
      const last = r.mhist[r.mhist.length - 1] ?? first;
      const isClick = !first || Math.hypot(last.x - first.x, last.y - first.y) < 8;

      if (isClick) {
        r.mhist = [];
        r.vel = { x: 0, y: 0 };
        openChatCallbackRef.current();
        return;
      }

      const now = Date.now();
      const recent = r.mhist.filter(p => now - p.t <= 80);
      if (recent.length >= 2) {
        const last2 = recent[recent.length - 1];
        const first2 = recent[0];
        const dt = (last2.t - first2.t) / 1000;
        if (dt > 0.005) {
          r.vel = {
            x: Math.max(-20, Math.min(20, ((last2.x - first2.x) / dt) * THROW_SCALE)),
            y: Math.max(-20, Math.min(20, ((last2.y - first2.y) / dt) * THROW_SCALE)),
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

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openChat = useCallback(() => {
    setChatOpen(prev => !prev);
  }, []);

  openChatCallbackRef.current = openChat;

  const sendMessage = useCallback(async () => {
    const text = inputVal.trim();
    if (!text || aiLoading) return;
    setInputVal('');

    const newMessages: Message[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);

    const trick = handlePartyTrick(text);
    if (trick) {
      trick.action?.();
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'braino', text: trick.text }]);
      }, 380);
      return;
    }

    setAiLoading(true);
    try {
      const reply = await callBrainoAI(text, newMessages);
      setMessages(prev => [...prev, { role: 'braino', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'braino', text: "My neurons misfired. Try again? 🧠" }]);
    } finally {
      setAiLoading(false);
    }
  }, [inputVal, messages, aiLoading]);

  // ── Widget drag ───────────────────────────────────────────────────────────
  const onWidgetDragStart = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT') return;
    e.preventDefault();
    const wd = widgetDragRef.current;
    wd.dragging = true;
    wd.startX = e.clientX;
    wd.startY = e.clientY;
    wd.startRight = widgetAnchor.right;
    wd.startBottom = widgetAnchor.bottom;
    setWidgetDragging(true);
  };

  // ── Brain drag handlers ───────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = s.current;
    r.dragging = true;
    r.dragStartX = e.clientX;
    r.dragStartY = e.clientY;
    r.dragOff = { x: e.clientX - r.pos.x, y: e.clientY - r.pos.y };
    r.vel = { x: 0, y: 0 };
    r.mhist = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const r = s.current;
    r.dragging = true;
    r.dragStartX = t.clientX;
    r.dragStartY = t.clientY;
    r.dragOff = { x: t.clientX - r.pos.x, y: t.clientY - r.pos.y };
    r.vel = { x: 0, y: 0 };
    r.mhist = [{ x: t.clientX, y: t.clientY, t: Date.now() }];
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Draggable widget: card + pill ── */}
      {chatOpen && (
        <div
          onMouseDown={onWidgetDragStart}
          style={{
            position: 'fixed',
            right: widgetAnchor.right,
            bottom: widgetAnchor.bottom,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            zIndex: 99998,
            cursor: widgetDragging ? 'grabbing' : 'default',
            userSelect: 'none',
          }}
        >
          {/* ── Glassmorphism response card ── */}
          {messages.length > 0 && (
            <div style={{
              width: 360,
              maxWidth: 'calc(100vw - 108px)',
              borderRadius: 22,
              overflow: 'hidden',
              background: 'rgba(18, 14, 10, 0.78)',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.22)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              color: '#fff',
              animation: 'brainoCardIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)',
            }}>
              {/* Close button */}
              <button
                onClick={() => setChatOpen(false)}
                style={{ position: 'absolute', top: 10, right: 10, border: 'none', background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.65)', width: 24, height: 24, borderRadius: 7, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'sans-serif', display: 'grid', placeItems: 'center', zIndex: 1 }}
              >×</button>

              {/* Messages */}
              <div style={{ padding: '14px 0 6px', maxHeight: 320, overflowY: 'auto' }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ padding: '6px 22px' }}>
                    {msg.role === 'user' ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{
                          display: 'inline-block',
                          background: 'rgba(255,255,255,0.12)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          borderRadius: 14,
                          padding: '9px 14px',
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.88)',
                          lineHeight: 1.5,
                          maxWidth: '85%',
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        fontSize: 14.5,
                        lineHeight: 1.72,
                        color: 'rgba(255,255,255,0.92)',
                        fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
                      }}>
                        {msg.text}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {aiLoading && (
                  <div style={{ padding: '8px 22px', display: 'flex', gap: 5, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', display: 'inline-block', animation: `brainoDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Party tricks hint */}
              <div style={{ padding: '0 22px 12px', fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
                Try: play lo-fi · tell me a joke · celebrate
              </div>
            </div>
          )}

          {/* ── Pill input bar ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(18, 14, 10, 0.82)',
            borderRadius: 100,
            padding: '7px 7px 7px 18px',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 8px 28px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.18)',
            width: 320,
            maxWidth: 'calc(100vw - 108px)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            animation: 'brainoPillIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
          }}>
            <input
              ref={inputRef}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="What's on your mind?"
              style={{
                flex: 1,
                fontSize: 14,
                color: 'rgba(255,255,255,0.88)',
                fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
                letterSpacing: '-0.01em',
                background: 'transparent',
                border: 'none',
                outline: 'none',
              }}
            />
            {/* Mode chip */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '4px 8px 4px 9px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              ⚡ Auto
              <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 1 5 5 9 1" /></svg>
            </div>
            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={!inputVal.trim() || aiLoading}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none', flexShrink: 0,
                background: inputVal.trim() && !aiLoading ? '#E8786E' : 'rgba(255,255,255,0.1)',
                color: inputVal.trim() && !aiLoading ? 'white' : 'rgba(255,255,255,0.3)',
                cursor: inputVal.trim() && !aiLoading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Brain mascot ── */}
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
          cursor: view.grabbing ? 'grabbing' : 'pointer',
          userSelect: 'none',
          touchAction: 'none',
          transform: `scaleX(${view.flipX ? -1 : 1})`,
          transformOrigin: '50% 100%',
          filter: view.grabbing
            ? 'drop-shadow(0 18px 36px rgba(0,0,0,0.42))'
            : chatOpen
              ? 'drop-shadow(0 0 18px rgba(232,120,110,0.65)) drop-shadow(0 5px 14px rgba(0,0,0,0.24))'
              : wakePhase === 'sleeping'
                ? 'drop-shadow(0 5px 14px rgba(0,0,0,0.18)) brightness(0.7)'
                : wakePhase === 'yellow'
                  ? 'drop-shadow(0 0 16px rgba(255,210,50,1)) drop-shadow(0 0 32px rgba(255,175,0,0.7))'
                  : wakePhase === 'green'
                    ? 'drop-shadow(0 0 16px rgba(80,230,110,1)) drop-shadow(0 0 32px rgba(40,180,70,0.7))'
                    : 'drop-shadow(0 5px 14px rgba(0,0,0,0.24))',
          transition: 'filter 0.5s ease',
          willChange: 'left, top, transform, filter',
        }}
      >
        <BrainSVG
          pl={view.pl}
          pr={view.pr}
          al={view.al}
          ar={view.ar}
          squish={view.squish}
          wakePhase={wakePhase}
        />
      </div>
    </>
  );
}
