---
name: asset-fetch
description: Use this skill whenever the user asks Braino to download something from the web and put it somewhere — by name or by URL, one thing or twenty. Braino finds it, downloads it, and organises it into a folder by itself. Triggers on "download X for me", "grab these", "get me A, B and C", "find me pictures of X", "save this link", or any list of things to fetch.
---

# Asset Fetch Skill

**The skill is: "Braino, download this for me" — and it ends with an organised
folder.** Not a list of known files. Not logos specifically. Whatever the user
names or links, Braino goes and gets it, then files it somewhere sensible without
being asked to.

Two halves, and the second is the one people actually notice:

1. **Get it.** By name (Braino searches) or by URL (Braino just fetches it).
2. **Organise it.** A folder named after the request, files named after the
   things, sorted into `images/` `docs/` `video/` `audio/` when the haul is mixed,
   with a manifest recording where each one came from.

## What it is for

- "Download the LinkedIn, OpenAI and ZoomInfo logos."
- "Save these six links for me."
- "Find reference photos of brutalist buildings and put them on my Desktop."
- "Grab everything on that slide and organise it."

Logos are the first thing it was used for, not the thing it is.

## Core Capabilities

- Take one name or a list of names in a single command.
- Search more than one source, preferring the one most likely to be *right*.
- Save into a folder the user named, or a sensible new one, with predictable filenames.
- Write a `SOURCES.json` manifest next to the files: where each came from, its
  licence, and a link to verify it.
- Report misses out loud instead of filling them with something that looks close.

## The rule that matters most

**A wrong logo is worse than a missing one.** Never substitute a near-match. If a
brand cannot be found, say so by name and let the user supply it. A deck that
ships a competitor's mark, or a stock photo of a Greek god where Apollo.io should
be, is a worse outcome than a gap the user knew about.

## Sources, in order

1. **simple-icons** — official brand paths, exact and monochrome. First choice
   when it has the brand. Its maintainers remove marks on trademark request, so
   LinkedIn and OpenAI are simply absent; that absence is why this skill exists.
2. **Wikimedia Commons** — real SVG uploads with a licence attached. The API can
   be told `filetype:svg`, so Braino gets vectors rather than screenshots.
3. **Openverse** — CC-licensed photography. Used **only** when the ask is a photo.
   It is never in the chain for a logo: asking a photo library for "Apollo.io"
   returns a picture of something named Apollo, and saving that as a logo is the
   exact failure this skill is built to avoid.

## Workflow

1. Parse the request into a list of names plus a destination folder.
2. If a name is a famously ambiguous brand — Apollo, Phoenix, Atlas, Nova — search
   the disambiguated form (`Apollo.io`) and save the short one (`apollo.svg`).
3. Fetch each entry through the source chain, stopping at the first real hit. A
   URL skips searching entirely — there is nothing to find.
4. Save as `<slug>.<ext>`, lowercase, no spaces, so filenames are guessable. A URL
   keeps its own basename.
5. Put it in a folder: the one the user named, or one Braino names from the
   request. Sort into type subfolders only when the haul is genuinely mixed —
   six logos do not need an `images/` folder, six logos and a PDF do.
6. Write the manifest.
7. Say plainly how many were found, how many were not, and name the misses.
8. Offer to open the folder.

## Disambiguation

Brand names collide constantly. `Name|slug` searches the long unambiguous name and
saves the short one:

```
"Apollo.io sales software|apollo"   → searches Apollo.io, saves apollo.svg
"Google Business Profile|google"    → searches the full product, saves google.svg
```

When a name is ambiguous and no hint was given, ask one short question rather than
guessing.

## Boundaries

- **Licensing is surfaced, not resolved.** The manifest records the licence and a
  verify link. Braino does not decide whether a trademark may be used in a given
  context; that is the user's call.
- **No scraping of arbitrary sites.** Only the named APIs, each with a real
  User-Agent. Braino does not walk a company's website looking for an image tag.
- **No image generation.** If it cannot be found, it is not invented.
- Everything is written inside the destination folder and nowhere else.

## Failure behavior

- Source unreachable → try the next one; only report a miss when all are exhausted.
- Zero results → name the asset as not found. Never save a placeholder.
- Bad destination path → ask for a folder rather than writing to the home directory.
- Partial success is success: save what was found, name what was not.

## Implementation

`scripts/braino-fetch-assets.mjs` is the worker. HIL reaches it through the
`fetch_assets` tool in `supabase/functions/_shared/human-intelligence/hil-tool-catalog.ts`.

```
node scripts/braino-fetch-assets.mjs --out public/logos LinkedIn OpenAI ZoomInfo
node scripts/braino-fetch-assets.mjs --out ~/Desktop/refs --kind photo "brutalist architecture"
```

Flags: `--out <dir>`, `--kind logo|photo|any`, `--limit <n>`.

## Related

- The pitch deck's platform chips are the first consumer of this skill;
  `scripts/inline-deck-logos.mjs` inlines whatever lands in `public/logos/`.
