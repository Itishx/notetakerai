# Braino Design System

> **Portable spec.** Hand this whole file to any AI agent, designer, or codebase and they can rebuild the Braino look exactly: the Apple typography, the token palette, the bento, and all three notches.
>
> **Source of truth in this repo:** `src/styles/apple.css` (page system), `src/components/iomi-notch.css` (web notch), `extension/content.js` line ~11380 (Chrome notch), `mac/braino-mac/renderer/braino-mac.css` line ~227 (Mac notch).
>
> **Live references:** `/product-overview`, `/braino`, `/` (home), `/code` (Braino Code).
>
> Everything below is verbatim from production. Do not "improve" the numbers. They are tuned.

---

## 00 — THE ONE RULE

**Light-first, token-driven, Apple-restrained.** Every colour is a CSS variable on a wrapper class, so dark mode is one override block and never a second stylesheet. Nothing is centred except the hero. Everything else is a left- or right-aligned copy + graphic row.

---

## 01 — FOUNDATIONS

### 1.1 Fonts

```css
/* The product face. Bundled locally, never a Google font. */
@font-face { font-family:'SF Pro Display'; src:url('/fonts/SF-Pro-Display-Medium.otf')    format('opentype'); font-weight:500; font-display:swap; }
@font-face { font-family:'SF Pro Display'; src:url('/fonts/SF-Pro-Display-Semibold.otf')  format('opentype'); font-weight:600; font-display:swap; }
@font-face { font-family:'SF Pro Display'; src:url('/fonts/SF-Pro-Display-Bold.otf')      format('opentype'); font-weight:700; font-display:swap; }
@font-face { font-family:'SF Pro Display'; src:url('/fonts/SF-Pro-Display-Heavy.otf')     format('opentype'); font-weight:800; font-display:swap; }
@font-face { font-family:'SF Pro Display'; src:url('/fonts/SF-Pro-Display-Black.otf')     format('opentype'); font-weight:900; font-display:swap; }

/* The stack, used everywhere */
font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
-webkit-font-smoothing: antialiased;
text-rendering: optimizeLegibility;
```

Character fonts (identity only, never body copy):
| Face | Where | Rule |
|---|---|---|
| `Yatra One` | class name "Saburi" | weight 400, letter-spacing 0, coral |
| `Orbitron` | class name "Telos" | weight 700, +0.04em, UPPERCASE, blue |
| SF Pro + gold gradient | class name "Iomi" | animated shimmer, see §1.6 |
| `NeueHaas` | Tailwind default `font-sans` | legacy / non-Apple pages |

### 1.2 Colour tokens (light)

```css
.apple {
  /* Neutrals: warm off-white, near-black ink. Never pure #fff or #000. */
  --ap-bg:        #fbfbfd;   /* page */
  --ap-surface:   #ffffff;   /* cards */
  --ap-ink:       #1d1d1f;   /* primary text */
  --ap-ink-soft:  #6e6e73;   /* secondary text */
  --ap-hairline:  #d2d2d7;   /* 1px borders + dividers */
  --ap-nav:       rgba(251,251,253,0.82); /* sticky bar, needs backdrop-blur */

  /* Accents, each with a soft panel tint. accent = keyword/graphic, panel = background. */
  --ap-coral:  #d9645b;  --ap-coral-panel:  #fbeae8;   /* Braino himself, warmth, character */
  --ap-green:  #3a8f5f;  --ap-green-panel:  #e8f3ec;   /* products, ecosystem */
  --ap-blue:   #2f6fed;  --ap-blue-panel:   #e9f0fd;   /* links, CTAs, capability */
  --ap-amber:  #b8842a;  --ap-amber-panel:  #f6efe1;   /* memory, warmth, history */
  --ap-violet: #6b52c4;  --ap-violet-panel: #efeafa;   /* intelligence, engines */
}
```

### 1.3 Colour tokens (dark) — one block, nothing else changes

```css
.apple.dark {
  --ap-bg: #0a0a0c;  --ap-surface: #161618;
  --ap-ink: #f5f5f7; --ap-ink-soft: #9a9aa2;
  --ap-hairline: #2a2a2e; --ap-nav: rgba(10,10,12,0.72);
  /* accents brighten, panels go near-black tinted */
  --ap-coral: #ec7b71;  --ap-coral-panel:  #241615;
  --ap-green: #58c48a;  --ap-green-panel:  #10241a;
  --ap-blue:  #5c8dff;  --ap-blue-panel:   #141d33;
  --ap-amber: #d8a94e;  --ap-amber-panel:  #241f12;
  --ap-violet:#9a83e6;  --ap-violet-panel: #1b1630;
}
```

### 1.4 Accent helpers — set the section's colour in one class

```css
.ac-coral  { --ap-accent: var(--ap-coral);  --ap-panel-bg: var(--ap-coral-panel); }
.ac-green  { --ap-accent: var(--ap-green);  --ap-panel-bg: var(--ap-green-panel); }
.ac-blue   { --ap-accent: var(--ap-blue);   --ap-panel-bg: var(--ap-blue-panel); }
.ac-amber  { --ap-accent: var(--ap-amber);  --ap-panel-bg: var(--ap-amber-panel); }
.ac-violet { --ap-accent: var(--ap-violet); --ap-panel-bg: var(--ap-violet-panel); }
```
Usage: `<section class="apple-editorial ac-violet">`. Every child reads `var(--ap-accent)`.

### 1.5 Geometry + rhythm

```css
--ap-radius:  28px;                      /* panels, cards, hero art */
--ap-maxw:    1024px;                    /* content column, never wider */
--ap-gutter:  clamp(20px, 5vw, 40px);
--ap-section: clamp(72px, 9vw, 132px);   /* vertical rhythm between sections */
/* Pills / buttons: border-radius 980px. Small chips: 999px. Icons tiles: 15px. Cards: 22px. */
```

### 1.6 Type scale (all fluid, all clamp)

| Token | size | weight | tracking | line-height |
|---|---|---|---|---|
| `.apple-display` (hero H1) | `clamp(42px, 8.4vw, 96px)` | **600** | `-0.022em` | 1.05 |
| `.apple-subhead` | `clamp(19px, 2.6vw, 28px)` | 600 | – | 1.28 |
| `.apple-eyebrow` (hero) | `clamp(19px, 2.4vw, 24px)` | 600 | – | – |
| section eyebrow (`.ed-eyebrow`, `.bento-eyebrow`) | 13px | 600 | `0.06em`–`0.08em`, UPPERCASE | – |
| section H2 (`.ed-h`, `.bento-h`) | `clamp(30px, 4-5vw, 52-56px)` | 600 | `-0.022em` | 1.06–1.08 |
| big statement | `clamp(26px, 4.2vw, 44px)` | 600 | `-0.02em` | 1.14 |
| body / description | `clamp(16-17px, 1.9vw, 20px)` | 500 | – | 1.5 |
| card title `h3` | `clamp(20px, 2.2vw, 26px)` | 600 | `-0.015em` | 1.12 |
| card body | 15px | 500 | – | 1.5 |
| nav link / CTA | 13px | 500 | – | – |

