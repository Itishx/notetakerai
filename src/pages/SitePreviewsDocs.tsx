import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function SitePreviewsDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Technical 064</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Affective website</span><span>Link previews</span><span>Live</span></div><h1>Every page<br /><em>speaks for itself.</em></h1><p>Share an Affective link and the preview says Affective, and describes that exact page.</p><time dateTime="2026-10-02">Published October 2, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">Until now, every link on the site showed the same old card: &ldquo;Braino : Your AI Browser Sidekick&rdquo;. It was left over from the very first version of the product. Paste a link into WhatsApp, LinkedIn or an AI chat and you saw the wrong thing, or nothing at all.</p><p>Now each main page sends its own title, its own description and its real words. Search engines and AI tools read the actual page, even the ones that never run JavaScript.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">How it works</p><h2>Build the site.<br />Save the words.<br />Bake them in.</h2><p>After every build, each main page gets its own small HTML file with its title, its share card and a saved copy of its words. The moment the site starts, the real page takes over. You never see the saved copy unless the site fails to load.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>The words are a saved copy. If a page&rsquo;s words change and nobody refreshes the copy, previews keep the old words until someone does. Only the nine main pages get their own card; every other address shows the general Affective one. All pages share one preview image for now.</p></aside><p><Link to="/">Open the site <ArrowRight aria-hidden="true" /></Link></p></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/site-previews.md</p></footer>
  </article></main>;
}
