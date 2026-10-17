# The Notch Design System

**Braino's face, his body and his entire UI surface on the Mac.**

Every state, every animation, every number, checked against the code on 2026-10-13. This document is meant to be enough on its own: another app, on any stack, should be able to rebuild the identical notch from it.

Source of truth, in this order:

| File | What it owns |
|---|---|
| `mac/braino-mac/renderer/braino-mac.css` | every size, colour, curve and keyframe (the notch is roughly lines 170 to 6880) |
| `mac/braino-mac/renderer/index.html` | the DOM (`#notch-face`, lines 47 to 450) |
| `mac/braino-mac/renderer/braino-mac.js` | the state machine (`updateNotchFace`), answers, thinking, quiet notch, blink, gaze, karaoke |
| `mac/braino-mac/notch-response.cjs` | short vs long answer rules, linger time, height estimate |
| `mac/braino-mac/main.cjs` | the overlay window, notch measurement, click zone |

`renderer/glass.css` is **not** part of the notch. It only recolours the app windows (dashboard, memory) to see-through glass. The browser extension has its own copy of the notch; port from the Mac files above, never from the extension.

---

## 1. The idea

The physical notch on a MacBook is a hole in the screen that Apple asks you to route around. Braino lives in it instead. He grows out of the housing, so the black of the pill and the black of the hardware are the same black and the join is invisible.

Four rules. Everything else follows from them.

1. **The pill is always black.** `#000`. Coral is Braino, never the shell. Every time a state class tinted the background, coral leaked through next to the housing and the illusion broke.
2. **It grows downward from the top, never floats.** `transform-origin: top center`. Sheets are anchored at `y = 0` with square top corners, rounded only where they leave the notch. An 8px gap turns a growing island into a card hovering under a hole.
3. **Geometry is fixed per state.** The spring animates between two known sizes. Only reading sheets measure their content, and they write the result into a CSS variable that the same transition animates.
4. **Nothing outside the notch.** No cards, panels or bubbles beside or under it. Everything lives inside the one black shape, and one exchange (your words, his thinking, his answer) keeps one shape.

---

## 2. The window

The notch is drawn in one transparent, full-screen overlay window (`dockWindow` in `main.cjs`). The same window also carries the walking mascot.

```js
dockWindow = new BrowserWindow({
  type: "panel",                 // only panels join fullscreen Spaces
  enableLargerThanScreen: true,  // without it macOS clamps the frame below the menu bar
  width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y,
  frame: false, transparent: true, backgroundColor: "#00000000",
  alwaysOnTop: true, skipTaskbar: true, hasShadow: false,
  resizable: false, movable: false, focusable: false,
  acceptFirstMouse: true,
  webPreferences: { backgroundThrottling: false, contextIsolation: true },
});
dockWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
dockWindow.setAlwaysOnTop(true, "screen-saver", 1);
dockWindow.setFocusable(false);
dockWindow.setIgnoreMouseEvents(true, { forward: true });
```

| Property | Value | Why |
|---|---|---|
| Size | exactly the display's `bounds` (not `workArea`) | so `y = 0` is the top of the glass, above the menu bar |
| Level | `screen-saver`, relative level 1 | above the menu bar and fullscreen apps. Re-asserted every 900ms by `raiseDockWindow` (`setAlwaysOnTop(false)` then `true`) |
| Spaces | all workspaces, including fullscreen | he never disappears when you change Space |
| Focus | not focusable, except while the typing field holds the keyboard | a focused overlay steals keys from your app |
| Clicks | ignored and forwarded, except inside the notch zone (below) | the rest of the screen stays yours |
| Which screen | the display holding the frontmost window (`getDisplayMatching`), else the one under the cursor, else primary | the notch follows your work |

The Arrival greeting is a second window (760 x 320, top centre, `screen-saver` level 2, click-through) and closes itself after 60s at most.

### Measuring the hardware notch

`main.cjs` runs a tiny Swift helper once and caches the result in `notch-metrics.json`:

```swift
let f = s.frame
let tl = s.auxiliaryTopLeftArea?.width ?? 0
let tr = s.auxiliaryTopRightArea?.width ?? 0
print("\(f.width - tl - tr) \(s.safeAreaInsets.top)")   // notch width, notch height
```

A width outside 40 to 600 means no notch. The renderer receives `displayMetrics` (`bounds`, `workArea`, `notch: {width, height} | null`) and turns it into CSS variables:

```js
const menuBarH = Math.max(24, workArea.y - bounds.y) || 32;
const winY = Math.max(0, window.screenY - bounds.y);          // relativeWindowTop()
const inner = Math.max(0, (notch?.height || menuBarH) - winY);
face.style.setProperty("--nf-notch-h", `${inner}px`);         // hidden behind the housing
face.style.setProperty("--nf-screen-h", `${bounds.height}px`); // ceiling for every sheet
if (notch?.width) face.style.setProperty("--nf-notch-w", `${notch.width}px`);
face.classList.toggle("no-notch", !notch);
```

`--nf-screen-h` exists because `100vh` is the window, not the display. Every sheet clamps against it.

### No notch (external display, older Mac)

`.no-notch` changes radii only: the pill becomes a full pill (`border-radius: 16px`, `.expanded` 26px, `.dropping` 22px, `.nf-music-open` 30px). Reading sheets lose the black housing patch (`::after { display: none }`) and the sheet gets its own top: `::before { inset: 8px 0 0; border-radius: 26px }`. With no housing, square top corners would just jam the card into the screen edge.

### The click zone

The window ignores the mouse. `main.cjs` polls the real cursor every **130ms** and tells the renderer when it enters the notch zone, which then turns clicks on (`setIgnoreMouseEvents(false)`):

| Zone | Half width | Height |
|---|---|---|
| Collapsed | `notchW / 2 + 8` | `notchH + 26` |
| Expanded (a sheet is open) | `width / 2 + 8`, width clamped 220 to 900 (default 680) | clamped 30 to 900 (default 260) |

An expanded zone is believed only while the renderer keeps re-stating it: the renderer pushes it every **500ms**, and main forgets it after **2000ms** of silence. A surface that closed without saying so used to leave a dead rectangle that ate clicks on the page beneath.

---

## 3. The DOM

```html
<main id="dock-stage">                         <!-- position:fixed; inset:0; pointer-events:none -->
  <div id="edge-glow"></div>                    <!-- screen perimeter light, z 54 -->
  <div id="notch-face" class="nf-core-only">    <!-- ALL state lives here as classes, z 57 -->
    <div class="nf-sonar"><i></i><i></i><i></i></div>
    <div class="nf-pill">                       <!-- the black body; all geometry -->
      <i class="nf-aos-band"></i>               <!-- AffectiveOS colour line -->
      <svg class="nf-folds" viewBox="0 0 200 74" preserveAspectRatio="none">…</svg>
      <!-- boot: .nf-iomi-identity, .nf-boot-logo, .nf-boot-sweep, .nf-iomi-awake-eyes,
           .nf-iomi-expanded-card (the greeting) -->
      <div class="nf-band">                     <!-- the face, below the housing, z 3 -->
        <svg class="nf-mini" viewBox="0 0 120 56">…eyes, lids, ears, three mouths…</svg>
        <div class="nf-viz"><span>×9</span></div>
        <div class="nf-dancer"></div>
      </div>
      <div class="nf-cap nf-cap-l"></div><div class="nf-cap nf-cap-r"></div>
      <!-- music mini/surface, panel, typing, yap, meeting, cmds, drop box -->
      <div id="nf-status"></div><div id="nf-status-2"></div>   <!-- the ticker, z 4 -->
      <div class="nf-privacy"></div>
      <div class="nf-think-dots"><i></i><i></i><i></i></div>
      <button class="nf-think-chip"><span class="nf-think-chip-text">Thinking</span>
        <span class="nf-think-chip-arrow"></span></button>
      <section class="nf-thinking-canvas" aria-live="polite">…head, Stop, lines, trail…</section>
      <section class="nf-answer-surface" aria-live="polite">
        <div class="nf-answer-short-row">…<strong class="nf-answer-short-text"></strong>
          <span class="nf-src"></span>…<button class="nf-answer-done">Done</button></div>
        <header class="nf-answer-long-head">…<button class="nf-answer-done">Done</button></header>
        <article><small class="nf-answer-label"></small><div class="nf-answer-body"></div>
          <span class="nf-src nf-src-long"></span></article>
      </section>
    </div>
    <div class="nf-q">…quiet band: .nf-q-left, .nf-q-right, .nf-q-line (.nf-q-text, More, ✕)…</div>
    <svg class="nf-shine" viewBox="0 0 190 55" preserveAspectRatio="none">…the trace…</svg>
  </div>
</main>
```