**Weight law:** headlines are **600, never 700+**. Body copy is **500, never 400**. That single pairing is most of the Apple feel.
**Wrap law:** every headline gets `text-wrap: balance`. Copy blocks cap at `max-width: 46ch` (editorial) / `62ch` (centred) / `30ch` (on-panel).
**Two-tone law:** one word in a headline gets `<span class="tone">`, which paints `var(--ap-accent)`. One word. Never two.

Shimmer, for the "Iomi" identity treatment:
```css
.cls-iomi{background:linear-gradient(100deg,#a9791f 0%,#e8bf5a 22%,#fff4cf 42%,#e8bf5a 62%,#a9791f 100%);
  background-size:220% 100%;-webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;animation:iomiShimmer 3.4s linear infinite}
@keyframes iomiShimmer{to{background-position:-220% 0}}
```

### 1.7 Motion

```css
/* The three easings. There are no others. */
--ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1);      /* stomps, releases, punchy entries */
--ease-out-soft:   cubic-bezier(0.22, 1, 0.36, 1);     /* card hovers, reveals, lifts */
--ease-island:     cubic-bezier(0.32, 0.72, 0, 1);     /* ALL notch morphing, Apple's own */
```
Durations: hover `0.2s`, card lift `0.28–0.3s`, scroll reveal `0.7s`, notch morph `0.55s` (web/Mac) or `1050ms` (Chrome cinematic).

Scroll reveal, used on every section:
```css
@media (prefers-reduced-motion: no-preference){
  .apple-reveal{opacity:0;transform:translateY(24px);
    transition:opacity .7s ease, transform .7s cubic-bezier(0.22,1,0.36,1)}
  .apple-reveal.in{opacity:1;transform:none}
}
```

Word-by-word "Don't Blink" stomp, for one hero line per page maximum:
```css
.apple-wordreveal .wr-word{display:inline-block;opacity:0;transform-origin:center bottom}
.apple-wordreveal.go .wr-word{animation:wrStomp .34s cubic-bezier(0.16,1,0.3,1) both}
@keyframes wrStomp{
  0%  {opacity:0;transform:scale(1.38);filter:blur(2px)}
  55% {opacity:1;filter:blur(0)}
  100%{opacity:1;transform:scale(1);filter:blur(0)}}
```
Stagger delay per word: ~55ms. Every animation block ships a `@media (prefers-reduced-motion: reduce)` escape.

---

## 02 — LAYOUT PRIMITIVES

### 2.1 Sticky nav

```css
.apple-nav{position:sticky;top:0;z-index:100;background:var(--ap-nav);
  backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);
  border-bottom:1px solid var(--ap-hairline)}
.apple-nav-inner{max-width:var(--ap-maxw);margin:0 auto;padding:0 var(--ap-gutter);
  height:52px;display:flex;align-items:center;gap:28px}

/* Anchor bar: the CURRENT page's own sections, sits under the nav. 48px tall. */
.apple-anchors{position:sticky;top:0;z-index:100;background:var(--ap-nav);
  backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--ap-hairline)}
.apple-anchors-inner{max-width:var(--ap-maxw);margin:0 auto;padding:0 var(--ap-gutter);
  height:48px;display:flex;align-items:center;gap:24px}
.apple-anchors .an-name{font-size:19px;font-weight:600;letter-spacing:-0.01em}
.apple-nav-name{font-size:21px;font-weight:600;letter-spacing:-0.01em}
.apple-nav-links{margin-left:auto;display:flex;align-items:center;gap:28px}
.apple-nav-links a{font-size:13px;font-weight:500;color:var(--ap-ink);opacity:.86;transition:opacity .2s ease}
.apple-nav-links a:hover{opacity:1}
.apple-cta{font-size:13px;font-weight:500;background:var(--ap-blue);color:#fff;
  padding:6px 15px;border-radius:980px;transition:filter .2s ease}
.apple-cta:hover{filter:brightness(1.08)}
@media(max-width:720px){.apple-nav-links a:not(.apple-cta){display:none}}
```
Nav bar is **52px**, anchor bar is **48px**. The 48px is load-bearing: the notch docks at `top: 48px`, directly under the anchor bar, never beneath it.

### 2.2 Hero (the only centred block)

```css
.apple-hero{text-align:center;padding:clamp(56px,9vw,110px) var(--ap-gutter) clamp(28px,5vw,56px)}
.apple-hero-links a{font-size:17px;color:var(--ap-blue);display:inline-flex;align-items:center;gap:5px}
.apple-hero-links a::after{content:"›";font-size:19px;line-height:1}   /* the Apple chevron, always */
```

### 2.3 Editorial row (the workhorse; ~70% of every page)

```css
.apple-editorial{max-width:var(--ap-maxw);margin:0 auto;
  padding:clamp(48px,8vw,110px) var(--ap-gutter);
  display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,72px);align-items:center}
.apple-editorial.reverse .ed-copy{order:2}      /* flips copy to the right */
.apple-editorial .ed-art{border-radius:var(--ap-radius);overflow:hidden;
  background:var(--ap-panel-bg);min-height:clamp(300px,40vw,460px);
  display:grid;place-items:center;padding:clamp(24px,3vw,44px)}
.apple-editorial .ed-art.bare{background:transparent;padding:0}
@media(max-width:760px){.apple-editorial{grid-template-columns:1fr}
  .apple-editorial.reverse .ed-copy{order:0}}
```
Structure: `eyebrow → h2 (with one .tone word) → p (max 46ch) → .ed-more link` on one side, tinted art panel on the other. Alternate `.reverse` down the page.

### 2.4 Full-bleed colour panel

```css
.apple-panel{position:relative;border-radius:var(--ap-radius);background:var(--ap-panel-bg);
  overflow:hidden;min-height:clamp(420px,60vh,640px);display:grid;padding:clamp(32px,5vw,64px)}
.apple-panel.text-tr{align-items:end;justify-items:end}
.apple-panel.text-tl{align-items:start;justify-items:start}
.apple-panel.center {align-items:center;justify-items:center;text-align:center}
.apple-copy{max-width:30ch;z-index:2}
.apple-copy p{font-size:clamp(20px,2.4vw,28px);line-height:1.32;font-weight:600}
.apple-copy .lead{color:var(--ap-accent)}   /* the bold-lead sentence opener */
.apple-art{position:absolute;inset:0;display:grid;place-items:center;z-index:1}
.apple-art svg,.apple-art img{max-width:78%;max-height:78%}
.apple-duo{display:grid;grid-template-columns:1fr 1fr;gap:clamp(12px,1.5vw,20px)}
```

### 2.5 Spec row (three across, icon + coloured keyword)

