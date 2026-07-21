# Braino Mac Prototype

Experimental Electron shell for a Mac-native Braino.

## Run

```bash
npm run mac:dev
```

Braino appears in a transparent always-on-top overlay aligned to the real macOS Dock. The app does not draw its own dock surface.

Braino starts on the visible macOS Dock strip and patrols across it. Drag Braino directly to park him anywhere on the screen. If you drop him near the Dock, he snaps back into Dock patrol; if you drop him higher, he stays as a floating desktop buddy. The rest of the overlay stays click-through so the Mac remains usable.

## Controls

- Double `Space`: show or hide Braino, matching the browser extension invocation style.
- Double `Control`: start voice listening through the native Swift helper.
- `Control+Space`: backup voice toggle.
- If macOS does not show the permission prompt, open System Settings -> Privacy & Security -> Accessibility and allow the terminal/Electron process running Braino.
- If native speech recognition misses, Braino asks you to say it once more, records a short command, transcribes that audio through Supabase/OpenAI, then falls back to a typed delegate prompt only if that also fails.

## First Delegate Actions

- Organize Desktop files: “Braino, organize all my files” or “Clean up my Desktop”.
- Undo the last Desktop organization: “Undo desktop organization”.
- Open apps: “Open Chrome”, “Open Xcode”, “Open Finder”.
- Open websites: “Go to github.com”.
- Web search: “Search the web for best ML papers”.
- Local search: “Find document called resume” or “Open PDF about tax”.
- Front window: “What do you see?” / “What is open?”

## Desktop Organization

The first organizer pass targets loose files on `~/Desktop`. It creates `~/Desktop/Braino Organized` and moves files into category folders:

- Screenshots and Recordings
- Images
- Videos
- Audio
- PDFs
- Documents
- Spreadsheets
- Presentations
- Archives and Installers
- Code
- Design
- Links
- Misc

Existing Desktop folders are left alone. Braino writes `~/Desktop/Braino Organized/.braino-last-organize.json` so the latest organization can be undone.

## Mac Capability Map

- Desktop/file hygiene: organize loose Desktop files, undo the last organization, find files with Spotlight, open matching files.
- App launching: open common Mac apps by name.
- Browser control starter: open Chrome, open URLs, and run Google searches.
- Local awareness starter: report the front app/window title through Accessibility.
- Voice-first operation: native macOS speech recognition for commands, Fish Audio for Braino speech when configured, macOS `say` fallback otherwise.
- Visual companion: Dock patrol, drag-anywhere placement, transparent click-through overlay.

## Dynamic Island / Notch UI

macOS does not expose an official API for third-party apps to draw inside the real Dynamic Island/notch system surface. The practical version is a Braino-owned, always-on-top top-center overlay that visually behaves like a Dynamic Island: listening pulse, task progress, quick status, and small mascot reactions.

This first version is intentionally voice-first and delegate-only. It does not yet port the full extension agent loop, Gmail DOM adapters, or browser page extraction. The next bridge should connect this native shell to the existing delegate planner and Chrome extension runtime.
