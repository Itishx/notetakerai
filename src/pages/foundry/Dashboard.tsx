import React from "react";
import { fmtDay, WEEK } from "./lib";
import { STAGES, STAGE_LABEL, type Stage } from "./store";
import { moves, namedCount, waitingCount, type PageProps } from "./types";
import { Funnel, KPI, Ring } from "./components/charts";
import { Busy, Crumb, Empty, ENGINE_LINE, Explain, Icon, IC, Note, Section } from "./components/ui";
import { BrandMap } from "./components/brandmap";


/* Who this is for, before any numbers (2026-10-23): the company and the
   founder sit at the top of the dashboard, so every number below reads in
   context. Editing stays in Product and founder. */
/* A small delta pill: up green, down red, flat grey. */
function Delta({ v, note }: { v: number | null; note: string }) {
  return (
    <span className="fx-delta-l">
      {v !== null && <em className={`fx-delta ${v > 0 ? "up" : v < 0 ? "down" : ""}`}>{v > 0 ? "↗" : v < 0 ? "↘" : "→"} {Math.abs(v)}%</em>}
      <small>{note}</small>
    </span>
  );
}
/* One bar split into parts, with a legend underneath. */
function SplitBar({ parts }: { parts: { k: string; label: string; n: number }[] }) {
  const total = parts.reduce((m, x) => m + x.n, 0);
  return (
    <div className="fx-split">
      <div className="fx-split-bar">{total ? parts.filter((x) => x.n).map((x) => <i key={x.k} className={x.k} style={{ flexGrow: x.n }} title={`${x.label}: ${x.n}`} />) : <i className="none" style={{ flexGrow: 1 }} />}</div>
      <ul className="fx-split-l">{parts.map((x) => <li key={x.k}><i className={x.k} />{x.label}<b>{x.n}</b></li>)}</ul>
    </div>
  );
}

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

/* What Foundry has done so far, and what acting on it gets you (2026-10-23).
   Itish: "0% of AI's picks" read as failure. Lead with the work done and the
   next win; the starting score is framed as a starting point. */
