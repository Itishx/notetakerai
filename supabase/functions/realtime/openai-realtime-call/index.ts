import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-braino-realtime-model, x-braino-voice-engine, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const ALLOWED_REALTIME_MODELS = new Set([
      "gpt-realtime-2.1",
      "gpt-realtime-2",
      "gpt-realtime-1.5",
      "gpt-realtime",
      "gpt-realtime-mini",
      "gpt-4o-realtime-preview",
    ]);
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

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await req.json().catch(() => null);
      const action = String(payload?.action || "").trim().toLowerCase();
      if (action === "client_secret") {
        const voiceSessionId = await createRealtimeVoiceSession(authClient, user.id);
        const openAiResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Safety-Identifier": await hashSafetyIdentifier(user.id),
          },
          body: JSON.stringify({
            session: buildRealtimeSessionConfig(realtimeModel, realtimeVoice),
          }),
        });

        const raw = await openAiResponse.text();
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch {
          parsed = null;
        }
        if (!openAiResponse.ok) {
          await closeRealtimeVoiceSession(authClient, user.id, voiceSessionId, "openai_error");
          return json(
            {
              error: "Failed to create realtime client secret.",
              details: extractOpenAiError(raw),
            },
            openAiResponse.status,
          );
        }

        const clientSecret = extractRealtimeClientSecret(parsed);
        if (!clientSecret) {
          await closeRealtimeVoiceSession(authClient, user.id, voiceSessionId, "openai_missing_client_secret");
          return json({ error: "OpenAI did not return a realtime client secret." }, 502);
        }

        return json(
          {
            ok: true,
            clientSecret,
            expiresAt: extractClientSecretExpiry(parsed),
            sessionId: voiceSessionId,
            allocatedMs: MAX_REALTIME_SESSION_MS,
            realtimeModel,
            transcriptionModel: "gpt-4o-transcribe",
          },
          200,
          realtimeHeaders(voiceSessionId, realtimeModel),
        );
      }
    }

    const sdp = normalizeRealtimeSdp(await req.text());
    if (!sdp.trim()) {
      return json({ error: "Missing SDP offer." }, 400);
    }
    const sdpDiagnostics = getSdpDiagnostics(sdp);
    if (!sdpDiagnostics.hasVersionLine || !sdpDiagnostics.hasAudioLine) {
      return json(
        {
          error: "Invalid SDP offer.",
          details: "The realtime offer did not include the expected SDP version and audio lines.",
          sdpDiagnostics,
        },
        400,
      );
    }
    console.log("openai-realtime-call received SDP", sdpDiagnostics);

    const voiceSessionId = await createRealtimeVoiceSession(authClient, user.id);
    const multipart = new FormData();
    multipart.set("sdp", new Blob([sdp], { type: "application/sdp" }), "offer.sdp");
    multipart.set("session", JSON.stringify(buildRealtimeSessionConfig(realtimeModel, realtimeVoice)));

    const openAiResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "OpenAI-Safety-Identifier": await hashSafetyIdentifier(user.id),
      },
      body: multipart,
    });

    const answerSdp = await openAiResponse.text();
    if (!openAiResponse.ok) {
      await closeRealtimeVoiceSession(authClient, user.id, voiceSessionId, "openai_error");
      return json(
        {
          error: "Failed to create realtime session.",
          details: extractOpenAiError(answerSdp),
          sdpDiagnostics,
        },
        openAiResponse.status,
      );
    }

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/sdp",
      "X-Braino-Realtime-Session-Id": voiceSessionId,
      "X-Braino-Realtime-Allocated-Ms": String(MAX_REALTIME_SESSION_MS),
      "X-Braino-Realtime-Model": realtimeModel,
      "X-Braino-Realtime-Transcription-Model": "gpt-4o-transcribe",
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

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

async function createRealtimeVoiceSession(supabase: SupabaseClientLike, userId: string) {
  const sessionStartedAt = new Date().toISOString();
  const { data: voiceSession, error: voiceSessionError } = await supabase
    .from("realtime_voice_sessions")
    .insert({
      user_id: userId,
      started_at: sessionStartedAt,
      last_heartbeat_at: sessionStartedAt,
      allocated_ms: MAX_REALTIME_SESSION_MS,
    })
    .select("id")
    .single();

  if (voiceSessionError || !voiceSession?.id) {
    console.error("openai-realtime-call usage insert error:", voiceSessionError);
    throw new Error("Could not start live voice session.");
  }

  return voiceSession.id;
}

function realtimeHeaders(sessionId: string, realtimeModel: string) {
  return {
    "X-Braino-Realtime-Session-Id": sessionId,
    "X-Braino-Realtime-Allocated-Ms": String(MAX_REALTIME_SESSION_MS),
    "X-Braino-Realtime-Model": realtimeModel,
    "X-Braino-Realtime-Transcription-Model": "gpt-4o-transcribe",
  };
}

function buildRealtimeSessionConfig(realtimeModel: string, realtimeVoice: string) {
  return {
    type: "realtime",
    model: realtimeModel,
    output_modalities: ["text"],
    audio: {
      input: {
        noise_reduction: {
          type: "near_field",
        },
        transcription: {
          model: "gpt-4o-transcribe",
          language: "en",
          prompt: [
            "Transcribe the user's direct command to Braino.",
            "Ignore music, fans, coughs, accidental noises, and unrelated background speech.",
            "Keep names, app names, URLs, file names, and code tokens intact.",
            "If the input is not a clear user command, leave it empty.",
          ].join(" "),
        },
        turn_detection: {
          type: "semantic_vad",
          eagerness: "low",
          create_response: false,
          interrupt_response: true,
        },
      },
      output: {
        voice: realtimeVoice,
      },
    },
  };
}

function extractRealtimeClientSecret(payload: Record<string, unknown> | null) {
  const direct = payload?.value;
  if (typeof direct === "string") return direct;
  const camel = payload?.clientSecret;
  if (typeof camel === "string") return camel;
  const nested = payload?.client_secret;
  if (nested && typeof nested === "object") {
    const value = (nested as Record<string, unknown>).value;
    if (typeof value === "string") return value;
  }
  if (typeof nested === "string") return nested;
  return "";
}

function extractClientSecretExpiry(payload: Record<string, unknown> | null) {
  const direct = payload?.expires_at || payload?.expiresAt;
  if (typeof direct === "string" || typeof direct === "number") return direct;
  const nested = payload?.client_secret;
  if (nested && typeof nested === "object") {
    const value = (nested as Record<string, unknown>).expires_at || (nested as Record<string, unknown>).expiresAt;
    if (typeof value === "string" || typeof value === "number") return value;
  }
  return null;
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

function normalizeRealtimeSdp(raw: string) {
  const text = String(raw || "");
  if (!text.trim()) return "";
  const normalized = text.replace(/\r?\n/g, "\r\n");
  return normalized.endsWith("\r\n") ? normalized : `${normalized}\r\n`;
}

function getSdpDiagnostics(sdp: string) {
  return {
    offerChars: sdp.length,
    hasVersionLine: /^v=0\r?$/m.test(sdp),
    mediaLineCount: (sdp.match(/^m=/gm) || []).length,
    hasAudioLine: /^m=audio\s/m.test(sdp),
    hasApplicationLine: /^m=application\s/m.test(sdp),
    endsWithLineBreak: /\r?\n$/.test(sdp),
  };
}

async function hashSafetyIdentifier(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
