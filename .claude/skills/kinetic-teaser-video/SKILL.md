---
name: kinetic-teaser-video
description: Use this skill whenever the user hands you a script and asks for a fast kinetic-typography teaser video (Apple-keynote style, "don't blink" energy) — text-driven reveals intercut with a real product graphic, beat-synced to music. This is a Claude Code authoring skill, not a Braino product skill — it captures the exact DNA of /notch-teaser (src/pages/NotchTeaser.tsx) so a new script gets the same system, not a re-derivation from scratch.
---

# Kinetic Teaser Video — the DNA

Reference implementation: `src/pages/NotchTeaser.tsx` + `src/pages/notch-teaser.css`.
Don't reinvent this system per-script — reuse its primitives (`phraseSeq`, `sequence`, `kinetic`, `kineticStarts`, the fuse convention, match cuts) and just swap the words/timings/graphic.

## The shape of the film

1. **Cold open** — the product name, word by word, dead centre. High intensity, no context yet.
2. **Intro sting** — a short punchy line ("Let's fucking go" energy), per-word frame invert (match cut) on alternating words.
3. **The graphic moment** — the REAL product UI (not a mockup) boots up live: a genuine boot/auth/reveal sequence borrowed from the actual component, not faked.
4. **A quiet beat** — the product looks/listens/reacts (no text) — a breathing moment before the pitch ramps up.
5. **Reveal** — one or two short declarative lines about what it does.
6. **Hype** — a rapid-fire pitch, several short phrases in the same spot, escalating, trailing into a pivot line ("wait... let's just ask him").
7. **Live demo lifecycle** — the REAL component runs its actual states on camera (listening → transcribing → answering), not simulated text. The "answer" is a fast flicker of real capability words ending on one punchline held longer than the rest.
8. **The punch** — one big single/two-part word, its own singular beat, way bigger than everything else (mic-drop).
9. **Tagline** — a short phrase, holds, clears, replaced by the actual tagline.
10. **Brand reveal** — product name + category, match cut, the two words fuse into one ("BrainoNotch").
11. **One more thing** — a genuinely NEW reveal never mentioned earlier in the script (not a restatement of something already said — see "Choosing the reveal" below).
12. **Close** — the graphic forms, winks/reacts once, hard cut to black. No fade on the very last frame — decisive.

## The accumulation rule (the core mechanic)

**Every reveal is additive, never a fade-through-replace, unless it's a genuine scene change.**

- A **sentence over ~4 words** splits into **phrases** that share one spot: phrase clears, next phrase takes its place (hard cut, no cross-fade) — this is `sequence()` + `phraseSeq()`.
- **Within one phrase**, words **accumulate**: each new word joins, all previous words in that phrase stay visible — this is `kinetic()`/`kineticAt()`, driven by `i <= active`.
- A **word itself** can be built from two staggered "stamps" that accumulate into one fused word (see Fuse convention below) — e.g. "Bo" lands, then "om" joins to complete "Boom".

So there are three accumulation layers: phrase → word → sub-word. Decide the right layer per line: a short punchy phrase (≤4 words) reveals word-by-word directly; a longer line splits into phrases first.

## The fuse convention

A word prefixed with `+` in a phrase array fuses flush against the previous word (cancels the shared flex `gap`) instead of getting normal spacing. Built into `sequence()`:

```ts
["Fast", "+er."]        // reads "Faster." — two staggered stamps, one word
["Don't", "Bli", "+nk."] // reads "Don't Blink." — normal space before Bli, fused nk.
```

Use this for any "build a word in front of the viewer" beat. Don't use it for two words that should just read as two words with normal spacing — combine those into ONE array entry instead if they need to land simultaneously (e.g. `"Like crazy"` as one string reveals both words together, not staggered).

**Chunking is chosen, not computed, and it is RARE.** Across IntroTeaser (1543 lines) and NotchTeaser (1085) there are seven chunked pairs between them:

```
do|ing.    un|der    Fast|er.    As|k.    Bli|nk.    Braino|OS    Braino|Notch
```

The head is a chunk you can already read and the tail is usually the **suffix**, so the second stamp completes a word rather than finishing a spelling. Split on meaning: `wait`+`s.`, `open`+`ed.`, `al`+`ready`, `a`+`wake.`, `Brain`+`o.` — that last one works because the word *Brain* is already sitting inside the name and the split just shows you.

**Never write a formula for this.** A rule that halves every word of four-plus letters produces `Bra`/`ino.`, `Th`/`is`, `one`/`'s` — a machine spelling words out, which is exactly how it reads on screen. Words with no natural break (`told.`, `This`, `app`) stay whole, and most words in a script stay whole.

**Chunking adds stamps to a line, so bring that line's cadence down** or it plays at half speed. A 3-word line at 360ms becomes a 4-stamp line at ~300ms for the same reading pace.

## Match cuts (frame inversion)

**Invert sparingly — usually ONE beat in the film.** Flipping on every chunk of every line means the frame strobes for most of the run and nothing reads as a hit. Pick the payload (the date, the mic-drop word) and let everything else stay on white.

