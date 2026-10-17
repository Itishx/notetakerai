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
import { buildCalendarOAuthState, getCalendarConnection, getCalendarOAuthEnv, getValidCalendarAccessToken } from "../../_shared/google-calendar.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-outreach-key, x-outreach-cron",
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

/* ── Product context: what is being sold, down to the detail ────────────
   Read from the founder's website (the page and its main subpages), their
   notes, uploaded text documents, and answers to Braino's questions. Every
   search and every message reads this, and Distra's posts will read the same
   record, so a message never has to guess what the product is. */

const PRODUCT_SYSTEM = `You write the definitive internal report on a product, for the people who will sell and market it. Be specific and concrete; quote real details from the sources. Never invent features, prices, customers or numbers: if something is not in the sources, leave it empty and ask about it.

Return JSON only:
{
  "name": "product name",
  "one_liner": "what it is in one plain sentence",
  "what_it_is": "3-5 sentences: what it does and how, in plain words",
  "who_its_for": ["specific buyer types"],
  "problem": "the pain it removes, in the buyer's words",
  "how_it_works": ["step by step, as the user experiences it"],
  "features": [{"name": "...", "detail": "what it actually does"}],
  "outcomes": ["what changes for the buyer after using it"],
  "proof": ["real traction, customers, numbers, testimonials, press: only from sources"],
  "pricing": "plans and prices if stated, else empty",
  "differentiators": ["why this over the alternatives"],
  "alternatives": ["what buyers use today instead"],
  "objections": [{"objection": "...", "answer": "..."}],
  "tone": "how the brand sounds, from its own writing",
  "words_to_use": ["phrases the brand uses"],
  "words_to_avoid": ["claims not to make, or jargon the brand avoids"],
  "call_to_action": "what a prospect should do next",
  "status": "live, beta, waitlist, or unknown, from the sources",
  "gaps": ["at most 5 short questions whose answers would most improve outreach, e.g. pricing, proof, who buys"]
}

Plain words, no em dashes.`;

async function exaContents(url: string, spend: Spend) {
  if (!EXA_KEY || !url) return "";
  spend.exa_calls += 1;
  const res = await fetch("https://api.exa.ai/contents", {
    method: "POST", headers: { "x-api-key": EXA_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ urls: [url], text: { maxCharacters: 9000 }, subpages: 6, subpageTarget: ["about", "pricing", "features", "product", "customers", "faq"], livecrawl: "preferred" }),
  }).catch(() => null);
  if (!res?.ok) return "";
  const data = await res.json().catch(() => ({}));
  const pages: string[] = [];
  for (const r of data?.results || []) {
    pages.push(`PAGE ${r.url}\n${clip(r.text, 9000)}`);
    for (const sp of r.subpages || []) pages.push(`PAGE ${sp.url}\n${clip(sp.text, 5000)}`);
  }
  spend.exa_pages += pages.length;
  return pages.join("\n\n").slice(0, 45000);
}

function normalUrl(u: string) {
  const t = String(u || "").trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

async function productList(userId: string) {
  const { data, error } = await db().from("product_contexts").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20);
  if (error) throw error;
  return json({ products: data || [] });
}

/* Save what they gave, then read it all and write the report. */
async function productBuild(userId: string, body: any, spend: Spend) {
  const client = db();
  const docs = (Array.isArray(body.docs) ? body.docs : []).slice(0, 8).map((d: any) => ({ name: clip(d.name, 120), text: String(d.text || "").slice(0, 30000) })).filter((d: any) => d.text);
  const fields: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString(), status: "reading" };
  if (body.name !== undefined) fields.name = clip(body.name, 120);
  if (body.website !== undefined) fields.website = normalUrl(body.website).slice(0, 300);
  if (body.notes !== undefined) fields.notes = String(body.notes || "").slice(0, 20000);
  if (body.docs !== undefined) fields.docs = docs;
  if (body.answers !== undefined) fields.answers = (Array.isArray(body.answers) ? body.answers : []).map((a: any) => ({ q: clip(a.q, 300), a: clip(a.a, 1500) })).filter((a: any) => a.a);
  const saved = body.product_id
    ? await client.from("product_contexts").update(fields).eq("id", body.product_id).eq("user_id", userId).select().single()
    : await client.from("product_contexts").insert(fields).select().single();
  if (saved.error || !saved.data) throw saved.error || new Error("Could not save the product.");
  const p = saved.data;
  try {
    const site = await exaContents(p.website, spend);
    if (!site && !p.notes && !(p.docs || []).length && !(p.answers || []).length) {
      await client.from("product_contexts").update({ status: "draft" }).eq("id", p.id);
      return json({ error: "Give me a website, some notes, or a document to read." }, 400);
    }
    const parts = [
      p.name ? `Product name: ${p.name}` : "",
      site ? `WEBSITE\n${site}` : (p.website ? `(Website ${p.website} could not be read.)` : ""),
      p.notes ? `FOUNDER'S NOTES\n${p.notes}` : "",
      ...(p.docs || []).map((d: any) => `DOCUMENT ${d.name}\n${String(d.text).slice(0, 20000)}`),
      (p.answers || []).length ? `FOUNDER'S ANSWERS\n${(p.answers || []).map((a: any) => `Q: ${a.q}\nA: ${a.a}`).join("\n")}` : "",
    ].filter(Boolean).join("\n\n");
    const report = await ai("product", PRODUCT_SYSTEM, parts.slice(0, 90000), spend, 6000);
    const answered = new Set((p.answers || []).map((a: any) => lower(a.q)));
    const questions = (Array.isArray(report.gaps) ? report.gaps : []).filter((q: string) => !answered.has(lower(q))).slice(0, 5);
    const { data, error } = await client.from("product_contexts").update({
      report, questions, status: "ready", name: p.name || clip(report.name, 120), updated_at: new Date().toISOString(),
    }).eq("id", p.id).select().single();
    if (error) throw error;
    return json({ product: data, cost_usd: costUsd(spend) });
  } catch (e) {
    await client.from("product_contexts").update({ status: "failed" }).eq("id", p.id);
    throw e;
  }
}

