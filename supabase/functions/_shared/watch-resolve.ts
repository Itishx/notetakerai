/* ============================================================================
   watch-resolve — "play Shawshank on Netflix" into a URL that opens the player.

   The link is the easy half. netflix.com/watch/{id} starts playback on its own;
   the whole problem is turning a spoken title into that id, and Netflix has no
   public API for it. So the pipeline is:

     TMDB       identify the title (canonical name, year, movie vs tv, tmdb id)
     TMDB       is it even available in this user's country, and on what
     Watchmode  the actual per-region deep link for the chosen platform

   TMDB is free and authoritative on identity but returns no deep links.
   Watchmode returns the deep links but is a paid-ish quota, so we only reach
   for it once TMDB has told us the title exists and is worth a lookup.

   Nothing here scrapes anything. Every id comes from an API that exists to give
   it to us, which is the only reason this is safe to ship: automating a login
   wall or scraping catalogue pages is exactly the kind of thing that gets an
   account banned, and there is no version of that we want.
   ========================================================================== */

const TMDB = "https://api.themoviedb.org/3";
const WATCHMODE = "https://api.watchmode.com/v1";

export type WatchKind = "movie" | "tv";

export interface WatchRequest {
  /** What the user said, minus the platform and episode: "the shawshank redemption". */
  query: string;
  /** Platform they named, if any. Free text: "netflix", "prime", "hotstar". */
  platform?: string;
  kind?: WatchKind;
  season?: number;
  episode?: number;
  /** ISO-3166 alpha-2. Comes from bgGetUserGeo() on the client. */
  region?: string;
  tmdbKey: string;
  watchmodeKey?: string;
}

export interface WatchSource {
  name: string;
  /** sub | free | rent | buy | tve — a rental is not the same answer as "it's included". */
  type: string;
  url: string;
  /** True when we rewrote a title page into a player URL. See toPlayerUrl. */
  autoplays: boolean;
}

export interface WatchResult {
  found: boolean;
  /** Canonical title, so Braino says "The Shawshank Redemption", not "shawshank". */
  title?: string;
  year?: string;
  kind?: WatchKind;
  tmdbId?: number;
  region: string;
  /** The one to open. Absent when the title is not streamable here at all. */
  pick?: WatchSource;
  /** Everything else it is on, for "not on Netflix here, but it is on Prime". */
  alternatives: WatchSource[];
  /** Set when they asked for a platform that does not carry it in this region. */
  askedFor?: string;
  askedForAvailable?: boolean;
  /** True when we could only get the show, not the episode. Delegate finishes. */
  needsEpisodeNavigation?: boolean;
  season?: number;
  episode?: number;
  note?: string;
}

/* Spoken platform names are not provider names. "prime" is "Amazon Prime Video",
   "hotstar" has been three different brands in as many years. Matching on a
   normalised name beats hardcoding provider ids, which drift per region and
   which I would only be guessing at. */
const PLATFORM_ALIASES: Record<string, string[]> = {
  netflix: ["netflix"],
  prime: ["amazon prime video", "prime video", "amazon video", "amazon"],
  disney: ["disney plus", "disney+", "hotstar", "jiohotstar", "disney+ hotstar"],
  apple: ["apple tv plus", "apple tv+", "apple tv"],
  youtube: ["youtube", "youtube premium", "youtube free"],
  hulu: ["hulu"],
  max: ["max", "hbo max"],
  jio: ["jiocinema", "jiohotstar", "hotstar"],
};

function normalise(s: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9+ ]/g, "").replace(/\s+/g, " ").trim();
}

/** "on netflix" -> the alias bucket, so we can compare against provider names. */
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
   title form, so this is the one rewrite that turns "here is the page" into
   "it is playing". Everything else is passed through untouched — inventing URL
   shapes for platforms whose format I have not verified is how you ship a link
   that 404s in someone's living room. */
