# How Bhaskar reads a deck

Written from his actual review rounds, in his words where possible. Read this
**before** writing a slide, not after he sends it back. Every rule below cost a
round trip to learn.

His feedback is a **spec change, not an opinion**. When he says a slide is wrong,
the slide is wrong.

---

## The one-line compression

> **"इसको बस simply, formal title रखो, not ChatGPT."**

If you remember nothing else, remember that. He is not asking for *better*
writing. He is asking for *plainer* writing. Those are opposite instincts, and
the clever one is the one that gets deleted.

---

## The four rules he applies every single time

### 1. No coined phrases

Anything that sounds authored gets cut. Real examples he killed:

| He deleted | Why |
|---|---|
| "You talk. He works. You approve. The world sees you." | A tagline pretending to be an explanation |
| "Braino markets Braino." | Clever, says nothing new |
| "Whatever repeats becomes a feature" | Abstraction stapled to an abstraction |
| "Nobody pays for this. Everybody needs it." | A construction, not a title |

The trap: when he says a title is boring, the instinct is to write a *punchier*
one. **That is the wrong direction.** I did it twice —
`"$17.9B is already being spent. Just not on this."` and
`"8 of 8 said distribution. 0 of 8 pay for it."` — both rejected. What worked
was `"The market, in three numbers."` and `"What eight founders told us."`

Boring-and-plain beats boring-and-clever. Plain is the target, not the problem.

### 2. Speak in VC language, not founder language

Outcomes and money, not mechanics and character. Braino being a character is a
product truth; it is not a pitch argument.

Words he *wants*: TAM, SAM, SOM, MRR, gross margin, primary, secondary, segment.
Words he cuts: engine, pillar, banked, in closing, ecosystem, value-first,
flywheel — anything that only makes sense if you already work here.

Note the asymmetry: **"jargon" to him means internal shorthand, not finance
vocabulary.** TAM/SAM/SOM stay. "Optics" only stayed because he named it himself.

### 3. One idea per slide — the pitch is four minutes

> *"Every slide should communicate one main idea and should not look like three
> or four slides compressed into one."*

He deleted an entire slide ("Ten seconds") because its two ideas belonged on two
other slides. When a slide is full, the answer is to **remove something**, not to
shrink everything.

### 4. Graphics can be rich. Copy must be flat.

He asks for logos, diagrams, tick boxes, tables — and then flattens every
sentence next to them. Do not spend the visual budget on words.

---

## What he notices that nobody else does

- **A title that says nothing.** `"Just not on this"` — *this* what? He will ask.
- **The same fact on two slides.** "$700–1,000/hr" appeared on both the research
  and competition slides. He spots it.
- **Type you cannot read from a seat.** Research numbers at 26px next to 44px
  numbers elsewhere. He reads decks at presentation distance, not on a laptop.
- **A claim that contradicts a later slide.** "Nobody has taken it" cannot sit
  five slides before a table listing five competitors.
- **Confidence that undersells.** He rejected "we need 0.2% of it" outright:
  *"it undermines the vision."* Small-share humility reads as small ambition.
- **A number with no source, and a source with no number.** Both get flagged.

---

## Mistakes I made reading him, so you do not repeat them

**He gives either/or options. Read them as options.**
> *"**Either** add an outreach visual **or** reduce/remove screenshots and use
> the space for clearer boxes."*

I took the second branch, which was complete — and then spent a round preparing
to add screenshots that were never owed. When his note contains "either", stop
and check which branch is already satisfied.

**"Make it bigger" can mean "organise it better".**
When told the research stats were too small I raised font sizes. What he
actually wanted was the slide to read as one organised thing. The real bug was
two CSS grids declaring more columns than they had items, so content bunched
left with dead space on the right. **Look for the layout fault before reaching
for a font size.**

**He will ask for something back after removing it.**
The status-quo row was cut for duplication, then wanted again. Removing content
is reversible; assume it may return and keep the markup recoverable.

**He dictates some lines verbatim. Do not improve those.**
> *"Human in the loop — nothing goes public without your approval."*

That footer is his sentence, word for word. Same with retaining the three pillar
names. When he writes the exact words, ship the exact words.

---

## The deck order he wants

```
problem → market gap → solution → business model → GTM/traction → competition → roadmap → close
```

And the two framing rules that sit above it:

- **The problem comes early**, before explaining the product, the companion, or
  why anything is free. The audience needs the gap before the fix.
- **Except on slide one.** The cover says what it *is*, quickly — never the
  problem. *"First slide जो होती है, उसमें हमें in quick words बताना है what is
  it about."*

Banned outright as an opener: **the Jarvis / Marvel analogy.** Overused, and VCs
want a pain point rooted in reality, not a film reference.

---

## Standing content rules

- **Never print a bare "₹0" or "$0"** for the free tier, or imply it stays free.
  Show Freemium and Pro as two visible divisions.
- **State prices in one currency**, converted at a stated rate.
- **No launch statuses or timelines** on the product slides. Dates live on the
  roadmap and nowhere else.
- **"$200+ revenue stage"** and phrases like it get rewritten as a sentence:
  founders already making money pay up to $200.
- **Justify the free tier twice**: customer acquisition, and usage that improves
  the model.
- **Logos over explanation.** Recognisable marks buy you the seconds a sentence
  would have spent.

---

## The test before sending

1. Read every headline aloud. Does any sound *written*? Rewrite it plainer.
2. Search the deck for any fact that appears twice.
3. Does any slide hold more than one idea?
4. Would every number be legible from the back of a room?
5. Does anything on slide *n* contradict slide *n+5*?
6. Is there a word on any slide that only makes sense if you work here?

---

## Related

- `docs/HIL-CHANGELOG.md` — the same evidence-first discipline, applied to HIL
- `files/braino-pitch-v9.html` — the base he reverted to, and the fallback
- `files/braino-pitch-v10.html` — current deck, built from v9 under these rules
