import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";

// ─── types ────────────────────────────────────────────────────────────────────

export interface Feature {
  id: string;
  number?: string;
  parent?: string;
  name: string;
  tagline: string;
  chips: string[];
  heading: string;
  description: string;
  useCases: { label: string; who: string }[];
}

// ─── data ─────────────────────────────────────────────────────────────────────

export const CHAT: Feature = {
  id: "chat",
  number: "01",
  name: "Chat with Page",
  tagline: "Ask anything about what's on screen",
  chips: ["Summarise", "Explain docs", "LeetCode", "Code review", "Research synthesis", "Extract data"],
  heading: "Read anything.\nUnderstand everything.",
  description: "Open Braino on any URL — article, PDF, GitHub diff, research paper, product page — and talk to it. Ask questions, get summaries, extract data, or get a second opinion. No copying, no switching tabs.",
  useCases: [
    { label: "Summarise long articles & research papers instantly", who: "Researchers · analysts" },
    { label: "Explain complex documentation step by step", who: "Developers · students" },
    { label: "Get LeetCode hints without leaving the problem", who: "Engineers · students" },
    { label: "Code review explanations on GitHub diffs", who: "Developers" },
    { label: "Synthesise insights across multiple open tabs", who: "Academics · writers" },
    { label: "Extract key data points from reports & PDFs", who: "Finance · ops teams" },
  ],
};

export const RECORD: Feature = {
  id: "record",
  number: "02",
  name: "Record & Capture",
  tagline: "Turn any audio into structured notes",
  chips: ["Lectures", "Podcasts", "Language learning", "Training videos", "Content repurposing"],
  heading: "Listen once.\nRemember forever.",
  description: "Record audio from any browser tab — lectures, podcasts, training videos — and get clean, structured notes back. Headings, key terms, summaries. Ready to sync to Notion.",
  useCases: [
    { label: "Online course notes with headings & glossary", who: "Students · self-learners" },
    { label: "Podcast key-takeaway summaries", who: "Professionals · curious minds" },
    { label: "Language learning transcripts + vocab notes", who: "Language learners" },
    { label: "Press conference & academic lecture transcription", who: "Journalists · researchers" },
    { label: "Generate show notes & blog drafts from your content", who: "Podcasters · YouTubers" },
    { label: "Convert training videos into SOPs & onboarding docs", who: "L&D teams · HR" },
  ],
};

export const MEETINGS: Feature = {
  id: "meetings",
  parent: "record",
  name: "Meetings",
  tagline: "Auto-notes for every call you join",
  chips: ["Zoom", "Google Meet", "Teams", "Action items", "Follow-up emails", "Decision log"],
  heading: "Every meeting.\nPerfectly captured.",
  description: "Join any video call and Braino quietly records, transcribes, and structures everything. Action items, decisions, and follow-up emails are drafted the moment the call ends — without you lifting a finger.",
  useCases: [
    { label: "Auto-transcribe Zoom, Meet & Teams calls in real time", who: "Everyone" },
    { label: "Extract action items and decisions automatically", who: "Managers · teams" },
    { label: "Generate follow-up email drafts right after the call", who: "Sales · account managers" },
    { label: "Build a searchable meeting history across all calls", who: "Teams · project managers" },
    { label: "Meeting prep summaries pulled from past notes", who: "Professionals" },
    { label: "Share clean, structured meeting notes with your team", who: "Remote teams" },
  ],
};

export const DELEGATE: Feature = {
  id: "delegate",
  number: "03",
  name: "Delegate Tasks",
  tagline: "Describe it. Braino does it.",
  chips: ["Email drafts", "Form filling", "Job applications", "Product research", "Calendar events"],
  heading: "Say what you want.\nWatch it happen.",
  description: "Braino can operate your browser for you. Email drafts, form filling, job applications, product research, calendar events — describe the task in plain English and Braino handles all the clicking.",
  useCases: [
    { label: "Draft & send Gmail replies in a single sentence", who: "Everyone" },
    { label: "Auto-fill repetitive job application forms", who: "Job seekers" },
    { label: "Research & compare products across multiple pages", who: "Shoppers · buyers" },
    { label: "Create calendar events from natural language", who: "Professionals" },
    { label: "Fill any web form with your saved details", who: "Everyone" },
    { label: "Search, open, and shortlist job listings in bulk", who: "Job seekers · recruiters" },
  ],
};

