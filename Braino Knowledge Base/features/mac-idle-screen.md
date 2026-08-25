# The idle screen: the face the Mac wears when you are not there

**Type:** Feature
**Platform:** Braino for Mac, and `/wallpaper` on the website
**Status:** MVP
**Released:** August 26, 2026

## The simple version

Leave the Mac alone for five minutes and Braino puts a screen up: the date, a
very large clock, and a row of round buttons underneath for the few things you
actually reach for. Touch anything and it is gone. Press **Shift twice** and it
comes up whenever you want it.

It is his screen, not a picture. Everything on it is drawn: layered gradients
that scale to any display, a film of grain over the top so it reads as a surface
rather than a screenshot of a gradient, and a vignette holding the middle. Five
looks ship with it, from a pale aurora to something almost black, and **they
take turns every ten seconds**, cross-fading over about a second. Long enough to
be a picture rather than a slideshow, short enough that you see a second one
before you look away. Switch it off in Settings and it holds the one it is on.

## Why it exists

A Mac left alone shows you a photograph of a mountain. That is a beautiful
nothing. The moment a machine has an assistant living on it, the empty screen is
the most valuable surface it has: it is the only time nobody is using it for
anything else.

So this one has a clock big enough to read across a room and the four things
Braino does without being asked twice underneath it. The reference is the iPhone
lock screen, deliberately, and the one thing we did not copy is where the clock
sits. The phone puts it in the upper third. On a display three times as wide
that strands it, so it is centred here.

## How to use it

- **Shift twice** puts it up, anywhere on the machine, on whichever look is next
  in the rotation.
- **Leave the Mac alone.** After five minutes it comes up on its own. That
  interval is yours to set, or to switch off, in Settings.
- **Say it.** "Braino, put up the idle screen." "Show me the lock screen." "Close
  the screen saver."

Anything at all sends it away: a key, a click, moving the mouse if it came up by
itself. Escape works too, and is claimed globally for exactly as long as the
screen is up, because a surface that covers every display and floats over
fullscreen apps has to be dismissable no matter what has focus.

## The row under the clock

Four ship, and they are things Braino does himself: **Speak** (opens voice),
**Ask** (summons him), **Play** (starts or pauses what is playing, and is the
only one that does not send the screen away, because music under a clock is
exactly the thing you want without leaving), and **Braino OS**.

Everything after that is yours. Add up to eight in total, each one any link, and
it appears with that site's own icon, or an emoji if you would rather. Edit them
in **Settings → Idle screen** in the Mac dashboard, or in the same place on the
website dashboard.

Deleting every row is treated as a bad edit rather than a preference: the four
defaults come back, because nobody wants a clock sitting on nothing.

## How it works

There is no second window. The screen is drawn into the transparent full-display
window the notch already lives in, the same way Braino OS is, so it costs
nothing while it is down, needs no network, and works with the wifi off. The
surface is `mac/braino-mac/renderer/wallpaper.js` and `wallpaper.css`, a
deliberate port of the `/wallpaper` page on the site so the two never drift.

The appearing-on-its-own part is a poll, not an event, and that is the point:
macOS tells you how long the human has been away
(`powerMonitor.getSystemIdleTime()`), and the moment they are back the screen
has to be gone. Only the screen that came up by itself goes away by itself; if
you asked for it, moving the mouse is not a request to close it.

It never covers work in progress. The watch stands down while Braino OS is up,
while dictation is running, while a meeting is being recorded, and while the
teleprompter is presenting.

## Boundaries

- **Settings live on the machine**, in
  `~/Library/Application Support/Braino Mac/idle-screen.json`. The website
  dashboard edits its own copy in local storage for now, so the two lists are
  not yet the same list. Moving them into the account is a change of storage,
  not of meaning: the shape is already the shape a row in Supabase would have.
- **Favicons are fetched from Google** when a link has no emoji. Everything else
  on the screen is drawn locally.
- **No model runs here.** The idle screen never calls anything; it is a clock
  and a row of buttons.

## Shortcuts this moved

The launch film was on Shift twice. The idle screen is the thing you reach for
daily and the film is a party piece, so the one-key press went to the screen and
the film moved to **Command Shift L**.

## Tests

`tests/mac-idle-screen-intent.test.mjs` — what counts as asking for it, and
proof that none of it takes a sentence meant for the other feature that owns the
word "wallpaper" (setting the actual macOS desktop background).

`tests/mac-idle-screen.test.mjs` — the screen is drawn in the app and fetches
nothing, it ships with the app, there is always a way out, one key opens it and
the film moved off that key, it never covers something that is running, and a
bad save never leaves the clock sitting on nothing.

## Real-device checklist

1. Shift twice: the screen fades up over everything, clock centred, seconds
   ticking.
2. Any key, and it is gone. Escape, and it is gone. Click, and it is gone.
3. Leave the machine five minutes: it comes up. Touch the trackpad: it goes.
4. Start a recording, then wait: it stays down.
5. Settings → Idle screen: add a link, watch the favicon appear, press Shift
   twice and see it in the row.
6. Press Play on the screen: music starts and the screen stays up.
