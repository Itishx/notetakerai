const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Braino-TTS-Provider, X-Braino-TTS-Error",
};

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY") || "";
const DEFAULT_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") || "vBKc2FfBKJfcZNyEt1n6";
const DEFAULT_MODEL = "eleven_turbo_v2_5";

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, voiceId, modelId } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return json({ error: "text is required" }, 400);
    }

    if (!ELEVENLABS_API_KEY) {
      return json({ error: "ELEVENLABS_API_KEY not configured in Supabase secrets." }, 500, {
        "X-Braino-TTS-Error": "missing_api_key",
      });
    }

    const resolvedVoiceId = String(voiceId || DEFAULT_VOICE_ID).trim();
    const resolvedModel = String(modelId || DEFAULT_MODEL).trim();

    const elResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 2500),
          model_id: resolvedModel,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!elResponse.ok) {
      const errorText = await elResponse.text().catch(() => "");
      console.error("ElevenLabs TTS failed:", elResponse.status, errorText);
      const errorKind = elResponse.status === 401
        ? "invalid_api_key"
        : elResponse.status === 429
        ? "credits_or_rate_limit"
        : elResponse.status >= 500
        ? "provider_unavailable"
        : "provider_error";
      return json(
        { error: `ElevenLabs TTS failed (${elResponse.status}).`, details: errorText },
        elResponse.status,
        { "X-Braino-TTS-Error": errorKind },
      );
    }

    const audioBuffer = await elResponse.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "X-Braino-TTS-Provider": "elevenlabs",
      },
    });
  } catch (error) {
    console.error("ElevenLabs TTS error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500, { "X-Braino-TTS-Error": "server_error" });
  }
});
