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

## Notch navigation

The floating left chapter rail has been removed. Its seven destinations—Braino, Browser, IOMI, Braino OS, Studio, Hera, and Join—now live inside the top notch navigation, where they open the matching section on the same page.

The website notch no longer starts asleep. It shows awake eyes in the centre from the first frame; clicking the eyes expands the notch into the chapter menu. The old sleep, snore, and first-click boot implementation remains available behind the component's `sleepOnFirstVisit` option, but the public site leaves it off.

The hero footnote explicitly says “Click the notch eyes to explore.” Notch chapter links perform a real smooth scroll to the matching section instead of relying on a hash change alone.

The hero's “cutest AI agent” line now uses a restrained warm-gold, coral, and deep-coral treatment instead of the previous four-colour sweep.

The light/dark theme control moved into the expanded notch beside “Go anywhere.” It is no longer dependent on the removed sidebar rail.

The sixth Braino form is now a real mood board using all eight existing reaction faces: calm, happy, laughing, celebrating, focused, shocked, scared, and tears of joy. The earlier duplicate faces and unrelated walking mascot were removed.

The footer game is intentionally forgiving: higher jumps, softer gravity, coyote time after leaving an edge, buffered jump input before landing, wider collision tolerance, and a recovery bounce when a pipe catches a late jump. Green pipes can be landed on and no longer create an unfair instant death or forced fall.

## Waitlist categories

Each signup saves the selected Braino interests in the existing waitlist row: Braino for Browser, Braino IOMI, Braino OS, Braino Studio, Braino Hera, or Everything. The admin page displays those choices as readable badges. If an existing email signs up again with another selection, the new interest is merged into the same row rather than creating a duplicate or discarding the choice. Historical rows without category context remain untouched and appear as “Uncategorised.”

The Hera chapter no longer uses a boxed coming-soon card. It gives one short plain-text preview and ends with “Coming soon.”

The old “Download Braino” button has been removed from the hero. This page is the waitlist and should keep one clear commitment path instead of presenting an immediate extension download beside the opening promise.

The public footer now keeps only the playable Braino course and a quiet legal baseline: copyright, the founder signoff, Privacy, and Terms. Product, resource, contact, placeholder social, download, pricing, and disclaimer columns stay hidden until those destinations are ready for public visitors.

### Hidden footer link map

Keep this exact map for restoration when the destinations are public-ready:

- **Product:** Overview → `/product-overview`; The three classes → `/product-overview#classes`; Pricing → `/premium`; Download for Mac → `/premium`
- **Resources:** Journal → `/journal`; Changelog → `/changelog`; Knowledge Base → `/knowledge`; Privacy → `/privacy`; Terms → `/terms`
- **Connect:** X · @brainosays → `https://x.com/brainosays`; Instagram → `https://instagram.com`; YouTube → `https://youtube.com`; Contact → `/contact`
- **Disclaimer:** “Braino only sees your screen the moment you invoke him. Nothing is captured, nothing is stored.”

Instagram and YouTube were generic placeholder URLs, not confirmed Braino profile links. Replace them with exact account URLs before restoring those entries.

## Hera disclosure

Hera remains named in the chapter rail and waitlist picker, but its public mechanics are intentionally undisclosed. The chapter contains only “Coming soon,” and the picker says that Braino is keeping this one quiet.

The earlier dictation description, product comparison, three-step capability breakdown, and development caveats were removed. Hera should create curiosity without publishing the product brief before it is ready.

Studio comes before Hera everywhere: chapter rail, reading order, numbering, and waitlist picker. The last detailed reveal belongs to Studio; Hera closes the product sequence as a restrained teaser.
