import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/apple.css";
import "./distra.css";

/* ============================================================================
   /distra — the Distra build plan as a page.

   Distra is engine two of Braino Foundry: the distribution engine. This page is
   the plan, not the product. Everything here maps to Distra.md at the repo
   root, which is the long-form source of truth; this is the version you can put
   on a screen while somebody is talking over it.

   Light the whole way. One accent (green, Distra's colour in the deck) rather
   than an accent per act, because a plan is one argument, not five.
   ============================================================================ */

type Rail = "api" | "browser" | "handoff";

const RAIL_META: Record<Rail, { label: string; cls: string }> = {
  api: { label: "Rail A · official API", cls: "r-blue" },
  browser: { label: "Rail B · browser delegate", cls: "r-green" },
  handoff: { label: "Rail C · prepared handoff", cls: "r-amber" },
};

type Platform = {
  id: string;
  name: string;
  rail: Rail;
  phase: string;
  cost: string;
  approval: string;
  summary: string;
  auth: string;
  path: string;
  limits: string;
  traps: string[];
  risk: string;
  win: string;
  built?: boolean;
};

const PLATFORMS: Platform[] = [
  {
    id: "x", name: "X", rail: "api", phase: "Phase 0", cost: "$0.015 a post", approval: "None, pay per use",
    built: true,
    summary: "Posts, threads, replies. The daily heartbeat, and the only platform already wired end to end. It has also never been tested, which is why it is Phase 0 rather than done.",
    auth: "OAuth 2.0 with PKCE. Built, in x_connections.",
    path: "Built: x-oauth-start and x-oauth-callback, then scheduled_x_posts drained by dispatch-scheduled-x-posts on a one minute cron, with thread splitting and claim locking in _shared/x-dispatch.ts. To add: verify() by reading the post back, and per-post cost accounting.",
    limits: "Pay per use replaced fixed tiers on 6 February 2026. Post creation $0.015, post reads $0.005, user reads $0.010, capped at 2 million post reads a month. Basic was retired and force-migrated on 1 June 2026. Pro at $5,000 a month is closed to new signups. Enterprise reportedly starts near $42,000 a month.",
    traps: [
      "A post containing a URL costs $0.20, more than thirteen times a plain post. At three link posts a day that is $18 a month before Braino charges anything. The design rule that falls out of it: the link goes in the first reply, not the post. Cheaper and better for reach at the same time.",
      "Impressions, profile visits and follower attribution need a paid tier. The MVP reports engagement counts and follower snapshots, and says so rather than implying more.",
      "X permits automated broadcasting. The prohibitions concentrate on automated replies, likes and follows, so engagement stays at Level 1 by default.",
    ],
    risk: "Low for publishing. Medium for automated engagement.",
    win: "Thirty consecutive days of scheduled publishing with zero missed slots, p95 drift under 90 seconds, a verified permalink on every row, and a measured cost per post inside 20% of the model.",
  },
  {
    id: "bluesky", name: "Bluesky", rail: "api", phase: "Phase 1", cost: "Free", approval: "None at all",
    summary: "The cheapest full-fidelity surface that exists, and the test that proves the adapter interface is genuinely platform-agnostic.",
    auth: "No developer portal, no review queue, no key request. Create an account and call the AT Protocol. OAuth or the legacy app password.",
    path: "com.atproto.repo.createRecord against the user's PDS with an app.bsky.feed.post record. Images upload as blobs first. Rich text facets for links and mentions are computed by hand, which is the only fiddly part.",
    limits: "Points based: 5,000 an hour, 35,000 a day. A post costs 3 points, so roughly 1,666 posts an hour. Effectively unlimited for a human.",
    traps: ["Facet offsets are UTF-8 byte indices, not JavaScript string indices. Get it wrong and every link renders as plain text."],
    risk: "Very low.",
    win: "Written in under a day against the Phase 1 interface. If it takes longer, the interface is wrong, and that is the real thing this platform is testing.",
  },
  {
    id: "reddit", name: "Reddit", rail: "browser", phase: "Phase 1 and 5", cost: "Free", approval: "None for the browser rail",
    built: true,
    summary: "Two very different jobs. Publishing is the small one. Finding the person who just asked out loud for what you built is the big one, and it is the highest-intent lead source on the internet for a solo founder.",
    auth: "The browser rail needs nothing. Listening needs OAuth: script, web or installed app.",
    path: "Publishing is already built and nearly forgotten: scheduled_reddit_posts plus dispatch_scheduled_reddit_posts() on a one minute cron writes an English task into agent_commands, and the extension opens reddit.com in the founder's own logged-in session and posts it. Listening is Phase 5: /search and /r/{sub}/search polled per keyword set, deduped into distra_leads, scored for intent, replies drafted and never auto-sent.",
    limits: "OAuth gives 60 requests a minute on a ten minute rolling window, around 100 queries a minute per client id. Unauthenticated .json endpoints were killed in May 2026, so anonymous scraping is not a path. /api/morechildren is one request every two seconds.",
    traps: [
      "Reddit has zero tolerance for the same link across many subreddits, and that is exactly what a naive fan-out engine does. Distra must treat Reddit as one target per campaign, never as one of nine broadcast destinations. Hard gate, not guideline.",
      "Reddit now expects disclosure when content is primarily AI generated.",
      "Every subreddit has its own rules and karma thresholds, so the adapter needs a per-subreddit rules cache read before every post.",
      "Commercial use of Reddit data requires a contract with Reddit however the data is obtained. That needs an answer before a paying customer touches this rail.",
    ],
    risk: "High if treated as a broadcast channel. Low if treated as a conversation channel.",
    win: "Publishing: 20 posts across 10 subreddits in a month with zero removals and zero mod warnings. Listening: 50 leads a week, better than 60% judged worth reading, every reply sent by a human.",
  },
  {
    id: "linkedin", name: "LinkedIn", rail: "api", phase: "Phase 3", cost: "Free", approval: "Same day for profile, months for pages",
    summary: "The highest-value B2B surface, and the one place where Braino's browser advantage must never be used.",
    auth: "Personal profile needs w_member_social and is a same-day build. Company pages need w_organization_social, an admin role, and Community Management API access through the Marketing Developer Platform partner programme.",
    path: "POST /rest/posts with X-Restli-Protocol-Version: 2.0.0 and a version header. Images and documents register through the assets endpoint first. Note /v2/ugcPosts is deprecated: LinkedIn still accepts it but ships new features only on the Posts API.",
    limits: "150 requests per member per day and 100,000 per application per day, both resetting at midnight UTC, both 429 on breach. Overlapping APIs such as Posts and Social Actions have additive throttles. Your real numbers live in the Developer Portal Analytics tab, not the public docs.",
    traps: [
      "Company page access is a project, not a checkbox: a legally registered entity, a verified Page, a two-tier review and a screencast, running weeks to months. Solo developers and unregistered side projects are not eligible. Start it early, ship personal profile first.",
      "Three formats cannot be published through any API by anyone: organic swipe carousels, long-form Articles, and native reposts. No third-party tool has them either. Distra should say so in the UI rather than silently dropping the format.",
      "LinkedIn is the one platform where the browser rail is banned outright. The User Agreement prohibits third-party software that automates actions, including headless browsers and detectable extensions. Around 40% of accounts using non-compliant automation were restricted between January and March 2026, detection combines behavioural analysis with session fingerprinting and duplicate-content checks, and extensions carry roughly 60% higher detection risk because injected DOM code is visible. Braino has an extension. It must never touch LinkedIn.",
    ],
    risk: "Low on the API rail. Account-ending on the browser rail.",
    win: "Personal profile publishing daily for 14 days, zero warnings, zero 429s, and the company page application submitted with a decision date on the calendar.",
  },
  {
    id: "threads", name: "Threads", rail: "api", phase: "Phase 3", cost: "Free", approval: "Meta app review",
    summary: "The cheapest way to double the reach of the X heartbeat, in a different tone.",
    auth: "Meta app with Threads-specific OAuth scopes.",
    path: "The Meta house style, two steps: create a media container, then publish it. Text-only posts skip the upload.",
    limits: "250 posts, 1,000 replies and 100 deletions per profile per 24 hours. GET /{threads-user-id}/threads_publishing_limit returns live usage, so the adapter checks quota before dispatch instead of discovering the cap by failing.",
    traps: ["No subscription and no per-call charge anywhere on the developer surface, but Meta app review still applies.", "Metering is impression-linked, so the practical ceiling moves."],
    risk: "Low.",
    win: "Every X post that should also live on Threads gets there in the same minute, with quota checked before each dispatch and never once exceeded.",
  },
  {
    id: "instagram", name: "Instagram", rail: "api", phase: "Phase 3", cost: "Free", approval: "Review plus business verification",
    summary: "Reels and carousels cut from what was already shipped. The demo clip becomes a Reel without an editor being opened.",
    auth: "Instagram Business or Creator account, a connected Facebook Page, a Meta app, OAuth. Advanced Access is required to serve anyone outside the app, and Advanced Access requires Business Verification in Meta Business Manager first.",
    path: "POST /{ig-user-id}/media with media_type=REELS and a publicly reachable video URL, poll the container until processing finishes, then POST /{ig-user-id}/media_publish. Media needs hosting in front of it, so R2 or Supabase storage.",
    limits: "Meta's own documentation is inconsistent: 25 API-published posts per 24 hours in some places, 100 in others, with Reels and Stories in the same bucket. Verify against the live account before promising a number. App review takes two to four weeks.",
    traps: [
      "Business Verification is a separate rejection point from App Review and fails independently.",
      "Container processing is asynchronous and can fail after the upload was accepted, so verify() matters more here than anywhere else.",
      "The Facebook Page link is still required even under Instagram Login.",
    ],
    risk: "Low once approved. The approval is the risk.",
    win: "Approval granted, then 30 Reels published from clips Distra rendered, zero manual uploads, every container failure caught and retried.",
  },
  {
    id: "facebook", name: "Facebook Pages", rail: "api", phase: "Phase 3", cost: "Free", approval: "Rides Instagram's review",
    summary: "Rides along. Almost free once Instagram is approved, because it is the same Graph API family, the same app, the same review.",
    auth: "Page access token derived from the user token.",
    path: "POST /{page-id}/feed for text and links, /photos and /videos for media.",
    limits: "Graph API standard rate limiting per app and per page.",
    traps: ["Organic Page reach is poor. This is a completeness channel, not a growth channel, and the plan should not pretend otherwise."],
    risk: "Low.",
    win: "Zero extra engineering days beyond the Instagram work.",
  },
  {
    id: "youtube", name: "YouTube", rail: "api", phase: "Phase 4", cost: "Free", approval: "Quota request",
    summary: "Long-form uploads and Shorts. The Shorts pipeline is the valuable half: a sixty second vertical cut of a demo, titled and described, no editor opened.",
    auth: "Google OAuth with the YouTube Data API v3 upload scope. The repo already has Google OAuth patterns in supabase/functions/google.",
    path: "Resumable upload to videos.insert, then thumbnail set, then optional playlist insert. Shorts are not a separate endpoint: a vertical video of 60 seconds or less is a Short.",
    limits: "Default project quota is 10,000 units a day. Uploads used to cost 1,600 units, capping a project near six a day. Since Google's June 2026 change, uploads and searches no longer draw on the shared pool and uploads bill to their own bucket of 100 calls a day. The old ceiling is gone. Quota increases are free but granted on merit.",
    traps: ["Resumable upload needs correct chunking and retry or large files fail at 90%.", "A new channel needs verification before videos longer than 15 minutes are allowed."],
    risk: "Low.",
    win: "Ten Shorts uploaded from auto-generated clips in one week, each with a title, description and thumbnail Distra produced, and zero quota errors.",
  },
  {
    id: "tiktok", name: "TikTok", rail: "api", phase: "Phase 4", cost: "Free", approval: "Audit required for public posts",
    summary: "The same clip as the Reel and the Short, cut for a third audience. The audit is the whole project.",
    auth: "TikTok developer app with the video.publish scope, plus the user authorising that scope.",
    path: "Content Posting API direct post: initialise the upload, PUT the video, publish. There is also a draft mode that drops the video into the user's TikTok inbox to finish, which is a legitimate handoff-style fallback while the audit is pending.",
    limits: "Until the app passes the audit every direct post is forced to SELF_ONLY, visible only to the creator, and an unaudited client may serve at most 5 users in a 24 hour window with all of those accounts private at the time of posting.",
    traps: [
      "Passing the audit means following TikTok's UX guidelines exactly: the specific consent screens, disclosure that content is being posted to TikTok, and correct handling of the draft versus direct-post choice. Build that UX to spec on day one, because retrofitting it means a second review cycle.",
      "TikTok has the most developed AI content disclosure policy of any platform. AI-generated or significantly altered material must be labelled.",
    ],
    risk: "Medium. Long approval, strict UX requirements.",
    win: "Audit passed. Before that, draft-mode posting working, so the founder gets a finished video in their TikTok inbox and only has to press post.",
  },
  {
    id: "pinterest", name: "Pinterest", rail: "api", phase: "Phase 4", cost: "Free", approval: "Video demo review",
    summary: "Long-tail evergreen search traffic from visual content. Genuinely useful for some products and pointless for others, so it is opt-in.",
    auth: "App plus OAuth. Trial access is heavily rate limited until it is upgraded to Standard.",
    path: "POST /v5/pins with a required board_id, plus title, description, link and a media_source that is an image_url, a multiple_image_urls carousel, or a registered video media_id.",
    limits: "1,000 reads a minute, 100 writes a minute. Trial and Standard are both free, but Trial to Standard needs a video demo review.",
    traps: ["A data-storage rule bars caching most API data, which conflicts with a normal analytics table. Read it before designing the signals store for this platform."],
    risk: "Low.",
    win: "Standard access granted, 50 pins live, and measurable click-through in the site analytics. If there is no traffic after 60 days the channel gets switched off rather than maintained out of pride.",
  },
  {
    id: "mastodon", name: "Mastodon", rail: "api", phase: "Phase 2", cost: "Free", approval: "None",
    summary: "An afternoon of work, and the proof that the adapter interface handles per-instance base URLs. That matters again for Ghost, Matrix and anything self-hosted later.",
    auth: "Per-instance app registration, then a user token.",
    path: "POST /api/v1/statuses.",
    limits: "Instance dependent, generous.",
    traps: ["Every instance is a different base URL, which is the point of including it."],
    risk: "Very low.",
    win: "Written in an afternoon, with the instance URL handled as configuration rather than a special case.",
  },
  {
    id: "devto", name: "Dev.to", rail: "api", phase: "Phase 2", cost: "Free", approval: "None",
    summary: "Straightforward REST, still issuing keys, still returning 201. The easiest long-form syndication target that exists.",
    auth: "API key.",
    path: "POST /api/articles with markdown, tags, and canonical_url pointing back at the founder's own site.",
    limits: "Generous for this volume.",
    traps: ["Tag rules are strict.", "The canonical URL must be set or the founder's own site loses the SEO to Dev.to."],
    risk: "Very low.",
    win: "Every long-form piece syndicated within an hour of the canonical version going live, with the canonical tag verified on each one.",
  },
  {
    id: "hashnode", name: "Hashnode", rail: "api", phase: "Phase 4", cost: "Pro subscription", approval: "None beyond Pro",
    summary: "The first platform in the list that costs money to automate. Worth it only if the founder is already there.",
    auth: "Personal access token.",
    path: "GraphQL, with originalArticleURL for canonical and tags as objects carrying both a name and a slug.",
    limits: "Standard GraphQL rate limiting.",
    traps: ["API access moved behind a Pro tier in 2026."],
    risk: "Very low.",
    win: "Same as Dev.to, or the channel is skipped. It is not worth a subscription on its own.",
  },
  {
    id: "medium", name: "Medium", rail: "handoff", phase: "Phase 4", cost: "Free", approval: "Not available",
    summary: "The API is effectively dead for anyone starting now. Medium is not issuing new integration tokens and is not allowing new integrations.",
    auth: "None available.",
    path: "Publish canonically on the founder's own site, then use Medium's Import a story feature, which automatically sets the canonical URL back to the original. Distra prepares the piece and opens the import page with the URL filled in.",
    limits: "Manual.",
    traps: ["Anything claiming programmatic Medium publishing in 2026 is using a token issued years ago or is not doing what it says."],
    risk: "None.",
    win: "Two clicks from the founder, and the canonical tag correct every time.",
  },
  {
    id: "substack", name: "Substack", rail: "handoff", phase: "Phase 4", cost: "Free", approval: "Not available",
    summary: "No official public API. Unofficial layers exist, reverse-engineered from internal web traffic, and Distra will not put a paid product on top of one.",
    auth: "None official.",
    path: "Draft prepared, browser opened, fields filled, founder presses publish. If the newsletter is the founder's primary channel, the honest recommendation is to move it to a provider with a real API.",
    limits: "Manual.",
    traps: ["A reverse-engineered dependency breaks silently and takes the founder's newsletter with it."],
    risk: "None on the handoff rail.",
    win: "The founder never composes in Substack's editor from scratch again.",
  },
  {
    id: "producthunt", name: "Product Hunt", rail: "handoff", phase: "Phase 4", cost: "Free", approval: "Commercial use forbidden",
    summary: "The clearest case in the whole plan where the handoff rail is the correct product decision rather than a limitation. A launch that reads as automated is worse than no launch.",
    auth: "Bearer token for the read API, which explicitly must not be used commercially.",
    path: "There is a GraphQL API at api.producthunt.com/v2/api/graphql, and launches are not something you create through it anyway. What Distra actually does is the launch kit: tagline variants, the description, the first comment, gallery assets cut to spec, the maker comment thread planned, the hunter shortlist, launch-day timing, and the supporter messages drafted.",
    limits: "Manual for anything that matters.",
    traps: ["The API terms forbid commercial use, so even the read side cannot sit inside a paid product without a conversation with Product Hunt."],
    risk: "None on the handoff rail.",
    win: "A launch prepared in an hour instead of a week, with every asset spec-correct on the first try.",
  },
  {
    id: "hn", name: "Hacker News", rail: "handoff", phase: "Phase 4", cost: "Free", approval: "No submit API exists",
    summary: "Watches, drafts, and never posts. HN punishes self-promotion harder than any other surface, and voting rings are detected.",
    auth: "None. The Firebase read API is open.",
    path: "Poll the official read API for mentions of the product and the problem space, tell the founder when a thread is worth entering, draft a comment in their voice, and prepare Show HN copy with the title rewritten to HN norms.",
    limits: "Read API is open and generous. There is no submit API.",
    traps: ["Distra never touches votes and never posts here. Not at any autonomy level."],
    risk: "None on the handoff rail. Reputationally fatal on any other.",
    win: "The founder is told about the right thread within 15 minutes of it appearing, with a draft already written.",
  },
  {
    id: "quora", name: "Quora", rail: "handoff", phase: "Phase 5", cost: "Free", approval: "No API",
    summary: "Low priority. Question monitoring through search is possible, answering is manual.",
    auth: "None.",
    path: "Search monitoring for high-intent questions, drafted answers, manual posting.",
    limits: "Manual.",
    traps: ["Easy to spend real effort here for very little return. Phase 5 or never."],
    risk: "None.",
    win: "Five high-intent questions surfaced a week with drafted answers.",
  },
  {
    id: "chat", name: "Discord, Telegram, Slack", rail: "api", phase: "Phase 2", cost: "Free", approval: "None",
    summary: "Trivial, free, zero platform risk, and underrated. These are the founder's own communities and the ones they belong to, and the audience is already warm.",
    auth: "Discord webhook or bot token. Telegram bot token. Slack incoming webhook.",
    path: "Discord webhook POST or bot sendMessage. Telegram Bot API sendMessage to a channel. Slack incoming webhook POST.",
    limits: "Generous on all three.",
    traps: ["Nothing meaningful. This is the easiest section of the plan and it should be built early for exactly that reason."],
    risk: "None.",
    win: "Every ship announcement lands in the founder's own community in the same minute it lands on X.",
  },
  {
    id: "whatsapp", name: "WhatsApp", rail: "browser", phase: "Phase 5", cost: "Free", approval: "None",
    summary: "Channels have no public posting API, and the Business Cloud API is for customer messaging rather than broadcast. Braino already sends WhatsApp messages by driving the app on macOS.",
    auth: "The founder's own logged-in WhatsApp on their own machine.",
    path: "The existing Mac send path, reused for channel posts.",
    limits: "Human pacing only.",
    traps: ["The Mac path must poll waitForWhatsAppReady and re-fire the deep link on a cold boot rather than blind-sleeping. That lesson is already paid for. Do not relearn it."],
    risk: "Low, at human pace.",
    win: "Ship announcements reach the founder's WhatsApp channel without the founder typing them.",
  },
  {
    id: "github", name: "GitHub", rail: "api", phase: "Phase 2", cost: "Free", approval: "None",
    summary: "A release is a distribution event. Dev Pulse already reads the git history, so the gap between Braino knowing what you built and Braino telling people what you built is one adapter.",
    auth: "GitHub token. The repo already has supabase/functions/github.",
    path: "Tag, release notes written from the actual commits, README badge updated, and the release becomes source material for every other channel.",
    limits: "5,000 authenticated requests an hour.",
    traps: ["Release notes written from commit messages are only as good as the commit messages, which is an argument for Braino writing those too."],
    risk: "None.",
    win: "Every release ships with notes Distra wrote from the commits, and each one seeds at least three other channels automatically.",
  },
  {
    id: "owned", name: "Site, RSS, newsletter", rail: "api", phase: "Phase 2", cost: "Provider cost", approval: "None",
    summary: "The most important entry in the list, and the one every competitor treats as an afterthought. Every other channel here is rented. These are the only ones that survive an API price change, a review rejection, or a platform deciding it does not like agents this quarter.",
    auth: "The founder's own site, plus a newsletter provider such as Resend, Loops or Buttondown, all of which have real APIs.",
    path: "Publish canonically to the surface the founder owns first. The site gets the piece with the canonical URL, RSS goes out automatically, the newsletter sends through the provider API, and Dev.to, Hashnode, Medium and LinkedIn all get syndicated copies pointing back.",
    limits: "Provider dependent, generous.",
    traps: ["Skipping this and syndicating first hands the SEO and the audience to a platform the founder does not control."],
    risk: "None.",
    win: "Nothing is published anywhere before it exists at a canonical URL the founder owns.",
  },
];

