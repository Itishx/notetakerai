import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const HEARTBEAT_GRACE_MS = 45_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_LOOKBACK_DAYS = 30;

type SupabaseClientLike = ReturnType<typeof createClient>;

type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type RealtimeTurnLogRow = {
  session_id: string | null;
  turn_id: string;
  started_at: string;
  completed_at: string | null;
  user_transcript: string | null;
  route_intent: string | null;
  realtime_model: string | null;
  transcription_model: string | null;
  estimated_openai_realtime_cost_usd: number | null;
  estimated_transcription_cost_usd: number | null;
  estimated_tts_cost_usd: number | null;
  estimated_total_cost_usd: number | null;
};

type RealtimeSessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  last_heartbeat_at: string | null;
  allocated_ms: number | null;
};

type AggregatedTotals = {
  realtimeUsd: number;
  transcriptionUsd: number;
  ttsUsd: number;
  totalUsd: number;
  realtimeMinutes: number;
};

type CostWindowSummary = {
  label: string;
  since: string;
  until: string;
  sessionCount: number;
  turnCount: number;
  totals: AggregatedTotals;
};

type SessionSummary = {
  label: string;
  sessionId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  active: boolean;
  turnCount: number;
  topIntent: string | null;
  lastUserTranscript: string | null;
  totals: AggregatedTotals;
};

type CostDriverSummary = {
  key: "realtime" | "transcription" | "tts";
  label: string;
  costUsd: number;
  sharePct: number;
};

type HighestCostSessionSummary = {
  sessionId: string | null;
  startedAt: string | null;
  startedAtLabel: string | null;
  turnCount: number;
  totalUsd: number;
};

export type RealtimeCostSummary = {
  timezoneLabel: string;
  todayLabel: string;
  last7DaysLabel: string;
  hasAnySpend: boolean;
  currentSession: SessionSummary | null;
  today: CostWindowSummary;
  last7Days: CostWindowSummary;
  topCostDriverLast7Days: CostDriverSummary | null;
  highestCostSessionLast7Days: HighestCostSessionSummary | null;
  lastUpdatedAt: string;
};

export type LoadRealtimeCostSummaryOptions = {
  requestedUserId?: string | null;
  clientTimeZone?: string | null;
  clientUtcOffsetMinutes?: number | null;
  now?: Date;
};

export async function loadRealtimeCostSummaryForRequest(
  authHeader: string | null,
  options: LoadRealtimeCostSummaryOptions = {},
): Promise<{ user: AuthenticatedUser; summary: RealtimeCostSummary } | null> {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!anonKey || !serviceRoleKey || !supabaseUrl || !authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    return null;
  }

  if (options.requestedUserId && options.requestedUserId !== user.id) {
    return null;
  }

  const summary = await loadRealtimeCostSummaryForUser(admin, user.id, options);
  return {
    user: {
      id: user.id,
      email: user.email || null,
    },
    summary,
  };
}