Rules:

- State is **classes on `#notch-face`**. The pill reads them. JS never sets an inline width or height; measured heights arrive as CSS variables.
- `#notch-face` is `position: fixed; top: 0; left: 50%; transform: translateX(-50%); pointer-events: none; z-index: 57`, hidden until `.on` (`opacity 0 → 1`, `0.5s ease`).
- Inside the pill: folds z 1, black cover (`::after`) z 2, face band z 3, ticker z 4, shine z 6, sheets z 10 to 12.

---

## 4. Tokens

### Geometry

```css
#notch-face {
  --nf-notch-h:           33px;                              /* set by JS: depth hidden behind the housing */
  --nf-notch-w:           190px;                             /* set by JS: measured housing width (fallback) */
  --nf-screen-h:          100vh;                             /* set by JS: display height (fallback) */
  --nf-safe-top:          max(var(--nf-notch-h), 32px);      /* clears the housing on any Mac */
  --nf-content-top:       calc(var(--nf-safe-top) + 20px);   /* where text may begin inside a sheet */
  --nf-compact-surface-w: min(480px, calc(100vw - 32px));    /* short answer, your words */
  --nf-reading-surface-w: min(580px, calc(100vw - 32px));    /* long answer, thinking, long speech, typing */
  --nf-panel-w:           min(560px, calc(100vw - 32px));    /* the Braino panel */
  --nf-left-reach:        95px;                              /* legacy caption wings */
  --nf-right-reach:       95px;
  --nf-boot-color:        122, 162, 255;                     /* rgb triple: auth pulse, voice wake */
}
#notch-face .nf-pill { --nf-voice-level: 0; }                /* 0 to 1, your mic level */
```

Measured heights written by JS on the pill: `--nf-answer-short-height`, `--nf-answer-long-height`, `--nf-thinking-height`, `--nf-inline-height`, `--nf-yap-height`, `--nf-cmds-height`, `--nf-panel-height`, `--nf-meeting-height`. Others: `--nf-q-w` (quiet band width), `--aos-tint` (AffectiveOS colour), `--music-hue` / `--music-flash` (music light show), `--nf-mode-color` (Voice Command mode).

### Colour

```css
--coral:        #E8786E;               /* rgb 232,120,110. Braino: mouth, glow, sonar, caret */
--coral-light:  #F6A8A2;               /* think dots, coral gradient top */
--coral-hi:     rgb(240,149,140);      /* the bright hairline at the peak of listening */
--amber:        rgb(243,154,66);       /* only ever warms the top of a coral breath */
--boot-blue:    rgb(122,162,255);      /* waking, authenticating */
--mint:         #3DE8B2;               /* rgb 61,232,178. HERA / dictation, everywhere */
--voice-green:  rgb(160,230,190);      /* the inset glow that follows your voice */
--ok-green:     rgb(84,222,138);       /* auth ok, timer done flash */
--err-red:      rgb(255,92,92);        /* auth error */
--alarm:        rgb(255,170,60) + rgb(255,120,60);
--cowork-amber: #F3C56B;               /* privacy dot while Cowork watches */
--paper:        #f7f7f5;               /* bright text */
--pupil:        #1B1713;
--lid:          #F4E4DC;
--ear:          #E14A48;  --ear-lit: #ffb4ab;
--mouth-idle:   #7E2A24;
```

**Coral is never a fill.** It is a glow, a mouth, a ring stroke, a dot. The one exception is the face plate inside the open thinking sheet (`.nf-response-face`, `linear-gradient(168deg, #f6a8a2, #ee8b82 46%, #e8786e)`), which is him, not the shell.

**Amber never appears alone.** It warms the peak of `nfIslandBreath`, `nfThinkBreath` and `nfGreetGlow`, and nothing else.

### Ink ladder (white on black)

| Use | Colour |
|---|---|
| Unspoken word (karaoke) | `rgba(255,255,255,.28)` |
| Label state chip | `rgba(255,255,255,.36)` |
| Labels (`YOU SAID`, `BRAINO`) | `rgba(255,255,255,.56)` to `.6` |
| Long answer body | `rgba(255,255,255,.68)` |
| Your words, chips | `rgba(255,255,255,.72)` to `.84` |
| Spoken word | `rgba(255,255,255,.84)` |
| Short answer, headings, word being spoken | `#f7f7f5` / `#fff` |
| Hairline rules | `rgba(255,255,255,.08)` to `.09` |

### Type

| Element | Font |
|---|---|
| Labels (`.nf-inline-caption-label`, `.nf-answer-label`, short-row `small`) | `650 9px`, `letter-spacing .1em`, uppercase |
| State chip (`.nf-inline-caption-state`) | `600 9px`; while working `650 10.5px`, `.06em`, uppercase, shimmering |
| Your words (`.nf-inline-caption-text`) | `500 15px/1.35`, `-.012em`, clamp 6 lines |
| Your words, long (`.nf-inline-long`) | `16px/1.55`, `-.008em`, `.88` white |
| Thinking line in the caption | `600 17px` |
| Voice starting / ready line | `600 22px/1.2`, `-.02em`, tabular numbers |
| Typing field | `21px/1.28`, `-.012em` (in the grown typing bar: `19px/1.35`) |
| Short answer | `500 17px/1.38`, `-.014em`, `#f7f7f5`, clamp 7 lines |
| Long answer body | `500 17px/1.48`, `-.014em`, `.68` white |
| Long answer heading | `26px/1.08`, `#f7f7f5` |
| Done / Stop buttons | `650 9px/1` |
| Source chips | `500 10.5px/1.4`, `.01em` |
| Choice chips ("Which Riya?") | `500 14px/1` |
| Quiet band ears | `600 11px/1`, `.01em`, `.9` white |
| Quiet line | `500 14px/1.2`, `-.005em` |
| Ticker (`#nf-status`) | `ui-monospace, Menlo` 9px |

Body and short answers are the same 17px and differ only in leading and brightness: short answers are glanced at (tighter, brighter), long ones are read (airier, dimmer). Every text node in a sheet has `overflow-wrap: anywhere; word-break: break-word`, because his replies carry 90 character URLs.

### Fonts

```css
@font-face { font-family: "Braino SF Pro Display";
  src: url("../../../public/fonts/SF-Pro-Display-Medium.otf") format("opentype");
  font-weight: 500; font-display: swap; }
@font-face { font-family: "Braino SF Pro Display";
  src: url("../../../public/fonts/SF-Pro-Display-Semibold.otf") format("opentype");
  font-weight: 600; font-display: swap; }
```

Stack everywhere: `"Braino SF Pro Display", "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif`, with `font-synthesis: none`. Weight 650 resolves to the Semibold file. Sheets re-measure once `document.fonts.load('500 17px "Braino SF Pro Display"')` resolves, because the fallback wraps differently. (In the browser extension the `@font-face` must go in the document, not the shadow root; shadow roots cannot declare fonts and the failure is silent.)

---

## 5. Motion

Three families, and they mean different things.

```css
/* THE ISLAND SPRING. Apple's Dynamic Island curve. Every pill state change. */
0.55s cubic-bezier(0.32, 0.72, 0, 1)

/* EXPO OUT. Big reading surfaces opening (thinking, your words, yap). An object with mass. */
1050ms cubic-bezier(.22, 1, .36, 1)     /* radius 950ms, background 700ms, shadow 850ms */

/* THE ANSWER. Same family, faster, because a reply must land. */
width 420ms, height 280ms, border-radius 360ms   cubic-bezier(.22, 1, .36, 1)
background 180ms ease, box-shadow 240ms ease
```

Base transition on the pill:

```css
#notch-face .nf-pill {
  transition:
    width 0.55s cubic-bezier(0.32, 0.72, 0, 1),
    height 0.55s cubic-bezier(0.32, 0.72, 0, 1),
    transform 0.55s cubic-bezier(0.32, 0.72, 0, 1),
    border-radius 0.55s cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow 0.4s ease,
    filter 0.16s ease;
  transform-origin: top center;
  will-change: width, height, transform, border-radius;
}
```

`filter` is fastest on purpose: a tap (`.nf-press` sets `filter: brightness(1.16)`) should land, not swell. Never animate `transform` for tap feedback, and never animate `left`/`top`.

Other curves in use:

