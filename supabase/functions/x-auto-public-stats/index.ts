import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase config" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Resolve which user's data to show — defaults to first result for "BrainoAI" username
  const url = new URL(req.url);
  const requestedUsername = url.searchParams.get("username") || "brainoai";

  const { data: connection } = await supabase
    .from("x_connections")
    .select("user_identifier, username, display_name, x_user_id")
    .ilike("username", requestedUsername)
    .maybeSingle();

  if (!connection) {
    return json({ error: "Account not found." }, 404);
  }

  const userId = connection.user_identifier;

  // Fetch recent posted tweets
  const { data: posts } = await supabase
    .from("scheduled_x_posts")
    .select("id, content, posted_at, x_post_id, scheduled_at, status")
    .eq("user_id", userId)
    .eq("status", "posted")
    .not("x_post_id", "is", null)
    .order("posted_at", { ascending: false })
    .limit(20);

  // Fetch analytics for those tweets
  const tweetIds = (posts ?? []).map((p) => p.x_post_id).filter(Boolean);
  let analyticsById: Record<string, {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    bookmark_count: number;
  }> = {};

  if (tweetIds.length) {
    const { data: analytics } = await supabase
      .from("x_post_analytics")
      .select("tweet_id, like_count, retweet_count, reply_count, bookmark_count")
      .in("tweet_id", tweetIds);

    analyticsById = Object.fromEntries(
      (analytics ?? []).map((a) => [a.tweet_id, a])
    );
  }

  // Build public post objects
  const recentPosts = (posts ?? []).map((p) => {
    const analytics = analyticsById[p.x_post_id] ?? {};
    return {
      id: p.id,
      content: p.content,
      posted_at: p.posted_at,
      x_url: `https://x.com/${connection.username}/status/${p.x_post_id}`,
      likes: analytics.like_count ?? 0,
      retweets: analytics.retweet_count ?? 0,
      replies: analytics.reply_count ?? 0,
      bookmarks: analytics.bookmark_count ?? 0,
    };
  });

  // Aggregate totals
  const totalLikes = recentPosts.reduce((s, p) => s + p.likes, 0);
  const totalRetweets = recentPosts.reduce((s, p) => s + p.retweets, 0);
  const totalRepliesReceived = recentPosts.reduce((s, p) => s + p.replies, 0);

  // Total post count (all time)
  const { count: totalPosts } = await supabase
    .from("scheduled_x_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "posted");

  // Recent auto-replies sent
  const { data: replyLogs } = await supabase
    .from("x_auto_reply_logs")
    .select("post_author_handle, post_text, our_reply, replied_at, post_url")
    .eq("user_id", userId)
    .eq("status", "posted")
    .order("replied_at", { ascending: false })
    .limit(10);

  // Next scheduled post
  const { data: nextPost } = await supabase
    .from("scheduled_x_posts")
    .select("scheduled_at")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Total replies sent count
  const { count: totalRepliesSent } = await supabase
    .from("x_auto_reply_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "posted");

  // Auto mode status
  const { data: persona } = await supabase
    .from("x_auto_persona")
    .select("auto_posting_enabled, auto_reply_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  return json({
    account: {
      username: connection.username,
      display_name: connection.display_name,
    },
    pipeline: {
      auto_posting_enabled: persona?.auto_posting_enabled ?? false,
      auto_reply_enabled: persona?.auto_reply_enabled ?? false,
      next_post_at: nextPost?.scheduled_at ?? null,
    },
    totals: {
      posts: totalPosts ?? 0,
      likes: totalLikes,
      retweets: totalRetweets,
      replies_received: totalRepliesReceived,
      replies_sent: totalRepliesSent ?? 0,
    },
    recent_posts: recentPosts,
    recent_replies: (replyLogs ?? []).map((r) => ({
      author_handle: r.post_author_handle,
      mention_text: r.post_text,
      our_reply: r.our_reply,
      replied_at: r.replied_at,
      post_url: r.post_url,
    })),
  });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
