import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  finalizeSession,
  getAuthorizedXContext,
} from "../../_shared/x-auto-sessions.ts";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";

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
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Sign in required." }, 401);
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anonKey) {
      return json({ error: "Missing Supabase anon key." }, 500);
    }

    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
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

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: activeSession, error: activeError } = await supabase
      .from("x_auto_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeError) throw activeError;
    if (!activeSession) {
      return json({ error: "No active X Auto session found." }, 404);
    }

    let xContext = null;
    try {
      xContext = await getAuthorizedXContext(supabase, user.id);
    } catch (error) {
      console.warn("Stopping X Auto session without a fresh X metrics snapshot:", error);
    }

    const session = await finalizeSession({
      supabase,
      session: activeSession,
      status: "stopped",
      xContext,
      stoppedAt: new Date().toISOString(),
    });

    return json({
      message: `Session ${session.session_number} stopped.`,
      session,
    });
  } catch (error) {
    console.error("x-auto-session-stop error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
