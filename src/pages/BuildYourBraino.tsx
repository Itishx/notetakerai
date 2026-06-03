import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

// ── Design tokens — matches site ───────────────────────────────
const wrap: React.CSSProperties = { maxWidth: 1240, margin: "0 auto", padding: "0 32px" };
const CORAL       = "#E8786E";
const CORAL_LIGHT = "#F6A8A2";
const CORAL_DEEP  = "#C9544A";
const FONT_SANS   = "'NeueHaas', 'Neue Haas Grotesk Display', 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO   = "'JetBrains Mono', monospace";

// ── Pricing data ───────────────────────────────────────────────
const X_AUTO_TIERS = [
  { tier: "Basic",    replies: 500,  price: 35  },
  { tier: "Standard", replies: 1000, price: 55  },
  { tier: "Growth",   replies: 2500, price: 89  },
  { tier: "Pro",      replies: 5000, price: 149 },
] as const;

const X_MGMT_TIERS = [
  { tier: "Starter", posts: 30   as number | null, price: 39  },
  { tier: "Regular", posts: 90   as number | null, price: 69  },
  { tier: "Full",    posts: null,                  price: 109 },
] as const;

const INTEL_MILESTONES = [
  { queries: 100,  price: 5  },
  { queries: 500,  price: 10 },
  { queries: 1000, price: 15 },
  { queries: 2500, price: 22 },
  { queries: 5000, price: 30 },
] as const;

const VOICE_OPTIONS = [
  { hours: 1,  price: 3,  label: "1 hr / month"  },
  { hours: 5,  price: 9,  label: "5 hrs / month"  },
  { hours: 20, price: 19, label: "20 hrs / month" },
  { hours: 50, price: 39, label: "50 hrs / month" },
] as const;

const DELEGATE_OPTIONS = [
  { tasks: 25  as number | null, price: 0,  label: "Light",    sub: "25 tasks / month" },
  { tasks: 150 as number | null, price: 8,  label: "Regular",  sub: "150 tasks / month" },
  { tasks: null,                 price: 18, label: "Unlimited", sub: "No cap" },
];

const INTEGRATIONS_LIST = [
  { id: "notion",  name: "Notion",       desc: "Sync notes to any Notion page"     },
  { id: "gdrive",  name: "Google Drive", desc: "Save transcripts to Drive folders"  },
  { id: "spotify", name: "Spotify",      desc: "Add music context to your sessions" },
];

// ── Brain visualization ────────────────────────────────────────
// Nodes around a 900×640 viewBox. Brain mascot centered at (450, 315).
const MODULES = [
  { key: "intel",        label: "Intelligence", lobe: "Frontal Lobe",   cx: 158, cy: 110, d1: "1.4s", d2: "2.2s" },
  { key: "voice",        label: "Voice",         lobe: "Temporal Lobe",  cx: 745, cy: 110, d1: "1.7s", d2: "2.5s" },
  { key: "delegate",     label: "Delegate",      lobe: "Parietal Lobe",  cx: 818, cy: 348, d1: "1.3s", d2: "2.0s" },
  { key: "integrations", label: "Integrations",  lobe: "Occipital Lobe", cx: 650, cy: 530, d1: "1.6s", d2: "2.3s" },
  { key: "xAuto",        label: "X",             lobe: "Cerebellum",     cx: 178, cy: 528, d1: "1.5s", d2: "2.4s" },
  { key: "basics",       label: "Basics",        lobe: "Brainstem",      cx: 450, cy: 575, d1: "1.9s", d2: "2.7s" },
] as const;

type ModuleKey = typeof MODULES[number]["key"];

const AXONS = [
  "M 450,315 C 378,270 288,192 158,110",
  "M 450,315 C 532,270 642,192 745,110",
  "M 450,315 C 582,315 710,330 818,348",
  "M 450,315 C 525,400 592,468 650,530",
  "M 450,315 C 368,402 278,462 178,528",
  "M 450,315 C 432,400 465,488 450,575",
] as const;

const AMBIENT = [
  {cx:65,cy:192,r:1.5,d:"4.2s",b:"0s"},   {cx:125,cy:448,r:1,d:"5.1s",b:"1.2s"},
  {cx:838,cy:195,r:1.5,d:"3.8s",b:"0.6s"},{cx:796,cy:494,r:1,d:"4.7s",b:"2.1s"},
  {cx:310,cy:562,r:1.8,d:"5.5s",b:"0.3s"},{cx:595,cy:554,r:1.5,d:"4.3s",b:"1.8s"},
  {cx:42,cy:330,r:1,d:"6.2s",b:"0.9s"},   {cx:868,cy:372,r:1,d:"5.8s",b:"1.5s"},
  {cx:408,cy:52,r:1.8,d:"3.5s",b:"0.4s"}, {cx:514,cy:62,r:1.5,d:"4.9s",b:"2.4s"},
  {cx:260,cy:140,r:1,d:"5.3s",b:"0.7s"},  {cx:678,cy:145,r:1.5,d:"4.1s",b:"1.1s"},
  {cx:82,cy:62,r:1,d:"6.5s",b:"3.1s"},    {cx:842,cy:72,r:1,d:"5.0s",b:"2.8s"},
  {cx:455,cy:38,r:1.5,d:"4.6s",b:"1.4s"},{cx:708,cy:588,r:1,d:"5.8s",b:"0.2s"},
  {cx:230,cy:580,r:1,d:"4.4s",b:"2.6s"}, {cx:48,cy:478,r:1.2,d:"5.6s",b:"1.9s"},
  {cx:870,cy:492,r:1.2,d:"4.8s",b:"0.5s"},
] as const;

