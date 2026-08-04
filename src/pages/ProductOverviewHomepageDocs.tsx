import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function ProductOverviewHomepageDocs() {
  return <main className="kb-article">
    <header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Design decision 016</span></header>
    <article>
      <header className="kb-article-hero"><div className="kb-article-meta"><span>Website</span><span>Product overview</span><span>Exploring</span></div><h1>Meet the character.<br /><em>Then see what he can do.</em></h1><p>The hidden main page now introduces the animated, full-colour Braino first, followed immediately by his capabilities—not a history lesson about how he got here.</p><time dateTime="2026-08-04">Published August 4, 2026</time></header>
      <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">People do not need Braino's internal chronology before they care about Braino.</p><p>The new “Who is Braino?” keeps the direct promise—“Not a tool. Your best friend for the web.”—then shows his six real forms: expression, companion, walking, dancing, moonwalking, and reactions.</p><p>The rest of the page includes Hera, linked Braino OS engines, Braino Studio, a shorter Journal preview, honest pricing, a full-screen interactive ecosystem, and finally FAQ.</p></section>
      <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">The order matters</p><h2>Meet him.<br />See the system.<br />Choose.</h2><p>The ecosystem now follows capabilities, before the Browser and IOMI deep-dives. Braino OS, Studio and Hera complete the product story; Journal and one consolidated founder section add depth afterward. Pricing is second-to-last and FAQ closes the page. The experimental Adopt chapter and all A/B/C/D controls remain removed.</p></section>
      <section className="kb-article-block"><aside className="kb-honesty"><strong>Still hidden</strong><p>This refresh lives at `/product-overview`. The root website still shows the Waitlist until the homepage switch is made deliberately. Studio and Hera remain previews, not finished products.</p></aside></section>
      <footer className="kb-article-footer"><Link to="/product-overview">Open the refreshed page <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/design/product-overview-homepage.md</p></footer>
    </article>
  </main>;
}
