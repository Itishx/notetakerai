const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Braino-TTS-Provider, X-Braino-TTS-Error",
};

const FISH_AUDIO_API_KEY = Deno.env.get("FISH_AUDIO_API_KEY");
const FISH_AUDIO_MODEL = Deno.env.get("FISH_AUDIO_MODEL") || "s2-pro";
const FISH_AUDIO_REFERENCE_ID =
  Deno.env.get("FISH_AUDIO_REFERENCE_ID") ||
  Deno.env.get("FISH_AUDIO_VOICE_ID") ||
  "";

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

function normalizeFishErrorStatus(status: number) {
  if (status === 402 || status === 429) return "credits_or_rate_limit";
  if (status === 401) return "invalid_api_key";
  if (status >= 500) return "provider_unavailable";
  return "provider_error";
}

async function synthFishAudio(text: string, referenceId = "", latency = "balanced") {
  if (!FISH_AUDIO_API_KEY) {
    return json(
      { error: "Fish Audio API key not configured. Set FISH_AUDIO_API_KEY in Supabase secrets." },
      500,
      { "X-Braino-TTS-Error": "missing_api_key" },
    );
  }

  const resolvedReferenceId = String(referenceId || FISH_AUDIO_REFERENCE_ID || "").trim();
  const body: Record<string, unknown> = {
    text: text.slice(0, 2000),
    temperature: 0.7,
    top_p: 0.7,
    prosody: {
      speed: 1,
      volume: 0,
      normalize_loudness: true,
    },
    chunk_length: 200,
    normalize: true,
    format: "mp3",
    sample_rate: 44100,
    mp3_bitrate: 128,
    latency,
    max_new_tokens: 1024,
    repetition_penalty: 1.2,
    min_chunk_length: 50,
    condition_on_previous_chunks: true,
    early_stop_threshold: 1,
  };

  if (resolvedReferenceId) {
    body.reference_id = resolvedReferenceId;
  }

  const fishResponse = await fetch("https://api.fish.audio/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
      "Content-Type": "application/json",
      model: FISH_AUDIO_MODEL,
    },
    body: JSON.stringify(body),
  });

  if (!fishResponse.ok) {
    const errorText = await fishResponse.text().catch(() => "");
    const errorKind = normalizeFishErrorStatus(fishResponse.status);
    console.error("Fish Audio TTS failed:", fishResponse.status, errorText);
    return json(
      {
        error: errorKind === "credits_or_rate_limit"
          ? "Fish Audio credits or rate limit exhausted."
          : `Fish Audio TTS failed (${fishResponse.status}).`,
        details: errorText,
        provider: "fish-audio",
      },
      fishResponse.status,
      { "X-Braino-TTS-Error": errorKind },
    );
  }

  const audioBuffer = await fishResponse.arrayBuffer();
  return new Response(audioBuffer, {
    headers: {
      ...corsHeaders,
      "Content-Type": fishResponse.headers.get("Content-Type") || "audio/mpeg",
      "Cache-Control": "no-cache",
      "X-Braino-TTS-Provider": "fish-audio",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, referenceId, voiceId, latency } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return json({ error: "text is required" }, 400);
    }

    return await synthFishAudio(text, referenceId || voiceId || "", latency || "balanced");
  } catch (error) {
    console.error("Fish Audio compatibility TTS error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500, { "X-Braino-TTS-Error": "server_error" });
  }
});
