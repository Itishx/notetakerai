# Sub-Agents: Don’t Blink with graphics

**Type:** Design decision  
**Platform:** Braino website  
**Status:** Exploring  
**Released:** August 8, 2026

## The simple version

Braino's Sub-Agents teaser uses the established Don’t Blink typography and Places to Be soundtrack, interrupted by three dedicated graphic beats: deployment, parallel work, and convergence. Text and graphics always replace one another at the same centre point instead of stacking.

## Why it exists

The familiar motion grammar makes the product story easy to follow, while the dedicated graphic beats make parallel work visible rather than merely describing it.

## How to use it

Open `/sub-agents-teaser`. The first design pass is intentionally editable in code while its script and individual graphics are refined.

## What it communicates

- One request can be divided into six focused jobs.
- The jobs run at the same time.
- Braino remains the single character who returns the final answer.

## Honest limitations

This is a concept teaser for a planned capability. It does not claim that Sub-Agents are already available in the current Braino product, and the six roles are illustrative until the implementation is final.

## Technical shape

`src/pages/SubAgentsTeaser.tsx` drives the shared `KineticFilm` engine and Don’t Blink blueprint. Three hero modes render full-body characters from the existing Braino design system. A permanent safe-area grid locks text and graphics to the same composition, and the existing Places to Be asset supplies the soundtrack.

## Product or design decisions

- Use the established Don’t Blink typography, pacing logic, and alignment.
- Never stack a graphic above or below a text line; each occupies its own beat at the same centre point.
- Keep a visible composition grid constant across the entire film.
- Keep one consistent inter-word gap on normal and oversized text; fused fragments inside a word remain flush.
- Use the existing Places to Be music asset.
- Use only full-body characters from the existing Braino design system.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
