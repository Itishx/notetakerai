import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import "./knowledge-base.css";

export default function TwoProductsDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Design decision 029</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Braino website</span><span>Structure</span><span>MVP</span></div>
          <h1>Braino comes in three.<br /><em>On one page.</em></h1>
          <p>One introduction, then three tabs. The notch carries the navigation and nobody has to leave to compare them.</p>
          <time dateTime="2026-08-11">Published August 11, 2026</time>
        </header>

        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Braino is three products: the browser, Foundry on the Mac, and BrainoHERA. They used to be spread across pages that either could not be reached from the front door, or said the same thing twice in two places.</p>
          <p>They now share one page. You read one introduction to Braino, then pick which of the three you want, and only that part of the page changes.</p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">The actual bug</p>
          <h2>One link, and one page named after its own tab.</h2>
          <p>The entire outbound link set of the home page was a single link to a knowledge document, and the main product page lived at /foundry while Foundry was one of its own tabs. It is at /braino now, with the three products in the notch so they are reachable at any scroll position.</p>
          <p>Three chapters now link out: the browser chapter to <Link to="/braino">Braino</Link>, IOMI to <Link to="/braino?view=foundry">Foundry</Link>, meetings to <Link to="/meetings">/meetings</Link>.</p>
        </section>

        <section className="kb-article-block">
          <p className="kb-article-eyebrow">Two designs, two jobs</p>
          <h2>A list is a promise.<br />A grid is a range.</h2>
          <p>The Browser tab borrows from both existing designs on purpose. The numbered rows from Foundry answer "what will it definitely do?" and go first, because four numbered things read as a commitment. The capability bento answers "how far does this go?" and goes second, under the honest admission that the four are the floor rather than the ceiling.</p>
          <p>Leading with the grid would have been a feature dump.</p>
        </section>

        <section className="kb-article-block">
          <aside className="kb-honesty">
            <strong>Rules that came out of this</strong>
            <p>No colour slabs dropped into the middle of a page: every section sits on the same surface, and emphasis comes from type scale, space and hairlines. Less copy than feels natural to write. And SiteFooter ships dressed for the cream home pages, so any Apple-shell page has to restate it in its own tokens or it arrives in the wrong clothes.</p>
          </aside>
          <p>Mockups on the new pages stay abstract. They suggest the shape of a thing rather than pretending to be screenshots, which would age badly against a product still moving every week.</p>
        </section>

        <footer className="kb-article-footer">
          <Link to="/knowledge">See every Braino document <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/two-products-and-the-browser-page.md</p>
        </footer>
      </article>
    </main>
  );
}
