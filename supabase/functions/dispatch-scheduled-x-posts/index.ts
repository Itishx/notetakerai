import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Refresh failed: ${await res.text()}`);
  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("X_CLIENT_ID")!;
    const clientSecret = Deno.env.get("X_CLIENT_SECRET")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: due, error: dueErr } = await supabase
      .from("scheduled_x_posts")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(25);
    if (dueErr) throw dueErr;

    const results: Array<{ id: string; status: string; error?: string; tweet_id?: string }> = [];

    for (const post of due ?? []) {
      try {
        const { data: conn } = await supabase
          .from("x_connections")
          .select("*")
          .eq("user_identifier", post.user_id)
          .maybeSingle();

        if (!conn) throw new Error("No X connection for user");

        let accessToken: string = conn.access_token;
        const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
        if (expiresAt - Date.now() < 60_000 && conn.refresh_token) {
          const t = await refreshAccessToken(conn.refresh_token, clientId, clientSecret);
          accessToken = t.access_token;
          await supabase.from("x_connections").update({
            access_token: t.access_token,
            refresh_token: t.refresh_token ?? conn.refresh_token,
            token_expires_at: new Date(Date.now() + (t.expires_in ?? 7200) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("user_identifier", post.user_id);
        }

        const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: post.text }),
        });

        if (!tweetRes.ok) throw new Error(`Tweet failed: ${await tweetRes.text()}`);
        const tweet = await tweetRes.json();
        const tweetId = tweet?.data?.id ?? null;

        await supabase.from("scheduled_x_posts").update({
          status: "posted",
          posted_tweet_id: tweetId,
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);

        results.push({ id: post.id, status: "posted", tweet_id: tweetId });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        await supabase.from("scheduled_x_posts").update({
          status: "failed", error: msg, updated_at: new Date().toISOString(),
        }).eq("id", post.id);
        results.push({ id: post.id, status: "failed", error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dispatch-scheduled-x-posts error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