export function toPlayerUrl(name: string, url: string): { url: string; autoplays: boolean } {
  const n = normalise(name);
  if (n.includes("netflix")) {
    const m = url.match(/netflix\.com\/(?:[a-z-]+\/)?title\/(\d+)/i);
    if (m) return { url: `https://www.netflix.com/watch/${m[1]}`, autoplays: true };
    if (/netflix\.com\/(?:[a-z-]+\/)?watch\/\d+/i.test(url)) return { url, autoplays: true };
  }
  return { url, autoplays: false };
}

async function getJson(url: string, label: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${label} failed (${res.status})`);
  return res.json();
}

/* ── 1. Identity ──────────────────────────────────────────────────────────
   Spoken titles are messy: "shawshank", "stranger things season 2". TMDB's
   multi search handles the fuzziness and, importantly, tells us movie vs tv so
   the caller does not have to guess which endpoint to hit next. */
async function identify(req: WatchRequest): Promise<{
  id: number; kind: WatchKind; title: string; year: string;
} | null> {
  const url = `${TMDB}/search/multi?api_key=${req.tmdbKey}` +
    `&query=${encodeURIComponent(req.query)}&include_adult=false&language=en-US`;
  const data = await getJson(url, "TMDB search");
  const results: any[] = Array.isArray(data?.results) ? data.results : [];

  const usable = results.filter((r) => {
    if (r?.media_type !== "movie" && r?.media_type !== "tv") return false;
    if (req.kind && r.media_type !== req.kind) return false;
    return true;
  });
  if (!usable.length) return null;

  /* A season/episode in the ask is a strong signal it is a show, whatever
     TMDB's popularity ranking thinks. */
  const wantsTv = req.kind === "tv" || req.season != null || req.episode != null;
  const ranked = usable.sort((a, b) => {
    if (wantsTv && a.media_type !== b.media_type) return a.media_type === "tv" ? -1 : 1;
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const top = ranked[0];
  const date = String(top.release_date || top.first_air_date || "");
  return {
    id: Number(top.id),
    kind: top.media_type as WatchKind,
    title: String(top.title || top.name || req.query),
    year: date.slice(0, 4),
  };
}

/* ── 2. Availability ──────────────────────────────────────────────────────
   Free, region-aware, and often the whole answer: "that is not on Netflix in
   India" is more useful than a link that lands on a signup wall. */
async function providersInRegion(
  kind: WatchKind, id: number, region: string, tmdbKey: string,
): Promise<string[]> {
  const data = await getJson(
    `${TMDB}/${kind}/${id}/watch/providers?api_key=${tmdbKey}`, "TMDB providers",
  );
  const bucket = data?.results?.[region];
  if (!bucket) return [];
  const names = new Set<string>();
  for (const group of ["flatrate", "free", "ads", "rent", "buy"]) {
    for (const p of (bucket[group] || [])) if (p?.provider_name) names.add(String(p.provider_name));
  }
  return [...names];
}

/* ── 3. Deep links ────────────────────────────────────────────────────────
   The only step that costs quota, so it runs last and only for a title we have
   already confirmed exists and streams somewhere in this region. */
async function watchmodeSources(
  kind: WatchKind, tmdbId: number, region: string, key: string,
): Promise<WatchSource[]> {
  const field = kind === "movie" ? "tmdb_movie_id" : "tmdb_tv_id";
  const found = await getJson(
    `${WATCHMODE}/search/?apiKey=${key}&search_field=${field}&search_value=${tmdbId}`,
    "Watchmode search",
  );
  const titleId = found?.title_results?.[0]?.id ?? found?.results?.[0]?.id;
  if (!titleId) return [];

  const raw = await getJson(
    `${WATCHMODE}/title/${titleId}/sources/?apiKey=${key}&regions=${region}`,
    "Watchmode sources",
  );
  const list: any[] = Array.isArray(raw) ? raw : (raw?.sources || []);

  const seen = new Set<string>();
  const out: WatchSource[] = [];
  for (const s of list) {
    const name = String(s?.name || "");
    const url = String(s?.web_url || s?.url || "");
    if (!name || !url) continue;
    /* Watchmode returns a row per region even when asked for one; belt and
       braces, because a US link in an India result is a dead end. */
    if (s?.region && String(s.region).toUpperCase() !== region) continue;
    const dedupe = `${normalise(name)}|${s?.type || ""}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const player = toPlayerUrl(name, url);
    out.push({ name, type: String(s?.type || "sub"), url: player.url, autoplays: player.autoplays });
  }

  /* Included-with-subscription first: nobody asking Braino to "play" something
     means "open the buy page for it". */
  const rank: Record<string, number> = { sub: 0, free: 1, ads: 2, tve: 3, rent: 4, buy: 5 };
  return out.sort((a, b) => (rank[a.type] ?? 9) - (rank[b.type] ?? 9));
}

