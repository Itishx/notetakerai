import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ADMIN_EMAIL = 'itishpande21@gmail.com';

type WaitlistRow = {
  id: string;
  email: string;
  context: string | null;
  created_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  braino: 'Braino · Browser',
  macos: 'Braino IOMI',
  'braino-os': 'Braino OS',
  studio: 'Braino Studio',
  hera: 'Braino Hera',
  everything: 'Everything',
};

function waitlistCategories(context: string | null) {
  if (!context?.startsWith('editorial-waitlist:')) return [];
  return context
    .slice('editorial-waitlist:'.length)
    .split(',')
    .map(value => value.trim())
    .filter(value => CATEGORY_LABELS[value]);
}

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function brainoSpeak(text: string) {
  window.dispatchEvent(new CustomEvent('braino:speak', { detail: { text } }));
}

export default function WaitlistDashboard() {
  const { user, session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [flashEmail, setFlashEmail] = useState<string | null>(null);
  const hasSpokenRef = useRef(false);

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

  // Braino speaks once when data first lands
  useEffect(() => {
    if (loading || hasSpokenRef.current) return;
    if (rows.length === 0 && !error) return;
    hasSpokenRef.current = true;
    const todayCount = rows.filter(r => isToday(r.created_at)).length;
    const total = rows.length;
    const text = todayCount > 0
      ? `${greeting()}, sir. You have ${todayCount} new sign-up${todayCount > 1 ? 's' : ''} today. ${total} total on the waitlist.`
      : `${greeting()}, sir. No new sign-ups today. ${total} total on the waitlist.`;
    brainoSpeak(text);
  }, [loading, rows, error]);

  // Realtime: live signup announcements
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
          brainoSpeak(`Sir, you just had a new sign-up. ${newRow.email} just joined the waitlist.`);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

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
            {!loading && rows.length > 0 && (
              <button
                onClick={() => {
                  const text = todayCount > 0
                    ? `You have ${todayCount} sign-up${todayCount > 1 ? 's' : ''} today. ${rows.length} total.`
                    : `No new sign-ups today. ${rows.length} total on the waitlist.`;
                  brainoSpeak(text);
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(251,247,241,0.3)', fontSize: 12,
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: 0, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#E27D39')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(251,247,241,0.3)')}
              >
                ask braino ↗
              </button>
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
                <th style={th}>Interested in</th>
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
                        marginLeft: 8, fontSize: 10,
                        color: '#22c55e',
                        fontFamily: 'JetBrains Mono, monospace',
                        opacity: 0.8,
                      }}>new</span>
                    )}
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {waitlistCategories(row.context).length ? waitlistCategories(row.context).map(category => (
                        <span key={category} style={{
                          padding: '3px 7px', borderRadius: 999,
                          color: '#f0b26e', background: 'rgba(226,125,57,.1)',
                          border: '1px solid rgba(226,125,57,.2)',
                          fontSize: 10, whiteSpace: 'nowrap',
                        }}>{CATEGORY_LABELS[category]}</span>
                      )) : <span style={{ color: 'rgba(251,247,241,.28)', fontSize: 11 }}>Uncategorised</span>}
                    </div>
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
    </div>
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
