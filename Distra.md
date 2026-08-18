# Distra

**The distribution engine. Engine two of Braino Foundry.**

Status: planning. Nothing in this document ships until the phase it belongs to is
built and tested. Written 18 August 2026, on branch `Distra`.

Companion spec: `BrainoX.md` (178 sections). BrainoX is Distra on one platform,
for one user. Distra is that system generalised. Where a rule already exists in
BrainoX, this document points at it rather than restating it.

---

## 1. The problem statement

A solo founder ships something and nobody sees it. Building got cheap. Being seen
did not. Every funded company in this market sells the building half. Nobody sells
the being seen.

Distra is the being seen, run end to end by an agent that already knows the
company, priced on the work it does.

**What "end to end" means, precisely:**

1. Something happens worth telling people about. A commit, a release, a demo, a
   thought said out loud.
2. Distra turns it into the right artefact for each surface. A post, a thread, a
   clip, a comment, an article.
3. Distra puts it out on schedule, in the founder's voice, everywhere at once,
   without the founder keeping the calendar.
4. Distra listens for the people who need it and gets into those conversations.
5. What lands comes back as signal, and the next round is better.

Fully autonomous means the founder does not run the calendar, does not open the
apps, and does not chase the schedule. It does **not** mean unattended publishing
by default. See section 4.

---

## 2. What already exists, honestly

This is not a blank page. The repository already contains two working execution
rails, and one of them is the reason Distra can beat Buffer.

**Rail A, server-side API publish. Working, on X only.**

- `x_connections` holds OAuth tokens, `x-oauth-start` / `x-oauth-callback` do the
  handshake.
- `scheduled_x_posts` is the dispatch table. `dispatch-scheduled-x-posts` runs
  every minute from `pg_cron`, with token refresh, thread splitting and claim
  locking in `_shared/x-dispatch.ts`.
- `x_queue_items` is the BrainoX queue above it: draft, review, approved,
  scheduled, publishing, published, failed, paused, rejected, archived.
- `_shared/brainox-policy.ts` is a hard gate: kill switch, length, exact and near
  duplicate at Jaccard 0.72, quiet hours, minimum gap, daily cap.
- `x_ideas`, `x_settings`, `x_action_log`, `x_post_analytics`,
  `x_follower_snapshots`, `x_automation_stats` round it out.
- `/x` (`src/pages/BrainoX.tsx`) is the command centre.

**Rail B, browser delegate publish. Working, on Reddit only, and almost forgotten.**

- `scheduled_reddit_posts` plus `dispatch_scheduled_reddit_posts()` on a one
  minute cron writes a plain English task into `agent_commands`.
- The Chrome extension picks the command up over realtime, opens
  `reddit.com/r/<sub>/submit` in the user's own logged-in session, fills the
  fields and clicks Post.
- No Reddit API key. No app review. No OAuth. The founder's own session does the
  posting, because Braino is already in the browser.

Rail B is the unfair advantage and the plan below leans on it hard. No competitor
in this category owns a browser agent that is already installed and already
signed in.

**What has never been tested:** the X path end to end, under load, over a week,
with real timing. That is Phase 0 and it comes before anything new gets built.

---

## 3. The architecture: three rails, one spine

Every platform gets classified into exactly one of three execution rails. The rail
is a property of the platform adapter, not of the content.

### Rail A, official API

Server-side. Supabase edge function, OAuth token in an encrypted column, cron
dispatch. Durable, auditable, survives the founder closing their laptop, and does
not risk the account.

Use whenever the platform has a real publish API on reasonable terms.

### Rail B, browser delegate

The Braino extension drives the platform in the founder's own authenticated
session, through the `agent_commands` queue that already exists. No API key, no
app review, no partner programme.

Use where the API is closed, gated behind months of review, priced out of reach,
or forbids the thing the founder legitimately wants to do on their own account.

Rail B costs nothing per action and unlocks roughly half the surfaces in this
document. It carries platform risk, so it is graded per platform in section 8 and
it obeys human pacing (section 9).

### Rail C, prepared handoff

Distra does everything except the final click. It writes the piece, formats it for
the surface, opens the tab, fills the fields, and stops. The founder reads it and
presses the button.

Use where automation is either impossible or reputationally fatal. Hacker News and
Product Hunt are the canonical examples: a bot-posted Show HN is worse than no
Show HN.

Rail C is not a failure state. It is the correct answer for surfaces where the
value is the founder's presence, and it still removes 95% of the work.

### The spine

One platform-agnostic core, with thin adapters hanging off it. The mistake to
avoid is building nine copies of BrainoX.

```
distra_channels     one row per connected account, per platform, per user
                    (platform, handle, rail, auth blob, scopes, health, limits)

distra_items        the atom of content, platform-agnostic
                    (source, original_input, body, pillar, canonical_url,
                     status, provenance, quality, policy, why)

distra_renditions   one item, rendered per platform
                    (item_id, channel_id, body, media, variant, char_budget,
                     status, scheduled_at, published_at, permalink, error)

distra_jobs         the unit the dispatcher claims and runs
                    (rendition_id, rail, run_after, attempts, claimed_at, result)

distra_signals      what came back (impressions, replies, clicks, follows)

distra_leads        people worth talking to, found by the listening engine
                    (platform, url, author, matched_terms, intent_score, state)

distra_policy       per channel, per user: caps, quiet hours, gates, autonomy level

distra_action_log   every single thing Distra did or refused to do, with why
```

The existing X tables are not thrown away. `scheduled_x_posts` becomes the X
adapter's private dispatch table, and `x_queue_items` migrates into
`distra_items` plus `distra_renditions` in Phase 2. Nothing is rewritten before
Phase 0 proves what is actually broken.

### The adapter contract

