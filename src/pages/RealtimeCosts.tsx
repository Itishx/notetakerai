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
          <p className="rtc-kicker"><span className="rtc-pip" /> Braino admin</p>
          <h1>Realtime voice costs</h1>
          <p className="rtc-subtitle">
            A plain-English receipt for headphone mode. See who talked to Braino, what was said, what Braino replied, and what each little voice turn cost.
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
          <section className="rtc-guide" aria-label="How to read this page">
            <GuideCard
              number="01"
              title="Pick the time window"
              text="Use the date dropdown like a filter. Smaller windows are easier to debug; bigger windows show the full bill story."
            />
            <GuideCard
              number="02"
              title="Open a person"
              text='Click "Show messages sent" to see every thing the user said, every thing Braino spoke back, and the cost of that one turn.'
            />
            <GuideCard
              number="03"
              title="Watch for red flags"
              text='If "OpenAI voice out" is above zero while Jarvis/Fish is selected, OpenAI is speaking too. That is the expensive path.'
            />
          </section>

          <section className="rtc-cards">
            <MetricCard
              label="Estimated total"
              value={formatUsd(payload.totals.estimatedTotalCostUsd)}
              hint={`${payload.totals.totalTurns} logged voice turns`}
              explain="Our turn-by-turn receipt. This is Braino adding up each logged conversation."
            />
            <MetricCard
              label="Actual OpenAI org cost"
              value={payload.totals.actualOpenAiCostUsd === null ? "Unavailable" : formatUsd(payload.totals.actualOpenAiCostUsd)}
              hint={payload.actualCosts.available ? "Read from OpenAI Usage API" : payload.actualCosts.setupMessage || "No usage key"}
              explain="OpenAI's big receipt for the org/project. It can include other OpenAI calls too."
            />
            <MetricCard
              label="Difference"
              value={payload.totals.unreconciledDeltaUsd === null ? "Unavailable" : formatUsd(payload.totals.unreconciledDeltaUsd)}
              hint="OpenAI receipt minus Braino logs"
              explain="If this is large, some spend is not matched to a logged voice turn yet."
              tone={payload.totals.unreconciledDeltaUsd !== null && payload.totals.unreconciledDeltaUsd > 0.5 ? "warn" : "normal"}
            />
            <MetricCard
              label="Realtime minutes"
              value={`${payload.totals.totalRealtimeMinutes.toFixed(1)}m`}
              hint={`${payload.totals.totalSessions} voice sessions`}
              explain="How long Braino kept the expensive live microphone connection open."
            />
          </section>

          {payload.totals.audioOutputWarningCount > 0 && (
            <div className="rtc-warning">
              <strong>Red flag:</strong> OpenAI audio output tokens were logged in {payload.totals.audioOutputWarningCount} turn(s). If Jarvis/Fish voice is selected, those should be 0 because Fish/Jarvis should be the only speaker.
            </div>
          )}

          <section className="rtc-panel">
            <div className="rtc-panel-head">
              <div>
                <p className="rtc-kicker"><span className="rtc-pip" /> Users</p>
                <h2>Headphone-mode conversations</h2>
                <p className="rtc-panel-copy">
                  Think of each row as one person's voice bill. Open the row to see the tiny receipts underneath.
                </p>
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
                    <th>Voice time</th>
                    <th>Estimated cost</th>
                    <th>Health</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="rtc-empty">
                        No voice turns logged for this range yet. Once someone uses headphone mode, their messages and costs will appear here.
                      </td>
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
      <p className="rtc-kicker"><span className="rtc-pip" /> Realtime costs</p>
      <h1>{title}</h1>
      <p>{text}</p>
      {action}
    </section>
  );
}

function GuideCard({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <article className="rtc-guide-card">
      <span>{number}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </article>
  );
}

