# The two halves of AffectiveOS

**Type:** Positioning
**Platform:** Affective, and everything built on it
**Status:** Decided
**Written:** 21 September 2026

## The simple version

AffectiveOS is two different kinds of thing wearing one name, and telling them apart answers almost every question about what to build next.

- **Capabilities.** Senses, voice, hands. What a machine can do *in a moment*. Stateless: they finish and forget.
- **Continuity.** The memory. What persists *across* moments, across products, across years.

Products are **surfaces** onto that. Braino is a surface: a character you talk to. HERA is a surface: words at the cursor. The browser would be a surface: a window that already knows your sites.

> Affective builds the layer. Braino, HERA and whatever comes next are surfaces on it.

## Why it exists

The question that produced this: *if Affective builds a continuity layer, where does HERA fit? It is a dictation app. It does not learn you.*

It does, and it is the cleanest proof of the layer we have.

What makes dictation good is not the transcription model. Everyone rents the same ones. What makes it good is whether it knows **your** words. Wispr's entire game is learning your vocabulary, your names, your formatting, from scratch, from what you dictated into Wispr.

HERA on the continuity layer knows "Ilu" is a person, because Braino has watched that FaceTime. It writes AffectiveOS rather than Affective OS because the layer knows how the company spells its own name. It knows Mesa, Foundry, Dinebees, Bhaskar.

**HERA is dictation that gets more accurate the longer you own it.** A single-purpose tool cannot do that, however good its model is. That difference exists only because of the layer.

## The membership test

Two questions decide whether something belongs in the family:

1. **Does it get better because of what the layer already knows?**
2. **Does it put something back into the layer?**

| Product | Draws from | Feeds back | In? |
|---|---|---|---|
| Braino | everything | decisions, routes, lessons, people | yes |
| HERA | vocabulary, names, projects, style | every word actually said, all day | yes |
| AI browser | your sites, what you research, how you read | pages visited, what you were looking for | yes |
| A photo editor | nothing | nothing | **no** |

This is the best filter we have for what **not** to build. A good idea that answers no twice is somebody else's good idea.

## The flywheel

Every surface makes every other surface better, because they feed one layer.

- HERA hears speech all day, so Braino gets better at names.
- Braino watches the work, so HERA gets better at the vocabulary.
- The browser sees the reading, so both get better at what the work is about.

A tool company adds products that sit beside each other. This adds products that **compound into** each other. That compounding is the whole reason to own the layer rather than rent capabilities.

## The analogy

iOS. Photos, Messages and Safari are different apps on one identity, one iCloud, and one keyboard that learns how you type. Apple never sells the keyboard dictionary. It is just the reason everything feels like yours.

AffectiveOS is that, except the shared thing is memory rather than storage.

## What this decides

- **Naming.** The company builds the layer. Products are surfaces with their own names. Never market a surface as the layer, and never market the layer as a product.
- **The site.** The technology section shows two halves, not four equal features: what it can do, and what it keeps. A four-item grid says those are four features of the same kind, and they are not.
- **Roadmap.** Any new product passes the two questions first. If it cannot feed the layer, it does not ship under this company.
- **Pricing, eventually.** People pay for surfaces. What they stay for is the layer, because leaving means starting again.
- **Honesty.** The layer is a real thing in the code: `braino_memories`, `braino_procedures`, `braino_lessons`, `braino_interactions`, and the memory engine that writes them. `/learning` shows what is in it. This positioning is backed by a table you can read, which is the only kind worth writing down.

## Honest limitations

Today the layer is fed almost entirely by Braino. HERA reads from nothing and writes to nothing; the browser surface does not exist. The architecture is decided and the wiring is not built. Until HERA both draws from the layer and feeds it, the flywheel above is a plan rather than a claim, and nothing public should say otherwise.

## Related

- `Braino Knowledge Base/design/braino-foundry-positioning.md` — the three models of the product
- `/learning` and `supabase/functions/reasoning/braino-learning` — the layer, made visible
- `docs/OUTREACH_BUILD_PLAN.md` — a capability being built on the layer rather than beside it