Every platform implements the same eight functions. Adding a platform means
writing one file, not touching the engine.

```ts
interface DistraAdapter {
  id: string                     // "x" | "linkedin" | "reddit" | ...
  rail: "api" | "browser" | "handoff"
  capabilities(): Capabilities   // text limit, media kinds, threads, links,
                                 // scheduling, comments, analytics
  connect(userId): AuthResult    // OAuth start/callback, or extension handshake
  validate(rendition): Verdict   // length, media specs, platform-specific rules
  publish(rendition): Published  // returns platform id + permalink, or a typed error
  verify(published): boolean     // read it back. did it actually go live
  listen(query): Mention[]       // for the lead engine, where possible
  metrics(published): Signals    // for the learning loop, where possible
}
```

`verify()` is not optional. Every rail can silently half-fail, browser rails most
of all. Nothing is marked published until it has been read back.

---

## 4. Autonomy and the gates

Distra inherits the four levels from `BrainoX.md` section 54, per channel rather
than globally. A founder can run Bluesky at Level 3 and LinkedIn at Level 1.

- **Level 0, manual.** Distra analyses and drafts. Nothing leaves.
- **Level 1, assisted.** Distra drafts and proposes a time. The founder approves.
- **Level 2, queue autopilot.** Distra publishes items the founder already
  approved, on its own schedule. This is the default and where most value sits.
- **Level 3, autonomous.** Distra generates and publishes inside voice and policy
  constraints. Earned per channel, never granted at setup.

**The five hard gates.** These never soften, at any level, on any platform. They
are the deck's promise and they are load-bearing.

1. Money. Anything that spends.
2. Anything published to a public surface for the first time on a new channel.
3. Messaging a human directly. DMs are never autonomous.
4. Deleting anything.
5. Changing a price or a promise.

He decides how. You decide whether.

**Graduation.** A channel moves from Level 1 to Level 2 after 20 approved items
with zero founder edits at approval time. It falls back a level on any policy
breach, any platform warning, or any founder rejection of a published item.

---

## 5. Build order

The instruction is start small and do not build everything at once. So the phases
are ordered by proof, not by ambition. Each phase has an exit test, and the next
phase does not start until it passes.

### Phase 0, prove X. No new platforms.

We have X and it has never been tested. Before anything is added, this must be
true and demonstrated:

- A test harness that schedules 20 posts across 48 hours and reports median and
  p95 drift between `scheduled_at` and the real posted-at timestamp.
- Token refresh proven by expiring a token deliberately and watching it recover.
- Duplicate and near-duplicate gates proven with a deliberately colliding pair.
- Failure path proven: kill the network mid-publish, confirm no double post,
  confirm the row lands in `failed` with a readable error.
- `verify()` added to the X path. Read the post back by id after publishing.
- The real cost per post measured against X's 2026 pay-per-use pricing.

**Exit test:** 20 for 20 published, zero duplicates, p95 drift under 90 seconds,
every row carries a verified permalink, and the measured cost per post is written
down.

**Why this is first:** every other platform copies this dispatcher's shape. Fixing
it once is nine fixes.

### Phase 1, the spine and the second rail

- `distra_*` tables, the adapter interface, the generic dispatcher.
- X refactored to be the first adapter behind the interface. Behaviour identical,
  proven by rerunning the Phase 0 harness.
- Bluesky added as the second adapter, because it is free, needs no approval, and
  proves the interface is genuinely platform-agnostic in about a day.
- Rail B formalised: the Reddit path generalised into a reusable browser publish
  contract with `verify()`.

**Exit test:** one item fans out to X and Bluesky from a single approval, both
verified, and the Reddit browser rail publishes and verifies through the same
generic dispatcher.

### Phase 2, the free and open tier

Mastodon, Dev.to, Discord, Telegram, and the owned channels (site, RSS,
newsletter). All cheap, all Rail A, all no approval. This is where the fan-out
number starts to look real without any paperwork.

**Exit test:** one thought, seven surfaces, one approval, all verified.

### Phase 3, the paperwork tier

LinkedIn personal profile first, because it is a same-day build and it is the
single highest-value surface for a B2B founder. Threads next. Then Meta app review
for Instagram and Facebook, which runs in the background for weeks while other
work continues.

**Exit test:** LinkedIn publishing daily for two weeks with zero platform
warnings.

### Phase 4, video

YouTube and TikTok, plus the rendition pipeline that makes clips out of what was
already shipped. This is the heaviest phase and it is deliberately last of the
publishing phases.

### Phase 5, the listening and lead engine

Reddit first, because that is where the buying intent actually is. Then X search,
then the long tail. Leads surface as a triage queue with drafted replies. Replies
stay at Level 1 far longer than posts do.

### Phase 6, the loop

Signals back into the model. What landed, what did not, per pillar, per platform,
per time of day. Feeds `BrainoX.md` sections 36 to 40, and feeds Braino Code, which
is the part a stack of tools cannot do.

---

## 6. Rail decision, at a glance

| Platform | Rail | Approval needed | Cost | Phase |
|---|---|---|---|---|
| X | A | none (pay per use) | $0.015 per post, $0.20 with a link | 0 |
| Bluesky | A | none | free | 1 |
| Reddit | B, A later | none for B | free | 1, 5 |
| Mastodon | A | none | free | 2 |
| Dev.to | A | none | free | 2 |
| Discord | A | none | free | 2 |
| Telegram | A | none | free | 2 |
| Newsletter | A | none | provider cost | 2 |
| Own site, RSS | A | none | free | 2 |
| LinkedIn personal | A | same day | free | 3 |
| LinkedIn company page | A | weeks to months | free | 3, later |
| Threads | A | Meta app review | free | 3 |
| Instagram | A | review + business verification | free | 3 |
| Facebook Page | A | rides Instagram's review | free | 3 |
| Pinterest | A | video demo review | free | 4 |
| YouTube | A | quota request | free | 4 |
| TikTok | A | audit for public posts | free | 4 |
| GitHub | A | none | free | 2 |
| Hashnode | A | Pro tier | subscription | 4 |
| Product Hunt | C | n/a | free | 4 |
| Hacker News | C | n/a | free | 4 |
| Medium | C | n/a | free | 4 |
| Substack | C | n/a | free | 4 |
| Quora | C | n/a | free | 5 |
| WhatsApp channel | B | none | free | 5 |

