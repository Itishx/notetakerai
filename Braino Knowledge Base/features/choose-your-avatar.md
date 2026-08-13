# Choose Your Avatar

**Type:** Feature
**Platform:** Braino website (Dashboard Settings), Braino for Mac (reads the choice)
**Status:** MVP
**Released:** July 30, 2026
**Updated:** August 12, 2026

## The simple version

Braino OS is one brain — one voice, one memory, one set of actions. Choose Your Avatar lets you pick which character rides on top of it. Today that's Braino himself, Webb, an original web-slinger acrobat, or Ferro, a red-and-gold flight-suit character who flies around the screen. Whichever you pick shows up talking, walking or flying, and listening everywhere Braino currently appears in the product — same underlying mechanism, different face.

## Why it exists

The Claude Design cast grid ("Braino Cast Grid.html") already sketched six original characters riding the same OS — Braino, Ferro, Wisp, Glam, Webb, Krush, Blip. The picker started with Braino and Webb; Ferro is now the third live character. Pick your character once, and Braino OS carries your voice, memory, and actions over to it. Down the line, more of the cast can join the same switcher.

## How to use it

Open Dashboard → Settings → **Choose your avatar**, and pick Braino, Webb, or Ferro. On Braino for Mac, double-click the desktop mascot to open the same character card directly. Your pick saves to your account, so it follows you between the website and Braino for Mac.

## What Braino knows or does

- Renders whichever character is selected wherever the assistant talks back (chat avatar, voice mode, Mac desktop mascot).
- Talks with the same procedural mouth-open animation mechanism for every character — no separate lip-sync system per character.
- Walks or flies with the same movement loop — Braino and Webb use the walk cycle; Ferro uses a hovering flight pose with glowing hands, feet, and chest.
- Persists the choice to `profiles.mascot`, read by both the website and the Mac app.
- Opening the Mac character picker now parks the mascot in place, so a double-click does not leave him walking and dragging the card along.

## Honest limitations

- Webb only has the poses ported so far: idle, wave, point, talk, walk. He doesn't yet have Braino's full repertoire (climb, moonwalk, expressions, wardrobe accessories).
- Ferro has the Mac desktop walker rig and simple website previews. He does not yet have a full parametric React character rig like Braino or Webb.
- The picker only changes the *live conversational avatar* (the chat page's mascot). Fixed marketing/demo scenes elsewhere on the site (the homepage dance loop, the waitlist mascot, etc.) intentionally stay Braino — they're choreographed specifically around his rig and aren't "your assistant," they're set dressing.
- The Mac app renders the desktop-roaming mascot for Braino, Webb, and Ferro. Some notch-specific mascot clones still use the generic current walker SVG and may need separate tuning for each future character.

## Technical shape

- `supabase/migrations/20260730000001_profiles_mascot_choice.sql` — adds `profiles.mascot text not null default 'braino'`.
- `src/components/WebbChar.tsx` — Webb's parametric rig, ported from the Claude Design `mascot-webb.jsx`, following the exact pattern of `src/components/BrainoChar.tsx` (shared RAF clock, procedural talk-mouth mix, walk-cycle formula).
- `src/components/ferroWalkerSvg.ts` — Ferro's SVG walker rig, with the same driven ids as Braino/Webb so the Mac movement and mouth drivers can animate him.
- `src/lib/mascotPreference.ts` — `useMascotPreference()` hook; reads/writes `profiles.mascot` for signed-in users, falls back to `localStorage` (`brainoMascotPref`) signed out.
- `src/pages/Dashboard.tsx` — "Choose your avatar" Settings card.
- `src/pages/BrainoChat.tsx` — `BrainoMark` renders Braino, Webb, or Ferro based on the preference; the message placeholder and voice-mode status text use the selected character's name.
- `mac/braino-mac/main.cjs` — `loadMascotPreference()` fetches `profiles.mascot` (same authenticated REST pattern as `fetchVoiceModes`), cached to `mascot.json` in `userData` for offline/signed-out launches, exposed on `braino-mac:get-config`.
- `mac/braino-mac/renderer/braino-mac.js` — double-click opens the Mac customizer, parks the mascot in place, hot-swaps the chosen SVG, and gives Ferro a flight pose instead of a walk cycle.

## Product or design decisions

The website Dashboard remains the account-level picker. The Mac app also has a lightweight local card behind a double-click because changing a walking desktop character should be immediate. Both write the same `profiles.mascot` value; the voice, memory, and actions stay unchanged.

## What comes next

Give Ferro a full React parametric rig for richer website animation. Add more of the cast (Wisp, Glam, Krush, Blip) behind the same switcher once each has a movement rig ported.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
