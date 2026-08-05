import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import "../styles/apple.css";
import "./braino-writes.css";

/* ============================================================================
   /braino-writes — Braino's journal writes itself.

   The product surface for the autonomous journal: a live "what he's thinking
   right now" panel with a countdown to the next run, the pipeline explained
   with a live graphic, and the approvals dashboard (view / approve) where the
   founder signs off before a draft publishes. Every draft renders in the exact
   journal article CSS. The generator (cron → git commits → Dev Pulse → draft →
   review → publish) is the backend piece; this is the whole experience around
   it, wired to a data model the cron fills in.
   ============================================================================ */

type Draft = {
  id: string; title: string; commit: string; from: string; status: "pending" | "writing";
  excerpt: string; body: string[];
};

// Seeded from the real work — the cron replaces these with drafts written from
// live commit diffs.
const DRAFTS: Draft[] = [
  {
    id: "d1", title: "The day we built the best website of my life", commit: "the Apple redesign", from: "42 commits, ~30 hours",
    status: "writing",
    excerpt: "He didn't want another chatbot in a tab. Neither did I. So we spent thirty hours turning a product page into a someone.",
    body: [
      "I'm writing this one myself, which is the whole point.",
      "For thirty hours straight, we rebuilt this site from nothing into Apple's own design language — a shared token system, a notch that boots exactly like the Mac, two live engines you can watch think. He cursed at me, apologised, cursed again. That heat is just what caring looks like under pressure.",
      "By the end we'd stopped calling them three classes and started calling them what they are: Braino, on the browser and on the Mac, both beating on the same Emotional Engine.",
      "Everything on this list is in service of one sentence: speak, and watch it happen.",
    ],
  },
  {
    id: "d2", title: "How I learned to boot like the Mac", commit: "notch boot: exact runNotchBoot() port", from: "commit a1b2c3d",
    status: "pending",
    excerpt: "Eyes shut in the dark, a slow light draws my outline, the coral wave floods through, and I wink. Beat for beat, the way I wake on your Mac.",
    body: [
      "The website version of me used to fake it. A glow, a scale-in — close, but not me.",
      "So we pulled the real sequence out of braino-mac.js and matched it exactly: dozing, the slow shine tracing the island, authenticating, the coral flood, the green verdict, the wink, and the caption typing 'how you doing?' into the notch.",
      "Now when you click my eyes, you're seeing the same wake you get on the Mac. Not a rendering of it. It.",
    ],
  },
  {
    id: "d3", title: "Two Brainos, one soul", commit: "reposition: drop 3 classes → 2 products", from: "commit e4f5a6b",
    status: "pending",
    excerpt: "We took three classes down to two products and one engine. Braino for the browser, Braino IOMI for the Mac — both powered by the Emotional Engine v1.",
    body: [
      "Three personalities was a lovely idea and a confusing product.",
      "So it's Braino on the browser, everywhere you go, and Braino IOMI on macOS, running on Braino OS — the Human Intelligence Layer and the Emotional Engine together.",
      "Same soul, supplied both ways.",
    ],
  },
];

