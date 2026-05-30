import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'sleeping' | 'yellow' | 'green' | 'awake' | 'chatting' | 'email_capture' | 'waitlisted';
type Msg = { role: 'user' | 'assistant'; content: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callBrainoChat(messages: Msg[], messageCount: number) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/braino-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ messages, messageCount }),
  });
  if (!res.ok) throw new Error(`Chat API ${res.status}`);
  return res.json() as Promise<{ reply: string; suggestEmail: boolean }>;
}

async function callWaitlistSignup(email: string, context?: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ email, context }),
  });
  return res.json() as Promise<{ success?: boolean; error?: string }>;
}

// ─── Braino SVG — matches the existing hero character exactly ─────────────────
function BrainoHero({ phase }: { phase: Phase }) {
  const eyesOpen = phase === 'green' || phase === 'awake' || phase === 'chatting' || phase === 'email_capture' || phase === 'waitlisted';
  const pulsing = phase === 'yellow' || phase === 'green';
  const floating = phase === 'awake' || phase === 'chatting' || phase === 'email_capture' || phase === 'waitlisted';

  const glowFilter = phase === 'yellow'
    ? 'drop-shadow(0 0 28px rgba(255,210,50,1)) drop-shadow(0 0 56px rgba(255,175,0,0.65))'
    : phase === 'green'
    ? 'drop-shadow(0 0 28px rgba(80,230,110,1)) drop-shadow(0 0 56px rgba(40,180,70,0.65))'
    : 'drop-shadow(0 4px 18px rgba(200,84,74,0.6)) drop-shadow(0 0 32px rgba(200,84,74,0.3))';

  return (
    <div style={{
      filter: glowFilter,
      animation: pulsing
        ? 'plGlowPulse 0.85s ease-in-out infinite'
        : floating
        ? 'plFloat 3s ease-in-out infinite'
        : 'none',
      transition: 'filter 0.6s ease',
      width: '100%',
      height: '100%',
    }}>
      <svg
        viewBox="0 0 100 100"
        style={{ width: '100%', height: '100%', overflow: 'visible', display: 'block' }}
      >
        <defs>
          <linearGradient id="hp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6A8A2" />
            <stop offset="0.55" stopColor="#E8786E" />
            <stop offset="1" stopColor="#C9544A" />
          </linearGradient>
          <linearGradient id="hp-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D9645A" />
            <stop offset="1" stopColor="#9C3E36" />
          </linearGradient>
          <radialGradient id="hp-glow" cx="35%" cy="30%" r="50%">
            <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" />
            <stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Feet */}
        <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
        <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
        {/* Arms (white base) */}
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
        {/* Body white base */}
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="white" transform="scale(1.08) translate(-3.7, -3.7)"
        />
        {/* Feet fill */}
        <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#hp-dark)" />
        <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#hp-dark)" />
        <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
        <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
        <path d="M 64 77 Q 70 79 76 77" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
        {/* Body fill */}
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="url(#hp-fill)"
        />
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="url(#hp-glow)"
        />
        {/* Brain lines */}
        <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        {/* Arms fill */}
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#hp-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="6" cy="63" r="5.5" fill="url(#hp-fill)" />
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#hp-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="94" cy="63" r="5.5" fill="url(#hp-fill)" />

        {/* Eye whites */}
        <circle cx="38" cy="48" r="6.5" fill="white" />
        <circle cx="62" cy="48" r="6.5" fill="white" />

        {/* Eyes: closed = curved lines, open = iris + pupil */}
        {!eyesOpen ? (
          <>
            <path d="M 31.5 48 Q 38 54 44.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 55.5 48 Q 62 54 68.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="38" cy="48" r="3.2" fill="#1B1713" style={{ animation: 'plBlink 4s ease-in-out infinite', transformOrigin: '38px 48px' }} />
            <circle cx="39" cy="46.6" r="1.1" fill="white" />
            <circle cx="62" cy="48" r="3.2" fill="#1B1713" style={{ animation: 'plBlink 4s ease-in-out infinite 0.1s', transformOrigin: '62px 48px' }} />
            <circle cx="63" cy="46.6" r="1.1" fill="white" />
          </>
        )}

        {/* Cheeks */}
        <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
        <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />

        {/* Mouth — sleeping: flat, awake: smile */}
        {!eyesOpen ? (
          <path d="M 46 63 Q 50 61 54 63" fill="none" stroke="#1B1713" strokeWidth="1.5" strokeLinecap="round" />
        ) : (
          <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 28, active = true) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || !text) { setDisplayed(''); setDone(false); return; }
    setDisplayed('');
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, active]);

  return { displayed, done };
}

