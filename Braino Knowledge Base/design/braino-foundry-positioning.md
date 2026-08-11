# Braino Foundry Positioning

**Type:** Product  
**Platform:** Braino website and Braino for Mac  
**Status:** Exploring  
**Released:** August 9, 2026

## The simple version

The page now tells two complete stories through a sticky switch: **Braino** and **Braino Foundry**.

Braino is the broad product and character: the Jarvis-shaped direction across browser context, tabs, research, email work, meetings, voice, files, Mac actions and future capabilities. Braino Foundry is the focused starting market: the same Braino aimed at the problem of building a company alone.

## Why it exists

Solo builders already have smart models. Their problem is carrying context between those models, their code, their browser, their files, and the actual state of the company.

Braino has been building toward presence and execution for months, but the old product language still sounded like another assistant. Foundry names the bigger ambition without pretending every piece has shipped: a present, opinionated operating partner that can eventually brief coding agents, watch their work, verify the result, and report back honestly.

## How to use it

1. Open `/foundry`.
2. Use the **Braino / Braino Foundry** switch beneath the hero. Once reached, it stays below the notch while scrolling.
3. In **Braino**, meet the character, see the broad capability map and understand the long-term Jarvis-shaped product direction.
4. In **Braino Foundry**, read why the team chose solo founders as the first focused customer, then see the co-founder workflow and current product proofs.
5. Share the focused story directly with `/foundry?view=foundry`.

## What Braino knows or does

- Reuses the Product Overview Apple design system: SF Pro, warm off-white, near-black, coral, blue, green, amber, and violet.
- Offers two complete pages inside one accessible tab switch. It uses the Human Intelligence page's quiet gray-pill, white-active-tab treatment. It appears beneath the hero, then becomes sticky below the notch while scrolling. The selection updates the URL and page title, and switching returns the visitor to the top of the selected story.
- The **Braino** story explains the character and broad product independently of Foundry: browser context, tabs, sourced research, connected email work, meetings and notes, voice, files, Mac actions and approved automations.
- The Braino story now names the complete product system instead of stopping at capabilities: **Braino OS**, its Emotional Engine and Human Intelligence Layer, **BrainoHERA** system-wide dictation, and **BrainoStudio** customization.
- Restores Product Overview's continuously moving capability marquee, including travel, notes, desktop organization, shopping, messages, files, briefings and music.
- The **Braino Foundry** story explains the strategic wedge: Braino could serve almost anyone, but the team chose the founder-building-alone problem because it is specific, urgent and personally understood.
- Introduces Braino as a character before introducing capabilities. The shared waitlist sequence shows his face, standing form, walk, dancing, moonwalk and reactions.
- Uses the same compact three-column capability bento as Product Overview rather than oversized decorative cards.
- Shows six small product proofs: clearing work, finding files, completing forms, producing video notes, BrainoHERA dictation, and screen-aware guidance.
- Keeps Braino visually in the page rather than repeatedly placing him inside feature containers. The Emotional Engine character art has no pink card, and the presence section uses open whitespace with simple dividers instead of a black panel.
- Explains screen awareness as removing the manual screenshot-and-context ritual, without claiming that vision features never capture the screen.
- Positions future coding-agent orchestration as the flagship Foundry capability and labels it coming first rather than live.
- Includes the current Mac promise: voice, screen-aware help, execution, files, notes, forms, Spotify presence, and BrainoHERA.
- Keeps Emotional Engine central: Foundry is meant to disagree, remember, celebrate, and help repair a bad idea rather than praise everything.
- Presents two products: free Braino in Chrome and Braino Foundry on macOS.
- Carries the supplied sarcastic, punchy voice without publishing an inaccurate local-transcription or no-screenshot privacy claim.

## Honest limitations

Foundry is positioning and a website page, not a separate shipped binary today. Coding-agent orchestration is still marked as coming to Foundry first. The current purchase CTA uses Braino's existing premium flow; product packaging, regional billing, and final launch availability still need to be wired to the commercial backend.

Screen awareness is not magical or permanently omniscient. It depends on macOS permission and the feature being used. BrainoHERA currently uses live transcription rather than fully local speech recognition. The public privacy copy must continue matching the real implementation as those systems change.

## Technical shape

- Page and copy structure: `src/pages/Foundry.tsx`
- Foundry-specific responsive graphics and layout: `src/pages/foundry.css`
- Shared Product Overview visual system: `src/styles/apple.css`
- Route and lazy loading: `src/App.tsx`
- Shared notch, animated character, and footer: `src/components/IomiNotch.tsx`, `src/components/BrainoChar.tsx`, `src/components/BrainoFooter.tsx`
- Permanent public documentation: `src/pages/FoundryDocs.tsx`
- Knowledge registry: `src/lib/brainoKnowledge.ts`

