# The Notch Design System

**Braino's face, his body and his entire UI surface.**

Every state, every animation, every number. This is the whole system, and it is the same one on the Mac and in the browser: the extension notch is a token-for-token port of the Mac one, so there is one design here, not two.

Source of truth: `mac/braino-mac/renderer/braino-mac.css`. Port from that, never from the browser copy.

---

## 1. The idea

The physical notch on a MacBook is a hole in the screen that Apple asks you to route content around. Braino lives in it instead. He grows out of the housing, so the black of the pill and the black of the hardware are the same black and the join is invisible.

Three rules that follow from that, and everything else is a consequence:

1. **The pill is always black.** `#000`. Coral is Braino, never the shell. Every time a state class tried to tint the background, coral leaked through the housing and the illusion broke.
2. **It grows downward from the top, never floats.** `transform-origin: top center`, and the answer sheet is anchored at `y=0` with square top corners, rounded only where it leaves the notch. An 8px gap turns a growing island into a card hovering under a hole.
3. **Geometry is fixed per state**, so the spring animates between two known sizes rather than measuring content mid-flight.

---

## 2. The DOM

```html
<div id="notch-face" class="listen">      <!-- state lives here, as classes -->
  <div class="nf-pill">                   <!-- the black body. all geometry -->
    <svg class="nf-face">                 <!-- eyes, ears, mouth -->
      <g class="nf-eye"> … </g>
      <g class="nf-ears"> … </g>
      <ellipse id="nf-mouth-idle" />
      <ellipse id="nf-mouth-talk" />
    </svg>
    <div class="nf-sonar"><i></i><i></i></div>
    <div class="nf-band"></div>           <!-- z-index 3 -->
    <div id="nf-status"></div>            <!-- z-index 4 -->
  </div>
</div>
```

State is **classes on `#notch-face`**. The pill reads them. Nothing sets an inline width or height except the measured surface heights, which arrive as CSS variables.

---

## 3. Variables

```css
--nf-notch-h:            33px;                              /* the physical housing */
--nf-safe-top:           max(var(--nf-notch-h), 32px);      /* clears it on any Mac */
--nf-content-top:        calc(var(--nf-safe-top) + 20px);   /* where text may begin */
--nf-compact-surface-w:  min(480px, calc(100vw - 32px));    /* input, menu, short */
--nf-reading-surface-w:  min(580px, calc(100vw - 32px));    /* thinking, long, record */
--nf-left-reach:         95px;                              /* captions, left of notch */
--nf-right-reach:        95px;                              /* captions, right */
--nf-notch-w:            190px;                             /* measured per machine */
--nf-boot-color:         232, 120, 110;                     /* rgb triple, for auth */
```

Measured heights arrive from JS as `--nf-answer-short-height`, `--nf-answer-long-height`, `--nf-thinking-height`, `--nf-yap-height`, `--nf-inline-height`, `--nf-cmds-height`. Each is clamped by a `min()` against the screen so a long answer can never run off the bottom.

Machines without a notch get `.no-notch`, which only changes border radii: the top corners round because there is no housing to be continuous with.

---

## 4. Motion

Two curves, and they mean different things.

```css
/* THE ISLAND SPRING. Apple's Dynamic Island curve. Every pill state change. */
--nf-spring: 0.55s cubic-bezier(0.32, 0.72, 0, 1);

/* EXPO OUT. Big reading surfaces opening. Slower, because it is a bigger object. */
--nf-expo:   1050ms cubic-bezier(0.22, 1, 0.36, 1);

/* THE ANSWER. Faster than the surfaces, because a reply must feel like a reply. */
--nf-answer-in:  420ms;
--nf-answer-out: 280ms;
```

Base transition on the pill:

```css
.nf-pill {
  transition:
    width         0.55s cubic-bezier(0.32, 0.72, 0, 1),
    height        0.55s cubic-bezier(0.32, 0.72, 0, 1),
    transform     0.55s cubic-bezier(0.32, 0.72, 0, 1),
    border-radius 0.55s cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow    0.4s  ease,
    filter        0.16s ease;
  transform-origin: top center;
  will-change: width, height, transform, border-radius;
}
```

