// engine-runs — read the reasoning log.
//
// The writes come from the engines themselves through _shared/engine-log.ts and
// land in a table with RLS on and no policies, so nothing can read it except a
// service-role client. That is the point: the demo endpoints are public, and
// whatever strangers type into them is not something anon should be able to
// mine back out. Reading is gated on being the creator, exactly like
// waitlist-list, so this needs a real logged-in session.
//
// GET  ?engine=&limit=&failed=   list rows, newest first
// GET  ?stats=1                  totals per engine: runs, tokens, failures

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ADMIN_EMAIL = "itishpande21@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function isCreator(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error } = await userClient.auth.getUser();
  return !error && user?.email === ADMIN_EMAIL;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!await isCreator(req)) return json({ error: "forbidden" }, 403);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);

    // Totals, so the cost of a tuning session is a number and not a feeling.
    if (url.searchParams.get("stats")) {
      const { data, error } = await admin
        .from("engine_runs")
        .select("engine, total_tokens, ok, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;

      const rows = data || [];
      const dayAgo = Date.now() - 86400000;
      const byEngine: Record<string, { runs: number; tokens: number; failed: number; today: number }> = {};
      for (const row of rows) {
        const key = row.engine || "unknown";
        const bucket = byEngine[key] || (byEngine[key] = { runs: 0, tokens: 0, failed: 0, today: 0 });
        bucket.runs += 1;
        bucket.tokens += row.total_tokens || 0;
        if (row.ok === false) bucket.failed += 1;
        if (new Date(row.created_at).getTime() > dayAgo) bucket.today += 1;
      }
      return json({
        byEngine,
        total: {
          runs: rows.length,
          tokens: rows.reduce((sum, r) => sum + (r.total_tokens || 0), 0),
          failed: rows.filter((r) => r.ok === false).length,
        },
        sampled: rows.length,
      });
    }

    const engine = url.searchParams.get("engine");
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
    let query = admin
      .from("engine_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (engine && engine !== "all") query = query.eq("engine", engine);
    if (url.searchParams.get("failed")) query = query.eq("ok", false);

    const { data, error } = await query;
    if (error) throw error;
    return json({ rows: data || [] });
  } catch (error) {
    console.error("engine-runs error:", error);
    return json({ error: "server_error", detail: String(error) }, 500);
  }
});
