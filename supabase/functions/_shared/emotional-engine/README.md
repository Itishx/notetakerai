# Braino's Emotional Engine

This folder is Braino's heart. It's the part that decides *how he feels and responds* — the
thing that's supposed to make him feel like an emotionally mature best friend instead of an AI.

You don't need to know how to code to understand it. Each quality of Braino lives in its own
small file written mostly in plain English. This README is the map.

## The idea in one picture

```
the user says something
        │
        ▼
  detectMoment()  ──►  "this is a heartbreak moment"     (moments.ts — just word cues, no AI)
        │
        ▼
  the engine picks which traits LEAD                      (engine.ts + moments.ts)
   • attunement  (read the moment, say the right thing)
   • warmth
   • presence
   ( honesty, humor, etc. stay present but step back )
        │
        ▼
  each trait writes its part of the instructions          (traits/*.ts, shaped by settings.ts)
        │
        ▼
  one personality "core" → handed to braino-prompt.ts, which adds the page/notes/movie context
```

## The files, in the order worth reading

1. **`manifest.ts`** — the table of contents. The full list of Braino's traits, in priority
   order. Start here.
2. **`traits/`** — one file per quality, each a real playbook:
   - `identity.ts` — who he is and the lines he never crosses (never reveals he's an AI model).
   - `presence.ts` — the "always there, in your corner" feeling.
   - `attunement.ts` ★ — **the most important one.** Emotional maturity: how to handle a
     breakup, grief, anxiety, a win, or someone in real distress. Read this one fully.
   - `honesty.ts` ★ — upfront, pushes back, never a yes-man.
   - `warmth.ts` — genuine care without being clingy.
   - `humor.ts` ★ — dry wit, plus the optional **dad jokes** streak.
   - `boundaries.ts` — what he is *not* (no filler, always gives real help).
   - `diction.ts` — how he actually talks (short for voice, structured for text).
3. **`moments.ts`** — the situations (grief, heartbreak, celebration, focused task…), the word
   cues that detect them, and which traits each one brings to the front.
4. **`settings.ts`** — the toggles. e.g. `dadJokes: true/false`, how hard he pushes back.
5. **`engine.ts`** — the assembler that puts it all together. The "heart."
6. **`language.ts`** — which language he replies in.

## How to change Braino (without breaking anything)

- **Make a trait deeper / change his personality** → edit the prose inside the relevant
  `traits/*.ts` file. That's just words.
- **Change how he handles a situation** (e.g. respond to venting differently) → edit
  `moments.ts`: tweak the word cues, or change which traits lead for that moment.
- **Add a toggle** (e.g. "sarcasm mode") → add it in `settings.ts` + `types.ts`, then read it
  inside the trait it affects (humor.ts is the worked example for `dadJokes`).
- **Add a brand-new trait** → copy an existing `traits/*.ts`, write it, and add it to
  `manifest.ts`.

## See it for yourself

Run the preview to print Braino's composed personality for different moments and settings:

```
npx tsx supabase/functions/_shared/emotional-engine/__preview.ts
```

Nothing here calls an AI or the network — it's all plain text assembly, so it's safe to read,
run, and tinker with.
