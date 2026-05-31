import { refreshXAccessToken } from "./x-dispatch.ts";

export const SESSION_DURATION_MS = 3 * 60 * 60 * 1000;
export const MIN_REPLY_INTERVAL_MS = 60 * 1000;

const X_API_BASE = "https://api.x.com/2";

type SupabaseLikeClient = {
  from: (table: string) => any;
};

type XConnectionRow = {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  username: string | null;
  display_name: string | null;
  x_user_id: string | null;
};

type XUserProfile = {
  id?: string;
  username?: string;
  name?: string;
  public_metrics?: {
    followers_count?: number;
  };
};

type XTweetMetricRow = {
  public_metrics?: {
    reply_count?: number;
  };
  non_public_metrics?: {
    impression_count?: number;
  };
  organic_metrics?: {
    impression_count?: number;
  };
};

export type XAccountSnapshot = {
  followersCount: number;
  repliesReceived: number;
  totalViews: number;
};

export type AuthorizedXContext = {
  accessToken: string;
  xUserId: string;
  username: string | null;
  displayName: string | null;
};

export type SessionMetricFields = {
  current_followers_count: number;
  followers_gained: number;
  current_replies_received: number;
  replies_received: number;
  current_total_views: number;
  total_views: number;
};

export async function getAuthorizedXContext(
  supabase: SupabaseLikeClient,
  userId: string,
): Promise<AuthorizedXContext> {
  const { data: connection, error } = await supabase
    .from("x_connections")
    .select("access_token,refresh_token,token_expires_at,username,display_name,x_user_id")
    .eq("user_identifier", userId)
    .maybeSingle();

  if (error) throw error;
  if (!connection?.access_token) {
    throw new Error("No X account linked");
  }

  const linkedConnection = connection as XConnectionRow;
  let accessToken = linkedConnection.access_token;
  const expiresAt = linkedConnection.token_expires_at
    ? new Date(linkedConnection.token_expires_at).getTime()
    : 0;

  if (expiresAt && expiresAt < Date.now() + 60_000 && linkedConnection.refresh_token) {
    const refreshed = await refreshXAccessToken(linkedConnection.refresh_token);
    if (refreshed?.access_token) {
      accessToken = refreshed.access_token;
      await supabase
        .from("x_connections")
        .update({
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? linkedConnection.refresh_token,
          token_expires_at: refreshed.expires_in
            ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
            : null,
          scope: refreshed.scope ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_identifier", userId);
    }
  }

  const profile = await fetchXUserProfile(accessToken);
  const xUserId = cleanText(profile?.id) || cleanText(linkedConnection.x_user_id);

  if (!xUserId) {
    throw new Error("Could not resolve X user ID");
  }

  const username = cleanText(profile?.username) || cleanText(linkedConnection.username) || null;
  const displayName = cleanText(profile?.name) || cleanText(linkedConnection.display_name) || null;

  await supabase
    .from("x_connections")
    .update({
      x_user_id: xUserId,
      username,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_identifier", userId);

  await supabase
    .from("x_auto_persona")
    .update({ x_user_id: xUserId })
    .eq("user_id", userId);

  return {
    accessToken,
    xUserId,
    username,
    displayName,
  };
}

export async function fetchLatestMentionId(accessToken: string, xUserId: string): Promise<string | null> {
  const mentions = await fetchMentionsSince(accessToken, xUserId, null, 5);
  return mentions.newestMentionId;
}

export async function fetchMentionsSince(
  accessToken: string,
  xUserId: string,
  sinceId: string | null,
  maxResults = 10,
): Promise<{
  mentions: Array<{
    id: string;
    text: string;
    author_id: string;
    created_at?: string;
  }>;
  usersById: Record<string, { id: string; username?: string; name?: string }>;
  newestMentionId: string | null;
}> {
  const url = new URL(`${X_API_BASE}/users/${xUserId}/mentions`);
  url.searchParams.set("tweet.fields", "text,author_id,created_at");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name");
  url.searchParams.set("max_results", String(Math.min(Math.max(maxResults, 5), 100)));
  if (sinceId) {
    url.searchParams.set("since_id", sinceId);
  }

  const payload = await fetchXJson(url.toString(), accessToken);
  const mentions = Array.isArray(payload?.data) ? payload.data : [];
  const users = Array.isArray(payload?.includes?.users) ? payload.includes.users : [];

  return {
    mentions,
    usersById: Object.fromEntries(users.map((user: any) => [user.id, user])),
    newestMentionId: cleanText(mentions?.[0]?.id) || null,
  };
}

export async function fetchAccountSnapshot(
  accessToken: string,
  xUserId: string,
): Promise<XAccountSnapshot> {
  const [profile, tweetsPayload] = await Promise.all([
    fetchXUserProfile(accessToken),
    fetchXJson(buildRecentTweetsUrl(xUserId), accessToken),
  ]);

  const tweets = Array.isArray(tweetsPayload?.data)
    ? (tweetsPayload.data as XTweetMetricRow[])
    : [];

  return {
    followersCount: numberOrZero(profile?.public_metrics?.followers_count),
    repliesReceived: tweets.reduce(
      (sum, tweet) => sum + numberOrZero(tweet?.public_metrics?.reply_count),
      0,
    ),
    totalViews: tweets.reduce(
      (sum, tweet) =>
        sum +
        numberOrZero(
          tweet?.non_public_metrics?.impression_count ??
            tweet?.organic_metrics?.impression_count,
        ),
      0,
    ),
  };
}

export function buildSessionMetricFields(session: any, snapshot: XAccountSnapshot): SessionMetricFields {
  const startFollowers = numberOrZero(session?.start_followers_count);
  const startReplies = numberOrZero(session?.start_replies_received);
  const startViews = numberOrZero(session?.start_total_views);

  return {
    current_followers_count: snapshot.followersCount,
    followers_gained: clampDelta(snapshot.followersCount - startFollowers),
    current_replies_received: snapshot.repliesReceived,
    replies_received: clampDelta(snapshot.repliesReceived - startReplies),
    current_total_views: snapshot.totalViews,
    total_views: clampDelta(snapshot.totalViews - startViews),
  };
}

export async function refreshSessionMetrics(
  supabase: SupabaseLikeClient,
  session: any,
  xContext: AuthorizedXContext,
): Promise<any> {
  const snapshot = await fetchAccountSnapshot(xContext.accessToken, xContext.xUserId);
  const patch = {
    ...buildSessionMetricFields(session, snapshot),
    last_polled_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("x_auto_sessions")
    .update(patch)
    .eq("id", session.id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function countPendingSessionReplies(
  supabase: SupabaseLikeClient,
  sessionId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("x_auto_reply_logs")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}

export async function syncSessionQueuedCount(
  supabase: SupabaseLikeClient,
  sessionId: string,
): Promise<number> {
  const pendingCount = await countPendingSessionReplies(supabase, sessionId);
  await supabase
    .from("x_auto_sessions")
    .update({
      replies_queued: pendingCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
  return pendingCount;
}

export async function finalizeSession(options: {
  supabase: SupabaseLikeClient;
  session: any;
  status: "completed" | "stopped";
  xContext?: AuthorizedXContext | null;
  stoppedAt?: string;
}): Promise<any> {
  const stoppedAt = options.stoppedAt ?? new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: options.status,
    stopped_at: stoppedAt,
    last_polled_at: stoppedAt,
  };

  if (options.xContext) {
    try {
      const snapshot = await fetchAccountSnapshot(
        options.xContext.accessToken,
        options.xContext.xUserId,
      );
      Object.assign(patch, buildSessionMetricFields(options.session, snapshot));
    } catch (error) {
      console.warn("Could not refresh final X Auto session metrics:", error);
    }
  }

  try {
    patch.replies_queued = await countPendingSessionReplies(options.supabase, options.session.id);
  } catch (error) {
    console.warn("Could not count pending X Auto replies during finalize:", error);
  }

  const { data, error } = await options.supabase
    .from("x_auto_sessions")
    .update(patch)
    .eq("id", options.session.id)
    .eq("status", "active")
    .select("*")
    .single();

  if (error) {
    if (String(error.message || "").includes("0 rows")) {
      return options.session;
    }
    throw error;
  }

  await markXAutomationSessionFinished(options.supabase, data ?? { ...options.session, ...patch });
  return data;
}

export async function markXAutomationSessionStarted(
  supabase: SupabaseLikeClient,
  userId: string,
  startedAt: string,
) {
  const stats = await ensureXAutomationStatsRow(supabase, userId);

  await supabase
    .from("x_automation_stats")
    .update({
      total_runs: numberOrZero(stats?.total_runs) + 1,
      last_run_started_at: startedAt,
      last_run_finished_at: null,
      last_run_reply_count: 0,
      last_run_duration_ms: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function markXAutomationSessionFinished(
  supabase: SupabaseLikeClient,
  session: any,
) {
  const stats = await ensureXAutomationStatsRow(supabase, session.user_id);
  const finishedAt = cleanText(session?.stopped_at) || cleanText(session?.last_polled_at) || new Date().toISOString();
  const startedAt = cleanText(session?.started_at) || finishedAt;
  const durationMs = Math.max(
    0,
    new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
  );

  await supabase
    .from("x_automation_stats")
    .update({
      total_replies: numberOrZero(stats?.total_replies) + numberOrZero(session?.replies_posted),
      total_runtime_ms: numberOrZero(stats?.total_runtime_ms) + durationMs,
      last_run_reply_count: numberOrZero(session?.replies_posted),
      last_run_duration_ms: durationMs,
      last_run_started_at: startedAt,
      last_run_finished_at: finishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", session.user_id);
}

async function ensureXAutomationStatsRow(supabase: SupabaseLikeClient, userId: string) {
  const { data, error } = await supabase
    .from("x_automation_stats")
    .select("user_id,total_replies,total_runs,total_runtime_ms")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from("x_automation_stats")
    .insert({ user_id: userId })
    .select("user_id,total_replies,total_runs,total_runtime_ms")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

async function fetchXUserProfile(accessToken: string): Promise<XUserProfile> {
  const payload = await fetchXJson(
    `${X_API_BASE}/users/me?user.fields=public_metrics,username,name`,
    accessToken,
  );

  return (payload?.data ?? {}) as XUserProfile;
}

async function fetchXJson(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const raw = await response.text();
  const payload = raw ? safeJsonParse(raw) : null;

  if (!response.ok) {
    const message =
      cleanText(payload?.detail) ||
      cleanText(payload?.title) ||
      raw ||
      `X API request failed with status ${response.status}`;
    throw new Error(message.slice(0, 300));
  }

  return payload;
}

function buildRecentTweetsUrl(xUserId: string) {
  const url = new URL(`${X_API_BASE}/users/${xUserId}/tweets`);
  url.searchParams.set("max_results", "100");
  url.searchParams.set(
    "tweet.fields",
    "public_metrics,non_public_metrics,organic_metrics",
  );
  url.searchParams.set("exclude", "retweets");
  return url.toString();
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function clampDelta(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
