import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter, Lit, useAffReveal, useLitWords, useGrowHero } from "@/components/affPage";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./foundry-landing.css";

/* Braino Foundry (2026-10-22). Built from the homepage's own pieces (affPage,
   affective-home.css): the hero and its growing picture, lit lines, the
   product box, the questions and the closing block, so it reads as one site. */
const ENGINES = [
  { key: "Engine 1", h: "Optics", p: "Asks your buyers' questions to AI assistants and Google. Are you named? Who is named instead? Which questions do you lose?" },
  { key: "Engine 2", h: "Content", p: "Writes public posts for X, LinkedIn, Reddit, Instagram and Threads, in your voice, answering the exact questions you lose." },
  { key: "Engine 3", h: "Outreach", p: "Finds people describing your problem on Reddit, keeps the real ones, and drafts one help-first message to each." },
];
const FLOWS = [
  { h: "Get found", p: "“Nobody finds me on Google or in AI answers.” Optics finds the questions you lose, Content answers them, Outreach messages the people asking." },
  { h: "I shipped something", p: "“I just launched a feature.” Content turns it into five posts, Outreach tells the people who asked for it, Optics watches you get named." },
  { h: "Find my first customers", p: "“I need people to talk to this week.” Outreach finds them, Content writes about what they keep asking, Optics adds it to your weekly check." },
  { h: "Stay visible every week", p: "A Monday scorecard, this week's posts and your follow-ups, waiting for your yes." },
];
const WHERE = {
  web: { tab: "On the web", h: "Open it in any browser.", p: "Chrome, Safari, Edge, on Windows or Mac. Tell it what you're building, and your posts and messages land in Approvals. Nothing to install.", cta: ["Open Braino Foundry", "/foundry/app"], steps: ["Start a project", "Answer three questions", "Approve what it wrote"] },
  mac: { tab: "On your Mac", h: "Or just ask Braino.", p: "If you use the Braino Mac app, Foundry is a switch inside it. Ask out loud, and the answer shows up in the notch. The Mac app is in private beta.", cta: ["Join the waitlist", "/braino#early-access"], steps: ["Switch Foundry on", "Ask out loud", "Approve in the notch"] },
};
function WhereTabs() {
  const [t, setT] = useState<"web" | "mac">("web");
  const w = WHERE[t];
  return (
    <div className="fl-where-box aff-reveal">
      <div className="fl-tabs" role="tablist">
        {(["web", "mac"] as const).map((k) => <button key={k} role="tab" aria-selected={t === k} className={t === k ? "on" : ""} onClick={() => setT(k)}>{WHERE[k].tab}</button>)}
      </div>
      <div className="fl-where-in" key={t}>
        <div>
          <h3>{w.h}</h3>
          <p>{w.p}</p>
          <Link to={w.cta[1]} className="aff-cta">{w.cta[0]}</Link>
        </div>
        <ol className="fl-where-steps">{w.steps.map((x, i) => <li key={x}><span>{i + 1}</span>{x}</li>)}</ol>
      </div>
    </div>
  );
}

/* What the founder actually sees: one card per engine. */
/* What the founder actually sees, one joined panel with three cells (2026-10-22). */
function EngineCards() {
  return (
    <div className="fl-joint aff-reveal">
      <div className="fl-cell fl-c-o">
        <p className="fl-cell-k"><i />Optics<span>Where you're missing</span></p>
        <div className="fl-score"><b>0</b><span>of 8 AI answers name you</span></div>
        {[["Best invoicing tool for freelancers", false], ["Alternatives to Zoho Invoice", false], ["How to chase late payments", true]].map(([q, ok]) => (
          <div key={String(q)} className="fl-row"><span>{q}</span><em className={ok ? "ok" : ""}>{ok ? "Named" : "Missing"}</em></div>
        ))}
      </div>
      <div className="fl-cell fl-c-c">
        <p className="fl-cell-k"><i />Content<span>A post that fixes it</span></p>
        <div className="fl-li">
          <div className="fl-li-h"><span className="fl-av">AK</span><div><b>Ananya Kapoor</b><small>Founder at Invoicely</small></div><em>in</em></div>
          <p>Most freelancers don't lose money on bad clients. They lose it on invoices nobody follows up on. Here is what we changed... <u>see more</u></p>
        </div>
        <div className="fl-go"><span>Edit</span><b>Approve</b></div>
      </div>
      <div className="fl-cell fl-c-r">
        <p className="fl-cell-k"><i />Outreach<span>A person asking today</span></p>
        <div className="fl-rd">
          <small>r/freelance · 2h</small>
          <p className="fl-rd-q">"Client is 60 days late, what do I even say?"</p>
          <div className="fl-meter"><span>Ready to buy</span><i><em style={{ width: "82%" }} /></i></div>
        </div>
        <p className="fl-reply">Been there. A short, friendly nudge with the invoice attached works better than you'd think...</p>
        <div className="fl-go"><span>Skip</span><b>Approve</b></div>
      </div>
    </div>
  );
}

