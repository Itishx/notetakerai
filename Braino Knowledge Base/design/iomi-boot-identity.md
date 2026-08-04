# IOMI Boot Identity

**Type:** Design decision  
**Platform:** Braino Mac notch  
**Status:** Built — needs live Mac verification  
**Released:** July 30, 2026

## The simple version

IOMI should not inherit Braino’s old authentication theatre. It begins in black with a restrained gold-to-coral-to-blue perimeter trace, shows its own name while the system gets ready, and communicates success by opening its eyes.

## Why it exists

IOMI is a separate Braino design language. Recolouring the existing boot sequence would make it feel like a skin. Its first few seconds should establish a calmer, more premium identity before any feature appears.

## How to use it

Open the Braino Mac app to see the production sequence. For isolated review, open `/instagraphics?design=iomi`; the full-viewport prototype plays automatically and its floating controls expose shimmer, authenticating, awake, expanded, and mascot states.

## What Braino knows or does

- Starts with a subdued warm gold, Braino coral, and cool blue light tracing the empty notch’s perimeter.
- Keeps that low-intensity trace breathing while `IOMI` appears and while Braino wakes.
- Fades a compact but readable plain `IOMI` into the exact centre, one letter at a time, with no eyes present.
- Removes `IOMI` when authentication finishes.
- Resolves `IOMI` inward into the original operating-layer eyes—two 5px warm-white dots—so the awake state feels like one continuous handoff rather than a new element appearing.
- Carries the moving trace onto the entire boundary when the island expands into “Good evening, Itish.”
- Fades the expanded greeting in word by word: “Good,” then “evening,” then “Itish.”
- Places a vertical gradient divider between the greeting and a right-side wake cue with eyes and the Control + Command + Command instruction.
- Makes Braino jump from the island into the visible screen area while the notch closes behind him.
- Completes the entire automatic sequence in roughly seven seconds.
- Respects reduced-motion preferences.

## Honest limitations

The production sequence now controls the Mac notch, uses the real startup authentication result, and speaks through Braino’s Fish Audio-first voice path. Slow browser sign-in can hold on the completed IOMI word longer than the ideal timing. If Fish Audio is unavailable, the existing Mac voice fallback still applies. The setup walkthrough after Braino lands is not implemented yet. The Instagraphics page remains a visual prototype and does not perform authentication or voice playback.

## Technical shape

The production markup and styles live in `mac/braino-mac/renderer/index.html` and `mac/braino-mac/renderer/braino-mac.css`. `runNotchBoot()` in `mac/braino-mac/renderer/braino-mac.js` owns the real authentication-aware sequence and logs each major transition. It reuses the existing `speak()` path and shared Mac walker rather than introducing separate audio or character systems. The isolated review prototype remains in `src/pages/InstaGraphics.tsx` and `src/pages/insta-graphics.css`.

## Product or design decisions

The subdued gold-to-coral-to-blue gradient is a living perimeter system signal, not a fill, text treatment, or decoration. It gently radiates through authentication and the awake state, then follows the complete boundary of the expanded greeting card. There is no separate verified state, success badge, tick, green verdict, or authentication sentence. IOMI appears alone during authentication, then visually compresses into the already-open eyes. The expanded greeting must be spoken in Braino’s real voice.

## What comes next

Continue from Braino’s on-screen landing into the guided first-run setup walkthrough, then test the complete flow on both notched and non-notched Macs.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
