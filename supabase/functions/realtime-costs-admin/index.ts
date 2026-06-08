import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_API_BASE = "https://api.openai.com/v1";

type RealtimeTurnLogRow = {
  id: string;
  user_id: string;
  session_id: string | null;
  turn_id: string;
  turn_index: number;
  started_at: string;
  completed_at: string | null;
  user_transcript: string | null;
  assistant_messages: unknown;
  route_intent: string | null;
  route_mode: string | null;
  connector: string | null;
  realtime_model: string | null;
  transcription_model: string | null;
  voice_provider: string | null;
  voice_id: string | null;
  voice_name: string | null;
  realtime_input_text_tokens: number | null;
  realtime_input_audio_tokens: number | null;
  realtime_output_text_tokens: number | null;
  realtime_output_audio_tokens: number | null;
  realtime_cached_text_tokens: number | null;
  realtime_cached_audio_tokens: number | null;
  transcription_input_text_tokens: number | null;
  transcription_input_audio_tokens: number | null;
  transcription_output_text_tokens: number | null;
  total_tokens: number | null;
  estimated_openai_realtime_cost_usd: number | null;
  estimated_transcription_cost_usd: number | null;
  estimated_tts_cost_usd: number | null;
  estimated_total_cost_usd: number | null;
  cost_confidence: string | null;
  raw_realtime_usage: unknown;
  raw_transcription_usage: unknown;
  raw_tts_usage: unknown;
};

type RealtimeSessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  last_heartbeat_at: string | null;
  allocated_ms: number | null;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type OpenAiCostResult = {
  amount?: {
    value?: number;
    currency?: string;
  } | null;
  line_item?: string | null;
  project_id?: string | null;
};

type OpenAiBucket<T> = {
  start_time?: number;
  end_time?: number;
  results?: T[] | null;
};

