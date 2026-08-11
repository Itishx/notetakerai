# Mac Launch Video Ritual

**Type:** Feature  
**Platform:** Braino for Mac  
**Status:** MVP  
**Released:** August 9, 2026

## The simple version

Double Shift turns Braino into the host of his own launch film. He speaks from wherever he is already standing with his real voice and mouth animation while the notch carries every word. When QuickTime starts the real local master, Braino walks home and the Dynamic Island becomes a persistent launch-video playback indicator.

## Why it exists

Opening a launch video manually feels like file management. Braino is supposed to control the Mac and have a personality, so the launch should feel like something he decided to show you himself.

## How to use it

1. Keep `Launch Vid.MP4` in Downloads or on the Desktop.
2. Double-press Shift to begin.
3. Let Braino finish the introduction.
4. Double-press Shift again to end the ritual at any point.

## What Braino knows or does

- Keeps an already-visible Braino exactly where he is; if he was resting, he comes out once before speaking.
- Speaks seven fixed lines with real TTS mouth-sync and one consistent notch answer design whose height follows the rendered text.
- Generates the complete introduction as one TTS audio asset, removing network/setup gaps between sentences while the notch advances line by line from the same playhead.
- Anchors caption timing to the loaded MP3 duration and weights each line by its phonetic characters and punctuation, rather than pretending every word takes equal time.
- Keeps Braino's body on the desktop; the answer surface has no second walking mascot or decorative mascot lane.
- Collapses the notch immediately after “Let's fucking go” before QuickTime appears.
- Opens `/Users/itishpande/Downloads/Launch Vid.MP4` in QuickTime, enters fullscreen and starts playback.
- Walks back into the notch as playback starts and holds `Now Playing · Launch Vid.MP4` in a compact black island until the video is stopped.
- Treats a second double Shift as a real exit: cancel speech, clear the notch, close the QuickTime document, release the frozen pose and restore Braino's original home/out state.
- Keeps the answer collapse black so the old coral base cannot flash while the notch shrinks.
- Reports a missing file or QuickTime failure instead of opening a different video.

## Honest limitations

This is a deterministic recording ritual, not a general launch-video command. It uses bare double Shift; Shift used while typing or as part of a shortcut is ignored. Double Space keeps its normal Braino show-or-hide behavior. The master must be named `Launch Vid.MP4` or `Launch Vid.mp4` and live in Downloads or on the Desktop. QuickTime may ask for macOS Automation permission on the first run. The seven-line introduction deliberately uses one reading-surface design instead of switching between short- and long-answer designs; only its measured height changes with the copy.

## Technical shape

- `mac/braino-mac/native/BrainoControlTap.swift` detects a bare double Shift and rejects chorded or typing use.
- `mac/braino-mac/main.cjs` routes the hotkey, resolves the exact file, opens QuickTime and requests playback.
- `mac/braino-mac/preload.cjs` exposes the launch-demo event and open command.
- `mac/braino-mac/renderer/braino-mac.js` owns the fixed script, notch speech, mouth-sync, mascot exit and frozen pose.
- Normal `speak()` behavior is unchanged; the ritual only disables the redundant floating reply caption.

## Product or design decisions

Braino's body does not travel into the notch while he speaks. His mouth moves wherever he is standing, while the notch acts as the readable transcript surface. The moment the film takes over, he walks home so he cannot distract from it; his eyes and the filename remain in the compact island. The same double-Shift gesture both starts and ends the mode, so it behaves like a proper toggle instead of a one-way demo.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
