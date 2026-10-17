/* ── Outreach Engine (2026-10-17) ─────────────────────────────────────────
 *
 * One function, because prod sits at the 100-function cap. Each request names
 * one step:
 *
 *   sources  which data sources are switched on (keys present)
 *   refine   their words -> a structured target profile + 2-3 questions back
 *   hunt     search -> one clean record per person -> rank with reasons
 *   draft    one message per person from their real moment + the offer
 *   outcome  sent / replied / booked / not_interested / opted_out / bounced
 *   edit     save an edited message
 *
 * The edge is the loop, not the data: anyone can rent Exa or Apollo. Every
 * booked call and reply is stored as an event, and the ranker's "looks like
 * your past wins" part is computed from those, so the next hunt for the same
 * user ranks differently from the first. That history is the moat.
 *
 * The ranking is deterministic on purpose. The model reads evidence and says
 * which criteria a person matches and why; arithmetic turns that into a score.
 * A score you can explain line by line is a score you can trust, tune and
 * defend, and the reasons on screen are the same numbers the sort used.
 *
 * Writes use the service role, and user_id always comes from the verified
 * token, never from the body. */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getRequestUser } from "../../_shared/require-user.ts";
import { BRAINO_TEXT_MODEL } from "../../_shared/openai-models.ts";
import { logEngineRun } from "../../_shared/engine-log.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-outreach-key",
};
const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });

const env = (k: string) => (Deno.env.get(k) || "").trim();
const OPENAI_KEY = env("OPENAI_API_KEY");
const EXA_KEY = env("EXA_API_KEY");
const APOLLO_KEY = env("APOLLO_API_KEY");
const HUNTER_KEY = env("HUNTER_API_KEY");

const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const clip = (v: unknown, n = 400) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const lower = (v: unknown) => String(v ?? "").trim().toLowerCase();

/* Spend, counted per request and stored on the brief, so a run's cost is
   visible next to its results rather than discovered on the invoice. Rates are
   approximations for display; the engine log keeps the real token counts. */
type Spend = { exa_calls: number; exa_pages: number; apollo_calls: number; hunter_calls: number; input_tokens: number; cached_tokens: number; output_tokens: number };
const newSpend = (): Spend => ({ exa_calls: 0, exa_pages: 0, apollo_calls: 0, hunter_calls: 0, input_tokens: 0, cached_tokens: 0, output_tokens: 0 });
function costUsd(s: Spend) {
  return +(s.exa_calls * 0.005 + s.exa_pages * 0.001 + s.hunter_calls * 0.01 + s.apollo_calls * 0.0
    + ((s.input_tokens - s.cached_tokens) / 1e6) * 1.25 + (s.cached_tokens / 1e6) * 0.125 + (s.output_tokens / 1e6) * 10).toFixed(4);
}

/* ── The model ─────────────────────────────────────────────────────────── */

/* Fixed instructions go first and carry a cache name, so the repeat read of a
   long system prompt is cheap (the API-cost-first rule). */
async function ai(step: string, system: string, user: string, spend: Spend, maxTokens = 4000): Promise<any> {
  if (!OPENAI_KEY) throw new Error("OPENAI_API_KEY is not set.");
  const body: Record<string, unknown> = {
    model: BRAINO_TEXT_MODEL,
    instructions: system,
    // JSON mode refuses a request whose input never says "json".
    input: `${user}\n\nReply with the json object only.`,
    reasoning: { effort: "low" },
    max_output_tokens: maxTokens,
    text: { format: { type: "json_object" } },
    prompt_cache_key: `outreach-${step}`,
    prompt_cache_retention: "24h",
  };
  const send = () => fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let res = await send();
  if (res.status === 400 && /prompt_cache/i.test(await res.clone().text().catch(() => ""))) {
    delete body.prompt_cache_key; delete body.prompt_cache_retention;
    res = await send();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`model ${res.status}: ${clip(data?.error?.message || "", 200)}`);
  const u = data?.usage || {};
  spend.input_tokens += u.input_tokens || 0;
  spend.cached_tokens += u.input_tokens_details?.cached_tokens || 0;
  spend.output_tokens += u.output_tokens || 0;
  let text = typeof data?.output_text === "string" ? data.output_text : "";
  if (!text) {
    for (const item of data?.output || []) {
      if (item?.type !== "message") continue;
      text += (item.content || []).map((c: any) => c?.text || "").join("");
    }
  }
  try { return JSON.parse(text); } catch (_) { throw new Error(`model returned unreadable JSON at ${step}`); }
}

