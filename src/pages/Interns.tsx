import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

// ─── Configure per intern ────────────────────────────────────────────────────
const ALLOWED_EMAILS = new Set([
  "itishpande21@gmail.com",
  "ritheekyadav01@gmail.com",
]);
const INTERN_NAME    = "Ritheek Yadav";
const INTERN_ROLE    = "Developer Intern";
const AGREEMENT_DATE = "14th June 2026";
const STORAGE_KEY    = "braino_intern_signed_ritheekyadav01@gmail.com";
// ─────────────────────────────────────────────────────────────────────────────

type SignedRecord = { signedAt: string; signedName: string };

function getStoredSignature(): SignedRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Styles ───────────────────────────────────────────────────────────────────
const wrap: React.CSSProperties = {
  background: "var(--sb-bg)",
  color: "var(--sb-ink)",
  minHeight: "100vh",
};
const main: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "72px 28px 120px",
};
const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
  color: "var(--sb-ink-3)",
};
const serif = (size: number): React.CSSProperties => ({
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontWeight: 400,
  fontSize: size,
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  margin: 0,
});
const body: React.CSSProperties = {
  fontSize: 15.5,
  color: "var(--sb-ink-2)",
  lineHeight: 1.75,
  marginBottom: 12,
};
const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--sb-line-2)",
  margin: "40px 0",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--sb-ink-3)",
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--sb-surface)",
  border: "1px solid var(--sb-line-2)",
  borderRadius: 8,
  color: "var(--sb-ink)",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box" as const,
};
const btn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-block",
  padding: "12px 28px",
  borderRadius: 8,
  border: "none",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 600,
  fontSize: 15,
  background: disabled ? "var(--sb-line-2)" : "var(--sb-ink)",
  color: disabled ? "var(--sb-ink-3)" : "var(--sb-bg)",
  transition: "opacity 0.15s",
  opacity: disabled ? 0.6 : 1,
});
const metaRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px 32px",
  background: "var(--sb-surface)",
  border: "1px solid var(--sb-line-2)",
  borderRadius: 10,
  padding: "20px 24px",
  marginBottom: 36,
};
const metaLabel: React.CSSProperties = {
  fontSize: 11,
  fontFamily: "'JetBrains Mono', monospace",
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
  color: "var(--sb-ink-3)",
  marginBottom: 2,
};
const metaValue: React.CSSProperties = {
  fontSize: 14.5,
  color: "var(--sb-ink)",
  fontWeight: 500,
};

// ── Agreement sections ────────────────────────────────────────────────────────
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

function P({ children }: { children: React.ReactNode }) {
  return <p style={body}>{children}</p>;
}

function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ ...body, marginBottom: 6 }}>{children}</li>;
}

