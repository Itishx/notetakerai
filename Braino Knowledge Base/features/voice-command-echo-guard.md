# Voice Command Echo Guard

**Type:** Technical  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** July 30, 2026

## The simple version

Braino can keep listening after he replies, but his own voice or music must never become a Mac command. Action-like speech picked up during music, or immediately after Braino speaks, now needs to address Braino by name.

## Why it exists

The live log captured speaker bleed as “Send an email” and sent it to the command delegate. A plausible transcription is not enough evidence that a person intended an external action.

## How to use it

Speak normally for conversation. During music or just after Braino replies, say “Braino” before a command, for example: “Braino, send an email.”

## What Braino knows or does

- Detects whether a transcript looks like a Mac action.
- Rejects unaddressed action phrases while media is playing.
- Rejects unaddressed actions for 15 seconds after Braino replies inside an open realtime conversation.
- Does not treat startup greetings or demo narration as realtime echo.
- Still accepts explicit “Braino” commands and answers to an active workflow follow-up.
- Logs rejections as `voice.media_bleed_ignored` or `voice.post_reply_action_ignored`.

## Honest limitations

This is a deterministic safety gate, not perfect speaker identification. A genuine follow-up command during the protected window needs Braino’s name. Conversation and requested workflow answers remain natural.

## Technical shape

The gate lives in `mac/braino-mac/renderer/braino-mac.js` inside `shouldAcceptVoiceTranscript`. It combines wake-name detection, action-intent detection, media state, the most recent spoken-line timestamp, and pending workflow state before routing anything to the delegate.

## Product or design decisions

False external actions cost more than the small friction of saying Braino’s name. The stricter rule applies only where speaker bleed is likely.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