/* "How it works": a short guide that opens over the page. */
const GUIDE = [
  ["Tell it what you're building", "Three quick questions. A link helps, but your own words are enough."],
  ["It checks where you're invisible", "It asks AI and Google what your buyers ask, and shows who gets named instead of you."],
  ["It does the work", "The pages, posts and replies that fix each gap, written in your voice."],
  ["You say yes", "Nothing goes out on its own. Approve, and it copies the text and opens the site."],
  ["It runs again every week", "Your brand gets more visible on autopilot, with you in the loop."],
];
function Guide({ onClose }: { onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fl-guide-wrap" onClick={onClose}>
      <div className="fl-guide" role="dialog" aria-label="How Braino Foundry works" onClick={(e) => e.stopPropagation()}>
        <button className="fl-guide-x" onClick={onClose} aria-label="Close">×</button>
        <p className="ah-kicker">How it works</p>
        <h3>More people find you every week. You only say yes.</h3>
        <ol>{GUIDE.map(([h, p], i) => <li key={h}><span>{i + 1}</span><div><b>{h}</b><p>{p}</p></div></li>)}</ol>
        <Link to="/foundry/app" className="aff-cta">Start now</Link>
      </div>
    </div>
  );
}

const FAQS = [
  { q: "Is this a content generator?", a: "No. Content tools guess what to post. Braino Foundry starts from what your buyers are asking right now, then writes the posts that answer it and finds the people asking." },
  { q: "Does it post for me?", a: "Never on its own. Every post and every message waits for your approval. Approve copies the text and opens the platform, and you post." },
  { q: "What do I need to start?", a: "A few lines about what you're building. A website, a GitHub repo or a doc helps, but even an idea in your own words is enough." },
  { q: "Do I need a Mac?", a: "No. On a Mac, Braino Foundry runs inside the Braino app and you can just talk to it. On Chrome or Windows, the website does the same job." },
  { q: "Where does it look?", a: "AI assistants, Google, and Reddit threads where people describe the problem you solve." },
];

