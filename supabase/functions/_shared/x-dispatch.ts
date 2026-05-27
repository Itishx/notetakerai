import { getEnvValue, getXOAuth2Credentials } from "./x-oauth.ts";

type ScheduledXPost = {
  id: string;
  user_id: string;
  content: string;
  scheduled_at: string;
};

type SupabaseLikeClient = {
  from: (table: string) => any;
};

export type DispatchDueXPostsOptions = {
  supabase: SupabaseLikeClient;
  userId?: string;
  postId?: string;
  limit?: number;
};

export type DispatchDueXPostsResult = {
  scanned: number;
  posted: number;
  failed: number;
  results: Array<{
    id: string;
    status: "posted" | "failed";
    xPostId?: string;
    error?: string;
  }>;
};

export async function refreshXAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
} | null> {
  const { clientId, clientSecret } = getXOAuth2Credentials();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const basic = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    console.error("refresh failed", await response.text());
    return null;
  }

  return await response.json();
}

export async function dispatchDueXPosts(options: DispatchDueXPostsOptions): Promise<DispatchDueXPostsResult> {
  const limit = options.limit ?? 25;
  let query = options.supabase
    .from("scheduled_x_posts")
    .select("id,user_id,content,scheduled_at")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  if (options.postId) {
    query = query.eq("id", options.postId);
  }

  const { data: duePosts, error: duePostsError } = await query;
  if (duePostsError) throw duePostsError;

  let posted = 0;
  let failed = 0;
  const results: DispatchDueXPostsResult["results"] = [];

  for (const post of (duePosts || []) as ScheduledXPost[]) {
    const { data: lockedRow, error: lockError } = await options.supabase
      .from("scheduled_x_posts")
      .update({ status: "processing", error_message: null })
      .eq("id", post.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (lockError) {
      console.error("failed to lock", lockError);
      failed += 1;
      results.push({ id: post.id, status: "failed", error: lockError.message });
      continue;
    }
    if (!lockedRow) continue;

    try {
      const { data: connection, error: connectionError } = await options.supabase
        .from("x_connections")
        .select("access_token,refresh_token,token_expires_at")
        .eq("user_identifier", post.user_id)
        .maybeSingle();

      if (connectionError) throw connectionError;
      if (!connection?.access_token) throw new Error("No linked X account for this user.");
      if (!post.content?.trim()) throw new Error("Scheduled post is empty.");
      if (post.content.length > 280) throw new Error("Scheduled post exceeds 280 characters.");

      let accessToken = connection.access_token;
      const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
      if (expiresAt && expiresAt < Date.now() + 60_000 && connection.refresh_token) {
        const refreshed = await refreshXAccessToken(connection.refresh_token);
        if (refreshed?.access_token) {
          accessToken = refreshed.access_token;
          await options.supabase
            .from("x_connections")
            .update({
              access_token: refreshed.access_token,
              refresh_token: refreshed.refresh_token ?? connection.refresh_token,
              token_expires_at: refreshed.expires_in
                ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
                : null,
              scope: refreshed.scope ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_identifier", post.user_id);
        }
      }

      const response = await fetch("https://api.x.com/2/tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ text: post.content }),
      });

      const raw = await response.text();
      let payload: Record<string, unknown> | null = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message =
          (payload?.detail as string | undefined) ||
          (payload?.title as string | undefined) ||
          raw ||
          "Unknown X API error";
        throw new Error(message);
      }

      const xPostId = (payload?.data as { id?: string } | undefined)?.id;
      if (!xPostId) throw new Error("X API response did not include a post ID.");

      const { error: updateError } = await options.supabase
        .from("scheduled_x_posts")
        .update({
          status: "posted",
          x_post_id: xPostId,
          posted_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", post.id);

      if (updateError) throw updateError;
      posted += 1;
      results.push({ id: post.id, status: "posted", xPostId });
    } catch (error) {
      console.error("dispatch scheduled x post failed:", error);
      const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown error";
      await options.supabase
        .from("scheduled_x_posts")
        .update({
          status: "failed",
          error_message: message,
        })
        .eq("id", post.id);
      failed += 1;
      results.push({ id: post.id, status: "failed", error: message });
    }
  }

  return {
    scanned: duePosts?.length || 0,
    posted,
    failed,
    results,
  };
}

export function requireSupabaseServiceConfig() {
  const supabaseUrl = getEnvValue("SUPABASE_URL");
  const serviceRoleKey = getEnvValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration");
  }
  return { supabaseUrl, serviceRoleKey };
}
