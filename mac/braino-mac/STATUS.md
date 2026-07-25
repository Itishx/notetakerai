# Mac Braino — Capability Tracker

Living status doc. Update on every capability change. Statuses: ✅ done+tested · 🟡 built, needs testing · 🔨 in progress · ⏸️ parked · ❌ blocked externally.

## Core
| Capability | Status | Notes |
|---|---|---|
| Voice (realtime WebRTC + Fish TTS, barge-in) | ✅ | Barge-in hardened 07-24 (physical audio check + transcript tripwire) |
| Dock mascot, drag, wakeup climb | ✅ | |
| Auth via browser relay | ✅ | |
| Edge glow (screen perimeter radiance) | 🟡 | Blue listen / coral speak / faint think; replaced notch glow |
| Music mode (fade home + real-tempo light show, theatrics gated on him being home; SONGS ONLY — YouTube videos are classified via YouTube's own category data before celebrating) | 🟡 | Headphones on, fades out IN PLACE (no walk), THEN dance+glow start — edge glow/notch dance/marquee/notes all gated on a single "theatrics ready" flag so nothing shows before he's actually tucked in; real mascot dances the Twist via Spotify's audio-features tempo/energy/valence (verified live 96-130bpm); YouTube tab scanned across ALL tabs/windows (not just the active one) via injected JS video.paused check, so switching away from the playing tab no longer drops the music state; Spotify active-device type cross-check (2-consecutive-read debounce) filters out phone/speaker playback elsewhere on the account; a monotonic session id stops a stale start/stop race from unwinding the whole sequence mid-flight |
| Walker home/away transition queue | ✅ | Fixed a real race: overlapping go-home/leave-home calls used to fight over one scriptedWalk object and made him flicker in/out of the notch; now single-flight with coalesced queueing |
| Notch (home eyes, now-playing marquee, cinematic boot REBUILT 07-25 as the trybraino.com reveal VERBATIM: closed eyes form → slow shimmer line outlines the island while auth runs → coral wave L→R → green verdict, eyes open with the glow, no status text → island spreads caption-wide + right-eye WINK + wing types "how you doing?" → stays home) | 🟡 | Black island fused to measured housing; boot is silent (no spoken greeting, no auto session) and he never pops out on his own |
| Silent boot, Double-Control-only voice | 🟡 | REVERTED the ready-on-boot experiment same night — the awaited greeting + auto-start blocked the rest of startup (hotkey arming included) and broke realtime. Final design per user: boot is silent (eyes opening after auth IS the greeting, no spoken line, no auto session); Double-Control is the one and only way in and out of realtime. 15s idle hangup unchanged |
| Notch wing captions (island expands SIDEWAYS, eyes centred, heard-only left wing) | 🟡 | v4 (v3 animation user-approved "10/10"): `.captioning` → pill width 560px, height untouched; left wing = tiny dim mono transcript of what we HEARD only. Reply captions REMOVED per user — his replies are voice + notch theatrics, never text; `setBubble()` suppresses all bubble text while he's home (floating bubble only when he's out). Heard caption auto-clears 3.6–9s. Wing width derived from measured housing width. **Conversation owns the notch**: while a session is engaged AND a caption is live, the music dancer/marquee and all activity tickers yield entirely (they were colliding with caption text when Spotify had the notch); they return the moment the caption clears |
| Notch voice theatrics (final: edge glow = listening, small talking mouth = speaking) | 🟡 | `listen`/`speak` classes reach the notch again via `updateNotchFace()` (a previous "walker owns voice theatrics" decision had cut them off). Then simplified per user: SONAR RINGS RETIRED (redundant with the edge glow that already signals listening) and EQUALIZER BARS OFF during speak (read as a double animation on top of the mouth) — speaking is the small nfTalk mouth alone. When he's out, the walker keeps the theatrics and the notch stays quiet |
| Deterministic summon: voice ("come out"...) OR ⌘×2 toggle | 🟡 | Voice phrases summon him out; NEW: double-tap Command toggles out ↔ home. Swift tap counts only BARE ⌘ taps — any key or extra modifier while ⌘ is held (Cmd+C, Cmd+Shift+S...) poisons the tap, so real shortcuts can never trigger it. Route: BrainoControlTap "double-command" → main "braino-mac:summon-toggle" → renderer handleSummonToggle() (speaks "coming out, watch out" on the way out, silent on the way home) |
| Wake word — "always listening" ("hey braino"/"braino"/"raino", on-device only) | 🟡 | Opt-in ("turn on wake word" / "turn off wake word", persisted like the WhatsApp listener toggle). New native/BrainoWakeWord.swift: continuous SFSpeechRecognizer with requiresOnDeviceRecognition=true (genuine on-device guarantee — refuses cloud fallback, surfaces "unavailable" instead of silently downgrading privacy), cycles the recognition task every 45s to stay under Apple's task-duration ceiling, reuses the same fuzzy wake-list as voiceAddressesBraino (braino/bruno/breno/reno/dino) plus "raino". On wake: same startListening() path as manual double-Control. Notch eyes now show a sleepy half-lidded shade by default when home+idle ("dozing"), snap open ("awake") the instant a real session engages; privacy dot has a third state — dim gray/steady = armed on-device, bright coral pulsing = live cloud session. Compiled clean (swiftc -typecheck), NOT yet live-tested against a real mic (no live app launches per this session's new rule — needs the user's own test) |
| Touch ID / password confirm ("verify it's me", "touch id") | 🟡 | LocalAuthentication via Swift helper (native/BrainoTouchID.swift), .deviceOwnerAuthentication policy = Touch ID with automatic password fallback. NOW GATES EVERY DELETE: single-file voice deletes (executeConfirmedDelete) and redundant-folder bulk deletes both require granted===true — denied OR unavailable = nothing deleted |
| Notch live activities: timers, calendar peek, WA badge, privacy dot | 🔨 | "remind me in 20 min…"; EventKit probe 5-min poll; badge when listener off |
| Notch tray — hover-to-expand island (INTERACTIVE notch) | 🟡 | 07-25: the notch is touchable now. MAIN process polls the real cursor (130ms) because the click-through window gets no mouseMoved during drags; inside the top-centre zone → `braino-mac:notch-zone` → renderer flips passthrough + springs the island open (620px black-glass tray, eyes stay up top). Tray: now-playing card (artwork via Spotify AppleScript `artwork url`, live progress bar, prev/play/next), calendar card with **Join & record** (EventKit now also emits url/location/notes → zoom/meet/teams/webex regex; Join opens the link then auto-arms the meeting recorder 6s later), active timers with clear, battery + headphones line (quick-action row REMOVED per user 07-25). Click collapsed notch = toggleVoice; scroll on it = system output volume with HUD. `.expanded` CSS lives at file END on purpose so it beats .listen/.captioning/.busy/.music at equal specificity |
| Music island album cover | ❌ | Tried 07-25 (stage-left tile, then mini-player layout with stacked meta) — user rejected both orientations, REVERTED same day. Collapsed music island stays dancer + centered marquee; artwork lives only in the hover tray |
| Two-slot ticker (iPhone-island style) | 🟡 | updateNotchFace refactored winner-takes-all → `slots[]`: primary left (#nf-status), compact secondary right (#nf-status-2, `.dual` widens pill). Priority: REC > transient (charger/AirPods) > timer > calendar > WA > X > held files > music. Music keeps full theatric look (dancer+marquee) ONLY when alone |
| File shelf — drag a file onto the notch, Braino holds it | 🟡 | dragover/drop gated to the notch zone (main's cursor poller keeps the window interactive mid-drag); island opens its mouth (`.dropping`), chips (max 4) with ask / open / show / ✕. "ask" arms the chip + starts voice; `nfShelfWrapPrompt()` injects `About the file at <path>:` into the ONE delegate choke-point when armed or when the words say "this file/that pdf/…". Backend: `braino-mac:shelf-file` (open / open -R / Finder trash) |
| System events in the island (power + Bluetooth audio) | 🟡 | pmset poll 30s → plugged/unplugged/low(20)/critical(10) transients ride the secondary slot + nf-flash; critical also SPEAKS once per discharge ("Battery is at N percent. Plug me in soon?") only when fully idle. system_profiler SPBluetoothDataType 60s → connected headphones w/ battery, connect transient. Tray sys-line shows both |
| Universal now-playing feed | 🟡 | `pollNowPlaying` 6s → `braino-mac:nowplaying` every beat (renderer owns change detection): Spotify (artwork+position+duration via extended AppleScript), Apple Music (new readAppleMusicState, no artwork), YouTube fallback from the existing music watcher (no controls). Media control IPC routes Music→AppleScript, Spotify→controlSpotifyPlaybackOnMac; toggle resolves play/pause from live state. Existing `music-state` theatrics channel UNTOUCHED |
| No-notch fallback | 🟡 | `applyDisplayMetrics` toggles `.no-notch` when the display has no housing → pill gets full rounded corners instead of hugging a phantom notch |
| Her mode (Samantha takeover) | 🟡 | Cmd+Shift+H or "her mode"; own Fish voice |
| Notch keynote shimmer (idle flourish) | 🟡 | 2026-07-25: every 90s while home+idle, white→blue light traces the island outline (same path/gradient/dash-draw as the trybraino.com reveal, .nf-shining class, 1.6s draw + fade); suppressed by mic-live/music/live/captioning/busy/nf-auth/expanded and any in-flight speech — resting flourish only. NOT live-tested |
| Cowork mode ("start cowork mode", "check on me every 30 seconds") | 🟡 | v1 2026-07-25: opt-in screen glance on interval (default 90s, clamp 15s–10min, persisted braino-store/cowork.json); vision prompt must return SKIP unless it has ONE ≤20-word offer acceptable by "yes"; recent-offer dedupe (last 5); on offer he speaks + auto-opens realtime so "yes" hits normal delegate routing; ambient glance fully yields while cowork is on; steady AMBER privacy dot = cowork armed (vs coral pulse = live mic, gray = wake word); "stop cowork"/"stop watching my work" disarms (intent runs BEFORE ambient mute so it isn't eaten). NOT live-tested (no live app launches this session — needs the user's own run) |
| Cowork Ability #1 — Claude Design handoff ("start cowork" / "let's work together" for the simple watch loop; "ask Claude Design to make this better" / vague "help me design something better" routed via classifyIntentLLM's new design_cowork tool) | 🟡 | 2026-07-25: deterministic step machine in cowork-design.cjs, every transition VISION-GATED (screenshot Braino actually reads), no hardcoded coords. Flow: SEE (confirm on a website) → CAPTURE (Cmd+Up, Page-Down loop, save page-NN.png to ~/Desktop/Braino Cowork/<stamp>/) → OPEN Claude Design + verify landed → read chat/file counts → UPLOAD (REAL now: vision-click the + button → native Open panel driven by Cmd+Shift+G → folder path → Cmd+A → Enter, attaches the whole run folder at once; verified by vision) → PROMPT (Braino writes the brief from screenshot 1, types, Return) → TRACK (poll for reply, narrate). Notch shows live label via braino-mac:cowork-label. NOT fully verified; Claude Design URL is a PLACEHOLDER (claude.ai/new) — set BRAINO_CLAUDE_DESIGN_URL to the real one. Thinking island: sticky cowork label shows breathing glow + 3-dot shimmer, tap the island to expand caption-wide (nf-think-open+captioning, eyes centred) || Jarvis-style delegate routing + LLM fallthrough | ✅ | Rule zero added 07-25 and USER-CONFIRMED WORKING: consequence/hypothetical questions ("if I delete X, will I also lose Y?") route to conversation before any action intent can hijack them — this also un-broke the "can't interrupt him" complaint (barge-in was fine; misrouted questions kept spawning fresh wrong answers) |
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
| Incoming message readout (notification DB listener) | 🟡 | Now DEFAULT ON (07-25 — the opt-in was never discovered; "turn off whatsapp reader" persists off). Needs Full Disk Access + WhatsApp notifications allowed with previews ALWAYS + no Focus mode; WhatsApp mutes its own banners while it is the front app, so messages read while you're inside WhatsApp never reach the DB. New self-diagnosis: "why aren't you reading my whatsapps" → speaks reader state + DB health + freshest-row check |
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

## Wallpaper
| Capability | Status | Notes |
|---|---|---|
| Change wallpaper ("random wallpaper", "make spider man my wallpaper", "put it back") | 🟡 | Random = a real built-in from /System/Library/Desktop Pictures (verified set works live). Named subject = fetch from source.unsplash.com (free, no key, no Higgs cost) → save → set. Previous wallpaper snapshotted for restore (guards macOS "missing value" quirk). May need one-time Automation permission for System Events. Question guard: "what wallpaper is this" doesn't change it |

## Boot flow (07-25 rewrite — "look and greet")
| Capability | Status | Notes |
|---|---|---|
| Look-and-greet boot | 🟡 | Notch appears → auth (green/red) → eyes open + wake chime → he SCANS the screen ("taking a look..."), realtime auto-connects, and he greets WITH an observation ("Hey Itish. Let me take a quick look. [what he sees]") → you can answer immediately → after ~9s he says "press Control twice anytime, I'll stop listening for now", hangs up the mic but STAYS AWAKE (eyes open, ambient running). Runs as `void runBootGreetingFlow()` so it never blocks the startup critical path (the lesson from the last time this broke) |

## Screen recording (07-25)
| Capability | Status | Notes |
|---|---|---|
| Screen video recording ("record this", "record my screen") | 🟡 | screencapture -v -x (open-ended) → SIGINT saves the .mov to Desktop, reveals in Finder, speaks duration+size. Verified live: valid QuickTime out. Notch shows "● SCREEN m:ss" while recording. DISAMBIGUATED from meeting: "record this/my screen" = video; "record this call/meeting" = meeting recorder. FUTURE: island Done-button + save-as-mp4/gif picker (voice stop works now) |

## Maps · Shopping · Research · Phone (07-25)
| Capability | Status | Notes |
|---|---|---|
| Google Maps directions/distance ("distance from X to Y", "navigate to X") | 🟡 | Deterministic maps URLs (api=1); origin omitted = current location, "here"/"my location" stripped to that. Best-effort distance/duration scraped after load (needs JS-from-Apple-Events; without it, still opens directions). Verified parse across 7 phrasings |
| Google Maps show place ("show me where X is on the map") | 🟡 | maps/search URL centers on it. Requires "maps" in the phrase so it doesn't grab generic "show me" |
| Send to phone ("send this to my phone") | 🟡 | Texts the current tab URL to the user's own number via Messages/iMessage; number stored on first use (asks once). Needs Messages signed into iMessage |
| Multi-tab research/compare ("research X", "compare X vs Y") | 🟡 | Fires 3 dedicated source tabs (Google review/specs + YouTube), reads each via injected JS, LLM-compares to one spoken recommendation. Needs JS-from-Apple-Events. Theatrics: real tabs open |
| Amazon search ("show me options for X") | 🟡 | Opens amazon.in search; nth-listing click + add-to-cart lean on the universal clicker ("click the second one"). FUTURE: a guided shopping walk-through mode + the "fire research vs shop with you" fork |
| Test harness: mac/braino-mac/test-skills.sh | ✅ | Live-tails the log into clean per-command cards (heard → said → OK/MISS + efficiency% + route). `test-skills.sh` (live) / `replay` (today) / `raw`. Every skill self-audits — no narration needed |

## Gmail
| Capability | Status | Notes |
|---|---|---|
| Reply to open thread ("reply to this email", "reply saying ...") | 🟡 | Ported the extension's __sbGmail locators into injected JS on the active Chrome tab: read thread (subject/sender/latest body) → generate reply via chat-about-notes → click Reply → fill contenteditable body → click Send. ~2-3s target (generate is the slow ~1.5s part; read/fill/send are instant injections). NEEDS "Allow JavaScript from Apple Events" (still off). Routes before the WhatsApp reply intent; excluded when "whatsapp" is said. FUTURE: vision fallback to pick the email when NOT already on the thread |

## Netflix
| Capability | Status | Notes |
|---|---|---|
| Resume/watch by title ("resume watching Little Brother on Netflix") | 🟡 | Mac-way v1: opens netflix.com/search?q=title, then best-effort JS click on the first `/watch/` card — Netflix watch URLs auto-resume from your last position, so one click IS the whole resume flow. Needs Chrome "Allow JavaScript from Apple Events"; without it the search page opens and he asks for one manual click. Intent guard added: video-context words (netflix/watching/episode/show...) now block the bare "resume"/"pause" Spotify control unless spotify/music is named — "resume watching X" no longer restarts Spotify |

## MESA (school accountability)
| Capability | Status | Notes |
|---|---|---|
| Mesa check-in ("mesa update / how's my coursework") | 🟡 | Knows Itish is in Mesa School of Business PGP in Venture Building. Opens students.mesaschool.co in the RIGHT Chrome profile (resolved via Local State info_cache — matches "mesaschool" → Profile 3 first, falls back to "Itish"; per-profile Preferences all say "Your Chrome" and are useless). Waits 7s, scrapes page text via injected JS, summarizes through chat-about-notes with the PREVIOUS check-in as comparison baseline, speaks progress + calls out overdue work. State persisted in mesa.json; last summary is injected into every casual chat's context so he can hold Itish accountable unprompted |

## Awareness / Hygiene
| Capability | Status | Notes |
|---|---|---|
| File retention advisor v3 ("what's worth deleting", "create a folder for the useless stuff", "delete this folder") | 🟡 | v3 (07-25, from live-log forensics): deletes work off DISK not the manifest (stale manifest made "delete the redundant folder" refuse while the folder sat on the Desktop); "delete them all" trashes the whole folder in one Finder call (item-by-item left an empty shell via .DS_Store); "delete this folder" resolves the OPEN Finder window (context, protected-path guard, Touch ID); "create a folder for the files I don't need" is a one-shot deterministic scan+create (and no longer makes an empty generic folder); recovery fuzz floor lowered 0.3 with 3-char prefix matching ("ex pipeline braino movie" → offers X_Pipleine_Braino.mov); generic count asks "full breakdown or straight to the point?" then offers the redundant folder. Older notes: |
| (v2 history) ask-first, oldest-first, persistent memory | 🟡 | Scans Desktop+Downloads+Documents (files AND stale folders). Ranks OLDEST FIRST by Spotlight kMDItemLastUsedDate/kMDItemUseCount (real "when did I last open this"), speaks the 3 oldest by name, then ASKS "want me to create a redundant folder?" (pendingMacWorkflow confirm — bare "yes" routes correctly). On yes: creates Desktop/"Redundant Files", moves everything, opens it, and persists a manifest (redundant-folder.json, survives restarts) so he knows every item by name. "recover the braino extension folder" → fuzzy-matched single-item restore to its ORIGINAL location (verified against realistic phrases); "what's in the redundant folder" → speaks contents; "delete them all" → Trash; "put them back" → full restore. Manifest is injected into chat context so he knows the folder's contents unprompted |
| Task-manager awareness ("what's eating my ram") | 🟡 | ps -Aceo aggregated by app (Helper processes folded in — verified live: Cursor 2.3GB, Chrome 2.1GB). Speaks top 6 by memory; "close them" quits the closable ones (protected: Finder/WindowServer/Braino/Cursor/Terminal + current front app) |
| Counting ("how many files/folders do I have", "how many X folders") | ✅ | Generic count walks Desktop+Downloads+Documents+iCloud Drive (verified live: 5779 files/889 folders); named count = mdfind + raw find fallback. "files AND folders" combined ask handled |
| Vague-context resolution v1 ("how many files in THIS folder") | ✅ | The intelligence-layer principle: vague reference → look at what the user has open. Resolves the frontmost Finder window via AppleScript (free, no vision call), counts direct children, supports term filter ("how many braino files in here"). Non-Finder front app → says so instead of guessing. NEXT BRICK: same principle for other vague asks (screen vision as fallback for non-Finder surfaces) |

## Accessibility hands (native/BrainoAX.swift — Tier 1 shipped 07-25)
| Capability | Status | Notes |
|---|---|---|
| Universal clicker v2: AX first, VISION + real mouse click fallback | 🟡 | v1 was blind in Electron/Chrome (lazy AX trees) — now the helper flips AXManualAccessibility/AXEnhancedUserInterface to wake them. When AX still misses (web content, canvas), he finds the target with vision-point, points at it, and lands a REAL CGEvent mouse click at the located coordinates. "click it/that" clicks whatever he last pointed at (2-min memory). Media words stay with Spotify |
| Voice window manager ("put chrome on the left", "maximize this", "snap cursor to the right") | 🟡 | Fixed: "move cursor to the left" was hijacked by the move-FILE intent upstream (guard added); maximize half-applying fixed with the size→position→size double-set (apps clamp the first size while off-screen). Dictation guard: app names capped at 2 words |
| Selected-text superpowers ("fix/rewrite/translate/summarize/read ... selected/highlighted/this sentence") | 🟡 | AXSelectedText first; when blind (web content — the exact case that failed in Claude), falls back to Cmd+C clipboard capture, and write-back falls back to Cmd+V paste over the still-live selection. "read the selected text" speaks it verbatim. Vision-describe prompt now COMMITS to opinions when asked ("which design do you like") instead of deflecting |

## X (@brainosays) — shipped 07-25, thin voice layer over existing edge stack
| Capability | Status | Notes |
|---|---|---|
| Stats by voice ("how's the X account doing", "how many followers") | 🟡 | One x-status call: followers + 7-day delta, last-tweet likes/replies, mention count |
| Mentions readout ("any mentions") | 🟡 | Speaks top 3 recent mentions (handle + text, links stripped) from the same x-status payload |
| Ambient notch pulse | 🟡 | Polls x-status 2min after boot then every 45min; "@brainosays · N (+Δ this week)" rides the notch ticker for 90s after each poll, priority below WhatsApp badge |
| Clip-and-tweet ("record a clip of 20 seconds" → "tweet it saying ...") | 🟡 | screencapture -v -V records main display (5-60s, default 15) to app-support/clips; caption read back + confirmed ("ship it?") → upload to x-post-media storage bucket → insert scheduled_x_posts (now) → dispatch-scheduled-x-posts fires it. KNOWN RISK: dispatch uses X's simple media upload (built for images) — larger/longer videos may be rejected by X; failure is reported honestly and the post stays queued on the dashboard |

## Ambient companion (07-25 — "truly alive")
| Capability | Status | Notes |
|---|---|---|
| 30-min awake window | 🟡 | Ending a session (Ctrl×2 off) no longer closes his eyes — he stays awake (eyes open) for 30 min after the last engagement (boot, session start/end, or his own ambient line each reset the clock); dozes only after that stretch of silence |
| Ambient glances + unprompted offers | 🟡 | While awake-idle: every 30s (demo pacing — constant AMBIENT_CHECK_INTERVAL_MS, raise to ~2min for real life), the notch captions "seeing what you're up to...", eyes dart around (.scanning anim), screenshot → vision → ONE short warm suggestion/offer (≤22 words) spoken aloud EVEN with realtime off |
| Auto realtime invocation | 🟡 | Because HE started the conversation, realtime connects right after his ambient line — the user just answers. Guards: skips during her mode, music theatrics, any active session/speech/processing |
| "Don't disturb me" valve | 🟡 | "braino don't disturb/bother me" mutes ambient (session-scoped); "you can disturb me" / "start checking on me" re-enables. COST NOTE: each glance is one vision call — 30s pacing is demo-only |

## Voice personas (ported to Mac 07-25)
| Capability | Status | Notes |
|---|---|---|
| "talk like Donald Trump" / "gen z mode" / "be yourself" | 🟡 | Bug: the phrase routed to casual chat (not action-like) — no persona engine existed on Mac at all. Ported the extension's v10.1.0 engine: registry (trump + genz, FULL system prompts extracted verbatim), same detection patterns (voice-of/impression/imitate/talk-like/pretend + trailing "like X"), sticky until reset. Voice = referenceId injection in BOTH TTS paths (streaming payload + fallback tts()); style = buildRealtimeChatInstructions returns the persona prompt wholesale (replaces personality, + no-em-dash spoken rules). Inline tasks work ("explain this like Trump" flips silently, task continues in character). Detection runs in the transcript dispatch BEFORE the chat/delegate fork. Her mode outranks persona voice. No comb-over costume on Mac yet (shared walker SVG lacks the group) |

## Voice ducking (07-25 bugfix)
| Capability | Status | Notes |
|---|---|---|
| Music ducks during voice sessions | 🟡 | User report: realtime near-unusable while music played — the song leaks into the mic, VAD fires on Spotify, turns drown. No code gate existed; acoustic problem. Fix: startListening() ducks the PLAYER (Spotify or Apple Music via AppleScript sound volume) to ~20% (floor 8), stopRealtimeVoice() restores the exact prior volume; his TTS rides system volume so it is untouched. `braino-mac:music-duck` handler owns duck state (single-flight, restores on failure). Log: `music.duck` / `music.unduck` |

## Voice latency
| Capability | Status | Notes |
|---|---|---|
| LIVE captions during VOICE — REMOVED 07-25 | ❌ | Fed back on his own speaker audio and churned; user pulled it. Notch "heard" text now comes purely from OpenAI's authoritative transcript (the pre-caption behavior that always worked). BrainoLiveCaption.app SURVIVES but ONLY as the meeting recorder's transcript feed |
| Wake chime | 🟡 | Soft two-note rising sine chime (E5→B5, Web Audio synthesized — no asset, CSP-safe) the instant his eyes open on successful auth |
| Per-turn latency summary (voice.latency.turn_summary) | ✅ | Chrome-style single line at first audible reply: captionFirstMs / sttMs / routeMs / thinkMs / ttsMs / totalFromStopMs — every pipeline segment side by side for optimization |

## Observability
| Capability | Status | Notes |
|---|---|---|
| Feature audit log with efficiency score | ✅ | Every delegate run logs one `feature.executed` line: heard (verbatim transcript), responded (spoken reply), ok, durationMs, efficiencyPct (100 ≤2s clean / 92 ≤5s / 82 ≤10s / 70 ≤20s / 60 slow / 25 failed), pending workflow stage. `grep feature.executed` in braino-mac.log = the whole session story |

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
