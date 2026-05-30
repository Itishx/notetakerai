import { useEffect, useRef, useState } from 'react';

type Phase = 'hidden' | 'sleeping' | 'yellow' | 'green' | 'awake';

const FULL_TEXT = "The waitlist opens tomorrow.";
const TYPE_SPEED = 120;

function BrainSVG({ phase }: { phase: Phase }) {
  const eyesOpen = phase === 'green' || phase === 'awake';
  const pulsing = phase === 'yellow' || phase === 'green';
  const floating = phase === 'awake';

  const glowFilter = phase === 'yellow'
    ? 'drop-shadow(0 0 28px rgba(255,210,50,1)) drop-shadow(0 0 56px rgba(255,175,0,0.65))'
    : phase === 'green'
    ? 'drop-shadow(0 0 28px rgba(80,230,110,1)) drop-shadow(0 0 56px rgba(40,180,70,0.65))'
    : 'drop-shadow(0 4px 18px rgba(200,84,74,0.6)) drop-shadow(0 0 32px rgba(200,84,74,0.3))';

  return (
    <div style={{
      filter: glowFilter,
      animation: pulsing ? 'ltGlowPulse 0.85s ease-in-out infinite' : floating ? 'ltFloat 3s ease-in-out infinite' : 'none',
      transition: 'filter 0.6s ease',
      width: '100%', height: '100%',
    }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}>
        <defs>
          <linearGradient id="lt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6A8A2"/><stop offset="0.55" stopColor="#E8786E"/><stop offset="1" stopColor="#C9544A"/>
          </linearGradient>
          <linearGradient id="lt-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D9645A"/><stop offset="1" stopColor="#9C3E36"/>
          </linearGradient>
          <radialGradient id="lt-glow" cx="35%" cy="30%" r="50%">
            <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7"/><stop offset="1" stopColor="#FFD0CB" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white"/>
        <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white"/>
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"/>
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round"/>
        <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7,-3.7)"/>
        <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#lt-dark)"/>
        <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#lt-dark)"/>
        <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#lt-fill)"/>
        <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#lt-glow)"/>
        <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55"/>
        <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
        <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
        <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6"/>
        <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#lt-fill)" strokeWidth="6" strokeLinecap="round"/>
        <circle cx="6" cy="63" r="5.5" fill="url(#lt-fill)"/>
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#lt-fill)" strokeWidth="6" strokeLinecap="round"/>
        <circle cx="94" cy="63" r="5.5" fill="url(#lt-fill)"/>
        <circle cx="38" cy="48" r="6.5" fill="white"/>
        <circle cx="62" cy="48" r="6.5" fill="white"/>
        {!eyesOpen ? (
          <>
            <path d="M 31.5 48 Q 38 54 44.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M 55.5 48 Q 62 54 68.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round"/>
          </>
        ) : (
          <>
            <circle cx="38" cy="48" r="3.2" fill="#1B1713" style={{ animation: 'ltBlink 4s ease-in-out infinite', transformOrigin: '38px 48px' }}/>
            <circle cx="39" cy="46.6" r="1.1" fill="white"/>
            <circle cx="62" cy="48" r="3.2" fill="#1B1713" style={{ animation: 'ltBlink 4s ease-in-out infinite 0.1s', transformOrigin: '62px 48px' }}/>
            <circle cx="63" cy="46.6" r="1.1" fill="white"/>
          </>
        )}
        <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>
        <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>
        {!eyesOpen
          ? <path d="M 46 63 Q 50 61 54 63" fill="none" stroke="#1B1713" strokeWidth="1.5" strokeLinecap="round"/>
          : <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round"/>
        }
      </svg>
    </div>
  );
}

export default function LaunchTeaser() {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [typed, setTyped] = useState('');
  const [showBraino, setShowBraino] = useState(false);
  const [textFading, setTextFading] = useState(false);
  const [showFarewell, setShowFarewell] = useState(false);
  const brainStarted = useRef(false);

  useEffect(() => {
    document.body.classList.add('sb-prelaunch');
    return () => document.body.classList.remove('sb-prelaunch');
  }, []);

  // 1. Type the text
  useEffect(() => {
    const delay = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        i++;
        setTyped(FULL_TEXT.slice(0, i));
        if (i >= FULL_TEXT.length) {
          clearInterval(id);
          // Pause, fade text out, then show Braino
          setTimeout(() => setTextFading(true), 1200);
          setTimeout(() => setShowBraino(true), 1900);
        }
      }, TYPE_SPEED);
      return () => clearInterval(id);
    }, 700);
    return () => clearTimeout(delay);
  }, []);

  // 2. Once Braino is visible, run the wakeup sequence
  useEffect(() => {
    if (!showBraino || brainStarted.current) return;
    brainStarted.current = true;
    setPhase('sleeping');
    const t1 = setTimeout(() => setPhase('yellow'),       900);
    const t2 = setTimeout(() => setPhase('green'),        2500);
    const t3 = setTimeout(() => setPhase('awake'),        3600);
    const t4 = setTimeout(() => setShowFarewell(true),    4800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [showBraino]);

  return (
    <>
      <style>{`
        body.sb-prelaunch #sb-brain-mascot-wrapper { display: none !important; }
        @keyframes ltGlowPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes ltFloat     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes ltBlink     { 0%,88%,100%{transform:scaleY(1)} 93%{transform:scaleY(0.07)} }
        @keyframes ltFadeIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{
        minHeight: '100dvh', background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'NeueHaas', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#FBF7F1',
      }}>

        {/* Typewriter text */}
        {!showBraino && (
          <h1 style={{
            margin: 0, textAlign: 'center',
            fontSize: 'clamp(28px, 4.5vw, 56px)',
            fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1,
            color: '#FBF7F1',
            opacity: textFading ? 0 : 1,
            transform: textFading ? 'translateY(-6px)' : 'translateY(0)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}>
            {typed}<span style={{ opacity: 0.3 }}>|</span>
          </h1>
        )}

        {/* Braino wakeup + farewell */}
        {showBraino && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 36, animation: 'ltFadeIn 0.6s ease' }}>
            <div style={{ width: 180, height: 180 }}>
              <BrainSVG phase={phase}/>
            </div>
            <p style={{
              margin: 0,
              fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em',
              color: '#FBF7F1',
              opacity: showFarewell ? 1 : 0,
              transform: showFarewell ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}>
              I'll see you soon.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
