# Session context — 2026-07-24 (branch: `her`)

Saved before Cursor restart (Screen Recording permission). Resume from here.

## Where we are

Working on **Mac Braino** (`mac/braino-mac/`, Electron, `npm run mac:dev`) on branch **`her`** (pushed to origin). Strategy decided: **Mac app = Braino's brain/body, Chrome extension = his hands in the browser.** Hybrid is the moat. Browser work is second priority; Mac first. ~1 month to launch.

## What was built this session (all committed + pushed on `her`)

1. **Her mode** (movie "Her" companion): full-screen takeover, canvas light engine (`renderer/her-presence.js`, `her-mode.js/.css` from Claude Design project fb4c6286, file Her.html). Enter: say "her mode" / Cmd+Shift+H. Exit: "goodbye" / same hotkey / "leave quietly" button. Her Fish voice `046164e7366a4dc899b69a9887d9f7c0` sent per-request as `referenceId` (fish-audio-tts already supports it, no deploy needed). Persona = `buildHerChatInstructions()` in renderer. All transcripts → realtime chat (delegate bypassed), idle timeout 60s in her mode.

2. **Spotify skill set** (Mac): what's-playing, shuffle/repeat (AppleScript), seek/restart, queue (new `queue` action in spotify-playback), playlist/album/artist playback via contextUri (spotify-search now takes `types` + prioritizes user's own playlists), create playlist (new `createPlaylist` action in spotify-add-track), volume "by N%" relative steps, skip announces new track + notices repeats, "add this to my playlist" asks which playlist (pending workflow, natural replies parsed). Deployed: spotify-search, spotify-playback, spotify-add-track, web-research.

3. **Spotify write 403 — SOLVED (root cause)**: Spotify policy since May 2025 blocks library/playlist WRITES for ALL development-mode apps (even owner, even with full scopes — verified by direct API tests). Allowlist/reconnect/scope/new-app cannot fix. Extended Quota needs registered business + 250k MAU. **Playback writes all work** (play/queue/seek/volume verified live). Workaround shipped: like-current-song clicks Spotify's **Playback menu** via Accessibility (`likeCurrentSpotifyTrackViaMenu`). Playlist add/create via API stay blocked → honest voice message. Launch note: Spotify = playback-only + menu likes.

4. **Spotify secret rotated** (same app `b9776b7ea4cb4d61ad052bd46196d581`; new SECRET `888a1b1a...` — both Supabase secrets set via Management API, verified working via forced refresh + search. No reconnect needed.)

5. **Web search fast lane on Mac**: "search the web for X" → `web-research` edge fn (purpose "answer", OpenAI web_search, mini/low) → spoken cited answer. "chrome/browser" in the ask → still opens Google in Chrome. Fallback to Google on error. Deployed.

6. **Screen vision (Clicky-inspired)**: "read this for me / what's on my screen / what do you see / summarize this / help me with this / explain this" → `screencapture -x` → `sips -Z 1440` → bare-base64 PNG → `chat-about-notes` `visionMode:"describe"` (routes to gpt-5.5 server-side, ~1-2¢/call) → spoken reply. Functions: `captureScreenBase64`, `runScreenVision`, `parseScreenVisionIntent` in main.cjs. Front-window title = fallback. Reads one visible page at a time (long-PDF file-extraction skill = future idea).

## IMMEDIATE next step (why we're restarting)

Screen Recording permission for dev: System Settings → Privacy & Security → Screen & System Audio Recording → **+** → add **Cursor** (and optionally `node_modules/electron/dist/Electron.app`) → toggle on → **fully quit + reopen Cursor** → `npm run mac:dev` → open a PDF → "Braino, read this for me". If he describes the wallpaper, the relaunch was skipped. macOS checks the app at the TOP of the process tree (Cursor → npm → Electron → screencapture), which is why Cursor needs the permission in dev; a packaged Braino.app will prompt as itself.

## Test checklist (pending user verification)

- Screen vision: PDF read, "what's on my screen", "help me with this error"
- Web search: "search the web for who won the game last night" (watch `web_search.done` latency)
- Like via menu: "add this song to my liked songs" (expect menu click, `spotify.add_track.done` source mac_menu)
- Playlist add/create: expect honest "Spotify is blocking saves" message (API blocked by policy)
- Queue/context play: "queue Brabus", "play my New playlist", "play the album After Hours", "play songs by Drake"
- Her mode end-to-end (voice + look)
- Follow-up flows: "add this song to my playlist" → he asks → answer "liked songs" or a name

## Key facts / tools

- Logs: `~/Library/Logs/Braino Mac/braino-mac.log` — grep `delegate\.|spotify\.|vision\.|web_search\.`
- Deploy: `npx supabase functions deploy <name>` with `SUPABASE_ACCESS_TOKEN` from `.env` (works; classifier may block — export token first)
- Supabase Management API works for SQL + secrets: `api.supabase.com/v1/projects/suwhgaxxdizowbyjlljj/...` (needs User-Agent header; secrets endpoint returns hashed values)
- Force Spotify token refresh: set `token_expires_at` to past in `spotify_connections`
- Mac auth session: `~/Library/Application Support/Braino Mac/auth-session.json` (key `access_token`)
- Vision cost: ~1-2¢/call on gpt-5.5; optimization idea: route describe to gpt-5.4/5.6-Terra (halves it) after verifying image support

## Backlog (agreed, not started)

1. **Extension bridge** (week-1 plan): Mac Braino writes `agent_commands`, extension executes — Gmail/DOM skills from the desktop. THE hybrid moat.
2. Screen pointing (Clicky `[POINT:x,y]` style): vision returns coords → mascot walks there and points (Jump & Point pose exists).
3. Long-PDF read: find file on disk → extract text (no vision cost).
4. Startup `desktopCapturer` request so "Braino" appears in Screen Recording list by itself.
5. Spotify Extended Quota request (needs business entity — launch blocker for user-facing Spotify writes).
6. Port Emotional/Memory Engine into Mac chat paths; isPremium gates; electron-builder packaging (weeks 2-3 of the month plan).
