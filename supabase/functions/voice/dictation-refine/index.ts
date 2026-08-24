// dictation-refine — the clean-up pass for BrainoHERA transcripts.
//
// This endpoint is intentionally narrow. It may delete what people do not mean
// to write — fillers, stutters, the abandoned half of a self-correction — and
// it may repunctuate, recase, and write spoken numbers as digits. It must never
// add a word, move a word, answer, or summarize. The Mac app runs a second
// deterministic check (assessDictationEdit) and falls back to the raw
// transcript whenever that contract is violated.
//
// It used to be a strictly lossless formatter, judged by a gate that demanded
// identical words in identical order. That made the two halves of dictation
// contradict each other: cleaning up the speech was the whole point, and every
// clean-up was rejected. Both halves now share this contract.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DICTATION_REFINEMENT_MODEL = Deno.env.get("DICTATION_REFINEMENT_MODEL") || "gpt-4.1-mini";
const MAX_TRANSCRIPT_CHARS = 20000;

const SYSTEM_PROMPT = `You clean up dictated speech into the text the speaker meant to write.

Return one JSON object with exactly one string field named "formatted".

Remove:
- Filler words: um, uh, er, hmm, like, you know, I mean, sort of, kind of.
- False starts and stuttered repeats: "the the parser" becomes "the parser".
- The abandoned half of a self-correction. Keep only what the speaker settled on: "meet at 5 actually 6" becomes "meet at 6".

Fix:
- Sentence case, punctuation, and paragraph breaks.
- Spoken numbers, times, currencies, percentages, and units the way people write them: "five p m" to "5 PM", "six o'clock" to "6:00", "twenty percent" to "20%", "twenty dollars" to "$20".
- A dictated list becomes a list.

Never:
- Add a word the speaker did not say. Not a reason, not a greeting, not a closing.
- Remove a word that carries meaning. Only fillers, false starts, and corrected-away words may go.
- Move a word or clause earlier or later.
- Answer, explain, comment, greet, or summarize.
- Translate. Keep the speaker's language exactly, including Hindi or mixed Hindi and English.
- Change emails, URLs, handles, hashtags, file names, code, product names, or personal names.
- Guess. If an edit would require guessing, keep the source wording.

Output no commentary and no Markdown.`;

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
