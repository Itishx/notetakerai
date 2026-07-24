# Mac Braino — Capability Tracker

Living status doc. Update on every capability change. Statuses: ✅ done+tested · 🟡 built, needs testing · 🔨 in progress · ⏸️ parked · ❌ blocked externally.

## Core
| Capability | Status | Notes |
|---|---|---|
| Voice (realtime WebRTC + Fish TTS, barge-in) | ✅ | Barge-in hardened 07-24 (physical audio check + transcript tripwire) |
| Dock mascot, drag, wakeup climb | ✅ | |
| Auth via browser relay | ✅ | |
| Edge glow (screen perimeter radiance) | 🟡 | Blue listen / coral speak / faint think; replaced notch glow |
| Music mode (fade home + real-tempo light show, theatrics gated on him being home) | 🟡 | Headphones on, fades out IN PLACE (no walk), THEN dance+glow start — edge glow/notch dance/marquee/notes all gated on a single "theatrics ready" flag so nothing shows before he's actually tucked in; real mascot dances the Twist via Spotify's audio-features tempo/energy/valence (verified live 96-130bpm); YouTube tab scanned across ALL tabs/windows (not just the active one) via injected JS video.paused check, so switching away from the playing tab no longer drops the music state; Spotify active-device type cross-check (2-consecutive-read debounce) filters out phone/speaker playback elsewhere on the account; a monotonic session id stops a stale start/stop race from unwinding the whole sequence mid-flight |
| Walker home/away transition queue | ✅ | Fixed a real race: overlapping go-home/leave-home calls used to fight over one scriptedWalk object and made him flicker in/out of the notch; now single-flight with coalesced queueing |
| Notch (home eyes, now-playing marquee, cinematic 4-beat birth: closed eyes fade in → ~1s auth → eyes open+glow+spoken greeting → STAYS HOME) | 🟡 | Black island fused to measured housing; no more automatic pop-out after boot — he greets ("hey, how are you? say come out whenever you want me out here") and waits |
| Silent boot, Double-Control-only voice | 🟡 | REVERTED the ready-on-boot experiment same night — the awaited greeting + auto-start blocked the rest of startup (hotkey arming included) and broke realtime. Final design per user: boot is silent (eyes opening after auth IS the greeting, no spoken line, no auto session); Double-Control is the one and only way in and out of realtime. 15s idle hangup unchanged |
| Notch wing captions (island expands SIDEWAYS, eyes centred, heard-only left wing) | 🟡 | v4 (v3 animation user-approved "10/10"): `.captioning` → pill width 560px, height untouched; left wing = tiny dim mono transcript of what we HEARD only. Reply captions REMOVED per user — his replies are voice + notch theatrics, never text; `setBubble()` suppresses all bubble text while he's home (floating bubble only when he's out). Heard caption auto-clears 3.6–9s. Wing width derived from measured housing width. `node --check` clean, not live-tested |
| Notch voice theatrics (final: edge glow = listening, small talking mouth = speaking) | 🟡 | `listen`/`speak` classes reach the notch again via `updateNotchFace()` (a previous "walker owns voice theatrics" decision had cut them off). Then simplified per user: SONAR RINGS RETIRED (redundant with the edge glow that already signals listening) and EQUALIZER BARS OFF during speak (read as a double animation on top of the mouth) — speaking is the small nfTalk mouth alone. When he's out, the walker keeps the theatrics and the notch stays quiet |
| Deterministic summon ("come out", "come here", "show yourself", "join me") | 🟡 | The ONLY way the walker leaves the notch on request — voice-only, deliberately not bound to any hotkey so it can never collide with double-Control (which starts a conversation, which now happens entirely inside the notch by default) |
| Wake word — "always listening" ("hey braino"/"braino"/"raino", on-device only) | 🟡 | Opt-in ("turn on wake word" / "turn off wake word", persisted like the WhatsApp listener toggle). New native/BrainoWakeWord.swift: continuous SFSpeechRecognizer with requiresOnDeviceRecognition=true (genuine on-device guarantee — refuses cloud fallback, surfaces "unavailable" instead of silently downgrading privacy), cycles the recognition task every 45s to stay under Apple's task-duration ceiling, reuses the same fuzzy wake-list as voiceAddressesBraino (braino/bruno/breno/reno/dino) plus "raino". On wake: same startListening() path as manual double-Control. Notch eyes now show a sleepy half-lidded shade by default when home+idle ("dozing"), snap open ("awake") the instant a real session engages; privacy dot has a third state — dim gray/steady = armed on-device, bright coral pulsing = live cloud session. Compiled clean (swiftc -typecheck), NOT yet live-tested against a real mic (no live app launches per this session's new rule — needs the user's own test) |
| Touch ID / password confirm ("verify it's me", "touch id") | 🟡 | LocalAuthentication via Swift helper (native/BrainoTouchID.swift), .deviceOwnerAuthentication policy = Touch ID with automatic password fallback on Macs without the sensor; only wired as a standalone test command so far, not yet gating anything sensitive |
| Notch live activities: timers, calendar peek, WA badge, privacy dot | 🔨 | "remind me in 20 min…"; EventKit probe 5-min poll; badge when listener off |
| Her mode (Samantha takeover) | 🟡 | Cmd+Shift+H or "her mode"; own Fish voice |
| Jarvis-style delegate routing + LLM fallthrough | ✅ | |
| Ambient awareness (now-playing + all open Chrome tabs in casual chat) | 🟡 | Free-text context only (titles/URLs, 8s poll across ALL windows/tabs), no vision cost; fixes "music's on but he doesn't know" for free-form chat (dedicated "what's playing" intent already worked). Actual screen PIXELS deliberately stay on-demand only (cost per look) — this is text-only |

