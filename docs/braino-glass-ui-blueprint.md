# Braino — Liquid-Glass UI Design Blueprint

This is the **exact** design spec for Braino's two translucent surfaces:

1. **The center bar** — the transparent "cinema dock" liquid-glass input that floats at the
   bottom-center of the screen.
2. **The floating card** — the liquid-glass answer panel that pops up, and can be **dragged and
   resized** anywhere on the page.

Everything below is copied **verbatim** from the production extension
(`public/sidebrain-extension/content.js`). Copy a section as-is and it reproduces the surface
pixel-for-pixel. Hand this whole file to a designer / paste into Claude to replicate.

> The "liquid glass" look is **two stacked layers**: a real `backdrop-filter: blur()` on the
> element, **plus** a `::before` pseudo-element that runs an SVG `feDisplacementMap` filter to
> refract whatever is behind it. You **must** include the SVG filter from §1 or the glass will look
> flat (just a plain blur).

---

## 1. Foundations (required by both components)

### 1.1 Fonts

```css
/* UI / body text */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
/* Display / headlines */
font-family: 'Instrument Serif', Georgia, serif;
/* Code / monospace */
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

### 1.2 Color palette

| Token | Hex | Use |
|-------|-----|-----|
| Coral light | `#F6A8A2` | gradient top, glow |
| **Coral** | `#E8786E` | primary accent (send button, dots) |
| Coral deep | `#C9544A` | hover / active accent |
| Coral darkest | `#9C3E36` | gradient bottom |
| Cream | `#FFFBF7` | warm surface (readable mode) |
| Ink | `#1B1713` | primary text |
| Ink-2 | `#413028` | secondary text |
| Ink-3 | `#6B5248` | muted icons |
| Ink-4 | `#A79B92` | placeholder / hint |

### 1.3 The liquid-glass SVG filter — **REQUIRED**

Drop this once into the DOM (it renders nothing itself — it's referenced by
`filter: url(#__sb_glass_filter__)`). The `feDisplacementMap scale="200"` is what gives glass its
warped, refractive edge.

```html
<svg width="0" height="0" style="position:absolute;pointer-events:none" aria-hidden="true">
  <defs>
    <linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F6A8A2"/>
      <stop offset="0.55" stop-color="#E8786E"/>
      <stop offset="1" stop-color="#C9544A"/>
    </linearGradient>
    <filter id="__sb_glass_filter__" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
      <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence"/>
      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/>
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0"/>
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5"/>
      </feComponentTransfer>
      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap"/>
      <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight">
        <fePointLight x="-200" y="-200" z="300"/>
      </feSpecularLighting>
      <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/>
      <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>
</svg>
```

---

## 2. Component A — The translucent center bar (cinema dock)

A fully transparent liquid-glass pill, centered at the bottom. Legibility on dark pages comes from
a **white text-halo** (text-shadow / drop-shadow) on the inner controls — **not** from an opaque
background. It animates in via `.open`.

### 2.1 HTML

```html
<div id="__sb_bar__">
  <input id="__sb_input__" placeholder="What's on your mind?" autocomplete="off" spellcheck="false" />
  <button id="__sb_mode_btn__" class="sb-pill-dropdown-btn" title="Mode">
    <span id="__sb_mode_label__">⚡ Auto</span>
    <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 1 5 5 9 1"/></svg>
  </button>
  <button id="__sb_rec_btn__" class="sb-bar-icon-btn" title="Headphone mode">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
  </button>
  <button id="__sb_send_btn__" class="sb-bar-icon-btn" title="Send">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
  </button>
  <button id="__sb_bar_close__" class="sb-bar-icon-btn" title="Dock (Esc)">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
</div>
```

### 2.2 CSS (verbatim)

