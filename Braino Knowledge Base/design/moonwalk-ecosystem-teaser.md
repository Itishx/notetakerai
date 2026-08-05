# Moonwalk Ecosystem Teaser

**Type:** Design decision

**Platform:** Braino website

**Status:** MVP

**Released:** August 5, 2026

## The simple version

This is a tiny campaign cut built from the exact motion language of the Braino ecosystem teaser. It asks “Does your AI moonwalk?”, answers “It will now” on its own frame, then lands on a very large `trybraino.com`.

## Why it exists

The moonwalk needs a teaser that feels like the rest of Braino without explaining the whole product again. The line creates the curiosity. The domain gives that curiosity somewhere to go.

## How to use it

Open `/moonwalk-teaser`. The film starts automatically, loops, and keeps the same transport controls as the ecosystem teaser. Add `?embed` when another Braino surface needs the end-of-film message.

## What Braino knows or does

- Splits every word into two fused chunks.
- Uses the ecosystem teaser's stomp, shimmer, match-cut and beat-sync grammar.
- Makes `trybraino.com` the only oversized closing frame.

## Honest limitations

The soundtrack still depends on browser autoplay rules. If audio is blocked, the typography runs on its own clock and playback unlocks after the first interaction. This is a web teaser, not a rendered social export yet.

## Technical shape

`src/pages/MoonwalkTeaser.tsx` supplies two beats to the shared `KineticFilm` engine. It reuses the Don't Blink blueprint, the ecosystem film's base styling, and the same “places to be” audio track. `src/pages/moonwalk-teaser.css` contains only the closing-domain sizing and shimmer overrides.

## Product or design decisions

No orbit, mascot, labels or supporting graphics appear. The request was for the ecosystem teaser's typography system with only the new copy, so the animation grammar remains while the film itself stays text-only.

## What comes next

A rendered vertical or square export can be made once the target social format is chosen.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
