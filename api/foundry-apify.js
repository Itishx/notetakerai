/* Foundry's only server route (2026-10-22): runs Apify actors so the token
   never reaches the browser. Two calls:
     POST { kind: "google", queries: [...] }        -> { runId }
     POST { kind: "reddit", searches: [...] }        -> { runId }
     POST { kind: "site", url: "https://..." }       -> { runId }  (about 5 pages, slim text)
     GET  ?run=<runId>                               -> { status, items? }
     POST { kind: "crawl", url }                     -> can AI crawlers read the site (no Apify)
   Runs are started and then polled, because the Reddit actor takes minutes
   and a serverless function cannot wait that long. */

const TOKEN = process.env.APIFY_TOKEN || "";
const API = "https://api.apify.com/v2";

const ACTORS = {
  google: "apify~google-search-scraper",
  // Reddit threads are found through Google ("site:reddit.com ..."): the Reddit
  // scraper took over 7 minutes and matched single words across all of Reddit
  // (tested 2026-10-22). Google finds the threads where the problem is asked.
  reddit: "apify~google-search-scraper",
  // The founder's own website, read for the product card (2026-10-23).
  site: "apify~website-content-crawler",
};

function clean(list, max) {
  return (Array.isArray(list) ? list : [])
    .map((q) => String(q || "").replace(/\s+/g, " ").trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, max);
}

function inputFor(kind, body) {
  if (kind === "google") {
    const queries = clean(body.queries, 4);
    if (!queries.length) return null;
    return { queries: queries.join("\n"), maxPagesPerQuery: 1, resultsPerPage: 10, countryCode: "in" };
  }
  if (kind === "reddit") {
    const searches = clean(body.searches, 3);
    if (!searches.length) return null;
    return { queries: searches.map((q) => `site:reddit.com ${q}`).join("\n"), maxPagesPerQuery: 1, resultsPerPage: 10, quickDateRange: "y1" };
  }
  if (kind === "site") {
    let url = String(body.url || "").trim();
    if (!url) return null;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { new URL(url); } catch (_) { return null; }
    return { startUrls: [{ url }], maxCrawlPages: 5, maxCrawlDepth: 1, crawlerType: "cheerio", saveMarkdown: false, saveHtml: false, removeCookieWarnings: true };
  }
  return null;
}