```css
/* ── Cinema Dock: full-width centered liquid-glass bar ── */
#__sb_bar__ {
  position: fixed; bottom: 20px; left: 50%;
  transform: translateX(-50%) translateY(24px) scale(0.97);
  display: flex; align-items: center; gap: 8px;
  /* Stays transparent liquid glass — legibility comes from a light text halo
     (see #__sb_input__ etc.) rather than an opaque backing. */
  background: rgba(255,251,247,0.12); border-radius: 100px;
  isolation: isolate;
  overflow: visible;
  padding: 10px 10px 10px 28px;
  border: 1px solid rgba(255,255,255,0.5);
  box-shadow: 0 8px 32px rgba(27,23,19,0.18), 0 2px 8px rgba(27,23,19,0.08),
              inset 2px 2px 1px rgba(255,255,255,0.65),
              inset -1px -1px 1px rgba(255,255,255,0.3);
  width: calc(100vw - 48px); max-width: 1100px;
  backdrop-filter: blur(6px) saturate(180%); -webkit-backdrop-filter: blur(6px) saturate(180%);
  pointer-events: none; opacity: 0;
  z-index: 2147483645;
  transition: opacity 0.38s cubic-bezier(0.34,1.1,0.64,1), transform 0.38s cubic-bezier(0.34,1.1,0.64,1),
              background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
}
/* second glass layer: refraction via the SVG displacement filter from §1 */
#__sb_bar__::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  backdrop-filter: blur(16px) saturate(200%);
  -webkit-backdrop-filter: blur(16px) saturate(200%);
  filter: url(#__sb_glass_filter__);
  z-index: -1; pointer-events: none;
}
#__sb_bar__.open { opacity: 1; pointer-events: all; transform: translateX(-50%) translateY(0) scale(1); }

/* Coral send-pulse — a brief ring + warm glow each time a message is sent. */
@keyframes __sb_bar_send__ {
  0%   { box-shadow: 0 0 0 0 rgba(232,120,110,0.55), 0 8px 32px rgba(27,23,19,0.18); }
  55%  { box-shadow: 0 0 0 6px rgba(232,120,110,0), 0 0 34px rgba(232,120,110,0.45), 0 8px 32px rgba(27,23,19,0.18); }
  100% { box-shadow: 0 0 0 0 rgba(232,120,110,0), 0 8px 32px rgba(27,23,19,0.18); }
}
#__sb_bar__.sb-send-pulse { animation: __sb_bar_send__ 0.7s ease-out; }

/* ── Bar input — transparent, with a white halo so dark text stays legible on glass ── */
#__sb_input__ {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 16px; color: #1B1713; min-width: 0; padding: 0; line-height: 1.4;
  text-shadow: 0 0 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.7), 0 1px 1px rgba(255,255,255,0.8);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
#__sb_input__::placeholder { color: #4A3D34; }

/* ── Round icon buttons (headphone / send / close) ── */
.sb-bar-icon-btn {
  width: 38px; height: 38px; border-radius: 50%; border: none;
  background: transparent; color: #3A2D24; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: background 0.15s; padding: 0;
  /* Light halo so the stroke icons stay visible on a transparent glass over dark pages. */
  filter: drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 4px rgba(255,255,255,0.55));
}
.sb-bar-icon-btn:hover { background: rgba(65,48,40,0.08); }
.sb-bar-icon-btn.active { background: #fee2e2; color: #C9544A; }

/* Send button is coral-filled + slightly larger */
#__sb_send_btn__ { background: #E8786E !important; color: white !important; width: 42px !important; height: 42px !important; }
#__sb_send_btn__:hover { background: #C9544A !important; }

/* ── Mode dropdown pill ("⚡ Auto") ── */
.sb-pill-dropdown-btn {
  display: inline-flex; align-items: center; gap: 4px;
  border: none; background: rgba(255,251,247,0.55); border-radius: 8px;
  padding: 4px 8px 4px 9px; cursor: pointer; transition: background 0.15s;
  font-size: 11px; font-weight: 600; color: #3A2D24; white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sb-pill-dropdown-btn:hover { background: rgba(65,48,40,0.12); }
.sb-pill-dropdown-btn.active-mode { color: #C9544A; background: rgba(201,84,74,0.1); }
.sb-pill-dropdown-btn svg { flex-shrink: 0; opacity: 0.5; }
```

### 2.3 Optional "readable mode" (opaque warm-cream variant)

When the page behind is too busy, the bar can flip to an opaque cream skin (drop the displacement
layer, dark text on cream):

```css
#__sb_bar__.sb-readable {
  background: rgba(255,251,247,0.96);
  border: 1px solid rgba(65,48,40,0.12);
  box-shadow: 0 8px 28px rgba(27,23,19,0.14), 0 2px 8px rgba(27,23,19,0.07),
              inset 0 1px 0 rgba(255,255,255,0.9);
  backdrop-filter: blur(20px) saturate(180%); -webkit-backdrop-filter: blur(20px) saturate(180%);
}
#__sb_bar__.sb-readable::before { backdrop-filter: none; -webkit-backdrop-filter: none; filter: none; }
#__sb_bar__.sb-readable #__sb_input__ { color: #1B1713; }
#__sb_bar__.sb-readable #__sb_input__::placeholder { color: #A79B92; }
#__sb_bar__.sb-readable #__sb_mode_btn__ { color: #413028; background: rgba(65,48,40,0.07); border-color: rgba(65,48,40,0.18); }
#__sb_bar__.sb-readable .sb-bar-icon-btn { color: #6B5248; }
#__sb_bar__.sb-readable .sb-bar-icon-btn:hover { background: rgba(65,48,40,0.08); color: #1B1713; }
#__sb_bar__.sb-readable .sb-bar-icon-btn.active { background: #fee2e2; color: #C9544A; }
```

