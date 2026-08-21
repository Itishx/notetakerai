// Braino Code: the design engine.
//
// Two stages, deliberately separate.
//
//   1. spec   brief -> a design system and a sitemap, as data
//   2. build  spec  -> one self-contained HTML file
//
// They are split because a model asked to "design and build a website" in one
// breath decides the colours while it is already writing the hero, and the back
// half of the page drifts from the front. Deciding the system first and then
// executing against it is why the fifth section still looks like the first.
//
// The split also buys the product something: the spec exists ~30 seconds in,
// long before the page does, so /code can show the palette while the person can
// still cheaply say "no, darker". See src/pages/BrainoCode.tsx.

export type SitePalette = {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
};

export type SiteSection = {
  id: string;
  title: string;
  intent: string;
};

export type SiteSpec = {
  name: string;
  tagline: string;
  mood: string;
  referenceRead: string | null;
  palette: SitePalette;
  fonts: { display: string; body: string };
  sections: SiteSection[];
};

// Self-contained output means no CDN, which means no webfonts, which means the
// typeface has to already be on the reader's machine. That is a real constraint
// and a useful one: it rules out the defaults that make a page look generated.
// Each stack below is picked for character and ends in a category fallback.
export const FONT_STACKS: Record<string, string> = {
  geometric: `Futura, "Avenir Next", Avenir, "Century Gothic", sans-serif`,
  humanist: `Optima, Candara, "Gill Sans", "Gill Sans MT", sans-serif`,
  british: `"Gill Sans", "Gill Sans MT", Calibri, sans-serif`,
  editorial: `"Iowan Old Style", Charter, Georgia, Cambria, serif`,
  luxury: `"Hoefler Text", Didot, Baskerville, "Times New Roman", serif`,
  classical: `Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif`,
  slab: `Rockwell, "Courier Bold", Courier, Georgia, serif`,
  technical: `"SF Mono", Menlo, Consolas, "Roboto Mono", monospace`,
  institutional: `Copperplate, "Copperplate Gothic Light", "Trajan Pro", serif`,
  grotesk: `"Helvetica Neue", Helvetica, "Nimbus Sans", sans-serif`,
};

// Applies to both stages. These are the failure modes that make a generated
// page announce itself, and they are worth repeating at every call site.
const HOUSE_RULES = `
Never produce generic AI-generated aesthetics. Specifically banned:
- Inter, Roboto, Arial, Helvetica-as-default, system-ui, or any "system font" body stack
- purple or indigo gradients, especially on white or near-black
- the cream/off-white background with a serif display face, unless the brief is genuinely editorial or hospitality
- three evenly spaced feature cards with a small icon on top of each
- stock phrases: "seamlessly", "empower", "unlock", "revolutionise", "cutting-edge", "in today's fast-paced world"
- lorem ipsum, placeholder names, "Company Name", or TODO text anywhere

Write as if a designer with a point of view made this for one specific client.
Never use em-dashes or en-dashes anywhere in copy. Use commas, colons or full stops.
`.trim();

export function buildSpecPrompt(brief: string, previousSpec: SiteSpec | null): string {
  const iterating = previousSpec
    ? `
This is a revision, not a new site. The current design system is below. Change only
what the new instruction asks for and carry everything else through unchanged. If the
instruction is about colour, do not also rewrite the sitemap.

CURRENT SPEC:
${JSON.stringify(previousSpec, null, 2)}
`.trim()
    : "";

  return `
You are the design director for a website that is about to be built. You are not
writing the site yet. You are deciding what it should be, so that whoever writes it
has no room to drift.

THE BRIEF:
${brief}

${iterating}

If the brief names a real company as a reference (for example "like Perfios"), use
web search to read that company's actual site first. Take its information
architecture: how many sections, what order, how it explains a multi-stage service,
how dense the writing is. Take none of its branding, colours, wording, or name. Write
one or two sentences in referenceRead saying what you took structurally.

DECIDE THE DESIGN SYSTEM FROM THE BRIEF, NOT FROM HABIT.
Let the sector drive it. Security, infrastructure, and data companies read as dark,
dense, precise, and quiet. Consumer and wellness reads as light and open. Finance
reads as restrained and typographic. A cybersecurity firm should never come back
cream and serif.

Pick fonts by naming one key from this list for display and one for body:
${Object.keys(FONT_STACKS).join(", ")}
Display and body may be the same key only if the result still has hierarchy.

Palette rules: five colours, hex, and they must actually work together. Body text on
background must clear a 7:1 contrast ratio, muted text 4.5:1. The accent appears on
roughly a tenth of the page, never as a full-width band behind everything.

Sitemap: five to seven sections. The first is the hero. Every other section must earn
its place from the brief. If the brief describes a process with stages, one section
walks the stages in order. Give each section an intent line saying what the reader
should understand by the end of it, because that is what the writer will execute.

${HOUSE_RULES}

Return ONLY a JSON object, no prose, no code fence:
{
  "name": "the company name, invented from the brief if not given",
  "tagline": "six to ten words, specific, no buzzwords",
  "mood": "four or five adjectives, comma separated",
  "referenceRead": "what you took structurally from the reference, or null",
  "palette": { "bg": "#...", "surface": "#...", "fg": "#...", "muted": "#...", "accent": "#...", "accentFg": "#..." },
  "fonts": { "display": "<key>", "body": "<key>" },
  "sections": [ { "id": "hero", "title": "...", "intent": "..." } ]
}
`.trim();
}

