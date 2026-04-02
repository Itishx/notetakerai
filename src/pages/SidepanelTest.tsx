import { useState, useRef, useEffect } from "react";
import {
  Leaf, Mic, Square, Copy, RefreshCw, Send, Camera,
  History, Plus, ChevronRight, Globe, Check, Zap,
  NotebookPen, MessageSquare, Loader2, BookOpen,
  GraduationCap, Users, Radio, TrendingUp, ArrowRight,
} from "lucide-react";

// ─── Flow states ──────────────────────────────────────────────────────────────
// welcome → empty → recording → processing → notes (+ chat available) → (reset to empty)

type FlowState = "welcome" | "empty" | "recording" | "processing" | "notes";
type Tab = "notes" | "chat" | "page";

// ─── Sample generated content ─────────────────────────────────────────────────

const GENERATED_NOTES = [
  { type: "h2", text: "The Flow of Information" },
  { type: "body", text: "Modern information systems rely on three core principles: capture, process, and retrieve. Each stage demands careful consideration of structure and semantics." },
  { type: "h3", text: "Key Takeaways" },
  { type: "bullet", text: "Capture should be effortless and frictionless" },
  { type: "bullet", text: "Processing must preserve the original intent" },
  { type: "bullet", text: "Retrieval depends entirely on how well structure was imposed" },
  { type: "h3", text: "Glossary" },
  { type: "term", label: "Semantic structure", def: "The meaning embedded in how information is organized, beyond its surface form." },
  { type: "term", label: "Retrieval latency", def: "The delay between a query and a usable result; determined by indexing quality." },
];

const USE_CASES = [
  { icon: GraduationCap, label: "Online lectures", desc: "Turn any video lesson into structured notes." },
  { icon: Users, label: "Meetings & calls", desc: "Auto-summarise decisions and action items." },
  { icon: Globe, label: "Articles & docs", desc: "Ask questions about any page you're reading." },
  { icon: Radio, label: "Podcasts", desc: "Get key takeaways without sitting through it all." },
  { icon: TrendingUp, label: "LeetCode", desc: "Read the problem, ask for hints, get unstuck." },
];

const PROCESSING_STEPS = [
  "Transcribing audio…",
  "Identifying structure…",
  "Extracting key points…",
  "Building glossary…",
  "Finalising notes…",
];

// ─── Glass tokens ─────────────────────────────────────────────────────────────

const g = {
  bg: "linear-gradient(145deg, hsl(40,18%,93%) 0%, hsl(35,16%,88%) 50%, hsl(30,14%,90%) 100%)",
  panel: "rgba(248,244,237,0.74)",
  panelBorder: "rgba(255,255,255,0.78)",
  surface: "rgba(255,255,255,0.58)",
  surfaceBorder: "rgba(200,185,165,0.35)",
  inputBg: "rgba(255,255,255,0.52)",
  text: "#2c2318",
  textMuted: "#7a6e62",
  textFaint: "#b0a498",
  primary: "#d97234",
  primaryLight: "rgba(217,114,52,0.10)",
  primaryBorder: "rgba(217,114,52,0.25)",
  divider: "rgba(44,35,24,0.08)",
  backdrop: "blur(20px) saturate(1.4)",
  shadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const serif = { fontFamily: "Georgia, serif" };

// ─── Sub-components ───────────────────────────────────────────────────────────

const Divider = () => (
  <div className="mx-4 h-px" style={{ background: g.divider }} />
);

const IconBtn = ({ icon: Icon, onClick }: { icon: React.ElementType; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="w-6 h-6 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
    style={{ background: g.surface, border: `1px solid ${g.surfaceBorder}` }}
  >
    <Icon className="w-3 h-3" style={{ color: g.textMuted }} strokeWidth={1.5} />
  </button>
);

// Waveform bars — animated when recording
const Waveform = ({ active }: { active: boolean }) => {
  const heights = [3, 7, 12, 8, 14, 6, 10, 13, 5, 9, 14, 7, 11, 4, 8];
  return (
    <div className="flex items-center gap-[2px] h-4">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[2px] rounded-full transition-all"
          style={{
            height: active ? h + "px" : "2px",
            background: active ? g.primary : g.textFaint,
            animation: active ? `wave-bar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite alternate` : "none",
            opacity: active ? 1 : 0.5,
            transition: "height 0.3s ease, background 0.3s ease",
          }}
        />
      ))}
    </div>
  );
};

