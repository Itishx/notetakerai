// BrainoX analytics briefing (BrainoX.md sections 49-52, 122, 124-125).
// One canonical source of numbers for both the /x dashboard and voice: the
// structured `stats` object. The spoken `briefing` is composed FROM those
// stats, never from separate queries, so dashboard and voice always agree.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in required." }, 401);

    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Sign in required." }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json().catch(() => ({}));
    const wantSpoken = body?.spoken !== false;

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [
      { data: snapshots },
      { data: postedRows },
      { data: queueRows },
      { data: settings },
      { data: recentActions },
    ] = await Promise.all([
      supabase
        .from("x_follower_snapshots")
        .select("captured_on,followers_count")
        .eq("user_id", user.id)
        .order("captured_on", { ascending: false })
        .limit(31),
      supabase
        .from("scheduled_x_posts")
        .select("content,x_post_id,posted_at")
        .eq("user_id", user.id)
        .eq("status", "posted")
        .gte("posted_at", since7d)
        .order("posted_at", { ascending: false })
        .limit(50),
      supabase
        .from("x_queue_items")
        .select("status,text,pillar,scheduled_publish_at")
        .eq("user_id", user.id)
        .not("status", "in", "(archived,rejected)")
        .limit(200),
      supabase
        .from("x_settings")
        .select("daily_target,automation_mode,kill_switch")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("x_action_log")
        .select("agent,action,reason,result,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    // Follower deltas from daily snapshots.
    const ordered = (snapshots ?? []).slice().reverse();
    const latest = ordered[ordered.length - 1] ?? null;
    const deltaSince = (days: number): number | null => {
      if (!latest) return null;
      const target = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const base = ordered.filter((row) => new Date(row.captured_on) <= target).pop();
      return base ? latest.followers_count - base.followers_count : null;
    };

    // Engagement for the week's posts.
    const tweetIds = (postedRows ?? []).map((row) => row.x_post_id).filter(Boolean);
    let analytics: Array<{
      tweet_id: string;
      like_count: number;
      retweet_count: number;
      reply_count: number;
      quote_count: number;
      bookmark_count: number;
    }> = [];
    if (tweetIds.length) {
      const { data } = await supabase
        .from("x_post_analytics")
        .select("tweet_id,like_count,retweet_count,reply_count,quote_count,bookmark_count")
        .eq("user_id", user.id)
        .in("tweet_id", tweetIds);
      analytics = data ?? [];
    }
    const engagementOf = (tweetId: string | null) => {
      const row = analytics.find((entry) => entry.tweet_id === tweetId);
      if (!row) return { likes: 0, reposts: 0, replies: 0, quotes: 0, bookmarks: 0, total: 0 };
      const total =
        row.like_count + row.retweet_count + row.reply_count + row.quote_count + row.bookmark_count;
      return {
        likes: row.like_count,
        reposts: row.retweet_count,
        replies: row.reply_count,
        quotes: row.quote_count,
        bookmarks: row.bookmark_count,
        total,
      };
    };
    const rankedPosts = (postedRows ?? [])
      .map((row) => ({
        text: row.content,
        postedAt: row.posted_at,
        xPostId: row.x_post_id,
        engagement: engagementOf(row.x_post_id),
      }))
      .sort((a, b) => b.engagement.total - a.engagement.total);

    const queueCounts: Record<string, number> = {};
    for (const row of queueRows ?? []) {
      queueCounts[row.status] = (queueCounts[row.status] ?? 0) + 1;
    }
    const nextScheduled = (queueRows ?? [])
      .filter((row) => row.status === "scheduled" && row.scheduled_publish_at)
      .sort(
        (a, b) =>
          new Date(a.scheduled_publish_at as string).getTime() -
          new Date(b.scheduled_publish_at as string).getTime(),
      )[0] ?? null;

    const weekEngagement = rankedPosts.reduce((sum, post) => sum + post.engagement.total, 0);

    const stats = {
      followers: latest
        ? {
            current: latest.followers_count,
            asOf: latest.captured_on,
            delta1d: deltaSince(1),
            delta7d: deltaSince(7),
            delta30d: deltaSince(30),
            dailyTarget: settings?.daily_target ?? null,
          }
        : null,
      week: {
        postsPublished: (postedRows ?? []).length,
        totalEngagement: weekEngagement,
        bestPost: rankedPosts[0] ?? null,
        topPosts: rankedPosts.slice(0, 5),
      },
      queue: {
        counts: queueCounts,
        nextScheduled,
      },
      automation: {
        mode: settings?.automation_mode ?? "manual",
        killSwitch: settings?.kill_switch ?? false,
      },
      recentActivity: recentActions ?? [],
      limits: {
        // Honest about what this tier of X API data can and cannot show.
        note: "Impressions, profile visits, and follower attribution need a paid X API tier. Engagement counts and follower snapshots are live.",
      },
    };

    let briefing = fallbackBriefing(stats);
    if (wantSpoken) {
      const spoken = await composeSpokenBriefing(stats);
      if (spoken) briefing = spoken;
    }

    return json({ stats, briefing });
  } catch (error) {
    console.error("brainox-briefing error:", error);
    const message = error instanceof Error ? error.message : "Briefing failed.";
    return json({ error: message }, 500);
  }
});

