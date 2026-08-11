# BrainoHERA Don’t Blink Teaser

**Type:** Design decision  
**Platform:** Braino website and Motion Graphics  
**Status:** MVP  
**Released:** August 9, 2026

## The simple version

BrainoHERA now has its own Don’t Blink film. It interrupts the scroll, acknowledges the voice-typing behavior people already learned, and shows Braino doing it locally through the actual Mac notch transcript surface.

## Why it exists

The BrainoHERA page explains the product carefully. The film has a different job: make the local speed, offline behavior and privacy architecture felt in a few seconds without turning into another tutorial.

## How to use it

1. Open `/brainohera-teaser` for the full-screen film.
2. Add `?embed=1` when playing it inside Braino TV.
3. Use the transport to replay or scrub while reviewing timing.
4. Find it at the top of `/motion-graphics`.

## What Braino knows or does

- Uses the approved script without rewriting its sentences.
- Keeps every individual kinetic frame to three visible words or fewer and constructs every word from two fused chunks using the flagship Don’t Blink grammar.
- Uses black as the complete film base with HERA-green typography and green match-cut frames.
- Uses the local Victory Lap track from `00:13` and snaps each visual card to its detected musical pulse while preserving readable authored holds.
- Recreates the real Mac HERA notch: black sheet, green dot, shimmer wordmark, transcript stack, fading history and live caret.
- Ends the BrainoFlow name joke with only HERA: H, E, R and A land at up to 220px as four hard metallic stamps. Each letter uses a fast diagonal slash-cut wipe with no translation, scale, looping shimmer, glitter or bounce. The closing F, O, U, N, D, R and Y letters retain their separate Foundry payoff. Its faulty terminal match cut remains removed.

## Honest limitations

The privacy sequence describes the local English path. Hindi and mixed Hinglish still use Braino’s cloud transcription model. The teaser is a responsive web composition; final social exports may still need a dedicated aspect-ratio render and music-clearance review.

## Technical shape

- Film and locked beat list: `src/pages/BrainoHeraTeaser.tsx`
- Film-specific composition: `src/pages/braino-hera-teaser.css`
- Shared kinetic player: `src/components/KineticFilm.tsx`
- Shared motion grammar: `src/lib/dontBlinkBlueprint.ts`
- Source track: `teasermusic/victorylap.mp3`
- Route and lazy loading: `src/App.tsx`
- Motion Graphics registration: `src/pages/MotionGraphicsHub.tsx`
- Permanent public documentation: `src/pages/BrainoHeraTeaserDocs.tsx`
- Knowledge registry: `src/lib/brainoKnowledge.ts`

## Product or design decisions

The locked founder-story script opens with “Stop scrolling, homie. Real story.” It explains that Itish built Braino by talking through every note, prompt and 2am idea, credits Wispr Flow honestly, and turns on the personal realization: “Why is talking someone else’s job?” The offline proof now ends on “My voice never leaves this Mac.” Its goosebump line is “The words that built Braino… now Braino types them.” The naming fake-out resolves emotionally rather than as a joke: “She’s not a flow. She’s family. HERA.” All rendered em dashes remain removed.

“And one night”, “it hit me”, and “wait” stay in the normal kinetic grammar. The following four-line thought uses one dedicated renderer from start to finish: “I'm building an AI” constructs first, then “that lives on your Mac”, “Why is talking”, and “someone else's job?” build underneath it one by one. Using one renderer avoids a duplicate handoff between a normal card and the stack. The stack snaps in whole words every 190ms rather than fading or putting split halves in separate flex items. Its compressed 36px row pitch makes the four lines feel like one dense thought, and every completed line remains fully lit in HERA green. Victory Lap mutes for all four thought beats and resumes as “So I taught him” begins.

The notch demo behaves like live dictation rather than a horizontally revealed slogan. The original offline proof builds downward across four visible, split-word lines: “On a plane? Still types.”, “Wifi died? Still types.”, “Middle of nowhere?”, and “Beautiful. Still types.” The newest line stays in view while its chunks arrive, completed lines remain visible above it, and the proof hold is long enough for the final line to finish before the exit.

“But now it lives in your notch” leads directly into the notch proof. The aesthetic aside comes only after the audience has seen it: “and yeah… it's prettier.” A separate “We know.” card then triggers the match cut.

The comparison beat now ends cleanly on “Same speed, same magic.” The redundant “you're used to” card has been removed.

The composition keeps its faster overall rhythm through shorter holds, proof timing, zooms and fades. Chunk assembly is deliberately decoupled from that speed: every split half has a 170ms minimum cadence, preventing fast cuts from collapsing two halves into one unreadable arrival. Normal chunks have no brightness, glow or glitter animation. The opening “Stop scrolling, homie” remains the one explicit unchunked whole-phrase fade.

The opening is a quiet interruption—“Stop scrolling, homie.”—rather than the earlier voice-typing tutorial. It is one small centered line with a smooth fade. Its three words remain whole and unchunked, then the completed line holds for an additional second before the hard kinetic rhythm begins. The rest of the kinetic script constructs every word from two fused chunks except “Wispr can’t,” which fades in as one complete phrase after a short black transition from the notch. Those word builds run 18% faster than the earlier review cut while the opening, pauses and graphic holds remain untouched. Match cuts remain distributed across the film and snapped to nearby Victory Lap pulses.

“Never leaves home” uses the normal body scale. It is an emotional privacy line, not a product-name reveal, and enlarging it made the hierarchy feel arbitrary.

Black is the base for the entire video and HERA green owns ordinary copy. Beat-aligned cuts briefly invert that relationship to green frames with black type. “Foundry” has no terminal match cut because that produced a faulty final flash. The notch proof remains fully black.

The “Wispr Flow” match cut is the one monochrome exception: a white full-frame inversion with black type. This separates the credited external product from BrainoHERA’s black-and-green identity without changing the rest of the cut system.

The competitor frame uses explicit fused tokens rather than the generic word parser: `Ev` + `er`, `sin` + `ce`, `Wis` + `pr`, and `Fl` + `ow`. This preserves the correct “Ever since Wispr Flow” spelling with normal spacing between the two name words. The later contrast reads “Wispr Flow” followed by “doesn’t do that.”

The offline proof uses the real 520 × 168 notch-sheet proportions in the exact center of a completely black frame. The camera zoom expands from that center point to a restrained 1.5×. Under the global faster cut, each fused half lands every 145ms after a 440ms lead-in, and the proof lasts 6.12 seconds. The single-line transcript is a non-shrinking max-content row and locks immediately to the newest chunk. The hero has no parent opacity transition, and its inactive state remains at zero opacity, preventing the previous end-of-proof disappear-and-reappear glitch caused by two competing fades.

## What comes next

Create dedicated vertical and square export compositions if the campaign needs them.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
