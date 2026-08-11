# Braino Mac — Full Testing Checklist

Every command Braino Mac understands, grouped by area. Say the phrase, watch the behavior, check the box.

**How to log every test** (run this in a second terminal BEFORE you start):

```bash
./mac/braino-mac/test-skills.sh          # live: one clean card per command (heard → said → OK/MISS + ms + efficiency%)
./mac/braino-mac/test-skills.sh replay   # replay everything you tested today
./mac/braino-mac/test-skills.sh raw      # raw feature.executed lines
```

Raw log lives at `~/Library/Logs/Braino Mac/braino-mac.log`. `grep feature.executed` = the whole session story. Voice latency per turn: `grep voice.latency.turn_summary`. Tray/notch interactions: `grep "tray\."`.

Statuses in STATUS.md are the source of truth for what SHOULD work. ⏸️ items are parked (built, untested).

---

## 1. Boot & presence
- [ ] Launch `npm run mac:dev` with a saved session → subdued gold/coral/blue perimeter traces once and keeps breathing
- [ ] IOMI appears exactly centred as four distinct beats: `I` → `O` → `M` → `I`
- [ ] IOMI resolves inward into the two open operating-layer eyes; no blue auth pulse, coral wave, green verdict, or “verified” beat appears
- [ ] Island expands → `Good`, `evening`, and the first name fade in separately on the left
- [ ] Vertical divider and right-side wake guide show double `Control` for voice and double `Command` to bring Braino out
- [ ] Braino speaks “Good evening, <name>. Everything is ready.” once in his normal voice; no duplicate line or floating reply caption appears
- [ ] Mascot exits into the upper visible screen area while the notch closes; he does not jump straight to the bottom edge
- [ ] Repeat after clearing the saved session → browser relay can take longer, but completed IOMI holds cleanly until auth returns
- [ ] Deny/cancel browser auth → boot exits safely to `auth failed`; no greeting or mascot exit fires
- [ ] Mic remains off throughout boot; double `Control` still starts the first realtime session normally afterward

## 2. Hotkeys & summon
- [ ] Double `Control` → voice session starts (privacy dot coral, edge glow blue)
- [ ] Double `Control` again → session ends
- [ ] Single `Control` → nothing happens; one double tap produces one voice toggle with no blinking loop
- [ ] Double `Option` in an editable field → BrainoHERA starts; normal voice/Jarvis does not start
- [ ] Double `Option` again → BrainoHERA stops
- [ ] `Control+Space` → backup voice toggle
- [ ] Double `Space` → walker goes home to the notch / overlay shows
- [ ] Double `Command` (bare taps only) → walker toggles out ↔ home; Cmd+C etc. never triggers it
- [ ] `Cmd+Shift+H` → Her mode in / out
- [ ] Say "come out" → walker leaves the notch; drag him anywhere; drop near Dock → he patrols

