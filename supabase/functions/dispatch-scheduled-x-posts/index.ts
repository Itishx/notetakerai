import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type ScheduledXPost = {
  id: string;
  user_id: string;
  content: string;
  scheduled_at: string;
};

async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
} | null> {
  const clientId = Deno.env.get("X_CLIENT_ID");
  const clientSecret = Deno.env.get("X_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
  });
  if (!res.ok) {
    console.error("refresh failed", await res.text());
    return null;
  }
  return await res.json();
}

serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Missing Supabase configuration" }, 500);

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: duePosts, error: duePostsError } = await supabase
      .from("scheduled_x_posts")
      .select("id,user_id,content,scheduled_at")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(25);

    if (duePostsError) throw duePostsError;

    let posted = 0;
    let failed = 0;

    for (const post of (duePosts || []) as ScheduledXPost[]) {
      const { data: lockedRow, error: lockError } = await supabase
        .from("scheduled_x_posts")
        .update({ status: "processing", error_message: null })
        .eq("id", post.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (lockError) {
        console.error("failed to lock", lockError);
        failed += 1;
        continue;
      }
      if (!lockedRow) continue;

      try {
        const { data: connection, error: connectionError } = await supabase
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
          const refreshed = await refreshAccessToken(connection.refresh_token);
          if (refreshed?.access_token) {
            accessToken = refreshed.access_token;
            await supabase
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
        try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; }

        if (!response.ok) {
          const message =
            (payload?.detail as string | undefined) ||
            (payload?.title as string | undefined) ||
            raw || "Unknown X API error";
          throw new Error(message);
        }

        const xPostId = (payload?.data as { id?: string } | undefined)?.id;
        if (!xPostId) throw new Error("X API response did not include a post ID.");

        const { error: updateError } = await supabase
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
      } catch (e) {
        console.error("dispatch scheduled x post failed:", e);
        await supabase
          .from("scheduled_x_posts")
          .update({
            status: "failed",
            error_message: e instanceof Error ? e.message.slice(0, 500) : "Unknown error",
          })
          .eq("id", post.id);
        failed += 1;
      }
    }

    return json({ scanned: duePosts?.length || 0, posted, failed });
  } catch (e) {
    console.error("dispatch-scheduled-x-posts error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
