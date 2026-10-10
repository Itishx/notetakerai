import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function LocalhostDocs() {
  return <main className="kb-article"><header className="kb-nav kb-article-nav"><Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link><span className="kb-nav-label">Feature 068</span></header><article>
    <header className="kb-article-hero"><div className="kb-article-meta"><span>Braino for Mac</span><span>Dev servers</span><span>MVP</span></div><h1>Open my localhost.<br /><em>He knows which one.</em></h1><p>Braino now knows what is running on your Mac and what each server is for.</p><time dateTime="2026-10-03">Published October 3, 2026</time></header>
    <section className="kb-article-block kb-article-intro"><p className="kb-dropcap">&ldquo;Open the localhost link in a new tab&rdquo; used to get &ldquo;Chrome has no tabs open.&rdquo; He had no idea a dev server was even running. Now he reads the ports, names each one by its project, and opens the one you have been working in.</p><p>Say a port, or a project, and he opens that. If two are running and he cannot tell, he asks which.</p></section>
    <section className="kb-article-block kb-dark-block"><p className="kb-article-eyebrow">Also fixed</p><h2>One word no longer<br />steals a sentence.</h2><p>&ldquo;Tab&rdquo; and &ldquo;profile&rdquo; used to send whole sentences to quick shortcuts that did the wrong thing and said &ldquo;Done.&rdquo; And when he says &ldquo;just a moment&rdquo;, the job now actually runs.</p></section>
    <section className="kb-article-block"><aside className="kb-honesty"><strong>The honest bit</strong><p>Not tested live yet. Seeing your words in the notch as you speak, and stopping him the moment you talk over him, are the next two fixes.</p></aside></section>
    <footer className="kb-article-footer"><Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link><p>Internal source: Braino Knowledge Base/features/knows-your-localhost.md</p></footer>
  </article></main>;
}
