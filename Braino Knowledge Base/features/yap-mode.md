# BrainoHERA: faithful system-wide dictation

**Type:** Mode  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** August 8, 2026

## The simple version

Double Option, speak, then double Option again. Braino stops capture, gives the
final transcript a short bounded drain, and inserts the complete session once
where the caret is. The clean-up pass runs while you speak, so what lands is
what you meant to write rather than a literal record of your mouth: fillers
gone, false starts gone, self-corrections resolved, punctuation and numbers as
people write them. Stop never waits for a formatting request.
There is no assistant answer and no spoken reply. If Braino cannot find a real
text box, the complete transcript opens in the Notch and stays on the clipboard
instead of disappearing.

While BrainoHERA is active, the Notch becomes one fixed-width black transcript
sheet. It expands downward with the same spring motion as Braino's answer
surfaces. Finished phrases stack above the current phrase, so text never pushes
the Notch sideways or overlaps the BrainoHERA label. `Braino` stays white while
uppercase `HERA` carries the same moving green shimmer used on the website.

Capture now starts alongside the shortcut instead of waiting for the Mac focus
probe. The opening audio stays local until Braino confirms that the target is
not a secure field, then it is placed before the live stream in exact order.

## Why it exists

Wispr Flow made the useful product contract clear: dictation should work in the
place where you are already writing. Braino already had an early version called
Yap Mode. That early system is now BrainoHERA, but its focus detection could
miss browser and Electron editors, its
paste path could report success too easily, and a failed insertion could make a
good transcript unrecoverable.

A live August 8 trace exposed another concrete fault: Braino spent 2.0–2.3
seconds resolving Accessibility focus before it even requested the microphone.
The old “startup pre-roll” began after that wait, so it could never recover the
first sentence. This rebuild starts protected local capture and the focus check
in parallel.

The August rebuild treats transcription and insertion as two separate systems.
First, preserve the user's words. Then, place them only when the Mac can prove
where they belong.

## How to use it

1. Put the caret in the text field you want to use.
2. Double-tap Option.
3. Speak naturally for as many turns as you need.
4. Double-tap Option again to stop.

Pauses finalize transcription turns internally, but the field stays untouched
until stop. The listening glow disappears as soon as the stop gesture lands;
Braino then drains the last phrase and inserts every ordered turn once.

Every spoken phrase remains dictation. Saying “done” types “done”; it is not a
hidden stop command.

When there is no editable field, keep speaking if you want. Braino shows the
completed transcript in the Notch for recovery and copies it automatically.

## What Braino knows or does

- Starts a dedicated transcription-only WebRTC session with
  `gpt-live-transcribe`.
- Uses the model's `low` delay setting so final transcript events arrive sooner;
  the faithful prompt, literal vocabulary, clean audio path, and lossless local
  guard continue to protect accuracy.
- Uses far-field noise reduction for the built-in Mac microphone, near-field
  reduction for detected headsets and external microphones, plus adaptive local
  voice activity detection that explicitly commits each natural pause.
- Keeps up to 30 seconds of microphone pre-roll while authenticated WebRTC is
  opening, beginning before the blocking Accessibility probe, so words spoken
  immediately after the shortcut survive both focus detection and a cold
  connection.
- Keeps the WebRTC sender trackless and all pre-roll on-device until the
  Accessibility privacy gate approves the target. A secure-field rejection
  stops the microphone and discards the local buffer without uploading it.
- Survives the input microphone changing underneath it. AVAudioEngine binds
  its input node when it starts and never re-binds, so connecting a Bluetooth
  headset used to leave the tap delivering nothing at all while the engine still
  reported itself as running. Braino now rebuilds the tap on the device-change
  notification, and a watchdog rebuilds it anyway if audio stops arriving, so a
  session never opens on a dead microphone.
- After approval, sends both buffered opening audio and every later live frame
  as PCM over the same ordered Realtime data channel. It never switches to a
  separate RTP audio transport, so later words cannot overtake the opening.
