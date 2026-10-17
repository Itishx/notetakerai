# How Braino Talks: charm, the dial, and the tell check

**Type:** Feature
**Platform:** Braino everywhere (chat, voice, Mac, extension) via the shared Emotional Engine
**Status:** MVP
**Released:** 2026-08-02

## The simple version

Braino used to sometimes open with "What's on your mind?" That is the sound of a bot waiting to be useful: it hands the work back to you and proves he noticed nothing. Now he opens like someone who was already paying attention. "You're back." "Third tab on the same error, what's it doing?" And how much charm he uses scales with the moment, all the way down to none at all when someone is grieving.

There is also a new page where you can watch it happen: say something, see his answer, and see the entire reason it came out that way.

## Why it exists

The charm was always in the engine, but it was locked inside the one trait that only fires when somebody asks about Braino himself ("do you love me", "are you real"). That is rare, so the best version of his voice almost never appeared and the model fell back to its own default, which is customer service.

Worse, his tone never actually changed with emotion. Only the ORDER of his traits changed per moment, plus one steering sentence. The words themselves were identical whether you were grieving or joking, so the register was left for the model to guess.

## How to use it

Go to /emotional-intelligence. Four tabs now: Read, Lab, Reply, Whole mind.

- **Reply** is the new one. Say anything. You get his answer plus the full breakdown.
- **Whole mind** runs the same message through both halves of him at once: the thinking (what he understood and would do) and the feeling (what he says and why).

## What Braino knows or does

- **Charm is his baseline voice now**, not a special occasion: he noticed something, says it short, and is a little amused by life. Never eager.
- **He opens with what he saw, not with an empty question.** If he has nothing to go on, a short real line ("You're back.") beats a hollow one.
- **The charm dial scales with the moment.** Full when things are ordinary or good, economy (fast and exact, no jokes) when you just want the thing done, warm with teasing off when you are venting or anxious, plain in heartbreak, and completely absent in grief and crisis where wit would be an insult.
- **He reads the moment in layers.** Word cues first, instant and free. If the words find nothing but the message still carries feeling, he spends one small read to find the real moment. Crisis is always decided by the word cues alone, so a life-or-death message never depends on a model being reachable.
- **Strongest signal wins, not first listed.** "I got the job but I'm terrified" now lands on the heavier feeling instead of whichever cue happened to sit higher in the file.
- **His own replies get checked against his own banned phrases**, in code, every time.

## Honest limitations

- The tell check is a phrase scan, so it catches the known bot-tells and cannot judge whether a reply is *good*, only whether it contains something he is not allowed to say.
- The deeper moment read costs one extra small call, and only runs when the word cues find nothing and the message looks emotionally loaded. Ordinary quick asks skip it entirely.
- The Reply and Whole mind tabs are the only consumers of the new endpoint so far. Nothing about the extension's browser automation changed.
- Iomi and Telos still share one personality; the classes have not forked yet.

## Technical shape

- New trait: `supabase/functions/_shared/emotional-engine/traits/charm.ts`, registered in `manifest.ts` just after presence. It is the only trait that rewrites itself per moment, and it renders empty in grief and crisis so it leaves the prompt entirely.
- New checker: `_shared/emotional-engine/tells.ts`, `scanForTells(reply)`, built from the ban lists already written into authenticity, humanity, charm, and diction. Ten categories including the eager openers and the em-dash house rule.
- `moments.ts` gained `detectMomentDetailed` (returns which cue words actually matched), strongest-match-wins selection with crisis as an absolute override, and `looksEmotionallyLoaded` which decides whether a deeper read is worth it.
- `engine.ts` gained `leadIdsForMoment`, which now merges the emphasis table with each trait's own `leadsOn` declaration. Every trait had declared that and nothing read it, so a trait could claim to lead on grief while the table silently disagreed.
- The `swearing` setting was defined, defaulted, settable, and read by nothing. It is now wired into `diction.ts`, which is where register belongs; `authenticity.ts` was updated to defer to it instead of contradicting it.
- New endpoint: `supabase/functions/chat/braino-reply/index.ts`, public with the model pinned server-side (same pattern as the HIL lab). Returns the reply plus the moment and how it was read, the real trait order, the steering sentence, the charm level, the tell scan, and the engine measurements.
- `buildEmotionalCore` accepts an optional explicit trait list so the lab can genuinely remove the charm trait for an A/B, rather than claiming to.
- `src/lib/emotional-engine-viz.ts` was a hand-copied duplicate of the trait list; it now re-exports the real engine, so the page can never show a personality Braino does not have.
- New UI: `src/components/BrainoReplyLab.tsx` and `src/components/BrainoWholeMind.tsx`, both tabs on `VisualEmotionalEngine.tsx`.

## Product or design decisions

- **Eagerness, not formality, is what outs an AI.** That is the whole thesis of the charm trait. "How can I help you today?" is worse than sounding stiff, because it proves he was not paying attention.
- **Specificity is the proof of attention.** "You've been on this tab forty minutes" does more than any amount of stated warmth.
- **Charm has to be able to reach zero.** A trait that is always on would eventually be charming at a funeral. Grief and crisis get none of it.
- **The ban had to become a check.** A banned phrase written in a prompt is a request. Scanned in code against the actual reply, it is a fact, and it gives a number that can move as he is tuned.
- **Crisis stays deterministic forever.** Every other layer can get smarter with models; that one stays a hard word match on purpose.

## What comes next

Route the disagreements between the word cues and the deeper read into a log, so the phrases the cue list is missing become a real list to add rather than something seen once in a demo. Then fork the trait set per class.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
