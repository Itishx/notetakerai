import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  formatRealtimeCostSummaryForBraino,
  loadRealtimeCostSummaryForRequest,
} from "../../_shared/realtime-cost-summary.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const requestedUserId = String(body?.userId || url.searchParams.get("userId") || "").trim() || null;
    const clientTimeZone = String(body?.clientTimeZone || url.searchParams.get("clientTimeZone") || "").trim() || null;
    const offsetRaw = body?.clientUtcOffsetMinutes ?? url.searchParams.get("clientUtcOffsetMinutes");
    const clientUtcOffsetMinutes = Number.isFinite(Number(offsetRaw)) ? Number(offsetRaw) : null;

    const result = await loadRealtimeCostSummaryForRequest(authHeader, {
      requestedUserId,
      clientTimeZone,
      clientUtcOffsetMinutes,
    });

    if (!result) {
      return json({ error: "Sign in required." }, 401);
    }

    return json({
      ok: true,
      user: result.user,
      summary: result.summary,
      brainoReply: formatRealtimeCostSummaryForBraino(result.summary),
    });
  } catch (error) {
    console.error("realtime-cost-summary error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
