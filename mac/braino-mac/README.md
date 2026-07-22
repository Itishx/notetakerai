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
- Double `Control`: start live Braino voice. The primary path is the same WebRTC realtime loop as the Chrome extension: mic -> realtime transcription/VAD -> delegate action -> Braino/Fish Audio speech.
- `Control+Space`: backup voice toggle.
- If macOS does not show the permission prompt, open System Settings -> Privacy & Security -> Accessibility and allow the terminal/Electron process running Braino.
- Microphone access is requested separately before realtime or fallback recording starts. If it is blocked, open System Settings -> Privacy & Security -> Microphone and allow the terminal/Electron process running Braino.
- If realtime is not configured or cannot connect, Braino records a short command, transcribes that audio through Supabase/OpenAI, then tries the native Swift helper, then falls back to a typed delegate prompt only if that also fails.

## Live Voice Setup

The extension's realtime endpoint requires the signed-in Braino Supabase JWT. On Mac, Braino uses the same browser-based wakeup auth flow as the extension: when realtime voice wakes without a saved session, Braino opens the hosted `/auth/extension` relay page in the browser, receives the signed-in Supabase session on a local `127.0.0.1` callback, closes the auth tabs, and stores the access/refresh token at `~/Library/Application Support/Braino Mac/auth-session.json`.

For local development, Braino opens both `trybraino.com` and the cinema preview auth relay by default, because either origin may have the current session. Packaged builds default to `trybraino.com` only. Override with `BRAINO_MAC_AUTH_ORIGINS` when needed.

For local development without the Braino Supabase realtime endpoint, `OPENAI_API_KEY`, `OPENAI_REALTIME_API_KEY`, or `VITE_OPENAI_API_KEY` can be used as a direct local realtime fallback. In both paths, OpenAI realtime is used for live listening/transcription; Braino's audible reply still uses the existing Fish Audio voice when configured.

The OpenAI key configured in Supabase Edge Function secrets is server-side. The Mac app cannot read that secret directly; it can only use it by calling the Braino realtime Edge Function with a signed-in Braino JWT.

Voice logs are written to:

```bash
~/Library/Logs/Braino Mac/braino-mac.log
```

The log records credential presence, transport choice, HTTP status, mic permission state, WebRTC state, and fallback transitions with secrets redacted.

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
- Voice-first operation: realtime WebRTC listening when configured, browser recording fallback, native macOS speech recognition fallback, Fish Audio for Braino speech when configured, macOS `say` fallback otherwise.
- Visual companion: Dock patrol, drag-anywhere placement, transparent click-through overlay.

## Dynamic Island / Notch UI

macOS does not expose an official API for third-party apps to draw inside the real Dynamic Island/notch system surface. The practical version is a Braino-owned, always-on-top top-center overlay that visually behaves like a Dynamic Island: listening pulse, task progress, quick status, and small mascot reactions.

This first version is intentionally voice-first and delegate-only. It does not yet port the full extension agent loop, Gmail DOM adapters, or browser page extraction. The next bridge should share the signed-in browser extension auth/session with this native shell automatically.
