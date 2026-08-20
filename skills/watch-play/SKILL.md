---
name: watch-play
description: Use when the user asks Braino to play, put on, watch or stream a movie or TV show — with or without naming a platform ("play Shawshank on Netflix", "put on Stranger Things season 2 episode 5", "where can I watch Dune"). Also covers "is X on Netflix here" availability questions.
---

# Watch + Play

Turn "play Shawshank on Netflix" into an open tab with the player already running.

## The one thing to understand

The link is the easy half. `netflix.com/watch/{id}` starts playback on its own. The whole
problem is turning a spoken title into that id, and **Netflix has no public API for it**.

So: **TMDB identifies, Watchmode links.** Never scrape a streaming service for ids, never
automate past a login wall. Both of those get accounts banned and there is no version of
them worth shipping.

## Core Flow

1. Parse the ask into title, platform (if named), season, episode.
2. Call `watch-play` with the user's region from `bgGetUserGeo()`.
3. Read `speak` back to the user and open `pick.url` in a new tab.
4. If `needsEpisodeNavigation` is set, hand the tab to the browser delegate to click
   through to the right episode.

## The endpoint

`POST /functions/v1/watch-play` — needs a user JWT.

```jsonc
// Either send raw text and let it parse:
{ "text": "play Stranger Things season 2 episode 5 on Netflix", "region": "IN" }

// Or send structured fields, which always win over the parse:
{ "query": "Stranger Things", "platform": "netflix",
  "season": 2, "episode": 5, "kind": "tv", "region": "IN" }
```

Response:

```jsonc
{
  "found": true,
  "title": "Stranger Things",       // canonical — say this, not what they said
  "year": "2016",
  "kind": "tv",
  "region": "IN",
  "pick": {
    "name": "Netflix",
    "type": "sub",                  // sub | free | ads | tve | rent | buy
    "url": "https://www.netflix.com/watch/80057281",
    "autoplays": true               // true = the player starts by itself
  },
  "alternatives": [ /* same shape */ ],
  "askedFor": "netflix",
  "askedForAvailable": true,
  "needsEpisodeNavigation": true,
  "speak": "Opening Stranger Things season 2, episode 5 on Netflix."
}
```

## Rules

- **Always say the canonical title.** They said "shawshank", Braino says "The Shawshank
  Redemption". It is how he sounds like he knows the film.
- **`type: "rent"` or `"buy"` is not "playing".** Say it costs money and let them decide.
  Opening a checkout page because someone said "play" is a bad surprise.
- **`askedForAvailable: false` is a useful answer, not a failure.** "That is not on Netflix
  in India, it is on Prime — want that instead?" beats a dead link every time.
- **`autoplays: false` means the tab lands on a detail page.** Say "opening", not "playing".
  Only Netflix is rewritten to a true player URL; other platforms' formats are unverified
  and inventing one ships a 404.
- **Region comes from geo, never from a guess.** `bgGetUserGeo()` already returns
  `countryCode` with no permission prompt. Catalogues differ enormously by country.
- **Login walls are the user's problem to solve.** If they are signed out, Braino says so
  and stops. He does not type credentials.

## Setup

Two secrets, both free tiers:

| Secret | Where | Without it |
|---|---|---|
| `TMDB_API_KEY` | themoviedb.org/settings/api | Function returns `setup: true` and does nothing |
| `WATCHMODE_API_KEY` | api.watchmode.com (2,500 req/month) | Availability answers still work; **no deep links** |

That degradation is deliberate. With TMDB alone Braino can still say "Dune is on Prime in
India" — he just cannot open it for you.

## Known soft edges

- **Episode-level deep links are not reliable.** A show-level link lands on the series
  page. `needsEpisodeNavigation` flags it so the delegate finishes the last hop rather
  than Braino pretending it nailed it.
- **The JioHotstar URL format is unverified.** It passes through untouched from Watchmode
  rather than being constructed. If it turns out to be wrong, fix it in `toPlayerUrl`.
- **Watchmode's response shape was written against their published field names**
  (`web_url`, `source_id`, `name`, `type`, `region`) but the parser is deliberately
  tolerant — it accepts a bare array or `{ sources: [] }`. Tighten it once there is a real
  key and a real response to look at.

## Related

- `_shared/watch-resolve.ts` — the pipeline, and the only URL rewrite in the codebase
- `src/test/watch-resolve.test.ts` — the parser tests; add a case for every phrasing that
  ever comes out wrong
- Party tricks (`__sbSpotifyPlayTrack`) — the existing "open a tab and make it play" pattern
