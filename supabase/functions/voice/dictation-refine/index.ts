// dictation-refine — a lossless cleanup pass for Yap Mode transcripts.
//
// This endpoint is intentionally narrow. It can format what the speech model
// heard, but it must never summarize, answer, reorder, or silently replace the
// speaker's words. The Mac app performs a second deterministic lexical check
// and falls back to the raw transcript when that contract is violated.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DICTATION_REFINEMENT_MODEL = Deno.env.get("DICTATION_REFINEMENT_MODEL") || "gpt-4.1-mini";
const MAX_TRANSCRIPT_CHARS = 20000;

const SYSTEM_PROMPT = `You are a lossless speech-dictation formatter.

Return one JSON object with exactly one string field named "formatted".

Hard rules:
- Preserve every clearly transcribed word, filler word, repetition, false start, correction, slang term, profanity, name, uncertainty, and idea in the original order.
- Never summarize, answer, shorten, embellish, infer missing content, fix the speaker's facts, or rewrite their style.
- Never move a word or clause earlier or later.
- You may change only punctuation, capitalization, paragraph breaks, and unambiguous written notation for spoken numbers, dates, times, currencies, percentages, and units.
- Examples of allowed notation: "five p m" to "5 p.m.", "six o'clock" to "6:00", and "twenty percent" to "20%."
- Preserve emails, URLs, handles, hashtags, file names, code, product names, and personal names exactly unless the source already makes the casing unambiguous.
- If any edit would require guessing, preserve the source wording.
- Output no commentary and no Markdown.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
    if (!transcript) return json({ error: "No transcript provided" }, 400);
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return json({ error: "Transcript is too long" }, 413);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "AI service is not configured" }, 503);

    const startedAt = Date.now();
    const response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DICTATION_REFINEMENT_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: transcript },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("dictation-refine AI error", response.status, data?.error?.message || data);
      return json({ error: "Refinement request failed" }, response.status === 429 ? 429 : 502);
    }

    const content = String(data?.choices?.[0]?.message?.content || "").trim();
    let parsed: { formatted?: unknown } = {};
    try { parsed = JSON.parse(content); } catch { /* rejected below */ }
    const formatted = typeof parsed.formatted === "string" ? parsed.formatted.trim() : "";
    if (!formatted) return json({ error: "Refinement returned no transcript" }, 502);

    return json({
      formatted,
      changed: formatted !== transcript,
      model: DICTATION_REFINEMENT_MODEL,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("dictation-refine failed", error);
    return json({ error: error instanceof Error ? error.message : "Refinement failed" }, 500);
  }
});
