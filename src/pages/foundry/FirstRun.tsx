import { useEffect, useRef, useState } from "react";
import { BrainoMascot } from "@/components/BrainoMascot";
import type { Engine, Project } from "./store";
import { namedCount } from "./types";
import "./first-run.css";

/* ============================================================================
   The first run (2026-10-23). After onboarding, the founder watches the three
   engines work, one card each, and lands on the dashboard only once all three
   are done. State per engine comes from the runner's busy labels: never busy
   yet = waiting, busy = working (with what it is doing), busy then idle = done.
   ============================================================================ */

const ENGINES: { id: Engine; friendly: string; name: string; job: string; waiting: string }[] = [
  { id: "optics", friendly: "Get found", name: "Optics", job: "Checks if AI and Google name you when buyers ask.", waiting: "Starts in a moment" },
  { id: "outreach", friendly: "Reach people", name: "Outreach", job: "Finds real people asking for this today.", waiting: "Starts in a moment" },
  { id: "content", friendly: "Be seen", name: "Content", job: "Writes posts from what the other two found.", waiting: "Waits for Optics and Outreach" },
];

export default function FirstRun({ p, busy, onDone }: { p: Project; busy: Partial<Record<Engine | "setup", string>>; onDone: () => void }) {
  const seen = useRef<Record<string, boolean>>({});
  const [, force] = useState(0);
  const [finished, setFinished] = useState(false);
  const started = useRef(Date.now());

  ENGINES.forEach((e) => { if (busy[e.id]) seen.current[e.id] = true; });
  const state = (e: Engine) => busy[e] ? "working" : seen.current[e] ? "done" : "waiting";
  const anyBusy = ENGINES.some((e) => busy[e.id]);
  const allSeen = ENGINES.every((e) => seen.current[e.id]);

  // Done once every engine has worked and nothing is busy for a moment.
  useEffect(() => {
    if (anyBusy || !allSeen) return;
    const t = window.setTimeout(() => setFinished(true), 1400);
    return () => window.clearTimeout(t);
  }, [anyBusy, allSeen]);
  useEffect(() => { if (!finished) return; const t = window.setTimeout(onDone, 1600); return () => window.clearTimeout(t); }, [finished, onDone]);
  useEffect(() => { const t = window.setInterval(() => force((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);

  const result = (e: Engine) => {
    if (e === "optics") return p.optics ? `Named in ${namedCount(p)} of ${p.optics.answers.length} AI answers` : "";
    if (e === "content") return p.posts.length ? `${p.posts.length} posts written` : "";
    return `${p.people.length} ${p.people.length === 1 ? "person" : "people"} found`;
  };
  const done = ENGINES.filter((e) => state(e.id) === "done").length;
  const secs = Math.round((Date.now() - started.current) / 1000);
  const feed = p.memory.activity.filter((a) => a.at >= started.current - 2000).slice(0, 5);

  return (
    <div className="fr">
      <div className="fr-in">
        <div className={`fr-mascot${finished ? " happy" : ""}`}><BrainoMascot variant="foundry" size={84} /></div>
        <p className="fr-kicker">{p.memory.product.name || "Your product"}</p>
        <h1>{finished ? "All done. Opening your dashboard." : "Braino Foundry is working on it."}</h1>
        <p className="fr-sub">{finished ? "Here is where you stand." : `Three engines, one after another. About two minutes. ${secs}s so far.`}</p>

        <div className="fr-bar" aria-hidden><span style={{ width: `${finished ? 100 : Math.max(6, (done / 3) * 100)}%` }} /></div>

        <ul className="fr-engines">
          {ENGINES.map((e) => {
            const s = state(e.id);
            return (
              <li key={e.id} className={`fr-eng e-${e.id} ${s}`}>
                <span className="fr-icon" aria-hidden>{s === "done" ? <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : s === "working" ? <i /> : null}</span>
                <div className="fr-text">
                  <p className="fr-name"><b>{e.friendly}</b><span>{e.name}</span></p>
                  <p className="fr-job">{e.job}</p>
                  <p className="fr-now">{s === "working" ? busy[e.id] : s === "done" ? (result(e.id) || "Done") : e.waiting}</p>
                </div>
                <span className="fr-state">{s === "working" ? "Working" : s === "done" ? "Done" : "Waiting"}</span>
              </li>
            );
          })}
        </ul>

        {feed.length > 0 && (
          <ul className="fr-feed" aria-live="polite">
            {feed.map((a) => <li key={a.id}><span className={`fr-dot w-${a.who}`} />{a.text}</li>)}
          </ul>
        )}

        <button className="fr-skip" onClick={onDone}>{finished ? "Open dashboard" : "Open the dashboard now, keep working in the background"}</button>
      </div>
    </div>
  );
}
