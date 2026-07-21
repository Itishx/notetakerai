# Braino Mac Prototype

Experimental Electron shell for a Mac-native Braino.

## Run

```bash
npm run mac:dev
```

Braino appears in a transparent always-on-top overlay aligned to the real macOS Dock. The app does not draw its own dock surface.

Braino starts on the visible macOS Dock strip and patrols across it. Drag Braino directly to park him anywhere on the screen. If you drop him near the Dock, he snaps back into Dock patrol; if you drop him higher, he stays as a floating desktop buddy. The rest of the overlay stays click-through so the Mac remains usable.

## Controls

- `Control+Space`: toggle voice listening globally.
- Double `Control`: works through the Swift event-tap helper after macOS grants Accessibility permission.
- If macOS does not show the permission prompt, open System Settings -> Privacy & Security -> Accessibility and allow the terminal/Electron process running Braino.
- If speech recognition is unavailable in the Electron build, Braino falls back to a typed delegate prompt.

## First Delegate Actions

- Open apps: “Open Chrome”, “Open Xcode”, “Open Finder”.
- Open websites: “Go to github.com”.
- Web search: “Search the web for best ML papers”.
- Local search: “Find document called resume” or “Open PDF about tax”.
- Front window: “What do you see?” / “What is open?”

This first version is intentionally voice-first and delegate-only. It does not yet port the full extension agent loop, Gmail DOM adapters, or browser page extraction. The next bridge should connect this native shell to the existing delegate planner and Chrome extension runtime.