/* ── Step 1: refine ────────────────────────────────────────────────────── */

const REFINE_SYSTEM = `You turn a founder's description of who they want to sell to into a precise target profile for B2B outreach.

Return JSON only:
{
  "title": "short name for this search, 3-6 words",
  "summary": "one sentence: who, where, why now",
  "roles": ["job titles of the person who decides or feels the pain"],
  "seniority": ["founder","c_level","vp","director","manager","individual"],
  "industries": ["..."],
  "company_size": {"min_employees": number|null, "max_employees": number|null, "revenue": "text or empty"},
  "locations": ["countries or cities"],
  "keywords": ["words that would appear on a matching company's site or a person's profile"],
  "signals": ["buying signals worth more than fit alone, e.g. raised funding in last 90 days, hiring a growth marketer"],
  "exclude_companies": ["named competitors or existing customers to skip"],
  "exclude_traits": ["traits that disqualify"],
  "pain": "the problem the offer solves for them, in their words",
  "search_queries": ["4-6 natural-language web searches that would surface matching PEOPLE or COMPANIES, each specific"],
  "questions": ["at most 3 short questions whose answers would change who gets picked. Empty if the brief is already precise."]
}

Rules: be specific, never invent constraints the founder did not imply, prefer the decision maker over the user of the product, and write plainly with no em dashes.`;

async function refine(userId: string, body: any, spend: Spend) {
  const ask = clip(body.ask, 3000);
  const offer = clip(body.offer, 2000);
  const answers = Array.isArray(body.answers) ? body.answers.map((a: any) => `Q: ${clip(a.q, 200)}\nA: ${clip(a.a, 400)}`).join("\n") : "";
  if (!ask) return json({ error: "Say who you want to sell to." }, 400);
  const icp = await ai("refine", REFINE_SYSTEM, `Who they want to sell to:\n${ask}\n\nWhat they sell:\n${offer || "(not given)"}\n${answers ? `\nTheir answers so far:\n${answers}` : ""}`, spend, 2500);
  const questions = answers ? [] : (Array.isArray(icp.questions) ? icp.questions.slice(0, 3) : []);
  const client = db();
  const row = { user_id: userId, title: clip(icp.title, 80) || clip(ask, 60), ask, offer, icp, questions, status: "draft", updated_at: new Date().toISOString() };
  const q = body.brief_id
    ? client.from("outreach_briefs").update(row).eq("id", body.brief_id).eq("user_id", userId).select().single()
    : client.from("outreach_briefs").insert(row).select().single();
  const { data, error } = await q;
  if (error) throw error;
  return json({ brief: data, cost_usd: costUsd(spend) });
}

/* ── Step 2: hunt (sources) ────────────────────────────────────────────── */

type Find = { source: string; url: string; title: string; text: string; date?: string | null; image?: string };

async function exaSearch(query: string, category: string | null, n: number, spend: Spend, sinceDays?: number): Promise<Find[]> {
  if (!EXA_KEY) return [];
  const payload: Record<string, unknown> = {
    query, type: "auto", numResults: n,
    contents: { text: { maxCharacters: 900 }, highlights: { numSentences: 2 } },
  };
  if (category) payload.category = category;
  if (sinceDays) payload.startPublishedDate = new Date(Date.now() - sinceDays * 864e5).toISOString();
  spend.exa_calls += 1;
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST", headers: { "x-api-key": EXA_KEY, "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // An unknown category is refused rather than ignored: retry without it.
    if (category && res.status === 400) return exaSearch(query, null, n, spend, sinceDays);
    return [];
  }
  const data = await res.json().catch(() => ({}));
  const results = Array.isArray(data?.results) ? data.results : [];
  spend.exa_pages += results.length;
  return results.map((r: any) => ({
    source: category ? `exa:${category}` : "exa",
    url: String(r.url || ""),
    title: clip(r.title, 160),
    text: clip([...(r.highlights || []), r.text].filter(Boolean).join(" "), 900),
    date: r.publishedDate || null,
    image: typeof r.image === "string" ? r.image : "",
  }));
}

