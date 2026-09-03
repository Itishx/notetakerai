import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BrainoDocOverlay, { type BrainoDoc } from "@/components/BrainoDocOverlay";
import "@/components/braino-doc.css";

/* /d/:slug — one document, on its own page.
 *
 * The same overlay component the notch opens, with the scrim off, so a link
 * someone opens on their phone and the panel that appears over your screen are
 * the same thing rather than two things that drift apart. */

/* /d/anything?demo renders a made-up document, so the page can be judged
   before there is a real one to look at. The same trick /x uses. */
const DEMO: BrainoDoc = {
  id: "demo",
  slug: "demo",
  user_id: "demo",
  is_public: true,
  created_at: new Date().toISOString(),
  title: "AI Note-Taking Apps in 2026: Leaders, Pricing and What Changed",
  question: "What is the state of AI note taking apps in 2026, who leads and what do they charge?",
  overview: "The market stopped having one winner and split by job: Granola for bot-free capture, Fathom for the only genuinely unlimited free tier, Fireflies for anything that has to land in a CRM. Prices moved with that split, and the free tiers tightened everywhere except Fathom.",
  word_count: 412,
  questions_asked: [
    "Which AI note-taking apps lead in 2026 and what do they do?",
    "What do the leaders charge, and what is in the free tiers?",
    "What changed in this market between 2025 and 2026?",
  ],
  sources: [
    { title: "AI notetaking app Granola raises $43M at $250M valuation", url: "https://techcrunch.com/example", snippet: "Granola raised a Series B and launched collaborative features for teams." },
    { title: "Otter.ai pricing and plans", url: "https://otter.ai/pricing", snippet: "Free plan capped by monthly minutes; Pro adds unlimited transcription." },
    { title: "AI note takers are flooding calls as workers skip meetings", url: "https://www.theverge.com/example", snippet: "Adoption climbed sharply through 2025 as bots joined calls on behalf of staff." },
    { title: "Granola pricing", url: "https://www.granola.ai/pricing", snippet: "Individual and team plans, billed per seat." },
    { title: "Fathom free plan details", url: "https://fathom.video/pricing", snippet: "Unlimited recordings and transcripts on the free tier." },
    { title: "Fireflies CRM integrations", url: "https://fireflies.ai/integrations", snippet: "Writes call notes into Salesforce and HubSpot automatically." },
  ],
  markdown: [
    "## Answer",
    "",
    "The market split into three shapes rather than one winner. **Granola** leads bot-free capture, **Fathom** has the strongest free plan, and **Fireflies** owns the workflow and CRM end.",
    "",
    "## What each one is for",
    "",
    "- **Granola** listens on the device rather than joining the call as a participant, which is why privacy-sensitive teams pick it.",
    "- **Fathom** gives unlimited recording on the free tier, which nobody else does.",
    "- **Fireflies** is the one that writes into the CRM afterwards.",
    "",
    "## What changed",
    "",
    "Note taking stopped being the product. Every leader now sells what happens *after* the meeting, and pricing moved with it.",
    "",
    "> Where the sources disagree: reported free-tier limits vary between vendor pages and reviews written before the 2026 changes.",
  ].join("\n"),
};

export default function BrainoDocPage() {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<BrainoDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (new URLSearchParams(window.location.search).has("demo")) {
        setDoc(DEMO); setState("ready"); document.title = `${DEMO.title} · Braino`;
        return;
      }
      if (!slug) { setState("missing"); return; }
      const { data } = await (supabase as any)
        .from("braino_docs")
        .select("id, slug, title, question, overview, markdown, sources, questions_asked, word_count, is_public, created_at, user_id")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setState("missing"); return; }
      setDoc(data as BrainoDoc);
      setState("ready");
      document.title = `${(data as BrainoDoc).title} · Braino`;
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (state === "loading") {
    return <div className="bd-page"><div className="bd-empty">Opening the document…</div></div>;
  }

  if (state === "missing" || !doc) {
    return (
      <div className="bd-page">
        <div className="bd-empty">
          <p>This document is not here, or it has not been shared.</p>
          <p><Link to="/">Back to Braino</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="bd-page">
      <BrainoDocOverlay doc={doc} embedded />
    </div>
  );
}
