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

Three ways in, because you do not always want to say it out loud.

- **Say it.** "Braino, show me what Braino OS looks like." Or go straight to one
  of the four: "show me your mind", "let me see your heart", "take me inside
  your memory". On Mac this takes the whole display.
- **Command Shift O**, anywhere on the machine, from the Mac app.
- **Command O**, anywhere on the website.

Once it is open: press Ctrl twice to talk, click a system or ask for it by name
to fly inside, scroll to zoom, and **PULL BACK** to step out of one system
without leaving.

Three ways out of the surface itself, none of which depend on the others,
because something that covers every display and floats over fullscreen apps has
to be dismissable no matter what: **Escape**, the **LEAVE** control in the top
right, or **Command Shift O** again.

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
- `src/pages/BrainoOS.tsx`: the HUD, the voice, the camera commands. Reads
  `?system=` and `?voice=1`, which is how the Mac app says where to land and
  whether he should already be listening.
- `mac/braino-mac/braino-os-intent.cjs`: the spoken phrases, with its own tests.
  A sentence that takes over the whole screen has to be certain, so only the
  possessive and article forms count: "show me your heart" opens it, "put your
  heart into it" does not.
- `mac/braino-mac/renderer/braino-os.js` and `braino-os.css`: the surface on
  Mac, drawn into the transparent full display overlay Braino already owns
  rather than in a browser. Same geometry and same drawing as the website, kept
  deliberately identical so the app and the browser are never two different
  pictures of the same anatomy.
- `mac/braino-mac/main.cjs`: `setBrainoOsSurface` takes focus and mouse events
  for the overlay while it is up and gives both straight back afterwards. There
  is no second window and nothing is fetched.

## Honest limitations

- The Chrome extension cannot open it yet. Mac and the website can.
- On Mac it is drawn by the app, so it works with the network off. The first cut
  opened a browser window pointed at the website route, which was a web page in
  a frame rather than Braino, and needed the wifi to show you what he is made
  of. That is gone.
- The geometry exists twice, once in TypeScript for the website and once in
  plain JavaScript for the Mac renderer. They have to be changed together.
- The global shortcut is Command Shift O rather than a bare Command O. Taking
  Command O globally would steal Open from Finder, from Chrome and from the
  editor. Inside Braino's own windows, and on the website, the bare Command O
  works.
- What is inside each system is a written list of its real parts, not live
  state. Nothing on this screen is reading what the engines are actually doing.
- The four systems are placed by hand. Their positions say nothing about how
  the code is actually organised.
- Bloom is done on the CPU through a canvas filter. It holds 60fps on an
  M-series machine with hardware acceleration and degrades badly without it.

## What comes next

1. Let the Chrome extension open it too.
2. Feed it live state, so a firing signal means a real one.
3. Let a system light up when it is genuinely the one working.
