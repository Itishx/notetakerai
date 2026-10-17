# Braino Notes PDF: design and structure

Status: built 15 Oct 2026 (mac/braino-mac/notes-pdf.cjs). As built: headings use Newsreader (shipped in renderer/fonts), body uses the Mac's SF font, since Chromium can't reach New York or Inter.
Reference: `Assignment Solution.pdf` (the Playo solution, 8 pages, 15 Oct 2026). Every meeting and lecture note Braino records should look and read like it.

---

## 1. The idea in one line

Every note reads like a story someone can pick up cold: **the answer first, then why we were there, what happened, what it means, and what to say if asked.**

---

## 2. Page design (taken from the reference PDF)

### Page

| Part | Spec |
| --- | --- |
| Size | A4 portrait (210 × 297 mm) |
| Margins | 20 mm left and right, 22 mm top, 20 mm bottom |
| Background | Pure white `#FFFFFF` |
| Running header | Top left on every page: the note's title, 7.5 pt, grey `#8A8781` |
| Footer | Bottom right: `Page 3 of 8`, 7.5 pt, grey `#8A8781` |
| Page breaks | A table may split across pages. Its header row repeats at the top of the next page. Never leave a heading alone at the bottom of a page. |

### Type

Two typefaces: a **serif for headings** and a **clean sans for everything else**. The reference uses Anthropic's own fonts, which we can't ship. Use these free ones bundled in the app:

| Role | Font | Size | Weight | Colour | Spacing |
| --- | --- | --- | --- | --- | --- |
| Title (H1) | Source Serif 4 (or Newsreader) | 28 pt | Regular 400 | `#1F1E1C` | 0 above, 10 pt below |
| Section heading (H2) | Source Serif 4 | 19 pt | Regular 400 | `#1F1E1C` | 26 pt above, 8 pt below |
| Body | Inter (or Söhne-like sans) | 11 pt | Regular 400 | `#2B2A27` | line height 1.5, 7 pt between paragraphs |
| Bold labels | Inter | 11 pt | Semibold 600 | `#1F1E1C` | inline |
| Table text | Inter | 10 pt | Regular | `#2B2A27` | line height 1.4 |
| Table header | Inter | 10 pt | Regular | `#6F6C66` (muted, not bold) | |
| Inline code | JetBrains Mono | 9.5 pt | Regular | `#2B2A27` on `#F1F0EC`, 3 px radius | |
| Header and footer | Inter | 7.5 pt | Regular | `#8A8781` | |

Headings are **regular weight, not bold**. The serif carries them. Bold is used only for lead-in labels ("**Who Playo is.**") and key numbers.

### Byline chips

Right under the title, one line: `[Oct 15, 2026] · [@Itish P]`

- Each chip: background `#F0EEE8`, text `#3A3935`, 9.5 pt, padding 3 × 8 px, radius 6 px
- A middle dot `·` between chips, grey
- Meeting notes add a duration chip: `[Oct 15, 2026] · [32 min] · [Zoom]`

### Tables

| Part | Spec |
| --- | --- |
| Border | 1 px `#E4E2DC` on every cell |
| Header row | Background `#F5F4EF`, muted text, regular weight |
| Cell padding | 9 px top and bottom, 11 px left and right |
| First column | **Bold** when it names the item (trap, city, decision) |
| Key cells | **Bold** for the one number per row that matters (98%) |
| Totals row | Whole row bold |
| Width | Full text width. Narrow number tables (cohorts) shrink to fit their content. |
| Empty cells | Left blank, never "n/a" or "-" |

### Lists

- Bullets: small round dot, 18 px indent
- Numbered lists for recommendations and steps, each starting with a **bold lead phrase** followed by plain text

### Colour

Close to black and white. Warm greys only. **No brand colours, no coloured boxes, no icons.** The look comes from the type, the white space and the tables.

---

## 3. Writing rules (what makes it read well)