## Spotify — DONE end-to-end
| Capability | Status | Notes |
|---|---|---|
| Play song / pause / next / prev / volume (incl. "by N%") | ✅ | |
| Queue, seek/restart, shuffle/repeat, what's playing | ✅ | |
| Playlist / album / artist playback (own playlists prioritized) | ✅ | |
| Like current song (menu-bar click) | 🟡 | Bypasses API write block |
| Playlist add / create via API | ❌ | Spotify blocks writes for dev-mode apps (May 2025 policy); Extended Quota = business + 250k MAU |
| Skip awareness (announces new track, notices repeats) | 🟡 | |

## Vision
| Capability | Status | Notes |
|---|---|---|
| Screen vision ("read this / what's on my screen") | ✅ | screencapture → chat-about-notes describe; ~4s |
| Screen pointing ("show me where X is") | ✅ | vision-point fn ~4s; mascot walks + ring |
| Smart point routing (file → search, offscreen → web) | 🟡 | |

## WhatsApp — v2 shipped 07-24
| Capability | Status | Notes |
|---|---|---|
| Send message by name ("message mom saying…") | 🟡 | URL scheme + Enter; mom→Ilu seeded |
| All-contacts knowledge (Apple Contacts bulk import) | 🟡 | Daily refresh; fuzzy match |
| Teach contacts by voice ("remember my X is Y / number is N") | 🟡 | |
| Incoming message readout (notification DB listener) | 🟡 | Opt-in "read my WhatsApps"; needs Full Disk Access + WhatsApp notifications ON with previews |
| "Reply saying…" to last sender | 🟡 | 15-min window |
| WhatsApp voice/video call (menu click) | 🟡 | Chat > Voice/Video Call probed live |
| FaceTime / FaceTime audio | 🟡 | facetime:// schemes |
| Phone call via iPhone relay | 🟡 | tel:// continuity; needs iPhone nearby |

## YouTube
| Capability | Status | Notes |
|---|---|---|
| Play video/song by name (+creator) | 🟡 | Search scrape (verified live) → open watch URL |
| Channel recent videos + pick by voice | 🟡 | Opens channel, speaks recent uploads, asks which |
| Search/tutorials with spoken top picks | 🟡 | Top 3 spoken + results tab opened |
| Ordinal follow-up ("play the second one") | 🟡 | 5-min memory of last list |

## Files / Apps / Web
| Capability | Status | Notes |
|---|---|---|
| Desktop organize/undo, create/rename/move/delete | ✅ | Undo journal |
| Spotlight find/open, app open/quit, tab close | ✅ | |
| Web search (spoken answers via web-research fast lane) | 🟡 | |
| Apple Notes / Mail + Contacts | ⏸️ | Built, untested — parked |
| Front-window awareness | ✅ | |

## Parked / Next
- Extension bridge (Mac → agent_commands → Chrome extension executes) — THE hybrid moat, next major
- Long-PDF read from disk (no vision cost)
- Emotional/Memory Engine port, isPremium gates, electron-builder packaging
- Spotify Extended Quota request (launch blocker for user-facing writes)
