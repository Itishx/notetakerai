# AffectiveOS Memory: Capture, Digest, Recall

**Type:** Technical
**Platform:** AffectiveOS on the Mac (runs inside the Braino Mac app for now)
**Status:** MVP
**Released:** 2026-09-24
**Updated:** 2026-09-27 (Memory window redesigned)

## The simple version

AffectiveOS is the part that remembers. Braino is one of the things that will read it. Step 1 is capture: while you use your Mac, a quiet log writes down what you're doing, as text, on your Mac:
- which app and window you're in, and for how long
- the text on your screen when it changes
- your open tabs and what's playing
- your Claude Code conversations
- everything you say to Braino, by voice or typing

Every hour, the layer turns that into memory:
- a short summary
- the main blocks of the hour, with the names you'd search for
- loose ends
- facts worth keeping for good

Braino can use it. Ask "what was that movie site I was on at 2am?" and he answers. Ask him to open it and he does. If two sites fit, he asks which.

You see all of it in its own window, **AffectiveOS Memory**, and one switch there decides whether Braino may use it.

## Why it exists

Braino's memory was half built: only website text chat saved anything. The Mac read your context every few seconds and then threw it away. "Remembers" is one of the two missing verbs, and it belongs to the layer, not to Braino. It has to work even if you never talk to him.

## How to use it

- **Open it:** say "Braino, open memory" (or "what have you been saving?"), or run `npm run mac:memory`.
- **The window has two views**, Map and Read, switched at the top. There's also a day picker (Today, Yesterday, then weekday names) and a pill that says **Remembering** or **Paused**. See "The Memory window" below.
- **Forget:** "Delete this day" in Your controls, or ✕ on any row in the raw record.
- **Pause:** the Pause button, or say "pause memory" / "resume memory". `BRAINO_ACTIVITY=0` turns it off entirely.

## What Braino knows or does

The layer records:
- **Focus:** app, window title and URL each time they change, with how long the last one was in front.
- **Screen text:** read on the Mac by Apple's own text recognition when the window changes (at most every 20 seconds), and again every minute while the same window stays in front. **The screenshot is deleted straight away. Only text is kept.**
- **Tabs:** the Chrome tabs you have open.
- **Playing:** the track, with its link.
- **Conversation:** everything you say to Braino and everything he says back, through any channel on the Mac.
- **Braino tasks:** what you asked and whether it worked.
- **Claude sessions:** which Claude Code conversations changed, so the digest (step 2) knows which to read.

## Digest and recall (added the same day)

- **Every completed hour** is condensed on the Mac. The condensed hour includes:
  - what was in front and for how long
  - screen text
  - tabs, music, and what you and Braino said
  - who messaged, with the text only for people you marked important
  - your Claude Code conversations from that hour
- That condensed hour goes to `memory-digest`, which returns the summary, blocks, loose ends and facts.
- **Facts go into `braino_memories`** through the memory engine, so they're de-duplicated like every other memory.
- **Summaries stay on the Mac permanently.** The raw day still goes after 7 days.
- **Recall:** HIL uses the `memory_search` tool. It works out the time window from "now", finds candidates in the local log, and `memory-recall` picks what answers the question.
  - One clear match: he does what you asked and says which.
  - Several matches: he asks which, in one line.
  - "What was…": he answers and offers to open it.
- **Braino also knows today in general.** The last few hour summaries are added to his conversation and HIL context, so "what have I been doing today?" works without a tool.
- **Memory window additions:**
  - the day's summaries (loose ends, and facts kept for good)
  - "Summarise the last hour"
  - an "Ask your memory" box
  - the **Braino can use this** switch, on by default

## The Memory window (redesigned 2026-09-27)

The first window was hard to understand. It was a wall of counts and rows. So now it shows the same day two ways.

### Map

