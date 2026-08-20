import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import BrainoFooter from "@/components/BrainoFooter";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { ArrowUpRight } from "lucide-react";
import "../styles/apple.css";
import "./landing.css";
import "./distra-page.css";

/* ============================================================================
   /distra — Braino Distra. The second of the two pages that matter.

   The landing page is the companion: what Braino does for anyone, any day. This
   one is the other half of the company, and it exists separately because it
   answers a different question for a different person. Everyone has a browser.
   Only some people have shipped something nobody saw.

   Same design language as / on purpose. It should feel like turning a page in
   the same book rather than arriving at a different product's site.
   ============================================================================ */

const SunIcon = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const MoonIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>);

const ANCHORS = [
  { href: "#problem", label: "The problem" },
  { href: "#does", label: "What he does" },
  { href: "#channels", label: "Where" },
  { href: "#control", label: "Control" },
];

/* Four, matching the landing page's four, because the shape of the argument is
   the same shape: here is the job, four ways it gets done. */
const DOES = [
  { n: "01", ac: "ac-blue", name: "He learns how you write",
    line: "By reading two hundred of your own posts, ranked by what actually worked. Not by making you describe your own voice in a text box, which nobody alive can do." },
  { n: "02", ac: "ac-violet", name: "He writes from what you shipped",
    line: "He reads your commits and your week, and there are drafts waiting in the morning. No more staring at an empty box at 11pm wondering what you even did." },
  { n: "03", ac: "ac-green", name: "He picks the hour and posts it",
    line: "From your own history, not some best-practice blog post. Then he goes and checks it actually posted, instead of assuming." },
  { n: "04", ac: "ac-coral", name: "He finds the conversations",
    line: "The posts worth replying to, with the reply already written in your voice. You press send, because that part should stay human." },
];

const CHANNELS = [
  { name: "X", state: "Live", line: "Posts, threads and xAuto: he reads your timeline, picks the few worth answering and drafts the reply.", to: "/braino-for-x", accent: "#c7ced8", surface: "#000" },
  { name: "LinkedIn", state: "Live", line: "Writes for LinkedIn's room rather than cross-posting, and drafts the comments that actually grow you.", to: "/braino-for-linkedin", accent: "#0a66c2", surface: "#f4f2ee" },
  { name: "Reddit", state: "Next", line: "The highest intent density anywhere. People ask for products by name, in the present tense.", to: "/distra/plan", accent: "#ff4500", surface: "#0b0b0b" },
  { name: "Instagram", state: "Next", line: "Reels cut from what you already shipped, without an editor being opened.", to: "/distra/plan", accent: "#e1306c", surface: "#121212" },
];