export async function loadRealtimeCostSummaryForUser(
  admin: SupabaseClientLike,
  userId: string,
  options: Omit<LoadRealtimeCostSummaryOptions, "requestedUserId"> = {},
): Promise<RealtimeCostSummary> {
  const now = options.now instanceof Date ? options.now : new Date();
  const timeZone = normalizeTimeZone(options.clientTimeZone);
  const offsetMinutes = normalizeOffsetMinutes(options.clientUtcOffsetMinutes);
  const todayWindow = getDayWindow(now, timeZone, offsetMinutes, 0);
  const last7StartWindow = getDayWindow(now, timeZone, offsetMinutes, 6);
  const last7Window = {
    startMs: last7StartWindow.startMs,
    endMs: todayWindow.endMs,
    label: formatDateRangeLabel(last7StartWindow.startMs, todayWindow.startMs, timeZone, offsetMinutes),
  };
  const lookbackStartIso = new Date(Math.min(last7Window.startMs, now.getTime() - RECENT_LOOKBACK_DAYS * DAY_MS)).toISOString();

  const [logsResult, sessionsResult] = await Promise.all([
    admin
      .from("realtime_voice_turn_logs")
      .select([
        "session_id",
        "turn_id",
        "started_at",
        "completed_at",
        "user_transcript",
        "route_intent",
        "realtime_model",
        "transcription_model",
        "estimated_openai_realtime_cost_usd",
        "estimated_transcription_cost_usd",
        "estimated_tts_cost_usd",
        "estimated_total_cost_usd",
      ].join(",")) 
      .eq("user_id", userId)
      .gte("started_at", lookbackStartIso)
      .order("started_at", { ascending: false })
      .limit(5000),
    admin
      .from("realtime_voice_sessions")
      .select("id,started_at,ended_at,last_heartbeat_at,allocated_ms")
      .eq("user_id", userId)
      .gte("started_at", lookbackStartIso)
      .order("started_at", { ascending: false })
      .limit(1000),
  ]);

  if (logsResult.error) {
    throw new Error("Could not load realtime cost logs.");
  }
  if (sessionsResult.error) {
    throw new Error("Could not load realtime sessions.");
  }

  const logs = ((logsResult.data || []) as RealtimeTurnLogRow[]).slice().sort((left, right) =>
    Date.parse(left.started_at) - Date.parse(right.started_at),
  );
  const sessions = ((sessionsResult.data || []) as RealtimeSessionRow[]).slice().sort((left, right) =>
    Date.parse(left.started_at) - Date.parse(right.started_at),
  );
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  const todayLogs = logs.filter((row) => isWithinRange(row.started_at, todayWindow.startMs, now.getTime()));
  const last7Logs = logs.filter((row) => isWithinRange(row.started_at, last7Window.startMs, now.getTime()));

  const todaySummary = buildWindowSummary(
    todayLogs,
    sessions,
    todayWindow.startMs,
    now.getTime(),
    todayWindow.label,
    now,
  );
  const last7Summary = buildWindowSummary(
    last7Logs,
    sessions,
    last7Window.startMs,
    now.getTime(),
    last7Window.label,
    now,
  );

  const currentSession = buildCurrentSessionSummary(logs, sessions, sessionsById, now);
  const topCostDriverLast7Days = buildTopCostDriver(last7Summary.totals);
  const highestCostSessionLast7Days = buildHighestCostSession(last7Logs, sessionsById, timeZone, offsetMinutes);

  return {
    timezoneLabel: timeZone || formatOffsetLabel(offsetMinutes),
    todayLabel: todayWindow.label,
    last7DaysLabel: last7Window.label,
    hasAnySpend: last7Summary.totals.totalUsd > 0 || todaySummary.totals.totalUsd > 0 || Boolean(currentSession),
    currentSession,
    today: todaySummary,
    last7Days: last7Summary,
    topCostDriverLast7Days,
    highestCostSessionLast7Days,
    lastUpdatedAt: now.toISOString(),
  };
}

export function formatRealtimeCostSummaryForBraino(summary: RealtimeCostSummary) {
  if (!summary.hasAnySpend) {
    return "You have not logged any Braino realtime voice spend yet, so there is nothing to total for today or the last 7 days.";
  }

  const lines = ["## Realtime Spend Receipt", ""];

  if (summary.currentSession) {
    lines.push(`- **${summary.currentSession.label}** — ${formatUsd(summary.currentSession.totals.totalUsd)} across ${summary.currentSession.turnCount} turn${summary.currentSession.turnCount === 1 ? "" : "s"} and ${formatMinutes(summary.currentSession.totals.realtimeMinutes)}. Breakdown: OpenAI Realtime ${formatUsd(summary.currentSession.totals.realtimeUsd)}, speech-to-text ${formatUsd(summary.currentSession.totals.transcriptionUsd)}, voice playback ${formatUsd(summary.currentSession.totals.ttsUsd)}.`);
  }

  lines.push(`- **Today (${summary.today.label})** — ${formatUsd(summary.today.totals.totalUsd)} across ${summary.today.sessionCount} session${summary.today.sessionCount === 1 ? "" : "s"}, ${summary.today.turnCount} turn${summary.today.turnCount === 1 ? "" : "s"}, and ${formatMinutes(summary.today.totals.realtimeMinutes)}.`);
  lines.push(`- **Last 7 days (${summary.last7Days.label})** — ${formatUsd(summary.last7Days.totals.totalUsd)} across ${summary.last7Days.sessionCount} session${summary.last7Days.sessionCount === 1 ? "" : "s"}, ${summary.last7Days.turnCount} turn${summary.last7Days.turnCount === 1 ? "" : "s"}, and ${formatMinutes(summary.last7Days.totals.realtimeMinutes)}.`);

  if (summary.topCostDriverLast7Days) {
    lines.push(`- **Biggest cost driver in the last 7 days** — ${summary.topCostDriverLast7Days.label} at ${formatUsd(summary.topCostDriverLast7Days.costUsd)} (${summary.topCostDriverLast7Days.sharePct.toFixed(1)}% of the total).`);
  }

  if (summary.highestCostSessionLast7Days?.startedAt) {
    lines.push(`- **Most expensive session in the last 7 days** — ${formatUsd(summary.highestCostSessionLast7Days.totalUsd)} on ${summary.highestCostSessionLast7Days.startedAtLabel || summary.highestCostSessionLast7Days.startedAt} across ${summary.highestCostSessionLast7Days.turnCount} turn${summary.highestCostSessionLast7Days.turnCount === 1 ? "" : "s"}.`);
  }

  return lines.join("\n");
}

