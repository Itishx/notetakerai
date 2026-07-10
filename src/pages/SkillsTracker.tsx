import "./home.css";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import {
  wrap, mono, serif, readFont,
  Eyebrow, Section, EditorialHero, EdTitle, EdDek,
} from "@/lib/editorial";

/* ============================================================================
   Braino Skills · trybraino.com/skills
   A live inventory of what Braino can actually do: skills, integration surfaces,
   and ops pages, each with a status and the next refinement. Re-skinned into the
   editorial "Medium theme"; the data + status logic is preserved intact.
   ============================================================================ */

type SkillStatus = "Working" | "Needs refinement" | "Planned";

type SkillRow = {
  name: string;
  type: "Skill" | "Integration" | "Ops page";
  status: SkillStatus;
  path?: string;
  canDo: string[];
  notes: string;
  next: string;
};

// Token-driven status pills. Flip cleanly in light/dark.
const statusStyle: Record<SkillStatus, React.CSSProperties> = {
  Working: { color: "var(--sb-ok, #4caf7d)", borderColor: "rgba(76,175,125,0.4)", background: "rgba(76,175,125,0.1)" },
  "Needs refinement": { color: "var(--sb-accent-deep)", borderColor: "var(--sb-line-2)", background: "var(--sb-accent-soft)" },
  Planned: { color: "var(--sb-ink-3)", borderColor: "var(--sb-line-2)", background: "var(--sb-panel)" },
};

const rows: SkillRow[] = [
  {
    name: "LinkedIn Jobs",
    type: "Skill",
    status: "Working",
    path: "skills/linkedin-jobs/SKILL.md",
    canDo: [
      "Search LinkedIn Jobs by role and location.",
      "Open and inspect 3-5 jobs.",
      "Return links, descriptions, requirements, and a fit read.",
    ],
    notes: "Already surprisingly useful. Main risk is LinkedIn UI or login changes.",
    next: "Sharpen result formatting and never stop at one job when more are open.",
  },
  {
    name: "X Growth + Posting",
    type: "Skill",
    status: "Working",
    path: "skills/x-growth-posting/SKILL.md",
    canDo: [
      "Read X status and follower changes.",
      "Offer to draft a post after a status check.",
      "Write in your saved X tone, then post or schedule only on your approval.",
    ],
    notes: "A strong loop: it turns account insight straight into action.",
    next: "QA voice and text parity, and smooth out the draft modal.",
  },
  {
    name: "Google Maps",
    type: "Skill",
    status: "Needs refinement",
    path: "skills/google-maps/SKILL.md",
    canDo: [
      "Open Maps visibly for places, directions, and distance checks.",
      "Recommend spots from the visible results.",
      "Ask whether to send the best pick to your phone.",
    ],
    notes: "Only earns its place as an outing planner, not a Maps search wrapper.",
    next: "Add Resend email handoff and blend in menu and budget sources.",
  },
  {
    name: "Google Calendar",
    type: "Skill",
    status: "Working",
    path: "skills/google-calendar/SKILL.md",
    canDo: [
      "Schedule, reschedule, cancel, forward, and list events.",
      "Add Meet links and 15-minute reminders by default.",
      "Open Meet at start time and hand off into Meeting mode.",
    ],
    notes: "OAuth, actions, reminders, and the Meet handoff run on the real backend now.",
    next: "Keep QA on watch-renewal edge cases and natural-language parsing misses.",
  },
  {
    name: "Realtime Costs Memory",
    type: "Skill",
    status: "Working",
    path: "skills/realtime-costs/SKILL.md",
    canDo: [
      "Answer exact realtime spend for the current or latest session.",
      "Report today and the last 7 days with concrete dates.",
      "Name the biggest cost driver and the priciest recent session.",
    ],
    notes: "Turns the ops logs into something Braino can speak back on demand.",
    next: "Polish phrasing so voice-mode receipts land instant and natural.",
  },
  {
    name: "Realtime Costs",
    type: "Ops page",
    status: "Working",
    path: "/realtime-costs",
    canDo: [
      "Log headphone-mode voice turns.",
      "Show transcripts, replies, token usage, and estimated cost.",
      "Flag OpenAI audio tokens that show up when external TTS is on.",
    ],
    notes: "Key to keeping GPT Realtime cost under control.",
    next: "Read this data before switching models or tuning voice behavior.",
  },
  {
    name: "Voice Stack",
    type: "Integration",
    status: "Needs refinement",
    canDo: [
      "Use OpenAI Realtime for listening, VAD, transcription, and routing.",
      "Use Fish Audio as the one spoken voice.",
      "Track session cost logs and realtime voice usage.",
    ],
    notes: "Architecture is better, but voice bugs are loud, so it needs careful QA.",
    next: "Keep external TTS as the only voice and verify no duplicate speakers.",
  },
  {
    name: "Maps Phone Handoff",
    type: "Integration",
    status: "Planned",
    canDo: [
      "Send a chosen Maps result to your phone.",
      "Include place, reason, ETA, and a Maps button.",
      "Start with email via Resend before SMS or push.",
    ],
    notes: "This is what makes the Maps skill feel practical instead of decorative.",
    next: "Build a small authenticated Resend endpoint and store your target contact.",
  },
];