```css
.apple-specs{max-width:var(--ap-maxw);margin:clamp(40px,6vw,80px) auto;
  padding:clamp(32px,5vw,56px) var(--ap-gutter);border-top:1px solid var(--ap-hairline);
  display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(24px,4vw,48px)}
.apple-spec svg{width:40px;height:40px;color:var(--ap-accent)}
.apple-spec p{font-size:clamp(18px,2vw,21px);font-weight:600;line-height:1.3}
.apple-spec .k{color:var(--ap-accent)}
```

### 2.6 Founder quote + centred statement

```css
.apple-quote blockquote{font-size:clamp(26px,3.6vw,42px);font-weight:600;
  letter-spacing:-0.02em;line-height:1.28;text-wrap:balance}
.apple-quote cite{display:block;margin-top:22px;font-style:normal;
  font-size:15px;font-weight:500;color:var(--ap-ink-soft)}
.apple-statement{max-width:800px;margin:clamp(40px,7vw,90px) auto;text-align:center;
  font-size:clamp(26px,4.2vw,44px);font-weight:600;letter-spacing:-0.02em;line-height:1.14}
```

---

## 03 — THE BENTO

Braino's bento is **not** a static masonry grid. It is a horizontally snapping card carousel with a centred header and arrow controls: one wide "lead" tile carrying a stat overlay, then equal-width tiles.

```css
/* Block = centred header + carousel + arrows */
.apple-bentoblock{padding:clamp(20px,3vw,40px) 0}
.bento-head{max-width:var(--ap-maxw);margin:0 auto;text-align:center;
  padding:clamp(40px,6vw,84px) var(--ap-gutter) clamp(8px,2vw,20px)}
.bento-eyebrow{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ap-accent);margin:0 0 16px}
.bento-h{font-size:clamp(30px,5vw,56px);font-weight:600;letter-spacing:-.022em;line-height:1.06;max-width:20ch;margin:0 auto 16px;text-wrap:balance}
.bento-h .tone{color:var(--ap-accent)}
.bento-desc{font-size:clamp(16px,1.9vw,20px);line-height:1.5;color:var(--ap-ink-soft);font-weight:500;max-width:62ch;margin:0 auto}

/* The track: snap, no visible scrollbar */
.apple-bento{max-width:var(--ap-maxw);margin:0 auto;
  padding:clamp(8px,2vw,20px) var(--ap-gutter) clamp(40px,6vw,80px)}
.apple-bento-track{display:flex;gap:clamp(12px,1.6vw,18px);overflow-x:auto;
  scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding-bottom:4px}
.apple-bento-track::-webkit-scrollbar{display:none}

/* Standard tile: copy pinned to the BOTTOM, tag pinned to the top-left */
.bn-card{flex:0 0 auto;scroll-snap-align:start;position:relative;overflow:hidden;
  border-radius:var(--ap-radius);background:var(--ap-panel-bg);
  width:clamp(260px,30vw,360px);min-height:clamp(360px,48vh,460px);
  display:flex;flex-direction:column;justify-content:flex-end;
  padding:clamp(22px,2.4vw,30px);color:var(--ap-ink)}
.bn-tag{position:absolute;top:clamp(20px,2.4vw,28px);left:clamp(22px,2.4vw,30px);
  font-size:12px;font-weight:600;letter-spacing:.02em;color:var(--ap-accent)}
.bn-num{font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--ap-accent);margin-bottom:8px}
.bn-body h3{margin:0 0 8px;font-size:clamp(20px,2.2vw,26px);font-weight:600;letter-spacing:-.015em;line-height:1.12}
.bn-body p{margin:0;font-size:clamp(14px,1.6vw,16px);line-height:1.45;color:var(--ap-ink-soft);font-weight:500}

/* Lead tile: ~2x wide, dark accent gradient, white copy */
.bn-card.lead{width:clamp(320px,52vw,640px);color:#fff;
  background:linear-gradient(160deg,
    color-mix(in srgb, var(--ap-accent) 20%, var(--ap-surface)),
    color-mix(in srgb, var(--ap-accent) 46%, #000))}
.bn-card.lead .bn-body p{color:rgba(255,255,255,.82)}
.bn-card.lead .bn-tag{color:rgba(255,255,255,.85)}

/* Glass stat overlay, lead tile only */
.bn-stat{position:absolute;top:clamp(20px,2.4vw,28px);right:clamp(22px,2.4vw,30px);
  background:rgba(255,255,255,.14);backdrop-filter:blur(8px);
  border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:12px 16px;text-align:center;color:#fff}
.bn-stat b{display:block;font-size:30px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.bn-stat span{font-size:11px;opacity:.8}

/* Arrows: 44px circles, hairline border, accent on hover */
.bento-arrows{display:flex;justify-content:center;gap:12px;padding:clamp(20px,3vw,34px) 0 clamp(8px,2vw,16px)}
.bento-arrows button{width:44px;height:44px;border-radius:50%;border:1px solid var(--ap-hairline);
  background:var(--ap-surface);color:var(--ap-ink);display:grid;place-items:center;cursor:pointer;
  transition:background .2s ease,border-color .2s ease}
.bento-arrows button:hover{border-color:var(--ap-accent)}
.bento-arrows svg{width:18px;height:18px}
```
**Bento law:** lead tile first, always dark, always the one with the number. Tiles never centre their copy. The gap is small (12–18px) so the bento reads as one object, not five cards.

---

## 04 — CARDS

```css
/* Feature card: white surface, hairline, lifts on hover */
.cap-card{border:1px solid var(--ap-hairline);border-radius:var(--ap-radius);
  background:var(--ap-surface);padding:clamp(24px,3vw,36px);
  transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s ease}
.cap-card:hover{transform:translateY(-6px);box-shadow:0 22px 44px rgba(29,29,31,.1)}
.cap-icon{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;
  background:var(--ap-panel-bg);color:var(--ap-accent);margin-bottom:18px}
.cap-icon svg{width:26px;height:26px}

/* Pricing card */
.pr-card{border:1px solid var(--ap-hairline);border-radius:var(--ap-radius);
  background:var(--ap-surface);padding:clamp(28px,3.4vw,40px);display:flex;flex-direction:column}
.pr-card.featured{border-color:var(--ap-accent);
  box-shadow:0 20px 50px color-mix(in srgb, var(--ap-accent) 14%, transparent)}
.pr-price{font-size:clamp(32px,4.4vw,46px);font-weight:600;letter-spacing:-.02em}
.pr-list li::before{content:"\2713";position:absolute;left:0;color:var(--ap-accent);font-weight:700}
.pr-cta.primary{background:var(--ap-accent);color:#fff;border-radius:14px;padding:12px}
.pr-cta.ghost{border:1px solid var(--ap-hairline);color:var(--ap-ink)}

/* "Little screen" card: a white cover with a mini notch biting the top edge */
.hw-card{border:1px solid var(--ap-hairline);border-radius:22px;background:var(--ap-surface);overflow:hidden}
.hw-notch{position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:3;
  width:clamp(100px,16vw,144px);height:clamp(18px,2.4vw,24px);
  background:#000;border-radius:0 0 13px 13px;
  display:flex;align-items:center;justify-content:center;gap:8px}
.hw-notch i{width:6px;height:6px;border-radius:50%;background:#f4e4dc}   /* his eyes */
```