const GROUPS: { label: string; ids: string[] }[] = [
  { label: "Phase 0 and 1 · prove it", ids: ["x", "bluesky", "reddit"] },
  { label: "Phase 2 · free and open", ids: ["mastodon", "devto", "chat", "github", "owned"] },
  { label: "Phase 3 · the paperwork", ids: ["linkedin", "threads", "instagram", "facebook"] },
  { label: "Phase 4 · video and long form", ids: ["youtube", "tiktok", "pinterest", "hashnode"] },
  { label: "Handoff only", ids: ["medium", "substack", "producthunt", "hn", "quora", "whatsapp"] },
];

const RAILS = [
  {
    cls: "r-blue", tag: "Rail A", name: "Official API",
    line: "Server-side edge function, encrypted OAuth token, cron dispatch. Durable, auditable, survives the founder closing their laptop, and never risks the account.",
    points: ["Use whenever the platform has a real publish API on reasonable terms", "Already working on X", "Fifteen of the twenty-two surfaces here"],
  },
  {
    cls: "r-green", tag: "Rail B", name: "Browser delegate",
    line: "The Braino extension drives the platform in the founder's own signed-in session, through the agent_commands queue that already exists. No API key, no app review, no partner programme.",
    points: ["Already working on Reddit, and almost forgotten", "Costs nothing per action", "No competitor in this category owns an installed, signed-in browser agent"],
  },
  {
    cls: "r-amber", tag: "Rail C", name: "Prepared handoff",
    line: "Distra writes the piece, formats it for the surface, opens the tab, fills the fields, and stops. The founder reads it and presses the button.",
    points: ["Not a failure state", "Correct where the value is the founder's own presence", "Still removes about 95% of the work"],
  },
];

