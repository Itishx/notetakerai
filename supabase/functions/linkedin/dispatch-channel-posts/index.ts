// dispatch-channel-posts — the generic one minute dispatcher for the channel
// spine. Today it drains LinkedIn; Reddit and Instagram hang off the same loop.
//
// Two things the X dispatcher taught us, carried over deliberately:
//   - Claim the row before publishing, so two overlapping cron ticks cannot
//     double post.
//   - verify() is not optional. Nothing is marked published until the provider
//     has handed back an id. Claiming to have posted is not posting.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { publishPost } from "../../_shared/linkedin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: due } = await supabase
      .from("channel_queue_items")
      .select("id,user_id,channel,text,kind")
      .eq("status", "scheduled")
      .eq("kind", "post")
      .lte("scheduled_publish_at", new Date().toISOString())
      .limit(20);

    if (!due?.length) return json({ published: 0, message: "Nothing due." });

    const results: unknown[] = [];
    for (const item of due) {
      // Atomic claim. The status filter is the lock: a second tick that gets
      // here first flips the row and this update matches nothing.
      const { data: claimed } = await supabase
        .from("channel_queue_items")
        .update({ status: "publishing" })
        .eq("id", item.id).eq("status", "scheduled")
        .select("id").maybeSingle();
      if (!claimed) continue;

      try {
        const { data: conn } = await supabase
          .from("channel_connections")
          .select("access_token,external_id,token_expires_at")
          .eq("user_id", item.user_id).eq("channel", item.channel).maybeSingle();

        if (!conn?.access_token || !conn.external_id) throw new Error("Account is not connected.");
        if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
          throw new Error("LinkedIn access token has expired. Reconnect the account.");
        }
        // Publishing is blocked at the settings level too, not only in the UI.
        const { data: settings } = await supabase
          .from("channel_settings").select("kill_switch")
          .eq("user_id", item.user_id).eq("channel", item.channel).maybeSingle();
        if (settings?.kill_switch) throw new Error("Kill switch is on.");

        const published = await publishPost({
          accessToken: conn.access_token,
          memberId: conn.external_id,
          text: item.text,
        });
        if (!published.id) throw new Error("LinkedIn accepted the post but returned no id, so it cannot be verified.");

        await supabase.from("channel_queue_items").update({
          status: "published",
          published_at: new Date().toISOString(),
          external_post_id: published.id,
          permalink: published.permalink,
          error: null,
        }).eq("id", item.id);

        await supabase.from("channel_action_log").insert({
          user_id: item.user_id, channel: item.channel, agent: "publisher",
          action: "published", target: item.text.slice(0, 120),
          reason: `Verified live, id ${published.id}.`, result: "success",
        });
        results.push({ id: item.id, ok: true });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Publish failed.";
        await supabase.from("channel_queue_items")
          .update({ status: "failed", error: message }).eq("id", item.id);
        await supabase.from("channel_action_log").insert({
          user_id: item.user_id, channel: item.channel, agent: "publisher",
          action: "publish_failed", target: item.text.slice(0, 120),
          reason: message, result: "failed",
        });
        results.push({ id: item.id, ok: false, error: message });
      }
    }

    return json({ published: results.filter((r) => (r as { ok: boolean }).ok).length, results });
  } catch (e) {
    console.error("dispatch-channel-posts:", e);
    return json({ error: e instanceof Error ? e.message : "Dispatch failed." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
