import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

// ─── Config ───────────────────────────────────────────────────────────────────
const SHANKAR_EMAIL   = "shankar.braino@gmail.com"; // update with actual email
const SHANKAR_NAME    = "Shankar";
const SHANKAR_ROLE    = "Developer";
const AGREEMENT_DATE  = "15th June 2026";
const STORAGE_KEY     = "braino_signed_shankar";
const ADMIN_EMAIL     = "itishpande21@gmail.com";
// ─────────────────────────────────────────────────────────────────────────────

type SignedRecord = { signedAt: string; signedName: string };

function getStoredSig(): SignedRecord | null {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
}

// ── Static Braino mascot SVG (happy, awake state) ─────────────────────────────
function BrainoMascot({ size = 120, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {glow && (
        <div style={{
          position: "absolute", inset: -size * 0.35,
          background: "radial-gradient(circle, rgba(200,84,74,0.28) 0%, transparent 70%)",
          animation: "shkGlow 2.8s ease-in-out infinite",
          borderRadius: "50%",
          pointerEvents: "none",
        }} />
      )}
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: "visible", display: "block", animation: "shkFloat 3.6s ease-in-out infinite" }}>
        <defs>
          <linearGradient id="shk-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6A8A2" />
            <stop offset="0.55" stopColor="#E8786E" />
            <stop offset="1" stopColor="#C9544A" />
          </linearGradient>
          <linearGradient id="shk-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D9645A" />
            <stop offset="1" stopColor="#9C3E36" />
          </linearGradient>
          <radialGradient id="shk-glow" cx="35%" cy="30%" r="50%">
            <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" />
            <stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── White underlay ears ── */}
        <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
        <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />

        {/* ── White body outline ── */}
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="white" transform="scale(1.08) translate(-3.7, -3.7)"
        />

        {/* ── Chin / ear detail (dark) ── */}
        <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#shk-dark)" />
        <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#shk-dark)" />
        <path d="M 63 70 Q 70 71 77 70" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
        <path d="M 62 74 Q 70 75 78 74" fill="none" stroke="#8A2F28" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />

        {/* ── Main body fill ── */}
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="url(#shk-fill)"
        />
        {/* glow overlay */}
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="url(#shk-glow)"
        />

        {/* ── Brain wrinkles ── */}
        <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />

        {/* ── Arms ── */}
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#shk-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="6" cy="63" r="5.5" fill="url(#shk-fill)" />
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#shk-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="94" cy="63" r="5.5" fill="url(#shk-fill)" />

        {/* ── Happy eyes ── */}
        <circle cx="38" cy="48" r="7" fill="white" />
        <circle cx="38" cy="48" r="3.4" fill="#1B1713" />
        <circle cx="39.2" cy="46.4" r="1.3" fill="white" />
        <circle cx="62" cy="48" r="7" fill="white" />
        <circle cx="62" cy="48" r="3.4" fill="#1B1713" />
        <circle cx="63.2" cy="46.4" r="1.3" fill="white" />

        {/* ── Rosy cheeks ── */}
        <ellipse cx="28" cy="58" rx="3.6" ry="2.1" fill="#E14A48" opacity="0.4" />
        <ellipse cx="72" cy="58" rx="3.6" ry="2.1" fill="#E14A48" opacity="0.4" />
      </svg>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const wrap: React.CSSProperties = { background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" };
const main: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "60px 28px 120px" };
const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
  letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "var(--sb-ink-3)",
};
const serif = (size: number | string): React.CSSProperties => ({
  fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400,
  fontSize: size, letterSpacing: "-0.02em", lineHeight: 1.1, margin: 0,
});
const body: React.CSSProperties = { fontSize: 15.5, color: "var(--sb-ink-2)", lineHeight: 1.75, marginBottom: 12 };
const divider: React.CSSProperties = { border: "none", borderTop: "1px solid var(--sb-line-2)", margin: "40px 0" };
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--sb-ink-3)", marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", background: "var(--sb-surface)",
  border: "1px solid var(--sb-line-2)", borderRadius: 8, color: "var(--sb-ink)",
  fontSize: 15, outline: "none", boxSizing: "border-box" as const,
};
const btn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-block", padding: "12px 28px", borderRadius: 8, border: "none",
  cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 15,
  background: disabled ? "var(--sb-line-2)" : "var(--sb-ink)",
  color: disabled ? "var(--sb-ink-3)" : "var(--sb-bg)",
  transition: "opacity 0.15s", opacity: disabled ? 0.6 : 1,
});
const metaRow: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 32px",
  background: "var(--sb-surface)", border: "1px solid var(--sb-line-2)",
  borderRadius: 10, padding: "20px 24px", marginBottom: 36,
};
const metaLabel: React.CSSProperties = {
  fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--sb-ink-3)", marginBottom: 2,
};
const metaValue: React.CSSProperties = { fontSize: 14.5, color: "var(--sb-ink)", fontWeight: 500 };

