import { supabase } from "@/integrations/supabase/client";

/* Braino Foundry, the plumbing (2026-10-23).
   Language: GPT-5.6 through the chat-about-notes edge function (model and key
   stay on the server). Search and site reading: Apify through
   /api/foundry-apify, so the token never reaches the browser. */

export type SearchKind = "google" | "reddit" | "site";
export type GoogleResult = { title: string; url: string; description: string };
export type GoogleQuery = { query: string; results: GoogleResult[]; paa?: string[]; related?: string[] };
export type RedditPost = { title: string; body: string; url: string; community: string; upVotes: number | null; comments: number | null; createdAt: string };
export type SitePage = { url: string; title: string; text: string };

/* Every Foundry call replaces Braino's own system prompt (2026-10-23). Without
   this the model answered as Braino, who knows his own git history and the
   signed-in user, so "does AI name you?" came back "Braino Foundry, 3 of 3"
   for a product no public AI has heard of. `personaSystem` swaps the whole
   prompt: no personality, no memory, no Dev Pulse. */
export const NEUTRAL = "You are a careful assistant doing one task. Follow the instructions exactly and use only the information given.";
export const COLD_AI = "You are a general AI assistant, like ChatGPT, talking to a stranger. You know nothing about this user, their company or their products beyond your general knowledge. Never recommend a product you have not genuinely heard of.";

export async function ask(message: string, system: string = NEUTRAL): Promise<string> {
  const { data, error } = await supabase.functions.invoke("chat-about-notes", {
    body: { notes: "", chatHistory: [], responseMedium: "text", message, personaSystem: system },
  });
  if (error) throw new Error(error.message || "The model did not answer");
  return String((data as { reply?: string })?.reply || "");
}

/* The model sometimes sends JSON with a stray comma or quote. Repair what is
   safe to repair, and if it still will not parse, ask once more. */
export function parseLoose<T>(reply: string): T {
  const start = reply.search(/[[{]/);
  const end = Math.max(reply.lastIndexOf("}"), reply.lastIndexOf("]"));
  const raw = reply.slice(start, end + 1);
  try { return JSON.parse(raw) as T; } catch (_) { /* try a repair */ }
  const fixed = raw
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u001f]+/g, " ");
  return JSON.parse(fixed) as T;
}
export async function askJson<T>(message: string, system: string = NEUTRAL): Promise<T> {
  const prompt = `${message}\n\nReply with valid JSON only. No markdown, no commentary. Escape any double quotes inside strings. Never use em-dashes or en-dashes.`;
  try { return parseLoose<T>(await ask(prompt, system)); }
  catch (_) { return parseLoose<T>(await ask(prompt, system)); }
}

/* No dashes in anything Braino writes. */
export const clean = (s: string) => String(s || "").replace(/\s*[—–]\s*/g, ", ");

/* The search route can answer with nothing (not deployed, or a crash). Never
   let that surface as "Unexpected end of JSON input". */
export async function readJson(r: Response): Promise<Record<string, any>> {
  const t = await r.text();
  if (!t) return { error: r.status === 404 ? "Search is not available here. Run it on affctve.com, or start the dev server with the search route." : `Search answered with nothing (${r.status})` };
  try { return JSON.parse(t); } catch (_) { return { error: `Search answered badly (${r.status})` }; }
}
export const NO_TOKEN = "Search is not set up yet: the Apify token is missing on the server.";
export async function apifyStart(kind: SearchKind, payload: string[] | string) {
  const body = kind === "google" ? { kind, queries: payload } : kind === "reddit" ? { kind, searches: payload } : { kind, url: payload };
  const r = await fetch("/api/foundry-apify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await readJson(r);
  if (!r.ok || !j.runId) throw new Error(/token|authenticat/i.test(String(j.error)) ? NO_TOKEN : (j.error || "Search did not start"));
  return j.runId as string;
}
export async function apifyWait<T>(kind: SearchKind, runId: string, onTick?: (s: number) => void, maxMs = 9 * 60 * 1000): Promise<T> {
  const started = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 4000));
    onTick?.(Math.round((Date.now() - started) / 1000));
    const j = await fetch(`/api/foundry-apify?run=${runId}&kind=${kind}`).then(readJson);
    if (j.status === "SUCCEEDED") return j.items as T;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(j.status)) throw new Error(`Search ${String(j.status).toLowerCase()}`);
    if (j.error && !j.status) throw new Error(j.error);
    if (Date.now() - started > maxMs) throw new Error("Search took too long");
  }
}

/* ── Matching ─────────────────────────────────────────────────────────── */
export const norm = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
export const siteHost = (site: string) => (site || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
/* AI names: the model hands back product names, so compare names to names. */
export function mentions(text: string, name: string, site: string) {
  const t = norm(text);
  const n = norm(name);
  const host = norm(siteHost(site).split(".")[0]);
  return (n.length > 2 && t.includes(n)) || (host.length > 2 && t.includes(host));
}
/* Google: a page only counts if it is on your own site, or names the product
   exactly as written, never ordinary words that happen to spell it. */
export function googleProof(results: GoogleResult[], name: string, site: string) {
  const h = siteHost(site);
  const exact = new RegExp(`(^|[^A-Za-z0-9])${(name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z0-9]|$)`);
  const multiWord = /\s/.test((name || "").trim());
  return results.find((r) => {
    const u = r.url.toLowerCase();
    if (h && h.includes(".") && (u.includes(`//${h}`) || u.includes(`.${h}`))) return true;
    if (!name) return false;
    return multiWord ? exact.test(r.title) && /[A-Z]/.test(name) : exact.test(`${r.title} ${r.description}`);
  });
}

/* ── Small helpers ───────────────────────────────────────────────────── */
export async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); } catch (_) { /* clipboard blocked: the composer still opens */ }
}
export const enc = encodeURIComponent;
export const uid = () => Math.random().toString(36).slice(2, 10);
export const DAY = 24 * 60 * 60 * 1000;
export const WEEK = 7 * DAY;
export const fmtDay = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
export const fmtTime = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
export function ago(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return fmtDay(t);
}
export const linkedinSlug = (u: string) => (String(u || "").match(/linkedin\.com\/in\/([^/?#\s]+)/i) || [])[1] || "";
export const hostOf = (u: string, fallback = "") => { try { return new URL(/^https?:/i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, ""); } catch (_) { return fallback; } };
