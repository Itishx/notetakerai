# Affective Labs, and Saburi

**Type:** Product
**Platform:** Affective website (/labs)
**Status:** Exploring
**Released:** October 3, 2026

## The simple version

Labs is where Affective plays with AI and tech that is not a product yet. Some of it will become one, some will not. Each experiment says plainly what works and what does not, and flags when it might be a little naughty.

The first experiment is Saburi, Braino's emotional engine, told from your side: some days you want a quick answer, some days you need someone to notice the meeting went badly. Saburi is the part of Braino that tries to tell the difference. (Inside, it is fifteen trait playbooks and a moment reader; the page does not list them, because nobody using Braino cares what they are called.)

## Why it exists

Saburi was built inside Braino from the start, so it only ever got to be a small part of him. It has never been properly tested in three months. Now that the technology it sat on lives in AffectiveOS, it can be trained on its own, without first working out where it fits.

## Honest limitations

- Today Saburi only shapes how Braino writes in text chat; moment routing is text chat only and his voice stays neutral.
- Known gap from the engine audit: physical distress reads as a neutral moment.
- No release date, no training run yet.

## Technical shape

- Page: `src/pages/Labs.tsx` + `labs.css`; the headline uses the homepage's word-by-word stamp (`.aff-kin`), banner is `public/speak.jpg`, on the homepage's tokens and `.hb6-jobs` grid; linked from the homepage footer (Company → Labs).
- Engine: `supabase/functions/_shared/emotional-engine/` (manifest, traits/, moments.ts, classes.ts where Saburi is the companion class).
