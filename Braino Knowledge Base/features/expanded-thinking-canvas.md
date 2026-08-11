# Expanded Thinking Canvas

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 29, 2026

## The simple version

When Braino starts a longer task, the notch now shows that work instead of leaving the user wondering whether anything is happening.

It begins as the same compact Braino notch. The transcript grows left from
Braino's centred eyes; when that wing reaches the display edge, the same
sentence continues into a growing right wing. When a real request begins, the
notch stays compact and signals that progress is available. Click anywhere on
the compact notch to open the 650-by-260 black Chrome-system thinking sheet: a
sleeping Braino face above three short, useful progress summaries.

## Why it exists

Long captions did not belong inside the old notch wings. They became cramped, competed with Braino's face, and made a background task feel broken even when it was working correctly.

The Thinking Canvas gives progress enough room without becoming another window. It expands horizontally, stays attached to the menu bar, and keeps the text to one concise line.

## How to use it

1. Ask Braino to complete a longer Mac or cowork task.
2. Keep working while the compact thinking signal stays out of the way.
3. Click the notch to unfold or fold detail without stopping the task.
4. When the answer begins, watch the same surface become a short or long response.

## What Braino knows or does

- Shows processing verbs in the existing transcription wing while working.
- Grows transcription symmetrically with its text while staying inside the screen.
- Shows request context, the current useful step, and answer preparation as three calm lines.
- Keeps the two most recent completed summaries visible.
- Changes its treatment when approval, attention, completion, or failure is detected.
- Immediately gives the notch back to listening or speaking when a conversation starts.
- Briefly confirms completion before returning to the normal notch.
- Never delays the underlying command. Delegate IPC is queued first, and model
  audits run after the result.

## Honest limitations

This is progress reporting, not private chain-of-thought. The canvas can only be as precise as the task labels emitted by the underlying ability.

Listening deliberately takes priority over task progress. When Braino answers, the thinking sheet does not simply disappear: it hands the same notch geometry to the short- or long-answer surface documented in **Mac IOMI Response Surfaces**.

## Technical shape

- Markup: `mac/braino-mac/renderer/index.html`
- Visual states and motion: `mac/braino-mac/renderer/braino-mac.css`
- Progress history, expansion, completion handoff, and voice-state priority: `mac/braino-mac/renderer/braino-mac.js`
- Progress source: `braino-mac:cowork-label`, exposed through `mac/braino-mac/preload.cjs`

The renderer keeps at most a short recent history. It never renders raw model reasoning, tokens, logs, or hidden prompts.

## Product or design decisions

The notch remains one physical object. Detailed progress is revealed by widening it, not by attaching a dropdown or floating card.

The compact state communicates presence and available progress. Expansion is a
user choice, not an automatic interruption. The response state communicates the
result. Completion appears briefly and then restores whichever persistent
activity was waiting underneath.

## What comes next

The next technical step is a shared structured-progress protocol so every long-running Braino ability can report equally precise current-step summaries.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
