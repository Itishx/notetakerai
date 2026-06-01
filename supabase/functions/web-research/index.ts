import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Purpose = "answer" | "delegate" | "google_doc";
type AiProvider = "lovable" | "claude";

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

type AiConfig = {
  provider: AiProvider;
  model: string;
  apiKey: string;
  endpoint: string;
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
  if (error instanceof Error) return { error: error.message || "Unknown error", details: compactText(error.stack || "") || null };
  if (typeof error === "string") return { error, details: null };
  return { error: "Unexpected backend error", details: null };
}

function resolveAiConfig(requestedProvider?: string): AiConfig {
  if (requestedProvider === "claude") {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("Claude API key not configured.");
    return {
      provider: "claude",
      model: "claude-sonnet-4-20250514",
      apiKey,
      endpoint: "https://api.anthropic.com/v1/messages",
    };
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("AI key not configured.");
  return {
    provider: "openai",
    model: "gpt-5-mini",
    apiKey,
    endpoint: "https://api.openai.com/v1/chat/completions",
  };
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
  if (value === "delegate" || value === "google_doc") return value;
  return "answer";
}

function isFreshQuery(query: string) {
  return /\b(latest|current|today|this week|this month|this year|recent|news|now|2026|update|updates)\b/i.test(query);
}

function buildSearchQuery(query: string, purpose: Purpose) {
  const trimmed = String(query || "").trim();
  if (isFreshQuery(trimmed)) return `${trimmed} latest credible sources`;
  if (purpose === "google_doc") return `${trimmed} overview analysis sources`;
  return trimmed;
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

function extractText(result: any) {
  const text = result?.text;
  if (typeof text === "string") return text;
  if (text && typeof text.text === "string") return text.text;
  if (typeof result?.summary === "string") return result.summary;
  return "";
}

function extractHighlights(result: any): string[] {
  if (Array.isArray(result?.highlights)) return result.highlights.map((h: unknown) => compactText(String(h || ""), 800)).filter(Boolean);
  if (typeof result?.highlight === "string") return [compactText(result.highlight, 800)].filter(Boolean);
  return [];
}

function sourceFromExa(result: any): Source | null {
  const url = String(result?.url || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;

  const text = extractText(result);
  const highlights = extractHighlights(result);
  const snippet =
    compactText(String(result?.summary || ""), 700) ||
    compactText(highlights.join(" "), 700) ||
    compactText(String(result?.textSnippet || result?.snippet || ""), 700) ||
    compactText(text, 700);

  return {
    title: compactText(String(result?.title || "Untitled source"), 180),
    url,
    snippet,
    highlights,
    extractedTextExcerpt: compactText(text, 5000),
    publishedDate: result?.publishedDate || result?.published_date || null,
    author: result?.author || null,
    status: text.trim().length >= 300 ? "opened" : "snippet_only",
  };
}

async function callExaSearch(query: string, purpose: Purpose, useFreshness: boolean) {
  const exaKey = Deno.env.get("EXA_API_KEY");
  if (!exaKey) throw new Error("EXA_API_KEY is not configured.");

  const body: Record<string, unknown> = {
    query,
    type: "auto",
    numResults: purpose === "google_doc" ? 8 : 6,
    contents: {
      text: { maxCharacters: purpose === "google_doc" ? 5000 : 3500 },
      highlights: true,
      summary: { query },
    },
  };

  if (useFreshness) {
    body.startPublishedDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365).toISOString();
  }

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": exaKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[web-research] Exa search error", res.status, errorText);
    throw new Error(`Exa search failed: ${res.status}`);
  }

  return await res.json();
}

