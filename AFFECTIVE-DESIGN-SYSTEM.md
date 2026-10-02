# Affective Design System

The look of trybraino.com/affective, written down so any other website can be built to match it.

Source of truth in this repo: `src/pages/affective.css` (tokens, layout, components), `src/components/AffTheme.tsx` + `aff-theme.css` (light/dark switch), `src/pages/aff-figures.tsx` + `aff-figures.css` (figures drawn in code). If this file and the CSS ever disagree, the CSS wins. Update this file when it changes.

---

## 1. The feel in one paragraph

Warm paper, black ink, one serif. It reads like a well-printed magazine from a company that makes hardware: calm, confident, lots of air, nothing shouting. No gradients on the page itself, no drop-shadowed cards, no glow. Colour is rare and means something when it appears.

## 2. The five rules

1. **The grid has no gaps.** Cells share one hairline edge, running edge to edge. No gutters, no floating cards. A gap says "separate things". A shared edge says "one system".
2. **Hairline cell = text. Rounded frame = picture.** Text lives in square, joined cells. Anything visual (product panels, photos, hero) gets a rounded frame. Never mix the two.
3. **One serif, used for claims.** Headlines and statements are serif. Everything else is the system sans. Never introduce a third face.
4. **One accent, spent carefully.** Coral (`--a-braino`) marks the one sentence that matters in a section. Never in the first line of the page, never as a background block.
5. **No mid-page colour slabs.** The page stays light the whole way down. The only dark area is the footer, which is a photograph.

## 3. Tokens (copy this block)

Tokens are scoped to a wrapper class, not `:root`, so the host site's own styles cannot leak in. Put `class="aff"` on the page root.

```css
.aff {
  /* Ground and ink */
  --a-bg: #f4f2ec;          /* warm paper, the page */
  --a-surface: #faf9f5;     /* cells, strips, panels */
  --a-box: #fdfcf8;         /* inside a box, one shade off */
  --a-ink: #16150f;         /* text, primary buttons */
  --a-ink-soft: #625f54;    /* body copy */
  --a-ink-faint: #918d80;   /* labels, kickers, meta */

  /* The hairline: the only thing separating cells */
  --a-line: #dcd8cb;
  --a-line-strong: #c6c1b1; /* outer frames, ghost buttons */

  /* Shadow ink as RGB channels, so opacity stays tunable */
  --a-shade: 22, 21, 15;

  /* Product accents (use one per product, never together) */
  --a-braino: #d9645b;   /* coral: the company colour */
  --a-hera: #2f6fed;
  --a-photos: #6b52c4;
  --a-foundry: #b8842a;
  --a-browser: #3a8f5f;

  /* Type */
  --a-display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;

  /* Layout */
  --a-maxw: 1240px;
  --a-gutter: clamp(20px, 4vw, 48px);

  background: var(--a-bg);
  color: var(--a-ink);
  font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  min-height: 100vh;
}
.aff * { box-sizing: border-box; }
.aff-wrap { max-width: var(--a-maxw); margin: 0 auto; padding: 0 var(--a-gutter); }
```

### Dark ("Black")

Not an inversion. Same warmth, near-black with brown in it. Hairlines stay hairlines. Accents lift slightly so they read on dark.

```css
.aff[data-theme="dark"] {
  --a-bg: #100f0c;
  --a-surface: #17160f;
  --a-box: #1b1a13;
  --a-ink: #f6f3ea;
  --a-ink-soft: rgba(246, 243, 234, .72);
  --a-ink-faint: rgba(246, 243, 234, .48);
  --a-line: rgba(246, 243, 234, .13);
  --a-line-strong: rgba(246, 243, 234, .22);
  --a-shade: 0, 0, 0;
  --a-braino: #e8786e;
  --a-hera: #5b8ff5;
  --a-photos: #8f79e0;
  --a-foundry: #d3a350;
  --a-browser: #55ab79;
}
```

**How the switch works:** light by default, always. Dark only when the visitor presses the toggle (a sun that becomes a moon). The choice is saved in `localStorage` under `aff-theme` and written as `data-theme` on the `.aff` element, not on `<html>`. Wrap storage reads in try/catch; private windows throw.

## 4. Typography

| Role | Face | Size | Weight | Tracking | Line height |
|---|---|---|---|---|---|
| Hero headline (h1) | `--a-display` | `clamp(40px, 6.8vw, 86px)` | 400 | -0.028em | 1.02 |
| Section heading (h2) | `--a-display` | `clamp(31px, 4.4vw, 56px)` | 400 | -0.02em | 1.08 |
| Statement line | `--a-display` | `clamp(28px, 3.9vw, 52px)` | 400 | -0.022em | 1.1 |
| Cell heading (h3) | `--a-display` | `clamp(21px, 2.05vw, 27px)` | 400 | -0.018em | 1.14 |
| Product panel title | sans | `clamp(32px, 3.9vw, 54px)` | 600 | -0.04em | 0.98 |
| Standfirst / lead | sans | `clamp(17px, 1.6vw, 21px)` | 400 | -0.012em | 1.45–1.5 |
| Body | sans | 15–17.5px | 400 | -0.006em | 1.52–1.6 |
| Kicker / label | sans, UPPERCASE | 11px | 600 | +0.14em | — |
| Meta / spec | sans | 12.5px | 400–500 | tabular numbers | — |