const SPINE = [
  { name: "Items", code: "distra_items", line: "The atom of content, platform-agnostic. Original input, body, pillar, canonical URL, provenance." },
  { name: "Renditions", code: "distra_renditions", line: "One item, rendered per platform. Character budget, media, variant, schedule, permalink." },
  { name: "Jobs", code: "distra_jobs", line: "What the dispatcher claims and runs. Rail, run-after, attempts, result. One dispatcher, every platform." },
  { name: "Channels", code: "distra_channels", line: "One row per connected account. Platform, handle, rail, auth, scopes, health, live limits." },
];

const LEVELS = [
  { lv: "Level 0", name: "Manual", line: "Distra analyses and drafts. Nothing leaves." },
  { lv: "Level 1", name: "Assisted", line: "Distra drafts and proposes a time. The founder approves each one." },
  { lv: "Level 2", name: "Queue autopilot", line: "Distra publishes items the founder already approved, on its own schedule.", def: true },
  { lv: "Level 3", name: "Autonomous", line: "Distra generates and publishes inside voice and policy constraints. Earned per channel, never granted at setup." },
];

const GATES = [
  { n: "01", t: "Money" },
  { n: "02", t: "First publish on a new channel" },
  { n: "03", t: "Messaging a human" },
  { n: "04", t: "Deleting anything" },
  { n: "05", t: "Changing a price or a promise" },
];