**Card law:** border-radius 22px for content cards, 28px (`--ap-radius`) for panels and bento tiles. Hover lift is always `translateY(-6px)` + `0 22px 44px rgba(29,29,31,.1)`.

---

## 05 — PINNED HORIZONTAL GALLERY

Vertical scroll gets translated into horizontal card travel while a tall section pins.

```css
.apple-hscroll{position:relative}                 /* give it height: 300vh etc. */
.apple-hscroll-pin{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}
.apple-hscroll-viewport{flex:1;display:flex;align-items:center;overflow:hidden}
.apple-hscroll-track{display:flex;gap:clamp(16px,2vw,28px);padding:0 var(--ap-gutter);will-change:transform}
.apple-hcard{flex:0 0 auto;width:clamp(300px,40vw,540px);height:clamp(400px,62vh,640px);
  border-radius:var(--ap-radius);overflow:hidden;position:relative;
  display:grid;align-items:end;padding:clamp(26px,3vw,44px);background:var(--ap-panel-bg)}

/* Mobile / reduced-motion: degrade to a plain swipeable snap row. Mandatory. */
@media (max-width:760px),(prefers-reduced-motion:reduce){
  .apple-hscroll{height:auto!important}
  .apple-hscroll-pin{position:static;height:auto}
  .apple-hscroll-viewport{overflow-x:auto;scroll-snap-type:x mandatory}
  .apple-hscroll-track{transform:none!important}
  .apple-hcard{scroll-snap-align:center}}
```
JS: `translateX = -(scrolled / scrollable) * (trackWidth - viewportWidth)`, applied in a `requestAnimationFrame`.

---

## 06 — NOTCH 01: THE WEB NAV NOTCH (`.iomi-notch`)

Braino's site navigation is a black island hanging from the top edge of the page. Closed it shows two blinking eyes. Opened it becomes a two-column page directory with drill-down.

### 6.1 Geometry + morph

```css
.iomi-notch-dock{
  --iomi-ink:#f5f5f7; --iomi-ink-2:#a1a1a6; --iomi-ink-3:#6e6e73;
  --iomi-line:rgba(255,255,255,.11);
  position:fixed;top:0;left:0;right:0;z-index:90;
  display:flex;justify-content:center;pointer-events:none;   /* dock is inert, island is not */
  font-family:"SF Pro Display",-apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif}

.iomi-notch{pointer-events:auto;background:#000;border-radius:0 0 22px 22px;overflow:hidden;
  box-shadow:0 0 0 1px rgba(255,255,255,.07), 0 20px 50px -20px rgba(0,0,0,.9);
  width:210px;height:34px;
  transition:width .55s cubic-bezier(.32,.72,0,1),
             height .55s cubic-bezier(.32,.72,0,1),
             border-radius .55s cubic-bezier(.32,.72,0,1)}

/* States */
.iomi-notch.open              {width:min(660px,calc(100vw - 32px));height:350px;border-radius:0 0 30px 30px}
.iomi-notch.has-tabs          {width:108px}                                   /* rest: eyes + arrow only */
.iomi-notch.has-tabs.tabs-open{width:min(566px,calc(100vw - 24px))}           /* arrow pressed: tabs slide out */
```

### 6.2 The eyes

```css
.iomi-notch-bar{cursor:pointer;user-select:none;height:34px;
  display:flex;align-items:center;justify-content:center;gap:9px;
  color:var(--iomi-ink-2);font-size:12px;letter-spacing:.01em}
.iomi-notch-eyes{display:flex;gap:5px}
.iomi-notch-eye{width:7px;height:7px;border-radius:50%;background:#f5f5f7;animation:iomiBlink 5.2s infinite}
.iomi-notch-eye:nth-child(2){animation-delay:.08s}    /* the eyes blink 80ms apart, never in sync */
@keyframes iomiBlink{0%,92%,100%{transform:scaleY(1)} 95%{transform:scaleY(.1)}}
.iomi-notch.open .iomi-notch-eye{animation:none}      /* he stops blinking while you read */
```

### 6.3 The open panel

```css
.iomi-notch-panel{opacity:0;transform:translateY(-6px);height:calc(100% - 34px);
  transition:opacity .3s ease .12s, transform .3s ease .12s}  /* 120ms behind the shape: form leads, content follows */
.iomi-notch.open .iomi-notch-panel{opacity:1;transform:none}
.iomi-notch-view{position:absolute;inset:0;padding:4px 24px 24px;overflow:hidden}
.iomi-notch-label{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--iomi-ink-3);padding:6px 0 12px}
.iomi-notch-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 26px}
.iomi-notch-item{border-bottom:1px solid var(--iomi-line)}
.iomi-notch-link{display:flex;align-items:center;padding:11px 0;
  color:var(--iomi-ink);font-size:16px;font-weight:500;
  transition:color .15s ease,padding-left .15s ease}
.iomi-notch-link:hover{color:#fff;padding-left:5px}   /* the row nudges right, no background change */
.iomi-notch-note{color:var(--iomi-ink-3);font-size:11.5px;font-weight:400;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Drill-down: parent block left, children right */
.iomi-notch-parent-view{display:grid;grid-template-columns:minmax(0,.88fr) minmax(0,1.12fr);gap:30px;padding-top:14px}
.iomi-notch-parent{border-right:1px solid var(--iomi-line);padding-right:28px;display:flex;flex-direction:column}
.iomi-notch-parent h2{font-size:34px;font-weight:600;line-height:1.05}
.iomi-notch-parent p{margin:10px 0 0;color:var(--iomi-ink-3);font-size:14px;line-height:1.4}
.iomi-notch-back{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.055)}
```

### 6.4 Tabs behind the arrow

```css
.iomi-notch.has-tabs .iomi-notch-bar{justify-content:flex-start;gap:8px;padding:0 6px 0 12px} /* grows from the LEFT corner */
.iomi-notch-arrow{margin-left:auto;width:24px;height:24px;border-radius:50%;
  background:rgba(255,255,255,.09);color:var(--iomi-ink-2);
  transition:background .18s ease,color .18s ease,transform .42s cubic-bezier(.32,.72,0,1)}
.iomi-notch.tabs-open .iomi-notch-arrow{transform:rotate(180deg)}
.iomi-notch-tabs{display:inline-flex;align-items:center;gap:2px;max-width:0;overflow:hidden;opacity:0;
  transition:max-width .5s cubic-bezier(.32,.72,0,1),opacity .2s ease}
.iomi-notch.tabs-open .iomi-notch-tabs{max-width:470px;opacity:1;
  transition:max-width .55s cubic-bezier(.32,.72,0,1),opacity .28s ease .16s}
.iomi-notch-tab{padding:0 10px;height:22px;border-radius:999px;color:var(--iomi-ink-2);
  font-size:11.5px;font-weight:600;line-height:1;white-space:nowrap}
.iomi-notch-tab:hover{color:var(--iomi-ink);background:rgba(255,255,255,.09)}
.iomi-notch-tab.on{color:#000;background:var(--iomi-ink)}   /* active tab inverts */
```

