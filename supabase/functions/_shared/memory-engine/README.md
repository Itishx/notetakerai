# Braino's Memory Engine

This folder is how Braino remembers each user across conversations and keeps that memory up to
date on its own — like ChatGPT/Claude "saved memories." You don't need to code to follow it; each
file does one small thing, in plain English.

## The idea in one picture

```
user says something
        │
        ▼
  shouldCapture()  ── most turns: no, skip ──►  (done, nothing happens)     (gate.ts — word cues, no AI)
        │ yes (they shared a durable fact)
        ▼  (runs in the BACKGROUND, after Braino already replied — no delay)
  extractor LLM sees recent chat + what's already remembered                (extract.ts)
        │
        ▼
  ops: add / update / archive   ──►  written to the braino_memories table   (store.ts: dedup + cap)

…later, in any conversation…
  load memories ─► rank by importance + recency + overlap ─► top slice ─► into Braino's prompt
                                                  (retrieve.ts → render.ts → user-knowledge.ts)
```

## The files

- **`types.ts`** — the shapes: a `Memory`, a `MemoryOp` (add/update/archive), tier limits. Start here.
- **`tiers.ts`** — the pricing knobs. How many memories free vs premium users get. **Edit this when
  we decide to cap by plan.** Generous for now.
- **`gate.ts`** — `shouldCapture()`: the cheap check (just word cues, no AI) that decides whether a
  message is worth running extraction on. Keeps cost down.
- **`extract.ts`** — builds the prompt for the extractor and parses its JSON answer into ops. Pure.
- **`store.ts`** — the only file that writes memory. Dedupes, enforces the cap (overflow is
  *archived*, never deleted), keeps timestamps.
- **`retrieve.ts`** — picks the most relevant memories for the current conversation (importance +
  recency + keyword overlap). Semantic/embeddings search is a planned upgrade that slots in here.
- **`render.ts`** — turns memories into the prompt text, plus the standing "you have long-term
  memory" note.
- **`capture.ts`** — the orchestrator that runs the whole capture loop in the background.
- **`index.ts`** — what the rest of the app imports.

## Where it plugs in

- **Capture:** `chat-about-notes` calls `captureFromConversation(...)` inside
  `EdgeRuntime.waitUntil(...)` after replying, so remembering never slows down a chat.
- **Recall:** `_shared/user-knowledge.ts` loads + ranks memories and folds them into the same
  `persistentUserContext` Braino already uses.
- **Storage:** the `braino_memories` table (migration `20260622000002_braino_memories.sql`) +
  `profiles.memory_enabled` (master on/off).
- **Review:** the Dashboard Memory tab lists what Braino remembers, with edit/delete + the toggle.

## How to change things

- **Remember more/less aggressively** → widen/narrow the cues in `gate.ts`.
- **Change what counts as a memory** → edit the rules in `extract.ts`.
- **Cap by plan** → edit `tiers.ts`.
- **Smarter recall** → improve `retrieve.ts` (this is where embeddings will go).

## See it for yourself

```
npx tsx supabase/functions/_shared/memory-engine/__preview.ts
```

Pure logic only (gate, parse, ranking) — no AI or network in the preview.
