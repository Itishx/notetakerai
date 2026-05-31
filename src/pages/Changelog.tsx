import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ─── Brain SVG ──────────────────────────────────────────────────────────────

function BrainSvg({ size = 120, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size} style={style}>
      <defs>
        <linearGradient id="cl-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2"/>
          <stop offset="0.55" stopColor="#E8786E"/>
          <stop offset="1" stopColor="#C9544A"/>
        </linearGradient>
        <linearGradient id="cl-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D9645A"/>
          <stop offset="1" stopColor="#9C3E36"/>
        </linearGradient>
        <radialGradient id="cl-glow" cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7"/>
          <stop offset="1" stopColor="#FFD0CB" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white"/>
      <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white"/>
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"/>
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"/>
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7, -3.7)"/>
      <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#cl-dark)"/>
      <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#cl-dark)"/>
      <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7"/>
      <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7"/>
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#cl-fill)"/>
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#cl-glow)"/>
      <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
      <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
      <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
      <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#cl-fill)" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="6" cy="63" r="5.5" fill="url(#cl-fill)"/>
      <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#cl-fill)" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="94" cy="63" r="5.5" fill="url(#cl-fill)"/>
      <circle cx="38" cy="48" r="6.5" fill="white"/>
      <circle cx="38" cy="48" r="3.2" fill="#1B1713"/>
      <circle cx="39" cy="46.6" r="1.1" fill="white"/>
      <circle cx="62" cy="48" r="6.5" fill="white"/>
      <circle cx="62" cy="48" r="3.2" fill="#1B1713"/>
      <circle cx="63" cy="46.6" r="1.1" fill="white"/>
      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>
      <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>
      <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Scroll-reveal hook ──────────────────────────────────────────────────────

function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('cl-visible'); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return ref;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const BEFORE_MILESTONES = [
  {
    date: 'January 2026',
    dot: '🧬',
    title: 'The Spark',
    desc: 'Project initialized. A Vite + React + shadcn template, a blank canvas, and an idea: what if your browser could actually think?',
    tags: ['React', 'Vite', 'TypeScript'],
  },
  {
    date: 'April 1, 2026',
    dot: '✏️',
    title: 'LectureSnap → SideBrain',
    desc: 'First major rebrand. LectureSnap became SideBrain — a Chrome extension that slid open as a side panel. It was useful. It was functional. It took up 75% of your screen and had zero personality.',
    tags: ['Chrome Extension', 'MV3', 'Side Panel'],
  },
  {
    date: 'April 9–20, 2026',
    dot: '🎤',
    title: 'Voice Awakening',
    desc: 'ElevenLabs TTS + Web Speech API wired together for the first time. SideBrain could now speak and listen. Subtitles, teleprompter UI, continuous listening with interrupt — the first sign of something alive.',
    tags: ['ElevenLabs', 'Web Speech API', 'TTS'],
  },
  {
    date: 'May 5, 2026',
    dot: '🔖',
    title: 'The Bookmarklet Pivot',
    desc: 'Extension reviewed and paused. Pivoted to a bookmarklet model — one click, inject the assistant into any page. More accessible, faster to ship, no app store friction.',
    tags: ['Bookmarklet', 'Content Script'],
  },
];

