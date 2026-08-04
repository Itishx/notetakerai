# Music Segment Loops

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 30, 2026

## The simple version

Braino can repeat the tiny part of a song you actually came for. Say, “Braino, play Brabus on loop from 2:20 to 2:27,” and he starts there, reaches the end, then jumps back to the beginning of that seven-second piece.

## Why it exists

People rarely love every second of a song equally. There is a verse, a transition, a drum break, or one line that deserves five more listens without dragging a playhead around by hand.

## How to use it

Say: “Braino, play [song] on loop from [start] to [end].”

Name Spotify, YouTube Music, or Apple Music if you have a preference. Spotify is the default. Leave out “on loop” and Braino plays the song normally.

If a song is already playing, say: “Braino, loop this song from 2:10 to 2:20.” Braino reads the live playback context and keeps that exact song instead of searching for another copy.

You can also say: “Braino, loop this song.” Braino first looks at live playback, tells you which song and provider he found, then asks for the range. Your next answer can simply be “from 2:10 to 2:20.” He keeps the exact resolved track across both turns.

## What Braino knows or does

- Treats “on loop” as the precise segment-loop intent.
- Resolves “this song” from the live Spotify, Apple Music, or visible YouTube playback context.
- Recovers timestamps written or spoken as `2:20`, `2 20`, “two twenty”, `2 minutes 20 seconds`, `140 seconds`, or the colon-dropped transcript `220`.
- Shows the interpreted range and provider in the Thinking Canvas.
- Starts at the first timestamp and returns there at the second.
- Uses Spotify, YouTube Music in Chrome, or the Apple Music Mac app.

## Honest limitations

This is an MVP. Apple Music searches the user’s Music library, so a catalog song that is not available there may not resolve. YouTube looping depends on Chrome allowing JavaScript from Apple Events. Provider buffering can make a very short loop feel a fraction late. A loop ultimately needs both a start and an end, and the end must come after the start; Braino will ask when they are missing.

## Technical shape

`music-segment-intent.cjs` owns deterministic intent and transcript recovery. `main.cjs` routes the intent before ordinary YouTube and Spotify play commands, exposes the interpretation through `sendTaskProgress`, and maintains one replaceable loop timer. A missing-range command resolves live playback before opening a short pending workflow; that workflow retains the resolved provider and track for the range-only follow-up. Spotify starts and seeks through both its Mac player and Web API, using a wall-clock boundary rather than unreliable playhead reads. Apple Music seeks through its Mac player controls. YouTube Music seeks the active HTML video in Chrome. The HIL system prompt carries the same reasoning rule so the Lab shows the interpretation a tester expects.

## Product or design decisions

“On loop” is intentionally narrow. It never changes the meaning of a plain play command. A missing provider is not worth interrupting the user over because Spotify is Braino’s established default. Garbled time speech is repaired only inside an explicit loop range, where a duration is the only sensible interpretation.

## What comes next

Measure provider drift on sub-five-second loops and move to player-native boundary events where each platform makes them available.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
