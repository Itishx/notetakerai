# The Braino ecosystem

**Type:** Product philosophy  
**Platform:** Braino website and every Braino surface  
**Status:** Exploring  
**Released:** July 29, 2026

**Updated:** August 4, 2026 — added the sub-40-second ecosystem film.

## The simple version

Braino is one character who can meet a person in different places: the browser, the Mac, an operating layer, dictation and his own studio.

The products are not meant to feel like unrelated assistants. They are different rooms in the same small ecosystem.

## Why it exists

Braino grew one useful problem at a time. Reading a webpage led to acting in the browser. Living in the browser led to following work onto the Mac. Voice, memory, appearance and system-wide context followed.

That growth became overwhelming because every surface looked like another product to maintain. The useful product decision was to stop treating each surface as a separate Braino. The character stays stable; the place and ability change.

## How to use it

The waitlist asks, “Where do you want to meet him?” People can choose the Braino surfaces they care about without signing up for every experiment.

The linked public article explains the philosophy behind those choices.

The short film at `/ecosystem-teaser` explains the same idea through the
kinetic language of *Don't Blink*: Braino begins inside a chat box, escapes
the tab, and reveals Braino OS with Browser and IOMI in orbit.
The working cut uses “places to be” as its score. Its major transitions are
beat-synced after the track is analysed in the browser.
The current script follows an origin-to-ecosystem story and carries
one shape through its transitions: browser tab, Mac notch, dot, then one shared
silhouette. The Studio and Hera chapters were removed from this cut to keep the
story focused.

The typography keeps natural sentences together, then splits meaningful words
into the same internal fuse used by “Braino”: `Mo` + `st`, `liv` + `es`.
Separate words retain a real typographic space; only the pieces inside a word
sit flush. IOMI owns a deliberate gold identity shimmer.

Every word of two or more characters now participates in that rhythm. Every
automatic split happens at the median; when a word has an odd number of
letters, the first half owns the extra letter. This makes `grew` become
`gr / ew` and `Light` become `Lig / ht`, never an arbitrary near-edge split.
Internal apostrophes do not count toward length, so `There's` becomes
`The / re's` and `wasn't` becomes `was / n't`. One-letter acronym pieces remain
the intentional exception.

The active pacing keeps the opening at 220ms per chunk, then accelerates to
185ms immediately after the Braino OS reveal. Post-reveal holds tighten to
140–300ms. IOMI keeps a 400ms gold landing and the OS and final reveals keep
650ms, so the identity moments still breathe.
The OS explanation now states the hierarchy directly: “One intelligence
layer. Powering every Braino.” Braino OS is the shared layer beneath the
surfaces, not another Braino running through them. “Every Braino” is an
oversized musical snap whose match cut lands on the completed Braino name and
holds for 520ms before the Browser chapter. Its oversized style explicitly
restores a `.24em` inter-word gap: Every and Braino remain separate words while
only `Bra / ino` fuses internally.
Within “One intelligence layer,” only the median-chunked `intell / igence`
receives a restrained one-shot shimmer. One and layer remain plain white.

The faster opening lands on the browser tab, “Cute,” “limiting,” how Braino
learns a person’s work, and why one tab no longer cuts it. The shared engine
supports a final-token match cut for short payoff words such as “tab,” which do
not naturally need syllable chunking.
“Cute” owns a three-pulse match cut before the film pivots into “But slightly
limiting.”
Before the origin story begins, the opening establishes the character in two
forms on one line: the written Braino name followed by the full standing mascot.
“Started” then receives its own card before “in a browser tab.”
Only this opening lockup is enlarged: its type reaches 82px and its mascot is
slightly taller. Its name-to-mascot gap is a compact `.16em`; later inline
mascots retain the shared standard scale.

Musical anchors are set on Braino OS, Browser Braino, IOMI, the synthesis,
“where the work goes,” and the final lockup. Each may move by at most
180ms to meet the nearest detected beat, so sync cannot destroy sentence flow.

The later cut chain lands on One Braino, one click away, less explaining
yourself, Different places, Same Braino, the chatbox, and where the work goes.
“Everywhere you work” hands the Braino OS promise into the browser chapter.

Fast and Light use the same restrained coral-and-gold shimmer as “crazy” in
Don’t Blink. Their median chunks remain fused visually so one sweep crosses
each completed word cleanly.

Fast and Light shimmer once for 1.2 seconds instead of looping and appearing
stuck, while keeping the accelerated post-OS cadence.

The film ends directly on `Every` + `where.` A single restrained shimmer moves
across the assembled word, then the fused landing fires exactly three invert
pulses and holds. There is no additional logo or copy card after it.

