---
name: yap-mode
description: Use this skill when Braino needs to start, stop, explain, or troubleshoot silent system-wide dictation on Mac, including double Option, voice aliases, focused-caret insertion, the mint listening state, and gpt-live-transcribe.
---

# BrainoHERA

## Purpose

BrainoHERA is Braino's system-wide Mac dictation skill, formerly called Yap
Mode. "Speak Your Mind" and "Yap Mode" remain voice aliases. The skill streams
the user's microphone to OpenAI's
transcription-only Realtime session and inserts readable text at the caret in
the currently focused editable field.

It is not a conversation with Braino. Braino never generates or speaks a reply
while this skill is active.

## User Contract

- Double Option toggles the skill.
- Voice starts include "Braino, start BrainoHERA", "Braino, start Hera mode",
  "Braino, start dictation mode", "Speak your mind", "Take this down", "Write
  what I say", and "Start typing". The former "Yap Mode" start phrase remains
  backwards compatible.
- Double Option again stops the session. Spoken text is never consumed as an
  in-session control phrase: "done" is dictated like every other word.
- Pauses finalize ordered transcription turns but do not paste early. The
  complete session is inserted once, after the stop gesture drains the final
  audio, at the editable field that owns the caret at that moment.
- At home, a fixed black Notch sheet springs downward and stacks completed plus
  live transcript phrases. Its mint dot shows listening state; `Braino` stays
  white and uppercase `HERA` uses the website's moving green shimmer. The full
  mascot glows and listens when he is standing on the desktop.
- Text goes only to the focused editable field. Braino refuses secure fields.
  If there is no editable target, the full transcript stays in the Notch and
  on the clipboard instead of being pasted blindly.

## Model And Data Path

- Model: `gpt-live-transcribe`
- Session type: transcription-only Realtime WebRTC
- Assistant response generation: disabled
- TTS: disabled
- Final-event latency setting: `delay: "low"`
- Turn boundary: one adaptive local voice detector, followed by explicit
  `input_audio_buffer.commit` events; server turn detection stays `null`
- Startup protection: up to 30 seconds of local microphone pre-roll is sent
  before live processing so a cold connection cannot eat the opening sentence.
  Capture begins in parallel with the Accessibility preflight; the WebRTC
  sender stays trackless and buffered audio remains local until the non-secure
  focus gate passes
- Audio chronology: after approval, both buffered and live PCM use one ordered
  data channel for the entire session. The RTP sender remains silent, preventing
  later words from overtaking startup words at the transport handoff
- Commit guard: a turn requires at least 100 ms of buffered PCM plus likely
  speech. Stop does not duplicate a VAD commit or commit trailing silence
- Input signal: clean mono capture with browser denoising and gain control off,
  followed by one OpenAI near/far-field noise-reduction stage; English and Hindi
  language hints cover ordinary English and Hinglish dictation
- Ordering: completed turns are buffered by `item_id` and inserted in commit
  order into one session transcript, because Realtime transcription completion
  events may arrive out of order
- Stop deadline: final events get 1.2 seconds; after that, ordered transcript
  deltas become the provisional final, and late events cannot duplicate a turn
- Formatting: a lossless formatter is prefetched during pauses and accepted
  only through the ordered-word faithfulness gate. Insertion never waits for it
- Insertion: after double Option stops capture, macOS Accessibility validates
  the current caret, a real system paste handles broad editor compatibility,
  and a field fingerprint checks that text visibly changed. Selected-text
  Accessibility insertion is attempted when a verifiable paste did nothing.
- Recovery: a successful paste restores the previous clipboard; a missing
  field or failed insertion deliberately keeps the transcript on the clipboard
  and opens the Notch transcript fallback

The transcription context asks for faithful words in the language spoken,
including openings, fillers, repetitions, false starts, slang, and profanity;
conservative punctuation; exact names/brands/numbers/URLs/code; and no
summarizing or rewriting. Literal keywords cover Braino product vocabulary plus
Itish and Itish Pande.
Keywords are hints, not forced output. Transcription also stays out of the
conversational model and every downstream rewriting pipeline.

## Boundaries

- Requires Microphone and Accessibility permission.
- Does not type into password or secure text fields.
- Does not guess which nearby field the user meant. The caret must already be
  in an editable field; otherwise the Notch and clipboard become the safe
  destination.
- Does not send the transcript through Braino's conversational Realtime model,
  Emotional Engine, delegate router, or TTS pipeline.

## Verification

1. Place the caret in Notes, Mail, a browser text field, and an Electron editor.
2. Double Option and confirm only the visible Braino surface glows mint.
3. Begin the first word on the second Option tap and confirm the opening is not
   truncated, including on a cold connection.
4. Dictate multiple turns and confirm the field stays untouched while capture
   remains active.
5. Say "new line" and "new paragraph".
6. Say "done" and confirm it is inserted without stopping the session.
7. Confirm double Option removes the mint listening state immediately, drains
   the final phrase, and inserts the complete ordered session exactly once.
8. Confirm a secure field is rejected without uploading or typing.
9. Dictate on a non-editable surface and confirm the Notch shows the full
   transcript and the clipboard contains it.
10. Change front apps just before insertion and confirm Braino does not paste
   into the newly focused app.
