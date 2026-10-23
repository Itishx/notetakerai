# Foundry: Get found

**Type:** Product
**Platform:** Web (affctve.com/foundry)
**Status:** MVP (Forge AI Hackathon)
**Released:** October 22, 2026

## The simple version

Tell Foundry what you're building. It finds where buyers can't find you, writes the posts that fix it, and brings you people asking for it on Reddit, with a message each. You only approve.

## How to use it

1. Go to /foundry, describe your product in your own words, add any link and a line about you.
2. Foundry plays it back in two plain lines. Tap "Yes, that's it".
3. Optics shows which of your buyers' questions an AI assistant answers without naming you, who it names instead, and whether you're on Google's page one. Then a fix list.
4. Content writes posts for X, LinkedIn, Reddit, Instagram and Threads that answer those questions. Or ask for a post about anything.
5. Outreach finds Reddit threads where people describe your problem, keeps the real ones, and writes a help-first reply each.
6. Approve copies the text and opens the platform. Nothing is posted or sent by Foundry itself.

## Honest limitations

- The AI answer check asks GPT-5.6 cold, the way a buyer would ask an assistant without browsing; it is not a live ChatGPT or Perplexity query.
- Reddit threads come through Google (site:reddit.com, past year), not a live Reddit feed; the direct Reddit scraper took over 7 minutes and returned unrelated posts.
- Approve copies and opens the composer; it does not post through platform APIs or n8n yet.
- The session is kept in this browser only.

## Technical shape