const PHASES = [
  { no: "Phase 0", name: "Prove X. No new platforms.", line: "We have X and it has never been tested. A harness that schedules 20 posts across 48 hours and measures real drift. Token refresh proven by expiring one deliberately. Duplicate gates proven with a colliding pair. Network killed mid-publish to prove no double post. verify() added. Real cost per post measured.", exit: "20 for 20 published, zero duplicates, p95 drift under 90 seconds, a verified permalink on every row, and the cost per post written down." },
  { no: "Phase 1", name: "The spine and the second rail", line: "The distra_* tables, the adapter interface, one generic dispatcher. X refactored to sit behind that interface with identical behaviour. Bluesky added as adapter two. The Reddit browser path generalised into a reusable publish contract.", exit: "One item fans out to X and Bluesky from a single approval, both verified, and the browser rail publishes and verifies through the same dispatcher." },
  { no: "Phase 2", name: "The free and open tier", line: "Mastodon, Dev.to, Discord, Telegram, GitHub, and the owned channels: site, RSS, newsletter. All cheap, all Rail A, no approval anywhere. This is where the fan-out number starts to look real without any paperwork.", exit: "One thought, seven surfaces, one approval, all verified. Zero manual posting for a full week." },
  { no: "Phase 3", name: "The paperwork tier", line: "LinkedIn personal profile first, because it is a same-day build and the highest-value B2B surface. Threads next. Meta app review for Instagram and Facebook runs in the background for weeks while other work continues.", exit: "LinkedIn publishing daily for 14 days with zero platform warnings, and the Meta review submitted." },
  { no: "Phase 4", name: "Video", line: "YouTube and TikTok, plus the rendition pipeline that cuts clips out of what was already shipped. The heaviest phase, and deliberately the last of the publishing phases.", exit: "One demo recording becomes a YouTube Short, an Instagram Reel and a TikTok draft in a single pass, all three spec-correct." },
  { no: "Phase 5", name: "Listening and leads", line: "Reddit first, because that is where the buying intent actually is. Then Hacker News, then X search on a tight budget. Leads surface as a triage queue with drafted replies. Replies stay at Level 1 far longer than posts do.", exit: "50 leads a week, better than 60% judged worth reading, median time from post to surfaced lead under 15 minutes." },
  { no: "Phase 6", name: "The loop", line: "Signals back into the model. What landed and what did not, per pillar, per platform, per time of day. This is the half a stack of separate tools cannot do, because one brain holds both ends.", exit: "A measurable difference between what Distra scheduled and what a random schedule would have produced. If that is not measurable, the learning engine is decoration." },
];

