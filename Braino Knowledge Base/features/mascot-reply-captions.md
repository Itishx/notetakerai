# Mascot Reply Captions

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 30, 2026
**Updated:** August 10, 2026

## The simple version

Braino's written reply still moves with his voice, but the normal Mac path now renders it in the notch even while the standing mascot is walking.

The old glass bubble remains only as a fallback when the notch surface is unavailable or deliberately disabled. It no longer rides above Braino during an ordinary voice conversation.

## Why it exists

The old caption timer began before speech finished. Longer replies could disappear while Braino was still talking.

## How to use it

Speak normally. The full reply appears dimly in the notch, the current word brightens, completed words settle, and the surface remains for a reading beat after speech ends. Braino can keep walking without carrying a second subtitle box across your work.

## What Braino knows or does

- Uses the IOMI answer surface whether Braino is home or out.
- Clears a stale mascot bubble when live transcript text reaches the notch.
- Keeps the glass caption as a fallback when the notch is unavailable.
- Highlights words against real audio playback time.
- Works with streamed and buffered speech.
- Starts dismissal only after speech completes.

## Honest limitations

Streaming MP3 audio does not always expose its final duration immediately, so early highlighting uses a natural words-per-second estimate. System voice fallback completes the caption at the end rather than providing word-level timing.

## Technical shape

The renderer turns reply text into safe DOM word spans. Each TTS audio player advances the highlight from playback time. Caption generations prevent cancelled or overlapping speech from changing a newer reply.

## Product or design decisions

Timing still carries the speech, but placement now follows a stricter rule: conversational words belong to the notch; the mascot should never drag subtitles over the page.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
