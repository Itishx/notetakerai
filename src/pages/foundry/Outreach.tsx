import React, { useEffect, useRef, useState } from "react";
import { Group } from "./components/group";
import "./components/brandmap.css";
import { copy, DAY } from "./lib";
import { followUp, learnObjection, replyTo } from "./engines";
import { log, PERSON_PLATFORMS, PERSON_PLATFORM_LABEL, STAGES, STAGE_LABEL, whereOf, type Person, type PersonPlatform, type Stage } from "./store";
import { followUpDue, type PageProps } from "./types";
import { approvePerson, moveStage, setPerson } from "./actions";
import { Meter } from "./components/charts";
import { Busy, Chip, Empty, Hint, Note, PageHead, Section } from "./components/ui";

function PersonCard({ x, p, up, go }: { x: Person; p: PageProps["p"]; up: PageProps["up"]; go: PageProps["go"] }) {
  /* The message may open with one of your own posts ("I wrote about this last
     week"). Find that post, and say plainly whether it is out yet: the line
     only makes sense once the post is live. */
  const openerTopic = x.opener ? p.memory.topics.find((t) => t.title.toLowerCase() === x.opener.toLowerCase()) || p.memory.topics.find((t) => t.title.toLowerCase().includes(x.opener.toLowerCase().slice(0, 24))) : undefined;
  const openerPosts = openerTopic ? p.posts.filter((q) => q.topicId === openerTopic.id) : [];
  const openerLive = openerPosts.some((q) => q.status === "approved");
  const [editing, setEditing] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const days = Math.floor((Date.now() - x.stageAt) / DAY);

  async function onReply() {
    if (!reply.trim()) return;
    setBusy(true); setErr("");
    try {
      const r = await replyTo(p, x, reply.trim());
      up((q) => {
        const stage: Stage = STAGES.indexOf(r.stage) > STAGES.indexOf(x.stage) ? r.stage : x.stage === "messaged" || x.stage === "found" ? "replied" : x.stage;
        let n = { ...q, people: q.people.map((y) => y.id === x.id ? { ...y, stage, stageAt: Date.now(), followUp: "", thread: [...y.thread, { at: Date.now(), from: "them" as const, text: reply.trim() }, { at: Date.now(), from: "us" as const, text: r.answer, note: r.nudge }] } : y) };
        n = log(n, "outreach", `${whereOf(x)} replied. Drafted an answer${r.nudge ? ` that moves toward ${r.nudge.toLowerCase()}` : ""}`);
        return learnObjection(n, x, r.objection, r.objectionAnswer);
      });
      setReply(""); setPasting(false);
    } catch (e) { setErr(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }
  const lastUs = [...x.thread].reverse().find((m) => m.from === "us");

  return (
    <article className={`fx-person ${x.stage}`}>
      <header>
        <span className="fx-plat"><span className="fx-pchip">{PERSON_PLATFORM_LABEL[x.platform || "reddit"]}</span> {whereOf(x)}</span>
        {x.stage === "found" ? <Chip status={x.status} /> : <span className="fx-faint">{days ? `${days} day${days === 1 ? "" : "s"} in ${STAGE_LABEL[x.stage]}` : `In ${STAGE_LABEL[x.stage]} today`}</span>}
      </header>
      <a className="fx-person-t" href={x.url} target="_blank" rel="noopener noreferrer">{x.title}</a>
      {x.body && <p className="fx-person-b">{x.body.slice(0, 180)}{x.body.length > 180 ? "..." : ""}</p>}
      <Meter value={x.intent} label="How ready" />
      {x.why && <p className="fx-faint">{x.why}</p>}

      {x.thread.length > 0 && (
        <ol className="fx-thread">
          {x.thread.slice(-4).map((m, i) => <li key={i} className={m.from}><small>{m.from === "us" ? "You (draft)" : "Them"}</small>{m.text}</li>)}
        </ol>
      )}

      {x.stage === "found" && x.message && (
        <div className="fx-msg">
          <small>Your message</small>
          {x.opener && (
            <div className={`fx-opener${openerLive ? " live" : ""}`}>
              <p><b>This message mentions one of your own posts:</b> "{x.opener}". {openerLive ? "That post is out, so the line works as it is." : "That post is written but not out yet. Post it first, or the mention won't be true."}</p>
              <button className="fx-link" onClick={() => { try { if (openerTopic) sessionStorage.setItem("foundry-focus-topic", openerTopic.id); } catch (_) { /* private */ } go("content"); }}>{openerPosts.length ? "See the post in Be seen" : "Open Be seen"}</button>
            </div>
          )}
          {editing ? <textarea rows={6} value={x.message} onChange={(e) => setPerson(up, x.id, { message: e.target.value })} /> : <p>{x.message}</p>}
        </div>
      )}
      {x.stage === "found" && !x.message && <Busy text="Writing their message" />}
      {x.followUp && x.stage === "messaged" && (
        <div className="fx-msg">
          <small>Follow-up, ready <Hint>No reply in 3 days, so Braino drafted a short, easy follow-up.</Hint></small>
          <p>{x.followUp}</p>
        </div>
      )}

      {pasting && (
        <div className="fx-paste">
          <textarea rows={4} autoFocus value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Paste what they wrote back" />
          {err && <Note tone="warn">{err}</Note>}
          <div className="fx-acts"><button className="fx-btn sm" disabled={busy || !reply.trim()} onClick={onReply}>{busy ? "Drafting" : "Draft my answer"}</button><button className="fx-link" onClick={() => setPasting(false)}>Cancel</button></div>
        </div>
      )}

      <footer className="fx-acts">
        {x.stage === "found" && x.message && (x.status === "skipped"
          ? <button className="fx-link" onClick={() => setPerson(up, x.id, { status: "waiting" })}>Undo skip</button>
          : <>
            <button className="fx-btn sm" onClick={() => approvePerson(up, x)}>Approve, open the post</button>
            <button className="fx-ghost" onClick={() => setEditing((e) => !e)}>{editing ? "Done" : "Edit"}</button>
            <button className="fx-link" onClick={() => setPerson(up, x.id, { status: "skipped" })}>Skip</button>
          </>)}
        {x.followUp && x.stage === "messaged" && <button className="fx-btn sm" onClick={() => { void copy(x.followUp); window.open(x.url, "_blank", "noopener"); up((q) => log({ ...q, people: q.people.map((y) => y.id === x.id ? { ...y, stageAt: Date.now(), thread: [...y.thread, { at: Date.now(), from: "us", text: y.followUp }], followUp: "" } : y) }, "outreach", `Sent a follow-up to ${whereOf(x)}`)); }}>Copy follow-up, open</button>}
        {lastUs && x.stage !== "found" && <button className="fx-ghost" onClick={() => { void copy(lastUs.text); window.open(x.url, "_blank", "noopener"); }}>Copy answer, open</button>}
        {x.stage !== "found" && !pasting && <button className="fx-ghost" onClick={() => setPasting(true)}>Paste their reply</button>}
        <label className="fx-stage">
          <span className="sr">Stage</span>
          <select value={x.stage} onChange={(e) => moveStage(up, x, e.target.value as Stage)}>{STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}</select>
        </label>
      </footer>
    </article>
  );
}

export default function Outreach({ p, up, busy, run, go }: PageProps) {
  const [view, setView] = useState<Stage | "all">("all");
  const [plat, setPlat] = useState<PersonPlatform | "all">("all");
  const drafting = useRef(false);
  const due = followUpDue(p).filter((x) => !x.followUp);
  // Messaged 3 or more days ago with no reply: draft a follow-up, one at a time.
  useEffect(() => {
    if (drafting.current || !due.length) return;
    drafting.current = true;
    const x = due[0];
    followUp(p, x).then((m) => up((q) => log({ ...q, people: q.people.map((y) => (y.id === x.id ? { ...y, followUp: m } : y)) }, "outreach", `Drafted a follow-up for ${whereOf(x)}, quiet for 3 days`)))
      .catch(() => undefined).finally(() => { drafting.current = false; });
  }, [due.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const everyone = p.people.filter((x) => x.status !== "skipped" || x.stage !== "found");
  const onPlat = (k: PersonPlatform | "all") => everyone.filter((x) => k === "all" || (x.platform || "reddit") === k);
  const people = onPlat(plat);
  const last = p.people.reduce((m, x) => Math.max(m, x.stageAt), 0) || null;
  const count = (s: Stage) => people.filter((x) => x.stage === s).length;

  return (
    <div className="fx-page">
      <PageHead engine="outreach" title="Reach people" status={p.people.length ? `${p.people.length} people, ${count("paid")} paid` : "Nobody found yet"} last={last} onRun={run.outreach} running={busy.outreach} explainData={STAGES.map((s) => `${STAGE_LABEL[s]}: ${count(s)}`)} />
      {p.searchNote && <Note>{p.searchNote} Outreach needs search to find people, so this page stays empty until it is set up.</Note>}

      <Group engine="outreach" step={1} title="People asking for this today" line="Real people on Reddit, X, LinkedIn, Quora and forums describing the problem you solve. Each has a message ready, one person at a time, until they pay." />
      <div className="fx-tabs" role="tablist" aria-label="Platform">
        {(["all", ...PERSON_PLATFORMS] as (PersonPlatform | "all")[]).filter((k) => k === "all" || onPlat(k).length).map((k) => (
          <button key={k} role="tab" aria-selected={plat === k} onClick={() => setPlat(k)}>{k === "all" ? "All" : PERSON_PLATFORM_LABEL[k]} <span>{onPlat(k).length}</span></button>
        ))}
      </div>
      <div className="fx-tabs" role="tablist" aria-label="Stage">
        <button role="tab" aria-selected={view === "all"} onClick={() => setView("all")}>Board</button>
        {STAGES.map((s) => <button key={s} role="tab" aria-selected={view === s} onClick={() => setView(s)}>{STAGE_LABEL[s]} <span>{count(s)}</span></button>)}
      </div>

      {!everyone.length ? (
        <Empty title="No people yet" action={<button className="fx-btn" disabled={!!busy.outreach} onClick={run.outreach}>{busy.outreach ? <Busy text={busy.outreach} /> : "Find people asking today"}</button>}>
          Outreach searches Reddit, X, LinkedIn, Quora and forums for people describing your problem in the last year, keeps the real ones, and writes a message for each.
        </Empty>
      ) : view === "all" ? (
        <div className="fx-board">
          {STAGES.map((s) => (
            <Section key={s} className={`fx-col ${s}`} title={`${STAGE_LABEL[s]} · ${count(s)}`} hint={s === "found" ? "People asking today. Approve a message to move them to Messaged." : s === "messaged" ? "Waiting for a reply. After 3 quiet days, Braino drafts a follow-up." : s === "replied" ? "They wrote back. Paste their reply to get your answer." : s === "talking" ? "On a call or clearly interested. Ask for the payment." : "Your paying customers."}>
              {people.filter((x) => x.stage === s).map((x) => <PersonCard key={x.id} x={x} p={p} up={up} go={go} />)}
              {!count(s) && <p className="fx-faint">Nobody here yet.</p>}
            </Section>
          ))}
        </div>
      ) : (
        <div className="fx-people">{people.filter((x) => x.stage === view).map((x) => <PersonCard key={x.id} x={x} p={p} up={up} go={go} />)}{!count(view) && <Empty title={`Nobody in ${STAGE_LABEL[view]}`}>Move people here with the stage menu on each card.</Empty>}</div>
      )}
      <p className="fx-small">Outreach only writes to one person at a time. Public posts live in Be seen.</p>
    </div>
  );
}
