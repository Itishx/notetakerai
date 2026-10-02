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
2. Meet Braino: six chores he takes off your plate (replies, meeting notes, the morning check, finding a file, forms, explaining yourself), then the live demo. Each is a chore first, how it goes away second, the way people actually buy. "Stop explaining yourself to your software" is marked Only Braino, because remembering you is the edge over voice-to-action tools like VoiceOS.
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
- The six chores are built and running in the beta, but most are still marked as being tested in the Mac app. The morning answer is worded around meetings and messages, not the Mesa timetable, because one Mesa schedule test fails.

## Technical shape

- `src/pages/Affective.tsx`: section order, hero line, questions; the models row was removed.
- `vercel.json`: a temporary redirect of the trybraino.com home page only.
- `scripts/seo-pages.mjs`: the home page's preview description.