const RULES = [
  { n: "01", t: "Never the same content to many subreddits", p: "One target per campaign, hard-gated. This single behaviour is what gets apps and accounts killed, and it is exactly what a naive fan-out engine does by default." },
  { n: "02", t: "Never the browser rail on LinkedIn", p: "Not the extension, not a headless browser, not once. Their detection specifically looks for injected DOM code, and enforcement moved to suspensions on first violation." },
  { n: "03", t: "Human pacing on the browser rail", p: "Randomised intervals, no two actions closer than a human could perform them, no perfectly regular cadence, and a daily ceiling well under the platform's own." },
  { n: "04", t: "No automated direct messages", p: "Anywhere, at any autonomy level. This is one of the five hard gates and it does not soften." },
  { n: "05", t: "No automated likes, follows or votes", p: "X concentrates its prohibitions exactly there, and Hacker News detects voting rings. Distra publishes and converses. It does not inflate." },
  { n: "06", t: "Disclose AI where the platform asks", p: "Reddit expects it for primarily AI-generated content. TikTok requires labelling for AI-generated or significantly altered material. Renditions carry a disclosure flag." },
  { n: "07", t: "Duplicate check across channels, not just within one", p: "Identical text across accounts is one of the three signals LinkedIn's detection uses, and it is the one a fan-out engine produces by accident." },
  { n: "08", t: "Circuit breaker", p: "Any 429, any platform warning, any unexplained failure pauses that channel, drops it one autonomy level, and tells the founder. It does not retry into a ban." },
];

