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
- Double-click Braino: open **Customise Braino**, then resize him live from normal size up to Giant Braino. The chosen size is remembered on this Mac.
- Cursor Mode: enabled by default for the active Braino repository. Braino watches Git/worktree activity, announces when a commit lands or work stays quiet for 45 seconds, and opens the repository in Cursor if another app is frontmost. Say “Cursor Mode status”, “What feature am I working on?”, or “Turn off Cursor Mode”.
- Double `Control`: start live Braino voice. The primary path is the same WebRTC realtime loop as the Chrome extension: mic -> realtime transcription/VAD -> delegate action -> Braino/Fish Audio speech. You can barge in while Braino is speaking; the old reply is cancelled and the new command takes over.
- Double `Option`: toggle BrainoHERA, Braino's silent system-wide dictation skill.
- `Control+Space`: backup voice toggle.
- If macOS does not show the permission prompt, open System Settings -> Privacy & Security -> Accessibility and allow the terminal/Electron process running Braino.
- Microphone access is requested separately before realtime or fallback recording starts. If it is blocked, open System Settings -> Privacy & Security -> Microphone and allow the terminal/Electron process running Braino.
- If realtime is not configured or cannot connect, Braino records a short command, transcribes that audio through Supabase/OpenAI, then tries the native Swift helper, then falls back to a typed delegate prompt only if that also fails.

## BrainoHERA

BrainoHERA is a separate, transcription-only lane. Put the caret in an editable
field, double `Option`, and speak. Double `Option` again stops capture and
Braino inserts the complete session once at the caret, without generating or
speaking an assistant response.

- Voice aliases: "Braino, start BrainoHERA", "Braino, start Hera mode",
  "Braino, start dictation mode", "Speak your mind", "Take this down", and
  "Write what I say". The former "Yap Mode" phrase remains an alias.
- Stop with double `Option` again. Every spoken phrase stays dictation, so words
  such as "done" are inserted instead of becoming hidden commands.
- Natural pauses create ordered transcription turns internally; they do not
  trigger early pastes. The stop gesture removes the listening state
  immediately, gives the final event 1.2 seconds to settle, then uses the
  already streamed deltas if needed and performs one final insertion.
- Model: `gpt-live-transcribe` in a transcription-only Realtime WebRTC session.
  Braino keeps server turn detection off because this model rejects it, then
  uses adaptive local speech detection and explicit buffer commits after a
  natural pause. Microphone capture starts in parallel with the Accessibility
  preflight instead of waiting roughly two seconds for it. The WebRTC sender
  remains trackless and the 30-second pre-roll stays local until a non-secure
  target is approved. Buffered and live speech then use one ordered PCM data
  channel for the whole session; no later RTP frame can overtake the opening.
  If a short phrase stops before a cold session opens, Braino freezes the local
  audio and queues transcription instead of cancelling and discarding it.
  The conversation model and Fish TTS are bypassed.
- Dictation asks Chromium for a clean mono stream without its additional noise
  suppression or gain control, then uses the session's near/far-field noise
  reduction once. Expected-language hints cover English and Hindi/Hinglish;
  literal vocabulary includes Itish and Itish Pande.
- Every explicit commit is backed by tracked PCM duration and likely speech.
  Stop reuses an in-flight pause commit and skips sub-100-ms or silence-only
  buffers instead of sending a second empty turn.
- The notch glows mint while Braino is home. The full standing mascot owns the
  mint listening glow while he is out on the desktop.
- At home, BrainoHERA owns one fixed-width black Notch sheet. It springs downward
  like a Braino answer and stacks finished phrases above the current phrase;
  transcript length never stretches the Notch sideways. `Braino` stays white
  and uppercase `HERA` uses the website's moving green shimmer.
- Lossless notation formatting is prefetched from transcript deltas during
  speech. Stop never waits for that network request: an unavailable or rejected
  result falls back to the exact streamed words for that turn.