---

## 7. Platform sub-plans

Every entry follows the same shape: what Distra does there, the rail, the auth,
the technical path, the hard limits, the traps, and what success looks like as a
number rather than a feeling.

---

### 7.1 X

**What Distra does.** Posts, threads, replies, quote posts. The daily heartbeat of
the account. Already half built.

**Rail.** A. Already working.

**Auth.** OAuth 2.0 with PKCE, `x_connections`. Built.

**Technical path.** Built: `x-oauth-start` and `x-oauth-callback`, then
`scheduled_x_posts` drained by `dispatch-scheduled-x-posts` on a one minute cron,
with thread splitting and claim locking in `_shared/x-dispatch.ts`.
To add: `verify()` by reading the tweet back, and cost accounting per post.

**Hard limits and cost, 2026.** X replaced fixed tiers with pay-per-use as the
default for new developers on 6 February 2026. Post creation is $0.015. **A post
containing a URL is $0.20**, more than thirteen times the price. Post reads are
$0.005, user reads $0.010, capped at 2 million post reads a month before
Enterprise is required. The old Basic tier was retired and its subscribers were
force-migrated on 1 June 2026. Pro at $5,000 a month is closed to new signups.
Enterprise reportedly starts around $42,000 a month.

**Traps.**

- The link surcharge is a product decision, not an accounting detail. At $0.20 a
  link post, a founder posting three links a day pays $18 a month to X before
  Braino charges anything. **Design rule: the link goes in the first reply, not
  the post.** This is also better for reach, so the cheap answer and the correct
  answer agree.
- Analytics worth having (impressions, profile visits, follower attribution) need
  a paid tier. The MVP reports engagement counts and follower snapshots and says
  so. Do not quietly imply otherwise.
- X permits automated broadcasting. Automated replies, likes and follows are where
  the prohibitions concentrate, so engagement stays Level 1 by default.

**Risk.** Low for publishing. Medium for automated engagement.

**Success looks like.** 30 consecutive days of scheduled publishing with zero
missed slots, p95 drift under 90 seconds, every row carrying a verified permalink,
and a measured cost per post inside 20% of the modelled figure.

---

### 7.2 Bluesky

**What Distra does.** Mirror of the X heartbeat, plus its own thread style. The
cheapest full-fidelity surface that exists.

**Rail.** A.

**Auth.** No developer portal, no review queue, no key request. Create an account
and call the AT Protocol. OAuth or the legacy app password.

**Technical path.** `com.atproto.repo.createRecord` against the user's PDS with an
`app.bsky.feed.post` record. Rich text facets have to be computed by hand for
links and mentions, which is the only fiddly part. Images upload as blobs first.

**Hard limits.** Points based: 5,000 points an hour, 35,000 a day. A post costs 3
points, which is about 1,666 posts an hour. Effectively unlimited for a human.

**Cost.** Free.

**Traps.** Facet byte offsets are UTF-8 byte indices, not JavaScript string
indices. Get this wrong and links render as plain text.

**Risk.** Very low.

**Success looks like.** Second adapter written in under a day against the Phase 1
interface. If it takes longer, the interface is wrong, and that is the real thing
this platform is testing.

---

### 7.3 Reddit

**What Distra does.** Two very different jobs. Publishing to a subreddit is the
small one. Finding the person who just asked out loud for what you built is the
big one, and it is the single highest-intent lead source on the internet for a
solo founder.

**Rail.** B for publishing today, already working. A for listening.

**Auth.** Rail B needs nothing. Rail A is OAuth: script, web or installed app
types.

**Technical path.** Publishing is built: `scheduled_reddit_posts` plus
`dispatch_scheduled_reddit_posts()` on a one minute cron writing an English task
into `agent_commands` for the extension to execute in the founder's own session.
Listening is Phase 5: OAuth, then `/r/{sub}/search` and `/search` polled per
keyword set, deduped into `distra_leads`, scored for intent, replies drafted but
not sent.

**Hard limits.** OAuth gives 60 requests a minute as the baseline, tracked over a
ten minute rolling window, around 100 queries a minute per client id.
Unauthenticated `.json` endpoints were killed in May 2026, so anonymous scraping
is not a path. `/api/morechildren` is capped at one request every two seconds.

**Cost.** Free for this volume. Commercial use of the data requires a contract with
Reddit regardless of how the data is obtained, which needs a real answer before
Distra ships to paying customers.

**Traps.**

- Reddit has zero tolerance for the same link across many subreddits. That single
  behaviour is what gets apps and accounts killed, and it is exactly what a naive
  fan-out engine does. **Distra must treat Reddit as one target per campaign, not
  as one of nine broadcast destinations.** This needs to be a hard gate in the
  policy engine, not a guideline.
- Reddit now expects disclosure when content is primarily AI generated.
- Feed-style blasting that works on X gets shadowbanned here within days.
- Every subreddit has its own rules and its own karma thresholds. The adapter
  needs a per-subreddit rules cache, read before every post.

**Risk.** High if treated as a broadcast channel. Low if treated as a
conversation channel.

**Success looks like.** Publishing: 20 posts across 10 subreddits over a month
with zero removals and zero mod warnings. Listening: 50 leads surfaced in a week
with better than 60% judged worth reading by the founder, and every drafted reply
sent by a human.

