# The Pitch Deck System

Two halves, and they are not the same job.

- **Part I is the rules**: what a slide may say. Written from real review rounds. Every rule cost a round trip.
- **Part II is the design**: how it looks. The component library, the tokens, the traps.

Read Part I **before** writing a line of copy. Read Part II before writing a line of markup.

Source of truth: `files/braino-pitch-v10.html`. It is one self-contained HTML file with the whole stylesheet inline, and it is the base every other deck is cut from.

---

# Part I: The Rules

Mentor feedback is a **spec change, not an opinion**. When he says a slide is wrong, the slide is wrong.

## The one-line compression

> **"इसको बस simply, formal title रखो, not ChatGPT."**

If you remember nothing else, remember that. He is not asking for *better* writing. He is asking for *plainer* writing. Those are opposite instincts, and the clever one is the one that gets deleted.

## The four rules, applied every single time

### 1. No coined phrases

Anything that sounds authored gets cut.

| Deleted | Why |
|---|---|
| "You talk. He works. You approve. The world sees you." | A tagline pretending to be an explanation |
| "Braino markets Braino." | Clever, says nothing new |
| "Whatever repeats becomes a feature" | An abstraction stapled to an abstraction |
| "Nobody pays for this. Everybody needs it." | A construction, not a title |

**The trap.** When he says a title is boring, the instinct is to write a punchier one. That is the wrong direction. Two rounds were lost that way:

| Rejected | Shipped |
|---|---|
| "$17.9B is already being spent. Just not on this." | "The market, in three numbers." |
| "8 of 8 said distribution. 0 of 8 pay for it." | "What eight founders told us." |

Boring-and-plain beats boring-and-clever. Plain is the target, not the problem.

### 2. VC language, not founder language

Outcomes and money, not mechanics and character. Braino being a character is a product truth. It is not a pitch argument.

**Wanted:** TAM, SAM, SOM, MRR, gross margin, primary, secondary, segment.
**Cut:** engine, pillar, banked, in closing, ecosystem, value-first, flywheel. Anything that only parses if you already work here.

Note the asymmetry: **"jargon" means internal shorthand, not finance vocabulary.** TAM/SAM/SOM stay. "Optics" only survived because he named it himself.

### 3. One idea per slide. The pitch is four minutes.

> *"Every slide should communicate one main idea and should not look like three or four slides compressed into one."*

An entire slide was deleted because its two ideas belonged on two other slides. **When a slide is full, remove something. Do not shrink everything.**

### 4. Graphics can be rich. Copy must be flat.

He asks for logos, diagrams, tick boxes and tables, then flattens every sentence beside them. Do not spend the visual budget on words.

## What he notices that nobody else does

- **A title that says nothing.** "Just not on this". *This* what?
- **The same fact on two slides.** "$700 to 1,000/hr" appeared on both the research and competition slides. He spotted it.
- **Type you cannot read from a seat.** He reads at presentation distance, not on a laptop. Research numbers at 26px beside 44px numbers elsewhere got flagged.
- **A claim that contradicts a later slide.** "Nobody has taken it" cannot sit five slides before a table listing five competitors.
- **Confidence that undersells.** "We need 0.2% of it" was rejected outright: *"it undermines the vision."* Small-share humility reads as small ambition.
- **A number with no source, and a source with no number.** Both get flagged.

## Four ways to misread him

**His either/or is genuinely two options.**
> *"**Either** add an outreach visual **or** reduce/remove screenshots and use the space for clearer boxes."*

The second branch was already satisfied, and a round was spent preparing screenshots that were never owed. When a note contains "either", stop and check which branch is already done.

**"Make it bigger" often means "organise it better."** Told the research stats were too small, the fix attempted was larger type. The actual bug was two CSS grids declaring more columns than they had items, so content bunched left with dead space right. **Look for the layout fault before reaching for a font size.**

**He will ask for something back after removing it.** The status-quo row was cut for duplication, then wanted again. Removing content is reversible. Keep the markup recoverable.