`filter` is faster than everything else on purpose: a flash should land, not swell.

---

## 5. Every state, with its geometry

Radii are written as they appear: `0 0 X X` means square on top, rounded at the bottom, because the top is joined to the housing.

### Resting and conversation

| Class | Width | Height | Radius | Animation |
|---|---|---|---|---|
| *(none)* idle | `--nf-notch-w` (190) | `+22` | `0 0 16 16` | none. Pure black, exactly notch-width |
| `.live` | 260 | `+34` | `0 0 22 22` | `nfIslandBreath 3.8s` |
| `.listen` | **250** | **`+44`** | `0 0 26 26` | `nfListenRadiate 1.9s` |
| `.speak` | **250** | **`+44`** | `0 0 26 26` | static coral glow `0 0 34px rgba(232,120,110,.5)` |
| `.busy` | 250 | `+26` | `0 0 20 20` | `nfAuthPulse 1.6s` |
| `.dropping` | 360 | `+62` | `0 0 26 26` | amber inset ring |
| `.expanded` | 620 | `+134` | `0 0 30 30` | gradient body, coral bloom |
| `.expanded.has-shelf` | 620 | `+178` | `0 0 30 30` | |
| `.alarming` | 340 | `+40` | `0 0 24 24` | `nfAlarmPulse 1.1s` |
| `.nf-auth` | 250 | `+44` | `0 0 26 26` | `nfAuthPulse 1.3s` |
| `.nf-iomi-expanded` | 610 | 180 | `0 0 38 38` | the greeting |

**Listen and speak are the same box.** 250 wide, `+44` tall, radius 26. That is deliberate: the shape does not change when the conversation turns around, only the light and the mouth do. A shape change on every turn reads as the UI arguing with itself.

### Reading surfaces

These share a different rulebook. See §8.

| Class | Width | Height | Radius |
|---|---|---|---|
| `.nf-answer-short` | `--nf-compact-surface-w` (480) | `--nf-answer-short-height`, min 146, max 320 | `0 0 34 34` |
| `.nf-answer-long` | `--nf-reading-surface-w` (580) | `--nf-answer-long-height`, min 164 | `0 0 38 38` |
| `.nf-thinking.nf-think-open` | 580 | `--nf-thinking-height`, min 280 | `0 0 36 36` |
| `.nf-inline-open` | 480 | `--nf-inline-height`, min 136, max 300 | `0 0 32 32` |
| `.nf-yap-open` | `min(520, 100vw-32)` | `--nf-yap-height`, min 150, max 260 | `0 0 34 34` |
| `.nf-cmds-open` | `min(460, 100vw-32)` | `--nf-cmds-height`, min 150, max 380 | `0 0 34 34` |
| `.nf-music-open` | `min(400, 100vw-32)` | `+162` | `0 0 34 34` |

Every height is `min(measured, calc(var(--nf-screen-h) - 70px))`, or `- 90px` for answers. The clamp is not optional.

### Captions

Captions reach sideways around the housing rather than growing down:

```css
#notch-face.captioning .nf-pill {
  width: calc(var(--nf-left-reach) + var(--nf-right-reach));
  transform: translateX(calc((var(--nf-right-reach) - var(--nf-left-reach)) / 2));
  height: calc(var(--nf-notch-h) + 22px);
  border-radius: 0 0 16px 16px;
}
```

The `translateX` recentres the pill when the two reaches differ, so text sits balanced around a notch that is not in the middle of the screen.

---

## 6. When you speak: `.listen`

The one unambiguous "he is hearing you" signal. It never goes quiet while the mic is live.

