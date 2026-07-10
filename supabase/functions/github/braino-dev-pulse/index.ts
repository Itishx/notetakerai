// Thin HTTP wrapper around the dev-pulse loader. Braino reads his dev-sense in-process via
// _shared/dev-pulse.ts (no HTTP hop), but this endpoint lets you curl/verify it independently and
// gives any future client a way to ask for the pulse directly. All the logic lives in the shared
// module; this just authenticates and returns the formatted block + structured payload.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { loadDevPulseForRequest } from "../../_shared/dev-pulse.ts";

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
    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const withDiffs = body?.withDiffs === true;
    const clientTimeZone = typeof body?.clientTimeZone === "string" ? body.clientTimeZone : null;

    const result = await loadDevPulseForRequest(authHeader, { withDiffs, clientTimeZone });
    if (!result) {
      return json({ error: "Dev pulse unavailable (sign in, or integration not configured)." }, 401);
    }

    return json({ formatted: result.formatted, pulse: result.pulse });
  } catch (error) {
    console.error("braino-dev-pulse error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
