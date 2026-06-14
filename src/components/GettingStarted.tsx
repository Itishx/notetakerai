/* ============================================================
   "Three steps. Then it's yours." — the Getting Started section
   (ported from the Index landing page so it can be reused inside
   the Profile Grid "How it works" popup).
   Uses global --sb-* vars and the sbPop / sbShimmer keyframes
   defined in src/index.css.
   ============================================================ */
import React from "react";

function StepCard({ num, title, body, children }: { num: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 18, padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 56, lineHeight: 1, color: "var(--sb-accent-deep)", letterSpacing: "-0.03em" }}>{num}</div>
      <h3 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 24, lineHeight: 1.1, margin: 0, color: "var(--sb-ink)" }}>{title}</h3>
      <p style={{ fontSize: 14.5, color: "var(--sb-ink-2)", margin: 0 }}>{body}</p>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

export function GettingStartedSteps({ withHeading = true }: { withHeading?: boolean }) {
  return (
    <div style={{ color: "var(--sb-ink)" }}>
      {withHeading && (
        <div style={{ textAlign: "center", marginBottom: 38 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--sb-accent)", display: "inline-block" }} />
            Getting started
          </span>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: "clamp(34px, 4vw, 52px)", lineHeight: 1.02, letterSpacing: "-0.02em", margin: "16px 0 14px", color: "var(--sb-ink)" }}>
            Three steps. <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Then it's yours.</em>
          </h2>
          <p style={{ fontSize: 16, color: "var(--sb-ink-2)", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            Install once, sign in, and your agent is live on every tab. Everything it learns is saved to your account across devices.
          </p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        <StepCard num="01" title="Install the extension." body="Add it to Chrome, Arc, Brave, or Edge in about six seconds. Sign in or create a free account — takes 30 seconds, no card required.">
          <div style={{ height: 130, borderRadius: 12, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "92%", height: 36, borderRadius: 8, background: "linear-gradient(180deg, #F8F4ED, #EFE7DB)", border: "1px solid var(--sb-line)", display: "flex", alignItems: "center", gap: 8, padding: "0 10px" }}>
              <div style={{ display: "flex", gap: 4 }}>{["#DDD3C5", "#DDD3C5", "#DDD3C5"].map((c, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }} />)}</div>
              <div style={{ flex: 1, height: 16, background: "#fff", border: "1px solid var(--sb-line-2)", borderRadius: 6 }} />
              <img src="/favicon.svg" width={18} height={18} alt="Braino" style={{ animation: "sbPop 1.8s ease-in-out infinite", flexShrink: 0 }} />
            </div>
          </div>
        </StepCard>

        <StepCard num="02" title="Open any page." body="Article, inbox, doc, dashboard, research paper, recipe — anything you'd read or work with in a tab. No special integrations.">
          <div style={{ height: 130, borderRadius: 12, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "92%", height: "92%", background: "#fff", borderRadius: 8, border: "1px solid var(--sb-line-2)", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {["80%", "100%", "60%", "glow", "100%", "80%", "60%"].map((w, i) => (
                <div key={i} style={{ height: 5, background: w === "glow" ? "linear-gradient(90deg,transparent,var(--sb-accent-soft),transparent)" : "var(--sb-bg-2)", borderRadius: 2, width: w === "glow" ? "100%" : w, animation: w === "glow" ? "sbShimmer 2.5s linear infinite" : undefined, backgroundSize: w === "glow" ? "200% 100%" : undefined }} />
              ))}
            </div>
          </div>
        </StepCard>

        <StepCard num="03" title="Click the brain." body="Your agent wakes up inline. Chat about the page, delegate a task, search the web, or record audio — it knows exactly where you are and acts accordingly.">
          <div style={{ height: 130, borderRadius: 12, background: "var(--sb-bg-2)", border: "1px solid var(--sb-line-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src="/favicon.svg" width={36} height={36} alt="Braino" style={{ filter: "drop-shadow(0 0 8px rgba(201,84,74,0.4))" }} />
              <span style={{ color: "var(--sb-ink-3)", fontFamily: "'JetBrains Mono',monospace" }}>→</span>
              <div style={{ width: 60, height: 90, borderRadius: 8, background: "var(--sb-panel-2)", border: "1px solid var(--sb-line)", padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--sb-accent)", boxShadow: "0 0 8px var(--sb-accent)", margin: "6px auto" }} />
                {["100%", "70%", "100%"].map((w, i) => <div key={i} style={{ height: 4, background: "var(--sb-bg-2)", borderRadius: 2, width: w, margin: i === 1 ? "0 auto" : undefined }} />)}
              </div>
            </div>
          </div>
        </StepCard>
      </div>
    </div>
  );
}
