/* ============================================================================
   watch-resolve — "play Shawshank on Netflix" into a URL that opens the player.

   The link is the easy half. netflix.com/watch/{id} starts playback on its own;
   the whole problem is turning a spoken title into that id, and Netflix has no
   public API for it.

   This used to run TMDB for identity and Watchmode for links. TMDB is not free
   for commercial use, and it turned out not to be load-bearing: Watchmode's own
   autocomplete search is fuzzy, relevance-ranked, and returns type and year, so
   it answers "what did they mean" perfectly well on its own. One API, one key,
   one bill.

   Verified against the live API rather than the docs, which are not readable by
   machine. Shapes below are real responses, not guesses.

   Nothing here scrapes anything. Every id comes from an API that exists to give
   it to us, which is the only reason this is safe to ship: scraping catalogue
   pages or automating past a login wall is what gets accounts banned.
   ========================================================================== */

import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "./openai-models.ts";

const WATCHMODE = "https://api.watchmode.com/v1";

/* Watchmode's search is a title index, and a good one: verified live, it takes
   "shawshank", "the shaw shank" and "spiderman no way home" straight to the
   right film. What it cannot do is a description — "that prison movie with
   Morgan Freeman" returns nothing at all. So when the index comes up empty we
   ask the model what film they meant and search again for its actual title.
   That second hop only fires on a miss, so the common case stays one request
   and no model call. */
