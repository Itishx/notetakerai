# Mascot Reply Captions

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 30, 2026

## The simple version

When Braino is walking on screen, his reply remains in the existing glass caption box while each spoken word lights up in sequence.

## Why it exists

The old caption timer began before speech finished. Longer replies could disappear while Braino was still talking.

## How to use it

Bring Braino onto the screen and speak normally. The full reply appears dimly, the current word turns coral, completed words turn white, and the box remains for a reading beat after speech ends.

## What Braino knows or does

- Keeps the existing mascot caption shape and placement.
- Highlights words against real audio playback time.
- Works with streamed and buffered speech.
- Starts dismissal only after speech completes.

## Honest limitations

Streaming MP3 audio does not always expose its final duration immediately, so early highlighting uses a natural words-per-second estimate. System voice fallback completes the caption at the end rather than providing word-level timing.

## Technical shape

The renderer turns reply text into safe DOM word spans. Each TTS audio player advances the highlight from playback time. Caption generations prevent cancelled or overlapping speech from changing a newer reply.

## Product or design decisions

The box did not need redesigning. The problem was timing and aliveness, so typography carries the speech.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
