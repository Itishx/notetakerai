import React, { useEffect, useRef, useState } from "react";
import { explain } from "../engines";
import { ago } from "../lib";
import type { Engine } from "../store";

/* Small, self-contained pieces. Everything reads the --fx tokens only, so they
   can move into the Mac app later without the page around them. */

export const ENGINE_NAME: Record<Engine, string> = { optics: "Optics", content: "Content", outreach: "Outreach" };
export const ENGINE_LINE: Record<Engine, string> = {
  optics: "They find you. Fixes how Google and AI assistants answer when buyers ask.",
  content: "They see you. Public posts about what you are doing, with where and when.",
  outreach: "You reach them. Real people asking today, one message each, moved toward paid.",
};

export const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg className="fx-ico" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><path d={d} /></svg>
);
export const IC = {
  home: "M4 11l8-7 8 7v9h-5v-6H9v6H4z",
  optics: "M11 4a7 7 0 1 0 0 14a7 7 0 0 0 0-14zM20 20l-4-4",
  content: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  outreach: "M4 6h16v10H8l-4 4zM8 10h8",
  inbox: "M4 13l2-8h12l2 8v6H4zM4 13h5l1 2h4l1-2h5",
  memory: "M12 4a4 4 0 0 1 4 4a4 4 0 0 1 3 6a4 4 0 0 1-4 5h-6a4 4 0 0 1-4-5a4 4 0 0 1 3-6a4 4 0 0 1 4-4zM12 4v15",
  gear: "M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1",
  plus: "M12 5v14M5 12h14",
  chev: "M8 10l4 4 4-4",
  close: "M6 6l12 12M18 6L6 18",
  menu: "M4 7h16M4 12h16M4 17h16",
  copy: "M8 8h11v11H8zM5 16V5h11",
  open: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  spark: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  play: "M8 5l11 7-11 7z",
  help: "M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
  sidebar: "M4 5h16v14H4zM9 5v14",
  arrow: "M5 12h14M13 6l6 6-6 6",
  up: "M7 17L17 7M9 7h8v8",
  filter: "M4 6h16M7 12h10M10 18h4",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
};

/* Breadcrumb above a page title: project, then the page. */
export function Crumb({ items }: { items: string[] }) {
  return <nav className="fx-crumb" aria-label="Breadcrumb">{items.filter(Boolean).map((x, i) => <span key={i}>{i > 0 && <i>/</i>}{x}</span>)}</nav>;
}

/* The (i) button is gone (2026-10-23): it said the same thing as "Explain
   this", and two buttons for one job was noise. Kept as a no-op so every
   caller still compiles; "Explain this" is the one way to ask. */
export function Hint(_props: { children: React.ReactNode; label?: string }) {
  return null;
}
/* "Explain this": asks the model about this section's real data. */
export function Explain({ title, data }: { title: string; data: unknown }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  async function go() {
    setOpen((o) => !o);
    if (text || busy) return;
    setBusy(true);
    try { setText(await explain(title, data)); } catch (_) { setText("Braino could not explain this right now. Try again in a moment."); }
    finally { setBusy(false); }
  }
  return (
    <span className="fx-explain" ref={ref}>
      <button type="button" className="fx-explain-b" onClick={go}><Icon d={IC.spark} size={13} />Explain this</button>
      {open && <span className="fx-pop wide" role="status">{busy ? <span className="fx-dots"><i /><i /><i /></span> : text}{!busy && text && <button className="fx-link" onClick={() => { setText(""); setOpen(false); }}>Ask again later</button>}</span>}
    </span>
  );
}

export function Section({ title, hint, explain: ex, actions, children, className = "" }: { title: string; hint?: React.ReactNode; explain?: unknown; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`fx-sec ${className}`}>
      <header className="fx-sec-h">
        <h2>{title}{hint && <Hint>{hint}</Hint>}</h2>
        <div className="fx-sec-a">{actions}{ex !== undefined && <Explain title={title} data={ex} />}</div>
      </header>
      {children}
    </section>
  );
}

export function Empty({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="fx-empty">
      <b>{title}</b>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Note({ children, tone = "calm" }: { children: React.ReactNode; tone?: "calm" | "warn" }) {
  return <div className={`fx-note ${tone}`}><span className="fx-note-i">i</span><div>{children}</div></div>;
}

export function Busy({ text }: { text: string }) {
  return <span className="fx-busy"><span className="fx-dots"><i /><i /><i /></span>{text}</span>;
}

/* Every engine page opens with the same header: what it does, status, last run. */
export function PageHead({ engine, title, status, last, onRun, running, explainData, crumb }: { engine?: Engine; title: string; status: string; last: number | null; onRun?: () => void; running?: string; explainData?: unknown; crumb?: string }) {
  return (
    <header className={`fx-head ${engine || ""}`}>
      <div className="fx-head-t">
        <Crumb items={[crumb || "", engine ? ENGINE_NAME[engine] : ""]} />
        <h1>{title}</h1>
        {engine && <p>{ENGINE_LINE[engine]}</p>}
      </div>
      <div className="fx-head-m">
        <span className={`fx-stat ${running ? "live" : ""}`}>{running ? <Busy text={running} /> : status}</span>
        <span className="fx-last">{last ? `Last run ${ago(last)}` : "Not run yet"}</span>
        <div className="fx-head-b">
          {explainData !== undefined && <Explain title={title} data={explainData} />}
          {onRun && <button className="fx-btn" disabled={!!running} onClick={onRun}>{running ? "Running" : "Run again"}</button>}
        </div>
      </div>
    </header>
  );
}

export function Chip({ status, opened }: { status: "waiting" | "approved" | "skipped"; opened?: boolean }) {
  return <span className={`fx-chip ${status}`}>{status === "approved" ? (opened ? "Approved, opened" : "Approved") : status === "skipped" ? "Skipped" : "Waiting for you"}</span>;
}

export function SideSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fx-sheet-wrap" onMouseDown={onClose}>
      <aside className="fx-sheet" role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <header><h3>{title}</h3><button className="fx-icon-b" aria-label="Close" onClick={onClose}><Icon d={IC.close} /></button></header>
        <div className="fx-sheet-b">{children}</div>
      </aside>
    </div>
  );
}

/* A field that reads like text and edits in place. */
export function Field({ label, value, onChange, multiline, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; hint?: string; placeholder?: string }) {
  return (
    <label className="fx-field">
      <span>{label}{hint && <Hint>{hint}</Hint>}</span>
      {multiline
        ? <textarea value={value} rows={3} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}
export function ListField({ label, items, onChange, hint, placeholder }: { label: string; items: string[]; onChange: (v: string[]) => void; hint?: string; placeholder?: string }) {
  return (
    <div className="fx-field">
      <span>{label}{hint && <Hint>{hint}</Hint>}</span>
      <ol className="fx-listf">
        {items.map((q, i) => (
          <li key={i}>
            <input value={q} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button className="fx-icon-b" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}><Icon d={IC.close} size={14} /></button>
          </li>
        ))}
      </ol>
      <button className="fx-link" onClick={() => onChange([...items, ""])}>{placeholder || "Add one"}</button>
    </div>
  );
}