## 2A. BrainoHERA
- [ ] Put the caret in Notes and double `Option` → notch glows mint while Braino is home
- [ ] Bring the full mascot out, start BrainoHERA → only the standing mascot glows mint
- [ ] In Chrome/Notion, click a page block and double `Option` → a fixed black Yap sheet springs downward from the Notch
- [ ] Speak in Chrome/Notion and pause → phrases stack downward without label overlap or horizontal width growth; no text is pasted while BrainoHERA remains active
- [ ] Dictate two turns, then double `Option` → the complete session lands once at the active caret with readable spacing
- [ ] Start a sentence on the same beat as the second `Option` tap, including during a slow connection → every opening word survives; the `realtime.mic.ok` log includes `captureLatencyMs`, `dictation.startup_gate.open` includes `preflightMs`, then pre-roll duration includes the Accessibility wait
- [ ] Start BrainoHERA on a secure/password field → capture stops, nothing is uploaded or inserted, and no `dictation.preroll.flushed` event appears
- [ ] Dictate the same English/Hinglish reference paragraph three times through the built-in mic → compare exact word errors; no first-word truncation and no obvious denoiser clipping
- [ ] Count `one` through `twelve` without waiting for Realtime readiness → the inserted sequence remains `one` through `twelve`; `dictation.preroll.flushed.transport` is `ordered_pcm_datachannel`
- [ ] Say “ChatGPT beats Claude” immediately → those four words stay in that order
- [ ] Say “my name is Itish” → `Itish` is spelled from the runtime vocabulary, not guessed as another name
- [ ] On a cold start, say “my name is Itish” and stop before Realtime finishes opening → the frozen phrase is still transcribed and inserted
- [ ] Say “so am I going there or am I not going there?” across the startup handoff → no tail fragment moves to the front
- [ ] Pause for about one second, then double `Option` → only one real turn is committed; logs contain no `input_audio_buffer_commit_empty`
- [ ] Dictate a very short or quiet phrase → local speech detection commits it after the natural pause
- [ ] Double `Option` during the final phrase → mint listening turns off immediately, then the phrase drains and the whole session inserts once
- [ ] Time stop-to-insert over five warm attempts → no formatter request appears after `dictation.insert.start`; a late final event is bounded by about 1.2 seconds and logs `dictation.transcript.provisional`
- [ ] Say "new line" and "new paragraph" → layout commands insert the expected breaks
- [ ] Say exactly "done" → `done` is inserted and BrainoHERA stays active
- [ ] Say "I got it done yesterday" → the complete sentence is inserted unchanged
- [ ] Start normal Braino voice and say "Braino, start BrainoHERA" → session switches to silent dictation
- [ ] Say the former "Braino, start Yap Mode" phrase → the compatibility alias still starts BrainoHERA
- [ ] Move the caret to another editable app while active, then stop → the complete session lands at the caret that is focused at stop time
- [ ] Try a password field → Braino refuses and inserts nothing
- [ ] Dictate with no text field focused → full transcript remains visible in the Notch for 12 seconds and is copied
- [ ] Switch front apps immediately before paste → text does not land in the wrong app; transcript remains recoverable
- [ ] Copy text before a successful insertion → the original clipboard is restored afterward
- [ ] Force an insertion failure → the transcript replaces the clipboard instead of being lost
- [ ] Logs show `dictation.started`, `dictation.vad.speech_started`, `dictation.transcript.buffered`, `dictation.stop.acknowledged`, `dictation.stop.drained`, one `dictation.session.inserted` or `dictation.fallback`, and `dictation.stopped`

## 3. Notch island — visual states (no commands, just watch)
- [ ] Idle home: eyes in the black island, sleepy half-lidded after 30 min silence ("dozing")
- [ ] Session starts → eyes snap open, island morphs, small talking mouth while speaking
- [ ] Your words appear inside the centered black notch surface, auto-clear, and never duplicate above the walking mascot
- [ ] Thinking text ("mission control") shows while he works a task
- [ ] Ask “summarise this Medium article” with Braino home → thinking stays compact; click the notch to open the 580 px content-fitted progress sheet while Medium keeps focus
- [ ] Repeat with Braino walking on-screen → the same notch sequence appears and no duplicate floating reply bubble opens
- [ ] Move the Mac overlay between displays arranged above and below the primary screen → labels and Done keep the same safe baseline below the physical housing
- [ ] Open a short answer → only the measured housing occupies the menu-bar strip; the wider sheet opens below it with no external rim/bar
- [ ] The first reply text morphs the same notch into an answer instead of flashing back to the mouth-only state
- [ ] Reply under 100 characters → compact short-answer layout; click the body → it expands to long form
- [ ] Reply at 100 characters or more, with paragraphs, or with a list → long reading layout with a source label and no mascot/subtitle overlap
- [ ] During Fish Audio playback → upcoming words remain soft, the current word glows, completed words settle dark
- [ ] Press **Done** mid-speech → the visual folds without stopping audio or moving focus
- [ ] Let speech finish → short and long answers linger, collapse smoothly, and restore any timer/music/REC ticker underneath
- [ ] Barge in during an answer → old audio and old answer both disappear; the new turn owns the notch
- [ ] Repeat while BrainoHERA is active → no assistant thinking/answer surface appears
- [ ] Eyes follow your cursor when it comes near; idle glances otherwise; blinks