**Lines he dictates verbatim ship verbatim.**
> *"Human in the loop — nothing goes public without your approval."*

That footer is his sentence, word for word. Do not improve it.

## The order

```
problem → market gap → solution → business model → GTM/traction → competition → roadmap → close
```

Two framing rules sit above it:

- **The problem comes early**, before the product, the companion, or why anything is free. The audience needs the gap before the fix.
- **Except on slide one.** The cover says what it *is*, quickly. Never the problem. *"First slide जो होती है, उसमें हमें in quick words बताना है what is it about."*

**Banned as an opener:** the Jarvis / Marvel analogy. Overused, and investors want a pain point rooted in reality, not a film reference.

**Naming:** plain words lead. "Braino for Founders. We call it Foundry." Never lead with Foundry. Never put "BrainoFoundry" on a cover.

## Standing content rules

- **Never print a bare "₹0" or "$0"** for a free tier, or imply it stays free. Show free and paid as two visible divisions.
- **One currency**, converted at a stated rate, with the rate on the slide.
- **No launch statuses or timelines** on product slides. Dates live on the roadmap and nowhere else.
- **"$200+ revenue stage"** and phrases like it get rewritten as a sentence: founders already making money pay up to $200.
- **Justify a free tier twice**: customer acquisition, and usage that improves the model.
- **Logos over explanation.** A recognisable mark buys the seconds a sentence would have spent.
- **Braino never uses an em-dash or en-dash.** Applies to deck copy too.

## The budget

The deck is read cold on DocSend in about **3m44s**. That is roughly **25 seconds a slide**: one idea, and at most one sourced number.

## The test before sending

1. Read every headline aloud. Does any sound *written*? Rewrite it plainer.
2. Search for any fact that appears twice.
3. Does any slide hold more than one idea?
4. Would every number be legible from the back of a room?
5. Does anything on slide *n* contradict slide *n+5*?
6. Is there a word anywhere that only makes sense if you work here?

---

# Part II: The Design

## Format

A deck is **one self-contained HTML file**. Inline stylesheet, inline data-URI images, no build step, no imports. It opens in a browser, it prints to PDF, and it can be emailed as a single file.

```css
@page { size: 1280px 720px; margin: 0; }

.slide {
  position: relative;
  width: 1280px;
  height: 720px;              /* FIXED. and overflow:hidden. it clips silently */
  padding: 72px 88px 62px;
  background: var(--bg);
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  display: flex;
  flex-direction: column;
}
```

On screen the deck is a stack of scaled slides; in print the scale is 1 and the wrappers are inert, so `page.pdf()` gets exactly 1280×720 pages.

```html
<div class="deck">
  <div class="fit"><section class="slide ac-coral dense"> … </section></div>
  <div class="fit"><section class="slide ac-blue"> … </section></div>
</div>
```

```js
// Scale to fit the window. --s is 1 in print.
(function () {
  var fit = function () {
    var w = document.documentElement.clientWidth;
    var s = Math.min(1, (w - 36) / 1280);
    document.documentElement.style.setProperty('--s', s > 0.2 ? s : 0.2);
  };
  fit();
  window.addEventListener('resize', fit);
})();
```

```css
.deck { display: flex; flex-direction: column; align-items: center; gap: 22px; padding: 22px 0 40px; }
.fit  { width: calc(1280px * var(--s)); height: calc(720px * var(--s)); }
.fit > .slide { transform: scale(var(--s)); transform-origin: top left;
                box-shadow: 0 12px 40px rgba(0,0,0,.16); border-radius: 6px; }

@media print {
  :root { --s: 1; }
  body  { background: #fff; }
  .deck { display: block; gap: 0; padding: 0; }
  .fit  { width: auto; height: auto; }
  .fit > .slide { transform: none; box-shadow: none; border-radius: 0; }
}
```

## Tokens

