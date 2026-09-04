import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { BRAINO_TEXT_MODEL } from "../../_shared/openai-models.ts";

/* A lecture becomes notes.
 *
 * The transcript is what was said. Notes are what it meant, and nobody revises
 * from an hour of raw speech: they revise from the four things that mattered
 * and the terms they are supposed to know by the exam.
 *
 * This runs once, after the recording has stopped, on the whole transcript. Not
 * during: the listening path is load-bearing and verified, and a lecture that
 * transcribes for forty minutes is worth more than one that has better
 * punctuation and stops after five.
 *
 * The one rule that matters is the same one the meeting notes use: only what
 * was actually said. An invented definition in a student's revision notes is
 * worse than no notes, because they will believe it.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM = `You turn a lecture transcript into revision notes.

CRITICAL RULE: only include what was explicitly said. Do not add, infer, elaborate or guess. If the lecturer did not define a term, do not define it. An invented fact in someone's revision notes is worse than a missing one, because they will trust it.

The transcript came from live speech recognition, so expect misheard words. Where a word is obviously wrong and the correct one is unambiguous from context, use the correct one. Where you cannot tell, keep what was said rather than inventing a plausible replacement.

Write clean Markdown in this order, dropping any section that has nothing real in it:

## In short
Two or three sentences. What this lecture was actually about and what it concluded.

## Key points
Short bullets. The things that would be on an exam. Keep the lecturer's own numbers and examples.

## Terms
Only terms the lecturer actually explained. Term, then their definition in their words, tightened.

## Follow up
Anything explicitly flagged as homework, further reading, or "we will cover this next time". Omit the section entirely if none was mentioned.

Rules:
- Short lecture, short notes. Never pad.
- No preamble, no "here are your notes", no closing offer.
- Do not summarise the summary at the end.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const transcript = String(body?.transcript || "").trim();
    if (!transcript) return json({ error: "No transcript." }, 400);

    const subject = String(body?.subject || "").trim().slice(0, 200);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500);

    /* Long lectures are trimmed from the front rather than refused. The end of
       a lecture carries the conclusions and whatever was set as homework, which
       is the part a student actually needs. */
    const MAX = 120000;
    const text = transcript.length > MAX ? transcript.slice(-MAX) : transcript;
    const trimmed = transcript.length > MAX;

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              subject ? `The lecture is about: ${subject}` : "",
              trimmed ? "This is the last part of a long lecture; earlier material is missing." : "",
              "",
              text,
            ].filter(Boolean).join("\n"),
          },
        ],
      }),
    });

    const raw = await res.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    if (!res.ok) {
      console.error("[lecture-notes] failed", res.status, raw.slice(0, 400));
      return json({ error: String(data?.error?.message || `status ${res.status}`) }, 502);
    }

    const notes = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!notes) return json({ error: "The notes came back empty." }, 502);

    /* The overview for the card on the shelf is the "In short" section, so the
       two can never say different things about the same lecture. */
    const short = notes.match(/##\s*In short\s*\n([\s\S]*?)(?=\n##\s|$)/i);
    const overview = (short?.[1] || "").replace(/\s+/g, " ").trim().slice(0, 700);

    return json({ ok: true, notes, overview, trimmed });
  } catch (error) {
    console.error("[lecture-notes]", error);
    return json({ error: error instanceof Error ? error.message : "Failed." }, 500);
  }
});