| Curve | Where |
|---|---|
| `cubic-bezier(.3,.9,.3,1)` 320ms width / 280ms height | the quiet band |
| `cubic-bezier(.32,.72,0,1)` .38s | drop box entering |
| `cubic-bezier(0.34,1.25,0.4,1)` 0.5s | face width (slight overshoot) |
| `cubic-bezier(0.16,1,0.3,1)` 1.15s | mode boots |
| `cubic-bezier(0.3,0.5,0.3,1)` 1.6s | the shine trace drawing |
| `cubic-bezier(.22,1,.36,1)` 360ms | sources and steps fading in |

---

## 6. The face

The face is a 120 x 56 SVG (`.nf-mini`), drawn **78px wide**, `margin-top: -4px`, inside `.nf-band`, which starts at `top: var(--nf-notch-h)`: the face hangs on the chin just below the housing. It shows only while he is home: `#notch-face.home:not(.music):not(.live) .nf-mini { display: block }`.

```html
<svg class="nf-mini" viewBox="0 0 120 56">
  <g class="nf-ears" opacity="0.32">
    <ellipse cx="38" cy="30" rx="8" ry="4.5" fill="#E14A48"/>
    <ellipse cx="82" cy="30" rx="8" ry="4.5" fill="#E14A48"/></g>
  <g id="nf-eye-l" class="nf-eye">
    <circle cx="49" cy="22" r="12" fill="#fff"/>
    <circle id="nf-pupil-l" cx="49" cy="22" r="6.2" fill="#1B1713"/>
    <circle id="nf-glint-l" cx="51.3" cy="19.3" r="2" fill="#fff"/></g>
  <g id="nf-eye-r" class="nf-eye">  <!-- same at cx 71, glint 73.3 --> </g>
  <path class="nf-lid" d="M 36 22 Q 49 28 62 22" stroke="#F4E4DC" stroke-width="2.6"/>
  <path class="nf-lid" d="M 58 22 Q 71 28 84 22" stroke="#F4E4DC" stroke-width="2.6"/>
  <path id="nf-mouth-idle"   d="M 52 41 Q 60 49 68 41" stroke="#7E2A24" stroke-width="2.6"/>
  <path id="nf-mouth-listen" d="M 55 43 Q 60 45 65 43" stroke="#E8786E" stroke-width="2.4" style="display:none"/>
  <ellipse id="nf-mouth-talk" cx="60" cy="43" rx="4.6" ry="3.2" fill="#E8786E" style="display:none"/>
</svg>
```

Behind it, `.nf-folds` (200 x 74, stretched) holds six coral brain folds (`#B34A41`, 2px, .55) with pale highlights (`#FBD9D2`, 1.1px, .5). They sit under the black cover and show only during the coral wake wave.

### Which parts show

| State | Eyes | Ears | Mouth |
|---|---|---|---|
| Idle | open, `scaleY(1)` | hidden | none |
| `.awake` (session or 30 min after last talk) | `scaleY(1.1)` | hidden | none |
| `.dozing` (home, idle 30 min+) | eyes fade out, lids fade in (0.5s) | hidden | none |
| `.listen` | `scaleY(1.06)` | `opacity .32` | `#nf-mouth-listen`, the small coral smile |
| `.speak` | open | `.32` | `#nf-mouth-talk`, animated |

```css
#notch-face:not(.listen):not(.speak) .nf-ears { opacity: 0; }
#notch-face:not(.listen):not(.speak) #nf-mouth-idle { display: none; }
#notch-face.listen #nf-mouth-listen { display: block !important; }
```

Idle is eyes only, in the black. The smile shows only while listening: the visual version of nodding along.

### Blink

JS adds `.blink` for 260ms at a random interval of **2.8 to 6.4s**, only while `.on`:

```js
nfBlinkTimer = setTimeout(() => {
  face.classList.add("blink");
  setTimeout(() => face.classList.remove("blink"), 260);
  nfScheduleBlink();
}, 2800 + Math.random() * 3600);
```
```css
#notch-face.blink .nf-eye { animation: nfBlink 0.22s ease-in-out; }
@keyframes nfBlink { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.12); } }
```

`0.12`, never `0`: an eye scaled to zero reads as a dropped frame.

### Wink (the boot greeting)

```css
#notch-face.nf-wink #nf-eye-r { animation: nfWink 0.6s ease-in-out 1; }
@keyframes nfWink { 0%, 100% { transform: scaleY(1); } 35%, 65% { transform: scaleY(0.08); } }
```

The held plateau from 35% to 65% is the whole difference between a blink and a wink.

### Gaze

Pupils move by rewriting SVG attributes, not CSS:

```js
pupilL.setAttribute("cx", 49 + offX); pupilL.setAttribute("cy", 21 + offY);
pupilR.setAttribute("cx", 71 + offX); pupilR.setAttribute("cy", 21 + offY);
glintL.setAttribute("cx", 50.9 + offX * 0.36); glintR.setAttribute("cx", 72.9 + offX * 0.36);
```

He looks around on his own and locks onto the cursor only within **200px** of the notch. While reading a caption, pupils shift `±2.8px` toward the words. While reading the screen (`.scanning`):

```css
animation: nfScanLook 2s ease-in-out infinite;
@keyframes nfScanLook {
  0%, 100% { transform: translateX(0); }
  22% { transform: translateX(-3.4px); }
  48% { transform: translateX(3.2px) translateY(-1.4px); }
  74% { transform: translateX(-1.6px) translateY(1.2px); }
}
```

Uneven on purpose. Evenly spaced keyframes look like a metronome.

### Lip sync

The mouth follows **audio status**, not the reply string. `setStatus("speaking")` sets `lastGlowStatus`, and `updateNotchFace` adds `.speak` when he is home and no answer sheet owns the notch:

```css
#notch-face.speak #nf-mouth-talk {
  display: block !important;
  transform-box: fill-box;          /* required, or it scales about the viewBox origin */
  transform-origin: center;
  animation: nfTalk 0.28s ease-in-out infinite;
}
@keyframes nfTalk { 0%, 100% { transform: scaleY(0.45); } 50% { transform: scaleY(1.25); } }
```

0.28s reads as speech without buzzing. It overshoots to 1.25 so it looks like talking, not closing. The voice bars (`.nf-viz`, `nfBars 0.7s`, 6 to 20px) stay off while speaking: two moving things on one face read as two voices.

There are two mouths on two bodies: this one and the walking mascot's. Clear both when speech is interrupted.

---

## 7. Every state, with its geometry

Radii read `0 0 X X`: square on top (joined to the housing), rounded at the bottom. `+N` means `calc(var(--nf-notch-h) + Npx)`.

### Resting and conversation

| Class | Width | Height | Radius | Motion |
|---|---|---|---|---|
| *(none)* idle | `--nf-notch-w` | `+22` | `0 0 16 16` | none. Pure black, exactly notch width |
| `.nf-tuck` (idle, pointer near the tab strip) | notch | `--nf-notch-h` | | shrinks into the housing; un-tucks 700ms after the pointer leaves |
| `.listen` | **250** | **`+44`** | `0 0 26 26` | `nfListenRadiate 1.9s` + sonar |
| `.speak` | **250** | **`+44`** | `0 0 26 26` | static `0 0 34px rgba(232,120,110,.5)` |
| `.nf-dictation.listen` (HERA) | 222 | `+28` | `0 0 18 18` | `nfYapModeRadiate 2.4s`, mint |
| `.busy` (working, no sheet) | 250 | `+26` | `0 0 20 20` | `nfAuthPulse 1.6s` |
| `.live` (ticker) | 260 | `+34` | `0 0 22 22` | `nfIslandBreath 3.8s` |
| `.music` | `notch-w + 92` | `+34` | `0 0 22 22` | JS-driven light show |
| `.launch-now-playing` | 310 | `+34` | `0 0 22 22` | none |
| `.alarming` | 340 | `+40` | `0 0 24 24` | `nfAlarmPulse 1.1s` |
| `.nf-auth` | 250 | `+44` | `0 0 26 26` | `nfAuthPulse 1.3s` |
| `.nf-mode-boot` / `.nf-monday-boot` | 250 | `+44` | `0 0 26 26` | 1.15s once |
| `.dropping` (file over the notch) | 360 | `+62` | `0 0 26 26` | |
| `.nf-drop` (tray / AirDrop) | 520 | `+112` | `0 0 30 30` | one size for every drop state |
| `.expanded` (tray) | 620 | `+134` (`+178` with shelf) | `0 0 30 30` | |
| `.nf-name-asleep` | 284 | `+30` | `0 0 20 20` | none (currently never set, see 9) |
| `.nf-hud-on.nf-hud-read` (the strip) | `100vw` | `+30` | `0 0 20 20` | |
| `.nf-boot-affective.nf-iomi-booting` | `max(notch-w + 130, 320)` | `+46` | `0 0 24 24` | |
| `.nf-iomi-expanded` (greeting) | 610 | 180 | `0 0 38 38` | |

