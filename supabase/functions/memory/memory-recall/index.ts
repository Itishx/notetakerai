// memory-recall: a question about the past, answered from what the Mac saved.
//
// Step 3 of AffectiveOS Remembers. The Mac does the searching locally (the raw
// log never leaves it except for this: the candidates for ONE question) and
// sends numbered candidates plus the hour summaries for the window. This picks
// what answers the question and says it the way Braino would. Acting on it
// (opening the site) is the loop's job, with the matches this returns.
//
// Nothing is stored and nothing goes to engine_runs (a public page).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildRecallPrompt, RECALL_VERSION } from "../../_shared/affective-memory/prompts.ts";
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "../../_shared/openai-models.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openai = Deno.env.get("OPENAI_API_KEY");
    const auth = req.headers.get("Authorization") || "";
    const { data: who } = await createClient(url, anon, { global: { headers: { Authorization: auth } } }).auth.getUser();
    if (!who?.user?.id) return json({ error: "signed_out" }, 401);
    if (!openai) return json({ error: "no model key" }, 500);

    const { question, now, window, candidates, summaries } = await req.json();
    const started = Date.now();
    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openai}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        response_format: { type: "json_object" },
        max_completion_tokens: 500,
        messages: [
          { role: "system", content: buildRecallPrompt() },
          { role: "user", content: `Now: ${String(now || "")}\nThey asked: ${String(question || "").slice(0, 500)}\nWindow searched: ${String(window || "")}\n\nCANDIDATES\n${String(candidates || "(none)").slice(0, 24000)}\n\nHOUR SUMMARIES\n${String(summaries || "(none)").slice(0, 8000)}` },
        ],
      }),
    });
    if (!ai.ok) return json({ error: `model ${ai.status}` }, 502);
    const payload = await ai.json();
    let out: any = {};
    try { out = JSON.parse(payload?.choices?.[0]?.message?.content || "{}"); } catch (_) { out = {}; }
    console.log("memory-recall", { ms: Date.now() - started, matches: Array.isArray(out.matches) ? out.matches.length : 0, version: RECALL_VERSION });
    return json({
      answer: String(out.answer || "I don't see that in what I remember.").replace(/[–—]/g, ", ").slice(0, 500),
      matches: (Array.isArray(out.matches) ? out.matches : []).map(Number).filter(Number.isFinite).slice(0, 6),
      ambiguous: out.ambiguous === true,
      version: RECALL_VERSION,
    });
  } catch (error) {
    return json({ error: (error as Error)?.message || "memory-recall failed" }, 500);
  }
});
