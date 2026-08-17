# The Braino deck, the everything one

**Type:** Design decision
**Platform:** Braino website
**Status:** MVP
**Released:** August 17, 2026

## The simple version

`/braino-deck` (aliased `/everything`) explains all of Braino from nothing: what he
is, where he lives, what he does today, who pays, the arithmetic, and what is
honestly still unbuilt. Fourteen slides, arrow keys, one idea per slide.

`/deck` is untouched and stays what it was: the Braino Foundry investor pitch.

## Why it exists

`/deck` assumes a reader who already accepts that AI writes code and only wants
the Foundry argument. It never says what Braino Browser is, never prices
anything, never names who buys it, and never shows the arithmetic. Someone
meeting Braino for the first time reads thirty six slides and still cannot say
what the product is or what it costs.

So this is the other deck. Same visual language, opposite job: assume nothing.

## The rule for every slide

Harsher than on `/deck`: one idea, readable end to end without leaning in. If a
slide needed a second read it got split or cut. That is why the arithmetic gets
a whole slide instead of a footnote, and why the four browser promises are four
short lines rather than a capability grid.

## What is on it

1. **Cover.** One character. Every screen you use.
2. **What he is.** Not an app. One character, one memory, three places.
3. **Why he exists.** Everyone can build, almost nobody gets seen, and the tools do not talk.
4. **Where he lives.** The three products with the price on the card: Browser free, Foundry $20, HERA $5.
5. **What he does.** The four promises, no asterisks.
6. **The mind.** The three engines: Emotional, Memory, Human Intelligence Layer.
7. **Who it is for.** Two tiers, because the person who meets him is not always the one who pays.
8. **The numbers.** $45B, 36.3%, 29.8M, 73%.
9. **The math.** The sum with its working shown, and labelled a model.
10. **Comparables.** Lovable and Cursor.
11. **Where it stands.** Built, building, next.
12. **What comes next.** Being built on the left, speculation on the right, labelled.
13. **One page summary.** Five bands down a spine.
14. **Close.**

## Product or design decisions

**The price is on the product card.** A deck that hides pricing makes the reader
hunt for it, and they stop listening while they hunt.

**Two ICPs, stated as two.** The free browser user is a student or someone who
reads for a living. The buyer is the solo founder. A single ICP would have
quietly contradicted the free tier, so the slide names both and says which one
pays.

**The math shows its working.** Ten thousand free users, three conversion lines,
one total. The prices are real and live on the site; the conversion rates are
assumptions, and the slide says so in the same size type as the total. A deck
that prints an assumption in the same typeface as a measurement is lying
quietly.

**Speculation is fenced.** The future slide splits into being-built on the left
and honest speculation on the right, so nobody has to guess which column they
are reading.

**The shell is duplicated, not extracted.** BrainoDeck.tsx repeats the scroller,
rail and keyboard logic from Deck.tsx rather than sharing it. The Foundry deck is
in front of real people and must not move when this file changes. It does import
`deck.css`, which is read-only reuse of a type scale already tuned so no slide
scrolls internally.

**k-trio lives in brainoDeck.css.** The summary spine needed a three-box band for
the three products. deck.css only knows pairs and solos, and it was left that way.

## Honest limitations

The pricing on this deck is the pricing on `/braino`: Browser free with Pro at
$8, Foundry at $20 or ₹799, HERA free for fifteen minutes a day or $5 unlimited.
**This does not match `/deck`,** which describes Founder Braino as usage priced
credits with a five to ten dollar Mac companion. Both cannot be current. This
deck follows the live site; the Foundry deck has not been reconciled.

Nothing is on sale. Braino is a waitlist. Every conversion figure is a model.

The market ranges are analyst estimates for two adjacent categories, not one
measured number, and the comparable figures move in months, so they need
re-checking before any serious conversation.

## Technical shape

- `src/pages/BrainoDeck.tsx`, routed at `/braino-deck` and `/everything`
- `src/pages/brainoDeck.css` for the components this deck adds
- `src/pages/deck.css` imported for the shell and type scale, unmodified

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Public copy is simple and human
- [x] Release date and status are accurate
- [x] Verified at 1440x900 and 390x844 with no slide scrolling internally