---

### 7.4 LinkedIn

**What Distra does.** The highest-value B2B surface. Posts to the founder's
personal profile, which is where the reach actually is, and later the company
page.

**Rail.** A for publishing. Never B. See traps.

**Auth.** Personal profile needs `w_member_social`, and building against your own
profile is a same-day build. Company pages need `w_organization_social`, an admin
role, and Community Management API access through the Marketing Developer Platform
partner programme.

**Technical path.** `POST /rest/posts` with `X-Restli-Protocol-Version: 2.0.0` and
a version header. Note `/v2/ugcPosts` is deprecated: LinkedIn still accepts it but
does not guarantee parity and ships new features only on the Posts API. Images and
documents register through the assets endpoint first, then attach.

**Hard limits.** 150 requests per member per day and 100,000 per application per
day, both resetting at midnight UTC, both returning 429 when breached. Overlapping
APIs such as Posts and Social Actions have additive throttles. Your app's real
numbers are in the Developer Portal Analytics tab, not in the public docs.

**Cost.** Free.

**Traps.**

- **Company page access is a real project, not a checkbox.** It requires a legally
  registered entity, a verified Page, a two-tier review and a screencast, and the
  cycle runs weeks to months. Solo developers and unregistered side projects are
  not eligible. Start the application early and ship personal profile first.
- Three formats cannot be published through any API by anyone: organic swipe
  carousels, long-form Articles, and native reposts. No third-party tool has them
  either, because the restriction is in the API. Distra should say this out loud
  in the UI rather than silently dropping the format.
- **LinkedIn is the one platform where Rail B is banned outright.** The User
  Agreement explicitly prohibits third-party software that automates actions,
  including headless browsers and detectable Chrome extensions. Enforcement got
  serious in 2026: roughly 40% of accounts using non-compliant automation were
  restricted between January and March 2026, and LinkedIn acted against vendors
  directly. Detection combines behavioural analysis, session fingerprinting and
  content duplication checks, and browser extensions carry around 60% higher
  detection risk than cloud tools because injected DOM code is visible to their
  detectors. Braino has an extension. It must never touch LinkedIn.

**Risk.** Low on Rail A. Account-ending on Rail B.

**Success looks like.** Personal profile publishing daily for 14 days, zero
warnings, zero 429s, and the company page application submitted with a decision
date on the calendar.

---

### 7.5 Threads

**What Distra does.** The cheapest way to double the reach of the X heartbeat,
with a different tone.

**Rail.** A.

**Auth.** Meta app, Threads-specific OAuth scopes.

**Technical path.** Two-step, the Meta house style: create a media container, then
publish it. Text-only posts skip the media upload.

**Hard limits.** 250 posts, 1,000 replies and 100 deletions per profile per 24
hours. `GET /{threads-user-id}/threads_publishing_limit` returns live usage, so the
adapter should check quota before dispatch rather than discovering the cap by
failing.

**Cost.** Free. No subscription, no per-call charge, no paid quota product on the
developer surface.

**Traps.** Meta app review still applies even though the API is free. Rate
metering is impression-linked, so the practical cap can move.

**Risk.** Low.

**Success looks like.** Every X post that should also live on Threads gets there
within the same minute, with the quota endpoint checked before each dispatch and
never once exceeded.

---

### 7.6 Instagram

**What Distra does.** Reels and carousels made out of what was already shipped.
The demo clip becomes a Reel without the founder opening an editor.

**Rail.** A.

**Auth.** Instagram Business or Creator account, connected Facebook Page, Meta app,
OAuth. Advanced Access is required to serve anyone who is not on the app, and
Advanced Access requires Business Verification in Meta Business Manager first.

**Technical path.** `POST /{ig-user-id}/media` with `media_type=REELS` and a
public video URL, poll the container until it finishes processing, then
`POST /{ig-user-id}/media_publish`. Media has to be hosted somewhere reachable,
which means R2 or Supabase storage in front of it.

**Hard limits.** Meta's own documentation is inconsistent: 25 API-published posts
per 24 hours appears in some places, 100 in others, with Reels and Stories
counting into the same bucket. Verify against the live account before promising a
number. App review takes two to four weeks.

**Cost.** Free.

**Traps.** Business Verification is a separate rejection point from App Review and
fails independently. Container processing is asynchronous and can fail after
accepting the upload, so `verify()` matters more here than anywhere else. The
Facebook Page link is still required even under Instagram Login.

**Risk.** Low once approved. The approval is the risk.

**Success looks like.** Approval granted, then 30 Reels published from clips
Distra rendered, with zero manual uploads and every container failure caught and
retried automatically.

---

### 7.7 Facebook Pages

**What Distra does.** Rides along. Almost free once Instagram is approved, because
it is the same Graph API family, the same app and the same review.

**Rail.** A.

**Technical path.** `POST /{page-id}/feed` for text and links,
`POST /{page-id}/photos` and `/videos` for media, using a page access token
derived from the user token.

**Traps.** Organic Page reach is poor. This is a completeness channel, not a
growth channel, and the plan should not pretend otherwise.

**Success looks like.** Zero extra engineering days beyond the Instagram work.

---

### 7.8 YouTube

**What Distra does.** Long-form uploads and Shorts. The Shorts pipeline is the
valuable half: a sixty second vertical cut of a demo, uploaded and titled and
described, with no editor opened.

**Rail.** A.

**Auth.** Google OAuth with the YouTube Data API v3 upload scope. The repo already
has Google OAuth patterns in `supabase/functions/google`.

**Technical path.** Resumable upload to `videos.insert`, then a thumbnail set, then
optional playlist insert. Shorts are not a separate endpoint: a vertical video of
60 seconds or less is a Short.