// ── State types ────────────────────────────────────────────────
type IntelTier   = "standard" | "advanced" | "experimental";
type IntelSel    = { tier: IntelTier; queriesPerMonth?: number; price: number } | null;
type VoiceSel    = { hours: number; price: number; isCustom?: boolean } | null;
type DelegateSel = { tasks: number | null; price: number } | null;
type XAutoSel    = { replies: number; price: number; tier: string } | null;
type XMgmtSel    = { posts: number | null; price: number; tier: string } | null;
type BasicsSel   = { aboutMe: string; persistMemory: boolean } | null;

// ── Shared modal UI pieces ─────────────────────────────────────

function FreeBlock({ items }: { items: string[] }) {
  return (
    <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(76,175,125,0.07)", border: "1px solid rgba(76,175,125,0.18)", marginBottom: 20 }}>
      <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--sb-ok)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l4 4L19 6"/></svg>
        Included free
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: i < items.length - 1 ? 6 : 0 }}>
          <span style={{ color: "var(--sb-ok)", marginTop: 1, flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12l4 4L19 6"/></svg>
          </span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13.5, color: "var(--sb-ink-2)", lineHeight: 1.45 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function UpgradeLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--sb-ink-4)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ flex: 1, height: 1, background: "var(--sb-line)" }} />
      {children}
      <span style={{ flex: 1, height: 1, background: "var(--sb-line)" }} />
    </div>
  );
}

function ModalOptionCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "13px 16px", borderRadius: 12,
        border: selected ? `1.5px solid ${CORAL}` : "1px solid var(--sb-line)",
        background: selected ? `${CORAL}0e` : "var(--sb-bg)",
        cursor: "pointer",
        boxShadow: selected ? `0 0 0 3px ${CORAL}18` : "none",
        transition: "all .15s",
        marginBottom: 8,
      }}
    >
      {children}
    </button>
  );
}

function ModalFooter({ onFree, onAdd, addLabel, addDisabled }: {
  onFree: () => void; onAdd: () => void; addLabel: string; addDisabled: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
      <button
        onClick={onFree}
        style={{ flex: 1, padding: "12px 0", borderRadius: 999, fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 400, color: "var(--sb-ink-3)", background: "transparent", border: "1px solid var(--sb-line)", cursor: "pointer", transition: "all .15s" }}
        onMouseEnter={e => { e.currentTarget.style.color = "var(--sb-ink)"; e.currentTarget.style.borderColor = "var(--sb-line-2)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "var(--sb-ink-3)"; e.currentTarget.style.borderColor = "var(--sb-line)"; }}
      >
        Continue free
      </button>
      <button
        onClick={onAdd}
        disabled={addDisabled}
        style={{ flex: 2, padding: "12px 0", borderRadius: 999, fontFamily: "'Inter', sans-serif", fontSize: 13.5, fontWeight: 500, color: addDisabled ? "var(--sb-ink-4)" : "var(--sb-on-ink)", background: addDisabled ? "var(--sb-line)" : "var(--sb-ink)", border: "none", cursor: addDisabled ? "default" : "pointer", transition: "opacity .15s" }}
        onMouseEnter={e => { if (!addDisabled) e.currentTarget.style.opacity = "0.82"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        {addLabel}
      </button>
    </div>
  );
}

// ── Per-module modal content ───────────────────────────────────

function IntelModalContent({ current, onSave, onFree }: {
  current: IntelSel;
  onSave: (s: IntelSel) => void;
  onFree: () => void;
}) {
  const [tier, setTier] = useState<IntelTier>(current?.tier ?? "standard");
  const [idx,  setIdx]  = useState(() => {
    if (!current || current.tier === "standard") return [2];
    const f = INTEL_MILESTONES.findIndex(m => m.queries === current.queriesPerMonth);
    return [f >= 0 ? f : 2];
  });
  const m = INTEL_MILESTONES[Math.max(0, Math.min(idx[0], INTEL_MILESTONES.length - 1))];

  return (
    <div>
      <FreeBlock items={["Standard AI (GPT-mini) — fast, capable", "10 chat questions / day", "Session memory only"]} />

      <UpgradeLabel>Want more?</UpgradeLabel>

      <ModalOptionCard selected={tier === "advanced"} onClick={() => setTier("advanced")}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--sb-ink)" }}>Advanced</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--sb-ink-3)", marginTop: 2 }}>Claude Sonnet · deep reasoning · persistent memory</div>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: tier === "advanced" ? CORAL : "var(--sb-ink-3)" }}>
            {tier === "advanced" ? `$${m.price}/mo` : "Set limit"}
          </div>
        </div>
      </ModalOptionCard>

      <ModalOptionCard selected={tier === "experimental"} onClick={() => setTier("experimental")}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--sb-ink)" }}>Experimental</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.1em", background: "var(--sb-accent)", color: "#fff", padding: "2px 6px", borderRadius: 999 }}>Beta</span>
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--sb-ink-3)", marginTop: 2 }}>Frontier models · latest, most capable</div>
          </div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: tier === "experimental" ? CORAL : "var(--sb-ink-3)" }}>
            {tier === "experimental" ? `$${m.price}/mo` : "Set limit"}
          </div>
        </div>
      </ModalOptionCard>

      {(tier === "advanced" || tier === "experimental") && (
        <div style={{ marginTop: 16, padding: "18px 18px 14px", background: "var(--sb-bg)", borderRadius: 12, border: "1px solid var(--sb-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--sb-ink-4)", marginBottom: 3 }}>Queries / month</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, lineHeight: 1, color: "var(--sb-ink)" }}>{m.queries.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--sb-ink-4)", marginBottom: 3 }}>Monthly</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, lineHeight: 1, color: CORAL }}>${m.price}</div>
            </div>
          </div>
          <Slider value={idx} onValueChange={setIdx} min={0} max={INTEL_MILESTONES.length - 1} step={1} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {INTEL_MILESTONES.map((ml, i) => (
              <span key={i} style={{ fontFamily: FONT_MONO, fontSize: 9, color: i === idx[0] ? CORAL : "var(--sb-ink-4)" }}>
                {ml.queries >= 1000 ? `${ml.queries/1000}k` : ml.queries}
              </span>
            ))}
          </div>
        </div>
      )}

      <ModalFooter
        onFree={() => { onSave({ tier: "standard", price: 0 }); onFree(); }}
        onAdd={() => { if (tier !== "standard") onSave({ tier, queriesPerMonth: m.queries, price: m.price }); onFree(); }}
        addLabel={tier === "standard" ? "Select an upgrade above" : `Add ${tier} — $${m.price}/mo`}
        addDisabled={tier === "standard"}
      />
    </div>
  );
}