const AFTER_MILESTONES = [
  {
    date: 'May 28, 2026',
    version: 'v1.6.0',
    dot: '🧠',
    title: 'Braino is Born',
    desc: 'Official rebrand. The design doc was written. The character was finalized — coral body, white sticker outline, two expressive eyes, arms that wave. trybraino.com went live.',
    tags: ['Rebrand', 'Design System', 'trybraino.com'],
    accent: true,
  },
  {
    date: 'May 29, 2026',
    version: 'v1.7.0',
    dot: '✨',
    title: 'He Comes Alive',
    desc: 'Physics simulation: Braino floats, bounces, squishes on landing. Pupils track your cursor. Arms swing while walking. Idle blink animations. A brain that actually lives on your screen.',
    tags: ['Physics Engine', 'Pupil Tracking', 'Animations'],
  },
  {
    date: 'May 30, 2026',
    version: 'v1.8.0',
    dot: '🎬',
    title: 'Watch a Movie with Braino',
    desc: 'Movie Mode launched. Braino detects what you\'re watching and glows with an ambient halo that pulses with the content. Also: pre-launch waitlist with position tracking, typewriter sequences.',
    tags: ['Movie Mode', 'Ambient Halo', 'Waitlist'],
  },
  {
    date: 'May 31, 2026',
    version: 'v1.9.0',
    dot: '🎭',
    title: 'Persona & Voice System',
    desc: 'Braino gets character voices. Reply history logs. Show-more expansion. X Auto integration. The foundation for a fully-personalized AI companion.',
    tags: ['Persona Voices', 'Reply History', 'X Auto'],
  },
  {
    date: 'May 31, 2026',
    version: 'v1.9.5',
    dot: '🤖',
    title: 'Autonomous X Pipeline + Google Docs + Drive Organise',
    desc: '24/7 X auto-posting and reply pipeline with per-user voice. Ask Braino to research any topic and create a Google Doc in one shot. "Organise my Drive" party trick — scans, categorises, moves files. Live waitlist announcements with voice. Content source field for grounding posts in real material.',
    tags: ['X Auto Pipeline', 'Google Docs', 'Drive Organise', 'Voice Alerts'],
    latest: true,
  },
];

// ─── Timeline card ───────────────────────────────────────────────────────────

