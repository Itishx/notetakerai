import { useState, useRef, useEffect } from "react";
import {
  Leaf, Mic, Square, Copy, RefreshCw, MessageSquare, Send,
  Camera, History, Plus, ChevronRight, Globe, FileText,
  Check, Zap, NotebookPen, Trash2, X,
} from "lucide-react";

// ─── Sample content ───────────────────────────────────────────────────────────

const SAMPLE_NOTES = `## The Flow of Information

Modern information systems rely on **three core principles**: capture, process, and retrieve. Each stage demands careful consideration of both structure and semantics.

### Key Takeaways
- Capture should be effortless and frictionless
- Processing must preserve the original intent
- Retrieval depends entirely on how well structure was imposed

### Glossary
**Semantic structure** — the meaning embedded in how information is organized, beyond its surface form.

**Retrieval latency** — the delay between a query and a usable result; often determined by indexing quality.`;

const SAMPLE_CHAT = [
  { role: "user", text: "What are the three core principles mentioned?" },
  { role: "ai", text: "The three core principles are **capture**, **process**, and **retrieve**. Each stage demands careful consideration of structure and semantics." },
  { role: "user", text: "Can you explain retrieval latency?" },
  { role: "ai", text: "Retrieval latency is the delay between a query and a usable result — it's largely determined by how well the content was indexed during the processing stage." },
];

// ─── Markdown renderer (lightweight) ─────────────────────────────────────────

const renderMd = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const inline = (s: string) => {
      const parts = s.split(/(\*\*[^*]+\*\*)/g);
      return parts.map((p, j) =>
        p.startsWith("**") ? <strong key={j} className="font-semibold">{p.slice(2, -2)}</strong> : p
      );
    };
    if (line.startsWith("## ")) return <div key={i} className="text-[13px] font-semibold mt-3 mb-1 text-[#2c2318]">{line.slice(3)}</div>;
    if (line.startsWith("### ")) return <div key={i} className="text-[11px] font-semibold mt-2 mb-0.5 text-[#2c2318]">{line.slice(4)}</div>;
    if (line.startsWith("- ")) return <div key={i} className="text-[10.5px] text-[#5a4e42] flex gap-1.5 leading-relaxed"><span className="opacity-40 mt-0.5">•</span><span>{inline(line.slice(2))}</span></div>;
    if (line.startsWith("**") && line.endsWith("**")) return null;
    if (line.trim() === "") return <div key={i} className="h-1" />;
    return <div key={i} className="text-[10.5px] text-[#5a4e42] leading-relaxed">{inline(line)}</div>;
  });
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "notes" | "chat" | "page";
type RecordState = "idle" | "recording" | "done";

// ─── Main sidepanel component ─────────────────────────────────────────────────

