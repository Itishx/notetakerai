# Braino OS Instagram carousels

**Type:** Social copy
**Platform:** Braino website (`/instagraphics`)
**Status:** Built and exporting
**Live at:** `/instagraphics/braino-os`
**Written:** August 25, 2026

Static carousels, 1080 x 1350 portrait, exported at 4320 x 5400 (4K) as one ZIP per post.
Nothing animates, so every slide exports as a faithful PNG rather than a frozen frame.

House rules: no em dashes or en dashes. Braino is pre-release, so the only call to action is
the waitlist. Never write "available now".

## The design is not new

This post is a straight port of the site's own **Under the hood** section
(`src/pages/Landing.tsx`, section 7) into 4:5. Same tokens, same rhythm, same words.

- Ink `#1d1d1f` on paper `#fbfbfd`, secondary copy `#6e6e73`.
- One accent per pillar, exactly as the site assigns them:
  the mind blue `#2f6fed`, the heart coral `#d9645b`, the memory violet `#6b52c4`,
  the ears green `#3a8f5f`. Each has its tinted panel (`--ap-*-panel`).
- Apple rhythm per slide: small coloured eyebrow, one display headline with tight negative
  tracking and a single toned line, one paragraph of ink-soft copy. Nothing else.
- Each pillar slide carries the site's real card cover: the notch chrome bar over the live
  engine visual (`HumanIntelligence`, `EmotionNetwork`, `MemoryEngineViz`, `HeraListening`).
- Deck rule, from the Braino deck: one idea per slide, readable end to end without leaning in.

---

## Post 008 · Braino OS

Seven slides. What it is, the four pillars as one table, then a slide each, then the close.

Caption:
> Braino OS is the layer underneath every Braino, and it is four things. A mind that works out what you meant. A heart that reads the room. A memory that keeps what matters. And a pair of ears. That is why he feels like someone instead of something. Waitlist at trybraino.com.

### Slide 1 · What it is
- **Eyebrow:** Under the hood
- **Headline:** Braino OS.
- **Copy:** Every Braino runs on the same four things. A mind that works out what you meant, a heart that reads the room, a memory that keeps what matters, and a pair of ears. That is why he feels like someone instead of something.
- **Graphic:** Paper slide, almost entirely type. Four accent dots in a row above the headline, blue, coral, violet, green, in that order, with no labels yet. The dots are the only colour on the slide.

### Slide 2 · The four pillars
- **Eyebrow:** The four
- **Headline:** One layer. *Four jobs.*
- **Copy:** Not four products. Four parts of one operating layer, running in the browser, on the Mac, and inside Foundry.
- **Table:** four rows on hairline rules, the site's spec-table build. Left column is the coloured dot plus the role, middle is the name, right is the one line.

| | | |
| --- | --- | --- |
| ● The mind | Human Intelligence | Works out what you actually meant. |
| ● The heart | Emotional Intelligence | Reads the moment and answers inside it. |
| ● The memory | Memory Engine | Keeps what mattered, without being asked. |
| ● The ears | BrainoHERA | Hears you anywhere on the Mac. |

### Slide 3 · The mind
- **Eyebrow:** 01 · The mind (blue dot)
- **Headline:** Human *Intelligence.*
- **Copy:** He works a problem the way a person does. Your screen, your memory, the conversation, the time, the place, all pulled together to figure out what you actually want instead of what you literally typed.
- **Graphic:** Blue panel card with the notch chrome bar, carrying the site's Human Intelligence reasoning visual.

### Slide 4 · The heart
- **Eyebrow:** 02 · The heart (coral dot)
- **Headline:** Emotional *Intelligence.*
- **Copy:** The most emotionally intelligent AI anyone has built, and yes we know how that sounds. Fourteen trait modules reorder on every message, so he meets bad news differently than he meets banter.
- **Graphic:** Coral panel card with the notch chrome bar, carrying the site's emotion network visual.

### Slide 5 · The memory
- **Eyebrow:** 03 · The memory (violet dot)
- **Headline:** Memory *Engine.*
- **Copy:** Nobody has ever remembered to say remember this. So he decides for himself what was worth keeping, writes it down, and keeps it current. Every fact is yours to read, edit or delete.
- **Graphic:** Violet panel card with the notch chrome bar, carrying the site's memory engine visual.

### Slide 6 · The ears
- **Eyebrow:** 04 · The ears (green dot)
- **Headline:** Braino *HERA.*
- **Copy:** Hold a key anywhere on the Mac, say the thing, and the words land at your cursor in whatever app you were already in. No window, no answer, no chat. Just what you said, written down.
- **Graphic:** Green panel card with the notch chrome bar, carrying the site's HERA listening visual.

### Slide 7 · Close
- **Eyebrow:** Braino OS
- **Headline:** Speak, *watch it happen.*
- **Copy:** One mind, one heart, one memory, one pair of ears. The same Braino in the browser, on the Mac, and inside Foundry. Join the waitlist at trybraino.com.
- **Graphic:** Ink slide, the walking mascot small and centred, coral signature. The site's closing stamp line treatment.

---

## Still to write, one at a time

009 the mind, 010 the heart, 011 the memory, 012 the ears. Each one is a deep post on a single
pillar, built the same way: port the pillar's own page rather than invent a second explanation.

## Built notes

- The post lives at `/instagraphics/braino-os` and is linked from the archive as entry 008.
- The four engine visuals on the site are live canvases and intervals. A still PNG of a live
  canvas is whatever frame it happened to be on, so the artboard carries deterministic redraws
  of the same four pictures instead. The mind graph and the trait net are inline SVG, the memory
  list and the HERA card are DOM. Nothing animates, so the PNG is the post.
- The memory list shows four kept facts rather than the site's five, because five overflowed the
  card at 4:5.
- The HERA card ends on three quiet chips, no window, no answer, no chat, straight from the copy.
- The heart says **fourteen** trait modules. The site's card still says twelve, which is stale:
  `emotional-engine/manifest.ts` ships fourteen. Correct the site, not the post.

## Export

Open the post and choose **Download all · 4K PNG ZIP**. Every slide renders at 4320 x 5400 and
downloads in slide order in one ZIP. Verified end to end: seven files, each 4320 x 5400.
