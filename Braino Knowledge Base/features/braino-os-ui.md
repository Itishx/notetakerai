# Braino OS UI: the thing itself, looked at directly

**Type:** Feature
**Platform:** Braino website, `/os`
**Status:** MVP
**Released:** August 24, 2026

## The simple version

Every version of Braino runs on the same four systems. The mind reasons, routes
and decides. The heart feels, and colours everything the mind says. The ears
listen, always, before anything happens. The memory keeps what matters and lets
the rest go. Together they are Braino OS.

`/os` is the one screen where you see that instead of the face it wears. A
living mass of blue filaments turning slowly in the dark, burning white at the
centre, with signals firing along the strands between the four systems. Braino
talks from inside it, in his own voice, and the mass reacts while he does.

You can go into it. Click a system, or say "show me your memory", and the camera
flies in and the other three fall away. Scroll to go further. Escape pulls back
out.

## Why it exists

Braino was a cute name for a mascot. The thing underneath got serious, and there
was no way to show anyone what it is. Architecture diagrams are the usual answer
and they are the wrong one: boxes and arrows describe a system without
communicating that it is running.

The reference is Ultron in his pure form in *Age of Ultron*: an intelligence
with no body, only structure and light. That is the honest picture of what
Braino OS is, so it is the picture we drew.

## How to use it

1. Go to `/os`.
2. Press Ctrl twice to talk. Braino answers as the system itself.
3. Click a system, or ask for one by name, to fly inside it.
4. Scroll to zoom. Escape, or **PULL BACK**, to come out.

Spoken navigation is handled on the page rather than sent to the model, so
asking for the heart moves the camera immediately instead of after a round trip.

## What it does

- Draws roughly 4,700 nodes and 12,000 filaments in 3D, turned in real time and
  projected with perspective, at 60fps.
- Breathes. Every node runs on its own clock, so the mass never pulses as one
  slab, and the whole thing leans into the light when Braino is thinking.
- Fires signals along real filaments. A pulse walks the graph from one system
  toward another, lighting the strands it crosses and leaving a decaying tail,
  rather than sliding a dot down a straight line.
- Flies into a system on click or on command, and slows its own rotation while
  you are inside so it reads as leaning closer rather than being spun.
- Talks through the same Fish voice as everywhere else, using `chat-about-notes`
  with a context that tells him he is speaking as the system.

## Technical shape

- `src/components/brainoOS/osGraph.ts`: builds the body. Deterministic seed, so
  the shape of Braino OS is the same every time you open it. The outline comes
  from nine randomly placed swellings rather than trigonometric lumps, because
  periodic lumps produced something that read as a snowflake.
- `src/components/brainoOS/OsCloud.tsx`: draws it. Additive compositing, edges
  batched into six brightness buckets and stroked once per bucket, and a bloom
  pass that copies the frame down to quarter resolution, blurs it and adds it
  back underneath itself.
- `src/pages/BrainoOS.tsx`: the HUD, the voice, the camera commands.

## Honest limitations

- It is a website page. The Mac app and the extension cannot open it yet, so
  saying "show me what Braino OS looks like" to Braino anywhere other than this
  page does nothing. That is the next piece.
- What is inside each system is a written list of its real parts, not live
  state. Nothing on this screen is reading what the engines are actually doing.
- The four systems are placed by hand. Their positions say nothing about how
  the code is actually organised.
- Bloom is done on the CPU through a canvas filter. It holds 60fps on an
  M-series machine with hardware acceleration and degrades badly without it.

## What comes next

1. Let the Mac app and the extension open this on command, full screen.
2. Feed it live state, so a firing signal means a real one.
3. Let a system light up when it is genuinely the one working.