async function titleFromDescription(said: string, openaiKey: string): Promise<string | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: BRAINO_TEXT_MODEL,
      reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
      max_completion_tokens: 30,
      messages: [
        {
          role: "system",
          content:
            "You identify films and TV shows from vague descriptions. Reply with ONLY " +
            "the official title. No year, no quotes, no explanation, no punctuation " +
            "around it. If you genuinely cannot tell, reply with exactly: UNKNOWN",
        },
        { role: "user", content: said },
      ],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const text = String(data?.choices?.[0]?.message?.content || "")
    .trim().replace(/^["'\u201c]+|["'\u201d.]+$/g, "").trim();
  if (!text || /^unknown$/i.test(text) || text.length > 80) return null;
  return text;
}

export type WatchKind = "movie" | "tv";

export interface WatchRequest {
  /** What the user said, minus the platform and episode: "shawshank". */
  query: string;
  /** Platform they named, if any. Free text: "netflix", "prime", "hotstar". */
  platform?: string;
  kind?: WatchKind;
  season?: number;
  episode?: number;
  /** ISO-3166 alpha-2, from bgGetUserGeo(). Must be enabled on the plan. */
  region?: string;
  watchmodeKey: string;
  /** Optional. Enables the description fallback when the title index misses. */
  openaiKey?: string;
}

export interface WatchSource {
  name: string;
  /** sub | free | rent | buy | tve — a rental is not the same as "included". */
  type: string;
  url: string;
  /** True when this URL opens the player itself, not a page you then click. */
  autoplays: boolean;
  /** Local-currency price on rent/buy rows. Null on subscriptions. */
  price?: number | null;
}

export interface WatchResult {
  found: boolean;
  /** Canonical title, so Braino says "The Shawshank Redemption", not "shawshank". */
  title?: string;
  year?: number;
  kind?: WatchKind;
  watchmodeId?: number;
  region: string;
  /** The one to open. Absent when it is not streamable here at all. */
  pick?: WatchSource;
  /** Everything else it is on, for "not on Netflix here, but it is on Prime". */
  alternatives: WatchSource[];
  askedFor?: string;
  askedForAvailable?: boolean;
  /** True when we only have the show, not the episode. Delegate finishes. */
  needsEpisodeNavigation?: boolean;
  season?: number;
  episode?: number;
  /** Set when the region simply is not on the Watchmode plan. Not the user's fault. */
  regionUnsupported?: boolean;
  /** Set when the model had to work out what film a description meant. */
  resolvedFromDescription?: string;
  note?: string;
}

/* Spoken platform names are not provider names. "prime" is "Amazon Prime Video",
   and Watchmode calls it plain "Amazon". Matching on a normalised name beats
   hardcoding source ids, which drift and which I would only be guessing at. */
const PLATFORM_ALIASES: Record<string, string[]> = {
  netflix: ["netflix"],
  prime: ["amazon prime video", "prime video", "amazon video", "amazon"],
  disney: ["disney plus", "disney+", "hotstar", "jiohotstar", "disney+ hotstar"],
  apple: ["apple tv plus", "apple tv+", "apple tv", "appletv"],
  youtube: ["youtube", "youtube premium", "youtube free"],
  hulu: ["hulu"],
  max: ["max", "hbo max"],
  jio: ["jiocinema", "jiohotstar", "hotstar"],
};

/* The bucket key is for matching. This is what Braino says out loud. */
const PLATFORM_LABEL: Record<string, string> = {
  netflix: "Netflix", prime: "Prime Video", disney: "Disney+ Hotstar",
  apple: "Apple TV", youtube: "YouTube", hulu: "Hulu", max: "Max", jio: "JioHotstar",
};

export function platformLabel(key?: string): string {
  if (!key) return "that service";
  return PLATFORM_LABEL[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function normalise(s: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9+ ]/g, "").replace(/\s+/g, " ").trim();
}

/** "on netflix" -> the alias bucket, so we can compare against source names. */
export function platformKey(spoken: string): string | null {
  const n = normalise(spoken);
  if (!n) return null;
  for (const [key, names] of Object.entries(PLATFORM_ALIASES)) {
    if (key === n) return key;
    if (names.some((name) => n.includes(name) || name.includes(n))) return key;
  }
  return null;
}

function sourceMatchesPlatform(sourceName: string, key: string): boolean {
  const n = normalise(sourceName);
  const names = PLATFORM_ALIASES[key] || [key];
  return names.some((name) => n.includes(name)) || n.includes(key);
}

/* Netflix serves the same numeric id at /title/ (a detail page you then have to
   click) and at /watch/ (the player, already running). Watchmode hands back the
   title form — verified: it returns netflix.com/title/80057281 for Stranger
   Things — so this rewrite is what turns "opened Netflix" into "it is playing".
   The rewritten URL was checked live and returns 200.

   Everything else passes through untouched. Inventing URL shapes for platforms
   whose format has not been verified is how you ship a link that 404s in
   somebody's living room. */
export function toPlayerUrl(name: string, url: string): { url: string; autoplays: boolean } {
  const n = normalise(name);
  if (n.includes("netflix")) {
    const m = url.match(/netflix\.com\/(?:[a-z-]+\/)?title\/(\d+)/i);
    if (m) return { url: `https://www.netflix.com/watch/${m[1]}`, autoplays: true };
    if (/netflix\.com\/(?:[a-z-]+\/)?watch\/\d+/i.test(url)) return { url, autoplays: true };
  }
  return { url, autoplays: false };
}

/* Watchmode signals plan and quota problems as a 200-shaped JSON error on some
   routes and a 4xx on others, so both paths have to be read. */
class WatchmodeError extends Error {
  constructor(message: string, readonly regionUnsupported = false) {
    super(message);
  }
}

async function getJson(url: string, label: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await res.json().catch(() => null);
  const failure = body && typeof body === "object" && (body as any).success === false;
  if (!res.ok || failure) {
    const detail = String((body as any)?.statusMessage || `${label} failed (${res.status})`);
    throw new WatchmodeError(detail, /is not enabled for your current plan/i.test(detail));
  }
  return body;
}

/* ── 1. Identity ──────────────────────────────────────────────────────────
   Spoken titles are messy: "shawshank", "stranger things". Autocomplete search
   is fuzzy and relevance-ranked, and returns type and year, which is everything
   TMDB was being asked for. Verified: "shawshank" scores The Shawshank
   Redemption at 199 and the nearest decoy at 84. */
async function searchTitles(term: string, key: string): Promise<any[]> {
  const data = await getJson(
    `${WATCHMODE}/autocomplete-search/?apiKey=${key}` +
    `&search_value=${encodeURIComponent(term)}&search_type=2`,
    "Watchmode search",
  );
  return Array.isArray(data?.results) ? data.results : [];
}

async function identify(req: WatchRequest): Promise<{
  id: number; kind: WatchKind; title: string; year?: number; viaDescription?: string;
} | null> {
  let results = await searchTitles(req.query, req.watchmodeKey);
  let viaDescription: string | undefined;

  /* Empty index result means they described it rather than named it. Ask the
     model for the title and try once more. Never a third time — if the model's
     guess also misses, we genuinely do not know and should say so. */
  if (!results.length && req.openaiKey) {
    const guess = await titleFromDescription(req.query, req.openaiKey).catch(() => null);
    if (guess) {
      results = await searchTitles(guess, req.watchmodeKey);
      if (results.length) viaDescription = guess;
    }
  }

  /* Watchmode types: movie, tv_series, tv_miniseries, tv_special, tv_movie,
     short_film. Anything tv_series-shaped is a show for our purposes. */
  const kindOf = (t: string): WatchKind =>
    /^tv_(series|miniseries)$/.test(String(t)) ? "tv" : "movie";

  const wantsTv = req.kind === "tv" || req.season != null || req.episode != null;
  const usable = results.filter((r) => {
    if (r?.result_type !== "title" || !r?.id) return false;
    if (req.kind) return kindOf(r.type) === req.kind;
    return true;
  });
  if (!usable.length) return null;

  /* A season or episode in the ask is a strong signal it is a show, whatever
     relevance thinks. Otherwise trust Watchmode's own ranking. */
  const ranked = usable.sort((a, b) => {
    if (wantsTv) {
      const at = kindOf(a.type) === "tv", bt = kindOf(b.type) === "tv";
      if (at !== bt) return at ? -1 : 1;
    }
    return (b.relevance || 0) - (a.relevance || 0);
  });

  const top = ranked[0];
  return {
    id: Number(top.id),
    kind: kindOf(top.type),
    title: String(top.name || req.query),
    year: top.year ? Number(top.year) : undefined,
    viaDescription,
  };
}

/* ── 2. Sources and deep links ────────────────────────────────────────────
   One row per format, so SD/HD/4K arrive as three identical URLs. Deduped on
   name plus type. ios_url and android_url are the literal string "Deeplinks
   available for paid plans only." on the free tier, so they are never read. */
async function sourcesFor(
  titleId: number, region: string, key: string,
): Promise<WatchSource[]> {
  const raw = await getJson(
    `${WATCHMODE}/title/${titleId}/sources/?apiKey=${key}&regions=${region}`,
    "Watchmode sources",
  );
  const list: any[] = Array.isArray(raw) ? raw : (raw?.sources || []);

  const seen = new Set<string>();
  const out: WatchSource[] = [];
  for (const s of list) {
    const name = String(s?.name || "");
    const url = String(s?.web_url || "");
    if (!name || !/^https?:\/\//i.test(url)) continue;
    if (s?.region && String(s.region).toUpperCase() !== region) continue;

    const type = String(s?.type || "sub");
    const dedupe = `${normalise(name)}|${type}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    const player = toPlayerUrl(name, url);
    out.push({
      name, type, url: player.url, autoplays: player.autoplays,
      price: s?.price ?? null,
    });
  }

  /* Included-with-subscription first: nobody who says "play this" means "open
     the page where I can buy it". */
  const rank: Record<string, number> = { sub: 0, free: 1, ads: 2, tve: 3, rent: 4, buy: 5 };
  return out.sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9));
}

/* ── The whole pipeline ─────────────────────────────────────────────────── */
export async function resolveWatch(req: WatchRequest): Promise<WatchResult> {
  const region = (req.region || "IN").toUpperCase();
  const asked = req.platform ? platformKey(req.platform) : null;
  const base: WatchResult = { found: false, region, alternatives: [], askedFor: asked || undefined };

  try {
    const id = await identify(req);
    if (!id) return { ...base, note: `Could not find anything called "${req.query}".` };

    const meta = {
      title: id.title, year: id.year, kind: id.kind, watchmodeId: id.id,
      resolvedFromDescription: id.viaDescription,
    };
    const sources = await sourcesFor(id.id, region, req.watchmodeKey);

    if (!sources.length) {
      return {
        ...base, ...meta, found: true,
        note: `${id.title} does not seem to be streaming anywhere in ${region} right now.`,
      };
    }

    const wanted = asked ? sources.find((s) => sourceMatchesPlatform(s.name, asked)) : undefined;
    const pick = wanted || sources[0];

    /* Episode addressing is the one genuinely soft edge, and the API confirms
       it: a show's Netflix row comes back as the series link with seasons and
       episodes counts, never an episode URL. So we say so, and the browser
       delegate — already good at clicking through a page it can see — finishes
       the last hop rather than us pretending we nailed it. */
    const wantsEpisode = id.kind === "tv" && (req.season != null || req.episode != null);

    return {
      ...base, ...meta,
      found: true,
      pick,
      alternatives: sources.filter((s) => s !== pick),
      askedForAvailable: asked ? Boolean(wanted) : undefined,
      needsEpisodeNavigation: wantsEpisode || undefined,
      season: req.season,
      episode: req.episode,
      note: asked && !wanted ? `Not on ${platformLabel(asked)} in ${region}. It is on ${pick.name}.` : undefined,
    };
  } catch (err) {
    if (err instanceof WatchmodeError && err.regionUnsupported) {
      return {
        ...base, regionUnsupported: true,
        note: `Watchmode's plan does not cover ${region}, so there is nothing to look up there yet.`,
      };
    }
    throw err;
  }
}