**Listen and speak are the same box.** The shape does not change when the conversation turns around, only the light and the mouth. A shape change on every turn reads as the UI arguing with itself.

### Sheets

| Class | Width | Height | Min | Max | Radius |
|---|---|---|---|---|---|
| `.nf-thinking:not(.nf-think-open)` (chip) | `min(430, 100vw-32)` | 84 | | | `0 0 26 26` |
| `.nf-thinking.nf-think-open` | 580 | `--nf-thinking-height` (280) | 280 | `screen-h - 70` | `0 0 36 36` |
| `.nf-inline-open` (your words) | 480 | `--nf-inline-height` (136) | 136 | 300 | `0 0 32 32` |
| `.nf-inline-open.nf-inline-long` | 580 | same | | | |
| `.nf-typing` | 580 | `--nf-inline-height` (96) | | | sheet `inset: safe-top-2 0 0`, radius 30 |
| `.nf-answer-short` | 480 | `--nf-answer-short-height` (146) | 146 | 320 | `0 0 34 34` |
| `.nf-answer-long` | 580 | `--nf-answer-long-height` (520) | 164 | `screen-h - 90` | `0 0 38 38` |
| `.nf-yap-open` | `min(520, 100vw-32)` | `--nf-yap-height` (172) | 150 | 260 | `0 0 34 34` |
| `.nf-cmds-open` | `min(460, 100vw-32)` | `--nf-cmds-height` (240) | 150 | 380 | `0 0 34 34` |
| `.nf-panel-open` | 560 | `--nf-panel-height` (330) | 220 | `screen-h - 70` | `0 0 34 34` |
| `.nf-meeting-open` | 580 | `--nf-meeting-height` (300) | 200 | `screen-h - 70` | sheet `0 0 30 30` |
| `.nf-music-open` | `min(400, 100vw-32)` | `+162` | | | `0 0 34 34` |

Every measured height is also wrapped in `min(measured, calc(var(--nf-screen-h, 100vh) - 70px))`, or `- 90px` for answers. The clamp is not optional.

---

## 8. Listening

### `.listen`

```css
#notch-face.listen .nf-pill {
  width: 250px;
  height: calc(var(--nf-notch-h) + 44px);
  border-radius: 0 0 26px 26px;
  animation: nfListenRadiate 1.9s ease-in-out infinite;
}
@keyframes nfListenRadiate {
  0%, 100% { box-shadow: 0 0 0 1px rgba(232,120,110,.34), 0 0 18px 2px rgba(232,120,110,.30); }
  50%      { box-shadow: 0 0 0 1.6px rgba(240,149,140,.90), 0 0 38px 7px rgba(232,120,110,.62); }
}
```

Two shadows, always: a hairline ring that tightens the edge, and the bloom. Animating only the bloom looks like a lamp behind the notch rather than the notch being lit. 1.9s is the rhythm of the wake sequence, so listening feels like the same creature that just woke. A running Voice Command mode replaces the coral with its own colour: `0 0 0 1.5px var(--nf-mode-color), 0 0 30px -1px var(--nf-mode-color)`, no animation.

### The sonar

Three rings leave a point `10px` below the housing while the mic is open.

```css
#notch-face .nf-sonar i { width: 120px; height: 44px; border-radius: 999px; border: 1.5px solid #E8786E; }
#notch-face.listen .nf-sonar i { animation: nfSonar 2.4s ease-out infinite; }
#notch-face.listen .nf-sonar i:nth-child(2) { animation-delay: 0.8s; }
#notch-face.listen .nf-sonar i:nth-child(3) { animation-delay: 1.6s; }
@keyframes nfSonar {
  0%   { width: 120px; height: 44px;  opacity: 0.6; border-width: 2px; }
  100% { width: 340px; height: 150px; opacity: 0;   border-width: 0.5px; }
}
```

The border thins as it grows, so the ring dissolves instead of just fading. The sonar is hidden whenever a sheet, the panel, the meeting or the quiet band is open.

### The voice glow

While your voice is being heard (`.nf-voice-hearing`), a soft green light inside the edge follows your level. Inset only, so the shape never changes:

```css
#notch-face.nf-voice-hearing .nf-pill {
  box-shadow: inset 0 0 calc(3px + 12px * var(--nf-voice-level))
              rgba(160,230,190, calc(0.18 + 0.55 * var(--nf-voice-level)));
}
```

### HERA dictation listens differently

Not a conversation, so smaller, slower, dimmer and mint:

```css
#notch-face.nf-dictation.listen .nf-pill {
  width: 222px; height: calc(var(--nf-notch-h) + 28px); border-radius: 0 0 18px 18px;
  animation: nfYapModeRadiate 2.4s ease-in-out infinite;
}
@keyframes nfYapModeRadiate {
  0%, 100% { box-shadow: 0 0 0 1px rgba(61,232,178,.34), 0 0 9px 1px rgba(61,232,178,.2); }
  50%      { box-shadow: 0 0 0 1.2px rgba(145,255,220,.72), 0 0 17px 2px rgba(61,232,178,.34); }
}
/* sonar: mint, 1px, nfYapSonar 2.8s, two rings 1.4s apart */
@keyframes nfYapSonar { 0% { width:110px; height:30px; opacity:.28; } 100% { width:238px; height:76px; opacity:0; } }
```

While words stream into another app, the HERA surface (`.nf-yap-open`, 520 wide) shows them and the walker gets a small mint halo instead.

### From waking to your words: the inline sheet

All of these live in one sheet (`.nf-inline-open`, 480 wide, min 136, radius `0 0 32 32`), so nothing changes shape when your words arrive. The sheet's content uses `padding: var(--nf-content-top) 22px 12px` and fades in `opacity 260ms ease 80ms`, `transform translateY(-5px → 0) 620ms`.

| Class | Label · chip | Line |
|---|---|---|
| `.nf-voice-starting` | Voice · CONNECTING (shimmer) | `Go ahead, I'm listening` (HERA on) or `Connecting`, 22px/600 at 70% white. No countdown |
| `.nf-voice-ready` | Voice · ● LIVE (coral chip, pulsing dot) | `You can speak now`. Holds `VOICE_READY_HOLD_MS` = **2.4s** or until your words arrive |
| `.nf-inline-hera` | You're saying · ● HERA (mint) | your words, live, from on-device HERA |
| heard | You said · Live | your words |
| `.nf-inline-working` | You said · THINKING (shimmer `nfThinkShimmer 2.6s`) | your words stay for the whole job, with steps underneath |

Long speech: past `NF_INLINE_LONG_CHARS` = **110** characters the sheet takes the 580 width (latched until it closes, so it never jumps sideways mid sentence), 28px side padding, 16px/1.55 text. Past `NF_INLINE_MAX_CHARS` = **330** the text is trimmed from the front at a word, no "...", and the top line fades out with a mask. The newest words are always the ones in view.

Steps (`.nf-has-steps`): rows 27px tall under a hairline, room for three taken on the first step and then held, so the sheet grows once per job. The running row breathes (`nfStepBreathe 1.2s`), finished rows tick.

Your words stay on a working job for at most `NF_HEARD_MAX_WORKING_MS` = **15s**, then the compact thinking chip takes over.

---

## 9. Waking

### Control twice: the blue wake

`startVoiceWakeShimmer()` adds `.nf-shining .nf-shine-slow .nf-waking-voice`. The trace draws in blue around the sheet that is opening, and the whole face breathes blue. It clears the moment voice is live, or after **8s** at most.

```css
#notch-face.nf-waking-voice .nf-shine path { stroke: rgba(122,162,255,.95); }
#notch-face.nf-waking-voice { animation: nfVoiceWakeGlow 1.6s ease-in-out infinite; }
@keyframes nfVoiceWakeGlow {
  0%, 100% { box-shadow: 0 0 16px rgba(122,162,255,.30); }
  50%      { box-shadow: 0 0 34px rgba(122,162,255,.72); }
}
```

### His name: the gold trace

"Hey Braino" after a real sleep (60s+) uses the same call with `{ golden: true }`, which leaves out `.nf-waking-voice`, so the trace keeps its own gold to blue gradient. With `.nf-name-wake` it is stretched to the listening pill he is about to become:

