# Maven launch film

**Type:** Product
**Platform:** Website (/maven-teaser, /maven-film redirects to it)
**Status:** MVP
**Released:** October 28, 2026

## The simple version

A kinetic launch film for Maven. One line of text at a time in the middle of a black frame, SF Pro. Between the lines, only the real Maven pill plays.

## Why it exists

Maven is out on Mac and needs a film people can watch in under a minute and a half and understand completely.

## How to use it

Open /maven-teaser. It is a straight clone of /dontblink (IntroTeaser.tsx): same engine, cuts, beat sync to surkin.mp3 and recorder. Only the words changed and the notch is replaced by the Maven pill.

## The script (40-second cut, 2026-10-29)

You talk faster than you type. So why are you still typing? Meet Maven.
(pause, then the pill forms: a golden line draws its outline, it fills, the eyes open from a line)
Hold a key. Talk. It's already written. (the pill listens, then goes green)
No "umm". No "like". Works anywhere you type. Even in Hinglish.
(the Do flow: "Tell Rahul I'm running late" in the bar, the card, Sent.)
Maven. (cut to black)

Every graphic sits dead centre of the frame.

## Honest limitations

- The Do bar's "Rahul / WhatsApp / Running late, be there soon." is example copy.

## Technical shape

- `src/pages/MavenTeaser.tsx`: clone of IntroTeaser.tsx with the Maven script; the notch's hype/lifecycle/boom/tag/bigger scenes are parked past the end. The pill plays on a canvas (`.mvt-pill`) in the gaps after Meet Maven, Talk, Already clean, Anywhere you type, It gets it, Right forever, in the boot slot (Do flow) and the wink slot.
- `src/pages/mavenFilmGraphics.ts`: the pill beats (wake, listen, done, spots, takes, curious, send, rest), ported 1:1 from `mac/maven/renderer/island.css` + `island.js`.

## Product or design decisions

- Graphics are pill only, black frame. No text, windows, apps or keys inside graphics (Itish, 2026-10-28: the window/desktop version read as AI slop).
- Match cuts follow /dontblink: type., still typing?, Meet Maven., Already clean., halfway?, Hinglish., once., forever., thing., late.", Mav+en.
- Same day: the /maven homepage intro was cut to just the pill with "Meet Maven" above it, and "What is Maven?" now comes before the product preview.