function TimelineCard({ item, side }: { item: typeof BEFORE_MILESTONES[0] & { version?: string; accent?: boolean; latest?: boolean }; side: 'left' | 'right' }) {
  const ref = useReveal();
  const isLeft = side === 'left';
  return (
    <div
      ref={ref}
      className="cl-card"
      style={{
        display: 'flex',
        flexDirection: isLeft ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 0,
        marginBottom: 0,
        width: '100%',
      }}
    >
      {/* Spacer side */}
      <div style={{ flex: 1 }} />

      {/* Dot on the line */}
      <div style={{
        width: 44,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 20,
        zIndex: 2,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: item.latest ? 'linear-gradient(135deg, #E8786E, #F6A8A2)' : item.accent ? 'rgba(232,120,110,0.2)' : 'rgba(255,255,255,0.07)',
          border: `2px solid ${item.latest || item.accent ? '#E8786E' : 'rgba(255,255,255,0.15)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
          boxShadow: item.latest ? '0 0 24px rgba(232,120,110,0.5)' : item.accent ? '0 0 12px rgba(232,120,110,0.25)' : 'none',
        }}>
          {item.dot}
        </div>
      </div>

      {/* Content card */}
      <div style={{ flex: 1, padding: isLeft ? '0 0 48px 24px' : '0 24px 48px 0', maxWidth: 420 }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${item.latest ? 'rgba(232,120,110,0.35)' : 'rgba(255,255,255,0.09)'}`,
          borderRadius: 16,
          padding: '20px 24px',
          boxShadow: item.latest ? '0 0 40px rgba(232,120,110,0.12), 0 8px 32px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'NeueHaas, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {item.date}
            </span>
            {item.version && (
              <span style={{
                fontSize: 10, fontFamily: 'BeVietnam, sans-serif', fontWeight: 800,
                background: 'linear-gradient(135deg, #E8786E, #F6A8A2)',
                color: 'white', padding: '2px 8px', borderRadius: 100,
                letterSpacing: '0.04em',
              }}>
                {item.version}
              </span>
            )}
            {item.latest && (
              <span style={{
                fontSize: 10, fontFamily: 'BeVietnam, sans-serif', fontWeight: 800,
                background: 'rgba(232,120,110,0.15)',
                color: '#E8786E', padding: '2px 8px', borderRadius: 100,
                border: '1px solid rgba(232,120,110,0.3)',
                letterSpacing: '0.04em',
              }}>
                LATEST
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.92)', fontFamily: 'NeueHaas, sans-serif', margin: '0 0 8px' }}>
            {item.title}
          </h3>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', fontFamily: 'NeueHaas, sans-serif', margin: '0 0 14px' }}>
            {item.desc}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {item.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 11, color: 'rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.06)', borderRadius: 6,
                padding: '3px 8px', fontFamily: 'NeueHaas, sans-serif',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pivot section ───────────────────────────────────────────────────────────

function PivotSection() {
  const ref = useReveal(0.1);
  return (
    <div ref={ref} className="cl-card" style={{ marginBottom: 0, padding: '0 24px', maxWidth: 960, margin: '0 auto 80px' }}>
      {/* Label */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-block',
          fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#E8786E', fontFamily: 'BeVietnam, sans-serif', fontWeight: 800,
          background: 'rgba(232,120,110,0.1)', border: '1px solid rgba(232,120,110,0.25)',
          borderRadius: 100, padding: '6px 18px', marginBottom: 20,
        }}>
          The Turning Point — May 2026
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 800,
          fontFamily: 'BeVietnam, sans-serif',
          color: 'white', margin: 0, lineHeight: 1.1,
        }}>
          The moment everything changed.
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginTop: 12, fontFamily: 'NeueHaas, sans-serif', maxWidth: 520, margin: '12px auto 0' }}>
          SideBrain was getting shut down. The side panel model was broken. Something had to give.
        </p>
      </div>

      {/* Before / After panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderRadius: 20, overflow: 'hidden' }}>
        {/* BEFORE */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '28px 24px',
          position: 'relative',
        }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)',
            fontFamily: 'BeVietnam, sans-serif', fontWeight: 800, textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            Before — SideBrain
          </div>

          {/* Browser mockup showing side panel */}
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', height: 28, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}/>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}/>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}/>
              <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginLeft: 8 }}/>
            </div>
            <div style={{ display: 'flex', height: 140 }}>
              {/* Main content squeezed to 25% */}
              <div style={{ width: '25%', background: 'rgba(255,255,255,0.02)', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}/>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}/>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}/>
              </div>
              {/* Side panel taking 75% */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'NeueHaas, sans-serif', marginBottom: 4 }}>SideBrain Panel</div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}/>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}/>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}/>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3 }}/>
                <div style={{ height: 22, background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginTop: 'auto' }}/>
              </div>
            </div>
          </div>

          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Took 75% of your screen', 'No personality, no character', 'Felt like a dev tool', 'Getting shut down by Chrome'].map(t => (
              <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'NeueHaas, sans-serif' }}>
                <span style={{ color: 'rgba(255,80,80,0.7)', fontSize: 16 }}>×</span> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* AFTER */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(232,120,110,0.08), rgba(246,168,162,0.04))',
          border: '1px solid rgba(232,120,110,0.2)',
          borderRadius: 16,
          padding: '28px 24px',
          position: 'relative',
          boxShadow: '0 0 60px rgba(232,120,110,0.08)',
        }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.2em', color: '#E8786E',
            fontFamily: 'BeVietnam, sans-serif', fontWeight: 800, textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            After — Braino
          </div>

          {/* Browser mockup with floating brain */}
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(232,120,110,0.15)', marginBottom: 20 }}>
            <div style={{ background: 'rgba(232,120,110,0.08)', height: 28, display: 'flex', alignItems: 'center', padding: '0 10px', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(232,120,110,0.4)' }}/>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(232,120,110,0.3)' }}/>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(232,120,110,0.3)' }}/>
              <div style={{ flex: 1, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginLeft: 8 }}/>
            </div>
            <div style={{ height: 140, background: 'rgba(255,255,255,0.02)', position: 'relative', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, width: '80%' }}/>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, width: '60%' }}/>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, width: '70%' }}/>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, width: '50%' }}/>
              {/* Floating brain in corner */}
              <div style={{
                position: 'absolute', bottom: 12, right: 12,
                filter: 'drop-shadow(0 0 12px rgba(232,120,110,0.6))',
                animation: 'cl-float 3s ease-in-out infinite',
              }}>
                <BrainSvg size={48} />
              </div>
            </div>
          </div>

          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Tiny — lives in the corner', 'Personality, physics, emotions', 'Floats, bounces, waves at you', 'Works on every website'].map(t => (
              <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: 'NeueHaas, sans-serif' }}>
                <span style={{ color: '#E8786E', fontSize: 16 }}>✓</span> {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Particles ───────────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1.5 + Math.random() * 3,
  delay: Math.random() * 8,
  dur: 6 + Math.random() * 10,
  coral: Math.random() > 0.5,
}));