type OpenAiPage<T> = {
  data?: Array<OpenAiBucket<T>>;
  has_more?: boolean;
  next_page?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!anonKey || !serviceRoleKey || !supabaseUrl) {
      return json({ error: "Missing Supabase configuration." }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Sign in required." }, 401);

    const requesterEmail = String(user.email || "").trim().toLowerCase();
    const adminEmails = parseCsvList(Deno.env.get("REALTIME_COSTS_ADMIN_EMAILS")).map((email) => email.toLowerCase());
    if (!requesterEmail || !adminEmails.includes(requesterEmail)) {
      return json({ error: "Admin access required." }, 403);
    }

    const url = new URL(req.url);
    const days = clampInt(url.searchParams.get("days"), 1, 90, 30);
    const limit = clampInt(url.searchParams.get("limit"), 50, 10000, 5000);
    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [logsResult, sessionsResult] = await Promise.all([
      admin
        .from("realtime_voice_turn_logs")
        .select("*")
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: false })
        .limit(limit),
      admin
        .from("realtime_voice_sessions")
        .select("id,user_id,started_at,ended_at,last_heartbeat_at,allocated_ms")
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: false })
        .limit(10000),
    ]);

    if (logsResult.error) {
      console.error("realtime-costs-admin logs query error:", logsResult.error);
      return json({ error: "Could not load realtime turn logs." }, 500);
    }
    if (sessionsResult.error) {
      console.error("realtime-costs-admin sessions query error:", sessionsResult.error);
      return json({ error: "Could not load realtime sessions." }, 500);
    }

    const logs = (logsResult.data || []) as RealtimeTurnLogRow[];
    const sessions = (sessionsResult.data || []) as RealtimeSessionRow[];
    const userIds = Array.from(new Set([
      ...logs.map((row) => row.user_id),
      ...sessions.map((row) => row.user_id),
    ])).filter(Boolean);

    const [profiles, authUsers, actualCosts] = await Promise.all([
      loadProfiles(admin, userIds),
      loadAuthUsers(admin, userIds),
      fetchOpenAiActualCosts(since, now),
    ]);

    const sessionsByUser = sessions.reduce((map, session) => {
      const list = map.get(session.user_id) || [];
      list.push(session);
      map.set(session.user_id, list);
      return map;
    }, new Map<string, RealtimeSessionRow[]>());

    const groupedUserMap = logs.reduce((map, row) => {
      const existing = map.get(row.user_id) || {
        userId: row.user_id,
        email: authUsers.get(row.user_id)?.email || null,
        displayName: profiles.get(row.user_id)?.display_name || authUsers.get(row.user_id)?.name || null,
        avatarUrl: profiles.get(row.user_id)?.avatar_url || null,
        sessionCount: 0,
        turnCount: 0,
        estimatedRealtimeCostUsd: 0,
        estimatedTranscriptionCostUsd: 0,
        estimatedTtsCostUsd: 0,
        estimatedTotalCostUsd: 0,
        realtimeMinutes: 0,
        lastSeenAt: row.started_at,
        audioOutputWarningCount: 0,
        turns: [] as unknown[],
      };

      existing.turnCount += 1;
      existing.estimatedRealtimeCostUsd += safeNumber(row.estimated_openai_realtime_cost_usd);
      existing.estimatedTranscriptionCostUsd += safeNumber(row.estimated_transcription_cost_usd);
      existing.estimatedTtsCostUsd += safeNumber(row.estimated_tts_cost_usd);
      existing.estimatedTotalCostUsd += safeNumber(row.estimated_total_cost_usd);
      existing.lastSeenAt = maxIso(existing.lastSeenAt, row.started_at);
      if (safeNumber(row.realtime_output_audio_tokens) > 0) existing.audioOutputWarningCount += 1;

      existing.turns.push(formatTurn(row));
      map.set(row.user_id, existing);
      return map;
    }, new Map<string, {
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
      turns: unknown[];
    }>());

    const groupedUsers = Array.from(groupedUserMap.values()).map((entry) => {
      const userSessions = sessionsByUser.get(entry.userId) || [];
      entry.sessionCount = new Set(userSessions.map((session) => session.id)).size || new Set((entry.turns as Array<{ sessionId?: string | null }>).map((turn) => turn.sessionId).filter(Boolean)).size;
      entry.realtimeMinutes = roundMetric(userSessions.reduce((total, session) => total + estimateSessionMs(session, now), 0) / 60000);
      entry.estimatedRealtimeCostUsd = roundCurrency(entry.estimatedRealtimeCostUsd);
      entry.estimatedTranscriptionCostUsd = roundCurrency(entry.estimatedTranscriptionCostUsd);
      entry.estimatedTtsCostUsd = roundCurrency(entry.estimatedTtsCostUsd);
      entry.estimatedTotalCostUsd = roundCurrency(entry.estimatedTotalCostUsd);
      entry.turns = entry.turns.sort((left, right) => String((left as { startedAt?: string }).startedAt || "").localeCompare(String((right as { startedAt?: string }).startedAt || "")));
      return entry;
    }).sort((left, right) => right.estimatedTotalCostUsd - left.estimatedTotalCostUsd);

    const totals = {
      estimatedRealtimeCostUsd: roundCurrency(groupedUsers.reduce((sum, item) => sum + item.estimatedRealtimeCostUsd, 0)),
      estimatedTranscriptionCostUsd: roundCurrency(groupedUsers.reduce((sum, item) => sum + item.estimatedTranscriptionCostUsd, 0)),
      estimatedTtsCostUsd: roundCurrency(groupedUsers.reduce((sum, item) => sum + item.estimatedTtsCostUsd, 0)),
      estimatedTotalCostUsd: roundCurrency(groupedUsers.reduce((sum, item) => sum + item.estimatedTotalCostUsd, 0)),
      actualOpenAiCostUsd: actualCosts.available ? safeNumber(actualCosts.totalUsd) : null,
      unreconciledDeltaUsd: actualCosts.available
        ? roundCurrency(safeNumber(actualCosts.totalUsd) - groupedUsers.reduce((sum, item) => sum + item.estimatedRealtimeCostUsd + item.estimatedTranscriptionCostUsd, 0))
        : null,
      totalRealtimeMinutes: roundMetric(sessions.reduce((sum, session) => sum + estimateSessionMs(session, now), 0) / 60000),
      totalSessions: new Set(sessions.map((session) => session.id)).size,
      totalTurns: logs.length,
      audioOutputWarningCount: logs.filter((row) => safeNumber(row.realtime_output_audio_tokens) > 0).length,
    };

    return json({
      ok: true,
      requester: {
        id: user.id,
        email: requesterEmail,
      },
      range: {
        days,
        since: since.toISOString(),
        until: now.toISOString(),
      },
      totals,
      users: groupedUsers,
      actualCosts,
      lastUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("realtime-costs-admin error:", error);
    if (isUsageScopeError(error)) {
      return json({
        error: "OpenAI usage access is not configured for realtime cost reconciliation.",
        userMessage:
          "Add OPENAI_ADMIN_API_KEY in Supabase using an OpenAI key with the api.usage.read scope to show actual org costs.",
        setupUrl: "https://platform.openai.com/settings/organization/admin-keys",
      }, 403);
    }
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function loadProfiles(admin: ReturnType<typeof createClient>, userIds: string[]) {
  const map = new Map<string, ProfileRow>();
  if (!userIds.length) return map;

  const { data, error } = await admin
    .from("profiles")
    .select("user_id,display_name,avatar_url")
    .in("user_id", userIds.slice(0, 1000));

  if (error) {
    console.error("realtime-costs-admin profiles query error:", error);
    return map;
  }

  for (const profile of (data || []) as ProfileRow[]) {
    map.set(profile.user_id, profile);
  }
  return map;
}

async function loadAuthUsers(admin: ReturnType<typeof createClient>, userIds: string[]) {
  const entries = await Promise.all(userIds.slice(0, 250).map(async (userId) => {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) return [userId, { email: null, name: null }] as const;
    const metadata = data.user.user_metadata || {};
    return [userId, {
      email: data.user.email || null,
      name: String(metadata.full_name || metadata.name || "").trim() || null,
    }] as const;
  }));

  return new Map(entries);
}

function formatTurn(row: RealtimeTurnLogRow) {
  const assistantMessages = Array.isArray(row.assistant_messages)
    ? row.assistant_messages.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  return {
    id: row.id,
    sessionId: row.session_id,
    turnId: row.turn_id,
    turnIndex: row.turn_index,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    userTranscript: row.user_transcript || "",
    assistantMessages,
    routeIntent: row.route_intent,
    routeMode: row.route_mode,
    connector: row.connector,
    realtimeModel: row.realtime_model,
    transcriptionModel: row.transcription_model,
    voiceProvider: row.voice_provider,
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    tokens: {
      realtimeInputText: safeNumber(row.realtime_input_text_tokens),
      realtimeInputAudio: safeNumber(row.realtime_input_audio_tokens),
      realtimeOutputText: safeNumber(row.realtime_output_text_tokens),
      realtimeOutputAudio: safeNumber(row.realtime_output_audio_tokens),
      realtimeCachedText: safeNumber(row.realtime_cached_text_tokens),
      realtimeCachedAudio: safeNumber(row.realtime_cached_audio_tokens),
      transcriptionInputText: safeNumber(row.transcription_input_text_tokens),
      transcriptionInputAudio: safeNumber(row.transcription_input_audio_tokens),
      transcriptionOutputText: safeNumber(row.transcription_output_text_tokens),
      total: safeNumber(row.total_tokens),
    },
    costs: {
      realtimeUsd: roundCurrency(safeNumber(row.estimated_openai_realtime_cost_usd)),
      transcriptionUsd: roundCurrency(safeNumber(row.estimated_transcription_cost_usd)),
      ttsUsd: roundCurrency(safeNumber(row.estimated_tts_cost_usd)),
      totalUsd: roundCurrency(safeNumber(row.estimated_total_cost_usd)),
      confidence: row.cost_confidence || "unknown",
    },
    rawUsage: {
      realtime: row.raw_realtime_usage || {},
      transcription: row.raw_transcription_usage || {},
      tts: row.raw_tts_usage || {},
    },
    warnings: {
      openAiAudioOutputTokens: safeNumber(row.realtime_output_audio_tokens) > 0,
    },
  };
}

async function fetchOpenAiActualCosts(since: Date, until: Date) {
  const apiKey = Deno.env.get("OPENAI_ADMIN_API_KEY") || Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return {
      available: false,
      totalUsd: null,
      currency: "usd",
      dailyCosts: [],
      lineItems: [],
      setupMessage: "OPENAI_ADMIN_API_KEY is missing, so actual OpenAI org-cost reconciliation is unavailable.",
    };
  }

  try {
    const projectIds = parseCsvList(Deno.env.get("OPENAI_COSTS_PROJECT_IDS"));
    const startUnix = Math.floor(since.getTime() / 1000);
    const endUnix = Math.floor(until.getTime() / 1000);
    const [costBuckets, lineItemBuckets] = await Promise.all([
      fetchOpenAiBuckets<OpenAiCostResult>({
        apiKey,
        path: "/organization/costs",
        params: {
          start_time: String(startUnix),
          end_time: String(endUnix),
          bucket_width: "1d",
          limit: "90",
        },
        projectIds,
      }),
      fetchOpenAiBuckets<OpenAiCostResult>({
        apiKey,
        path: "/organization/costs",
        params: {
          start_time: String(startUnix),
          end_time: String(endUnix),
          bucket_width: "1d",
          limit: "90",
        },
        groupBy: ["line_item"],
        projectIds,
      }),
    ]);

    const dailyCosts = costBuckets
      .map((bucket) => ({
        date: new Date(safeNumber(bucket.start_time) * 1000).toISOString().slice(0, 10),
        costUsd: roundCurrency(sumCostResults(bucket.results)),
        currency: firstCurrency(bucket.results) || "usd",
      }))
      .filter((bucket) => bucket.costUsd > 0);

    const lineItems = Array.from(
      lineItemBuckets.reduce((totals, bucket) => {
        for (const result of bucket.results || []) {
          const lineItem = (result.line_item || "Other").trim() || "Other";
          totals.set(lineItem, (totals.get(lineItem) || 0) + safeNumber(result.amount?.value));
        }
        return totals;
      }, new Map<string, number>()),
    )
      .map(([lineItem, costUsd]) => ({ lineItem, costUsd: roundCurrency(costUsd) }))
      .sort((left, right) => right.costUsd - left.costUsd);

    return {
      available: true,
      totalUsd: roundCurrency(dailyCosts.reduce((sum, day) => sum + day.costUsd, 0)),
      currency: firstCurrencyFromBuckets(costBuckets) || "usd",
      dailyCosts,
      lineItems,
      scopedProjectIds: projectIds,
    };
  } catch (error) {
    console.error("realtime-costs-admin OpenAI costs error:", error);
    return {
      available: false,
      totalUsd: null,
      currency: "usd",
      dailyCosts: [],
      lineItems: [],
      setupMessage: error instanceof Error ? error.message : "OpenAI cost lookup failed.",
    };
  }
}

