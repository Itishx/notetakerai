import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type Purpose = "answer" | "delegate" | "google_doc" | "compare";

type Source = {
  title: string;
  url: string;
  snippet: string;
  highlights: string[];
  extractedTextExcerpt: string;
  publishedDate: string | null;
  author: string | null;
  status: "opened" | "snippet_only";
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function compactText(value: string, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      error: error.message || "Unknown error",
      details: compactText(error.stack || "") || null,
    };
  }
  if (typeof error === "string") return { error, details: null };
  return { error: "Unexpected backend error", details: null };
}

async function requireAuthedUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!authHeader || !supabaseUrl || !anonKey) {
    throw new Error("Not signed in.");
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) throw new Error("Not signed in.");
  return user;
}

function normalizePurpose(value: unknown): Purpose {
  if (value === "delegate" || value === "google_doc" || value === "compare") return value;
  return "answer";
}

function isFreshQuery(query: string) {
  return /\b(latest|current|today|this week|this month|this year|recent|news|now|2026|update|updates)\b/i.test(query);
}

function canonicalUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("utm_term");
    parsed.searchParams.delete("utm_content");
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return String(url || "").trim();
  }
}

function historyToText(chatHistory: unknown) {
  if (!Array.isArray(chatHistory) || !chatHistory.length) return "";
  const lines = chatHistory
    .slice(-6)
    .map((msg) => {
      const role = String((msg as { role?: string })?.role || "").trim().toLowerCase();
      const content = compactText(String((msg as { content?: string })?.content || ""), 1200);
      if (!role || !content) return "";
      return `${role}: ${content}`;
    })
    .filter(Boolean);

  if (!lines.length) return "";
  return `Recent conversation context:\n${lines.join("\n")}`;
}

