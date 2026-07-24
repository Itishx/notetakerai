# Mac Braino — Capability Tracker

Living status doc. Update on every capability change. Statuses: ✅ done+tested · 🟡 built, needs testing · 🔨 in progress · ⏸️ parked · ❌ blocked externally.

## Core
| Capability | Status | Notes |
|---|---|---|
| Voice (realtime WebRTC + Fish TTS, barge-in) | ✅ | Barge-in hardened 07-24 (physical audio check + transcript tripwire) |
| Dock mascot, drag, wakeup climb | ✅ | |
| Auth via browser relay | ✅ | |
| Edge glow (screen perimeter radiance) | 🟡 | Blue listen / coral speak / faint think; replaced notch glow |
| Music mode (fade home + real-tempo light show, theatrics gated on him being home) | 🟡 | Headphones on, fades out IN PLACE (no walk), THEN dance+glow start — edge glow/notch dance/marquee/notes all gated on a single "theatrics ready" flag so nothing shows before he's actually tucked in; real mascot dances the Twist via Spotify's audio-features tempo/energy/valence (verified live 96-130bpm); YouTube tab scanned across ALL tabs/windows (not just the active one) via injected JS video.paused check, so switching away from the playing tab no longer drops the music state; Spotify active-device type cross-check (2-consecutive-read debounce) filters out phone/speaker playback elsewhere on the account |
| Walker home/away transition queue | ✅ | Fixed a real race: overlapping go-home/leave-home calls used to fight over one scriptedWalk object and made him flicker in/out of the notch; now single-flight with coalesced queueing |
| Notch (home eyes, now-playing marquee, cinematic 4-beat birth: closed eyes fade in → ~1s auth → eyes open+glow+spoken hello → pop out from under notch) | 🟡 | Black island fused to measured housing; double-Space = walker goes home |
| Touch ID / password confirm ("verify it's me", "touch id") | 🟡 | LocalAuthentication via Swift helper (native/BrainoTouchID.swift), .deviceOwnerAuthentication policy = Touch ID with automatic password fallback on Macs without the sensor; only wired as a standalone test command so far, not yet gating anything sensitive |
| Notch live activities: timers, calendar peek, WA badge, privacy dot | 🔨 | "remind me in 20 min…"; EventKit probe 5-min poll; badge when listener off |
| Her mode (Samantha takeover) | 🟡 | Cmd+Shift+H or "her mode"; own Fish voice |
| Jarvis-style delegate routing + LLM fallthrough | ✅ | |

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