```css
#notch-face.nf-name-wake .nf-shine { width: 250px; height: calc(var(--nf-notch-h) + 44px); opacity: 1; }
#notch-face.nf-name-wake .nf-shine path { vector-effect: non-scaling-stroke; animation-duration: 1.1s; }
```

### The trace itself

```html
<svg class="nf-shine" viewBox="0 0 190 55" preserveAspectRatio="none">
  <linearGradient id="nf-shine-grad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#F4CF87"/><stop offset=".42" stop-color="#EC8078"/>
    <stop offset=".7" stop-color="#DC77A8"/><stop offset="1" stop-color="#779CFF"/></linearGradient>
  <path class="nf-shine-glow" pathLength="100" d="M 0 0 H 190 V 39 Q 190 55 174 55 H 16 Q 0 55 0 39 Z"/>
  <path class="nf-shine-core" pathLength="100" d="(same)"/>
</svg>
```
```css
#notch-face .nf-shine-core { stroke-width: 2.2; }
#notch-face .nf-shine-glow { stroke-width: 7; opacity: .7; filter: blur(5px); }
#notch-face.nf-shining .nf-shine path {
  stroke-dasharray: 100; stroke-dashoffset: 100;
  animation: nfShineDraw 1.6s cubic-bezier(0.3, 0.5, 0.3, 1) forwards;
}
#notch-face.nf-shine-slow .nf-shine path { animation-duration: 1.35s; }
@keyframes nfShineDraw { to { stroke-dashoffset: 0; } }
```

`preserveAspectRatio="none"` lets any state size it: idle notch, the opening inline sheet (`.nf-voice-starting`: 480 x `min(inline-height, 300)`, growing on the 1050ms curve), the listening pill, or the quiet band. The top run hides behind the housing; only the sides and bottom catch the light. The old 90s idle shimmer is off, so the trace now means only a wake.

### Asleep, waiting for his name

When the wake word is armed with no session, or a named-mode session has its window shut, `.listen` is suppressed: no coral, no sonar. The privacy dot goes dim grey. Since 2026-10-11 there are **no words** while he waits (`showNameHint = false`, so `.nf-name-asleep` is never set): the hint widened the notch to 284px and sat on his eyes. Idle is just his eyes, in the smallest notch that shows them.

### Without subtitles: the edge pulse

In the AffectiveOS style (section 14), Control twice also pulses one thin line of the current tint around the very edge of the screen, once:

```css
#aos-ripple { position: fixed; inset: 0; z-index: 55; pointer-events: none; border-radius: 12px; opacity: 0; }
#aos-ripple.on { animation: aosPulse 1.3s ease-in-out forwards; }
@keyframes aosPulse {
  0%   { opacity: 0;   box-shadow: inset 0 0 0 0 var(--aos-ripple-color, #2f6bff); }
  35%  { opacity: .75; box-shadow: inset 0 0 0 2px var(--aos-ripple-color), inset 0 0 14px 2px var(--aos-ripple-color); }
  100% { opacity: 0;   box-shadow: inset 0 0 0 1px var(--aos-ripple-color), inset 0 0 8px 0 var(--aos-ripple-color); }
}
```

One colour (`--aos-tint` at that moment), not the rainbow ripple of the first version. JS restarts it with `classList.remove("on"); void el.offsetWidth; classList.add("on")`.

---

## 10. Thinking

### The chip (collapsed)

```css
#notch-face.nf-thinking:not(.nf-think-open) .nf-pill {
  width: min(430px, calc(100vw - 32px)); height: 84px; min-height: 0;
  border-radius: 0 0 26px 26px;
}
#notch-face.nf-thinking .nf-pill { pointer-events: auto; cursor: pointer;
  box-shadow: 0 0 20px rgba(232,120,110,.24); }
```

The chip (`.nf-think-chip`) sits centred at `top: calc(var(--nf-safe-top) + 6px)`, one word, `Thinking`, max 318px of text, shimmering:

```css
@keyframes nfThinkShimmer { from { background-position: 180% 0; } to { background-position: -80% 0; } }
```

The light band travels right to left and past both edges, so there is no visible start or stop. The shimmer is the only motion; the three bouncing dots are hidden on the chip. Click it (or the band) to open the sheet. While your words are on screen the chip is hidden and the inline sheet carries the state instead.

### The sheet (open)

`.nf-think-open`: 580 wide, at least 280 tall, radius `0 0 36 36`, on the slow 1050ms curve. It holds a coral face plate (`.nf-response-face`, folds and smile breathing with `nfFaceBreathe 3.4s`, the smile 0.4s behind), the head (`Braino is thinking`, the state word, Stop), the current line, and the trail of earlier steps. The chip moves to the bottom as a round "back up" button.

**Stop** (`.nf-thinking-stop`): right end of the head. Pill, 7 x 12 padding, 9px/650, `#ff9f97` on `rgba(255,120,110,.12)` with a `.34` coral hairline, `.22` on hover. Only in the open sheet, hidden on `.nf-think-complete` / `.nf-think-failed`. Same as saying "Braino, stop the task".

### Never stuck on thinking

Four layers make sure the sheet always comes down:

| Guard | Time | What it does |
|---|---|---|
| `nfSetThinking` auto clear | 6s, or **60s** (`NF_THINKING_STUCK_MS`) while main says a job runs | clears a caption nobody cleaned up |
| Sticky label expiry | **90s** (`NF_STICKY_THINKING_MAX_MS`), re-armed while still working | a Cowork or delegate label |
| Watchdog | **45s** up, checked every 5s | forces it down if no turn, speech, response or Cowork is in flight |
| `settleStaleThinkingStatus` | on every clear | resets a stale `thinking` status so the next frame does not rebuild the sheet |

A quiet stand-down (he decides not to answer) also settles the status, so the notch never hangs on thinking afterward.

---

## 11. The answer sheet

### Shedding the pill

When any sheet is open (thinking, inline, yap, answer, or exiting), the pill stops being a pill and hands its appearance to two pseudo-elements:

```css
#notch-face.nf-answer-open .nf-pill, /* …and the other sheet classes */ {
  overflow: visible; border: 0; background: transparent; box-shadow: none;
  backdrop-filter: none; clip-path: none; filter: none;
  transform: translateX(0); animation: none;
}
```

### `::before` is the sheet

```css
.nf-pill::before {
  content: ""; position: absolute; z-index: 0;
  inset: 0;                                   /* anchored at y = 0. Load-bearing. */
  border-radius: 0 0 28px 28px;
  background: linear-gradient(180deg, rgba(0,0,0,.99), rgba(8,8,8,.98));
  box-shadow: 0 24px 70px rgba(0,0,0,.46);
  pointer-events: none;
}
```

This began as `top: calc(var(--nf-safe-top) + 8px)` with a full 28px radius, which left 8px of desktop between the housing and the sheet: every answer read as a card hovering below the notch. No inset top hairline either: at `y = 0` it would draw a lit line across the top of the screen.

### `::after` is the housing patch

In idle, `::after` is the black cover over the whole pill (`inset: 0; background: #000; z-index: 2; transition: opacity .45s`), which the coral wake wave sweeps across. In a sheet it becomes the patch:

```css
.nf-pill::after {
  content: ""; position: absolute; z-index: 1;
  top: 0; left: 50%; transform: translateX(-50%);
  width: var(--nf-notch-w, 190px);
  height: calc(var(--nf-safe-top) + 24px);
  border-radius: 0 0 18px 18px;
  background: #000;
}
```

Pure black, exactly notch width, over the sheet where the housing is. The sheet's gradient is not quite `#000`, and without the patch you see the difference against the hardware.

### Timing

```css
#notch-face.nf-answer-open .nf-pill,
#notch-face.nf-answer-exiting .nf-pill,
#notch-face.nf-surface-exiting .nf-pill {
  transition: width 420ms cubic-bezier(.22,1,.36,1), height 280ms cubic-bezier(.22,1,.36,1),
              border-radius 360ms cubic-bezier(.22,1,.36,1), background 180ms ease, box-shadow 240ms ease;
}
```

A spoken line can be shorter than the 1050ms shell transition; on the slow curve the next sentence arrives while the sheet is still resizing for the last one. Height is faster than width (280 against 420) because depth is what the next line needs, and it reads as dropping rather than unfolding.

The content inside fades in after the shell: `.nf-answer-surface` goes `opacity 0 → 1` (420ms), `translateY(6px) → 0` (760ms), with a **320ms** delay.

### Short or long

From `notch-response.cjs`:

