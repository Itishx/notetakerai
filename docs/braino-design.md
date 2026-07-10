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

## 10. Motion-Designer Handoff Kit

`public/design-kit.html` (live at `trybraino.com/design-kit.html`) rebuilds the extension's core UI elements from `extension/content.js` with untouched values — dock bar (idle + task-working with step strip, spinner, tick pop, shimmer), chat card (glass + readable, `.sb-card-q` / `.sb-card-a`), step-row anatomy, and a full-viewport placement map. Each block exports as 3× PNG (on-backdrop or transparent) plus a download-all ZIP; animation timings are listed under each element. The kit also runs the character live — bar-rise open animation (replayable), walker walk/stop/wave on the bar, docked-brain idle, standing pose, and the 8-reaction face grid — each animation exportable as a 30fps transparent PNG frame sequence (ZIPs include the ffmpeg ProRes-4444 command for true alpha video). The pose math is a 1:1 port of `__sbWkTick`; update the kit when bar / card / step-strip / walker code changes in content.js.