```css
:root {
  --bg:        #fbfbfd;   /* Apple's off-white page */
  --surface:   #ffffff;
  --ink:       #1d1d1f;   /* near-black, not pure #000 */
  --soft:      #6e6e73;   /* secondary copy */
  --line:      #d9d9df;
  --line-soft: #ebebf0;
  --night:     #0a0a0c;   /* cover and close only */
  --mat:       #cfcfd4;   /* the surface the slides sit on */

  --coral:  #d9645b;  --coral-tint:  #fbeae8;
  --blue:   #2f6fed;  --blue-tint:   #e9f0fd;
  --green:  #3a8f5f;  --green-tint:  #e8f3ec;
  --amber:  #b8842a;  --amber-tint:  #f6efe1;
  --violet: #6b52c4;  --violet-tint: #efeafa;

  --accent: var(--coral);
  --tint:   var(--coral-tint);
  --s: 1;
}
```

**The slides keep their own light world in either theme.** Only the mat behind them follows the viewer:

```css
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --mat: #131316; } }
:root[data-theme="dark"] { --mat: #131316; }
```

A deck is a printed object. It does not have a dark mode.

## Accents

One class per slide sets both variables. Every component reads `--accent` and `--tint` and never names a colour directly.

```css
.ac-coral  { --accent: var(--coral);  --tint: var(--coral-tint); }
.ac-blue   { --accent: var(--blue);   --tint: var(--blue-tint); }
.ac-green  { --accent: var(--green);  --tint: var(--green-tint); }
.ac-amber  { --accent: var(--amber);  --tint: var(--amber-tint); }
.ac-violet { --accent: var(--violet); --tint: var(--violet-tint); }
```

**Colour is load-bearing, not decoration:**

- **coral** = free, the companion, and the deck's own voice
- **blue** = paid, the co-founder
- **amber** = the approval gate

One hairline of the accent runs along the top of every slide. That is the act marker, without a label:

```css
.slide::before {
  content: ""; position: absolute; top: 0; left: 0; right: 0;
  height: 4px; background: var(--accent);
}
```

**No two neighbouring slides share an accent.** Check the run before shipping. The cover and the problem slide are the one allowed exception, because they are one thought.

For card-level colour, `.c-*` sets a local pair:

```css
.c-blue { --c: var(--blue); --t: var(--blue-tint); }
```

## Type

```css
font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
```

| Element | Size | Weight | Tracking | Leading |
|---|---|---|---|---|
| `h1` | 70px | 600 | -0.028em | 1.02 |
| `h2` | 46px | 600 | -0.024em | 1.06 |
| `.lede` | 22px | 500 | | 1.42, max 48ch |
| `.kicker` | 15px | 600 | 0.02em | accent coloured |
| `.note` | 16.5px | 500 | | 1.45, max 92ch |
| `.src` | 13px | 500 | | `#a6a6ad` |
| `.num` / `.wm` | 15px | | | `#b4b4b9` |
| cover `.mark` | 118px | 600 | -.045em | 0.9 |

Every headline uses `text-wrap: balance`, so a two-line title breaks evenly instead of leaving one orphan word.

`.tone` colours the second half of a headline with the accent. That is the deck's one rhetorical device: a plain statement, then the turn.

```html
<h2>The market, <span class="tone">in three numbers.</span></h2>
```

Slide furniture:

```css
.num { position: absolute; bottom: 30px; right: 88px; font-variant-numeric: tabular-nums; }
.wm  { position: absolute; bottom: 30px; left: 88px; font-weight: 500; }
.slide.night .num, .slide.night .wm { color: #4a4a52; }
```

`.num` reads `n / 12`. The cover and close carry `.wm` instead: name, school, date, domain.

## The component library

78 classes. These are the ones that matter.

### Layout

| Class | What |
|---|---|
| `.body` | flex column, centred. `.body.top` aligns to the start |
| `.fork` | two cards side by side. `.fork.three` for three |
| `.two` | two `.bigbox` panels, equal weight, ten-second read |
| `.split` | 1.55fr / 1fr. An argument beside a panel |
| `.comp` | 1.72fr / 1fr. A table beside a 2x2 |

