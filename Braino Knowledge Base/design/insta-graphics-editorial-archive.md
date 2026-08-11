# Instaposts Social Studio

**Type:** Design decision  
**Platform:** Braino website  
**Status:** Exploring  
**Released:** August 6, 2026

## The simple version

Instaposts is a dedicated social studio. Every block in its gallery is one complete Instagram carousel. Hover over a block to fan through its visual identity, then open it to review and edit the individual slides.

The first new post is a five-slide, 1080 × 1350 Instagram carousel that answers one question: what is Braino?

The working introduction currently has six slides so two directions can be compared before cutting back to five. It opens with “We made Jarvis from Iron Man come to life,” shows Braino and three of his reaction faces immediately, and describes him as an AI designed to feel like a best friend—a presence that understands the page, speaks in his own voice, and helps without taking over. The visual now uses a restrained deep-ink AI system, blue structure, and one coral signal rather than a broad lifestyle gradient. The later slides show the Product Overview capability bento, screen awareness, all six character forms, and the “Speak. Watch it happen.” close.

Only the closing slide carries `trybraino.com`. The other slides use a unique chapter label—Meet Braino, The Character, The Work, The Context, and The Personality—rather than repeating “Introducing Braino” and the URL. Every slide now follows one compact rhythm: graphic first, text immediately below. Decorative rules between the headline and supporting copy were removed so spacing—not a line—carries the hierarchy.

## Why it exists

The old switcher made a growing body of work feel like a settings panel. It was hard to scan, compare, or simply wander through the designs. Social work should feel more like an evolving publication than a table of previews.

## How to use it

Open `/instaposts` and choose a post. Scroll sideways through the snap-to-slide canvas or use its arrows. Edit the copy, colours, and alignment beside the preview. Upload a photo, drag it directly on the canvas, resize it, and reorder, duplicate, or remove slides. Choose **Download all · 4K PNG ZIP** to render every slide at 4320 × 5400 and download them together.

## What Braino knows or does

- Shows every social post as its own block in a two-column gallery.
- Fans out the first three slides when a post is hovered.
- Opens each carousel in a focused workspace with live copy fields.
- Keeps every 4:5 slide completely visible and supports native horizontal scrolling.
- Uploads, positions, scales, replaces, and removes slide photography.
- Changes slide colours and text alignment, and reorders, duplicates, or deletes slides.
- Saves working drafts under one permanent browser key. Design releases migrate around the saved draft instead of rotating storage versions, so user-written copy remains the source of truth.
- Seeds four complete posts with five 1080 × 1350 portrait slides each.
- Reuses the Product Overview's black-and-white capability cards and animated character vocabulary in the first post.
- Reuses the product overview's SF Pro type hierarchy, warm neutrals, coral signature, and direct language.
- Adds small entrance, line-draw, and mascot animations without making the post noisy.
- Stops the added motion when the visitor prefers reduced motion.
- Exports all five slides as 4K PNG files inside one ZIP.

## Honest limitations

This is a browser-based design studio, not an Instagram publishing tool. It does not post or schedule automatically. Drafts are saved only in the current browser, not synced to an account; very large uploaded photographs may exceed browser storage. Static export happens locally and may take a moment because each PNG is rendered at 4320 × 5400. PNG cannot retain motion; a faithful Canva-style package requires animated slides to be rendered as video rather than silently frozen.

## Technical shape

The five-slide introductory carousel reuses the live Waitlist and Product Overview visual language: its second slide presents the six character cards as a compact black-and-white table, its third slide fits the Product Overview capability cards plus the continuous final-row marquee into the 4:5 canvas, and its fourth slide embeds the canonical coral Chrome notch state machine beside the screen-context story. The closing slide uses a restrained dark graphic and tighter visual-to-copy spacing instead of the earlier pink gradient.

The Walking and Moonwalk cells use the articulated production character component—not translated static artwork—so the legs, body movement, direction, expression, and moonwalk fedora match the Product Overview behavior.

The opening slide keeps Braino's body planted while his articulated arm waves. A compact black subtitle island above his head carries “hey shawty” in the product's mono caption and coral-signal language, keeping the character's body unobstructed.

Within the opening headline, only “Iron Man” carries a moving armour-red and arc-reactor-gold text shimmer. The surrounding typography remains unchanged.

## Post 02: what Braino can actually do

The second post is a seven-slide capability story. It opens with a nine-cell bento table, then demonstrates page-aware research, lecture and meeting notes, browser actions, approved email replies in under five seconds, Calendar plus Maps-to-phone handoff, and voice interaction. The claims are limited to capabilities confirmed as working; aspirational checkout, booking, and unattended-job language is deliberately excluded.

The redesign migrates only the `braino-does-the-work` post once. The completed first post and its locally edited copy are not replaced or merged during this migration.

## Viewport-safe rendering

Every 4:5 slide now uses the split-screen-approved 32px artboard headline rather than browser `vw` units. Visual and copy occupy separate grid rows, replacing the earlier absolute layers that could collide when longer copy wrapped. Opening or closing a browser side panel can resize the workspace around the canvas, but it cannot enlarge the headline or reshape the embedded Chrome system. Static export captures the exact laid-out preview and derives its pixel ratio from the rendered artboard to reach 4320 pixels wide; it no longer relays out the slide at a different CSS width during capture.

The shared slide rhythm reserves 18px between the graphic and copy, 14px between kicker and headline, and 18px between headline and description at the 500px editor canvas. These distances scale together during export and remain identical across posts.

Copy is bottom-anchored inside its own non-overlapping row. Shorter copy therefore uses the lower white space and restores the earlier editorial balance instead of sitting immediately beneath the graphic.

Animated export records every slide as a native 1080 × 1350 MP4 for one complete 12-second cycle, then packages the videos in slide order inside a ZIP. The canvas capture uses the live slide DOM, so CSS movement, character motion, marquees, and the full coral Chrome state loop are retained. Direct MP4 encoding depends on browser `MediaRecorder` support; current Chrome or Safari is required. Static 4320 × 5400 PNG export remains available as an explicitly labelled fallback.

`src/pages/InstaPosts.tsx` owns the post collection, hover gallery, focused editor, local slide state, PNG rendering through `html-to-image`, and ZIP creation through `jszip`. `src/pages/insta-posts.css` owns the gallery, hover fan, 4:5 artboards, and workspace. The dedicated route is `/instaposts`; the older `/InstaGraphics` route remains an isolated interaction-design archive.

The public documentation is registered in `src/lib/brainoKnowledge.ts` and rendered at `/knowledge/insta-graphics-editorial-archive`.

## Product or design decisions

The gallery is deliberately block-based: compact enough to scan, but visual enough to recognize a carousel before opening it. Editing happens in context beside the real post preview instead of in a disconnected form.

## What comes next

A future export pass can turn any selected slide into a downloadable production asset without changing the archive itself.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