function DoneForYou({ p, go }: { p: PageProps["p"]; go: PageProps["go"] }) {
  const o = p.optics;
  const asked = (o?.answers.length || 0) * Math.max(1, o?.answers[0]?.runs || 1);
  const platforms = new Set(p.people.map((x) => x.platform || "reddit")).size;
  const wrote = p.people.filter((x) => x.message).length;
  const posts = p.posts.length;
  const articles = p.memory.topics.filter((t) => t.article).length;
  const listings = Object.values(p.launches || {}).filter((l) => l.listing).length;
  const fixes = o?.fixes.length || 0;
  const waitMsgs = p.people.filter((x) => x.status === "waiting" && x.message).length;
  const waitPosts = p.posts.filter((x) => x.status === "waiting").length;
  const named = namedCount(p);
  const tiles = [
    { n: asked, l: "AI answers checked", s: o ? `${o.answers.length} buyer questions, asked ${o.answers[0]?.runs || 1} times each` : "Not yet", page: "optics" as const, e: "optics" },
    { n: p.people.length, l: "people found asking", s: p.people.length ? `on ${platforms} platform${platforms === 1 ? "" : "s"}` : "Not yet", page: "outreach" as const, e: "outreach" },
    { n: wrote, l: "messages written", s: "one per person, in your voice", page: "outreach" as const, e: "outreach" },
    { n: posts + articles, l: "posts and articles written", s: `${posts} posts, ${articles} articles`, page: "content" as const, e: "content" },
    { n: fixes, l: "fixes ready to publish", s: "so AI and Google name you", page: "optics" as const, e: "optics" },
    { n: listings, l: "launch listings written", s: "for directories that send visitors", page: "content" as const, e: "content" },
  ];
  return (
    <section className="fx-done">
      <header>
        <span className="fx-eyebrow">What Braino Foundry has done for you</span>
        <h2>{p.lastRun ? "Here is the work, done. It is waiting for your yes." : "Your first run will fill this in."}</h2>
      </header>
      <div className="fx-done-grid">
        {tiles.map((t) => (
          <button key={t.l} className={`fx-done-t ${t.e}`} onClick={() => go(t.page)}>
            <b className="fx-num">{t.n}</b><span>{t.l}</span><small>{t.s}</small>
          </button>
        ))}
      </div>
      {(waitMsgs || waitPosts || o) && (
        <div className="fx-done-next">
          <p className="fx-eyebrow">If you act on it</p>
          <ul>
            {waitMsgs > 0 && <li><b>{waitMsgs} real {waitMsgs === 1 ? "person" : "people"}</b> who asked for this today hear from you. That is where first users come from.</li>}
            {waitPosts > 0 && <li><b>{waitPosts} post{waitPosts === 1 ? "" : "s"}</b> put you in front of your buyers this week.</li>}
            {o && <li>{named === 0 ? <>AI does not name you yet. That is normal for a new product, and it is your <b>starting point</b>. Each fix you publish gives AI a reason to; the next run shows the change.</> : <>AI already names you in <b>{named} of {o.answers.length}</b> answers. Each fix you publish adds more.</>}</li>}
          </ul>
          <button className="fx-btn sm" onClick={() => go("approvals")}>Open Approvals</button>
        </div>
      )}
    </section>
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

  const last2 = p.runs.slice(-2);
  const delta = (k: "people" | "approved" | "named") => {
    if (last2.length < 2) return null;
    const [a, z] = [last2[0][k] || 0, last2[1][k] || 0];
    return a ? Math.round(((z - a) / a) * 1000) / 10 : z ? 100 : 0;
  };
  const approved = p.posts.filter((x) => x.status === "approved").length + p.people.filter((x) => x.status === "approved").length;
  const stageNow = Object.fromEntries(STAGES.map((s) => [s, p.people.filter((x) => x.stage === s).length])) as Record<Stage, number>;
  const recEngines: { e: "optics" | "content" | "outreach"; title: string; icon: string }[] = [
    { e: "optics", title: "Get found", icon: IC.optics },
    { e: "content", title: "Be seen", icon: IC.content },
    { e: "outreach", title: "Reach people", icon: IC.outreach },
  ];

  return (
    <div className="fx-page">
      <header className="fx-head fx-dash-head">
        <div className="fx-head-t">
          <Crumb items={[p.memory.product.name || "Your product", "Overview"]} />
          <h1>Overview</h1>
          <p>{mv[0] ? <>Next move: <button className="fx-inline" onClick={() => (mv[0].id === "run" ? run.all() : go(mv[0].page))}>{mv[0].text}</button></> : "Next move: run the engines again to find more people."}</p>
        </div>
        <div className="fx-head-m">
          <div className="fx-head-b">
            <button className="fx-ghost" onClick={() => go("approvals")}>Approvals{waitingCount(p) ? ` (${waitingCount(p)})` : ""}</button>
            <button className="fx-btn" disabled={!!running} onClick={run.all}><Icon d={IC.play} size={14} />{running ? "Running" : "Run now"}</button>
          </div>
          {running && <span className="fx-stat live"><Busy text={running} /></span>}
        </div>
      </header>

      <div className="fx-dash-top">
        <section className="fx-sec fx-stat-card">
          <header className="fx-sec-h"><h2>Customers</h2><div className="fx-sec-a"><Explain title="Customers" data={{ paid, found: p.people.length, stages: stageNow }} /></div></header>
          <div className="fx-stat-row">
            <div className="fx-stat-n">
              <span>Paying customers</span>
              <b className="fx-num">{paid}</b>
              <Delta v={null} note={`of ${p.people.length} found`} />
            </div>
            <div className="fx-stat-n">
              <span>People found</span>
              <b className="fx-num">{p.people.length}</b>
              <Delta v={delta("people")} note="vs last run" />
            </div>
            <div className="fx-stat-n">
              <span>You approved</span>
              <b className="fx-num">{approved}</b>
              <Delta v={delta("approved")} note={`${waitingCount(p)} waiting`} />
            </div>
          </div>
          <SplitBar parts={STAGES.map((s) => ({ k: s, label: STAGE_LABEL[s], n: stageNow[s] }))} />
        </section>

        <section className="fx-sec fx-todo">
          <header className="fx-sec-h">
            <h2>This week's moves</h2>
            <div className="fx-sec-a"><Explain title="This week's moves" data={mv.slice(0, 5).map((m) => m.text)} /><button className="fx-icon-b" aria-label="Open Approvals" onClick={() => go("approvals")}><Icon d={IC.arrow} size={16} /></button></div>
          </header>
          {mv.length ? (
            <ol className="fx-moves">
              {mv.slice(0, 5).map((m) => (
                <li key={m.id}>
                  <button onClick={() => (m.id === "run" ? run.all() : go(m.page))}>
                    <span className="fx-moves-n" aria-hidden />
                    <span className="fx-moves-t"><b>{m.text}</b><small>{m.why}</small></span>
                    <i className={`fx-dot ${m.engine === "approvals" ? "outreach" : m.engine}`} />
                  </button>
                </li>
              ))}
            </ol>
          ) : <Empty title="All clear">Nothing is waiting on you. Run again to find more people and fresh topics.</Empty>}
          {mv.length > 5 && <p className="fx-faint">{mv.length - 5} more after these.</p>}
        </section>
      </div>

      <div className="fx-dash-top two">
        <section className="fx-sec fx-rec">
          <header className="fx-sec-h"><h2>Recommended next</h2></header>
          {recEngines.map((r) => {
            const m = mv.find((x) => (x.engine === "approvals" ? "outreach" : x.engine) === r.e);
            return (
              <button key={r.e} className={`fx-rec-row ${r.e}`} onClick={() => (m?.id === "run" ? run.all() : go(m?.page || r.e))}>
                <span className="fx-rec-i"><Icon d={r.icon} size={17} /></span>
                <span className="fx-rec-t"><b>{r.title}{m ? `: ${m.text}` : ""}</b><small>{m ? m.why : ENGINE_LINE[r.e]}</small></span>
                <Icon d={IC.arrow} size={15} />
              </button>
            );
          })}
        </section>
        <section className="fx-sec fx-auto-card">
          <header className="fx-sec-h"><h2>Autopilot</h2></header>
          <label className="fx-switch"><input type="checkbox" checked={p.autopilot} onChange={(e) => up((q) => ({ ...q, autopilot: e.target.checked }))} /><i /><span>{p.autopilot ? "On, every week" : "Off"}</span></label>
          <p className="fx-small">{p.autopilot && next ? `Next run ${fmtDay(next)}` : "Off. Runs every week when on."}</p>
          <p className="fx-small">{p.lastRun ? `Last run ${fmtDay(p.lastRun)}` : "Not run yet"}</p>
        </section>
      </div>

      {p.searchNote && <Note>{p.searchNote} Optics still checks AI answers, and Content still writes posts. Outreach needs search to find people.</Note>}

      <DoneForYou p={p} go={go} />

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


      <BrandMap p={p} busy={busy} />
      <Profiles p={p} me={me} go={go} />
    </div>
  );
}
