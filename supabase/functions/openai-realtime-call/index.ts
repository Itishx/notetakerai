import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DAILY_REALTIME_LIMIT_MS = 7 * 60 * 1000;
const HEARTBEAT_GRACE_MS = 45 * 1000;
type SupabaseClientLike = ReturnType<typeof createClient>;

type RealtimeVoiceSessionRow = {
  allocated_ms: number | null;
  ended_at: string | null;
  last_heartbeat_at: string | null;
  started_at: string;
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
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const realtimeModel = Deno.env.get("OPENAI_REALTIME_MODEL") || "gpt-realtime-2";
    const realtimeVoice = Deno.env.get("OPENAI_REALTIME_VOICE") || "marin";

    if (!anonKey || !supabaseUrl) {
      return json({ error: "Missing Supabase configuration." }, 500);
    }
    if (!openAiApiKey) {
      return json({ error: "Missing OpenAI configuration." }, 500);
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

    const sdp = await req.text();
    if (!sdp.trim()) {
      return json({ error: "Missing SDP offer." }, 400);
    }

    const now = new Date();
    const usageRows = await loadRecentRealtimeVoiceSessions(authClient, user.id, now);
    const { usedMs, remainingMs, resetAt } = summarizeRealtimeVoiceUsage(usageRows, now);

    if (remainingMs <= 0) {
      return json(
        {
          error: "Daily live voice limit reached.",
          details: `You've already used ${formatDurationMs(usedMs)} of ${formatDurationMs(DAILY_REALTIME_LIMIT_MS)} today. Live voice unlocks again after ${resetAt.toISOString()}.`,
          usedMs,
          limitMs: DAILY_REALTIME_LIMIT_MS,
          remainingMs: 0,
          resetAt: resetAt.toISOString(),
        },
        429,
      );
    }

    const sessionStartedAt = new Date().toISOString();
    const { data: voiceSession, error: voiceSessionError } = await authClient
      .from("realtime_voice_sessions")
      .insert({
        user_id: user.id,
        started_at: sessionStartedAt,
        last_heartbeat_at: sessionStartedAt,
        allocated_ms: remainingMs,
      })
      .select("id")
      .single();

    if (voiceSessionError || !voiceSession?.id) {
      console.error("openai-realtime-call usage insert error:", voiceSessionError);
      return json({ error: "Could not start live voice session." }, 500);
    }

    const formData = new FormData();
    formData.set("sdp", sdp);
    formData.set(
      "session",
      JSON.stringify({
        type: "realtime",
        model: realtimeModel,
        output_modalities: ["text"],
        audio: {
          input: {
            turn_detection: {
              type: "semantic_vad",
              create_response: false,
              interrupt_response: true,
            },
          },
          output: {
            voice: realtimeVoice,
          },
        },
      }),
    );

    const openAiResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "OpenAI-Safety-Identifier": await hashSafetyIdentifier(user.id),
      },
      body: formData,
    });

    const answerSdp = await openAiResponse.text();
    if (!openAiResponse.ok) {
      await closeRealtimeVoiceSession(authClient, user.id, voiceSession.id, "openai_error");
      return json(
        {
          error: "Failed to create realtime session.",
          details: extractOpenAiError(answerSdp),
        },
        openAiResponse.status,
      );
    }

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/sdp",
      "X-Braino-Realtime-Session-Id": voiceSession.id,
      "X-Braino-Realtime-Allocated-Ms": String(remainingMs),
      "X-Braino-Realtime-Limit-Ms": String(DAILY_REALTIME_LIMIT_MS),
      "X-Braino-Realtime-Used-Ms": String(usedMs),
      "X-Braino-Realtime-Reset-At": resetAt.toISOString(),
    };

    const locationHeader = openAiResponse.headers.get("Location");
    if (locationHeader) {
      responseHeaders.Location = locationHeader;
    }

    return new Response(answerSdp, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("openai-realtime-call error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function loadRecentRealtimeVoiceSessions(supabase: SupabaseClientLike, userId: string, now: Date) {
  const { dayStart } = getUtcDayWindow(now);
  const queryStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("realtime_voice_sessions")
    .select("started_at,last_heartbeat_at,ended_at,allocated_ms")
    .eq("user_id", userId)
    .gte("started_at", queryStart)
    .order("started_at", { ascending: false });

  if (error) {
    console.error("openai-realtime-call usage load error:", error);
    throw new Error("Could not check live voice usage.");
  }

  return Array.isArray(data) ? (data as RealtimeVoiceSessionRow[]) : [];
}

function summarizeRealtimeVoiceUsage(rows: RealtimeVoiceSessionRow[], now: Date) {
  const { dayStart, dayEnd } = getUtcDayWindow(now);
  const nowMs = now.getTime();
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  const usedMs = rows.reduce((total, row) => {
    return total + calculateRealtimeVoiceUsageMs(row, nowMs, dayStartMs, dayEndMs);
  }, 0);

  return {
    usedMs,
    remainingMs: Math.max(0, DAILY_REALTIME_LIMIT_MS - usedMs),
    resetAt: dayEnd,
  };
}

function calculateRealtimeVoiceUsageMs(
  row: RealtimeVoiceSessionRow,
  nowMs: number,
  dayStartMs: number,
  dayEndMs: number,
) {
  const startedAtMs = Date.parse(row.started_at);
  if (!Number.isFinite(startedAtMs)) return 0;

  const allocatedMs = Math.max(0, Number(row.allocated_ms) || 0);
  if (allocatedMs <= 0) return 0;

  const allocationEndMs = startedAtMs + allocatedMs;
  const heartbeatBaseMs = Date.parse(row.last_heartbeat_at || row.started_at);
  const heartbeatEndMs = (Number.isFinite(heartbeatBaseMs) ? heartbeatBaseMs : startedAtMs) + HEARTBEAT_GRACE_MS;
  const explicitEndMs = row.ended_at ? Date.parse(row.ended_at) : Number.POSITIVE_INFINITY;
  const activeCutoffMs = row.ended_at
    ? explicitEndMs
    : Math.min(nowMs, heartbeatEndMs, allocationEndMs);

  const effectiveEndMs = Math.min(explicitEndMs, activeCutoffMs, allocationEndMs, dayEndMs);
  const effectiveStartMs = Math.max(startedAtMs, dayStartMs);

  if (!Number.isFinite(effectiveEndMs) || effectiveEndMs <= effectiveStartMs) {
    return 0;
  }

  return effectiveEndMs - effectiveStartMs;
}

function getUtcDayWindow(now: Date) {
  const dayStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
}

function formatDurationMs(value: number) {
  const totalSeconds = Math.max(0, Math.floor((Number(value) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function closeRealtimeVoiceSession(
  supabase: SupabaseClientLike,
  userId: string,
  sessionId: string,
  reason: string,
) {
  try {
    await supabase
      .from("realtime_voice_sessions")
      .update({
        ended_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
        disconnect_reason: reason,
      })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .is("ended_at", null);
  } catch (error) {
    console.error("openai-realtime-call usage close error:", error);
  }
}

function extractOpenAiError(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.message || raw;
  } catch {
    return raw;
  }
}

async function hashSafetyIdentifier(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
