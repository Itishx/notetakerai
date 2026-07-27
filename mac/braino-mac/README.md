# Braino Mac Companion

Experimental Electron shell for a Mac-native Braino.

## Run

```bash
npm run mac:dev
```

Braino appears in a transparent always-on-top overlay aligned to the real macOS Dock. The app does not draw its own dock surface.

Braino starts on the visible macOS Dock strip and patrols across it. Drag Braino directly to park him anywhere on the screen. If you drop him near the Dock, he snaps back into Dock patrol; if you drop him higher, he stays as a floating desktop buddy. The rest of the overlay stays click-through so the Mac remains usable.

## Controls

- Double `Space`: show or hide Braino, matching the browser extension invocation style.
- Double `Control`: start live Braino voice. The primary path is the same WebRTC realtime loop as the Chrome extension: mic -> realtime transcription/VAD -> delegate action -> Braino/Fish Audio speech. You can barge in while Braino is speaking; the old reply is cancelled and the new command takes over.
- `Control+Space`: backup voice toggle.
- If macOS does not show the permission prompt, open System Settings -> Privacy & Security -> Accessibility and allow the terminal/Electron process running Braino.
- Microphone access is requested separately before realtime or fallback recording starts. If it is blocked, open System Settings -> Privacy & Security -> Microphone and allow the terminal/Electron process running Braino.
- If realtime is not configured or cannot connect, Braino records a short command, transcribes that audio through Supabase/OpenAI, then tries the native Swift helper, then falls back to a typed delegate prompt only if that also fails.

## Her Mode

A full-screen companion takeover in the spirit of the film Her: a living warm light on a film-grain black stage, streaming captions, and a softer conversational persona.

- Enter: say "her mode" (or "call her" / "talk to her") while Braino is listening, or press `Cmd+Shift+H`.
- Leave: say "goodbye" (or "back to Braino"), click "leave quietly", or press `Cmd+Shift+H` again.
- Same realtime listening pipeline and Fish Audio TTS as Braino; her voice uses a dedicated Fish reference id sent per-request, so no server changes are needed.
- In her mode every transcript is conversation: the Mac delegate, team demo, and action routing are bypassed, and the idle voice shutdown stretches from 15s to 60s.
- Files: `renderer/her-presence.js` (canvas light engine), `renderer/her-mode.js` (stage + captions), `renderer/her-mode.css`.

## Live Voice Setup

The extension's realtime endpoint requires the signed-in Braino Supabase JWT. On Mac, Braino uses the same browser-based wakeup auth flow as the extension: when realtime voice wakes without a saved session, Braino opens the hosted `/auth/extension` relay page in the browser, receives the signed-in Supabase session on a local `127.0.0.1` callback, closes the auth tabs, and stores the access/refresh token at `~/Library/Application Support/Braino Mac/auth-session.json`.

For local development, Braino opens both `www.trybraino.com` and the cinema preview auth relay by default, because either origin may have the current session. Packaged builds default to `www.trybraino.com` only. Override with `BRAINO_MAC_AUTH_ORIGINS` when needed.

For local development without the Braino Supabase realtime endpoint, `OPENAI_API_KEY`, `OPENAI_REALTIME_API_KEY`, or `VITE_OPENAI_API_KEY` can be used as a direct local realtime fallback. In both paths, OpenAI realtime is used for live listening/transcription; Braino's audible reply still uses the existing Fish Audio voice when configured.

The OpenAI key configured in Supabase Edge Function secrets is server-side. The Mac app cannot read that secret directly; it can only use it by calling the Braino realtime Edge Function with a signed-in Braino JWT.

Voice logs are written to:

```bash
~/Library/Logs/Braino Mac/braino-mac.log
```

The log records credential presence, transport choice, HTTP status, mic permission state, WebRTC state, and fallback transitions with secrets redacted.
It also records Mac delegate routing for local file/app actions, including cleaned prompts, detected intents, Spotlight counts, fallback folder-search results, app lookup matches, and open failures.

## First Delegate Actions