**Hard limits.** The default project quota is 10,000 units a day. An upload used to
cost 1,600 units, which capped a project at about six uploads a day. **Since
Google's June 2026 change, uploads and searches no longer draw on the shared pool.
Uploads bill to their own daily bucket of 100 calls.** That is a real unlock: the
old six-per-day ceiling is gone. Quota increases are free but granted on merit.

**Cost.** Free, plus rendering cost.

**Traps.** Resumable upload needs correct chunking and retry or large files fail
at 90%. Verification of a new channel is needed before videos longer than 15
minutes are allowed.

**Success looks like.** Ten Shorts uploaded from auto-generated clips in one week,
each with a title, description and thumbnail Distra produced, and zero quota
errors.

---

### 7.9 TikTok

**What Distra does.** The same clip as the Instagram Reel and the YouTube Short,
cut for a third audience.

**Rail.** A.

**Auth.** TikTok developer app with the `video.publish` scope, plus the user
authorising that scope.

**Technical path.** Content Posting API, direct post: initialise the upload, PUT
the video, then publish. There is also a draft mode that sends the video to the
user's TikTok inbox for them to finish, which is a legitimate Rail C style
fallback while the audit is pending.

**Hard limits, and this is the important one.** Until the app passes TikTok's
audit, **every direct post is forced to SELF_ONLY**, meaning only the creator can
see it, and an unaudited client may serve at most 5 users in a 24 hour window with
all of those accounts set to private at the time of posting. Public posting
requires passing the audit, which means demonstrating that the integration follows
TikTok's UX guidelines exactly: the specific consent screens, disclosure that
content is being posted to TikTok, and correct handling of the draft versus direct
post choice.

**Cost.** Free.

**Traps.** The audit is the whole project. Build the consent UX to spec from day
one, because retrofitting it means a second review cycle. TikTok also has the most
developed AI content disclosure policy of any platform, so AI-generated or
significantly AI-altered content must be labelled.

**Risk.** Medium. Long approval, strict UX requirements.

**Success looks like.** Audit passed. Before that: draft-mode posting working, so
the founder gets a finished video in their TikTok inbox and only has to press
post.

---

### 7.10 Pinterest

**What Distra does.** Long-tail evergreen search traffic from visual content.
Genuinely useful for some products and pointless for others, so it is opt-in.

**Rail.** A.

**Technical path.** `POST /v5/pins` with a required `board_id`, plus title,
description, link and a `media_source` that is an `image_url`, a
`multiple_image_urls` carousel, or a registered video `media_id`.

**Hard limits.** 1,000 reads a minute, 100 writes a minute. Both the Trial and
Standard tiers are free, but moving from Trial to Standard needs a video demo
review, and there is a data-storage rule that bars caching most API data.

**Traps.** The no-caching rule conflicts with a normal analytics table. Read it
before designing the signals store for this platform.

**Success looks like.** Standard access granted, 50 pins live, and a measurable
click-through from Pinterest in the site analytics. If there is no traffic after
60 days, this channel gets switched off rather than maintained out of pride.

---

### 7.11 Mastodon

**Rail.** A. **Auth.** Per-instance app registration, then a user token. Trivial.
**Path.** `POST /api/v1/statuses`. **Limits.** Instance-dependent, generous.
**Cost.** Free.
**Success looks like.** Written in an afternoon. The proof that the adapter
interface handles per-instance base URLs, which matters again for Ghost, Matrix
and any self-hosted surface later.

---

### 7.12 Dev.to

**Rail.** A. **Auth.** API key, still issued, still working.
**Path.** `POST /api/articles` with markdown, tags, and `canonical_url` pointing
back at the founder's own site.
**Traps.** Tag rules are strict. Canonical URL must be set or the founder's own
site loses the SEO to Dev.to.
**Success looks like.** Every long-form piece syndicated within an hour of the
canonical version going live on the site, with the canonical tag verified.

---

### 7.13 Hashnode

**Rail.** A. **Path.** GraphQL, with `originalArticleURL` for canonical and tags
as objects carrying both a name and a slug.
**Traps.** API access moved behind a Pro tier in 2026, so this is the first
platform in the list that costs money to automate. Worth it only if the founder is
already there.
**Success looks like.** Same as Dev.to, or the channel is skipped. It is not worth
a subscription on its own.

---

### 7.14 Medium

**Rail.** C. **Why.** Medium is not issuing new integration tokens and is not
allowing new integrations. The API is effectively dead for anyone starting now.
**The path that still works.** Publish canonically on the founder's own site, then
use Medium's "Import a story" feature, which automatically sets the canonical URL
back to the original. Distra prepares the piece and opens the import page with the
URL filled in.
**Success looks like.** Two clicks from the founder, and the canonical tag correct
every time.

---

### 7.15 Substack

**Rail.** C, or B with care. **Why.** No official public API. Unofficial layers
exist that were reverse-engineered from internal web traffic, and Distra will not
depend on one for a paid product.
**The path.** Draft prepared, browser opened, fields filled, founder presses
publish. If the founder's newsletter is the primary channel, recommend moving it
to a provider with an API instead.
**Success looks like.** The founder never composes in Substack's editor from
scratch again.

---

### 7.16 Product Hunt

**Rail.** C, always.
**Why.** There is a GraphQL API at `api.producthunt.com/v2/api/graphql` requiring
a bearer token, but it explicitly must not be used for commercial purposes, and
launches are not something you create through it anyway.
**What Distra actually does here, and it is a lot.** A launch kit: tagline
variants, the description, the first comment, the gallery assets cut to spec, a
maker comment thread planned, the hunter shortlist, the launch-day timing, and the
supporter DM list drafted. Distra assembles it. The founder launches it.
**Traps.** A launch that reads as automated is worse than no launch. This is the
clearest case in the whole document where Rail C is the correct product decision
rather than a limitation.
**Success looks like.** A launch prepared in an hour instead of a week, and every
asset spec-correct on the first try.

