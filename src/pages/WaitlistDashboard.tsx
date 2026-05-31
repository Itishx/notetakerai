import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ADMIN_EMAIL = 'itishpande21@gmail.com';

type WaitlistRow = {
  id: string;
  email: string;
  created_at: string;
};

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function speak(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92;
  utt.pitch = 1.05;
  window.speechSynthesis.speak(utt);
}

export default function WaitlistDashboard() {
  const { user, session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [flashEmail, setFlashEmail] = useState<string | null>(null);
  const hasSpokenRef = useRef(false);
  const speakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;
  const authHeader = session ? `Bearer ${session.access_token}` : '';

  // Load waitlist rows
  useEffect(() => {
    if (authLoading || !isAdmin || !session) return;
    setLoading(true);
    fetch(`${SUPABASE_URL}/functions/v1/waitlist-list`, {
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setRows(data.rows ?? []);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [authLoading, isAdmin, session]);

  // Speak greeting once rows load
  useEffect(() => {
    if (loading || hasSpokenRef.current || rows.length === 0) return;
    hasSpokenRef.current = true;
    const todayCount = rows.filter(r => isToday(r.created_at)).length;
    const total = rows.length;
    const text = todayCount > 0
      ? `${greeting()}, sir. You have ${todayCount} new sign-up${todayCount > 1 ? 's' : ''} today. ${total} total on the waitlist.`
      : `${greeting()}, sir. No new sign-ups today. ${total} total on the waitlist.`;
    triggerSpeak(text);
  }, [loading, rows]);

  // Realtime: listen for new waitlist inserts
  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel('waitlist-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'waitlist' },
        (payload) => {
          const newRow = payload.new as WaitlistRow;
          setRows(prev => [newRow, ...prev]);
          setFlashEmail(newRow.email);
          setTimeout(() => setFlashEmail(null), 4000);
          triggerSpeak(`Sir, you just had a new sign-up. ${newRow.email} just joined the waitlist.`);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  function triggerSpeak(text: string) {
    setSpeaking(true);
    speak(text);
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    // Estimate duration: ~80ms per char
    const ms = Math.max(2000, text.length * 80);
    speakTimerRef.current = setTimeout(() => setSpeaking(false), ms);
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this entry?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-list`, {
        method: 'DELETE',
        headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      alert(String(e));
    } finally {
      setDeleting(null);
    }
  }

  if (authLoading) return <Screen><p style={{ color: 'rgba(251,247,241,0.4)' }}>Loading…</p></Screen>;
  if (!user) return (
    <Screen>
      <p style={{ color: 'rgba(251,247,241,0.5)', marginBottom: 20 }}>Sign in to view the waitlist.</p>
      <a href="/auth" style={{ color: '#E27D39', textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
    </Screen>
  );
  if (!isAdmin) return <Screen><p style={{ color: 'rgba(251,247,241,0.5)' }}>Not authorized.</p></Screen>;

  const todayCount = rows.filter(r => isToday(r.created_at)).length;

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0a0a',
      color: '#FBF7F1',
      fontFamily: "'NeueHaas', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: '40px 32px',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Waitlist
          </h1>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
            <p style={{ margin: 0, color: 'rgba(251,247,241,0.45)', fontSize: 14 }}>
              {loading ? 'Loading…' : `${rows.length} total`}
            </p>
            {!loading && (
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: todayCount > 0 ? '#22c55e' : 'rgba(251,247,241,0.25)',
                background: todayCount > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${todayCount > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 20,
                padding: '3px 10px',
                fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.02em',
              }}>
                {todayCount > 0 ? `+${todayCount} today` : '0 today'}
              </span>
            )}
          </div>
        </div>

        {error && <p style={{ color: '#E27D39', marginBottom: 24, fontSize: 14 }}>{error}</p>}

        {!loading && rows.length === 0 && !error && (
          <p style={{ color: 'rgba(251,247,241,0.35)', fontSize: 15 }}>No signups yet.</p>
        )}

        {rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(251,247,241,0.1)' }}>
                <th style={th}>#</th>
                <th style={th}>Email</th>
                <th style={th}>Joined</th>
                <th style={{ ...th, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid rgba(251,247,241,0.06)',
                    background: flashEmail === row.email
                      ? 'rgba(34,197,94,0.08)'
                      : isToday(row.created_at)
                        ? 'rgba(255,255,255,0.025)'
                        : 'transparent',
                    transition: 'background 0.6s ease',
                  }}
                >
                  <td style={{ ...td, color: 'rgba(251,247,241,0.35)', width: 36 }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 500 }}>
                    {row.email}
                    {isToday(row.created_at) && (
                      <span style={{
                        marginLeft: 8,
                        fontSize: 10,
                        color: '#22c55e',
                        fontFamily: 'JetBrains Mono, monospace',
                        opacity: 0.8,
                      }}>new</span>
                    )}
                  </td>
                  <td style={{ ...td, color: 'rgba(251,247,241,0.4)', whiteSpace: 'nowrap' }}>
                    {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button
                      onClick={() => deleteRow(row.id)}
                      disabled={deleting === row.id}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: deleting === row.id ? 'rgba(251,247,241,0.2)' : 'rgba(251,247,241,0.25)',
                        fontSize: 16, padding: '2px 6px', lineHeight: 1, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#E27D39')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(251,247,241,0.25)')}
                      title="Delete"
                    >×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating Braino brain */}
      <button
        onClick={() => {
          const t = todayCount > 0
            ? `You have ${todayCount} sign-up${todayCount > 1 ? 's' : ''} today. ${rows.length} total.`
            : `No new sign-ups today. ${rows.length} total on the waitlist.`;
          triggerSpeak(t);
        }}
        title="Ask Braino for today's summary"
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}
      >
        {/* Glow ring when speaking */}
        {speaking && (
          <span style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,154,66,0.35) 0%, transparent 70%)',
            animation: 'brainoPulse 1s ease-in-out infinite',
          }} />
        )}
        <BrainSVG size={48} />
        {/* Today count badge */}
        {todayCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 0,
            right: 0,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: '#22c55e',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            border: '1.5px solid #0a0a0a',
            padding: '0 3px',
          }}>
            {todayCount}
          </span>
        )}
      </button>

      <style>{`
        @keyframes brainoPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.25); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function BrainSVG({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <defs>
        <linearGradient id="wl-brain-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6A8A2" />
          <stop offset="0.55" stopColor="#E8786E" />
          <stop offset="1" stopColor="#C9544A" />
        </linearGradient>
        <radialGradient id="wl-brain-glow" cx="35%" cy="30%" r="50%">
          <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
        </radialGradient>
        <filter id="wl-brain-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#E8786E" floodOpacity="0.45" />
        </filter>
      </defs>
      <path filter="url(#wl-brain-shadow)" d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#wl-brain-fill)" />
      <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#wl-brain-glow)" />
      <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
      <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
      <circle cx="38" cy="48" r="6.5" fill="white" />
      <circle cx="38" cy="48" r="3.2" fill="#1B1713" />
      <circle cx="39" cy="47.6" r="1.1" fill="white" />
      <circle cx="62" cy="48" r="6.5" fill="white" />
      <circle cx="62" cy="48" r="3.2" fill="#1B1713" />
      <circle cx="63" cy="47.6" r="1.1" fill="white" />
      <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
      <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  color: 'rgba(251,247,241,0.35)',
  fontWeight: 500,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const td: React.CSSProperties = {
  padding: '12px 14px',
  verticalAlign: 'middle',
};

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'NeueHaas', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {children}
    </div>
  );
}