A live map of your day, drawn like neurons.
- **You** are the white dot in the middle.
- **Just around you, pink:** the things Braino remembers about you for good, grouped by topic (Work, People, Preferences and so on).
- **The next ring:** the hours of your day. The first hour is at the top, then clockwise.
- **Outside:** everything you touched, wired to the hours it happened in.
  - apps: blue
  - websites: teal
  - people who messaged on WhatsApp: coral
  - music: purple
  - Claude Code projects: amber
  - talking to Braino: green
- **Bigger dot** means more time, or more often. Little signals travel along the connections.
- **Drag** to move, **scroll** to zoom.
- **Tap any dot** and a side panel explains it in plain words, like "You had Terminal open for 1h 22m today around 9 AM, 10 AM...". It lists what that dot is connected to, and you can tap those to jump.

### Read

The same day, in words, top to bottom.
- **Ask your memory** box at the top.
- **Your day, hour by hour:** the hour summary if one exists. If not, a plain sentence like "Mostly in Chrome and Cursor. Mom messaged. Played Do Din Ki Zindagi."
- **Where your time went:** a bar per app.
- **What I know about you:** the facts kept for good, grouped by topic.
- **Your controls:** Braino can use this (on or off), Pause remembering, Delete this day.
- **The raw record,** moment by moment, folded away at the bottom. Still searchable, and you can delete it row by row.

### Honest limits of the window

- WhatsApp message text is never copied here. Only that someone wrote.
- Everything stays on this Mac for 7 days. Facts kept for good stay until you delete them.
- The map only shows the day you picked.
- Not yet tested on a very busy day with hundreds of things. The raw list shows at most 400 rows.

## Honest limitations

- **The raw hour does go to the model to be summarised.** It isn't stored on the server, and nothing about it goes to `/engine-log`, which is a public page. Only the summary and facts are kept, and only counts are logged.
- **Recall looks back 7 days in detail**, because that's how long the raw log lasts. Older questions rely on the hour summaries.

- **Not tested live yet.** The text reader was tested on a real screenshot: 0.5 seconds once warm, and the first run takes about 13 seconds while the model loads. The full capture loop hasn't run on your Mac.
- **It needs Screen Recording permission for Braino.** Without it, screen text comes back empty. Everything else still works.
- **Web and Chrome extension conversations are stored on the server, not in this local log.** The viewer shows the facts the server already remembers, but not every web message.
- **It runs inside the Braino Mac app process,** because that app holds the permissions. It can become its own background app later.
- **Skipped as private:** password managers, banking, incognito and private windows, and any app you add. Nothing else is filtered yet.

## Technical shape

- `mac/braino-mac/activity-log.cjs`: pure capture rules.
  - `isPrivate` and `isSelf` run before anything is written, and before any screenshot is taken.
  - Duplicate and unchanged screens are skipped.
  - One JSONL file per day in `~/Library/Application Support/Braino Mac/activity/`.
  - `prune` enforces the 7-day retention.
- `mac/braino-mac/native/BrainoScreenText/main.swift`: reads the text in an image with Vision's `VNRecognizeTextRequest` (English and Hindi). Build it with `npm run mac:screentext:build`.
- `mac/braino-mac/main.cjs`:
  - `startActivityCapture` runs the 5-second focus poll and `captureScreenTextForActivity` (`screencapture -R` on the front window, read, delete).
  - `scanClaudeSessionsForActivity` runs every 5 minutes.
  - Hooks feed it from `checkAllTabsSnapshot`, `pollNowPlaying`, the delegate handler, and `logInteraction` (every conversation).
  - `routeHilFirst` handles the voice switches.
  - `openMemoryWindow` opens the viewer, backed by the `braino-mac:activity-*` IPC handlers.
- `mac/braino-mac/renderer/memory.html` and `memory.js`: the viewer. Since 2026-09-27 it has a Map view (a live neuron graph: you, facts, hours, then apps, sites, people, music, Claude projects and Braino talk, linked to the hours they happened in, with drag, zoom and a tap-to-explain side panel) and a Read view (ask box, hour by hour, time per app, facts by topic, controls, raw record capped at 400 rows).
- The terminal shows `🧠 MEMORY`, `🧠 FOCUS` and `🧠 SCREEN` lines.