function buildPrompt({
  query,
  purpose,
  instructions,
  chatHistory,
}: {
  query: string;
  purpose: Purpose;
  instructions?: string;
  chatHistory?: unknown;
}) {
  const freshnessNote = isFreshQuery(query)
    ? "This request is freshness-sensitive. Prefer up-to-date sources and mention exact dates when relevant."
    : "";
  const extraInstructions = compactText(String(instructions || ""), 1500);
  const historyBlock = purpose === "answer" ? historyToText(chatHistory) : "";

  const common = [
    "You are Braino's live web research engine.",
    "Search the live web before answering.",
    "Use only claims you can support from the cited web sources.",
    "Keep inline citations in the answer.",
    freshnessNote,
    historyBlock,
    extraInstructions ? `Additional instructions: ${extraInstructions}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (purpose === "google_doc") {
    return [
      common,
      "",
      "Write a polished research article in markdown.",
      "Return exactly this format and nothing else:",
      "TITLE: <concise document title>",
      "BODY:",
      "<article body with headings, paragraphs, and inline citations>",
      "Do not include a separate Sources section. The app adds it later.",
      `Topic: ${query}`,
    ].join("\n");
  }

  if (purpose === "delegate") {
    return [
      common,
      "",
      "Return a compact research brief for a browser agent.",
      "Use short markdown bullets and keep it actionable.",
      "Avoid fluff.",
      `Task: ${query}`,
    ].join("\n");
  }

  if (purpose === "compare") {
    return [
      common,
      "",
      "The user wants a COMPARISON to decide what to buy/pick. Identify the top 3-5 real candidates",
      "that match every constraint in the request (price ceiling, use-case, brand, region).",
      "Return markdown in exactly this shape:",
      "- A short one-line framing of what you compared.",
      "- A compact comparison: one bullet per option with its name, key specs/pros, the standout con,",
      "  and current approximate price (with the currency from the request).",
      "- End with a line that starts with **Best pick:** naming ONE winner and a one-sentence why.",
      "Only include options you can support from cited sources; do not invent prices or specs.",
      "Prefer product, retailer, and reputable review sources so each option is backed by a real URL.",
      "Do not include a separate Sources section. The app adds it later.",
      `Comparison request: ${query}`,
    ].join("\n");
  }

  return [
    common,
    "",
    "Answer directly in markdown.",
    "Do not include a separate Sources section.",
    `User question: ${query}`,
  ].join("\n");
}

function toolConfigForPurpose(purpose: Purpose) {
  return {
    type: "web_search",
    // "answer"/"delegate" are conversational lookups where speed IS the feature — "low"
    // fetches far less search context and shaves seconds. Deep purposes keep "high".
    search_context_size: (purpose === "google_doc" || purpose === "compare") ? "high" : "low",
  };
}

// Quick conversational searches (chat + voice) ride the fast lane: mini model, minimal
// reasoning. Deep purposes (doc writing, comparisons) keep the strong model for quality.
function modelForPurpose(purpose: Purpose) {
  const deep = purpose === "google_doc" || purpose === "compare";
  if (deep) return Deno.env.get("OPENAI_WEB_SEARCH_MODEL") || "gpt-5.5";
  return Deno.env.get("OPENAI_WEB_SEARCH_FAST_MODEL") || Deno.env.get("OPENAI_WEB_SEARCH_MODEL") || "gpt-5.4-mini";
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function callOpenAiWebSearch({
  userId,
  query,
  purpose,
  instructions,
  chatHistory,
}: {
  userId: string;
  query: string;
  purpose: Purpose;
  instructions?: string;
  chatHistory?: unknown;
}) {
  const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
  const model = modelForPurpose(purpose);
  if (!openAiApiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const quick = purpose !== "google_doc" && purpose !== "compare";
  const safetyIdentifier = await sha256(userId);
  const body: Record<string, unknown> = {
    model,
    tool_choice: "required",
    tools: [toolConfigForPurpose(purpose)],
    input: buildPrompt({ query, purpose, instructions, chatHistory }),
  };
  // Reasoning burn is the hidden cost on gpt-5.x: default effort thinks for seconds
  // before it even searches. Quick lookups don't need it.
  if (quick) body.reasoning = { effort: "low" };

  const doFetch = () => fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": safetyIdentifier,
    },
    body: JSON.stringify(body),
  });
  let res = await doFetch();
  let raw = await res.text();
  // Fail-open on the speed knob: if the configured model rejects the reasoning param,
  // drop it and retry once rather than failing the search.
  if (!res.ok && quick && body.reasoning && /reasoning/i.test(raw)) {
    delete body.reasoning;
    res = await doFetch();
    raw = await res.text();
  }
  let data: any = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }
  }

  if (!res.ok) {
    console.error("[web-research] OpenAI web search error", res.status, raw);
    const detail =
      compactText(String(data?.error?.message || data?.message || raw || ""), 400) || `status ${res.status}`;
    throw new Error(`OpenAI web search failed: ${detail}`);
  }

  return data;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function stripCodeFence(text: string) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/^```(?:[a-z0-9_-]+)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks: string[] = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message") continue;
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content?.text === "string" && content.text.trim()) {
        chunks.push(content.text.trim());
      }
    }
  }

  return chunks.join("\n\n").trim();
}

function extractSearchQueries(data: any, fallbackQuery: string) {
  const queries: string[] = [];

  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "web_search_call") continue;
    const action = item?.action || {};

    if (typeof action?.query === "string" && action.query.trim()) {
      queries.push(action.query.trim());
    }

    if (Array.isArray(action?.queries)) {
      for (const value of action.queries) {
        const text = String(value || "").trim();
        if (text) queries.push(text);
      }
    }
  }

  return Array.from(new Set(queries.length ? queries : [fallbackQuery]));
}

function citationRangeSnippet(text: string, start: unknown, end: unknown) {
  const startIndex = numberOrNull(start);
  const endIndex = numberOrNull(end);
  if (startIndex === null || endIndex === null || endIndex <= startIndex) return "";

  const snippet = text.slice(Math.max(0, startIndex - 100), Math.min(text.length, endIndex + 160));
  return compactText(snippet, 700);
}

