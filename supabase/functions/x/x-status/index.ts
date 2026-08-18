import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  fetchAccountSnapshot,
  fetchMentionsSince,
  getAuthorizedXContext,
} from "../../_shared/x-auto-sessions.ts";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { buildXStats, composeSpokenBriefing, fallbackBriefing } from "../../_shared/x-briefing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// On-demand X status snapshot for the Braino Delegate router: live follower count,
// recent mentions, and last-tweet engagement, aggregated into one payload.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sign in required." }, 401);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anonKey) {
      return json({ error: "Missing Supabase anon key." }, 500);
    }

    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "Sign in required." }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Connection pre-check — decide "connected" from the DB row ALONE, with no live X
    // call. A momentarily-expired-but-refreshable token (or a transient X API error)
    // must NOT read as "disconnected" and send the user to settings.
    const { data: conn } = await supabase
      .from("x_connections")
      .select("access_token, username, display_name")
      .eq("user_identifier", user.id)
      .maybeSingle();

    if (!conn?.access_token) {
      return json({ connected: false });
    }

    // Linked. Pull live data best-effort; if X is unreachable, degrade gracefully
    // (still connected) rather than claiming the account isn't linked.
    let followersCount: number | null = null;
    let mentions: Array<{ handle: string; text: string }> = [];
    let username = conn.username ?? null;
    let displayName = conn.display_name ?? null;
    let degraded = false;

    try {
      const ctx = await getAuthorizedXContext(supabase, user.id);
      username = ctx.username ?? username;
      displayName = ctx.displayName ?? displayName;

      const [snapshotResult, mentionsResult] = await Promise.allSettled([
        fetchAccountSnapshot(ctx.accessToken, ctx.xUserId),
        fetchMentionsSince(ctx.accessToken, ctx.xUserId, null, 5),
      ]);

      if (snapshotResult.status === "fulfilled") {
        followersCount = snapshotResult.value.followersCount;
      } else {
        degraded = true;
      }

      if (mentionsResult.status === "fulfilled") {
        mentions = mentionsResult.value.mentions.map((m) => ({
          handle: mentionsResult.value.usersById[m.author_id]?.username ?? "someone",
          text: m.text ?? "",
        }));
      } else {
        degraded = true;
      }
    } catch (liveErr) {
      console.error("x-status live fetch failed (account still linked):", liveErr);
      degraded = true;
    }

    // Last posted tweet + its analytics (same DB shape as x-auto-public-stats).
    const lastTweet = await fetchLastTweet(supabase, user.id, username);

    // Follower 7-day delta — only when we actually got a live count. Self-populates
    // via the daily snapshot we upsert.
    let delta7d: number | null = null;
    if (followersCount != null) {
      delta7d = await computeFollowerDelta(supabase, user.id, followersCount);
      await upsertFollowerSnapshot(supabase, user.id, followersCount);
    }

    // The full picture, same source the dashboard reads. Asking out loud used
    // to get a thinner answer than opening the page, which was backwards.
    let briefing: string | null = null;
    let stats: unknown = null;
    try {
      const built = await buildXStats(supabase, user.id);
      stats = built;
      briefing = (await composeSpokenBriefing(built)) ?? fallbackBriefing(built);
    } catch (e) {
      console.error("x-status briefing failed, returning basics:", e);
    }

    return json({
      connected: true,
      degraded,
      briefing,
      stats,
      username,
      displayName,
      followers: { count: followersCount, delta7d },
      lastTweet,
      mentions,
      totals: {
        likes: lastTweet?.likes ?? 0,
        retweets: lastTweet?.retweets ?? 0,
        replies_received: lastTweet?.replies ?? 0,
      },
    });
  } catch (error) {
    console.error("x-status error:", error);
    return json({ error: (error as Error)?.message || "X status failed." }, 500);
  }
});

async function fetchLastTweet(
  supabase: { from: (table: string) => any },
  userId: string,
  username: string | null,
) {
  const { data: post } = await supabase
    .from("scheduled_x_posts")
    .select("content, x_post_id, posted_at")
    .eq("user_id", userId)
    .eq("status", "posted")
    .not("x_post_id", "is", null)
    .order("posted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!post?.x_post_id) return null;

  const { data: analytics } = await supabase
    .from("x_post_analytics")
    .select("like_count, retweet_count, reply_count")
    .eq("tweet_id", post.x_post_id)
    .maybeSingle();

  return {
    text: post.content ?? "",
    url: username ? `https://x.com/${username}/status/${post.x_post_id}` : null,
    likes: analytics?.like_count ?? 0,
    retweets: analytics?.retweet_count ?? 0,
    replies: analytics?.reply_count ?? 0,
  };
}

async function computeFollowerDelta(
  supabase: { from: (table: string) => any },
  userId: string,
  currentCount: number,
): Promise<number | null> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Oldest snapshot within the trailing 7 days is our baseline.
  const { data: baseline } = await supabase
    .from("x_follower_snapshots")
    .select("followers_count")
    .eq("user_id", userId)
    .gte("captured_on", sevenDaysAgo)
    .order("captured_on", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (baseline?.followers_count == null) return null;
  return currentCount - baseline.followers_count;
}

async function upsertFollowerSnapshot(
  supabase: { from: (table: string) => any },
  userId: string,
  followersCount: number,
) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("x_follower_snapshots")
    .upsert(
      { user_id: userId, captured_on: today, followers_count: followersCount },
      { onConflict: "user_id,captured_on" },
    );
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
