# Waitlist chapter rail

**Type:** Design decision  
**Platform:** Braino website  
**Status:** Live  
**Released:** July 29, 2026

## The simple version

The Braino waitlist is now the entire public website and the permanent `/` homepage. It is a long story with six chapters, with navigation beside the story instead of above it.

On desktop, a compact vertical rail stays on the left edge of the page. It shows each product chapter, highlights the chapter currently being read, and keeps the light/dark control close. On smaller screens it becomes a horizontal bar at the bottom so it never covers the writing.

## Why it exists

The earlier page had both an index and a floating horizontal menu. They repeated the same job and made the opening feel longer than it needed to.

The chapter rail removes that duplicate layer. The reader can enter the story immediately and still move anywhere at any time.

## Story order

Braino comes before the products that contain him.

The opening chapter now answers “Who is Braino?” through his face, body, walk, dancing and reactions. Only after the character is understood does chapter two introduce Braino for the browser. IOMI and Braino OS follow, then Studio gets the final full product reveal before the deliberately minimal Hera “Coming soon” chapter.

This is not merely a numbering change. “Braino” and “Browser” are separate destinations in the chapter rail, so the information hierarchy and the visible navigation tell the same story.

## Product naming

“Braino” is the stable master name. Inside a product heading it stays plain; only the release name shimmers.

- Standalone Braino uses coral pink.
- browser uses warm orange.
- IOMI uses gold.
- OS uses violet.
- Hera uses green.
- Studio uses magenta.

BrainoOS and BrainoStudio are visually locked as single names with no gap. The colour belongs to the release identifier, not to Braino.

## Editorial rhythm

Each product opening is treated as one unit:

1. Product number and label
2. Product title
3. A simple description of what it is
4. Teaser film
5. Two paragraphs that explain the product after it has been seen

The order is deliberate: heading, description, film, then two paragraphs. A reader gets the simplest promise first, sees the product in motion, and only then enters the deeper explanation.

Braino OS is the exception because it is an operating layer, not another surface with a product trailer. Its chapter uses a heading, a direct description, two engine graphics, and two explanatory paragraphs. There is no Braino OS video in this sequence.

Chapter padding was reduced as well, so moving from Braino Browser to IOMI to Braino OS feels continuous.

## Responsive decision

A fixed left rail needs clear space beside the article. Below 1050 pixels, the navigation moves to the bottom and becomes horizontal. This preserves the content width and keeps every chapter reachable with one thumb.

## Footer decision

The old thin utility row has been replaced by the same shared Braino footer used by the former product homepage. The footer is the playable Mario-style Braino game, so the waitlist ends with character rather than another static navigation strip.

## Homepage and direct routes

The waitlist owns `/`, but existing product, editorial, authentication, preview,
and Knowledge Base pages remain accessible through their explicit URLs. Unknown
URLs show the normal not-found page instead of silently forcing the visitor back
to the waitlist.

This keeps the public homepage focused while allowing Itish and the team to open
working pages directly during design and testing.

## Hero decision

The opening now puts Braino beside the promise instead of leaving the headline alone. “Meet the cutest AI agent you’ll ever meet” is split into three deliberate beats, with the important words carrying the restrained gold-to-coral-to-blue identity gradient. The real Braino character floats inside a quiet orbital system on the right, supported by one direct description and the line “One character. Everywhere you work.”

The result is still editorial, but no longer empty. The hero establishes the character before the chapters explain the products around him.

The old “Download Braino” button has been removed from the hero. This page is the waitlist and should keep one clear commitment path instead of presenting an immediate extension download beside the opening promise.

## Hera disclosure

Hera remains named in the chapter rail and waitlist picker, but its public mechanics are intentionally undisclosed. The chapter contains only “Coming soon,” and the picker says that Braino is keeping this one quiet.

The earlier dictation description, product comparison, three-step capability breakdown, and development caveats were removed. Hera should create curiosity without publishing the product brief before it is ready.

Studio comes before Hera everywhere: chapter rail, reading order, numbering, and waitlist picker. The last detailed reveal belongs to Studio; Hera closes the product sequence as a restrained teaser.