function VoiceModalContent({ current, onSave, onFree }: {
  current: VoiceSel; onSave: (s: VoiceSel) => void; onFree: () => void;
}) {
  const [sel, setSel] = useState<number | null>(current?.hours ?? null);
  const [customHrs, setCustomHrs] = useState(current?.isCustom ? String(current.hours) : "");
  const [showCustom, setShowCustom] = useState(current?.isCustom ?? false);
  const selected = VOICE_OPTIONS.find(o => o.hours === sel);
  const customPrice = customHrs ? Math.round(Number(customHrs) * 0.8) : 0;

  return (
    <div>
      <FreeBlock items={["5 minutes of voice / day", "English language only", "Default Braino voice"]} />

      <UpgradeLabel>More voice time</UpgradeLabel>

      {VOICE_OPTIONS.map(opt => (
        <ModalOptionCard key={opt.hours} selected={sel === opt.hours && !showCustom} onClick={() => { setSel(opt.hours); setShowCustom(false); }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, color: "var(--sb-ink)" }}>{opt.label}</span>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "var(--sb-ink)" }}>${opt.price}/mo</span>
          </div>
        </ModalOptionCard>
      ))}

      <ModalOptionCard selected={showCustom} onClick={() => setShowCustom(true)}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, color: "var(--sb-ink)" }}>Custom</span>
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--sb-ink-3)" }}>Set your own →</span>
        </div>
      </ModalOptionCard>

      {showCustom && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, marginBottom: 8 }}>
          <input type="number" value={customHrs} onChange={e => setCustomHrs(e.target.value)} placeholder="e.g. 30" min={1} max={500}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--sb-line)", fontFamily: "'Inter', sans-serif", fontSize: 15, background: "var(--sb-bg)", color: "var(--sb-ink)", outline: "none" }}
            onFocus={e => (e.currentTarget.style.borderColor = CORAL)} onBlur={e => (e.currentTarget.style.borderColor = "var(--sb-line)")} />
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--sb-ink-3)", whiteSpace: "nowrap" }}>hrs / mo</span>
          {customHrs && Number(customHrs) > 0 && (
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: CORAL, whiteSpace: "nowrap" }}>${customPrice}/mo</span>
          )}
        </div>
      )}

      <ModalFooter
        onFree={() => { onSave({ hours: 0, price: 0 }); onFree(); }}
        onAdd={() => {
          if (showCustom && Number(customHrs) > 0) { onSave({ hours: Number(customHrs), price: customPrice, isCustom: true }); onFree(); }
          else if (selected) { onSave({ hours: selected.hours, price: selected.price }); onFree(); }
        }}
        addLabel={
          showCustom && customHrs && Number(customHrs) > 0 ? `Add ${customHrs} hrs — $${customPrice}/mo` :
          selected ? `Add ${selected.label} — $${selected.price}/mo` : "Select an option above"
        }
        addDisabled={!selected && !(showCustom && Number(customHrs) > 0)}
      />
    </div>
  );
}

function DelegateModalContent({ current, onSave, onFree }: {
  current: DelegateSel; onSave: (s: DelegateSel) => void; onFree: () => void;
}) {
  const [sel, setSel] = useState<number>(DELEGATE_OPTIONS.findIndex(o => o.tasks === current?.tasks && o.price === current?.price));

  return (
    <div>
      <FreeBlock items={["25 Delegate tasks / month", "Web browsing, form filling, automation", "Full supervision mode"]} />

      <UpgradeLabel>More tasks</UpgradeLabel>

      {DELEGATE_OPTIONS.slice(1).map((opt, i) => (
        <ModalOptionCard key={opt.label} selected={sel === i + 1} onClick={() => setSel(i + 1)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--sb-ink)", marginBottom: 2 }}>{opt.label}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--sb-ink-3)" }}>{opt.sub}</div>
            </div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "var(--sb-ink)" }}>${opt.price}/mo</div>
          </div>
        </ModalOptionCard>
      ))}

      <ModalFooter
        onFree={() => { onSave({ tasks: 25, price: 0 }); onFree(); }}
        onAdd={() => { const o = DELEGATE_OPTIONS[sel]; if (o) { onSave({ tasks: o.tasks, price: o.price }); onFree(); } }}
        addLabel={sel > 0 ? `Add ${DELEGATE_OPTIONS[sel]?.label} — $${DELEGATE_OPTIONS[sel]?.price}/mo` : "Select an option above"}
        addDisabled={sel <= 0}
      />
    </div>
  );
}