Braino OS follows the waitlist heading construction: Braino remains white,
OS fuses directly onto it and carries the orange identity shimmer. IOMI remains
one oversized assembled title: I, then IO, then IOM, then IOMI in the same
position. Each arriving letter owns a short match-cut pulse while the earlier
letters stay visible. The letters retain the gold identity shimmer, but every
inverted frame—including the last one—is pure white with black type.

The closing synthesis keeps the ecosystem promise explicit: after Browser and
IOMI, “He goes where the work goes” bridges into the two-card voice payoff,
“Speak” followed by one accumulated line: “Watch It Happen.” Its median chunks
assemble in place, but only the end of each complete word owns a match-cut
pulse: one after Watch, one after It, and one after Happen. The line itself is
snapped to the music. The on-screen script avoids commas entirely.
The final joke reads “Magic? Nah. Just Braino being Braino.” When the final
mode begins, the real Braino walker rig crosses the foot of the frame with a
leg swing and body bob before `Every / where` closes the film. This walking
cameo belongs only to the teaser; it does not change the static product-page
solar system.
The Browser response is “Braino gotchu homie.” The Mac exchange evolves it into
“On your Mac? Still gotchu homie,” avoiding a repeated answer while keeping the
same voice. Both response match cuts land on homie. The remaining payoff chain cuts on help, browser, Mac, IOMI,
goes, Speak, happen, Magic, Nah, Braino, and the final Everywhere pulse.
The Browser response keeps “Braino” as ordinary text. Only the final “Just
Braino being Braino” line replaces both Braino names with the actual full-body
walker SVG—arms, legs, and shoes—in a standing pose. A zero-width timing token
preserves each original two-chunk Braino duration, so replacing text does not
accelerate the following words. Both mascots share one size and baseline rule.
Each trigger belongs to the final payoff token of its card.

Match cuts use the flagship behavior exactly: the final payoff token lands,
the frame snaps to white with black type, ordinary stamp styling is suppressed,
and the inversion holds until the next visual card replaces it. It is not a
short flash layered over the typography.

The film no longer owns its own typography rules. It uses the locked Don’t
Blink blueprint in `src/pages/dont-blink-blueprint.css` and
`src/lib/dontBlinkBlueprint.ts`: the same dead-centre anchor, 600 weight,
negative tracking, `.2em` word spacing, stomp reveal, headline scale and
black-to-white match cut. Future script films should reuse this preset and
change only phrases, timing, intentional cuts and story-specific graphics.
The production film no longer renders the composition grid; guides remain an
authoring aid rather than part of the public frame.
For this slower ecosystem cut, the ordinary word-stamp brightness bloom is
disabled because it reads as glitter; chunks land hard with no glow or color
sweep. Only explicit match cuts may flash the frame.

## What Braino knows or does

- Keeps one recognisable character across different products.
- Adapts his abilities to the browser, Mac and broader operating layer.
- Gives experimental ideas a shared direction instead of presenting a pile of unrelated features.

## Honest limitations

The ecosystem is a direction, not a finished universal context layer. Some surfaces are live, some are MVPs and some remain experiments. Braino does not yet carry perfect memory and state between every product.

## Technical shape

- The ecosystem picker lives in `src/pages/Waitlist.tsx`.
- Its responsive two-column layout lives in `src/pages/waitlist.css`.
- The public essay lives in `src/pages/BrainoEcosystemDocs.tsx`.
- The permanent route is `/knowledge/braino-ecosystem`.
- Its public registry entry lives in `src/lib/brainoKnowledge.ts`.
- The ecosystem film lives in `src/pages/EcosystemTeaser.tsx` with its visual
  system in `src/pages/ecosystem-teaser.css`.
- In the film, the paired “Different rooms” and “Different shapes” cards
  match-cut on their final changing words: rooms, then shapes.
- The operating-system reveal reads as one sentence: “So he grew into” leads
  into the four-part `Bra / ino / O / S` construction. The orange shimmer begins
  on O, remains through S, and the match cut completes on S. The connector word
  never owns a cut.

## Film limitations

The timeline has not yet been retimed to the final voice recording or licensed
release music. The product planets are
an explanatory metaphor, not a claim that every surface already shares
perfect state.

## Product or design decisions

The picker uses two cards per row on desktop to show the products as one map and reduce excessive scrolling. It remains one column on mobile so descriptions stay readable and the selection targets remain comfortable.

“Choose your Braino” became “The Braino ecosystem.” The earlier line implied several separate Brainos. The new line makes the intended hierarchy explicit: one Braino, several places to meet him.

## What comes next

The strongest proof of the ecosystem will be shared context: Braino carrying the relevant state between browser and Mac without making the user repeat themselves.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