const COSTS = [
  { line: "X posts, no links", amt: "~$1.35", note: "90 posts at $0.015" },
  { line: "X posts, if links were inline", amt: "~$18.00", note: "90 at $0.20. This is why the link goes in the reply", hl: true },
  { line: "X reads for listening", amt: "budgeted", note: "$0.005 each, capped per user" },
  { line: "Bluesky, Mastodon, Threads, Dev.to, Discord, Telegram", amt: "$0", note: "No fee at any volume a founder will reach" },
  { line: "LinkedIn, Instagram, Facebook, YouTube, TikTok, Pinterest", amt: "$0", note: "Approval cost, not cash cost" },
  { line: "Video rendering, self-hosted ffmpeg", amt: "compute", note: "Versus roughly $0.25 a minute on a managed render API" },
  { line: "LLM generation", amt: "dominant", note: "Drafting, scoring and rendition writing. The real cost of Distra" },
];

const LEDGER = [
  { cls: "l-built", label: "Built today", items: ["X OAuth, queue, policy guard, one minute dispatch", "The BrainoX command centre at /x", "Reddit publishing through the browser delegate", "Follower snapshots and the spoken briefing"] },
  { cls: "l-building", label: "Building", items: ["Phase 0: the X test harness and verify()", "The distra_* spine and the adapter interface", "Bluesky, as proof the interface is real"] },
  { cls: "l-next", label: "Next", items: ["The free and open tier", "LinkedIn, then the Meta review clock", "Video renditions", "The listening and lead engine", "The signal loop back into Braino Code"] },
];