// ── Gate: sign-in ─────────────────────────────────────────────────────────────
function SignInGate() {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{ ...main, maxWidth: 420, paddingTop: 100 }}>
      <p style={mono}>Braino · Intern Agreement</p>
      <h1 style={{ ...serif(36), margin: "14px 0 10px" }}>Sign in to continue</h1>
      <p style={{ ...body, marginBottom: 32 }}>
        This page is restricted. Use the email address associated with your internship to proceed.
      </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            placeholder="••••••••"
          />
        </div>
        {error && <p style={{ fontSize: 13.5, color: "#e05c5c", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={btn(loading)}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

// ── Gate: wrong email ─────────────────────────────────────────────────────────
function AccessDenied({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div style={{ ...main, maxWidth: 420, paddingTop: 100 }}>
      <p style={mono}>Braino · Intern Agreement</p>
      <h1 style={{ ...serif(36), margin: "14px 0 10px" }}>Access denied</h1>
      <p style={{ ...body, marginBottom: 24 }}>
        This agreement is not addressed to your account. If you believe this is a mistake,
        contact <a href="mailto:talk2braino@gmail.com" style={{ color: "var(--sb-accent-deep)" }}>talk2braino@gmail.com</a>.
      </p>
      <button onClick={onSignOut} style={btn(false)}>Sign out</button>
    </div>
  );
}

// ── Signed confirmation ───────────────────────────────────────────────────────
function SignedConfirmation({ record }: { record: SignedRecord }) {
  const date = new Date(record.signedAt);
  const formatted = date.toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div style={main}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 48 }}>
        <p style={mono}>Braino · Intern Agreement</p>
        <h1 style={{ ...serif(48), margin: "14px 0 10px" }}>Agreement signed.</h1>
        <p style={{ ...body, fontSize: 17, marginBottom: 0 }}>
          This document has already been signed. No further action needed.
        </p>
      </div>

      <div style={{ ...metaRow, gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div>
          <div style={metaLabel}>Signed by</div>
          <div style={metaValue}>{record.signedName}</div>
        </div>
        <div>
          <div style={metaLabel}>Role</div>
          <div style={metaValue}>{INTERN_ROLE}</div>
        </div>
        <div>
          <div style={metaLabel}>Signed on</div>
          <div style={metaValue}>{formatted}</div>
        </div>
      </div>

      <p style={{ ...body, fontSize: 13.5, color: "var(--sb-ink-3)" }}>
        A copy of this record is stored in your browser. For questions, reach out to{" "}
        <a href="mailto:talk2braino@gmail.com" style={{ color: "var(--sb-accent-deep)" }}>talk2braino@gmail.com</a>.
      </p>
    </div>
  );
}

// ── Agreement + signature form ────────────────────────────────────────────────
function AgreementView({ onSign }: { onSign: (name: string) => void }) {
  const [typedName, setTypedName]   = useState("");
  const [confirmed, setConfirmed]   = useState(false);
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
      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <p style={mono}>Braino (trybraino.com) · Creatish Inc</p>
        <h1 style={{ ...serif("clamp(38px, 5vw, 58px)" as any), margin: "16px 0 8px" }}>
          Confidentiality &amp;<br />Internship Agreement
        </h1>
        <p style={{ ...body, fontSize: 16, marginBottom: 28 }}>
          Please read this document in full before signing. By signing, you confirm you understand
          and agree to everything below.
        </p>
      </div>

      {/* Meta block */}
      <div style={metaRow}>
        <div>
          <div style={metaLabel}>Date</div>
          <div style={metaValue}>{AGREEMENT_DATE}</div>
        </div>
        <div>
          <div style={metaLabel}>Intern name</div>
          <div style={metaValue}>{INTERN_NAME}</div>
        </div>
        <div>
          <div style={metaLabel}>Role</div>
          <div style={metaValue}>{INTERN_ROLE}</div>
        </div>
        <div>
          <div style={metaLabel}>Organisation</div>
          <div style={metaValue}>Braino / Creatish Inc</div>
        </div>
      </div>

      {/* Agreement body */}
      <Clause n={1} title="Scope of this agreement">
        <P>
          This agreement is between you ({INTERN_NAME}) and Itish Pande, founder of Braino
          ("Creatish Inc"). It applies for the full duration of your internship and for{" "}
          <strong>2 years</strong> after it ends, regardless of how or why the internship concludes.
        </P>
      </Clause>

      <Clause n={2} title="What you agree to keep confidential">
        <P>
          Everything you encounter while interning here is confidential. This includes — but is not
          limited to:
        </P>
        <ul style={{ paddingLeft: 22, margin: "0 0 12px" }}>
          <Li>The product concept, features, roadmap, and any unannounced plans</Li>
          <Li>Source code, system architecture, and technical decisions</Li>
          <Li>User data, analytics, and any personally identifiable information</Li>
          <Li>Business strategy, partnership discussions, and financial details</Li>
          <Li>Internal tools, workflows, AI prompts, and operational processes</Li>
        </ul>
        <P>
          This obligation applies whether you encounter this information directly through your work
          or incidentally as part of being on the team.
        </P>
      </Clause>

      <Clause n={3} title="How you may use this information">
        <P>
          Only for the work you were brought in to do. You may not share, copy, publish, reproduce,
          reverse-engineer, or use any confidential information — in whole or in part — outside of
          your internship duties, during or after your time here.
        </P>
        <P>
          This includes using such information to start, build, or contribute to any product or
          service that competes with Braino.
        </P>
      </Clause>

      <Clause n={4} title="What this agreement does not cover">
        <P>This agreement does not apply to information that:</P>
        <ul style={{ paddingLeft: 22, margin: "0 0 12px" }}>
          <Li>Was already publicly known at the time you received it (and not because of any breach on your part)</Li>
          <Li>You can demonstrate you independently possessed before joining, with written proof</Li>
          <Li>You receive from a third party who has a legitimate right to disclose it</Li>
        </ul>
      </Clause>

      <Clause n={5} title="Ownership of your work">
        <P>
          Everything you create, write, build, design, or contribute to during this internship
          belongs to Braino — including but not limited to code, designs, written content, ideas,
          documentation, and any intellectual property developed in connection with your role.
        </P>
        <P>
          This is a condition of the internship, not a negotiation point. If you have questions about
          specific projects, ask before starting them.
        </P>
      </Clause>

      <Clause n={6} title="Non-compete (6 months post-internship)">
        <P>
          For <strong>6 months</strong> after your internship ends, you agree not to build, join, advise,
          or materially contribute to any product or project that directly competes with Braino's core
          product — meaning an AI-powered browser assistant or any substantially similar product.
        </P>
        <P>
          This does not prevent you from taking other employment, freelancing, or working in unrelated areas.
        </P>
      </Clause>

      <Clause n={7} title="Non-solicitation (1 year post-internship)">
        <P>
          For <strong>1 year</strong> after your internship ends, you agree not to recruit, solicit, or
          encourage any current Braino team member, contractor, or intern to leave Braino or join a
          competing venture.
        </P>
      </Clause>

      <Clause n={8} title="Remedies for breach">
        <P>
          You acknowledge that a breach of this agreement may cause harm to Braino that is difficult
          to quantify in monetary terms alone. Accordingly, Braino may seek injunctive relief or other
          equitable remedies in addition to any other legal recourse available, without the need to
          post a bond.
        </P>
      </Clause>

      <Clause n={9} title="What this isn't">
        <P>
          This agreement is not meant to intimidate or trap you. It's here to protect the work we're
          building together. You remain completely free to learn, grow your skills, build your career,
          and take credit for your contributions in ways that don't disclose confidential details.
        </P>
        <P>
          We want this internship to be a genuinely good experience for you. If anything here feels
          unclear or unfair, ask before you sign.
        </P>
      </Clause>

      <Clause n={10} title="Governing law">
        <P>
          This agreement is governed by and construed in accordance with the laws of India. Any
          disputes arising from this agreement shall be subject to the exclusive jurisdiction of
          courts in India.
        </P>
      </Clause>

      <hr style={divider} />

      {/* Signature block */}
      <div style={{ marginBottom: 48 }}>
        <h2 style={{ ...serif(26), marginBottom: 16, color: "var(--sb-ink)" }}>Sign this agreement</h2>
        <p style={{ ...body, marginBottom: 28 }}>
          By typing your full name below and clicking "Sign agreement", you confirm that you have
          read, understood, and agree to be bound by all the terms above. This constitutes your
          digital signature.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>Type your full name to sign</label>
            <input
              type="text"
              value={typedName}
              onChange={e => setTypedName(e.target.value)}
              placeholder={INTERN_NAME}
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

          <div>
            <button onClick={handleSign} disabled={!canSign} style={btn(!canSign)}>
              {submitting ? "Signing…" : "Sign agreement"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 24, borderTop: "1px solid var(--sb-line-2)", display: "flex", gap: 24, fontSize: 13, color: "var(--sb-ink-3)" }}>
        <a href="/terms" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>Terms of Service</a>
        <a href="/privacy" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>Privacy Policy</a>
        <a href="/" style={{ color: "var(--sb-ink-2)", textDecoration: "none" }}>Home</a>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Interns() {
  const { user, loading, signOut } = useAuth();
  const [signed, setSigned] = useState<SignedRecord | null>(() => getStoredSignature());

  const handleSign = (name: string) => {
    const record: SignedRecord = {
      signedAt: new Date().toISOString(),
      signedName: name,
    };
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
        <SignInGate />
      </div>
    );
  }

  if (!ALLOWED_EMAILS.has(user.email?.toLowerCase() ?? "")) {
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
      {signed ? (
        <SignedConfirmation record={signed} />
      ) : (
        <AgreementView onSign={handleSign} />
      )}
    </div>
  );
}