### Evidence

| Class | What | Number size |
|---|---|---|
| `.stats` | 3 bordered cards. `.stats.two` for a 2x2 | `b` 42px |
| `.strip` | naked figures on a hairline, no card. 4 up, `.three` for 3 | `b` 32px |
| `.band` | a tinted panel that stops the reader. `small` / `b` / `span` | `b` 31px |
| `.band.flat` | five figures in a row inside a band | `strong` 26px |
| `.funnel` | TAM / SAM / SOM, with the filters named between | `b` 36px |
| `.tract` / `.tract4` | traction, small, because it is early and says so | |

`.strip` versus `.stats` is a real decision. Cards say "these are exhibits". Naked figures on a rule say "this is just true". Use the strip when the numbers are evidence rather than claims.

### Argument

| Class | What |
|---|---|
| `.card` | radius 22, padding 26/30. `.tag` pill, `h3`, `p`, `ul` |
| `.bigbox` | radius 22, tinted, `i` label / `b` 31px / `span` |
| `.engines` / `.eng` | three job cards. `i` kicker, `b` title, `span` body, `u` footer, `em` status pill |
| `.chain` | three `.link` boxes with arrows between |
| `.steps` | three numbered boxes, for a sequence |
| `.flow` | four inline steps, last one `.on` and filled |
| `.icp` | the customer profile: `dl` left, numbered `ol` right |
| `.who` | three articles sharing one hairline grid |
| `.ticks` | outcome list with drawn checkmarks |

### Money

| Class | What |
|---|---|
| `.money` / `.mbox` | three price boxes. `i` who, `b` name, `.p` price, `ul` |
| `.tiersplit` | free and paid side by side inside one box, so nobody reads the free one as the whole offer |
| `.qgrid` / `.qcell` | quarter on quarter. `.on` highlights the current one |

### Competition

Two generations, both present:

- `.matrix`, a scored table. Names left, marks centred, price right. `.yes` / `.no` / `.part` / `.later`
- `.quad`, a 2x2 with CSS-drawn axes and `.dot` positions. `.dot.us` is bigger and coral
- `.vs` / `.vsrow` / `.vshead`, the newer three-column comparison, `1.1fr .62fr 1.1fr`

**The matrix was rebuilt once because it was forty-two cells.** Nobody reads forty-two cells. Five rows grouped by what a category *is*, each ending on the sentence that matters: what it still leaves the founder to do.

### Copy

| Class | What |
|---|---|
| `.bul` | bullets, not paragraphs. **The single most repeated note.** `.bul.sm` is smaller |
| `.bul li.ev` | the evidence bullet: accent coloured, ruled off, last |
| `.note` | one flat sentence under a component. `.note.wide` removes the width cap |
| `.closer` | italic closing line |
| `.sub` | a small heading between two components |
| `.src` | the sources line. Every slide with numbers has one |

### Quotes

| Class | What |
|---|---|
| `.pull` | one big quote in a tinted box |
| `.quotes` / `.quote` | stacked small quotes, attribution in the accent |
| `.heard` | 1.5fr / 1fr: the pull beside the list |
| `.panel` | the counts that answer the quotes beside them |

**A quote nobody can attribute is an opinion with quote marks around it.** The attribution gets the accent for that reason.

### Cover and close

```css
.cover { display: grid; grid-template-columns: 1.05fr 1fr; gap: 56px; align-items: center; height: 100%; }
.cover:not(.endcover) { grid-template-columns: 1fr; }
.markrow { display: flex; align-items: flex-end; gap: 26px; }   /* name + mascot */
.cover .mark { font-size: 118px; font-weight: 600; letter-spacing: -.045em; line-height: .9; }
.endcover { grid-template-columns: 1.35fr .65fr; }              /* mirrors the cover */
```

Both are `.slide.night`: `#0a0a0c`, ink `#f5f5f7`.

The mascot's caption is the **one place in the deck not set in the system face**. Caveat, 19px, rotated -4°: a margin note in a founder's hand. It earns the exception by admitting the obvious ("he is adorable, we know") rather than arguing anything.

