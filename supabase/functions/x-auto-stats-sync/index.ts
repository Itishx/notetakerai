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
  const bearerToken = Deno.env.get("X_BEARER_TOKEN");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase config" }, 500);
  }
  if (!bearerToken) {
    return json({ error: "Missing X_BEARER_TOKEN" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch posted tweets from the last 7 days that have an x_post_id
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: posts, error: postsError } = await supabase
    .from("scheduled_x_posts")
    .select("id, user_id, x_post_id")
    .eq("status", "posted")
    .not("x_post_id", "is", null)
    .gte("posted_at", sevenDaysAgo)
    .order("posted_at", { ascending: false })
    .limit(100);

  if (postsError) {
    console.error("Failed to fetch posts:", postsError);
    return json({ error: postsError.message }, 500);
  }

  if (!posts?.length) {
    return json({ message: "No recent posted tweets to sync.", synced: 0 });
  }

  // Batch requests: X API allows up to 100 IDs per request
  const BATCH_SIZE = 100;
  let totalSynced = 0;

  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    const tweetIds = batch.map((p) => p.x_post_id).join(",");
    const postsByTweetId = Object.fromEntries(batch.map((p) => [p.x_post_id, p]));

    try {
      const url = `https://api.x.com/2/tweets?ids=${tweetIds}&tweet.fields=public_metrics`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${bearerToken}` },
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`Stats fetch failed for batch:`, err);
        continue;
      }

      const payload = await res.json();
      const tweets: Array<{
        id: string;
        public_metrics: {
          like_count: number;
          retweet_count: number;
          reply_count: number;
          quote_count: number;
          bookmark_count: number;
        };
      }> = payload?.data ?? [];

      if (!tweets.length) continue;

      const upserts = tweets.map((tweet) => ({
        tweet_id: tweet.id,
        user_id: postsByTweetId[tweet.id]?.user_id,
        like_count: tweet.public_metrics?.like_count ?? 0,
        retweet_count: tweet.public_metrics?.retweet_count ?? 0,
        reply_count: tweet.public_metrics?.reply_count ?? 0,
        quote_count: tweet.public_metrics?.quote_count ?? 0,
        bookmark_count: tweet.public_metrics?.bookmark_count ?? 0,
        fetched_at: new Date().toISOString(),
      })).filter((u) => u.user_id); // skip if user_id missing

      if (upserts.length) {
        const { error: upsertError } = await supabase
          .from("x_post_analytics")
          .upsert(upserts, { onConflict: "tweet_id" });

        if (upsertError) {
          console.error("Upsert error:", upsertError);
        } else {
          totalSynced += upserts.length;
        }
      }
    } catch (err) {
      console.error("Batch stats error:", err);
    }
  }

  return json({ message: "Stats sync complete.", synced: totalSynced });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
