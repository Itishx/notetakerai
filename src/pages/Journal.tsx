import { useState } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import { NotchNav } from "./HomeOS";
import "./home-os.css";
import "./journal.css";

/* ============================================================================
   /journal — the Braino Journal: documentation as a blog. Minimal black index;
   each entry is an article. New posts get added to ENTRIES.

   Two tabs: Writing (the articles) and Teasers (every film, in one place, so
   they stop living only as routes you have to remember). New teasers get added
   to TEASERS.
   ============================================================================ */

const ENTRIES = [
  {
    to: "/journal/emotional-engine",
    date: "July 2026",
    tag: "documentation",
    title: "The Emotional Engine: twenty files of personality",
    dek: "Why Braino's warmth is written behaviour, not a system prompt. The architecture, the twelve traits, and the moment router.",
  },
  {
    to: "/founder-letter",
    date: "July 2026",
    tag: "letter",
    title: "I built a Mac app to fuck around and find out",
    dek: "The founder letter. No users, three months of tuition, a notch, and a kid who talks like his father.",
  },
];

const TEASERS = [
  {
    to: "/dontblink",
    date: "July 2026",
    tag: "film",
    title: "Don't Blink",
    dek: "The long one. Kinetic type, match cuts, and every word chunked so the frame never sits still.",
  },
  {
    to: "/notch-teaser",
    date: "July 2026",
    tag: "film",
    title: "The Notch",
    dek: "He sleeps in your notch, wakes when you call. The film that named the mechanic.",
  },
  {
    to: "/aware",
    date: "July 2026",
    tag: "film",
    title: "Aware",
    dek: "The emotional engine, on screen. What it looks like when he actually notices you.",
  },
  {
    to: "/teaser",
    date: "July 2026",
    tag: "film",
    title: "Launch",
    dek: "The launch teaser.",
  },
  {
    to: "/launch-short",
    date: "July 2026",
    tag: "short",
    title: "Launch (short cut)",
    dek: "The same beat, trimmed for a feed.",
  },
  {
    to: "/n",
    date: "July 2026",
    tag: "letter",
    title: "The Letter",
    dek: "Typed out, one line at a time.",
  },
  {
    to: "/intro",
    date: "July 2026",
    tag: "preview",
    title: "Intro",
    dek: "The intro sequence preview.",
  },
  {
    to: "/prelaunch",
    date: "July 2026",
    tag: "site",
    title: "Pre-launch",
    dek: "The page that ran before the doors opened.",
  },
];

type Tab = "writing" | "teasers";

export default function Journal() {
  const [tab, setTab] = useState<Tab>("writing");
  const items = tab === "writing" ? ENTRIES : TEASERS;

  return (
    <div className="hos jr">
      <NotchNav />
      <header className="jr-head">
        <div className="jr-wrap">
          <div className="eyebrow">documentation · one article at a time</div>
          <h1 className="jr-title">The Braino Journal<span className="fork-dot">.</span></h1>
          <p className="jr-dek">How he's built, in public: the engine, the notch, the bodies, whatever ships next.</p>
          <div className="jr-tabs" role="tablist" aria-label="Journal sections">
            {([["writing", "Writing"], ["teasers", "Teasers"]] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`jr-tab${tab === key ? " on" : ""}`}
                onClick={() => setTab(key)}
              >
                {label}
                <span className="jr-tab-n">{key === "writing" ? ENTRIES.length : TEASERS.length}</span>
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="jr-wrap">
        {items.map((e) => (
          <Link key={e.to} className="jr-entry" to={e.to}>
            <div className="jr-meta"><span>{e.date}</span><span className="jr-tag">{e.tag}</span></div>
            <div className="jr-entry-title">{e.title}</div>
            <p>{e.dek}</p>
            <span className="qa-link">{tab === "teasers" ? "Watch →" : "Read →"}</span>
          </Link>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
