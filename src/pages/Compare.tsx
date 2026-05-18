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

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12l4 4L19 6"/></svg>
);
const XIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
);

const COMPARE_ROWS = [
  { feature: "Step decision time", sb: "~1s", cl: "~6s" },
  { feature: "Page understanding", sb: "DOM + text", cl: "Screenshot pixels" },
  { feature: "Works on any site", sb: true, cl: true },
  { feature: "Available free", sb: true, cl: false },
  { feature: "Works from your phone", sb: true, cl: false },
  { feature: "Handles complex visual UIs", sb: false, cl: true },
  { feature: "Backed by Anthropic", sb: false, cl: true },
  { feature: "Built by a solo founder", sb: true, cl: false },
];

export default function Compare() {
  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: "140px 0 80px", textAlign: "center" }}>
        <div style={{ ...wrap, maxWidth: 860 }}>
          <span style={eyebrow}><span style={pip} /> SideBrain vs. Claude Computer Use</span>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400, fontSize: "clamp(44px,6vw,80px)", lineHeight: 1.0,
            letterSpacing: "-0.025em", margin: "14px auto 24px",
          }}>
            Same idea.{" "}
            <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Different speed.</em>
          </h1>
          <p style={{ fontSize: 18, color: "var(--sb-ink-2)", maxWidth: 680, margin: "0 auto", lineHeight: 1.55 }}>
            Claude Computer Use sees your browser like a camera — screenshot by screenshot. SideBrain reads it like a developer — DOM-first, no waiting for pixels to load. That difference compounds with every single step.
          </p>
        </div>
      </section>

      {/* Speed cards */}
      <section style={{ padding: "60px 0 110px", background: "var(--sb-bg-2)" }}>
        <div style={wrap}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 60 }}>
            {/* SideBrain */}
            <div style={{ borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", border: "1px solid var(--sb-line)", background: "var(--sb-panel-2)" }}>
              <h3 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 28, display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--sb-accent)", boxShadow: "0 0 12px var(--sb-accent)", display: "inline-block", flexShrink: 0 }} /> SideBrain
              </h3>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--sb-ink-3)", marginBottom: 24 }}>
                <strong style={{ color: "var(--sb-accent-deep)" }}>~1s</strong> per step
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {[
                  { n: "1", label: "Read DOM elements + page text", ms: "~20ms" },
                  { n: "2", label: "Action decision", ms: "~800ms" },
                  { n: "3", label: "Execute click / type / navigate", ms: "~150ms" },
                ].map(({ n, label, ms }) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: "var(--sb-panel)", border: "1px solid var(--sb-line-2)" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--sb-accent-soft)", color: "var(--sb-accent-deep)", flexShrink: 0 }}>{n}</div>
                    <div style={{ flex: 1, fontSize: 13.5, color: "var(--sb-ink)" }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)" }}>{ms}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--sb-line)", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--sb-ink-3)" }}>
                <span>5-step task</span>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32, color: "var(--sb-ink)", letterSpacing: "-0.01em" }}>
                  <em style={{ fontStyle: "italic", color: "var(--sb-accent-deep)" }}>~8–12s</em>
                </div>
              </div>
            </div>

            {/* Claude */}
            <div style={{ borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", border: "1px solid #2A2520", background: "#14110E", color: "#FBF7F1" }}>
              <h3 style={{ fontFamily: "'Instrument Serif',serif", fontWeight: 400, fontSize: 28, display: "flex", alignItems: "center", gap: 10, marginBottom: 4, color: "#FBF7F1" }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#6F6864", display: "inline-block", flexShrink: 0 }} /> Claude Computer Use
              </h3>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "rgba(251,247,241,0.5)", marginBottom: 24 }}>
                <strong style={{ color: "var(--sb-accent-2)" }}>~6s</strong> per step
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {[
                  { n: "1", label: "Take full-page screenshot", ms: "~400ms" },
                  { n: "2", label: "Send screenshot to vision model", ms: "~2000ms" },
                  { n: "3", label: "Decide action from pixels", ms: "~600ms" },
                  { n: "4", label: "Execute action", ms: "~150ms" },
                  { n: "5", label: "Wait for render, repeat", ms: "~3000ms" },
                ].map(({ n, label, ms }) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12, background: "#1B1814", border: "1px solid #2A2520" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: "#2A2520", color: "rgba(251,247,241,0.6)", flexShrink: 0 }}>{n}</div>
                    <div style={{ flex: 1, fontSize: 13.5, color: "rgba(251,247,241,0.85)" }}>{label}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "rgba(251,247,241,0.5)" }}>{ms}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed #2A2520", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "rgba(251,247,241,0.5)" }}>
                <span>5-step task</span>
                <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 32, color: "#FBF7F1", letterSpacing: "-0.01em" }}>
                  <em style={{ fontStyle: "italic", color: "var(--sb-accent-2)" }}>~30–40s</em>
                </div>
              </div>
            </div>
          </div>

          {/* Why cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 60 }}>
            {[
              { title: "Why screenshots are slow.", body: "Computer Use treats the browser like a human — it can only see what's on screen. Every step costs a full screenshot round-trip to a vision model: 2–3 seconds, every time. No exceptions. Even clicking an obvious button." },
              { title: "Why reading the DOM is faster.", body: "SideBrain's content script reads the live DOM directly. Every button, input, and link comes back as structured text with selectors. The model gets a clean element list and acts immediately. No screenshot. No vision model. No waiting for frames." },
            ].map(({ title, body }) => (
              <div key={title} style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 18, padding: 28 }}>
                <h4 style={{ fontFamily: "'Instrument Serif',serif", fontSize: 24, fontWeight: 400, marginBottom: 12 }}>{title}</h4>
                <p style={{ fontSize: 14.5, color: "var(--sb-ink-2)", lineHeight: 1.55 }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line)", borderRadius: 18, overflow: "hidden" }}>
            {[{ feature: "Feature", sb: "SideBrain", cl: "Claude Computer Use", isHeader: true }, ...COMPARE_ROWS].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", borderBottom: i < COMPARE_ROWS.length ? "1px solid var(--sb-line-2)" : "none" }}>
                {(["feature", "sb", "cl"] as const).map((key, j) => {
                  const val = (row as Record<string, unknown>)[key];
                  const isH = (row as { isHeader?: boolean }).isHeader;
                  return (
                    <div key={j} style={{
                      padding: "16px 22px", fontSize: isH ? 11 : 14,
                      color: isH ? "var(--sb-ink-3)" : j === 0 ? "var(--sb-ink-2)" : "var(--sb-ink)",
                      fontFamily: isH ? "'JetBrains Mono',monospace" : "inherit",
                      letterSpacing: isH ? ".14em" : 0,
                      textTransform: isH ? "uppercase" : "none",
                      background: isH ? "var(--sb-panel)" : "transparent",
                      borderLeft: j > 0 ? "1px solid var(--sb-line-2)" : "none",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      {val === true ? <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--sb-accent-soft)", color: "var(--sb-accent-deep)", display: "grid", placeItems: "center", flexShrink: 0 }}><CheckIcon /></span>
                        : val === false ? <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#F4ECE2", color: "var(--sb-ink-4)", display: "grid", placeItems: "center", flexShrink: 0 }}><XIcon /></span>
                        : <span style={j > 0 && !isH ? { fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5 } : {}}>{String(val)}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coincidence note */}
      <section style={{ padding: "110px 0" }}>
        <div style={wrap}>
          <div style={{ background: "var(--sb-panel-2)", borderRadius: 24, padding: "72px 64px", textAlign: "center", border: "1px solid var(--sb-line-2)" }}>
            <span style={eyebrow}><span style={pip} /> A note on parallel discovery</span>
            <h3 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: 44, lineHeight: 1.05, margin: "14px auto 24px", maxWidth: 700 }}>
              A coincidence of ideas.
            </h3>
            <p style={{ maxWidth: 640, margin: "0 auto 14px", fontSize: 16, color: "var(--sb-ink-2)", lineHeight: 1.6 }}>
              Yes — SideBrain and Claude Computer Use are solving the same problem. We know how that looks.
            </p>
            <p style={{ maxWidth: 640, margin: "0 auto 14px", fontSize: 16, color: "var(--sb-ink-2)", lineHeight: 1.6 }}>
              SideBrain was built independently, from scratch, before Claude's browser agent was publicly known. Parallel discovery is as old as science itself.
            </p>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", color: "var(--sb-ink-3)", margin: "24px 0" }}>
              The telephone. Calculus. Natural selection.
            </div>
            <p style={{ maxWidth: 640, margin: "0 auto", fontSize: 16 }}>
              <em style={{ fontFamily: "'Instrument Serif',serif", fontStyle: "italic", color: "var(--sb-accent-deep)" }}>
                We're not trying to beat Anthropic. We're trying to be useful to you, today, right now, in your browser.
              </em>
            </p>
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
