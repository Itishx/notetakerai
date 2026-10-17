# Affective Labs

**Type:** Page
**Platform:** Website (`/labs`)
**Status:** Live
**Released:** October 3, 2026 · Rewritten October 17, 2026

## The simple version

Labs is where we build a system that takes care of things for you, end to end, one engine at a time. Whatever we are working on lives in Labs, so people can try it while it is still being made.

## The three engines

- **Outreach** (try it now, `/outreach`): finds the people most likely to buy, says why, writes the first message per channel. See `outreach-engine.md`.
- **Content** (being built): makes what you publish, in your voice, from the same product report.
- **Optics** (next): reads what is landing and why.

Together they are Braino Distra.

## Changes on October 17, 2026

- Saburi removed everywhere on the website: the `/saburi` page is deleted (the route redirects to `/labs`), its card is gone from `/classes` (now two classes: Iomi and Telos), its option is gone from the product overview graphic, and demo lines that used the name now say Riya.
- `/knowledge/labs-and-saburi` and `/knowledge/affective-labs` both redirect to `/labs`; the knowledge entry is now "Affective Labs".

## Technical shape

`src/pages/Labs.tsx` (`ENGINES` array drives the three boxes), `src/pages/labs.css`.

## Honest limitations

Only Outreach can be tried. Content and Optics have no release date.
