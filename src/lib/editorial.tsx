import React from "react";

/* ============================================================================
   Editorial design system, the "Medium theme" for Braino's marketing pages.
   One source of truth shared by Home, Premium, Use Cases, Automations,
   Integrations, Skills, Build Yours, etc. Everything references the --sb-*
   tokens so light/dark flips for free. Pair these with the global .ed-* classes
   in index.css for long-form prose.

   Fonts:  Instrument Serif = display titles (italic coral accent)
           Newsreader       = reading serif (deks, prose)
           JetBrains Mono    = kickers / labels
   ============================================================================ */

export const serif = "'Instrument Serif', Georgia, serif";
export const readFont = "'Newsreader', Georgia, 'Times New Roman', serif";
export const monoFont = "'JetBrains Mono', monospace";
export const mono: React.CSSProperties = { fontFamily: monoFont };

// ─── Layout ──────────────────────────────────────────────────────────────────
export const wrap: React.CSSProperties = { maxWidth: 1100, margin: "0 auto", padding: "0 32px" };

export const pip: React.CSSProperties = {
  width: 6, height: 6, borderRadius: "50%",
  background: "var(--sb-accent)", boxShadow: "0 0 10px var(--sb-accent)", display: "inline-block", flexShrink: 0,
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: monoFont, fontSize: 11,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--sb-ink-3)",
  display: "inline-flex", alignItems: "center", gap: 8,
};
// Back-compat plain style object for inline use
export const eyebrow = eyebrowStyle;

// ─── Icons ───────────────────────────────────────────────────────────────────
export const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12l4 4L19 6" /></svg>
);
export const ChromeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.4" /><path d="M12 8.6h8M8.9 13.7 4.9 6.8M15.1 13.7l-4 6.9" /></svg>
);
export const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></svg>
);
export const ArrowIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

// ─── Buttons ─────────────────────────────────────────────────────────────────
export const heroCta: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 9, padding: "15px 28px", borderRadius: 999,
  fontSize: 15, fontWeight: 600, background: "var(--sb-accent)", color: "#FBF7F1",
  border: "none", textDecoration: "none", boxShadow: "0 8px 30px rgba(226,125,57,0.35)", transition: "transform .15s",
};
export const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px",
  borderRadius: 999, fontSize: 14.5, fontWeight: 600, background: "var(--sb-ink)", color: "var(--sb-on-ink)",
  border: "1px solid transparent", textDecoration: "none", transition: "transform .15s, opacity .15s",
};
export const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px",
  borderRadius: 999, fontSize: 14.5, fontWeight: 500, background: "transparent", color: "var(--sb-ink)",
  border: "1px solid var(--sb-line)", textDecoration: "none", transition: "transform .15s, background .15s",
};
export const ghostBtnLink: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 999,
  fontSize: 14, fontWeight: 500, color: "var(--sb-ink)", textDecoration: "none",
  background: "var(--sb-panel)", border: "1px solid var(--sb-line)", transition: "transform .15s, background .15s",
};

// ─── Cards ───────────────────────────────────────────────────────────────────
export const neutralCard: React.CSSProperties = {
  background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 24,
  padding: 32, display: "flex", flexDirection: "column", gap: 14, position: "relative",
};
export const cardTagline: React.CSSProperties = { color: "var(--sb-ink-2)", fontSize: 14.5, lineHeight: 1.5, margin: 0 };
export const featureList: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 11, margin: "6px 0", padding: 0, listStyle: "none" };
export const featureLi: React.CSSProperties = { display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--sb-ink)", lineHeight: 1.45 };
export const microcopy: React.CSSProperties = { fontSize: 12, color: "var(--sb-ink-3)", textAlign: "center", marginTop: 2 };

// ─── Reusable pieces ─────────────────────────────────────────────────────────

/** Mono kicker with a glowing coral pip. */
export function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ ...eyebrowStyle, ...style }}>
      <span style={pip} />
      {children}
    </span>
  );
}

/** A full-bleed vertical section with the alternating editorial backgrounds.
 *  tone "1" = --sb-bg, "2" = --sb-bg-2, "ink" = dark inverted band. */
export function Section({
  children, tone = "1", pad = "90px 0", style,
}: {
  children: React.ReactNode;
  tone?: "1" | "2" | "ink";
  pad?: string;
  style?: React.CSSProperties;
}) {
  const bg = tone === "2" ? "var(--sb-bg-2)" : tone === "ink" ? "#14110E" : "var(--sb-bg)";
  const color = tone === "ink" ? "#FBF7F1" : undefined;
  return (
    <section style={{ padding: pad, background: bg, color, ...style }}>
      {children}
    </section>
  );
}

/** Display serif title. Wrap emphasis words in <em> for the italic coral accent. */
export function EdTitle({
  children, size = "clamp(40px,5.4vw,64px)", style,
}: {
  children: React.ReactNode;
  size?: string;
  style?: React.CSSProperties;
}) {
  return (
    <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.028em", color: "var(--sb-ink)", margin: 0, ...style }}>
      {children}
    </h2>
  );
}

/** Newsreader dek / lead paragraph under a title. */
export function EdDek({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{ fontFamily: readFont, fontSize: "clamp(19px,2.1vw,23px)", lineHeight: 1.55, color: "var(--sb-ink-2)", margin: 0, ...style }}>
      {children}
    </p>
  );
}

/** Standard editorial hero: eyebrow → big serif title → dek → optional CTA row. */
export function EditorialHero({
  eyebrow: eb, title, dek, children, align = "center", pad = "140px 0 70px", maxWidth = 820,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  dek?: React.ReactNode;
  children?: React.ReactNode;
  align?: "center" | "left";
  pad?: string;
  maxWidth?: number;
}) {
  const centered = align === "center";
  return (
    <section style={{ padding: pad, textAlign: centered ? "center" : "left" }}>
      <div style={{ ...wrap, maxWidth }}>
        <Eyebrow>{eb}</Eyebrow>
        <h1 style={{
          fontFamily: serif, fontWeight: 400, fontSize: "clamp(46px,7vw,88px)", lineHeight: 0.99,
          letterSpacing: "-0.03em", color: "var(--sb-ink)", margin: centered ? "16px auto 22px" : "16px 0 22px",
        }}>
          {title}
        </h1>
        {dek && (
          <p style={{
            fontFamily: readFont, fontSize: 22, color: "var(--sb-ink-2)", lineHeight: 1.55,
            maxWidth: 620, margin: centered ? "0 auto 34px" : "0 0 34px",
          }}>
            {dek}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

/** Thin editorial hairline rule. */
export const EdRule = ({ style }: { style?: React.CSSProperties }) => (
  <hr style={{ height: 1, background: "var(--sb-line)", border: 0, margin: "34px 0", ...style }} />
);
