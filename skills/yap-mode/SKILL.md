---
name: yap-mode
description: Use this skill when Braino needs to start, stop, explain, or troubleshoot silent system-wide dictation on Mac, including double Option, voice aliases, focused-caret insertion, the mint listening state, and gpt-realtime-whisper.
---

# Yap Mode

## Purpose

Yap Mode is Braino's system-wide Mac dictation skill. "Speak Your Mind" remains
a voice alias. The skill streams the user's microphone to OpenAI's
transcription-only Realtime session and inserts readable text at the caret in
the currently focused editable field.

It is not a conversation with Braino. Braino never generates or speaks a reply
while this skill is active.

## User Contract

- Double Option toggles the skill.
- Voice starts include "Braino, start Yap Mode", "Braino, start dictation mode",
  "Speak your mind", "Take this down", "Write what I say", and "Start typing".
- Say "done", "stop dictation", or "that's it" to stop. The exit phrase is
  consumed locally and is never inserted.
- The notch glows mint while Braino is home. The full mascot glows and listens
  when he is standing on the desktop.
- Text goes only to the focused editable field. Braino refuses secure fields
  and does not paste into a non-editable surface.

## Model And Data Path

- Model: `gpt-realtime-whisper`
- Session type: transcription-only Realtime WebRTC
- Assistant response generation: disabled
- TTS: disabled
- Turn boundary: server VAD
- Insertion: macOS Accessibility selected-text insertion, with a clipboard
  paste fallback that restores the user's previous clipboard

The transcription prompt asks for capitalization, punctuation, removal of
obvious filler and false starts, and preservation of the user's language,
meaning, names, URLs, and code tokens.

## Boundaries

- Requires Microphone and Accessibility permission.
- Does not type into password or secure text fields.
- Does not choose a field on the user's behalf. The caret must already be in an
  editable field.
- Does not send the transcript through Braino's conversational Realtime model,
  Emotional Engine, delegate router, or TTS pipeline.

## Verification

1. Place the caret in Notes, Mail, a browser text field, and an Electron editor.
2. Double Option and confirm only the visible Braino surface glows mint.
3. Dictate multiple turns and confirm punctuation and spacing remain readable.
4. Say "new line" and "new paragraph".
5. Say "done" and confirm the word is not inserted.
6. Confirm double Option also stops the skill.
7. Confirm a secure or non-editable field is rejected without typing.
