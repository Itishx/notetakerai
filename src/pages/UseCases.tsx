import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

// ─── shared styles ────────────────────────────────────────────────────────────
const wrap: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "0 32px" };
const eyebrow: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--sb-ink-3)",
  display: "inline-flex", alignItems: "center", gap: 8,
};
const pip: React.CSSProperties = {
  width: 6, height: 6, borderRadius: "50%",
  background: "var(--sb-accent)", boxShadow: "0 0 10px var(--sb-accent)", display: "inline-block",
};
const H2: React.CSSProperties = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400, fontSize: "clamp(34px,4vw,56px)", lineHeight: 1.05,
  margin: "12px 0 16px", letterSpacing: "-0.01em",
};

const USE_CASE_GROUPS = [
  {
    tag: "Record Tab Audio",
    sub: "Capture any browser audio and get structured notes, ready to sync.",
    count: 6,
    items: [
      { title: "Online Courses", body: "Turn any video lesson into structured notes with headings, key terms, and a glossary.", who: "Students · self-learners", big: true },
      { title: "Podcast Summaries", body: "Capture the signal without sitting through the noise. Structured takeaways from any audio in your browser.", who: "Professionals · researchers" },
      { title: "Language Learning", body: "Record foreign-language content and get a full transcript alongside structured vocabulary notes.", who: "Language learners · students" },
      { title: "Journalism & Research", body: "Transcribe press conferences or academic talks. Key quotes highlighted, reference-ready.", who: "Journalists · researchers" },
      { title: "Content Repurposing", body: "Record your video or podcast and generate show notes, blog drafts, or social summaries.", who: "Podcasters · YouTubers", big: true },
      { title: "Corporate Training", body: "Convert training videos into SOPs, knowledge base articles, or onboarding docs automatically.", who: "L&D teams · HR" },
    ],
  },
  {
    tag: "Read Any Page",
    sub: "Open SideBrain on any URL and chat about what's on screen.",
    count: 4,
    items: [
      { title: "LeetCode & Problem Solving", body: "Ask for hints, step-by-step explanations, or talk through your approach without leaving the problem page.", who: "Engineers · students", big: true },
      { title: "Reading Dense Docs", body: "Paste or open any PDF, article, or spec sheet. Ask SideBrain to summarise, explain, or quiz you on it.", who: "Anyone who reads" },
      { title: "Research Synthesis", body: "Open 10 tabs, ask SideBrain to compare them, pull key stats, or draft a summary across all pages.", who: "Researchers · analysts" },
      { title: "Code Review", body: "Paste a GitHub diff and ask SideBrain to explain the change, spot issues, or suggest improvements.", who: "Developers" },
    ],
  },
  {
    tag: "Delegate Browser Tasks",
    sub: "Describe what you want. SideBrain operates your browser to get it done.",
    count: 5,
    items: [
      { title: "Email Drafting", body: 'Say "Send an email to Priya saying I\'ll be ten minutes late." SideBrain opens Gmail, drafts the reply, and asks before sending.', who: "Everyone", big: true },
      { title: "Job Applications", body: "Search for PM roles in Bangalore, open each one, and paste your details into forms. You review and submit.", who: "Job seekers" },
      { title: "Research & Comparison", body: "Find the best noise-cancelling headphones under ₹10k. SideBrain reads product pages and writes you a comparison.", who: "Shoppers" },
      { title: "Calendar & Scheduling", body: "Create events, check availability, and book meetings — all from a single sentence.", who: "Professionals" },
      { title: "Form Filling", body: "Any repetitive form — address, application, order. Tell SideBrain once; it handles the clicking.", who: "Everyone", big: false },
    ],
  },
];

