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
- **His name, every time.** With "listen for my name" on, every sentence meant for him has "Braino" in it (or "Brainelle" when she is the avatar), the way Siri and Alexa work. While a voice session is open the notch reads *Listening for "Braino"*; with no session it reads *Say "Hey Braino" to wake me*. After a long quiet, his name lights the outline the way it does at boot.
- **Half sentences wait.** If you pause mid-sentence ("Braino, open the ..."), he holds those words for about a second and a half and joins them to the rest, instead of acting on half a command.
- **Stop the task.** "Braino, stop the task" stops a running job straight away, and he says *I stopped the task.*

## Why it exists

Voice takes 2 to 6 seconds to come up (3.7 seconds median across the last 194 sessions), and nothing on screen said so, so people started talking into a microphone that was not open yet. Named mode looked broken: the coral listening pulse ran the whole time he was ignoring you, so waking him had nothing to show. Your sentence disappeared 1.1 seconds into every job. And "stop" went through a model call that took 5 to 10 seconds while the job kept clicking.

## How to use it

- Control twice, wait for *You can speak now*, talk.
- Turn on "listen for my name" in onboarding or settings. Say "Braino" or "Hey Braino". If Brainelle is your avatar, her name works too.
- Mid-task: "Braino, stop the task", "cancel the search", or just "Braino, stop".

## What Braino knows or does

- **No name, no action (September 17).** A 12-second "conversation window" after his name let a video playing on the Mac through as a command, and no audio trick can tell a video's voice from yours. So every sentence needs his name, with five exceptions:
  - the first sentence after a deliberate wake ("Hey Braino" or Control twice), however long it takes to say, up to 15 seconds;
  - anything you say while he is talking or working, so you can cut in;
  - a short answer (yes, no, go ahead, the second one) to a question he just asked, within 10 seconds of him finishing it. Anything longer needs his name: his chat replies end in "What's on your mind?" all the time, and a TV "answered" one with "Open the language.";
  - "stop the task" and "stop listening";
  - the reply to a question a running task asked you.