function buildWindowSummary(
  logs: RealtimeTurnLogRow[],
  sessions: RealtimeSessionRow[],
  startMs: number,
  endMs: number,
  label: string,
  now: Date,
): CostWindowSummary {
  const sessionIds = new Set(
    logs
      .map((row) => row.session_id)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  );

  const overlappingSessions = sessions.filter((session) => estimateSessionMsWithinRange(session, now, startMs, endMs) > 0);

  return {
    label,
    since: new Date(startMs).toISOString(),
    until: new Date(endMs).toISOString(),
    sessionCount: Math.max(sessionIds.size, overlappingSessions.length),
    turnCount: logs.length,
    totals: {
      realtimeUsd: roundCurrency(sumLogs(logs, "estimated_openai_realtime_cost_usd")),
      transcriptionUsd: roundCurrency(sumLogs(logs, "estimated_transcription_cost_usd")),
      ttsUsd: roundCurrency(sumLogs(logs, "estimated_tts_cost_usd")),
      totalUsd: roundCurrency(sumLogs(logs, "estimated_total_cost_usd")),
      realtimeMinutes: roundMetric(
        overlappingSessions.reduce((total, session) => total + estimateSessionMsWithinRange(session, now, startMs, endMs), 0) / 60000,
      ),
    },
  };
}

function buildCurrentSessionSummary(
  logs: RealtimeTurnLogRow[],
  sessions: RealtimeSessionRow[],
  sessionsById: Map<string, RealtimeSessionRow>,
  now: Date,
): SessionSummary | null {
  const activeSessions = sessions.filter((session) => isSessionActive(session, now));
  const candidateSession = activeSessions.at(-1) || sessions.at(-1) || null;

  if (candidateSession) {
    const sessionLogs = logs.filter((row) => row.session_id === candidateSession.id);
    return buildSessionSummary(candidateSession, sessionLogs, now);
  }

  const lastLog = logs.at(-1);
  if (!lastLog) return null;

  if (lastLog.session_id && sessionsById.has(lastLog.session_id)) {
    const session = sessionsById.get(lastLog.session_id) || null;
    const sessionLogs = logs.filter((row) => row.session_id === lastLog.session_id);
    return buildSessionSummary(session, sessionLogs, now);
  }

  return {
    label: "Most recent session",
    sessionId: lastLog.session_id,
    startedAt: lastLog.started_at,
    endedAt: lastLog.completed_at,
    active: false,
    turnCount: 1,
    topIntent: lastLog.route_intent || null,
    lastUserTranscript: cleanText(lastLog.user_transcript, 180),
    totals: {
      realtimeUsd: roundCurrency(safeNumber(lastLog.estimated_openai_realtime_cost_usd)),
      transcriptionUsd: roundCurrency(safeNumber(lastLog.estimated_transcription_cost_usd)),
      ttsUsd: roundCurrency(safeNumber(lastLog.estimated_tts_cost_usd)),
      totalUsd: roundCurrency(safeNumber(lastLog.estimated_total_cost_usd)),
      realtimeMinutes: 0,
    },
  };
}

function buildSessionSummary(session: RealtimeSessionRow | null, logs: RealtimeTurnLogRow[], now: Date): SessionSummary {
  const topIntent = mostCommonValue(logs.map((row) => row.route_intent));
  const lastUserTranscript = cleanText(logs.at(-1)?.user_transcript || "", 180) || null;
  const startedAt = session?.started_at || logs.at(0)?.started_at || null;
  const endedAt = session?.ended_at || logs.at(-1)?.completed_at || null;

  return {
    label: session && isSessionActive(session, now) ? "Current live session" : "Most recent session",
    sessionId: session?.id || logs.at(0)?.session_id || null,
    startedAt,
    endedAt,
    active: Boolean(session && isSessionActive(session, now)),
    turnCount: logs.length,
    topIntent,
    lastUserTranscript,
    totals: {
      realtimeUsd: roundCurrency(sumLogs(logs, "estimated_openai_realtime_cost_usd")),
      transcriptionUsd: roundCurrency(sumLogs(logs, "estimated_transcription_cost_usd")),
      ttsUsd: roundCurrency(sumLogs(logs, "estimated_tts_cost_usd")),
      totalUsd: roundCurrency(sumLogs(logs, "estimated_total_cost_usd")),
      realtimeMinutes: roundMetric(
        session ? estimateSessionMsWithinRange(session, now, 0, now.getTime()) / 60000 : 0,
      ),
    },
  };
}