/* What a prompt needs to know about the product, compact. */
function productBrief(report: any) {
  if (!report || !Object.keys(report).length) return "";
  const r = report;
  const list = (xs: any) => (Array.isArray(xs) ? xs.map((x: any) => (typeof x === "string" ? x : Object.values(x).join(": "))).join("; ") : "");
  return [
    `Product: ${r.name || ""}. ${r.one_liner || ""}`,
    r.what_it_is ? `What it is: ${r.what_it_is}` : "",
    r.problem ? `Problem it removes: ${r.problem}` : "",
    list(r.who_its_for) ? `For: ${list(r.who_its_for)}` : "",
    list(r.features) ? `Features: ${list(r.features)}` : "",
    list(r.outcomes) ? `Outcomes: ${list(r.outcomes)}` : "",
    list(r.proof) ? `Proof: ${list(r.proof)}` : "Proof: none stated, so claim none.",
    r.pricing ? `Pricing: ${r.pricing}` : "",
    list(r.differentiators) ? `Why this: ${list(r.differentiators)}` : "",
    r.status ? `Status: ${r.status}` : "",
    r.tone ? `Tone: ${r.tone}` : "",
    list(r.words_to_avoid) ? `Never say: ${list(r.words_to_avoid)}` : "",
    r.call_to_action ? `Ask for: ${r.call_to_action}` : "",
  ].filter(Boolean).join("\n");
}

async function productFor(client: any, userId: string, productId: string | null | undefined) {
  if (!productId) return null;
  const { data } = await client.from("product_contexts").select("report").eq("id", productId).eq("user_id", userId).single();
  return data?.report || null;
}

async function refine(userId: string, body: any, spend: Spend) {
  const ask = clip(body.ask, 3000);
  const offer = clip(body.offer, 2000);
  const answers = Array.isArray(body.answers) ? body.answers.map((a: any) => `Q: ${clip(a.q, 200)}\nA: ${clip(a.a, 400)}`).join("\n") : "";
  if (!ask) return json({ error: "Say who you want to sell to." }, 400);
  const client = db();
  const productId = body.product_id ? String(body.product_id) : null;
  const product = productBrief(await productFor(client, userId, productId));
  const icp = await ai("refine", REFINE_SYSTEM, `Who they want to sell to:\n${ask}\n\nWhat they sell:\n${offer || "(see the product report)"}\n${product ? `\nThe product, in detail:\n${product}\n` : ""}${answers ? `\nTheir answers so far:\n${answers}` : ""}`, spend, 2500);
  const questions = answers ? [] : (Array.isArray(icp.questions) ? icp.questions.slice(0, 3) : []);
  const row = { user_id: userId, title: clip(icp.title, 80) || clip(ask, 60), ask, offer, icp, questions, status: "draft", product_id: productId, updated_at: new Date().toISOString() };
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


/* ── Finding contacts and emails (2026-10-17) ────────────────────────────
   First, always, and free: open the company's own website (home, plus the
   contact and about pages it links to) and read the raw pages for emails,
   phone numbers, WhatsApp links and Instagram. Raw HTML, not a search
   engine's cleaned copy, because the cleaned copy drops mailto links and
   Cloudflare-hidden addresses; that is why the first version found nothing.
   Then, in order of trust:
     found    an address on their site that matches the person's name
     verified Prospeo (pay per valid email, ~1 cent), then Hunter if set
     guessed  the company's own pattern (seen on its site) applied to them
     company  the company's general inbox from its site
   Every email keeps how it was found. */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JUNK_EMAIL = /(example\.|sentry|wixpress|godaddy|yourname|youremail|domain\.com|@2x|u003e|\.(png|jpe?g|gif|webp|svg|css|m?js|woff2?)$|\.(m?js|css)@|no-?reply|mailer|privacy@|abuse@|webmaster@)/i;
const GENERIC_LOCAL = new Set(["info", "hello", "hi", "contact", "support", "team", "sales", "hr", "admin", "careers", "jobs", "press", "media", "care", "help", "helpdesk", "enquiries", "enquiry", "marketing", "office", "mail", "customercare", "business", "partnerships", "connect", "founders", "founder", "globalsales"]);
const SOCIAL_HOST = /(linkedin|facebook|instagram|twitter|x\.com|youtube|crunchbase|tracxn|glassdoor|wikipedia|medium|github\.com)/i;
const BEST_INBOX = ["founders", "founder", "hello", "hi", "business", "partnerships", "contact", "team", "info", "globalsales", "sales", "marketing", "connect"];

function nameParts(name: string) {
  const p = lower(name).replace(/\(.*?\)/g, "").replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);
  return { first: p[0] || "", last: p.length > 1 ? p[p.length - 1] : "" };
}
function isPersonLocal(local: string, first: string, last: string) {
  const l = lower(local).replace(/[^a-z]/g, "");
  if (!first || !l) return false;
  return l === first || l === first + last || l === last + first || Boolean(last && (l === first[0] + last || l === first + last[0] || (l.includes(first) && l.includes(last))));
}
function patternOf(local: string) {
  const l = lower(local);
  if (GENERIC_LOCAL.has(l)) return "";
  if (/^[a-z]+\.[a-z]+$/.test(l)) return "first.last";
  if (/^[a-z]+_[a-z]+$/.test(l)) return "first_last";
  if (/^[a-z]{3,12}$/.test(l)) return "first";
  return "";
}
function applyPattern(p: string, first: string, last: string, domain: string) {
  if (!first) return "";
  if (p === "first") return `${first}@${domain}`;
  if (!last) return "";
  if (p === "first.last") return `${first}.${last}@${domain}`;
  if (p === "first_last") return `${first}_${last}@${domain}`;
  return "";
}
function hostOf(u: string) {
  try { return new URL(normalUrl(u)).hostname.replace(/^www\./, ""); } catch (_) { return ""; }
}

async function companyDomain(lead: any, spend: Spend) {
  const known = lower(lead.company_domain) || hostOf(lead.website);
  if (known && !SOCIAL_HOST.test(known)) return known;
  if (!lead.company) return "";
  const finds = await exaSearch(`${lead.company} ${lead.location || ""} official website`, "company", 3, spend);
  for (const f of finds) { const h = hostOf(f.url); if (h && !SOCIAL_HOST.test(h)) return h; }
  return "";
}

