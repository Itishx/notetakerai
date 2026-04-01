import { Leaf, History, Plus, Mic, Copy, RefreshCw, MessageSquare, Send, Camera, Square, ChevronRight } from "lucide-react";

const sampleNotes = `## The Flow of Information

Modern information systems rely on **three core principles**: capture, process, and retrieve. Each stage demands careful consideration of both structure and semantics.

### Key Takeaways
- Capture should be effortless and frictionless
- Processing must preserve the original intent
- Retrieval depends entirely on how well structure was imposed

### Glossary
**Semantic structure** — the meaning embedded in how information is organized, beyond its surface form.`;

type GlassStyle = {
  label: string;
  letter: string;
  bg: string;
  container: string;
  containerBorder: string;
  surface: string;
  surfaceBorder: string;
  inputBg: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  primaryText: string;
  btnIcon: string;
  btnSecondary: string;
  divider: string;
  backdrop: string;
  statusDot: string;
  description: string;
};

const variants: GlassStyle[] = [
  {
    label: "Dark Green Glass",
    letter: "A",
    bg: "linear-gradient(135deg, #1a3a2a 0%, #0d2018 40%, #1e3d2a 70%, #2a4f35 100%)",
    container: "rgba(10, 22, 14, 0.62)",
    containerBorder: "rgba(100, 200, 130, 0.15)",
    surface: "rgba(255, 255, 255, 0.05)",
    surfaceBorder: "rgba(255, 255, 255, 0.10)",
    inputBg: "rgba(255, 255, 255, 0.04)",
    text: "#e2f0e6",
    textMuted: "rgba(220, 240, 225, 0.55)",
    textFaint: "rgba(220, 240, 225, 0.30)",
    primary: "#6fbf85",
    primaryText: "#0d1f11",
    btnIcon: "rgba(255,255,255,0.07)",
    btnSecondary: "rgba(255,255,255,0.06)",
    divider: "rgba(255,255,255,0.08)",
    backdrop: "blur(22px)",
    statusDot: "#6fbf85",
    description: "Brand-tinted dark glass. Green warmth, deep contrast.",
  },
  {
    label: "Dark Neutral Glass",
    letter: "B",
    bg: "linear-gradient(135deg, #1a1a2e 0%, #0f0f17 40%, #16213e 70%, #0f3460 100%)",
    container: "rgba(12, 12, 18, 0.68)",
    containerBorder: "rgba(255, 255, 255, 0.09)",
    surface: "rgba(255, 255, 255, 0.05)",
    surfaceBorder: "rgba(255, 255, 255, 0.08)",
    inputBg: "rgba(255, 255, 255, 0.04)",
    text: "#f0f0f4",
    textMuted: "rgba(240, 240, 244, 0.50)",
    textFaint: "rgba(240, 240, 244, 0.28)",
    primary: "#4a7c59",
    primaryText: "#f0f0f4",
    btnIcon: "rgba(255,255,255,0.07)",
    btnSecondary: "rgba(255,255,255,0.06)",
    divider: "rgba(255,255,255,0.07)",
    backdrop: "blur(26px)",
    statusDot: "#4a7c59",
    description: "Colour-neutral dark glass. Raycast / Linear feel.",
  },
  {
    label: "Light Frosted Glass",
    letter: "C",
    bg: "linear-gradient(135deg, #c8e6d0 0%, #a8d5b5 30%, #d4ecd8 60%, #e8f5ec 100%)",
    container: "rgba(245, 242, 236, 0.58)",
    containerBorder: "rgba(255, 255, 255, 0.70)",
    surface: "rgba(255, 255, 255, 0.52)",
    surfaceBorder: "rgba(255, 255, 255, 0.70)",
    inputBg: "rgba(255, 255, 255, 0.45)",
    text: "#2c3e2d",
    textMuted: "#6b7c6b",
    textFaint: "#9aaa9a",
    primary: "#4a7c59",
    primaryText: "#f5f0e8",
    btnIcon: "rgba(255,255,255,0.60)",
    btnSecondary: "rgba(255,255,255,0.50)",
    divider: "rgba(44,62,45,0.10)",
    backdrop: "blur(16px)",
    statusDot: "#4a7c59",
    description: "Light frosted macOS-style. Keeps the warm parchment personality.",
  },
  {
    label: "Website Theme Glass",
    letter: "D",
    // hsl(40 20% 97%) background, hsl(24 80% 50%) primary (warm amber-orange)
    bg: "linear-gradient(135deg, hsl(40,18%,88%) 0%, hsl(35,16%,82%) 40%, hsl(30,14%,85%) 70%, hsl(40,20%,91%) 100%)",
    container: "rgba(245, 240, 232, 0.22)",
    containerBorder: "rgba(255, 255, 255, 0.55)",
    surface: "rgba(255, 255, 255, 0.18)",
    surfaceBorder: "rgba(255, 255, 255, 0.40)",
    inputBg: "rgba(255, 255, 255, 0.14)",
    text: "#2c2318",           // hsl(30 10% 15%)
    textMuted: "#7a6e62",      // hsl(30 8% 44%)
    textFaint: "#a89e94",
    primary: "#d97234",        // hsl(24 80% 50%) — exact website --primary (amber-orange)
    primaryText: "#f5f0e8",    // hsl(40 20% 97%)
    btnIcon: "rgba(212,200,182,0.55)",
    btnSecondary: "rgba(212,200,182,0.45)",
    divider: "rgba(44,35,24,0.10)",
    backdrop: "blur(18px)",
    statusDot: "#d97234",
    description: "Exact website palette — warm parchment + amber-orange primary.",
  },
];

