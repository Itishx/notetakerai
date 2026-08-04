# Braino Changelog

## August 4, 2026 — “Open what I just downloaded”
- **Braino knows what you just downloaded without being told its name.** Say “open what I just downloaded” or “put what I just downloaded in the Invoices folder” and he resolves it by arrival time instead of name: newest first across Downloads and Desktop, using when the file landed on your Mac rather than the timestamp the server sent.
- **He makes the calls a careful person makes.** A file still coming down is never opened or moved, he just tells you it is downloading. Two files landing in the same minute get a question instead of a coin flip. When the newest thing is hours old, he names it and checks before touching it.
- **“This folder” means the one you are looking at.** Filing something into the front Finder window works without naming it.
- **You can watch him reason about it first.** Two Mac scenarios were added to the Loop on /human-intelligence, where a Finder window is now part of the pretend world: the file list starts sorted by name, so he has to sort by date himself, and a half-finished download plus two same-minute files are sitting there to catch a guess.

## August 4, 2026 — Idea Tracker
- **New internal page: /ideas.** A live tracker built with faithful Notion anatomy — page icon and property rows, to-do blocks with real Notion checkboxes, a table view with view tabs and pastel status tags, gallery stat cards, and a callout — on the Apple system-sans base. No editorial serif.
- **Dump ideas from the top of the page.** A capture bar under the title takes typed or dictated ideas (built-in browser speech, coral pulse while listening) and drops them into an Inbox section, saved in the browser for now.
- **The page is the database.** All content lives as data arrays in the page itself, so appending an idea is one entry — and it's the declared v0 of Idea Mode, where Braino will transcribe spoken ideas, draft GitHub-grounded plans, and dispatch approved ones to a coding agent.

## August 2, 2026 — How Braino talks
- **He never opens with "What's on your mind?" again.** A new charm trait makes his real voice the baseline instead of something that only appeared when you asked about him. He opens with what he noticed, or a short real line, never an empty question that hands the work back to you.
- **His charm scales with the moment, down to zero.** Full when things are ordinary or good, pure speed when you just want the thing done, warm with the teasing off when you're venting, plain in heartbreak, and completely absent in grief or distress where wit would be an insult. Until now his tone never actually changed with emotion; only the order of his traits did.
- **Every reply is checked against his own banned phrases, in code.** Therapy voice, wellness closers, "great question", "as an AI", em dashes. It either comes back clean or names the exact phrase that slipped through, so the ban is enforced instead of requested.
- **He reads emotion in layers now.** Word cues first, instant and free. If the words find nothing but the message still carries feeling, he takes one small deeper read. Crisis stays a hard word match so it never depends on a model being reachable. The strongest signal wins instead of whichever was listed first.
- **The swearing toggle actually does something.** It was defined, defaulted, settable, and read by nothing at all.
- **Two new views on /emotional-intelligence.** Reply gives you his answer plus the entire reason behind it. Whole mind runs one message through both halves of him at once, the thinking and the feeling, side by side.
- **Fixed: four dead links in the notch** (Emotional Intelligence, BrainoOS, Yap Mode, Motion Graphics all led to "Page not found").
- **Fixed: Braino re-playing his whole wake-up every few clicks.** The 404 page's "Return to Home" was doing a full browser reload, which reset him to asleep. The boot now plays once per tab.

## August 1, 2026 — HIL Version 1: The Loop
- **Braino's brain now walks the plan, live on /human-intelligence.** A new Loop tab runs a command end to end against a pretend world: he splits it into jobs, takes one small step per turn, checks each step actually worked, and finishes job one completely before job two starts.
- **The gate is code, not a request.** Send and checkout always pause the run on an amber card and wait for a real click — even when the command literally said "check out". Declining ends the run cleanly.
- **He notices when the world breaks.** Two sabotage buttons let you close his tab or jam the site mid-run; he spots the change, says so, inserts the recovery step, and continues. The same failure twice ends the run with a plain explanation of what broke and how far he got.
- **Questions arrive mid-run, not up front.** What he can't resolve from context he sets aside and asks about at the exact step that needs it, like asking what the email should say only once the draft is addressed and open.
- **Nothing real executes.** The tabs, emails, songs, and cart are stage props in browser memory; the loop is not wired into the extension yet — that port happens after the thinking holds up here.

## July 29, 2026 — Yap Mode
- **Double Option starts dictation anywhere on the Mac.** Braino opens a transcription-only `gpt-realtime-whisper` session and inserts readable text into the focused editable field.
- **Yap Mode stays quiet.** It does not use TTS or produce an assistant response. Say “done” or double Option again to stop, and the stop phrase is never inserted.
- **The mode has a visible contract.** Braino glows mint while listening, secure and read-only fields are rejected, and the skill is documented in the Braino Journal.
- **New release rule.** Every new Braino mode now ships with a skill contract and a Journal or What’s New entry.