type Stats = {
  followers: {
    current: number;
    delta1d: number | null;
    delta7d: number | null;
    delta30d: number | null;
    dailyTarget: number | null;
  } | null;
  week: {
    postsPublished: number;
    totalEngagement: number;
    bestPost: { text: string; engagement: { total: number } } | null;
  };
  queue: {
    counts: Record<string, number>;
    nextScheduled: { text: string; scheduled_publish_at: string | null } | null;
  };
  automation: { mode: string; killSwitch: boolean };
};

async function composeSpokenBriefing(stats: Stats): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        messages: [
          {
            role: "system",
            content:
              "You are Braino giving Itish an executive briefing on his X account. Speak in short plain sentences, first person, warm but direct. Use ONLY the numbers in the JSON, never invent any. If a number is null, skip it rather than guessing. Mention followers, this week's posts and engagement, the best post, what is scheduled next, and one concrete recommendation. Never use em dashes or en dashes. Keep it under 130 words.",
          },
          { role: "user", content: JSON.stringify(stats) },
        ],
      }),
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const text = String(payload?.choices?.[0]?.message?.content || "").trim();
    return text ? text.replace(/\s*[—–]\s*/g, ", ") : null;
  } catch (error) {
    console.error("spoken briefing failed:", error);
    return null;
  }
}

function fallbackBriefing(stats: Stats): string {
  const lines: string[] = [];
  if (stats.followers) {
    const delta = stats.followers.delta1d;
    lines.push(
      `You have ${stats.followers.current.toLocaleString()} followers${
        delta !== null ? ` (${delta >= 0 ? "+" : ""}${delta} in the last day)` : ""
      }.`,
    );
  }
  lines.push(
    `${stats.week.postsPublished} post${stats.week.postsPublished === 1 ? "" : "s"} published this week with ${stats.week.totalEngagement} total engagements.`,
  );
  if (stats.week.bestPost) {
    lines.push(`Best post: "${stats.week.bestPost.text.slice(0, 90)}" (${stats.week.bestPost.engagement.total} engagements).`);
  }
  const scheduled = stats.queue.counts["scheduled"] ?? 0;
  const drafts = stats.queue.counts["draft"] ?? 0;
  const approved = stats.queue.counts["approved"] ?? 0;
  lines.push(`Queue: ${scheduled} scheduled, ${approved} approved, ${drafts} in drafts.`);
  if (stats.automation.killSwitch) {
    lines.push("X automation is currently STOPPED.");
  }
  return lines.join(" ");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
