Yes. Here's my understanding:

Reference (DO NOT TOUCH): The floating brain SVG — the dark glassmorphic chat widget that pops up when you click the brain on a normal web page. Dark rgba(18,14,10,0.78) card, white text, coral send button, pill input bar, blur/saturate backdrop. This is the finished product.




# Braino — Brain Character Design Reference

> Exact reproduction guide for the brain mascot. Give this file to any Claude instance and it should build the identical character.
>
> **Last updated:** 2026-05-27

---

## 1. Character Overview

A cartoon brain character with:
- Rounded, organic brain-lobe body
- Two side arms with circular "fists"
- Brain stem and cerebellum hanging below
- Two eyes with trackable pupils + white highlight
- Pink cheek blushes
- A curved smile
- Dark-red gyri (brain fold lines) on the body
- White sticker-style outline behind everything

---

## 2. Color Palette (brain only)

| Part | Value | Role |
|---|---|---|
| Body top | `#F6A8A2` | Light coral |
| Body mid | `#E8786E` | Main coral |
| Body bottom | `#C9544A` | Deep coral |
| Dark parts top | `#D9645A` | Cerebellum / stem top |
| Dark parts bottom | `#9C3E36` | Cerebellum / stem bottom |
| Glow overlay | `#FFD0CB` at 0.7→0 opacity | Specular highlight on body |
| Gyri strokes | `#8A2F28` | Brain fold lines |
| Eyes (sclera) | `white` | |
| Iris / pupil | `#1B1713` | Near-black |
| Pupil highlight | `white` | 1.1px dot |
| Cheeks | `#E14A48` at 35% opacity | Pink blush |
| Smile | `#1B1713` | |
| Outline | `white` | Sticker effect |

---

## 3. SVG Gradients

```xml
<!-- Body fill: top-to-bottom linear -->
<linearGradient id="bm-fill" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0"    stop-color="#F6A8A2" />
  <stop offset="0.55" stop-color="#E8786E" />
  <stop offset="1"    stop-color="#C9544A" />
</linearGradient>

<!-- Cerebellum + stem: darker top-to-bottom linear -->
<linearGradient id="bm-dark" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#D9645A" />
  <stop offset="1" stop-color="#9C3E36" />
</linearGradient>

<!-- Specular glow overlay: radial from top-left -->
<radialGradient id="bm-glow" cx="35%" cy="30%" r="50%">
  <stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7" />
  <stop offset="1" stop-color="#FFD0CB" stop-opacity="0" />
</radialGradient>
```

---

## 4. Complete Static SVG (100×100 viewBox)

This is the canonical character shape used in the favicon and anywhere a static brain is needed.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="f-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"    stop-color="#F6A8A2"/>
      <stop offset="0.55" stop-color="#E8786E"/>
      <stop offset="1"    stop-color="#C9544A"/>
    </linearGradient>
    <linearGradient id="f-dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#D9645A"/>
      <stop offset="1" stop-color="#9C3E36"/>
    </linearGradient>
    <radialGradient id="f-glow" cx="35%" cy="30%" r="50%">
      <stop offset="0" stop-color="#FFD0CB" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#FFD0CB" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- White sticker outline (drawn first, behind everything) -->
  <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white"/>
  <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white"/>
  <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/>
  <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" stroke-width="9" stroke-linecap="round"/>
  <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="white" transform="scale(1.08) translate(-3.7, -3.7)"/>

  <!-- Brain stem -->
  <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#f-dark)"/>

  <!-- Cerebellum -->
  <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#f-dark)"/>
  <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>
  <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/>

  <!-- Main brain body — coral fill -->
  <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="url(#f-fill)"/>

  <!-- Main brain body — specular glow overlay -->
  <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
        fill="url(#f-glow)"/>

  <!-- Gyri (brain fold lines) — 3 vertical paths, dark reddish strokes -->
  <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78"
        fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/>
  <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72"
        fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/>
  <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72"
        fill="none" stroke="#8A2F28" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/>

  <!-- Left arm + fist -->
  <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#f-fill)" stroke-width="6" stroke-linecap="round"/>
  <circle cx="6" cy="63" r="5.5" fill="url(#f-fill)"/>

  <!-- Right arm + fist -->
  <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#f-fill)" stroke-width="6" stroke-linecap="round"/>
  <circle cx="94" cy="63" r="5.5" fill="url(#f-fill)"/>

  <!-- Left eye: sclera, iris, highlight -->
  <circle cx="38" cy="48" r="6.5" fill="white"/>
  <circle cx="38" cy="48" r="3.2" fill="#1B1713"/>
  <circle cx="39" cy="46.6" r="1.1" fill="white"/>

  <!-- Right eye: sclera, iris, highlight -->
  <circle cx="62" cy="48" r="6.5" fill="white"/>
  <circle cx="62" cy="48" r="3.2" fill="#1B1713"/>
  <circle cx="63" cy="46.6" r="1.1" fill="white"/>

  <!-- Cheek blushes -->
  <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>
  <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35"/>

  <!-- Smile -->
  <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" stroke-width="1.8" stroke-linecap="round"/>
</svg>
```

---

## 5. Interactive Mascot (React) — Physics Constants

Used in `BrainMascot.tsx`. The SVG is identical to above but pupils move dynamically.

| Constant | Value | What it does |
|---|---|---|
| Size | `56px` | Rendered width × height |
| `GRAV` | `0.42` | Gravity per frame |
| `FRIC` | `0.91` | Air friction |
| `BOUNCE` | `0.5` | Floor bounce coefficient |
| `WALK_SPD` | `3.2` | Walk speed px/frame |
| `MAX_PUPIL` | `1.6` | Max pupil travel offset (cursor tracking) |
| `FLOOR_PAD` | `18px` | Gap from bottom of viewport |

**Drop shadow (CSS filter):**
- Resting: `drop-shadow(0 5px 14px rgba(0,0,0,0.24))`
- Chat open (glowing): `drop-shadow(0 0 18px rgba(232,120,110,0.65)) drop-shadow(0 5px 14px rgba(0,0,0,0.24))`
- Being dragged: `drop-shadow(0 18px 36px rgba(0,0,0,0.42))`

**Dynamic pupil offset:** pupils track the mouse cursor up to `MAX_PUPIL` px. Left-eye offset = `(pl.x, pl.y)`, right-eye = `(pr.x, pr.y)`. When mascot faces left, x-offset flips sign.

**Arm rotation angles (degrees):**
- Idle: `sin(phase * 0.9) * 11` — slow gentle sway, left/right out of phase by π
- Walking: `sin(phase) * 26` — active swing, alternating
- Flying/thrown: `sin(phase * 0.8 ± 0.8) * 20` — mid-air spread
- Being dragged: left `-18°`, right `+18°` — raised arms

**Squish on landing:** on floor impact, `scaleY` drops to `max(0.65, 1 - impact * 0.045)`, then springs back with damped oscillation.

---

## 6. Interactive Mascot — Extra Gyri Paths (React only)

The React BrainMascot adds two extra subtle gyri paths (opacity 0.4) that the static favicon omits:

```svg
<path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74"
      fill="none" stroke="#8A2F28" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
<path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74"
      fill="none" stroke="#8A2F28" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