```css
#notch-face.listen .nf-pill {
  width: 250px;
  height: calc(var(--nf-notch-h) + 44px);
  border-radius: 0 0 26px 26px;
  animation: nfListenRadiate 1.9s ease-in-out infinite;
}

@keyframes nfListenRadiate {
  0%, 100% {
    box-shadow:
      0 0 0 1px   rgba(232, 120, 110, 0.34),
      0 0 18px 2px rgba(232, 120, 110, 0.30);
  }
  50% {
    box-shadow:
      0 0 0 1.6px  rgba(240, 149, 140, 0.90),
      0 0 38px 7px rgba(232, 120, 110, 0.62);
  }
}
```

Two shadows, always. The first is a hairline ring that tightens the edge; the second is the bloom. Animating only the bloom makes it look like a lamp behind the notch rather than the notch itself being lit.

**1.9s** is the same rhythm as the wake-up sequence. Listening should feel like the same creature that just woke.

### The sonar

Rings leaving the pill while the mic is open.

```css
#notch-face.listen .nf-sonar i { animation: nfSonar 2.4s ease-out infinite; }

@keyframes nfSonar {
  0%   { width: 120px; height: 44px;  opacity: 0.6; border-width: 2px; }
  100% { width: 340px; height: 150px; opacity: 0;   border-width: 0.5px; }
}
```

The border thins as it expands, so the ring dissolves rather than just fading. Two `<i>` elements, second one offset by half the duration.

### The face while listening

- **Ears and idle mouth surface.** They are hidden at rest (`#notch-face:not(.listen):not(.speak) .nf-ears { opacity: 0 }`) and appear with the coral.
- **The smile shows only here.** Coral `#E8786E`. Never while thinking, never while speaking, never at rest. It is the visual equivalent of nodding along.

### Dictation listens differently

Hera is not a conversation, so it gets a quieter, smaller version:

```css
#notch-face.nf-dictation.listen .nf-pill {
  width: 222px;                              /* narrower than conversation */
  height: calc(var(--nf-notch-h) + 28px);    /* shorter */
  border-radius: 0 0 18px 18px;
  animation: nfYapModeRadiate 2.4s ease-in-out infinite;   /* slower */
}

@keyframes nfYapSonar {
  0%   { width: 110px; height: 30px; opacity: 0.28; }
  100% { width: 238px; height: 76px; opacity: 0; }
}
```

Smaller, slower, dimmer at 0.28 against 0.6. You are dictating into another app, so the notch should be present without asking for attention.

---

## 7. When he speaks: `.speak`

```css
#notch-face.speak .nf-pill {
  width: 250px;
  height: calc(var(--nf-notch-h) + 44px);
  border-radius: 0 0 26px 26px;
  box-shadow: 0 0 34px rgba(232, 120, 110, 0.5);     /* STATIC. no animation */
}
```

**Speaking does not pulse.** The mouth already carries the state, and two things moving at different rates on the same object reads as a glitch. The glow goes on, holds, goes off.

### The mouth

```css
#notch-face.speak #nf-mouth-talk {
  display: block !important;
  transform-box: fill-box;
  transform-origin: center;
  animation: nfTalk 0.28s ease-in-out infinite;
}

@keyframes nfTalk {
  0%, 100% { transform: scaleY(0.45); }
  50%      { transform: scaleY(1.25); }
}
```

A coral ellipse scaling on Y only. **0.28s** is the whole trick: fast enough to read as speech, slow enough not to buzz. It overshoots to 1.25 rather than stopping at 1, because a mouth that only ever shrinks looks like it is closing, not talking.

`transform-box: fill-box` is required, or the SVG scales about the viewBox origin and the mouth slides off the face.

### Driven by audio, not by text

The mouth follows **playback**, never the reply string:

```js
audio.addEventListener("play",  () => face.classList.add("speak"));
audio.addEventListener("ended", () => face.classList.remove("speak"));
```

And there are **two mouths on two bodies**: this one, and the mascot's `__sbwk_talk__`. Both have to be cleared when speech is interrupted, or he flaps in silence. Forgetting one is the most common way this breaks.

---

## 8. When the reply drops down

The pill stops being a pill and becomes a sheet. This is the biggest transition in the system and it has its own rulebook.

