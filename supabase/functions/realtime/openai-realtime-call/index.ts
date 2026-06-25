import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers":
    "X-Braino-Realtime-Session-Id, X-Braino-Realtime-Allocated-Ms, X-Braino-Realtime-Model, X-Braino-Realtime-Transcription-Model",
};

const MAX_REALTIME_SESSION_MS = 24 * 60 * 60 * 1000;
type SupabaseClientLike = ReturnType<typeof createClient>;

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
    // Per-mode model: the extension sends X-Braino-Realtime-Model (OpenAI-voice mode = full
    // "gpt-realtime"; Default Braino = "gpt-realtime-mini"). Validated against an allowlist so a
    // client can't request an arbitrary model; falls back to the env default.
    const ALLOWED_REALTIME_MODELS = new Set(["gpt-realtime-2", "gpt-realtime-1.5", "gpt-realtime", "gpt-realtime-mini", "gpt-4o-realtime-preview"]);
    const envModel = Deno.env.get("OPENAI_REALTIME_MODEL") || "gpt-realtime-mini";
    const requestedModel = req.headers.get("X-Braino-Realtime-Model") || "";
    const realtimeModel = ALLOWED_REALTIME_MODELS.has(requestedModel) ? requestedModel : envModel;
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

    const sessionStartedAt = new Date().toISOString();
    const { data: voiceSession, error: voiceSessionError } = await authClient
      .from("realtime_voice_sessions")
      .insert({
        user_id: user.id,
        started_at: sessionStartedAt,
        last_heartbeat_at: sessionStartedAt,
        allocated_ms: MAX_REALTIME_SESSION_MS,
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
      "X-Braino-Realtime-Allocated-Ms": String(MAX_REALTIME_SESSION_MS),
      "X-Braino-Realtime-Model": realtimeModel,
      "X-Braino-Realtime-Transcription-Model": "gpt-4o-mini-transcribe",
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