## 4. Notch tray — the interactive island (NEW 07-25)
- [ ] Hover near the notch → island springs open into the black-glass tray (~170ms)
- [ ] Move away → collapses after a beat
- [ ] Now-playing card: artwork (Spotify), song/artist, live progress bar
- [ ] Prev / play-pause / next buttons control playback
- [ ] Calendar card shows next event; **Join & record** appears when the event has a Zoom/Meet/Teams/Webex link
- [ ] Join & record → opens the call link AND auto-starts the meeting recorder ~6s later
- [ ] Active timers listed with countdown; ✕ clears reminders
- [ ] Battery + connected headphones line at the bottom right
- [ ] Click the collapsed notch → voice toggles (island dips as tap feedback)
- [ ] Two-finger scroll on/near the notch → system volume with HUD in the pill
- [ ] Two-slot ticker: play music + set a timer → timer left, song right; charger events ride the right slot

## 5. File shelf (NEW 07-25)
- [ ] Drag a file from Desktop onto the notch → island opens ("drop it, I'll hold it") → chip appears
- [ ] Chip: `open` opens it, `show` reveals in Finder, `✕` lets go
- [ ] Chip `ask` → he says "What should I do with it?" → say "summarize it" / "move it to Documents"
- [ ] With a file held, say "summarize this pdf" in normal voice → file context rides along
- [ ] Ticker shows "❐ 1 held" when collapsed

## 6. System events (NEW 07-25)
- [ ] Plug in charger → "⚡ NN% · charging" transient + island flash
- [ ] Unplug → "on battery · NN%"
- [ ] Connect AirPods → name + battery transient; shows in tray sys-line
- [ ] (Hard to force) Battery to 10% while discharging → he speaks up once, only when idle

## 7. Music & theatrics
- [ ] Play a song in Spotify → he puts on headphones, fades home, dances in the island, marquee + beat-synced light show
- [ ] YouTube SONG (official audio/lyrics) → same; a podcast/vlog does NOT trigger it
- [ ] Pause music → theatrics end cleanly
- [ ] "what's playing" → correct track/artist
- [ ] **Ducking fix**: with music playing, double `Control` → music volume dips to ~20%, you can talk normally, and it restores to the exact prior volume when the session ends

## 8. Spotify (voice)
- [ ] "play Bargad on Spotify" / "play my <playlist> playlist"
- [ ] Start from a Chrome tab, then "play Bargad on Spotify" → Spotify opens and starts playback → Braino returns to the same Chrome tab before saying what is playing
- [ ] "pause" / "resume" / "next" / "previous" (works, and "resume watching X" does NOT hijack this)
- [ ] "set Spotify volume to 40%" / "lower the volume by 20%"
- [ ] "queue <song>" · "restart this song" · "shuffle on/off" · "repeat on/off"
- [ ] "like this song" (menu-bar click path)
- [ ] Skip awareness: he announces the new track after a skip

## 9. YouTube
- [ ] "play <video/song> on YouTube" (+ "by <creator>")
- [ ] "show me <channel>'s recent videos" → speaks uploads, asks which
- [ ] "search YouTube for <topic> tutorials" → top 3 spoken
- [ ] "play the second one" (within 5 min of a list)

## 10. Netflix
- [ ] "resume watching <title> on Netflix" → search page → auto-click first /watch/ card (needs Chrome "Allow JavaScript from Apple Events")

