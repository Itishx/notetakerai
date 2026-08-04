import { useEffect, useMemo, useRef, useState } from "react";
import { beatsToScriptText, parseScriptText, type KBeat } from "@/lib/kineticFilm";
import { findActiveIndex, type ScriptLine } from "@/lib/teaserScript";
import "./script-editor.css";

/* ============================================================================
   ScriptEditor — edit the film by selecting words with your mouse, like
   normal. No syntax, no symbols on screen: what you see is always plain,
   clean text. Under the hood the same //, ///, **big**, *emphasis* markup
   parseScriptText() understands is still there — this component just never
   shows it to you.
     - select a chunk, a little menu appears: Match cut / 3x cut / Bigger / Shimmer
     - click into any line and retype it directly — untouched parts of the
       line keep their existing cuts, only what you actually changed resets
     - drag a line by its handle to reorder it
     - attach a graphic to a line — describe it to Braino in chat, drop the
       image path in here once it's made
     - paste a whole new script — auto-split one sentence per beat
   Non-text beat fields (hero/heroMode/snap/cadence/gapAfter/graphic) don't
   round-trip through the plain-text format, so they're tracked separately
   as `extras`, keyed by line position, and merged back in on every commit —
   otherwise every edit would silently drop them.
   ============================================================================ */

type Action = "cut" | "strobe" | "big" | "shimmer";
const ACTIONS: { key: Action; label: string }[] = [
  { key: "cut", label: "Match cut" },
  { key: "strobe", label: "3× cut" },
  { key: "big", label: "Bigger" },
  { key: "shimmer", label: "Shimmer" },
];

type Extra = Pick<KBeat, "hero" | "heroMode" | "snap" | "cadence" | "gapAfter" | "graphic">;
const extraOf = (b?: KBeat): Extra => ({
  hero: b?.hero, heroMode: b?.heroMode, snap: b?.snap, cadence: b?.cadence, gapAfter: b?.gapAfter, graphic: b?.graphic,
});

// Strip the raw //, ///, **word**, *word* markup out of one line, producing
// the plain text you actually see + a map from each visible character back
// to its position in the raw string (so an edit can be re-inserted at the
// right spot). map[display.length] is always the raw string's own length.
function stripMarkup(raw: string): { display: string; map: number[] } {
  let display = "";
  const map: number[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw.startsWith("**", i)) {
      const close = raw.indexOf("**", i + 2);
      const end = close === -1 ? raw.length : close;
      for (let j = i + 2; j < end; j++) { display += raw[j]; map.push(j); }
      i = close === -1 ? raw.length : close + 2;
      continue;
    }
    if (raw.startsWith("///", i)) { i += 3; continue; }
    if (raw.startsWith("//", i)) { i += 2; continue; }
    if (raw[i] === "*") { i += 1; continue; }
    display += raw[i]; map.push(i);
    i += 1;
  }
  map.push(raw.length);
  return { display, map };
}

// selection with no internal space -> split at the midpoint (word-chunk
// fuse). Selection spanning multiple words -> mark goes between EACH word
// (the every-word "LetsFuckingGo"/IOMI formula) — same rule the parser uses.
function markSelection(selected: string, mark: "//" | "///"): string {
  const words = selected.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    const w = words[0] ?? selected;
    const cut = Math.max(1, Math.floor(w.length / 2));
    return w.slice(0, cut) + mark + w.slice(cut);
  }
  return words.join(` ${mark} `);
}

// retyping a line directly: keep the RAW markup on whatever prefix/suffix is
// still the same as before, only the part you actually changed loses its
// cuts (it's new text, it never had any).
function reconcileEdit(oldRaw: string, oldDisplay: string, map: number[], newDisplay: string): string {
  let p = 0;
  const maxP = Math.min(oldDisplay.length, newDisplay.length);
  while (p < maxP && oldDisplay[p] === newDisplay[p]) p++;
  let s = 0;
  const maxS = maxP - p;
  while (s < maxS && oldDisplay[oldDisplay.length - 1 - s] === newDisplay[newDisplay.length - 1 - s]) s++;
  const rawPrefixEnd = map[p];
  const rawSuffixStart = map[oldDisplay.length - s];
  const newMiddle = newDisplay.slice(p, newDisplay.length - s);
  return oldRaw.slice(0, rawPrefixEnd) + newMiddle + oldRaw.slice(rawSuffixStart);
}

// paste a whole script (or a line with several sentences run together) ->
// one beat per sentence, auto-split on ./!/? — the "Motion Editor" entry point.
function splitIntoSentences(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const parts = trimmed.match(/[^.!?]+[.!?]*(\s+|$)/g) ?? [trimmed];
  return parts.map((p) => p.trim()).filter(Boolean);
}

type Popover = { x: number; y: number; lineIdx: number; start: number; end: number };