const counts = rows.reduce(
  (acc, row) => {
    acc[row.status] += 1;
    return acc;
  },
  { Working: 0, "Needs refinement": 0, Planned: 0 } as Record<SkillStatus, number>,
);

const ORDER: SkillStatus[] = ["Working", "Needs refinement", "Planned"];

export default function SkillsTracker() {
  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* ── Hero ── */}
      <EditorialHero
        eyebrow="Skills tracker"
        title={<>Everything Braino can <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>actually do.</em></>}
        dek="A living inventory of the skills, integrations, and ops surfaces we've built, where each one stands, and what comes next."
      />

      {/* ── Status counts ── */}
      <Section tone="2" pad="10px 0 80px">
        <div style={{ ...wrap, maxWidth: 900, paddingTop: 40 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
            {ORDER.map((status) => (
              <div key={status} style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 20, padding: "24px 26px" }}>
                <div style={{ ...mono, fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>{status}</div>
                <div style={{ fontFamily: serif, fontSize: 52, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--sb-ink)", marginTop: 10 }}>{counts[status]}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── The inventory ── */}
      <Section tone="1" pad="80px 0 100px">
        <div style={{ ...wrap, maxWidth: 1000 }}>
          <div style={{ marginBottom: 40 }}>
            <Eyebrow>The inventory</Eyebrow>
            <EdTitle size="clamp(32px,4.4vw,52px)" style={{ margin: "14px 0 14px" }}>
              Every surface, status, and next move.
            </EdTitle>
            <EdDek style={{ maxWidth: 640 }}>
              No roadmap theater. Just what works today, what needs a pass, and what's still on the bench.
            </EdDek>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {rows.map((row) => (
              <article
                key={row.name}
                style={{ background: "var(--sb-panel-2)", border: "1px solid var(--sb-line-2)", borderRadius: 24, padding: 30, display: "grid", gap: 22, gridTemplateColumns: "minmax(220px,1fr) minmax(260px,1.3fr) minmax(220px,1.1fr)", alignItems: "start" }}
              >
                {/* Name / type / path / notes */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                    <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 26, lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--sb-ink)", margin: 0 }}>{row.name}</h2>
                    <span style={{ ...mono, fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--sb-ink-3)", border: "1px solid var(--sb-line-2)", borderRadius: 999, padding: "3px 9px" }}>{row.type}</span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", ...mono, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 500, border: "1px solid", borderRadius: 999, padding: "4px 11px", ...statusStyle[row.status] }}>
                      {row.status}
                    </span>
                  </div>

                  {row.path ? (
                    row.path.startsWith("/") ? (
                      <Link to={row.path} style={{ ...mono, fontSize: 12, color: "var(--sb-accent-deep)", textDecoration: "none", marginTop: 14, display: "inline-block" }}>
                        {row.path}
                      </Link>
                    ) : (
                      <div style={{ ...mono, fontSize: 12, color: "var(--sb-ink-3)", marginTop: 14 }}>{row.path}</div>
                    )
                  ) : null}

                  <p style={{ fontFamily: readFont, fontSize: 16, lineHeight: 1.55, color: "var(--sb-ink-2)", marginTop: 14, marginBottom: 0 }}>{row.notes}</p>
                </div>

                {/* Can do */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 12 }}>Can do</div>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 9, margin: 0, padding: 0, listStyle: "none" }}>
                    {row.canDo.map((item) => (
                      <li key={item} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5, color: "var(--sb-ink)" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sb-accent)", flexShrink: 0, marginTop: 7 }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next refinement */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-ink-3)", marginBottom: 12 }}>Next refinement</div>
                  <p style={{ fontFamily: readFont, fontSize: 15.5, lineHeight: 1.6, color: "var(--sb-ink-2)", margin: 0 }}>{row.next}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
