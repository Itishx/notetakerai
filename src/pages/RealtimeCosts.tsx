import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type RealtimeCostTurn = {
  id: string;
  sessionId: string | null;
  turnId: string;
  turnIndex: number;
  startedAt: string;
  completedAt: string | null;
  userTranscript: string;
  assistantMessages: string[];
  routeIntent: string | null;
  routeMode: string | null;
  connector: string | null;
  realtimeModel: string | null;
  transcriptionModel: string | null;
  voiceProvider: string | null;
  voiceId: string | null;
  voiceName: string | null;
  tokens: {
    realtimeInputText: number;
    realtimeInputAudio: number;
    realtimeOutputText: number;
    realtimeOutputAudio: number;
    realtimeCachedText: number;
    realtimeCachedAudio: number;
    transcriptionInputText: number;
    transcriptionInputAudio: number;
    transcriptionOutputText: number;
    total: number;
  };
  costs: {
    realtimeUsd: number;
    transcriptionUsd: number;
    ttsUsd: number;
    totalUsd: number;
    confidence: string;
  };
  rawUsage: {
    realtime: unknown;
    transcription: unknown;
    tts: unknown;
  };
  warnings: {
    openAiAudioOutputTokens: boolean;
  };
};

type RealtimeCostUser = {
  userId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  sessionCount: number;
  turnCount: number;
  estimatedRealtimeCostUsd: number;
  estimatedTranscriptionCostUsd: number;
  estimatedTtsCostUsd: number;
  estimatedTotalCostUsd: number;
  realtimeMinutes: number;
  lastSeenAt: string;
  audioOutputWarningCount: number;
  turns: RealtimeCostTurn[];
};