async function fetchOpenAiBuckets<T>({
  apiKey,
  path,
  params,
  groupBy = [],
  projectIds = [],
}: {
  apiKey: string;
  path: string;
  params: Record<string, string>;
  groupBy?: string[];
  projectIds?: string[];
}) {
  const buckets: Array<OpenAiBucket<T>> = [];
  let nextPage: string | null = null;

  do {
    const url = new URL(`${OPENAI_API_BASE}${path}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    groupBy.forEach((field) => {
      url.searchParams.append("group_by", field);
    });
    projectIds.forEach((projectId) => {
      url.searchParams.append("project_ids", projectId);
    });
    if (nextPage) {
      url.searchParams.set("page", nextPage);
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(await extractOpenAiError(response));
    }

    const payload = await response.json() as OpenAiPage<T>;
    buckets.push(...(payload.data || []));
    nextPage = payload.has_more ? payload.next_page || null : null;
  } while (nextPage);

  return buckets;
}

async function extractOpenAiError(response: Response) {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.message || raw;
  } catch {
    return raw || `OpenAI request failed with status ${response.status}.`;
  }
}

function estimateSessionMs(session: RealtimeSessionRow, now: Date) {
  const started = Date.parse(session.started_at);
  if (!Number.isFinite(started)) return 0;

  const allocatedMs = Math.max(0, Number(session.allocated_ms) || 0);
  const endedAt = session.ended_at ? Date.parse(session.ended_at) : NaN;
  const heartbeatAt = session.last_heartbeat_at ? Date.parse(session.last_heartbeat_at) : NaN;
  const observedEnd = Number.isFinite(endedAt)
    ? endedAt
    : Math.min(now.getTime(), Number.isFinite(heartbeatAt) ? heartbeatAt + 45_000 : started + allocatedMs);
  const elapsed = Math.max(0, observedEnd - started);
  return allocatedMs > 0 ? Math.min(elapsed, allocatedMs) : elapsed;
}

function parseCsvList(value: string | undefined | null) {
  if (!value) return [] as string[];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
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

function sumCostResults(results: OpenAiCostResult[] | null | undefined) {
  return (results || []).reduce((sum, result) => sum + safeNumber(result.amount?.value), 0);
}

function firstCurrency(results: OpenAiCostResult[] | null | undefined) {
  return (results || []).find((result) => typeof result.amount?.currency === "string")?.amount?.currency || null;
}

function firstCurrencyFromBuckets(buckets: Array<OpenAiBucket<OpenAiCostResult>>) {
  for (const bucket of buckets) {
    const currency = firstCurrency(bucket.results);
    if (currency) return currency;
  }
  return null;
}

function maxIso(left: string, right: string) {
  return Date.parse(right) > Date.parse(left) ? right : left;
}

function isUsageScopeError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message || "";
  return message.includes("api.usage.read") || message.includes("insufficient permissions");
}