/** One spoken line for Braino, built from the same result the UI renders. */
export function spokenLine(r: WatchResult): string {
  if (r.regionUnsupported) return r.note || "I cannot check availability in your country yet.";
  if (!r.found || !r.title) return r.note || "I could not find that one.";
  if (!r.pick) return r.note || `${r.title} is not streaming in ${r.region} right now.`;

  const ep = r.season != null && r.episode != null
    ? ` season ${r.season}, episode ${r.episode}` : "";

  if (r.askedFor && r.askedForAvailable === false) {
    return `${r.title} is not on ${platformLabel(r.askedFor)} in ${r.region}. It is on ${r.pick.name}, opening that.`;
  }
  if (r.pick.type === "rent" || r.pick.type === "buy") {
    const price = r.pick.price ? ` for ${r.pick.price}` : "";
    return `${r.title} is only a ${r.pick.type}${price} on ${r.pick.name} here. Opening it, your call.`;
  }
  if (r.needsEpisodeNavigation || !r.pick.autoplays) {
    return `Opening ${r.title}${ep} on ${r.pick.name}.`;
  }
  return `Playing ${r.title} on ${r.pick.name}.`;
}

/* ── Parsing what was actually said ─────────────────────────────────────
   A regex, not a model call: "play X on Netflix" is a shape, not a
   comprehension problem, and the round trip would cost more than the lookup.
   Callers that already know the title send structured fields and skip this. */

