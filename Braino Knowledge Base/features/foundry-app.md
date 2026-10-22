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
