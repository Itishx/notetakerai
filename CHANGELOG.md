# Braino Changelog

## v6.3.39 — Realtime actions launch fast again
- **Realtime voice no longer waits on a spoken progress ack before starting Delegate.** Browser actions like Spotify/open/send now launch the agent immediately and only speak the final result.
- **Progress updates are visual-only during realtime.** This prevents Braino from saying "Searching..." into its own live mic and accidentally creating a self-trigger loop.
- **Fish/OpenAI TTS has a hard timeout and shorter retry window.** A slow voice endpoint can no longer stall the first spoken turn for tens of seconds.
- **Extension package updated.** The download artifact now ships as version **6.3.39**.

## v6.3.38 — Stop realtime from hearing Braino's own quick ack
- **Removed the spoken browser quick-ack in realtime voice.** The "One sec" fallback could be picked up by the realtime mic as if the user said it, causing a self-triggering loop.
- **Realtime stays always on.** This only removes the unsafe browser-spoken interim ack; it does not disable the realtime listening session or Fish Audio output.
- **Extension package updated.** The download artifact now ships as version **6.3.38**.

## v6.3.37 — Braino knows his latest body, cinema mode, and voice wakeup
- **Braino now knows what is new with himself.** The extension answer and shared backend prompt both include current product memory, so questions like "what's new with you?" mention the latest Braino changes instead of old Fly Mode-only copy.
- **Arms, legs, walking, waving, and throw physics are now part of Braino's own story.** Braino can describe his walking lane, idle body animation, grab/fling behavior, and little comeback-to-the-bar routine.
- **Cinema mode is first-class product memory.** Braino knows he can sit with you while you watch a movie, use the current timestamp/captions, answer scene questions, and avoid spoilers unless asked.
- **Realtime first-turn feedback is faster.** When live voice has heard you but the first smart route is still cold-starting, Braino gives a tiny immediate acknowledgment instead of silently glowing blue for ages.
- **Always-realtime listening stays intact.** Fish Audio can still be the speaking voice, but the realtime session remains the listening backbone.
- **Extension package updated.** The download artifact now ships as version **6.3.37**.

## v6.2.8 — Floating UI adapts to light pages
- **Auto dark-glass mode on light/white pages.** Braino detects the page background luminance every time the bar opens. On light pages both the pill bar and the response card flip to a dark warm glass theme so text, icons, and content are always legible.
- **Liquid glass effect preserved.** The SVG displacement filter and backdrop-blur layers are untouched — the dark-glass variant maintains the same refraction look, just inverted.
- **Scholar glasses corrected.** Round circular frames replace the old square ones, the mortarboard cap is removed, and Scholar's pupils now look toward the center of the screen (up-left) matching listening mode.
- **Extension package updated.** The download artifact now ships as version **6.2.8**.

## v6.2.7 — Braino reacts now
- **Eight emotion expressions on the mascot.** Braino can now show Happy, Laughing, Tears of Joy, Celebrating, Focus, Shocked, Scared, and Idle — each a distinct SVG face with the matching eyes, mouth, and effects.
- **Animated reaction popups.** When an emotion fires, a matching emoji floats up above the mascot with a spring bounce, then fades out. No third-party libraries — pure CSS keyframes.
- **Scholar mode during lecture recording.** Braino puts on a mortarboard cap and square academic glasses whenever a lecture recording session starts, then returns to normal when it stops.
- **Reactions wired to real events.** Auth success triggers 😊 Happy, auth rejection triggers 😰 Scared, quota errors trigger 😱 Shocked, and a completed X automation triggers 🎉 Celebrating.
- **Two new reaction SVGs shipped.** `braino-idle.svg` and `braino-celebrating.svg` added to the public reactions pack, completing all eight emotions.
- **Extension package updated.** The download artifact now ships as version **6.2.7**.

## v5.14.0 — Contact photos upload directly now
- **Contact photos are now real uploads, not pasted links.** In both the dashboard and Braino's inline contact prompt, you can upload a photo file directly instead of hunting for a URL.
- **Manual email/password login is properly recoverable.** Braino now supports forgot-password and password-reset flows cleanly in both the main auth screen and the extension auth handoff.
- **Google Calendar and realtime cost memory shipped together.** Calendar actions, reminders, and connection status are wired through the real backend, and Braino can answer realtime spend questions from live tracked session data.
- **Extension package updated.** The download artifact now ships as version **5.14.0**.