/* A real profile photo from the person's own result. LinkedIn's grey
   placeholder lives on static.licdn.com and is not a photo of anyone. It is a
   link to the public picture, never a copy, and LinkedIn's links expire, so
   the page falls back to initials when one stops loading. */
function photoFrom(finds: Find[]) {
  for (const f of finds) {
    const img = String(f.image || "");
    if (!/^https:\/\//.test(img) || /static\.licdn\.com/.test(img)) continue;
    if (f.source === "exa:people" || /profile-displayphoto/.test(img)) return img.slice(0, 600);
  }
  return "";
}

async function apolloSearch(icp: any, spend: Spend): Promise<Find[]> {
  if (!APOLLO_KEY) return [];
  spend.apollo_calls += 1;
  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: { "x-api-key": APOLLO_KEY, "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify({
      person_titles: (icp.roles || []).slice(0, 8),
      person_locations: (icp.locations || []).slice(0, 5),
      q_keywords: (icp.keywords || []).slice(0, 4).join(" "),
      per_page: 25, page: 1,
    }),
  }).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json().catch(() => ({}));
  return (data?.people || []).map((p: any) => ({
    source: "apollo",
    url: String(p.linkedin_url || p.organization?.website_url || ""),
    title: clip(`${p.name || ""}, ${p.title || ""} at ${p.organization?.name || ""}`, 160),
    text: clip(`${p.name}; ${p.title}; ${p.organization?.name}; ${p.organization?.industry || ""}; ${p.organization?.estimated_num_employees || ""} employees; ${p.city || ""} ${p.country || ""}; email ${p.email || "unknown"} (${p.email_status || "unknown"}); domain ${p.organization?.primary_domain || ""}`, 900),
    date: null,
  }));
}

async function hunterFind(name: string, domain: string, spend: Spend): Promise<{ email: string; status: string } | null> {
  if (!HUNTER_KEY || !name || !domain) return null;
  const [first, ...rest] = name.split(/\s+/);
  const last = rest.pop() || "";
  if (!first || !last) return null;
  spend.hunter_calls += 1;
  const url = `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(first)}&last_name=${encodeURIComponent(last)}&api_key=${HUNTER_KEY}`;
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;
  const d = (await res.json().catch(() => ({})))?.data;
  if (!d?.email) return null;
  const status = d?.verification?.status === "valid" ? "verified" : (d.score >= 80 ? "guessed" : "unknown");
  return { email: String(d.email), status };
}

/* ── Step 3: build one clean record per person ─────────────────────────── */

const EXTRACT_SYSTEM = `You build B2B lead records from raw search results. You are strict about evidence.

You get a target profile and numbered search results (people pages, company pages, news). Return JSON only:
{
  "leads": [{
    "name": "full name of a real person, never a placeholder",
    "title": "their current role",
    "seniority": "founder|c_level|vp|director|manager|individual",
    "company": "company name",
    "company_domain": "example.com or empty",
    "industry": "...",
    "company_size": "e.g. 11-50, or empty",
    "location": "city, country or empty",
    "email": "only if it literally appears in a result, else empty",
    "linkedin_url": "only if it appears in a result, else empty",
    "website": "company site if known",
    "summary": "one sentence on who they are and why they might care",
    "match": {
      "role": {"score": 0|0.5|1, "why": "short evidence"},
      "industry": {"score": 0|0.5|1, "why": "..."},
      "size": {"score": 0|0.5|1, "why": "..."},
      "location": {"score": 0|0.5|1, "why": "..."},
      "pain": {"score": 0|0.5|1, "why": "evidence they have the problem the offer solves"}
    },
    "signals": [{"kind": "funding|hiring|launch|leadership|growth|complaint|content|other", "text": "what happened", "date": "YYYY-MM-DD or empty", "url": "result url"}],
    "source_ids": [result numbers used],
    "excluded": false,
    "exclude_reason": ""
  }]
}

Rules:
- Only people or companies the results actually show. Never invent a person, email or URL.
- If a result is a company with no named person, include the company's most likely decision maker ONLY if a result names them; otherwise skip it.
- Link news results to a lead as signals when they are clearly about that company.
- Mark excluded true for listed competitors, existing customers, or disqualifying traits, with the reason.
- Merge the same person seen in several results into one lead.
- Up to 40 leads. Plain words, no em dashes.`;