function buildTopCostDriver(totals: AggregatedTotals): CostDriverSummary | null {
  const entries: Array<CostDriverSummary> = [
    { key: "realtime", label: "OpenAI Realtime", costUsd: roundCurrency(totals.realtimeUsd), sharePct: 0 },
    { key: "transcription", label: "Speech-to-text", costUsd: roundCurrency(totals.transcriptionUsd), sharePct: 0 },
    { key: "tts", label: "Voice playback", costUsd: roundCurrency(totals.ttsUsd), sharePct: 0 },
  ].sort((left, right) => right.costUsd - left.costUsd);

  const top = entries[0];
  if (!top || top.costUsd <= 0 || totals.totalUsd <= 0) return null;
  top.sharePct = roundMetric((top.costUsd / totals.totalUsd) * 100);
  return top;
}

function buildHighestCostSession(
  logs: RealtimeTurnLogRow[],
  sessionsById: Map<string, RealtimeSessionRow>,
  timeZone: string | null,
  offsetMinutes: number,
): HighestCostSessionSummary | null {
  const grouped = new Map<string, HighestCostSessionSummary>();

  for (const row of logs) {
    const key = row.session_id || `turn:${row.turn_id}`;
    const existing = grouped.get(key) || {
      sessionId: row.session_id,
      startedAt: row.started_at,
      turnCount: 0,
      totalUsd: 0,
    };

    existing.turnCount += 1;
    existing.totalUsd += safeNumber(row.estimated_total_cost_usd);
    existing.startedAt = minIso(existing.startedAt, row.started_at);
    grouped.set(key, existing);
  }

  const best = Array.from(grouped.values()).sort((left, right) => right.totalUsd - left.totalUsd)[0];
  if (!best || best.totalUsd <= 0) return null;

  const session = best.sessionId ? sessionsById.get(best.sessionId) : null;
  const startedAt = session?.started_at || best.startedAt;
  return {
    sessionId: best.sessionId,
    startedAt,
    startedAtLabel: startedAt ? formatIsoForHumans(startedAt, timeZone, offsetMinutes) : null,
    turnCount: best.turnCount,
    totalUsd: roundCurrency(best.totalUsd),
  };
}

function isWithinRange(iso: string, startMs: number, endMs: number) {
  const value = Date.parse(iso);
  return Number.isFinite(value) && value >= startMs && value <= endMs;
}

function estimateSessionMsWithinRange(session: RealtimeSessionRow, now: Date, rangeStartMs: number, rangeEndMs: number) {
  const startedMs = Date.parse(session.started_at);
  if (!Number.isFinite(startedMs)) return 0;

  const allocatedMs = Math.max(0, Number(session.allocated_ms) || 0);
  const allocationEndMs = allocatedMs > 0 ? startedMs + allocatedMs : Number.POSITIVE_INFINITY;
  const endedMs = session.ended_at ? Date.parse(session.ended_at) : Number.POSITIVE_INFINITY;
  const heartbeatMs = Date.parse(session.last_heartbeat_at || session.started_at);
  const observedEndMs = session.ended_at
    ? endedMs
    : Math.min(
        now.getTime(),
        Number.isFinite(heartbeatMs) ? heartbeatMs + HEARTBEAT_GRACE_MS : now.getTime(),
        allocationEndMs,
      );

  const effectiveStartMs = Math.max(startedMs, rangeStartMs);
  const effectiveEndMs = Math.min(rangeEndMs, observedEndMs, endedMs, allocationEndMs);

  if (!Number.isFinite(effectiveEndMs) || effectiveEndMs <= effectiveStartMs) {
    return 0;
  }

  return effectiveEndMs - effectiveStartMs;
}

function isSessionActive(session: RealtimeSessionRow, now: Date) {
  if (session.ended_at) return false;
  const heartbeatMs = Date.parse(session.last_heartbeat_at || session.started_at);
  if (!Number.isFinite(heartbeatMs)) return false;
  return now.getTime() - heartbeatMs <= HEARTBEAT_GRACE_MS;
}

