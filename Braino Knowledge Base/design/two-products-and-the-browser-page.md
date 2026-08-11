# Braino comes in three, on one page

**Type:** Design decision
**Platform:** Braino website
**Status:** MVP
**Released:** August 11, 2026

## The simple version

Braino is three products: **Braino Browser**, **Braino Foundry** on the Mac, and **BrainoHERA**. They now live on one page at `/braino` as one introduction followed by three tabs, so nobody has to leave to compare them.

## Why it exists

The capability design already existed at `/product-overview` and the numbered-promise design already existed at `/foundry`. Neither was reachable from `/`.

The whole outbound link set of the home page was **one link**, to a knowledge doc. Foundry linked to Product Overview, but nothing linked to Foundry. The pages were not missing, they were orphaned, which feels identical from the outside.

## The two designs, and which job each one does

The browser page borrows deliberately from both, because they answer different questions:

- **Numbered rows (from `/foundry`)** answer *"what will it definitely do?"* A numbered list of four reads as a promise. It goes first.
- **Capability bento (from `/product-overview`)** answers *"how far does it go?"* A grid reads as range. It goes second, under the honest heading that the four are the floor, not the ceiling.

Basics first, range second. Leading with the grid would have been a feature dump.

## The four

1. **Chat with the page** — whatever is on screen, ask about it
2. **Writes for you** — replies, drafts, rewrites, in your tone
3. **Listens and takes the notes** — lectures, meetings, long videos
4. **Runs the browser** — say the outcome, he does the clicking

Recording lectures and recording meetings were separate items in the original list and are merged here. They are one promise from the user's side: you stop writing things down.

## One page, four tabs, nothing leaves

`/` is Braino. The notch is the only navigation, and every tab is a real destination on the same page.

```
NOTCH   [eyes]  Braino · Browser · Foundry · HERA

Braino     hero · Who is Braino · BRAINO COMES IN THREE · What he can do · Braino OS
Browser    own hero · the four · capabilities · Basic and Pro pricing
Foundry    own hero · the co-founder story · Foundry pricing
HERA       own hero · how it works · why it is different · pricing

shared     Journal · FAQ · Footer
```

**Every tab has its own hero.** The first thing a tab change does is change the first thing you see. Without this, switching tabs scrolled you back to an identical top and looked like it had done nothing, which is exactly what it had done.

**"Braino comes in three" sits second, right after who he is.** People need the shape of the product before the detail of it, so the fork is near the top of the introduction rather than at the end of it.

**Nothing navigates away.** The table rows switch tabs. HERA used to be a link to its own page, which made one row behave differently from the other two for no visible reason. `/yap-mode` still exists as a deep page; it is just not where the tab sends you.

**The notch nav was stale.** It listed Welcome, BrainoOS, Dashboard and Iomi, which are names and destinations the site no longer uses. It now lists the four products plus Braino OS and the dashboard.

**`/braino`, `/browser` and `/foundry` are redirects** onto the right tab of `/`. The old homepage moved to `/overview`.

## Product or design decisions

**No mid-page colour slabs.** Every section sits on the same surface. Emphasis is type scale, space and hairlines. The only dark element on `/browser` is a single bento card, which is part of a grid rather than a band across the page. `/meetings` had one and it was removed.

**Less copy.** `/meetings` lost roughly half its words in the same pass. Nothing on either page needs a paragraph where a line will do.

**SiteFooter has to be re-dressed.** It ships as `.home-footer`, styled for the cream home pages. Dropped onto an Apple-token page it arrives in the wrong clothes, so both pages restate it in their own tokens. Any future Apple-shell page needs the same block.

**Mockups stay abstract.** The bento mini-mocks suggest the shape of a thing rather than pretending to be screenshots, which would age badly against a product still moving weekly.

## What comes next

- Trim the Foundry tab, which is the remaining source of length
- A film in the `/browser` hero, once there is one worth the slot
- `/product-overview` still carries older sections that predate the fork and could be thinned
- The Foundry page and the browser page should eventually share one shell rather than two stylesheets that agree

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