function extractSources(data: any) {
  const byUrl = new Map<string, Source>();

  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type !== "message") continue;

    for (const content of Array.isArray(item?.content) ? item.content : []) {
      const text = typeof content?.text === "string" ? content.text : "";
      const annotations = Array.isArray(content?.annotations) ? content.annotations : [];

      for (const annotation of annotations) {
        const rawCitation = annotation?.url_citation || annotation;
        const url = canonicalUrl(String(rawCitation?.url || "").trim());
        if (!url) continue;

        const key = canonicalUrl(url);
        const snippet =
          citationRangeSnippet(text, rawCitation?.start_index, rawCitation?.end_index) ||
          compactText(text, 700);

        const existing = byUrl.get(key);
        if (existing) {
          if (!existing.snippet && snippet) existing.snippet = snippet;
          if (!existing.extractedTextExcerpt && snippet) existing.extractedTextExcerpt = snippet;
          continue;
        }

        byUrl.set(key, {
          title: compactText(String(rawCitation?.title || url), 180),
          url,
          snippet,
          highlights: snippet ? [snippet] : [],
          extractedTextExcerpt: snippet,
          publishedDate: null,
          author: null,
          status: "snippet_only",
        });
      }
    }
  }

  return Array.from(byUrl.values()).slice(0, 8);
}

function parseResearchDraft(query: string, rawText: string) {
  const text = stripCodeFence(rawText);
  const match = text.match(/^\s*TITLE:\s*(.+?)\n+BODY:\s*([\s\S]+)$/i);
  if (match) {
    return {
      title: compactText(match[1], 180) || `${query} - Braino Research`,
      body: match[2].trim(),
    };
  }

  const headingMatch = text.match(/^\s*#\s+(.+?)\n+([\s\S]+)$/);
  if (headingMatch) {
    return {
      title: compactText(headingMatch[1], 180) || `${query} - Braino Research`,
      body: text.trim(),
    };
  }

  return {
    title: compactText(`${query} - Braino Research`, 180),
    body: text.trim(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await requireAuthedUser(req);

    const payload = await req.json().catch(() => ({}));
    const query = String(payload?.query || payload?.message || "").trim();
    if (!query) return json({ error: "query is required." }, 400);

    const purpose = normalizePurpose(payload?.purpose);
    const openAiData = await callOpenAiWebSearch({
      userId: user.id,
      query,
      purpose,
      instructions: payload?.instructions,
      chatHistory: payload?.chatHistory,
    });

    const outputText = extractOutputText(openAiData);
    const searchQueries = extractSearchQueries(openAiData, query);
    const sources = extractSources(openAiData);

    if (!outputText) {
      return json({
        answer: `I could not find enough reliable live web results for "${query}".`,
        sources,
        searchQueries,
        researchContext: "",
        query,
        engine: "OpenAI web_search",
        searchUrl: "",
        results: sources.map((source) => ({
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          highlights: source.highlights,
          publishedDate: source.publishedDate,
          status: source.status,
        })),
      });
    }

    let answer = outputText;
    let title: string | undefined;
    let body: string | undefined;

    if (purpose === "google_doc") {
      const parsed = parseResearchDraft(query, outputText);
      title = parsed.title;
      body = parsed.body;
      if (!body) throw new Error("Research draft came back empty.");
      answer = body;
    }

    return json({
      answer,
      title,
      body,
      sources,
      searchQueries,
      researchContext: "",
      query,
      engine: "OpenAI web_search",
      searchUrl: "",
      results: sources.map((source) => ({
        title: source.title,
        url: source.url,
        snippet: source.snippet,
        highlights: source.highlights,
        publishedDate: source.publishedDate,
        status: source.status,
      })),
    });
  } catch (error) {
    console.error("web-research error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = /not signed in/i.test(message) ? 401 : /not configured|key/i.test(message) ? 500 : 500;
    return json(serializeError(error), status);
  }
});