- **Noise is not a command (September 17, later).** The cloud transcriber writes words for almost any sound: nine seconds of room noise came back as "Hold the line", and its own prompt came back as "Use English as the language." A sentence without his name is dropped (`named.noise_ignored`) when it took 3 seconds or more at under 0.8 words a second, when it mentions the prompt's words (English, language, letters, accent), or when it is a classic silence line ("Thank you.", "you", "Thanks for watching"). A bare "Hey Braino" made of noise is dropped the same way. The prompt carries no names beyond its original first line: a word list (`Vocabulary: Braino, Brainelle.`) was tried and came straight back as "You said Braino, Brainelle." Two names together, or a string of names, count as his name alone and never as a command. Noise never shows in the notch as "You said" and never cuts him off mid-reply.
- **Stop with nothing running.** "Braino, stop the task" when no task is running answers *Nothing's running right now.* straight away (or just stops him talking, if he is). It used to go to the planner as a task, take 10 seconds, and read his first thought aloud.
- **Opening a website is instant.** "Braino, open YouTube" (or Gmail, LinkedIn, any site Braino knows) opens it straight in Chrome (`delegate.web_open_fast`). It used to go through the thinking loop, which took 4 to 40 seconds and once 141, when Chrome stopped answering scripts and the loop could not confirm the page. Anything more than just opening ("open YouTube and play lofi") still goes to the loop, and "open Spotify" still opens the app.
- **The notch gets out of the way.** Clicking the notch no longer opens "Type what you need": every reach for a browser tab near it opened the field, which then sat over those tabs (typing on the overlay never held the keyboard well). Command Option T still opens it. A click on "You said" now puts it away, and during a long job your sentence gives way to the small thinking chip after 15 seconds instead of staying frozen on screen.
- **A Stop button** sits in the open thinking sheet (click the thinking chip). It is the same stop as saying it.
- **His name is heard twice.** The on-device "Hey Braino" listener runs during a voice session too. If it heard his name in the last 8 seconds, the sentence counts even when the cloud transcriber spelt the name wrong (`named.heard_on_device`).
- **Half sentences are held, then joined.** A sentence with no full stop or question mark that is either two words or fewer, or ends on a word like "the", "to", "and" or "my", waits 1.5 seconds (`voice.fragment_held`). If you keep talking, the two halves become one command (`voice.fragment_joined`). If you don't, the half is sent as it is (`voice.fragment_released`), never dropped. It waits up to 6 seconds while you are still mid-word. Answers to his questions, stop phrases and bare "Hey Braino" are never held.
- The gold outline plays only when he wakes from a real sleep (a minute or more), not on every "Braino, …" in a conversation, which is now every sentence. The 90-second idle shimmer that used the same outline is off.
- "Hey Braino" keeps working, all day. The on-device listener woke him once per launch: it restarted itself from inside its own recognition callback, which cancelled the new task and restarted again, forever. Each recognition cycle now has a generation and a replaced one can no longer touch its successor. It also re-attaches to the microphone when a voice session reconfigures it, or when it has heard nothing for five seconds (`wakeword.healed`).
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
- Forgetting his name means the sentence is ignored. That is the price of a video never giving him orders.
- A half sentence costs 1.5 seconds before he acts on it. Short complete commands with no full stop, like "play music", wait too, because the transcriber does not always add one.
- A slow, hesitant sentence without his name (three words over four seconds) can be dropped as noise. Saying his name skips that check.
- A video saying "Braino" would still get through. That is rare, and it is the same limit Siri has.
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
  - `namedWindowOpen`: the name-every-time rule and its exceptions (`namedGraceUntil`, `namedSpeechAwake`, `lastSpokenLine.asked` with `NAMED_ANSWER_WINDOW_MS`). `namedHeardOnDeviceAt` is set by `onWakeDetected` during a session and read in `shouldAcceptVoiceTranscript`.
  - `looksLikeNoise` (turn length from OpenAI's `audio_start_ms`/`audio_end_ms`, kept in `rtLastSpeechMs`), `answersHisQuestion`, `namedAnswerWindowOpen`, `nothingToStop`, and the `.nf-thinking-stop` button.
  - `looksUnfinished`, `holdFragment`, `releaseHeldFragment`, `clearHeldFragment` (`FRAGMENT_HOLD_MS` 1500, `FRAGMENT_MAX_HOLD_MS` 6000). `flushRealtimeTranscript(reason, textOverride)` joins a held half to the next transcript and keeps the half's acceptance, so the joined sentence is not re-judged for a name.
  - `isStopTaskPhrase` and `stopTaskNow`, checked in `flushRealtimeTranscript` before HIL is asked, and in `submitTyped`. The HIL "stop" verdict uses the same `stopTaskNow`.
- `mac/braino-mac/renderer/braino-mac.css`: `.nf-voice-starting`, `.nf-voice-ready`, `.nf-name-asleep`, `.nf-name-wake`, and the rule that lets the open caption own the pill over `.nf-thinking`.
- `mac/braino-mac/renderer/index.html`: the perimeter trace SVG stretches to its box (`preserveAspectRatio="none"`).
- `/notch-lab` renders all eight states with the Mac's own stylesheet.
- Tests: `tests/mac-notch-voice-states.test.mjs`, `tests/mac-voice-name-every-time.test.mjs`, plus updated `mac-notch-thinking`, `mac-notch-response`, `mac-typing`.

## Product or design decisions

- Every state uses the caption sheet that already existed, so the shape does not change when your words arrive. A countdown in a different element would have meant two drops in two seconds.
- Asleep is deliberately not the listening look: no coral, no pulse, no breathing. It is the quietest thing the ticker shows, so timers and music outrank it.
- Name every time over a conversation window. A window is friendlier, but it is exactly where video audio got in, and we cannot ship a companion that takes orders from YouTube a month before launch.
- The name-wake light is the boot trace, not a new effect, because it is the thing people already read as "he just woke up".
- Restoring "You said" through a job reverses 1aaedb2 on purpose. The doubled phase that commit fixed is now prevented in CSS instead.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