- If double Option stops a short phrase before a cold Realtime connection is
  ready, freezes the protected local buffer immediately, finishes the handshake,
  transcribes that frozen phrase, and inserts it instead of cancelling startup.
- Captures clean mono audio without Chromium noise suppression or automatic
  gain control, then applies one microphone-aware OpenAI near/far-field noise
  reduction stage instead of processing speech twice.
- Keeps the connection transcription-only, so no conversational model can
  summarize, answer, add ideas, or rewrite the transcript downstream.
- During a natural pause, prefetches the clean-up pass from the streamed
  transcript. On device that is Apple's on-device model; the cloud fallback is
  the `dictation-refine` endpoint. Both are given the same contract: remove
  fillers, stutters and the abandoned half of a self-correction, fix case and
  punctuation, write spoken numbers and times as digits, turn a dictated list
  into a list.
- Checks that result locally by aligning it word by word against what was
  actually heard. The editor may drop words freely, and may correct a small
  number of words that were plainly misheard, where the correction is the same
  word spelled differently: “teen” to “team”, “cant” to “cannot”, “deploy” to
  “deployment”. It may not add a word, move a word, summarize, change a number,
  or lose an email, URL, handle, hashtag, or code token. A failed check,
  timeout, auth failure, or service error inserts the raw transcript instead.
- Tells the transcription model to preserve openings, fillers, repetitions,
  false starts, slang, and profanity instead of silently polishing them away.
- Supplies a faithful-dictation context plus literal hints for Braino,
  BrainoHERA, Braino Hera, IOMI, the former Yap Mode name, Notch, Itish, and
  Itish Pande.
- Tracks every Realtime turn by `item_id`, buffers completion events in commit
  order, and assembles one session transcript for the stop-time insertion.
- Gives a final transcript event 1.2 seconds to settle at Stop. If it is late,
  consumes the already ordered transcript deltas instead of waiting roughly
  four seconds or losing the phrase. Late completion events are ignored by ID,
  so provisional text cannot be inserted twice.
- Tracks actual PCM duration and likely speech since the previous commit. Stop
  refuses buffers under 100 ms, pure trailing silence, and a duplicate commit
  while another commit is awaiting acknowledgement.
- Resolves system-wide macOS Accessibility focus, then walks editable ancestors
  and focused descendants for nested Chromium and Electron editors.
- Verifies the front app before sending Command-V, then compares a non-content
  Accessibility field fingerprint before and after. If a verifiable paste did
  nothing, it tries selected-text Accessibility insertion instead.
- Restores the old clipboard after a successful insertion. On failure, it keeps
  the transcript on the clipboard and in the Notch.
- Prints each completed transcript to the renderer terminal as
  `[BrainoHERA] "…"` for direct debugging.

### Fixed September 17 (HERA, on-device)

- **Stop waits for the clean-up.** If a clean-up of an earlier, shorter transcript was still running when you stopped, the final one was queued behind it and stop used the raw words straight away (`preparedTurns: 0`). Stop now waits for the running clean-up and then the final one, inside a 3 second budget (`CLEANUP_STOP_BUDGET_MS`).
- **Text boxes Accessibility cannot see.** Cursor's side panels, some Chrome pages and Slack report no focused field while the caret is in one (`no_focus`), so the words only went to the notch and the clipboard. In those apps (Cursor, VS Code, Windsurf, Chrome, Arc, Safari, Slack, Notion, Claude, ChatGPT, Linear) a normal paste is now sent anyway (`dictation.insert.blind_paste`); it cannot be confirmed, so the notch and clipboard keep the words too. Never in Braino's own window.
- **Honest log line.** HERA logged "pasted into the text box" for the notch fallback as well. It now says "no text box found" or "pasted without confirmation", with how many phrases were cleaned.

## Measured speed

Measured on an M-series MacBook Air, August 24 2026, with the real binaries.