```js
const LONG_ANSWER_THRESHOLD = 100;     // characters
const isLong = options.rich || text.length >= 100 || text.includes("\n\n")
            || /^\s*(?:[-*+] |\d+[.)] )/m.test(text);   // a list
```

- **short**: 480 wide, min 146, max 320. Label `BRAINO`, the line, Done on the right. A remark.
- **long**: 580 wide, min 164, grows to `screen-h - 90`. Head with two dots and `Braino`, a scrolling article (hidden scrollbar), headings, bullets and numbered rows with white 22px number discs. Label `Answer from this page` when the frontmost app is a browser.

**One way only.** A short answer may become long while it streams; long never goes back. It is decided as it grows and never reclassified at the end, because a sheet that resizes under a sentence you are reading is worse than one that guessed slightly wrong. Clicking a short answer opens it as long. Markdown markers are stripped before display.

Height: long answers start from an estimate (`170 + ceil(chars / 68) * 26 + 10 per extra block`, clamped to 164 … screen - 90) and are re-measured on the next frame and at **140, 320 and 480ms**, plus once the font loads, because measuring during the 420ms width slide reads text wrapped into a narrow column.

### Karaoke

Each word is a `.nf-answer-word`. The written answer follows **audio playback**:

```js
const fraction = audio.duration > 0 ? audio.currentTime / audio.duration
                                    : Math.min(.98, (audio.currentTime * 2.75) / chunkWords);
paintNotchAnswer(chunkStart + Math.max(1, Math.floor(chunkWords * fraction)));   // every frame
```
```css
.nf-answer-word              { color: rgba(255,255,255,.28); transition: color 120ms ease, text-shadow 120ms ease; }
.nf-answer-word.spoken       { color: rgba(255,255,255,.84); }
.nf-answer-word.speaking-now { color: #fff; text-shadow: 0 0 9px rgba(255,255,255,.34); }
```

Without audio, an estimate runs at `chars * 58ms` (min 500ms). The long article scrolls the current word into view when it nears the edge.

### Streaming

The first token opens the sheet (`startNotchAnswer`). Every later token only sets the words and repaints (`updateNotchAnswerText`). Re-opening per token once logged 414 starts for 22 replies and tore the notch apart while it typed.

### Linger and exit

```js
long:  Math.max(7000, Math.min(15000, 5600 + chars * 18))
short: Math.max(3600, Math.min(6200, 3200 + chars * 18))
```

Then `clearNotchAnswer` adds `.nf-answer-exiting` for **460ms**, so the sheet keeps its shed-pill styling while it collapses. Without it `overflow`, `background` and `animation` snap back on frame one and the sheet flickers into a pill before shrinking. Measured height variables are removed so the next one-liner does not open at the last answer's height.

### Held for a reply

While a voice session is live and you start answering, the sheet does not close (`.nf-answer-reply`). Your words appear in it at `.58` white, `Listening` first, then `"your words"`; while he thinks they breathe (`nfReplyThink 1.6s`, opacity .55 to 1). His next answer replaces them in the same sheet, in the same short/long mode. Width never changes, only height eases. When his reply finishes inside a live session the sheet does not linger and fold: it goes straight into the hold with his words still in it. The hold releases only when the voice session ends (checked every 700ms, 1.5s after things go idle); outside a session it folds after a quiet moment. One shape for the whole conversation.

### Sources and articles

Web answers show source chips under the text, fading up one after another (`nfSrcIn 360ms`, delays 120ms then +140ms each). When the answer carries links, the first chip is **`Open the article`** (or `Open N articles`), white and bordered (`.nf-src-open`), and each site chip opens its own page; opened chips drop to 50%. Chips are pill shaped: `3px 9px`, `1px solid rgba(255,255,255,.16)`, `.72` white text, hover `rgba(255,255,255,.1)` with `.3` border. Short answers show them in the row, long answers below the article (`.nf-src-long`, 10px gap). They are measured with the text, so they never cause a jump. Research jobs do not offer them.

### Choices and approval

"Which Riya?": when main sends a `choose` approval for voice, up to three names appear as chips in the sheet body (`.nf-choice`, `500 14px`, `9px 14px` padding, `rgba(255,255,255,.08)` with `.18` border; the first has a `.42` border; a picked one turns white with `#111` text). Tapping is the same as saying it. Choices force the long sheet so it is measured with them, and they go when the question is answered or `cleared` arrives.

---

## 12. The ticker and live activities

When no sheet owns the notch, `#nf-status` (left slot) and `#nf-status-2` (right slot) carry what persists, iPhone island style. Priority, first two win:

1. `● REC m:ss` (meeting) or `● SCREEN m:ss`
2. a ringing alarm, `⏰ label · tap to stop`
3. a transient system event (charger, AirPods), 6s
4. a timer countdown, the stopwatch
5. an alarm within the hour
6. a calendar event within 15 min
7. WhatsApp `name · N new` (clears with WhatsApp in front, on tap, or after 10 min)
8. X stats, held files (`❐ N held`)
9. now playing

Any slot makes `.live` (260 x `+34`, breathing). Music alone becomes `.music`: artwork (26px, radius 7) on the left wing, a 5-bar EQ in the music hue on the right, the title in the chin. REC lives in the housing's ticker slot; the meeting itself opens as its own sheet (`.nf-meeting-open`, 580 wide) with a pulsing dot (`nfMeetingPulse 1.7s`) and a wave.

`.nf-flash` celebrates a finished timer: `nfFlash 0.65s × 4`, coral to green. The privacy dot (`.nf-privacy`) says who is listening: coral pulse when a cloud session is live, dim grey when only the on-device wake word is armed, amber when Cowork is watching, mint for HERA.

---

## 13. State machine

Two entry points own everything:

- **`setStatus(status, text)`** is called by the voice and task pipeline with one of `ready`, `connecting`, `listening`, `hearing`, `captured`, `thinking`, `speaking`. It stores `lastGlowStatus` and calls `updateNotchFace()`.
- **`updateNotchFace()`** recomputes every class from state. It is idempotent and called on any change plus a 1s tick while timers or badges exist.

The order of ownership inside `updateNotchFace`:

```js
const visible = notchFaceEnabled && !herMode;                         // .on
const answerOwnsNotch = visible && nfAnswerMode && has("nf-answer-open");
const sessionEngaged = dictationMode || realtimeActive || realtimeConnecting;
const voiceOwnsNotch = visible && walkerHome && sessionEngaged
  && ["connecting","listening","hearing","captured","speaking"].includes(lastGlowStatus);
const processingActive = !voiceOwnsNotch && (nfThinkingText || lastGlowStatus === "thinking");

if (voiceOwnsNotch) remove thinking classes;        // voice always beats a stale task
else if (processingActive) add("nf-thinking");

toggle("listen", walkerHome && !answerOwnsNotch && sessionEngaged && !namedAsleep
                 && (dictating || ["listening","hearing"].includes(lastGlowStatus)));
toggle("speak",  walkerHome && !answerOwnsNotch && lastGlowStatus === "speaking");
```

| Trigger | Who | Result |
|---|---|---|
| Control twice | hotkey in main → renderer | blue wake trace, `.nf-voice-starting` sheet, then `.nf-voice-ready`, then `.listen` |
| "Hey Braino" | on-device wake word | gold trace (after 60s+ asleep), then `.listen` |
| Your words | realtime transcript / HERA | inline sheet `You said` |
| A job starts | main (`hilTaskRunning`), Cowork label | `.nf-inline-working` or the thinking chip, `.busy` |
| First reply token | realtime / TTS | `startNotchAnswer` → `.nf-answer-open` + short/long |
| Audio plays | TTS audio element | `setStatus("speaking")` → `.speak`, karaoke ticks |
| Reply ends | audio `ended` | `finishNotchAnswer` → linger → exit |
| Command Option T | hotkey | `.nf-typing` (window becomes focusable; any blur closes it) |
| Option twice | hotkey | HERA dictation, `.nf-dictation` |
| Done, ✕, Escape | user | clear the sheet |
| Pointer near notch | main's zone poll | clicks turn on, `.nf-reveal` (stealth lifts) |

### Stability rules

- **Voice beats a task.** Listening or speaking collapses any open thinking sheet.
- **A sheet beats voice styling.** While an answer is open, `.listen` and `.speak` are not set; the sheet stays the shape.
- **One exchange, one shape.** Your words, thinking and his answer swap inside the open sheet (reply hold, latched long width, short only grows).
- **Things you are using are not stomped.** A background update never replaces an open answer, the typing field, the panel, a menu, sign in or a recording. In the Mac code this is enforced by the ownership order above and by surfaces that stand down only on their own clear call.
- **Clicks.** A plain click on the notch does nothing, except on the "You said" sheet, which dismisses it. While he works, a click opens the thinking sheet.

