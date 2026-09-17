# The notch tells you when he can hear you

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** September 17, 2026

## The simple version

The notch now says what Braino's ears are doing, all the way through:

- **Waking up.** Press Control twice (blue outline) or say "Hey Braino" (gold outline). A sheet drops down saying *Connecting*, then *You can speak now* once the session is live. There is no countdown; one made a slow connection look slower, and the connection time is OpenAI's (1s this morning, 3-8s tonight).
- **Ready.** If you have not started talking yet, it says *You can speak now* once the session is live.
- **Hearing you.** *(Live HERA words in voice mode are switched off, September 17: a video playing on the Mac showed up as "You're saying". Voice mode shows OpenAI's transcript, as before; Option-twice dictation and LIVE still use HERA.)* When you stop they become *You said*, and they stay there while he works on them, with a small shimmering *Thinking* beside them.
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

- After his name, he listens for 12 seconds from the last thing either of you said, and a sentence you start inside that window counts however long it runs. Five seconds closed between ordinary turns and dropped real sentences.
- The gold outline plays only when he wakes from a real sleep (20 seconds or more), not on every "Braino, …" in a conversation. The 90-second idle shimmer that used the same outline is off.
- "Hey Braino" keeps working, all day. The on-device listener woke him once per launch: it restarted itself from inside its own recognition callback, which cancelled the new task and restarted again, forever. Each recognition cycle now has a generation and a replaced one can no longer touch its successor. It also re-attaches to the microphone when a voice session reconfigures it, or when it has heard nothing for five seconds (`wakeword.healed`).
- After a deliberate wake (his name, or Control twice) the first sentence gets through however long you take to say it, up to 15 seconds. After that the normal five seconds apply.
- His name counts in any script. The cloud transcriber sometimes writes a short "Hey Braino" in Devanagari or Urdu despite being told English, and it is now told the name exists and to write it as Braino. A sentence with no English letters is logged instead of vanishing.
- While he is asleep, only a sentence with his name in it can open the caption, so other people's conversation is never shown on its way to being ignored.
- The thinking chip is one word. It used to cycle Thinking, Hatching, Deciding, Calibrating on a timer, which looked like progress and meant nothing.
- A stopped job stays quiet. It used to finish with an empty answer, which he filled with "Done."

### One live transcript, two endings

- **Option twice** (dictation): HERA's words are cleaned up and typed where your cursor is. Unchanged.
- **Talking to Braino**: the same live words show in the notch, and when you stop, that sentence is the command.

OpenAI's words are the command. HERA's were tried as the command first and lost on the evidence: with no echo cancellation they carried Braino's own reply on most turns, HERA wrote his name as "we don't", and waiting for its segment added up to 600ms to every reply. The one exception is what you said while the session was still connecting, which only HERA heard. Each choice is logged as `voice.command_text`.

## Honest limitations

- The voice session itself can take several seconds to connect; that time is on OpenAI's side and your network. HERA covers it by listening from the press.
- The on-device listener was rebuilt to fix the microphone and learn "Brainelle", so macOS may ask once more for microphone and speech recognition access.
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