type RealtimeCostsPayload = {
  ok: boolean;
  range: {
    days: number;
    since: string;
    until: string;
  };
  totals: {
    estimatedRealtimeCostUsd: number;
    estimatedTranscriptionCostUsd: number;
    estimatedTtsCostUsd: number;
    estimatedTotalCostUsd: number;
    actualOpenAiCostUsd: number | null;
    unreconciledDeltaUsd: number | null;
    totalRealtimeMinutes: number;
    totalSessions: number;
    totalTurns: number;
    audioOutputWarningCount: number;
  };
  users: RealtimeCostUser[];
  actualCosts: {
    available: boolean;
    totalUsd: number | null;
    currency: string;
    dailyCosts: Array<{ date: string; costUsd: number; currency: string }>;
    lineItems: Array<{ lineItem: string; costUsd: number }>;
    setupMessage?: string;
  };
  lastUpdatedAt: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function RealtimeCosts() {
  const { user, session, loading } = useAuth();
  const [days, setDays] = useState(7);
  const [payload, setPayload] = useState<RealtimeCostsPayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (loading || !session?.access_token) return;

    const controller = new AbortController();
    setIsLoading(true);
    setError("");

    fetch(`${SUPABASE_URL}/functions/v1/realtime-costs-admin?days=${days}`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.userMessage || data.error || `Realtime costs failed (${response.status})`);
        }
        setPayload(data);
      })
      .catch((err: unknown) => {
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        if (!isAbort) {
          setPayload(null);
          setError(err instanceof Error ? err.message : "Could not load realtime costs.");
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [days, loading, session?.access_token]);

  const sortedUsers = useMemo(() => payload?.users || [], [payload]);

  const toggleUser = (userId: string) => {
    setExpandedUsers((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  if (loading) {
    return <Shell><StatusCard title="Checking session" text="Loading your Braino admin session..." /></Shell>;
  }

  if (!user || !session) {
    return (
      <Shell>
        <StatusCard
          title="Sign in required"
          text="Realtime cost logs are admin-only. Sign in with an allowlisted admin email to continue."
          action={<Link className="rtc-pill rtc-pill-hot" to="/auth">Sign in</Link>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="rtc-hero">
        <div>
          <p className="rtc-kicker">Braino admin</p>
          <h1>Realtime costs</h1>
          <p className="rtc-subtitle">
            Every headphone-mode turn, transcript, Braino reply, token count, and estimated per-interaction cost in one place.
          </p>
        </div>
        <div className="rtc-controls">
          <Link className="rtc-pill" to="/dashboard">Back to dashboard</Link>
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </header>

      {error && <StatusCard title="Could not load costs" text={error} />}
      {isLoading && !payload && <StatusCard title="Loading logs" text="Pulling turn logs, users, sessions, and OpenAI org costs..." />}

      {payload && (
        <>
          <section className="rtc-cards">
            <MetricCard label="Estimated total" value={formatUsd(payload.totals.estimatedTotalCostUsd)} hint={`${payload.totals.totalTurns} voice turns`} />
            <MetricCard label="Actual OpenAI org cost" value={payload.totals.actualOpenAiCostUsd === null ? "Unavailable" : formatUsd(payload.totals.actualOpenAiCostUsd)} hint={payload.actualCosts.available ? "Usage API reconciliation" : payload.actualCosts.setupMessage || "No usage key"} />
            <MetricCard label="Unreconciled delta" value={payload.totals.unreconciledDeltaUsd === null ? "Unavailable" : formatUsd(payload.totals.unreconciledDeltaUsd)} hint="Actual OpenAI minus logged OpenAI estimates" tone={payload.totals.unreconciledDeltaUsd !== null && payload.totals.unreconciledDeltaUsd > 0.5 ? "warn" : "normal"} />
            <MetricCard label="Realtime minutes" value={`${payload.totals.totalRealtimeMinutes.toFixed(1)}m`} hint={`${payload.totals.totalSessions} sessions`} />
          </section>

          {payload.totals.audioOutputWarningCount > 0 && (
            <div className="rtc-warning">
              OpenAI audio output tokens were logged in {payload.totals.audioOutputWarningCount} turn(s). If Jarvis/Fish voice is selected, those should be 0.
            </div>
          )}

          <section className="rtc-panel">
            <div className="rtc-panel-head">
              <div>
                <p className="rtc-kicker">Users</p>
                <h2>Headphone-mode conversations</h2>
              </div>
              <p>{formatDateRange(payload.range.since, payload.range.until)}</p>
            </div>

            <div className="rtc-table-wrap">
              <table className="rtc-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Sessions</th>
                    <th>Turns</th>
                    <th>Minutes</th>
                    <th>Estimated cost</th>
                    <th>Warnings</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="rtc-empty">No realtime voice turns logged for this range yet.</td>
                    </tr>
                  )}

                  {sortedUsers.map((entry) => {
                    const expanded = expandedUsers.has(entry.userId);
                    return (
                      <Fragment key={entry.userId}>
                        <tr key={entry.userId}>
                          <td>
                            <div className="rtc-user">
                              <div className="rtc-avatar">{initials(entry.displayName || entry.email || entry.userId)}</div>
                              <div>
                                <strong>{entry.displayName || entry.email || "Unknown user"}</strong>
                                <span>{entry.email || entry.userId}</span>
                                <small>Last seen {formatDateTime(entry.lastSeenAt)}</small>
                              </div>
                            </div>
                          </td>
                          <td>{entry.sessionCount}</td>
                          <td>{entry.turnCount}</td>
                          <td>{entry.realtimeMinutes.toFixed(1)}m</td>
                          <td>
                            <strong>{formatUsd(entry.estimatedTotalCostUsd)}</strong>
                            <span className="rtc-cost-sub">OpenAI {formatUsd(entry.estimatedRealtimeCostUsd)} + TTS {formatUsd(entry.estimatedTtsCostUsd)}</span>
                          </td>
                          <td>
                            {entry.audioOutputWarningCount > 0 ? (
                              <span className="rtc-badge rtc-badge-danger">{entry.audioOutputWarningCount} audio token warning</span>
                            ) : (
                              <span className="rtc-badge">Clean</span>
                            )}
                          </td>
                          <td>
                            <button className="rtc-link-button" onClick={() => toggleUser(entry.userId)}>
                              {expanded ? "Hide messages" : "Show messages sent"}
                            </button>
                          </td>
                        </tr>
                        {expanded && (
                          <tr key={`${entry.userId}-details`} className="rtc-detail-row">
                            <td colSpan={7}>
                              <div className="rtc-turns">
                                {entry.turns.map((turn) => (
                                  <TurnCard key={turn.id} turn={turn} />
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="rtc-shell">
      <style>{styles}</style>
      {children}
    </main>
  );
}

function StatusCard({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <section className="rtc-status">
      <p className="rtc-kicker">Realtime costs</p>
      <h1>{title}</h1>
      <p>{text}</p>
      {action}
    </section>
  );
}

function MetricCard({ label, value, hint, tone = "normal" }: { label: string; value: string; hint: string; tone?: "normal" | "warn" }) {
  return (
    <article className={`rtc-metric ${tone === "warn" ? "rtc-metric-warn" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function TurnCard({ turn }: { turn: RealtimeCostTurn }) {
  return (
    <article className={`rtc-turn ${turn.warnings.openAiAudioOutputTokens ? "rtc-turn-danger" : ""}`}>
      <div className="rtc-turn-head">
        <div>
          <strong>Turn {turn.turnIndex}</strong>
          <span>{formatDateTime(turn.startedAt)}</span>
        </div>
        <div className="rtc-turn-cost">{formatUsd(turn.costs.totalUsd)}</div>
      </div>

      <div className="rtc-dialogue">
        <div>
          <span>User said</span>
          <p>{turn.userTranscript || "No transcript logged."}</p>
        </div>
        <div>
          <span>Braino replied</span>
          {turn.assistantMessages.length ? (
            turn.assistantMessages.map((message, index) => <p key={`${turn.id}-reply-${index}`}>{message}</p>)
          ) : (
            <p>No assistant reply logged.</p>
          )}
        </div>
      </div>

      <div className="rtc-turn-grid">
        <InfoPill label="Route" value={[turn.routeIntent, turn.connector].filter(Boolean).join(" / ") || "unknown"} />
        <InfoPill label="Realtime model" value={turn.realtimeModel || "unknown"} />
        <InfoPill label="Transcription" value={turn.transcriptionModel || "unknown"} />
        <InfoPill label="Voice" value={[turn.voiceName, turn.voiceProvider].filter(Boolean).join(" / ") || "unknown"} />
      </div>

      <div className="rtc-token-grid">
        <TokenBox label="RT input text" value={turn.tokens.realtimeInputText} />
        <TokenBox label="RT input audio" value={turn.tokens.realtimeInputAudio} />
        <TokenBox label="RT output text" value={turn.tokens.realtimeOutputText} />
        <TokenBox label="RT output audio" value={turn.tokens.realtimeOutputAudio} danger={turn.tokens.realtimeOutputAudio > 0} />
        <TokenBox label="Cached text/audio" value={`${formatTokens(turn.tokens.realtimeCachedText)} / ${formatTokens(turn.tokens.realtimeCachedAudio)}`} />
        <TokenBox label="Transcribe audio" value={turn.tokens.transcriptionInputAudio} />
      </div>

      {turn.warnings.openAiAudioOutputTokens && (
        <div className="rtc-warning rtc-warning-compact">
          OpenAI audio output tokens were billed on this turn. Jarvis/Fish mode should keep this at 0.
        </div>
      )}

      <div className="rtc-cost-breakdown">
        <span>Realtime {formatUsd(turn.costs.realtimeUsd)}</span>
        <span>Transcription {formatUsd(turn.costs.transcriptionUsd)}</span>
        <span>TTS {formatUsd(turn.costs.ttsUsd)}</span>
        <span>Confidence: {turn.costs.confidence}</span>
      </div>

      <details className="rtc-raw">
        <summary>Raw usage JSON</summary>
        <pre>{JSON.stringify(turn.rawUsage, null, 2)}</pre>
      </details>
    </article>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rtc-info-pill">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TokenBox({ label, value, danger = false }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <div className={`rtc-token ${danger ? "rtc-token-danger" : ""}`}>
      <span>{label}</span>
      <strong>{typeof value === "number" ? formatTokens(value) : value}</strong>
    </div>
  );
}

function formatUsd(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "$0.0000";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 1 ? 2 : 4,
    maximumFractionDigits: value >= 1 ? 2 : 4,
  }).format(value);
}

function formatTokens(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateRange(since: string, until: string) {
  return `${formatDateTime(since)} to ${formatDateTime(until)}`;
}

function initials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "B";
}

const styles = `
  .rtc-shell {
    min-height: 100vh;
    padding: 48px;
    color: #eef4ed;
    background:
      radial-gradient(circle at top left, rgba(105, 145, 114, 0.36), transparent 34rem),
      radial-gradient(circle at 80% 10%, rgba(214, 149, 82, 0.22), transparent 30rem),
      linear-gradient(135deg, #0b1110 0%, #111815 45%, #1b160f 100%);
    font-family: "Satoshi", "Avenir Next", sans-serif;
  }
  .rtc-hero, .rtc-panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }
  .rtc-hero {
    max-width: 1240px;
    margin: 0 auto 28px;
  }
  .rtc-kicker {
    margin: 0 0 10px;
    color: #e7b978;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .rtc-hero h1, .rtc-status h1 {
    margin: 0;
    font-family: "Fraunces", Georgia, serif;
    font-size: clamp(42px, 6vw, 82px);
    line-height: 0.9;
    letter-spacing: -0.06em;
  }
  .rtc-subtitle, .rtc-status p {
    max-width: 720px;
    color: rgba(238, 244, 237, 0.72);
    font-size: 17px;
    line-height: 1.7;
  }
  .rtc-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .rtc-controls select {
    border: 1px solid rgba(238, 244, 237, 0.2);
    border-radius: 999px;
    padding: 10px 14px;
    color: #eef4ed;
    background: rgba(255, 255, 255, 0.08);
  }
  .rtc-pill, .rtc-link-button {
    border: 1px solid rgba(238, 244, 237, 0.18);
    border-radius: 999px;
    padding: 10px 14px;
    color: #eef4ed;
    background: rgba(255, 255, 255, 0.08);
    text-decoration: none;
    cursor: pointer;
  }
  .rtc-pill-hot {
    display: inline-flex;
    margin-top: 18px;
    border: 0;
    background: #e7b978;
    color: #1b160f;
    font-weight: 800;
  }
  .rtc-cards {
    max-width: 1240px;
    margin: 0 auto 18px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }
  .rtc-metric, .rtc-panel, .rtc-status {
    border: 1px solid rgba(238, 244, 237, 0.13);
    border-radius: 28px;
    background: rgba(10, 16, 15, 0.72);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(18px);
  }
  .rtc-metric {
    padding: 22px;
  }
  .rtc-metric span, .rtc-token span, .rtc-info-pill span, .rtc-dialogue span {
    color: rgba(238, 244, 237, 0.52);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .rtc-metric strong {
    display: block;
    margin-top: 12px;
    font-size: 30px;
    letter-spacing: -0.04em;
  }
  .rtc-metric p {
    margin: 10px 0 0;
    color: rgba(238, 244, 237, 0.58);
    font-size: 13px;
  }
  .rtc-metric-warn {
    border-color: rgba(255, 107, 87, 0.45);
  }
  .rtc-panel {
    max-width: 1240px;
    margin: 18px auto 0;
    overflow: hidden;
  }
  .rtc-panel-head {
    padding: 24px 26px;
    border-bottom: 1px solid rgba(238, 244, 237, 0.1);
  }
  .rtc-panel-head h2 {
    margin: 0;
    font-family: "Fraunces", Georgia, serif;
    font-size: 30px;
    letter-spacing: -0.04em;
  }
  .rtc-panel-head > p {
    color: rgba(238, 244, 237, 0.56);
    font-size: 13px;
  }
  .rtc-table-wrap {
    overflow-x: auto;
  }
  .rtc-table {
    width: 100%;
    min-width: 980px;
    border-collapse: collapse;
  }
  .rtc-table th, .rtc-table td {
    padding: 18px 22px;
    border-bottom: 1px solid rgba(238, 244, 237, 0.08);
    text-align: left;
    vertical-align: top;
  }
  .rtc-table th {
    color: rgba(238, 244, 237, 0.46);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .rtc-user {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .rtc-avatar {
    width: 42px;
    height: 42px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    color: #17201b;
    background: linear-gradient(135deg, #e7b978, #a7c8a4);
    font-weight: 900;
  }
  .rtc-user strong, .rtc-user span, .rtc-user small, .rtc-cost-sub {
    display: block;
  }
  .rtc-user span, .rtc-user small, .rtc-cost-sub {
    margin-top: 3px;
    color: rgba(238, 244, 237, 0.55);
    font-size: 12px;
  }
  .rtc-badge {
    display: inline-flex;
    border: 1px solid rgba(238, 244, 237, 0.13);
    border-radius: 999px;
    padding: 6px 9px;
    color: rgba(238, 244, 237, 0.7);
    font-size: 12px;
  }
  .rtc-badge-danger, .rtc-warning {
    border-color: rgba(255, 107, 87, 0.45);
    color: #ffd3cd;
    background: rgba(255, 107, 87, 0.12);
  }
  .rtc-warning {
    max-width: 1240px;
    margin: 16px auto;
    border: 1px solid rgba(255, 107, 87, 0.35);
    border-radius: 18px;
    padding: 14px 16px;
  }
  .rtc-warning-compact {
    margin: 12px 0 0;
  }
  .rtc-detail-row td {
    padding: 0;
    background: rgba(0, 0, 0, 0.12);
  }
  .rtc-turns {
    display: grid;
    gap: 14px;
    padding: 20px;
  }
  .rtc-turn {
    border: 1px solid rgba(238, 244, 237, 0.12);
    border-radius: 24px;
    padding: 18px;
    background: rgba(255, 255, 255, 0.045);
  }
  .rtc-turn-danger {
    border-color: rgba(255, 107, 87, 0.4);
  }
  .rtc-turn-head, .rtc-cost-breakdown {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .rtc-turn-head span {
    display: block;
    margin-top: 3px;
    color: rgba(238, 244, 237, 0.5);
    font-size: 12px;
  }
  .rtc-turn-cost {
    color: #e7b978;
    font-size: 22px;
    font-weight: 900;
  }
  .rtc-dialogue {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }
  .rtc-dialogue > div, .rtc-info-pill, .rtc-token {
    border: 1px solid rgba(238, 244, 237, 0.09);
    border-radius: 16px;
    padding: 13px;
    background: rgba(0, 0, 0, 0.16);
  }
  .rtc-dialogue p {
    margin: 8px 0 0;
    color: rgba(238, 244, 237, 0.82);
    line-height: 1.55;
  }
  .rtc-turn-grid, .rtc-token-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-top: 12px;
  }
  .rtc-token-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
  .rtc-info-pill strong, .rtc-token strong {
    display: block;
    margin-top: 7px;
    word-break: break-word;
  }
  .rtc-token-danger {
    border-color: rgba(255, 107, 87, 0.45);
    background: rgba(255, 107, 87, 0.1);
  }
  .rtc-cost-breakdown {
    justify-content: flex-start;
    margin-top: 14px;
    color: rgba(238, 244, 237, 0.58);
    font-size: 13px;
  }
  .rtc-raw {
    margin-top: 14px;
  }
  .rtc-raw summary {
    cursor: pointer;
    color: #e7b978;
    font-size: 13px;
  }
  .rtc-raw pre {
    max-height: 360px;
    overflow: auto;
    border-radius: 14px;
    padding: 14px;
    color: #d8ead6;
    background: #070a09;
    font-size: 12px;
  }
  .rtc-status {
    max-width: 760px;
    margin: 80px auto;
    padding: 34px;
  }
  .rtc-empty {
    color: rgba(238, 244, 237, 0.62);
    text-align: center;
  }
  @media (max-width: 900px) {
    .rtc-shell {
      padding: 24px 14px;
    }
    .rtc-hero, .rtc-panel-head, .rtc-dialogue {
      display: block;
    }
    .rtc-controls {
      margin-top: 20px;
    }
    .rtc-cards, .rtc-turn-grid, .rtc-token-grid {
      grid-template-columns: 1fr;
    }
    .rtc-dialogue > div + div {
      margin-top: 12px;
    }
  }
`;