Rules:
- Serif headings are always weight **400**. Never bold a serif.
- Always `text-wrap: balance` on headings, and cap them with `max-width` in `ch` (h1 ~26ch, h2 ~19ch).
- Body copy caps at 46–64ch.
- Emphasis inside a headline: `<em>` = same font, softer ink (`--a-ink-soft`), not italic. `<b>` = the payoff, underlined with an ink rule: `box-shadow: inset 0 -0.055em 0 0 var(--a-ink)`.
- The coloured payoff (in coral) is used in statements further down the page, as a second block line: `display:block; margin-top:.3em; color: var(--a-braino)`.

### The wordmark

A Didone, separate from the page serif. Load from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&display=swap" rel="stylesheet">
```

```css
.aff-logo {
  font-family: "Bodoni Moda", "Didot", "Bodoni 72", "Playfair Display", Georgia, serif;
  font-optical-sizing: auto;
  font-feature-settings: "liga" 1, "dlig" 1;
  font-weight: 500;
}
```

In practice the logo is the drawn image `public/affective-logo.png` (27px tall in the nav). In dark mode it is inverted: `filter: invert(1) sepia(.1) saturate(1.05)`. On the footer photo it is forced white: `filter: brightness(0) invert(1)`. On scroll the nav logo clips down to just its "A" (width transition, `.42s cubic-bezier(.4,0,.2,1)`).

## 5. Spacing and layout

- Page max width **1240px**, side gutter `clamp(20px, 4vw, 48px)`.
- Section padding: `clamp(72px, 8.4vw, 124px)` top, `clamp(62px, 7vw, 104px)` bottom.
- Sections are separated by a single `1px solid var(--a-line)` rule, never by a colour change.
- Section head = two columns: heading left (1.15fr), standfirst right (1fr), sharing the bottom baseline. Kicker spans both columns above. Stacks under 880px.
- Sticky nav is 62px; give every anchor `scroll-margin-top: 78px`.
- Breakpoints used: 1040, 980, 900, 880, 860, 820, 720, 620, 560px. Everything is single column by 620px.

## 6. Components

### Nav
Sticky, page-coloured background with `backdrop-filter: saturate(180%) blur(20px)`, hairline bottom border, 62px tall. Links are 12.5px, 500, `--a-ink-soft`, darken on hover. The one link that leaves the page is a pill: `1px solid --a-line-strong`, radius 999px, padding 6px 14px, fills with ink on hover. On phones, drop links but **never** the last one (the call to action).

### Buttons
```css
.aff-cta {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 20px; border-radius: 999px;
  background: var(--a-ink); color: var(--a-bg); border: 1px solid var(--a-ink);
  font-size: 14px; font-weight: 500; letter-spacing: -0.004em; text-decoration: none;
}
.aff-cta:hover { opacity: .86; }
.aff-cta-ghost { background: transparent; color: var(--a-ink); border-color: var(--a-line-strong); }
.aff-cta-ghost:hover { background: var(--a-surface); }
```
Always pills. Primary is solid ink, secondary is a ghost. No coloured buttons.

### The continuous grid (the signature)
```css
.aff-grid {
  display: grid; gap: 0;
  border-top: 1px solid var(--a-line);
  border-left: 1px solid var(--a-line);
  background: var(--a-surface);
}
.aff-grid > * {
  border-right: 1px solid var(--a-line);
  border-bottom: 1px solid var(--a-line);
  min-width: 0;
}
.aff-grid-2 { grid-template-columns: repeat(2, 1fr); }
.aff-grid-3 { grid-template-columns: repeat(3, 1fr); }
.aff-grid-4 { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 1040px) { .aff-grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 900px)  { .aff-grid-3 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 620px)  { .aff-grid-2, .aff-grid-3, .aff-grid-4 { grid-template-columns: 1fr; } }
```
Container draws top + left, each cell draws right + bottom. No edge is ever drawn twice.

### Cell
Padding `clamp(28px, 3.4vw, 46px)`, min-height `clamp(210px, 22vw, 280px)`, column flex with 12px gap. Contents, in order: a small number (11px, tabular, faint), a serif h3, a soft paragraph (15px), and one concrete fact pinned to the bottom (`margin-top: auto`, 12.5px, faint). Every cell ends up the same shape.

### Product panel (rounded = picture)
Two-column split, radius **22px**, hairline border, surface background. Left: tag (11px uppercase in the product's accent), big sans title, short paragraph, footer link with an arrow that slides 5px on hover. Right: a soft multi-radial gradient in the product's colour with a frosted glass card on top. Alternate sides on every second panel. Stacks with the words first on phones. Each panel sets `--acc` to its product colour.

Glass card:
```css
.aff-glass {
  width: min(100%, 420px); border-radius: 16px; padding: 16px 18px 18px;
  background: rgba(252, 251, 248, .82);
  border: 1px solid rgba(255, 255, 255, .55);
  box-shadow: 0 26px 50px -28px rgba(30, 18, 12, .65);
}
@supports (backdrop-filter: blur(1px)) {
  .aff-glass { background: rgba(252, 251, 248, .58); backdrop-filter: blur(20px) saturate(170%); }
}
```
Drawings, never fake screenshots.

### Strip
A full-width hairline band (top and bottom border, surface fill) under the hero. Uppercase faint labels at each end, names set in the serif in between, spaced evenly. Names, not logos.

### Kicker
```css
.aff-kicker { font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--a-ink-faint); }
```
Sits above every section heading. It is the question the section answers.

### Segmented switch
Square (no radius), `1px solid --a-line-strong` outer, hairline between buttons, 11.5px uppercase 600. Active button is solid ink with paper text.

### FAQ
Two columns: a sticky serif heading on the left, `<details>` list on the right. Each row is bordered by a hairline, summary 17–21px 600, hover turns coral. The plus is drawn with two 1.5px bars that rotate into a minus. No chevrons.

### Footer
The only dark area. A full-bleed photograph (`min-height: clamp(560px, 88vh, 900px)`) with a scrim that is heavy at the top where the words sit and fades to nothing by the bottom:
```css
background: linear-gradient(to bottom, rgba(10,11,8,.88) 0%, rgba(10,11,8,.8) 40%, rgba(10,11,8,.62) 66%, rgba(10,11,8,.3) 84%, rgba(10,11,8,0) 100%);
```
Text is warm white `rgba(246,243,234,.78)`, column headers 12px uppercase. Four columns, sized by content, two by 900px, one by 620px.

### Figures
Diagrams are drawn in code, not images: bordered box, paper ground, ink lines at 16% (`color-mix(in srgb, var(--a-ink) 16%, transparent)`), one blue (`#5b84c4`) for "us" or "the ask", a small caption centred underneath. See `aff-figures.tsx` for voice-to-action, capability matrix, request waterfall and data map.