---

## 14. Notch styles: subtitles on, subtitles off

Settings › Notch has two styles. The Braino style is everything above. The **AffectiveOS style** (`.nf-aos` on `#notch-face`, `body.aos-notch`) is "without subtitles": you hear him, you never read him.

**`--aos-tint`** moves through seven colours, ten seconds each, easing into the next over the last two (painted every 150ms):

```js
const NF_AOS_SPECTRUM = [[8,41,255],[255,15,31],[5,217,89],[158,26,255],[255,107,5],[0,184,242],[255,20,140]];
const k = into > 0 ? (1 - Math.cos((into / 2) * Math.PI)) / 2 : 0;   // into = (t % 10) - 8
```

Once he is awake (boot, sign in, greeting and dropping play at full size), the notch is locked to the hardware:

```css
#notch-face.nf-aos:not(:is(.nf-iomi-booting, .nf-iomi-auth, .nf-iomi-awake, .nf-iomi-expanded,
  .nf-boot-affective, .nf-boot-logo-on, .nf-boot-sweeping, .nf-auth, .nf-greet, .dropping)) .nf-pill {
  width: var(--nf-notch-w, 190px) !important;
  height: var(--nf-notch-h, 32px) !important;
  max-height: var(--nf-notch-h, 32px) !important;
  border-radius: 0 0 11px 11px !important;
  box-shadow: none !important;
}
```

Captions, answers and sonar are hidden. The quiet band (section 15) draws over it, `--nf-notch-h + 6px` tall so the colour line sits just below the camera housing, with labels `Listening` + dot, a spinner + `Thinking`, a white dot + `Speaking`. The line on its bottom edge:

```css
.nf-q::after {
  left: 16px; right: 16px; bottom: 0; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, var(--aos-tint) 18%, #fff 50%, var(--aos-tint) 82%, transparent);
  background-size: 200% 100%;
  box-shadow: 0 0 10px 1px var(--aos-tint);
}
/* speaking: nfNsBreathe 1.1s (opacity .55 ↔ 1). working: nfNsSweep 1.4s linear (background slides) */
```

The walking mascot is hidden while this style is on, the thinking canvas and chip never show, and the wake also pulses the screen edge once (section 9). Outside the size lock, `.nf-aos` swaps the `BRAINO` wordmark for the Affective logo (11px, 13px in the long head), lights a band on the island's lower edge (`.nf-aos-band`, 3px, 12% inset, `blur(1.5px)`, `0 0 18px 4px` tint glow) and orbits light around it while thinking (`nfAosSpin 1.8s linear`, via an animated `@property --aos-spin`).

---

## 15. The quiet notch and stealth

### Quiet notch

Off by default (`localStorage.brainoQuietNotch = "1"` turns it on). Always used by the AffectiveOS style. A layer (`.nf-q`) over the full surfaces, which keep running underneath with `visibility: hidden` and take over whenever something is opened on purpose (think-open, More, panel, typing, dictation, meeting, music, cmds, alarm, live ticker, boot, auth, greeting, drop).

| Quiet state | Size | Left ear | Right ear | Below the bar |
|---|---|---|---|---|
| `nfq-listen` | `notch-w + 80 + 80` x notch h | `Listening` | coral dot (`nfqPulse 1.6s`) | nothing |
| `nfq-asleep` | same | `Listening` | grey dot | nothing |
| `nfq-starting` | same | `Connecting` | grey dot | nothing |
| `nfq-work` | same, click opens steps | amber bar (`nfqShimmer 1.4s`, 30 x 8) | `Step N` mono 10.5px | nothing |
| `nfq-speak` | same | white dot (`nfqPulse 0.9s`) | his name | nothing |
| `nfq-heard` + `nfq-line` | `max(band, 420)` x `notch h + 38` | `You said` | coral dot | one line, **2.2s** |
| `nfq-answer` + `nfq-line` | same | white dot while speaking | his name | one line, ✕, `More` when it does not fit |

Ears are 80pt because the housing hides the middle of the band. Ears sit 13px from each edge. The line is trimmed from the front by **measured** width (canvas `measureText`), with a 22px left fade. Band: `width 320ms / height 280ms cubic-bezier(.3,.9,.3,1)`, radius `0 0 14 14` (`0 0 20 20` with a line). Only the band and real buttons take the pointer; the line lets clicks through, and main is asked for just the band as the zone.

### Stealth

