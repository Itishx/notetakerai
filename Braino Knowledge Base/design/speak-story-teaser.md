# Speak — the story teaser

**Type:** Design decision
**Platform:** Braino website
**Status:** MVP
**Released:** August 25, 2026

## The simple version

A five second vertical teaser at `/speak-teaser`, built for Instagram stories and reels.
"Speak," fades in and clears. "Watch it happen." takes the same spot and clears. Then the
grammar changes: "Braino" lands in that same spot in the real Don't Blink chunked stamp, the
frame flips white for a beat, and the character is standing next to the wordmark. It downloads
as a 1080 x 1920 video.

## Why it exists

Every other Braino film is a story with a script. This one is a signature: the shortest
possible statement of what he is, short enough to sit at the end of a story or in front of a
carousel. The two fades are the promise and the stamp is the proof, so the change in grammar
carries the punchline rather than any extra words.

## How to use it

1. Open `/speak-teaser`.
2. Play, pause or restart to review it.
3. Choose **Download video · 1080 × 1920** and post the file.

## What it does

- Runs 5.4 seconds at 60fps, silent, so it reads on mute in feed.
- Keeps the Don't Blink type system exactly: SF Pro Display at 600, -.025em tracking, white on
  pure black, and no movement on any word. Only opacity and brightness.
- Keeps the first rule: ONE dead-centre spot that every line takes its turn in. A line clears
  before the next arrives, and nothing is ever stacked below anything else.
- Fades the first two lines in as whole phrases, which no other Braino film does.
- Stamps "Bra" then fuses "ino" flush onto it, and fires the white match cut on the fuse.
- Holds the character beside the wordmark from the first stamp, so he is planted, not arriving.
- Records straight off its own canvas at exactly 1080 x 1920.

## Honest limitations

Recording depends on browser `MediaRecorder`, so it needs a current Chrome or Safari. The
container drops a beat off the tail of any recording, so the film holds its last frame while
recording and the clip runs slightly past the film's own end. There is no music yet. It is not
registered under `/knowledge` as its own public page.

## Technical shape

- Film and controls: `src/pages/SpeakTeaser.tsx`
- Page chrome and the font face: `src/pages/speak-teaser.css`
- Route: `/speak-teaser`, listed in `src/pages/MotionGraphicsHub.tsx`
- Character art: `src/components/brainoWalkerSvg.ts`, rasterised once and drawn per frame

`drawFilm(ctx, t)` is a pure function of time, so the preview and the recording cannot drift
apart and any frame can be reproduced from its timestamp alone.

## Product or design decisions

**It is drawn on a canvas, and the other films are not.** This one has to leave the building as
a file. The shared DOM recorder rasterises the node through html-to-image once per frame, which
measured about one frame per second on this film, and a kinetic film at one frame per second is
not a film. A canvas records off its own compositor at the real frame rate with no rasterise in
the loop. The type spec, the timings and the grammar are unchanged; only the substrate moved.

**One spot, taken in turns.** The first build stacked the three lines so the last frame held
all of them at once. That breaks the film's oldest rule: every kinetic line in a Braino film
shares one dead-centre spot and they take turns in it. The lines now fade in, hold, and clear,
with a beat of pure black between each handover.

**The payoff row is laid out from the finished word every frame.** If the row were measured from
"Bra" alone, the character and the first half would both jump the instant "ino" landed. The DOM
films solve this by keeping the fused half laid out and hiding it with visibility; the canvas
solves it by measuring the full word and drawing the half at the same left edge.

**The stamp is suppressed under the match cut.** The frame flip is the effect. Two effects
firing on the same word reads as noise, not as a cut. This is the same rule the flagship film
follows for "Boom" and "Don't Blink."

## Verification

Recorded end to end in a real browser: the file decodes at 1080 x 1920 and frames pulled back
out of it show the right line at the right time. The centre line was sampled every frame and
carries ink in exactly three spans, 349 to 1633ms, 1866 to 3183ms and 3415ms to the end, with
black between them, which is the proof that nothing is stacked. The match cut fires from 3666
to 3799ms, inside its intended 3660 to 3810 window. The film runs at 60fps.