async function repairThinSources(sources: Source[], query: string, purpose: Purpose) {
  const exaKey = Deno.env.get("EXA_API_KEY");
  const thinSources = sources.filter((source) => source.status !== "opened").slice(0, 4);
  if (!exaKey || !thinSources.length) return sources;

  try {
    const res = await fetch("https://api.exa.ai/contents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": exaKey,
      },
      body: JSON.stringify({
        ids: thinSources.map((source) => source.url),
        text: { maxCharacters: purpose === "google_doc" ? 5000 : 3500 },
        highlights: true,
        summary: { query },
      }),
    });

    if (!res.ok) return sources;
    const data = await res.json();
    const repaired = new Map<string, Source>();
    for (const result of data?.results || []) {
      const source = sourceFromExa(result);
      if (source) repaired.set(canonicalUrl(source.url), source);
    }

    return sources.map((source) => repaired.get(canonicalUrl(source.url)) || source);
  } catch (error) {
    console.warn("[web-research] Exa contents repair failed", error);
    return sources;
  }
}

function normalizeSources(results: any[]): Source[] {
  const seen = new Set<string>();
  const sources: Source[] = [];

  for (const result of results || []) {
    const source = sourceFromExa(result);
    if (!source) continue;
    const key = canonicalUrl(source.url);
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push(source);
  }

  return sources
    .sort((a, b) => {
      const openedDelta = Number(b.status === "opened") - Number(a.status === "opened");
      if (openedDelta) return openedDelta;
      return b.extractedTextExcerpt.length - a.extractedTextExcerpt.length;
    })
    .slice(0, 8);
}

function rankSources(sources: Source[]) {
  const seen = new Set<string>();
  const unique: Source[] = [];
  for (const source of sources) {
    const key = canonicalUrl(source.url);
    if (!source.url || seen.has(key)) continue;
    seen.add(key);
    unique.push(source);
  }
  return unique
    .sort((a, b) => {
      const openedDelta = Number(b.status === "opened") - Number(a.status === "opened");
      if (openedDelta) return openedDelta;
      return b.extractedTextExcerpt.length - a.extractedTextExcerpt.length;
    })
    .slice(0, 8);
}

function buildResearchContext(query: string, sources: Source[]) {
  const chunks = sources.map((source, index) => {
    const date = source.publishedDate ? `\nPublished: ${source.publishedDate}` : "";
    const highlights = source.highlights.length ? `\nHighlights:\n${source.highlights.map((h) => `- ${h}`).join("\n")}` : "";
    const text = source.extractedTextExcerpt || source.snippet || "(No page text extracted.)";
    return `[${index + 1}] ${source.title}
URL: ${source.url}${date}
Status: ${source.status}${highlights}
Content excerpt:
${text}`;
  });

  return `Research query: ${query}

Retrieved sources:
${chunks.join("\n\n---\n\n")}`;
}

function buildSynthesisPrompt(query: string, purpose: Purpose, instructions: string | undefined, sources: Source[]) {
  const sourceCount = sources.length;
  const baseRules = `Use ONLY the retrieved source content. If the sources do not support a claim, do not make it.
Use inline source markers like [1], [2] when making factual claims.
If sources are thin or conflict, say that plainly.
Prefer concrete facts, dates, names, and numbers from sources.
${isFreshQuery(query) ? "This is a freshness-sensitive query: mention dates when available and avoid stale claims." : ""}`;

  if (purpose === "google_doc") {
    return `${baseRules}

Return ONLY valid JSON. No markdown fences.
Shape:
{"title":"concise document title","body":"long-form document body with headings, paragraphs, and inline source markers"}

Write a polished Google Doc about: ${query}
Length: ${sourceCount >= 4 ? "800-1400 words" : "400-800 words"}.
Include headings inside the body. Do not include a Sources section in the body; the app will add it separately.
${instructions ? `Additional user instructions: ${instructions}` : ""}`;
  }

  if (purpose === "delegate") {
    return `${baseRules}

Return a compact research brief for a browser agent to use in later actions.
Format with short markdown bullets.
User task/research need: ${query}
${instructions ? `Additional user instructions: ${instructions}` : ""}`;
  }

  return `${baseRules}

Answer the user's question directly and concisely with markdown.
End with a "Sources" section listing the source links used.
User question: ${query}
${instructions ? `Additional user instructions: ${instructions}` : ""}`;
}