// ─── Graphics ─────────────────────────────────────────────────────────────────

function ChatGraphic() {
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxWidth: 380, display: "block", borderRadius: 16 }}>
      <rect width="380" height="260" rx="16" fill="var(--sb-panel-2)" stroke="var(--sb-line)" strokeWidth="1"/>
      <rect width="380" height="38" rx="16" fill="var(--sb-panel)"/>
      <rect y="26" width="380" height="12" fill="var(--sb-panel)"/>
      <circle cx="16" cy="19" r="5" fill="#FF5F57" opacity=".8"/>
      <circle cx="29" cy="19" r="5" fill="#FEBC2E" opacity=".8"/>
      <circle cx="42" cy="19" r="5" fill="#28C840" opacity=".8"/>
      <rect x="58" y="11" width="210" height="16" rx="8" fill="var(--sb-bg-2)"/>
      {/* Page text lines */}
      <rect x="12" y="50" width="212" height="11" rx="3" fill="var(--sb-ink)" opacity=".14"/>
      {[68, 82, 95, 108, 122, 135, 148].map((y, i) => (
        <rect key={y} x="12" y={y} width={[165, 182, 152, 170, 162, 175, 140][i]} height="7" rx="3" fill="var(--sb-line)"/>
      ))}
      {/* Vertical divider */}
      <rect x="244" y="46" width="1" height="208" fill="var(--sb-line)"/>
      {/* Side panel */}
      <rect x="245" y="46" width="131" height="209" fill="var(--sb-accent-soft)"/>
      {/* Panel header */}
      <rect x="253" y="57" width="56" height="8" rx="3" fill="var(--sb-accent)" opacity=".75"/>
      {/* User bubble */}
      <rect x="290" y="76" width="74" height="24" rx="12" fill="var(--sb-accent)"/>
      <rect x="297" y="83" width="60" height="5" rx="2" fill="rgba(255,255,255,.75)"/>
      <rect x="297" y="91" width="44" height="4" rx="2" fill="rgba(255,255,255,.5)"/>
      {/* AI bubble */}
      <rect x="253" y="109" width="88" height="34" rx="12" fill="var(--sb-panel)"/>
      <rect x="260" y="118" width="74" height="5" rx="2" fill="var(--sb-line)"/>
      <rect x="260" y="126" width="66" height="5" rx="2" fill="var(--sb-line-2)"/>
      <rect x="260" y="134" width="70" height="5" rx="2" fill="var(--sb-line-2)"/>
      {/* User bubble 2 */}
      <rect x="296" y="153" width="68" height="20" rx="10" fill="var(--sb-accent)" opacity=".8"/>
      <rect x="303" y="160" width="54" height="5" rx="2" fill="rgba(255,255,255,.65)"/>
      {/* AI bubble 2 */}
      <rect x="253" y="182" width="92" height="38" rx="12" fill="var(--sb-panel)"/>
      <rect x="260" y="191" width="78" height="5" rx="2" fill="var(--sb-line)"/>
      <rect x="260" y="199" width="70" height="5" rx="2" fill="var(--sb-line-2)"/>
      <rect x="260" y="207" width="74" height="5" rx="2" fill="var(--sb-line-2)"/>
      {/* Input bar */}
      <rect x="249" y="230" width="120" height="20" rx="10" fill="var(--sb-panel)" stroke="var(--sb-accent)" strokeWidth="1.2"/>
      <rect x="257" y="237" width="72" height="5" rx="2" fill="var(--sb-line-2)"/>
    </svg>
  );
}

