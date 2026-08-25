# Braino OS wallpapers: eleven pictures, drawn rather than photographed

**Type:** Feature
**Platform:** Braino for Mac, and `/wallpapers` on the website
**Status:** MVP
**Released:** August 26, 2026

## The simple version

Braino has his own set of wallpapers now. Eleven of them, from a pale Aurora to
a near black Obsidian, plus one called Signature that is nothing but his name in
an editorial italic. They are the same pictures the screensaver shows, which is
the whole idea.

Say **"Braino, change my wallpaper"** and he puts one of his on your desktop.
Name one, "set my wallpaper to Obsidian", and he puts that one on. Ask for a
picture of something instead, "set my wallpaper to Spider Man", and he still
goes and finds one, exactly as before.

## Why they are drawn and not downloaded

Every one of these is a stack of CSS gradients, a film of grain, and a vignette.
Nothing is a photograph. That buys three things a picture cannot:

- **It fits any display exactly.** When you ask for one, it is drawn into an
  offscreen window at your screen's own size and captured to a PNG. A 14 inch
  MacBook gets a 2940 by 1912 file; a Studio Display gets its own. Nothing is
  ever upscaled, so nothing is ever soft.
- **It costs nothing to ship.** The whole set is one 9KB JSON file.
- **It can be changed in a line.** A colour, a font, a line of text: one edit,
  both surfaces.

The file is `shared/wallpaperLooks.json`, and it is read by the website and by
the Mac app, so a look cannot mean two different things on two screens.

## What we took from Apple

Their aerials slow down and become the still desktop picture when you log in.
That is the good idea, and it is the one we copied: **the screensaver and the
wallpaper are the same picture**, one of them moving and one of them still. So
there is no separate set to choose from and no mismatch between what the Mac
shows when you walk away and what it shows when you sit down.

We also took the two ways they let you drive it. **Shuffle** goes through
everything. **Dynamic** follows the hour, the way their dynamic wallpaper follows
the sun: Ember at dawn, Aurora and Sequoia in the day, Coral and Dusk in the
evening, Mind and Obsidian at night.

And one thing we did not take: Apple never puts a word on a wallpaper, and they
are right. So Braino OS is signed on these the size of a signature on a print,
at the bottom, at half opacity. The exception is Signature itself, where the
name is the picture.

## The set

| | Family | Best at | The line under the clock |
| --- | --- | --- | --- |
| Aurora | Light | Day | Begin before you are ready. |
| Paper | Light | Day | The quiet part is the work. |
| Coral | Colour | Dusk | Make something today. |
| Dusk | Colour | Dusk | Rest is part of the build. |
| Mind | Dark | Night | Think in public. |
| Obsidian | Dark | Night | Nothing is urgent at two in the morning. |
| Graphite | Dark | Night | Do less, better. |
| Sequoia | Colour | Day | Go outside after this. |
| Ember | Colour | Dawn | Early is a decision. |
| Tide | Colour | Day | Slow is smooth. |
| Signature | Editorial | Night | The name, and nothing else. |

Each look carries its own clock face, not just its own colours: Instrument Serif
on most, Newsreader italic on Dusk, JetBrains Mono on Mind because it is the
Braino OS blue, and SF Pro Display at 300 weight on Graphite because that look is
Apple's own monochrome and wants their face.

## Where you set it

**Settings, in either dashboard**, split into two sections because they are two
different jobs:

- **Wallpaper** is what sits behind your work. Pick one, or turn on "follow the
  hour". Picking one puts it on straight away rather than saving a preference.
- **Screensaver** is what he shows when you are not there. Shuffle all, hold
  just one, or follow the hour; how often it changes; whether the line under the
  clock shows; and how long the Mac has to be quiet first.

Under those sits the row of shortcuts that appears beneath the clock.

## Boundaries

- **The Mac keeps its own copy of these settings**, in
  `~/Library/Application Support/Braino Mac/idle-screen.json`. The website
  dashboard edits its own copy in local storage. The two lists are not yet one
  list; moving them to the account is a change of storage rather than of
  meaning.
- **Setting a desktop picture needs macOS Automation permission** for System
  Events. Without it he draws the file and cannot hang it, and says so.
- **Your own pictures are not in yet.** Everything here is Braino's set. Adding
  your own is the next step.

## Tests

`tests/mac-wallpapers.test.mjs` — the set is whole and every look is drawn
rather than fetched, the lines sound like him (and carry no dashes, which he
never writes), both surfaces read the one file, asking to change the wallpaper
gets one of his while asking for a picture of something still searches, a
wallpaper is drawn once per display and kept, the battery says one of three
things, and both dashboards can set both jobs.

## Real-device checklist

1. Say "Braino, change my wallpaper". The desktop changes, and he names it.
2. Say "set my wallpaper to Signature". His name is on your desktop in italic.
3. Say "set my wallpaper to Spider Man". It still finds a photograph.
4. Say "put my old wallpaper back".
5. Settings, Wallpaper: click Graphite. It lands within a second or two the
   first time and instantly after that.
6. Settings, Screensaver: hold Just One, pick Mind, press Shift twice.