- Page: src/pages/FoundryApp.tsx + foundry-app.css, route /foundry, Affective tokens (AffNav, AffFooter, theme toggle).
- Language: GPT-5.6 through the existing chat-about-notes edge function (anonymous calls allowed); every step is one JSON call: brief, AI answers, fix list, posts, judging + messages.
- Search: api/foundry-apify.js (Vercel function) starts Apify google-search-scraper runs and is polled; the Apify token stays on the server (APIFY_TOKEN env, with a fallback).
- vercel.json catch-all no longer rewrites /api/*.
- Measured 2026-10-22: brief 5s, AI answers 4s, Google 37s, Reddit 74s, judging 7s.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate

## Labs blog and the launch article (2026-10-22)

- **Labs is now a small blog.** `/labs` has a "Writing from Labs" section. Cards come from `src/lib/labsPosts.ts`; add an entry there (and a body in `BODIES` inside `src/pages/LabsPost.tsx`) to publish a new article.
- **First article:** "Introducing Braino Foundry" at `/labs/introducing-braino-foundry`. Covers why (8 of 8 founders named distribution, 0 of 8 pay for a tool), the three engines and their loop, the four workflows, where it lives (Mac app in private beta, website at /foundry/app for Chrome and Windows, one brain), and honest limits.
- **Labs engine boxes** for Optics, Content and Outreach now say "Part of Braino Foundry" and point at `/foundry`.
- **Limits stated in the article:** approve = copy + open (no auto posting yet); Reddit is found through Google; a search takes about a minute.
- **Technical shape:** `LabsPost.tsx` renders by slug (`/labs/:slug`), diagrams are inline SVG/HTML, styles in `labs-post.css`, Affective homepage grammar, light and dark.
- **Status:** built 22 October 2026, route added in `App.tsx` by Itish.

## Chat redesign (22 Oct 2026)

/foundry/app is now a chat, like Claude. Questions come one at a time in the onboarding style. While it runs, a timeline shows each step. Results appear in the chat as charts: an Optics ring, you vs competitors, a grid of which questions name you. Posts are previewed the way each platform shows them, and Reddit leads come with a readiness bar. Nothing goes out until you approve it.

## Projects, Braino and voice (22 Oct 2026)

Opens on a projects home. Each project has Chat, Overview and Approvals tabs. A new chat waits for you to say hi, then Braino (with his mascot) asks three quick questions. A mic button opens voice mode: browser speech recognition in, Braino's Fish voice out (Chrome or Safari). A run stops if the page reloads.

## Approvals, Autopilot and charts (22 Oct 2026)

Posts and messages live only in Approvals; the chat shows one "Your approvals are ready" card. Run steps sit in the top bar. Overview has Autopilot (run every week, saved per project; runs when you open the app on or after the due date, no server scheduler yet), a loop diagram, and charts: AI answers naming you per run, approvals per run, share of mentions, written to approved to opened. "Run again now" replaces the current posts and messages.

## The rebuilt app (23 Oct 2026)

**Status:** MVP, local on branch foundry-hackathon. **Released:** October 23, 2026 (not yet merged to main).

### The simple version

Foundry is no longer a chat. A three step setup (your product, you, your buyer), then a calm workspace with a Dashboard, one page per engine, one Approvals inbox and the shared memory. Goal: $0 to the first paying customer.

### How to use it

1. Open /foundry/app. Step 1: describe the product and add the website. Braino reads up to 5 pages and writes a product card (name, one line, buyer, problem, pricing, proof, tone, what is missing). Fix anything.
2. Step 2: LinkedIn link plus "why you". Braino reads the public headline through Google and writes a founder card.
3. Step 3: confirm the buyer, their 8 questions and 3 Reddit phrases. Tap Start Braino Foundry.
4. Dashboard: paying customers and the next move, the Found to Paid funnel, named by AI X of 8 plus Google page one, KPI sparklines per run, Happening now, This week's moves, the loop diagram with real counts, Autopilot.
5. Get found (Optics), Be seen (Content), Reach people (Outreach) each have a header with status, last run and Run again. Approvals holds every post and message.
6. On Reach people, Paste their reply drafts the answer, moves the stage and logs any objection to memory.

### The three engines and the memory

- **Optics, they find you:** asks 8 buyer questions to GPT-5.6 (as an assistant would answer) and checks Google for 2 questions plus the newest buyer quote. Saves gaps to memory. Fixes list with Do it for me (finished piece, where, steps, copy and open).
- **Content, they see you:** picks up to 3 topics from memory (buyer quotes, Optics gaps, objections, or a founder ask), each with a source chip, writes one post per platform (X, LinkedIn, Reddit, Instagram, Threads) with a day and time. Public posts only.
- **Outreach, you reach them:** finds Reddit threads through Google, keeps real askers, saves their words as buyer quotes, writes one message each (opening with a Content post when one fits). Pipeline Found, Messaged, Replied, Talking, Paid. Follow-up auto-drafted after 3 quiet days in Messaged.
- **Objections** from pasted replies become an Optics FAQ fix, a Content topic, and a line every new message answers.
- Run order: Reddit search and Optics in parallel, then judging (quotes), then Content, then messages. Each run stores the flow counts the loop diagram shows.

### Technical shape

- `src/pages/foundry/`: `lib.ts` (model, Apify, matching, helpers), `store.ts` (types, localStorage `foundry-v2`, migration from `foundry-projects-v1`), `engines.ts` (prompts and engine runs), `actions.ts` (approve, stage moves), `types.ts` (page props, ranked moves), `components/` (`ui.tsx` hints, Explain this, sections, side sheet, fields; `charts.tsx` ring, bars, sparkline, funnel, meter, week strip, loop diagram, KPI; `previews.tsx` platform previews), one file per page (`Onboarding`, `Dashboard`, `Optics`, `Content`, `Outreach`, `Approvals`, `Memory`), `FoundryRoot.tsx` (shell, settings, autopilot), `foundry.css`.
- `/foundry/app` in `src/App.tsx` points at `FoundryRoot`. The chat version stays in `src/pages/FoundryApp.tsx` as a backup.
- `api/foundry-apify.js` gained kind `site` (apify~website-content-crawler, 5 pages, depth 1, cheerio, text sliced to 2500 characters per page).
- Explain this sends the section's real data to the model and shows 2 or 3 sentences.

### Honest limitations

- Without APIFY_TOKEN, the website, LinkedIn, Google and Reddit cannot be read. Cards are built from the founder's words, a calm note says why, Optics still runs the AI check, Outreach stays empty.
- The AI check is GPT-5.6 answering cold, not a live ChatGPT or Perplexity query. Google checks only 3 searches per run.
- LinkedIn is the public headline Google shows, not the full profile.
- Approve copies and opens; nothing is posted or sent for you (n8n later). Approve all may be stopped by the pop up blocker after the first tab.
- Replies are pasted by hand; Foundry cannot read Reddit inboxes.
- Autopilot runs only when the app is open on or after the due date. Runs stop if the page reloads mid run.
- All data is in this browser (localStorage). No sync across devices.

## Founder feedback pass (23 Oct 2026)

**Status:** MVP, local on branch foundry-hackathon, not merged. **Released:** October 23, 2026.

What changed, from Itish's walkthrough:
- **Dashboard opens with who this is for.** A Company card (name, site, one line, buyer, problem, pricing) and a Founder card (your name, photo, who you are, why trust you, LinkedIn) sit at the top. Edit takes you to Product and founder, which stays its own tab.
- **Your name and photo** show in the sidebar and on the Founder card. Add the photo in Settings; it is shrunk to 160px and kept in this browser.
- **One way to ask.** The small "i" buttons are gone; "Explain this" does that job.
- **Approvals is a table**, Notion style: Type, Where, What it says, Status, Action. One row of tabs (Waiting, Approved, Skipped, All) replaces three stacks of pills, so what is selected is never in doubt.
- **Topics now write articles.** Each topic has "Write the article". The article shows under the topic and waits in Approvals as an Article row; approving copies it.
- **Posts are a readable table**, not platform mock-ups. No Instagram tile.
- **"How the engines fed each other" left the dashboard.**
- **Sidebar fix.** The wrapper used `overflow-x: hidden`, which made it a scroll box and broke the sticky sidebar. Now `overflow-x: clip`, and the sidebar scrolls on its own.

Files: `src/pages/foundry/Dashboard.tsx`, `Approvals.tsx`, `Content.tsx`, `FoundryRoot.tsx`, `actions.ts`, `engines.ts` (`writeArticle`), `store.ts` (`Topic.article`, `Settings.photo`), `types.ts`, `components/table.tsx` (new), `components/ui.tsx` (Hint is a no-op), `foundry.css`.

Honest limitations: articles cost one model call each and are not checked for facts beyond the prompt's rules. The photo lives only in this browser. The Apify token is still missing locally, so site, LinkedIn and Reddit reads fall back to what you typed.

## Get found, outdoing EchoRanked + plain-words site (23 Oct 2026)

**Status:** MVP, local, not pushed yet. **Released:** October 23, 2026.

Get found (`src/pages/foundry/Optics.tsx`, `engines.ts`, `types.ts`):
- **Ranges, not one number.** Each buyer question is asked 3 times (3 model calls instead of 1, in parallel, about 9 seconds). The score reads "named in 2 to 4 of 8": low is every run, high is at least one.
- **What AI said, word for word**, under every question.
- **Leaderboard and share of voice**: every name AI gave across all runs, ranked, with your % of them.
- **Can AI read your site?** Checks robots.txt for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Bingbot and CCBot, plus whether the home page has words without JavaScript. Gives the exact robots.txt lines to fix it. Runs in `api/foundry-apify.js` (`kind: "crawl"`), no Apify token needed.
- **Articles have their claims checked**: every factual claim is sorted into "from your details", "common knowledge" or "needs a source", and the ones needing a source are listed before you publish. One extra model call per article.
- **Your real buyer questions**: paste them, or upload the Queries export from Google Search Console; the top 8 by impressions are used.

Not done: connecting Google Search Console directly (needs Google sign-in), daily scans (needs a server schedule).

Website (`src/pages/FoundryLanding.tsx`): rewritten in plain outcomes, no engine names. Three steps (tell us what you built, we do most of the work, people find you and some buy), a Pricing section (Free to try, Foundry $33 a month) and a Services section, **Done for you at $299 a month** (we run it, write, post after your yes, reply to people, weekly report). Nav: How it works, Pricing, Done for you, Braino. Pricing decided by Itish on 23 Oct 2026. Checkout is not wired yet: both plan buttons start the free app, Done for you goes to /contact.

## The brand map (23 Oct 2026)

**Status:** MVP, local. A live picture at the top of the dashboard of how the three engines feed each other and what that does for the brand.
- Your brand sits in the middle (with your share of AI's picks); Get found, Be seen and Reach people sit around it, each with its live status or its result.
- Lines between engines are real hand-offs counted from memory: buyer quotes that became topics, gaps that became posts, quotes and doubts that became fixes, posts that became openers. A line with nothing on it stays dashed. Dots run along used lines, and run fast while the engine at the start is working; a working engine pulses.
- Beside it: Named by AI, share of AI's picks, posts out, people talking, paid, and a live feed of every step.
- Replaces the old "Happening now" box (the feed lives in the map now). `src/pages/foundry/components/brandmap.tsx`.

## What comes next (the plan)

### 1. GitHub: "What you shipped" (planned 23 Oct 2026, not built)

Itish's idea: connect GitHub so every change you push becomes something to talk about.

- **Connect a repo.** Paste the GitHub link. Public repos need nothing more; private repos need a read-only fine-grained token (two-step guide in the app).
- **What you shipped.** On app open, or "Check now", read new commits, merged pull requests and releases since the last check. One model call turns them into plain features ("Added dark mode to the dashboard") and drops chores (typos, version bumps). Only runs when there are new commits.
- **Write about this.** Each shipped feature becomes a topic (source: "you shipped it"): posts for X, LinkedIn and Reddit plus an article, all waiting in Approvals.
- **More context.** The README and recent work feed the product card, so posts and outreach talk about what is actually new.
- **Brand map.** GitHub appears as a fourth source feeding Be seen.
- **Reuse.** Braino's Dev Pulse (`supabase/functions/_shared/dev-pulse.ts`) already reads git history; reuse its commit reading.

Version 1 checks whenever the app is open (no server). **Version 2**, true "every push, even with the app closed", needs a GitHub App with a push webhook to a server route, plus Foundry sign-in so drafts belong to someone. Build version 2 after sign-in exists.

## Sign in and search live (23 Oct 2026)

- **Sign in with Google** (the same Supabase account as Braino). Projects save to `foundry_projects` (one JSON row per project, row-level security: you only see your own). On sign-in, this browser's projects and your saved ones merge, newest copy wins, so nothing made before signing in is lost. Every change saves about 1.5 seconds later. Your name and photo come from Google until you set your own. Signed out, it works as before, in this browser only. The sidebar says where your work is saved.
- Needs the migration `supabase/migrations/20261023000001_foundry_projects.sql` applied to production; until then the sidebar says "Account saving is not switched on yet" and everything stays in the browser.
- **Search**: `APIFY_TOKEN` set in `.env.local` and in Vercel production on 23 Oct 2026.
- Google sign-in returns to `/foundry/app`, so that URL must be in Supabase Auth's allowed redirect URLs.

## Reach people on every platform (23 Oct 2026)

- **Where people are found.** Reddit, X, LinkedIn, Quora and forums (Indie Hackers, Hacker News, Product Hunt discussions). One Apify Google run (`kind: "people"` in `api/foundry-apify.js`): each buyer phrase on each platform's `site:` filter, up to 12 searches, last year only. Only real threads and posts are kept (Reddit `/comments/`, X `/status/`, LinkedIn `/posts/`, Quora questions, forum threads).
- **Each person has a platform.** Shown as a chip on the card; Reach people has platform tabs (All, Reddit, X, LinkedIn, Quora, Forums) above the stage tabs, and Approvals can filter messages the same way. People found before this are treated as Reddit.
- **Replies fit the platform.** Reddit: a helpful comment. X: under 260 characters, no hashtags. LinkedIn: 2 to 4 sentences. Quora: a full answer, product named once. Forums: a forum reply.
- **No false "I wrote about this".** A message only mentions one of your posts if that post is approved (out). Otherwise it never claims you wrote or posted anything.
- **Honest limits.** Google indexes X late and only partly, so fresh tweets often do not show up. Instagram and Facebook groups are not covered: Google cannot see inside them.

## Launch places (Be seen, Step 4)

Released 2026-10-23. Status: built, in the Foundry app.

**What it is.** A list of websites where new startups get listed: Product Hunt, Show HN, BetaList, AlternativeTo, the AI tool directories, G2 and Capterra, YourStory and Inc42 for India, and more (about 55 in all). Each one brings visitors, and every live listing is one more page AI and Google can find you on.

**How to use it.**
- Open Be seen and scroll to Step 4. Braino picks the 18 best places for your product. "Show all" shows the rest.
- Tap "Write my listing". Braino writes the tagline, short and long description and category inside that site's limits. Product Hunt also gets a maker's first comment, Hacker News gets a "Show HN" title and first comment.
- "Copy and open" copies the tagline and opens the site. Submit it, then tap "Mark submitted". When it is up, tap "Mark live" and paste the link.
- Live listings show on Get found, Step 1, under "Your live listings".

**Honest limits.**
- Braino cannot submit for you. These sites need your login, and many have captchas or payment.
- The list is picked by hand, so a site may change its rules, prices or shut down.
- The fit is a best guess from your product card plus one small AI call that tags your product (saas, ai, dev, and so on). It runs once per project.

**Technical shape.** The list lives in `src/pages/foundry/launchPlaces.ts` with a pure `rankPlaces(tags)` that sorts by fit, then strength. Tags come from `classifyLaunch` (one cached `askJson`, stored as `project.launchTags`) merged with a keyword guess. Progress is `project.launches[placeId] = { status, link, listing, at }`. Listings come from `writeListing` in `engines.ts`. The UI is `components/launches.tsx`. Writing a listing and marking one live log to the activity feed as Content.
