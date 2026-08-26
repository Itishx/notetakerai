# Meet Braino

**Type:** Social copy
**Platform:** Braino website (`/instagraphics`)
**Status:** Built and exporting
**Live at:** `/instagraphics/meet-braino`
**Written:** August 25, 2026

One post, eleven slides. Static, 1080 x 1350, exported at 4320 x 5400 as one ZIP.

It was two posts for a day. Splitting who he is from what he does meant the second post had to
re-introduce him anyway, so they are one post now: meet him, learn the split, see what he does,
then learn why chapter two exists at all.

Sources, so nothing here is invented: the hero line and the four features are the site's own
(`src/pages/Landing.tsx` FEATURES, `src/pages/Foundry.tsx` HEROES), the character framing is the
Braino deck's "Not a chat box. A character." slide, and the engine cards are the pitch deck's
Engine 1 / 2 / 3 treatment (`files/braino-pitch-v9.html`) with the real states from
`src/data/distraEngines.ts`: Content running, Optics next, Outbound planned.

Voice: charming, a little Gen Z, never trying too hard. The first slide is the hook and carries
most of that weight. No em dashes. Pre-release, so the only call to action is the waitlist.

---

## Post 009 · Meet Braino

Caption:
> Iron Man had Jarvis. We built ours, then made him cute enough to keep around. He comes in two: the companion in your browser, free, and the co-founder on your Mac. Face, voice, memory, opinions. Waitlist at trybraino.com.

### Slide 1 · The cover (white)
- **Eyebrow:** Meet Braino
- **Headline:** Iron Man got Jarvis. *You get one who is cuter.*
- **Copy:** That was the entire brief. Build Jarvis, then make him someone you would actually want around all day. He has a face, a voice, a memory, and opinions about your ideas.
- **Graphic:** White. Braino centred with a black caption island above him reading "hi. i'm the suit and the guy." The first page is always white, and he is the only colour on it.

### Slide 2 · The product distinction
- **Eyebrow:** The split
- **Headline:** Two Brainos. *Same guy.*
- **Copy:** One lives in your browser and helps with your day. One lives on your Mac and helps you build a company. Same face, same memory, completely different job.
- **Graphic:** Two chapter cards drawn the way the website divides its chapters, accent rule on top of each.

| | |
| --- | --- |
| **01 / The companion** · Braino · Free, in your browser | Reads the page you are on, turns anything you listen to into notes, sits in your meetings, and goes and does the thing. |
| **02 / The co-founder** · Braino Foundry · Paid, on your Mac | Same face, same memory, different job. He builds the product with you, then makes sure the world finds out. |

### Slide 3 · What he does, at a glance
- **Eyebrow:** Chapter 01 · The companion
- **Headline:** So here is *what he does.*
- **Copy:** Four things, free in your browser. You do not learn any of them. You say the thing the way you would say it to a friend.
- **Graphic:** A four up bento in the site's `.bn-card` language: tinted panel per accent, the number in the accent at the top, the words anchored to the bottom.

| | | |
| --- | --- | --- |
| 01 On the page | 02 Notes from audio | 03 Your meetings | 04 He does it |

### Slides 4 to 7 · Chapter 01, one at a time
- **On the page** (coral): Chat with whatever *is in front of you.* Any page, any PDF, any video. He is already on it, so there is nothing to paste and nothing to upload. Revolutionary, I know.
- **Notes** (violet): Notes from anything *you listen to.* A lecture, a podcast, a two hour video you were never going to finish. He listens so you do not have to, and hands back something you would actually read.
- **Meetings** (blue): He sits in *your meetings.* No bot in the participant list, invisible to your screen share. Notes at the end, plus a list of everything you promised and immediately forgot.
- **Delegate** (green): Say it, *and he does it.* Books it, buys it, finds it, fills it in. In your browser, signed into your accounts, not in some sandbox pretending to be the internet.

### Slide 8 · Chapter 02
- **Eyebrow:** Chapter 02 · The co-founder
- **Headline:** The one *you hire.*
- **Copy:** Everything above was chapter one, and it is free. Braino Foundry is the same character on your Mac, working as a co-founder: he builds with you, then makes sure the world finds out.
- **Graphic:** The pitch deck's engine cards, three across, states included.

| | | |
| --- | --- | --- |
| **Engine 1** · running today | **Content** | Posts in your voice, from what you actually shipped. |
| **Engine 2** · next | **Optics** | Checks whether ChatGPT names you, then fixes it. |
| **Engine 3** · planned | **Outbound** | Finds the right people and writes to them. He drafts, you send. |

Footnote line: *A fourth engine holds the other three together and keeps everything in one approval inbox. Nothing goes out without you.*

### Slide 9 · Why chapter two exists
- **Eyebrow:** Chapter 02 · Why he exists
- **Headline:** Building it was never *the hard part.*
- **Copy:** One person builds, designs, ships, markets, posts on five platforms, finds the leads and replies to everyone. Marketing becomes a second full time job nobody signed up for, so it gets done badly, or not at all.
- **Graphic:** The deck's seven job chips. Build, Design and Ship sit quiet; Market, Post, Sell and Reply are filled in the accent, because those four are the ones Foundry takes.

### Slide 10 · What the interviews said
- **Eyebrow:** Chapter 02 · What we heard
- **Headline:** Eight founders. *The same answer.*
- **Copy:** We sat down with eight of them and overlaid what their weeks actually contain. Distribution was not one problem among many. It was the one they were all losing.
- **Graphic:** Three stat rows, the deck's numbers, nothing rounded up.

| | |
| --- | --- |
| **8** | founders we sat down with, one at a time |
| **7 of 8** | named posting and content as the thing hurting most |
| **8 of 8** | wanted to be named by ChatGPT once it was explained |

### Slide 11 · Close
- **Headline:** Meet him free. *Hire him later.*
- **Copy:** The companion lives in your browser and costs nothing. Braino Foundry, the engines, and the problem they exist for get their own post. Read that one next.
- **Graphic:** Ink slide, Braino centred, and one outlined chip reading "Next post · Braino Foundry".

---

## What was cut

The character run that used to close the post, not a chat box, presence, voice and memory, is gone.
It answered "who is he" a second time after the product had already answered it, and it pushed the
Foundry story off the end. Its copy is kept above in this file's history and belongs in the Braino
Foundry post or a dedicated character post, not here.

## Built notes

- The post lives at `/instagraphics/meet-braino` with one **Download all · 4K PNG ZIP**, and is
  linked from the archive as entry 009.
- It shares the Braino OS post's artboard: `src/components/SocialCarousel.tsx` owns the frame, the
  preview scaling and the export, `src/pages/social-artboard.css` owns the slide design.
- The cover is white. Only the closing slide is ink.
- Every graphic is a still, for the same reason as the Braino OS post: a PNG of a live canvas is
  whatever frame it landed on.
- Engine states come from `src/data/distraEngines.ts` (Content running, Optics next, Outbound
  planned), not the deck's old dates, which have gone stale.
- Verified end to end: eleven files, each 4320 x 5400.

## Next

A dedicated Braino Foundry post: the co-founder, Braino Code, and Distra's engines in full.