export default function ScriptEditor({
  beats,
  onApply,
  scriptLines,
  currentMs,
}: {
  beats: KBeat[];
  onApply: (beats: KBeat[], focusIdx?: number) => void;
  scriptLines: ScriptLine[];
  currentMs: number;
}) {
  const [editing, setEditing] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [rawLines, setRawLines] = useState<string[]>(() => beatsToScriptText(beats).split("\n"));
  const [extras, setExtras] = useState<Extra[]>(() => beats.map(extraOf));
  const [rewriteText, setRewriteText] = useState("");
  const [popover, setPopover] = useState<Popover | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIdx = findActiveIndex(scriptLines, currentMs);

  const parsed = useMemo(() => rawLines.map(stripMarkup), [rawLines]);
  const placeholderFor = (i: number) =>
    extras[i]?.graphic ? "🖼 Graphic — no text, just the image" : "(empty beat — a silent hold)";

  useEffect(() => {
    if (activeIdx < 0 || editing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    lineRefs.current[activeIdx]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx, editing]);

  // contentEditable is DOM-owned once mounted — React re-rendering {p.display}
  // as its children does NOT reliably push the update into the actual DOM.
  // Without this, a toolbar action (or any commit) leaves the line showing
  // stale or even raw //, ///, * markup instead of the freshly-stripped
  // clean text. Skip whichever line is currently focused so we don't stomp
  // on an in-progress keystroke/caret position.
  useEffect(() => {
    if (!editing || rewriting) return;
    parsed.forEach((p, i) => {
      const el = lineRefs.current[i];
      if (!el || document.activeElement === el) return;
      const want = p.display || placeholderFor(i);
      if (el.textContent !== want) el.textContent = want;
    });
  }, [parsed, extras, editing, rewriting]);

  const commit = (next: string[], nextExtras: Extra[], focusIdx?: number) => {
    setRawLines(next);
    setExtras(nextExtras);
    const parsedBeats = parseScriptText(next.join("\n"));
    const merged = parsedBeats.map((b, i) => ({ ...b, ...nextExtras[i] }));
    onApply(merged, focusIdx);
  };

  useEffect(() => {
    if (!editing || rewriting) return;
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setPopover(null); return; }
      const range = sel.getRangeAt(0);
      if (range.startContainer !== range.endContainer || !containerRef.current?.contains(range.startContainer)) {
        setPopover(null); return;
      }
      const lineEl = (range.startContainer.parentElement)?.closest<HTMLElement>("[data-line]");
      if (!lineEl) { setPopover(null); return; }
      const lineIdx = Number(lineEl.dataset.line);
      if (!parsed[lineIdx] || parsed[lineIdx].display.length === 0) { setPopover(null); return; }
      const start = Math.min(range.startOffset, range.endOffset);
      const end = Math.max(range.startOffset, range.endOffset);
      if (start === end || end > parsed[lineIdx].display.length) { setPopover(null); return; }
      const rect = range.getBoundingClientRect();
      // anchored to a fixed x inside the (narrow, far-left) panel, not
      // centred on the selection — centring pushed it past the left edge
      // of the viewport and clipped it for selections near the panel edge.
      setPopover({ x: 16, y: rect.top, lineIdx, start, end });
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [editing, rewriting, parsed]);

  const runAction = (action: Action) => {
    if (!popover) return;
    const { lineIdx, start, end } = popover;
    const { map } = parsed[lineIdx];
    const raw = rawLines[lineIdx];
    const rawStart = map[start];
    const rawEnd = map[end];
    const selected = raw.slice(rawStart, rawEnd);
    const replacement =
      action === "cut" ? markSelection(selected, "//") :
      action === "strobe" ? markSelection(selected, "///") :
      action === "big" ? `**${selected}**` :
      `*${selected}*`;
    const nextLine = raw.slice(0, rawStart) + replacement + raw.slice(rawEnd);
    const next = rawLines.slice();
    next[lineIdx] = nextLine;
    commit(next, extras, lineIdx);
    setPopover(null);
    window.getSelection()?.removeAllRanges();
  };

  const onLineBlur = (i: number, e: React.FocusEvent<HTMLDivElement>) => {
    const newDisplay = e.currentTarget.textContent ?? "";
    const { display: oldDisplay, map } = parsed[i];
    if (newDisplay === oldDisplay) return;
    const next = rawLines.slice();
    next[i] = reconcileEdit(rawLines[i], oldDisplay, map, newDisplay);
    commit(next, extras, i);
  };

  const addLine = () => commit(rawLines.concat("New line"), extras.concat({}), rawLines.length);
  const deleteLine = (i: number) => {
    const next = rawLines.slice(0, i).concat(rawLines.slice(i + 1));
    const nextExtras = extras.slice(0, i).concat(extras.slice(i + 1));
    commit(next.length ? next : [""], next.length ? nextExtras : [{}]);
    setPopover(null);
  };
  const moveLine = (from: number, to: number) => {
    if (from === to) return;
    const next = rawLines.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const nextExtras = extras.slice();
    const [movedExtra] = nextExtras.splice(from, 1);
    nextExtras.splice(to, 0, movedExtra);
    commit(next, nextExtras, to);
  };

  const addGraphic = (i: number) => {
    const url = window.prompt(
      "Image path or URL for this beat. Describe the graphic you want to Braino in chat first — it'll generate it and hand you a path to paste here.",
      extras[i]?.graphic ?? "",
    );
    if (url === null) return;
    const nextExtras = extras.slice();
    nextExtras[i] = { ...nextExtras[i], graphic: url || undefined };
    commit(rawLines, nextExtras, i);
  };

  // a graphic doesn't have to sit ON a line of text — this inserts its own
  // beat (no words, just the image) at the end. Drag it by its handle to
  // wherever in the sequence you actually want it to play.
  const addGraphicBeat = () => {
    const url = window.prompt("Image path or URL. Describe the graphic to Braino in chat first — it'll generate it and hand you a path to paste here.", "");
    if (!url) return;
    commit(rawLines.concat(""), extras.concat({ graphic: url }), rawLines.length);
  };

  const openRewrite = () => {
    setRewriteText(parsed.map((p) => p.display).join("\n"));
    setRewriting(true);
    setPopover(null);
  };
  const applyRewrite = () => {
    // a rewrite starts clean — no way to preserve old cut positions or
    // extras against arbitrarily changed words — and auto-splits into one
    // beat per sentence, so pasting a whole paragraph just works.
    const next = rewriteText.split("\n").flatMap(splitIntoSentences);
    commit(next, next.map(() => ({})));
    setRewriting(false);
  };

  if (!editing) {
    return (
      <div className="nt-script-panel se-panel">
        <button type="button" className="se-edit-btn" onClick={() => setEditing(true)}>✎ Edit script</button>
        {scriptLines.map((line, i) => (
          <div
            key={i}
            ref={(el) => { lineRefs.current[i] = el; }}
            className={"nt-script-line" + (i === activeIdx ? " active" : "")}
          >
            {line.text}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="nt-script-panel se-panel se-editing" ref={containerRef}>
      <div className="se-head">
        <span>Editing script — select text, or click a line to retype it</span>
        <button type="button" className="se-edit-btn" onClick={() => setEditing(false)}>Done</button>
      </div>

      {!rewriting && (
        <>
          {parsed.map((p, i) => (
            <div
              key={i}
              className={"se-line-row" + (dragIdx === i ? " se-dragging" : "")}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragIdx != null) moveLine(dragIdx, i); setDragIdx(null); }}
              onDragEnd={() => setDragIdx(null)}
            >
              <span className="se-line-handle" title="Drag to reorder">⠿</span>
              <div
                data-line={i}
                ref={(el) => { lineRefs.current[i] = el; }}
                className={"se-line" + (!p.display ? " se-line-empty" : "")}
                contentEditable
                suppressContentEditableWarning
                onFocus={(e) => { if (!p.display) e.currentTarget.textContent = ""; }}
                onBlur={(e) => onLineBlur(i, e)}
              >
                {p.display || placeholderFor(i)}
              </div>
              <button
                type="button"
                className={"se-line-graphic" + (extras[i]?.graphic ? " on" : "")}
                title={extras[i]?.graphic ? "Change graphic" : "Attach a graphic"}
                onClick={() => addGraphic(i)}
              >
                🖼
              </button>
              <button type="button" className="se-line-del" title="Delete line" onClick={() => deleteLine(i)}>✕</button>
            </div>
          ))}
          <div className="se-add-row">
            <button type="button" className="se-add-line" onClick={addLine}>+ Add line</button>
            <button type="button" className="se-add-line" onClick={addGraphicBeat}>+ Add graphic</button>
          </div>
          <button type="button" className="se-rewrite-link" onClick={openRewrite}>
            Paste or write a whole new script instead
          </button>
          <button type="button" className="se-apply" onClick={() => commit(rawLines, extras)}>💾 Save &amp; Apply</button>
        </>
      )}

      {rewriting && (
        <>
          <textarea
            className="se-textarea"
            value={rewriteText}
            onChange={(e) => setRewriteText(e.target.value)}
            placeholder="Paste your script here — any length, any punctuation. It'll be split one sentence per beat automatically."
            spellCheck={false}
          />
          <div className="se-hint">Auto-split one sentence per beat on Apply. Existing match cuts and graphics reset — re-select and re-apply them after.</div>
          <button type="button" className="se-apply" onClick={applyRewrite}>💾 Save &amp; Apply</button>
          <button type="button" className="se-rewrite-link" onClick={() => setRewriting(false)}>Cancel</button>
        </>
      )}

      {popover && !rewriting && (
        <div className="se-toolbar se-toolbar--float" style={{ left: popover.x, top: popover.y }}>
          {ACTIONS.map((a) => (
            <button key={a.key} type="button" onMouseDown={(e) => { e.preventDefault(); runAction(a.key); }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
