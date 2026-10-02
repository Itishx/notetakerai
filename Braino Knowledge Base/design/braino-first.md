# Braino First

**Type:** Design decision
**Platform:** Affective website
**Status:** Live
**Released:** October 2, 2026

## The simple version

The home page at affctve.com now meets you with Braino, not with the company or the technology. First what you get, then why it works, then who makes it. The way apple.com opens on the iPhone.

## Why it exists

The old page went Affective, then AffectiveOS, then Braino. People had to change their idea of what they were looking at twice before they found the thing they would use. Outside readers kept asking whether Affective and Braino were one company or two, and whether AffectiveOS meant installing a new operating system.

## How it reads now

1. Hero: "Stop using your Mac. Start talking to it." Then: meet Braino, who lives in your notch.
2. Meet Braino: what he does, and the live demo.
3. Why it works: he runs on AffectiveOS, a layer on top of the macOS you already have. Nothing to replace or reinstall.
4. Questions, starting with what Braino is, then AffectiveOS, then "do I need a new operating system?" and "who makes Braino?".
5. Braino Foundry and Braino for Schools are footer links only.

## The locked structure

- Affective is the company. affctve.com is the only website.
- Braino is the product, and he comes first.
- AffectiveOS is why it works, in one section.
- trybraino.com stays ours. Its home page points to affctve.com/braino; every other trybraino.com address keeps working, because the Chrome extension and the Mac app sign in through it.

## Honest limitations

- The Braino page still offers the three models, and still says Braino for Schools is live at Mesa. Mesa runs on the founder's own Mac, so that line should be softened.
- Nothing about this has been tested with real visitors yet.

## Technical shape

- `src/pages/Affective.tsx`: section order, hero line, questions; the models row was removed.
- `vercel.json`: a temporary redirect of the trybraino.com home page only.
- `scripts/seo-pages.mjs`: the home page's preview description.