function ParticleField() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: p.coral ? 'rgba(232,120,110,0.6)' : 'rgba(255,255,255,0.18)',
          animation: `cl-particle ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
        }}/>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Changelog() {
  const heroRef = useReveal(0.05);
  const statsRef = useReveal(0.3);
  const ctaRef = useReveal(0.3);

  return (
    <div style={{ background: '#0A0806', minHeight: '100vh', color: 'white', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        @keyframes cl-float {
          0%   { transform: translateY(0px) rotate(-2deg); }
          50%  { transform: translateY(-12px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(-2deg); }
        }
        @keyframes cl-float-slow {
          0%   { transform: translateY(0px); }
          50%  { transform: translateY(-18px); }
          100% { transform: translateY(0px); }
        }
        @keyframes cl-particle {
          0%   { transform: translateY(0) scale(1); opacity: 0.4; }
          100% { transform: translateY(-40px) scale(1.4); opacity: 0; }
        }
        @keyframes cl-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 0.9; transform: scale(1.08); }
        }
        @keyframes cl-line-grow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes cl-fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cl-spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes cl-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95%            { transform: scaleY(0.08); }
        }

        .cl-card {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .cl-card.cl-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 640px) {
          .cl-timeline-row { flex-direction: column !important; }
          .cl-timeline-spacer { display: none !important; }
          .cl-card-content { padding: 0 0 32px 24px !important; max-width: 100% !important; }
          .cl-pivot-grid { grid-template-columns: 1fr !important; }
          .cl-stat-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <ParticleField />

      {/* ── Hero ── */}
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 60px', textAlign: 'center', position: 'relative', zIndex: 1,
      }}>
        {/* Radial glow behind brain */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,120,110,0.18) 0%, transparent 70%)',
          animation: 'cl-glow-pulse 4s ease-in-out infinite',
          pointerEvents: 'none',
        }}/>

        <div ref={heroRef} className="cl-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Brain */}
          <div style={{ animation: 'cl-float-slow 4s ease-in-out infinite', filter: 'drop-shadow(0 0 32px rgba(232,120,110,0.55)) drop-shadow(0 12px 28px rgba(0,0,0,0.4))' }}>
            <BrainSvg size={120} />
          </div>

          {/* Eyebrow */}
          <div style={{
            marginTop: 32, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#E8786E', fontFamily: 'BeVietnam, sans-serif', fontWeight: 800,
            background: 'rgba(232,120,110,0.1)', border: '1px solid rgba(232,120,110,0.25)',
            borderRadius: 100, padding: '5px 16px',
          }}>
            The Full Story
          </div>

          {/* Title */}
          <h1 style={{
            marginTop: 20, fontSize: 'clamp(36px, 8vw, 76px)', fontWeight: 800,
            fontFamily: 'BeVietnam, sans-serif', lineHeight: 1.05,
            background: 'linear-gradient(135deg, #ffffff 30%, rgba(255,255,255,0.55))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            The History of<br />
            <span style={{
              background: 'linear-gradient(135deg, #F6A8A2, #E8786E, #C9544A)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Braino</span>
          </h1>

          <p style={{
            marginTop: 20, fontSize: 'clamp(15px, 2vw, 18px)', lineHeight: 1.7,
            color: 'rgba(255,255,255,0.5)', fontFamily: 'NeueHaas, sans-serif',
            maxWidth: 520,
          }}>
            From a blank template to a living brain character on your screen —<br />
            every pivot, every breakthrough, every version.
          </p>

          {/* Scroll cue */}
          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.35 }}>
            <span style={{ fontSize: 12, fontFamily: 'NeueHaas, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>scroll to explore</span>
            <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)' }}/>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div ref={statsRef} className="cl-card" style={{
        maxWidth: 800, margin: '0 auto 100px', padding: '0 24px', zIndex: 1, position: 'relative',
      }}>
        <div className="cl-stat-grid" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}>
          {[
            { val: '844', label: 'Commits' },
            { val: '5mo', label: 'In the making' },
            { val: '4', label: 'Major versions' },
            { val: '1', label: 'Living brain' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '20px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'BeVietnam, sans-serif', color: '#F6A8A2', lineHeight: 1 }}>
                {s.val}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'NeueHaas, sans-serif', marginTop: 6 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Era label: Before ── */}
      <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <span style={{
          fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)', fontFamily: 'BeVietnam, sans-serif', fontWeight: 800,
          borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8,
        }}>
          The Before Times
        </span>
      </div>

      {/* ── Timeline: Before ── */}
      <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '0 24px', zIndex: 1 }}>
        {/* Vertical connector line */}
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0,
          width: 1, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1) 10%, rgba(255,255,255,0.1) 90%, transparent)',
          transform: 'translateX(-50%)',
          transformOrigin: 'top',
          animation: 'cl-line-grow 2s ease-out forwards',
        }}/>
        {BEFORE_MILESTONES.map((item, i) => (
          <TimelineCard key={item.title} item={item} side={i % 2 === 0 ? 'right' : 'left'} />
        ))}
      </div>

      {/* ── THE PIVOT ── */}
      <div style={{ position: 'relative', zIndex: 1, margin: '40px 0 80px', padding: '0 24px' }}>
        {/* Separator line */}
        <div style={{ maxWidth: 900, margin: '0 auto 60px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(232,120,110,0.3))' }}/>
          <div style={{ fontSize: 20 }}>⚡</div>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(232,120,110,0.3))' }}/>
        </div>
        <PivotSection />
      </div>

      {/* ── Era label: After ── */}
      <div style={{ textAlign: 'center', marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <span style={{
          fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#E8786E', fontFamily: 'BeVietnam, sans-serif', fontWeight: 800,
          borderBottom: '1px solid rgba(232,120,110,0.25)', paddingBottom: 8,
        }}>
          The Braino Era
        </span>
      </div>

      {/* ── Timeline: After ── */}
      <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '0 24px', zIndex: 1 }}>
        <div style={{
          position: 'absolute', left: '50%', top: 0, bottom: 0,
          width: 1, background: 'linear-gradient(to bottom, transparent, rgba(232,120,110,0.25) 10%, rgba(232,120,110,0.25) 90%, transparent)',
          transform: 'translateX(-50%)',
        }}/>
        {AFTER_MILESTONES.map((item, i) => (
          <TimelineCard key={item.title} item={item} side={i % 2 === 0 ? 'right' : 'left'} />
        ))}
      </div>

      {/* ── Footer CTA ── */}
      <div ref={ctaRef} className="cl-card" style={{
        textAlign: 'center', padding: '80px 24px 100px', position: 'relative', zIndex: 1,
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', bottom: '30%', left: '50%', transform: 'translate(-50%, 50%)',
          width: 600, height: 300, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(232,120,110,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        <div style={{ animation: 'cl-float 3.5s ease-in-out infinite', display: 'inline-block', marginBottom: 24, filter: 'drop-shadow(0 0 20px rgba(232,120,110,0.4))' }}>
          <BrainSvg size={64} />
        </div>

        <h2 style={{
          fontSize: 'clamp(24px, 5vw, 42px)', fontWeight: 800,
          fontFamily: 'BeVietnam, sans-serif', color: 'white', margin: '0 0 12px',
        }}>
          The story isn't over.
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', fontFamily: 'NeueHaas, sans-serif', maxWidth: 380, margin: '0 auto 32px' }}>
          Braino is just getting started. Follow along as we keep building.
        </p>
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #E8786E, #C9544A)',
          color: 'white', fontFamily: 'BeVietnam, sans-serif', fontWeight: 800,
          fontSize: 14, padding: '14px 28px', borderRadius: 100,
          textDecoration: 'none', letterSpacing: '0.04em',
          boxShadow: '0 4px 24px rgba(232,120,110,0.35)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 32px rgba(232,120,110,0.45)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 24px rgba(232,120,110,0.35)'; }}
        >
          Join the waitlist →
        </Link>

        <div style={{ marginTop: 48, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'NeueHaas, sans-serif' }}>
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>trybraino.com</Link>
          {' · '}
          <span>844 commits and counting</span>
        </div>
      </div>
    </div>
  );
}