export default function Distra() {
  const [active, setActive] = useState("x");
  const p = PLATFORMS.find((x) => x.id === active) ?? PLATFORMS[0];
  const railCls = RAIL_META[p.rail].cls;

  return (
    <div className="apple distra">
      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Distra</span>
          <div className="an-links">
            <a href="#rails">Rails</a>
            <a href="#autonomy">Autonomy</a>
            <a href="#order">Build order</a>
            <a href="#platforms">Platforms</a>
            <a href="#money">Money</a>
            <Link to="/deck" className="apple-cta">The deck</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="ds-wrap ds-hero">
        <p className="ds-kicker">Braino Foundry · engine two</p>
        <h1 className="ds-h">Your product exists.<br /><span className="tone">Now the world finds out.</span></h1>
        <p className="ds-lede">
          Distra is the distribution engine. Twenty-two surfaces, three execution rails, seven
          phases, and one rule that governs all of it: he decides how, you decide whether.
        </p>
        <div className="ds-hero-meta">
          <span className="ds-chip on">Plan, August 2026</span>
          <span className="ds-chip">22 platforms</span>
          <span className="ds-chip">3 rails</span>
          <span className="ds-chip">7 phases</span>
          <span className="ds-chip">Building, not built</span>
        </div>
      </header>

      {/* ── The problem ──────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec">
        <p className="ds-kicker">The problem statement</p>
        <h2 className="ds-h">Building got cheap. <span className="tone">Being seen did not.</span></h2>
        <p className="ds-lede">
          A solo founder ships something and nobody sees it. Every funded company in this market
          sells the building half. Distra is the being seen, run end to end by an agent that
          already knows the company.
        </p>
        <ol className="ds-steps">
          <li><i>01</i><p>Something happens worth telling people about.<em>A commit, a release, a demo, a thought said out loud.</em></p></li>
          <li><i>02</i><p>Distra turns it into the right artefact for each surface.<em>A post, a thread, a clip, a comment, an article. Not the same text nine times.</em></p></li>
          <li><i>03</i><p>It goes out on schedule, in the founder's voice, everywhere at once.<em>Without the founder keeping the calendar or opening the apps.</em></p></li>
          <li><i>04</i><p>Distra listens for the people who need it.<em>And gets into those conversations, with the founder holding the send button.</em></p></li>
          <li><i>05</i><p>What lands comes back as signal.<em>Into the next round, and into what Braino Code builds next. One brain holds both ends.</em></p></li>
        </ol>
        <p className="ds-note">
          Fully autonomous means the founder does not run the calendar, does not open the apps and
          does not chase the schedule. It does not mean unattended publishing by default.
        </p>
      </section>

      {/* ── What exists ──────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec">
        <p className="ds-kicker">Starting position</p>
        <h2 className="ds-h">This is not a blank page. <span className="tone">Two rails already run.</span></h2>
        <p className="ds-lede">
          X publishes through a real OAuth pipeline on a one minute cron, with a queue, a policy
          guard and thread splitting. Reddit publishes through the browser extension in the
          founder's own signed-in session, with no API key at all. What has never happened is a
          test: end to end, under load, over a week, with real timing. That is why Phase 0 is
          testing what exists rather than adding anything to it.
        </p>
      </section>

      {/* ── Rails ────────────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec" id="rails">
        <p className="ds-kicker">Architecture</p>
        <h2 className="ds-h">Three rails, <span className="tone">one spine.</span></h2>
        <p className="ds-lede">
          Every platform is classified into exactly one execution rail. The rail is a property of
          the adapter, not of the content. Rail B is the unfair advantage, because Braino is
          already installed in the browser and already signed in.
        </p>
        <div className="ds-rails">
          {RAILS.map((r) => (
            <article key={r.tag} className={"ds-rail " + r.cls}>
              <span className="r-tag">{r.tag}</span>
              <h3>{r.name}</h3>
              <p>{r.line}</p>
              <ul>{r.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
            </article>
          ))}
        </div>

        <p className="ds-kicker" style={{ marginTop: 64 }}>The spine</p>
        <h3 className="ds-h" style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>
          One core. <span className="tone">Thin adapters.</span>
        </h3>
        <p className="ds-lede">
          The mistake to avoid is building nine copies of BrainoX. Adding a platform means writing
          one file that implements eight functions, not touching the engine. One of those eight is
          verify(), and it is not optional: every rail can silently half-fail, browser rails most
          of all, so nothing is marked published until it has been read back.
        </p>
        <div className="ds-spine">
          {SPINE.map((n) => (
            <div key={n.code} className="ds-node">
              <b>{n.name}</b>
              <code>{n.code}</code>
              <p>{n.line}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Autonomy ─────────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec" id="autonomy">
        <p className="ds-kicker">Autonomy</p>
        <h2 className="ds-h">He decides how. <span className="tone">You decide whether.</span></h2>
        <p className="ds-lede">
          Four levels, set per channel rather than globally. A founder can run Bluesky at Level 3
          and LinkedIn at Level 1. A channel graduates after 20 approved items with no edits at
          approval time, and falls back a level on any policy breach, platform warning or rejected
          post.
        </p>
        <div className="ds-levels">
          {LEVELS.map((l) => (
            <div key={l.lv} className={"ds-level" + (l.def ? " is-default" : "")}>
              <span className="lv">{l.lv}</span>
              <h4>{l.name}</h4>
              <p>{l.line}</p>
              {l.def && <span className="badge">Default ceiling</span>}
            </div>
          ))}
        </div>
        <p className="ds-kicker" style={{ marginTop: 52 }}>The five hard gates</p>
        <p className="ds-lede">These never soften. Not at any level, not on any platform.</p>
        <div className="ds-gates">
          {GATES.map((g) => (
            <div key={g.n} className="ds-gate"><span>{g.n}</span><p>{g.t}</p></div>
          ))}
        </div>
      </section>

      {/* ── Build order ──────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec" id="order">
        <p className="ds-kicker">Build order</p>
        <h2 className="ds-h">Ordered by proof, <span className="tone">not by ambition.</span></h2>
        <p className="ds-lede">
          Each phase has an exit test, and the next phase does not start until it passes. Phase 0
          adds no platforms at all, because every other platform copies the shape of the X
          dispatcher. Fixing it once is nine fixes.
        </p>
        <div className="ds-phases">
          {PHASES.map((ph) => (
            <div key={ph.no} className="ds-phase">
              <span className="ph-no">{ph.no}</span>
              <div>
                <h4>{ph.name}</h4>
                <p>{ph.line}</p>
              </div>
              <div className="ph-exit">
                <b>Exit test</b>
                <p>{ph.exit}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform explorer ────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec" id="platforms">
        <p className="ds-kicker">Every surface</p>
        <h2 className="ds-h">Twenty-two platforms, <span className="tone">one sub-plan each.</span></h2>
        <p className="ds-lede">
          What Distra does there, which rail it runs on, the real limits and costs as of August
          2026, the traps, and what success looks like as a number rather than a feeling.
        </p>
        <div className="ds-explorer">
          <div className="ds-list">
            {GROUPS.map((g) => (
              <div key={g.label} className="ds-group">
                <b>{g.label}</b>
                <ul>
                  {g.ids.map((id) => {
                    const pl = PLATFORMS.find((x) => x.id === id)!;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className={"ds-pill " + RAIL_META[pl.rail].cls + (active === id ? " on" : "")}
                          onClick={() => setActive(id)}
                        >
                          <span className="dot" />
                          {pl.name}
                          {pl.built && <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.7 }}>live</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <article className={"ds-detail " + railCls} key={p.id}>
            <div className="ds-detail-head">
              <h3>{p.name}</h3>
              <span className="ds-tag" style={{ background: "var(--r-panel)", color: "var(--r-on)" }}>
                {RAIL_META[p.rail].label}
              </span>
              {p.built && <span className="ds-tag" style={{ background: "var(--ap-green-panel)", color: "var(--ap-green)" }}>Partly built</span>}
            </div>
            <p className="ds-detail-sum">{p.summary}</p>

            <div className="ds-facts">
              <div className="ds-fact"><span>Rail</span><p>{RAIL_META[p.rail].label.split("·")[1].trim()}</p></div>
              <div className="ds-fact"><span>Phase</span><p>{p.phase}</p></div>
              <div className="ds-fact"><span>Cost</span><p>{p.cost}</p></div>
              <div className="ds-fact"><span>Approval</span><p>{p.approval}</p></div>
            </div>

            <div className="ds-rows">
              <div className="ds-row"><b>Auth</b><p>{p.auth}</p></div>
              <div className="ds-row"><b>Technical path</b><p>{p.path}</p></div>
              <div className="ds-row"><b>Hard limits</b><p>{p.limits}</p></div>
              <div className="ds-row">
                <b>Traps</b>
                <ul>{p.traps.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
              <div className="ds-row"><b>Risk</b><p>{p.risk}</p></div>
            </div>

            <div className="ds-win">
              <b>Success looks like</b>
              <p>{p.win}</p>
            </div>
          </article>
        </div>
      </section>

      {/* ── Listening ────────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec">
        <p className="ds-kicker">The other half</p>
        <h2 className="ds-h">Publishing is table stakes. <span className="tone">Finding the people is not.</span></h2>
        <p className="ds-lede">
          No scheduler does this, and it is what makes Distra worth usage pricing. Reddit has the
          highest intent density on the internet: people ask for products by name, in the present
          tense. Then Hacker News, free and open. Then X search, on a tight budget because reads
          now cost half a cent each.
        </p>
        <ol className="ds-steps">
          <li><i>01</i><p>Poll, dedupe, cluster.<em>Per keyword set, per source, into one triage queue rather than five inboxes.</em></p></li>
          <li><i>02</i><p>Score for intent, not sentiment.<em>Is the problem described in the present tense, is a recommendation being asked for, is there urgency, is the thread still alive.</em></p></li>
          <li><i>03</i><p>Draft the reply, hold the send.<em>Below Level 3 nothing sends. Direct messages never send, at any level.</em></p></li>
          <li><i>04</i><p>Beat the free baseline.<em>F5Bot emails Reddit keyword hits for nothing. If the lead queue is not obviously better than that, the scoring is not working yet.</em></p></li>
        </ol>
      </section>

      {/* ── Build vs buy ─────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec">
        <p className="ds-kicker">Build versus buy</p>
        <h2 className="ds-h">Ayrshare, Postiz and Blotato already do this. <span className="tone">We still write our own.</span></h2>
        <div className="ds-rails" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <article className="ds-rail r-coral">
            <span className="r-tag">Reason one</span>
            <h3>Margin</h3>
            <p>Distra is usage priced. Ayrshare bills per connected profile at around $149 a month, so the cost scales with customer success in the wrong direction. Paying a middleman on top of platform costs, on a product whose whole pitch is doing real work, is a structural leak.</p>
          </article>
          <article className="ds-rail r-violet">
            <span className="r-tag">Reason two</span>
            <h3>The gates are the product</h3>
            <p>verify(), per-platform policy gates, the Reddit one-target rule and the circuit breaker cannot be implemented through somebody else's abstraction. Take the abstraction and you lose the part that keeps the founder's accounts alive.</p>
          </article>
          <article className="ds-rail r-green">
            <span className="r-tag">Reason three</span>
            <h3>Rail B does not exist for them</h3>
            <p>Half these surfaces are reachable only because Braino owns a browser that is already installed and already signed in. No aggregator can offer that, which is exactly why wrapping one caps Distra at parity with Buffer.</p>
          </article>
        </div>
        <p className="ds-note">
          Where buying is right: as a temporary bridge during the Meta and TikTok review cycles, so
          the video channels are live weeks earlier. Self-hosted Postiz is the sensible bridge,
          because it costs a server and creates no per-seat dependency. Flagged in the UI as a
          bridge, and removed when the direct adapter lands.
        </p>
      </section>

      {/* ── Not getting banned ───────────────────────────────────────── */}
      <section className="ds-wrap ds-sec">
        <p className="ds-kicker">Safety</p>
        <h2 className="ds-h">Not getting banned is <span className="tone">an engineering requirement.</span></h2>
        <p className="ds-lede">
          One suspended LinkedIn account ends a founder's business development for a year. These
          eight rules live in the policy engine, not in a document.
        </p>
        <div className="ds-rules">
          {RULES.map((r) => (
            <div key={r.n}>
              <i>{r.n}</i>
              <h5>{r.t}</h5>
              <p>{r.p}</p>
            </div>
          ))}
        </div>
        <p className="ds-note">
          Tokens are encrypted at rest with keys held separately, isolated per tenant so one
          compromise cannot reach another, refreshed proactively ahead of expiry with a reactive
          fallback, and never handed to the browser. The edge function is the backend for the
          frontend; the client only ever sees a session cookie.
        </p>
      </section>

      {/* ── Money ────────────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec" id="money">
        <p className="ds-kicker">Money</p>
        <h2 className="ds-h">The platforms are nearly free. <span className="tone">Inference is the bill.</span></h2>
        <p className="ds-lede">
          Per active founder per month, at roughly three posts a day on text platforms and three
          videos a week. One platform fee is big enough to change product design, and it is the X
          link surcharge.
        </p>
        <div className="ds-tablewrap">
          <table className="ds-table">
            <thead>
              <tr><th>Line</th><th>Monthly</th><th>Note</th></tr>
            </thead>
            <tbody>
              {COSTS.map((c) => (
                <tr key={c.line} className={c.hl ? "hl" : undefined}>
                  <td>{c.line}</td>
                  <td className="num">{c.amt}</td>
                  <td>{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ds-note">
          That matches the deck's usage-priced model: revenue scales with work done rather than
          seats sold. It also means the unit economics live or die on inference cost, not on API
          fees, which is a very different company to run.
        </p>
      </section>

      {/* ── Ledger close ─────────────────────────────────────────────── */}
      <section className="ds-wrap ds-sec">
        <p className="ds-kicker">The honest ledger</p>
        <h2 className="ds-h">Distra is in the <span className="tone">Building column.</span></h2>
        <p className="ds-lede">
          The deck says so and this page says so. A plan that overstates shipping status is the one
          thing worse than a slow roadmap.
        </p>
        <div className="ds-ledger">
          {LEDGER.map((l) => (
            <div key={l.label} className={l.cls}>
              <b>{l.label}</b>
              <ul>{l.items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className="ds-note">
          The company-level test: Distra's first customer is Braino. Before it is sold to anyone it
          should be running Braino's own distribution across at least five platforms with the
          founder spending under 20 minutes a day on it.
        </p>
      </section>

      <footer className="apple-foot">
        Distra, the distribution engine of Braino Foundry. Plan written 18 August 2026 and kept in
        full at Distra.md in the repository, which carries the sources for every figure on this
        page. Platform pricing, rate limits and approval requirements were checked in August 2026
        and all of them move. Nothing described here is shipped. trybraino.com is a waitlist today.
      </footer>
    </div>
  );
}