## 7. Motion

- **Reveal on scroll:** `opacity 0 → 1`, `translateY(14px) → 0`, `.7s cubic-bezier(.22,1,.36,1)`, triggered once by IntersectionObserver (`rootMargin: 0px 0px -8% 0px`, threshold .06). If the observer is missing, show everything immediately.
- **Hero picture grows:** starts framed inside the measure, opens to full width as you scroll, driven by one `--grow` number from 0 to 1.
- **Swapping word:** a headline word that crossfades between options, the box resizing to the lit word (`.46s`).
- **Hover:** colour or border changes in `.2s ease`; arrows nudge 3–5px right.
- Every animation has a `prefers-reduced-motion: reduce` off switch. Non-negotiable.

Main easings: `cubic-bezier(.22, 1, .36, 1)` for things arriving, `cubic-bezier(.4, 0, .2, 1)` for things resizing.

## 8. Do and don't

| Do | Don't |
|---|---|
| Hairline cells sharing edges | Gaps, gutters, floating cards |
| Rounded frames only for pictures | Rounded text cards |
| Serif at weight 400 for claims | Bold serif, a third typeface |
| One coral moment per section | Coral backgrounds, coral in the first line |
| Warm paper the whole way down | Dark slabs in the middle of the page |
| Pill buttons in ink | Coloured or gradient buttons |
| Drawings of the product | Fake screenshots |
| Short copy, lots of air | Walls of text |
| Reduced-motion fallback | Content hidden until JS runs |

## 9. Porting to a new site (checklist)

1. Add the Bodoni Moda Google Fonts link (only needed for a typed wordmark).
2. Paste the light tokens and dark tokens from section 3.
3. Wrap the page in `<div class="aff" data-theme="light">`.
4. Copy the component CSS you need from `src/pages/affective.css` (class names are all `aff-*`, so they will not collide).
5. Build sections as: kicker → two-column head → grid or panels → hairline rule.
6. Add the scroll-reveal observer and a light/dark toggle that writes `data-theme` on `.aff`.
7. Check it at 375px wide: no horizontal scroll, the call to action still in the nav.
8. Check dark mode: logo inverted, footer photo dimmed (`brightness(.5) saturate(.85)`).
