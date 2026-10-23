import React from "react";
import { fmtDay, WEEK } from "./lib";
import { STAGES, type Stage } from "./store";
import { moves, namedCount, waitingCount, type PageProps } from "./types";
import { Funnel, KPI, Ring } from "./components/charts";
import { Busy, Empty, Hint, Note, Section } from "./components/ui";
import { BrandMap } from "./components/brandmap";


/* Who this is for, before any numbers (2026-10-23): the company and the
   founder sit at the top of the dashboard, so every number below reads in
   context. Editing stays in Product and founder. */
export function Avatar({ name, photo, size = 56 }: { name: string; photo?: string; size?: number }) {
  const initials = (name || "You").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return photo
    ? <img className="fx-avatar" src={photo} alt={name || "You"} style={{ width: size, height: size }} />
    : <span className="fx-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials}</span>;
}
function Profiles({ p, me, go }: Pick<PageProps, "p" | "me" | "go">) {
  const pr = p.memory.product;
  const f = p.memory.founder;
  const site = pr.site ? pr.site.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  return (
    <div className="fx-profiles">
      <article className="fx-profile">
        <header>
          <span className="fx-profile-mark">{(pr.name || "P").charAt(0).toUpperCase()}</span>
          <div><span className="fx-eyebrow">Company</span><h2>{pr.name || "Your product"}</h2>{site && <a href={pr.site.startsWith("http") ? pr.site : `https://${pr.site}`} target="_blank" rel="noopener noreferrer">{site}</a>}</div>
          <button className="fx-link" onClick={() => go("memory")}>Edit</button>
        </header>
        <p className="fx-profile-line">{pr.oneLiner || "Add a one line description in Product and founder."}</p>
        <dl>
          {pr.buyer && <div><dt>Who buys it</dt><dd>{pr.buyer}</dd></div>}
          {pr.problem && <div><dt>The problem</dt><dd>{pr.problem}</dd></div>}
          {pr.pricing && <div><dt>Pricing</dt><dd>{pr.pricing}</dd></div>}
        </dl>
      </article>
      <article className="fx-profile">
        <header>
          <Avatar name={me.name} photo={me.photo} />
          <div><span className="fx-eyebrow">Founder</span><h2>{me.name || "Add your name"}</h2>{f.linkedin && <a href={f.linkedin.startsWith("http") ? f.linkedin : `https://${f.linkedin}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>}</div>
          <button className="fx-link" onClick={() => go("memory")}>Edit</button>
        </header>
        <p className="fx-profile-line">{f.who || "Add who you are in Product and founder."}</p>
        <dl>
          {f.whyTrust && <div><dt>Why trust you</dt><dd>{f.whyTrust}</dd></div>}
          {f.voice && <div><dt>How you sound</dt><dd>{f.voice}</dd></div>}
        </dl>
      </article>
    </div>
  );
}

export default function Dashboard({ p, up, busy, run, go, me }: PageProps) {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  p.people.forEach((x) => { STAGES.slice(0, STAGES.indexOf(x.stage) + 1).forEach((s) => counts[s]++); });
  const paid = p.people.filter((x) => x.stage === "paid").length;
  const mv = moves(p);
  const named = namedCount(p);
  const of = p.optics?.answers.length || 0;
  const gFound = p.optics?.google.filter((g) => g.found).length || 0;
  const gOf = p.optics?.google.length || 0;
  const running = Object.values(busy).find(Boolean) || "";
  const next = p.lastRun ? p.lastRun + WEEK : null;
  const spark = (k: "named" | "people" | "approved" | "posts") => p.runs.map((r) => r[k]);

  return (
    <div className="fx-page">
      <Profiles p={p} me={me} go={go} />
      <header className="fx-hero">
        <span className="fx-eyebrow">{p.memory.product.name || "Your product"} · Dashboard</span>
        <h1><span className="fx-num">{paid}</span> paying customer{paid === 1 ? "" : "s"}.</h1>
        <p>{mv[0] ? <>Next move: <button className="fx-inline" onClick={() => (mv[0].id === "run" ? run.all() : go(mv[0].page))}>{mv[0].text}</button></> : "Next move: run the engines again to find more people."}</p>
        {running && <div className="fx-hero-run"><Busy text={running} /></div>}
      </header>

      {p.searchNote && <Note>{p.searchNote} Optics still checks AI answers, and Content still writes posts. Outreach needs search to find people.</Note>}

      <BrandMap p={p} busy={busy} />

      <div className="fx-grid2">
        <Section title="Pipeline" hint="Everyone Outreach found, and how far each one has come. Move people along on Reach people." explain={counts}>
          {p.people.length ? <Funnel counts={counts} /> : <Empty title="No people yet">Outreach finds real people asking about your problem today. {p.lastRun ? "None were found this run." : "Run the engines to start."}</Empty>}
        </Section>
        <Section title="Visibility" hint="Named by AI: how many of your 8 buyer questions an AI assistant answers with your name. Google: searches where your site or name is on page one." explain={{ namedByAI: `${named} of ${of}`, googlePageOne: `${gFound} of ${gOf}` }}>
          {p.optics ? (
            <div className="fx-vis">
              <Ring n={named} of={of} label="named by AI" />
              <div className="fx-vis-t">
                <div><b className="fx-num">{named} of {of}</b><span>named by AI</span></div>
                <div><b className="fx-num">{gOf ? `${gFound} of ${gOf}` : "Not checked"}</b><span>on Google page one</span></div>
                <button className="fx-link" onClick={() => go("optics")}>See what to fix</button>
              </div>
            </div>
          ) : <Empty title="Not checked yet">Optics asks AI and Google your buyers' questions and sees if you come up.</Empty>}
        </Section>
      </div>

      <div className="fx-kpis">
        <KPI label="Named by AI" value={`${named}/${of || 8}`} sub="per run" spark={spark("named")} engine="optics" />
        <KPI label="Posts waiting" value={p.posts.filter((x) => x.status === "waiting").length} sub={`${p.posts.filter((x) => x.status === "approved").length} approved so far`} spark={spark("posts")} engine="content" />
        <KPI label="People found" value={p.people.length} sub={`${counts.messaged} messaged`} spark={spark("people")} engine="outreach" />
        <KPI label="You approved" value={p.posts.filter((x) => x.status === "approved").length + p.people.filter((x) => x.status === "approved").length} sub={`${waitingCount(p)} waiting`} spark={spark("approved")} />
      </div>

      <div className="fx-auto-row">
        <Section title="This week's moves" hint="Ranked by how close each move is to a paying customer. Tap one to go there." explain={mv.slice(0, 5).map((m) => m.text)}>
          {mv.length ? (
            <ol className="fx-moves">
              {mv.slice(0, 6).map((m, i) => (
                <li key={m.id}>
                  <button onClick={() => (m.id === "run" ? run.all() : go(m.page))}>
                    <span className="fx-moves-n">{i + 1}</span>
                    <span className="fx-moves-t"><b>{m.text}</b><small>{m.why}</small></span>
                    <i className={`fx-dot ${m.engine === "approvals" ? "outreach" : m.engine}`} />
                  </button>
                </li>
              ))}
            </ol>
          ) : <Empty title="All clear">Nothing is waiting on you. Run again to find more people and fresh topics.</Empty>}
        </Section>
      </div>

      <div className="fx-auto-row">
        <Section title="Autopilot" hint="Runs all three engines once a week, so new people and new questions are waiting for you on Monday.">
          <div className="fx-auto">
            <label className="fx-switch"><input type="checkbox" checked={p.autopilot} onChange={(e) => up((q) => ({ ...q, autopilot: e.target.checked }))} /><i /><span>Run every week</span></label>
            <dl>
              <div><dt>Last run</dt><dd>{p.lastRun ? fmtDay(p.lastRun) : "Never"}</dd></div>
              <div><dt>Next run</dt><dd>{p.autopilot && next ? fmtDay(next) : "Off"}</dd></div>
              <div><dt>Runs so far</dt><dd>{p.runs.length}</dd></div>
            </dl>
            <button className="fx-btn" disabled={!!running} onClick={run.all}>{running ? "Running" : "Run now"}</button>
            <p className="fx-small">Autopilot runs when this app is open on or after the due date. A server schedule (n8n) comes later.<Hint>There is no server running Braino for you yet. If the app is closed on the due date, it runs the next time you open it.</Hint></p>
          </div>
        </Section>
      </div>
    </div>
  );
}
