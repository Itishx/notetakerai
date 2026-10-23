/* A heading before a group of sections, the way the website puts a kicker and
   a heading before it explains anything (2026-10-23). "Step 2 · Where you
   stand today", then one plain line on what this part answers. */
export function Group({ step, title, line, engine }: { step: number; title: string; line: string; engine: "optics" | "content" | "outreach" }) {
  return (
    <header className={`fx-group ${engine}`}>
      <p className="fx-group-k"><span>{step}</span>Step {step}</p>
      <h2>{title}</h2>
      <p className="fx-group-l">{line}</p>
    </header>
  );
}