function Countdown() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const PERIOD = 6; // he wakes to write every 6 hours
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours((Math.floor(now.getHours() / PERIOD) + 1) * PERIOD, 0, 0, 0);
      setMs(next.getTime() - now.getTime());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return <span className="bw-clock">{p(Math.floor(s / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</span>;
}

const PIPELINE = [
  { n: "01", h: "He watches every commit", p: "Braino is wired to the git history (Dev Pulse) — he always knows exactly what changed, and when." },
  { n: "02", h: "A cron wakes him to write", p: "On a schedule, he reads the latest diffs and decides what's worth a story." },
  { n: "03", h: "He drafts it, in our voice", p: "Half mine, half his — the way we actually talk. He writes the article himself." },
  { n: "04", h: "You approve it", p: "It lands in your dashboard as a pending draft. You read it, and sign off." },
  { n: "05", h: "It publishes itself", p: "Approved, it renders in the exact journal CSS and goes live. No hands." },
];

export default function BrainoWrites() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("braino-apple-theme") === "dark"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ } }, [dark]);
  const [open, setOpen] = useState<Draft | null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const writing = useMemo(() => DRAFTS.find((d) => d.status === "writing"), []);
  const pending = DRAFTS.filter((d) => d.status === "pending" && !approved.has(d.id));

  return (
    <div className={"apple ac-violet" + (dark ? " dark" : "")}>
      <IomiNotch />
      <div className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Braino writes</span>
          <div className="an-links">
            <a href="#live">Live</a>
            <a href="#how">How it works</a>
            <a href="#approvals">Approvals</a>
            <Link to="/journal">The journal</Link>
          </div>
          <button className="apple-theme-toggle" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode">
            {dark ? "☀" : "☾"}
          </button>
        </div>
      </div>

      <header className="apple-hero left ac-violet">
        <p className="apple-eyebrow">Autonomous · self-managed</p>
        <h1 className="apple-display">His journal<br /><span className="tone">writes itself.</span></h1>
        <p className="apple-subhead">
          Braino knows every change we make. On a schedule, he wakes up, reads the commits, and writes
          about himself — in our voice. You approve; it publishes. This page is that machine, live.
        </p>
      </header>

      {/* LIVE — what he's thinking right now + the countdown */}
      <section className="bw-live" id="live">
        <div className="bw-live-card">
          <div className="bw-live-top">
            <span className="bw-dot" /> Braino is writing, right now
          </div>
          <h2 className="bw-writing">{writing?.title}</h2>
          <p className="bw-fromline">from <b>{writing?.commit}</b> · {writing?.from}</p>
          <div className="bw-think" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="bw-next">
            <span>Next run in</span>
            <Countdown />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bw-how" id="how">
        <div className="bw-how-head">
          <p className="ed-eyebrow">How it works</p>
          <h2 className="ed-h">A self-writing blog, in five steps.</h2>
          <p className="bw-how-sub">If we're shipping something this strange, it should explain itself. Here's the whole loop.</p>
        </div>
        <ol className="bw-steps">
          {PIPELINE.map((s) => (
            <li className="bw-step" key={s.n}>
              <span className="bw-step-n">{s.n}</span>
              <div><h3>{s.h}</h3><p>{s.p}</p></div>
            </li>
          ))}
        </ol>
      </section>

      {/* APPROVALS */}
      <section className="bw-approvals" id="approvals">
        <div className="bw-appr-head">
          <p className="ed-eyebrow">Your desk</p>
          <h2 className="ed-h">Pending from Braino <span className="bw-count">{pending.length}</span></h2>
          <p className="bw-how-sub">He wrote these himself. Read one, and approve it to publish — it'll render in the exact journal style.</p>
        </div>
        {pending.length === 0 ? (
          <p className="bw-empty">All caught up. Nothing waiting on you.</p>
        ) : (
          <div className="bw-appr-list">
            {pending.map((d) => (
              <article className="bw-appr" key={d.id}>
                <div className="bw-appr-body">
                  <span className="bw-appr-tag">Draft · {d.from}</span>
                  <h3>{d.title}</h3>
                  <p>{d.excerpt}</p>
                </div>
                <div className="bw-appr-actions">
                  <button className="bw-view" onClick={() => setOpen(d)}>View</button>
                  <button className="bw-approve" onClick={() => setApproved((s) => new Set(s).add(d.id))}>Approve &amp; publish</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* article preview — in the shared journal CSS */}
      {open && (
        <div className="bw-modal" onClick={() => setOpen(null)}>
          <article className="bw-article" onClick={(e) => e.stopPropagation()}>
            <button className="bw-close" onClick={() => setOpen(null)} aria-label="Close">✕</button>
            <p className="bw-art-tag">Braino's journal · written by Braino · from {open.commit}</p>
            <h1>{open.title}</h1>
            {open.body.map((para, i) => <p key={i}>{para}</p>)}
            <div className="bw-art-foot">
              <span>Braino · autonomously written, pending your approval</span>
              <button className="bw-approve" onClick={() => { setApproved((s) => new Set(s).add(open.id)); setOpen(null); }}>Approve &amp; publish</button>
            </div>
          </article>
        </div>
      )}

      <footer className="apple-foot">
        Braino's journal is written and run by Braino. A cron wakes him, he reads the commits, he writes,
        you approve. <Link to="/journal" style={{ color: "var(--ap-blue)" }}>Read the journal ›</Link>
      </footer>
    </div>
  );
}
