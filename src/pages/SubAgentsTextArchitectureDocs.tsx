import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function SubAgentsTextArchitectureDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Design decision 021</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino website</span><span>Concept film</span><span>Exploring</span></div><h1>Don’t Blink.<br /><em>Then multiply.</em></h1><p>The established type system, interrupted by dedicated graphics showing six full-body Brainos working at once.</p><time dateTime="2026-08-08">Published August 8, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Text and graphics share one centre point.</p><p>One Braino deploys into six specialists. Research, verification, comparison, planning, building and review happen together before their work converges into one answer.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The visual rule</p><h2>Never stack.<br />Always replace.</h2><p>Each graphic owns a separate beat and uses the same visible composition grid as every centred line. Nothing floats above or below the copy.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Sub-Agents are planned, not shipped. This teaser establishes the product metaphor while the exact capability and agent roles are still being designed.</p></aside><p><Link to="/sub-agents-teaser">Watch the concept <ArrowRight aria-hidden="true" /></Link></p></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/design/sub-agents-text-architecture.md</p></footer>
  </article></main>;
}