function RecordGraphic() {
  const bars = [10, 20, 30, 22, 36, 16, 26, 40, 20, 32, 14, 34, 22, 28, 18, 12];
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxWidth: 380, display: "block", borderRadius: 16 }}>
      <rect width="380" height="260" rx="16" fill="var(--sb-panel-2)" stroke="var(--sb-line)" strokeWidth="1"/>
      <rect width="380" height="38" rx="16" fill="var(--sb-panel)"/>
      <rect y="26" width="380" height="12" fill="var(--sb-panel)"/>
      <circle cx="16" cy="19" r="5" fill="#FF5F57" opacity=".8"/>
      <circle cx="29" cy="19" r="5" fill="#FEBC2E" opacity=".8"/>
      <circle cx="42" cy="19" r="5" fill="#28C840" opacity=".8"/>
      <rect x="58" y="11" width="210" height="16" rx="8" fill="var(--sb-bg-2)"/>
      {/* Recording pill */}
      <rect x="12" y="48" width="356" height="50" rx="10" fill="var(--sb-accent-soft)"/>
      <circle cx="34" cy="73" r="10" fill="var(--sb-accent)"/>
      <circle cx="34" cy="73" r="5" fill="white"/>
      {/* Waveform */}
      {bars.map((h, i) => (
        <rect
          key={i} x={56 + i * 18} y={73 - h / 2} width={11} height={h} rx="5"
          fill={i < 9 ? "var(--sb-accent)" : "var(--sb-line)"}
          opacity={i < 9 ? 1 : 0.45}
        />
      ))}
      {/* Notes card */}
      <rect x="12" y="108" width="356" height="140" rx="10" fill="var(--sb-panel)" stroke="var(--sb-line-2)" strokeWidth="1"/>
      {/* Section H */}
      <rect x="22" y="120" width="104" height="9" rx="3" fill="var(--sb-ink)" opacity=".82"/>
      <rect x="22" y="135" width="310" height="6" rx="2" fill="var(--sb-line-2)"/>
      <rect x="22" y="145" width="290" height="6" rx="2" fill="var(--sb-line-2)"/>
      <rect x="22" y="155" width="300" height="6" rx="2" fill="var(--sb-line-2)"/>
      {/* Key terms */}
      <rect x="22" y="170" width="60" height="8" rx="3" fill="var(--sb-accent)" opacity=".55"/>
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x={22 + i * 80} y="183" width={72} height="22" rx="7"
          fill="var(--sb-accent-soft)" stroke="var(--sb-line)" strokeWidth="1"/>
      ))}
      {/* Summary */}
      <rect x="22" y="215" width="50" height="7" rx="3" fill="var(--sb-ink)" opacity=".6"/>
      <rect x="22" y="228" width="318" height="5" rx="2" fill="var(--sb-line-2)"/>
      <rect x="22" y="237" width="280" height="5" rx="2" fill="var(--sb-line-2)"/>
    </svg>
  );
}

