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