`.live` is the status pill on the close: an accent-outlined capsule with a dot.

### Screenshots

**Drawn in markup, never pasted as images.** They stay sharp, they follow the slide accent, and a wrong label is a word to fix rather than a re-export.

```css
.shot { border: 1px solid var(--mat); border-radius: 14px; overflow: hidden; background: var(--surface); }
```

**No `box-shadow` on a shot.** Chromium prints a soft shadow as a flat grey rectangle. Desktop Chrome composites it away; Preview, iOS and Android draw an opaque slab across the slide. The border carries the frame instead and renders identically everywhere.

### Logos

```css
.lg { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px;
      border-radius: 999px; border: 1px solid var(--line-soft); background: var(--surface);
      font-size: 10px; font-weight: 600; color: var(--soft); white-space: nowrap; }
.lg svg { width: 11px; height: 11px; }
.lg.is-slot { border-style: dashed; }        /* a mark we could not generate */
```

Brand colour on the mark, grey on the name. Familiar at a glance without turning the slide into a rainbow.

Marks come from the `simple-icons` package. **LinkedIn and OpenAI were pulled from that set over trademark requests**; Apollo.io, ZoomInfo, Capterra and Google Business were never in it. Those six need real files dropped into `public/logos/`, then `npm run logos:v10` inlines any SVG there into the dashed placeholder chips.

**Watch out:** the package's "Apollo GraphQL" is a **different company** from Apollo.io the sales tool. Never substitute it.

## Density modifiers

Evidence slides carry the most. They get their own compression rather than shrinking every other slide to match.

| Modifier | Effect |
|---|---|
| `.dense` | `h2` 46 → 41px, all component top margins tightened |
| `.pack` | `padding-top` 72 → 54px, `h2` → 37px. For a full table plus a summary band |
| `.rows` | table cells to 15.5px |
| `.tightrows` | table cells to 14px. For the eight-founder roll |

Stack them: `class="slide ac-amber dense pack rows"`.

**Reach for a modifier before a font size.** They are designed as a set, so a slide using `.dense` still matches a slide that does not.

## The traps

### Components style their own `<b>` as a title

`.eng b`, `.card b`, `.bigbox b`, `.stat b` and friends all set `display: block` at display size. That is right for a title and wrong for emphasis inside a sentence. One guard, declared after all of them:

```css
.fstep span b, .bigbox span b, .qcell span b, .mbox span b, .eng span b,
.stat span b, .strip span b, .band span b, .note b, .card p b {
  display: inline; font-size: inherit; line-height: inherit;
  letter-spacing: inherit; margin: 0; color: var(--ink); font-weight: 600;
}
.bul li b { display: inline; font-size: inherit; line-height: inherit; margin: 0;
            color: var(--ink); font-weight: 600; }
```

**If you add a new component with a `b` title, add it to that list in the same commit.**

Two specific ones worth naming, because they swallow anything you nest:

- `.eng span { display: block; font-size: 15px }` turns a logo chip into a full-width 15px block and wraps the mark onto its own line
- `.bigbox b { display: block; font-size: 20px }` does the same to a `<b>` inside a tick

Both need explicit `display: inline` guards to beat.

### `.fork.three` cards are flexboxes

`.fork.three .card` is `display: flex; flex-direction: column`, so an inline-block `.tag` becomes a flex item and stretches the full card width, and stops looking like a pill.

```css
.fork.three .card .tag { align-self: flex-start; }
```

### `.card li` draws a hairline

Right for a plain list, doubled up when the list is a `.bul`, which already separates itself with dots.

```css
.card .bul li { border-top: 0; }
```

### Overriding `.bul` padding kills the bullet gutter

`.bul li` uses `padding-left` as the dot's gutter. Any override that writes `padding: 6px 0` puts the dot on top of the first letter.

```css
/* wrong */ .fork.three.tall .card li { padding: 6px 0; }
/* right */ .fork.three.tall .card li { padding: 6px 0 6px 15px; }
```

