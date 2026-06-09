import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PriceCard = {
  textInput: number;
  textCachedInput: number;
  textOutput: number;
  audioInput: number;
  audioCachedInput: number;
  audioOutput: number;
};

const REALTIME_PRICES: Record<string, PriceCard> = {
  "gpt-realtime-2": {
    textInput: 4,
    textCachedInput: 0.4,
    textOutput: 24,
    audioInput: 32,
    audioCachedInput: 0.4,
    audioOutput: 64,
  },
  "gpt-realtime": {
    textInput: 4,
    textCachedInput: 0.4,
    textOutput: 16,
    audioInput: 32,
    audioCachedInput: 0.4,
    audioOutput: 64,
  },
  "gpt-realtime-1.5": {
    textInput: 4,
    textCachedInput: 0.4,
    textOutput: 16,
    audioInput: 32,
    audioCachedInput: 0.4,
    audioOutput: 64,
  },
  "gpt-realtime-mini": {
    textInput: 0.6,
    textCachedInput: 0.06,
    textOutput: 2.4,
    audioInput: 10,
    audioCachedInput: 0.3,
    audioOutput: 24,
  },
};

const TRANSCRIPTION_PRICES: Record<string, PriceCard> = {
  "gpt-4o-transcribe": {
    textInput: 2.5,
    textCachedInput: 0,
    textOutput: 10,
    audioInput: 6,
    audioCachedInput: 0,
    audioOutput: 0,
  },
  "gpt-4o-mini-transcribe": {
    textInput: 0.6,
    textCachedInput: 0,
    textOutput: 2.4,
    audioInput: 3,
    audioCachedInput: 0,
    audioOutput: 0,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!anonKey || !serviceRoleKey || !supabaseUrl) {
      return json({ error: "Missing Supabase configuration." }, 500);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) return json({ error: "Sign in required." }, 401);

    const payload = await req.json().catch(() => ({}));
    const turnId = cleanText(payload.turnId, 180);
    if (!turnId) return json({ error: "Missing turnId." }, 400);

    const sessionId = cleanText(payload.sessionId, 80) || null;
    if (sessionId) {
      const { data: session, error: sessionError } = await admin
        .from("realtime_voice_sessions")
        .select("id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (sessionError) {
        console.error("realtime-cost-log session lookup error:", sessionError);
        return json({ error: "Could not verify realtime session." }, 500);
      }
      if (!session?.id) return json({ error: "Realtime session not found for user." }, 403);
    }

    const realtimeModel = cleanText(payload.realtimeModel, 80) || "unknown";
    const transcriptionModel = cleanText(payload.transcriptionModel, 80) || "gpt-4o-mini-transcribe";
    const realtimeUsage = asObject(payload.rawRealtimeUsage);
    const transcriptionUsage = asObject(payload.rawTranscriptionUsage);
    const realtimeEstimate = estimateUsageCost(realtimeModel, realtimeUsage, REALTIME_PRICES, "gpt-realtime-2");
    const transcriptionEstimate = estimateUsageCost(transcriptionModel, transcriptionUsage, TRANSCRIPTION_PRICES, "gpt-4o-transcribe");
    const ttsCost = safeNumber(payload.estimatedTtsCostUsd);
    const costConfidence = chooseConfidence(realtimeUsage, transcriptionUsage, payload.costConfidence);

    const row = {
      user_id: user.id,
      session_id: sessionId,
      turn_id: turnId,
      turn_index: Math.max(0, Math.floor(safeNumber(payload.turnIndex))),
      started_at: cleanDate(payload.startedAt) || new Date().toISOString(),
      completed_at: cleanDate(payload.completedAt),
      user_transcript: cleanText(payload.userTranscript, 12000),
      assistant_messages: Array.isArray(payload.assistantMessages)
        ? payload.assistantMessages.map((item: unknown) => cleanText(item, 12000)).filter(Boolean).slice(0, 20)
        : [],
      route_intent: cleanText(payload.routeIntent, 80) || null,
      route_mode: cleanText(payload.routeMode, 80) || null,
      connector: cleanText(payload.connector, 80) || null,
      realtime_model: realtimeModel,
      transcription_model: transcriptionModel,
      voice_provider: cleanText(payload.voiceProvider, 80) || null,
      voice_id: cleanText(payload.voiceId, 180) || null,
      voice_name: cleanText(payload.voiceName, 120) || null,
      realtime_input_text_tokens: realtimeEstimate.inputTextTokens,
      realtime_input_audio_tokens: realtimeEstimate.inputAudioTokens,
      realtime_output_text_tokens: realtimeEstimate.outputTextTokens,
      realtime_output_audio_tokens: realtimeEstimate.outputAudioTokens,
      realtime_cached_text_tokens: realtimeEstimate.cachedTextTokens,
      realtime_cached_audio_tokens: realtimeEstimate.cachedAudioTokens,
      transcription_input_text_tokens: transcriptionEstimate.inputTextTokens,
      transcription_input_audio_tokens: transcriptionEstimate.inputAudioTokens,
      transcription_output_text_tokens: transcriptionEstimate.outputTextTokens,
      total_tokens: realtimeEstimate.totalTokens + transcriptionEstimate.totalTokens,
      estimated_openai_realtime_cost_usd: roundCurrency(realtimeEstimate.costUsd),
      estimated_transcription_cost_usd: roundCurrency(transcriptionEstimate.costUsd),
      estimated_tts_cost_usd: roundCurrency(ttsCost),
      estimated_total_cost_usd: roundCurrency(realtimeEstimate.costUsd + transcriptionEstimate.costUsd + ttsCost),
      cost_confidence: costConfidence,
      raw_realtime_usage: realtimeUsage,
      raw_transcription_usage: transcriptionUsage,
      raw_tts_usage: asObject(payload.rawTtsUsage),
      raw_client_payload: asObject(payload),
    };

    const { data, error } = await admin
      .from("realtime_voice_turn_logs")
      .upsert(row, { onConflict: "user_id,turn_id" })
      .select("id,estimated_total_cost_usd,cost_confidence")
      .single();

    if (error) {
      console.error("realtime-cost-log upsert error:", error);
      return json({ error: "Could not save realtime cost log." }, 500);
    }

    return json({ ok: true, id: data?.id, estimatedTotalUsd: data?.estimated_total_cost_usd, costConfidence: data?.cost_confidence });
  } catch (error) {
    console.error("realtime-cost-log error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function safeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function cleanText(value: unknown, maxLength = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanDate(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function estimateUsageCost(model: string, usage: Record<string, unknown>, prices: Record<string, PriceCard>, fallbackModel: string) {
  const normalizedModel = model.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  const card = prices[model] || prices[normalizedModel] || prices[fallbackModel] || Object.values(prices)[0];
  if (!card) {
    return {
      inputTextTokens: 0,
      inputAudioTokens: 0,
      outputTextTokens: 0,
      outputAudioTokens: 0,
      cachedTextTokens: 0,
      cachedAudioTokens: 0,
      totalTokens: safeNumber(usage.total_tokens),
      costUsd: 0,
    };
  }
  const inputDetails = asObject(usage.input_token_details);
  const outputDetails = asObject(usage.output_token_details);
  const cachedDetails = asObject(inputDetails.cached_tokens_details);

  const inputTextTokens = safeNumber(inputDetails.text_tokens);
  const inputAudioTokens = safeNumber(inputDetails.audio_tokens);
  const outputTextTokens = safeNumber(outputDetails.text_tokens || usage.output_tokens);
  const outputAudioTokens = safeNumber(outputDetails.audio_tokens);
  const cachedTextTokens = safeNumber(cachedDetails.text_tokens);
  const cachedAudioTokens = safeNumber(cachedDetails.audio_tokens);
  const nonCachedText = Math.max(0, inputTextTokens - cachedTextTokens);
  const nonCachedAudio = Math.max(0, inputAudioTokens - cachedAudioTokens);

  const costUsd = (
    nonCachedText * card.textInput +
    cachedTextTokens * card.textCachedInput +
    nonCachedAudio * card.audioInput +
    cachedAudioTokens * card.audioCachedInput +
    outputTextTokens * card.textOutput +
    outputAudioTokens * card.audioOutput
  ) / 1_000_000;

  return {
    inputTextTokens,
    inputAudioTokens,
    outputTextTokens,
    outputAudioTokens,
    cachedTextTokens,
    cachedAudioTokens,
    totalTokens: safeNumber(usage.total_tokens),
    costUsd,
  };
}

function chooseConfidence(realtimeUsage: Record<string, unknown>, transcriptionUsage: Record<string, unknown>, clientConfidence: unknown) {
  const requested = cleanText(clientConfidence, 40);
  if (["token_exact", "duration_estimate", "unknown", "mixed"].includes(requested)) return requested;
  const hasRealtime = Object.keys(realtimeUsage).length > 0;
  const hasTranscription = Object.keys(transcriptionUsage).length > 0;
  if (hasRealtime && hasTranscription) return "token_exact";
  if (hasRealtime || hasTranscription) return "mixed";
  return "unknown";
}

function roundCurrency(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 1_000_000) / 1_000_000;
}