const GATES = ["Anything that spends money", "Sending a DM", "Deleting anything", "Following or unfollowing", "Changing a price or a promise"];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.16 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function DistraPage() {
  const ref = useReveal();
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  useEffect(() => { document.title = "Braino Distra: we wished distribution was as easy as vibe coding"; }, []);

  return (
    <div className={"apple ld dp" + (dark ? " dark" : "")} ref={ref}>
      <BrainoDefs />
      <IomiNotch />

      <div className="apple-anchors">
        <div className="apple-anchors-inner">
          <Link to="/" className="ld-anchor-name">Braino</Link>
          <div className="an-links">
            {ANCHORS.map((a) => <a key={a.href} href={a.href}>{a.label}</a>)}
            <Link to="/channels" className="apple-cta">Open Distra</Link>
          </div>
          <button className="apple-theme-toggle" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title="Toggle dark mode">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="apple-hero left ac-blue" id="top">
        <p className="apple-eyebrow">Braino Distra</p>
        <h1 className="apple-display">You built it.<br /><span className="tone">Nobody saw it.</span></h1>
        <p className="apple-subhead">
          We wished distribution was as easy as vibe coding. So we made it happen.
        </p>
        <p className="dp-sub2">
          Braino Distra is the same character who has been on your screen all week, pointed at the
          one problem every solo founder has and nobody bothers to sell a fix for.
        </p>
        <div className="ld-cta">
          <Link to="/channels" className="ld-btn">Open Distra</Link>
          <Link to="/" className="ld-btn ghost">The free Braino</Link>
        </div>
      </header>

      {/* ── The problem ──────────────────────────────────────────────── */}
      <section className="dp-problem apple-reveal" id="problem">
        <div className="ld-wrap">
          <p className="apple-eyebrow">The problem</p>
          <h2 className="ld-h2">Building got cheap. <span className="tone">Being seen did not.</span></h2>
          <p className="ld-lede">
            You can ship a real product in a weekend now. By Friday nobody has heard of it, and the
            reason is never the product. It is that posting consistently in your own voice is a job,
            and it is the seventh one you are already doing badly.
          </p>
          <div className="dp-versus">
            <div>
              <b>What the market sells</b>
              <ul>
                <li>Tools that help you build it</li>
                <li>Cursor, Lovable, all of them</li>
                <li>Funded, fast, and very good</li>
                <li>Then they hand it over and vanish</li>
              </ul>
            </div>
            <div className="is-on">
              <b>What nobody sells</b>
              <ul>
                <li>The part where people find out</li>
                <li>Every day, in your voice, everywhere</li>
                <li>Without it becoming your whole week</li>
                <li>That is the whole gap, sitting there</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── What he does ─────────────────────────────────────────────── */}
      <section id="does">
        <div className="apple-statement apple-reveal ac-blue">
          Four things, <span className="tone">every day.</span>
        </div>
        <div className="ld-wrap dp-does">
          {DOES.map((d) => (
            <article key={d.n} className={"dp-do apple-reveal " + d.ac}>
              <span>{d.n}</span>
              <b>{d.name}</b>
              <p>{d.line}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Channels ─────────────────────────────────────────────────── */}
      <section className="dp-channels apple-reveal" id="channels">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Where he does it</p>
          <h2 className="ld-h2">One voice. <span className="tone">Every room.</span></h2>
          <p className="ld-lede">
            He writes for each platform the way that platform actually works. Posting identical text
            everywhere is the fastest way to announce that a robot runs your account.
          </p>
          <div className="dp-chan-grid">
            {CHANNELS.map((c) => (
              <Link key={c.name} to={c.to} className="dp-chan">
                <div className="dp-chan-top" style={{ background: c.surface }}>
                  <span style={{ background: c.accent }} />
                  <b style={{ color: c.surface === "#f4f2ee" ? "#1b1f23" : "#f2f2f2" }}>{c.name}</b>
                  <em className={c.state === "Live" ? "is-live" : undefined}>{c.state}</em>
                </div>
                <p>{c.line}</p>
                <i>Read more <ArrowUpRight size={13} aria-hidden="true" /></i>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Control ──────────────────────────────────────────────────── */}
      <section className="dp-control apple-reveal" id="control">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Where the line is</p>
          <h2 className="ld-h2">He decides how. <span className="tone">You decide whether.</span></h2>
          <p className="ld-lede">
            Nobody should hand their accounts to an agent and walk away, and we are not asking you to.
            Three levels, set per platform, changed any day. He drops back a level by himself if
            anything looks off.
          </p>
          <div className="dp-levels">
            <div><b>Ask me everything</b><p>He writes. You approve every post.</p></div>
            <div className="is-on"><b>Approve once</b><p>You approve the post. He picks the hour, publishes it, checks it landed, reports back.</p></div>
            <div><b>Run it</b><p>He fills the queue and publishes on his own. You can veto anything in it.</p></div>
          </div>
          <p className="apple-eyebrow" style={{ marginTop: 44 }}>He always stops and asks before these</p>
          <div className="dp-gates">{GATES.map((g) => <span key={g}>{g}</span>)}</div>
          <p className="ld-fine">
            He also shows his work. Every decision lands on the dashboard, including the ones where he
            refused to post something and which rule stopped him. An agent you cannot audit is one you
            should not be trusting with your name.
          </p>
        </div>
      </section>

      {/* ── Honest ───────────────────────────────────────────────────── */}
      <section className="dp-honest apple-reveal">
        <div className="ld-wrap">
          <p className="apple-eyebrow">The honest bit</p>
          <h2 className="ld-h2 sm">What this does <span className="tone">not</span> do.</h2>
          <ul>
            <li><b>It will not make you go viral.</b> Nobody can promise that and anyone who does is selling something. It makes you consistent, in your own voice, without it feeling like a second job.</li>
            <li><b>He never sends a reply or a comment himself.</b> Automated engagement is what gets accounts restricted, so he judges and drafts and you press the key.</li>
            <li><b>Some numbers are genuinely unavailable.</b> LinkedIn analytics need partner access we do not have. The dashboard shows a dash and tells you why, instead of making a number up.</li>
            <li><b>Braino Distra's first customer is Braino.</b> It runs this company's own distribution before it runs yours.</li>
          </ul>
        </div>
      </section>

      <section className="ld-close apple-reveal">
        <div className="ld-close-art" aria-hidden="true"><Braino size={140} expr="happy" legs gloves /></div>
        <h2 className="apple-display">Ship it. <span className="tone">Then be seen.</span></h2>
        <div className="ld-cta">
          <Link to="/channels" className="ld-btn">Open Distra</Link>
          <Link to="/distra/plan" className="ld-btn ghost">Read the full plan</Link>
        </div>
      </section>

      <BrainoFooter />
    </div>
  );
}