// Typing animation — reveals notes line by line
const useReveal = (ready: boolean, total: number) => {
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    if (!ready) { setRevealed(0); return; }
    let i = 0;
    const t = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= total) clearInterval(t);
    }, 120);
    return () => clearInterval(t);
  }, [ready, total]);
  return revealed;
};

// ─── Notes renderer ───────────────────────────────────────────────────────────

const NotesContent = ({ revealed }: { revealed: number }) => (
  <div className="space-y-1">
    {GENERATED_NOTES.slice(0, revealed).map((n, i) => {
      const fade = "opacity-0 animate-[fadeIn_0.35s_ease_forwards]";
      if (n.type === "h2") return (
        <div key={i} className={`text-[13px] font-semibold pt-1 ${fade}`} style={{ color: g.text, ...serif }}>{n.text}</div>
      );
      if (n.type === "h3") return (
        <div key={i} className={`text-[11px] font-semibold pt-2 ${fade}`} style={{ color: g.text, ...serif }}>{n.text}</div>
      );
      if (n.type === "bullet") return (
        <div key={i} className={`flex gap-1.5 ${fade}`}>
          <span className="text-[10px] mt-0.5 opacity-40" style={{ color: g.text }}>•</span>
          <span className="text-[10.5px] leading-relaxed" style={{ color: g.textMuted, ...serif }}>{n.text}</span>
        </div>
      );
      if (n.type === "body") return (
        <div key={i} className={`text-[10.5px] leading-relaxed ${fade}`} style={{ color: g.textMuted, ...serif }}>{n.text}</div>
      );
      if (n.type === "term") return (
        <div key={i} className={`text-[10px] leading-relaxed ${fade}`} style={{ color: g.textMuted, ...serif }}>
          <span className="font-semibold" style={{ color: g.text }}>{(n as any).label}</span>
          {" — "}{(n as any).def}
        </div>
      );
      return null;
    })}
  </div>
);

// ─── Chat messages ────────────────────────────────────────────────────────────

type Msg = { role: "user" | "ai"; text: string };

const ChatBubble = ({ m }: { m: Msg }) => {
  const isUser = m.role === "user";
  const bold = (s: string) => s.split(/(\*\*[^*]+\*\*)/).map((p, j) =>
    p.startsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
  );
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} opacity-0 animate-[fadeIn_0.3s_ease_forwards]`}>
      <div
        className="max-w-[88%] rounded-xl px-3 py-2 text-[10.5px] leading-relaxed"
        style={{
          background: isUser ? `linear-gradient(135deg, ${g.primary}, #c4612a)` : "rgba(255,255,255,0.72)",
          color: isUser ? "#fff" : g.text,
          border: isUser ? "none" : `1px solid ${g.surfaceBorder}`,
          boxShadow: isUser ? `0 2px 10px ${g.primary}33` : "0 1px 3px rgba(0,0,0,0.04)",
          ...serif,
        }}
      >
        {isUser ? m.text : bold(m.text)}
      </div>
    </div>
  );
};

// ─── Main panel ───────────────────────────────────────────────────────────────