/* ── Step 4: rank, with reasons ────────────────────────────────────────── */

const SENIORITY_RANK: Record<string, number> = { founder: 5, c_level: 5, vp: 4, director: 3, manager: 2, individual: 1 };

function sizeBucket(size: string) {
  const n = parseInt(String(size).replace(/[^0-9]/g, "").slice(0, 6), 10);
  if (!n) return "";
  return n <= 10 ? "1-10" : n <= 50 ? "11-50" : n <= 200 ? "51-200" : n <= 1000 ? "201-1000" : "1000+";
}

function featuresOf(l: any) {
  return {
    industry: lower(l.industry),
    seniority: lower(l.seniority),
    size: sizeBucket(l.company_size),
    country: lower(String(l.location || "").split(",").pop()),
    signal_kinds: [...new Set((l.signals || []).map((s: any) => lower(s.kind)).filter(Boolean))],
  };
}

/* "Looks like your past wins": the share of past booked/replied leads this
   one resembles, by the same features. Booked counts double a reply. With
   fewer than three outcomes there is nothing honest to learn from yet, so the
   part is left out and its weight goes to the others. */
type Win = { f: ReturnType<typeof featuresOf>; w: number };
function lookalike(f: ReturnType<typeof featuresOf>, wins: Win[]) {
  if (wins.length < 3) return null;
  let total = 0, got = 0;
  for (const win of wins) {
    let s = 0, parts = 0;
    for (const k of ["industry", "seniority", "size", "country"] as const) {
      if (!win.f[k]) continue;
      parts += 1;
      if (win.f[k] === f[k]) s += 1;
    }
    if (win.f.signal_kinds.length) {
      parts += 1;
      if (win.f.signal_kinds.some((k) => f.signal_kinds.includes(k))) s += 1;
    }
    if (!parts) continue;
    total += win.w; got += win.w * (s / parts);
  }
  return total ? got / total : null;
}

function timing(signals: any[]) {
  let best = 0;
  for (const s of signals || []) {
    const t = Date.parse(s?.date || "");
    if (!t) { best = Math.max(best, 0.3); continue; }
    const days = (Date.now() - t) / 864e5;
    best = Math.max(best, days <= 30 ? 1 : days <= 90 ? 0.75 : days <= 180 ? 0.45 : 0.2);
  }
  return best;
}

function reach(l: any) {
  if (l.email && l.email_status === "verified") return 1;
  if (l.email) return 0.65;
  if (l.linkedin_url) return 0.5;
  if (l.website || l.company_domain) return 0.3;
  return 0.1;
}

