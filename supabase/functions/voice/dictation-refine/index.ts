import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import EXAMPLES from "./examples.json" with { type: "json" };

/* Dictation clean-up (rewritten 2026-10-25 against Itish's 1,446-line dataset,
   training/dictation/). Two layers:

   1. Rules written for how he actually writes: Indian money (₹, lakh, crore),
      Indian phone grouping, self-corrections that keep only the final value,
      spoken punctuation taken literally, lists, emails spelled out.
   2. His own examples: the 8 training lines closest to what was just said are
      shown to the model, so it copies his conventions instead of guessing.
      Chosen by word overlap, on this server, with no extra model call.

   The fixed rules come first so OpenAI caches them; the examples and the
   transcript change per call. Scored by training/dictation/eval.mjs on a held
   out test set the examples never include. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = Deno.env.get("DICTATION_GROQ_MODEL") || "openai/gpt-oss-120b"; // Llama 3.3 was retired on Groq
const DICTATION_REFINEMENT_MODEL = Deno.env.get("DICTATION_REFINEMENT_MODEL") || "gpt-4.1-mini";
const MAX_TRANSCRIPT_CHARS = 20000;

const SYSTEM_PROMPT = `You turn raw dictated speech into the exact text the speaker meant to type. The speaker is in India.

Return one JSON object: {"formatted": "<text>"}. No commentary, no Markdown.

REMOVE
- Fillers anywhere: um, uh, er, hmm, like (as filler), you know, I mean (as filler), sort of, kind of, and openers "so", "okay so", "right so", "uh so" at the start.
- Stutters and repeats: "the the", "post post", "percent percent", "io io", "dot dot".
- In a self-correction, everything before the final choice. Markers: actually, no, no no, wait, wait no, scratch that, sorry, sorry I mean, I mean, or, or actually, or wait, hmm no, no maybe, no let's say, make it, actually make it. "the budget is seven hundred actually make it twenty five thousand" -> "The budget is ₹25,000." Keep what comes after the final value ("with the team", "tomorrow", "if that works").

NUMBERS
- Times: "five p m" -> "5 PM", "five thirty am" -> "5:30 AM", "twelve fifteen pm" -> "12:15 PM". If the corrected time has no AM/PM, use the AM/PM said with the first time. Never add ":00".
- Dates: "july twenty sixth" -> "July 26".
- Money: in budgets, prices, payments, charges and "send <name> <amount>", amounts are rupees: "₹25,000", "₹800", "₹1,200" (commas every three digits), even if "rupees" was not said, and drop the word "rupees".
- Percentages: "eighty two percent" -> "82%", "eight point five percent" -> "8.5%".
- Lakh and crore stay words after a digit: "six crore" -> "6 crore", "five lakh" -> "5 lakh". "two thousand" after a metric -> "2 thousand".
- Phone numbers (10 digits): "eight one seven three nine seven one three three two" -> "81739 71332".
- Small counts in ordinary sentences stay words: "ten minutes late", "first ten paying customers", "cut two steps".

EMAILS
- "divya dot k at yahoo dot in" -> "divya.k@yahoo.in"; "underscore" -> "_"; all lowercase; "co dot in" -> "co.in".

SPOKEN PUNCTUATION (do exactly what was said, where it was said)
- "comma" -> ",", "period" or "full stop" -> ".", "question mark" -> "?", "exclamation mark" -> "!", "new paragraph" -> a blank line, "new line" -> a line break.
- If they said "comma" in an odd place, still put the comma there. If they said "exclamation mark" after a question, use "!".
- Letters: "hey neha comma new paragraph ... new paragraph cheers comma new line itish" -> "Hey Neha,\\n\\n...\\n\\nCheers,\\nItish".

LISTS (decide like a person typing would)
- Numbered when there is an order: steps, a plan, priorities, "one two three", "first ... then ... finally". "the steps are first X then Y and finally Z" -> "The steps are:\\n1. X\\n2. Y\\n3. Z".
- Bullets whenever they name 4 or more things, announced or not: "i want to order a bag of chips a bag of cheetos some strawberries and some protein shake" -> "I want to order:\\n- A bag of chips\\n- A bag of Cheetos\\n- Some strawberries\\n- Some protein shake" (the sentence before the items becomes the intro, keeping its words).
- Bullets also when they announce a list and then name 3 or more things: "the following things", "these things", "list", "things to pack", "don't forget to bring", "here's what we need". "i have to get the following things eggs mango and milk" -> "I have to get the following things:\\n- Eggs\\n- Mango\\n- Milk". Also "bullet A bullet B".
- The intro line ends with ":", items are capitalised with no full stops, "and" before the last item is dropped.
- Stays one sentence when it is 2 or 3 items inside an ordinary sentence with no announcement: "can you pick up milk eggs and bread on your way home" -> "Can you pick up milk, eggs, and bread on your way home?" (Oxford comma).

SENTENCES
- Several thoughts run together become separate sentences: "the client loved the design can you send the link" -> "The client loved the design. Can you send the link?"
- Questions end with "?": anything starting with can, could, would, will, is, are, do, does, what, why, how, where, when, who, which, shall, should.
- A comma before "but" and "so" joining two clauses: "The deadline is tight, but we can make it." Also: "Sorry, I missed your call.", "Thanks, that really helped a lot.", "Never mind, I found it.", "Okay, I'm heading out now, see you tomorrow.", "Honestly, I think…", "You're right, I should have…", "I need a break, my brain is fried."
- "Congratulations on the new role!" and "Happy birthday, hope you have an amazing day!" end with "!".
- Capitalise names, places, products, and days/months: Neha, Bangalore, Product Hunt, WhatsApp, Mom, Friday. "co founder" -> "co-founder", "to do" -> "to-do".

NEVER
- Add a word that was not said (no greetings, sign-offs, explanations).
- Drop a word that carries meaning.
- Answer, summarise, or translate. Keep Hindi or Hinglish words as spoken.
- Change names, emails, URLs, handles, code or product names except as above.`;

type Example = { c: string; i: string; o: string };
const FILLER = new Set(["um", "uh", "hmm", "like", "you", "know", "i", "mean", "so", "okay", "right", "er", "the", "a", "is", "to", "and"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !FILLER.has(w));
/* The shape words matter more than the content words: "actually", "comma",
   "bullet", "percent", "dot" decide how a line is written. */
