import "./home.css";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import {
  wrap, mono, readFont,
  Eyebrow, Section, EditorialHero, EdTitle, EdDek,
  neutralCard, primaryBtn, ArrowIcon,
} from "@/lib/editorial";

/* ============================================================================
   Automations. Braino's repeatable workflows, in the editorial (Medium) shell.
   Re-skin of the old Tailwind page onto the shared design system. First live
   automation is X Timeline auto-reply; the rest are teased as "coming soon".
   ============================================================================ */

const XIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const steps = [
  "Install Braino and sign in at trybraino.com.",
  "Open X (twitter.com) on your timeline, any tab.",
  'Open the Braino bar (click the brain or press Cmd+I) and hit "X Auto".',
  "Braino reads each eligible tweet, skips ads and political posts, writes a human reply, and posts at most one per minute.",
  'Hit "Stop" in the brain card any time to pause.',
];

const coming = [
  { emoji: "💼", name: "LinkedIn Auto-Comment", desc: "Thoughtful, on-topic comments on posts in your feed." },
  { emoji: "📧", name: "Gmail Auto-Reply Drafts", desc: "Draft replies to unread mail, queued for your approval." },
  { emoji: "🔴", name: "Reddit Auto-Comment", desc: "Value-adding replies in the threads you care about." },
];

export default function Automations() {
  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* ── Hero ── */}
      <EditorialHero
        eyebrow="Automations"
        title={<>Outreach on <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>autopilot.</em></>}
        dek="Braino runs your repeatable workflows while you build. First up: X auto-reply. Human-sounding replies, safe pacing, live stats synced to your dashboard."
      >
        <Link to="/" style={primaryBtn}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; }}>
          Get the extension <ArrowIcon />
        </Link>
      </EditorialHero>

      {/* ── X Automation (live) ── */}
      <Section tone="2">
        <div style={{ ...wrap, maxWidth: 760 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Eyebrow>Live now</Eyebrow>
            <EdTitle style={{ margin: "14px 0 14px", fontSize: "clamp(30px,3.8vw,46px)" }}>
              X timeline, <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>handled.</em>
            </EdTitle>
            <EdDek style={{ maxWidth: 600, margin: "0 auto" }}>
              Braino replies to posts in your timeline with one-minute pacing, three-hour sessions, and stats synced back to your dashboard.
            </EdDek>
          </div>

          <div style={{ ...neutralCard, padding: 0, gap: 0 }}>
            {/* Card header */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 28, borderBottom: "1px solid var(--sb-line-2)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--sb-ink)", color: "var(--sb-on-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <XIcon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 17, color: "var(--sb-ink)" }}>X Timeline Auto-Reply</div>
                <div style={{ fontSize: 13.5, color: "var(--sb-ink-3)", marginTop: 2 }}>One-minute pacing. Three-hour sessions. Synced stats.</div>
              </div>
              <span style={{ ...mono, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", padding: "5px 12px", borderRadius: 999, border: "1px solid var(--sb-line-2)", color: "var(--sb-accent-deep)", background: "var(--sb-accent-soft)", flexShrink: 0 }}>Live</span>
            </div>

            {/* Steps */}
            <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ ...mono, width: 24, height: 24, borderRadius: "50%", background: "var(--sb-ink)", color: "var(--sb-on-ink)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    {i + 1}
                  </span>
                  <p style={{ fontFamily: readFont, fontSize: 16, color: "var(--sb-ink-2)", lineHeight: 1.55, margin: 0 }}>{s}</p>
                </div>
              ))}
            </div>

            {/* Note strip */}
            <div style={{ margin: "0 28px 28px", padding: "16px 18px", borderRadius: 14, border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)" }}>
              <p style={{ fontSize: 13, color: "var(--sb-ink-3)", lineHeight: 1.6, margin: 0 }}>
                Sessions run for <strong style={{ color: "var(--sb-ink)", fontWeight: 600 }}>three hours</strong> at <strong style={{ color: "var(--sb-ink)", fontWeight: 600 }}>one reply per minute</strong>. Builder-invite posts can mention <strong style={{ color: "var(--sb-ink)", fontWeight: 600 }}>trybraino.com</strong>. Promoted posts, political posts, and duplicate-looking drafts get filtered out before anything posts.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Coming soon ── */}
      <Section tone="1">
        <div style={{ ...wrap, maxWidth: 760 }}>
          <div style={{ textAlign: "center", marginBottom: 34 }}>
            <Eyebrow>Coming soon</Eyebrow>
            <EdTitle style={{ margin: "14px 0 0", fontSize: "clamp(30px,3.8vw,46px)" }}>
              More surfaces, <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>same idea.</em>
            </EdTitle>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {coming.map(a => (
              <div key={a.name} style={{ ...neutralCard, flexDirection: "row", alignItems: "center", gap: 18, padding: 22, opacity: 0.75, cursor: "default" }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{a.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--sb-ink)" }}>{a.name}</div>
                  <div style={{ fontSize: 13, color: "var(--sb-ink-3)", marginTop: 2 }}>{a.desc}</div>
                </div>
                <span style={{ color: "var(--sb-ink-4)", flexShrink: 0 }}><ArrowIcon /></span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
