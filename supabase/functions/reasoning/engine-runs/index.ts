// engine-runs — read the reasoning log.
//
// The writes come from the engines themselves through _shared/engine-log.ts and
// land in a table with RLS on and no policies, so the table itself still cannot
// be read with the anon key. This function is the only door, and it is currently
// OPEN: no login, because signing in against localhost was blocking the tuning
// work this log exists to serve.
//
// What that means, plainly: the engines that write this log are public demos, so
// these rows include what other people typed into them. Anyone who finds this URL
// can read them. Re-gating is the isCreator check below plus verify_jwt in
// config.toml, and it is a two line change when the site stops being pre-launch.
//
// GET  ?engine=&limit=&failed=&rating=   list rows, newest first
// GET  ?stats=1                          totals per engine: runs, tokens, failures, ratings
// POST {id, rating, note}                judge one run: 'good' | 'bad' | null

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Judging a run. The rating is the point of the whole log: it turns a
    // record into a worklist of things to fix.
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const id = typeof body?.id === "string" ? body.id : "";
      if (!id) return json({ error: "missing id" }, 400);

      const rating = body?.rating === "good" || body?.rating === "bad" ? body.rating : null;
      const note = typeof body?.note === "string" ? body.note.slice(0, 2000) : null;
      const { error } = await admin
        .from("engine_runs")
        .update({ rating, note, rated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return json({ ok: true, id, rating, note });
    }

    const url = new URL(req.url);

    // Totals, so the cost of a tuning session is a number and not a feeling.
    if (url.searchParams.get("stats")) {
      const { data, error } = await admin
        .from("engine_runs")
        .select("engine, total_tokens, cached_tokens, ok, created_at, rating")
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
          good: rows.filter((r) => r.rating === "good").length,
          bad: rows.filter((r) => r.rating === "bad").length,
          unjudged: rows.filter((r) => !r.rating).length,
          // Billed at the cheap repeat rate because the instruction manual
          // leading every request was already seen. Worth showing: it is most
          // of the loop's bill, and it is invisible unless counted.
          cached: rows.reduce((sum, r) => sum + (r.cached_tokens || 0), 0),
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
    // "bad" is the tuning worklist; "unjudged" is what still needs a verdict.
    const rating = url.searchParams.get("rating");
    if (rating === "good" || rating === "bad") query = query.eq("rating", rating);
    else if (rating === "unjudged") query = query.is("rating", null);

    const { data, error } = await query;
    if (error) throw error;
    return json({ rows: data || [] });
  } catch (error) {
    console.error("engine-runs error:", error);
    return json({ error: "server_error", detail: String(error) }, 500);
  }
});
