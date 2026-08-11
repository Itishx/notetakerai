# BrainoX: The Distribution Command Center

**Status:** MVP
**Platform:** Braino website (/x) + Supabase edge functions
**Published:** August 12, 2026
**Spec:** BrainoX.md at the repo root (178 sections; this MVP ships its section 172 slice)

## What it is

BrainoX turns Braino into the operator of Itish's X presence. Itish supplies the thoughts; Braino runs the system around them: queue, scheduling, policy gates, provenance, analytics, and a spoken-style briefing. The core principle from the spec: **Itish owns the voice. Braino owns the distribution system.**

## How it works

- **Three entry modes** on /x: "I wrote this" (wording preserved verbatim, straight to drafts), "Raw thought" (Braino writes three options: insightful, contrarian, conversational, without inventing a single fact), and "Braino, draft something" (pillar-grounded drafts, opinion-level only unless real material is provided).
- **The queue** moves items draft → approved → scheduled → published, with paused/failed/rejected side states. Drag to reorder (fractional positions, one-row updates). Every item keeps its original input for provenance.
- **The policy guard** (`_shared/brainox-policy.ts`) is a hard gate, not advice: kill switch, empty/length, exact and near duplicates (token Jaccard ≥ 0.72), quiet hours, minimum gap, daily cap. A blocked item shows exactly which gate held it and why.
- **Publishing rides the existing pipeline.** brainox-schedule inserts into `scheduled_x_posts` and the dispatch-scheduled-x-posts cron (or an immediate dispatch for "Publish now") does the posting, with token refresh, thread splitting, and claim locking untouched.
- **"How's my X?"** (brainox-briefing) builds one canonical stats object (follower snapshots, week's posts, engagement, queue health) and composes the executive briefing from those same numbers, so voice and dashboard can never disagree.
- **User overrides always win.** "Publish now" skips timing rules but never the kill switch or an exact duplicate.

## The honest bit

Impressions, profile visits, and follower attribution need a paid X API tier, so the MVP reports engagement counts and follower snapshots instead, and says so on the surface. Autonomy is Level 0–2: nothing publishes without an approved item; Braino never posts content Itish has not approved. Reply discovery, event detection, experiments, and the learning engine are specced (BrainoX.md V2/V3) but not built.

## Tables

`x_queue_items`, `x_ideas`, `x_settings`, `x_action_log` (migration `20260812210000_brainox_distribution.sql`), riding on the existing `scheduled_x_posts`, `x_connections`, `x_post_analytics`, `x_follower_snapshots`.
