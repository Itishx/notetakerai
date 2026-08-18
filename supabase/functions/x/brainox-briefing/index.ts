// BrainoX analytics briefing (BrainoX.md sections 49-52, 122, 124-125).
// Thin handler. Every number and the spoken narration come from
// _shared/x-briefing.ts, which the voice path (x-status) now reads too, so the
// two surfaces cannot drift apart.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";
import { buildXStats, composeSpokenBriefing, fallbackBriefing } from "../../_shared/x-briefing.ts";

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

    const stats = await buildXStats(supabase, user.id);
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
