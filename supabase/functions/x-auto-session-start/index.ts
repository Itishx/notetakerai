import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  fetchAccountSnapshot,
  fetchLatestMentionId,
  getAuthorizedXContext,
  markXAutomationSessionStarted,
  SESSION_DURATION_MS,
} from "../_shared/x-auto-sessions.ts";
import { requireSupabaseServiceConfig } from "../_shared/x-dispatch.ts";

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

    if (activeSession) {
      return json(
        {
          error: `Session ${activeSession.session_number} is already active.`,
          activeSession,
          nextAllowedAt: activeSession.cooldown_ends_at,
        },
        409,
      );
    }

    const { data: latestSession, error: latestError } = await supabase
      .from("x_auto_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) throw latestError;

    const nextAllowedAt = latestSession?.cooldown_ends_at
      ? new Date(latestSession.cooldown_ends_at).getTime()
      : 0;

    if (nextAllowedAt && nextAllowedAt > Date.now()) {
      return json(
        {
          error: "You can only start one X Auto session every 3 hours.",
          nextAllowedAt: latestSession.cooldown_ends_at,
          latestSession,
        },
        409,
      );
    }

    const xContext = await getAuthorizedXContext(supabase, user.id);
    const [snapshot, mentionWatermarkId] = await Promise.all([
      fetchAccountSnapshot(xContext.accessToken, xContext.xUserId),
      fetchLatestMentionId(xContext.accessToken, xContext.xUserId),
    ]);

    const startedAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    const sessionNumber = Number(latestSession?.session_number ?? 0) + 1;

    const { data: session, error: insertError } = await supabase
      .from("x_auto_sessions")
      .insert({
        user_id: user.id,
        session_number: sessionNumber,
        status: "active",
        started_at: startedAt,
        ends_at: endsAt,
        cooldown_ends_at: endsAt,
        last_polled_at: startedAt,
        mention_watermark_id: mentionWatermarkId,
        start_followers_count: snapshot.followersCount,
        current_followers_count: snapshot.followersCount,
        followers_gained: 0,
        start_replies_received: snapshot.repliesReceived,
        current_replies_received: snapshot.repliesReceived,
        replies_received: 0,
        start_total_views: snapshot.totalViews,
        current_total_views: snapshot.totalViews,
        total_views: 0,
        replies_posted: 0,
        replies_failed: 0,
        replies_queued: 0,
      })
      .select("*")
      .single();

    if (insertError) throw insertError;

    await supabase
      .from("x_auto_persona")
      .update({
        x_user_id: xContext.xUserId,
        last_mention_id: mentionWatermarkId,
      })
      .eq("user_id", user.id);

    await markXAutomationSessionStarted(supabase, user.id, startedAt);

    return json({
      message: `Session ${sessionNumber} started.`,
      session,
    });
  } catch (error) {
    console.error("x-auto-session-start error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