const Sidepanel = () => {
  const [tab, setTab] = useState<Tab>("notes");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState(SAMPLE_CHAT);
  const [copied, setCopied] = useState(false);
  const [notionSynced, setNotionSynced] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (recordState === "recording") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recordState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleRecord = () => {
    if (recordState === "idle") { setRecordState("recording"); setElapsed(0); }
    else if (recordState === "recording") { setRecordState("done"); }
    else { setRecordState("idle"); setElapsed(0); }
  };

  const handleSend = () => {
    if (!chatInput.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text: chatInput.trim() },
      { role: "ai", text: "I'm analysing your notes and the current page to answer that. This is a live design prototype — responses will be real in the extension." },
    ]);
    setChatInput("");
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleNotion = () => {
    setNotionSynced(true);
    setTimeout(() => setNotionSynced(false), 2000);
  };

  // ─── Styles ────────────────────────────────────────────────────────────────

  const glass = {
    bg: "linear-gradient(145deg, hsl(40,18%,93%) 0%, hsl(35,16%,88%) 50%, hsl(30,14%,90%) 100%)",
    panel: "rgba(248, 244, 237, 0.72)",
    panelBorder: "rgba(255,255,255,0.75)",
    surface: "rgba(255,255,255,0.55)",
    surfaceBorder: "rgba(200,185,165,0.35)",
    inputBg: "rgba(255,255,255,0.50)",
    text: "#2c2318",
    textMuted: "#7a6e62",
    textFaint: "#a89e94",
    primary: "#d97234",
    primaryLight: "rgba(217,114,52,0.10)",
    primaryBorder: "rgba(217,114,52,0.25)",
    divider: "rgba(44,35,24,0.08)",
    backdrop: "blur(20px) saturate(1.4)",
    shadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
    tabActive: "rgba(255,255,255,0.75)",
    tabActiveBorder: "rgba(200,185,165,0.50)",
  };

  const tabBtn = (t: Tab, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setTab(t)}
      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10.5px] transition-all duration-200"
      style={{
        background: tab === t ? glass.tabActive : "transparent",
        border: `1px solid ${tab === t ? glass.tabActiveBorder : "transparent"}`,
        color: tab === t ? glass.text : glass.textMuted,
        fontWeight: tab === t ? 500 : 400,
        boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        width: 300,
        minHeight: 620,
        background: glass.bg,
      }}
    >
      {/* Subtle background texture blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(24,80%,65%) 0%, transparent 70%)" }} />
        <div className="absolute bottom-12 -left-8 w-28 h-28 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(40,60%,70%) 0%, transparent 70%)" }} />
      </div>

      {/* Glass panel */}
      <div
        className="relative flex flex-col flex-1 m-3 rounded-xl"
        style={{
          background: glass.panel,
          backdropFilter: glass.backdrop,
          WebkitBackdropFilter: glass.backdrop,
          border: `1px solid ${glass.panelBorder}`,
          boxShadow: glass.shadow,
        }}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: glass.primaryLight, border: `1px solid ${glass.primaryBorder}` }}>
              <Leaf className="w-3.5 h-3.5" style={{ color: glass.primary }} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[12px] tracking-wide leading-tight" style={{ color: glass.text, fontFamily: "Georgia, serif" }}>SideBrain</div>
              <div className="text-[9px] leading-none" style={{ color: glass.textFaint, fontFamily: "Georgia, serif", fontStyle: "italic" }}>AI sidekick</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
              style={{ background: glass.surface, border: `1px solid ${glass.surfaceBorder}` }}>
              <History className="w-3 h-3" style={{ color: glass.textMuted }} strokeWidth={1.5} />
            </button>
            <button className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:opacity-70"
              style={{ background: glass.surface, border: `1px solid ${glass.surfaceBorder}` }}>
              <Plus className="w-3 h-3" style={{ color: glass.textMuted }} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px mb-3" style={{ background: glass.divider }} />

        {/* Record strip */}
        <div className="px-3 mb-3">
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${glass.surfaceBorder}` }}>
            {/* Status row */}
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: glass.surface }}>
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: recordState === "recording" ? "#ef4444" : recordState === "done" ? glass.primary : glass.textFaint,
                  boxShadow: recordState === "recording" ? "0 0 6px #ef444488" : "none",
                  animation: recordState === "recording" ? "pulse 1.2s ease-in-out infinite" : "none",
                }}
              />
              <span className="text-[10.5px] flex-1" style={{ color: glass.textMuted, fontFamily: "Georgia, serif" }}>
                {recordState === "idle" ? "Ready to record" : recordState === "recording" ? "Recording…" : "Recording complete"}
              </span>
              <span className="text-[10.5px] tabular-nums" style={{ color: glass.textFaint, fontFamily: "Georgia, serif" }}>
                {fmt(elapsed)}
              </span>
            </div>

            {/* Record button */}
            <button
              onClick={handleRecord}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-[11px] transition-all duration-200 active:scale-[0.98]"
              style={{
                background: recordState === "recording"
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : `linear-gradient(135deg, ${glass.primary}, #c4612a)`,
                color: "#fff",
                fontFamily: "Georgia, serif",
                boxShadow: recordState === "recording"
                  ? "0 2px 12px rgba(239,68,68,0.35)"
                  : `0 2px 12px ${glass.primary}44`,
              }}
            >
              {recordState === "recording"
                ? <><Square className="w-3.5 h-3.5 fill-white" strokeWidth={0} /> Stop Recording</>
                : <><Mic className="w-3.5 h-3.5" strokeWidth={1.5} /> {recordState === "done" ? "Record Again" : "Start Recording"}</>
              }
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-3 mb-2">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.04)" }}>
            {tabBtn("notes", <NotebookPen className="w-3 h-3" strokeWidth={1.5} />, "Notes")}
            {tabBtn("chat", <MessageSquare className="w-3 h-3" strokeWidth={1.5} />, "Chat")}
            {tabBtn("page", <Globe className="w-3 h-3" strokeWidth={1.5} />, "Page")}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 px-3 pb-3 overflow-hidden flex flex-col">

          {/* NOTES TAB */}
          {tab === "notes" && (
            <div className="flex flex-col flex-1 gap-2">
              <div
                className="flex-1 rounded-xl p-3 overflow-y-auto"
                style={{
                  background: glass.surface,
                  border: `1px solid ${glass.surfaceBorder}`,
                  minHeight: 0,
                  maxHeight: 240,
                  fontFamily: "Georgia, serif",
                }}
              >
                {renderMd(SAMPLE_NOTES)}
              </div>
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 rounded-lg py-2 flex items-center justify-center gap-1.5 text-[10.5px] transition-all duration-150 active:scale-95"
                  style={{ background: glass.surface, border: `1px solid ${glass.surfaceBorder}`, color: glass.textMuted, fontFamily: "Georgia, serif" }}
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" strokeWidth={2} /> : <Copy className="w-3 h-3" strokeWidth={1.5} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  className="flex-1 rounded-lg py-2 flex items-center justify-center gap-1.5 text-[10.5px] transition-all duration-150 active:scale-95"
                  style={{ background: glass.surface, border: `1px solid ${glass.surfaceBorder}`, color: glass.textMuted, fontFamily: "Georgia, serif" }}
                >
                  <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Regenerate
                </button>
                <button
                  onClick={handleNotion}
                  className="flex-1 rounded-lg py-2 flex items-center justify-center gap-1.5 text-[10.5px] transition-all duration-150 active:scale-95"
                  style={{
                    background: notionSynced ? "rgba(34,197,94,0.15)" : glass.primaryLight,
                    border: `1px solid ${notionSynced ? "rgba(34,197,94,0.3)" : glass.primaryBorder}`,
                    color: notionSynced ? "#16a34a" : glass.primary,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {notionSynced ? <Check className="w-3 h-3" strokeWidth={2} /> : <Zap className="w-3 h-3" strokeWidth={1.5} />}
                  {notionSynced ? "Synced" : "Notion"}
                </button>
              </div>
            </div>
          )}

          {/* CHAT TAB */}
          {tab === "chat" && (
            <div className="flex flex-col flex-1 gap-2" style={{ minHeight: 0 }}>
              <div
                className="flex-1 rounded-xl p-3 overflow-y-auto flex flex-col gap-2"
                style={{
                  background: glass.surface,
                  border: `1px solid ${glass.surfaceBorder}`,
                  maxHeight: 220,
                  minHeight: 0,
                }}
              >
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[85%] rounded-xl px-3 py-2 text-[10.5px] leading-relaxed"
                      style={{
                        background: m.role === "user"
                          ? `linear-gradient(135deg, ${glass.primary}, #c4612a)`
                          : "rgba(255,255,255,0.70)",
                        color: m.role === "user" ? "#fff" : glass.text,
                        border: m.role === "ai" ? `1px solid ${glass.surfaceBorder}` : "none",
                        fontFamily: "Georgia, serif",
                        boxShadow: m.role === "user" ? `0 2px 8px ${glass.primary}33` : "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                    >
                      {m.role === "ai"
                        ? m.text.split(/(\*\*[^*]+\*\*)/).map((p, j) =>
                            p.startsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
                          )
                        : m.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div
                className="rounded-xl flex items-center gap-2 px-3 py-2"
                style={{ background: glass.inputBg, border: `1px solid ${glass.surfaceBorder}` }}
              >
                <button className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-70"
                  style={{ background: glass.surface, border: `1px solid ${glass.surfaceBorder}` }}>
                  <Camera className="w-2.5 h-2.5" style={{ color: glass.textMuted }} strokeWidth={1.5} />
                </button>
                <input
                  className="flex-1 text-[10.5px] bg-transparent outline-none placeholder:italic"
                  placeholder="Ask about your notes or this page…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  style={{ color: glass.text, fontFamily: "Georgia, serif" }}
                />
                <button
                  onClick={handleSend}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90"
                  style={{
                    background: chatInput.trim()
                      ? `linear-gradient(135deg, ${glass.primary}, #c4612a)`
                      : glass.surface,
                    border: `1px solid ${chatInput.trim() ? "transparent" : glass.surfaceBorder}`,
                    boxShadow: chatInput.trim() ? `0 2px 8px ${glass.primary}44` : "none",
                  }}
                >
                  <Send className="w-2.5 h-2.5" style={{ color: chatInput.trim() ? "#fff" : glass.textFaint }} strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-center text-[9px]" style={{ color: glass.textFaint, fontFamily: "Georgia, serif" }}>
                5 questions left today · <span style={{ color: glass.primary }}>Upgrade for unlimited</span>
              </p>
            </div>
          )}

          {/* PAGE TAB */}
          {tab === "page" && (
            <div className="flex flex-col flex-1 gap-2">
              <div
                className="rounded-xl p-3"
                style={{ background: glass.surface, border: `1px solid ${glass.surfaceBorder}` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: glass.primary }} strokeWidth={1.5} />
                  <span className="text-[10px] truncate" style={{ color: glass.textMuted, fontFamily: "Georgia, serif" }}>
                    leetcode.com/problems/two-sum
                  </span>
                </div>
                <div className="text-[10.5px] leading-relaxed mb-3" style={{ color: glass.text, fontFamily: "Georgia, serif" }}>
                  <strong>Two Sum</strong> — Given an array of integers <code className="px-1 rounded text-[9px]" style={{ background: "rgba(0,0,0,0.06)" }}>nums</code> and an integer <code className="px-1 rounded text-[9px]" style={{ background: "rgba(0,0,0,0.06)" }}>target</code>, return indices of the two numbers that add up to target.
                </div>
                <div className="text-[9.5px]" style={{ color: glass.textFaint, fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                  Ask anything about this page below ↓
                </div>
              </div>
              {/* Chat input for page */}
              <div
                className="rounded-xl flex items-center gap-2 px-3 py-2"
                style={{ background: glass.inputBg, border: `1px solid ${glass.surfaceBorder}` }}
              >
                <input
                  className="flex-1 text-[10.5px] bg-transparent outline-none placeholder:italic"
                  placeholder="Ask about this page…"
                  style={{ color: glass.text, fontFamily: "Georgia, serif" }}
                />
                <button
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: glass.surface, border: `1px solid ${glass.surfaceBorder}` }}
                >
                  <Send className="w-2.5 h-2.5" style={{ color: glass.textFaint }} strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-center text-[9px]" style={{ color: glass.textFaint, fontFamily: "Georgia, serif" }}>
                5 questions left today · <span style={{ color: glass.primary }}>Upgrade for unlimited</span>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ─── Page wrapper ─────────────────────────────────────────────────────────────

const SidepanelTest = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 pt-8 pb-4">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          Back
        </a>
      </div>

      <div className="container mx-auto px-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs tracking-widest uppercase text-muted-foreground/50">Design Sandbox</p>
          <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/8 text-amber-600">test only</span>
        </div>
        <h1 className="text-3xl font-normal text-foreground mb-2">Side panel — live prototype</h1>
        <p className="text-muted-foreground text-sm mb-12 max-w-lg">
          Interact with the panel below. Once the design is right, we push it to the real extension.
        </p>

        <div className="flex flex-col lg:flex-row gap-16 items-start">
          {/* The interactive panel */}
          <div className="flex-shrink-0">
            <Sidepanel />
          </div>

          {/* Notes on what to refine */}
          <div className="flex-1 max-w-md">
            <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-6">Design notes</p>
            <div className="space-y-4">
              {[
                { label: "Glass treatment", note: "Warm parchment + amber-orange. Matches website palette exactly." },
                { label: "Typography", note: "Georgia serif for UI text — calm, editorial feel. 10–12px scale." },
                { label: "Tab system", note: "Notes / Chat / Page — switches context without leaving the panel." },
                { label: "Record states", note: "Idle → Recording (red pulse) → Done. Timer live." },
                { label: "Chat bubbles", note: "User = amber pill. AI = frosted white card. Send activates on input." },
                { label: "Notion sync", note: "Shows 'Synced' state with green confirmation for 2s." },
                { label: "Free limits", note: "'5 questions left today · Upgrade' shown at bottom of chat tabs." },
              ].map(({ label, note }) => (
                <div key={label} className="flex gap-4 items-start">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#d97234" }} />
                  <div>
                    <div className="text-sm text-foreground mb-0.5">{label}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{note}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-5 rounded-2xl border border-border/60 bg-card/40">
              <p className="text-xs text-muted-foreground/60 mb-3 tracking-widest uppercase">When ready</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tell me what to change (spacing, colors, layout, copy, new features) and we'll iterate here. Once it looks right, one command pushes it to <code className="text-xs bg-muted px-1 py-0.5 rounded">GlassPreview</code> and then to the real extension code.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidepanelTest;