function MeetingsGraphic() {
  const tiles = [
    { x: 12, y: 48, w: 174, h: 108, avatarX: 99, avatarY: 102, color: "#3A2F2A", ac: "var(--sb-accent)" },
    { x: 194, y: 48, w: 174, h: 108, avatarX: 281, avatarY: 102, color: "#232B35", ac: "#6C8EBF" },
    { x: 12, y: 162, w: 174, h: 86, avatarX: 99, avatarY: 205, color: "#1F2C25", ac: "#4CAF7D" },
    { x: 194, y: 162, w: 174, h: 86, avatarX: 281, avatarY: 205, color: "#2C1F25", ac: "#CF6679" },
  ];
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxWidth: 380, display: "block", borderRadius: 16 }}>
      <rect width="380" height="260" rx="16" fill="#1A1614" stroke="var(--sb-line)" strokeWidth="1"/>
      <rect width="380" height="38" rx="16" fill="#111"/>
      <rect y="26" width="380" height="12" fill="#111"/>
      <circle cx="16" cy="19" r="5" fill="#FF5F57" opacity=".8"/>
      <circle cx="29" cy="19" r="5" fill="#FEBC2E" opacity=".8"/>
      <circle cx="42" cy="19" r="5" fill="#28C840" opacity=".8"/>
      <rect x="58" y="11" width="180" height="16" rx="8" fill="#2A2522"/>
      {tiles.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.y} width={t.w} height={t.h} rx="8" fill={t.color}/>
          <circle cx={t.avatarX} cy={t.avatarY} r={i === 0 ? 22 : 18} fill={t.ac} opacity=".65"/>
          {i === 0 && (
            <rect x={t.x + 6} y={t.y + t.h - 20} width={t.w - 12} height="16" rx="4" fill="rgba(226,125,57,0.55)"/>
          )}
        </g>
      ))}
      {/* Recording dot */}
      <circle cx="356" cy="56" r="6" fill="var(--sb-accent)"/>
      <circle cx="356" cy="56" r="3" fill="white" opacity=".8"/>
      {/* Notes side strip */}
      <rect x="0" y="255" width="380" height="5" rx="0" fill="transparent"/>
      {/* Bottom toolbar */}
      <rect x="0" y="255" width="380" height="5" rx="0" fill="transparent"/>
      <rect x="110" y="258" width="160" height="0" rx="0" fill="transparent"/>
      {/* Overlay card: Notes generating */}
      <rect x="22" y="213" width="336" height="40" rx="10" fill="rgba(30,22,16,0.85)" stroke="rgba(226,125,57,0.4)" strokeWidth="1"/>
      <circle cx="38" cy="233" r="6" fill="var(--sb-accent)"/>
      <circle cx="38" cy="233" r="3" fill="white" opacity=".6"/>
      <rect x="52" y="226" width="90" height="7" rx="3" fill="rgba(251,247,241,0.85)"/>
      <rect x="52" y="237" width="180" height="5" rx="2" fill="rgba(251,247,241,0.35)"/>
      <rect x="288" y="224" width="60" height="18" rx="6" fill="rgba(226,125,57,0.35)" stroke="rgba(226,125,57,0.5)" strokeWidth="1"/>
      <rect x="296" y="230" width="44" height="5" rx="2" fill="rgba(226,125,57,0.8)"/>
    </svg>
  );
}