**The completed line must land on WHITE.** With an `idx % 2` alternation, check the parity against the chunk count: on the wrong one the frame goes black at the exact moment a sentence finishes, and the film reads as ending mid-sentence. This is the single easiest thing to get backwards here.

The white/black full-frame flip, held while a specific word/phrase is the active one. Reuse the ONE shared `invert2` overlay element across every match-cut moment in the film (they never overlap in time, so one element suffices) — see `render()`'s consolidated block right after the intro's own invert logic.

**Critical bug to never repeat**: `kinCache`/`seqIdx` track the *last reached* index, which **latches forever** once a word lands (by design, so revealed text stays visible). Never use that latch alone as a match-cut gate — it will stay true for the rest of the film once triggered. Always bound it with the scene's own time window:

```ts
const boomInv = t < T.tag && (kinCache.get(boom)?.last ?? -1) === 1;   // bounded — NOT just the latch
```

Also: `kinCache`/`seqIdx` never auto-reset on a natural loop-wrap or manual restart — only `manualT` resets to 0. Call an explicit `resetSceneCaches()` (clears both maps) at every restart point (loop-wrap, restart-from-end, re-entering fullscreen), or stale latched state from the previous playthrough will misfire immediately on frame 1 of the replay.

## Pacing philosophy

- Cadence generally **accelerates** as the film progresses — later beats can be snappier than earlier ones.
- **But** don't let acceleration erase the *feel* of an anchor beat. If the user calls one beat "perfect" (e.g. "He's smarter now."), that beat's timing is the benchmark — match OTHER beats to it, don't speed the benchmark up further.
- Every phrase-to-phrase transition has a `GAP` (default) that can be overridden per-transition via `phraseSeq`'s optional `gaps` array — use this to give a specific beat more breathing room (a held moment) or trim it snappier (a quick exit), without touching the global word cadence.
- A word/stamp needs enough time to actually *land* before the next one appears — if the per-word cadence is shorter than the stamp-in animation (~180ms), it reads as choppy no matter how "fast" the film should feel. Cadence should never be faster than the stamp can resolve.
- One frame in this project's own vocabulary = **33ms** (the scrubber's step unit) — when asked to nudge timing "by N frames," that's `N × 33ms`.

## Choosing the "one more thing" reveal

A real "one more thing" reveals something **the video hasn't already said**, in **the same visual/textual mechanic** as everything else (don't switch typography systems for a one-off tease unless explicitly asked). A renamed restatement of an idea already shown earlier ("Hands-On" restating "sees your screen and helps") is NOT a new reveal — catch this before shipping it. Pick a genuinely different axis of the product (a different feature category entirely) so it lands as a surprise.

## Typography & layout rules

- **One dead-centre spot, one size, one weight** for all kinetic text, via one shared CSS selector list — every new line joins that selector, not a bespoke rule, unless a beat is explicitly meant to look different (e.g. an "editorial" tease can swap font-family/style, but should still inherit position/size from the shared block unless told to change those too).
- GPU-promote anything animating every frame (`will-change: opacity`).
- `render(t)` is a **pure, deterministic function of time** — the whole film must be scrubbable and restartable from any `t`. Never rely on incremental/relative state that isn't reconstructable from `t` alone (this is why the kinCache-latch bug above is a trap — it's *not* deterministic from `t`, it's deterministic from history).
- A special "big reveal" graphic beat (like the mic-drop word) can get its own font-size override — but confirm scale with the user before going extreme; "10x" read as broken/out-of-proportion in practice, a modest 1.5–2x bump reads as "bigger" without breaking composition.

## Timeline architecture (the code pattern)

- One `buildTimeline(H, snap)` function returns every scene's start offset in ms, built by chaining `S2(prevEnd + duration)` calls — `S2` enforces strictly-forward time and optionally snaps to a music beat/downbeat.
- Only the 2-3 BIGGEST hits (boot, a major match cut, the final wink) should snap to the beat grid — snapping every scene start inserts dead air between sentences that should chain tightly.
- ONE tunable `H` ("hold") is solved via `solveHold(targetMs)` so the whole film hits an exact target duration — word cadences stay fixed, only the hold value flexes to fit.
- The graphic (real product UI) is ONE persistent element that fades in/out and changes state across MULTIPLE scenes (boot, demo lifecycle, wink) rather than being duplicated — never let it show two different states/appearances back-to-back with a hard cut UNLESS that's an intentional beat (like the closing wink); a same-graphic state-flicker between adjacent scenes reads as a mistake, not a transition (this was a real bug: a wink beat immediately followed by a state-reset read as "it popped twice").

## Before shipping any change

1. Typecheck: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -i NotchTeaser` (or the equivalent file for a new script).
2. Check for CSS specificity collisions when adding a new rule that targets an already-styled selector (e.g. `.scene .nt-word.in`) — two equal-specificity rules setting the same property silently pick whichever is LAST in source order, not whichever you just added. Bump specificity explicitly (add a class, or `!important` as a last resort with a comment explaining why) rather than hoping ordering saves you.
3. If asked to snapshot the current state before a round of changes, mirror the existing `teaser-backups/FINAL_N/` pattern (copy the source `.tsx`, its `.css`, and any component/lib files it depends on into a new `FINAL_N+1/` folder) so the user can always revert.