### 6.5 Ambient states (the notch is alive)

```css
/* Asleep: soft drifting z's, sitting in the dock because the island clips overflow */
.iomi-snore{position:absolute;top:7px;left:50%;margin-left:116px;display:flex;align-items:flex-end;gap:3px}
.iomi-snore i{font-style:normal;font-weight:600;color:rgba(245,245,247,.55);opacity:0;transform:translateY(6px)}
.iomi-snore i:nth-child(1){font-size:11px;animation:iomiSnore 3.2s ease-in-out infinite}
.iomi-snore i:nth-child(2){font-size:14px;animation:iomiSnore 3.2s ease-in-out .5s infinite}
.iomi-snore i:nth-child(3){font-size:18px;animation:iomiSnore 3.2s ease-in-out 1s infinite}
@keyframes iomiSnore{0%{opacity:0;transform:translateY(6px) rotate(-4deg)}30%{opacity:.65}
  100%{opacity:0;transform:translateY(-16px) rotate(6deg)}}

/* Now playing: a 4-bar coral equalizer */
.iomi-music{position:absolute;top:10px;left:50%;margin-left:112px;display:flex;align-items:flex-end;gap:3px;height:16px}
.iomi-music i{width:3px;border-radius:2px;background:#E8786E;height:5px}
.iomi-music i:nth-child(1){animation:iomiEq .6s ease-in-out infinite}
.iomi-music i:nth-child(2){animation:iomiEq .6s ease-in-out .18s infinite}
.iomi-music i:nth-child(3){animation:iomiEq .6s ease-in-out .36s infinite}
.iomi-music i:nth-child(4){animation:iomiEq .6s ease-in-out .09s infinite}
@keyframes iomiEq{0%,100%{height:4px}50%{height:15px}}

/* Watching a teaser: a monospace ticker */
.iomi-watching{font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.04em;color:rgba(245,239,231,.8)}
```

### 6.6 Docking rule

```css
.apple .iomi-notch-dock{top:48px;z-index:80}   /* below the 48px header, never under it */
.iomi-notch-dock.booting{z-index:3001!important}
@media(max-width:620px){
  .iomi-notch.open{height:min(560px,calc(100dvh - 12px))}
  .iomi-notch-grid{grid-template-columns:1fr}
  .iomi-notch-view{overflow-y:auto}}
```

---

## 07 — NOTCH 02: THE CHROME EXTENSION NOTCH

Lives in a **shadow DOM** so no host page can touch it. Coral gradient, not black, because on someone else's website it has to read as *Braino* rather than as browser chrome. One element, `data-state` drives everything.

### 7.1 Mounting (mandatory, this is what makes it bulletproof)

```js
const host = document.createElement("div");
host.id = "__sb_notch_v1_host__";
host.style.cssText = "all:initial;position:fixed;z-index:2147483647;top:0;left:50%;" +
                     "transform:translateX(-50%);pointer-events:none";
const shadow = host.attachShadow({ mode: "open" });
// inside the shadow root:  :host{all:initial}
```

### 7.2 The shell

```css
@property --a{syntax:"<angle>";inherits:false;initial-value:0deg}   /* animatable conic angle */

.n{position:relative;box-sizing:border-box;width:230px;height:72px;overflow:hidden;
  border:1px solid rgba(255,255,255,.46);border-top:0;border-radius:0 0 27px 27px;
  background:linear-gradient(180deg,#f6a8a2 0%,#e8786e 56%,#c9544a 100%);   /* THE Braino coral ramp */
  box-shadow:0 15px 40px rgba(201,84,74,.28), inset 0 1px rgba(255,255,255,.42);
  color:#1b1713;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  pointer-events:auto;cursor:pointer;interpolate-size:allow-keywords;
  will-change:width,height,border-radius;
  transition:width 1050ms cubic-bezier(.22,1,.36,1),
             height 1050ms cubic-bezier(.22,1,.36,1),
             border-radius 950ms cubic-bezier(.22,1,.36,1),
             background 700ms ease, border-color 700ms ease,
             box-shadow 850ms ease, backdrop-filter 700ms ease,
             opacity .42s ease, transform .7s cubic-bezier(.22,1,.36,1)}
```

### 7.3 The state table (this IS the component)

| `data-state` | width | height | radius | surface | face |
|---|---|---|---|---|---|
| `off` | – | – | – | `opacity:0; transform:translateY(-18px) scale(.94)` | hidden |
| `idle` | 230 | 72 | 27 | coral ramp | eyes gaze on a 5.6s loop, hover swells to 240×76 |
| `listening` | 230 | 72 | 27 | coral + `overflow:visible` | two sonar rings, 2.35s, 1.15s apart |
| `working` | **440** | **88** | 28 | coral | eyes + smile squash `scaleX(.64)`, work pill right |
| `speaking` | 230 | **82** | 29 | coral | smile hides, mouth talks `.42s` alternate |
| `input` | `min(570px,78vw)` | 104 | 31 | frosted `rgba(255,251,247,.72)` + `blur(24px) saturate(175%)` | – |
| `menu` | `min(570px,78vw)` | **404** | 34 | frosted `.78` | – |
| `thinking` | `min(650px,82vw)` | 260 | 36 | coral→cream gradient, blur 24 sat 140 | lids shut, shimmer sweep |
| `short` | `min(610px,76vw)` | `min(var(--sb-answer-short-height,120px),320px)` | 34 | same | – |
| `long` | `min(650px,82vw)` | `min(var(--sb-answer-long-height,164px),100vh-110px)` | 38 | same | – |

```css
/* Sonar */
.n[data-state=listening]::before,.n[data-state=listening]::after{content:"";position:absolute;z-index:-1;inset:2px;
  border:1.5px solid rgba(232,120,110,.58);border-radius:inherit;
  animation:sonar 2.35s cubic-bezier(.2,.65,.3,1) infinite}
.n[data-state=listening]::after{animation-delay:1.15s}

/* Frosted answer surface */
.n[data-state=thinking],.n[data-state=short],.n[data-state=long]{
  border:1px solid rgba(255,255,255,.7);border-top:0;
  background:linear-gradient(180deg,rgba(246,168,162,.9) 0,rgba(255,251,247,.94) 74px,rgba(255,251,247,.92) 100%);
  box-shadow:0 28px 90px rgba(27,23,19,.18), inset 0 1px rgba(255,255,255,.78);
  backdrop-filter:blur(24px) saturate(140%)}

/* Work pill */
.workpill{position:absolute;z-index:6;right:15px;top:31px;padding:7px 10px;border-radius:999px;
  background:rgba(138,47,40,.22);backdrop-filter:blur(5px);opacity:0;transition:opacity 420ms ease}
.n[data-state=working] .workpill{opacity:1}
.workpill strong{display:block;min-width:78px;max-width:200px;color:#fff;
  font-size:10px;font-weight:750;line-height:13px;text-align:center;
  text-shadow:0 1px 3px rgba(110,33,26,.22);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
```

