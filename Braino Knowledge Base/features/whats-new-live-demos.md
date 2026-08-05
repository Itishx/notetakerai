# What’s New Live Demos

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 30, 2026

## The simple version

Ask Braino, “What’s new with you?” He reads the newest demoable feature in his changelog, explains it in his own voice, says “You ready? Watch,” and only then performs it.

## Why it exists

A changelog tells you what shipped. Braino should be able to show you. The explanation comes first so the action has context and never feels like the computer suddenly doing something random.

## How to use it

Try “What’s new with you?”, “What else can you do?”, or “What is the latest thing you learned?” These are one semantic intent. The current live demo explains Music Segment Loops, then loops FE!N on Spotify from 1:26 to 1:32.

## What Braino knows or does

- Recognizes natural variations of the same “what’s new” question.
- Selects the latest entry marked as demoable rather than improvising from a model response.
- Uses a fixed founder-voice script for a repeatable launch or product demo.
- Waits for the complete narration to finish before firing the feature action.
- Logs the selected changelog slug and the after-speech action.

## Honest limitations

This is an MVP. The latest demo entry is registered in code, so shipping a new demoable feature also requires updating that entry and script. The current demo requires Spotify playback access and a playable result for FE!N.

## Technical shape

`whats-new-intent.cjs` owns semantic phrase matching and the latest demo manifest. The Mac delegate returns narration plus an `afterSpeechAction`. The renderer awaits the entire spoken line before invoking that action over the existing guarded demo IPC. The action reuses the real Music Segment Loops implementation rather than a visual fake.

## Status and next step

Live as an MVP on July 30, 2026. Next, generate the demo manifest from Knowledge Base metadata while retaining an explicitly reviewed script and action for every demoable entry.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