## 11. Files & folders
- [ ] "organize all my files" / "clean up my desktop" → Braino Organized folders
- [ ] "organize by type / date / project"
- [ ] "undo that" → restores the last file action
- [ ] "create a folder called Invoices on Desktop"
- [ ] "rename <file> to <new name>"
- [ ] "move the tax PDF to Documents"
- [ ] "delete the old receipt PDF" → asks → "yes, delete it" → **Touch ID prompt** → Trash
- [ ] "find document called resume" / "open yaya image"
- [ ] Regression: "open Claude settings usage" never opens an unrelated PNG; without a matching app, site, or filename, Braino reports that it could not find the target
- [ ] "how many files do I have" (walks Desktop/Downloads/Documents/iCloud) · "how many braino folders"
- [ ] "how many files in THIS folder" (with a Finder window open) → counts the open window
- [ ] "what's worth deleting" → 3 oldest by real last-use, asks about redundant folder
- [ ] "create a folder for the files I don't need" → one-shot scan + Redundant Files
- [ ] "what's in the redundant folder" · "recover the <name> file" · "put them back" · "delete them all" (Touch ID)
- [ ] "delete this folder" (front Finder window, guarded, Touch ID)

## 12. Apps, windows & hands
- [ ] "open WhatsApp / Cursor / Finder" · "quit <app>" · "open Netflix" (app or site fallback)
- [ ] "go to github.com" · "close the <x> tab"
- [ ] "what's eating my ram" → top 6 by memory; "close them" quits closable ones
- [ ] "put Chrome on the left" / "maximize this" / "move cursor to the right"
- [ ] "click <button/thing on screen>" → AX click, or vision + real mouse click fallback; "click it" re-clicks last pointed target
- [ ] Select text anywhere → "fix / rewrite / translate / summarize the selected text" · "read the selected text"

## 13. Vision
- [ ] "what's on my screen" / "read this" (~4s)
- [ ] "show me where <X> is" → walks + points with ring
- [ ] "can you see me?" → webcam frame → describes you
- [ ] "which design do you like" → commits to an opinion

## 14. WhatsApp & calls
- [ ] "message mom saying I'll call tonight" (mom→Ilu seeded)
- [ ] "remember my <relation> is <name>" / "her number is <N>"
- [ ] Incoming message → he reads it out (needs Full Disk Access + previews ALWAYS + no Focus; default ON)
- [ ] "why aren't you reading my whatsapps" → self-diagnosis
- [ ] "reply saying <text>" (within 15 min of a readout)
- [ ] "whatsapp call <name>" / "video call <name>"
- [ ] "facetime <name>" · "call <name>" (iPhone relay)

## 15. Gmail
- [ ] With a thread open in Chrome: "reply to this email saying <gist>" → drafts, fills, sends (needs JS-from-Apple-Events)

## 16. Maps, phone, research, shopping
- [ ] "distance from <A> to <B>" / "how far is <X>" → opens directions, speaks distance/duration
- [ ] "navigate to <X>" (origin = current location)
- [ ] "show me where <X> is on the map"
- [ ] "send this to my phone" → texts current tab to your number (asks for number once)
- [ ] "research <product>" / "compare X vs Y" → 3 tabs open, one spoken recommendation
- [ ] "show me options for <product>" → Amazon search; "click the second one" · "add to cart"

## 17. Wallpaper
- [ ] "random wallpaper" · "make spider man my wallpaper" · "put it back"
- [ ] "what wallpaper is this" does NOT change it