```

Also adds a third cerebellum fold line:
```svg
<path d="M 64 77 Q 70 79 76 77" fill="none" stroke="#8A2F28" stroke-width="0.9" stroke-linecap="round" opacity="0.5"/>
```

---

## 7. Mascot Chat Widget

The widget that opens when clicking the brain. Dark glassmorphism style — intentionally contrasts with the light cream product UI.

### Response card

```
width: 360px  (max: calc(100vw - 108px))
border-radius: 22px
background: rgba(18, 14, 10, 0.78)
border: 1px solid rgba(255, 255, 255, 0.14)
box-shadow: 0 40px 100px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.22)
backdrop-filter: blur(40px) saturate(180%)
color: #fff
animation: brainoCardIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
```

User message bubble (inside card):
```
background: rgba(255,255,255,0.12)
border: 1px solid rgba(255,255,255,0.18)
border-radius: 14px
padding: 9px 14px
font-size: 13px
color: rgba(255,255,255,0.88)
```

Braino reply text:
```
font-size: 14.5px
line-height: 1.72
color: rgba(255,255,255,0.92)
font-family: Inter, -apple-system, sans-serif
```

Hint footer text:
```
font-family: JetBrains Mono
font-size: 9.5px
color: rgba(255,255,255,0.28)
letter-spacing: 0.02em
content: "Try: play lo-fi · tell me a joke · celebrate"
```

### Pill input bar

```
background: rgba(18, 14, 10, 0.82)
border-radius: 100px
padding: 7px 7px 7px 18px
border: 1px solid rgba(255,255,255,0.16)
box-shadow: 0 8px 28px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.18)
width: 320px  (max: calc(100vw - 108px))
backdrop-filter: blur(40px) saturate(180%)
animation: brainoPillIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)
```

Input text:
```
font-size: 14px
color: rgba(255,255,255,0.88)
letter-spacing: -0.01em
placeholder: "What's on your mind?"
```

Mode chip (inside pill):
```
background: rgba(255,255,255,0.1)
border-radius: 8px
padding: 4px 8px 4px 9px
font-size: 11px  font-weight: 600
color: rgba(255,255,255,0.6)
label: "⚡ Auto"  + small chevron
```

Send button:
```
width: 32px  height: 32px  border-radius: 50%
Active:   background #E8786E,  color white
Disabled: background rgba(255,255,255,0.1),  color rgba(255,255,255,0.3)
icon: up-arrow SVG 14×14
```

---

## 8. Animations (brain/mascot specific)

```css
/* Mascot chat card entry */
@keyframes brainoCardIn {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Mascot pill input entry */
@keyframes brainoPillIn {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Typing dots inside card */
@keyframes brainoDot {
  0%, 60%, 100% { transform: translateY(0);   opacity: 0.35; }
  30%            { transform: translateY(-5px); opacity: 1; }
}
/* 3 dots, stagger: 0s / 0.2s / 0.4s */

/* Confetti on celebrate command */
@keyframes brainoConfettiFall {
  0%   { transform: translateY(0) rotateZ(0deg);    opacity: 1; }
  100% { transform: translateY(110vh) rotateZ(720deg); opacity: 0; }
}
/* Colors: #E8786E #F6A8A2 #F7B26B #6BD4A0 #7BB2F7 #F7E26B #C9544A */
/* 75 particles, size 6–15px, duration 1.4–3s, delay 0–0.7s, cleaned up after 4.5s */
```

---

## 9. Orange Orb (simplified brain representation)

Used in the product UI wherever a full character isn't needed (loading states, voice mode, empty state, header mark). This is NOT the brain character — it's a simpler brand element.

```css
/* Standard orb (22–96px, scale as needed) */
background: radial-gradient(circle at 35% 35%, #FFD9A8 0%, #F39A42 45%, #D96E1A 80%);
box-shadow: 0 0 40px rgba(243,154,66,0.4), inset 0 -12px 24px rgba(160,60,10,0.25);
border-radius: 50%;
animation: orbBreathe 4.2s ease-in-out infinite;

@keyframes orbBreathe {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}
```

The large voice-mode orb (180px) uses a slightly different gradient for more depth:
```css
background: radial-gradient(circle at 33% 30%, #FFE0B0 0%, #F7A84A 40%, #E07820 72%, #C05810 100%);
box-shadow: 0 0 80px rgba(243,154,66,0.55), 0 0 160px rgba(243,154,66,0.22), inset 0 -20px 40px rgba(140,50,5,0.22);
```

## 10. Kinetic Typography — Match Cut (verbatim definition, reuse in every teaser)

Established across `/notch` and `/aware` (`src/pages/NotchTeaser.tsx` + `notch-teaser.css`, `src/pages/EmotionTeaser.tsx` + `emotion-teaser.css`). Use this exact definition for any future kinetic-type video — don't reinvent it per page.

**The stomp (base word reveal, every word, every video):**
A word does not fade or slide in. It HITS at full size instantly, with a hot brightness flash that decays — like a stamp striking paper. Zero motion, zero scale change. This is the baseline for every single word in the film, no exceptions, no "softer" variant for slower/breathier scenes — pacing (word-to-word timing) and reveal style (the stomp) are two separate knobs; slowing a scene down means widening the GAP/SW timing constants, never swapping out the stomp animation for a fade.

```css
.word.in { display: inline-block; animation: wordIn .16s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes wordIn {
  0%   { opacity: 1; filter: brightness(2.2); text-shadow: 0 0 22px rgba(255,255,255,.9); }
  100% { opacity: 1; filter: brightness(1); text-shadow: none; }
}
```

**The match cut (the escalation — a stomp big enough to flip the whole frame):**
A match cut is the moment a word/phrase landing is important enough that the ENTIRE FRAME inverts (bg ↔ text color swap) on that exact landing, instead of just the word itself flashing. It reads as a hard camera cut, not a text animation.

Three ingredients, always together:
1. **Full-frame invert overlay** — a fixed `inset: 0` div, `opacity: 0` by default, flips to `opacity: 1` bg-colored-as-text the instant the target word/phrase lands, `pointer-events: none`, sits above the text (`z-index: 9`+). The scene's own text color also flips (to the page's base bg color) so text stays legible against the inverted background.
2. **No animation during the flip** — the stomp's brightness-flash is suppressed while a match-cut is active, globally: `.invert-flash .word.in { animation: none !important; }`. The invert flip itself IS the effect; a competing stamp-flash on top of it reads as two effects fighting, not one clean cut.
3. **Ring-burst graphic** — 2–3 concentric circles centered on the frame, expanding + fading out (`scale(1)` → `scale(48)`, `opacity: .9` → `0`, ~0.85s, staggered ~90ms per ring), fired once per match-cut landing (guard with a `fired*` boolean so it only bursts once per landing, not every frame).

**Landing detection** (self-bounding, no separate timer): read the kinetic engine's own cache — `seqIdx.get(host) === targetPhraseIndex && kinCache.get(host)?.last === lastWordIndexOfThatPhrase`. This is automatically false again the instant the NEXT phrase starts (seqIdx moves on), so it can never latch stuck — no manual time-window math needed.

**Fused match cuts** — when the cut lands on a fused two-part word (e.g. "Hu" + "+man." → "Human"), the `+` fuse convention IS the match cut: the word only completes (and the invert fires) once both parts have landed. This is the cleanest version of the effect — the reveal and the cut are the same beat, not two separate mechanics glued together.

**Rule of use:** not every scene is a match cut — reserve it for real narrative punctuation (a reveal, a pivot, a punchline). Snapping every scene to a match cut cheapens it; 2–3 per film is right.

---

## 11. Motion-Designer Handoff Kit

`public/design-kit.html` (live at `trybraino.com/design-kit.html`) rebuilds the extension's core UI elements from `extension/content.js` with untouched values — dock bar (idle + task-working with step strip, spinner, tick pop, shimmer), chat card (glass + readable, `.sb-card-q` / `.sb-card-a`), step-row anatomy, and a full-viewport placement map. Each block exports as 3× PNG (on-backdrop or transparent) plus a download-all ZIP; animation timings are listed under each element. The kit also runs the character live — bar-rise open animation (replayable), walker walk/stop/wave on the bar, docked-brain idle, standing pose, and the 8-reaction face grid — each animation exportable as a 30fps transparent PNG frame sequence (ZIPs include the ffmpeg ProRes-4444 command for true alpha video). The pose math is a 1:1 port of `__sbWkTick`; update the kit when bar / card / step-strip / walker code changes in content.js.

---

## 12. Dashboard — "Minimal" (Newsreader / warm paper)

The dashboard (`/dashboard`) runs its own design system, ported verbatim from the **Braino Dashboard Minimal** Claude Design project. It is intentionally NOT the marketing site's look: calm, monochrome, generous whitespace, hairline structure.

**Type.** Newsreader (display/serif, incl. the italic accent word), Helvetica Neue / system (UI), JetBrains Mono (labels, counts, eyebrows). Every page head is a serif `h1` whose last phrase is italic — "Everything, *remembered.*", "X on *autopilot.*", "Say it, *open it.*"

**Palette.** Warm paper `#FBF7F1` on white surfaces, ink `#1B1713`, hairlines `#EAE2D6`, coral accent `#C9544A`. Dark theme flips to `#0C0906` paper with a lighter coral `#E8786E`.

**Where it lives.** `src/pages/braino-dash.css`, scoped to a single `.bd-root` wrapper on the dashboard shell. That scope is load-bearing: the file *retokenizes* the shared `--sb-*` variables, so every existing dashboard surface adopts the new palette while the marketing site — which paints with the same token names — is untouched. Do not lift these rules to `:root`.

**Component classes.** `.bd-sidebar` / `.bd-nav-item` / `.bd-profile` (shell), `.bd-topbar` + `.bd-search`, `.bd-pane` (880px column, staggered fade-in), `.bd-phead` / `.bd-shead`, `.bd-ask`, `.bd-row` / `.bd-list`, `.bd-card`, `.bd-stats`, `.bd-note`, `.bd-chip`, `.bd-tag` (+ `.ok` / `.bad` / `.accent`), `.bd-field` / `.bd-conn`, `.bd-btn` (`.dark` / `.ghost`), `.bd-empty`. Voice Commands adds `.bd-mode-card`, `.bd-cmd`, `.bd-seg`, `.bd-dropzone`, `.bd-locked`.

**Two gotchas, both learned the hard way:**
- `--sb-ink` **inverts per theme**. A panel meant to be dark in *both* themes cannot use `bg-[var(--sb-ink)]` — in dark mode it flips near-white while its text stays dark. Use `.bd-invert` (fixed dark gradient + `.bd-invert-accent` for its coral) instead.
- The design resets bare `<button>`; without the scoped reset in `braino-dash.css` the browser's default border outlines every nav item and chip.

**IA.** The greeting hero, delegate meter, and sub-tab strip render on the Overview tab only. Every other tab opens with its own `.bd-phead`, and the topbar carries the page title.

### Notch state colours (Mac)

The notch carries voice state as colour, so it reads at a glance without text:

- **Listening — coral, radiating.** `#notch-face.listen` runs `nfListenRadiate`
  (1.9s, infinite): a coral ring breathing between a hairline and a 38px bloom,
  the same rhythm as the wake-up sequence. It is the one unambiguous "he is
  hearing you" signal, so it never goes quiet while the mic is live.
- **Speaking — unchanged.** The mouth already carries that state; adding a
  second signal on top of it just competes with itself.
- **Voice Command mode — the mode's own colour wins.** While a mode runs, its
  tint overrides the coral rather than animating underneath it, so "which mode
  am I in" stays readable even mid-sentence.

Reduced motion gets the coral as a static ring, not a pulse.

### Notch surfaces (Mac) — one family, one shell

Every panel that appears while Braino works is the same shell, not a new card:
`.nf-pill::after` paints a black cap the exact width of the physical notch so the
housing never appears to change, and `.nf-pill::before` is a sheet that grows
**downward** with a square top and rounded bottom corners. The island stretches;
nothing floats underneath it.

Members: `nf-think-open` (task progress), `nf-answer-open` (short and long
answers), `nf-inline-open` (voice caption), `nf-yap-open` (BrainoHERA
transcript), `nf-meeting-open` (meeting recorder).

**`nf-meeting-open` is the one translucent member, on purpose.** Every other
surface owns the screen for a few seconds, so opaque black is right. The meeting
surface is up for the length of a meeting, over whatever you are actually
working on, so it is `rgba(12,12,14,.72)` over a 26px backdrop blur: alive and
readable without taking the window underneath it away. It carries a pulsing REC
clock, the current speaker with a five-bar level that only animates while
somebody is talking, the last four lines of transcript, and the note bullets as
they build.

Two composition rules, both learned the hard way:

- **The meeting rules yield.** They sit at the end of the stylesheet, so at equal
  specificity they beat everything. Each geometry rule is therefore scoped
  `:not(.nf-answer-open):not(.nf-think-open):not(.nf-yap-open):not(.nf-inline-open)`
  — if Braino has to answer mid-meeting the answer takes the island and the
  meeting surface steps back. Recording never stops, only its surface does.
- **A long-lived surface must hold its own click zone.** The window is
  click-through except where `setNotchZone` says otherwise, and
  `updateNotchFace()` runs every second inside a meeting. Its
  `syncYapNotchZone(false)` branch has to know the meeting surface is open, or
  the zone is torn down a second after it is claimed and Stop stops responding.

### Music island (Mac) — the Dynamic Island port

Music is the one state that is NOT a member of the sheet family: the pill
itself is the island, and it morphs on the base spring curve so collapsed →
expanded reads as one continuous object growing out of the housing.

- **Collapsed (`.music`).** Artwork tile (26px, radius 7) on the left wing, a
  five-bar EQ on the right wing, track · artist in the chin — the iPhone island
  layout mapped onto the Mac housing, with the physical notch playing the role
  of the camera. Width is `--nf-notch-w + 92px` (46px wings), never a fixed
  number: a fixed width left the wings uneven across housing sizes. The chin
  title drops the mono/uppercase ticker dress for SF Pro sentence case. The
  dancer no longer rides the island; the EQ and the light show carry the energy.
- **EQ colour = light show hue.** The bars are `hsl(var(--music-hue) …)`, the
  same variable the beat-synced glow cycles, so the bars and the halo read as
  one instrument.
- **Expanded (`.nf-music-open`).** Hover the island for ~240ms → the pill grows
  to 400×(notch-h + 162) with 34px bottom radii: artwork 58px, a 19px/700
  Braino SF Pro Display title with a white four-bar waveform badge riding the
  title line, an artists-only 15px grey line under it (the source name appears
  only when metadata has no artist — never as a `· spotify` suffix), a live
  progress bar with elapsed and `-remaining` in tabular numerals, and big
  prev/play-pause/next (26–30px glyphs, 46px gaps). The surface paints its own
  opaque black: without it the pill's resident chrome (FOUNDRY identity
  letters, awake eyes) ghosts through — the mic-live privacy dot and volume
  HUD are re-raised above it on purpose. Progress re-anchors on every 6s
  now-playing poll and drifts on wall-clock between polls. Leave the zone for
  ~380ms and it folds.
- **Pause does not fold the player.** Pausing kills the `music` class (the
  watcher flips music-state off), but the open player stays while the island is
  otherwise quiet, and for three minutes after the music stops the player is
  still one hover away — pause → hover → play never needs a voice round-trip.
  A louder state (voice, REC, alarm) folds it immediately.
- **No click-to-talk while open.** The open surface owns every click; only the
  transport buttons act. A stray tap on the artwork must not start a session.

---

## 13. Site nav — the IOMI notch (one shared component, site-wide)

Every marketing page that has a notch nav (`/`, `/browser`, `/brainos`, `/jarvis`, `/journal`, `/journal/emotional-engine`) shares **one** component: `src/components/IomiNotch.tsx` + `src/components/iomi-notch.css`. This is a deliberate consolidation — HomeOS.tsx used to define its own elaborate boot-sequence eyes-notch (`NotchNav`, still in `HomeOS.tsx` but unused now) while `/brainos` had a second, different, simpler notch (`.bos-notch*` in `brainos.css`). The `/brainos` version — the "IOMI" identity — is now the canonical one; the HomeOS variant was retired from active use.

**What it looks like.** A small black pill fixed to the top-center of the viewport, `210×34px` closed. The bar reads **IOMI** when closed, **BrainOS** when open (this swap is the whole personality of the component — closed, it's the product name; open, it's the OS). Two small blinking dots stand in for eyes. Clicking/tapping/Enter/Space toggles it open into a `min(660px, 100vw-32px) × 268px` dynamic-island panel (`cubic-bezier(0.32,0.72,0,1)`, 0.55s) holding a "Go anywhere" nav grid.

**Where it lives.** `src/components/IomiNotch.tsx` (component + the shared `IOMI_NAV` default nav list) and `src/components/iomi-notch.css` (self-contained — its own `--iomi-ink`/`--iomi-ink-2`/`--iomi-ink-3`/`--iomi-line` vars scoped to `.iomi-notch-dock`, so it doesn't depend on whatever palette variables the host page happens to define, unlike the old `.bos-notch*` rules which read `--ink`/`--line` off `.bos`).

**Usage.** `import IomiNotch from "@/components/IomiNotch"`, then `<IomiNotch />` (default nav) or `<IomiNotch nav={customList} />` to override the grid for a specific page. Every current usage renders the default `IOMI_NAV`: Welcome (`/`), Chat (`/chat`), IOMI (`/brainos`), Don't Blink (`/dontblink`), Blog (`/journal`), Dashboard (`/dashboard`).

**Retired, not deleted:** `NotchNav`/`NN_ISLAND` in `HomeOS.tsx` and the `.bos-notch*` block that used to live in `brainos.css`. Left in place in case something still needs the old boot-sequence look, but nothing imports them anymore — new notch work should extend `IomiNotch`, not resurrect either of the old ones.

**Animation reference.** The notch's own idle look (dozing → wink → awake) and the site's kinetic word-stamp typography are documented separately in the `/dontblink` teaser build (`src/pages/IntroTeaser.tsx` + `intro-teaser.css`) — that film is the canonical reference for both the notch boot sequence and the SF Pro Display "Don't Blink" kinetic-reveal type system (bold weights, `-.025em` tracking, brightness-flash word stamps). Reuse those exact values before inventing new motion for anything notch- or type-related.

## 14. /Vig — Visual Emotional Engine (interactive, real logic not mockup)

`src/pages/VisualEmotionalEngine.tsx` + `visual-emotional-engine.css`, on the shared `.bos` dark shell (`braino-classes.css`) with `IomiNotch`. Route `/Vig`.

**What it is.** Not documentation of the emotional engine — a live diagram of it. A moment picker (`neutral`/`grief`/`heartbreak`/`venting`/`anxiety`/`celebration`/`conflict`/`banter`/`focused_task`/`building`/`crisis`) drives three animated steps: (1) the plain-English word cues that moment would trigger, (2) the twelve real traits reordering with a `leading`/`always`/`opt-in` badge state, (3) a terminal-styled preview of the assembled steering line + trait summaries.

**Why it's "real."** `src/lib/emotional-engine-viz.ts` is a hand-mirrored copy of the actual backend data and algorithm — trait ids/names/summaries/`leadsOn` from `manifest.ts`, `MOMENT_EMPHASIS`/`MOMENT_LABEL` from `moments.ts`, and `orderTraitsForMoment()`/`steeringLine()` ported from `engine.ts`. It's a duplicate on purpose (the frontend can't import Deno edge-function code directly) — if the backend engine's trait set or moment logic changes, update this file to match or the visualization drifts from the truth it's showing.

## 15. Braino classes fork point — `classId` (Saburi / Iomi / Telos)

The three-class split (`/saburi`, `/iomi`, `/telos`) started as marketing pages sharing one backend personality. `supabase/functions/_shared/emotional-engine/classes.ts` is the fork point: `ClassId = "braino" | "saburi" | "iomi" | "telos"` (added in `types.ts`), a `CLASS_MANIFESTS` registry mapping each class to its own `Trait[]`, and `buildEmotionalCore({ classId })` / `buildBrainoSystemPrompt({ classId })` reading it. Every class today still points at the shared `ORDERED_TRAITS` — nothing has diverged yet, so this is scaffolding, not a behavior change. `classId` is optional everywhere and defaults to `"braino"`, so no existing caller needs to change.

**Saburi is first in line.** Its manifest entry is marked with a `TODO(saburi-book)` comment: once the founder's companion-class book is read in full, distill it into Saburi-only trait prose (a new `traits/` set, not edits to the shared files) and swap `CLASS_MANIFESTS.saburi.traits` to point at it. Do not paste raw book pages into a system prompt — a system prompt should be a tight set of behavioral rules, not source material; the book informs the prose, it isn't the prose.

## 16. Human Intelligence Layer — the brain, standalone (`/human-intelligence`)

**What it is.** Braino's system prompt rebuilt from scratch as one thing: the Human Intelligence Layer (HIL) is not a filter in front of the brain, it IS the brain. Every command runs one reasoning pass — restate the goal → decompose into 2-5 steps → exactly three ambiguity checks (`vague_referent`, `unresolved_person`, `delivery_fork`; nothing else counts) → verdict `proceed` or `ask` with exactly ONE clarifying question → `action`, the one concrete thing he'd do next. No classifier pre-pass, no second call. Built and tested standalone before being routed into the Mac app or extension (neither is touched by this).

**The screen-context rule (the load-bearing behavioral fix).** A referent like "that song" or "this" is not the user expecting Braino to guess: it's the user expecting him to *look*, the way a person glances at what's actually playing or on screen before asking who to name it. The `vague_referent` check's instructions explicitly require this: before the check can fire, first read the `context` line for anything that resolves the referent (a song playing, a video open, a page on screen); only if nothing there answers it does the check fire. Verified live: `{command:"play that song again"}` with no context → asks "Which song?"; the identical command with `context:"Spotify is open, now playing Blinding Lights by The Weeknd"` → resolves it and proceeds, no question. A worked example demonstrating the resolved case lives in the prompt itself so this doesn't regress.

**Ten stages, five of them free.** Stages 1-5 are ordinary deterministic code (pattern match, list sort, string join): instant, no model. Stage 6 is the *only* spend — one call. Stages 7-10 are what came back from it.

| # | stage | where |
|---|---|---|
| 1 | the command arrives | client |
| 2 | moment is read (`detectMoment`, regex) | `moments.ts:48` |
| 3 | twelve traits reorder (`orderTraitsForMoment`) | `engine.ts` |
| 4 | steering line written (`steeringLine`) | `engine.ts` |
| 5 | personality assembles (`buildEmotionalCore`) | `engine.ts:32` |
| 6 | HIL + personality → **one** model call | `hil-reason` |
| 7 | goal restated | model |
| 8 | work decomposed | model |
| 9 | three checks run | model |
| 10 | verdict + `action` | model |

To report stages 3-4 truthfully rather than re-deriving them, `orderTraitsForMoment` and `steeringLine` in `_shared/emotional-engine/engine.ts` were changed from private to **exported**. That is the only change to the shared engine: purely additive, no signature or behavior change, so `chat-about-notes` and `openai-realtime-config` are unaffected. The full stage-1-6 detail (`pipeline` in the response) is measured and returned by the edge function, but **the live UI does not display it as ten technical cards** — see "The lab" below for why.

**The source of truth.** `supabase/functions/_shared/human-intelligence/hil-system-prompt.ts` exports `HIL_SYSTEM_PROMPT` (+ `HIL_VERSION`). This one file is imported by BOTH the server (`hil-reason` sends those exact bytes to the model) and the website page (which prints them verbatim in the Read tab) — deliberately better than `/Vig`'s hand-mirrored-copy approach (§14), zero drift possible. It's a plain-TS string export with no Deno APIs precisely so Vite can import it too. Edit it, redeploy `hil-reason`, and Braino thinks differently. House rule holds: no em/en dashes anywhere in the prompt copy (diction.ts rule).

**The edge function.** `supabase/functions/reasoning/hil-reason/index.ts` (config: `[functions.hil-reason]`, `verify_jwt=false`, public on purpose). Per request: `detectMoment(command)` (regex, zero cost) → `orderTraitsForMoment`/`steeringLine`/`buildEmotionalCore` → system prompt = HIL text + "WHO YOU ARE" separator + emotional core, in one call. Request `{command, context?}`; response `{reasoning:{restated_goal, steps, checks{…3 booleans}, ambiguous, clarifying_question, verdict, action}, moment:{id,label,leads,intensity}, pipeline:{…stage 1-5 measurements}, meta:{model,elapsed_ms,hil_version}}`. `ambiguous`/`verdict` are DERIVED server-side from the checks (never trusted from the model), and parse failures return a typed proceed-fallback, never a 500. The model is hardcoded server-side through the shared Braino default (`HIL_MODEL`, gpt-5.6-luna, reasoning none) and deliberately NOT selectable from the request body: the endpoint is public, so letting a caller name the model would point our key at a more expensive tier for free.

**The page — Apple chrome, Medium's alignment (not its font).** `src/pages/HumanIntelligence.tsx` + `human-intelligence.css`, route `/human-intelligence`, on the **light** `.apple` shell (`src/styles/apple.css`) — same as `/product-overview`, `.apple-anchors` sticky bar (NOT `.apple-nav`; see below), `.apple-hero`/`.apple-display`/`.apple-eyebrow`, `.apple-reveal` scroll-in. "Medium" here means the reading rhythm only — `.hil-read` caps the measure at 680px, section kickers, a left-ruled pull quote — the type stays pure SF Pro Display throughout, same weight/size/color as every other `.apple` page's body copy (`.cl-desc`/`.jr-desc` pattern: clamp(15-20px), weight 500, `--ap-ink-soft`). No serif was ever the right call here.

Two tabs, **Read** and **Lab**, switched with a segmented control (`.hil-tabs`) — the Lab is its own view, not a scroll-down section of the essay.

**The lab.** Live, not a recording: one command → one `hil-reason` call → the reasoning plays out. Three things happen, and they are DELIBERATELY not the raw ten-stage technical dump:

1. **The graph and the thinking, side by side in Layout A.** `.hil-a` reuses the exact split-box chrome as the Braino/IOMI class picker (`.cl-a` in `apple.css`: one bordered box, a hairline down the middle) rather than inventing a second pattern. Left pane: `HilTraceGraph` in its new `vertical` mode — a portrait "table of stages" (command → goal → plan → checks → verdict, top to bottom, row labels in a left margin) instead of the original left-to-right diagram, bigger and easier to read. Right pane: the live monologue.
2. **The monologue is derived, not generated.** `src/lib/hilMonologue.ts`'s `buildMonologue(moment, reasoning)` turns the SAME reasoning object the graph renders into Braino's own first-person sentences ("They sound like they're in an anxious moment... Okay, what do they actually want?... Before I move, let me check myself... That's enough doubt, I'm going to ask: ..."). There is no second model call producing a parallel narration that could say something the graph doesn't show — one source of truth, two views of it. Both the graph's `litCols` and the monologue's revealed beats are driven by the exact same `stage` number in `HumanIntelligence.tsx`, so they cannot drift apart.
3. **Then a plain summary: Goal, Work, Checks, Verdict.** Four labeled rows, nothing more — the "and that's a summary" the technical trace collapses into once the thinking has played out.

**Fine-tuning notes.** Below the summary, `.hil-feedback` — a free-text box ("What should change about this?") that posts to a new `hil-feedback` edge function, which inserts into a new `hil_feedback` table (migration `20260728000003_hil_feedback.sql`) via `SUPABASE_SERVICE_ROLE_KEY`, bypassing RLS — mirrors `waitlist-signup`'s pattern exactly (public can write, nobody, including anon, can read; no RLS policies on the table at all). Each row carries the command, context, moment, the full reasoning JSON, and the note — a durable log to tune the prompt against by hand, not an automated fine-tune loop.

**Fixed while building this.** `.apple-nav`/`.apple-cta` (used by `/product-overview` etc.) had a cascade bug where `.apple-nav-links a` always won the color/opacity fight against `.apple-cta`'s own white/opaque styling — the CTA rendered near-black-on-blue at ~3:1 contrast. Fixed in `apple.css` with a scoped override; benefits every page using that CTA, not just this one. `.hil-chip`'s amber/green text also sat under 3:1 as small text (those tokens are tuned for large graphic elements, not text) — fixed with darker `--hil-amber-ink`/`--hil-green-ink` text-only variants.

**The page — "Apple × Medium".** `src/pages/HumanIntelligence.tsx` + `human-intelligence.css`, route `/human-intelligence`. Built on the **light** `.apple` shell (`src/styles/apple.css`), modeled on `/product-overview`: sticky `.apple-nav` anchor bar, `.apple-hero`/`.apple-display`/`.apple-eyebrow`, `.apple-reveal` scroll-in, blue accent (`--ap-blue`) matching the existing `src/components/HumanIntelligence.tsx` teaser on `/product-overview` — that component is the shallow teaser, this page is its deep-dive destination.

Apple supplies the chrome; **Medium supplies the reading**: `.hil-read` caps the measure at 680px, `.hil-p` is Newsreader serif at ~19px/1.68 (font already loaded globally in `index.html`), plus a real byline, `.hil-kicker` section labels, and a left-ruled `.hil-quote` pull quote. Deliberately NOT the dark `.bos` shell it was first built on, and not `braino-classes.css`.

**"Live thinking" = staged reveal, not streaming.** No SSE/ReadableStream precedent exists anywhere in this repo (edge or frontend), so the lab does one plain fetch, then reveals the already-complete trace beat by beat (~700ms cadence). Stages 1-6 render immediately on arrival (they're already-known facts); 7-10 pace in. Reads as live, costs no new transport.

**The trace graph.** `src/components/HilTraceGraph.tsx` — canvas technique adapted from `EmotionNetwork.tsx` (DPR fit, rAF, glow-dot-plus-halo, reduced-motion) but **prop-driven** (`litCols` 0-5) instead of auto-cycling, with dynamic layers `[1,1,steps,3,1]` (command→goal→plan→checks→verdict). Tinted for the **light** canvas (`INK` `29,29,31` + apple.css green/amber/blue tokens), matching EmotionNetwork's white-canvas approach. Check nodes flip green (clear) / amber (fired); verdict + accent lands green `proceed` / amber `ask`; blue while thinking. **`fpx()` matters:** everything is authored in a fixed 680×380 space then uniformly scaled, which silently shrank labels to ~6px in narrow containers — `fpx()` pre-divides by that scale so a label asked for at 11px renders at 11px at any width. Don't hardcode a font size in this component.

**Future adds, not built:** admin-gating or rate-limiting the lab (`ADMIN_EMAIL` pattern, `Team.tsx:7`), and the pending-clarification slot-filling loop (answer binds back to the original task) which lives in the extension work, not here.

### 16b. HIL Version 1 — the Loop tab (the brain, walking)

**What it is.** The third tab on `/human-intelligence` (`Read | Lab | Loop`). The Lab shows one pass of thinking; the Loop actually walks a command: split into jobs → one small step per turn against a pretend world → verify each step → recalibrate when the world shifts → hard-stop before anything irreversible. It is the combination of Itish's human-intelligence philosophy (screen-first context, set-asides instead of upfront interrogation, strictly sequential jobs, mood underneath) with the hil.py starter's mechanics (state-snapshot-not-transcript, the reversible gate, tiered verification, legible named stops). Nothing real executes anywhere in it.

**The second source of truth.** `supabase/functions/_shared/human-intelligence/hil-loop-prompt.ts` exports `HIL_LOOP_PROMPT` (+ `HIL_LOOP_VERSION`), sibling to `hil-system-prompt.ts` and under the same rules: plain-TS string, importable by Vite, no em/en dashes, edit-and-redeploy is the only way Braino's loop thinks differently.

**The edge function.** `supabase/functions/reasoning/hil-loop/index.ts` (config `[functions.hil-loop]`, `verify_jwt=false`, shared default `gpt-5.6-luna` with reasoning set to `none`, emotional core appended live — all mirroring `hil-reason`). One call per TURN: the browser sends `{command, context?, state}` where `state` is a fresh snapshot (jobs, facts, last-20 step records, budget, screen line, optional `userReply`/`lastStep`); the server renders it and returns `{turn:{thinking, split?, verdict?, decision}, moment, meta}`. `decision` is exactly one of `step | ask | task_done | all_done | blocked`. Two things are DERIVED server-side, never trusted from the model: `reversible` (forced `false` for `gmail_send`/`shop_checkout`, `true` otherwise — the gate is not the model's vote) and the parse fallback (unreadable turn → legible `blocked`, with `meta.parse_ok=false` so the client retries once).

**The action vocabulary is the real one (v2.0.0).** The loop does NOT call app-level helper verbs, because the real surfaces don't have any: Delegate navigates, reads the page into an indexed element map, and clicks/types against those indices (`BG_DELEGATE_ACTIONS`, background.js:3517); the Mac app does the same thing against the AX tree. So the loop's whole vocabulary is `navigate / read / click / type / pressKey / scroll / wait / web_search`, targeting elements only by index from the observation it was just handed. What you watch on the page is what would really be fired. (v1.0.0's `gmail_compose`/`spotify_play`-style tools were a fiction and were removed.)

**The pretend world.** `src/lib/hilLoopWorld.ts` — a stage set of real-shaped pages, not a verb list: sites (`gmail`/`spotify`/`youtube`/`blinkit`) × screens (gmail: inbox → thread → compose; blinkit: home → results → cart), each screen producing an `ElementDef[]` with an `act()` that mutates world state. `elementMap()` numbers them and `renderObservation()` prints the `URL / TITLE / PAGE STATE / ELEMENTS` block the server renders each turn — the same shape a real observation has. `createWorld(preset)` lets a run BEGIN mid-situation (`gmail-thread`, `gmail-inbox`), which is what makes "reply to this email" testable at all. Plus `sabotageCloseTab`/`sabotageJamSite` — the user breaking the world mid-run is a first-class demo feature, because recalibration is the point. Search results echo the query with plain format variants only: an earlier version stapled `| TED` onto every YouTube query, and the loop faithfully reported a Tanmay Bhat video as a TED talk — the loop is exactly as truthful as the instrument it reads, so the instrument never invents brands.

**The referent rules (the behavioral core).** "Reply to this email" has exactly three outcomes and the prompt names them: **continue** (the thread is already open → click Reply immediately, never reopen or re-search — the same "CONTINUATION FIRST" rule the amazon-shopping skill has at background.js:3770), **ask** (only the inbox is open, three plausible senders, nothing picks between them → one question, never the closest-looking guess — mirroring the contact-ambiguity stop at background.js:3960), or **work** (nothing on screen relates → go get it). Paired with a no-repeat-read rule, since a fresh observation arrives every turn unasked, so reading twice to feel certain only burns budget. **The observation is sent on EVERY turn including the first** — an early version early-returned before rendering it on turn one, which made "look before you ask" structurally impossible at the exact moment it matters; the client backs this with a deterministic repeat-read guard (`lastActionSig`), the analogue of `bgIsRepeatedDelegateAction`.

**The driver.** `src/lib/hilLoopEngine.ts` (`HilLoopRunner`) — hil.py's `run()` as a client state machine. The guarantees live here as code paths: (1) **the gate is decided by what is being clicked**, read off the live observation (`isIrreversibleClick` matches the element's NAME against send/buy/publish/destroy), not by the model's `reversible` field — the same principle as `bgCartSafetyBlock`; a gated step does not execute until a real `confirm()`, and `decline()` ends the run cleanly as `declined`; (2) tier-zero verification — an `{error}` result fails on the spot before the model sees it, the model's verdict fills in next turn; (3) named endings only (`all_done | declined | blocked | budget | error`) with a same-failure-three-times backstop (the prompt says stop at two; the client enforces at three), a repeat-read refusal, 14 actions per job, and a 45-turn cap.

**The UI.** `src/components/HilLoopRun.tsx` + `.hil-loop-*` styles appended to `human-intelligence.css` (reusing `.hil-cmd`/`.hil-run`/`.hil-samples` chrome). A live **screen panel** prints the element map he is actually reading (`[0] button "Compose"` …) above the feed, so the indices in his actions are checkable against what he saw. Then a feed of cards: split card, step cards (thinking → the action as it would be logged, `click [2] "Reply"` → intent → expects → what the page said → status ✓/✕), amber gated card with Yes/No, blue-bordered ask card with inline reply input, green task-done, dashed sabotage card, color-coded ending banner. Thinking is printed once per turn: the first turn carries both the split and the first step, and the step card suppresses the duplicate. **Auto-scroll fires only when `events.length` grows** — an unguarded effect scrolled on every render and made the command box untypable after a run.

**Verified live, not assumed.** Thread open + "reply to this email" → one `click [2] "Reply"`, no reopening. Inbox only + same command → `ask` naming all three senders, no guess. Draft complete → `click [3] "Send"` with `reversible:false`. Tab closed mid-run → verdict `ok:false`, then `navigate` back before continuing.

### 16c. How Braino talks — charm, the dial, and the tell check (`/emotional-intelligence`)

**The thesis.** What outs an AI is **eagerness**, not formality. "What's on your mind?" is the sound of something waiting to be useful: it hands the work back and proves he noticed nothing. The charm was always in the engine but lived in `humanity.ts`, which only fires on self-questions ("do you love me", "are you real"), so his best register almost never appeared.

**Two structural findings that shaped this.** (1) Only `ideation` branched on `moment` — every other trait rendered identical prose whether the user was grieving or joking, so **tone never actually scaled**; only trait ORDER + one steering line changed, and the model was left to infer register (it infers customer service). (2) Every trait declared `leadsOn` and **nothing read it** — `MOMENT_EMPHASIS` was the only real router, so a trait could claim to lead on grief while the table silently disagreed.

**New trait: `traits/charm.ts`** (manifest position: right after `presence`). The through-line voice — noticed something, says it short, a little amused, never eager. Four rules: notice don't solicit / short-and-specific beats warm-and-general / tease is affection and only points up / one beat of vanity is allowed. **It is the only trait that rewrites itself per moment** (the dial): full → economy (`focused_task`, `conflict`) → warm-no-tease (`venting`, `anxiety`) → plain (`heartbreak`) → **returns `""` in `grief` and `crisis`**, removing itself from the prompt entirely. A trait that is always on would eventually be charming at a funeral.

**New checker: `_shared/emotional-engine/tells.ts`.** `scanForTells(reply)` over 10 categories (eager-opener, therapy-voice, wellness-closer, permission-slip, narrated-empathy, silver-lining, customer-service, ai-disclaimer, filler, dash), built from the ban lists already written into authenticity/humanity/charm/diction. **This is the load-bearing idea:** a banned phrase in a prompt is a *request*; scanned in code against the actual reply it is a *fact*, and it yields a number that moves as he is tuned. Deliberately a phrase scan, not a model call — free, instant, cannot itself hallucinate. Unit-verified against all 7 offender classes plus 2 genuine replies.

**Moment detection, layered** (`moments.ts`). `detectMomentDetailed` returns the exact cue words that matched (for the breakdown UI). **Crisis is an absolute override** and stays a hard word match forever, so a life-or-death message never depends on a model being reachable. Otherwise **strongest-match wins, not first-listed** ("I got the job but I'm terrified" now lands on the heavier signal). `looksEmotionallyLoaded()` gates a second cheap model read that runs ONLY when cues returned neutral and the text is self-referential, feeling-shaped, and not an action command — so "open gmail" never pays for it. Verified: *"i dont really know why but ive just been feeling off all week"* → cues said `neutral`, deeper read caught `anxiety`, charm dialled to warm.

**Fixes to long-standing dead code.** `settings.swearing` was defined, defaulted, dashboard-settable and **read by nothing** — now wired into `diction.ts` (register belongs there), with `authenticity.ts`'s "mirror their cursing" line updated to defer to it instead of contradicting it. `engine.ts` gained `leadIdsForMoment()` merging the table with each trait's own `leadsOn`, so the table sets ORDER (which a trait can't know) and traits act as a safety net against being silently ignored. `buildEmotionalCore` gained an optional explicit `traits` override so the lab's charm-off A/B genuinely removes the trait rather than claiming to.

**One source of truth.** `src/lib/emotional-engine-viz.ts` was a hand-copied duplicate of the trait list, moment map, steering line, and ordering function, headed by a comment asking future editors to remember to update it — and a *third* copy lives in `JournalEngine.tsx`. It now re-exports the real engine (`manifest.ts`/`moments.ts`/`engine.ts`), keeping only `MOMENT_CUES`/`MOMENT_ORDER` which are genuinely display-only. All three consumer components are lazy-loaded, so trait prose never reaches the landing bundle. Shims keep the 1-arg call signatures working.

**New endpoint: `supabase/functions/chat/braino-reply/index.ts`** (`verify_jwt=false`, model pinned server-side — same rules as the HIL lab, since no public endpoint returned a Braino reply and `chat-about-notes` needs a login and returns bare `{reply}` with zero routing telemetry). Returns `{reply, moment:{id,label,intensity,how,cueHits,cueSaid}, personality:{leads,traits,steering_line,charm,settings,core_chars,trait_count}, tells, meta}`.

**The page.** `VisualEmotionalEngine.tsx` gains two tabs beside Read/Lab: **Reply** (`BrainoReplyLab.tsx` — his answer, the tell verdict, the moment + how it was read, who led, the steering sentence, the charm dial, and a charm-off A/B on the same message) and **Whole mind** (`BrainoWholeMind.tsx` — one message through `hil-reason` and `braino-reply` in parallel: what he thinks on the left, what he says on the right). Styles are `.eir-*`/`.ewm-*` appended to `visual-emotional-engine.css`; `human-intelligence.css` is already imported so the `.hil-*` input chrome is reused and auto-recoloured coral.

**Route fixes shipped alongside.** Four notch links were dead (`/emotional-intelligence`, `/braino-os`, `/yap-mode`, `/motion-graphics` — pages existed, routes never registered; the emotional page was reachable only at `/Vig`, which is kept as an alias). And the notch's "authenticating" replay was never auth at all: it is a ~9s cosmetic boot film whose "already awake" flag was module-scope, set only by the LAST timer (killed by any unmount, and every page mounts its own notch), and wiped by the 404 page's `<a href="/">` doing a hard reload. Now: flag lives in `sessionStorage`, is set at boot START, and `NotFound` uses `<Link>` and renders a notch. Net: **boot plays once per tab.**

**Docs.** KB: `Braino Knowledge Base/features/hil-version-1-loop.md`; public: `/knowledge/hil-version-1` (`src/pages/HilLoopDocs.tsx`, entry 014 in `brainoKnowledge.ts`).

---

## 17. Editorial Theme — canonical long-form system

**Trigger phrase.** When the founder asks, “Make this page in the Editorial Theme,” this section is the source of truth. Do not reinterpret the phrase as a generic blog, newspaper, or Medium clone.

**Canonical reference.** The `/waitlist` page (`src/pages/Waitlist.tsx` + `waitlist.css`) is the reference implementation for the Editorial Theme’s composition. Its structure is load-bearing: one uninterrupted article; a restrained sticky masthead; an oversized thesis hero; one wide photographic container with a small archival caption; a narrow reading measure; numbered chapters; hairline dividers; occasional two-column passages; a large concluding thesis; and a full-width conversion chapter that feels like the final page of the same essay rather than a detached marketing form.

**Question composition (home page, 2026-08-18).** `/` now reads as a list of questions instead of a scroll. The hero is unchanged; everything under it is an accordion row (`.wl-faq-item`) whose header carries the chapter number, the question, and a one-line hint, and whose answer is the chapter *verbatim* — same `.wl-chapter` markup, type and media, with only its own number and top rule removed because the question already carries them. Rows open independently (any number at once), never auto-close each other, and mount their content on first open so the page ships light. Panels animate on `grid-template-rows: 0fr → 1fr`, so no height is ever measured in JS. Two rules keep it honest: scroll reveals inside a closed panel are switched on the moment the question opens (the open *is* the reveal), and any deep link — the notch nav, `/#meetings`, a card in the family answer — opens the question it points at rather than landing on a closed row. The second question, "How many kinds of Braino are there?", is the product family answered the same way: a grid of the kinds, each card opening its own question. When a question is added, add it to `SECTION_TABS` too — the notch numbers the chapters and the page numbers the questions, and the two have to agree.

**Visual character.** Near-black paper, quiet off-white ink, low-contrast rules, one organic accent, large areas of deliberate emptiness, and imagery that feels cinematic rather than illustrative. Motion is limited to soft scroll reveals. The page earns drama through scale, pacing, and juxtaposition, not gradients, floating UI, glass effects, bento-card density, or decorative iconography.

**What it is not.** It is not the Apple product-page system, even when Apple typography is layered onto it. It is not the warm Dashboard Minimal theme. It is not Founder Letter’s theatrical scroll scenes. Editorial Theme is the long-form composition and reading rhythm itself.

**Theme layering rule.** `/waitlist` currently uses the Editorial Theme composition with an **Apple skin**: SF Pro Display, semibold Apple headline weights, rounded 28px media/cards, and Braino’s existing Apple component finish. This does not redefine Editorial Theme. If a future request says only “Editorial Theme,” start from the composition and dark editorial character documented above. If it says “Editorial Theme with Apple styling,” use `/waitlist` exactly as it exists now.

**Reuse checklist.**

- Keep the primary article measure around 760–800px.
- Keep the hero and final thesis wider than the reading column.
- Use one hero image, not a gallery.
- Separate chapters with hairlines and generous vertical rhythm.
- Prefer prose and typographic hierarchy over feature cards.
- Put the conversion action at the end of the narrative.
- Preserve mobile as a single uninterrupted reading flow.

---

## Idea Tracker (`/ideas`) — internal live tracker

Faithful Notion database anatomy on the Apple system-sans base (`src/pages/IdeaTracker.tsx` + `idea-tracker.css`, prefix `it-`). NO editorial serif anywhere — SF Pro / system stack only (per Itish, 2026-08-04).

- 900px column on `#fbfbfd`; full Notion dark mode (`#191919` bg) via `prefers-color-scheme`.
- Page header = Notion page: mascot as page icon, bold sans H1, vertical property rows (`☰ Owner / ◷ Updated / # Ideas / ☑ Homework`, gray 132px label column).
- **Capture bar under the title**: type or dictate an idea (browser SpeechRecognition, coral pulse while live, Notion-blue Add). Saves to localStorage (`braino-idea-inbox`); dumps render in an 📥 Inbox section (hover ⋮⋮ handle, ✕ delete). Declared v0 of Idea Mode, which will replace the local save with Braino filing rows itself.
- 🔥 Homework: Notion to-do blocks — 16px square checkboxes (Notion blue `#2383E2` when done, dash when in-progress), strikethrough done text, pastel tag pills (Critical = red pastel), hover row bg + ⋮⋮.
- 💡 Idea Vault: real table view — view-tab bar (⊞ Table active, ▤ Board decorative, Filter/Sort/+ New tools), column headers with type icons (`Aa / ◍ / ☰`), vertical + horizontal hairlines, hover rows, trailing "+ New" row, `overflow-x` wrap (min 820px).
- Status tags use authentic Notion pastels (bg/text pairs, 4px radius, normal case): Front-runner green, Building blue, Next-up yellow, Seed purple, Exploring orange, Parked/Icebox gray.
- 📍 stats as gallery-view cards (bold sans values); 🌱 Idea Mode as a Notion callout block (emoji left, `#f6f6f4` bg).
- Coral appears only where Braino himself does: LIVE pill and the live mic. Everything else is Notion neutrals + pastels.
- All content is data arrays at the top of the TSX (`HOMEWORK`, `IDEAS`, `STATS`) — the page is the database.

---

## 18. Browser Notch v2 — the Mac notch, in the browser (extension)

**One Braino.** The extension notch (`extension/content.js`, shadow DOM under `#__sb_notch_v1_host__`) is now the Mac notch token for token (`braino-mac.css` @ c057f08): black dynamic-island material, SF Pro Display (bundled as 64 KB subset WOFF2 ×2 in `extension/fonts/`, `@font-face` injected into the document because shadow roots can't declare fonts), the Dynamic Island spring `0.55s cubic-bezier(.32,.72,0,1)` for the pill and the expo-out family `1050ms cubic-bezier(.22,1,.36,1)` for expanded surfaces (answers 420/280ms). Coral is never a fill — it is Braino's glow (`nfListenRadiate`, speaking `0 0 34px rgba(232,120,110,.5)`), mouth, sonar ring stroke, think dot. The white ink ladder is the Mac's (labels `rgba(255,255,255,.6)` 9px/650/uppercase; body `500 17px/1.48 rgba(255,255,255,.68)`; short `500 17px/1.38 #f7f7f5`; karaoke `.28 → .84 → #fff`). Buttons are white-glass (`rgba(255,255,255,.06)` + `.12` border, primary `rgba(255,255,255,.88)` on `#050505`).

- **Geometry:** idle 190×56 (hover 198×58) · listening/speaking 250×66 r26 · working 250×60 r20 · input/menu/short 480 · thinking/long/record 580 · greeting 610×180 · signin 430×88. Measured heights via `--sb-answer-short-height` (min 146) / `--sb-answer-long-height` / `--sb-record-height`.
- **Face:** the browser's 230×72 face SVG kept, recoloured to nf-mini: white eyeballs, `#1B1713` pupils, glints; folds hidden in black; smile shown only while listening (coral `#E8786E`), talking mouth coral ellipse `nfTalk .28s`; thinking = lids + `nfThinkShimmer` light sweep; scanning (movie/vision) = `nfScanLook` eye dart.
- **Themes:** default black. `.glass` (theme button ◐, persisted `sbNotchTheme`) = the Mac meeting-sheet material `linear-gradient(180deg,rgba(12,12,14,.72),rgba(10,10,12,.58))` + `blur(26px) saturate(150%)` + the floating panel's specular hairline `border 1px rgba(255,255,255,.14); inset 1px 1px 1px rgba(255,255,255,.2)`. Onboarding will own the choice (and a colour) later.
- **No answer bubble.** The notch owns conversational text even while the mascot roams (the Mac rule); the roam speech bubble carries only status quips.
- **REC in the housing.** While recording, the record surface folds to a 250×56 pill (`● 00:00 · Lecture · Stop`) that covers nothing new; hover/tap peeks the full sheet (speaker, last lines, notes) for ~4s; meetings flash the speaker name in the pill when it changes. Live sheet = the Mac translucent meeting sheet, REC `#ff6b6b` 11px/700 tabular + `#ff5c5c` dot `nfMeetingPulse 1.7s`.
- **Movie mode:** `.movie` cyan glow `rgba(118,214,255,.42)`; scene questions show "Reading the scene" + scanning eyes while a frame of the tab rides along with the captions.

## 18a. (superseded) Browser Notch v1.1 — coral surfaces

The extension notch (`extension/content.js`, shadow DOM under `#__sb_notch_v1_host__`) now owns BOTH sides of the conversation and the recorder, ported from the Mac's c057f08 notch work but kept in Braino's coral/warm-cream language (the Mac stays dynamic-island black).

- **Answer surfaces (short/long) — measured, not fixed.** Heights come from the rendered copy via `--sb-answer-short-height` / `--sb-answer-long-height`; re-measured on the Mac's refit beats `[140, 320, 480]ms` + `document.fonts.ready`. Answers ride a FASTER transition than the shell (width 420ms / height 280ms vs the 1050ms signature ease) so speech never outruns geometry. Height vars are cleared on every exit (`__sbClearNotchAnswerSurface`) — a stale var resizing the next turn is the Mac height-leak bug.
- **Karaoke.** Plain-text answers render as `.sb-aw` word spans: unspoken 30% ink, spoken 78% ink, live word coral `#c9544a` (liquid theme: 34% / 92% white, live `#ff9a91`). Highlight is driven by the REAL Fish audio element per sentence (`__sbNotchKaraoke.attachSentence`), same element as the mouth — buffering pauses both. Streaming (fast-path) answers append words live via `__sbNotchAnswerStream*` and re-measure on sentence boundaries only.
- **Classification** is the Mac's: 100-char short/long boundary, markdown stripped for the speaking surface (`__sbNormalizeNotchAnswer`), spoken answers self-fold after the Mac linger (long 7–15s, short 3.6–6.2s); rich/manual content (lecture notes, delegate HTML) never auto-folds off the wrap-up line (`__sbNotchAnswerManualHold`).
- **Sticky "You said".** The final transcript caption survives working/thinking (Mac `showsTranscript` fix) and is released when the answer takes over.
- **Record state** (`data-state=record`, `.panel.record`, `data-phase=ready|live`): translucent warm-dark sheet (NOT a slab — it's up for a whole meeting), pulsing REC dot + mono clock + mode label + coral-gradient Start pill (ready) / red Stop pill (live), current speaker line, last-3 transcript lines, coral-bulleted note tails. Height via `--sb-record-height`. "record" is in every hold list, plus a 1s self-heal reclaims the surface if anything stomps it (browser twin of the Mac Stop-button zone bug).
- **Mic permission** drops out of the notch as an anchored 380×300 panel (26px radius, coral hairline, 420ms drop / 280ms retract on the notch easing) — same extension-origin iframe underneath; the full-screen dimmed modal remains only as the no-notch fallback. `mic-permission.html` itself: coral-gradient sonar mic disc, "Braino needs your microphone", pill CTA.
- **Boot greeting** (once per browser session): wake chime (E5→B5 sines), greeting card, spoken `"{Good evening}, {name}. Everything is ready."`, then the mascot steps out under the notch, WAVES (roam pose now drives the arm), says "Press Control or Command twice to talk to me," and folds back in. Cameo never persists roam state.
- **Roam** wanders a ~35% home box (`__sbRoamFenceX/Y` fence TARGETS, never live position — no teleports); drag the mascot to move home (drop = wave), tap still opens the ask panel. Menu: Team removed; Lecture/Meeting land on the record surface, not the input panel.

---

## 19. BrainoX command center (`/x`, `src/pages/BrainoX.tsx`)

The distribution OS surface from BrainoX.md, kept in the `/live` family: full-bleed `#0a0a0a`, white ink at graded opacities, `rounded-2xl border-white/8 bg-white/4` cards, no Navbar/SiteFooter. It is a working tool, not a marketing page.

- **Control bar** (top border strip): `Braino / x command center`, automation state pill (emerald dot + mode when live, red + "Stopped" when killed), the kill switch as a real button (red tint to stop, solid emerald to resume), and Settings toggle. The kill switch is the loudest control on the page on purpose.
- **Briefing card**: "How's my X?" + `Brief me` pill (white-on-black primary). Returns a 4-up stat grid (`Stat` tiles: black/40 wells, 11px label, lg semibold value) and the spoken-style paragraph under it. Same JSON the voice layer would read.
- **Composer**: three entry-mode pills (`I wrote this` / `Raw thought` / `Braino, draft something`) — active pill inverts to white/black. Generated options render as a 3-up card grid: angle + score (emerald ≥80, ink ≥70, amber below), post text, authenticity note in 11px ink/30, `Save as draft` outline button.
- **Queue**: status sections with uppercase 12px ink/40 headers (Scheduled → Approved → Drafts → Needs review → Paused → Failed → Published → Rejected). Items are draggable cards (`cursor-grab`) in the pre-scheduled states; fractional-position drops, one-row updates. Right rail of pill `ItemButton`s per status; subtle variant is borderless ink/40. Policy holds surface inline in amber ("Held: ..."), errors in red, published items link out to X.
- **Idea inbox** and **activity log** ride the same card language; log rows lead with a result dot (emerald success / amber blocked / red failed) and show agent · action · target with the reason in ink/35 beneath.
- Footer note names the honest boundaries: connection managed on /dashboard, public stats on /live.

---

## 20. Brainelle — the `femme` flag (`src/components/Brainelle.tsx`)

Brainelle is **not a second character**. She is `Braino` from `src/components/BrainoChar.tsx` with a couple of props flipped, so every pose, walk cycle, moonwalk, dance and expression he already owns works on her with no new artwork. (She was called Ms Braino for one afternoon; `/instagraphics/ms-braino` still resolves.)

- **`femme` prop on `Braino`** — turns on the lashes, swaps the blush, and puts her in pink shoes. Nothing in the body, gradients, silhouette or footprint changes, so she still fits the notch, the bar, and small favicon sizes.
- **`accessory="bow"`** — a silk bow tied on the crown, exactly where the midline gyri seam parts. Same material vocabulary as his gloves and shoes: `url(#brainSilk)` fill (white → `#F9DED8`), `rgba(176,86,78,.45)` trim, `#C9544A` fold lines at 50% opacity, and a `url(#brainCoralDark)` knot with an `#F6A8A2` highlight. Two short tails fall over the forehead so the ribbon lies on the head instead of floating above it.
- **`dress`** (`false | "bell" | "skirt" | true`) — **`"bell"` is her default and the locked design: a scalloped polka dot SKIRT.** The Minnie lesson got her dressed: Minnie is Mickey with clothing on, not a redrawn anatomy. Same ears, same face, no hair. So the dress does the work, and nothing about the body changes. Minnie is Mickey with clothing on, not a redrawn anatomy — same ears, same face, no hair — so clothing carries the difference and the character underneath is untouched.

  **It is a skirt, not a dress, and that is anatomy not taste.** She has no neck and no shoulders: her arms leave the body at y 53, *above* her mouth at y 61. A dress hangs from shoulders, so its neckline can only ever land on her face — `dress={true}` renders that version and it is kept only to show why it fails. A skirt does not hang, it sits: top edge at y 70, nine units clear of the mouth, legs coming out below.

  Making cloth read as worn rather than pasted on:
  - `url(#brainDressCloth)` is a *horizontal* gradient (`#8E3129` → `#E26658` → `#8E3129`), so flat fabric wraps a round form.
  - `url(#brainDressTuck)` fades a shadow under the waistband, so the brain reads as continuing behind the cloth.
  - The white sticker rim follows only the OUTER contour, as an open path. Ringing the whole shape draws a white line across the waist and the skirt reads as an object laid on top of her.
  - The scallops ARE the silhouette (`BELL_HEM`), not circles laid over a smooth arc, and the sides bell outward rather than running straight. `"skirt"` is the earlier smooth-hem version, kept for comparison. Dots are a staggered lattice that shrinks and tilts toward the edges and runs off the hem — a dot cut by the edge is what proves it is printed on the cloth. Scallops sit *on* the hem curve so only their top halves show.
  Four things make a dress read as worn rather than pasted on, and none of them is the outline: cloth shading across the width, the tuck shadow, gathers falling from the neckline, and a scalloped trim for hem thickness. A flat waistband block does the opposite — it reads as a dress placed on top of her.
- **No sleeves** — Braino has no shoulder. y 54 is her cheek, so a sleeve there is a lump on her face. Minnie can wear them because her head is a separate ball.
- **`hair`** (`false | "bob" | "sweep" | "trim" | "trimsweep" | "long" | "longsweep" | "wispy" | "wispysweep"`) + **`hairColor`** (`blonde | honey | rose | auburn | espresso`) — **`hair="trim"` with `hairColor="honey"` is her locked design.** Three fall weights, each thinner as well as shorter: wispy tips at y 73, trim at y 81, full at y 88. Blonde loses contrast against the coral body at small sizes; honey holds its edge, which is why it won. Every weight × colour is rendered at `/instagraphics/brainelle/hair`. Hair is genuinely hard on this character because the outer gyri are already bumpy hair-shaped forms, so a dark mass over them reads as a painted edge. The rules that finally made it work: the cap is the ONLY piece in front of the body and must stop at y 41, because anything lower runs beside her eyes and reads as sideburns; the length is drawn behind everything, before the legs, and only opens out below y 60 where the body narrows toward the legs. Drawn behind the body entirely it is invisible except for a sliver, which reads as two straps.
- **`gaze="wander"`** — deterministic saccades: the eyes flick to a target and *hold*, easing over the last 22% of a 1.45s beat. A smooth sine drift reads as seasick rather than alive, and the targets are a fixed list rather than random so a recorded artboard replays identically.
- **`talk`** — the existing mouth rig; her beats use it so she is speaking rather than frozen mid-smile.
- **Her listening state** — same language as the Chrome system's listening phase (sonar rings plus wave bars) in *pink*, not his gold → coral → periwinkle. Rings `rgba(233,110,157,.8)`, bars `#FBD3E2 → #EC7CA4 → #C4507B`. `.ig-brainelle-sonar` / `.ig-brainelle-wave` in `insta-graphics.css`.
- **`specs`** — round wire glasses, `r 9.4` lenses on the eye centres, `#1B1713` at `strokeWidth 1.45`, a `17%` white lens fill, and two white arcs for glare. Drawn after the eyes so the rim sits over the lashes. On by default in `Brainelle`; pass `specs={false}` to take them off.
- **Lashes** — three strokes per eye, `#1B1713` at `strokeWidth 1.5`, flicking outward from the upper-outer edge. They live inside the eye's blink transform, so they close with the lid.
- **Blush** — moved inboard to `cx 30 / 70`, widened to `rx 4.4 / ry 2.5`, warmed to `#E85450` at `0.5` opacity (his stays `28 / 72`, `3.5 × 2`, `#E14A48` at `0.35`).
- **Pink shoes** — `LegShoe` takes a `pink` tone: `url(#brainPink)` upper (`#FFC0D6` → `#F58FB2` → `#DE6C93`), `#FFE3EC` sole, `rgba(160,58,94,.42)` trim, `#C4507B` laces. The ankle above the shoe stays coral, because that is her leg, not her shoe.
- **New gradients** — `brainSilk`, `brainPink`, `brainDressCloth`, `brainDressTuck`, `brainHair` and `brainHairDeep` added to `<BrainoDefs/>`. Any page rendering her must still render `<BrainoDefs/>` once.

Usage: `<Brainelle size={430} legs idle expr="happy" />` — honey trim hair, bow, skirt and specs all on by default. Note the skirt hides her legs, so the walk cycle is not visible while she wears it. Every other `Braino` prop passes straight through, and `accessory` can be overridden (`accessory="fedora"` for her moonwalk).

Character sheet artboard: entry **007** of the InstaGraphics archive (`/instagraphics`), 1080 × 1920 on a **white** ground with ink type and the coral signature, so the character is the only saturated thing on the page. The hero smiles through all four beats on purpose; the expression range lives in the mood row beneath it. Exportable as 2160 × 3840 PNG or a 12s 1080 × 1920 MP4.

Full-screen view: `/instagraphics/brainelle` (`BrainelleStage`). The artboard is contain-fitted to the viewport with a JS-measured `--ig-scale`, because `scale()` needs a unitless number and `calc(100vw / 1080)` resolves to a length. It is centred with `position: absolute` + `translate(-50%, -50%)`, not grid/flex centring, which grows its track around an oversized item instead of centring inside it.

---

## 21. Character switch — Braino ↔ Brainelle (`extension/content.js`)

**A character is not a voice persona, and that distinction is the whole design.**

- A **voice persona** ("talk like Trump") sends `personaSystem`, which **replaces Braino's entire system prompt server-side** — no emotional engine, no memory engine, no base personality. `chat-about-notes/index.ts` branches away from `buildBrainoSystemPrompt` completely.
- A **character** is one setting on the same mind. Same engine, same memories, same taste. Two things change: the **Fish voice** and the **name**.

So the character identity does NOT ride on `personaSystem`. It rides additively on `__SB_SURFACE_NOTE`, which already appends to the normal prompt on all three surfaces (text chat, realtime boot, persona voice instructions). The constant became `__SB_SURFACE_NOTE_BASE` and the three call sites now call `__sbSurfaceNote()`, which appends the active character's identity line.

| Piece | Where |
| --- | --- |
| Registry | `__SB_CHARACTERS` — `{ name, refId, identity }`. Braino's `refId` is `""` so the server falls back to `FISH_AUDIO_REFERENCE_ID`; Brainelle's is `b67aedfb36d04c53892fd0e96db08180`. |
| State | `let __sbCharacter` — persisted to `chrome.storage.local` under `sbCharacter`, so a reload keeps whoever you picked. Voice personas are session-only by contrast. |
| Voice | `__sbFetchSentenceTts` — `__sbActiveVoiceRefId \|\| __sbCharacterVoiceRefId()`. **A persona outranks the character**: an impression is temporary, the character is who you are underneath it. |
| Identity | `__sbSurfaceNote()` — additive. Brainelle's line says same mind, same memories, introduce yourself as "Hi, I'm Brainelle", she/her, *nothing else changes*. |
| UI | `#__sb_character_btn__` — a dot in the bar row beside the glass toggle. Coral `#E8786E` = Braino, pink `#EC7CA4` = Brainelle. A dot rather than a mode chip, because it is one setting and not a mode. |
| Spoken switch | `__sbDetectCharacterCommand` — "be/become/switch to/change to brainelle", "brainelle mode", and the same for braino. Checked in `__sbProcessPrompt` **before** the persona matcher, whose `be X` pattern would otherwise swallow "be Brainelle" as an impression of someone by that name. |
| Announce | `__sbSetCharacter` speaks the greeting immediately in the new voice, so the switch is audible. |

**Mac parity** (`mac/braino-mac/renderer/braino-mac.js`): `MAC_CHARACTERS` mirrors the registry, `macCharacter` persists to `localStorage` under `brainoMacCharacter`, and `macSpeakingRefId()` collapses the whole voice decision into one resolver used by both TTS sites — **her mode > persona > character**, because her mode is a full takeover, a persona is a temporary impression, and the character is who you are underneath either. The identity line is pushed onto `parts` at the end of `buildRealtimeChatInstructions()` (after the Emotional Engine core, so the cached token prefix does not move) and into the realtime session instructions. `macDetectCharacterCommand` runs before `macDetectPersonaCommand` in the voice transcript route.

**Brainelle is a mascot, not a parallel switch.** She is a first-class `MascotId` in `src/lib/mascotPreference.ts` beside braino / webb / ferro, persisted to `profiles.mascot` (no migration needed: that column is plain `text` with no CHECK constraint). Picking her in Choose Your Avatar **is** the character switch, so her voice, her name and the pink notch follow the rig; `Cmd+Shift+B` drives the same avatar setting rather than a parallel flag, so the hotkey and the picker cannot disagree. Webb and Ferro stay rigs only, same Braino voice and name underneath.

Her walker rig is `src/components/brainelleWalkerSvg.ts`, **generated from `brainoWalkerSvg.ts`** so it stays a mirror rather than a redrawing — every `__sbwk_*` id survives, so walk, blink, talk, drag and moonwalk drive her unchanged. Two things about it that are easy to get wrong: the hair FALL is injected right after `<g id="__sbwk_root__">` so it sits behind the legs and body (appended at the end it covers her face), and the shoes are recoloured by matching the shoe path exactly, because a blind `fill="white"` swap also repaints the gloves and the sticker outline. The Mac picker markup in `renderer/index.html` is static, not registry-driven, so a new character needs a button added there too; four options no longer fit one row, hence the 2x2 grid.

**The pink notch.** `.brainelle` on `#notch-face` (Mac) / `.sb-brainelle` on `#__sb_bar__` (browser). The shell stays black; a `.nf-brainelle-glow` / `.sb-brainelle-glow` element is injected behind it for the glow, and every white label inside turns `#F7B4CE`. The glow is a **real element, not a pseudo**: `.nf-pill::before` already belongs to the Mac's open surfaces (thinking / yap / inline / answer) and five browser states already own `#__sb_bar__::after` (invoking, listening, agent-busy, dance, music). The pill's `box-shadow` is likewise left alone, because it carries the recording and listening state colours.

**Taste stub.** Brainelle's identity carries one canned answer for now: asked whether she is a Taylor Swift fan she says she is not sure yet, that part is not wired in her, but she sees herself being a Swiftie deep down. It lives in the registry entry on both surfaces, so there is one place to change it.

Not wired yet: the web `/chat` voice hook (`src/hooks/useBrainoVoice.ts:115` sends `{ text }` with no `referenceId`, so it always speaks in Braino's voice), and the mascot artwork — `<Brainelle>` is a drop-in for `<Braino>` on the site, but the extension walker is a separate static SVG rig with only a `trump` costume group, so swapping the visual there is real work.

## The idle screen (Mac + `/wallpaper`)

The face the Mac wears when nobody is at it: the date, a clock at
`clamp(96px, 20vw, 288px)` in Instrument Serif, and a row of 66px frosted
circles under it. Five looks (`aurora`, `dusk`, `paper`, `coral`, `mind`), each
one a stack of `radial-gradient`s over a `linear-gradient` base plus its own
`ink` / `inkSoft` / `glass` / `glassBorder` / `grain` / `vignette` tokens, so a
whole look is one object and nothing is hard-coded per element.

Three rules that were arrived at the hard way:

| Decision | Why |
| --- | --- |
| **Painted, never photographed.** Gradients, an SVG turbulence grain at 5-9% under `mix-blend-mode: overlay`, and a vignette. | An image has a resolution and a display does not. Gradients scale to any Mac, weigh nothing, and a look can be recoloured in a line. Without the grain a gradient reads as a *screenshot* of a gradient; with it, as a surface. |
| **The clock is centred, not upper-third.** | The iPhone lock screen is the reference and this is the one thing not copied from it. On a display three times as wide, upper-third strands the clock on a large empty rectangle. |
| **The meridiem hangs off the numerals** (`position: absolute; left: 100%`), it does not share their row. | In the row, AM/PM is part of the flex line, so the numerals sit visibly left of centre and the whole screen looks misaligned. |
| **The five looks take turns every 10s**, cross-fading over 1.1s. | Only one of five can be up, and nobody picks a wallpaper from a menu every morning. Ten seconds is long enough to read as a picture rather than a slideshow. A turn calls `paintLook()` **only** — rebuilding the shortcut row on every tick would refetch each favicon and flash the buttons. |

**One surface, drawn twice, deliberately.** `src/pages/Wallpaper.tsx` is the bench
and `mac/braino-mac/renderer/wallpaper.{js,css}` is the real thing, a direct port
with the same look names and the same measurements. The Mac copy draws into the
transparent full-display window the notch already owns (the Braino OS pattern),
so there is no second `BrowserWindow`, no network, and no cost while it is down.
`z-index: 2147482000` — under Braino OS at `2147483000`, over the notch and the
mascot, and the two full-screen surfaces are mutually exclusive: opening either
closes the other, because both claim Escape.

**The row under the clock** is data, not markup: four built-in actions (speak,
ask, play, os) plus up to four links, each rendering as its site's favicon, an
emoji, or its first letter, in that order, so a link is never a blank circle.
Shape in `src/lib/wallpaperShortcuts.ts`; the Mac's copy lives in
`~/Library/Application Support/Braino Mac/idle-screen.json`, and both dashboards
edit it under Settings. Deleting every row restores the four defaults, because
an empty row is a bad edit rather than a preference.

**The set.** Eleven looks live in `shared/wallpaperLooks.json`, read by the site
(`src/lib/wallpaperLooks.ts`) and by the Mac (`main.cjs`, handed to the renderer
on open), so the Mac renderer keeps no copy and the two cannot drift. Each look
carries its own clock face as well as its own colours, because a clock in mono
and a clock in a serif want different measurements. Families are Light, Dark,
Colour and Editorial; each also declares a time of day, which is what the
Dynamic mode spends.

**Wallpapers are the same pictures, standing still.** Apple's aerials slow into
the still desktop picture on login, and that is the good idea: one set, two jobs.
`renderBrainoWallpaper()` draws a look into an offscreen `BrowserWindow` at the
display's **point** size (it inherits the scale factor, so asking in pixels
renders at 2x and writes a 24MB file), captures the first `paint`, and keeps the
PNG per look per display. "Braino, change my wallpaper" now means one of his;
naming a look by name picks it; naming anything else still searches the web
(`wallpaper-intent.cjs`).

**Battery.** Top right, `pmset -g batt` for level and charge, `system_profiler
SPPowerDataType` for the condition, asked at most every six hours because a
battery does not become unwell between two blinks. Three states and no more.

**`/wallpapers`.** The set as a page: one fixed gradient stack cross-fading as
each section takes the screen, rather than a background per section, because a
background that scrolls away is a picture of a wallpaper and one that stays is
the wallpaper. Parallax is one number per section (`--p`) written on a frame and
spent in CSS. Tabs switch the mock between screensaver and wallpaper.

**Coming and going.** Shift twice, or `powerMonitor.getSystemIdleTime()` past the
interval you set. It is a poll, not an event, for one reason: the moment the
human is back the screen has to be gone. Only the screen that came up by itself
goes away by itself. It never opens over dictation, a meeting recording, the
teleprompter, or Braino OS.

## Typing to him (Mac notch)

The Mac app was voice only: the single `<input>` in the whole renderer was a
size slider. **Cmd+Alt+T**, or a click anywhere on the notch, now opens a text
field.

**The shortcut is not plain Cmd+T**, which is what was asked for and what T for
type deserves. Electron registers global shortcuts system wide, so Cmd+T would
take "new tab" away from every browser, editor and terminal on the machine. A
double-tap of T is worse: all four existing double-taps are MODIFIER keys
(Control voice, Shift idle screen, Option Jarvis, Command come out) and
modifiers type nothing, while a bare letter would fire inside "better",
"matter" and "written".

**It lands in the box speech lands in.** The field sits inside
`.nf-inline-caption`, the same section that shows "You said" for a spoken turn,
so everything past that point is identical: the same understanding call, the
same routing, the same thinking panel, the same reply. The two never show at
once, because two lines of text in one box is the overlap that took three
rounds to remove.

Three deliberate differences, and only three:

- **The answer is shown, not spoken.** You reached for the keyboard to avoid
  noise. `answerViaRealtimeChat(text, { silent: true })` skips the streamer and
  the speak fallback, and logs the reply with `route: "typed"` instead.
- **The microphone is never touched.** Opening the field must not start him
  listening, and there is a test asserting the open path contains no call that
  could.
- **Typing mid-job is the same conversation as speaking mid-job.** A typed
  sentence goes through the interjection router first, so a correction reaches
  the running job rather than starting a new one.

If there is no realtime session open there is no chat path, so a typed job goes
straight to `runDelegate` rather than being silently dropped.

## The thinking chip (Mac notch)

What he is doing, centred under the housing, with the way into the rest of it
next to it. Three decisions, each one taken because the previous version was
wrong on the glass rather than wrong in the stylesheet:

| Decision | Why |
| --- | --- |
| The line lives in a centred chip, not the left caption slot. | The caption was pinned to the left edge of a 190px housing, so "Reading the page and understanding what matters" reached the screen as the word **READ**. A line nobody can read is worse than no line: it takes the space and looks broken as well. The collapsed island is 430px wide and the text ellipses at 318px. |
| The shimmer travels **through** the text (`background-clip: text`), not over it. | A highlight sliding across reads as a loading bar. A gradient moving through the letters reads as the words being alive, which is the thing being said. It also replaced the three bouncing dots, and two of anything is one too many. |
| Nothing automatic may close a surface a person opened (`nfThinkingPinned`). | Every arriving step called `openNotchThinking`, which removed `nf-think-open` to start clean, so the panel closed itself under your hand and the next click reopened it: "it disappears, then I have to click again". The pin follows the class, so it cannot outlive the state. |

**The other half of the double click was the mouse zone.** The interactive
region hugged the physical housing, so the chip sat outside it and the first
press landed on the desktop behind. `nfSyncThinkingZone()` sizes it to the
island (430x92) while thinking, and hands it straight back afterwards.

Prove it with `tests/tools/notch-bench.mjs`, which loads the real markup and
stylesheet with the renderer script stripped and screenshots any combination of
classes. Reading the CSS is how the four-character line survived.

**`/notch-lab` is the browsable version of that bench.** `src/pages/NotchLab.tsx`
imports `mac/braino-mac/renderer/braino-mac.css` as raw text and injects it into
a **shadow root**, with markup lifted verbatim from the Mac's `index.html`. Same
CSS, same DOM, in a browser you can measure. The shadow root is not optional:
importing that stylesheet globally applies its `body { pointer-events: none }` to
the whole site and every page stops responding. It shows the four states in the
order they happen — You said, Thinking, Extended thinking, his reply — so the
sequence can be reviewed before anything is ported back.

**He is coral while he thinks.** The sleeping face at the top of the open panel
was a near-black plate with a coral light swept over it, which reads as a stain
rather than as Braino. It is now painted in the mascot's own gradient
(`#F6A8A2 → #EE8B82 → #E8786E`), which forces two things that are easy to miss:
the fold and smile strokes have to be **ink** (`rgba(92,28,22,…)`) to survive on
a light surface, and the sweep has to be **white with `mix-blend-mode:
soft-light`**, because coral light on a coral plate is invisible. The collapse
arrow gets 46px of canvas padding under the last line of reasoning; without it
the arrow sits against the text.

Repainting him also exposed a geometry bug this file's own contract had already
called: *the top `--nf-notch-h` hides behind the physical housing, the face band
lives on the chin below.* `.nf-response-face` ignored it, starting at the pill's
y=0 with the closed lids at **y 29-36** of a 72-unit viewBox against a **33px**
housing, so the notch ate two thirds of both eyes and left a 3px sliver. It read
as part of the housing while the plate was near-black. The plate still runs to
y=0 (coral edge to edge, no black band above him) but is now
`calc(72px + var(--nf-notch-h))` tall with `margin-top: var(--nf-notch-h)` on its
`svg`, so only the drawing moves down. The canvas padding-top carries the same
term or "BRAINO IS THINKING" lands on his face. Measured on `/notch-lab`: lids
**29px clear** of the housing line, header **4px clear** of the plate.

**One state at a time.** The caption used to stay open through processing so your
sentence never disappeared. That put the phase on screen twice, once in the chip
and once in the caption's own state slot, and left no moment that reads as *he is
working*. `updateNotchFace` now hands the box over: your sentence holds it for at
least `NF_HEARD_MIN_MS` (1100ms, so a fast route cannot swap it out before you
read it), then the thinking chip owns it alone. Your words are not lost, they are
the first line of the panel behind the arrow.