### 7.4 The face SVG (viewBox `0 0 230 72`)

```css
.face svg{display:block;width:100%;height:100%;overflow:visible}
.fold{fill:none;stroke:#8a2f28;stroke-width:1.8;stroke-linecap:round;opacity:.58;vector-effect:non-scaling-stroke}
.eyeball{fill:#fff}
.pupil circle:first-child{fill:#1b1713}   /* iris */
.pupil circle:last-child{fill:#fff}       /* highlight */
.lids{opacity:0}.lids path{fill:none;stroke:#7e2a24;stroke-width:2.6;stroke-linecap:round}
.smile{fill:none;stroke:#1b1713;stroke-width:2.7;stroke-linecap:round}
.mouth{opacity:0;transform-box:fill-box;transform-origin:center}
.mouth ellipse:first-child{fill:#6e211a}  /* mouth cavity */
.mouth ellipse:last-child{fill:#f08b82}   /* tongue */
```
Coordinates (same face used in the non-shadow fallback, viewBox `0 0 230 72`):
```
folds  M115 0 Q111 14 115 27 Q119 40 115 56  (+ 4 mirrored side folds at x≈25/61/169/205)
eyes   circle cx=103 cy=29 r=10  ·  cx=127 cy=29 r=10
pupils circle cx=104 cy=30 r=4.8 ·  cx=128 cy=30 r=4.8
lids   M93 29 Q103 36 113 29  ·  M117 29 Q127 36 137 29
smile  M108 47 Q115 54 122 47
mouth  ellipse cx=115 cy=49 rx=7 ry=5.5  +  cx=115 cy=51 rx=4.2 ry=2.2
```

**Hold-state guard:** `short`, `long`, `input`, `menu`, and the sign-in states must never be auto-stomped by an ambient state change. Idle/listening/working/speaking may be.

---

## 08 — NOTCH 03: THE MAC NOTCH

The hardest one: it sits over the **physical MacBook notch**. The top `--nf-notch-h` of the pill hides behind real aluminium, so only the chin below is visible. Therefore it is **always black**. Coral belongs to Braino, never to the shell.

```css
#notch-face{
  --nf-notch-h:33px;                                   /* the hidden strip */
  --nf-safe-top:max(var(--nf-notch-h),32px);
  --nf-content-top:calc(var(--nf-safe-top) + 20px);
  --nf-compact-surface-w:min(480px,calc(100vw - 32px));
  --nf-reading-surface-w:min(580px,calc(100vw - 32px));
  --nf-left-reach:95px; --nf-right-reach:95px;         /* caption wings */
  position:fixed;top:0;left:50%;transform:translateX(-50%);
  pointer-events:none;z-index:57;opacity:0;transition:opacity .5s ease}
#notch-face.on{opacity:1}

#notch-face .nf-pill{
  position:relative;margin:0 auto;
  width:var(--nf-notch-w,190px);                       /* JS writes the REAL hardware notch width */
  height:calc(var(--nf-notch-h) + 22px);
  border-radius:0 0 16px 16px;overflow:hidden;
  background:#000;                                     /* always */
  transform-origin:top center;will-change:width,height,transform,border-radius;
  transition:width .55s cubic-bezier(.32,.72,0,1),
             height .55s cubic-bezier(.32,.72,0,1),
             transform .55s cubic-bezier(.32,.72,0,1),
             border-radius .55s cubic-bezier(.32,.72,0,1),
             box-shadow .4s ease, filter .16s ease}

/* Idle is eyes-only in the dark. Ears and mouth only surface with the coral. */
#notch-face:not(.listen):not(.speak) .nf-ears{opacity:0}
#notch-face:not(.listen):not(.speak) #nf-mouth-idle{display:none}
```

Real notch width comes from the OS, never a constant:
```js
document.getElementById("notch-face")
  ?.style.setProperty("--nf-notch-w", `${displayMetrics.notch.width}px`);
```

### 8.1 States

```css
/* LISTENING: the island grows and radiates coral, continuously, while the mic is live */
#notch-face.listen .nf-pill{width:250px;height:calc(var(--nf-notch-h) + 44px);
  border-radius:0 0 26px 26px;animation:nfListenRadiate 1.9s ease-in-out infinite}
@keyframes nfListenRadiate{
  0%,100%{box-shadow:0 0 0 1px rgba(232,120,110,.34), 0 0 18px 2px rgba(232,120,110,.30)}
  50%    {box-shadow:0 0 0 1.6px rgba(240,149,140,.90), 0 0 38px 7px rgba(232,120,110,.62)}}

/* SPEAKING: same size, no radiate. The mouth already carries the state. */
#notch-face.speak .nf-pill{width:250px;height:calc(var(--nf-notch-h) + 44px);
  border-radius:0 0 26px 26px;box-shadow:0 0 34px rgba(232,120,110,.5)}

/* CAPTIONING: stretches SIDEWAYS only. Height untouched so the eyes stay centred on the housing. */
#notch-face.captioning .nf-pill{
  width:calc(var(--nf-left-reach) + var(--nf-right-reach));
  transform:translateX(calc((var(--nf-right-reach) - var(--nf-left-reach)) / 2));
  height:calc(var(--nf-notch-h) + 22px);border-radius:0 0 16px 16px}
.nf-cap{width:calc(50% - var(--nf-notch-w,190px)/2 - 22px)}   /* the wing, outside the housing */

/* MODE TINT beats coral: an active voice command owns the colour */
#notch-face.nf-voice-mode.listen .nf-pill{animation:none;
  box-shadow:0 0 0 1.5px var(--nf-mode-color,#0A84FF), 0 0 30px -1px var(--nf-mode-color,#0A84FF)}

/* YAP / dictation: compact, mint green, its own slower rhythm */
#notch-face.nf-dictation.listen .nf-pill{width:222px;height:calc(var(--nf-notch-h) + 28px);
  border-radius:0 0 18px 18px;animation:nfYapModeRadiate 2.4s ease-in-out infinite}
@keyframes nfYapModeRadiate{
  0%,100%{box-shadow:0 0 0 1px rgba(61,232,178,.34), 0 0 9px 1px rgba(61,232,178,.2)}
  50%    {box-shadow:0 0 0 1.2px rgba(145,255,220,.72), 0 0 17px 2px rgba(61,232,178,.34)}}

@media (prefers-reduced-motion:reduce){
  #notch-face.listen .nf-pill{animation:none;
    box-shadow:0 0 0 1.4px rgba(232,120,110,.7), 0 0 22px 3px rgba(232,120,110,.4)}}
```

### 8.2 Web port of the Mac notch (`.nf-face`)