## Update, 29 Sep 2026: the memory card, and "what did she text me?"

**The memory, split screen.** The window is now in the Affective house style (warm paper, dark ink, Iowan headings, one colour per kind, its own dark theme), solid instead of see-through glass. Tap any dot and the window splits: the map on the left, the memory on the right, full height:
- The memory in the middle, with the memories it is connected to fanned around it. An app or website is connected to everything that happened in the same hours: Chrome sits next to GitHub, Porter and Mom's message. Direct links are bright, same-hour links softer.
- Tap any of them to walk there. The map glides along, and a trail at the top (You › 2 PM › Chrome › github.com) takes you back.
- Below: a "When" strip of the hours, then every connection grouped by kind, each with a line saying how they are linked ("Together at 2 PM and 4 PM") and a bar for how strongly.

**WhatsApp recall.** When the notch shows an important WhatsApp message, Braino's chat now knows what it said (kept in memory for 2 hours, never written to disk, the same 160 characters the notch shows). So "what did Ilu text me?" gets the message, not "you never told me". And a name the ear misspells ("Elu" for "Ilu😍") still finds the sender, by picking the recent sender one letter off.

Limits: the card shows the 12 strongest links in the drawing and all of them in the list. Recall only covers messages from people marked important, since only those reach the notch; the WhatsApp lookup still works for everyone.

Technical: `renderer/memory.js` (`relatedOf`, `renderWeb`, `renderTrail`, `glideTo`), `renderer/memory.html`. `main.cjs`: `noteNotchWhatsApp`, `notchWhatsAppLines` (added to `runMacConversation`), `waSoundsLike` fallback in `lookupWhatsAppMessages`. Test: `tests/mac-whatsapp-notch-recall.test.mjs`.

## Update, 29 Sep 2026 (later): sorted, so you can read it

The first map wired every app, site and person to the hour it happened in, and every hour was a dot. With Chrome as most of any day, it became one giant dot tied to everything. It was unreadable.

**Map, now:**
- Two halves. **Today** on the left, **What I know about you** on the right, You in the middle.
- Today is sorted by what you were doing: Building, Study, Messages, Social, Watching & listening, Errands & shopping, Talking to Braino, Everything else. Each is a hub with its time, and its things fan out around it, biggest nearest.
- A website counts as itself: Netflix is Watching, GitHub is Building, LinkedIn is Social. Chrome is no longer a thing on its own.
- The hours left the map. They are a strip along the bottom, each hour coloured by what you were doing in it. Tap an hour to light up what happened then.
- What it knows is sorted into Who you are, Your work, Your people, What you like, Coming up and Other things. Facts learned that day get a ring.
- Fixed places, not physics: the same day always looks the same.
- **Paper | Mind** switch in the header. Mind is the Braino OS look: near black, cyan, a grid, mono type.

**Read, now:** Your day at a glance (one sentence, a bar by category, the hour strip), What Braino knows about you (Learned today first, then a card per group, written as "You live in Bengaluru" instead of "User lives in Bengaluru"), Where your time went (each category opens to its things), then hour by hour, each tagged with what it mostly was.

Limits: categories come from a fixed list of apps and sites (SITE_RULES / APP_RULES in memory.js); anything unknown goes to Everything else. Messages, songs and talking to Braino are counted, not timed. A hub shows its 18 biggest things on the map, all of them in its panel.

**Same day, later:** every panel shows its connected-memories diagram again (a group shows its things, an hour what happened then, a fact the others in its group, You every group). The map's list sits in a readable "Today / What I know about you" card. The bottom strip is now the day in words: stretches of one activity merged ("Building, 9 AM to 11 AM"), each tappable. Everything in Read (facts, time items, hour chips) opens on the map. The map names only the three biggest things per group until you open one, and shows at most 10 per group (all of them in the panel).

