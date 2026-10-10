# Learning from real runs (HIL 1.2)

**Type:** Technical / Feature
**Platform:** Braino for Mac, Human Intelligence Layer
**Status:** MVP (Mac side in BrainoMain; HIL prompt changes need `supabase functions deploy`)
**Released:** October 11, 2026

## The simple version

A 36 minute run at 4am showed exactly where Braino fell short. Each gap between what was wanted and what he did is now a lesson he carries, written as the intent rather than a trigger word, so the next person who asks for the same kind of thing in different words gets it right, fast.

The first lesson: "make Ryan Reynolds my wallpaper" (or Barbie, or Iron Man, however it is said) is one move, done in seconds, not three and a half minutes on Pinterest.

## What changed

- **HIL 1.2.0.** A use-case library (`use-cases.ts`) rides in the router, the planner and the loop: wallpaper of anything, "find out where, then do it", use what they already said, answer "did you do it?" from real results.
- **Wallpaper from the web works.** The old source (Unsplash's shut-down endpoint) failed every time. Now: a direct link as is, otherwise web search names real image files, each checked to be a real, large image; Openverse as a fallback.
- **Honest stops.** The agent stops after three failed steps in a row, or 90 seconds, and says where it got to.
- **Never clicks his own buttons** ("Show what Braino is thinking" was clicked mid-job).
- **No double answers.** If chat fully answered, a job is not started too. Promises and refusals still hand over.
- **Talk is fast.** A sure "chat" from Laya goes to the conversation (about 2s) instead of the job loop (14 to 16s).
- **He hears where.** If only one transcriber heard "Hotstar", that service name decides it.
- **Follow through.** A research answer is said, not the line written before searching; a real outcome beats the plan's guess ("Iron Man is playing" when it wasn't); "then play it" gets the next step offered.
- **Talk me through it, fixed.** Lines come from the action ("Opening the page.") not his private reasoning; "Got it" only on real work; no more "Steping."
- **Smaller:** no markdown read aloud; "open it in the desktop" is not an app; search answers in his words; the agent reads what you said earlier before asking.
- **Notch:** replying keeps one shape (your words, thinking and his answer swap inside the open sheet). New **Without subtitles** mode (the old AffectiveOS style): no text, a thin notch, a listening dot and speaking bars.

## Honest limitations

- The HIL prompt changes only reach Braino after the edge functions are deployed.
- Not yet re-run live end to end; covered by tests (818 passing; the same 3 older failures remain).
- The agent's first step is still uncached on every run; the cause is not found yet.
- Without subtitles is tested in code only; the indicator placement needs a look on a real notch.

## Technical shape

- `supabase/functions/_shared/human-intelligence/use-cases.ts`; `hil-system-prompt.ts` (HIL_VERSION 1.2.0), `hil-router-prompt.ts` (1.4.0), `reasoning/hil-loop/index.ts` (fixed block after HIL_LOOP_PROMPT, cached), `hil-loop-prompt.ts` (2.18.0), `reasoning/hil-plan/index.ts`.
- `mac/braino-mac/main.cjs`: `setWallpaperFromWeb`, `wallpaperImageUrls`, `fetchWallpaperImage`; `MAC_HIL_FAILS_IN_A_ROW`, `MAC_HIL_SOFT_TIME_MS`, `hil.loop.honest_stop`; `laya.talk_fast`; `planReply` follow through; `PRONOUN_LEAD`.
- `mac/braino-mac/narrate.cjs`: `stepLine`.
- `mac/braino-mac/renderer/braino-mac.js`: `answeredItself`, `heraOnlyService`, `spokenLine`, `holdNotchAnswerForReply`, no-subtitle indicators. `braino-mac.css`: `.nf-answer-reply`, `.nf-ns-*`.
- Tests: `mac-4am-run`, `mac-notch-reply-hold`, `mac-follow-through`, `mac-narrate`.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