---

### 7.17 Hacker News

**Rail.** C, always. There is an official read API (Firebase) and no submit API.
**What Distra does.** Watches for mentions of the product and of the problem space,
tells the founder when a thread is worth entering, drafts a comment in the
founder's voice, and prepares Show HN copy with the title rewritten to HN norms.
**Traps.** HN punishes self-promotion harder than any other surface, and voting
rings are detected. Distra never touches votes and never posts here.
**Success looks like.** The founder is told about the right thread within 15
minutes of it appearing, with a draft ready.

---

### 7.18 Quora

**Rail.** C. No API. Question monitoring is possible through search, answering is
manual.
**Success looks like.** Five high-intent questions surfaced a week with drafted
answers. Low priority. Phase 5 or never.

---

### 7.19 Discord, Telegram, Slack

**Rail.** A. All three are trivial and all three are underrated.
**Path.** Discord webhooks or a bot token. Telegram Bot API `sendMessage` to a
channel. Slack incoming webhooks.
**Cost.** Free.
**Why they matter.** These are the founder's own communities and the communities
they belong to. Zero platform risk, zero approval, and the audience is already
warm.
**Success looks like.** Every ship announcement lands in the founder's own
community in the same minute it lands on X.

---

### 7.20 WhatsApp

**Rail.** B. Channels have no public posting API. The Business Cloud API is for
customer messaging, not broadcast content, and Braino already sends WhatsApp
messages by driving the app on macOS.
**Traps.** The existing Mac path must poll `waitForWhatsAppReady` and re-fire the
deep link on a cold boot rather than blind-sleeping. That lesson is already paid
for; do not relearn it.
**Success looks like.** Ship announcements reach the founder's WhatsApp channel
without the founder typing them. Phase 5.

---

### 7.21 GitHub

**Rail.** A. The repo already has `supabase/functions/github`.
**What Distra does.** A release is a distribution event. Tag, release notes
written from the actual commits, README badge updated, and the release becomes the
source material for every other channel.
**Why it is in this list.** Dev Pulse already reads the git history. The gap
between "Braino knows what you built" and "Braino tells people what you built" is
one adapter.
**Success looks like.** Every release ships with notes Distra wrote from the
commits, and each one seeds at least three other channels automatically.

---

### 7.22 The owned channels: site, RSS, newsletter

**Rail.** A. This is the most important entry in the whole section and it is the
one every competitor treats as an afterthought.

**The principle: publish canonically to a surface you own, then syndicate.** The
founder's site gets the piece first with the canonical URL. Dev.to, Hashnode,
Medium and LinkedIn all get syndicated copies pointing back at it. RSS goes out
automatically. The newsletter goes out through Resend, Loops or Buttondown, all of
which have real APIs and none of which can deplatform the founder.

**Why it matters commercially.** Every other channel in this document is rented.
The owned ones are the only ones that survive an API price change, an app review
rejection, or a platform deciding it does not like agents this quarter.

**Success looks like.** Nothing is published anywhere before it exists at a
canonical URL the founder owns.

---

## 8. The listening and lead engine

Publishing is the table stakes half. "Finds the people who need what you built" is
the half that no scheduler does, and it is what makes Distra worth usage pricing.

**Sources, in order of intent density:**

1. Reddit. The highest. People ask for products by name in the present tense.
   `/search` and `/r/{sub}/search` through OAuth, polled per keyword set.
2. Hacker News. Free Firebase API, full firehose, trivial to poll.
3. X search. Real intent but reads now cost $0.005 each under pay-per-use, so the
   query set has to be tight and budgeted.
4. Product Hunt, Indie Hackers, Lobsters, Stack Overflow, niche forums. Feed and
   scrape, low volume, high quality.
5. LinkedIn. Read-only through the official API where possible. No scraping.

**The pipeline.** Poll, dedupe, score for intent, cluster by theme, surface as a
triage queue with a drafted reply, and never send without approval below Level 3.

**Intent scoring.** Not sentiment. Four signals: is the author describing the
problem in the present tense, are they asking for a recommendation, is there a
budget or urgency signal, and is the thread still alive. `BrainoX.md` sections 22
to 25 already specify the reply opportunity score, and the same model generalises.

**A free baseline to validate against.** F5Bot emails on Reddit keyword hits for
nothing. If Distra's lead queue is not obviously better than F5Bot's emails, the
scoring is not working yet. Buska, Syften, Octolens, Awario and Linkeddit are the
commercial comparables, and Awario and Mentionlytics expose APIs if a bought
firehose ever beats building one.

**The hard rule.** A drafted reply is never sent by a machine that has not been
graduated to Level 3 on that specific channel, and DMs are never autonomous at any
level. Reddit in particular treats broadcast replies as spam and shadowbans within
days.

**Success looks like.** 50 leads a week, better than 60% judged worth reading,
median time from post appearing to lead surfacing under 15 minutes, and at least
one real conversation a week that would not otherwise have happened.

---

## 9. The rendition and clip engine

One item, many shapes. A 900 word essay is not a tweet is not a Reel.

**Text renditions.** Per-platform character budgets, link placement rules (X puts
the link in the first reply), hashtag policy per platform, and the anti-repetition
rules from `BrainoX.md` section 21 applied across platforms rather than within
one.

**Video renditions.** The build-versus-buy decision:

- **ffmpeg directly**, self-hosted. Free per render, full control, most work.
  Correct for deterministic cuts: trim, crop to vertical, burn captions, concat.
- **Remotion**, React as the timeline. Correct if renditions need real layout and
  branding, and it fits the stack already in use.