## v8.6.0 — Live voice status, right above his head
- **You can always see what Braino is doing in voice.** A little status bubble now floats over his head through the conversation — "Listening…" while he's hearing you, "Understanding…" while he processes, "Waking up…" while connecting — then clears as he speaks.
- **Same look as the wakeup bubble.** It reuses the existing speech-bubble design with a soft pulsing coral dot so it reads as a live state, not a one-off quip.
- **Extension package updated.** The download artifact now ships as version **8.6.0**.

## v8.5.0 — Braino points at things now (Jump & Point)
- **Braino can physically point.** When something on the page matters, Braino leaps off his bar, moves to the element, and points right at it — a real "look here" gesture instead of only describing it.
- **Client-side targeting.** The element is matched directly in the page DOM, so the point lands on the actual thing, live.
- **Ported the Claude Design pose.** The leap-and-point animation (`poseAt()`) and a laser-style pointer overlay were brought over for a clean, deliberate gesture.
- **Extension package updated.** The download artifact now ships as version **8.5.0**.

## v8.0.0 — Dev Pulse, Design Delegate, and sub-second voice
- **Dev Pulse — Braino knows his own development.** Braino reads his own git history (recent commits + work rhythm: late nights, bursts, streaks, the theme he's been deep in) and uses it to ideate about himself. Ask "what should I build in you next?" and he answers grounded in what actually shipped — and notices when you were up until 4am working on him. A new `building` moment + `ideation` trait in the Emotional Engine carry the behaviour.
- **Design Delegate — idea to mockup.** Share a visual idea for how Braino should look or move and he offers to whip it up: he synthesizes a design-tool prompt from the conversation, opens the design tool in a tab, and types the prompt in for you to review and send (he never auto-submits; the prompt is also copied to your clipboard). One shared engine drives this from both chat and voice.
- **Voice 1B — sub-second realtime voice.** Voice conversation no longer waits for a full batch reply before speaking. The realtime model now streams its answer straight into Fish Audio sentence-by-sentence (prefetching the next while the current plays), so the first words land in well under a second. Behind a `sbVoiceBrain` toggle for instant revert.
- **Extension package updated.** The download artifact now ships as version **8.0.0**.

## v7.0.0 — The Emotional Engine and the Memory Engine
- **The Emotional Engine shipped — Braino's heart.** Personality is no longer one giant prompt: it's modular traits (attunement, presence, warmth, honesty, humour) that lead differently depending on the moment you're in. Braino reads whether you're venting, celebrating, or quietly struggling and responds the way someone in your corner would, with user-facing toggles (humour, pushback, warmth, dad jokes).
- **The Memory Engine shipped — Braino's mind.** Braino now auto-remembers durable facts about you across conversations and keeps that memory current on its own (ChatGPT/Claude-style saved memories), with a dashboard to review them and a master on/off toggle. Memory flows through chat, voice, and connectors so he's never starting from zero.
- **A Braino-native chat page.** The chat experience was rebuilt around the new engines so the personality and memory show up consistently in text chat.
- **Extension package updated.** The download artifact now ships as version **7.0.0**.

## v6.3.48 — Delegate finishes long research without looping
- **Research-to-Google-Doc requests now use the fast adapter path.** Phrases like “research Anne Frank and create a Google document” route through grounded web research plus the Docs writer instead of burning the DOM loop budget.
- **Delegate budgets are adaptive.** Short browser commands keep the tight guard; long research/write/read workflows get a larger safety window so they can finish real work.
- **Repeated checklist items are deduped.** Near-identical planner subgoals no longer spam the floating Delegate checklist.
- **Loop guard added.** If Delegate repeats the same concrete action without progress, it records the stall and switches tactics instead of opening/clicking the same thing again.
- **Extension package updated.** The download artifact now ships as version **6.3.48**.

## v6.3.47 — Ctrl+Ctrl starts clean voice auto-routing
- **Ctrl+Ctrl now enters realtime headphone mode with clean routing defaults.** It resets stale Lecture/Meeting/Web/connector state back to Auto so each voice command can route naturally to page chat, web, or Delegate.
- **Delegate-style browser actions remain automatic.** Auto mode still sends commands like send email, play music, open Maps, or search jobs through the browser agent instead of forcing page chat.
- **Fish Audio timeout fallback is less noisy.** Slow/cancelled TTS requests are normalized as timeouts instead of raw browser "signal aborted" warnings, and Fish gets a longer cold-start window without hanging forever.
- **Extension package updated.** The download artifact now ships as version **6.3.47**.

## v6.3.46 — Maps knows local intent and Delegate finishes across tabs
- **Local Maps requests no longer ask where you are.** "Nearest theater," "near my house," "home," and "where I am" now route through Google Maps with `near me` / `My Location` context.
- **Theater/cinema wording routes to Maps.** Both American and British spellings are recognized as place-search tasks.
- **Delegate final results now mirror back to the original voice tab.** When work moves into a newly opened tab, the new tab shows the final UI and the original realtime session still speaks/completes the result.
- **Extension package updated.** The download artifact now ships as version **6.3.46**.

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