---

## 3. Component B — The floating liquid-glass card (draggable + resizable)

The answer panel. A frosted, refractive glass shell with a header (drag handle), a scrollable
body, and a **resize grip** (`resize: both`). It pops in with a spring scale. Drives all inner
colors from a `--sb-*` token set so it has a dark-glass default and a cream "readable" variant.

### 3.1 HTML

```html
<div id="__sb_card_wrap__">
  <div id="__sb_bubble__">
    <div class="sb-card-header">
      <button class="sb-card-header-btn" type="button" data-sb-speak>Speak</button>
      <button class="sb-card-header-btn" type="button" data-sb-copy>Copy</button>
      <button class="sb-card-header-btn" id="__sb_theme_toggle_btn__" type="button" title="Toggle readable mode">◑</button>
      <button class="sb-card-header-btn" type="button" data-sb-close>×</button>
    </div>
    <div class="sb-card-scroll">
      <!-- answer content goes here -->
    </div>
  </div>
</div>
```

### 3.2 CSS (verbatim — the glass shell)

```css
/* Centered wrapper that positions the card and fades it in */
#__sb_card_wrap__ {
  position: fixed; z-index: 2147483648; top: 50%; left: 50%;
  transform: translate(-50%, -50%); width: min(820px, calc(100vw - 32px));
  pointer-events: none; opacity: 0; transition: opacity 0.25s;
}
#__sb_card_wrap__.visible { opacity: 1; pointer-events: all; }
#__sb_card_wrap__.animating-in #__sb_bubble__ {
  animation: __sb_card_in__ 0.38s cubic-bezier(0.34,1.15,0.64,1) both;
}
@keyframes __sb_card_in__ {
  from { opacity: 0; transform: scale(0.88) translateY(22px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}

/* The liquid-glass card itself (dark-glass default via --sb-* tokens) */
#__sb_bubble__ {
  --sb-fg: #ffffff; --sb-fg-2: rgba(255,255,255,0.85); --sb-fg-3: rgba(255,255,255,0.4);
  --sb-bg: rgba(255,255,255,0.04); --sb-border: rgba(255,255,255,0.38);
  --sb-q-bg: rgba(255,255,255,0.12); --sb-q-border: rgba(255,255,255,0.2);
  --sb-code-bg: rgba(255,255,255,0.12); --sb-code-fg: #FFD0CB;
  --sb-pre-bg: rgba(0,0,0,0.35); --sb-pre-fg: #FBF7F1;
  --sb-hr: rgba(255,255,255,0.15); --sb-link: #FFB3AE;
  --sb-btn-fg: rgba(255,255,255,0.75); --sb-btn-bg: rgba(255,255,255,0.18);
  --sb-btn-hover: rgba(255,255,255,0.32);
  position: relative; width: 100%;
  height: auto; max-height: min(72vh, 700px); min-height: 120px;
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--sb-bg); border-radius: 24px;
  border: 1px solid var(--sb-border);
  box-shadow: 0 40px 100px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.18),
              inset 2px 2px 1px rgba(255,255,255,0.25),
              inset -1px -1px 1px rgba(255,255,255,0.15);
  backdrop-filter: blur(4px) saturate(180%);
  -webkit-backdrop-filter: blur(4px) saturate(180%);
  isolation: isolate;
  color: var(--sb-fg);
  transition: background 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease,
              color 0.35s ease, backdrop-filter 0.35s ease;
}
/* second glass layer: refraction via the SVG displacement filter from §1 */
#__sb_bubble__::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit;
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
  filter: url(#__sb_glass_filter__);
  z-index: -1; pointer-events: none;
}

/* Header = drag handle. Body = scrollable. */
.sb-card-header {
  display: flex; align-items: center; justify-content: flex-end; gap: 5px;
  padding: 12px 14px 4px; flex-shrink: 0;
}
.sb-card-header-btn {
  border: none; background: var(--sb-btn-bg); color: var(--sb-btn-fg);
  height: 26px; padding: 0 10px; border-radius: 8px; cursor: pointer;
  font-size: 11px; font-weight: 600; transition: background 0.12s;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sb-card-header-btn:hover { background: var(--sb-btn-hover); }
.sb-card-scroll {
  flex: 1; min-height: 0; overflow-y: auto; padding: 16px 26px 16px;
  user-select: text; -webkit-user-select: text;
}
.sb-card-scroll::-webkit-scrollbar { width: 4px; }
.sb-card-scroll::-webkit-scrollbar-track { background: transparent; }
.sb-card-scroll::-webkit-scrollbar-thumb { background: rgba(180,140,120,0.3); border-radius: 99px; }
.sb-card-scroll::-webkit-scrollbar-thumb:hover { background: rgba(180,140,120,0.55); }
```

