# AffectiveOS, one brain

**Type:** Design decision (architecture)
**Platform:** AffectiveOS, running Braino on Mac
**Status:** Decided 2026-09-29. Not built yet: it is built once Laya is right at least 90 times in 100 on sentences it has never seen.
**Released:** 2026-09-29 (decision)
**Diagram:** `affectiveos-one-brain.html` in this folder (open it in a browser). Internal copy: https://claude.ai/artifact/C316bkBsXD4syPMUupfHFh

## The simple version

AffectiveOS is one brain with two speeds.

- **Intent detection, Laya.** Runs on your Mac in about 0.05 seconds. It reads what you said *with everything around it* and makes the only decision in the system: not for me, talk, do something he already knows, or a big job / not sure.
- **Human Intelligence Layer, HIL.** Runs in the cloud, 1 to 10 seconds, only when needed. It understands what you meant, plans the steps once, asks before anything final (post, send, buy, delete), and settles anything Laya was not sure about.
- **Everything else is his hands**: the 129 tools, the skills he learned, the voice, the notch.

## Why it exists

On 29 Sep the audit showed six things deciding on their own: twelve rule checks in a row (first match wins), quick chat, slow chat, Laya, the step-by-step loop as the default, and HIL reading everything but only after he had already answered. They disagreed, so the same sentence went different ways on different days ("trybraino.com", "this song", "write the post"). AffectiveOS has to be precise and clean, so it gets one brain.

HIL-first was tried before and made every "pause" wait on the cloud. Laya is local and fast, so it makes the decision, and HIL is the bigger brain behind it.

## The three rules that keep it one brain

1. **Intent detection never overrules HIL.** Unsure means hand over. Never guess, never "say that again" to a clear sentence.
2. **HIL teaches Laya.** Every sentence HIL settles becomes a lesson for Laya, so over time fewer sentences need the slow path.
3. **One picture of the world.** Both read the same context and the same memory, built once.

## What Laya sees (its context)

The sentence, what Braino last said and whether it was a question, what you said just before, the app, tab and website in front, whether music is playing, whether a job is running or an answer is awaited, and whether his name was heard. The exact text is built by `~/.braino-laya/training/build_context.py` (`laya_context_text`); the app must build it the same way when it asks Laya.

## Is HIL teaching Laya automatic?

**Not yet.** Today it is done by hand: sentences are pulled from the log, labelled, Laya is retrained on the Mac (about 40 minutes), scored on sentences it has never seen, and only swapped in if it scores higher. The plan to make it automatic, safely:

1. Every night, collect the day's sentences with their context and what HIL concluded.
2. Label them automatically, with HIL's own reading as the answer.
3. Once a week, while the Mac is idle and charging, retrain Laya.
4. Score the new Laya on a fixed set of real sentences it has never seen. Swap it in only if it is better, and keep the old one to roll back.
5. Show a short "Laya learned this week" summary so a person can check a sample.

It is scheduled retraining with a safety check, not a model changing itself live.

## The two diagrams

- **The brain (this one):** technical, how a sentence is understood and routed.
- **The body (to draw):** the senses AffectiveOS gives the Mac: ears (voice), eyes (screen), memory, hands, the notch as its face. Same system, seen from outside.

## Where it stands (29 Sep)

| Laya | Right out of 100 (134 unseen real sentences) |
|---|---|
| Version 2 (running today) | 52 |
| Version 3 (words only) | 69 |
| Version 4 (words and context) | training |
| Takes the lead at | 90 |

The one-decision routing is built after that, behind a switch, with the current routing kept as the fallback until it has been tried for a day.

## Step 1 built (29 Sep): Laya reads the context in the app

- `mac/braino-mac/laya-context.cjs` builds the context line live from the same log events the training set was rebuilt from, so the two match character for character (tested in `tests/mac-laya-context.test.mjs`, which runs both on one conversation).
- Behind a switch: `npm run mac:laya4` (or `BRAINO_LAYA_CONTEXT=1`) uses Laya v4 on its own port (47832); the normal start keeps today's Laya. Every `laya.kind` log line now carries the exact context line, which is tomorrow's training data.
- v4 on 134 unseen sentences: 72 right overall, 90 right when it is sure, sure about 63%. Honest gap: a long answer to his own question still comes back as "ignore" with low confidence, so answers to his questions need more examples in the next training round.
- Routing is unchanged in step 1; only what Laya reads changed.

## Technical shape (planned)

- `routeHilFirst` in `mac/braino-mac/main.cjs`: keep the five instant checks (instant commands, stop words, close all tabs, forms, answers to a waiting question), then ask Laya once with the context line, then route: talk to the single chat, do-known to the tool or skill, big or unsure to HIL. The other checks become tools, not deciders. Slow chat folds into talk; the loop runs only inside a planned job; the HIL shadow is removed.
- Laya: `~/.braino-laya/models/braino-kind*`, served by `mac/braino-mac/laya-serve.py`. Training kit: `~/.braino-laya/training/`.
