import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { KNOWLEDGE_ENTRIES } from "@/lib/brainoKnowledge";
import "./knowledge-base.css";

export default function KnowledgeBase() {
  const newestFirst = [...KNOWLEDGE_ENTRIES].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="kb-page">
      <header className="kb-nav">
        <Link to="/" className="kb-wordmark" aria-label="Braino home">
          <img src="/favicon.svg" alt="" width="28" height="28" />
          <span>Braino</span>
        </Link>
        <span className="kb-nav-label">Knowledge Base</span>
      </header>

      <section className="kb-hero">
        <p className="kb-kicker">The product, remembering itself</p>
        <h1>Everything we build.<br /><em>Nothing gets lost.</em></h1>
        <p className="kb-hero-copy">
          Every Braino feature gets a permanent home here. What it does, why it exists,
          how it works, and what we learned while making it.
        </p>
        <div className="kb-hero-rule">
          <span>{String(KNOWLEDGE_ENTRIES.length).padStart(2, "0")} documents</span>
          <span>Started in 2026</span>
          <span>Always growing</span>
        </div>
      </section>

      <section className="kb-library" aria-labelledby="kb-library-title">
        <div className="kb-section-heading">
          <p>Browse the library</p>
          <h2 id="kb-library-title">The Braino Knowledge Base</h2>
        </div>

        <div className="kb-card-grid">
          {KNOWLEDGE_ENTRIES.map((entry) => (
            <Link className="kb-card" to={`/knowledge/${entry.slug}`} key={entry.slug}>
              <span className="kb-card-sweep" aria-hidden="true" />
              <div className="kb-card-top">
                <span>{entry.number}</span>
                <span>{entry.category}</span>
              </div>
              <div className="kb-card-body">
                <p className="kb-card-platform">{entry.platform} · {entry.status}</p>
                <h3>{entry.title}</h3>
                <p>{entry.description}</p>
              </div>
              <div className="kb-card-bottom">
                <time dateTime={entry.date}>{entry.dateLabel}</time>
                <span className="kb-card-open">Read <ArrowUpRight aria-hidden="true" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="kb-new" aria-labelledby="kb-new-title">
        <div className="kb-section-heading kb-section-heading-light">
          <p>A living release record</p>
          <h2 id="kb-new-title">Everything New with Braino</h2>
        </div>
        <div className="kb-feed">
          {newestFirst.map((entry) => (
            <Link to={`/knowledge/${entry.slug}`} className="kb-feed-item" key={entry.slug}>
              <time dateTime={entry.date}>{entry.dateLabel}</time>
              <div>
                <span>{entry.category} · {entry.status}</span>
                <h3>{entry.title}</h3>
                <p>{entry.description}</p>
              </div>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <footer className="kb-footer">
        <p>Nothing should be built without being understood.</p>
        <Link to="/">Back to Braino</Link>
      </footer>
    </main>
  );
}