const Sidepanel = ({ onReset }: { onReset: () => void }) => {
  const [flow, setFlow] = useState<FlowState>("welcome");
  const [tab, setTab] = useState<Tab>("notes");
  const [elapsed, setElapsed] = useState(0);
  const [procStep, setProcStep] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [notionDone, setNotionDone] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const procRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const revealed = useReveal(flow === "notes", GENERATED_NOTES.length);

  // Timer
  useEffect(() => {
    if (flow === "recording") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [flow]);

  // Processing steps
  useEffect(() => {
    if (flow === "processing") {
      setProcStep(0);
      let i = 0;
      procRef.current = setInterval(() => {
        i++;
        if (i < PROCESSING_STEPS.length) {
          setProcStep(i);
        } else {
          clearInterval(procRef.current!);
          setTimeout(() => setFlow("notes"), 400);
        }
      }, 700);
    }
    return () => { if (procRef.current) clearInterval(procRef.current); };
  }, [flow]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiTyping]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = () => { setFlow("recording"); setElapsed(0); };
  const stopRecording = () => { setFlow("processing"); };

  const handleSend = () => {
    if (!chatInput.trim() || aiTyping) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setAiTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, {
        role: "ai",
        text: "Based on your notes, the recording covered **three core principles** of information systems: capture, process, and retrieve. Each plays a distinct role in how knowledge is preserved and retrieved later.",
      }]);
      setAiTyping(false);
    }, 1400);
  };

  const handleReset = () => {
    setFlow("welcome");
    setElapsed(0);
    setMessages([]);
    setChatInput("");
    setCopied(false);
    setNotionDone(false);
    setTab("notes");
    onReset();
  };

  const TabBtn = ({ t, icon: Icon, label }: { t: Tab; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setTab(t)}
      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10.5px] transition-all duration-200"
      style={{
        background: tab === t ? "rgba(255,255,255,0.78)" : "transparent",
        border: `1px solid ${tab === t ? "rgba(200,185,165,0.50)" : "transparent"}`,
        color: tab === t ? g.text : g.textMuted,
        fontWeight: tab === t ? 500 : 400,
        boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
        ...serif,
      }}
    >
      <Icon className="w-3 h-3" strokeWidth={1.5} />
      {label}
    </button>
  );

  return (
    <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{ width: 300, minHeight: 620, background: g.bg }}>
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(24,80%,65%) 0%, transparent 70%)" }} />
        <div className="absolute bottom-12 -left-8 w-28 h-28 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(40,60%,70%) 0%, transparent 70%)" }} />
      </div>

      {/* Glass panel */}
      <div className="relative flex flex-col flex-1 m-3 rounded-xl" style={{
        background: g.panel,
        backdropFilter: g.backdrop,
        WebkitBackdropFilter: g.backdrop,
        border: `1px solid ${g.panelBorder}`,
        boxShadow: g.shadow,
      }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: g.primaryLight, border: `1px solid ${g.primaryBorder}` }}>
              <Leaf className="w-3.5 h-3.5" style={{ color: g.primary }} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[12px] tracking-wide leading-tight" style={{ color: g.text, ...serif }}>SideBrain</div>
              <div className="text-[9px] leading-none" style={{ color: g.textFaint, ...serif, fontStyle: "italic" }}>AI sidekick</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {flow === "notes" && <IconBtn icon={History} />}
            {flow === "notes" && <IconBtn icon={Plus} onClick={handleReset} />}
          </div>
        </div>

        <Divider />

        {/* ── WELCOME STATE ── */}
        {flow === "welcome" && (
          <div className="flex flex-col flex-1 overflow-y-auto px-4 py-3 gap-4">
            {/* Greeting */}
            <div className="flex flex-col gap-1 opacity-0 animate-[fadeIn_0.4s_ease_0.1s_forwards]">
              <div className="text-[15px]" style={{ color: g.text, ...serif }}>Welcome to SideBrain 👋</div>
              <div className="text-[10.5px] leading-relaxed" style={{ color: g.textMuted, ...serif }}>
                Your AI sidekick for the browser. Record any tab, chat about any page, annotate with screenshots.
              </div>
            </div>

            {/* Use cases */}
            <div className="flex flex-col gap-1.5 opacity-0 animate-[fadeIn_0.4s_ease_0.25s_forwards]">
              <div className="text-[9.5px] tracking-widest uppercase mb-1" style={{ color: g.textFaint, ...serif }}>
                What can I do?
              </div>
              {USE_CASES.map(({ icon: Icon, label, desc }, i) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 cursor-default hover:scale-[1.01]"
                  style={{
                    background: g.surface,
                    border: `1px solid ${g.surfaceBorder}`,
                    opacity: 0,
                    animation: `fadeIn 0.35s ease ${0.3 + i * 0.07}s forwards`,
                  }}
                >
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: g.primaryLight, border: `1px solid ${g.primaryBorder}` }}>
                    <Icon className="w-3 h-3" style={{ color: g.primary }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-[11px] font-medium leading-tight mb-0.5" style={{ color: g.text, ...serif }}>{label}</div>
                    <div className="text-[9.5px] leading-relaxed" style={{ color: g.textMuted, ...serif }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-2 opacity-0 animate-[fadeIn_0.4s_ease_0.7s_forwards]">
              <button
                onClick={() => setFlow("empty")}
                className="w-full rounded-xl py-2.5 flex items-center justify-center gap-2 text-[11.5px] transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: `linear-gradient(135deg, ${g.primary}, #c4612a)`,
                  color: "#fff",
                  boxShadow: `0 4px 16px ${g.primary}44`,
                  ...serif,
                }}
              >
                Get started
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <div className="text-center text-[9px]" style={{ color: g.textFaint, ...serif }}>
                Free · No account required · Works on all Chromium browsers
              </div>
            </div>
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {flow === "empty" && (
          <div className="flex flex-col flex-1 items-center justify-center px-6 py-10 gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: g.primaryLight, border: `1px solid ${g.primaryBorder}` }}>
                <Mic className="w-6 h-6" style={{ color: g.primary }} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-[13px] mb-1.5" style={{ color: g.text, ...serif }}>No notes yet</div>
                <div className="text-[10.5px] leading-relaxed" style={{ color: g.textMuted, ...serif }}>
                  Start recording any tab — lecture, meeting, podcast — and SideBrain will turn it into structured notes.
                </div>
              </div>
            </div>

            <button
              onClick={startRecording}
              className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-[12px] transition-all duration-200 active:scale-[0.97]"
              style={{
                background: `linear-gradient(135deg, ${g.primary}, #c4612a)`,
                color: "#fff",
                boxShadow: `0 4px 16px ${g.primary}44`,
                ...serif,
              }}
            >
              <Mic className="w-4 h-4" strokeWidth={1.5} />
              Start Recording
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: g.divider }} />
              <span className="text-[9.5px]" style={{ color: g.textFaint, ...serif }}>or</span>
              <div className="flex-1 h-px" style={{ background: g.divider }} />
            </div>

            <button
              className="flex items-center gap-2 text-[10.5px] transition-opacity hover:opacity-70"
              style={{ color: g.textMuted, ...serif }}
            >
              <Globe className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: g.primary }} />
              Ask about this page instead
            </button>

            <div className="mt-2 text-[9px] text-center" style={{ color: g.textFaint, ...serif }}>
              Free plan · 5 min recording · 5 questions/day
            </div>
          </div>
        )}

        {/* ── RECORDING STATE ── */}
        {flow === "recording" && (
          <div className="flex flex-col flex-1 px-4 py-4 gap-4">
            {/* Live status */}
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: g.surface, border: `1px solid ${g.surfaceBorder}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"
                    style={{ boxShadow: "0 0 8px rgba(239,68,68,0.7)", animation: "pulse 1s ease-in-out infinite" }} />
                  <span className="text-[11px]" style={{ color: g.text, ...serif }}>Recording</span>
                </div>
                <span className="text-[11px] tabular-nums font-mono" style={{ color: g.text }}>{fmt(elapsed)}</span>
              </div>
              <Waveform active={true} />
              <div className="text-[10px]" style={{ color: g.textFaint, ...serif }}>
                Capturing audio from this tab…
              </div>
            </div>

            {/* Current tab info */}
            <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{ background: g.surface, border: `1px solid ${g.surfaceBorder}` }}>
              <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: g.primary }} strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] truncate" style={{ color: g.textMuted, ...serif }}>
                  youtube.com/watch?v=…
                </div>
                <div className="text-[9px]" style={{ color: g.textFaint, ...serif }}>
                  The Art of System Design — Full Lecture
                </div>
              </div>
            </div>

            {/* Free limit warning */}
            <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(217,114,52,0.06)", border: `1px solid ${g.primaryBorder}` }}>
              <div className="text-[10px] leading-relaxed" style={{ color: g.textMuted, ...serif }}>
                <span style={{ color: g.primary }}>Free plan:</span> up to 5 min/day.{" "}
                <span className="underline cursor-pointer" style={{ color: g.primary }}>Upgrade</span> for unlimited.
              </div>
            </div>

            <div className="flex-1" />

            {/* Stop button */}
            <button
              onClick={stopRecording}
              className="w-full rounded-xl py-3 flex items-center justify-center gap-2 text-[12px] transition-all duration-200 active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                color: "#fff",
                boxShadow: "0 4px 16px rgba(239,68,68,0.35)",
                ...serif,
              }}
            >
              <Square className="w-3.5 h-3.5 fill-white" strokeWidth={0} />
              Stop & Generate Notes
            </button>
          </div>
        )}

        {/* ── PROCESSING STATE ── */}
        {flow === "processing" && (
          <div className="flex flex-col flex-1 items-center justify-center px-6 py-10 gap-5">
            <div className="relative w-14 h-14">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: g.primaryLight, border: `1px solid ${g.primaryBorder}` }}>
                <BookOpen className="w-6 h-6" style={{ color: g.primary }} strokeWidth={1.5} />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: g.primary }}>
                <Loader2 className="w-3 h-3 text-white animate-spin" strokeWidth={2} />
              </div>
            </div>

            <div className="text-center">
              <div className="text-[13px] mb-1" style={{ color: g.text, ...serif }}>Generating notes</div>
              <div
                className="text-[10.5px] transition-all duration-500"
                style={{ color: g.textMuted, ...serif }}
                key={procStep}
              >
                {PROCESSING_STEPS[procStep]}
              </div>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5">
              {PROCESSING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i <= procStep ? "20px" : "6px",
                    background: i <= procStep ? g.primary : g.textFaint,
                    opacity: i <= procStep ? 1 : 0.4,
                  }}
                />
              ))}
            </div>

            <div className="text-[9px]" style={{ color: g.textFaint, ...serif }}>
              Recorded {fmt(elapsed)} of audio
            </div>
          </div>
        )}

        {/* ── NOTES STATE ── */}
        {flow === "notes" && (
          <div className="flex flex-col flex-1 px-3 pb-3 gap-2" style={{ minHeight: 0 }}>

            {/* Tab bar */}
            <div className="px-1 pt-2">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.04)" }}>
                <TabBtn t="notes" icon={NotebookPen} label="Notes" />
                <TabBtn t="chat" icon={MessageSquare} label="Chat" />
                <TabBtn t="page" icon={Globe} label="Page" />
              </div>
            </div>

            {/* NOTES TAB */}
            {tab === "notes" && (
              <div className="flex flex-col flex-1 gap-2" style={{ minHeight: 0 }}>
                <div
                  className="flex-1 rounded-xl p-3 overflow-y-auto"
                  style={{
                    background: g.surface,
                    border: `1px solid ${g.surfaceBorder}`,
                    maxHeight: 260,
                    minHeight: 0,
                  }}
                >
                  <NotesContent revealed={revealed} />
                  {revealed < GENERATED_NOTES.length && (
                    <span className="inline-block w-1.5 h-3 ml-0.5 rounded-sm animate-pulse" style={{ background: g.primary }} />
                  )}
                </div>

                {/* Action row */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                    className="flex-1 rounded-lg py-2 flex items-center justify-center gap-1.5 text-[10.5px] transition-all active:scale-95"
                    style={{ background: g.surface, border: `1px solid ${g.surfaceBorder}`, color: g.textMuted, ...serif }}
                  >
                    {copied ? <Check className="w-3 h-3" style={{ color: "#16a34a" }} strokeWidth={2} /> : <Copy className="w-3 h-3" strokeWidth={1.5} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    className="flex-1 rounded-lg py-2 flex items-center justify-center gap-1.5 text-[10.5px] transition-all active:scale-95"
                    style={{ background: g.surface, border: `1px solid ${g.surfaceBorder}`, color: g.textMuted, ...serif }}
                  >
                    <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> Redo
                  </button>
                  <button
                    onClick={() => { setNotionDone(true); setTimeout(() => setNotionDone(false), 2000); }}
                    className="flex-1 rounded-lg py-2 flex items-center justify-center gap-1.5 text-[10.5px] transition-all active:scale-95"
                    style={{
                      background: notionDone ? "rgba(34,197,94,0.12)" : g.primaryLight,
                      border: `1px solid ${notionDone ? "rgba(34,197,94,0.3)" : g.primaryBorder}`,
                      color: notionDone ? "#16a34a" : g.primary,
                      ...serif,
                    }}
                  >
                    {notionDone ? <Check className="w-3 h-3" strokeWidth={2} /> : <Zap className="w-3 h-3" strokeWidth={1.5} />}
                    {notionDone ? "Synced" : "Notion"}
                  </button>
                </div>

                {/* Record again */}
                <button
                  onClick={handleReset}
                  className="w-full rounded-xl py-2.5 flex items-center justify-center gap-2 text-[11px] transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: g.surface,
                    border: `1px solid ${g.surfaceBorder}`,
                    color: g.textMuted,
                    ...serif,
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                  New recording
                </button>
              </div>
            )}

            {/* CHAT TAB */}
            {tab === "chat" && (
              <div className="flex flex-col flex-1 gap-2" style={{ minHeight: 0 }}>
                <div
                  className="flex-1 rounded-xl p-3 overflow-y-auto flex flex-col gap-2"
                  style={{
                    background: g.surface,
                    border: `1px solid ${g.surfaceBorder}`,
                    maxHeight: 230,
                    minHeight: 80,
                  }}
                >
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-2 py-4 opacity-0 animate-[fadeIn_0.4s_ease_forwards]">
                      <MessageSquare className="w-5 h-5" style={{ color: g.textFaint }} strokeWidth={1.5} />
                      <div className="text-[10px] text-center" style={{ color: g.textFaint, ...serif }}>
                        Ask anything about your notes or this page
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => <ChatBubble key={i} m={m} />)}
                  {aiTyping && (
                    <div className="flex justify-start">
                      <div className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.72)", border: `1px solid ${g.surfaceBorder}` }}>
                        <div className="flex gap-1 items-center h-3">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: g.textFaint, animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div
                  className="rounded-xl flex items-center gap-2 px-3 py-2"
                  style={{ background: g.inputBg, border: `1px solid ${g.surfaceBorder}` }}
                >
                  <button className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: g.surface, border: `1px solid ${g.surfaceBorder}` }}>
                    <Camera className="w-2.5 h-2.5" style={{ color: g.textMuted }} strokeWidth={1.5} />
                  </button>
                  <input
                    className="flex-1 text-[10.5px] bg-transparent outline-none"
                    placeholder="Ask about your notes…"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    style={{ color: g.text, ...serif }}
                  />
                  <button
                    onClick={handleSend}
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                    style={{
                      background: chatInput.trim() ? `linear-gradient(135deg, ${g.primary}, #c4612a)` : g.surface,
                      border: `1px solid ${chatInput.trim() ? "transparent" : g.surfaceBorder}`,
                      boxShadow: chatInput.trim() ? `0 2px 8px ${g.primary}44` : "none",
                    }}
                  >
                    <Send className="w-2.5 h-2.5" style={{ color: chatInput.trim() ? "#fff" : g.textFaint }} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="text-center text-[9px]" style={{ color: g.textFaint, ...serif }}>
                  5 questions left today ·{" "}
                  <span className="underline cursor-pointer" style={{ color: g.primary }}>Upgrade for unlimited</span>
                </div>
              </div>
            )}

            {/* PAGE TAB */}
            {tab === "page" && (
              <div className="flex flex-col flex-1 gap-2">
                <div className="rounded-xl p-3" style={{ background: g.surface, border: `1px solid ${g.surfaceBorder}` }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: g.primary }} strokeWidth={1.5} />
                    <span className="text-[10px] truncate" style={{ color: g.textMuted, ...serif }}>
                      youtube.com/watch?v=…
                    </span>
                  </div>
                  <div className="text-[10.5px] leading-relaxed" style={{ color: g.text, ...serif }}>
                    <strong>The Art of System Design</strong> — Full lecture covering distributed systems, data flow, and scalability patterns.
                  </div>
                  <div className="mt-2 text-[9.5px]" style={{ color: g.textFaint, ...serif, fontStyle: "italic" }}>
                    Ask anything about this page below ↓
                  </div>
                </div>
                <div
                  className="rounded-xl flex items-center gap-2 px-3 py-2"
                  style={{ background: g.inputBg, border: `1px solid ${g.surfaceBorder}` }}
                >
                  <input
                    className="flex-1 text-[10.5px] bg-transparent outline-none"
                    placeholder="Ask about this page…"
                    style={{ color: g.text, ...serif }}
                  />
                  <button className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: g.surface, border: `1px solid ${g.surfaceBorder}` }}>
                    <Send className="w-2.5 h-2.5" style={{ color: g.textFaint }} strokeWidth={1.5} />
                  </button>
                </div>
                <div className="text-center text-[9px]" style={{ color: g.textFaint, ...serif }}>
                  5 questions left today ·{" "}
                  <span className="underline cursor-pointer" style={{ color: g.primary }}>Upgrade for unlimited</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wave-bar { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
      `}</style>
    </div>
  );
};

// ─── Page wrapper ─────────────────────────────────────────────────────────────

const SidepanelTest = () => {
  const [key, setKey] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 pt-8 pb-4">
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          Back
        </a>
      </div>

      <div className="container mx-auto px-6 pb-16">
        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs tracking-widest uppercase text-muted-foreground/50">Design Sandbox</p>
          <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/8 text-amber-600">test only</span>
        </div>
        <h1 className="text-3xl font-normal text-foreground mb-2">Side panel — full flow</h1>
        <p className="text-muted-foreground text-sm mb-12 max-w-lg">
          Interactive prototype of the complete user journey. Iterate here, then push to the real extension.
        </p>

        <div className="flex flex-col lg:flex-row gap-16 items-start">
          <div className="flex-shrink-0">
            <Sidepanel key={key} onReset={() => setKey((k) => k + 1)} />
          </div>

          {/* Flow guide */}
          <div className="flex-1 max-w-md">
            <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-6">The flow</p>
            <div className="space-y-5">
              {[
                { n: "1", label: "Welcome", note: "Greeting + 5 use case cards stagger in. 'Get started' CTA at the bottom." },
                { n: "2", label: "Empty state", note: "Fresh panel. Mic icon, short description, big record button, or 'ask about page' escape." },
                { n: "3", label: "Recording", note: "Live waveform, red pulsing dot, running timer, tab info, free-plan warning." },
                { n: "4", label: "Processing", note: "BookOpen icon + spinner, step-by-step status ('Transcribing… Extracting…'), progress dots." },
                { n: "5", label: "Notes", note: "Notes appear line by line. Notes / Chat / Page tabs. Copy, Redo, Notion sync, New recording." },
                { n: "6", label: "Chat", note: "Empty prompt, then real message bubbles. AI typing indicator. Free limit reminder." },
                { n: "7", label: "Page chat", note: "Shows current tab context. Same chat input. Same limit nudge." },
              ].map(({ n, label, note }) => (
                <div key={n} className="flex gap-4 items-start">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]"
                    style={{ background: g.primaryLight, border: `1px solid ${g.primaryBorder}`, color: g.primary }}>
                    {n}
                  </div>
                  <div>
                    <div className="text-sm text-foreground mb-0.5">{label}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">{note}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-5 rounded-2xl border border-border/60 bg-card/40">
              <p className="text-xs text-muted-foreground/60 mb-2 tracking-widest uppercase">When ready</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tell me what to change — spacing, copy, colors, interactions, new states — and we iterate here. One command pushes the final design to the real extension.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidepanelTest;