Off by default (`localStorage.brainoStealth`). Everything in the notch sits at `opacity: .01` (180ms), back to full under `.nf-reveal` (pointer in main's zone) and on anything you opened or anything going wrong: `nf-think-open`, `nf-panel-open`, `nf-music-open`, `expanded`, `nf-typing`, `nf-yap-open`, `nf-meeting-open`, `nf-cmds-open`, `alarming`, `nf-auth-err`, `nf-think-failed`.

---

## 16. Boot and greeting

1. **Affective boot** (`.nf-boot-affective.nf-iomi-booting`): pill `max(notch-w + 130, 320)` x `+46`, the Affective logo, a coral sweep (`nfBootCoralSweep .95s`), then the word fades (`nfBootWordFade 1.3s`). The face, folds, ticker and privacy dot are hidden; the trace shows at .48.
2. **Auth** (`.nf-auth`): 250 x `+44`, `nfAuthPulse 1.3s` in boot blue. `.nf-auth-ok` → `0 0 30px rgba(84,222,138,.75)`, `.nf-auth-err` → `0 0 30px rgba(255,92,92,.75)`.
3. **Coral wave** (`.nf-coral`): a transparent band crosses the black cover left to right and his coral folds show through: `nfCoralWave 0.7s cubic-bezier(.4,.1,.4,1)`, `background-size 300%`, `100% → 0%`.
4. **Wink** and **greet glow**:

```css
#notch-face.nf-greet .nf-pill { animation: nfGreetGlow 1.1s ease-out 1; }
@keyframes nfGreetGlow {
  0%   { box-shadow: 0 0 0 rgba(232,120,110,0); }
  30%  { box-shadow: 0 0 34px rgba(232,120,110,.85), 0 0 60px rgba(243,154,66,.4); }
  100% { box-shadow: 0 0 12px rgba(232,120,110,.16), 0 0 26px rgba(232,120,110,.07); }
}
```

The peak is at 30%, not 50%: it flares early and settles slowly, the shape of something arriving. It ends exactly on the resting values of `nfIslandBreath`, so the hand off has no seam.

5. **Greeting card** (`.nf-iomi-expanded`): 610 x 180, radius `0 0 38 38`, "Good evening, Name. Everything is ready." with the wake guide (`Control Control`, `⌘ ⌘ bring me out`). Letters and words stagger in (`nfIomiLetterIn .4s`, `nfIomiGreetingWord .52s`). Then he says one line ("Name, press Control twice whenever you want me.") and stays awake, mic off.

---

## 17. Edge light

`#edge-glow` is a fixed, click-through layer over the whole screen (`z-index 54`, `opacity 0.6s`). Voice states no longer use it: they live entirely in the notch. It is now only:

- **`.music`**: the light show while music plays.
- **`.voicemode`**: a running Voice Command mode wears its colour (`--vm-color`, default `#0A84FF`) around the screen edge, `edgeBreath 3.2s`.

The listen / speak / think rules are still in the CSS (blue breath 2.6s, coral pulse 1s, dim blue 3.4s) but JS never sets them. The AffectiveOS wake pulse is a separate layer, `#aos-ripple` (section 9).

---

## 18. Accessibility and reduced motion

- `#notch-face` has `aria-label="Braino status"`. The thinking canvas and answer surface are `aria-live="polite"`, as is the quiet band. Decorative SVGs are `aria-hidden`.
- Every control is a real `<button>` with a label (`Stop the task`, `Show what Braino is thinking`, `Dismiss`). The mouse focus ring is removed with `:focus:not(:focus-visible)`; keyboard focus keeps it. Quiet band buttons get `outline: 2px solid #e8786e; outline-offset: 2px`.
- **`prefers-reduced-motion: reduce`** is handled per effect, and every looping animation has an override. The rule is: keep the state readable, drop the loop. Examples:

```css
@media (prefers-reduced-motion: reduce) {
  #notch-face.listen .nf-pill { animation: none;
    box-shadow: 0 0 0 1.4px rgba(232,120,110,.7), 0 0 22px 3px rgba(232,120,110,.4); }
  #notch-face.listen .nf-sonar i { animation: none; opacity: .4; }
  #notch-face.nf-voice-hearing .nf-pill { box-shadow: inset 0 0 6px rgba(160,230,190,.45); }
  #notch-face.nf-waking-voice { animation: none; }
  #aos-ripple.on { animation-duration: .8s; }
}
```

  Shimmers fall back to solid text colour, scan looks stop, source chips appear without the rise.

---

## 19. Dark and light

The notch has **no light theme and does not follow `prefers-color-scheme`**. It is black because the hardware is black; a light notch would show the housing as a hole. Text is always white on black. The page background is `transparent` and `body` has `pointer-events: none`.

There is no glass theme on the Mac notch. (The extension had an opt-in `.glass` for external displays; it is not part of this system. `renderer/glass.css` styles the app windows only.) On a display without a notch, the same black pill floats with rounded tops (section 2).

---

## 20. Every animation

| Name | Duration | Easing | What |
|---|---|---|---|
| `nfListenRadiate` | 1.9s | ease-in-out | he is hearing you |
| `nfSonar` | 2.4s, 3 rings 0.8s apart | ease-out | rings while the mic is open |
| `nfYapModeRadiate` | 2.4s | ease-in-out | HERA listening |
| `nfYapSonar` | 2.8s, 2 rings 1.4s apart | ease-out | HERA rings |
| `nfTalk` | 0.28s | ease-in-out | the mouth |
| `nfBlink` | 0.22s, every 2.8 to 6.4s | ease-in-out | eyelid |
| `nfWink` | 0.6s once | ease-in-out | right eye, with a plateau |
| `nfScanLook` | 2s | ease-in-out | eyes reading the screen |
| `nfIslandBreath` | 3.8s | ease-in-out | `.live` ticker |
| `nfThinkShimmer` | 2.6s (caption chip), 2.8s, 3.4s (face sweep) | linear | light across text |
| `nfThinkDot` | 1.1s, 0.16s steps | ease-in-out | three dots (open sheet) |
| `nfThinkingLive` | 1.45s | ease-in-out | live marker |
| `nfThinkBreath` | defined | | coral into amber (kept for ports) |
| `nfFaceBreathe` | 3.4s | ease-in-out | thinking face folds and smile |
| `nfReplyThink` | 1.6s | ease-in-out | your words while he thinks, reply hold |
| `nfStepIn` / `nfStepBreathe` | 360ms / 1.2s | `(.22,1,.36,1)` / ease-in-out | job steps |
| `nfSrcIn` | 360ms | `(.22,1,.36,1)` | source chips |
| `nfVoiceWakeGlow` | 1.6s | ease-in-out | blue wake |
| `nfShineDraw` | 1.6s (1.35s slow, 1.1s name, 1.15s Monday) | `(0.3,0.5,0.3,1)` | the trace |
| `aosPulse` | 1.3s once | ease-in-out | AffectiveOS edge pulse |
| `nfNsBreathe` / `nfNsSweep` | 1.1s / 1.4s | ease-in-out / linear | AffectiveOS colour line |
| `nfAosSpin` | 1.8s | linear | light orbiting while thinking |
| `nfqPulse` | 1.6s (dot), 0.9s (speak) | ease-in-out | quiet band |
| `nfqShimmer` | 1.4s | linear | quiet band working |
| `nfAuthPulse` | 1.3s auth, 1.6s busy | ease-in-out | `--nf-boot-color` |
| `nfAlarmPulse` | 1.1s | ease-in-out | alarms, fastest pulse |
| `nfGreetGlow` | 1.1s once | ease-out | morning arrival |
| `nfCoralWave` | 0.7s once | `(0.4,0.1,0.4,1)` | coral reveal on wake |
| `nfBootCoralSweep` / `nfBootWordFade` | .95s / 1.3s | `(.45,0,.2,1)` / `(.4,0,.2,1)` | Affective boot |
| `nfIomiLetterIn` / `nfIomiGreetingWord` | .4s / .52s | `(.2,.7,.2,1)` / `(.2,.75,.2,1)` | greeting text |
| `nfIomiPerimeterBreathe` | 2.8s | ease-in-out | greeting card |
| `nfIomiWalkerJump` | 1.25s | `(.18,.75,.25,1)` | mascot leaving the notch |
| `nfWalkerJumpIn` | .62s | `(.5,0,.75,.2)` | mascot jumping back in |
| `nfModeBoot` / `nfMondayBoot` | 1.15s once | `(0.16,1,0.3,1)` | mode entry |
| `nfMeetingPulse` | 1.7s | ease-in-out | REC dot, shrinks as it dims |
| `nfMeetingWave` | 900ms | ease-in-out | meeting wave |
| `nfBars` | 0.7s (voice), 0.72s (music EQ) | ease-in-out | bars 6 ↔ 20px |
| `nfArrowBob` | 1.6s | ease-in-out | 2px along its own 45° diagonal |
| `nfMarquee` | 7s alternate | ease-in-out | overflowing ticker line |
| `nfFlash` | 0.65s × 4 | ease-in-out | timer done, coral to green |
| `nfPrivacyPulse` | 2.2s | ease-in-out | privacy dot |
| `nfHeraNameShimmer` | 3.4s | linear | HERA wordmark |
| `nfTaskBreathe` | 2.8s | ease-in-out | task island |
| `nfBrainelleBreathe` | 3.6s | ease-in-out | Brainelle's ambient |
| `nfMondayShimmerBreathe` | 2.6s | ease-in-out | Monday trace glow |
| `nfFlowTravel` | 1.1s | linear | flow indicators |

---

## 21. Porting checklist

Build in this order. Each step should look right before the next.

1. **The window.** Transparent, full display bounds starting at the true top of the screen (above the menu bar), above everything including fullscreen apps, on every Space, click-through with forwarding, not focusable. Measure the housing (width = screen width minus the two auxiliary top areas; height = top safe-area inset) and pass it in.
2. **The pill and idle.** Exactly notch width, `notch-h + 22` tall, radius `0 0 16 16`, pure `#000`, no animation, centred at `y = 0`. If you can see the seam with the hardware, stop and fix it.
3. **No-notch fallback.** Full 16px radius, sheets inset 8px with their own top.
4. **The face.** 120 x 56 SVG at 78px on the chin. Blink to `0.12` at random 2.8 to 6.4s. Gaze by moving pupils. Ears and mouths hidden at rest.
5. **`.listen` and `.speak`.** Same 250 x `+44` box, different light. Two-shadow radiate at 1.9s, three sonar rings, the smile. Static glow and the 0.28s mouth, driven by audio status.
6. **The sheet split.** Shed the pill; `::before` at `inset: 0`, `::after` notch-width black patch; 420/280ms answer timing; 1050ms for other sheets; the exiting class for 460ms.
7. **Inline sheet.** Connecting, ready (2.4s), your words, working; 110 char wide latch; 330 char front trim with fade.
8. **Answers.** Short/long at 100 chars or structure; grow-only; re-measure at 140/320/480ms and on font load; karaoke from audio time; linger formula; reply hold.
9. **Thinking.** 430 x 84 chip with shimmer; 580 sheet with Stop; all four stuck guards.
10. **Click zone.** Cursor poll, collapsed and expanded zones, expiry on silence.
11. **Wake.** Trace SVG with `preserveAspectRatio="none"`, blue for the hotkey, gold for his name.
12. **Ticker, quiet notch, AffectiveOS style, stealth, boot.** In that order.
13. **Reduced motion.** An override for every loop.

### Traps

- **Never tint the pill background** in a state class. Coral leaks through beside the housing.
- **`inset: 0` on the sheet.** Any top offset turns the island into a floating card.
- **`transform-box: fill-box`** on the talking mouth, or it scales about the viewBox origin.
- **Blink to `0.12`, not `0`.**
- **Height faster than width** on the answer, or it unfolds instead of dropping.
- **Keep the exiting classes**, or the sheet flickers back into a pill before collapsing.
- **Clamp every measured height** against the display height, not `100vh` of the window.
- **Measure after the width settles and the font loads**, or a three-line answer reads as 350px tall.
- **Open once, then append.** Re-opening the sheet per streamed token tears it apart.
- **Never reclassify long back to short.** Grow only.
- **Re-state the click zone** continuously; forget it on silence.
- **Two mouths.** The notch and the mascot. Clear both when speech stops.
- **Do not animate `left`/`top`**, and never `transform` for tap feedback. Width, height, transform and border-radius only.
- **The font face goes in the document** if you render inside a shadow root.