function getDayWindow(now: Date, timeZone: string | null, offsetMinutes: number, daysBack: number) {
  if (timeZone) {
    return getTimeZoneDayWindow(now, timeZone, daysBack);
  }
  return getOffsetDayWindow(now, offsetMinutes, daysBack);
}

function getTimeZoneDayWindow(now: Date, timeZone: string, daysBack: number) {
  const parts = getZonedParts(now, timeZone);
  const localDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  localDate.setUTCDate(localDate.getUTCDate() - daysBack);

  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth() + 1;
  const day = localDate.getUTCDate();

  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  return {
    startMs: zonedDateTimeToUtcMs(timeZone, year, month, day, 0, 0, 0),
    endMs: zonedDateTimeToUtcMs(
      timeZone,
      nextDate.getUTCFullYear(),
      nextDate.getUTCMonth() + 1,
      nextDate.getUTCDate(),
      0,
      0,
      0,
    ),
    label: formatDateParts(year, month, day, timeZone),
  };
}

function getOffsetDayWindow(now: Date, offsetMinutes: number, daysBack: number) {
  const shiftedNow = new Date(now.getTime() - offsetMinutes * 60_000);
  const localDate = new Date(Date.UTC(
    shiftedNow.getUTCFullYear(),
    shiftedNow.getUTCMonth(),
    shiftedNow.getUTCDate(),
  ));
  localDate.setUTCDate(localDate.getUTCDate() - daysBack);

  const startMs = localDate.getTime() + offsetMinutes * 60_000;
  const endMs = startMs + DAY_MS;
  return {
    startMs,
    endMs,
    label: formatIsoDate(new Date(startMs).toISOString()),
  };
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value || "0");

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

function getTimeZoneOffsetMs(timeZone: string, date: Date) {
  const parts = getZonedParts(date, timeZone);
  const zonedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return zonedUtc - date.getTime();
}

function zonedDateTimeToUtcMs(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
) {
  const guessMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsetMs = getTimeZoneOffsetMs(timeZone, new Date(guessMs));
  return guessMs - offsetMs;
}

function formatDateRangeLabel(startMs: number, endDayStartMs: number, timeZone: string | null, offsetMinutes: number) {
  const start = timeZone
    ? formatDateForZone(new Date(startMs), timeZone)
    : formatIsoDate(new Date(startMs - offsetMinutes * 60_000).toISOString());
  const end = timeZone
    ? formatDateForZone(new Date(endDayStartMs), timeZone)
    : formatIsoDate(new Date(endDayStartMs - offsetMinutes * 60_000).toISOString());

  return `${start} to ${end}`;
}

function formatDateParts(year: number, month: number, day: number, timeZone: string) {
  return formatDateForZone(new Date(zonedDateTimeToUtcMs(timeZone, year, month, day, 12, 0, 0)), timeZone);
}

function formatDateForZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatIsoForHumans(iso: string, timeZone: string | null, offsetMinutes: number) {
  const date = new Date(iso);
  if (timeZone) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const shifted = new Date(date.getTime() - offsetMinutes * 60_000);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(shifted);
}

function formatIsoDate(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function normalizeTimeZone(value: string | null | undefined) {
  const timeZone = String(value || "").trim();
  if (!timeZone) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return null;
  }
}

function normalizeOffsetMinutes(value: number | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(-14 * 60, Math.min(14 * 60, Math.trunc(parsed)));
}

function formatOffsetLabel(offsetMinutes: number) {
  const total = -offsetMinutes;
  const sign = total >= 0 ? "+" : "-";
  const abs = Math.abs(total);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function sumLogs(logs: RealtimeTurnLogRow[], key: keyof Pick<
  RealtimeTurnLogRow,
  "estimated_openai_realtime_cost_usd" | "estimated_transcription_cost_usd" | "estimated_tts_cost_usd" | "estimated_total_cost_usd"
>) {
  return logs.reduce((sum, row) => sum + safeNumber(row[key]), 0);
}

function mostCommonValue(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = String(value || "").trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || null;
}

function cleanText(value: unknown, maxLength = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value: number) {
  return Math.round(value * 10000) / 10000;
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

function formatUsd(value: number) {
  const normalized = roundCurrency(value);
  if (normalized === 0) return "$0.00";
  if (Math.abs(normalized) >= 1) return `$${normalized.toFixed(2)}`;
  return `$${normalized.toFixed(4)}`;
}

function formatMinutes(value: number) {
  return `${roundMetric(value).toFixed(1)} min`;
}

function minIso(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left) <= Date.parse(right) ? left : right;
}
