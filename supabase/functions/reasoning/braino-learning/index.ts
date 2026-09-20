// braino-learning — what he has worked out, and what it cost him to learn it.
//
// Three tables hold everything Braino has learned and none of them can be read
// from a browser: braino_procedures, braino_lessons and braino_interactions all
// have RLS on and no policies, because hil-loop is a public endpoint and a
// public endpoint must never be able to write into something every other
// user's Braino reads from. So this is the door, the same shape engine-runs
// uses: service role here, nothing but a read on the other side.
//
// It is currently OPEN, like engine-runs, because the site is pre-launch and
// this exists to be watched while the loop is being tuned. Re-gating is a
// verify_jwt line in config.toml and a check on the caller, the same two line
// change engine-runs is waiting on.
//
// What it does NOT return: the goal text of a route belongs to whoever typed
// it, so a command is returned only in the shape it was learned as, truncated,
// and the private ones are dropped entirely.
//
// GET ?limit=   routes, lessons, history and the counts that summarise them

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/* Anything that reads as somebody's private business never leaves the table,
   whatever else is true about it. The same list the engine log scrubs by. */
const PRIVATE = /\b(porn|nude|nsfw|sex|escort|viagra|therapy|therapist|depress|suicide|salary|bank\s*account|password|aadhaar|passport)\b/i;

function tidyGoal(goal: unknown): string {
  const text = String(goal || "").replace(/\s+/g, " ").trim();
  if (!text || PRIVATE.test(text)) return "";
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

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
    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit")) || 60));

    /* Three reads in parallel: they are independent and the page shows them
       together, so making them wait for each other buys nothing. A table that
       has not been created yet comes back as an error rather than as nothing,
       and the page should still draw, so each one falls back to empty. */
    const [routes, lessons, history] = await Promise.all([
      admin
        .from("braino_procedures")
        .select("id, goal, route, steps, hits, misses, status, scope, created_at, last_seen_at")
        .order("last_seen_at", { ascending: false })
        .limit(limit)
        .then((r) => r.data || []),
      admin
        .from("braino_lessons")
        .select("id, lesson, scope, hits, status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
        .then((r) => r.data || []),
      admin
        .from("braino_interactions")
        .select("id, user_text, route, surface, kind, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
        .then((r) => r.data || []),
    ]);

    /* Where a route applies is `scope`, not `route`: route is the step list
       itself, one line per action in his own words, which is the thing worth
       showing and was very nearly shown as a hostname. */
    const shapedRoutes = (routes as Record<string, unknown>[])
      .map((row) => {
        const goal = tidyGoal(row.goal);
        if (!goal) return null;
        const scope = String(row.scope || "").trim();
        const steps = String(row.route || "")
          .split(/\n+/)
          .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 16);
        return {
          id: String(row.id),
          goal,
          /* A host, a tool or a Mac app, said the way a person would. */
          where: scope.replace(/^tool:/, "").replace(/^app:/, "").replace(/^www\./, ""),
          kind: scope.startsWith("tool:") ? "tool" : scope.startsWith("app:") ? "app" : "site",
          steps,
          stepCount: Number(row.steps) || steps.length,
          hits: Number(row.hits) || 0,
          misses: Number(row.misses) || 0,
          status: String(row.status || "proposed"),
          learnedAt: row.created_at,
          lastSeenAt: row.last_seen_at,
        };
      })
      .filter(Boolean);

    const shapedLessons = (lessons as Record<string, unknown>[])
      .map((row) => {
        const text = tidyGoal(row.lesson);
        if (!text) return null;
        return {
          id: String(row.id),
          lesson: text,
          hits: Number(row.hits) || 0,
          status: String(row.status || "proposed"),
          learnedAt: row.created_at,
        };
      })
      .filter(Boolean);

    const shapedHistory = (history as Record<string, unknown>[])
      .map((row) => {
        const text = tidyGoal(row.user_text);
        if (!text) return null;
        return {
          id: String(row.id),
          command: text,
          route: String(row.route || ""),
          surface: String(row.surface || ""),
          kind: String(row.kind || ""),
          at: row.created_at,
        };
      })
      .filter(Boolean);

    const live = shapedRoutes.filter((r) => r && (r as { status: string }).status === "live");
    const stepsLearned = live.reduce((total, r) => total + ((r as { stepCount: number }).stepCount || 0), 0);

    return json({
      ok: true,
      counts: {
        routes: shapedRoutes.length,
        live: live.length,
        proposed: shapedRoutes.length - live.length,
        lessons: shapedLessons.length,
        history: shapedHistory.length,
        /* What a live route saves the next run: the turns it no longer has to
           spend working out where the thing lives. */
        stepsLearned,
      },
      routes: shapedRoutes,
      lessons: shapedLessons,
      history: shapedHistory,
    });
  } catch (error) {
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});