**Neuron look (same day):** from the "Neurones" poster Itish shared. Wires are grown, not ruled: each group has a trunk out of you that splits into its things, every memory sprouts fine dendrites with bright tips, and You bursts in the colours of the day. Seeded by each memory's name, so the same day grows the same tree. Glows in Mind and dark; soft ink on Paper. Picking a memory fades every other strand. Names have a halo so fibres never cross words. Code: `grow`, `nerve`, `dendrite` in `renderer/memory.js`.

**The Mind look is now the Braino OS body (same day, latest).** Itish: use the exact "show me your mind" panel, with the memory in it. `renderer/memory-mind.js` ports braino-os.js's anatomy (filament mass, seeded, spinning, bloomed, signals walking real filaments) and replaces its four fixed systems with the day's groups (Building, Watching, Messages... and What I know). Each group is a lobe; its memories are the bright cells in it. Scroll in and every memory gets its name; tap a group and the camera flies into it and the whole body takes its colour; tap a memory and it opens in the same split panel. **Play my day** (bottom strip) walks the day stretch by stretch: flies to the lobe, lights what was used, captions it ("9 AM to 11 AM · Building · Cursor, GitHub"). Mind is the default look; Paper keeps the simple rotating circle with your photo in the middle (from the Google sign-in picture, initials otherwise). Photos of the day are not in yet: the source is still to be chosen.

**Photos (same night).** Itish chose Apple Photos. "＋ Today's photos" on the day strip exports up to 8 of that day's photos, spread over the day, as small JPEGs into `~/Library/Application Support/Braino Mac/memory-photos/<day>/` (and quits Photos if it was not already open). Only that button touches Photos; opening the window reads the saved copies. They show as a Moments strip at the top of the map (tap one to open the part of the day it was taken in), a thumbnail on each part of the day strip, a "Photos from then" grid in the panel, the Play my day caption, and a strip in Read. The first press asks macOS for permission to use Photos. Code: `fetchMemoryPhotos`/`readMemoryPhotos` in main.cjs, `renderMoments` in memory.js. Test: tests/mac-memory-photos.test.mjs.

**Skills (same night).** A plan is saved as a skill only if the sentence is 12 words or fewer and one sentence, with no question in it (SKILL_MAX_WORDS in main.cjs). The two long ones saved on 29 Sep (an 81-word Hindi ramble, a 60-word overheard conversation) were removed from skills.json; a backup is next to it.

**Your world (30 Sep 2026).** Itish: "it is your world, so make it look like Earth", and move it like the Google Maps globe. The Mind look is now a night Earth (`renderer/memory-mind.js`): dim continents of light, latitude and longitude, an atmosphere, stars. Each group of the day is a glowing region of city lights in its colour; its memories are the cities, named when you get close. Memories that happened in the same hours are joined by flight arcs that keep flying. Drag turns the globe any way with momentum; scroll zooms towards the point under the pointer; double-click flies in; left alone for a few seconds it turns slowly by itself. Tap a region to fly there, a city to open it in the split panel; the recap and hours fly the globe too. The earlier filament body is replaced (backup in the session scratchpad, not in the repo).

**Back to a brain (30 Sep 2026, later).** Itish: a globe makes no sense, keep the brain but with the globe's handling, and dress Mind in the Paper theme, not the monospace HUD. `memory-mind.js` is the Braino OS body again (lobes = groups, bright cells = memories, signals walking the filaments) with globe controls: drag turns it any way with momentum (Shift-drag pans), scroll zooms towards the pointer, double-click flies in, it turns by itself when left alone, and tapping a lobe or memory turns it to face you and flies in. Both looks now share the Paper theme (warm paper and ink, Iowan names, the site's colours); on paper the mind is drawn in ink, in dark mode it glows. The monospace Mind tokens are gone from memory.html. Names never sit under the day strip or the Today card; a picked memory is always named.