- **Shotstack**, JSON timeline API, roughly $0.20 to $0.30 per rendered minute.
  Correct as a bridge to avoid running render infrastructure on day one.
- **Creatomate**, visual templates with dynamic fields. Correct for high-volume
  templated output, weaker for bespoke.

**Recommendation.** ffmpeg for the deterministic 80% of cuts, Remotion for
anything branded, and no managed render API in the critical path. A per-minute
render bill inside a usage-priced product is a margin leak, and it puts the
product's output on someone else's queue.

**Source material Braino already has.** Screen recordings from the Mac, the demo
videos in the repo, meeting recordings, and Dev Pulse's commit history. Distra
should be cutting from material that already exists before it generates anything
new.

**Success looks like.** One demo recording becomes a YouTube Short, an Instagram
Reel and a TikTok draft in a single pass, all three spec-correct, with no editor
opened.

---

## 10. Aggregators: the build-versus-buy call

Ayrshare, Blotato, Postiz and upload-post all solve multi-platform posting today.
The honest question is whether Distra should wrap one instead of writing adapters.

- **Ayrshare.** Around $149 a month, billed per connected profile, so cost scales
  with customer success in the wrong direction.
- **Blotato.** $29 a month flat for 20 accounts, but the narrowest coverage at
  about 9 platforms.
- **Postiz.** Open source, self-hostable for the cost of a server, 30+ platforms
  including Mastodon, Nostr and Farcaster, ships an API and an MCP server. Reports
  of instability and a flaky Instagram connection.
- **upload-post.** Free tier, around 22 platforms, including the small ones.

**The decision.** Write direct adapters for the core. Three reasons.

1. **Margin.** Distra is usage priced. Paying per profile per month to a
   middleman, on top of platform costs, on a product whose whole pitch is doing
   real work, is a structural leak.
2. **Control.** `verify()`, per-platform policy gates, the Reddit one-target rule
   and the browser rail cannot be implemented through someone else's abstraction.
   The gates are the product.
3. **Rail B does not exist for them.** Half the surfaces in section 7 are reachable
   only because Braino owns a browser. No aggregator can offer that, which is
   precisely why wrapping one caps Distra at parity with Buffer.

**Where buying is right.** As a temporary bridge during Meta and TikTok review
cycles, so video channels are live weeks earlier. Self-hosted Postiz is the
sensible bridge because it costs a server and creates no per-seat dependency.
Flagged in the UI as a bridge, and removed when the direct adapter lands.

---

## 11. Not getting banned

This is a real engineering requirement, not a compliance footnote. One suspended
LinkedIn account ends a founder's business development for a year.

**The rules the policy engine enforces, per platform:**

1. **Never the same content to many places on Reddit.** One target per campaign,
   hard-gated.
2. **Never Rail B on LinkedIn.** Not the extension, not a headless browser, not
   once.
3. **Human pacing on Rail B.** Randomised intervals, no two actions closer than a
   human could perform them, no perfectly regular cadence, and a daily action
   ceiling well under the platform's own.
4. **No automated DMs anywhere.** At any level.
5. **No automated likes, follows or votes.** X concentrates its prohibitions
   exactly there, and HN detects voting rings.
6. **AI disclosure where the platform requires it.** Reddit expects it for
   primarily AI-generated content. TikTok requires labelling for AI-generated or
   significantly altered material. The renditions carry a disclosure flag.
7. **Per-platform content duplication check.** Identical text across accounts is
   one of the three signals LinkedIn's detection uses, and it is the one most
   likely to be produced accidentally by a fan-out engine.
8. **Circuit breaker.** Any 429, any platform warning, any unexplained failure
   pauses that channel, drops it one autonomy level, and tells the founder. It
   does not retry into a ban.

**Token security.** Encrypted at rest with keys held separately, per-tenant
isolation so one compromise cannot reach another tenant, proactive refresh ahead
of expiry with reactive refresh as the fallback, and refresh-storm protection.
Tokens never reach the browser: the edge function is the backend-for-frontend and
the client only ever sees a session cookie.

---

## 12. Cost model

Per active founder per month, at a realistic volume of roughly 3 posts a day on
text platforms and 3 videos a week.

| Line | Monthly | Note |
|---|---|---|
| X posts, no links | ~$1.35 | 90 posts at $0.015 |
| X posts, if links were inline | ~$18.00 | 90 at $0.20. This is why links go in the reply |
| X reads for listening | budgeted | $0.005 each, capped per user |
| Bluesky, Mastodon, Threads, Dev.to, Discord, Telegram | $0 | |
| LinkedIn, Instagram, Facebook, YouTube, TikTok, Pinterest | $0 | approval cost, not cash cost |
| Reddit | $0 | commercial contract question is open |
| Video rendering, self-hosted ffmpeg | compute only | versus ~$0.25 a minute managed |
| LLM generation | the dominant line | drafting, scoring and rendition writing |

The platform APIs are close to free. **Inference is the real cost of Distra, and
the X link surcharge is the one platform fee big enough to change product design.**
That matches the deck's usage-priced model: revenue should scale with work done.

---

## 13. What success looks like overall

**Phase 0.** 20 for 20 published on X, zero duplicates, p95 drift under 90
seconds, every row verified, cost per post measured and written down.

**Phase 1.** One approval fans out to X and Bluesky, both verified, through one
generic dispatcher. Bluesky written in a day.

**Phase 2.** One thought, seven surfaces, one approval, all verified. Zero manual
posting for a full week.

**Phase 3.** LinkedIn daily for 14 days, zero warnings. Meta review submitted.

**Phase 4.** One recording becomes three platform-correct videos in one pass.

**Phase 5.** 50 leads a week, 60% useful, under 15 minutes to surface.