function rank(l: any, wins: Win[]) {
  const m = l.match || {};
  const crit = [["role", 0.3], ["pain", 0.25], ["industry", 0.2], ["size", 0.15], ["location", 0.1]] as const;
  let fit = 0;
  for (const [k, w] of crit) fit += w * Math.max(0, Math.min(1, Number(m[k]?.score) || 0));
  // The decision maker is worth more than someone who merely fits.
  fit = Math.min(1, fit + (SENIORITY_RANK[lower(l.seniority)] >= 4 ? 0.05 : 0));
  const f = featuresOf(l);
  const parts: Record<string, number | null> = { fit, timing: timing(l.signals), reach: reach(l), lookalike: lookalike(f, wins) };
  const weights = parts.lookalike === null
    ? { fit: 0.55, timing: 0.28, reach: 0.17, lookalike: 0 }
    : { fit: 0.45, timing: 0.25, reach: 0.15, lookalike: 0.15 };
  const score = Math.round(100 * (weights.fit * fit + weights.timing * (parts.timing || 0) + weights.reach * (parts.reach || 0) + weights.lookalike * (parts.lookalike || 0)));

  const reasons: string[] = [];
  for (const [k] of crit) if ((Number(m[k]?.score) || 0) >= 1 && m[k]?.why) reasons.push(clip(m[k].why, 140));
  const fresh = (l.signals || []).filter((s: any) => s?.text).slice(0, 2);
  for (const s of fresh) reasons.push(`${clip(s.text, 120)}${s.date ? ` (${s.date})` : ""}`);
  if (l.email && l.email_status === "verified") reasons.push("Verified email");
  else if (!l.email && !l.linkedin_url) reasons.push("Hard to reach: no email or profile found yet");
  if (parts.lookalike !== null && (parts.lookalike as number) >= 0.6) reasons.push("Looks like the people who booked calls with you before");
  return { score, parts: { ...parts, weights }, reasons: reasons.slice(0, 6), features: f };
}

function dedupeKey(l: any) {
  return lower(l.linkedin_url).replace(/\/$/, "") || lower(l.email) || `${lower(l.name)}|${lower(l.company)}`;
}