### Shedding the pill

```css
#notch-face.nf-answer-open  .nf-pill,
#notch-face.nf-think-open   .nf-pill,
#notch-face.nf-yap-open     .nf-pill,
#notch-face.nf-inline-open  .nf-pill,
#notch-face.nf-answer-exiting .nf-pill,
#notch-face.nf-surface-exiting .nf-pill {
  overflow: visible;
  border: 0;
  background: transparent;          /* the pill's own body goes away */
  box-shadow: none;
  backdrop-filter: none;
  clip-path: none;
  filter: none;
  transform: translateX(0);
  animation: none;                  /* every breath and pulse stops */
}
```

The pill hands its appearance to two pseudo-elements. It becomes a layout box and nothing else.

### `::before` is the sheet

```css
.nf-pill::before {
  content: "";
  position: absolute; z-index: 0;
  inset: 0;                                        /* anchored at y=0 */
  border-radius: 0 0 28px 28px;                    /* square on top */
  background: linear-gradient(180deg, rgba(0,0,0,.99), rgba(8,8,8,.98));
  box-shadow: 0 24px 70px rgba(0,0,0,.46);
  pointer-events: none;
}
```

**`inset: 0` is load-bearing.** This began as `top: calc(var(--nf-safe-top) + 8px)` with a full 28px radius, which put an 8px strip of desktop between the housing and the sheet and rounded the top corners. Every answer then read as a separate card hovering below the notch instead of the island growing out of it.

No inset top hairline either: at `y=0` it would draw a lit line across the very top of the screen on both sides of the notch. Depth comes from the drop shadow alone.

Every child (`.nf-answer-short-row`, `.nf-answer-long-head`, `.nf-inline-caption`, `.nf-thinking-canvas`) already offsets itself by `--nf-content-top` measured from the pill top, so they were all written for a sheet starting at `y=0`. Only the background had drifted.

### `::after` is the housing patch

```css
.nf-pill::after {
  content: "";
  position: absolute; z-index: 1;
  top: 0; left: 50%;
  width: var(--nf-notch-w, 190px);
  height: calc(var(--nf-safe-top) + 24px);
  border-radius: 0 0 18px 18px;
  background: #000;
  transform: translateX(-50%);
}
```

Pure black, exactly notch-width, sitting over the sheet where the physical housing is. The sheet's gradient is not quite `#000`, and without this patch you can see the difference against the hardware.

### Timing: the answer is faster than the surface

```css
/* Big reading surfaces open slowly, like an object with mass. */
#notch-face.nf-think-open .nf-pill,
#notch-face.nf-yap-open   .nf-pill,
#notch-face.nf-inline-open .nf-pill {
  transition:
    width         1050ms cubic-bezier(.22, 1, .36, 1),
    height        1050ms cubic-bezier(.22, 1, .36, 1),
    border-radius  950ms cubic-bezier(.22, 1, .36, 1),
    background     700ms ease,
    box-shadow     850ms ease;
}

/* An ANSWER is a reply, and a reply should land. */
#notch-face.nf-answer-open    .nf-pill,
#notch-face.nf-answer-exiting .nf-pill,
#notch-face.nf-surface-exiting .nf-pill {
  transition:
    width         420ms cubic-bezier(.22, 1, .36, 1),
    height        280ms cubic-bezier(.22, 1, .36, 1),
    border-radius 360ms cubic-bezier(.22, 1, .36, 1),
    background    180ms ease,
    box-shadow    240ms ease;
}
```

**Why the answer breaks the 1050ms family.** A spoken line can be shorter than the cinematic shell transition. On the slow curve the next sentence starts arriving while the sheet is still resizing for the previous one, so each line renders inside the wrong geometry. 420/280 keeps the same easing family and the same feel, and lets height catch the measured copy in time.

**Height is faster than width (280 against 420)** for the same reason: depth is what the next line needs, so it settles first. It also happens to read as dropping rather than unfolding.

### Exiting is its own state

