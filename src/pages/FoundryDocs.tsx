import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import "./knowledge-base.css";

export default function FoundryDocs() {
  return (
    <main className="kb-article">
      <header className="kb-nav kb-article-nav">
        <Link to="/knowledge" className="kb-back"><ArrowLeft aria-hidden="true" /> Knowledge Base</Link>
        <span className="kb-nav-label">Product 024</span>
      </header>
      <article>
        <header className="kb-article-hero">
          <div className="kb-article-meta"><span>Website</span><span>Foundry</span><span>Exploring</span></div>
          <h1>Everyone gave you a chatbot.<br /><em>Nobody gave you a partner.</em></h1>
          <p>Braino Foundry reframes the full Mac product around one job: becoming the present, opinionated co-founder a solo builder can actually work beside.</p>
          <time dateTime="2026-08-09">Published August 9, 2026</time>
        </header>
        <section className="kb-article-block kb-article-intro">
          <p className="kb-dropcap">Solo builders do not have an intelligence shortage. They have a presence shortage.</p>
          <p>Foundry turns Braino's notch, voice, screen-aware help, Mac execution, BrainoHERA, and Emotional Engine into one legible promise. You stop carrying context between tools and start talking to the person helping run the work.</p>
          <p>A two-tab switch divides the website into complete stories. <strong>Braino</strong> explains the broad Jarvis-shaped product—browser context, tabs, research, connected email work, meetings, voice, files and actions. <strong>Braino Foundry</strong> explains the focused co-founder direction for people building companies alone. The switch follows the Human Intelligence tab design, sits beneath the hero, and becomes sticky below the notch only after the visitor reaches it.</p>
          <p>The Braino tab includes the whole system: a concise capability grid, Product Overview's moving “and a lot more” marquee, Braino OS with its Emotional Engine and Human Intelligence Layer, BrainoHERA dictation, and BrainoStudio customization. Two earlier text-heavy philosophy sections were removed.</p>
          <p>Before selling capabilities, the Braino story introduces the character through the shared animated sequence: face, companion, walk, dancing, moonwalk and reactions. The tabs remain visible throughout the scroll, and the focused story can be shared directly with <code>/foundry?view=foundry</code>.</p>
          <p>The Foundry story is honest about the choice. Braino's potential audience and capabilities may be enormous, but “useful to everyone” is not a useful starting market. Founders are the first focus because the person building Braino lives that problem: carrying context, managing agents, handling operations and building without a second person in the room.</p>
          <p>The focused tab leads with differentiation first. A contained comparison matrix contrasts the typical AI stack with Foundry across the relationship, context, agent loop, founder attention and final result. It makes the orchestration promise concrete: brief Braino once; he briefs the right agents, reviews their output, requests revisions and returns when a decision or approval needs you. Why Foundry gives the personal reason for choosing this market, then the visually separate, open-row “How he co-founds” section explains the four broader responsibilities.</p>
          <p>The product proof then moves in a direct sequence: Shared Context, What he actually does, and the flagship agent loop. Shared Context now shows the current screen combining with a remembered decision and company goal. The work section is a focused founder queue rather than a generic card grid, while preserving the Pitch Deck, Launch Cut and Definitely Final file moment.</p>
          <p>The centered flagship graphic places Braino between the founder and the engineers: you define the outcome once, Braino briefs and reviews, and the agents execute. If the work is wrong, Braino sends it back. The Emotional Engine section reuses the live Braino OS network graphic and explains memory, the moment and judgment rather than calling Braino “not a yes-man.”</p>
          <p>Why Foundry is a compact two-column editorial section rather than a centered billboard. The “seventeen tabs” thought now belongs inside that explanation, and the orchestration closing line is left-aligned with its workflow.</p>
          <p>The character moments stay open and unboxed. Emotional Engine does not place Braino inside a pink card, and the presence section uses whitespace and simple dividers instead of a black panel.</p>
          <p>The typography is deliberately quieter than the first split-page draft: one dominant hero, smaller section statements, tighter reading widths and less vertical whitespace. The page should feel like a product website, not a sequence of billboard slides.</p>
          <p>The capability section uses Product Overview's compact bento language. Six small product states show files, forms, video notes, BrainoHERA and screen-aware guidance instead of leaning on large decorative graphics.</p>
        </section>
        <section className="kb-article-block kb-dark-block">
          <p className="kb-article-eyebrow">The flagship</p>
          <h2>You talk to your co-founder.<br />Your co-founder manages the agents.</h2>
          <p>Future orchestration is explained honestly: connect the repository, brief Braino once, let him brief the coding agent, inspect the result, and tell you whether it is fixed or just vibes. It remains labelled as coming to Foundry first until that loop ships.</p>
        </section>
        <section className="kb-article-block">
          <aside className="kb-honesty">
            <strong>The honest part</strong>
            <p>Foundry is a product page and direction today, not a separately shipped Mac binary. Screen awareness still depends on permission and the feature being used. BrainoHERA uses live transcription. The page deliberately avoids claiming that screenshots never exist or that transcription is fully local.</p>
          </aside>
        </section>
        <footer className="kb-article-footer">
          <Link to="/foundry?view=foundry">Open Braino Foundry <ArrowRight aria-hidden="true" /></Link>
          <p>Internal source: Braino Knowledge Base/design/braino-foundry-positioning.md</p>
        </footer>
      </article>
    </main>
  );
}