| Leg | Measured |
| --- | --- |
| Live words appear after you start speaking | ~900 ms |
| Stop to full transcript available | 14 to 40 ms |
| Stop to cleaned text, after a natural pause | 0 to 1 ms |
| Stop to cleaned text, stopping mid-word | ~480 ms |
| Hard cap before Braino gives up and pastes raw | 900 ms |
| Parakeet decode speed | 0.081x real time, about 12x faster than the audio |
| Clean-up pass, on Apple's on-device model | 664 ms median |

The shape matters more than any single number. Transcription streams locally, so
by the time the stop gesture lands there is almost nothing left to transcribe.
The clean-up is the slow part at 664 ms, so it is started from the settled-phrase
report during a pause rather than at stop: a user who finishes a sentence before
reaching for the shortcut pays nothing for it.

For comparison, Wispr Flow publishes a sub-700 ms p99 for its whole pipeline, and
reviewers report one to two seconds in practice because every session makes a
cloud round trip. BrainoHERA has no network leg on this path at all. Accuracy is
a separate question and is not claimed here: Wispr reports about 97.2% on
standard English audio, and BrainoHERA has no comparable measured figure yet.

Two costs are real and unmeasured. The clean-up now runs on the neural engine
while transcription is still streaming, and although Parakeet has roughly twelve
times the headroom it needs, contention between the two has not been measured
under load. And the 664 ms figure is with the formatter already warm, which the
app arranges at launch.

## Honest limitations

- Speech recognition can be excellent, but no model can promise perfect words
  for every accent, microphone, name, code token, or noisy room. This MVP still
  needs a real Mac microphone pass across Notes, Mail, Notion, and an Electron
  editor.
- Transcription runs **on device** by default: NVIDIA Parakeet, streaming in
  160ms chunks on the Apple Neural Engine (`native/BrainoDictate`). No audio
  leaves the Mac, and it works with the wifi off. `parakeetEnabled()` in
  `main.cjs` is the switch, and on-device is the default.
- `BRAINO_PARAKEET=0` falls back to the cloud path: a transcription-only
  Realtime session with OpenAI (`gpt-live-transcribe`). That is the fallback,
  not the normal route. This line previously said BrainoHERA was not offline,
  which was true before Parakeet landed and is not true now.
- Braino does not guess the “nearest” field. Guessing can paste private speech
  into the wrong place. The field must own the caret, or recovery goes to the
  Notch and clipboard.
- Password and secure fields are deliberately blocked.
- Some apps intercept Command-V or expose incomplete Accessibility trees. The
  fallback preserves the words, but the user may still need to paste manually.
- There is not yet a personal dictionary screen, app-specific formatting,
  backtrack editing, transcript history, or an audio replay/retry queue.
- The formatter cannot recover a word the speech model heard incorrectly. For
  example, a name misheard as another name needs stronger vocabulary context or
  a future personal dictionary; the formatter is forbidden from guessing it.
- Formatting is best-effort. A result that is not ready before Stop is simply
  skipped for that turn; the raw streamed transcript inserts immediately.
- Keyword hints improve the odds of names and product terms but do not force a
  word and do not guarantee spelling. A personal dictionary UI is still needed.
- “Instant” means Braino starts preserving audio as soon as the shortcut lands;
  macOS may still take a small hardware-dependent moment to return the live mic
  stream. Keeping the microphone permanently open would remove more latency but
  would also leave the privacy indicator on, so this MVP deliberately does not.
- This lane transcribes faithfully, then edits by removing words and by
  correcting a few that were clearly misheard. Summarizing, answering, or
  rewriting the user's thought into different words remain separate, explicit
  actions, and the gate rejects them outright.
- The correction allowance is deliberately small: at most four words per
  utterance and never more than about a sixth of it, and only where the two
  spellings are close. Beyond that the whole edit is refused and the raw
  transcript is inserted, because a rougher paste beats a fluent invention.
- Numbers are never corrected. A wrong number is the one mistake nobody catches
  by rereading, so “the 6th” can never become “the 8th”.

## Technical shape

- `mac/braino-mac/main.cjs`: double-Option ownership, focus checks, atomic
  front-app paste gate, AX fallback, clipboard recovery, and structured logs.
