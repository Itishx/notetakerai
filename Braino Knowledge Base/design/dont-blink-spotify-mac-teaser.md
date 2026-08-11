# Don’t Blink: Spotify + Mac teaser

**Type:** Design decision  
**Platform:** Braino website  
**Status:** MVP  
**Released:** August 7, 2026

## The simple version

A short campaign film says only: “Say the song. Watch it play. That’s Braino.” The voice-to-action promise gets room to build in the Don’t Blink rhythm before the name lands through a hard match cut into the full mascot.

## Why it exists

Braino’s product story can get large quickly. This teaser makes one sharp Spotify promise, lets it land, and gets out before the viewer can look away.

## How to use it

Open `/spotify-mac-teaser`. Add `?embed=1` to play it inside Braino TV.

## What Braino knows or does

- Controls Spotify playback.
- Resolves the product proof into Braino himself rather than an abstract logo.

## Honest limitations

The film is a visual campaign cut, not a live Spotify or Mac control surface. Browser autoplay can delay the soundtrack until the first interaction; the visual timeline starts immediately.

## Technical shape

`src/pages/DontBlinkSpotifyTeaser.tsx` drives two spoken beats and one mascot hold through the shared `KineticFilm` and `/dontblink` blueprint. The pacing is intentionally not locked to four seconds: the Spotify line builds, the name gets a separate impact beat, and the mascot receives a readable final hold. The route is `/spotify-mac-teaser`.

## Product or design decisions

- Keep the user’s script intact.
- Never place more than three spoken words on one visual line.
- Let each command breathe before the next payoff arrives.
- Give “That’s Braino” a real word space, sweep colour through Braino without moving the letters, and cut quickly into the mascot stomp.
- Make the final Braino-to-mascot cut the largest event.
- End immediately after the mascot lands.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
