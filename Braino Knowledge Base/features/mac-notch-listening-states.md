# The notch tells you when he can hear you

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** September 17, 2026

## The simple version

The notch now says what Braino's ears are doing, all the way through:

- **Waking up.** Press Control twice, or say "Hey Braino". The outline of the notch lights up, a sheet drops down, and it counts down: *Live in 3, 2, 1*.
- **Ready.** The moment the voice is actually live it says *You can speak now*.
- **Hearing you, live.** While you talk, HERA (on this Mac) shows your words as you say them under *You're saying*, with a mint HERA chip. When you stop they become *You said*, and they stay there while he works on them, with a small shimmering *Thinking* beside them.
- **Long sentences breathe.** Past about 110 characters the sheet widens, the lines get more room, and the oldest line fades out at the top instead of cramming.
- **Asleep.** With "listen for my name" on, the notch reads *Say "Hey Braino" to wake me* while he is ignoring the room. Say his name and the outline lights up the way it does at boot.
- **Stop the task.** "Braino, stop the task" stops a running job straight away, and he says *I stopped the task.*

## Why it exists

Voice takes 2 to 6 seconds to come up (3.7 seconds median across the last 194 sessions), and nothing on screen said so, so people started talking into a microphone that was not open yet. Named mode looked broken: the coral listening pulse ran the whole time he was ignoring you, so waking him had nothing to show. Your sentence disappeared 1.1 seconds into every job. And "stop" went through a model call that took 5 to 10 seconds while the job kept clicking.

## How to use it

- Control twice, wait for *You can speak now*, talk.
- Turn on "listen for my name" in onboarding or settings. Say "Braino" or "Hey Braino". If Brainelle is your avatar, her name works too.
- Mid-task: "Braino, stop the task", "cancel the search", or just "Braino, stop".

## What Braino knows or does

- The countdown starts from the median of this Mac's last 12 connect times, and never says "speak now" before the session is live. If it is slower than usual it says *Almost there*.
- The five-second "I'm listening" window after his name now starts when the notch says *You can speak now*, not when you said his name. Before, most of those five seconds were spent connecting.
- After a deliberate wake (his name, or Control twice) the first sentence gets through however long you take to say it, up to 15 seconds. After that the normal five seconds apply.
- His name counts in any script. The cloud transcriber sometimes writes a short "Hey Braino" in Devanagari or Urdu despite being told English, and it is now told the name exists and to write it as Braino. A sentence with no English letters is logged instead of vanishing.
- While he is asleep, only a sentence with his name in it can open the caption, so other people's conversation is never shown on its way to being ignored.
- The thinking chip is one word. It used to cycle Thinking, Hatching, Deciding, Calibrating on a timer, which looked like progress and meant nothing.
- A stopped job stays quiet. It used to finish with an empty answer, which he filled with "Done."

### One live transcript, two endings

- **Option twice** (dictation): HERA's words are cleaned up and typed where your cursor is. Unchanged.
- **Talking to Braino**: the same live words show in the notch, and when you stop, that sentence is the command.

OpenAI still decides whether a sentence was meant for him (it has echo cancellation). HERA's words become the command unless they cannot be trusted: Braino was audible while you spoke (HERA would have heard him), the turn began with you cutting him off (the reset can eat your first words), HERA clearly heard fewer words than OpenAI, or it did not answer within 600ms. Then OpenAI's words are used. Each choice is logged as `voice.command_text` with its reason.

## Honest limitations

- The countdown is an estimate. It is honest about being late, but it cannot know the future.
- Waking her from cold with "Hey Brainelle" needs the on-device listener to learn her name, which means rebuilding that helper and macOS asking for microphone access once more. Inside an open session her name already works.
- A bare "stop" or "never mind" needs his name on it, because people say those to each other.
- HERA's live words are a running guess and can change as you speak.
- If HERA is still loading when voice opens, the notch falls back to OpenAI's words until it is ready (it retries every 3 seconds).
- The stop phrase matches words, not meaning. Anything longer than six words goes to the normal understanding path.

## Technical shape

- `mac/braino-mac/main.cjs`: `voiceCaptionMode` runs HERA display-only beside a voice session (`startVoiceCaption / stopVoiceCaption / rotateVoiceCaption / yieldVoiceCaption`, IPC `braino-mac:voice-caption`). Its partials, phrases and segments go to the renderer; its delta and final are swallowed, so nothing is typed or put on the clipboard. Dictation and LIVE take HERA over when they start.
- Renderer: `heraVoiceStart / heraVoiceStop / heraVoiceRotate / heraVoiceLiveText / heraCommandText`. Rotated at each pause (`turn_end`), after he speaks (`braino_spoke`, with a 700ms echo tail), on a barge-in, and every 45s of quiet.

- `mac/braino-mac/renderer/braino-mac.js`
  - `voiceStartBegin / voiceStartReady / voiceStartEnd / voiceStartPhase / voiceStartText`, history in localStorage `brainoVoiceConnectMs`.
  - `updateNotchFace`: `namedAsleep`, the inline modes `starting | ready | heard | thinking`, and the asleep hint as the lowest-priority ticker slot.
  - `namedOpenAtReady`, `flashNameWake`, `activeWakeName`, `BRAINELLE_NAME_RE`.
  - `isStopTaskPhrase` and `stopTaskNow`, checked in `flushRealtimeTranscript` before HIL is asked, and in `submitTyped`. The HIL "stop" verdict uses the same `stopTaskNow`.
- `mac/braino-mac/renderer/braino-mac.css`: `.nf-voice-starting`, `.nf-voice-ready`, `.nf-name-asleep`, `.nf-name-wake`, and the rule that lets the open caption own the pill over `.nf-thinking`.
- `mac/braino-mac/renderer/index.html`: the perimeter trace SVG stretches to its box (`preserveAspectRatio="none"`).
- `/notch-lab` renders all eight states with the Mac's own stylesheet.
- Tests: `tests/mac-notch-voice-states.test.mjs`, plus updated `mac-notch-thinking`, `mac-notch-response`, `mac-typing`.

## Product or design decisions

- Every state uses the caption sheet that already existed, so the shape does not change when your words arrive. A countdown in a different element would have meant two drops in two seconds.
- Asleep is deliberately not the listening look: no coral, no pulse, no breathing. It is the quietest thing the ticker shows, so timers and music outrank it.
- The name-wake light is the boot trace, not a new effect, because it is the thing people already read as "he just woke up".
- Restoring "You said" through a job reverses 1aaedb2 on purpose. The doubled phase that commit fixed is now prevented in CSS instead.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
