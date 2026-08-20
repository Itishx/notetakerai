---
name: watch-play
description: Use when the user asks Braino to play, put on, watch or stream a movie or TV show — with or without naming a platform ("play Shawshank on Netflix", "put on Stranger Things season 2 episode 5", "where can I watch Dune"). Also covers "is X on Netflix here" availability questions.
---

# Watch + Play

Turn "play Shawshank on Netflix" into an open tab with the player already running.

## The one thing to understand

The link is the easy half. `netflix.com/watch/{id}` starts playback on its own. The whole
problem is turning a spoken title into that id, and **Netflix has no public API for it**.

So: **Watchmode does all of it** — fuzzy title search, availability, and the deep link.
TMDB was in here for identity and got dropped: it is not free commercially, and Watchmode's
own autocomplete answers "what did they mean" just as well. One API, one key, one bill.

Never scrape a streaming service for ids, never automate past a login wall. Both get
accounts banned and there is no version of them worth shipping.

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

One secret: `WATCHMODE_API_KEY` from api.watchmode.com. **Already set in production.**
Without it the function returns `setup: true` and does nothing.

**The free plan is one region.** `/v1/regions/` reports `plan_enabled` per country and on
the current key only **IN** is true — the other 53 are false. Asking about a US catalogue
returns `regionUnsupported`, which is a plan limit and not the user's fault, so Braino says
so rather than pretending the film does not exist. Going worldwide means paying Watchmode.

**App deeplinks (`ios_url`, `android_url`) are paid-tier.** On the free plan they come back
as the literal string "Deeplinks available for paid plans only.", so only `web_url` is ever
read. That is fine — Braino opens browser tabs.

## Relative references

Nobody says "season five episode eight". They say "the final episode", and Braino is
expected to know that is S5E8.

| Said | Resolved |
|---|---|
| "the final episode of Stranger Things" | S5E8 "Chapter Eight: The Rightside Up" |
| "the first episode of Breaking Bad" | S1E1 "Pilot" |
| "the last episode of season 2 of Stranger Things" | S2E9 "Chapter Nine: The Gate" |
| "the finale of X" | last episode of the last season |
| "the latest episode" | newest **already aired**, not the newest listed |
| "episode 2 from season 4" | S4E2 — both word orders work |

Resolved against `/v1/title/{id}/episodes/`, which returns every episode with real season
and episode numbers. **That call only fires when a relative reference is present** — it is
the most expensive request in the API and "season 2 episode 5" is already concrete.

Braino says the episode's name back ("season 5, episode 8, Chapter Eight: The Rightside
Up") because that is how he shows he understood rather than guessed.

## Region

**Never trust the system locale for country.** A Mac set to `en-GB` in Delhi reports GB,
asks for the British catalogue, and gets nothing. The Mac uses ipapi (cached for the day)
with locale only as a last resort; the extension uses `bgGetUserGeo()`.

**The server also protects itself.** If the asked-for region is not on the Watchmode plan,
it looks up which regions *are*, answers from one of those, and sets
`regionSubstitutedFrom`. Refusing to answer is the worst possible outcome.

## Getting to the actual episode

Watchmode will not sell an episode's own Netflix id below the $349 Startup tier, and a
**series** id at `/watch/` does not play the episode you asked for — it resumes wherever
that account left off. Asking for S2E5 and landing in S2E3 is worse than not opening the
player, because it looks like it worked. So when an episode is named, the resolver hands
back the `/title/` page and the extension drives the last hop.

It is a state machine, not one long script, because clicking a profile navigates and
destroys the injected context:

1. **Read the page** — profile gate, title page, player, or unrecognised
2. **Profile gate** → click the user's own profile, wait, re-read
3. **Title page** → pick the season, click the episode by its own number
4. **Player** → done

**The profile step only clicks when it is sure**: an exact or first-name match against
`authDisplayName`, or a single profile with nothing to confuse it with. Otherwise it stops
and asks, because picking wrong writes to somebody else's watch history.

**Episode matching reads Netflix's own episode-number element** and falls back to position,
never to the row's whole text — a synopsis can contain any number, and matching "5" against
prose is how you end up back where you started.

Failing leaves the user on the episode list and **Braino says so**. Sitting silently on a
list after being asked for episode 5 is the same failure as playing the wrong one, just
quieter.

**The Mac does not do this hop.** It hands the URL to the default browser via
`shell.openExternal`, so there is no tab to drive. If Chrome is the default browser and the
extension is installed, the user lands on the episode list and clicks once.

## Known soft edges

- **Episode-level deep links are paid-tier.** The episodes endpoint returns `web_url` as
  the literal string "Episode links available for paid plans only.", so we know exactly
  which episode is meant but still land on the series page. `needsEpisodeNavigation` flags
  it so the delegate finishes the last hop rather than Braino pretending it nailed it.
- **Only Netflix gets a URL rewrite**, and it is verified: Watchmode returns
  `netflix.com/title/80057281` for Stranger Things, and the rewritten `/watch/` form
  returns HTTP 200. Every other platform passes through untouched.
- **Sources arrive once per format.** SD, HD and 4K come back as three rows with the same
  URL, so they are deduped on name plus type.

## Related

- `_shared/watch-resolve.ts` — the pipeline, and the only URL rewrite in the codebase
- `src/test/watch-resolve.test.ts` — the parser tests; add a case for every phrasing that
  ever comes out wrong
- Party tricks (`__sbSpotifyPlayTrack`) — the existing "open a tab and make it play" pattern
