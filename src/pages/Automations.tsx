import { Zap, Twitter, ChevronRight, Download, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const steps = [
  { n: "1", text: "Install the Braino extension and sign in." },
  { n: "2", text: "Navigate to X (twitter.com) and open your timeline." },
  { n: "3", text: 'Click the brain button to open Braino, then click "X Auto" in the bar.' },
  { n: "4", text: "Braino reads each tweet, generates a human reply that subtly mentions trybraino.com, and posts it — 10 seconds apart so X doesn't rate-limit you." },
  { n: "5", text: 'Click "Stop" in the bar to pause at any time.' },
];

export default function Automations() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--sb-surface, #faf8f5)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px 120px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ background: "#fee2e2", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#C9544A", letterSpacing: "0.05em" }}>BETA</span>
          <span style={{ fontSize: 12, color: "#9B8579", fontWeight: 600, letterSpacing: "0.06em" }}>AUTOMATIONS</span>
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, lineHeight: 1.1, color: "#1B1410", margin: "0 0 16px", fontFamily: "Georgia, serif" }}>
          Put your outreach<br />on autopilot.
        </h1>
        <p style={{ fontSize: 18, color: "#6B5248", lineHeight: 1.65, maxWidth: 560, margin: "0 0 48px" }}>
          Braino can run repeatable workflows for you while you focus on other things. First up: X (Twitter) auto-reply — engage your entire timeline with genuine, human-sounding replies.
        </p>

        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#1B1410", color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, textDecoration: "none", marginBottom: 64 }}>
          <Download size={14} /> Get the extension
        </Link>

        {/* X Automation card */}
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid rgba(0,0,0,0.08)", padding: "32px 32px 28px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Twitter size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1B1410" }}>X Timeline Auto-Reply</h2>
              <p style={{ margin: "4px 0 0", fontSize: 14, color: "#9B8579" }}>Replies to posts in your timeline — 10 seconds apart, fully AI-generated.</p>
            </div>
            <span style={{ marginLeft: "auto", background: "#f0fdf4", color: "#16a34a", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Active</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
            {steps.map((s) => (
              <div key={s.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#1B1410", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</span>
                <p style={{ margin: 0, fontSize: 14, color: "#3D2D24", lineHeight: 1.6 }}>{s.text}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "#faf8f5", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
            <Zap size={14} color="#C9544A" />
            <span style={{ fontSize: 13, color: "#6B5248", lineHeight: 1.5 }}>
              Replies are capped at 30 per session. Each reply subtly includes <strong>trybraino.com</strong> so followers discover the product organically.
            </span>
          </div>
        </div>

        {/* Coming soon cards */}
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#9B8579", letterSpacing: "0.07em", margin: "48px 0 16px" }}>COMING SOON</h3>
        {[
          { icon: "💼", name: "LinkedIn Auto-Comment", desc: "Engage posts in your LinkedIn feed with thoughtful comments." },
          { icon: "📧", name: "Gmail Auto-Reply Drafts", desc: "Draft replies to unread emails and queue them for your approval." },
          { icon: "🔴", name: "Reddit Auto-Comment", desc: "Join threads in your subreddits with relevant, value-adding replies." },
        ].map((a) => (
          <div key={a.name} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.07)", padding: "20px 24px", marginBottom: 12, display: "flex", alignItems: "center", gap: 16, opacity: 0.6 }}>
            <span style={{ fontSize: 24 }}>{a.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: "#1B1410", fontSize: 15 }}>{a.name}</div>
              <div style={{ fontSize: 13, color: "#9B8579", marginTop: 2 }}>{a.desc}</div>
            </div>
            <ChevronRight size={16} color="#C9544A" style={{ marginLeft: "auto" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