### 3.3 Readable (cream-glass) variant

```css
/* Glassmorphism alternate — translucent frosted CREAM (not opaque) with dark, readable text.
   You can still see the page through it. */
#__sb_bubble__.sb-readable {
  --sb-fg: #1B1713; --sb-fg-2: rgba(27,23,19,0.82); --sb-fg-3: rgba(27,23,19,0.5);
  --sb-bg: rgba(255,251,247,0.5); --sb-border: rgba(255,255,255,0.55);
  --sb-q-bg: rgba(65,48,40,0.08); --sb-q-border: rgba(65,48,40,0.12);
  --sb-code-bg: rgba(65,48,40,0.1); --sb-code-fg: #b44b42;
  --sb-pre-bg: rgba(27,23,19,0.08); --sb-pre-fg: #1B1713;
  --sb-hr: rgba(65,48,40,0.12); --sb-link: #C9544A;
  --sb-btn-fg: rgba(65,48,40,0.8); --sb-btn-bg: rgba(65,48,40,0.08);
  --sb-btn-hover: rgba(65,48,40,0.15);
  backdrop-filter: blur(22px) saturate(170%);
  -webkit-backdrop-filter: blur(22px) saturate(170%);
  box-shadow: 0 16px 40px rgba(27,23,19,0.16), 0 4px 12px rgba(27,23,19,0.08),
              inset 0 1px 0 rgba(255,255,255,0.55);
}
#__sb_bubble__.sb-readable::before { backdrop-filter: none; -webkit-backdrop-filter: none; filter: none; }
```

### 3.4 Making it drag + resizable ("reattach anywhere")

The current card centers itself; to let users **drag it anywhere and resize it**, add these (this is
exactly how Braino's earlier free-floating glass bubble behaved):

```css
/* on the card shell — a native resize grip in the bottom-right corner */
#__sb_bubble__ { resize: both; max-width: calc(100vw - 100px); min-width: 260px; }

/* turn the header into a drag handle */
.sb-card-header { cursor: grab; user-select: none; }
.sb-card-header:active { cursor: grabbing; }
/* drag-grip affordance (braille dots), left side of the header */
.sb-card-header::before {
  content: "⠿"; font-size: 14px; color: rgba(180,140,120,0.5);
  margin-right: auto; line-height: 1;
}
```

Behavior (JS, in the extension): a `pointerdown` on `.sb-card-header` starts a drag that writes
`left/top` onto `#__sb_card_wrap__` (switching it off the centered transform); `resize: both` gives
the corner grip for free. Bounds are clamped to the viewport on `pointermove`.

---

## 4. Notes for the motion designer

- **Two glass layers, always.** Layer 1 = the element's own `backdrop-filter: blur()`. Layer 2 =
  the `::before` with `filter: url(#__sb_glass_filter__)` (the SVG displacement). Layer 2 is what
  bends/refracts the background at the edges — without §1's filter it degrades to a plain blur.
- **The bar is intentionally near-transparent** (`background: rgba(255,251,247,0.12)`). Legibility
  is bought with the **white text-halo** (`text-shadow` on the input, `drop-shadow` on the icons),
  not an opaque fill. Keep that halo if you keep the transparency.
- **Coral is the only accent:** `#E8786E` resting → `#C9544A` on hover/active. Send button is the
  one filled element.
- **Signature easings:** spring `cubic-bezier(0.34,1.1,0.64,1)` for the bar reveal and
  `cubic-bezier(0.34,1.15,0.64,1)` for the card pop-in; everything else `0.35s ease`.
- **Radii:** bar = `100px` (full pill); card = `24px`; small chips/buttons = `8px`.
- **Both surfaces use `isolation: isolate`** so the `::before` glass layer (`z-index: -1`) composites
  against the element only, not the whole page.
```