async function fetchPage(url: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(url, { signal: ctrl.signal, redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", Accept: "text/html" } });
    clearTimeout(t);
    if (!r.ok) return "";
    return (await r.text()).slice(0, 250000);
  } catch (_) { return ""; }
}
function cfDecode(hex: string) {
  const k = parseInt(hex.slice(0, 2), 16);
  let o = "";
  for (let i = 2; i < hex.length; i += 2) o += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k);
  return o;
}

type SiteContacts = { domain: string; emails: string[]; phones: string[]; whatsapp: string[]; instagram: string[]; checked_at: string };
const siteCache = new Map<string, SiteContacts>();

/* Free: the company's own pages, read raw. */
async function scanSite(domain: string): Promise<SiteContacts> {
  if (siteCache.has(domain)) return siteCache.get(domain)!;
  const base = `https://${domain}`;
  const home = await fetchPage(base);
  const linked = [...home.matchAll(/href=["']([^"']*(?:contact|about|reach|support|get-in-touch|connect)[^"']*)["']/gi)]
    .map((m) => { try { return new URL(m[1], base).href; } catch (_) { return ""; } })
    .filter((u) => u && hostOf(u) === domain);
  const urls = [...new Set([...linked.slice(0, 3), `${base}/contact`, `${base}/pages/contact`, `${base}/about`])].slice(0, 4);
  // Each page is read on its own and only the bits that can hold a contact
  // are kept, so a heavy site never fills the function's memory.
  const pick = (html: string) => {
    const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/gi, " ")
      .replace(/data-cfemail="([0-9a-f]+)"/gi, (_m, h) => ` ${cfDecode(h)} `)
      .replace(/\s*(\[at\]|\(at\)|&#64;|%40)\s*/gi, "@").replace(/&#46;/g, ".");
    const bits: string[] = [];
    for (const m of t.matchAll(/[^\s"'<>]{0,80}(?:@|tel:|wa\.me|whatsapp\.com\/send|instagram\.com\/)[^\s"'<>]{0,80}/gi)) { bits.push(m[0]); if (bits.length > 300) break; }
    return bits.join(" ");
  };
  const parts = [pick(home)];
  for (const u of urls) parts.push(pick(await fetchPage(u)));
  // Many sites turn away requests from cloud servers. When the direct read
  // came back empty, a free page reader (r.jina.ai) fetches the same pages
  // and keeps the links, mailto and tel included.
  if (!parts.join("").trim()) {
    for (const u of [base, `${base}/contact`, `${base}/pages/contact`]) parts.push(pick(await fetchPage(`https://r.jina.ai/${u}`)));
  }
  const text = parts.join(" ");
  const brand = domain.split(".")[0];
  const emails = [...new Set((text.match(EMAIL_RE) || []).map((e) => lower(e).replace(/\.$/, "")))]
    .filter((e) => !JUNK_EMAIL.test(e))
    // Their own domain, or a free mailbox that carries the brand's name.
    .filter((e) => e.endsWith(`@${domain}`) || e.endsWith(`.${domain}`) || e.split("@")[0].includes(brand) || /@(gmail|outlook|yahoo|hotmail|proton)/.test(e))
    .slice(0, 12);
  const phones = [...new Set([...text.matchAll(/tel:([+\d\s().-]{8,20})/gi)].map((m) => m[1].replace(/[^\d+]/g, "")))].slice(0, 4);
  const whatsapp = [...new Set([...text.matchAll(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d{8,15})/gi)].map((m) => m[1]))].slice(0, 3);
  const instagram = [...new Set([...text.matchAll(/instagram\.com\/([A-Za-z0-9_.]{2,30})/gi)].map((m) => m[1]).filter((x) => !/^(p|reel|reels|explore|accounts|stories)$/i.test(x)))].slice(0, 2);
  const out = { domain, emails, phones, whatsapp, instagram, checked_at: new Date().toISOString() };
  siteCache.set(domain, out);
  return out;
}

async function prospeoFind(lead: any, domain: string) {
  const key = env("PROSPEO_API_KEY");
  if (!key) return null;
  const data: Record<string, string> = { full_name: clip(lead.name, 80) };
  if (lead.linkedin_url) data.linkedin_url = lead.linkedin_url;
  if (lead.company) data.company_name = clip(lead.company, 120);
  if (domain) data.company_website = domain;
  const res = await fetch("https://api.prospeo.io/enrich-person", {
    method: "POST", headers: { "X-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ only_verified_email: true, data }),
  }).catch(() => null);
  const d = res ? await res.json().catch(() => ({})) : {};
  const email = String(d?.person?.email?.email || "");
  if (!email || email.includes("*")) return null;
  return { email: lower(email), status: lower(d?.person?.email?.status) === "verified" ? "verified" : "found" };
}

type Found = { email: string; status: string; source: string; domain: string; contacts: SiteContacts | null };

async function findEmail(lead: any, spend: Spend, opts: { paid: boolean } = { paid: true }): Promise<Found> {
  const domain = await companyDomain(lead, spend);
  const site = domain ? await scanSite(domain) : null;
  const none: Found = { email: "", status: "unknown", source: "", domain, contacts: site };
  const { first, last } = nameParts(lead.name);
  const mine = (site?.emails || []).find((e) => isPersonLocal(e.split("@")[0], first, last));
  if (mine) return { ...none, email: mine, status: "found", source: "On their company's website" };

  if (opts.paid) {
    const p = await prospeoFind(lead, domain);
    if (p) return { ...none, email: p.email, status: p.status, source: "Prospeo" };
    const h = domain ? await hunterFind(clip(lead.name, 80), domain, spend) : null;
    if (h) return { ...none, email: h.email, status: h.status, source: "Hunter" };
  }

  if (domain) {
    const pattern = (site?.emails || []).filter((e) => e.endsWith(`@${domain}`)).map((e) => patternOf(e.split("@")[0])).find(Boolean) || "";
    const guess = applyPattern(pattern, first, last, domain);
    if (guess && (await domainTakesMail(guess))) return { ...none, email: guess, status: "guessed", source: `Guessed from the company's pattern (${pattern}@${domain})` };
  }
  const inboxes = site?.emails || [];
  const inbox = BEST_INBOX.map((n) => inboxes.find((e) => e.split("@")[0] === n)).find(Boolean) || inboxes[0];
  if (inbox) return { ...none, email: inbox, status: "company", source: "The company's inbox, from its website" };
  return none;
}

/* Find emails for people the founder picks, or the strongest few without one. */
async function findEmails(userId: string, body: any, spend: Spend) {
  const client = db();
  let q = client.from("outreach_leads").select("*").eq("user_id", userId).eq("discarded", false);
  q = Array.isArray(body.lead_ids) && body.lead_ids.length
    ? q.in("id", body.lead_ids.slice(0, 20))
    : q.eq("brief_id", body.brief_id).or("email.eq.,email_status.eq.company,email_status.eq.guessed").neq("email_source", "none found").order("score", { ascending: false }).limit(8);
  const { data: leads } = await q;
  const results: any[] = [];
  const found: (Found | null)[] = [];
  for (let i = 0; i < (leads || []).length; i += 4) {
    found.push(...await Promise.all((leads || []).slice(i, i + 4).map((l: any) => findEmail(l, spend).catch(() => null))));
  }
  for (let j = 0; j < (leads || []).length; j++) {
    const l = leads![j], f = found[j];
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (f?.domain && !l.company_domain) patch.company_domain = f.domain;
    if (f?.contacts) patch.contacts = f.contacts;
    const better = f?.email && (!l.email || ["company", "guessed", "unknown"].includes(l.email_status) && ["found", "verified"].includes(f.status));
    if (better) Object.assign(patch, { email: f!.email, email_status: f!.status, email_source: f!.source });
    else if (!l.email && f?.email) Object.assign(patch, { email: f.email, email_status: f.status, email_source: f.source });
    else if (!l.email) patch.email_source = "none found";
    await client.from("outreach_leads").update(patch).eq("id", l.id);
    results.push({ id: l.id, name: l.name, email: (patch.email as string) || l.email || "", status: (patch.email_status as string) || l.email_status, source: (patch.email_source as string) || l.email_source || "", contacts: f?.contacts || null });
  }
  return json({ ok: true, found: results.filter((r) => r.email).length, tried: results.length, results, cost_usd: costUsd(spend) });
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
    // Contacts: every company website is read (free); the paid finder only
    // runs for the top 5, so a search never quietly spends much on emails.
    const topIds = new Set(pre.slice(0, 5).map((x) => x.l));
    const tops = pre.slice(0, 12).map((x) => x.l);
    for (let i = 0; i < tops.length; i += 4) {
      await Promise.all(tops.slice(i, i + 4).map(async (l: any) => {
        const f = await findEmail(l, spend, { paid: topIds.has(l) }).catch(() => null);
        if (!f) return;
        if (f.domain && !l.company_domain) l.company_domain = f.domain;
        if (f.contacts) l.contacts = f.contacts;
        if (f.email && !l.email) { l.email = f.email; l.email_status = f.status; l.email_source = f.source; }
        else if (l.email) { l.email_status = l.email_status || "found"; l.email_source = l.email_source || "In the search results"; }
      }));
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
        email: clip(l.email, 160), email_status: l.email ? (l.email_status || "guessed") : "unknown", email_source: clip(l.email_source, 160), contacts: l.contacts || {},
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

const CHANNELS = ["email", "linkedin", "whatsapp", "x", "instagram"] as const;

/* Every channel is written separately, because a LinkedIn note, a WhatsApp
   message and a cold email are different things. All five come back at once,
   so switching channel on the page is instant and costs nothing. */
const DRAFT_SYSTEM = `You write first-touch outreach for a founder. Each person gets a separate message for each channel, and each must read like the founder wrote it to them alone, natively for that channel.

Return JSON only:
{"drafts": [{
  "id": "lead id",
  "best": "email|linkedin|whatsapp|x|instagram",
  "email": {"subject": "under 7 words, lowercase is fine", "body": "50-90 words", "followups": ["day 3, under 40 words", "day 7, under 40 words"]},
  "linkedin": {"body": "connection note, under 280 characters", "followups": ["after they accept, under 60 words"]},
  "whatsapp": {"body": "2-3 short lines, conversational, like texting someone you were introduced to", "followups": ["one gentle nudge"]},
  "x": {"body": "DM, under 240 characters, casual, no pitchy opener", "followups": []},
  "instagram": {"body": "DM, under 200 characters, warm and light", "followups": []}
}]}

How to write, every channel:
- Open with their real moment: a signal, their role, something they said or built. Never "I hope this finds you well".
- Tie the product to the pain that moment implies. One idea, one small ask (a 15-minute call, or a yes/no question).
- Use the product report for every claim. If the report has no proof, claim none. Respect its status (never imply it is live if it is a waitlist).
- Match the product's tone. Plain, warm, direct. No buzzwords, no flattery, no em dashes, no exclamation marks.
- Email ends with one short opt-out line (e.g. "If this is not for you, just say so and I will not write again.").
- Each channel must differ in length, rhythm and opener, not just be trimmed.
- best: email when an email is known, otherwise linkedin when a profile is known, otherwise email.
- Never invent facts about the person. Use only what the lead record says.`;

function variantFrom(d: any, ch: string) {
  const v = d?.[ch] || {};
  const body = String(v.body || "").replace(/[—–]/g, ",").trim().slice(0, 2000);
  if (!body) return null;
  return { subject: ch === "email" ? clip(v.subject, 120) : "", body, followups: (Array.isArray(v.followups) ? v.followups : []).slice(0, 2).map((f: any) => clip(String(f).replace(/[—–]/g, ",").replace(/^\s*(?:day\s*\d+|follow[- ]?up\s*\d*)\s*[:,.-]\s*/i, ""), 400)) };
}

async function draft(userId: string, body: any, spend: Spend) {
  const client = db();
  const { data: brief } = await client.from("outreach_briefs").select("*").eq("id", body.brief_id).eq("user_id", userId).single();
  if (!brief) return json({ error: "Brief not found." }, 404);
  let q = client.from("outreach_leads").select("*").eq("brief_id", brief.id).eq("user_id", userId).eq("discarded", false);
  q = Array.isArray(body.lead_ids) && body.lead_ids.length ? q.in("id", body.lead_ids.slice(0, 25)) : q.eq("status", "new").order("score", { ascending: false }).limit(Math.min(25, Number(body.limit) || 12));
  const { data: leads } = await q;
  if (!leads?.length) return json({ ok: true, drafted: 0 });
  const product = productBrief(await productFor(client, userId, brief.product_id));
  const context = `The product, in detail:\n${product || `${brief.offer || "(not given)"}\nThe pain it solves: ${brief.icp?.pain || ""}`}\n\nWho this search is for: ${brief.icp?.summary || brief.ask}`;
  const compact = leads.map((l: any) => ({
    id: l.id, name: l.name, title: l.title, company: l.company, industry: l.industry, location: l.location,
    has_email: Boolean(l.email), has_linkedin: Boolean(l.linkedin_url), summary: l.summary,
    signals: (l.signals || []).slice(0, 3), why_picked: (l.reasons || []).slice(0, 3),
  }));
  // Five channels per person is long output, so people go in small batches, in parallel.
  const batches: any[][] = [];
  for (let i = 0; i < compact.length; i += 4) batches.push(compact.slice(i, i + 4));
  const outs = await Promise.all(batches.map((b) => ai("draft", DRAFT_SYSTEM, `${context}\n\nWrite to each of these people:\n${JSON.stringify(b)}`, spend, 9000).catch(() => ({ drafts: [] }))));
  const byId = new Map(outs.flatMap((o: any) => o?.drafts || []).map((d: any) => [String(d.id), d]));
  let drafted = 0;
  for (const l of leads) {
    const d: any = byId.get(String(l.id));
    if (!d) continue;
    const variants: Record<string, any> = {};
    for (const ch of CHANNELS) { const v = variantFrom(d, ch); if (v) variants[ch] = v; }
    if (!Object.keys(variants).length) continue;
    const best = (CHANNELS as readonly string[]).includes(d.best) && variants[d.best] ? d.best : (l.email && variants.email ? "email" : Object.keys(variants)[0]);
    const message = { channel: best, ...variants[best], variants };
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
  const clean = (v: any) => ({ subject: clip(v?.subject, 120), body: String(v?.body || "").slice(0, 2000), followups: (Array.isArray(v?.followups) ? v.followups : []).slice(0, 2).map((f: any) => clip(f, 400)) });
  const variants: Record<string, any> = {};
  for (const ch of CHANNELS) if (m.variants?.[ch]?.body) variants[ch] = clean(m.variants[ch]);
  const channel = (CHANNELS as readonly string[]).includes(m.channel) ? m.channel : "email";
  const message = { channel, ...(variants[channel] || clean(m)), variants };
  const { error } = await db().from("outreach_leads").update({ message, updated_at: new Date().toISOString() }).eq("id", body.lead_id).eq("user_id", userId);
  if (error) throw error;
  return json({ ok: true });
}


/* ── Sending, human in the loop (2026-10-17) ─────────────────────────────
   Nothing is ever sent without a click. Email goes through the founder's own
   Gmail (the Google connection the calendar already has, widened with
   gmail.send and gmail.readonly) only when they press Send, Send follow-up or
   Send reply. Follow-ups are prepared and marked due on day 3 and day 7, and
   wait for that click. The scheduled check only READS: it looks for replies
   in contacted threads, sorts them, drafts an answer, and retires follow-ups
   for anyone who answered. It never sends. Pace: a daily cap that starts low
   and rises with each day of sending; every address gets a mail-server check
   first. Other channels stay copy-and-open. */

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly"];

async function gmailConnect(userId: string) {
  const env = getCalendarOAuthEnv();
  const state = await buildCalendarOAuthState(userId, env.serviceRoleKey);
  const scope = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "openid", ...GMAIL_SCOPES].join(" ");
  const params = new URLSearchParams({ client_id: env.clientId, redirect_uri: env.redirectUri, response_type: "code", scope, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
  return json({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
}

async function gmailToken(userId: string) {
  const env = getCalendarOAuthEnv();
  const admin = db();
  const connection = await getCalendarConnection(admin as any, userId).catch(() => null);
  if (!connection) return { token: "", email: "", canSend: false, reason: "Connect Gmail first." };
  const scope = String(connection.scope || "");
  const token = await getValidCalendarAccessToken({ admin: admin as any, userId, env, connection, logPrefix: "outreach-gmail" });
  return { token, email: String(connection.google_email || ""), canSend: scope.includes("gmail.send"), canRead: scope.includes("gmail.readonly") || scope.includes("gmail.modify"), reason: scope.includes("gmail.send") ? "" : "Gmail is not connected for sending yet. Connect Gmail." };
}

async function getSettings(userId: string) {
  const { data } = await db().from("outreach_settings").select("*").eq("user_id", userId).maybeSingle();
  return data || { user_id: userId, booking_url: "", daily_cap: 20, from_name: "", first_send_at: null };
}
async function saveSettings(userId: string, body: any) {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (body.booking_url !== undefined) row.booking_url = clip(body.booking_url, 300);
  if (body.from_name !== undefined) row.from_name = clip(body.from_name, 80);
  if (body.daily_cap !== undefined) row.daily_cap = Math.max(1, Math.min(100, Number(body.daily_cap) || 20));
  const { data, error } = await db().from("outreach_settings").upsert(row, { onConflict: "user_id" }).select().single();
  if (error) throw error;
  return json({ settings: data });
}
/* Warm-up: 10 a day on the first day of sending, +5 a day after, up to the cap. */
function capToday(settings: any) {
  const cap = Number(settings?.daily_cap) || 20;
  if (!settings?.first_send_at) return Math.min(cap, 10);
  const days = Math.floor((Date.now() - Date.parse(settings.first_send_at)) / 864e5);
  return Math.min(cap, 10 + 5 * days);
}
async function sentTodayCount(userId: string) {
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const { count } = await db().from("outreach_sends").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "sent").gte("sent_at", since.toISOString());
  return count || 0;
}
async function gmailStatus(userId: string) {
  const t: any = await gmailToken(userId).catch((e) => ({ token: "", email: "", canSend: false, reason: clip((e as Error).message, 200) }));
  const settings = await getSettings(userId);
  return json({ connected: Boolean(t.token && t.canSend), email: t.email, reason: t.reason, settings, sent_today: await sentTodayCount(userId), cap_today: capToday(settings) });
}

/* The address's domain must accept mail at all (an MX record), checked free
   over DNS-over-HTTPS. Catches typos and dead domains before they bounce. */
const mxCache = new Map<string, boolean>();
async function domainTakesMail(email: string) {
  const domain = lower(email.split("@")[1] || "");
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return false;
  if (mxCache.has(domain)) return mxCache.get(domain)!;
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => ({})) : {};
  const ok = Array.isArray(data?.Answer) && data.Answer.some((a: any) => a?.type === 15);
  mxCache.set(domain, ok);
  return ok;
}

function b64url(text: string) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function mimeHeader(v: string) {
  return /^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(v)))}?=`;
}
async function gmailSend(token: string, o: { from: string; fromName: string; to: string; subject: string; body: string; threadId?: string; inReplyTo?: string }) {
  const headers = [
    `From: ${o.fromName ? `${mimeHeader(o.fromName)} <${o.from}>` : o.from}`, `To: ${o.to}`, `Subject: ${mimeHeader(o.subject)}`,
    "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit",
    ...(o.inReplyTo ? [`In-Reply-To: ${o.inReplyTo}`, `References: ${o.inReplyTo}`] : []),
  ];
  const res = await fetch(`${GMAIL}/messages/send`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(`${headers.join("\r\n")}\r\n\r\n${o.body}`), ...(o.threadId ? { threadId: o.threadId } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gmail ${res.status}: ${clip(data?.error?.message || "", 200)}`);
  return { id: String(data.id || ""), threadId: String(data.threadId || "") };
}
async function messageIdHeader(token: string, gmailId: string) {
  if (!gmailId) return "";
  const res = await fetch(`${GMAIL}/messages/${gmailId}?format=metadata&metadataHeaders=Message-ID`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => ({})) : {};
  return String((data?.payload?.headers || []).find((x: any) => lower(x.name) === "message-id")?.value || "");
}

const DAY = 864e5;

/* One clicked send: the first email now, follow-ups prepared and marked due
   (they wait for their own click). */
async function sendLead(userId: string, lead: any, gm: any, settings: any) {
  const client = db();
  const variant = lead.message?.variants?.email || (lead.message?.channel === "email" ? lead.message : null);
  if (!lead.email) return { ok: false, why: "No email for this person." };
  if (!variant?.body) return { ok: false, why: "No email written yet." };
  if (lead.discarded) return { ok: false, why: "Set aside." };
  if (["sent", "replied", "booked", "opted_out", "not_interested"].includes(lead.status)) return { ok: false, why: "Already contacted." };
  const { data: sup } = await client.from("outreach_suppression").select("key").eq("user_id", userId).in("key", [lower(lead.email), lower(lead.email).split("@")[1] || "-"]);
  if (sup?.length) return { ok: false, why: "On your do-not-contact list." };
  if (!(await domainTakesMail(lead.email))) {
    await client.from("outreach_leads").update({ email_status: "unknown", updated_at: new Date().toISOString() }).eq("id", lead.id);
    return { ok: false, why: "That address's domain does not accept email." };
  }
  const subject = clip(variant.subject, 120) || `quick question, ${String(lead.name || "").split(" ")[0]}`;
  const sent = await gmailSend(gm.token, { from: gm.email, fromName: settings.from_name || "", to: lead.email, subject, body: variant.body });
  const now = new Date().toISOString();
  await client.from("outreach_sends").insert({ user_id: userId, lead_id: lead.id, brief_id: lead.brief_id, channel: "email", step: 0, status: "sent", scheduled_for: now, sent_at: now, subject, body: variant.body, provider_message_id: sent.id, thread_id: sent.threadId });
  const fus = (variant.followups || []).filter(Boolean).slice(0, 2);
  if (fus.length) await client.from("outreach_sends").insert(fus.map((f: string, i: number) => ({ user_id: userId, lead_id: lead.id, brief_id: lead.brief_id, channel: "email", step: i + 1, status: "queued", scheduled_for: new Date(Date.now() + (i === 0 ? 3 : 7) * DAY).toISOString(), subject: `Re: ${subject}`, body: f, thread_id: sent.threadId })));
  await client.from("outreach_leads").update({ status: "sent", thread_id: sent.threadId, contacted_at: now, updated_at: now }).eq("id", lead.id);
  await client.from("outreach_events").insert({ user_id: userId, lead_id: lead.id, kind: "sent", note: "gmail" });
  if (!settings.first_send_at) { settings.first_send_at = now; await client.from("outreach_settings").upsert({ user_id: userId, first_send_at: now, updated_at: now }, { onConflict: "user_id" }); }
  return { ok: true };
}

/* Send what the founder just clicked: one person, or the ones they ticked. */
async function send(userId: string, body: any) {
  const ids = (Array.isArray(body.lead_ids) ? body.lead_ids : []).slice(0, 50);
  if (!ids.length) return json({ error: "Pick who to send to." }, 400);
  const gm: any = await gmailToken(userId);
  if (!gm.token || !gm.canSend) return json({ error: gm.reason || "Connect Gmail first.", need_gmail: true }, 400);
  const settings = await getSettings(userId);
  let room = capToday(settings) - (await sentTodayCount(userId));
  const { data: leads } = await db().from("outreach_leads").select("*").eq("user_id", userId).in("id", ids);
  const results: any[] = [];
  for (const lead of leads || []) {
    if (room <= 0) { results.push({ id: lead.id, name: lead.name, ok: false, why: "Today's limit reached. Send the rest tomorrow." }); continue; }
    try { const r = await sendLead(userId, lead, gm, settings); if (r.ok) room -= 1; results.push({ id: lead.id, name: lead.name, ...r }); }
    catch (e) { results.push({ id: lead.id, name: lead.name, ok: false, why: clip((e as Error).message, 200) }); }
  }
  return json({ ok: true, sent: results.filter((r) => r.ok).length, results, left_today: Math.max(0, room) });
}

/* A follow-up the founder clicked, in the same thread. Never sent if they replied. */
async function sendFollowup(userId: string, body: any) {
  const client = db();
  const { data: item } = await client.from("outreach_sends").select("*").eq("id", body.send_id).eq("user_id", userId).single();
  if (!item || item.status !== "queued") return json({ error: "That follow-up is not waiting." }, 400);
  const { data: lead } = await client.from("outreach_leads").select("*").eq("id", item.lead_id).single();
  if (!lead || lead.status !== "sent") {
    await client.from("outreach_sends").update({ status: "cancelled" }).eq("id", item.id);
    return json({ error: "They already replied, so this follow-up was dropped." }, 400);
  }
  const gm: any = await gmailToken(userId);
  if (!gm.token || !gm.canSend) return json({ error: gm.reason || "Connect Gmail first.", need_gmail: true }, 400);
  const settings = await getSettings(userId);
  if (capToday(settings) - (await sentTodayCount(userId)) <= 0) return json({ error: "Today's limit reached." }, 429);
  const { data: first } = await client.from("outreach_sends").select("provider_message_id").eq("lead_id", lead.id).eq("step", 0).eq("status", "sent").maybeSingle();
  const text = String(body.body || item.body).slice(0, 4000);
  const sent = await gmailSend(gm.token, { from: gm.email, fromName: settings.from_name || "", to: lead.email, subject: item.subject, body: text, threadId: item.thread_id, inReplyTo: await messageIdHeader(gm.token, first?.provider_message_id || "") });
  await client.from("outreach_sends").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: sent.id, body: text }).eq("id", item.id);
  return json({ ok: true });
}

async function replySend(userId: string, body: any) {
  const gm: any = await gmailToken(userId);
  if (!gm.token || !gm.canSend) return json({ error: gm.reason || "Connect Gmail first.", need_gmail: true }, 400);
  const client = db();
  const { data: lead } = await client.from("outreach_leads").select("*").eq("id", body.lead_id).eq("user_id", userId).single();
  if (!lead?.thread_id) return json({ error: "No conversation to reply to." }, 400);
  const text = String(body.body || lead.reply_draft || "").trim().slice(0, 4000);
  if (!text) return json({ error: "Nothing to send." }, 400);
  const settings = await getSettings(userId);
  const { data: first } = await client.from("outreach_sends").select("subject, provider_message_id").eq("lead_id", lead.id).eq("step", 0).maybeSingle();
  const subject = first?.subject ? `Re: ${String(first.subject).replace(/^re:\s*/i, "")}` : "Re:";
  const sent = await gmailSend(gm.token, { from: gm.email, fromName: settings.from_name || "", to: lead.email, subject, body: text, threadId: lead.thread_id, inReplyTo: await messageIdHeader(gm.token, first?.provider_message_id || "") });
  const now = new Date().toISOString();
  await client.from("outreach_sends").insert({ user_id: userId, lead_id: lead.id, brief_id: lead.brief_id, channel: "email", step: 9, status: "sent", scheduled_for: now, sent_at: now, subject, body: text, provider_message_id: sent.id, thread_id: sent.threadId });
  await client.from("outreach_leads").update({ reply_draft: "", updated_at: now }).eq("id", lead.id);
  return json({ ok: true });
}

/* ── Replies: read only ───────────────────────────────────────────────── */

const REPLY_SYSTEM = `You read a reply to a founder's cold outreach and help them answer it.

Return JSON only:
{"kind": "interested|question|not_now|wrong_person|unsubscribe|other", "summary": "one short line of what they said", "draft": "the founder's answer"}

Rules for the draft:
- interested: warm, short, propose a call. If a booking link is given, put it on its own line.
- question: answer from the product report only. Never invent facts. Offer a call.
- not_now: thank them, ask if a note in a few months is fine. No pressure.
- wrong_person: thank them, ask who would be right.
- unsubscribe: empty draft.
- 2-5 sentences, plain, no em dashes, no exclamation marks. Sign off with the founder's first name if known.`;

function decodeB64url(data: string) {
  try { const bin = atob(String(data || "").replace(/-/g, "+").replace(/_/g, "/")); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); }
  catch (_) { return ""; }
}
function plainBody(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) return decodeB64url(payload.body.data);
  for (const part of payload.parts || []) { const t = plainBody(part); if (t) return t; }
  return "";
}
function stripQuoted(text: string) {
  const cut = text.split(/\r?\n(?:On .+wrote:|-----Original Message-----|From: )/)[0];
  return cut.split(/\r?\n/).filter((l) => !l.startsWith(">")).join("\n").trim().slice(0, 4000);
}

/* For one user: read every contacted thread for replies. Never sends. */
async function syncUser(userId: string, spend: Spend) {
  const client = db();
  const gm: any = await gmailToken(userId).catch(() => ({ token: "", email: "" }));
  if (!gm.token || !gm.canRead) return { replies: 0, skipped: "gmail" };
  const settings = await getSettings(userId);
  let replies = 0;
  const { data: open } = await client.from("outreach_leads").select("*").eq("user_id", userId).eq("status", "sent").neq("thread_id", "").limit(200);
  for (const lead of open || []) {
    const res = await fetch(`${GMAIL}/threads/${lead.thread_id}?format=full`, { headers: { Authorization: `Bearer ${gm.token}` } }).catch(() => null);
    if (!res?.ok) continue;
    const thread = await res.json().catch(() => ({}));
    const fromOf = (m: any) => lower((m.payload?.headers || []).find((h: any) => lower(h.name) === "from")?.value || "");
    const theirs = (thread.messages || []).filter((m: any) => fromOf(m) && !fromOf(m).includes(lower(gm.email)));
    if (!theirs.length) continue;
    const last = theirs[theirs.length - 1];
    const bounced = /mailer-daemon|postmaster/.test(fromOf(last));
    await client.from("outreach_sends").update({ status: "cancelled" }).eq("lead_id", lead.id).eq("status", "queued");
    if (bounced) {
      await client.from("outreach_leads").update({ status: "drafted", email_status: "unknown", updated_at: new Date().toISOString() }).eq("id", lead.id);
      await client.from("outreach_events").insert({ user_id: userId, lead_id: lead.id, kind: "bounced", note: "gmail" });
      await client.from("outreach_suppression").upsert({ user_id: userId, key: lower(lead.email), reason: "bounced" }, { onConflict: "user_id,key" });
      continue;
    }
    const text = stripQuoted(plainBody(last.payload) || String(last.snippet || ""));
    let kind = "other", draftText = "", summary = "";
    try {
      const { data: brief } = await client.from("outreach_briefs").select("product_id, offer").eq("id", lead.brief_id).single();
      const product = productBrief(await productFor(client, userId, brief?.product_id));
      const firstName = String(settings.from_name || "").split(/\s+/)[0];
      const r = await ai("reply", REPLY_SYSTEM, `The product:\n${product || brief?.offer || ""}\n\nBooking link: ${settings.booking_url || "(none)"}\nFounder's first name: ${firstName || "(unknown)"}\n\nWhat the founder sent:\n${lead.message?.variants?.email?.body || lead.message?.body || ""}\n\nTheir reply:\n${text}`, spend, 1200);
      kind = ["interested", "question", "not_now", "wrong_person", "unsubscribe", "other"].includes(r.kind) ? r.kind : "other";
      draftText = String(r.draft || "").replace(/[—–]/g, ",").slice(0, 2000);
      summary = clip(r.summary, 200);
    } catch (_) { /* keep the reply even if sorting failed */ }
    const status = kind === "unsubscribe" ? "opted_out" : "replied";
    await client.from("outreach_leads").update({ status, replied_at: new Date(Number(last.internalDate) || Date.now()).toISOString(), reply_text: text, reply_kind: kind, reply_draft: kind === "unsubscribe" ? "" : draftText, updated_at: new Date().toISOString() }).eq("id", lead.id);
    await client.from("outreach_events").insert({ user_id: userId, lead_id: lead.id, kind: status === "opted_out" ? "opted_out" : "replied", note: summary || kind });
    if (kind === "unsubscribe") await client.from("outreach_suppression").upsert({ user_id: userId, key: lower(lead.email), reason: "opted_out" }, { onConflict: "user_id,key" });
    replies += 1;
  }
  return { replies };
}

/* Everyone contacted, with why, for what, what was sent and what came back. */
async function inbox(userId: string) {
  const client = db();
  const { data: leads } = await client.from("outreach_leads").select("*").eq("user_id", userId).in("status", ["sent", "replied", "booked", "not_interested", "opted_out"]).order("updated_at", { ascending: false }).limit(300);
  const ids = (leads || []).map((l: any) => l.id);
  const briefIds = [...new Set((leads || []).map((l: any) => l.brief_id))];
  const [{ data: sends }, { data: briefs }] = await Promise.all([
    ids.length ? client.from("outreach_sends").select("*").in("lead_id", ids).order("scheduled_for") : Promise.resolve({ data: [] as any[] }),
    briefIds.length ? client.from("outreach_briefs").select("id, title, product_id").in("id", briefIds) : Promise.resolve({ data: [] as any[] }),
  ]);
  const productIds = [...new Set((briefs || []).map((b: any) => b.product_id).filter(Boolean))];
  const { data: products } = productIds.length ? await client.from("product_contexts").select("id, name").in("id", productIds) : { data: [] as any[] };
  const briefBy = new Map((briefs || []).map((b: any) => [b.id, b]));
  const productBy = new Map((products || []).map((p: any) => [p.id, p.name]));
  const items = (leads || []).map((l: any) => {
    const b: any = briefBy.get(l.brief_id) || {};
    return { ...l, search: b.title || "", product: productBy.get(b.product_id) || "", sends: (sends || []).filter((x: any) => x.lead_id === l.id) };
  });
  return json({ items, settings: await getSettings(userId) });
}

/* The scheduled check: read replies for everyone with an open thread. */
async function tick(spend: Spend) {
  const { data } = await db().from("outreach_leads").select("user_id").eq("status", "sent").neq("thread_id", "").limit(1000);
  const users = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
  const out: any[] = [];
  for (const u of users.slice(0, 50)) out.push({ user: u, ...(await syncUser(u, spend).catch((e) => ({ error: clip((e as Error).message, 200) }))) });
  return json({ ok: true, users: out.length, out });
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
    // The scheduled reply check (read only) carries its own secret.
    const CRON_SECRET = env("OUTREACH_CRON_SECRET");
    if (CRON_SECRET.length >= 32 && sameSecret(req.headers.get("x-outreach-cron") || "", CRON_SECRET)) return await tick(spend);
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
    else if (step === "product_list") res = await productList(user.id);
    else if (step === "gmail_connect") res = await gmailConnect(user.id);
    else if (step === "gmail_status") res = await gmailStatus(user.id);
    else if (step === "settings") res = await saveSettings(user.id, body);
    else if (step === "send") res = await send(user.id, body);
    else if (step === "send_followup") res = await sendFollowup(user.id, body);
    else if (step === "reply_send") res = await replySend(user.id, body);
    else if (step === "sync") res = json({ ok: true, ...(await syncUser(user.id, spend)) });
    else if (step === "inbox") res = await inbox(user.id);
    else if (step === "find_emails") res = await findEmails(user.id, body, spend);
    else if (step === "product_build") res = await productBuild(user.id, body, spend);
    else res = json({ error: "Unknown step." }, 400);
    if (["refine", "hunt", "draft", "product_build", "find_emails"].includes(step)) {
      logEngineRun({ engine: `outreach-${step}`, command: clip(body.ask || body.brief_id || "", 300), response: { status: res.status, spend, cost_usd: costUsd(spend) }, verdict: res.ok ? "ok" : `http:${res.status}`, model: BRAINO_TEXT_MODEL, usage: { input_tokens: spend.input_tokens, output_tokens: spend.output_tokens }, elapsed_ms: Date.now() - started } as any);
    }
    return res;
  } catch (e) {
    console.error("outreach-engine", step, e);
    return json({ error: clip((e as Error)?.message || "Something went wrong.", 300) }, 500);
  }
});
