import React, { useMemo, useState } from "react";
import { copy, hostOf, mentions } from "./lib";
import { makeFix } from "./engines";
import { log, type Fix } from "./store";
import { namedCount, type PageProps } from "./types";
import { Bars, Ring } from "./components/charts";
import { Busy, Empty, Hint, Note, PageHead, Section, SideSheet } from "./components/ui";

export default function Optics({ p, up, busy, run }: PageProps) {
  const o = p.optics;
  const { name, site } = p.memory.product;
  const [open, setOpen] = useState<Fix | null>(null);
  const [making, setMaking] = useState("");
  const [err, setErr] = useState("");
  const named = namedCount(p);
  const rivals = useMemo(() => {
    const c = new Map<string, number>();
    (o?.answers || []).forEach((a) => a.names.forEach((n) => { if (!mentions(n, name, site)) c.set(n, (c.get(n) || 0) + 1); }));
    return [...c.entries()].sort((a, z) => z[1] - a[1]).slice(0, 5).map(([n, v]) => ({ name: n, value: v }));
  }, [o, name, site]);

  async function doIt(f: Fix) {
    setOpen(f); setErr("");
    if (o?.made[f.id]) return;
    setMaking(f.id);
    try {
      const m = await makeFix(p, f);
      up((q) => (q.optics ? log({ ...q, optics: { ...q.optics, made: { ...q.optics.made, [f.id]: m } } }, "optics", `Wrote the finished piece for "${f.what}"`) : q));
    } catch (e) { setErr(String((e as Error).message || e)); }
    finally { setMaking(""); }
  }
  const made = open && o ? o.made[open.id] : null;

  return (
    <div className="fx-page">
      <PageHead engine="optics" title="Get found" status={o ? `Named in ${named} of ${o.answers.length}` : "Not run yet"} last={o?.at || null} onRun={run.optics} running={busy.optics} explainData={o ? { named, of: o.answers.length, rivals, fixes: o.fixes.map((f) => f.what) } : undefined} />
      {!o ? (
        <Empty title="Optics has not looked yet" action={<button className="fx-btn" disabled={!!busy.optics} onClick={run.optics}>{busy.optics ? <Busy text={busy.optics} /> : "Check how buyers find me"}</button>}>
          It asks an AI assistant and Google your 8 buyer questions and shows who gets named instead of you.
        </Empty>
      ) : (
        <>
          <div className="fx-grid2">
            <Section title="Your score" hint="How many of your buyer questions an AI assistant answers with your name. The goal is to be named in most of them." explain={{ named, of: o.answers.length }}>
              <div className="fx-vis">
                <Ring n={named} of={o.answers.length} label="named" />
                <div className="fx-vis-t">
                  <div><b className="fx-num">{named} of {o.answers.length}</b><span>AI answers name you</span></div>
                  <div><b className="fx-num">{o.google.length ? `${o.google.filter((g) => g.found).length} of ${o.google.length}` : "Not checked"}</b><span>Google searches with you on page one</span></div>
                </div>
              </div>
            </Section>
            <Section title="Who gets named instead" hint="The names an AI assistant gave for your buyers' questions, and how many questions each one won." explain={rivals}>
              {rivals.length ? <Bars you={{ name: name || "You", value: named }} rows={rivals} /> : <Empty title="Nobody else">You are the only name that came up.</Empty>}
            </Section>
          </div>

          <Section title="Question by question" hint="Each row is a question a buyer asks. AI: did the assistant name you. Google: was your site or your exact name on page one. Google only checks 3 searches per run, to keep it fast." explain={o.answers.map((a) => ({ q: a.question, named: a.names.some((n) => mentions(n, name, site)) }))}>
            {o.googleNote && <Note>{o.googleNote} The AI column still works.</Note>}
            <div className="fx-qgrid" role="table">
              <div className="fx-qgrid-h" role="row"><span>Buyer question</span><span>AI</span><span>Google</span></div>
              {o.answers.map((a, i) => {
                const ai = a.names.some((n) => mentions(n, name, site));
                const g = o.google.find((x) => x.query.toLowerCase() === a.question.toLowerCase());
                return (
                  <details key={i} className="fx-qrow" role="row">
                    <summary>
                      <span>{a.question}</span>
                      <span className={`fx-yes ${ai ? "y" : "n"}`}>{ai ? "Named" : "Not named"}</span>
                      <span className={`fx-yes ${g ? (g.found ? "y" : "n") : "na"}`}>{g ? (g.found ? "Page one" : "Not found") : "Not checked"}</span>
                    </summary>
                    <div className="fx-qrow-b">
                      <small>Where you were found</small>
                      {ai || g?.found ? (
                        <ul>{ai && <li>Named by the AI assistant</li>}{g?.found && <li><a href={g.found} target="_blank" rel="noopener noreferrer">{hostOf(g.found)}</a> on Google</li>}</ul>
                      ) : <p>Nowhere yet for this question.</p>}
                      <small>Named instead</small>
                      <p>{a.names.filter((n) => !mentions(n, name, site)).join(", ") || "No one"}</p>
                      {g && g.results.length > 0 && <><small>Google page one</small><ul>{g.results.slice(0, 4).map((r, j) => <li key={j}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> <span className="fx-faint">{hostOf(r.url)}</span></li>)}</ul></>}
                    </div>
                  </details>
                );
              })}
              {o.google.filter((g) => !o.answers.some((a) => a.question.toLowerCase() === g.query.toLowerCase())).map((g, i) => (
                <details key={`g${i}`} className="fx-qrow" role="row">
                  <summary><span>{g.query} <span className="fx-src">from a buyer quote</span></span><span className="fx-yes na">Not asked</span><span className={`fx-yes ${g.found ? "y" : "n"}`}>{g.found ? "Page one" : "Not found"}</span></summary>
                  <div className="fx-qrow-b"><small>Google page one</small><ul>{g.results.slice(0, 4).map((r, j) => <li key={j}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> <span className="fx-faint">{hostOf(r.url)}</span></li>)}</ul></div>
                </details>
              ))}
            </div>
          </Section>

          <Section title="Fixes" hint="What to publish, and where, so AI and Google start naming you. Do it for me writes the finished piece and tells you exactly where it goes." explain={o.fixes.map((f) => `${f.what} on ${f.where}`)}>
            {o.fixes.length ? (
              <ol className="fx-fixes">
                {o.fixes.map((f, i) => (
                  <li key={f.id} className={f.done ? "done" : ""}>
                    <span className="fx-fixes-n">{i + 1}</span>
                    <div className="fx-fixes-t">
                      <b>{f.what}</b>
                      <small>{f.where} · for "{f.question}"{f.from === "objection" && <span className="fx-src">from a buyer's reply</span>}</small>
                    </div>
                    <div className="fx-fixes-a">
                      <button className="fx-btn sm" onClick={() => doIt(f)}>{making === f.id ? "Writing" : o.made[f.id] ? "Open" : "Do it for me"}</button>
                      <label className="fx-check"><input type="checkbox" checked={!!f.done} onChange={(e) => up((q) => q.optics ? { ...q, optics: { ...q.optics, fixes: q.optics.fixes.map((x) => x.id === f.id ? { ...x, done: e.target.checked } : x) } } : q)} />Done</label>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <Empty title="No fixes">You are named everywhere Optics looked. Add more buyer questions on Product and founder.</Empty>}
          </Section>
        </>
      )}

      <SideSheet open={!!open} onClose={() => setOpen(null)} title={open?.what || ""}>
        {err && <Note tone="warn">{err}</Note>}
        {!made && !err && <div className="fx-sheet-wait"><Busy text="Writing the finished piece" /></div>}
        {made && (
          <>
            <div className="fx-sheet-s"><small>Put it here</small><b>{made.where}</b></div>
            <div className="fx-sheet-s"><small>How, step by step</small><ol className="fx-steps">{made.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>
            <div className="fx-sheet-s"><small>Copy this <Hint>Paste it as it is, or change anything that does not sound like you.</Hint></small><pre className="fx-piece">{made.content}</pre></div>
            <footer className="fx-sheet-f">
              <button className="fx-btn" onClick={() => { void copy(made.content); if (made.link) window.open(made.link, "_blank", "noopener"); }}>Copy and open</button>
              <button className="fx-ghost" onClick={() => void copy(made.content)}>Copy only</button>
            </footer>
          </>
        )}
      </SideSheet>
    </div>
  );
}