async function hunt(userId: string, body: any, spend: Spend) {
  const client = db();
  const { data: brief, error } = await client.from("outreach_briefs").select("*").eq("id", body.brief_id).eq("user_id", userId).single();
  if (error || !brief) return json({ error: "Brief not found." }, 404);
  const icp = brief.icp || {};
  await client.from("outreach_briefs").update({ status: "hunting", updated_at: new Date().toISOString() }).eq("id", brief.id);

  try {
    // Search wide, in parallel: people pages, company pages, and fresh news for signals.
    const queries: string[] = (icp.search_queries || []).slice(0, 6);
    const signalQuery = [...(icp.signals || []).slice(0, 2), ...(icp.industries || []).slice(0, 1), ...(icp.locations || []).slice(0, 1)].join(" ");
    const jobs: Promise<Find[]>[] = [];
    queries.forEach((q, i) => jobs.push(exaSearch(q, i % 2 === 0 ? "people" : "company", 10, spend)));
    if (signalQuery) jobs.push(exaSearch(signalQuery, "news", 10, spend, 180));
    jobs.push(apolloSearch(icp, spend));
    const found = (await Promise.all(jobs)).flat().filter((f) => f.url || f.text);
    const seen = new Set<string>();
    const finds = found.filter((f) => { const k = f.url || f.title; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 70);
    if (!finds.length) {
      await client.from("outreach_briefs").update({ status: "failed", stats: { error: EXA_KEY || APOLLO_KEY ? "No results for these searches." : "No data source is switched on." } }).eq("id", brief.id);
      return json({ error: EXA_KEY || APOLLO_KEY ? "Nothing found. Try a wider brief." : "No data source is switched on (EXA_API_KEY or APOLLO_API_KEY)." }, 422);
    }

    const numbered = finds.map((f, i) => `[${i + 1}] (${f.source}${f.date ? `, ${String(f.date).slice(0, 10)}` : ""}) ${f.title}\n${f.url}\n${f.text}`).join("\n\n");
    const extracted = await ai("extract", EXTRACT_SYSTEM, `Target profile:\n${JSON.stringify(icp)}\n\nWhat they sell:\n${brief.offer || "(not given)"}\n\nSearch results:\n${numbered}`, spend, 9000);
    const leads: any[] = Array.isArray(extracted?.leads) ? extracted.leads.filter((l: any) => clip(l?.name, 80)) : [];

    // Past wins for this user, across every brief: the learning part.
    const { data: winRows } = await client.from("outreach_leads").select("features,status").eq("user_id", userId).in("status", ["booked", "replied"]).limit(500);
    const wins: Win[] = (winRows || []).map((r: any) => ({ f: { signal_kinds: [], ...(r.features || {}) }, w: r.status === "booked" ? 2 : 1 }));

    const { data: sup } = await client.from("outreach_suppression").select("key").eq("user_id", userId);
    const suppressed = new Set((sup || []).map((s: any) => lower(s.key)));
    const excludeCos = (icp.exclude_companies || []).map(lower).filter(Boolean);

    // Email for the strongest few only: finding emails costs per call.
    const pre = leads.map((l) => ({ l, r: rank(l, wins) })).sort((a, b) => b.r.score - a.r.score);
    for (const { l } of pre.slice(0, 12)) {
      if (l.email) { l.email_status = "guessed"; continue; }
      const found = await hunterFind(clip(l.name, 80), lower(l.company_domain), spend);
      if (found) { l.email = found.email; l.email_status = found.status; }
    }

    const rows = leads.map((l) => {
      const r = rank(l, wins);
      const used: Find[] = (Array.isArray(l.source_ids) ? l.source_ids : []).map((n: number) => finds[n - 1]).filter(Boolean);
      const sourcesUsed = used.map((f: Find) => ({ name: f.source, url: f.url, title: f.title }));
      let discard = l.excluded ? clip(l.exclude_reason, 160) || "Excluded by your brief" : "";
      const keys = [lower(l.email), lower(l.company_domain), lower(l.linkedin_url)].filter(Boolean);
      if (!discard && keys.some((k) => suppressed.has(k))) discard = "On your do-not-contact list";
      if (!discard && excludeCos.some((c: string) => lower(l.company).includes(c))) discard = "Competitor or existing customer";
      if (!discard && (r.parts.fit as number) < 0.35) discard = "Weak fit for this brief";
      return {
        user_id: userId, brief_id: brief.id, dedupe_key: dedupeKey(l),
        name: clip(l.name, 120), title: clip(l.title, 160), seniority: clip(l.seniority, 30),
        company: clip(l.company, 160), company_domain: lower(l.company_domain).slice(0, 120),
        industry: clip(l.industry, 120), company_size: clip(l.company_size, 40), location: clip(l.location, 120),
        email: clip(l.email, 160), email_status: l.email ? (l.email_status || "guessed") : "unknown",
        linkedin_url: clip(l.linkedin_url, 300), website: clip(l.website, 300), summary: clip(l.summary, 400), photo_url: photoFrom(used),
        signals: (l.signals || []).slice(0, 6), sources: sourcesUsed.slice(0, 6), features: r.features,
        score: r.score, score_parts: r.parts, reasons: r.reasons, discarded: Boolean(discard), discard_reason: discard,
        updated_at: new Date().toISOString(),
      };
    });
    const unique = [...new Map(rows.map((r) => [r.dedupe_key, r])).values()];
    if (unique.length) {
      const { error: upErr } = await client.from("outreach_leads").upsert(unique, { onConflict: "user_id,brief_id,dedupe_key" });
      if (upErr) throw upErr;
    }
    const stats = {
      searched: finds.length, found: unique.length,
      kept: unique.filter((r) => !r.discarded).length, discarded: unique.filter((r) => r.discarded).length,
      learned_from: wins.length, cost_usd: costUsd(spend), spend, at: new Date().toISOString(),
    };
    await client.from("outreach_briefs").update({ status: "ready", stats, updated_at: new Date().toISOString() }).eq("id", brief.id);
    return json({ ok: true, stats });
  } catch (e) {
    await client.from("outreach_briefs").update({ status: "failed", stats: { error: clip((e as Error)?.message, 300) } }).eq("id", brief.id);
    throw e;
  }
}

/* ── Step 5: draft ─────────────────────────────────────────────────────── */

const DRAFT_SYSTEM = `You write first-touch outreach for a founder. Each message is for one real person and must read like the founder wrote it to them alone.

Return JSON only:
{"drafts": [{"id": "lead id", "channel": "email|linkedin|whatsapp|x|instagram", "subject": "email subject, under 7 words, lowercase is fine, empty for non-email", "body": "the message", "followups": ["day 3 nudge", "day 7 last note"]}]}

How to write:
- Open with their real moment: a signal, their role, something they said or built. Never "I hope this finds you well".
- Tie the offer to the pain that moment implies. One idea. One small ask (a 15-minute call, or a yes/no question).
- 50-90 words for email, under 300 characters for LinkedIn. Follow-ups under 40 words, each adding something new.
- Plain, warm, direct. No buzzwords, no flattery, no em dashes, no exclamation marks.
- Email ends with one short line letting them opt out (e.g. "If this is not for you, just say so and I will not write again.").
- Channel: email when an email is known, otherwise linkedin when a profile is known, otherwise email to the company.
- Never invent facts about them. Use only what the lead record says.`;

async function draft(userId: string, body: any, spend: Spend) {
  const client = db();
  const { data: brief } = await client.from("outreach_briefs").select("*").eq("id", body.brief_id).eq("user_id", userId).single();
  if (!brief) return json({ error: "Brief not found." }, 404);
  let q = client.from("outreach_leads").select("*").eq("brief_id", brief.id).eq("user_id", userId).eq("discarded", false);
  q = Array.isArray(body.lead_ids) && body.lead_ids.length ? q.in("id", body.lead_ids.slice(0, 25)) : q.eq("status", "new").order("score", { ascending: false }).limit(Math.min(25, Number(body.limit) || 12));
  const { data: leads } = await q;
  if (!leads?.length) return json({ ok: true, drafted: 0 });
  const compact = leads.map((l: any) => ({
    id: l.id, name: l.name, title: l.title, company: l.company, industry: l.industry, location: l.location,
    has_email: Boolean(l.email), has_linkedin: Boolean(l.linkedin_url), summary: l.summary,
    signals: (l.signals || []).slice(0, 3), why_picked: (l.reasons || []).slice(0, 3),
  }));
  const out = await ai("draft", DRAFT_SYSTEM, `The founder sells:\n${brief.offer || brief.icp?.pain || "(not given)"}\n\nThe pain it solves:\n${brief.icp?.pain || ""}\n\nWrite to each of these people:\n${JSON.stringify(compact)}`, spend, 8000);
  const byId = new Map((out?.drafts || []).map((d: any) => [String(d.id), d]));
  let drafted = 0;
  for (const l of leads) {
    const d: any = byId.get(String(l.id));
    if (!d?.body) continue;
    const message = { channel: clip(d.channel, 20) || (l.email ? "email" : "linkedin"), subject: clip(d.subject, 120), body: String(d.body).replace(/[—–]/g, ",").trim().slice(0, 2000), followups: (d.followups || []).slice(0, 2).map((f: any) => clip(f, 400)) };
    await client.from("outreach_leads").update({ message, status: l.status === "new" ? "drafted" : l.status, updated_at: new Date().toISOString() }).eq("id", l.id);
    drafted += 1;
  }
  return json({ ok: true, drafted, cost_usd: costUsd(spend) });
}

/* ── Outcomes: what the learning loop reads ────────────────────────────── */

const OUTCOMES = new Set(["sent", "replied", "booked", "not_interested", "opted_out", "bounced"]);

async function outcome(userId: string, body: any) {
  const kind = String(body.kind || "");
  if (!OUTCOMES.has(kind)) return json({ error: "Unknown outcome." }, 400);
  const client = db();
  const { data: lead } = await client.from("outreach_leads").select("*").eq("id", body.lead_id).eq("user_id", userId).single();
  if (!lead) return json({ error: "Lead not found." }, 404);
  await client.from("outreach_events").insert({ user_id: userId, lead_id: lead.id, kind, note: clip(body.note, 500) });
  const status = kind === "bounced" ? lead.status : kind;
  await client.from("outreach_leads").update({ status, updated_at: new Date().toISOString(), ...(kind === "bounced" ? { email_status: "unknown" } : {}) }).eq("id", lead.id);
  // Opting out is permanent and covers every future brief.
  if (kind === "opted_out" || kind === "bounced") {
    const keys = kind === "bounced" ? [lower(lead.email)] : [lower(lead.email), lower(lead.linkedin_url)];
    const rows = keys.filter(Boolean).map((key) => ({ user_id: userId, key, reason: kind }));
    if (rows.length) await client.from("outreach_suppression").upsert(rows, { onConflict: "user_id,key" });
  }
  return json({ ok: true, status });
}

async function edit(userId: string, body: any) {
  const m = body.message || {};
  const message = { channel: clip(m.channel, 20), subject: clip(m.subject, 120), body: String(m.body || "").slice(0, 2000), followups: (m.followups || []).slice(0, 2).map((f: any) => clip(f, 400)) };
  const { error } = await db().from("outreach_leads").update({ message, updated_at: new Date().toISOString() }).eq("id", body.lead_id).eq("user_id", userId);
  if (error) throw error;
  return json({ ok: true });
}

/* ── The founder's personal key (testing mode) ──────────────────────────
   Localhost, no sign-in screen: the dev page sends OUTREACH_DEV_TOKEN in a
   header and the engine acts as OUTREACH_DEV_USER_ID. Still a lock, just one
   only the founder holds: without the exact key every request is refused, and
   the key never ships in the live site's code. Both secrets unset = off. */
const DEV_TOKEN = env("OUTREACH_DEV_TOKEN");
const DEV_USER_ID = env("OUTREACH_DEV_USER_ID");
function sameSecret(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function requestOwner(req: Request) {
  const user = await getRequestUser(req);
  if (user) return user.id;
  if (DEV_TOKEN.length >= 32 && DEV_USER_ID && sameSecret(req.headers.get("x-outreach-key") || "", DEV_TOKEN)) return DEV_USER_ID;
  return "";
}

/* Reads, for the personal-key page: row level security only knows signed-in
   sessions, so without one the page reads through here instead. */
async function listBriefs(owner: string) {
  const { data, error } = await db().from("outreach_briefs").select("*").eq("user_id", owner).order("updated_at", { ascending: false }).limit(50);
  if (error) throw error;
  return json({ briefs: data || [] });
}
async function listLeads(owner: string, body: any) {
  const { data, error } = await db().from("outreach_leads").select("*").eq("user_id", owner).eq("brief_id", body.brief_id).order("score", { ascending: false }).limit(500);
  if (error) throw error;
  return json({ leads: data || [] });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const started = Date.now();
  const spend = newSpend();
  let step = "";
  try {
    const owner = await requestOwner(req);
    if (!owner) return json({ error: "Sign in to use outreach." }, 401);
    const user = { id: owner };
    const body = await req.json().catch(() => ({}));
    step = String(body.step || "");
    let res: Response;
    if (step === "sources") res = json({ exa: Boolean(EXA_KEY), apollo: Boolean(APOLLO_KEY), hunter: Boolean(HUNTER_KEY), model: Boolean(OPENAI_KEY) });
    else if (step === "list_briefs") res = await listBriefs(user.id);
    else if (step === "list_leads") res = await listLeads(user.id, body);
    else if (step === "refine") res = await refine(user.id, body, spend);
    else if (step === "hunt") res = await hunt(user.id, body, spend);
    else if (step === "draft") res = await draft(user.id, body, spend);
    else if (step === "outcome") res = await outcome(user.id, body);
    else if (step === "edit") res = await edit(user.id, body);
    else res = json({ error: "Unknown step." }, 400);
    if (["refine", "hunt", "draft"].includes(step)) {
      logEngineRun({ engine: `outreach-${step}`, command: clip(body.ask || body.brief_id || "", 300), response: { status: res.status, spend, cost_usd: costUsd(spend) }, verdict: res.ok ? "ok" : `http:${res.status}`, model: BRAINO_TEXT_MODEL, usage: { input_tokens: spend.input_tokens, output_tokens: spend.output_tokens }, elapsed_ms: Date.now() - started } as any);
    }
    return res;
  } catch (e) {
    console.error("outreach-engine", step, e);
    return json({ error: clip((e as Error)?.message || "Something went wrong.", 300) }, 500);
  }
});