const SidepanelMockup = ({ v }: { v: GlassStyle }) => {
  return (
    <div
      className="relative rounded-2xl overflow-hidden flex-shrink-0"
      style={{
        width: 280,
        background: v.bg,
        padding: "28px 20px",
        minHeight: 580,
      }}
    >
      {/* Simulated webpage content behind the panel */}
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ zIndex: 0 }}>
        <div className="absolute top-8 left-6 right-6 h-3 rounded" style={{ background: v.primary, opacity: 0.3 }} />
        <div className="absolute top-16 left-6 right-10 h-2 rounded" style={{ background: v.text, opacity: 0.15 }} />
        <div className="absolute top-22 left-6 right-16 h-2 rounded" style={{ background: v.text, opacity: 0.10 }} />
        <div className="absolute top-32 left-6 right-8 h-20 rounded-lg" style={{ background: v.primary, opacity: 0.08 }} />
      </div>

      {/* Glass container */}
      <div
        className="relative rounded-2xl flex flex-col gap-3 p-4"
        style={{
          zIndex: 1,
          background: v.container,
          backdropFilter: v.backdrop,
          WebkitBackdropFilter: v.backdrop,
          border: `1px solid ${v.containerBorder}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `${v.primary}22` }}>
              <Leaf className="w-3.5 h-3.5" style={{ color: v.primary }} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-xs font-normal tracking-wide" style={{ color: v.text, fontFamily: "Georgia, serif" }}>SideBrain</div>
              <div className="text-[10px]" style={{ color: v.textFaint, fontFamily: "Georgia, serif", fontStyle: "italic" }}>AI lecture notes</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: v.btnIcon, border: `1px solid ${v.surfaceBorder}` }}>
              <History className="w-3 h-3" style={{ color: v.textMuted }} strokeWidth={1.5} />
            </button>
            <button className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: v.btnIcon, border: `1px solid ${v.surfaceBorder}` }}>
              <Plus className="w-3 h-3" style={{ color: v.textMuted }} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ background: v.surface, border: `1px solid ${v.surfaceBorder}` }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: v.statusDot }} />
          <span className="text-[11px]" style={{ color: v.textMuted, fontFamily: "Georgia, serif" }}>Ready to record</span>
          <span className="ml-auto text-[11px] tabular-nums" style={{ color: v.textFaint, fontFamily: "Georgia, serif" }}>0:00</span>
        </div>

        {/* Record button */}
        <button
          className="w-full rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs"
          style={{
            background: v.primary,
            color: v.primaryText,
            fontFamily: "Georgia, serif",
            border: "none",
            boxShadow: `0 2px 12px ${v.primary}44`,
          }}
        >
          <Mic className="w-3.5 h-3.5" strokeWidth={1.5} />
          Start Recording
        </button>

        {/* Notes area */}
        <div
          className="rounded-lg p-3 text-[10px] leading-relaxed"
          style={{
            background: v.surface,
            border: `1px solid ${v.surfaceBorder}`,
            color: v.text,
            fontFamily: "Georgia, serif",
            maxHeight: 150,
            overflow: "hidden",
          }}
        >
          <div className="font-normal text-[11px] mb-1" style={{ color: v.text }}>The Flow of Information</div>
          <div style={{ color: v.textMuted }}>
            Modern information systems rely on <strong style={{ color: v.text }}>three core principles</strong>: capture, process, and retrieve.
          </div>
          <div className="mt-2 font-normal" style={{ color: v.text }}>Key Takeaways</div>
          <div style={{ color: v.textMuted }}>• Capture should be effortless</div>
          <div style={{ color: v.textMuted }}>• Processing preserves intent</div>
          <div style={{ color: v.textMuted }}>• Retrieval needs structure</div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg py-1.5 flex items-center justify-center gap-1.5 text-[10px]"
            style={{ background: v.btnSecondary, border: `1px solid ${v.surfaceBorder}`, color: v.textMuted, fontFamily: "Georgia, serif" }}>
            <Copy className="w-3 h-3" strokeWidth={1.5} /> Copy
          </button>
          <button className="flex-1 rounded-lg py-1.5 flex items-center justify-center gap-1.5 text-[10px]"
            style={{ background: v.btnSecondary, border: `1px solid ${v.surfaceBorder}`, color: v.textMuted, fontFamily: "Georgia, serif" }}>
            <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Update
          </button>
          <button className="flex-1 rounded-lg py-1.5 flex items-center justify-center gap-1.5 text-[10px]"
            style={{ background: v.primary, border: "none", color: v.primaryText, fontFamily: "Georgia, serif", boxShadow: `0 2px 8px ${v.primary}44` }}>
            Notion
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 my-0.5">
          <div className="flex-1 h-px" style={{ background: v.divider }} />
          <div className="flex items-center gap-1" style={{ color: v.textFaint }}>
            <MessageSquare className="w-2.5 h-2.5" strokeWidth={1.5} />
            <span className="text-[9px]" style={{ fontFamily: "Georgia, serif" }}>Chat</span>
          </div>
          <div className="flex-1 h-px" style={{ background: v.divider }} />
        </div>

        {/* Chat input bar */}
        <div
          className="rounded-xl flex items-center gap-2 px-3 py-2"
          style={{ background: v.inputBg, border: `1px solid ${v.surfaceBorder}` }}
        >
          <button className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ background: v.btnIcon }}>
            <Camera className="w-2.5 h-2.5" style={{ color: v.textMuted }} strokeWidth={1.5} />
          </button>
          <span className="flex-1 text-[10px]" style={{ color: v.textFaint, fontFamily: "Georgia, serif", fontStyle: "italic" }}>Ask about your notes…</span>
          <button className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: v.primary }}>
            <Send className="w-2.5 h-2.5" style={{ color: v.primaryText }} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

const GlassPreview = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      {/* Simple nav back */}
      <div className="container mx-auto px-6 pt-8 pb-4">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          Back
        </a>
      </div>

      <div className="container mx-auto px-6 pb-8">
        <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-3">Design Preview</p>
        <h1 className="text-3xl font-normal text-foreground mb-2">Glass sidepanel — 3 variants</h1>
        <p className="text-muted-foreground text-sm mb-16 max-w-lg">
          Each mockup shows the same sidepanel UI rendered with a different glass treatment. Pick the one that feels right.
        </p>

        {/* Variants */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-8 items-start">
          {variants.map((v) => (
            <div key={v.letter} className="flex flex-col items-center gap-5">
              {/* Label */}
              <div className="flex items-center gap-3 self-start">
                <span className="w-7 h-7 rounded-full border border-border/60 bg-card/40 flex items-center justify-center text-xs text-muted-foreground">
                  {v.letter}
                </span>
                <div>
                  <div className="text-foreground text-sm">{v.label}</div>
                  <div className="text-muted-foreground/60 text-xs mt-0.5">{v.description}</div>
                </div>
              </div>

              <SidepanelMockup v={v} />

              {/* Spec chips */}
              <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                <span className="text-[10px] px-2 py-1 rounded-full border border-border/50 bg-card/30 text-muted-foreground/70">
                  {v.backdrop}
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full border border-border/50 bg-card/30 text-muted-foreground/70">
                  Charter serif
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <p className="text-center text-xs text-muted-foreground/40 mt-8">
          Tell me which variant (A, B, or C) to apply to the real extension.
        </p>
      </div>
    </div>
  );
};

export default GlassPreview;
