/* Foundry's only server route (2026-10-22): runs Apify actors so the token
   never reaches the browser. Two calls:
     POST { kind: "google", queries: [...] }        -> { runId }
     POST { kind: "reddit", searches: [...] }        -> { runId }
     GET  ?run=<runId>                               -> { status, items? }
   Runs are started and then polled, because the Reddit actor takes minutes
   and a serverless function cannot wait that long. */

const TOKEN = process.env.APIFY_TOKEN || "apify_api_72owXBHTcfdf3rFF1HW4mA9Bfvl9DQ0J3Qaj";
const API = "https://api.apify.com/v2";

const ACTORS = {
  google: "apify~google-search-scraper",
  // Reddit threads are found through Google ("site:reddit.com ..."): the Reddit
  // scraper took over 7 minutes and matched single words across all of Reddit
  // (tested 2026-10-22). Google finds the threads where the problem is asked.
  reddit: "apify~google-search-scraper",
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

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const runId = String(req.query?.run || "").replace(/[^A-Za-z0-9]/g, "");
      const kind = req.query?.kind === "reddit" ? "reddit" : "google";
      if (!runId) return res.status(400).json({ error: "run is required" });
      const run = await fetch(`${API}/actor-runs/${runId}?token=${TOKEN}`).then((r) => r.json());
      const status = run?.data?.status || "UNKNOWN";
      if (status !== "SUCCEEDED") return res.status(200).json({ status });
      const items = await fetch(`${API}/datasets/${run.data.defaultDatasetId}/items?clean=1&token=${TOKEN}`).then((r) => r.json());
      return res.status(200).json({ status, items: slim(kind, Array.isArray(items) ? items : []) });
    }
    if (req.method !== "POST") return res.status(405).json({ error: "POST or GET" });
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const kind = body.kind === "reddit" ? "reddit" : body.kind === "google" ? "google" : "";
    const input = kind ? inputFor(kind, body) : null;
    if (!input) return res.status(400).json({ error: "kind and queries/searches are required" });
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