For putting the Mac notch on a web page: rename `#notch-face` → `.nf-face`, `#nf-*` ids → `.nf-*` classes, `position:fixed` → `absolute`, and reset the leaky generic state class names:
```css
.nf-face{background:none;min-height:0;color:initial;font-family:inherit}  /* .on/.home etc. are generic words; neutralise host-page collisions */
.nf-face .nf-pill{background:linear-gradient(180deg,#F6A8A2,#E8786E 55%,#C9544A)}  /* web version shows the coral */
```

### 8.3 The decorative "screen boot" notch (for marketing art)

```css
.apple-macscreen{position:relative;border-radius:22px;overflow:hidden;background:#000;aspect-ratio:16/10;
  box-shadow:0 30px 80px rgba(29,29,31,.22), inset 0 0 0 1px rgba(255,255,255,.06);
  display:grid;place-items:center}
.apple-macnotch{position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:clamp(150px,22vw,220px);height:clamp(26px,3.4vw,34px);
  background:#000;border-radius:0 0 14px 14px;
  display:flex;align-items:flex-start;justify-content:center;
  gap:clamp(9px,1.4vw,13px);padding-top:clamp(6px,.9vw,9px)}
.apple-macnotch .eye{width:clamp(11px,1.5vw,15px);aspect-ratio:1;border-radius:50%;background:#fff;
  opacity:0;animation:bootEyeIn .7s ease .3s forwards, bootBlink 4.6s ease 1.4s infinite}
@keyframes bootEyeIn{to{opacity:1}}
@keyframes bootBlink{0%,92%,100%{transform:scaleY(1)} 96%{transform:scaleY(.1)}}
.apple-macnotch .eye::after{content:"";position:absolute;width:42%;height:42%;border-radius:50%;
  background:#111;top:26%;left:26%}
```

---

## 09 — THE BRAINO CHARACTER PALETTE

Independent of page theme. These four never change, in any mode, on any surface.

```css
--braino-coral-light: #F6A8A2;   /* top of the head gradient */
--braino-coral:       #E8786E;   /* THE colour. equalizers, sonar, glows */
--braino-coral-deep:  #C9544A;   /* bottom of the gradient, shadows */
--braino-ink:         #1B1713;   /* his eyes, his smile, warm near-black */
--braino-fold:        #8A2F28;   /* brain gyri strokes */
--braino-mouth:       #6E211A;   /* mouth cavity */
--braino-tongue:      #F08B82;
--braino-mint:        #3DE8B2;   /* Yap / dictation mode only */
--braino-mode-blue:   #0A84FF;   /* active voice command tint */
```
Head gradient, verbatim: `linear-gradient(180deg,#F6A8A2 0%,#E8786E 56%,#C9544A 100%)`

---

## 10 — PAGE SKINS

Four pages, one system, four temperatures.

| Page | Wrapper | Ground | Headline | Notes |
|---|---|---|---|---|
| `/product-overview` | `.apple` | light `#fbfbfd` | `.apple-display`, 600, `-0.022em` | The reference implementation. Nav + anchor bar + boot hero + editorial rows + hscroll gallery + live engine + quote. |
| `/braino` (Foundry) | `.apple .foundry` | light | `clamp(42px,6.1vw,76px)`, line-height 1.03 | Adds pill tab groups: `.foundry-page-tabs` (sticky at `top:88px`, `#f0f0f2` track, white active pill) and `.foundry-pitch-tabs` (inverted ink active). CTAs are 48px min-height, `border-radius:999px`, `translateY(-2px)` on hover. |
| `/` (home / Waitlist) | `.wl-page` | **dark** `#080908` | `clamp(58px,9.6vw,126px)`, weight **400**, `-0.065em`, line-height **.87** | The editorial/cinematic register. Own tokens: `--wl-panel:#111210 --wl-ink:#f2f0e9 --wl-muted:#999b94 --wl-line:#292b27 --wl-accent:#e47b5f`. Hero image is `aspect-ratio:2.65/1` in a 28px-radius panel. |

| `/code` (Braino Code) | `.apple` + `.ac-blue` hero | light `#fbfbfd` | `.apple-display`, two lines, one `.tone` | The waiting register. Stacked hairline cards, one accent, `980px` pill buttons. The only page whose main content is generated live, so see the pattern below. |

The home page is the one deliberate exception to light-first: it is a poster, so the type goes big, light-weight and tightly tracked, and the accent warms to `#e47b5f`.

### The waiting pattern (`/code`)

A page that has to hold someone's attention for three to eight minutes while a
machine works. It is not a progress bar and deliberately not a stream of code:
Braino narrates the build out loud, so the screen holds **decisions, not
activity**, and is something you glance at alongside him.

**Split screen.** `.bc-split` is `1fr / 1.2fr`: decisions scroll on the left, the
built site sits on the right in a `position:sticky` `.bc-stage`, because the
rendered site is the thing you keep looking back at. Collapses to one column
under 900px. The moment a build starts the page stops being a landing page and
becomes a workspace: `.bc-wrap.working` widens to 1320px and `.apple-hero.bc-small`
drops the subhead and shrinks the display type, so the hero is not eating 500px
of the screen you are trying to watch.

**Preview / Code** is an Apple segmented control (`.bc-seg`): one track, one
moving white pill, `aria-pressed` carrying the state.

Three stacked `.bc-card`s appear in order on the left, each `bcRise` on entry:

1. **What you said** — the brief echoed back instantly, no model involved. A misheard brief gets caught before it costs four minutes.
2. **How it should look** — the generated palette as swatches (`bcPop`, 70ms stagger), plus mood, type and what was taken from any named reference. This beat earns the screen: everyone has an opinion about colour, so it goes up while a correction is still cheap.
3. **What he is writing** — the sitemap, beads pulsing on the section that is being written.

Rules this page adds:

- **Never fake progress.** The page arrives in one piece, so sections do not tick off one at a time. Real elapsed time (`tabular-nums`, top right of each card) is the honest substitute for a bar that cannot be filled.
- **The generated site is quarantined in an iframe** inside `.bc-screen`. It carries its own palette, which will clash with the page tokens; the hairline border, 28px radius and long soft shadow are what keep it reading as a held object rather than a broken section.
- **The iframe uses `srcdoc`, never `src`, and this is not a preference.** Supabase Storage serves every object as `text/plain` under `default-src 'none'; sandbox`, and the Edge Function gateway rewrites `text/html` to `text/plain` for browser navigations. Both are deliberate anti-phishing policy: no HTML may be served as HTML from a `supabase.co` domain. `curl` sees `text/html` and a browser sees source, which is a confusing way to discover this. `srcdoc` never consults a content type, and works here only because the generated site is self-contained by construction. Shareable links go to `/site/:buildId` on our own domain, which does the same thing full-bleed.
- **Errors are prose, not codes.** `.bc-oops` uses `--ap-coral-panel`, and the copy is the reason, never a status number on its own.

**Showing a generated page inside our own page: three walls, in order.** Worth writing down, because each one looks like the previous fix worked.