/* Only what the page shows, so a run's payload stays small. */
function slim(kind, items) {
  if (kind === "google") {
    return items.map((q) => ({
      query: q?.searchQuery?.term || "",
      results: (q?.organicResults || []).slice(0, 10).map((r) => ({ title: r.title || "", url: r.url || "", description: (r.description || "").slice(0, 220) })),
    }));
  }
  if (kind === "site") {
    return items.slice(0, 5).map((p) => ({
      url: p?.url || "",
      title: String(p?.metadata?.title || "").slice(0, 160),
      text: String(p?.text || "").replace(/\s+/g, " ").slice(0, 2500),
    }));
  }
  return items
    .flatMap((q) => q?.organicResults || [])
    .filter((r) => /reddit\.com\/r\/[^/]+\/comments\//.test(r?.url || ""))
    .map((r) => ({
      title: String(r.title || "").replace(/\s*[:|-]\s*r\/\w+\s*$/i, "").replace(/\s*-\s*Reddit\s*$/i, "").slice(0, 200),
      body: String(r.description || "").slice(0, 500),
      url: r.url,
      community: (String(r.url).match(/reddit\.com\/(r\/[^/]+)/) || [])[1] || "",
      upVotes: null,
      comments: null,
      createdAt: r.date || "",
    }));
}

/* Can AI read your site? (2026-10-23) robots.txt rules for the AI crawlers,
   and whether the home page has words in it at all (a page drawn only by
   JavaScript reads as empty to most AI crawlers). No Apify, no token. */
const AI_BOTS = [
  ["GPTBot", "ChatGPT (training)"], ["OAI-SearchBot", "ChatGPT search"], ["ChatGPT-User", "ChatGPT browsing"],
  ["ClaudeBot", "Claude"], ["Claude-SearchBot", "Claude search"], ["PerplexityBot", "Perplexity"],
  ["Google-Extended", "Gemini"], ["Bingbot", "Copilot and Bing"], ["CCBot", "Common Crawl (feeds many AIs)"],
];
function robotsAllows(txt, bot) {
  // Groups of User-agent lines followed by rules; the bot's own group wins over *.
  const groups = [];
  let cur = null;
  for (const raw of String(txt).split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), val = m[2].trim();
    if (key === "user-agent") { if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(val.toLowerCase()); }
    else if (cur && (key === "disallow" || key === "allow")) cur.rules.push([key, val]);
  }
  const pick = groups.find((g) => g.agents.includes(bot.toLowerCase())) || groups.find((g) => g.agents.includes("*"));
  if (!pick) return true;
  let verdict = true, best = -1;
  for (const [k, v] of pick.rules) {
    if (!v) continue;
    if ("/".startsWith(v) || v === "/") { if (v.length > best) { best = v.length; verdict = k === "allow"; } }
  }
  return verdict;
}
async function crawlCheck(body) {
  let url = String(body.url || "").trim();
  if (!url) return { status: 400, json: { error: "url is required" } };
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let origin;
  try { origin = new URL(url).origin; } catch (_) { return { status: 400, json: { error: "That does not look like a website address" } }; }
  const get = (u) => fetch(u, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; BrainoFoundry/1.0; +https://affctve.com/foundry)" }, signal: AbortSignal.timeout(9000) });
  let robotsTxt = "", robots = false;
  try { const r = await get(`${origin}/robots.txt`); if (r.ok) { robotsTxt = await r.text(); robots = true; } } catch (_) { /* no robots */ }
  let homeStatus = 0, homeWords = 0;
  try {
    const h = await get(url);
    homeStatus = h.status;
    const html = (await h.text()).slice(0, 400000);
    homeWords = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;
  } catch (_) { /* unreachable */ }
  const bots = AI_BOTS.map(([name, who]) => ({ name, who, allowed: robotsAllows(robotsTxt, name) }));
  const blocked = bots.filter((b) => !b.allowed);
  const ok = homeStatus >= 200 && homeStatus < 400 && !blocked.length && homeWords >= 80;
  const note = !homeStatus ? "Your site did not answer, so AI cannot read it either."
    : homeStatus >= 400 ? `Your home page answered with an error (${homeStatus}).`
    : blocked.length ? `Your robots.txt blocks ${blocked.map((b) => b.who).join(", ")}.`
    : homeWords < 80 ? "Your home page has almost no words without JavaScript, so most AI crawlers see an empty page."
    : "AI crawlers can read your site.";
  return { status: 200, json: { ok, note, robots, bots, homeStatus, homeWords } };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (b.kind === "crawl") { const out = await crawlCheck(b); return res.status(out.status).json(out.json); }
    }
    if (req.method === "GET") {
      const runId = String(req.query?.run || "").replace(/[^A-Za-z0-9]/g, "");
      const kind = req.query?.kind === "reddit" ? "reddit" : req.query?.kind === "site" ? "site" : "google";
      if (!runId) return res.status(400).json({ error: "run is required" });
      const run = await fetch(`${API}/actor-runs/${runId}?token=${TOKEN}`).then((r) => r.json());
      const status = run?.data?.status || "UNKNOWN";
      if (status !== "SUCCEEDED") return res.status(200).json({ status });
      const items = await fetch(`${API}/datasets/${run.data.defaultDatasetId}/items?clean=1&token=${TOKEN}`).then((r) => r.json());
      return res.status(200).json({ status, items: slim(kind, Array.isArray(items) ? items : []) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "POST or GET" });
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const kind = ["reddit", "google", "site"].includes(body.kind) ? body.kind : "";
    const input = kind ? inputFor(kind, body) : null;
    if (!input) return res.status(400).json({ error: "kind and queries, searches or url are required" });
    const started = await fetch(`${API}/acts/${ACTORS[kind]}/runs?token=${TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }).then((r) => r.json());
    const runId = started?.data?.id;
    if (!runId) return res.status(502).json({ error: started?.error?.message || "Apify did not start the run" });
    return res.status(200).json({ runId });
  } catch (error) {
    return res.status(500).json({ error: String(error?.message || error) });
  }
}