**Phase 6.** A measurable difference between what Distra scheduled and what a
random schedule would have produced. If that number is not measurable, the
learning engine is decoration.

**The company-level test.** Distra's first customer is Braino. Before it is sold to
anyone, it should be running Braino's own distribution across at least five
platforms with the founder spending under 20 minutes a day on it.

---

## 14. What Distra is not

- Not a social media manager for teams. One founder, one voice.
- Not a bot farm. No fake accounts, no engagement pods, no vote manipulation.
- Not an unattended publisher by default. Level 2 is the default ceiling and
  Level 3 is earned per channel.
- Not a scraper of platforms that forbid it.
- Not a growth-hacking tool. The five hard gates stay closed.
- Not shipped. Distra sits in the Building column of the deck's honest ledger, and
  the deck should not be edited to say otherwise until sections 5 and 13 are
  genuinely passing.

---

## 15. Immediate next actions

1. Test what exists. Phase 0, the X harness. Nothing else starts first.
2. Write the adapter interface and the `distra_*` migration.
3. Bluesky adapter, as the proof the interface is real.
4. Start the LinkedIn company page application, because the clock runs for weeks
   in the background.
5. Start Meta Business Verification for the same reason.
6. Answer the Reddit commercial-use contract question before any paying customer
   touches the Reddit rail.

---

## 16. Sources

Platform facts in this document were checked in August 2026. Every one of them
moves, and the pricing lines move fastest.

- X API 2026 pay-per-use pricing: [Blotato](https://www.blotato.com/blog/twitter-api-pricing), [Postproxy](https://postproxy.dev/blog/x-api-pricing-2026/), [SocialCrawl](https://www.socialcrawl.dev/blog/x-twitter-api-2026)
- LinkedIn API access and Community Management tiers: [Phyllo](https://www.getphyllo.com/post/linkedin-api-access-in-2026-partner-program-approval-timeline-alternatives), [Blotato](https://www.blotato.com/blog/linkedin-posting-api), [Microsoft Learn rate limits](https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits)
- LinkedIn automation enforcement: [Northlight](https://northlight.ai/blog/is-linkedin-automation-against-the-rules), [Extrovert](https://www.goextrovert.com/blog/why-linkedin-automation-gets-you-banned)
- Reddit API limits and rules: [Postiz](https://postiz.com/blog/reddit-api-limits-rules-and-posting-restrictions-explained), [SocialCrawl](https://www.socialcrawl.dev/blog/reddit-data-api-2026), [PainOnSocial](https://painonsocial.com/blog/reddit-api-rate-limits-guide)
- Reddit AI content rules: [MediaFast](https://www.mediafa.st/is-ai-generated-content-allowed-on-reddit)
- Instagram publishing and approval: [Postproxy](https://postproxy.dev/blog/instagram-reels-api-publishing-guide/), [Phyllo](https://www.getphyllo.com/post/instagram-api-integration-101-for-developers-of-the-creator-economy), [Meta docs](https://developers.facebook.com/docs/instagram-platform/overview/)
- TikTok Content Posting API and audit: [TikTok developers](https://developers.tiktok.com/doc/content-posting-api-get-started), [bundle.social](https://bundle.social/blog/tiktok-api-approval), [PostPeer](https://www.postpeer.dev/blog/best-tiktok-posting-api)
- YouTube Data API quota, including the June 2026 upload-bucket change: [Phyllo](https://www.getphyllo.com/post/youtube-api-limits-how-to-calculate-api-usage-cost-and-fix-exceeded-api-quota), [Postproxy](https://postproxy.dev/blog/youtube-upload-api-guide/), [CodivUpload](https://codivupload.com/blog/youtube-api-quota)
- Threads API limits: [SocialCrawl](https://www.socialcrawl.dev/blog/threads-api), [Blotato](https://www.blotato.com/blog/threads-api-pricing)
- Bluesky rate limits: [Bluesky docs](https://docs.bsky.app/docs/advanced-guides/rate-limits), [PublishQ](https://publishq.com/blog/bluesky-api-post-limits)
- Pinterest API v5: [Postproxy](https://postproxy.dev/blog/pinterest-api-automate-product-pins/), [Blotato](https://www.blotato.com/blog/pinterest-api-pricing)
- Product Hunt API terms: [Product Hunt API docs](https://api.producthunt.com/v2/docs)
- Medium, Dev.to, Hashnode, Substack publishing: [Dev.to writeup](https://dev.to/ankitg12/publishing-to-devto-programmatically-in-2026-what-actually-works-2nkd), [cross-publishing guide](https://www.nvarma.com/blog/2026-02-10-cross-publishing-blog-posts-devto-hashnode-medium)
- Aggregator comparison: [Buffer](https://buffer.com/resources/social-media-api-multi-platform-posting/), [Blotato](https://www.blotato.com/blog/social-media-api), [upload-post](https://www.upload-post.com/pricing-comparison/)
- Video render APIs: [Creatomate](https://creatomate.com/blog/the-best-video-generation-apis), [Wireflow](https://www.wireflow.ai/blog/creatomate-vs-shotstack)
- Social listening comparables: [YouScan](https://youscan.io/blog/reddit-social-listening/), [Syften](https://syften.com/blog/best-reddit-monitoring-tools/), [Buska](https://www.buska.io/blog/top-social-listening-platforms-2026)
- Agent posting ban rules: [Blotato](https://www.blotato.com/blog/ai-agent-social-media-ban-rules), [SocialClaw](https://getsocialclaw.com/blog/how-to-let-an-ai-agent-post-to-reddit)
- OAuth token handling at scale: [Paragon](https://www.useparagon.com/blog/oauth-token-refresh-expiry-at-scale), [Obsidian Security](https://www.obsidiansecurity.com/blog/refresh-token-security-best-practices)