function UseCaseCard({ title, body, who, big }: { title: string; body: string; who: string; big?: boolean }) {
  return (
    <div
      style={{
        gridColumn: big ? "span 2" : "span 1",
        background: "var(--sb-panel-2)",
        border: "1px solid var(--sb-line-2)",
        borderRadius: 18,
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color .2s, transform .2s",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--sb-line)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--sb-line-2)"; e.currentTarget.style.transform = ""; }}
    >
      <h3 style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 22, lineHeight: 1.1, color: "var(--sb-ink)" }}>{title}</h3>
      <p style={{ fontSize: 14.5, color: "var(--sb-ink-2)", lineHeight: 1.55, flex: 1 }}>{body}</p>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "var(--sb-ink-3)", letterSpacing: ".04em" }}>{who}</span>
    </div>
  );
}

export default function UseCases() {
  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: "140px 0 80px", textAlign: "center" }}>
        <div style={wrap}>
          <span style={eyebrow}><span style={pip} /> Use Cases</span>
          <h1 style={{ ...H2, fontSize: "clamp(44px,6vw,80px)", maxWidth: 800, margin: "14px auto 20px" }}>
            One tool,{" "}
            <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>every workflow.</em>
          </h1>
          <p style={{ fontSize: 18, color: "var(--sb-ink-2)", maxWidth: 600, margin: "0 auto 48px", lineHeight: 1.55 }}>
            Three core features. Here's every workflow they unlock — from students to engineers to teams.
          </p>
          <Link
            to="/#install"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 24px", borderRadius: 999, fontSize: 14.5, fontWeight: 500,
              background: "var(--sb-ink)", color: "var(--sb-on-ink)", textDecoration: "none",
              transition: "transform .15s, background .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "#000"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.background = "var(--sb-ink)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
            Install SideBrain free
          </Link>
        </div>
      </section>

      {/* Groups */}
      {USE_CASE_GROUPS.map((group, gi) => (
        <section key={group.tag} style={{ padding: "80px 0", background: gi % 2 === 1 ? "var(--sb-bg-2)" : "var(--sb-bg)" }}>
          <div style={wrap}>
            {/* Group header */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ ...eyebrow }}><span style={pip} />{group.tag}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--sb-ink-3)", marginLeft: 4 }}>{group.count} use cases</span>
              </div>
              <p style={{ fontSize: 15, color: "var(--sb-ink-2)", marginLeft: 14 }}>{group.sub}</p>
            </div>

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
              {group.items.map(item => (
                <UseCaseCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section style={{ padding: "110px 0" }}>
        <div style={wrap}>
          <div style={{ background: "#14110E", color: "#FBF7F1", borderRadius: 24, padding: "64px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -80, top: -80, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(243,154,66,0.4), transparent 60%)", filter: "blur(20px)", pointerEvents: "none" }} />
            <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: "clamp(32px,4vw,52px)", margin: "0 auto 18px", maxWidth: 640, color: "#FBF7F1", position: "relative", zIndex: 1 }}>
              Ready to try it?
            </h2>
            <p style={{ color: "rgba(251,247,241,0.65)", maxWidth: 440, margin: "0 auto 32px", fontSize: 16, position: "relative", zIndex: 1 }}>
              Install SideBrain, sign in, and every workflow above is available in 30 seconds.
            </p>
            <Link
              to="/#install"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 24px", borderRadius: 999, fontSize: 14, fontWeight: 500,
                background: "#FBF7F1", color: "#1B1713", textDecoration: "none",
                transition: "transform .15s", position: "relative", zIndex: 1,
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/></svg>
              Add to Chrome — it's free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "48px 0", background: "var(--sb-bg)", borderTop: "1px solid var(--sb-line-2)" }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "baseline", gap: 0, textDecoration: "none" }}>
            <span style={{ fontFamily: "'TNR','Times New Roman',serif", fontStyle: "italic", fontWeight: 400, fontSize: 18, color: "var(--sb-ink)" }}>side</span>
            <span style={{ fontFamily: "'BeVietnam',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--sb-ink)", letterSpacing: "-0.03em" }}>brain</span>
          </Link>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)" }}>© 2026 SideBrain · Beta</div>
        </div>
      </footer>
    </div>
  );
}