The page is deliberately composed from the existing Product Overview primitives instead of creating a separate visual identity. Foundry is a product repositioning, not a redesign of Braino's design language.

## Product or design decisions

The old hero-level copy toggle and the separate “Braino comes in two” card were removed. They confused two headlines with two products. The **Braino / Braino Foundry** switch changes the full narrative. It is deliberately not in the top navigation: it follows the active hero like the Read/Loop switch on Human Intelligence, then sticks beneath the notch once the visitor reaches it.

The default Braino story begins with “Your own Jarvis” and introduces the character before capabilities. It reuses the real animated character sequence rather than building a Foundry-only imitation. The broad copy describes direction separately from shipped availability: connected and approved automation language is used where an action depends on integration or permission.

The text-heavy “person in the machine” philosophy section and the second long possibilities essay were removed. They repeated the vision without helping a visitor understand the product. The replacement order is direct: what Braino can do, the moving “and a lot more” marquee, what powers him through Braino OS, then the two named family products BrainoHERA and BrainoStudio.

The Foundry story begins with the product decision itself. The possibilities may be endless, but “useful to everyone” is too vague. Solo founders are the first focused customer because the founder building Braino experiences the problem directly: carrying the company in one head, managing agents, moving context and doing operations alone.

The Foundry section order now leads with proof rather than philosophy. **The Difference** appears first as a contained, side-by-side comparison matrix, deliberately distinct from the open editorial rows in **How he co-founds**. It compares a typical AI stack with Foundry across the relationship, context, agent loop, founder attention and final result. The copy makes the orchestration promise concrete: brief Braino once; he briefs the right agents, reviews their output, requests revisions and returns when the founder's decision or approval is needed. **Why Foundry** then gives the founder's personal reason for choosing this market before **How he co-founds** explains the four broader responsibilities.

After How he co-founds, the product proof follows a deliberate sequence: **Shared Context**, **What he actually does**, then the flagship agent-orchestration direction. Shared Context is no longer a generic copy-and-mascot split. Its screen visual combines the current Billing page, a remembered decision, the current launch goal and the natural sentence the founder can say. What he actually does is no longer a six-card bento; it is a dark founder queue that keeps the Pitch Deck, Launch Cut and Definitely Final file moment, then shows files, admin, notes, BrainoHERA and screen context as work taken off the founder's plate.

The Why Foundry section uses a balanced two-column editorial layout instead of another centered billboard. The former standalone “seventeen tabs” section was merged into that explanation. The orchestration close—“You talk to your co-founder…”—is left-aligned, smaller and attached to the workflow rather than floating as a centered slogan.

The orchestration section is open and light rather than a black cinematic container. Its new centered graphic makes the operating model legible: the founder defines the outcome once, Braino runs the brief-review-revision loop in the middle, and coding, research and QA agents do the work. A separate return-loop line explains that Braino—not the founder—sends incorrect work back. The closing thought is centered and intentionally split into two lines: “You talk to your co-founder. Your co-founder manages the engineers.”

The Foundry Emotional Engine section now reuses the live network visualization from the Braino OS story instead of another Braino mascot quote. The copy focuses on memory, the moment and judgment—how Braino knows the work and the founder—without framing the product as merely “not a yes-man.”

Character moments are deliberately unboxed. Emotional Engine lets Braino and his pushback line sit directly on the editorial canvas. Presence is no longer a black feature card; it is an open section separated only by hairlines, so Braino feels like he has entered the page rather than another widget.

Typography is intentionally restrained inside this page. The first split-page draft gave the hero, Jarvis thesis, Foundry rationale, orchestration section, presence section and closing CTA nearly equal billboard-scale type. The revised scale caps the hero at 76px on desktop, keeps major section statements around 52–62px, reduces body copy, and shortens vertical section padding. Only the hero should feel dominant; the rest should read like a product page rather than a pitch deck.

Two supplied claims were narrowed for honesty. “No screenshots” became “no screenshot-copy-paste ritual,” because some current vision modes do capture the screen. “Voice transcription runs locally” was removed because BrainoHERA currently uses secure live transcription. Positioning cannot outrun the product's real privacy shape.

## What comes next

Connect Foundry's CTA to its final launch or waitlist state, reconsider film only when a dedicated Foundry cut earns its place in the story, and update the orchestration badge from coming to live only when the verified agent-manager loop is genuinely available.

## Public documentation checklist

- [x] Permanent page added under `/knowledge`
- [x] Entry added to `src/lib/brainoKnowledge.ts`
- [x] Listed in **Everything New with Braino**
- [x] Public copy is simple and human
- [x] Release date and status are accurate
