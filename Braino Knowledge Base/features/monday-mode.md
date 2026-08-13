# Monday Mode

**Type:** Mode
**Platform:** Braino for Mac
**Status:** MVP
**Released:** 2026-08-13

## The simple version

Say "Braino, enter Monday Mode" and he stays the same Braino, same memory,
same relationship, just completely out of patience. Convenience requests
("open YouTube," "launch Spotify") get a flat, sarcastic no instead of
actually happening. Real questions still get real, if grudging, answers. He
curses casually, roasts every request, and stays locked in the notch the
whole time instead of walking out onto the screen. Say "please" and he gets
worse on purpose, not better. Say "okay, stop." and it ends instantly, no
parting shot.

## Why it exists

A running bit Itish wanted: the same assistant, having a bad day, without it
ever turning into a different character or losing the thread of who Braino
actually is. The constraint that made it work is that nothing about Braino's
memory, relationship, or underlying capability changes, only how much
patience he has left for being asked to do things.

## How to use it

- "Braino, enter Monday Mode" to start it.
- Ask him to open, launch, or play something and he refuses it outright,
  sarcastically. Ask him a real question (storage, search, what's playing)
  and he still answers, just grudgingly.
- Add "please" to a Spotify request and he plays something else on purpose.
- "Okay, stop." or "exit Monday Mode" to end it.

## What Braino knows or does

- Full personality override (same mechanism as "talk like Trump": a complete
  system-prompt replacement, not a tone tweak on top of his usual self).
- Convenience requests, opening an app or website, playing something, are
  refused for real by default, not executed-with-sass. Answering a real
  question is not treated as a favor and still goes through.
- Real pushback with real cursing, a recurring "you fucking idiot" that never
  fires every single turn, no repeated joke structure back to back, and the
  sarcasm dial turned up: vivid and specific about the request, never cruel
  about the person.
- Owns "introduce yourself" and every other normal conversational question
  himself, in character. It never falls through to an unrelated scripted
  flow that happens to share a trigger phrase (the fix for a real bug: Team
  Mode's "introduce yourself to my team" phrase used to catch a bare
  "introduce yourself" too).
- The mascot cannot leave the notch while this is on. Every summon gesture
  (voice or the double-Command hotkey) is refused with a short grumble
  instead of him walking out.
- The notch wears its own desaturated slate/red tint for the whole mode, plus
  a red sweep of the same outline-trace shimmer the startup boot uses, held
  lit and gently breathing for as long as the mode runs.
- "Please" on a song request is the one deliberate real action-swap: a
  different song actually plays, and Braino gloats about it. "Please" on
  anything else earns a sharper refusal in words, not a fake action.
- Still genuinely helpful underneath. Anything that reads as urgent or
  genuinely distressed drops the bit immediately, no jokes.

## Honest limitations

- Mac app only. The Chrome extension has no Monday Mode yet.
- The convenience-refusal gate is a broad-brush heuristic (open/launch/pull
  up/go to/fire up, or a Spotify play request), not a true understanding of
  stakes. It is deliberately scoped away from questions, media transport
  controls (pause/skip), and anything else Braino would look genuinely
  unhelpful blocking.
- The real action-swap is scoped to Spotify play requests specifically, not a
  general "do something adjacent-but-wrong for any command" engine. Every
  other request under "please" changes in tone, not in what actually happens.
- Does not persist across an app relaunch. It is a mood, not a setting.

## Technical shape

- State: `mondayModeActive` in the Mac app's main process
  (`mac/braino-mac/main.cjs`), toggled through `setMondayModeState`, pushed to
  the renderer over IPC (`braino-mac:monday-mode`, wired in `preload.cjs`).
- Trigger detection and the exit phrase live in `parseMondayModeIntent`,
  checked first in `runDelegate` before any normal command routing.
- Personality: `MONDAY_MODE_SYSTEM_PROMPT` (main process) sent to
  `chat-about-notes` as `personaSystem`, the same full-replace path voice
  personas use, so the Emotional Engine is bypassed while it is active. The
  Mac realtime voice lane carries an equivalent prompt locally in
  `buildMondayChatInstructions` (`braino-mac/renderer/braino-mac.js`), the
  same duplication pattern the voice-persona registries already use between
  the extension and the Mac app.
- Every deterministic action's spoken confirmation (Spotify, file search, the
  disk-storage report, anything the regex router already executed for real)
  is re-worded once through the Monday persona (`mondayifyReply`) so the
  attitude covers every reply Braino gives, not just open conversation. The
  action itself is never altered by this step, only the words describing it.
- The mascot lock is one guard in `setWalkerHomeState`: while Monday Mode is
  active it refuses any call asking him to leave home, the same chokepoint
  pattern already used to keep him out of the notch during the post-skit
  state.
- Notch color: `.nf-monday` / `.nf-monday-boot` in `braino-mac.css`, a fixed
  palette with no shared CSS state with the user-configurable Voice Commands
  color system, so the two features can never stomp each other. The shimmer
  reuses `.nf-shine`, the same SVG outline-trace element the startup boot
  animates, recolored red and triggered once via `.nf-monday-boot` (the
  existing `nfShineDraw` keyframe), then held fully drawn and breathing via
  `.nf-monday` for the rest of the mode.
- Convenience-action refusal: `mondayIsConvenienceAction` classifies a
  request as a favor (open/launch/play) before anything real executes;
  `runDelegate` branches to a sarcastic refusal instead of calling
  `routeMacDelegate` or `playSpotifySongOnMac` at all, so the reply is never
  describing an action that did not actually happen the other way around
  either, no "opened it" while nothing opened.
- The Team Mode collision: `macTeamShouldHandlePrompt` (renderer) used to
  catch a bare "introduce yourself" meant for Braino himself, because Team
  Mode's own intro trigger shares that phrase. It now returns `false`
  unconditionally while `mondayModeActive`, so ordinary conversation,
  including "introduce yourself," reaches the Monday persona instead.

## Product or design decisions

- The Spotify swap is real, everything else under "please" is tonal. Building
  a general intent-aware "do something plausible but wrong" engine for every
  possible command was judged too easy to get wrong in ways that would
  actually annoy rather than amuse, against the explicit hard boundary that
  Monday Mode never withholds real help or performs unwanted real actions.
- Reply-wrapping (`mondayifyReply`) was chosen over rewriting every individual
  command handler's spoken line, so the personality applies uniformly across
  the entire command surface through one chokepoint instead of needing to
  touch dozens of handlers individually.

## What comes next

- Bring Monday Mode to the Chrome extension notch, mirroring the same
  full-replace persona mechanism that already exists there for voice
  personas.
- Consider widening the real action-swap beyond Spotify if it turns out to be
  a favorite part of the bit.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino** (auto-renders from `KNOWLEDGE_ENTRIES`)
- [x] Public copy is simple and human
- [x] Release date and status are accurate