`.nf-answer-exiting` and `.nf-surface-exiting` exist so the sheet keeps the shed-pill styling while it collapses. Without them, `overflow`, `background` and `animation` all snap back on frame one and the sheet flickers into a pill before shrinking.

### Short or long

Two answer shapes, chosen by measured content height:

- **short**: 480 wide, min 146. One or two lines. A remark.
- **long**: 580 wide, min 164, growing to the screen. Something to read.

The width difference is the signal. A short answer that is 580 wide looks like it is missing something.

---

## 9. Thinking

Between hearing and answering.

```css
@keyframes nfThinkDot {
  0%, 100% { opacity: 0.3; transform: translateY(0); }
  50%      { opacity: 1;   transform: translateY(-2px); }
}

@keyframes nfThinkShimmer {
  from { background-position: 180% 0; }
  to   { background-position: -80% 0; }
}

@keyframes nfThinkBreath {
  0%, 100% { box-shadow: 0 0 14px rgba(232,120,110,.18), 0 0 30px rgba(232,120,110,.08); }
  50%      { box-shadow: 0 0 26px rgba(232,120,110,.38), 0 0 52px rgba(243,154,66,.16); }
}

@keyframes nfThinkingLive { 50% { opacity: .38; transform: scale(.72); } }
```

- **The dot** lifts 2px as it brightens. Rising, not just blinking.
- **The shimmer** sweeps a light band **right to left** across the text, from `180%` to `-80%`. It travels past both edges so there is no visible start or stop.
- **The breath** blends coral into amber at the peak. The only place in the notch where two accents mix, and it is what makes thinking feel warmer than listening.
- **The face** goes to lids: eyes lidded, no smile.

Thinking open is 580 wide and at least 280 tall, on the slow 1050ms curve.

---

## 10. The face, in full

A 230×72 SVG. White eyeballs, `#1B1713` pupils, glints. Folds hidden against the black.

### Blink

```css
@keyframes nfBlink {
  0%, 100% { transform: scaleY(1); }
  50%      { transform: scaleY(0.12); }
}
```

`0.12`, never `0`. A pupil scaled to zero disappears entirely and the blink reads as a dropped frame.

### Wink

```css
@keyframes nfWink {
  0%, 100%  { transform: scaleY(1); }
  35%, 65%  { transform: scaleY(0.08); }
}
```

Note the held plateau between 35% and 65%. A blink passes through the closed position; a wink stops there. That pause is the entire difference between the two.

### Breathing ears

```css
@keyframes nfFaceBreathe {
  0%, 100% { stroke: rgba(255,255,255,.38); opacity: .5; }
  50%      { stroke: #ffb4ab;               opacity: 1; }
}
```

Colour **and** opacity together. Either alone reads as a rendering artifact.

### Scanning

For movie mode and vision, when he is reading the screen rather than listening.

```css
@keyframes nfScanLook {
  0%, 100% { transform: translateX(0); }
  22%      { transform: translateX(-3.4px); }
  48%      { transform: translateX(3.2px) translateY(-1.4px); }
  74%      { transform: translateX(-1.6px) translateY(1.2px); }
}
```

Deliberately uneven: 22, 48, 74, with asymmetric distances and a touch of vertical. Evenly spaced keyframes look like a metronome. Eyes do not scan on a metronome.

---

## 11. Idle and ambient

```css
@keyframes nfIslandBreath {
  0%, 100% { box-shadow: 0 0 12px rgba(232,120,110,.16), 0 0 26px rgba(232,120,110,.07); }
  50%      { box-shadow: 0 0 22px rgba(232,120,110,.34), 0 0 46px rgba(243,154,66,.14); }
}
```

**3.8s.** Roughly a resting breath, and much slower than the 1.9s of listening. The two rhythms are far enough apart to be told apart without looking directly at them.

True idle has **no animation at all**: pure black, exactly notch-width, merged with the housing. Only his eyes float in the black. `.live` is the ambient breathing state, not the resting one.