- Organize Desktop files: “Braino, organize all my files” or “Clean up my Desktop”.
- Bulk organize Desktop files: “Organize my files by type”, “Organize by date”, or “Organize by project”.
- Undo the last file action: “Undo that”, “Undo the last file action”, or “Restore what you just moved”.
- Create folders: “Create a folder called Invoices on Desktop” or “Make a folder called Resumes in Documents”.
- Rename files: “Rename Braino Final video to Braino Launch”.
- Move files: “Move the tax PDF to Documents” or “Move yaya image to Pictures”.
- Delete files with confirmation: “Delete the old receipt PDF”, then say “yes, delete it” or “cancel”.
- Open apps: “Open WhatsApp”, “Open Cursor”, “Open Xcode”, “Open Finder”.
- Open common services: “Open Netflix” opens the Mac app if it exists, otherwise the correct website.
- Open websites: “Go to github.com”.
- Web search: “Search the web for best ML papers”.
- Local search: “Find document called resume”, “Look for the tax PDF”, or “Open yaya image”.
- Apple Notes: “Create a note for me”, then tell Braino what it should say. Or say “Create a note about tomorrow’s demo checklist”.
- Apple Mail: “Send an email to Renu saying I’ll call you tomorrow” or “Draft an email to Rahul with subject Quick update body I’ll send details tonight”.
- Spotify: “Play Bargad on Spotify”, “pause Spotify”, “lower the volume”, “set Spotify volume to 40%”, “add this song to liked songs”, or “add Brabus to my gym playlist”.
- Team demo: “Braino, introduce yourself” runs the ANZ demo flow, plays DAF in the Spotify Mac app, opens the machine learning article, reads the short summary, speaks Madhuri, Shree, then Palash, and opens trybraino.com.
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

## Mac Skills

These are the local Mac-only skills that do not require the browser extension agent loop:

1. Organize loose Desktop files into `Braino Organized`, grouped by type, date, or project.
2. Undo the last file action from the persistent action journal at `~/Library/Application Support/Braino Mac/file-actions.json`.
3. Create folders in common user locations.
4. Rename files and folders with extension preservation.
5. Move files and folders into known folders or searched destination folders.
6. Delete files and folders only after explicit confirmation, by moving them to Trash with an undo record.
7. Find files on the Mac with Spotlight metadata/content search, with a fallback scan of common user folders.
8. Open the best matching file when the user asks Braino to open a document, PDF, image, folder, resume, receipt, or named file.
9. Create notes in Apple Notes with a follow-up prompt when the note body is missing.
10. Send or draft email in Apple Mail, with Contacts lookup for recipient names and a follow-up prompt for missing recipient/body details.
11. Open installed Mac apps by name, with website fallback for common services like Netflix, WhatsApp, YouTube, Gmail, Maps, LinkedIn, Spotify, X, and ChatGPT.
12. Control Spotify playback, volume, liked songs, and named playlist adds through the Mac app/API bridge.
13. Run the ANZ Team demo with deterministic scripts for Madhuri, Rahul, Shreeya, Palash, and Shree.

## Mac Capability Map

- App launching: open installed Mac apps by name, first through macOS app resolution and then Spotlight app bundle lookup.
- Browser control starter: open Chrome, open URLs, and run Google searches.
- Local awareness starter: report the front app/window title through Accessibility.
- Voice-first operation: realtime WebRTC listening when configured, browser recording fallback, native macOS speech recognition fallback, Fish Audio for Braino speech when configured, macOS `say` fallback otherwise.
- Visual companion: Dock patrol, drag-anywhere placement, transparent click-through overlay.

## Dynamic Island / Notch UI

macOS does not expose an official API for third-party apps to draw inside the real Dynamic Island/notch system surface. The practical version is a Braino-owned, always-on-top top-center overlay that visually behaves like a Dynamic Island: listening pulse, task progress, quick status, and small mascot reactions.

### The notch is interactive now

- **Hover near the notch** and the island springs open into a black-glass tray: now playing (artwork, live progress, prev/play/next), the next calendar event with a one-click **Join & record** button when it has a Zoom/Meet/Teams/Webex link, active timers, and battery + connected headphones.
- **Click the collapsed notch** to start or stop voice. **Scroll on it** to change system volume (tiny HUD in the pill).
- **Drag a file onto the notch** and Braino holds it on a shelf: ask him what to do with it by voice ("summarize this pdf", "email it to Renu"), or use the chip buttons (open / show in Finder / let go).
- The ticker runs **two slots** like the iPhone island: primary activity on the left, a compact secondary on the right (charger plugged, AirPods connected, held files, music while a timer runs).
- Hover works even mid-drag because the main process watches the real cursor position and flips window interactivity — the click-through overlay never sees mouse events during a native drag on its own.
- Displays without a physical notch get a floating rounded pill instead.

This first version is intentionally voice-first and delegate-only. It does not yet port the full extension agent loop, Gmail DOM adapters, or browser page extraction. The next bridge should share the signed-in browser extension auth/session with this native shell automatically.
