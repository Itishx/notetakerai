# Braino Changelog

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