1. **The first paragraph is the answer.** Two bold labels: "**The question:** … **Our answer:** …". For a meeting: "**What this was:** … **What we decided:** …"
2. **Numbered sections** (`1.`, `2.`, …) so someone can say "see section 5".
3. **The first sentence of each section is its point, in bold.** "**Newer cohorts stick better, not worse.**"
4. **A "How:" line** says how a number was worked out, in one sentence.
5. **Anything that compares things goes in a table, not a paragraph.**
6. **Real numbers, never adjectives.** "98% full", not "very busy".
7. Sentences under 25 words. Paragraphs of 3 sentences or fewer. Plain words.
8. No em dashes (Braino's voice rule). No emoji.
9. It always ends with "**If you are asked**": a 30-second version plus likely questions with short answers.

---

## 4. Meeting notes structure

**Title:** the meeting's subject, not the app. Example: "Pricing review with Riya", not "Zoom call".
**Byline:** date · duration · app · @you

| # | Section | What goes in it | Form |
| --- | --- | --- | --- |
| (lead) | Answer first | **What this was:** one line. **What we decided:** one or two lines. | Paragraph |
| 1 | Why we met | The problem or goal that started the meeting, and who wanted what | Short paragraphs + bold labels |
| 2 | Who was there | Each name, and the position they argued for | Table: Person · Role · Their view |
| 3 | What we discussed | One row per topic, in the order it came up | Table: Topic · What was said · Where it landed |
| 4 | Numbers mentioned | Every figure, date or price someone said, so it doesn't get lost | Table: What · Number · Who said it |
| 5 | Decisions | What was agreed, each with its reason | Numbered list, bold lead |
| 6 | Action items | Who does what by when | Table: # · Task · Owner · Due |
| 7 | Open questions | Things left unresolved | Bullets |
| 8 | If you are asked | 30-second recap you can forward or say out loud, plus 3 to 6 likely questions | Paragraph + Q and A table |
| (end) | Full transcript | Timestamped, speaker labelled, smaller 9.5 pt text | Appendix after a page break |

Skip any section that would be empty, and renumber the rest.

---

## 5. Lecture notes structure

**Title:** the topic, not the course code. Example: "Cohort analysis and marketplace balance".
**Byline:** date · duration · @professor (if known) · @you

| # | Section | What goes in it | Form |
| --- | --- | --- | --- |
| (lead) | Answer first | **The big idea:** one line. **Why it matters:** one line. | Paragraph |
| 1 | What the class was about | The case, company or question the class worked through | Short paragraphs + bold labels |
| 2 | Key ideas | Each idea in plain words, with an example | Table: Idea · In plain words · Example |
| 3 | Formulas and frameworks | Each formula as it was taught, with what each part means | Display formula + one "How:" line |
| 4 | The case or worked example | The numbers the class used, step by step | Numbered steps + tables |
| 5 | Traps the professor flagged | Common mistakes and how to avoid them | Table: Trap · Why it misleads · What to do instead (same as the reference) |
| 6 | Homework and deadlines | What is due, when, and where to submit | Table: Task · Due · Where |
| 7 | If you are cold-called | 30-second summary plus questions the professor is likely to ask | Paragraph + Q and A table |
| 8 | Revision checklist | 5 to 8 things to know before the exam | Checkbox list |
| (end) | Full transcript | Same as meetings | Appendix |

---

## 6. Labels and where files live

| Type | Folder | File name | Finder tag |
| --- | --- | --- | --- |
| Meeting | `~/Documents/Braino/Meetings/` | `2026-10-15 · Zoom · Pricing review (32 min).pdf` | Meeting (blue) |
| Lecture | `~/Documents/Braino/Lectures/` | `2026-10-15 · Marketplaces · Cohort analysis.pdf` | Lecture (purple) |
| Assignment | `~/Documents/Braino/Assignments/` | `2026-10-15 · Playo · Players or arenas.pdf` | Assignment (orange) |

- Names start with the date so the folder sorts itself.
- The same title appears in the running header and on the dashboard.
- The dashboard sync stays as it is today. The PDF is an extra copy saved on the Mac.

---

## 7. How it gets built (later)

- Braino's summary call returns the sections above as **Markdown** instead of plain bullets. It's the same call as today with a longer prompt, so the cost is about the same.
- The Mac app renders that Markdown into an HTML template that uses these exact styles, and Electron's built-in `printToPDF` turns it into the PDF. No new service is needed.
- The CSS tokens below are the single source of truth for the template.

```css
:root {
  --ink: #1F1E1C;      --body: #2B2A27;   --muted: #6F6C66;  --faint: #8A8781;
  --rule: #E4E2DC;     --th-bg: #F5F4EF;  --chip-bg: #F0EEE8; --code-bg: #F1F0EC;
  --serif: "Source Serif 4", "Newsreader", Georgia, serif;
  --sans: "Inter", -apple-system, "Helvetica Neue", sans-serif;
  --mono: "JetBrains Mono", Menlo, monospace;
}
@page { size: A4; margin: 22mm 20mm 20mm 20mm; }
body  { font: 11pt/1.5 var(--sans); color: var(--body); background: #fff; }
h1    { font: 400 28pt/1.15 var(--serif); color: var(--ink); margin: 0 0 10pt; }
h2    { font: 400 19pt/1.2 var(--serif); color: var(--ink); margin: 26pt 0 8pt; break-after: avoid; }
p     { margin: 0 0 7pt; }
strong{ font-weight: 600; color: var(--ink); }
.chip { background: var(--chip-bg); color: #3A3935; font-size: 9.5pt; padding: 3px 8px; border-radius: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.4; margin: 10pt 0 14pt; }
thead { display: table-header-group; }      /* header repeats on each page */
th    { background: var(--th-bg); color: var(--muted); font-weight: 400; text-align: left; }
th, td{ border: 1px solid var(--rule); padding: 9px 11px; vertical-align: top; }
tr    { break-inside: avoid; }
code  { font: 9.5pt var(--mono); background: var(--code-bg); padding: 1px 5px; border-radius: 3px; }
```
