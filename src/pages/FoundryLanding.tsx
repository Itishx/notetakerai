import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter } from "@/components/affPage";
import "./affective.css";
import "./foundry-landing.css";

/* Foundry landing (2026-10-22): what it is, then the way in to the app. */
const ENGINES = [
  { k: "o", name: "Optics", line: "Find where you're invisible", body: "Asks your buyers' questions to AI assistants and Google. Are you named? Who is instead? Which questions do you lose?" },
  { k: "c", name: "Content", line: "Make you worth finding", body: "Writes public posts for X, LinkedIn, Reddit, Instagram and Threads, in your voice, answering exactly the questions you lose." },
  { k: "r", name: "Outreach", line: "Start conversations", body: "Finds people describing your problem on Reddit, keeps the real ones, and drafts one help-first message each." },
];
const FLOWS = [
  ["Get found", "Nobody finds me on Google or in AI answers", ["o", "c", "r"]],
  ["I shipped something", "I just launched a feature, tell people", ["c", "r", "o"]],
  ["Find my first customers", "I need people to talk to this week", ["r", "c", "o"]],
  ["Stay visible every week", "Ongoing, with my approval", ["o", "c", "r"]],
] as const;
const NAME = { o: "Optics", c: "Content", r: "Outreach" } as const;

export default function FoundryLanding() {
  const { theme, toggle } = useAffTheme();
  useEffect(() => { document.title = "Foundry · Get your product seen"; }, []);
  return (
    <div className="aff fl" data-theme={theme}>
      <AffNav theme={theme} onToggle={toggle} links={[["How it works", "#engines"], ["Workflows", "#workflows"], ["Open Foundry", "/foundry/app"]]} />

      <section className="fl-hero">
        <div className="aff-wrap">
          <div className="aff-kicker">Foundry · a distribution co-founder</div>
          <h1 className="fl-h1">Building got easy.<br /><em>Getting seen</em> didn't.</h1>
          <p className="fl-lede">Foundry finds where buyers can't find you, writes the posts that fix it, and brings you the people already asking for what you built. You only approve.</p>
          <div className="fl-cta">
            <Link to="/foundry/app" className="fl-go">Open Foundry</Link>
            <a href="#engines" className="fl-ghost">How it works</a>
          </div>
          <div className="fl-proof">
            <div><b>8 of 8</b><span>founders we interviewed named distribution their biggest problem</span></div>
            <div><b>6.3 hrs</b><span>a week the average owner spends on social media alone</span></div>
            <div><b>40%</b><span>of AI answer citations come from Reddit, where your buyers ask</span></div>
          </div>
        </div>
      </section>

      <section className="fl-moment">
        <div className="aff-wrap">
          <div className="fl-moment-card">
            <div className="aff-kicker">What a founder sees in about a minute</div>
            <p>"We asked AI the 8 questions your buyers ask. You were named in <b>0</b>. Your competitor in <b>7</b>. Here are <b>5 posts</b> that answer them, and <b>the people asking</b> on Reddit, each with a reply in your voice."</p>
          </div>
        </div>
      </section>

      <section className="fl-sec" id="engines">
        <div className="aff-wrap">
          <div className="aff-kicker">Three engines</div>
          <h2 className="fl-h2">Each does one job. Each feeds the next.</h2>
          <div className="fl-engines">
            {ENGINES.map((e, i) => (
              <article key={e.k} className={`fl-engine ${e.k}`}>
                <span className="fl-num">0{i + 1}</span>
                <h3>{e.name}</h3>
                <div className="fl-engine-line">{e.line}</div>
                <p>{e.body}</p>
              </article>
            ))}
          </div>
          <p className="fl-note"><b>Content</b> is public posts for everyone. <b>Outreach</b> is a message to one person. Nothing goes out without your approval.</p>
        </div>
      </section>

      <section className="fl-sec alt" id="workflows">
        <div className="aff-wrap">
          <div className="aff-kicker">Workflows</div>
          <h2 className="fl-h2">You pick what you need. Foundry runs the engines in order.</h2>
          <div className="fl-flows">
            {FLOWS.map(([name, when, order]) => (
              <div className="fl-flow" key={name}>
                <div><h3>{name}</h3><span>"{when}"</span></div>
                <div className="fl-chain">{order.map((k, i) => <span key={k}><i className={k}>{NAME[k]}</i>{i < 2 ? <em>→</em> : null}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="fl-sec">
        <div className="aff-wrap fl-steps">
          <div>
            <div className="aff-kicker">How it works</div>
            <h2 className="fl-h2">Five minutes, start to finish.</h2>
          </div>
          <ol>
            <li><b>Tell it what you're building.</b> In your own words. It plays it back in two plain lines.</li>
            <li><b>See where you're invisible.</b> AI answers and Google, question by question.</li>
            <li><b>Get the posts that fix it.</b> Five platforms, your voice.</li>
            <li><b>Meet the people asking.</b> A reply written for each.</li>
            <li><b>Approve.</b> Foundry copies it and opens the platform. You post.</li>
          </ol>
        </div>
      </section>

      <section className="fl-end">
        <div className="aff-wrap">
          <h2 className="fl-h2">Get your product seen.</h2>
          <Link to="/foundry/app" className="fl-go">Open Foundry</Link>
        </div>
      </section>
      <AffFooter />
    </div>
  );
}