## v5.13.0 — Contacts now understand nicknames
- **Braino can resolve nicknames as well as real names.** Save a nickname on any contact and commands like "send RD an email" or "schedule a call with rahul bhai" resolve to the right saved person.
- **Confirmations still speak the real name back.** Even when you trigger an action via nickname, Braino responds using the contact's saved real name so you know exactly who it matched.
- **Nickname memory is shared everywhere.** Saved nicknames now flow through the dashboard, inline contact popup, and Braino's shared user knowledge context.
- **Extension package updated.** The download artifact now ships as version **5.13.0**.

## v5.12.0 — Contacts power names for email and Calendar
- **Braino now remembers people by name.** Save contacts once in Settings with name, email, phone, and photo, then say things like "schedule a call with Rahul" or "send Rahul an email" without spelling anything out.
- **Unknown names now prompt inline.** If Braino hears a person it does not know yet, the extension opens the same transparent in-page popup so you can add the contact on the spot and continue the action.
- **Contact memory is shared into Braino's context.** Saved contacts are merged into Braino's user knowledge so chat, live voice, and connector flows can reference the same people consistently.
- **Extension package updated.** The download artifact now ships as version **5.12.0**.

## v5.11.0 — Google Calendar is live end to end
- **Google Calendar is now fully wired through Braino.** Connect your account from the dashboard, then ask Braino to schedule, reschedule, cancel, forward, list, and open upcoming meetings through the real Calendar API.
- **OAuth flow hardened.** Calendar connect now requires an authenticated Braino user and uses signed short-lived OAuth state so another user cannot attach a calendar connection to the wrong account.
- **Calendar watches self-arm.** On connect and on status refresh, Braino now renews Google Calendar watch channels when needed so reminders and Calendar-change awareness stay alive without manual cleanup.
- **Dashboard + extension package updated.** The dashboard now shows live watch status, the skills/docs pages reflect Calendar as live, and the extension ships as version **5.11.0**.

## v5.10.0 — Braino knows your realtime spend
- **Braino can now answer spend questions exactly.** Ask "how much have I spent?", "what did this session cost?", or "how much today / in the last 7 days?" and Braino answers from your logged realtime voice turns instead of guessing.
- **Receipts now include the useful bits.** Braino reports the current or most recent session total, today's total with the exact date, the last 7 days with the exact date range, your biggest cost driver, and the priciest recent session.
- **Live voice quota removed.** Realtime session startup no longer blocks on a daily cap, and the old cap-era warning/fallback messaging has been stripped out.
- **Extension packaging updated.** The download artifact now ships as extension version **5.10.0**.

