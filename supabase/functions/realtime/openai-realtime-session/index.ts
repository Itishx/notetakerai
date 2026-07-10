import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    if (req.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sign in required." }, 401);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!anonKey || !supabaseUrl) {
      return json({ error: "Missing Supabase configuration." }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Sign in required." }, 401);
    }

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action || "").trim().toLowerCase();
    const sessionId = String(payload?.sessionId || "").trim();
    const reason = String(payload?.reason || "").trim() || null;

    if (!sessionId) {
      return json({ error: "Missing sessionId." }, 400);
    }

    if (action === "heartbeat") {
      const { data, error } = await authClient
        .from("realtime_voice_sessions")
        .update({
          last_heartbeat_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .is("ended_at", null)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("openai-realtime-session heartbeat error:", error);
        return json({ error: "Could not update live voice heartbeat." }, 500);
      }

      return json({ ok: true, sessionId, active: Boolean(data?.id) });
    }

    if (action === "end") {
      const { data, error } = await authClient
        .from("realtime_voice_sessions")
        .update({
          ended_at: new Date().toISOString(),
          last_heartbeat_at: new Date().toISOString(),
          disconnect_reason: reason,
        })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .is("ended_at", null)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("openai-realtime-session end error:", error);
        return json({ error: "Could not close live voice session." }, 500);
      }

      return json({ ok: true, sessionId, closed: Boolean(data?.id) });
    }

    return json({ error: "Unsupported action." }, 400);
  } catch (error) {
    console.error("openai-realtime-session error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