---

## 12. The greeting

The morning drop, and the biggest single move the notch makes.

```css
#notch-face.nf-iomi-expanded .nf-pill { width: 610px; height: 180px; border-radius: 0 0 38px 38px; }

@keyframes nfGreetGlow {
  0%   { box-shadow: 0 0 0 rgba(232,120,110,0); }
  30%  { box-shadow: 0 0 34px rgba(232,120,110,.85), 0 0 60px rgba(243,154,66,.4); }
  100% { box-shadow: 0 0 12px rgba(232,120,110,.16), 0 0 26px rgba(232,120,110,.07); }
}
```

The peak is at **30%, not 50%**. It flares early and settles slowly, which is the shape of something arriving. A symmetric glow reads as a notification.

It settles exactly onto the `nfIslandBreath` resting values, so the greeting hands off to ambient with no visible seam.

---

## 12b. Listening, from waking to asleep

All of these live in the inline caption sheet (`.nf-inline-open`, 480 wide, min 136 tall, radius `0 0 32 32`), so nothing changes shape when your words arrive.

| Class | Label · chip | Line | Notes |
|---|---|---|---|
| `.nf-voice-starting` + `.nf-inline-working` | Voice · CONNECTING (shimmer) | `Go ahead, I'm listening` (HERA on) or `Connecting` | 22px/600 at 70% white. No countdown. The boot trace draws around the sheet: gold for "Hey Braino", blue (`.nf-waking-voice`) for Control twice |
| `.nf-voice-ready` | Voice · ● LIVE | `You can speak now` | coral chip with a pulsing dot (`nfMeetingPulse`). Holds 2.4s, or until your words arrive |
| `.nf-inline-hera` | You're saying · ● HERA (mint) | your words, live | HERA on this Mac, while you are still talking. Mint is HERA's colour everywhere in the notch |
| *(heard)* | You said · Live | your words | once you stop |
| `.nf-inline-working` (+ `.nf-thinking`) | You said · THINKING (shimmer) | your words | the sentence stays for the whole job. A rule at the end of the stylesheet makes the open sheet win over the collapsed thinking pill (430×84) and hides the centred chip |

**Long speech: `.nf-inline-long` + `.nf-inline-trimmed`.** Past 110 characters the sheet takes the 580 reading width (latched until the caption closes, so it never jumps sideways mid-sentence), 28px side padding, 16px text at 1.55 line height. Text is trimmed from the front at a word, no "...", and the top 1.6em fades out with a mask.

There is no countdown: a number made a slow connection look slower. HERA listens from the press, so what you say while it connects is sent the moment the session is live.

