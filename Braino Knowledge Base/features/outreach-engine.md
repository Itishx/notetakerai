# Outreach Engine

**Type:** Feature (an AffectiveOS engine, used through Braino, sold in Distra)
**Platform:** Braino on the web (`/outreach`)
**Status:** Exploring (built, not yet live: needs the migration pushed and a free function slot)
**Released:** October 17, 2026 (branch `OAS`)

## The simple version

Tell Braino who you want to sell to and what you sell. He builds a target profile, finds the people who fit best, ranks each one with plain reasons, and writes the first message. You send it. When someone replies or books a call, you mark it, and the next search ranks better.

## Positioning

Not a new product, not a model, not an OS. An engine inside AffectiveOS (like the Emotional and Memory engines). People use it by asking Braino; they pay for it through Distra. Internal name: Outreach Engine. Public line: "Braino finds your buyers." No "OAS" in public copy.

## How to use it

1. Go to `/outreach`, signed in.
2. Write who you want ("Founders of D2C skincare brands in India doing 1-10 crore, hiring their first marketer") and what you sell. Press **Build the profile**.
3. Answer the 2-3 questions if they help, or skip. Press **Find people** (under a minute).
4. Filter and sort the ranked table. Click a person for their score breakdown, reasons, signals and sources.
5. **Write messages for the top 12**, edit, then **Open in Gmail** or **Copy**. Press **I sent it**.
6. Later: **Replied**, **Booked a call**, **Not interested**, **Opted out**, **Bounced**.

## How it works

```
/outreach page ──► outreach-engine (one Supabase function)
  refine  words → profile JSON (roles, industries, size, places, signals, excludes, search queries) + questions
  hunt    Exa (linkedin profile / company / news, last 180d) + Apollo if key → ≤70 deduped results
          → model builds one record per person, strict on evidence (never invents people, emails, URLs)
          → Hunter email finder for the top 12 if key
          → deterministic score, reasons, discards → outreach_leads
  draft   one message + 2 follow-ups per person, from their record only
  outcome sent / replied / booked / not_interested / opted_out / bounced → outreach_events
  edit    save an edited message
```

**Score (0-100)** = fit 0.55, timing 0.28, reach 0.17; once a user has 3+ replied/booked leads: fit 0.45, timing 0.25, reach 0.15, looks-like-past-wins 0.15.
- Fit: model scores role, pain, industry, size, location as 0 / 0.5 / 1 with evidence; weighted 0.3 / 0.25 / 0.2 / 0.15 / 0.1, +0.05 for founder/C-level/VP.
- Timing: freshest dated signal (≤30d 1, ≤90d 0.75, ≤180d 0.45, older 0.2, undated 0.3).
- Reach: verified email 1, other email 0.65, LinkedIn 0.5, website 0.3.
- Looks like past wins: feature overlap (industry, seniority, size bucket, country, signal kinds) with booked (x2) and replied (x1) leads across all the user's searches. This is the learning loop and the moat.
- Discards: brief exclusions, do-not-contact list, competitors/customers, fit < 0.35.

**Tables** (`supabase/migrations/20261017000001_outreach_engine.sql`, RLS: own rows only): `outreach_briefs`, `outreach_leads`, `outreach_events`, `outreach_suppression`.

**Keys:** `OPENAI_API_KEY`, `EXA_API_KEY` (both already set). Optional: `APOLLO_API_KEY`, `HUNTER_API_KEY` switch their sources on. The bar on the page shows which are on.

**Cost:** each model call caches its fixed instructions (`prompt_cache_key: outreach-<step>`, 24h). Spend per search (Exa calls, pages, tokens, approx USD) is stored on the brief and shown under the buttons; every refine/hunt/draft is in `engine_runs` as `outreach-*`.

**Files:** `supabase/functions/outreach/outreach-engine/index.ts`, `src/pages/OutreachEngine.tsx`, `src/pages/outreach.css`, `src/pages/OutreachEngineDocs.tsx`.

## Honest limitations

- No call guarantee. Measure booked calls per 100 sent.
- Sending is by you (Gmail compose link, copy). Direct Gmail sending needs the `gmail.send` scope and Google's review.
- Only what search finds: many people come without email until Hunter or Apollo is on.
- LinkedIn: drafts only, never automated.
- Looks-like-past-wins needs 3+ outcomes before it counts.
- Not in the Mac app or voice yet ("Braino, find me 50…" is next).
- Prod is at the 100 edge function cap: one function must be retired to deploy this.

## Next

1. Push the migration and deploy (after freeing a slot).
2. Gmail send + follow-up scheduling, reply sorting from the inbox.
3. India sources (MCA filings, Tracxn), funding and hiring feeds.
4. Voice and Mac: "Braino, find me…" through HIL.
5. A trained ranker once there are a few hundred outcomes.

## Public documentation checklist

- [x] Permanent page added under `/knowledge` (`/knowledge/outreach-engine`)
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
