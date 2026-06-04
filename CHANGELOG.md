# Braino Changelog

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

## v4.7.0 — Cursor-Follow Fly Mode + Realtime Voice Daily Cap
- New **fly mode** (Cmd+S): Braino's floating mascot follows your cursor with a smooth lerp animation. Stops when you hover the mascot, open a card, or enter headphone/lecture mode. Cmd+S toggles it on/off.
- Realtime voice sessions now have a **7-minute daily cap** tracked server-side. The edge function gates the OpenAI call before it happens and returns usage info. Client enforces a soft local deadline timer.

## v4.5.0 — Lecture Mode Rebuild
- Rebuilt lecture mode recording UI in the floating card.
- Fixed brain toggle, gaze, and persistent card behaviour during lecture recording.