function IntegrationsModalContent({ connected, onToggle, onDone }: {
  connected: string[]; onToggle: (id: string) => void; onDone: () => void;
}) {
  return (
    <div>
      <FreeBlock items={["All integrations are completely free", "Full sync included with any Braino plan", "Connect as many as you like"]} />

      <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--sb-ink-4)", marginBottom: 12 }}>
        Connect your apps
      </div>

      {INTEGRATIONS_LIST.map(intg => {
        const isOn = connected.includes(intg.id);
        return (
          <div key={intg.id} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px", marginBottom: 8, borderRadius: 12,
            border: isOn ? `1.5px solid ${CORAL}` : "1px solid var(--sb-line)",
            background: isOn ? `${CORAL}0e` : "var(--sb-bg)",
            transition: "all .15s",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--sb-ink)", marginBottom: 2 }}>{intg.name}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: "var(--sb-ink-3)" }}>{intg.desc}</div>
            </div>
            <button
              onClick={() => onToggle(intg.id)}
              style={{
                padding: "7px 16px", borderRadius: 999,
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
                background: isOn ? CORAL : "var(--sb-ink)", color: "#fff",
                border: "none", cursor: "pointer", transition: "opacity .15s",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              {isOn ? "Connected ✓" : "Connect"}
            </button>
          </div>
        );
      })}

      <button
        onClick={onDone}
        style={{ width: "100%", marginTop: 16, padding: "13px 0", borderRadius: 999, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, background: "var(--sb-ink)", color: "var(--sb-on-ink)", border: "none", cursor: "pointer", transition: "opacity .15s" }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        {connected.length > 0 ? `Done — ${connected.length} connected` : "Skip for now"}
      </button>
    </div>
  );
}

function XModalContent({ currentAuto, currentMgmt, onSaveAuto, onSaveMgmt, onClose }: {
  currentAuto: XAutoSel; currentMgmt: XMgmtSel;
  onSaveAuto: (s: XAutoSel) => void; onSaveMgmt: (s: XMgmtSel) => void;
  onClose: () => void;
}) {
  const initAutoIdx = currentAuto ? X_AUTO_TIERS.findIndex(t => t.replies === currentAuto.replies) : 0;
  const [autoIdx,  setAutoIdx]  = useState([Math.max(0, initAutoIdx)]);
  const [mgmtIdx,  setMgmtIdx]  = useState<number | null>(
    currentMgmt ? X_MGMT_TIERS.findIndex(t => t.price === currentMgmt.price) : null
  );
  const [autoOn,   setAutoOn]   = useState(!!currentAuto && currentAuto.price > 0);
  const [mgmtOn,   setMgmtOn]   = useState(!!currentMgmt);

  const autoTier = X_AUTO_TIERS[autoIdx[0]];
  const mgmtTier = mgmtIdx !== null ? X_MGMT_TIERS[mgmtIdx] : X_MGMT_TIERS[0];
  const combinedPrice = (autoOn ? autoTier.price : 0) + (mgmtOn ? mgmtTier.price : 0);

  function handleAdd() {
    if (autoOn) onSaveAuto({ replies: autoTier.replies, price: autoTier.price, tier: autoTier.tier });
    else onSaveAuto({ replies: 93, price: 0, tier: "Free preview" });
    if (mgmtOn) onSaveMgmt({ posts: mgmtTier.posts, price: mgmtTier.price, tier: mgmtTier.tier });
    else onSaveMgmt(null);
    onClose();
  }

  return (
    <div>
      <FreeBlock items={["93 auto-replies / month — preview", "Persona-matched voice and tone", "3-hour sessions · 1 reply / min"]} />

      {/* ── X Automation ────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setAutoOn(v => !v)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, border: autoOn ? `1.5px solid ${CORAL}` : "1px solid var(--sb-line)", background: autoOn ? `${CORAL}0e` : "var(--sb-bg)", cursor: "pointer", marginBottom: autoOn ? 10 : 0, transition: "all .15s" }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--sb-ink)" }}>X Automation</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "var(--sb-ink-3)", marginTop: 2 }}>Auto-reply to your timeline as you</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {autoOn && <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: CORAL }}>${autoTier.price}/mo</span>}
            <div style={{ width: 38, height: 21, borderRadius: 999, background: autoOn ? CORAL : "var(--sb-line)", position: "relative", flexShrink: 0, transition: "background .2s" }}>
              <div style={{ width: 15, height: 15, borderRadius: 999, background: "#fff", position: "absolute", top: 3, left: autoOn ? 20 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        </button>

        {autoOn && (
          <div style={{ padding: "14px 14px 12px", background: "var(--sb-bg)", borderRadius: 10, border: "1px solid var(--sb-line-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--sb-ink-4)", marginBottom: 2 }}>Replies / month</div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, lineHeight: 1, color: "var(--sb-ink)" }}>{autoTier.replies.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "var(--sb-ink-4)", marginBottom: 2 }}>Monthly</div>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 30, lineHeight: 1, color: CORAL }}>${autoTier.price}</div>
              </div>
            </div>
            <Slider value={autoIdx} onValueChange={setAutoIdx} min={0} max={X_AUTO_TIERS.length - 1} step={1} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              {X_AUTO_TIERS.map((t, i) => (
                <span key={i} style={{ fontFamily: FONT_MONO, fontSize: 9, color: i === autoIdx[0] ? CORAL : "var(--sb-ink-4)" }}>
                  {t.replies >= 1000 ? `${t.replies/1000}k` : t.replies}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── X Account Management ────────────────────────────── */}
      <div style={{ marginBottom: 4 }}>
        <button
          onClick={() => { setMgmtOn(v => !v); if (mgmtIdx === null) setMgmtIdx(0); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 12, border: mgmtOn ? `1.5px solid ${CORAL}` : "1px solid var(--sb-line)", background: mgmtOn ? `${CORAL}0e` : "var(--sb-bg)", cursor: "pointer", marginBottom: mgmtOn ? 10 : 0, transition: "all .15s" }}
        >
          <div style={{ textAlign: "left" }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--sb-ink)" }}>X Account Management</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "var(--sb-ink-3)", marginTop: 2 }}>Post, schedule, and grow your X account</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {mgmtOn && <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: CORAL }}>${mgmtTier.price}/mo</span>}
            <div style={{ width: 38, height: 21, borderRadius: 999, background: mgmtOn ? CORAL : "var(--sb-line)", position: "relative", flexShrink: 0, transition: "background .2s" }}>
              <div style={{ width: 15, height: 15, borderRadius: 999, background: "#fff", position: "absolute", top: 3, left: mgmtOn ? 20 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        </button>

        {mgmtOn && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {X_MGMT_TIERS.map((t, i) => (
              <ModalOptionCard key={t.tier} selected={mgmtIdx === i} onClick={() => setMgmtIdx(i)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--sb-ink)", marginBottom: 2 }}>{t.tier}</div>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "var(--sb-ink-3)" }}>{t.posts ? `${t.posts} posts / month` : "Unlimited posts"}</div>
                  </div>
                  <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 18, color: "var(--sb-ink)" }}>${t.price}/mo</div>
                </div>
              </ModalOptionCard>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={() => { onSaveAuto({ replies: 93, price: 0, tier: "Free preview" }); onSaveMgmt(null); onClose(); }}
          style={{ flex: 1, padding: "11px 0", borderRadius: 999, fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--sb-ink-3)", background: "transparent", border: "1px solid var(--sb-line)", cursor: "pointer" }}>
          Continue free
        </button>
        <button onClick={handleAdd}
          disabled={!autoOn && !mgmtOn}
          style={{ flex: 2, padding: "11px 0", borderRadius: 999, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: (!autoOn && !mgmtOn) ? "var(--sb-ink-4)" : "var(--sb-on-ink)", background: (!autoOn && !mgmtOn) ? "var(--sb-line)" : "var(--sb-ink)", border: "none", cursor: (!autoOn && !mgmtOn) ? "default" : "pointer", transition: "opacity .15s" }}>
          {!autoOn && !mgmtOn ? "Enable a feature above" : `Add X — $${combinedPrice}/mo`}
        </button>
      </div>
    </div>
  );
}

// ── Basics modal ──────────────────────────────────────────────

function BasicsModalContent({ current, onSave, onClose }: {
  current: BasicsSel; onSave: (s: BasicsSel) => void; onClose: () => void;
}) {
  const [aboutMe,        setAboutMe]        = useState(current?.aboutMe ?? "");
  const [persistMemory,  setPersistMemory]  = useState(current?.persistMemory ?? true);

  return (
    <div>
      <FreeBlock items={[
        "Persistent memory across sessions",
        "Personal context Braino uses in every chat",
        "Also editable anytime from Dashboard → Settings",
      ]} />

      {/* About me */}
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--sb-ink-4)", display: "block", marginBottom: 8 }}>
          Tell Braino about you
        </label>
        <textarea
          value={aboutMe}
          onChange={e => setAboutMe(e.target.value)}
          rows={4}
          placeholder={"e.g. I'm a product designer in NYC, building a SaaS startup. I mostly use Braino for research, meeting notes, and X drafts."}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "12px 14px", borderRadius: 10,
            border: "1px solid var(--sb-line)",
            fontFamily: "'Inter', sans-serif", fontSize: 13.5,
            lineHeight: 1.55, color: "var(--sb-ink)",
            background: "var(--sb-bg)", resize: "vertical",
            outline: "none", transition: "border-color .15s",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "#2DD4BF")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--sb-line)")}
        />
        <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: "var(--sb-ink-4)", marginTop: 5, letterSpacing: "0.06em" }}>
          Stored privately · only used to personalise responses
        </div>
      </div>

      {/* Memory toggle */}
      <button
        onClick={() => setPersistMemory(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "13px 15px", borderRadius: 12, marginBottom: 4,
          border: persistMemory ? "1.5px solid #2DD4BF" : "1px solid var(--sb-line)",
          background: persistMemory ? "#2DD4BF14" : "var(--sb-bg)",
          cursor: "pointer", transition: "all .15s",
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--sb-ink)" }}>Remember across sessions</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10.5, color: "var(--sb-ink-3)", marginTop: 2 }}>Braino retains context between conversations</div>
        </div>
        <div style={{ width: 38, height: 21, borderRadius: 999, background: persistMemory ? "#2DD4BF" : "var(--sb-line)", position: "relative", flexShrink: 0, transition: "background .2s" }}>
          <div style={{ width: 15, height: 15, borderRadius: 999, background: "#fff", position: "absolute", top: 3, left: persistMemory ? 20 : 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </div>
      </button>

      <button
        onClick={() => { onSave({ aboutMe: aboutMe.trim(), persistMemory }); onClose(); }}
        style={{ width: "100%", marginTop: 20, padding: "13px 0", borderRadius: 999, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, background: "var(--sb-ink)", color: "var(--sb-on-ink)", border: "none", cursor: "pointer", transition: "opacity .15s" }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.82")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        Save my basics
      </button>
    </div>
  );
}

// ── Brain visualization ────────────────────────────────────────

function BrainScene({
  saved, openModal, hoveredNode, setHoveredNode,
}: {
  saved: Set<ModuleKey>;
  openModal: (i: number) => void;
  hoveredNode: number | null;
  setHoveredNode: (i: number | null) => void;
}) {
  return (
    <svg
      viewBox="0 0 900 640"
      width="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", maxWidth: 960, margin: "0 auto", display: "block" }}
    >
      <defs>
        <filter id="bsc-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bsc-glow-lg" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bsc-brain-halo" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <radialGradient id="bsc-center-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={CORAL} stopOpacity="0.22"/>
          <stop offset="60%" stopColor={CORAL} stopOpacity="0.06"/>
          <stop offset="100%" stopColor={CORAL} stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Ambient neurons */}
      {AMBIENT.map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill={CORAL_LIGHT}>
          <animate attributeName="opacity" values="0.06;0.26;0.06" dur={dot.d} begin={dot.b} repeatCount="indefinite"/>
          <animate attributeName="r" values={`${dot.r};${dot.r * 1.5};${dot.r}`} dur={dot.d} begin={dot.b} repeatCount="indefinite"/>
        </circle>
      ))}

      {/* Heartbeat rings */}
      <circle cx="450" cy="318" r="90" fill="none" stroke={CORAL} strokeWidth="0.6">
        <animate attributeName="r" values="90;310" dur="4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0" dur="4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="450" cy="318" r="90" fill="none" stroke={CORAL} strokeWidth="0.4">
        <animate attributeName="r" values="90;220" dur="4s" begin="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.2;0" dur="4s" begin="2s" repeatCount="indefinite"/>
      </circle>

      {/* Ambient center glow */}
      <ellipse cx="450" cy="318" rx="170" ry="150" fill="url(#bsc-center-glow)"/>

      {/* Axons + nodes — all unified coral */}
      {MODULES.map((mod, i) => {
        const isSaved   = saved.has(mod.key);
        const isHovered = hoveredNode === i;
        const isLit     = isSaved || isHovered;

        return (
          <g key={mod.key}>
            {/* Base dim axon */}
            <path d={AXONS[i]} fill="none" stroke={CORAL} strokeWidth="1" opacity="0.10"/>

            {/* Lit axon */}
            {isLit && (<>
              <path d={AXONS[i]} fill="none" stroke={CORAL} strokeWidth="3.5" opacity={isSaved ? 0.6 : 0.35} filter="url(#bsc-glow)"/>
              <path d={AXONS[i]} fill="none" stroke={isSaved ? CORAL : CORAL_LIGHT} strokeWidth="0.75" opacity="0.9"/>
            </>)}

            {/* Sparks */}
            {isLit && (<>
              <circle r="2.8" fill={isSaved ? CORAL_LIGHT : "#fff"} opacity="0.95" filter="url(#bsc-glow)">
                <animateMotion dur={mod.d1} repeatCount="indefinite" path={AXONS[i]}/>
              </circle>
              <circle r="1.5" fill={CORAL_LIGHT} opacity="0.75">
                <animateMotion dur={mod.d2} begin="0.55s" repeatCount="indefinite" path={AXONS[i]}/>
              </circle>
            </>)}
            {isSaved && (
              <circle r="1.2" fill={CORAL} opacity="0.6" filter="url(#bsc-glow)">
                <animateMotion dur={`${parseFloat(mod.d1) + 0.9}s`} begin="1.1s" repeatCount="indefinite" path={AXONS[i]}/>
              </circle>
            )}

            {/* Clickable group */}
            <g onClick={() => openModal(i)} onMouseEnter={() => setHoveredNode(i)} onMouseLeave={() => setHoveredNode(null)} style={{ cursor: "pointer" }}>
              <circle cx={mod.cx} cy={mod.cy} r={32} fill="transparent"/>

              {isLit && (
                <circle cx={mod.cx} cy={mod.cy} r={isSaved ? 30 : 22} fill={`${CORAL}20`} filter="url(#bsc-glow-lg)"/>
              )}

              <circle
                cx={mod.cx} cy={mod.cy}
                r={isSaved ? 14 : isHovered ? 13 : 8}
                fill={isSaved ? CORAL : isHovered ? `${CORAL}55` : "#1C1006"}
                stroke={isLit ? CORAL : `${CORAL}45`}
                strokeWidth={isLit ? "1.5" : "1"}
                filter={isLit ? "url(#bsc-glow)" : undefined}
              >
                {isHovered && !isSaved && (
                  <animate attributeName="r" values="13;16;13" dur="1.6s" repeatCount="indefinite"/>
                )}
              </circle>

              {isSaved && (
                <text x={mod.cx} y={mod.cy + 4.5} textAnchor="middle" fontSize="11" fill="#fff" fontFamily="'Inter', sans-serif" fontWeight="700">✓</text>
              )}

              <text x={mod.cx} y={mod.cy + 30} textAnchor="middle" fontSize="9" fill={isLit ? CORAL : `${CORAL_LIGHT}38`} fontFamily={FONT_MONO} letterSpacing="0.1em">
                {String(i + 1).padStart(2, "0")}
              </text>
              <text x={mod.cx} y={mod.cy + 43} textAnchor="middle" fontSize="12.5" fill={isLit ? "#F2EDE6" : `${CORAL_LIGHT}50`} fontFamily="'Inter', sans-serif" fontWeight={isLit ? "500" : "400"}>
                {mod.label}
              </text>
              <text x={mod.cx} y={mod.cy + 57} textAnchor="middle" fontSize="9.5" fill={isLit ? `${CORAL}bb` : `${CORAL_LIGHT}25`} fontFamily={FONT_MONO} letterSpacing="0.07em">
                {mod.lobe}
              </text>
            </g>
          </g>
        );
      })}

      {/* Brain mascot — glow layer */}
      <image href="/favicon.svg" x="325" y="193" width="250" height="250"
        filter="url(#bsc-brain-halo)" opacity="0.6"
        style={{ transformOrigin: "50% 50%", transformBox: "fill-box" as React.CSSProperties["transformBox"], animation: "sbOrbBreathe 3.2s ease-in-out infinite" }}
      />
      {/* Brain mascot — sharp layer */}
      <image href="/favicon.svg" x="325" y="193" width="250" height="250"
        style={{ transformOrigin: "50% 50%", transformBox: "fill-box" as React.CSSProperties["transformBox"], animation: "sbOrbBreathe 3.2s ease-in-out infinite" }}
      />
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function BuildYourBraino() {
  const [intel,        setIntel]        = useState<IntelSel>(null);
  const [voice,        setVoice]        = useState<VoiceSel>(null);
  const [delegate,     setDelegate]     = useState<DelegateSel>(null);
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [xAuto,        setXAuto]        = useState<XAutoSel>(null);
  const [xMgmt,        setXMgmt]        = useState<XMgmtSel>(null);
  const [basics,       setBasics]       = useState<BasicsSel>(null);

  const [saved,        setSaved]        = useState<Set<ModuleKey>>(new Set());
  const [activeModal,  setActiveModal]  = useState<number | null>(null);
  const [hoveredNode,  setHoveredNode]  = useState<number | null>(null);
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Hide the global floating mascot — it conflicts with the brain visualization
  useEffect(() => {
    const el = document.getElementById("sb-brain-mascot-wrapper");
    if (el) el.style.display = "none";
    return () => { if (el) el.style.display = ""; };
  }, []);

  function saveModule(key: ModuleKey) {
    setSaved(prev => new Set(prev).add(key));
  }

  function openModal(i: number) {
    setActiveModal(i);
  }

  function closeModal() {
    setActiveModal(null);
  }

  const paidTotal = (intel && intel.tier !== "standard" ? intel.price : 0)
    + (voice && voice.hours > 0 ? voice.price : 0)
    + (delegate ? delegate.price : 0)
    + (xAuto && xAuto.price > 0 ? xAuto.price : 0)
    + (xMgmt ? xMgmt.price : 0);

  const hasSaved = saved.size > 0;

  const modalTitle = activeModal !== null
    ? (activeModal === 4 ? "X — Automation & Management" : activeModal === 5 ? "Basics" : MODULES[activeModal].label)
    : "";
  const modalLobe  = activeModal !== null ? MODULES[activeModal].lobe : "";

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh", overflowX: "hidden" }}>
      <Navbar />

      <style>{`
        @keyframes byb-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(7px); }
        }
      `}</style>

      {/* ── BRAIN SECTION (full page) ─────────────────────────── */}
      <section style={{
        padding: isMobile ? "64px 0 56px" : `96px 0 ${hasSaved ? 120 : 80}px`,
        background: "linear-gradient(180deg, #0E0A07 0%, #130D09 60%, #0E0A07 100%)",
        overflow: "hidden", position: "relative",
        minHeight: isMobile ? "auto" : "100vh",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}>
        <div style={{ ...wrap, padding: isMobile ? "0 16px" : "0 32px", textAlign: "center" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: isMobile ? 10 : 11, letterSpacing: "0.2em", textTransform: "uppercase", color: `${CORAL_LIGHT}70`, marginBottom: 16 }}>
            Customize · Configure · Build
          </div>
          <h1 style={{ fontFamily: FONT_SANS, fontWeight: 700, fontSize: isMobile ? "38px" : "clamp(48px, 7vw, 96px)", lineHeight: 0.94, letterSpacing: "-0.03em", color: "#fff", marginBottom: 14 }}>
            Build Your Braino.
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: isMobile ? 14 : "clamp(14px, 1.5vw, 17px)", color: `${CORAL_LIGHT}70`, marginBottom: isMobile ? 24 : 52, lineHeight: 1.55 }}>
            Everything is free to start. Click a lobe to see what's included — and optionally upgrade it.
          </p>

          <div style={isMobile ? { overflowX: "auto", overflowY: "visible", marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 } : {}}>
            <div style={isMobile ? { minWidth: 480 } : {}}>
              <BrainScene
                saved={saved}
                openModal={openModal}
                hoveredNode={hoveredNode}
                setHoveredNode={setHoveredNode}
              />
            </div>
          </div>

          {/* Status */}
          <div style={{ marginTop: 28, minHeight: 26 }}>
            {saved.size === 0 ? (
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: `${CORAL_LIGHT}38` }}>
                No regions configured yet — click a lobe above
              </span>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: `${CORAL_LIGHT}70` }}>
                  {saved.size} / 6 regions active
                </span>
              </div>
            )}
          </div>

          {/* Build It CTA — appears once any module is saved */}
          {hasSaved && (
            <div style={{ marginTop: 28 }}>
              <Link
                to="/auth?redirect=/premium"
                style={{
                  display: isMobile ? "block" : "inline-flex",
                  textAlign: "center",
                  alignItems: "center",
                  padding: isMobile ? "15px 0" : "14px 32px",
                  borderRadius: 999,
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 500,
                  background: CORAL, color: "#fff", textDecoration: "none",
                  transition: "opacity .15s", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                Build It →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── STICKY SUMMARY BAR ──────────────────────────────────── */}
      {hasSaved && activeModal === null && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 90, background: "var(--sb-ink)", borderRadius: 999,
          padding: isMobile ? "10px 16px" : "12px 14px 12px 18px",
          display: "flex", alignItems: "center", gap: isMobile ? 10 : 14,
          boxShadow: "0 8px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.15)",
          maxWidth: "calc(100vw - 32px)",
        }}>
          {/* On mobile show count pill; on desktop show full chips */}
          {isMobile ? (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
              {saved.size} / 6 configured
            </span>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {MODULES.filter(m => saved.has(m.key)).map(m => {
                const priceMap: Record<ModuleKey, number> = {
                  intel: intel && intel.tier !== "standard" ? intel.price : 0,
                  voice: voice && voice.hours > 0 ? voice.price : 0,
                  delegate: delegate?.price ?? 0,
                  integrations: 0,
                  xAuto: (xAuto && xAuto.price > 0 ? xAuto.price : 0) + (xMgmt?.price ?? 0),
                  basics: 0,
                };
                const price = priceMap[m.key];
                return (
                  <span key={m.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 999, background: "rgba(255,255,255,0.1)", fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: "rgba(255,255,255,0.85)" }}>
                    {m.label}
                    <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: price > 0 ? CORAL_LIGHT : "rgba(76,175,125,0.9)" }}>
                      {price > 0 ? `$${price}` : "free"}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 1 }}>Upgrades</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: isMobile ? 18 : 22, color: "#fff", lineHeight: 1 }}>
                {paidTotal === 0 ? <span style={{ color: "rgba(76,175,125,0.9)", fontSize: isMobile ? 13 : 16 }}>All free</span> : <>${paidTotal}<span style={{ fontSize: isMobile ? 12 : 14, color: "rgba(255,255,255,0.55)" }}>/mo</span></>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODULE MODAL ──────────────────────────────────────── */}
      <Dialog open={activeModal !== null} onOpenChange={v => !v && closeModal()}>
        <DialogContent style={{ borderRadius: 22, maxWidth: 480, width: "calc(100vw - 32px)", padding: 0, background: "var(--sb-panel-2)", border: "1px solid var(--sb-line)", overflow: "hidden" }}>
          <div style={{ maxHeight: isMobile ? "85vh" : "90vh", overflowY: "auto", padding: isMobile ? "24px 20px 20px" : "32px 32px 28px" }}>
            <DialogHeader>
              <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: activeModal !== null ? MODULES[activeModal].color : "var(--sb-ink-4)", marginBottom: 6 }}>
                {modalLobe}
              </div>
              <DialogTitle style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontSize: 26, color: "var(--sb-ink)", marginBottom: 4 }}>
                {modalTitle}
              </DialogTitle>
              <DialogDescription style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "var(--sb-ink-3)", lineHeight: 1.55, marginBottom: 4 }}>
                {activeModal === 0 && "Choose how capable you want Braino's AI to be."}
                {activeModal === 1 && "Set how much voice time you want each month."}
                {activeModal === 2 && "Control how many tasks Braino can run on your behalf."}
                {activeModal === 3 && "Connect the apps you already use every day."}
                {activeModal === 4 && "Auto-replies and full account management — pick what you need."}
                {activeModal === 5 && "Tell Braino who you are so every interaction is personalised from day one."}
              </DialogDescription>
            </DialogHeader>

            <div style={{ marginTop: 20 }}>
              {activeModal === 0 && (
                <IntelModalContent current={intel} onSave={s => { setIntel(s); saveModule("intel"); }} onFree={() => { saveModule("intel"); closeModal(); }} />
              )}
              {activeModal === 1 && (
                <VoiceModalContent current={voice} onSave={s => { setVoice(s); saveModule("voice"); }} onFree={() => { setVoice({ hours: 0, price: 0 }); saveModule("voice"); closeModal(); }} />
              )}
              {activeModal === 2 && (
                <DelegateModalContent current={delegate} onSave={s => { setDelegate(s); saveModule("delegate"); }} onFree={() => { setDelegate({ tasks: 25, price: 0 }); saveModule("delegate"); closeModal(); }} />
              )}
              {activeModal === 3 && (
                <IntegrationsModalContent
                  connected={integrations}
                  onToggle={id => setIntegrations(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                  onDone={() => { saveModule("integrations"); closeModal(); }}
                />
              )}
              {activeModal === 4 && (
                <XModalContent
                  currentAuto={xAuto} currentMgmt={xMgmt}
                  onSaveAuto={s => { setXAuto(s); saveModule("xAuto"); }}
                  onSaveMgmt={s => setXMgmt(s)}
                  onClose={() => { saveModule("xAuto"); closeModal(); }}
                />
              )}
              {activeModal === 5 && (
                <BasicsModalContent
                  current={basics}
                  onSave={s => { setBasics(s); saveModule("basics"); }}
                  onClose={closeModal}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
