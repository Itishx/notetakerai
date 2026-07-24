# Mac Braino — Capability Tracker

Living status doc. Update on every capability change. Statuses: ✅ done+tested · 🟡 built, needs testing · 🔨 in progress · ⏸️ parked · ❌ blocked externally.

## Core
| Capability | Status | Notes |
|---|---|---|
| Voice (realtime WebRTC + Fish TTS, barge-in) | ✅ | Barge-in hardened 07-24 (physical audio check + transcript tripwire) |
| Dock mascot, drag, wakeup climb | ✅ | |
| Auth via browser relay | ✅ | |
| Edge glow (screen perimeter radiance) | 🟡 | Blue listen / coral speak / faint think; replaced notch glow |
| Music mode (headphones + real-tempo light show + walker auto-homes) | 🟡 | Walker says "let me rest," retreats into notch, THEN dance+glow start; real mascot dances the Twist in notch via Spotify's own audio-features tempo/energy/valence (verified live: 96-130bpm tracks); YouTube has no tempo data so falls back to generic groove; cross-checks Spotify's active-device type so a phone/speaker elsewhere on the account doesn't falsely trigger it, falls through to the YouTube-tab check when Spotify is confirmed remote |
| Notch (home eyes, now-playing marquee, birth sequence) | 🟡 | Black island fused to measured housing; double-Space = walker goes home |
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