## v5.4.0 — Realtime gets legacy's brain + ElevenLabs actually works
- **Live AI is now as smart as legacy.** Root cause of "legacy was smarter": legacy voice routed conversation through the full `chat-about-notes` pipeline (your page's text + your notes), while Live AI used the bare realtime model that barely saw the page. Now **both** use the same smart, page-aware pipeline — Live AI just speaks the answer in its realtime voice.
- **ElevenLabs voice actually works now.** The `elevenlabs-tts` function was requiring a login token it never even used, so an expired token silently dropped Braino to the robotic browser voice. Made it public — ElevenLabs is now used for legacy replies and for the ElevenLabs voice setting.
- **Multilingual mirroring restored.** Reverted the English-only lock — speak any language and Braino mirrors it (noise-induced language flips are still held back by the transcript gate + calmer turn detection).
- **Fewer Live AI timeouts.** Connect timeout raised from 10s to 15s so slower networks don't get bumped to legacy unnecessarily.
- **Voice setting applies instantly** on every tab (no longer only on the next voice session).

## v5.3.0 — Language lock, smarter volume, clean searches, same-tab mic
- **No more random languages.** Root cause: the transcription model auto-detected language from audio and mis-detected on noise/music/accents, then the assistant mirrored the wrong language. Fixed by locking transcription to English (`language: "en"`) and instructing Braino to always reply in English.
- **Volume "increase/decrease" works without a number.** Volume is now handled directly (no premium agent in the loop): "turn it up / louder / increase" = **+20%**, "lower / quieter / decrease" = **−20%**, plus exact %, mute, and max.
- **Web look-ups search the real query, not your sentence.** "Find me some Medium articles on making good coffee" no longer types your whole polite sentence into the search bar — Braino extracts the actual query ("good coffee medium articles") and answers. Informational look-ups go to web search (an answer), not the typing automation.
- **Tap Braino to stop him talking.** A guaranteed "stop" — clicking the mascot silences any ongoing speech, including spoken web answers.
- **Mic permission opens in the same tab** as a small modal (not a separate window), and is now button-driven so the grant reliably sticks — which is what lets the instant offscreen voice-follow work. Falls back to a window on pages that block embedded frames.

## v5.2.0 — Instant, seamless voice follow (offscreen unlocked)
- **Zero reconnect on tab switch.** The global offscreen voice session now works because we grant the microphone to the extension **once**, via a small one-time window the first time you turn on voice. After that the invisible offscreen session can hold the mic, so switching tabs is an instant hand-off — no "Waking up…", no gap.
- **Grant once, works everywhere.** Because the permission is on the extension (not each website), you'll never get a per-site mic prompt while browsing.
- If you decline the mic, nothing breaks — Braino quietly uses the per-tab migration fallback from v5.1.0 (a brief reconnect on each switch).
- Robustness: if the OS later revokes mic access, Braino notices and re-asks instead of silently failing.

## v5.1.0 — Voice truly follows you across tabs + smarter delegate + noise-proof
**The big root-cause fix.** Previous versions only followed across tabs when the *offscreen* global session started — but on most setups that session silently fails (a microphone can't be granted to an invisible offscreen document), so it fell back to an in-tab session bound to one tab. That's why the old tab kept talking and the new tab never lit up.

- **Voice now follows you no matter what.** A persistent "voice mode on" flag drives presence on whichever tab is focused:
  - If the global offscreen session works → instant visual hand-off, no reconnect.
  - If it doesn't → the session **migrates**: the tab you leave tears down and goes idle, the tab you land on spins up and turns blue. Brief reconnect, but it actually works every time.
  - Once offscreen is detected as unavailable, we skip it on future switches so there's no wasted delay.
- **Old tab stops, new tab glows blue** — the blue halo always lives on the tab you're actually looking at; the one you left returns to its idle float.
- **Delegate is the real default.** Generic look-ups now delegate even without naming an app: "look up an article on machine learning", "find me a paper on X", "search for…", "what's the latest…" all trigger web search → open → answer. Braino will **never say "I can't open that from here"** in voice mode again.
- **Noise-proof voice.** Calmer turn-detection + a transcript sanity gate stop loud music / background noise from being "heard" as gibberish. If Braino genuinely didn't catch you, it asks you to repeat instead of hallucinating a reply.

## v5.0.4 — Voice consciousness shifts to every new tab (airtight)
- Brain is now shown AND glows blue on any tab that opens while voice is active — even if that tab was never docked before.
- `sbBrainDocked` is written to storage on attach so all subsequent tabs inherit visibility automatically.
- `sb-brain-idle` animation is cleanly removed when headphone mode activates (no animation conflict).

## v5.0.3 — Voice consciousness shifts to the new tab
- **Root cause fixed**: when Braino opens a new tab (e.g. Spotify), the content script now reads `sbRtSessionActive` at startup and enters headphone mode immediately — no longer depends on a message arriving before the script is ready.
- The old tab's Braino hands off cleanly; the new tab's Braino shows "Live AI" and picks up listening right where it left off.

## v5.0.1 — Instant voice re-attach + simpler shortcut (Alt+V)
- **Shortcut changed to `Alt+V`** (Option+V on Mac) — 2 keys instead of 3.
- **Zero reconnect time** on tab switch: if a session is already running in offscreen, pressing Alt+V (or switching to any tab) attaches instantly — no WebRTC setup, no "Waking up…" delay.
- The 2-second delay now only happens once (the very first time you start voice). All subsequent tab switches are instant.

## v5.0.0 — Voice mode shortcut + friendlier connection message
- **`Cmd+Shift+Space`** (Mac) / **`Ctrl+Shift+Space`** (Windows/Linux) — instantly toggles hands-free voice mode from any tab. No more hunting for the headphone button.
- Connection message changed from "Connecting…" to **"Waking up…"** and the slow-connect hint now says **"Hold up, give me a second…"** instead of the technical error text.

## v4.11.3 — Restore auth wakeup sequence + calmer eyes
- Restored the authentication sleeping/wakeup SVG variants — the SVG restructuring broke the .replace() calls that produce the sleeping/listening faces, so the cinematic wakeup was silently skipping.
- Gaze drift reduced from ±1.8px to ±0.8px — eyes move naturally, not frantically.

## v4.11.2 — Idle animations: float, eyes, arms + Spotify music glow
- Braino now **floats, swings his arms, and scans around with his eyes** while docked — matching the home page mascot. He blinks every ~4s.
- On Spotify while music is playing: distinct **green-cyan pulsing glow** so you know he's aware of the music.
- Animations pause automatically when he's busy (recording, speaking, headphone mode) and resume when he returns to idle.

## v4.11.1 — Fix foreign-language hallucination + auto-attach + volume increase
- **Hallucination/foreign language**: the offscreen session was missing `turn_detection.create_response:false` — the model was auto-responding to every sound. Fixed by passing the full session.update config, not just the instructions string.
- **Auto-attach on new tab**: two-path fix — background retries with a 400ms delay, and the tab self-checks storage on becoming visible (catches timing races).
- **Volume increase**: "turn up the volume", "full volume", "max volume", "mute" now all work.

## v4.11.0 — Voice session follows you everywhere (Phase 2: offscreen)
- The realtime voice session now lives in the extension's offscreen document — global, not tied to any tab.
- Switch tabs, open new tabs, let Braino open Spotify — he is **always listening and speaking**, no matter where you go.
- The AI audio plays from the offscreen context so you hear it on any tab.
- Switching to a new tab auto-enters headphone mode with the live session already active.
- Falls back to the previous in-tab approach if anything goes wrong.
- Volume fix: slider scaling corrected (Spotify's range is 0–1, not 0–100).

## v4.10.1 — Fix double voice, volume, and close-tabs intent
- **Double voice on tab answers**: fixed — the fallback to browser TTS only fires when realtime is genuinely unavailable, not when a relay is cancelled/errored.
- **Volume**: now drives Spotify's own UI volume slider instead of the audio element (which was in a shadow DOM and invisible to content scripts).
- **"Close my tabs"**: catches far more natural phrasing — "too many tabs", "remove unused tabs", "kill some tabs", etc.

## v4.10.0 — Voice follows you across tabs (stage 1)
- Start a voice conversation, then switch tabs or let Braino open one — **he keeps listening and talking**, following you, instead of going silent.
- Enforced a single voice session at a time (one Braino speaking, never two), which let us stop muting backgrounded tabs.
- Note: the session still lives on the tab where you started it, so it survives tab *switches* but not *closing* that tab — making it survive anything (offscreen) is the next stage.

## v4.9.1 — "Read my tabs" + cleaner tab count
- "Read the tabs out", "tell me my tabs", "name my tabs" now work (intent detection was missing these).
- Tab count now counts only real web pages (ignores new-tab/chrome:// pages) and mentions how many windows when you have more than one.

## v4.9.0 — One voice for tab answers, exact numbers
- Tab/count replies are now spoken by your **single configured voice** (no more a second browser/ElevenLabs voice chiming in alongside the realtime voice).
- The realtime voice now reads counts **word-for-word**, so "how many tabs" and "closed N tabs" say the exact number instead of a paraphrased one.

## v4.8.9 — Volume control actually works
- Volume commands now change the Spotify **web player** directly (its media element) instead of calling the Web API, which silently ignored web-player volume. "Lower the volume" / "set volume to 30%" now really moves it.
- If a song isn't actually playing, Braino says so instead of falsely claiming success.

## v4.8.8 — One voice at a time + accurate counts
- Fixed two tabs talking over each other: a backgrounded tab now stops speaking and mutes its mic, so only the tab you're on responds.
- Tab counts and "closed N tabs" are now spoken **exactly** — numbers are read verbatim instead of being paraphrased by the voice model (also applies to follower/X counts).

## v4.8.7 — Cross-tab awareness & cleanup
- Ask **"how many tabs do I have open?"** or **"what am I doing across my tabs?"** and Braino answers from all your open windows.
- Say **"close the tabs I'm not using"** and Braino says "Closing, sir" then closes only the clutter — never your active tab, pinned tabs, or anything playing audio/video.
- Works in both chat and realtime voice.

## v4.8.6 — Braino follows you across tabs
- Once you activate Braino, the floating mascot now **persists on every tab** — open a new tab (or let Braino open one) and he's already there, docked.
- Collapsing the card now returns to the docked mascot instead of disappearing, so you never have to re-invoke.
- Hiding Braino (Cmd/⌘+I toggle) is remembered too; he stays hidden across tabs until you bring him back.

## v4.8.5 — Volume control in realtime voice
- "Raise/lower the volume", "make it louder/quieter", "set volume to 40%" now work in **realtime voice** (and anywhere), not just when you're already on the Spotify tab.
- Volume is routed as a Spotify delegate action and recognized regardless of the current tab.

## v4.8.4 — Spotify: no more inline modal
- Spotify actions (play/pause/search) no longer pop the inline card. Braino opens Spotify in a new tab and confirms verbally — no panel.
- The manual Spotify visual (click the mascot's now-playing) still opens the panel on demand; the Spotify API integration is unchanged.

## v4.8.3 — X status works in voice mode
- **Voice mode now answers X questions from the backend** instead of opening X in a tab. "How's my Twitter looking?" spoken aloud is intercepted before delegate routing.
- Looser phrasing matched — "how **is** my twitter", "twitter doing", "my x stats", etc. (previously only "how's my twitter" matched).
- Delegate tasks no longer pop the panel in voice mode.
- `x-status` no longer says "not connected" on a transient X API hiccup — it stays connected and degrades gracefully.

## v4.8.1 — Twitter/X status in Delegate
- Ask Braino **"how's my Twitter looking?"**, "any new mentions?", "how many followers?", or "how did my last tweet do?" in Delegate mode and it answers with **real X data**, spoken aloud.
- New `x-status` edge function exposes live follower count, recent mentions, and last-tweet engagement (previously locked inside the auto-engage cron).
- Delegate panel now **stays open** during and after the call so you can ask follow-ups like "what did my last tweet say?".
- Follower 7-day delta is spoken only when a real baseline exists — never guessed.

## v4.7.3 — Voice Web Search Theatrics
- In **voice mode**, web searches now open a real Google tab so it looks like Braino is controlling the browser. The actual answer still comes from AI search and is spoken back. Chat mode is unchanged.

## v4.7.2 — Spotify Overhaul + Volume Control
- Spotify now opens in a **new visible tab** when playing a song (no more silent background tabs).
- Removed the Spotify card UI — Braino just speaks the result cleanly.
- Added **volume control**: "lower the volume", "raise the volume", "set volume to 50%" all work in both voice and chat mode.

## v4.7.1 — Voice Mode Page Context Fix
- Fixed the core bug where Braino couldn't see the page in voice mode. Page title, URL, and content are now injected into the session at startup — no server round-trip needed.
- Page questions ("summarize this", "explain this") now route through the full text pipeline (with user notes + page context) instead of the bare realtime model.
- Page context refreshes synchronously before each realtime chat turn.

## v4.7.0 — Cursor-Follow Fly Mode + Realtime Voice Tracking
- New **fly mode** (Cmd+S): Braino's floating mascot follows your cursor with a smooth lerp animation. Stops when you hover the mascot, open a card, or enter headphone/lecture mode. Cmd+S toggles it on/off.
- Realtime voice sessions are tracked server-side so usage and costs stay visible end-to-end.

## v4.5.0 — Lecture Mode Rebuild
- Rebuilt lecture mode recording UI in the floating card.
- Fixed brain toggle, gaze, and persistent card behaviour during lecture recording.
