import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  fetchAccountSnapshot,
  getAuthorizedXContext,
} from "../_shared/x-auto-sessions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cron-triggered daily sweep: records one follower-count snapshot per connected X
// account so the Delegate router can speak a real "gained +N in the last 7 days".
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
  const today = new Date().toISOString().slice(0, 10);

  const { data: connections, error } = await supabase
    .from("x_connections")
    .select("user_identifier")
    .not("access_token", "is", null);

  if (error) {
    console.error("x-follower-snapshot: failed to list connections", error);
    return json({ error: error.message }, 500);
  }

  let recorded = 0;
  const results: Array<{ user_id: string; followers?: number; error?: string }> = [];

  for (const conn of connections ?? []) {
    const userId = conn.user_identifier as string;
    try {
      const ctx = await getAuthorizedXContext(supabase, userId);
      const snapshot = await fetchAccountSnapshot(ctx.accessToken, ctx.xUserId);
      const { error: upsertError } = await supabase
        .from("x_follower_snapshots")
        .upsert(
          { user_id: userId, captured_on: today, followers_count: snapshot.followersCount },
          { onConflict: "user_id,captured_on" },
        );
      if (upsertError) throw upsertError;
      recorded += 1;
      results.push({ user_id: userId, followers: snapshot.followersCount });
    } catch (e) {
      results.push({ user_id: userId, error: (e as Error)?.message || "snapshot failed" });
    }
  }

  return json({ message: "Follower snapshot sweep complete.", date: today, recorded, results });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
