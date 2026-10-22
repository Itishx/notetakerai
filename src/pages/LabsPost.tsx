import { useEffect, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { AffNav, AffFooter, useAffReveal } from "@/components/affPage";
import { useAffTheme } from "@/components/AffTheme";
import { findLabsPost } from "@/lib/labsPosts";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./labs-post.css";

/* ============================================================================
   /labs/:slug: one article from Writing from Labs (2026-10-22).
   Metadata comes from src/lib/labsPosts.ts; the body comes from BODIES below,
   keyed by slug. Narrow reading column, sticky contents on desktop, diagrams
   drawn in SVG/HTML so nothing needs an image.
   ============================================================================ */

type Toc = { id: string; label: string }[];

/* ---------- Diagrams ---------- */

function LoopDiagram() {
  return (
    <figure className="lp-fig">
      <svg viewBox="0 0 560 360" role="img" aria-label="Optics feeds Content, Content feeds Outreach, and Outreach feeds back into Optics.">
        <defs>
          <marker id="lp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" className="lp-svg-head" />
          </marker>
        </defs>
        <path className="lp-svg-line" d="M318 78 C 420 90, 470 160, 452 222" markerEnd="url(#lp-arrow)" />
        <path className="lp-svg-line" d="M392 292 C 330 330, 230 330, 168 292" markerEnd="url(#lp-arrow)" />
        <path className="lp-svg-line" d="M108 222 C 90 160, 140 90, 242 78" markerEnd="url(#lp-arrow)" />
        <g className="lp-node is-key"><rect x="200" y="30" width="160" height="70" rx="18" /><text x="280" y="62">Optics</text><text x="280" y="82" className="lp-svg-sub">where you are missing</text></g>
        <g className="lp-node"><rect x="380" y="226" width="160" height="70" rx="18" /><text x="460" y="258">Content</text><text x="460" y="278" className="lp-svg-sub">public posts</text></g>
        <g className="lp-node"><rect x="20" y="226" width="160" height="70" rx="18" /><text x="100" y="258">Outreach</text><text x="100" y="278" className="lp-svg-sub">one message each</text></g>
        <text x="280" y="190" className="lp-svg-center">You approve</text>
        <text x="280" y="212" className="lp-svg-sub">everything</text>
      </svg>
      <figcaption>The loop. Optics finds the gaps, Content fills them in public, Outreach reaches the people already asking, and what they say goes back into Optics.</figcaption>
    </figure>
  );
}

const STEPS = [
  { n: "1", h: "Tell it what you make", p: "Your site or a few lines. Braino Foundry plays the brief back so you can fix it." },
  { n: "2", h: "Optics looks", p: "It asks what your buyers ask, in AI answers and on Google." },
  { n: "3", h: "You see the gaps", p: "Where you are missing, why, and what to do first." },
  { n: "4", h: "Content and Outreach draft", p: "Posts for the gaps, messages for the people asking." },
  { n: "5", h: "You approve", p: "Approve copies it and opens the place to post. You press send." },
];

function WorkflowDiagram() {
  return (
    <figure className="lp-fig">
      <ol className="lp-steps" aria-label="The Get found workflow">
        {STEPS.map((s) => (
          <li key={s.n}><span className="lp-step-n">{s.n}</span><strong>{s.h}</strong><p>{s.p}</p></li>
        ))}
      </ol>
      <figcaption>Get found, step by step. Most of it is waiting a minute while the search runs.</figcaption>
    </figure>
  );
}

function EcosystemDiagram() {
  return (
    <figure className="lp-fig">
      <div className="lp-eco">
        <div className="lp-eco-row">
          <div className="lp-eco-box">
            <span className="lp-eco-k">On a Mac</span>
            <strong>Braino Mac app</strong>
            <p>Voice controlled. Foundry is switched on inside him, so you just ask the same little guy.</p>
            <span className="lp-eco-chip">Private beta</span>
          </div>
          <div className="lp-eco-box">
            <span className="lp-eco-k">Chrome and Windows</span>
            <strong>The website</strong>
            <p>The full Foundry app in your browser at /foundry/app. Same engines, same approvals.</p>
            <span className="lp-eco-chip">Open to try</span>
          </div>
        </div>
        <svg className="lp-eco-join" viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M100 0 V20 H300 V0 M200 20 V40" className="lp-svg-line" />
        </svg>
        <div className="lp-eco-box lp-eco-brain">
          <strong>One brain</strong>
          <p>Braino. Your brief, your voice, what you approved. Both doors lead to him.</p>
        </div>
      </div>
      <figcaption>Two ways in, one Braino underneath.</figcaption>
    </figure>
  );
}

/* ---------- Article bodies ---------- */

const FOUNDRY_TOC: Toc = [
  { id: "why", label: "Why we built it" },
  { id: "what", label: "What it is" },
  { id: "engines", label: "Three engines, one loop" },
  { id: "workflows", label: "Four workflows" },
  { id: "where", label: "Where it lives" },
  { id: "limits", label: "What it does not do yet" },
  { id: "try", label: "Try it" },
];

function FoundryBody() {
  return (
    <>
      <p className="lp-lede">Building got easy. Getting seen did not. Braino Foundry is the part of Braino that helps you with the second one. Think of it as a distribution co-founder.</p>

      <h2 id="why">Why we built it</h2>
      <p>I sat down with eight founders and asked what was hardest right now. All eight said the same thing: distribution. Not the product. Not the code. Getting the thing in front of people who need it.</p>
      <div className="lp-stats">
        <div><b>8 of 8</b><span>named distribution their biggest problem</span></div>
        <div><b>0 of 8</b><span>pay for a tool to fix it</span></div>
      </div>
      <p>That second number is the interesting one. Everyone has the problem, and nobody has found something worth paying for. The tools out there either post for you and sound like a robot, or hand you a dashboard and leave you alone with it.</p>
      <blockquote className="lp-quote">You can ship a product in a weekend now. Then you spend three months wondering why nobody showed up.</blockquote>

      <h2 id="what">What it is</h2>
      <p>Braino Foundry looks at where you are invisible, writes what should go out, finds the people already asking for what you make, and hands it all to you to approve. It runs on GPT-5.6.</p>
      <p>It came out of Labs. Outreach was the first engine we built here. Then Content. Then Optics. Each one was useful alone, but they kept wanting each other, so we put them in one place.</p>
      <div className="lp-callout"><strong>The one rule.</strong> Nothing goes out without you. Every post and every message waits for your approval.</div>

      <h2 id="engines">Three engines, one loop</h2>
      <p><b>Optics</b> finds where buyers cannot find you. It asks the questions your customers ask, in AI answers and on Google, and shows where you are missing.</p>
      <p><b>Content</b> writes public posts for X, LinkedIn, Reddit, Instagram and Threads, in your voice, shaped for each place.</p>
      <p><b>Outreach</b> finds people on Reddit asking about the problem you solve, and writes one message for each of them.</p>
      <LoopDiagram />
      <div className="lp-callout lp-callout-soft"><strong>Content and Outreach never mix.</strong> Content is for everyone, out in public. Outreach is one message for one person. A post is never pasted into a DM, and a DM is never turned into a post.</div>

      <h2 id="workflows">Four workflows</h2>
      <p>You do not have to learn three engines. You pick what you want to happen, and Braino Foundry runs the right ones in the right order.</p>
      <ul className="lp-list">
        <li><b>Get found.</b> See where you are missing and fill the gaps.</li>
        <li><b>I shipped something.</b> Turn a launch into posts and the right messages.</li>
        <li><b>Find my first customers.</b> People who are asking right now, one message each.</li>
        <li><b>Stay visible every week.</b> A steady rhythm, so you do not vanish between launches.</li>
      </ul>
      <p>Here is what Get found looks like from start to finish.</p>
      <WorkflowDiagram />

      <h2 id="where">Where it lives</h2>
      <p>Braino Foundry is not a separate app you have to remember. On the Mac, it is switched on inside Braino, the same little guy you already talk to. You ask him out loud. The Mac app is in private beta right now.</p>
      <p>If you are on Chrome or Windows, the whole thing is on the website at /foundry/app. Same engines, same approvals, same brain.</p>
      <EcosystemDiagram />

      <h2 id="limits">What it does not do yet</h2>
      <p>I would rather you hear this from me than find out.</p>
      <ul className="lp-list">
        <li><b>It does not post for you.</b> Approve copies the text and opens the place to post it. You press send. Auto posting is not built yet.</li>
        <li><b>Reddit is found through Google.</b> We search Reddit threads through Google, so very new threads can be missed.</li>
        <li><b>Search takes a minute.</b> Optics really goes and looks, so a full run is not instant.</li>
      </ul>

      <h2 id="try">Try it</h2>
      <p>It is early, it is honest about what it is, and it is already useful. Tell it what you make and see where you are missing.</p>
      <div className="lp-cta">
        <div>
          <strong>Open Braino Foundry</strong>
          <p>Start with Get found. It takes a few minutes.</p>
        </div>
        <Link to="/foundry/app" className="aff-cta">Open the app</Link>
      </div>
    </>
  );
}

const BODIES: Record<string, { toc: Toc; Body: () => ReactNode; kicker: string }> = {
  "introducing-braino-foundry": { toc: FOUNDRY_TOC, Body: FoundryBody, kicker: "Announcement" },
};

export default function LabsPost() {
  const { slug } = useParams();
  const { theme, toggle } = useAffTheme();
  const meta = findLabsPost(slug);
  const entry = slug ? BODIES[slug] : undefined;
  const root = useAffReveal([slug]);

  useEffect(() => {
    document.title = meta ? `${meta.title} · Affective Labs` : "Labs · Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    window.scrollTo(0, 0);
    return () => { document.body.style.background = prev; };
  }, [meta]);

  const nav: Array<[string, string]> = [["Labs", "/labs"], ["Braino Foundry", "/foundry"], ["Braino", "/braino"]];

  if (!meta || !entry) {
    return (
      <div className="aff lp" data-theme={theme}>
        <AffNav theme={theme} onToggle={toggle} links={nav} />
        <main className="lp-missing"><h1>That post is not here.</h1><Link to="/labs#writing" className="aff-cta">Back to Labs</Link></main>
        <AffFooter />
      </div>
    );
  }

  const { Body, kicker } = entry;
  return (
    <div className="aff ao lp" data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} links={nav} />
      {/* Same grammar as the AffectiveOS announcement: date line, one long
          serif headline, then a single reading column (2026-10-22). */}
      <article className="ao-col">
        <p className="ao-date">{meta.dateLabel} · {kicker} · {meta.readTime}</p>
        <h1 className="ao-title">{meta.headline || meta.title}</h1>
        <Body />
        <p className="lp-sign">{meta.author}, Bengaluru</p>
      </article>
      <AffFooter />
    </div>
  );
}