- macOS Accessibility validates the focused caret, including nested browser and
  Electron editors. Braino then sends a real paste event and, where the app
  exposes field state, verifies that the value or caret actually changed.
  Selected-text AX insertion is the second path. Secure fields are rejected.
- If there is no editable field or insertion fails, Braino does not guess. The
  Notch shows the full transcript and keeps it on the clipboard. A successful
  insertion restores the clipboard content that was there before dictation.
- The complete skill contract lives in
  [`skills/yap-mode/SKILL.md`](../../skills/yap-mode/SKILL.md).

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
- Jyoti Sir demo: “Braino, run the Jyoti Sir demo” keeps Braino visible over low-volume “Places to Be,” organizes and then restores the Desktop, opens an unsent “hi from braino” WhatsApp draft for Amdocs Jyoti Sir, creates and closes a dedicated seven-tab Chrome window, plays “She Needs Him,” then delivers the reviewed thank-you message. Each narrated action waits two seconds before firing.
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
14. Use BrainoHERA for silent system-wide dictation at the active caret.

## Mac Capability Map

- App launching: open installed Mac apps by name, first through macOS app resolution and then Spotlight app bundle lookup.
- Browser control starter: open Chrome, open URLs, and run Google searches.
- Local awareness starter: report the front app/window title through Accessibility.
- Voice-first operation: realtime WebRTC listening when configured, browser recording fallback, native macOS speech recognition fallback, Fish Audio for Braino speech when configured, macOS `say` fallback otherwise.
- System-wide dictation: double Option starts BrainoHERA's transcription-only
  session and inserts each completed turn into the focused editable field.
- Visual companion: Dock patrol, drag-anywhere placement, transparent click-through overlay.

## Dynamic Island / Notch UI

macOS does not expose an official API for third-party apps to draw inside the real Dynamic Island/notch system surface. The practical version is a Braino-owned, always-on-top top-center overlay that visually behaves like a Dynamic Island: listening pulse, task progress, quick status, and small mascot reactions.

### IOMI thinking and answers

- A request opens the same warm liquid **Braino is thinking** treatment used by the Chrome-system InstaGraphics design.
- It works whether the full mascot is home or walking on-screen. The old floating reply bubble yields so one answer is shown once.
- The first answer text morphs that surface into a compact short answer or a long reading sheet. The shared browser boundary is 240 characters; paragraph and list structure also opts into long form.
- Written words advance against Fish Audio playback while Braino speaks. macOS system voice uses a natural timing estimate.
- Long answers carry the same walking Braino lane as the browser design. **Done** folds the response immediately; otherwise it lingers and returns to the previous music/timer/recording state.
- The overlay does not include a follow-up text field, so Medium, Cursor, Mail, or the current editor keeps the caret.
- BrainoHERA never enters this lane. It remains transcription-only.

### The notch is interactive now

- **Hover near the notch** and the island springs open into a black-glass tray: now playing (artwork, live progress, prev/play/next), the next calendar event with a one-click **Join & record** button when it has a Zoom/Meet/Teams/Webex link, active timers, and battery + connected headphones.
- **Click the collapsed notch** to start or stop voice. **Scroll on it** to change system volume (tiny HUD in the pill).
- **Drag a file onto the notch** and Braino holds it on a shelf: ask him what to do with it by voice ("summarize this pdf", "email it to Renu"), or use the chip buttons (open / show in Finder / let go).
- The ticker runs **two slots** like the iPhone island: primary activity on the left, a compact secondary on the right (charger plugged, AirPods connected, held files, music while a timer runs).
- Hover works even mid-drag because the main process watches the real cursor position and flips window interactivity — the click-through overlay never sees mouse events during a native drag on its own.
- Displays without a physical notch get a floating rounded pill instead.

This first version is intentionally voice-first and delegate-only. It does not yet port the full extension agent loop, Gmail DOM adapters, or browser page extraction. The next bridge should share the signed-in browser extension auth/session with this native shell automatically.
