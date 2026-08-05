# Product Overview Homepage Refresh

**Type:** Design decision  
**Platform:** Braino website  
**Status:** Exploring  
**Released:** August 4, 2026

## The simple version

The hidden Product Overview is being prepared to become Braino's main website again. It keeps its polished product story, but now introduces Braino as a character instead of making visitors sit through his product history.

## Why it exists

The Waitlist proved that Braino is easiest to understand when people meet the character, see his physical vocabulary, and choose where they want to meet him. The old Product Overview spent too much time explaining how the product evolved and did not include Studio, Hera, or a clear ecosystem choice.

## How to use it

Open `/product-overview`. The page now moves through the hero and film, Who is
Braino, capabilities, the full-screen ecosystem, Browser and IOMI, Braino OS,
Studio, Hera, the Journal preview, one consolidated founder story, pricing, and
finally FAQ.

## What Braino knows or does

- Introduces Braino as “not a tool, your best friend for the web.”
- Shows his face, standing, walking, dancing, moonwalking, and reaction forms.
- Links directly to Emotional Intelligence and Human Intelligence.
- Presents Braino Studio as the customization product.
- Lets visitors open each Braino product directly from its orbiting planet.
- Prices Browser Pro at $5/month and IOMI Pro at $25/month.

## Honest limitations

The page is still available only at `/product-overview`; the live root remains the Waitlist. Braino Studio and Hera are product previews, not finished releases. The Studio button currently routes to the existing builder experience.

The Braino OS sun in the ecosystem now opens the finished ecosystem film at
`/ecosystem-teaser`, replacing the earlier standalone Braino OS teaser link.

## Technical shape

The page lives in `src/pages/ProductOverview.tsx`, with its visual system in `src/styles/apple.css`. It reuses the real `Braino` animation rig, existing engine visualizations, the existing waitlist signup endpoint, and Product Overview's reveal system.

## Product or design decisions

The origin-history cards were removed from “Who is Braino?” because homepage visitors need the character and the current product, not internal chronology. The character cards use the Apple-style product typeface and mount Braino's shared SVG colour definitions so his animated coral body renders correctly. Capabilities follow the introduction without an intervening product section. Braino Studio replaces Build Your Braino. The Journal shows two cards at a time. The ecosystem now leads directly into FAQ.

Founder-letter calls to action link to the public `/founder-letter` article, “I built a Mac app to fuck around and find out,” and never expose the private `/n` page.

Product Overview no longer includes Adopt, “He grows up with you,” or either
section’s A/B/C/D variation controls. The ecosystem is now the only chapter in
that position: a dedicated 125svh solar-system section with a canvas up to
1480px wide and 1060px tall. Braino OS remains the central sun; Browser, IOMI,
Studio, and Hera orbit with enough radial separation to avoid clipping. Each
planet links directly to its product. Scroll position drives restrained star
and canvas parallax, with a reduced-motion fallback. The Waitlist keeps its own
signup picker unchanged.

The orbiting products use 86px planet bodies on desktop. Their product name and
surface label sit outside the circle beneath a short colour-matched connector
line. Labels therefore no longer compete with the planet art or force the
circles to overlap neighboring orbital paths.

The Sun exclusion zone is geometric rather than visual guesswork. With a 220px
Sun and 86px planets, the first orbit now begins at 230px from centre, leaving
77px of clear space between Browser and the Sun. Later products sit at 340,
450, and 560px. Four visible rings match those four radii, and the canvas grows
to as much as 1320px tall so the outer orbit and its external label remain
inside the frame.

The selected ecosystem direction behaves like a real miniature solar system: Braino OS remains fixed as the orange sun, while Browser Braino, IOMI, Studio, and Hera continuously revolve at different radii and speeds. Each planet counter-rotates so its label remains upright and clickable. Emotional and Human Intelligence sit as separate satellites beneath the OS core, and reduced-motion users receive a paused system.

The ecosystem now appears immediately after “What can he do?” It establishes
the whole product model before Browser and IOMI are explained individually.
The earlier founder block was removed from the opening and merged into the
later “Built by one person” section. Journal follows the product story; founder
context follows Journal; pricing is intentionally second-to-last, immediately
before FAQ.

“Who is Braino?” and Braino Studio also render the shared Waitlist chapters directly. The character chapter keeps the three sticky, overlapping card rows and Braino’s standing, walking, dancing, moonwalking, face, and reaction animation states. Studio keeps the SF/Apple-style typography, animated pink `Studio` shimmer, live Braino preview, and customization card.

## What comes next

Review the complete page in-browser, finish any copy and spacing polish, then deliberately decide when `/product-overview` should replace the Waitlist at `/`.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