**Asleep, listening for his name: `.nf-name-asleep`.** 284 wide, `+30` tall, radius `0 0 20 20`, no animation. The ticker line reads `Say “Hey Braino” to wake me` (Brainelle's name when she is the avatar) at 60% opacity. It is the lowest-priority ticker slot. Deliberately not the listening look: `.listen` is suppressed while asleep.

**His name, heard: `.nf-name-wake`.** Only after a real sleep (20s+), never on every named sentence; the 90s idle shimmer is off so the gold trace means only this. The boot trace (`.nf-shine`), once, stretched to the listening pill (250 × `+44`) over 1.1s with a non-scaling stroke, then `.listen` takes over. The trace SVG has `preserveAspectRatio="none"`, so any state can size it.

The thinking chip is one word, `Thinking`. The old four-word cycle is gone.

---

## 13. Other states

| Animation | Where | Note |
|---|---|---|
| `nfAuthPulse` | `.busy` 1.6s, `.nf-auth` 1.3s | Uses `--nf-boot-color` as an rgb triple, so mode boots can recolour it |
| `nfAlarmPulse` | `.alarming` 1.1s | Fastest pulse in the system. Only for alarms |
| `nfMeetingPulse` | REC dot, 1.7s | `opacity 1→.35`, `scale 1→.78`. Shrinks as it dims |
| `nfBars` | audio meter | `height 6px ↔ 20px` |
| `nfArrowBob` | the suggestion arrow | 2px along its own 45° diagonal |
| `nfMarquee` | overflowing single-line text | |
| `nfShineDraw` | `stroke-dashoffset → 0` | Draws a stroke on. Boot and success |
| `nfHeraNameShimmer` | the HERA wordmark | `background-position → -220%` |
| `nfModeBoot` / `nfMondayBoot` | mode entry | `1.15s cubic-bezier(.16,1,.3,1)`, `1 both` |
| `nfFlash` | error, correction | Rides the 0.16s `filter` transition |

---

## 14. The hold-states guard

**Not optional.** This is what makes the notch feel stable rather than twitchy.

```js
const notchHolds = ["short", "long", "input", "menu", "signin", "record"]
  .includes(notchState);
```

Those six are states a person is **currently using**: reading an answer, typing, choosing from a menu, signing in, recording. A background update that stomps one of them yanks the interface out from under a hand that is mid-sentence.

Everything else may be replaced freely.

```js
function setNotchState(next, { force = false } = {}) {
  if (!force && HELD.has(current) && next !== current) return;
  current = next;
  face.className = next;
}
```

Only an explicit user action passes `force`.

---

## 15. Colour

```css
--nf-coral:  #E8786E;              /* Braino. mouth, glow, sonar, think dot */
--nf-coral-rgb: 232, 120, 110;
--nf-amber:  rgb(243, 154, 66);    /* appears ONLY at the peak of a breath */
--nf-pupil:  #1B1713;
--nf-ear-lit: #ffb4ab;
```

**Coral is never a fill.** It is a glow, a mouth, a ring stroke, a dot. The moment it becomes a background the notch stops being a hole in the screen.

Amber never appears alone. It exists to warm the top of a coral breath, in `nfIslandBreath`, `nfThinkBreath` and `nfGreetGlow`, and nowhere else.

### The ink ladder

```css
.nf-label { font: 650 9px/1     system-ui; text-transform: uppercase;
            color: rgba(255,255,255,.6); }
.nf-body  { font: 500 17px/1.48 system-ui; color: rgba(255,255,255,.68); }
.nf-short { font: 500 17px/1.38 system-ui; color: #f7f7f5; }
/* karaoke, as a line is spoken */
.nf-word            { color: rgba(255,255,255,.28); }
.nf-word.is-current { color: rgba(255,255,255,.84); }
.nf-word.is-done    { color: #fff; }
```

Body and short are the same size (17px) and differ only in leading and brightness. Short answers are brighter and tighter because they are glanced at; long ones are dimmer and airier because they are read.

### Buttons

```css
.nf-btn         { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); }
.nf-btn.primary { background: rgba(255,255,255,.88); color: #050505; }
```

White glass. No coral on a button, ever. Coral is him, not the chrome.

---

## 16. Fonts

SF Pro Display, bundled as a 64KB subset WOFF2 pair.

**The `@font-face` must be injected into the document, not the shadow root.** Shadow roots cannot declare fonts. This fails silently by falling back to system UI, which looks almost right, which is why it survived so long.

---

## 17. Themes

Default is black. `.glass` is opt-in, persisted as `sbNotchTheme`, toggled by the ◐ button.

```css
#notch-face.glass .nf-pill {
  background: linear-gradient(180deg, rgba(12,12,14,.72), rgba(10,10,12,.58));
  backdrop-filter: blur(26px) saturate(150%);
  border: 1px solid rgba(255,255,255,.14);
  box-shadow: inset 1px 1px 1px rgba(255,255,255,.2);
}
```

The specular hairline is what stops it looking like a grey rectangle. Both `border` and the `inset` highlight, together.

Glass on a machine with a physical notch breaks the illusion, because you can see the housing through it. It is for external displays.

---

## 18. Building it

1. **The pill and idle.** Exactly notch-width, pure black, no animation. Get the join with the housing invisible before anything else. If you can see the seam, nothing built on top will look right.
2. **`.listen` and `.speak`.** Same box, different light. Prove the shape does not change when the conversation turns around.
3. **The face.** Eyes, blink, mouth. Blink to `0.12`, mouth at `0.28s`.
4. **The answer sheet.** The pseudo-element split, `inset: 0`, and height faster than width.
5. **The hold guard.** Before any background state can write to the notch.
6. Everything else.

### Traps

- **Never tint the pill background** in a state class. Coral leaks through the housing.
- **`inset: 0` on the sheet.** Any top offset turns the island into a floating card.
- **`transform-box: fill-box`** on the talking mouth, or it scales about the viewBox origin.
- **Blink to `0.12`, not `0`.**
- **Height must be faster than width** on the answer, or it unfolds instead of dropping.
- **Keep `.nf-answer-exiting`.** Without it the sheet flickers back into a pill before collapsing.
- **Clamp every measured height** against the screen, or a long answer runs off the bottom.
- **The `@font-face` goes in the document**, not the shadow root.
- **Two mouths.** The notch and the mascot. Clear both when speech stops.
- **Do not animate `left`/`top`.** Width, height, transform and border-radius only.

---

## 19. Reference: every animation

| Name | Duration | Easing | What |
|---|---|---|---|
| `nfIslandBreath` | 3.8s | ease-in-out | ambient breathing |
| `nfListenRadiate` | 1.9s | ease-in-out | he is hearing you |
| `nfSonar` | 2.4s | ease-out | rings while the mic is open |
| `nfYapModeRadiate` | 2.4s | ease-in-out | dictation listening, quieter |
| `nfYapSonar` | 2.4s | ease-out | dictation rings, smaller |
| `nfTalk` | 0.28s | ease-in-out | the mouth |
| `nfThinkDot` | ~1.2s | ease-in-out | thinking dot, lifts as it brightens |
| `nfThinkShimmer` | ~2s | linear | light sweep across thinking text |
| `nfThinkBreath` | ~2.6s | ease-in-out | coral into amber |
| `nfThinkingLive` | ~1.4s | ease-in-out | live thinking marker |
| `nfBlink` | ~4s cycle | ease | eyelid |
| `nfWink` | ~0.6s | ease | eyelid, with a plateau |
| `nfFaceBreathe` | ~3s | ease-in-out | ears |
| `nfScanLook` | ~3s | ease-in-out | eye dart, uneven on purpose |
| `nfGreetGlow` | ~1.4s | ease-out | the morning arrival |
| `nfAuthPulse` | 1.3 / 1.6s | ease-in-out | auth and busy |
| `nfAlarmPulse` | 1.1s | ease-in-out | alarms |
| `nfMeetingPulse` | 1.7s | ease-in-out | REC dot |
| `nfBars` | ~0.9s | ease-in-out | audio meter |
| `nfArrowBob` | ~1.6s | ease-in-out | suggestion arrow |
| `nfShineDraw` | ~1s | ease-out | stroke draws on |
| `nfHeraNameShimmer` | ~2.4s | linear | HERA wordmark |
| `nfModeBoot` | 1.15s | `cubic-bezier(.16,1,.3,1)` | mode entry, once |
| `nfMondayBoot` | 1.15s | `cubic-bezier(.16,1,.3,1)` | Monday entry, once |
| `nfMarquee` | content | linear | overflowing single line |
| `nfFlash` | 0.16s | ease | error or correction |
| `nfCoralWave` | ~2s | linear | coral gradient sweep |
| `nfWaveTravel` / `nfFlowTravel` | ~2s | linear | flow indicators |
| `nfIomiLetterIn` / `nfIomiGreetingWord` | staggered | ease-out | greeting text |
| `nfIomiWalkerJump` | ~0.9s | `cubic-bezier(.22,1,.36,1)` | mascot leaving the notch |
| `nfPrivacyPulse` | ~2s | ease-in-out | privacy indicator |
| `nfBrainelleBreathe` | ~3.8s | ease-in-out | Brainelle's ambient |