1. **Supabase will not serve HTML as HTML.** Storage returns every object as `text/plain` under `default-src 'none'; sandbox`, and the Edge Function gateway rewrites `text/html` → `text/plain` for browser *navigations*. Deliberate anti-phishing policy. The trap: `curl` sees `text/html` and a browser sees source, so a header check "passes" while the page is still broken.
2. **`srcdoc` fixes it on the website**, because it never consults a content type — and works only because the generated site is self-contained by construction.
3. **`srcdoc` fails inside the Mac dashboard**, because a srcdoc document *inherits the embedder's CSP*, and that window runs `style-src 'self'`, which strips the site's own `<style>` and renders it naked. A `data:` URL does **not** rescue this: `data:`, `blob:`, `about:blank` and `about:srcdoc` are all *local schemes* and all inherit. The fix is a **custom scheme** (`brainosite://`, registered privileged in `main.cjs`), which is not a local scheme and inherits no policy.

Same CSP also blocks parsed `style=""` attributes, which is why the Mac swatches are painted via the CSSOM (`el.style.background = …`) rather than an inline attribute. Script-set styles are not covered by `style-src`.

---

## 10b — THE MAC DASHBOARD (`renderer/dashboard.*`)

Not the website's Apple tokens: its own light palette, the same philosophy.

### Navigation lives across the top

It used to be a 236px source list: fifteen items under four group headings.
Every heading cut the column again, so nothing was ever more than four rows from
a divider and the whole thing read as **chopped**. Restyling the rows could not
fix that, because the chopping *was* the structure.

Now: **six destinations** in one pill track — Home, Braino Code, Library,
Automation, Voice, Settings — with the active one as a raised white pill. Depth
moves to a **second row of chips** that only renders for tabs that have depth,
so Home and Braino Code show no second row at all. The chip carries its count.

The two levels both drive `data-view`, so `showView()` stays the only router.
A tab keys off `data-group` (the views it owns), never its own `data-view` —
otherwise opening Memory would visibly drop Library.

### The feed

Lists are a **card grid** (`repeat(auto-fill, minmax(330px, 1fr))`), not a
stacked column. Four cards land in one glance where a column has to be read
down. Each card: icon tile, date in the top corner, title at 15px/600, then the
qualifier (`MEETING`, `POSTED`, `FAILED`) as a small uppercase lead-in on the
preview line, clamped to three lines. Two or three lines is a glance; more is
reading, and a list stops being scannable the moment a row needs reading.

**Empty states** are a quiet centred line inside a card. Never a dashed box,
which is a web placeholder idiom.

**Light only.** The black theme's overrides remain in the stylesheet but nothing
selects them, and a stored `black` falls back to `paper`.

### The cascade trap in this window, which bit three times

`.bd-root button` resets `background`, `border` and `padding` at specificity
**(0,1,1)** — one class plus one element. That beats *any single class*. So
`.bc-go`, `.bd-tab` and `.bd-chip` each rendered as bare text the first time
they were written, and the tell is maddening: `.bd-chip.active` is **(0,2,0)**
and therefore wins, so exactly one pill in the row looked correct while the
rest looked unstyled. Prefix with `.bd-root`; never reach for `!important`.

Two smaller ones from the same window:

- A layout rule like `display: grid` **beats the `hidden` attribute**. `hidden`
  is an attribute, not a style, so nothing defends it. The sheet carries
  `[hidden] { display: none !important; }`.
- `.bd-nav-item` carries `width: 100%`. Reusing it on a chip stacks the row
  full-width instead of laying it out inline.

---

## 10c — THE CHAT SHELL (`/chat`)

Not the Apple page system and deliberately not a Braino skin: the full-screen
chat is a **ChatGPT-shaped dark app shell** with Braino's identity inside it.
The reasoning is that people arrive at a chat page already knowing how a chat
page works, so every pixel spent being different is a pixel spent teaching. All
of it lives in `CHAT_CSS` at the bottom of `src/pages/BrainoChat.tsx`, scoped
under `.bchat`, so it never touches the site tokens.

### Tokens

```css
--bc-bg:#000;        /* both columns, no divider between them */
--bc-hover:#1c1c1c;  /* row hover */
--bc-active:#2a2a2a; /* selected chat */
--bc-surface:#303030;/* composer and user bubble, the only raised surface */
--bc-text:#f3f3f3;  --bc-dim:#b4b4b4;  --bc-muted:#8f8f8f;
--bc-blue:#0285ff;   /* voice orb and the active Delegate pill only */
```

### The three numbers that make it read as ChatGPT

**260px sidebar. 768px column. 56px composer.** The thread and the composer are
the same 768px and share one centre line, which is why `.bc-scroll` uses
`scrollbar-gutter:stable both-edges`: a one-sided gutter shifts the thread 5px
off the composer and the whole page looks subtly broken without ever looking
wrong.

### Rules this surface adds

- **The composer moves.** Empty chat: greeting, composer and suggestion rows are
  one vertically centred stack, no bottom dock. First message: the composer
  drops to the dock and stays. Same component, two parents.
- **One button, two jobs.** Empty input shows the blue voice orb; typed input
  swaps it for the white send arrow. There is never both.
- **Delegate sits in the Think slot** and is the only tinted control on the page
  when armed (`rgba(2,133,255,.18)`).
- **Braino survives as the mascot, not as chrome.** Walker in the empty state,
  small avatar on answers, full mascot in voice mode. The shell itself stays
  neutral.
- **Nothing dead in the sidebar.** ChatGPT's Images / Plugins / Pinned /
  Projects rows are not cloned, because a row that does nothing costs more trust
  than the resemblance buys.
- **`:where(.bchat) button`, not `.bchat button`.** The reset has to lose to
  every single-class button rule, or `color:inherit` outranks them and paints
  the send arrow white on white. Same for the shared `svg` rule.

---

## 11 — LAWS (the short version)

1. **Headlines 600. Body 500.** Never 400 headlines (except the home poster H1), never 700 body.
2. **One `.tone` word per headline.** The accent colour appears once.
3. **Nothing is centred except the hero and section headers.** Everything else is an editorial left/right row.
4. **Never break a light page with a full-bleed dark slab.** Tint with `--ap-panel-bg` instead.
5. **Radius vocabulary:** 980px pills · 999px chips · 14–15px icon tiles · 22px cards · 28px panels · `0 0 Npx Npx` notches only.
6. **Colour is set by one class** (`.ac-violet`), never per element.
7. **Every animation ships a reduced-motion escape.** Every scroll-jack ships a mobile fallback.
8. **The notch morphs shape first, content second** (~120ms behind). Always `cubic-bezier(.32,.72,0,1)` for size, `cubic-bezier(.22,1,.36,1)` for entrances.
9. **The hairline is 1px `--ap-hairline`,** never a shadow, never 2px.
10. **Braino coral is Braino's,** not the UI's. UI accents come from the token set; `#E8786E` means *him*.
