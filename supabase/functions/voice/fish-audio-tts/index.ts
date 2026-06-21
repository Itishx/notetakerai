const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "X-Braino-TTS-Provider, X-Braino-TTS-Error, X-Braino-TTS-Fallback",
};

const FISH_AUDIO_API_KEY = Deno.env.get("FISH_AUDIO_API_KEY");
const FISH_AUDIO_MODEL = Deno.env.get("FISH_AUDIO_MODEL") || "s2-pro";
// Braino's voice. Override via FISH_AUDIO_REFERENCE_ID secret; otherwise this default is used.
const FISH_AUDIO_REFERENCE_ID =
  Deno.env.get("FISH_AUDIO_REFERENCE_ID") ||
  Deno.env.get("FISH_AUDIO_VOICE_ID") ||
  "88b183bfbdda44a09ad4474712b967f4";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_TTS_MODEL = Deno.env.get("OPENAI_TTS_MODEL") || "gpt-4o-mini-tts";
const OPENAI_TTS_VOICE = Deno.env.get("OPENAI_TTS_VOICE") || "marin";
const OPENAI_TTS_INSTRUCTIONS =
  Deno.env.get("OPENAI_TTS_INSTRUCTIONS") ||
  "Sound warm, direct, lively, and conversational. Keep the pacing natural and not announcer-like.";
const ENABLE_OPENAI_TTS_FALLBACK = Deno.env.get("ENABLE_OPENAI_TTS_FALLBACK") !== "false";

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

async function openAiTtsResponse(text: string, fallbackReason: string) {
  if (!ENABLE_OPENAI_TTS_FALLBACK || !OPENAI_API_KEY) {
    return null;
  }

  const body: Record<string, unknown> = {
    model: OPENAI_TTS_MODEL,
    input: text.slice(0, 4096),
    voice: OPENAI_TTS_VOICE,
    response_format: "mp3",
  };

  if (!/^tts-1(?:-hd)?$/i.test(OPENAI_TTS_MODEL) && OPENAI_TTS_INSTRUCTIONS) {
    body.instructions = OPENAI_TTS_INSTRUCTIONS;
  }

  const openAiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text().catch(() => "");
    console.error("OpenAI TTS fallback failed:", openAiResponse.status, errorText);
    return json(
      {
        error: `OpenAI TTS fallback failed (${openAiResponse.status}).`,
        details: errorText,
        provider: "openai-tts",
        fallbackReason,
      },
      openAiResponse.status,
      { "X-Braino-TTS-Error": "fallback_failed" },
    );
  }

  // Stream the audio straight through — don't buffer the whole clip server-side.
  // The client starts playing on the first chunk instead of waiting for the full MP3.
  return new Response(openAiResponse.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": openAiResponse.headers.get("Content-Type") || "audio/mpeg",
      "Cache-Control": "no-cache",
      "X-Braino-TTS-Provider": "openai-tts",
      "X-Braino-TTS-Fallback": fallbackReason,
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      text,
      referenceId,
      voiceId,
      // "normal" is Fish's low-latency mode (faster first byte) vs "balanced" (slightly
      // higher quality, more latency). Voice mode wants responsiveness, so default to normal.
      latency = "normal",
      // Keep-warm ping: the client fires this on voice-mode entry / periodically so this edge
      // function's isolate stays hot and the first real reply doesn't pay a cold start.
      warm,
    } = await req.json();

    if (warm === true) {
      return json({ ok: true, warm: true }, 200, { "X-Braino-TTS-Provider": "fish-audio" });
    }

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return json({ error: "text is required" }, 400);
    }

    if (!FISH_AUDIO_API_KEY) {
      const fallback = await openAiTtsResponse(text, "missing_fish_api_key");
      if (fallback) return fallback;
      return json(
        { error: "Fish Audio API key not configured, and OpenAI TTS fallback is unavailable." },
        500,
        { "X-Braino-TTS-Error": "missing_api_key" },
      );
    }

    const resolvedReferenceId = String(referenceId || voiceId || FISH_AUDIO_REFERENCE_ID || "").trim();
    const body: Record<string, unknown> = {
      text: text.slice(0, 2000),
      temperature: 0.7,
      top_p: 0.7,
      prosody: {
        speed: 1,
        volume: 0,
        normalize_loudness: true,
      },
      // Smaller chunks => Fish emits the first audio frames sooner (lower time-to-first-byte),
      // which is what makes streaming playback feel responsive in voice mode.
      chunk_length: 100,
      normalize: true,
      format: "mp3",
      sample_rate: 44100,
      mp3_bitrate: 128,
      latency,
      max_new_tokens: 1024,
      repetition_penalty: 1.2,
      min_chunk_length: 20,
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
      const fallback = await openAiTtsResponse(text, errorKind);
      if (fallback) return fallback;
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

    // Stream Fish's audio straight through — don't await the full arrayBuffer.
    // Bytes flow to the client as Fish generates them, so playback can start on
    // the first chunk instead of after the entire clip + cold start.
    return new Response(fishResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": fishResponse.headers.get("Content-Type") || "audio/mpeg",
        "Cache-Control": "no-cache",
        "X-Braino-TTS-Provider": "fish-audio",
      },
    });
  } catch (error) {
    console.error("Fish Audio TTS error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500, { "X-Braino-TTS-Error": "server_error" });
  }
});
