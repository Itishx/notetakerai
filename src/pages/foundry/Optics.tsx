import React, { useMemo, useState } from "react";
import { findRealQuestions } from "./engines";
import { Group } from "./components/group";
import { copy, hostOf, mentions } from "./lib";
import { checkCrawl, makeFix } from "./engines";
import { log, type Fix } from "./store";
import { isNamed, namedCount, namedRange, shareOfVoice, type PageProps } from "./types";
import { Ring } from "./components/charts";
import { Busy, Empty, Hint, Note, PageHead, Section, SideSheet } from "./components/ui";

export default function Optics({ p, up, busy, run }: PageProps) {
  const o = p.optics;
  const { name, site } = p.memory.product;
  const [open, setOpen] = useState<Fix | null>(null);
  const [making, setMaking] = useState("");
  const [err, setErr] = useState("");
  const named = namedCount(p);
  const range = namedRange(p);
  const sov = useMemo(() => shareOfVoice(p), [p]);
  const rivals = sov.board.filter((r) => !r.you).slice(0, 5);
  const [checking, setChecking] = useState(false);
  const [crawlErr, setCrawlErr] = useState("");
  async function crawl() {
    if (!site) { setCrawlErr("Add your website on Product and founder first."); return; }
    setChecking(true); setCrawlErr("");
    try {
      const c = await checkCrawl(site);
      up((q) => log({ ...q, optics: q.optics ? { ...q.optics, crawl: c } : { at: 0, answers: [], google: [], googleNote: "", fixes: [], made: {}, crawl: c } }, "optics", c.ok ? "Checked: AI crawlers can read your site" : `Checked your site: ${c.note}`));
    } catch (e) { setCrawlErr(String((e as Error).message || e)); }
    finally { setChecking(false); }
  }
  const [paste, setPaste] = useState("");
  /* Your real search questions (2026-10-23): paste them, or drop the Queries
     export from Google Search Console. Top 8 by how often people searched. */
  function applyQuestions(text: string) {
    const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const csv = rows[0] && /,|\t/.test(rows[0]) && /quer|search/i.test(rows[0]);
    let qs: string[];
    if (csv) {
      const sep = rows[0].includes("\t") ? "\t" : ",";
      const head = rows[0].split(sep).map((h) => h.replace(/"/g, "").trim().toLowerCase());
      const qi = Math.max(0, head.findIndex((h) => /quer|search/.test(h)));
      const ii = head.findIndex((h) => /impression/.test(h));
      qs = rows.slice(1).map((r) => r.split(sep).map((c) => c.replace(/^"|"$/g, "").trim()))
        .map((c) => ({ q: c[qi] || "", n: ii >= 0 ? Number(String(c[ii]).replace(/[^0-9.]/g, "")) || 0 : 0 }))
        .filter((x) => x.q.split(/\s+/).length >= 3).sort((a, z) => z.n - a.n).map((x) => x.q);
    } else qs = rows;
    qs = [...new Set(qs)].slice(0, 8);
    if (!qs.length) return;
    up((q) => log({ ...q, memory: { ...q.memory, buyer: { ...q.memory.buyer, questions: qs } } }, "you", `Gave ${qs.length} real buyer questions${csv ? " from Search Console" : ""}`));
    setPaste("");
  }
  const [finding, setFinding] = useState(false);
  async function refind() {
    setFinding(true);
    try {
      const b = await findRealQuestions(p.memory.product, p.memory.buyer);
      up((q) => log({ ...q, memory: { ...q.memory, buyer: b } }, "optics", `Found ${Object.values(b.sources || {}).filter((x) => x !== "Guessed by Braino").length} real buyer searches on Google and Reddit`));
    } finally { setFinding(false); }
  }
  const crawlBlock = (
    <Section title="Can AI read your site?" explain={o?.crawl ? { note: o.crawl.note, blocked: o.crawl.bots.filter((b) => !b.allowed).map((b) => b.who) } : undefined}
      actions={<button className="fx-ghost" disabled={checking} onClick={() => void crawl()}>{checking ? "Checking" : o?.crawl ? "Check again" : "Check my site"}</button>}>
      {crawlErr && <Note tone="warn">{crawlErr}</Note>}
      {o?.crawl ? (
        <>
          <p className={`fx-crawl-v ${o.crawl.ok ? "y" : "n"}`}>{o.crawl.note}</p>
          <ul className="fx-bots">{o.crawl.bots.map((b) => <li key={b.name} className={b.allowed ? "y" : "n"}><i />{b.who}<small>{b.allowed ? "Can read" : "Blocked"}</small></li>)}</ul>
          {o.crawl.bots.some((b) => !b.allowed) && (
            <div className="fx-fixbox"><small>The fix: add this to your robots.txt</small><pre className="fx-piece">{o.crawl.bots.filter((b) => !b.allowed).map((b) => `User-agent: ${b.name}\nAllow: /`).join("\n\n")}</pre><button className="fx-ghost" onClick={() => void copy(o.crawl!.bots.filter((b) => !b.allowed).map((b) => `User-agent: ${b.name}\nAllow: /`).join("\n\n"))}>Copy</button></div>
          )}
          {o.crawl.homeStatus > 0 && o.crawl.homeWords < 80 && <Note>Your home page shows about {o.crawl.homeWords} words without JavaScript. Most AI crawlers do not run JavaScript, so put your main words in the page itself (server rendering or a static page).</Note>}
        </>
      ) : <p className="fx-small">Checks whether ChatGPT, Claude, Perplexity, Gemini and Copilot are allowed to read {site ? site.replace(/^https?:\/\//, "") : "your site"}. If they are blocked, nothing else on this page can work. Takes a few seconds.</p>}
    </Section>
  );

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
      <PageHead engine="optics" title="Get found" status={o?.answers.length ? `Named in ${named} of ${o.answers.length}` : "Not run yet"} last={o?.at || null} onRun={run.optics} running={busy.optics} explainData={o ? { named, of: o.answers.length, rivals, fixes: o.fixes.map((f) => f.what) } : undefined} />
      <Group engine="optics" step={1} title="Can AI see you at all?" line="Before anything else: can AI assistants and Google actually read your website? If they cannot, nothing else here matters." />
      {crawlBlock}
      {!o || !o.answers.length ? (
        <Empty title="Optics has not looked yet" action={<button className="fx-btn" disabled={!!busy.optics} onClick={run.optics}>{busy.optics ? <Busy text={busy.optics} /> : "Check how buyers find me"}</button>}>
          It asks an AI assistant and Google your 8 buyer questions and shows who gets named instead of you.
        </Empty>
      ) : (
        <>
          <Group engine="optics" step={2} title="Where you stand today" line="How often AI recommends you when buyers ask, and who it recommends instead." />
          <div className="fx-grid2">
            <Section title="Your score" explain={{ named, low: range.low, high: range.high, of: o.answers.length, runs: range.runs, shareOfVoice: `${sov.pct}%` }}>
              <div className="fx-vis">
                <Ring n={named} of={o.answers.length} label="named" />
                <div className="fx-vis-t">
                  <div><b className="fx-num">{range.low === range.high ? `${named} of ${o.answers.length}` : `${range.low} to ${range.high} of ${o.answers.length}`}</b><span>{range.runs > 1 ? `AI answers name you, asked ${range.runs} times each` : "AI answers name you"}</span></div>
                  <div><b className="fx-num">{sov.pct}%</b><span>of every name AI gave is you</span></div>
                  <div><b className="fx-num">{o.google.length ? `${o.google.filter((g) => g.found).length} of ${o.google.length}` : "Not checked"}</b><span>Google searches with you on page one</span></div>
                </div>
              </div>
            </Section>
            <Section title="Leaderboard" explain={sov.board.slice(0, 6)}>
              {sov.total ? (
                <ol className="fx-board">
                  {sov.board.slice(0, 6).map((r, i) => (
                    <li key={r.name} className={r.you ? "you" : ""}>
                      <span className="fx-board-n">{i + 1}</span>
                      <span className="fx-board-name">{r.name}{r.you && <small>you</small>}</span>
                      <span className="fx-bars-t"><i style={{ width: `${(r.value / Math.max(1, sov.board[0].value)) * 100}%` }} /></span>
                      <b>{Math.round((r.value / sov.total) * 100)}%</b>
                    </li>
                  ))}
                  {!sov.board.slice(0, 6).some((r) => r.you) && <li className="you"><span className="fx-board-n">{sov.board.findIndex((r) => r.you) + 1}</span><span className="fx-board-name">{name || "You"}<small>you</small></span><span className="fx-bars-t"><i style={{ width: 0 }} /></span><b>{sov.pct}%</b></li>}
                </ol>
              ) : <Empty title="No names yet">Run Optics to see who AI recommends.</Empty>}
            </Section>
          </div>

          <Group engine="optics" step={3} title="Question by question" line="Each question a buyer might ask, whether AI and Google named you, and exactly what they said. Tap a question for detail." />
          <Section title="Question by question" hint="Each row is a question your buyer might ask. AI column: we ask GPT-5.6 the question 3 times, as a stranger would ask ChatGPT, and count how many of the 3 answers name you. It stands in for ChatGPT; it is not ChatGPT itself. Google column: is your site on page one. Only 3 questions are searched on Google per run, the rest say Not searched." explain={o.answers.map((a) => ({ q: a.question, named: a.names.some((n) => mentions(n, name, site)) }))}>
            {o.googleNote && <Note>{o.googleNote} The AI column still works.</Note>}
            <div className="fx-qgrid" role="table">
              <div className="fx-qgrid-h" role="row"><span>Buyer question (tap one for detail)</span><span>AI named you, out of 3 tries</span><span>Google page one</span></div>
              {o.answers.map((a, i) => {
                const ai = isNamed(p, a);
                const g = o.google.find((x) => x.query.toLowerCase() === a.question.toLowerCase());
                return (
                  <details key={i} className="fx-qrow" role="row">
                    <summary>
                      <span>{a.question}{p.memory.buyer.sources?.[a.question] && <span className={`fx-src qsrc${p.memory.buyer.sources[a.question] === "Guessed by Braino" ? " g" : ""}`}>{p.memory.buyer.sources[a.question]}</span>}</span>
                      <span className={`fx-yes ${ai ? "y" : (a.hits || 0) > 0 ? "m" : "n"}`}>{a.runs ? ((a.hits || 0) === 0 ? `Never (0 of ${a.runs})` : `${a.hits} of ${a.runs} tries`) : ai ? "Named" : "Not named"}</span>
                      <span className={`fx-yes ${g ? (g.found ? "y" : "n") : "na"}`}>{g ? (g.found ? "Yes" : "No") : "Not searched"}</span>
                    </summary>
                    <div className="fx-qrow-b">
                      <small>Who we asked</small>
                      <p>GPT-5.6, set up like ChatGPT talking to a stranger: it knows nothing about you. We asked "{a.question}" {a.runs || 1} {(a.runs || 1) === 1 ? "time" : "times"}{a.runs ? `, and it named you in ${a.hits || 0}` : ""}.</p>
                      {a.answer && <><small>What it said, word for word{a.runs && (a.hits || 0) > 0 ? " (an answer that named you)" : ""}</small><blockquote className="fx-said">{a.answer}</blockquote></>}
                      <small>Where you were found</small>
                      {ai || g?.found ? (
                        <ul>{ai && <li>In the AI's answer, {a.hits || 1} of {a.runs || 1} tries</li>}{g?.found && <li><a href={g.found} target="_blank" rel="noopener noreferrer">{hostOf(g.found)}</a> on Google</li>}</ul>
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

          <Group engine="optics" step={4} title="What to do about it" line="The pages and posts to publish so AI and Google start naming you. Braino can write each one for you." />
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
          <Section title="Add a question a customer asked you (optional)" explain={{ questions: p.memory.buyer.questions }}>
            <p className="fx-small">Braino already finds what buyers really search, from Google and Reddit; each question above says where it came from. Only use this if a customer asked you something directly and you want it checked too.</p>
            <div className="fx-acts"><button className="fx-ghost" disabled={finding} onClick={() => void refind()}>{finding ? "Finding real searches" : "Find real searches again"}</button></div>
            <textarea className="fx-paste" rows={4} value={paste} placeholder={"best app for pg rent reminders\nhow to collect rent on upi automatically"} onChange={(e) => setPaste(e.target.value)} />
            <div className="fx-acts">
              <button className="fx-btn sm" disabled={!paste.trim()} onClick={() => applyQuestions(paste)}>Use these</button>
              <label className="fx-ghost fx-upload">Upload Search Console file<input type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.text().then(applyQuestions); }} /></label>
              {!!p.memory.buyer.questions.length && <button className="fx-link" disabled={!!busy.optics} onClick={run.optics}>Run Optics with them</button>}
            </div>
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