- `mac/braino-mac/renderer/braino-mac.js`: startup audio pre-roll, queued
  short-phrase stop handling, Realtime
  session updates, the local-audio/upload privacy gate, one ordered PCM producer
  for startup and live speech, duration-aware commits, local voice detection,
  `item_id` turn buffering, whole-session assembly, immediate stop
  acknowledgement, a 1.2-second final-event deadline, streamed-delta fallback,
  formatter prefetch, one final insertion, and Notch fallback.
- `mac/braino-mac/renderer/index.html` and `braino-mac.css`: the fixed black
  BrainoHERA transcript sheet, website-matched green HERA shimmer, downward
  spring geometry, stacked phrases, and Listening/Hearing you/Finishing states.
- `mac/braino-mac/dictation.cjs`: testable control, normalization,
  faithful context, literal vocabulary, accuracy delay, turn policy, and the
  deterministic refinement acceptance gate.
- `mac/braino-mac/native/BrainoAX.swift`: system-wide focused-element discovery,
  editable ancestor/descendant resolution, secure-field detection, non-content
  field fingerprints, and selected-text insertion.
- `supabase/functions/realtime/openai-realtime-call/index.ts`: server-authorized
  transcription session using the existing OpenAI secret.
- `supabase/functions/voice/dictation-refine/index.ts`: authenticated,
  JSON-only lossless formatting request using the existing server-side OpenAI
  secret. The caller cannot choose the model or loosen the formatter contract.
- `tests/mac-dictation.test.mjs`: start policy, faithful prompt, vocabulary,
  exact spoken-word contract, and VAD configuration tests.

The flow is:

`Double Option → local capture + focus preflight in parallel → approve non-secure target → one ordered PCM stream for buffered + live audio → live transcript + formatter prefetch → double Option → freeze audio → final event or 1.2-second streamed-delta fallback → local faithfulness gate with no stop-time network wait → one verified paste or AX insert → Notch + clipboard recovery`

## Product or design decisions

- **Double Option owns BrainoHERA.** A recording-only Spotify skit can no longer
  hijack the global shortcut.
- **No invisible language commands while dictating.** The hotkey controls the
  microphone; the microphone only provides text.
- **The focused field, not the nearest field.** “Nearest” is visually ambiguous
  and unsafe across apps. Accessibility focus is the source of truth.
- **Recovery is a product feature.** A correct transcript is never discarded
  just because an app rejected insertion.
- **Stop means insert once.** Natural pauses help transcription accuracy, but
  they do not mutate the user's field. Double Option is the single visible
  boundary between capture and final insertion.
- **Move to `gpt-live-transcribe`.** OpenAI currently recommends it for Realtime
  transcription. It keeps the same $0.017/minute price as the existing model
  while adding supported context, keyword, language-hint, and delay controls.
  BrainoHERA uses `low` delay for stop responsiveness and protects faithfulness in
  the prompt, transport, vocabulary, and deterministic formatting gate.
- **One turn-boundary authority.** A real August 8 Mac run showed that
  `gpt-live-transcribe` rejects server turn detection. BrainoHERA now sets
  `turn_detection` to `null`; one adaptive local detector owns every explicit
  commit. This avoids duplicate commits while keeping natural multi-turn typing.
- **Capture first, upload only after approval.** Accessibility discovery is too
  slow to sit in front of the microphone, but secure-field privacy cannot be
  weakened for speed. Braino runs both operations together, negotiates WebRTC
  with a trackless sender, and opens the audio gate only after the focus result.
- **One audio transport owns chronology.** A five-phrase Mac pass on August 8
  captured all the words but moved later live words ahead of startup words:
  “eight…” preceded “one…”, and “going there” preceded the question. Buffered
  PCM and live RTP had no cross-transport ordering guarantee. BrainoHERA now keeps
  the RTP sender silent and sends the entire session on one ordered data channel.
- **Stop never commits emptiness.** The same pass caught local silence VAD and
  double Option committing 46–546 ms apart. OpenAI then returned
  `input_audio_buffer_commit_empty`. PCM duration and speech state now decide
  whether Stop has a real final turn to commit.