### Slides clip silently

`.slide` is `overflow: hidden` at a fixed 720px, and `.body` is a centred flex container. Overflowing content is cut top and bottom with no warning, and it looks like a design choice.

**Measure before shipping. Never trust the eye:**

```js
// scale to 1, then compare each slide's content against the usable box
const rows = await page.evaluate(() => [...document.querySelectorAll('.fit > .slide')].map((s, i) => {
  const cs = getComputedStyle(s);
  const avail = 720 - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  let used = 0;
  for (const c of s.children) {
    if (c.classList.contains('num') || c.classList.contains('wm')) continue;
    used = Math.max(used, c.scrollHeight);
  }
  return { n: i + 1, over: Math.round(used - avail) };
}));
```

Anything with `over > 0` is being clipped.

A related version of the same bug lives in the React deck: `.dk-slide` is `min-height: 100svh` and **grows**, so checking content against `el.clientHeight` always passes. Check against viewport minus slide padding.

### Grids declaring more columns than they hold

The cause of "make the stats bigger". A `repeat(3, 1fr)` holding two items bunches content left with dead space right, and it reads as small type rather than as a layout fault. Check the column count first.

## The pipeline

```bash
npm run pdf:v10        # files/braino-pitch-v10.html      -> public/braino-pitch-v10.pdf
npm run pdf:companion  # files/braino-companion-deck.html -> public/braino-companion-deck.pdf
npm run logos:v10      # inline any SVG in public/logos/ into the dashed chips
```

```js
// scripts/print-deck.mjs
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('file://' + path.resolve(src), { waitUntil: 'load' });
await p.waitForTimeout(1200);
// Drop the on-screen shadow first: Chromium prints it as a flat grey slab that
// every non-Chrome viewer draws opaquely.
await p.addStyleTag({ content: '.slide { box-shadow: none !important; border-radius: 0 !important; }' });
const n = await p.evaluate(() => document.querySelectorAll('.fit > .slide').length);
await p.pdf({ path: out, width: '1280px', height: '720px', printBackground: true, pageRanges: `1-${n}` });
```

A correct PDF is **12 pages at MediaBox `0 0 960 540`** (1280×720 CSS px at 96dpi is 960pt at 72dpi). Verify both before sending.

Text will not be greppable in the PDF: Chromium subsets the fonts, so plain-text probes fail even on a good file. That is not a bug. Check the MediaBox and page count instead.

### Serving it as a page

Copy the deck HTML to `public/<name>.html`. Vercel serves static files before the SPA rewrite, so it is reachable at `/<name>.html`. Add a download button that hides in print:

```css
@media print { .dl { display: none !important; } }
```

## Which deck is which

| File | What |
|---|---|
| `files/braino-pitch-v9.html` | The base. Untouched, and the fallback |
| `files/braino-pitch-v10.html` | **The Foundry deck.** 12 slides, built from v9 after a full revert. Served at `/pitch-deck.html` |
| `files/braino-pitch-v11.html` | 12 slides including "One more thing" and a video slide |
| `files/braino-companion-deck.html` | **The companion deck.** 11 slides. Same stylesheet, lifted whole |
| `src/pages/PitchDeck.tsx` | The React deck. **Rejected.** Kept, not routed |

**Never fork the stylesheet.** The companion deck lifts v10's `<style>` block byte for byte and puts everything of its own in a single block at the top of `<body>`. A fix to the base can then be re-lifted instead of merged by hand.

## Starting a new deck

1. Copy the v10 `<style>` block verbatim into a new file. Do not edit it.
2. Put every new rule in one `<style>` at the top of `<body>`, with a comment saying why.
3. Write the copy against Part I **first**. Headlines before markup.
4. Build slides with existing components. Reach for a density modifier before a font size.
5. Run the overflow check at scale 1.
6. Print, and verify 12 pages at 960×540.
7. Read every headline aloud. Anything that sounds written, rewrite plainer.