async function callAi(config: AiConfig, messages: any[]) {
  if (config.provider === "claude") {
    const systemMsg = messages.find((message) => message.role === "system");
    const nonSystem = messages.filter((message) => message.role !== "system");
    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: systemMsg?.content || undefined,
        messages: nonSystem,
      }),
    });
    return res;
  }

  return await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.model, messages }),
  });
}

function extractAiText(provider: AiProvider, data: any) {
  if (provider === "claude") return String(data?.content?.[0]?.text || "").trim();
  return String(data?.choices?.[0]?.message?.content || "").trim();
}

function parseJsonFromText(text: string) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] || trimmed.match(/(\{[\s\S]*\})/)?.[1] || trimmed).trim();
  return JSON.parse(raw);
}

function sourceListForAnswer(sources: Source[]) {
  return sources
    .slice(0, 6)
    .map((source, index) => `[${index + 1}] ${source.title}: ${source.url}`)
    .join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    await requireAuthedUser(req);

    const payload = await req.json().catch(() => ({}));
    const query = String(payload?.query || payload?.message || "").trim();
    if (!query) return json({ error: "query is required." }, 400);

    const purpose = normalizePurpose(payload?.purpose);
    const searchQuery = buildSearchQuery(query, purpose);
    const fresh = isFreshQuery(query);

    let searchData = await callExaSearch(searchQuery, purpose, fresh);
    let sources = normalizeSources(searchData?.results || []);

    if (!sources.length && fresh) {
      searchData = await callExaSearch(searchQuery, purpose, false);
      sources = normalizeSources(searchData?.results || []);
    }

    sources = rankSources(await repairThinSources(sources, query, purpose));

    if (!sources.length) {
      return json({
        answer: `I could not find enough reliable web results for "${query}".`,
        sources: [],
        searchQueries: [searchQuery],
        researchContext: "",
        query,
        engine: "Exa",
        searchUrl: `https://exa.ai/search?q=${encodeURIComponent(query)}`,
        results: [],
      });
    }

    const config = resolveAiConfig(payload?.aiProvider);
    const researchContext = buildResearchContext(query, sources);
    const messages: any[] = [
      {
        role: "system",
        content: "You are Braino's web research engine. You search, read retrieved page content, and produce grounded output with citations.",
      },
    ];

    if (Array.isArray(payload?.chatHistory) && purpose !== "google_doc") {
      for (const msg of payload.chatHistory.slice(-6)) {
        if (!msg?.role || !msg?.content) continue;
        messages.push({ role: msg.role, content: String(msg.content).slice(0, 2000) });
      }
    }

    messages.push({
      role: "user",
      content: `${buildSynthesisPrompt(query, purpose, payload?.instructions, sources)}

${researchContext}`,
    });

    const aiRes = await callAi(config, messages);
    if (!aiRes.ok) {
      const errorText = await aiRes.text();
      console.error("[web-research] AI error", aiRes.status, errorText);
      throw new Error(`AI synthesis failed: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const aiText = extractAiText(config.provider, aiData);

    let answer = aiText;
    let title: string | undefined;
    let body: string | undefined;

    if (purpose === "google_doc") {
      const parsed = parseJsonFromText(aiText);
      title = compactText(String(parsed?.title || `${query} - Braino Research`), 180);
      body = String(parsed?.body || "").trim();
      if (!body) throw new Error("Research draft came back empty.");
      answer = body;
    } else if (!/\nSources\b/i.test(answer)) {
      answer = `${answer}\n\nSources\n${sourceListForAnswer(sources)}`;
    }

    return json({
      answer,
      title,
      body,
      sources,
      searchQueries: [searchQuery],
      researchContext,
      query,
      engine: "Exa",
      searchUrl: `https://exa.ai/search?q=${encodeURIComponent(query)}`,
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