function MetricCard({ label, value, hint, explain, tone = "normal" }: { label: string; value: string; hint: string; explain: string; tone?: "normal" | "warn" }) {
  return (
    <article className={`rtc-metric ${tone === "warn" ? "rtc-metric-warn" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
      <small>{explain}</small>
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
          <small>One user request plus Braino's replies.</small>
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
        <InfoPill label="Where it went" value={[turn.routeIntent, turn.connector].filter(Boolean).join(" / ") || "unknown"} help="Chat, web, page, tabs, or Delegate." />
        <InfoPill label="Realtime model" value={turn.realtimeModel || "unknown"} help="The live model listening to the mic." />
        <InfoPill label="Speech-to-text" value={turn.transcriptionModel || "unknown"} help="The model that wrote down the user's words." />
        <InfoPill label="Speaking voice" value={[turn.voiceName, turn.voiceProvider].filter(Boolean).join(" / ") || "unknown"} help="Who spoke the final audio reply." />
      </div>

      <p className="rtc-token-note">
        Kid version: tokens are tiny pieces of words or sound. More tokens means more money. The "OpenAI voice out" box should stay at 0 when Jarvis/Fish is speaking.
      </p>
      <div className="rtc-token-grid">
        <TokenBox label="Text in" value={turn.tokens.realtimeInputText} help="Typed context sent to Realtime." />
        <TokenBox label="Voice in" value={turn.tokens.realtimeInputAudio} help="Your microphone audio." />
        <TokenBox label="Text out" value={turn.tokens.realtimeOutputText} help="Realtime text Braino produced." />
        <TokenBox label="OpenAI voice out" value={turn.tokens.realtimeOutputAudio} help="Should be 0 with Jarvis/Fish." danger={turn.tokens.realtimeOutputAudio > 0} />
        <TokenBox label="Saved tokens" value={`${formatTokens(turn.tokens.realtimeCachedText)} / ${formatTokens(turn.tokens.realtimeCachedAudio)}`} help="Discounted cached text/audio." />
        <TokenBox label="Transcribe audio" value={turn.tokens.transcriptionInputAudio} help="Audio counted by speech-to-text." />
      </div>

      {turn.warnings.openAiAudioOutputTokens && (
        <div className="rtc-warning rtc-warning-compact">
          OpenAI audio output tokens were billed on this turn. Jarvis/Fish mode should keep this at 0.
        </div>
      )}

      <div className="rtc-cost-breakdown">
        <span>Live mic meter: {formatUsd(turn.costs.realtimeUsd)}</span>
        <span>Speech-to-text: {formatUsd(turn.costs.transcriptionUsd)}</span>
        <span>Voice playback: {formatUsd(turn.costs.ttsUsd)}</span>
        <span>Trust level: {explainConfidence(turn.costs.confidence)}</span>
      </div>

      <details className="rtc-raw">
        <summary>Raw usage JSON</summary>
        <pre>{JSON.stringify(turn.rawUsage, null, 2)}</pre>
      </details>
    </article>
  );
}

function InfoPill({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="rtc-info-pill">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{help}</small>
    </div>
  );
}

function TokenBox({ label, value, help, danger = false }: { label: string; value: number | string; help: string; danger?: boolean }) {
  return (
    <div className={`rtc-token ${danger ? "rtc-token-danger" : ""}`}>
      <span>{label}</span>
      <strong>{typeof value === "number" ? formatTokens(value) : value}</strong>
      <small>{help}</small>
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

function explainConfidence(value: string) {
  if (value === "token_exact") return "exact token receipt";
  if (value === "mixed") return "partial receipt";
  if (value === "duration_estimate") return "time-based guess";
  return "unknown";
}

const styles = `
  .rtc-shell {
    min-height: 100vh;
    padding: 34px 0 72px;
    color: var(--sb-ink);
    background:
      radial-gradient(circle at 12% 0%, rgba(226, 125, 57, 0.16), transparent 32rem),
      radial-gradient(circle at 85% 10%, rgba(240, 168, 107, 0.14), transparent 28rem),
      linear-gradient(180deg, var(--sb-bg) 0%, var(--sb-bg-2) 100%);
    font-family: Inter, system-ui, -apple-system, sans-serif;
  }
  .rtc-hero, .rtc-guide, .rtc-cards, .rtc-panel, .rtc-warning, .rtc-status {
    width: calc(100% - 64px);
    max-width: 1240px;
    margin-left: auto;
    margin-right: auto;
  }
  .rtc-hero, .rtc-panel-head, .rtc-turn-head, .rtc-cost-breakdown {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    flex-wrap: wrap;
  }
  .rtc-hero {
    margin-bottom: 24px;
    padding: 28px 0 18px;
  }
  .rtc-kicker {
    margin: 0 0 10px;
    color: var(--sb-ink-3);
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .rtc-pip {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--sb-accent);
    box-shadow: 0 0 10px rgba(226, 125, 57, 0.55);
  }
  .rtc-hero h1, .rtc-status h1 {
    margin: 0;
    max-width: 780px;
    font-family: "Instrument Serif", Georgia, serif;
    font-size: clamp(50px, 7vw, 92px);
    font-weight: 400;
    line-height: 0.98;
    letter-spacing: -0.03em;
    color: var(--sb-ink);
  }
  .rtc-subtitle, .rtc-status p {
    max-width: 720px;
    color: var(--sb-ink-2);
    font-size: 18px;
    line-height: 1.58;
  }
  .rtc-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .rtc-controls select {
    border: 1px solid var(--sb-line);
    border-radius: 999px;
    padding: 12px 16px;
    color: var(--sb-ink);
    background: var(--sb-panel-2);
    box-shadow: var(--sb-shadow-sm);
  }
  .rtc-pill, .rtc-link-button {
    border: 1px solid var(--sb-line);
    border-radius: 999px;
    padding: 12px 16px;
    color: var(--sb-ink);
    background: var(--sb-panel);
    text-decoration: none;
    cursor: pointer;
    box-shadow: var(--sb-shadow-sm);
    font-size: 14px;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .rtc-pill:hover, .rtc-link-button:hover {
    transform: translateY(-1px);
    background: var(--sb-panel-2);
  }
  .rtc-pill-hot {
    display: inline-flex;
    margin-top: 18px;
    border: 0;
    background: var(--sb-ink);
    color: var(--sb-panel-2);
    font-weight: 800;
  }
  .rtc-guide {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }
  .rtc-guide-card {
    border: 1px solid var(--sb-line);
    border-radius: var(--sb-r-xl);
    padding: 20px;
    background: color-mix(in srgb, var(--sb-panel-2) 86%, transparent);
    box-shadow: var(--sb-shadow-sm);
  }
  .rtc-guide-card span {
    display: block;
    margin-bottom: 18px;
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 34px;
    color: var(--sb-accent-deep);
  }
  .rtc-guide-card strong {
    display: block;
    color: var(--sb-ink);
    font-size: 16px;
  }
  .rtc-guide-card p {
    margin: 8px 0 0;
    color: var(--sb-ink-2);
    font-size: 14px;
    line-height: 1.55;
  }
  .rtc-cards {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }
  .rtc-metric, .rtc-panel, .rtc-status, .rtc-turn {
    border: 1px solid var(--sb-line);
    border-radius: var(--sb-r-xl);
    background: color-mix(in srgb, var(--sb-panel) 92%, transparent);
    box-shadow: var(--sb-shadow);
  }
  .rtc-metric {
    padding: 22px;
    min-height: 190px;
  }
  .rtc-metric span, .rtc-token span, .rtc-info-pill span, .rtc-dialogue span {
    color: var(--sb-ink-3);
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .rtc-metric strong {
    display: block;
    margin-top: 12px;
    color: var(--sb-ink);
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 40px;
    font-weight: 400;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .rtc-metric p {
    margin: 10px 0 0;
    color: var(--sb-ink-2);
    font-size: 13px;
  }
  .rtc-metric small {
    display: block;
    margin-top: 14px;
    color: var(--sb-ink-3);
    font-size: 13px;
    line-height: 1.45;
  }
  .rtc-metric-warn {
    border-color: rgba(226, 125, 57, 0.55);
    background: linear-gradient(180deg, var(--sb-panel), var(--sb-accent-soft));
  }
  .rtc-panel {
    margin-top: 18px;
    overflow: hidden;
  }
  .rtc-panel-head {
    padding: 24px 26px;
    border-bottom: 1px solid var(--sb-line-2);
  }
  .rtc-panel-head h2 {
    margin: 0;
    font-family: "Instrument Serif", Georgia, serif;
    font-weight: 400;
    font-size: clamp(30px, 4vw, 48px);
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: var(--sb-ink);
  }
  .rtc-panel-head > p {
    color: var(--sb-ink-3);
    font-size: 13px;
  }
  .rtc-panel-copy {
    max-width: 620px;
    margin: 12px 0 0;
    color: var(--sb-ink-2);
    line-height: 1.55;
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
    border-bottom: 1px solid var(--sb-line-2);
    text-align: left;
    vertical-align: top;
  }
  .rtc-table th {
    color: var(--sb-ink-3);
    font-family: "JetBrains Mono", monospace;
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
    color: var(--sb-on-ink);
    background: radial-gradient(circle at 35% 35%, #FFD9A8 0%, var(--sb-accent-2) 45%, var(--sb-accent-deep) 100%);
    font-weight: 900;
  }
  .rtc-user strong, .rtc-user span, .rtc-user small, .rtc-cost-sub {
    display: block;
  }
  .rtc-user span, .rtc-user small, .rtc-cost-sub {
    margin-top: 3px;
    color: var(--sb-ink-3);
    font-size: 12px;
  }
  .rtc-badge {
    display: inline-flex;
    border: 1px solid var(--sb-line);
    border-radius: 999px;
    padding: 6px 9px;
    color: var(--sb-ink-2);
    background: var(--sb-panel-2);
    font-size: 12px;
  }
  .rtc-badge-danger, .rtc-warning {
    border-color: rgba(196, 96, 42, 0.35);
    color: var(--sb-accent-deep);
    background: var(--sb-accent-soft);
  }
  .rtc-warning {
    margin-top: 16px;
    margin-bottom: 16px;
    border: 1px solid rgba(196, 96, 42, 0.28);
    border-radius: 18px;
    padding: 14px 16px;
    line-height: 1.5;
  }
  .rtc-warning-compact {
    margin: 12px 0 0;
  }
  .rtc-detail-row td {
    padding: 0;
    background: var(--sb-bg-2);
  }
  .rtc-turns {
    display: grid;
    gap: 14px;
    padding: 20px;
  }
  .rtc-turn {
    padding: 18px;
    background: var(--sb-panel-2);
  }
  .rtc-turn-danger {
    border-color: rgba(196, 96, 42, 0.45);
  }
  .rtc-turn-head span {
    display: block;
    margin-top: 3px;
    color: var(--sb-ink-3);
    font-size: 12px;
  }
  .rtc-turn-head small {
    display: block;
    margin-top: 6px;
    color: var(--sb-ink-3);
    font-size: 13px;
  }
  .rtc-turn-cost {
    color: var(--sb-accent-deep);
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 34px;
    line-height: 1;
  }
  .rtc-dialogue {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
  }
  .rtc-dialogue > div, .rtc-info-pill, .rtc-token {
    border: 1px solid var(--sb-line-2);
    border-radius: 16px;
    padding: 13px;
    background: color-mix(in srgb, var(--sb-bg) 55%, var(--sb-panel-2));
  }
  .rtc-dialogue p {
    margin: 8px 0 0;
    color: var(--sb-ink-2);
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
  .rtc-token-note {
    margin: 14px 0 0;
    padding: 12px 14px;
    border-radius: 16px;
    color: var(--sb-ink-2);
    background: var(--sb-accent-soft);
    line-height: 1.5;
    font-size: 14px;
  }
  .rtc-info-pill strong, .rtc-token strong {
    display: block;
    margin-top: 7px;
    color: var(--sb-ink);
    word-break: break-word;
  }
  .rtc-info-pill small, .rtc-token small {
    display: block;
    margin-top: 7px;
    color: var(--sb-ink-3);
    font-size: 12px;
    line-height: 1.35;
  }
  .rtc-token-danger {
    border-color: rgba(196, 96, 42, 0.45);
    background: var(--sb-accent-soft);
  }
  .rtc-cost-breakdown {
    justify-content: flex-start;
    margin-top: 14px;
    color: var(--sb-ink-2);
    font-size: 13px;
  }
  .rtc-cost-breakdown span {
    display: inline-flex;
    padding: 7px 10px;
    border-radius: 999px;
    border: 1px solid var(--sb-line);
    background: var(--sb-panel);
  }
  .rtc-raw {
    margin-top: 14px;
  }
  .rtc-raw summary {
    cursor: pointer;
    color: var(--sb-accent-deep);
    font-size: 13px;
  }
  .rtc-raw pre {
    max-height: 360px;
    overflow: auto;
    border-radius: 14px;
    padding: 14px;
    color: var(--sb-panel-2);
    background: var(--sb-ink);
    font-size: 12px;
  }
  .rtc-status {
    max-width: 840px;
    margin-top: 80px;
    padding: 34px;
  }
  .rtc-empty {
    color: var(--sb-ink-3);
    text-align: center;
    line-height: 1.55;
  }
  @media (max-width: 900px) {
    .rtc-shell {
      padding-top: 18px;
    }
    .rtc-hero, .rtc-guide, .rtc-cards, .rtc-panel, .rtc-warning, .rtc-status {
      width: calc(100% - 28px);
    }
    .rtc-hero, .rtc-panel-head, .rtc-dialogue {
      display: block;
    }
    .rtc-controls {
      margin-top: 20px;
    }
    .rtc-guide, .rtc-cards, .rtc-turn-grid, .rtc-token-grid {
      grid-template-columns: 1fr;
    }
    .rtc-dialogue > div + div {
      margin-top: 12px;
    }
    .rtc-table {
      min-width: 860px;
    }
  }
`;