## 18. Time suite: timers, alarms, stopwatch, clock (voice)
- [ ] "what time is it" / "what day is today" → correct spoken time/date (also mid-chat)
- [ ] "remind me in 20 minutes to stretch" → countdown rides the notch; fires with flash + voice
- [ ] "set an alarm for 7 am" / "alarm at 6:30 pm to call Renu" / "wake me up at 6:30" → "⏰ · in Nm" appears in ticker when <60 min; tray shows clock time
- [ ] "alarm at 7" with no am/pm → picks the NEAREST future 7 o'clock
- [ ] Alarm fires → amber pulsing island + repeating chime + spoken time; **tap the notch** to stop
- [ ] "snooze" within 10 min of firing → re-armed 9 minutes
- [ ] "stop the alarm" while ringing → silence; "turn off the alarm" later → cancels pending alarms
- [ ] Quit and relaunch the app with an alarm pending → alarm survives (timers.json)
- [ ] "start a stopwatch" → ⏱ counts up live in ticker; "stop the stopwatch" → speaks elapsed; "resume" / "reset the stopwatch"
- [ ] Tray: stopwatch row pause/resume + reset buttons; per-item ✕ cancels just that timer/alarm
- [ ] "cancel my reminders"
- [ ] Calendar event <15 min away → "<title> · in N min" in the ticker

## 19. X (@brainosays)
- [ ] "how's the X account doing" / "how many followers" → stats + 7-day delta
- [ ] "any mentions" → top 3 spoken
- [ ] Ambient pulse: "@brainosays · N" rides the ticker after each poll
- [ ] "record a clip of 20 seconds" → then "tweet it saying <caption>" → "ship it?" → posts

## 20. Meetings
- [ ] Join a Meet/Zoom → he offers "want me to record it and take notes?"
- [ ] "record this meeting" / "start recording" → REC clock in notch, glass panel with live notes + captions, invisible to screen share
- [ ] "stop recording" → notes land (dashboard sync)

## 21. Her mode
- [ ] "her mode" / `Cmd+Shift+H` → full-screen warm light, captions, her voice
- [ ] Everything is conversation (no delegate); 60s idle window
- [ ] "goodbye" / "back to Braino" → clean exit

## 22. Wake word & ambient
- [ ] "turn on wake word" → "hey braino" from silence starts a session (on-device only; gray privacy dot = armed)
- [ ] "turn off wake word"
- [ ] Ambient: stay idle while awake → "seeing what you're up to..." → one short spoken offer → mic opens for your answer
- [ ] "braino don't disturb me" mutes ambient · "you can disturb me" re-enables

## 23. Conversation & smarts
- [ ] Consequence questions route to talk, not action: "if I delete the braino folder, will I lose the extension?"
- [ ] Barge-in: talk over him mid-reply → he stops and takes the new command
- [ ] Casual chat knows now-playing + open tabs without vision ("what am I listening to" mid-chat)
- [ ] "mesa update" → opens the right Chrome profile, scrapes, compares to last check-in, calls out overdue work
- [ ] "search the web for best ML papers" → spoken answer
- [ ] "what do you see / what is open" → front window awareness
- [ ] "talk like Donald Trump" → enter line in HIS voice, sticky Trump voice + Tremendous style until reset
- [ ] "explain what's on my screen like Trump" → flips silently, answers in character
- [ ] "gen z mode" / "talk like a zoomer" → style-only persona (his own voice)
- [ ] "be yourself" / "normal voice" → exit line, back to Braino

## 24. Parked (built, expect rough edges)
- [ ] Apple Notes: "create a note about tomorrow's demo checklist"
- [ ] Apple Mail: "send an email to Renu saying I'll call tomorrow"

---

## What comes next (from STATUS.md + the widgets conversation)
1. **Extension bridge** — Mac Braino enqueues into `agent_commands`, the Chrome extension executes (Gmail DOM, page reading, full agent loop). THE hybrid moat.
2. **Lock-screen Now Playing card** — MPNowPlayingInfoCenter Swift helper: Braino's face + current task on the macOS lock screen while he talks.
3. **Menu bar tray item** — mood glyph, ● recording, one-click voice.
4. **WidgetKit desktop widgets** — native host app + App Group JSON bridge.
5. Long-PDF read from disk · Emotional/Memory Engine port · isPremium gates · electron-builder packaging · Spotify Extended Quota.