- **Stop during startup preserves speech.** A short phrase may finish before a
  cold authenticated session opens. Stop now freezes capture locally and queues
  the final commit; it no longer cancels startup and discards the phrase.
- **Editing is deletion, not rewriting.** The first version of this shipped
  two halves written to opposite contracts. Apple's on-device formatter was
  instructed to remove fillers and resolve self-corrections; the gate that
  judged it demanded the exact same words in the exact same order. So every
  successful clean-up was rejected and the raw transcript pasted instead:
  measured at sourceCoverage 0.71 on a real sentence, which is a guaranteed
  rejection every time the formatter did its job. The gate now aligns the edit
  against the speech and permits deletion plus a few close corrections, while
  still forbidding additions, reordering, summarizing, moved numbers, and
  dropped emails, URLs, handles or code tokens. Rejection always means
  raw-transcript insertion.
- **One transcript, chosen, never several joined.** FluidAudio reports the
  whole transcript accumulated since the last reset on every end-of-utterance
  callback, and `finish()` decodes that same accumulator again. Neither is a
  per-phrase suffix. Collecting them in a list and joining it said everything
  twice, which a speaker-to-microphone pass reproduced exactly. The session now
  keeps one cumulative transcript and `finish()` supersedes it.
- **The transcript grows down, never sideways.** Text length no longer controls
  Notch width. One stable black sheet owns BrainoHERA, with the label separated
  from a vertically stacked transcript.
- **Stop is not a network checkpoint.** Final server context gets a short chance
  to win, but live deltas are already usable text. Formatter and late-final
  latency are removed from the critical insertion path.

## Research record

- Wispr Flow describes a system-wide dictation workflow, hotkeys, smart
  formatting, dictionary, and paste recovery in its official help centre:
  [hotkeys](https://docs.wisprflow.ai/articles/2612050838-supported-unsupported-keyboard-hotkey-shortcuts),
  [hands-free mode](https://docs.wisprflow.ai/articles/6391241694-use-flow-hands-free),
  [text not pasting](https://docs.wisprflow.ai/articles/7971211038-fix-text-not-pasting-after-dictation),
  [field detection](https://docs.wisprflow.ai/articles/1621472516-flow-fails-to-detect-text-fields-or-inserts-incorrectly-on-non-qwerty-keyboard-layouts),
  [dictionary](https://docs.wisprflow.ai/articles/4052411709-teach-flow-your-words-with-the-dictionary),
  and [smart formatting](https://docs.wisprflow.ai/articles/5373093536-how-do-i-use-smart-formatting-and-backtrack).
- OpenAI's official
  [Realtime transcription guide](https://developers.openai.com/api/docs/guides/realtime-transcription)
  defines transcription-only sessions, manual input-buffer commits,
  deltas/completed events, optional turn detection, and `item_id` ordering. The
  [`gpt-live-transcribe` model page](https://developers.openai.com/api/docs/models/gpt-live-transcribe)
  confirms the current model, context controls, and $0.017/minute audio price.
  The model-specific runtime remains the authority: it rejected server turn
  detection, so Braino uses the documented manual-commit path.
- Apple's Accessibility documentation defines the system-wide
  [focused UI element](https://developer.apple.com/documentation/applicationservices/carbon_accessibility/attributes/kaxfocuseduielemenattribute)
  and [AXUIElement API](https://developer.apple.com/documentation/applicationservices/axuielement_h)
  used by the insertion layer.

## What comes next

1. Run the live Mac matrix and record shortcut-to-mic latency, first-word
   retention, word error rate, insertion, and recovery failures by app.
2. Build a representative word-error-rate set for accents, Hindi-English code
   switching, names, URLs, numbers, and code; tune delay and keywords from data.
3. Add an explicit semantic “polish this” action after faithful transcription,
   never mixed invisibly into the lossless formatting pass.
4. Add recoverable transcript history and retry without storing audio by
   default.
5. Add app adapters only where Accessibility and real paste events still fail.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
