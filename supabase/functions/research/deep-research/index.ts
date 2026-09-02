import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { BRAINO_TEXT_MODEL } from "../../_shared/openai-models.ts";

/* Deep Work: research as a loop, not a lookup.
 *
 * web-research makes exactly one search and answers from it, which is a lookup.
 * Whatever the model decides to look up once is all you get, and on the
 * conversational path it deliberately fetches less context to stay fast. That is
 * the right shape for "what time do they open" and the wrong shape for "research
 * this properly".
 *
 * This one does what a person doing research does: work out what the question is
 * really made of, chase each part separately, then write it up with everything
 * in front of you. Same search tool, same API key. The difference is the loop.
 *
 * It takes around a minute, deliberately. It is a job you hand over, not a
 * question you wait on.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type Source = { title: string; url: string; snippet: string };

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const compact = (v: unknown, max = 600) => String(v || "").replace(/\s+/g, " ").trim().slice(0, max);

function canonicalUrl(raw: string) {
  try {
    const u = new URL(raw);
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref"].forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return raw;
  }
}

function outputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text;
  const parts: string[] = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message") continue;
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

/* Citations come back as annotations on the message, the same shape
   web-research reads, so the two stay consistent about what a source is. */
function sourcesFrom(data: any, into: Map<string, Source>) {
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message") continue;
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      const text = typeof content?.text === "string" ? content.text : "";
      for (const annotation of Array.isArray(content?.annotations) ? content.annotations : []) {
        const cite = annotation?.url_citation || annotation;
        const url = canonicalUrl(String(cite?.url || "").trim());
        if (!url || into.has(url)) continue;
        const start = Number(cite?.start_index);
        const end = Number(cite?.end_index);
        const snippet = Number.isFinite(start) && Number.isFinite(end) && end > start
          ? compact(text.slice(Math.max(0, start - 160), end + 160), 320)
          : compact(text, 320);
        into.set(url, { title: compact(cite?.title || url, 180), url, snippet });
      }
    }
  }
}

async function callOpenAi(body: Record<string, unknown>, label: string) {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  if (!res.ok) {
    console.error(`[deep-research] ${label} failed`, res.status, compact(raw, 400));
    throw new Error(`${label} failed: ${compact(data?.error?.message || raw, 300)}`);
  }
  return data;
}

const MODEL = () => Deno.env.get("OPENAI_WEB_SEARCH_MODEL") || BRAINO_TEXT_MODEL;

/* Step one: what is this question actually made of?
   Broad questions answered by one search are shallow because one search is one
   angle. Splitting first is the whole reason this is better. */
async function planQuestions(question: string, maxQuestions: number) {
  const data = await callOpenAi({
    model: MODEL(),
    reasoning: { effort: "low" },
    input: [
      "Break a research request into the separate questions someone would actually look up.",
      "Each one must be independently searchable and cover a different angle: the facts, the numbers,",
      "the opposing view, who else is doing it, and what changed recently.",
      `Return only a JSON array of ${maxQuestions} strings. No prose, no markdown fence.`,
      "",
      `Research request: ${question}`,
    ].join("\n"),
  }, "planning");

  const text = outputText(data).trim().replace(/^```(?:json)?|```$/g, "").trim();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.map((q) => compact(q, 240)).filter(Boolean).slice(0, maxQuestions);
      if (cleaned.length) return cleaned;
    }
  } catch { /* falls through */ }
  /* A plan that will not parse is not worth failing the whole job over. */
  return [question];
}

/* Step two: chase each one separately, at the same time. */
async function investigate(question: string, sources: Map<string, Source>) {
  const data = await callOpenAi({
    model: MODEL(),
    tool_choice: "required",
    tools: [{ type: "web_search", search_context_size: "high" }],
    reasoning: { effort: "low" },
    input: [
      "You are researching one narrow question for a larger report. Search the live web.",
      "Report only what the sources support, with the numbers and dates in them.",
      "Be dense. No preamble, no conclusion, no offers to help further.",
      "",
      `Question: ${question}`,
    ].join("\n"),
  }, "search");
  sourcesFrom(data, sources);
  return { question, findings: outputText(data) };
}

/* Step three: write it up with everything on the table. */
async function synthesise(question: string, findings: { question: string; findings: string }[]) {
  const notes = findings
    .filter((f) => f.findings.trim())
    .map((f, i) => `### Line of enquiry ${i + 1}: ${f.question}\n${f.findings}`)
    .join("\n\n");

  const data = await callOpenAi({
    model: MODEL(),
    /* The writing is not the thinking. All the thinking happened in the
       searches, and this call has the findings in front of it, so left at the
       default effort it spends thirty seconds reasoning about work already
       done. This one setting was a third of the wait. */
    reasoning: { effort: "low" },
    input: [
      "Write the research document, from the notes below and nothing else.",
      "Markdown. Open with the answer, then the detail behind it. Use headings.",
      "Keep every number and date the notes support, and keep the inline citation links.",
      "Say plainly where the sources disagree or where the evidence is thin.",
      "No filler, no restating the question back, no closing offer of further help.",
      "Do not write a Sources section: the document adds one from the citations.",
      "",
      "Return exactly:",
      "TITLE: <a specific title, not the question repeated>",
      "BODY:",
      "<the document>",
      "",
      `Original request: ${question}`,
      "",
      "Notes:",
      notes,
    ].join("\n"),
  }, "writing");

  const text = outputText(data);
  const match = text.match(/TITLE:\s*(.+?)\s*\nBODY:\s*([\s\S]*)$/i);
  return {
    title: compact(match?.[1] || question, 160),
    markdown: (match?.[2] || text).trim(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const question = compact(body?.query || body?.question, 2000);
    if (!question) return json({ error: "Ask him something to research." }, 400);

    /* Four is the default because the searches run together: the wait is the
       slowest single search, not the sum. Eight is there for when someone
       genuinely wants to wait. */
    const depth = body?.depth === "quick" ? 3 : body?.depth === "exhaustive" ? 8 : 4;

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id || null;

    const startedAt = Date.now();
    const questions = await planQuestions(question, depth);

    const sources = new Map<string, Source>();
    /* All at once. Done one after another this is five minutes; in parallel it
       is as slow as the slowest single search. */
    const settled = await Promise.allSettled(questions.map((q) => investigate(q, sources)));
    const findings = settled
      .filter((r): r is PromiseFulfilledResult<{ question: string; findings: string }> => r.status === "fulfilled")
      .map((r) => r.value);

    if (!findings.length) return json({ error: "Every search came back empty. Try again in a moment." }, 502);

    const { title, markdown } = await synthesise(question, findings);
    const sourceList = [...sources.values()];

    let doc: { id: string; slug: string } | null = null;
    if (userId) {
      const slug = `${crypto.randomUUID().slice(0, 8)}`;
      const { data: row, error } = await supabase
        .from("braino_docs")
        .insert({
          user_id: userId,
          slug,
          title,
          question,
          markdown,
          sources: sourceList,
          questions_asked: questions,
          kind: "research",
        })
        .select("id, slug")
        .single();
      if (error) console.error("[deep-research] could not save the document", error.message);
      else doc = row as { id: string; slug: string };
    }

    return json({
      ok: true,
      title,
      markdown,
      sources: sourceList,
      questionsAsked: questions,
      doc,
      tookMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[deep-research]", error);
    return json({ error: error instanceof Error ? error.message : "Research failed." }, 500);
  }
});
