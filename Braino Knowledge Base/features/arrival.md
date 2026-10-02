# Arrival

**Type:** Feature
**Platform:** Braino for Mac (AffectiveOS)
**Status:** MVP. Built in the Braino Mac app, not yet tested on real hardware.
**Released:** 2026-09-27

## The simple version

When you come back to your Mac, the notch says hello like someone who knows you, instead of a cold login.

Right after you unlock:

1. The notch widens and says **"Looking for you"** while the camera checks someone is actually there.
2. **Touch ID comes first**, the way you unlock anything. Nothing personal shows until it passes.
3. **"Morning, Itish."** with a green tick, and one line like "3 things waiting for you." or "Nothing waiting. Clean start."
4. The notch grows into a short summary of what's waiting, up to four rows with small icons: who messaged you on WhatsApp while you were away, your next Mesa class today, and what's due soon.
5. The notch folds back, Braino jumps out of it and says **"Good morning, Itish."** out loud.

Cancel Touch ID and it says "Okay. Another time." and folds away quietly. No greeting.

## Why it exists

Unlocking a Mac feels like clocking in. Nobody says hello and nobody tells you what you missed. A companion should notice you walked in, check it's really you, and tell you what's waiting before you go looking.

## How to use it

Just unlock your Mac. It shows on the first unlock of the day, or when you've been away 30 minutes or more.

- Press **Esc** to skip everything.
- Preview it any time: `npm run mac:arrival`
- Switch it off: set `BRAINO_ARRIVAL=0`

## What Braino knows or does

- Knows it's you coming back, and when it's worth saying hello.
- Shows who messaged you on WhatsApp since you locked your Mac. On the first arrival of the day, that's the last 12 hours. Direct chats only.
- Shows your next Mesa class today and what's due soon.
- Only real facts. If nothing is waiting, it says so.
- Says good morning out loud, once. He skips it if you're mid conversation, in Her mode, or if the launch greeting already said it in the last 90 seconds.

## Honest limitations

- It does not replace the macOS lock screen. Apple doesn't allow that, so it runs right after you unlock.
- The Touch ID prompt is Apple's own system window, not drawn in the notch.
- The camera only checks that a face is there. It does not recognise who you are. Touch ID is the real check.
- The face check runs on your Mac with Apple's Vision framework. Frames are never saved or sent anywhere.
- Camera off or permission denied: it skips that step. No Touch ID on this Mac: it skips that step.
- The summary only uses WhatsApp, Mesa classes and assignments. Apple Reminders and macOS notifications aren't read yet. Apple keeps notifications private to each app.
- Not yet tested on real hardware. It exists in the app build only.

## Technical shape

- Window: a separate transparent window over the notch, `mac/braino-mac/renderer/arrival.html` + `arrival.js`.
- Logic: `mac/braino-mac/arrival.cjs` decides when to show and builds the greeting and summary lines.
- Trigger: Electron `powerMonitor` `lock-screen` / `unlock-screen`. Shows on first unlock of the day or after 30+ minutes away.
- Face check: the native `BrainoScreenText` helper in a new `--faces` mode runs Apple Vision face detection on one still frame. Presence only.
- Touch ID: Electron `systemPreferences.promptTouchID`, before anything personal. The `arrival-summary` IPC only answers after Touch ID passes, so the gate is enforced in the main process, not just on screen.
- Summary: WhatsApp direct chats since lock (or last 12 hours on the day's first arrival), next Mesa class today, upcoming assignments. Up to 4 rows.
- Hello: `arrival-hello` is sent to the notch window, which runs the mascot exit from the notch and speaks. Skipped when mid conversation, in Her mode, or within 90 seconds of the launch greeting.
- State: `~/Library/Application Support/Braino Mac/arrival.json` keeps only `lastArrivalAt`.
- Preview: `npm run mac:arrival`. Kill switch: `BRAINO_ARRIVAL=0`.
- Tests: `tests/mac-arrival.test.mjs`.

## Product or design decisions

- **Presence plus Touch ID, not face recognition.** The open face recognition model used by projects like Glance (InsightFace ArcFace) is licensed for non-commercial research only. Braino can't ship that, so the camera confirms someone is there and Touch ID confirms who.
- **Touch ID first.** That's how people unlock everything else. A greeting with your name and messages should never show to whoever sat down at your Mac.
- **What's waiting, not a question.** An earlier version asked how you were feeling. It was replaced with a summary of what actually happened while you were away. Nothing about mood is asked, saved or given to Braino.
- **Said once.** The spoken hello never doubles up with the launch greeting or cuts into a conversation.
- **After unlock, not instead of it.** Fighting Apple's lock screen would be fragile and not allowed. Greeting right after is honest and reliable.
- **Every step can be skipped.** No camera, no Touch ID or Esc never blocks you from your Mac.

## What comes next

Test on real hardware. Then look at adding Apple Reminders to the summary.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
