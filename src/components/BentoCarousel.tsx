import { ReactNode, useRef } from "react";
import MiniBraino from "./MiniBraino";

/* ============================================================================
   BentoCarousel — the Hugo-style block from the class pages, extracted to reuse:
   a CENTERED header (eyebrow + heading + a few lines of description), then a
   horizontal "accordion" of bento cards (a wide lead card + feature cards) that
   slide in via the ← → arrows below. Layout only; type stays ours.
   ============================================================================ */

export type BentoFeature = { tag?: string; num?: string; title: string; body: string };
export interface BentoCarouselProps {
  accent: string;              // "ac-coral" | "ac-violet" | …
  eyebrow: string;
  heading: ReactNode;          // wrap a phrase in <span className="tone">
  desc: ReactNode;             // a few lines under the heading
  id?: string;
  walker?: boolean;            // a small Braino paces the header area
  lead: { tag: string; title: string; body: string; stat?: { n: string; label: string } };
  features: BentoFeature[];
}

const Arrow = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 24 24" fill="none"><path d={dir === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export default function BentoCarousel({ accent, eyebrow, heading, desc, id, walker, lead, features }: BentoCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollBy = (d: number) => {
    const t = trackRef.current;
    if (t) t.scrollBy({ left: d * Math.min(420, t.clientWidth * 0.8), behavior: "smooth" });
  };
  return (
    <section className={"apple-bentoblock " + accent} id={id}>
      <div className="bento-head">
        <p className="bento-eyebrow">{eyebrow}</p>
        <h2 className="bento-h">{heading}</h2>
        <p className="bento-desc">{desc}</p>
        {walker && (
          <div className="bento-walker"><MiniBraino size={56} /></div>
        )}
      </div>
      <div className="apple-bento">
        <div className="apple-bento-track" ref={trackRef}>
          <div className="bn-card lead">
            <span className="bn-tag">{lead.tag}</span>
            {lead.stat && <div className="bn-stat"><b>{lead.stat.n}</b><span>{lead.stat.label}</span></div>}
            <div className="bn-body"><h3>{lead.title}</h3><p>{lead.body}</p></div>
          </div>
          {features.map((f, i) => (
            <div className="bn-card" key={i}>
              {f.num ? <span className="bn-num">{f.num}</span> : f.tag ? <span className="bn-tag">{f.tag}</span> : null}
              <div className="bn-body"><h3>{f.title}</h3><p>{f.body}</p></div>
            </div>
          ))}
        </div>
      </div>
      <div className="bento-arrows">
        <button onClick={() => scrollBy(-1)} aria-label="Previous"><Arrow dir="l" /></button>
        <button onClick={() => scrollBy(1)} aria-label="Next"><Arrow dir="r" /></button>
      </div>
    </section>
  );
}