export default function FoundryLanding() {
  const { theme, toggle } = useAffTheme();
  const root = useAffReveal([]);
  const [guide, setGuide] = useState(false);
  useLitWords([]);
  useGrowHero();
  useEffect(() => { document.title = "Braino Foundry · Get your product seen"; }, []);
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff fl" data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} links={[["Braino", "/braino"], ["Foundry", "/foundry"], ["AffectiveOS", "/affectiveos"], ["Labs", "/labs"]]} go={["Start now. Find out why you\u2019re invisible.", "/foundry/app"]} />
      {guide && <Guide onClose={() => setGuide(false)} />}

      <header className="aff-hero">
        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1">
              <span className="aff-h1-line">Building got easy.</span>
              <b>Getting seen didn't.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">
                Braino Foundry makes your brand more visible every week, on autopilot. It finds where buyers can't find you, writes what fixes it, and brings you the people already asking. You stay in the loop and only say yes.
              </p>
              <div className="aff-hero-cta">
                <Link to="/foundry/app" className="aff-cta">Open Braino Foundry</Link>
                <button type="button" className="aff-cta aff-cta-ghost" onClick={() => setGuide(true)}>How it works</button>
              </div>
            </div>
          </div>
        </div>
        <figure className="aff-hero-shot" data-grow>
          <img src="/braino-waitlist-forest.png" alt="A dark forest with one small tree lit up in a clearing." width={1956} height={804} loading="eager" decoding="async" />
        </figure>
        <div className="aff-strip">
          <div className="aff-wrap aff-strip-in">
            <p className="aff-strip-label">Gets you seen where buyers look</p>
            <ul className="aff-strip-names fl-where">
              {["ChatGPT", "Google", "Reddit", "LinkedIn", "X", "Threads"].map((n) => <li key={n}><span>{n}</span></li>)}
            </ul>
          </div>
        </div>
      </header>

      <section className="hb6" id="engines">
        <div className="aff-wrap">
          <p className="ah-kicker">Meet Braino Foundry</p>
          <h2 className="aff-h1 ah-os-line hb6-big" data-lit>
            <Lit text="A co-founder for the one job nobody has time for: getting seen." />
          </h2>
          <div className="ah-os-say hb6-say aff-reveal">
            <p>8 of the 8 founders we interviewed named distribution their biggest problem, and none of them pays for a tool to fix it. They post into the void, hunt for customers by hand, and never know what worked.</p>
          </div>
          <div className="hb6-box aff-reveal">
            <div className="hb6-head">
              <div>
                <p className="ah-kicker">Three engines</p>
                <div className="hb5-name"><h2>Braino Foundry</h2></div>
                <p className="hb6-line">Each engine does one job, and each one feeds the next. Nothing is posted or sent without your yes.</p>
              </div>
              <div className="hb6-side">
                <div className="hb5-go">
                  <Link to="/foundry/app" className="aff-cta">Open Braino Foundry</Link>
                </div>
              </div>
            </div>
            <ul className="hb4-does hb6-jobs fl-engines">
              {ENGINES.map((e, i) => <li key={e.h} className={`is-key fl-e${i}`}><small>{e.key}</small><h3>{e.h}</h3><p>{e.p}</p></li>)}
            </ul>
          </div>
          <div className="hb6-demo">
            <h2 className="aff-h1 ah-os-line hb6-tag" data-lit><Lit text="Find out where you're invisible." /></h2>
            <p className="hb6-story aff-reveal">In about a minute, a founder sees it in one sentence:</p>
            <EngineCards />
            <figure className="fl-moment aff-reveal">
              <p>"We asked AI the 8 questions your buyers ask. You were named in <b>0</b>. Your competitor in <b>7</b>. Here are <b>5 posts</b> that answer them, and <b>the people asking</b> on Reddit, each with a reply in your voice."</p>
            </figure>
          </div>
        </div>
      </section>

      {/* Where it runs: two tabs, kept apart on purpose (2026-10-22). */}
      <section className="ah-os" id="where">
        <div className="aff-wrap">
          <p className="ah-kicker">Where it runs</p>
          <WhereTabs />
        </div>
      </section>

      <section className="ah-os" id="workflows">
        <div className="aff-wrap">
          <p className="ah-kicker">Workflows</p>
          <h2 className="aff-h1 ah-os-line" data-lit>
            <Lit text="You pick what you need this week. Braino Foundry runs the engines in the right order." />
          </h2>
          <ul className="hb4-does fl-flows aff-reveal">
            {FLOWS.map((f) => <li key={f.h}><h3>{f.h}</h3><p>{f.p}</p></li>)}
          </ul>
        </div>
      </section>

      <section className="hb2-faq">
        <div className="aff-wrap hb2-faq-split">
          <div className="hb2-faq-side">
            <h3 className="hb2-faq-h aff-reveal">Questions</h3>
            <p>Anything else? <Link to="/foundry/app">Try it</Link> and see for yourself.</p>
          </div>
          <div className="hb2-faq-list">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<i aria-hidden="true">+</i></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="hb-end">
        <div className="hb-end-glow" aria-hidden="true" />
        <div className="aff-wrap hb-end-in aff-reveal">
          <h2 className="aff-h1 hb-end-line">Get your product <span className="hb-end-braino">seen.</span></h2>
          <p className="hb-end-p">Tell Braino Foundry what you're building. It takes about a minute.</p>
          <div className="hb-go">
            <Link to="/foundry/app" className="aff-cta">Open Braino Foundry</Link>
            <Link to="/braino" className="aff-cta aff-cta-ghost">Meet Braino</Link>
          </div>
        </div>
      </section>

      <AffFooter />
    </div>
  );
}
