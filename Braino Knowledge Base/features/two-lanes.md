# Talk or Do

**Type:** Technical
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-09-26

## The simple version

Every sentence now goes one of two ways:
- **Talk:** the voice model answers, in about a second.
- **Do:** a skill Braino already knows runs instantly. If he doesn't know one, he thinks once (about 2 seconds), then the steps run back to back.

He never waits on anything he already knows. If a job takes more than 20 seconds, he stops and says where he got to.

## Why it exists

Measured on 2026-09-26, across 24 real commands, nearly half of the simplest commands took over 5 seconds. There were three reasons:
- Every command waited 3.5 seconds for a screen check that macOS was blocking.
- Chat that the rules didn't recognise went to a slow chat (8 to 10 seconds) or to the step-by-step loop, which had no time limit (102 seconds was seen).
- Nothing he did was remembered.

## How it works

1. **The screen check never blocks.** He uses the last reading and refreshes it in the background. A check that fails is skipped for a minute.
2. **Chat goes back to the voice model.** When a sentence reaches the brain but is really chat, the brain hands it back to the voice model, which already has the shared history.
3. **Do = skill or think once.**
   - Skills are instant fire, tab switching, forms and logins, recipes, the fast rules, and skills he has learned.
   - Anything else is planned once, with its context gathered in parallel and capped at 300ms. The plan function is kept warm.
4. **The loop is only a backup.** It runs when a plan must look at the screen. At 20 seconds he says "I got to <step>. Want me to keep going?". A yes carries on without the limit; a no stops.
5. **Learned skills.** A planned job that worked, where every step can be undone and nothing is a lookup, is saved under the exact words you used. Next time those words run it instantly. "Forget that skill" removes the last one used. One that stops working is dropped by itself.
6. **The notch says what he's doing:** "Planning", "Step 2 of 3: waiting for the page".

## Honest limitations

- Learned skills only match the exact same sentence, after the clean-up (no "please", no name).
- The notch app still has its own quick "is this an action?" check in front. It agrees with the brain in almost every case, and the brain's hand-back covers the rest.
- The 20-second stop can interrupt a long, legitimate job. A yes carries on.

## Technical shape

- `main.cjs`:
  - `readActiveMacContext` and `readActiveBrowserContext` have back-off (`desktopReadBlockedUntil`, `browserReadBlockedUntil`) and a 1.2s timeout.
  - `routeMacDelegate` refreshes the context in the background.
  - The `options.canTalk` talk hand-back.
  - `MAC_HIL_STUCK_MS`, `macPlainStep`, and `keepGoing` on the held run.
  - `planOnce` uses `Promise.all` with a 300ms cap; `warmHilPlan` runs every 10 minutes.
  - `maybeSaveSkill` / `skills.json` / `SKILL_NEVER`.
- `skill-memory.cjs`: `skillKey`, `canSaveSkill`, `addSkill`.
- `renderer/braino-mac.js`: `canTalk` on the delegate call, `result.talk` answered by `answerViaRealtimeChat(text, { force: true })`.
- Logs: `skill.saved`, `skill.used`, `skill.dropped`, `hil.loop.stuck`, `delegate.talk_handback`.
- Terminal lines: `🎓 LEARNED`, `🎓 SKILL`, `⏸ STUCK`.
- Tests: `tests/mac-architecture-lanes.test.mjs`.

## Status

MVP. Built and unit tested on 2026-09-26. The live 10-command check is next.