const SHAPE = new Set(["actually", "scratch", "wait", "no", "sorry", "make", "comma", "period", "paragraph", "line", "question", "exclamation", "mark", "bullet", "list", "following", "things", "steps", "first", "then", "finally", "pack", "bring", "one", "two", "percent", "lakh", "crore", "thousand", "hundred", "dot", "at", "underscore", "am", "pm", "p", "m", "number", "whatsapp", "call", "email", "reach", "send", "budget", "price", "charge", "pay", "vendor", "buy", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "birthday", "ship", "submit", "meeting", "hackathon"]);
const INDEX = (EXAMPLES as Example[]).map((e) => ({ e, w: new Set(words(e.i)) }));

function nearest(transcript: string, k = 8): Example[] {
  const q = words(transcript);
  const qs = new Set(q);
  const scored = INDEX.map(({ e, w }) => {
    let s = 0;
    for (const t of qs) if (w.has(t)) s += SHAPE.has(t) ? 3 : 1;
    return { e, s: s / Math.sqrt(w.size + 1) };
  }).sort((a, b) => b.s - a.s);
  // Prefer variety: at most 3 from one category.
  const out: Example[] = [];
  const per: Record<string, number> = {};
  for (const { e } of scored) {
    if ((per[e.c] || 0) >= 3) continue;
    per[e.c] = (per[e.c] || 0) + 1;
    out.push(e);
    if (out.length >= k) break;
  }
  return out;
}

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
    // "rules" leaves the examples out (used by the eval to measure each layer).
    const mode = body?.mode === "rules" ? "rules" : "examples";
    const model = typeof body?.model === "string" && /^gpt-[\w.-]+$/.test(body.model) && body.eval === true ? body.model : DICTATION_REFINEMENT_MODEL;

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "AI service is not configured" }, 503);

    const shots = mode === "examples" ? nearest(transcript) : [];
    const messages: { role: string; content: string }[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const s of shots) {
      messages.push({ role: "user", content: s.i });
      messages.push({ role: "assistant", content: JSON.stringify({ formatted: s.o }) });
    }
    messages.push({ role: "user", content: transcript });

    const startedAt = Date.now();
    /* Groq first (gpt-oss-120b at low reasoning, fast vs ~1.3 s), approved by Itish on his own
       long dictations 2026-10-25; OpenAI is the fallback on any failure. */
    const groqKey = Deno.env.get("GROQ_API_KEY");
    const useGroq = Boolean(groqKey) && body?.provider !== "openai";
    let response = useGroq
      ? await fetch(GROQ_ENDPOINT, {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: GROQ_MODEL, temperature: 0, response_format: { type: "json_object" }, messages, ...(GROQ_MODEL.includes("gpt-oss") ? { reasoning_effort: "low" } : {}) }),
        }).catch(() => null)
      : null;
    let provider = "groq";
    if (!response || !response.ok) {
      if (response) console.error("groq refine failed", response.status);
      provider = "openai";
      response = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, temperature: 0, response_format: { type: "json_object" }, messages }),
      });
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("dictation-refine AI error", response.status, data?.error?.message || data);
      return json({ error: "Refinement request failed" }, response.status === 429 ? 429 : 502);
    }

    const content = String(data?.choices?.[0]?.message?.content || "").trim();
    let parsed: { formatted?: unknown } = {};
    try { parsed = JSON.parse(content); } catch { /* rejected below */ }
    const formatted = typeof parsed.formatted === "string" ? parsed.formatted.replace(/[—–]/g, ",").trim() : "";
    if (!formatted) return json({ error: "Refinement returned no transcript" }, 502);

    return json({
      formatted,
      changed: formatted !== transcript,
      model: provider === "groq" ? GROQ_MODEL : model,
      provider,
      mode,
      shots: shots.length,
      cachedTokens: data?.usage?.prompt_tokens_details?.cached_tokens || 0,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("dictation-refine failed", error);
    return json({ error: error instanceof Error ? error.message : "Refinement failed" }, 500);
  }
});
