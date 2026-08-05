# Expanded Thinking Canvas

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 29, 2026

## The simple version

When Braino starts a longer task, the notch now shows that work instead of leaving the user wondering whether anything is happening.

It begins as the same compact Braino notch. The transcript grows left from Braino's centred eyes; when that wing reaches the display edge, the same sentence continues into a growing right wing. Short words such as **Thinking**, **Hatching**, **Deciding**, and **Calibrating** use that same thin strip. Click Braino's eyes and the screen-wide strip drops into a typography-led cognition canvas occupying roughly the top quarter of the display.

## Why it exists

Long captions did not belong inside the old notch wings. They became cramped, competed with Braino's face, and made a background task feel broken even when it was working correctly.

The Thinking Canvas gives progress enough room without becoming another window. It expands horizontally, stays attached to the menu bar, and keeps the text to one concise line.

## How to use it

1. Ask Braino to complete a longer Mac or cowork task.
2. Watch the compact notch pulse while the task runs.
3. Click the notch to open the detailed Thinking Canvas.
4. Click outside to collapse the detail without stopping the task.

## What Braino knows or does

- Shows processing verbs in the existing transcription wing while working.
- Grows transcription symmetrically with its text while staying inside the screen.
- Shows prompt → current step → answer as a live expanded trace.
- Keeps the two most recent completed summaries visible.
- Changes its treatment when approval, attention, completion, or failure is detected.
- Immediately gives the notch back to listening or speaking when a conversation starts.
- Briefly confirms completion before returning to the normal notch.

## Honest limitations

This is progress reporting, not private chain-of-thought. The canvas can only be as precise as the task labels emitted by the underlying ability.

Listening and speaking deliberately take priority over task progress. Expanded detail closes as soon as Braino hears or answers, so the voice state cannot be obscured by a stale task panel.

## Technical shape

- Markup: `mac/braino-mac/renderer/index.html`
- Visual states and motion: `mac/braino-mac/renderer/braino-mac.css`
- Progress history, expansion, completion handoff, and voice-state priority: `mac/braino-mac/renderer/braino-mac.js`
- Progress source: `braino-mac:cowork-label`, exposed through `mac/braino-mac/preload.cjs`

The renderer keeps at most a short recent history. It never renders raw model reasoning, tokens, logs, or hidden prompts.

## Product or design decisions

The notch remains one physical object. Detailed progress is revealed by widening it, not by attaching a dropdown or floating card.

The compact state communicates presence. The expanded state communicates progress. Completion appears briefly and then gets out of the way.

## What comes next

The next technical step is a shared structured-progress protocol so every long-running Braino ability can report equally precise current-step summaries.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