export function buildHtmlPrompt(spec: SiteSpec, brief: string, previousHtml: string | null): string {
  const display = FONT_STACKS[spec.fonts?.display] || FONT_STACKS.grotesk;
  const body = FONT_STACKS[spec.fonts?.body] || FONT_STACKS.grotesk;

  const revising = previousHtml
    ? `
This is a revision. Below is the current page. Apply the brief's change and return the
whole file again. Preserve every section, all copy, and all structure that the change
does not touch. Do not take the opportunity to rewrite anything else.

CURRENT PAGE:
${previousHtml}
`.trim()
    : "";

  return `
Write the complete website now, as one self-contained HTML file, executing the design
system exactly. The system is already decided. Your job is craft, not reinvention.

THE BRIEF:
${brief}

THE DESIGN SYSTEM:
${JSON.stringify(spec, null, 2)}

Resolved font stacks, use these verbatim in CSS:
  display: ${display}
  body:    ${body}

${revising}

HARD REQUIREMENTS:
- One file. Inline <style> in the head. No external stylesheets, no CDN, no webfonts,
  no external images, no analytics. Any icon or graphic is inline SVG you draw.
- Define the palette once as CSS custom properties on :root, then use only var(...)
  below that. A hex code anywhere outside :root is a bug.
- Commit to the palette across the whole page. Do not add a light section into a dark
  design because the section "feels" lighter.
- Responsive with flexbox or grid and relative units. The body must never scroll
  horizontally at 360px wide. Any wide element scrolls inside its own container.
- Real copy for every section, written from the brief, at the density the reference
  read implies. Specific claims, concrete nouns. No placeholder text of any kind.
- Type scale: one clamp()-based scale, at most five sizes, used consistently.
  Body copy has a max line length around 70 characters.
- Generous vertical rhythm between sections. Whitespace is the main tool.
- Motion is allowed only as small hover transitions and a prefers-reduced-motion
  guard. No autoplaying carousels, no scroll hijacking.
- Semantic HTML: header, nav, main, section, footer, one h1, headings in order,
  alt text on every SVG via <title>, visible :focus styles on links and buttons.
- Include a <title> and a meta description written from the brief.

${HOUSE_RULES}

Return ONLY the HTML file. Start at <!doctype html> and end at </html>. No commentary
before or after, no markdown code fence.
`.trim();
}

/* ---------------------------------------------------------------------------
   Editing an existing page.

   "Make it red" must not rebuild anything. The page already exists, the design
   system already exists, and the person asked for one thing. So instead of
   regenerating, we ask for the smallest set of exact string replacements and
   apply them ourselves.

   This is fast because the model writes a few strings instead of a thousand
   lines, and it is safe because we refuse any replacement that does not match
   exactly once rather than guessing where it was meant to go.

   It works this well because of a rule imposed on the build stage: the palette
   is defined once in :root and a hex anywhere else is a bug. That makes a
   colour change one line, every time.
   --------------------------------------------------------------------------- */

export type SiteEdit = { find: string; replace: string };

export type EditPlan =
  | { mode: "edit"; summary: string; edits: SiteEdit[]; palette?: Partial<SitePalette> }
  | { mode: "rebuild"; why: string };

