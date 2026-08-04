# Jyoti Sir Team Demo

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 30, 2026

## The simple version

Say, “Braino, run the Jyoti Sir demo.” Braino introduces himself over music, cleans Itish’s Desktop, prepares an unsent WhatsApp draft for Jyoti Sir, creates and closes seven tagged Chrome tabs, changes the Spotify song, and finishes with Itish’s thank-you message.

## Why it exists

This is a personal, live version of Team Demo Mode. It shows Braino acting across files, Spotify, WhatsApp, and Chrome, then ends with the part that actually matters: gratitude.

## How to use it

Say “Run the Jyoti Sir demo,” “Start the new demo,” “Start the team demo,” “Show me the demo,” or simply “Start the demo from here.” These all route to the deterministic Jyoti flow before realtime conversation can answer. “Introduce yourself” remains the trigger for the older ANZ demo.

## The sequence

1. Braino introduces himself and plays “Places to Be” by Fred again.. on Spotify.
2. He minimizes Spotify, stays visible on screen, and holds the music at a low background volume for the rest of the demo.
3. He points out the messy Desktop, counts down, and organizes loose items by type inside **Braino Organized**.
4. He says “Boom,” then reads the real organization summary.
5. He says, “Let me undo it for now, for future demo purposes,” and restores every moved item to the Desktop.
6. He says he has not sent anything yet, waits two seconds, then opens **Amdocs Jyoti Sir** with “hi from braino” drafted but unsent.
7. He opens seven tagged demo tabs, including YouTube, Medium, and GitHub.
8. He says, “Here, watch me close them all,” then closes only those seven tagged tabs.
9. He returns to Spotify and plays “She Needs Him” by Her’s.
10. He delivers Itish’s updated thank-you message for Jyoti Sir, then restores the original Spotify volume.

## Honest limitations

The demo needs Chrome, Spotify, WhatsApp, Accessibility permission, and a resolvable Jyoti Sir contact. It temporarily moves real loose Desktop items, saves a manifest, and restores them during the same demo. It prepares but does not send the WhatsApp message, and it starts real Spotify audio. Braino deliberately switches voice listening off for the full demo, so music and spoken narration cannot be recorded as new commands; voice can be armed again normally afterward.

## Technical shape

The Jyoti detector and choreography live beside the existing Mac Team Demo flow in `renderer/braino-mac.js`. Every action is awaited in order, with a two-second visual beat after its spoken setup. The realtime WebRTC microphone, native listener, and legacy listening state are stopped before the first spoken demo line, preventing speaker output from becoming a self-transcript or barge-in. A demo-wide volume hold lowers Spotify once and restores it only after the final line. Music mode keeps the mascot visible instead of automatically fading him home. Main-process demo actions reuse the production Desktop organizer and its manifest-based undo, Spotify search/player, WhatsApp deep-link drafter, and browser controls. The WhatsApp demo path contains no Enter or Send fallback. Demo tabs live in a dedicated remembered Chrome window. The old ANZ demo remains separate and unchanged.

## Product decision

The explicit Jyoti demo trigger authorizes its real Desktop organization, WhatsApp draft, tab actions, and playback. It does not authorize sending the draft. The thank-you uses Itish’s reviewed copy. Asking Braino to introduce himself still runs the established ANZ demo.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