/* ── The whole pipeline ─────────────────────────────────────────────────── */
export async function resolveWatch(req: WatchRequest): Promise<WatchResult> {
  const region = (req.region || "US").toUpperCase();
  const asked = req.platform ? platformKey(req.platform) : null;
  const base: WatchResult = { found: false, region, alternatives: [], askedFor: asked || undefined };

  const id = await identify(req);
  if (!id) return { ...base, note: `Could not find anything called "${req.query}".` };

  const providers = await providersInRegion(id.kind, id.id, region, req.tmdbKey);
  const meta = { title: id.title, year: id.year, kind: id.kind, tmdbId: id.id };

  if (!providers.length) {
    return {
      ...base, ...meta, found: true,
      note: `${id.title} does not appear to be streaming anywhere in ${region} right now.`,
    };
  }

  /* Answer the availability question from TMDB before spending Watchmode quota
     on a platform we already know does not carry it. */
  const askedAvailable = asked ? providers.some((p) => sourceMatchesPlatform(p, asked)) : undefined;

  if (!req.watchmodeKey) {
    return {
      ...base, ...meta, found: true, askedForAvailable: askedAvailable,
      alternatives: providers.map((name) => ({ name, type: "sub", url: "", autoplays: false })),
      note: "WATCHMODE_API_KEY is not set, so this is availability only, no deep link.",
    };
  }

  const sources = await watchmodeSources(id.kind, id.id, region, req.watchmodeKey);
  if (!sources.length) {
    return {
      ...base, ...meta, found: true, askedForAvailable: askedAvailable,
      alternatives: providers.map((name) => ({ name, type: "sub", url: "", autoplays: false })),
      note: `${id.title} is on ${providers.join(", ")} in ${region}, but no direct link came back.`,
    };
  }

  const wanted = asked ? sources.find((s) => sourceMatchesPlatform(s.name, asked)) : undefined;
  const pick = wanted || sources[0];
  const alternatives = sources.filter((s) => s !== pick);

  /* Episode addressing is the one genuinely soft edge. A show-level deep link
     lands on the series page, not on S2E5, and there is no reliable public
     mapping from an episode to its own Netflix id. So we say so, and the
     browser delegate — which is already good at clicking through a page it can
     see — finishes the last hop rather than us pretending we nailed it. */
  const wantsEpisode = id.kind === "tv" && (req.season != null || req.episode != null);

  return {
    ...base, ...meta,
    found: true,
    pick,
    alternatives,
    askedForAvailable: asked ? Boolean(wanted) : undefined,
    needsEpisodeNavigation: wantsEpisode || undefined,
    season: req.season,
    episode: req.episode,
    note: asked && !wanted
      ? `Not on ${req.platform} in ${region}. It is on ${pick.name}.`
      : undefined,
  };
}

/** One spoken line for Braino, built from the same result the UI renders. */
export function spokenLine(r: WatchResult): string {
  if (!r.found || !r.title) return r.note || "I could not find that one.";
  if (!r.pick) return r.note || `${r.title} is not streaming in ${r.region} right now.`;

  const ep = r.season != null && r.episode != null ? ` season ${r.season}, episode ${r.episode}` : "";
  if (r.askedFor && r.askedForAvailable === false) {
    return `${r.title} is not on ${r.askedFor} in ${r.region}. It is on ${r.pick.name}, opening that.`;
  }
  if (r.pick.type === "rent" || r.pick.type === "buy") {
    return `${r.title} is only a ${r.pick.type} on ${r.pick.name} here. Opening it, your call.`;
  }
  if (r.needsEpisodeNavigation) {
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