function Clause({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 20, marginBottom: 10, color: "var(--sb-ink)" }}>
        {n}. {title}
      </h2>
      {children}
    </section>
  );
}
function P({ children }: { children: React.ReactNode }) { return <p style={body}>{children}</p>; }
function Li({ children }: { children: React.ReactNode }) { return <li style={{ ...body, marginBottom: 6 }}>{children}</li>; }

// ── Special message ───────────────────────────────────────────────────────────
function SpecialMessage() {
  return (
    <div style={{
      marginTop: 56,
      padding: "40px 36px",
      background: "linear-gradient(135deg, rgba(200,84,74,0.07) 0%, rgba(200,84,74,0.03) 100%)",
      border: "1px solid rgba(200,84,74,0.22)",
      borderRadius: 16,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle glow accent */}
      <div style={{
        position: "absolute", top: -60, right: -60, width: 200, height: 200,
        background: "radial-gradient(circle, rgba(200,84,74,0.14) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
        <BrainoMascot size={100} glow />
      </div>

      <p style={{ ...mono, marginBottom: 16, color: "rgba(200,84,74,0.8)" }}>A note from Itish</p>
      <h2 style={{ ...serif(32), color: "var(--sb-ink)", marginBottom: 24 }}>
        Hey Shankar.
      </h2>

      <p style={{ ...body, fontSize: 16.5, color: "var(--sb-ink)", lineHeight: 1.85, marginBottom: 16 }}>
        You are <strong>fucking brilliant</strong>. I mean that. The way you think, the way you build —
        it's exactly the kind of energy Braino needs.
      </p>

      <p style={{ ...body, fontSize: 16.5, color: "var(--sb-ink)", lineHeight: 1.85, marginBottom: 16 }}>
        I'm genuinely excited to work with you. Not just excited — <em>pumped</em>. We're going to
        build something that makes people go "wait, this actually exists?"
      </p>

      <p style={{ ...body, fontSize: 16.5, color: "var(--sb-ink)", lineHeight: 1.85, marginBottom: 0 }}>
        We're going to make the best of <strong>Braino</strong> and bring the vision of <strong>Jarvis</strong> to
        life — the AI that actually lives with you, knows what you're doing, and gets things done before
        you even ask. That's what we're building. And I couldn't be more glad you're here for it.
      </p>

      <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid rgba(200,84,74,0.15)" }}>
        <p style={{ ...mono, fontSize: 12, color: "rgba(200,84,74,0.7)", margin: 0 }}>
          — Itish Pande, Founder · Braino
        </p>
      </div>
    </div>
  );
}

// ── Sign-in gate ──────────────────────────────────────────────────────────────
function SignInGate() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{ ...main, maxWidth: 420, paddingTop: 80 }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
        <BrainoMascot size={80} glow />
      </div>
      <p style={mono}>Braino · Team Agreement</p>
      <h1 style={{ ...serif(36), margin: "14px 0 10px" }}>Hey Shankar.</h1>
      <p style={{ ...body, marginBottom: 32 }}>
        Sign in with your email to read and sign your agreement.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="your@email.com" />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
        </div>
        {error && <p style={{ fontSize: 13.5, color: "#e05c5c", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btn(loading)}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// ── Access denied ─────────────────────────────────────────────────────────────
function AccessDenied({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div style={{ ...main, maxWidth: 420, paddingTop: 80 }}>
      <p style={mono}>Braino · Team Agreement</p>
      <h1 style={{ ...serif(36), margin: "14px 0 10px" }}>Access denied</h1>
      <p style={{ ...body, marginBottom: 24 }}>
        This page is for Shankar only. If you think this is a mistake, contact{" "}
        <a href="mailto:talk2braino@gmail.com" style={{ color: "var(--sb-accent-deep)" }}>talk2braino@gmail.com</a>.
      </p>
      <button onClick={onSignOut} style={btn(false)}>Sign out</button>
    </div>
  );
}

// ── Signed confirmation ───────────────────────────────────────────────────────
function SignedConfirmation({ record }: { record: SignedRecord }) {
  const formatted = new Date(record.signedAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
  return (
    <div style={main}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
        <BrainoMascot size={90} glow />
      </div>
      <p style={mono}>Braino · Team Agreement</p>
      <h1 style={{ ...serif(48), margin: "14px 0 10px" }}>Agreement signed.</h1>
      <p style={{ ...body, fontSize: 17, marginBottom: 40 }}>
        You're locked in. No further action needed.
      </p>
      <div style={{ ...metaRow, gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div><div style={metaLabel}>Signed by</div><div style={metaValue}>{record.signedName}</div></div>
        <div><div style={metaLabel}>Role</div><div style={metaValue}>{SHANKAR_ROLE}</div></div>
        <div><div style={metaLabel}>Signed on</div><div style={metaValue}>{formatted}</div></div>
      </div>
      <SpecialMessage />
    </div>
  );
}

// ── Agreement ─────────────────────────────────────────────────────────────────
function AgreementView({ onSign }: { onSign: (name: string) => void }) {
  const [typedName, setTypedName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const canSign = typedName.trim().length > 2 && confirmed && !submitting;

  const handleSign = async () => {
    if (!canSign) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    onSign(typedName.trim());
  };

  return (
    <div style={main}>
      {/* Hero */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 56, gap: 20 }}>
        <BrainoMascot size={100} glow />
        <div>
          <p style={mono}>Braino (trybraino.com) · Creatish Inc</p>
          <h1 style={{ ...serif("clamp(36px, 5vw, 54px)" as any), margin: "14px 0 8px" }}>
            Hey {SHANKAR_NAME}.<br />Welcome to the team.
          </h1>
          <p style={{ ...body, fontSize: 16, maxWidth: 460, margin: "0 auto" }}>
            Read this fully before you sign. It's straightforward.
          </p>
        </div>
      </div>

      {/* Meta */}
      <div style={metaRow}>
        <div><div style={metaLabel}>Date</div><div style={metaValue}>{AGREEMENT_DATE}</div></div>
        <div><div style={metaLabel}>Name</div><div style={metaValue}>{SHANKAR_NAME}</div></div>
        <div><div style={metaLabel}>Role</div><div style={metaValue}>{SHANKAR_ROLE}</div></div>
        <div><div style={metaLabel}>Organisation</div><div style={metaValue}>Braino / Creatish Inc</div></div>
      </div>

      {/* Clauses */}
      <Clause n={1} title="Scope of this agreement">
        <P>
          This agreement is between you ({SHANKAR_NAME}) and Itish Pande, founder of Braino
          ("Creatish Inc"). It applies for the full duration of your time here and for{" "}
          <strong>2 years</strong> after it ends, regardless of how or why your engagement concludes.
        </P>
      </Clause>

      <Clause n={2} title="What you agree to keep confidential">
        <P>Everything you encounter while working here is confidential. This includes:</P>
        <ul style={{ paddingLeft: 22, margin: "0 0 12px" }}>
          <Li>The product concept, features, roadmap, and any unannounced plans</Li>
          <Li>Source code, system architecture, and technical decisions</Li>
          <Li>User data, analytics, and any personally identifiable information</Li>
          <Li>Business strategy, partnership discussions, and financial details</Li>
          <Li>Internal tools, workflows, AI prompts, and operational processes</Li>
        </ul>
        <P>
          This applies whether you encounter it directly through your work or incidentally as part
          of being on the team.
        </P>
      </Clause>

      <Clause n={3} title="How you may use this information">
        <P>
          Only for the work you were brought in to do. You may not share, copy, publish, reproduce,
          reverse-engineer, or use any confidential information — in whole or in part — outside of
          your duties, during or after your time here.
        </P>
        <P>
          This includes using such information to start, build, or contribute to any product or
          service that competes with Braino.
        </P>
      </Clause>

      <Clause n={4} title="What this agreement does not cover">
        <P>This agreement does not apply to information that:</P>
        <ul style={{ paddingLeft: 22, margin: "0 0 12px" }}>
          <Li>Was already publicly known at the time you received it</Li>
          <Li>You can demonstrate you independently possessed before joining, with written proof</Li>
          <Li>You receive from a third party with a legitimate right to disclose it</Li>
        </ul>
      </Clause>

      <Clause n={5} title="Ownership of your work">
        <P>
          Everything you create, write, or build during your time here — including code, features,
          architecture, documentation, tooling, and any other technical or engineering contributions
          — belongs to Braino.
        </P>
        <P>
          This is a condition of joining, not a negotiation point. If you have questions about
          specific projects, ask before starting them.
        </P>
      </Clause>

      <Clause n={6} title="Non-compete (6 months post-engagement)">
        <P>
          For <strong>6 months</strong> after your time here ends, you agree not to build, join,
          advise, or materially contribute to any product that directly competes with Braino's core
          product — an AI-powered browser assistant or any substantially similar product.
        </P>
        <P>
          This does not prevent you from taking other employment, freelancing, or working in
          unrelated areas.
        </P>
      </Clause>

      <Clause n={7} title="Non-solicitation (1 year post-engagement)">
        <P>
          For <strong>1 year</strong> after your time here ends, you agree not to recruit, solicit,
          or encourage any current Braino team member, contractor, or intern to leave Braino or
          join a competing venture.
        </P>
      </Clause>

      <Clause n={8} title="Remedies for breach">
        <P>
          You acknowledge that a breach of this agreement may cause harm to Braino that is
          difficult to quantify in monetary terms alone. Accordingly, Braino may seek injunctive
          relief or other equitable remedies in addition to any other legal recourse available,
          without the need to post a bond.
        </P>
      </Clause>

      <Clause n={9} title="What this isn't">
        <P>
          This agreement is not meant to intimidate or trap you. It exists to protect the work
          we're building together. You remain completely free to learn, grow your skills, build your
          career, and take credit for your contributions in ways that don't disclose confidential
          details.
        </P>
        <P>
          If anything here feels unclear or unfair, ask before you sign.
        </P>
      </Clause>

      <Clause n={10} title="Governing law">
        <P>
          This agreement is governed by and construed in accordance with the laws of India. Any
          disputes arising shall be subject to the exclusive jurisdiction of courts in India.
        </P>
      </Clause>

      <hr style={divider} />

      {/* Signature */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ ...serif(26), marginBottom: 16, color: "var(--sb-ink)" }}>Sign this agreement</h2>
        <p style={{ ...body, marginBottom: 28 }}>
          By typing your full name below and clicking "Sign agreement", you confirm you have read,
          understood, and agree to be bound by all the terms above.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>Type your full name to sign</label>
            <input
              type="text"
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder={SHANKAR_NAME}
              style={{ ...inputStyle, fontSize: 17, fontFamily: "'Instrument Serif', Georgia, serif" }}
            />
            {typedName.trim().length > 0 && (
              <p style={{ fontSize: 12, color: "var(--sb-ink-3)", marginTop: 6, marginBottom: 0 }}>
                Signing as: <em>{typedName.trim()}</em> · {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
              </p>
            )}
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              style={{ marginTop: 3, accentColor: "var(--sb-ink)", width: 16, height: 16, flexShrink: 0 }}
            />
            <span style={{ fontSize: 14.5, color: "var(--sb-ink-2)", lineHeight: 1.6 }}>
              I confirm that I have read and understood this agreement in full, and I agree to be
              legally bound by its terms.
            </span>
          </label>
          <button onClick={handleSign} disabled={!canSign} style={btn(!canSign)}>
            {submitting ? "Signing…" : "Sign agreement"}
          </button>
        </div>
      </div>

      {/* Special message — shown after signing the contract but previewed below */}
      <SpecialMessage />

      <div style={{ paddingTop: 36, borderTop: "1px solid var(--sb-line-2)", display: "flex", gap: 24, fontSize: 13, color: "var(--sb-ink-3)" }}>
        <a href="/team" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>← Team</a>
        <a href="/terms" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>Terms</a>
        <a href="/" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>Home</a>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Shankar() {
  const { user, loading, signOut } = useAuth();
  const [signed, setSigned] = useState<SignedRecord | null>(() => getStoredSig());

  const userEmail = user?.email?.toLowerCase() ?? null;
  const isAdmin   = userEmail === ADMIN_EMAIL;
  const isShankar = userEmail === SHANKAR_EMAIL;

  const handleSign = (name: string) => {
    const record: SignedRecord = { signedAt: new Date().toISOString(), signedName: name };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setSigned(record);
  };

  if (loading) {
    return (
      <div style={wrap}>
        <Navbar />
        <div style={{ ...main, paddingTop: 100, color: "var(--sb-ink-3)", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={wrap}>
        <Navbar />
        <style>{`
          @keyframes shkFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
          @keyframes shkGlow  { 0%,100%{opacity:0.6} 50%{opacity:1} }
        `}</style>
        <SignInGate />
      </div>
    );
  }

  if (!isAdmin && !isShankar) {
    return (
      <div style={wrap}>
        <Navbar />
        <AccessDenied onSignOut={signOut} />
      </div>
    );
  }

  return (
    <div style={wrap}>
      <Navbar />
      <style>{`
        @keyframes shkFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes shkGlow  { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>
      {signed ? (
        <SignedConfirmation record={signed} />
      ) : (
        <AgreementView onSign={handleSign} />
      )}
    </div>
  );
}