function DelegateGraphic() {
  const steps = [
    { done: true, w1: 96, w2: 72, active: false },
    { done: true, w1: 120, w2: 84, active: false },
    { done: false, w1: 106, w2: 0, active: true },
    { done: false, w1: 84, w2: 0, active: false },
  ];
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxWidth: 380, display: "block", borderRadius: 16 }}>
      <rect width="380" height="260" rx="16" fill="var(--sb-panel-2)" stroke="var(--sb-line)" strokeWidth="1"/>
      <rect width="380" height="38" rx="16" fill="var(--sb-panel)"/>
      <rect y="26" width="380" height="12" fill="var(--sb-panel)"/>
      <circle cx="16" cy="19" r="5" fill="#FF5F57" opacity=".8"/>
      <circle cx="29" cy="19" r="5" fill="#FEBC2E" opacity=".8"/>
      <circle cx="42" cy="19" r="5" fill="#28C840" opacity=".8"/>
      <rect x="58" y="11" width="210" height="16" rx="8" fill="var(--sb-bg-2)"/>
      {/* Task prompt pill */}
      <rect x="12" y="48" width="356" height="44" rx="10" fill="var(--sb-panel)" stroke="var(--sb-line-2)" strokeWidth="1"/>
      <rect x="22" y="60" width="220" height="7" rx="3" fill="var(--sb-accent)" opacity=".65"/>
      <rect x="22" y="72" width="170" height="5" rx="2" fill="var(--sb-line-2)"/>
      {steps.map((s, i) => (
        <g key={i}>
          {i > 0 && (
            <rect x="33" y={100 + (i - 1) * 42 + 16} width="2" height="26" rx="1"
              fill={i <= 2 ? "var(--sb-accent)" : "var(--sb-line)"}
              opacity={i <= 2 ? 0.55 : 0.3}/>
          )}
          <circle cx="34" cy={100 + i * 42} r="12"
            fill={s.done ? "var(--sb-accent)" : s.active ? "var(--sb-accent-soft)" : "var(--sb-bg-2)"}
            stroke={s.active ? "var(--sb-accent)" : "none"}
            strokeWidth="2"/>
          {s.done && (
            <path d={`M${28} ${100 + i * 42} l5 5 9-9`}
              stroke="white" strokeWidth="1.8" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>
          )}
          {s.active && <circle cx="34" cy={100 + i * 42} r="5" fill="var(--sb-accent)"/>}
          <rect x="54" y={95 + i * 42} width={s.w1} height="8" rx="3"
            fill={s.done ? "var(--sb-ink)" : s.active ? "var(--sb-accent)" : "var(--sb-line)"}
            opacity={s.done ? 0.8 : s.active ? 1 : 0.42}/>
          {s.w2 > 0 && (
            <rect x="54" y={107 + i * 42} width={s.w2} height="5" rx="2" fill="var(--sb-line-2)"/>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─── shared styles ────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = { maxWidth: 1160, margin: "0 auto", padding: "0 44px" };

// ─── Accordion ────────────────────────────────────────────────────────────────

export const GRAPHICS: Record<string, () => JSX.Element> = {
  chat: ChatGraphic,
  record: RecordGraphic,
  meetings: MeetingsGraphic,
  delegate: DelegateGraphic,
};

/** Ordered list of all features, for grids / panels that want to map over them. */
export const FEATURES: Feature[] = [CHAT, RECORD, MEETINGS, DELEGATE];

/** Number / parent badge + name + tagline + chips. Reused by the accordion header
 *  and by the draggable feature panel. */
export function FeatureHeaderInfo({ feature, isOpen }: { feature: Feature; isOpen: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Number / parent badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {feature.number && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.1em",
            color: isOpen ? "var(--sb-accent)" : "var(--sb-ink-4)",
            background: isOpen ? "var(--sb-accent-soft)" : "transparent",
            padding: isOpen ? "3px 8px" : "0",
            borderRadius: 4,
            transition: "all .2s",
          }}>
            {feature.number}
          </span>
        )}
        {feature.parent && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            color: "var(--sb-accent-deep)",
            background: "var(--sb-accent-soft)",
            padding: "3px 9px",
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 9l7-7 7 7"/>
              <path d="M19 9v10a1 1 0 01-1 1H6a1 1 0 01-1-1V9"/>
            </svg>
            Extends Record
          </span>
        )}
      </div>

      {/* Feature name */}
      <div style={{
        fontFamily: "'Instrument Serif', serif",
        fontWeight: 400,
        fontSize: "clamp(22px, 2.6vw, 34px)",
        lineHeight: 1.08,
        color: "var(--sb-ink)",
        marginBottom: 6,
      }}>
        {feature.name}
      </div>

      {/* Tagline */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: "var(--sb-ink-3)",
        letterSpacing: "0.04em",
        marginBottom: 18,
      }}>
        {feature.tagline}
      </div>

      {/* Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {feature.chips.map(chip => (
          <span
            key={chip}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.02em",
              padding: "5px 12px",
              borderRadius: 999,
              background: isOpen ? "var(--sb-accent-soft)" : "var(--sb-bg-2)",
              color: isOpen ? "var(--sb-accent-deep)" : "var(--sb-ink-3)",
              border: "1px solid",
              borderColor: isOpen ? "rgba(226,125,57,0.3)" : "var(--sb-line)",
              transition: "all .2s",
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Expanded feature body: big heading + description + graphic + use-case table.
 *  Reused by the accordion and the draggable feature panel. */
export function FeatureBody({ feature }: { feature: Feature }) {
  const Graphic = GRAPHICS[feature.id];
  return (
    <div style={{ padding: "44px 40px 52px" }}>

      {/* Top section: heading + graphic */}
      <div style={{
        display: "flex",
        gap: 64,
        alignItems: "flex-start",
        flexWrap: "wrap",
        marginBottom: 52,
      }}>
        {/* Left: big heading + description */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif",
            fontWeight: 400,
            fontSize: "clamp(44px, 5.2vw, 72px)",
            lineHeight: 1.02,
            color: "var(--sb-ink)",
            margin: "0 0 24px",
            whiteSpace: "pre-line",
            letterSpacing: "-0.02em",
          }}>
            {feature.heading}
          </h2>
          <p style={{
            fontSize: 16.5,
            lineHeight: 1.65,
            color: "var(--sb-ink-2)",
            margin: 0,
            maxWidth: 460,
          }}>
            {feature.description}
          </p>
        </div>

        {/* Right: graphic */}
        <div style={{ flexShrink: 0, width: "min(380px, 100%)" }}>
          {Graphic && <Graphic />}
        </div>
      </div>

      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 0 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--sb-ink-3)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sb-accent)", display: "inline-block" }}/>
          What you can use it for
        </span>
      </div>

      {/* Use-case table */}
      <div style={{ marginTop: 16, border: "1px solid var(--sb-line-2)", borderRadius: 14, overflow: "hidden" }}>
        {feature.useCases.map((uc, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr auto",
              alignItems: "center",
              gap: 16,
              padding: "16px 24px",
              borderBottom: i < feature.useCases.length - 1 ? "1px solid var(--sb-line-2)" : "none",
              background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.012)",
            }}
          >
            <span style={{ color: "var(--sb-accent)", fontSize: 16, fontWeight: 700, lineHeight: 1 }}>→</span>
            <span style={{ fontSize: 14.5, color: "var(--sb-ink)", lineHeight: 1.45 }}>{uc.label}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10.5,
              color: "var(--sb-ink-3)",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
            }}>
              {uc.who}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureAccordion({
  feature,
  isOpen,
  onToggle,
}: {
  feature: Feature;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        border: `1.5px solid ${isOpen ? "var(--sb-line)" : "var(--sb-line-2)"}`,
        borderRadius: 22,
        overflow: "hidden",
        background: isOpen ? "var(--sb-panel-2)" : "transparent",
        transition: "background .22s, border-color .22s",
      }}
    >
      {/* ── Header ── */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          padding: "32px 40px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
        onMouseEnter={e => {
          if (!isOpen) (e.currentTarget.parentElement as HTMLElement).style.borderColor = "var(--sb-line)";
        }}
        onMouseLeave={e => {
          if (!isOpen) (e.currentTarget.parentElement as HTMLElement).style.borderColor = "var(--sb-line-2)";
        }}
      >
        {/* Left content */}
        <FeatureHeaderInfo feature={feature} isOpen={isOpen} />

        {/* Chevron */}
        <svg
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="var(--sb-ink-3)" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .35s cubic-bezier(0.34,1.4,0.64,1)",
            flexShrink: 0,
            marginTop: 6,
          }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {/* ── Body ── */}
      <div style={{
        maxHeight: isOpen ? "1800px" : "0px",
        overflow: "hidden",
        transition: isOpen
          ? "max-height .65s cubic-bezier(0.4,0,0.2,1)"
          : "max-height .3s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {/* Inner divider */}
        <div style={{ borderTop: "1.5px solid var(--sb-line-2)", margin: "0 40px" }}/>

        <FeatureBody feature={feature} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UseCases() {
  const [openId, setOpenId] = useState<string | null>("chat");
  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: "148px 0 72px" }}>
        <div style={wrap}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--sb-ink-3)",
            marginBottom: 20,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--sb-accent)",
              boxShadow: "0 0 12px var(--sb-accent)",
              display: "inline-block",
            }}/>
            Braino For
          </div>
          <h1 style={{
            fontFamily: "'Instrument Serif', serif",
            fontWeight: 400,
            fontSize: "clamp(48px, 7vw, 86px)",
            lineHeight: 1.0,
            margin: "0 0 22px",
            letterSpacing: "-0.025em",
          }}>
            Everything you<br/>can do with{" "}
            <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>Braino.</em>
          </h1>
          <p style={{
            fontSize: 18,
            color: "var(--sb-ink-2)",
            maxWidth: 520,
            lineHeight: 1.6,
            margin: 0,
          }}>
            Four features. Open each one to see every workflow it unlocks — from students and researchers to engineers and entire teams.
          </p>
        </div>
      </section>

      {/* Accordions */}
      <section style={{ padding: "0 0 110px" }}>
        <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* 01 Chat with Page */}
          <FeatureAccordion feature={CHAT} isOpen={openId === "chat"} onToggle={() => toggle("chat")}/>

          {/* 02 Record & Capture */}
          <FeatureAccordion feature={RECORD} isOpen={openId === "record"} onToggle={() => toggle("record")}/>

          {/* Meetings — stems from Record */}
          <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>
            {/* Visual connector */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 48, flexShrink: 0, paddingTop: 4 }}>
              <div style={{ width: 2, flex: 1, background: "var(--sb-line)", borderRadius: 1, minHeight: 20 }}/>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                border: "2px solid var(--sb-line)",
                background: "var(--sb-bg)",
                margin: "2px 0",
                flexShrink: 0,
              }}/>
              <div style={{ width: 2, height: 12, background: "transparent" }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <FeatureAccordion feature={MEETINGS} isOpen={openId === "meetings"} onToggle={() => toggle("meetings")}/>
            </div>
          </div>

          {/* 03 Delegate Tasks */}
          <FeatureAccordion feature={DELEGATE} isOpen={openId === "delegate"} onToggle={() => toggle("delegate")}/>

        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "20px 0 110px" }}>
        <div style={wrap}>
          <div style={{
            background: "#14110E",
            color: "#FBF7F1",
            borderRadius: 24,
            padding: "72px 56px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", right: -80, top: -80, width: 320, height: 320,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(243,154,66,0.45), transparent 60%)",
              filter: "blur(24px)", pointerEvents: "none",
            }}/>
            <div style={{
              position: "absolute", left: -60, bottom: -60, width: 240, height: 240,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(226,125,57,0.25), transparent 60%)",
              filter: "blur(20px)", pointerEvents: "none",
            }}/>
            <h2 style={{
              fontFamily: "'Instrument Serif', serif",
              fontWeight: 400,
              fontSize: "clamp(36px, 4.5vw, 58px)",
              margin: "0 auto 20px",
              maxWidth: 640,
              color: "#FBF7F1",
              position: "relative",
              zIndex: 1,
              lineHeight: 1.05,
            }}>
              Ready to try it?
            </h2>
            <p style={{
              color: "rgba(251,247,241,0.6)",
              maxWidth: 440,
              margin: "0 auto 36px",
              fontSize: 16.5,
              position: "relative",
              zIndex: 1,
              lineHeight: 1.55,
            }}>
              Install Braino, sign in, and every workflow above is available in 30 seconds.
            </p>
            <a
              href={EXTENSION_DOWNLOAD_URL}
              download
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 999,
                fontSize: 14.5, fontWeight: 500,
                background: "#FBF7F1", color: "#1B1713",
                textDecoration: "none",
                transition: "transform .15s",
                position: "relative", zIndex: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>
              </svg>
              Add to Chrome — it's free
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "48px 0", borderTop: "1px solid var(--sb-line-2)" }}>
        <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "baseline", textDecoration: "none" }}>
            <span style={{ fontFamily: "'TNR','Times New Roman',serif", fontStyle: "italic", fontWeight: 400, fontSize: 18, color: "var(--sb-ink)" }}>side</span>
            <span style={{ fontFamily: "'BeVietnam',sans-serif", fontWeight: 800, fontSize: 18, color: "var(--sb-ink)", letterSpacing: "-0.03em" }}>brain</span>
          </Link>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--sb-ink-3)" }}>© 2026 SideBrain · Beta</div>
        </div>
      </footer>
    </div>
  );
}