/* Platforms people actually say out loud. Order matters: "prime video" has to
   beat "prime", and "disney plus hotstar" has to beat "hotstar". */
const SPOKEN_PLATFORMS = [
  "prime video", "amazon prime video", "amazon prime", "primevideo",
  "disney plus hotstar", "jiohotstar", "disney plus", "disney+", "jiocinema",
  "apple tv plus", "apple tv+", "apple tv",
  "netflix", "hotstar", "youtube", "hulu", "hbo max", "max", "prime", "amazon",
];

export interface Parsed {
  query: string; platform?: string; season?: number; episode?: number; kind?: WatchKind;
}

/* "play stranger things season 2 episode 5 on netflix" ->
   { query: "stranger things", platform: "netflix", season: 2, episode: 5 } */
export function parseSpoken(raw: string): Parsed {
  let t = String(raw || "").trim().replace(/[?!.]+$/, "");
  const out: Parsed = { query: "" };

  t = t.replace(/^\s*(?:hey\s+)?braino[,\s]+/i, "");
  t = t.replace(/^\s*(?:can you\s+)?(?:please\s+)?(?:go ahead and\s+)?/i, "");
  t = t.replace(/^\s*(?:play|put on|start|watch|stream|open)\s+/i, "");

  for (const name of SPOKEN_PLATFORMS) {
    const re = new RegExp(`\\s+(?:on|in|using|over)\\s+${name.replace(/[+]/g, "\\+")}\\b`, "i");
    if (re.test(t)) { out.platform = name; t = t.replace(re, ""); break; }
  }

  const se = t.match(/\bs(?:eason)?\s*(\d{1,2})\s*(?:,|\s)?\s*(?:e(?:pisode)?)\s*(\d{1,3})\b/i);
  if (se) {
    out.season = Number(se[1]); out.episode = Number(se[2]); out.kind = "tv";
    t = t.replace(se[0], "");
  } else {
    const sOnly = t.match(/\bseason\s*(\d{1,2})\b/i);
    if (sOnly) { out.season = Number(sOnly[1]); out.kind = "tv"; t = t.replace(sOnly[0], ""); }
    const eOnly = t.match(/\bepisode\s*(\d{1,3})\b/i);
    if (eOnly) { out.episode = Number(eOnly[1]); out.kind = "tv"; t = t.replace(eOnly[0], ""); }
  }

  out.query = t.replace(/\s{2,}/g, " ").replace(/[,\s]+$/, "").trim();
  return out;
}
