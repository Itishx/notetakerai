import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ADMIN_EMAIL = 'itishpande21@gmail.com';

type WaitlistRow = {
  id: string;
  email: string;
  created_at: string;
};

export default function WaitlistDashboard() {
  const { user, session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const authHeader = session ? `Bearer ${session.access_token}` : '';

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

  if (authLoading) {
    return <Screen><p style={{ color: 'rgba(251,247,241,0.4)' }}>Loading…</p></Screen>;
  }

  if (!user) {
    return (
      <Screen>
        <p style={{ color: 'rgba(251,247,241,0.5)', marginBottom: 20 }}>Sign in to view the waitlist.</p>
        <a href="/auth" style={{ color: '#E27D39', textDecoration: 'none', fontWeight: 600 }}>Sign in →</a>
      </Screen>
    );
  }

  if (!isAdmin) {
    return <Screen><p style={{ color: 'rgba(251,247,241,0.5)' }}>Not authorized.</p></Screen>;
  }

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
          <p style={{ margin: '6px 0 0', color: 'rgba(251,247,241,0.45)', fontSize: 14 }}>
            {loading ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'signup' : 'signups'}`}
          </p>
        </div>

        {error && (
          <p style={{ color: '#E27D39', marginBottom: 24, fontSize: 14 }}>{error}</p>
        )}

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
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(251,247,241,0.06)' }}>
                  <td style={{ ...td, color: 'rgba(251,247,241,0.35)', width: 36 }}>{i + 1}</td>
                  <td style={{ ...td, fontWeight: 500 }}>{row.email}</td>
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
                        fontSize: 16, padding: '2px 6px', lineHeight: 1,
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#E27D39')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(251,247,241,0.25)')}
                      title="Delete"
                    >
                      ×
                    </button>
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