export function buildEditPrompt(html: string, instruction: string, spec: SiteSpec | null): string {
  return `
You are editing a website that already exists. Someone has asked for one change.
Make exactly that change and nothing else.

THE CHANGE THEY ASKED FOR:
${instruction}

${spec ? `THE DESIGN SYSTEM THIS PAGE WAS BUILT ON:\n${JSON.stringify(spec, null, 2)}\n` : ""}
THE CURRENT PAGE:
${html}

HOW TO MAKE THE CHANGE:
- The palette is defined once, as custom properties on :root. A colour change is
  almost always one line there. Prefer that over touching anything further down.
- Write colours as hex, never as a CSS keyword. "red" is a colour name, #C8322B is
  a decision: pick the shade that actually suits this page and say it in hex.
- A colour change is rarely only one colour. If the new background makes the body
  text or the accent unreadable against it, move those too, in the same edit.
- Return exact string replacements. Each "find" must appear EXACTLY ONCE in the
  page above, so include enough surrounding characters to be unique. A find
  string that appears twice will be rejected and the change will not happen.
- Copy "find" character for character from the page, including whitespace.
- Do not reformat, do not tidy, do not improve anything adjacent. If you noticed
  something else wrong, leave it. They did not ask.
- Keep it to as few replacements as the change genuinely needs.

If the request cannot be done by replacing strings, because it needs a whole new
section, a different page structure, or a different design direction, do not
force it. Say so instead and it will be rebuilt properly.

Never use em-dashes or en-dashes in any copy you write.

Return ONLY JSON, no prose, no code fence, in one of these two shapes:

{"mode":"edit","summary":"<one short sentence in plain language, e.g. Background is now red>","edits":[{"find":"...","replace":"..."}],"palette":{"bg":"#..."}}

{"mode":"rebuild","why":"<short reason this needs rebuilding>"}

The "palette" key is optional and only for when you changed a colour: give the
updated values so the design system on file stays true to the page.
`.trim();
}

export function parseEditPlan(raw: string): EditPlan {
  let text = String(raw || "").trim();
  const fence = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  if (fence) text = fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) text = text.slice(first, last + 1);

  const plan = JSON.parse(text) as EditPlan;
  if (plan?.mode === "rebuild") return plan;
  if (plan?.mode !== "edit" || !Array.isArray(plan.edits) || !plan.edits.length) {
    throw new Error("The change came back in a shape I could not apply.");
  }
  return plan;
}

/** Apply replacements, refusing anything ambiguous. A find string that is missing
 *  or appears more than once means the model is guessing about where the change
 *  goes, and a wrong guess silently corrupts the page. Better to fall back to a
 *  rebuild than to write a plausible-looking mess. */
export function applyEdits(html: string, edits: SiteEdit[]): { html: string; applied: number } {
  let next = html;
  let applied = 0;

  for (const edit of edits) {
    const find = String(edit?.find ?? "");
    const replace = String(edit?.replace ?? "");
    if (!find) throw new Error("One of the changes had nothing to find.");

    const firstAt = next.indexOf(find);
    if (firstAt === -1) {
      throw new Error(`Could not find the part to change: ${find.slice(0, 60)}`);
    }
    if (next.indexOf(find, firstAt + find.length) !== -1) {
      throw new Error(`That change was ambiguous, it matched more than one place: ${find.slice(0, 60)}`);
    }

    next = next.slice(0, firstAt) + replace + next.slice(firstAt + find.length);
    applied += 1;
  }

  return { html: next, applied };
}

// The model is asked for bare HTML, and usually obliges. Usually is not a contract,
// so strip the fence when it appears rather than publishing a page that renders a
// literal ``` at the top.
export function cleanHtml(raw: string): string {
  let html = String(raw || "").trim();
  const fence = html.match(/^```(?:html)?\s*\n([\s\S]*?)\n?```$/);
  if (fence) html = fence[1].trim();
  const idx = html.toLowerCase().indexOf("<!doctype");
  if (idx > 0) html = html.slice(idx);
  return html.trim();
}

// Spec comes back as JSON from a model that was told not to use a code fence. Same
// reasoning as cleanHtml: recover rather than fail the build on formatting.
export function parseSpec(raw: string): SiteSpec {
  let text = String(raw || "").trim();
  const fence = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  if (fence) text = fence[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first > 0 || last < text.length - 1) {
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }
  const spec = JSON.parse(text) as SiteSpec;
  if (!spec?.palette?.bg || !Array.isArray(spec?.sections) || !spec.sections.length) {
    throw new Error("Design system came back incomplete.");
  }
  return spec;
}
