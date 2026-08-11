# Meetings positioning: quiet, not covert

**Type:** Design decision
**Platform:** Braino website (`/meetings`, waitlist chapter 04)
**Status:** MVP
**Released:** August 11, 2026

## The simple version

Braino records meetings without a bot joining the call, and the overlay he records in does not appear in your screen share. Both of those are worth selling. They are sold as **composure and privacy for you**, not as secrecy from the people you are meeting.

## Why it exists

The meeting recorder shipped and the first reaction to using it was that the invisibility is the product, not a detail. It deserved a page.

It also deserved a careful sentence, because "undetectable meeting recorder" is one phrase away from "record people without telling them", and that is not what this is or what we want to sell.

## The line we hold

Three claims are true and defensible, and the page is built entirely on them:

1. **No bot joins.** Nobody sees a notetaker in the participant list, and there is nothing for anyone else to admit or install. This is the real "invisible", and it is the one people feel immediately.
2. **Your notes stay out of your screen share.** When you present, live notes and half-formed action items are the last thing you want on the wall. Content protection keeps the overlay out of the capture pipeline. This is a privacy feature pointed at *your* screen, not at other people.
3. **Any platform.** Capture happens below the app, so Zoom, Meet, Teams, a huddle or a table are the same recorder.

One claim is deliberately **not** made anywhere: that Braino hides the fact you are recording from the people in the meeting. The `/meetings` page says the opposite out loud, in the honest section: *"It will not pretend to be secret from the people you are meeting. Being invisible to a screen share is about your notes, not about them."*

That sentence is load-bearing. It stays.

## Where it lives

- **`/meetings`** — the full page. Apple shell (`apple.css`), blue rather than the mint used by `/yap-mode`, because the claim is composure rather than speed.
- **Waitlist chapter 04** — sits directly after IOMI, since the Mac chapter is what makes meetings possible. Headline: "Recorded live. Invisible to your screen share." Links out to `/meetings`.
- Inserting chapter 04 renumbered the operating layer, the atelier and Hera to 05, 06 and 07.

## Product or design decisions

**Status stays "In active development."** trybraino.com is a waitlist, the product is pre-release, and no copy on either surface claims you can use this today.

**The honest section is not a disclaimer strip.** It is three real limits given the same typographic weight as the features: it will not guess a name, it will not pretend to be secret, it will not start on its own. A page that only sells is less convincing than one that shows where the edges are.

**No screenshots yet.** The recorder surface is days old and still moving. A stale mock would age worse than the words.

## What comes next

- A short film of the notch surface once the design settles, in the slot where the other chapters carry teasers
- The stealth toggle is a candidate for the paid tier, which is a pricing decision rather than a build one

## Public documentation checklist

- [x] Permanent page added under `/knowledge` (the feature doc is `meeting-recorder`)
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