// ─── Prompt chips ─────────────────────────────────────────────────────────────
const STARTER_PROMPTS = [
  { label: 'Who are you?', emoji: '🧠' },
  { label: 'What can you do?', emoji: '⚡' },
  { label: 'How do you work?', emoji: '🔧' },
];

// ─── PreLaunch page ───────────────────────────────────────────────────────────
export default function PreLaunch() {
  const [phase, setPhase] = useState<Phase>('sleeping');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [userMsgCount, setUserMsgCount] = useState(0);
  const [lastContext, setLastContext] = useState('');
  const [showChips, setShowChips] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const openingLine = "Oh. You found me. I'm Braino — still being built, but I'm here.";
  const tw = useTypewriter(openingLine, 30, phase === 'awake');

  // Hide global floating mascot
  useEffect(() => {
    document.body.classList.add('sb-prelaunch');
    return () => document.body.classList.remove('sb-prelaunch');
  }, []);

  // Wakeup sequence — matches existing hero exactly
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('yellow'), 900);
    const t2 = setTimeout(() => setPhase('green'),  2500);
    const t3 = setTimeout(() => setPhase('awake'),  3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Show chips shortly after typewriter finishes
  useEffect(() => {
    if (tw.done) {
      const t = setTimeout(() => setShowChips(true), 300);
      return () => clearTimeout(t);
    }
  }, [tw.done]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, loading]);

  // Focus input when chat opens
  useEffect(() => {
    if (phase === 'chatting') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (phase === 'email_capture') {
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [phase]);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const newCount = userMsgCount + 1;
    setUserMsgCount(newCount);
    setLastContext(content);
    setInput('');
    setShowChips(false);

    const newMsgs: Msg[] = [...msgs, { role: 'user', content }];

    // Seed the conversation with Braino's opening if it's the first message
    const apiMsgs: Msg[] = msgs.length === 0
      ? [{ role: 'assistant', content: openingLine }, { role: 'user', content }]
      : [...msgs, { role: 'user', content }];

    setMsgs(newMsgs);
    setPhase('chatting');
    setLoading(true);

    try {
      const { reply, suggestEmail } = await callBrainoChat(apiMsgs, newCount);
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
      if (suggestEmail) {
        setTimeout(() => setPhase('email_capture'), 800);
      }
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: "My neurons glitched. Try again?" }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, msgs, userMsgCount, openingLine]);

  const submitEmail = useCallback(async () => {
    const email = emailInput.trim();
    if (!email || emailLoading) return;
    if (!email.includes('@')) { setEmailError("That doesn't look like an email."); return; }

    setEmailError('');
    setEmailLoading(true);
    try {
      const result = await callWaitlistSignup(email, lastContext);
      const reply = result.error === 'already_on_waitlist'
        ? "You're already on the list. I'll remember you."
        : "Done. I'll find you when I'm ready. Don't go too far.";
      setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
      setPhase('waitlisted');
    } catch {
      setEmailError('Something went wrong. Try again.');
    } finally {
      setEmailLoading(false);
    }
  }, [emailInput, emailLoading, lastContext]);

  const chatActive = phase === 'chatting' || phase === 'email_capture' || phase === 'waitlisted';
  const preChat = phase === 'awake' || phase === 'green' || phase === 'yellow' || phase === 'sleeping';

  return (
    <>
      <style>{`
        body.sb-prelaunch #sb-brain-mascot-wrapper { display: none !important; }

        @keyframes plGlowPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }
        @keyframes plFloat {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes plBlink {
          0%, 88%, 100% { transform: scaleY(1); }
          93%            { transform: scaleY(0.07); }
        }
        @keyframes plMsgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes plFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes plDot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50%       { opacity: 1;   transform: translateY(-3px); }
        }
        @keyframes plShake {
          0%, 100% { transform: translateX(0); }
          25%       { transform: translateX(-4px); }
          75%       { transform: translateX(4px); }
        }
        @keyframes plChipIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .pl-msg { animation: plMsgIn 0.25s ease-out forwards; }
        .pl-dot  { animation: plDot 1.1s ease-in-out infinite; }
        .pl-dot:nth-child(2) { animation-delay: 0.18s; }
        .pl-dot:nth-child(3) { animation-delay: 0.36s; }
        .pl-chip:hover { background: rgba(226,125,57,0.18) !important; border-color: rgba(226,125,57,0.5) !important; }
      `}</style>

      <div style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse 80% 60% at 50% 25%, #2A1C14 0%, #0E0B08 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'NeueHaas', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: '#FBF7F1',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Ambient warm glow */}
        <div style={{
          position: 'fixed',
          top: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 700, height: 500,
          background: 'radial-gradient(ellipse at center, rgba(226,125,57,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: 560,
          padding: '0 20px',
          flex: 1,
          paddingBottom: chatActive ? 88 : 0,
        }}>

          {/* ── Pre-chat: centered character + speech ── */}
          {preChat && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100dvh',
              width: '100%',
              paddingBottom: 40,
            }}>

              {/* Character */}
              <div style={{ width: 180, height: 180, flexShrink: 0 }}>
                <BrainoHero phase={phase} />
              </div>

              {/* Typewriter speech */}
              {phase === 'awake' && (
                <div style={{
                  marginTop: 28,
                  textAlign: 'center',
                  animation: 'plFadeUp 0.5s ease',
                  maxWidth: 420,
                }}>
                  <p style={{
                    fontSize: 20,
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: '#FBF7F1',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}>
                    {tw.displayed}
                    {!tw.done && <span style={{ opacity: 0.4 }}>|</span>}
                  </p>
                </div>
              )}

              {/* Prompt chips */}
              {showChips && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 28,
                  width: '100%',
                  maxWidth: 380,
                }}>
                  {STARTER_PROMPTS.map((p, i) => (
                    <button
                      key={p.label}
                      className="pl-chip"
                      onClick={() => sendMessage(p.label)}
                      style={{
                        width: '100%',
                        padding: '13px 20px',
                        borderRadius: 40,
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(251,247,241,0.85)',
                        fontSize: 15,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        backdropFilter: 'blur(8px)',
                        transition: 'background 0.15s, border-color 0.15s',
                        animation: `plChipIn 0.3s ease ${i * 0.08}s both`,
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{p.emoji}</span>
                      {p.label}
                    </button>
                  ))}

                  {/* Custom input row */}
                  <div style={{
                    display: 'flex',
                    gap: 8,
                    width: '100%',
                    marginTop: 4,
                    animation: `plChipIn 0.3s ease 0.28s both`,
                  }}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Or ask something else…"
                      style={{
                        flex: 1,
                        padding: '12px 18px',
                        borderRadius: 40,
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#FBF7F1',
                        fontSize: 15,
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim()}
                      style={{
                        width: 46, height: 46,
                        borderRadius: '50%',
                        border: 'none',
                        background: input.trim() ? '#E27D39' : 'rgba(255,255,255,0.08)',
                        color: '#FBF7F1',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: input.trim() ? 'pointer' : 'not-allowed',
                        transition: 'background 0.15s',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Chat mode ── */}
          {chatActive && (
            <>
              {/* Small character header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingTop: 24,
                paddingBottom: 8,
                width: '100%',
              }}>
                <div style={{ width: 48, height: 48, flexShrink: 0 }}>
                  <BrainoHero phase={phase} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>Braino</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(251,247,241,0.4)' }}>In development</p>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                style={{
                  flex: 1,
                  width: '100%',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  paddingBottom: 16,
                  scrollbarWidth: 'none',
                }}
              >
                {msgs.map((m, i) => (
                  <div key={i} className="pl-msg" style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '82%',
                      padding: '10px 16px',
                      borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                      background: m.role === 'user' ? 'rgba(226,125,57,0.85)' : 'rgba(255,255,255,0.07)',
                      border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      fontSize: 15,
                      lineHeight: 1.55,
                      color: m.role === 'user' ? '#FBF7F1' : 'rgba(251,247,241,0.88)',
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="pl-msg" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '12px 18px',
                      borderRadius: '4px 18px 18px 18px',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      gap: 5,
                      alignItems: 'center',
                    }}>
                      {[0,1,2].map(i => (
                        <span key={i} className="pl-dot" style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'rgba(251,247,241,0.45)',
                          display: 'inline-block',
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Email capture inline */}
                {phase === 'email_capture' && !loading && (
                  <div className="pl-msg" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{
                      padding: '10px 16px',
                      borderRadius: '4px 18px 18px 18px',
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      fontSize: 15,
                      lineHeight: 1.55,
                      color: 'rgba(251,247,241,0.88)',
                    }}>
                      Want to be first when I launch? Drop your email.
                    </div>
                    <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 380, animation: 'plFadeUp 0.3s ease' }}>
                      <input
                        ref={emailRef}
                        type="email"
                        value={emailInput}
                        onChange={e => { setEmailInput(e.target.value); setEmailError(''); }}
                        onKeyDown={e => { if (e.key === 'Enter') submitEmail(); }}
                        placeholder="your@email.com"
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          borderRadius: 40,
                          border: emailError ? '1px solid rgba(226,80,80,0.7)' : '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.07)',
                          color: '#FBF7F1',
                          fontSize: 15,
                          outline: 'none',
                          fontFamily: 'inherit',
                          animation: emailError ? 'plShake 0.3s ease' : 'none',
                        }}
                      />
                      <button
                        onClick={submitEmail}
                        disabled={emailLoading}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 40,
                          border: 'none',
                          background: '#E27D39',
                          color: '#FBF7F1',
                          fontSize: 15,
                          fontWeight: 600,
                          cursor: emailLoading ? 'not-allowed' : 'pointer',
                          opacity: emailLoading ? 0.6 : 1,
                          fontFamily: 'inherit',
                          whiteSpace: 'nowrap',
                          transition: 'opacity 0.15s',
                        }}
                      >
                        {emailLoading ? '…' : "I'm in"}
                      </button>
                    </div>
                    {emailError && (
                      <p style={{ fontSize: 13, color: 'rgba(226,80,80,0.9)', margin: 0, paddingLeft: 4 }}>
                        {emailError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Fixed chat input bar */}
        {phase === 'chatting' && (
          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            padding: '12px 16px 24px',
            background: 'linear-gradient(to top, rgba(14,11,8,1) 60%, transparent)',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 540, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Say something…"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '13px 20px',
                  borderRadius: 40,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#FBF7F1',
                  fontSize: 15,
                  outline: 'none',
                  fontFamily: 'inherit',
                  backdropFilter: 'blur(12px)',
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  width: 46, height: 46,
                  borderRadius: '50%',
                  border: 'none',
                  background: input.trim() ? '#E27D39' : 'rgba(255,255,255,0.08)',
                  color: '#FBF7F1',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Subtle link to full site */}
        <a href="/home" style={{
          position: 'fixed',
          bottom: 10, right: 16,
          fontSize: 11,
          color: 'rgba(251,247,241,0.18)',
          zIndex: 5,
          textDecoration: 'none',
          fontFamily: 'inherit',
        }}>
          trybraino.com
        </a>
      </div>
    </>
  );
}
