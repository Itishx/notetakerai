import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { Webb, WebbDefs } from "@/components/WebbChar";
import { FERRO_WALKER_SVG } from "@/components/ferroWalkerSvg";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { useBrainoVoice } from "@/hooks/useBrainoVoice";
import { MASCOTS, useMascotPreference } from "@/lib/mascotPreference";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

const THREADS_KEY = "braino-site-chat-threads-v2";
const CURRENT_THREAD_KEY = "braino-site-chat-current-thread-v2";
const DRAFT_KEY = "braino-site-chat-draft-v2";
const DELEGATE_KEY = "braino-site-chat-delegate-v1";

const BRAINO_SITE_CONTEXT = `You are Braino inside the full-screen website chat on trybraino.com.

Be useful first. Sound like Braino: direct, warm, alive, and never corporate. This chat can answer normally, and obvious browser/action tasks can route to Delegate through the user's extension.

Context discipline:
- Treat the provided chat history as the active conversation. Short follow-ups like "bargad", "yes", "that one", or "tell me more" are usually answers to the immediately previous turn, not brand-new topics.
- Use the saved-chat memory block when the user asks what you discussed earlier or references something from another Braino chat.
- Do not pretend you remember something that is not in the provided history or memory block.`;

type ChatRole = "user" | "assistant";
type DelegateStatus = "pending" | "running" | "done" | "error";
type AgentStep = { type?: string; description?: string; ok?: boolean; snapshot?: { title?: string; url?: string } };

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  kind?: "chat" | "delegate";
  commandId?: string;
  status?: DelegateStatus;
  steps?: AgentStep[];
  result?: string | null;
  docUrl?: string;
  docName?: string;
};

type ChatThread = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  customTitle?: boolean;
};

type Command = {
  id: string;
  task: string;
  status: DelegateStatus;
  steps: AgentStep[];
  result: string | null;
};

type Attachment = { id: string; name: string; size: string };
type ExtensionDelegateResult = {
  ok: boolean;
  noBridge?: boolean;
  error?: string | null;
  duplicate?: boolean;
  tabId?: number | null;
  moved?: boolean;
  created?: boolean;
  quotaExceeded?: boolean;
  surface?: string | null;
};

const log = {
  info: (scope: string, msg: string, data?: unknown) =>
    data !== undefined ? console.info(`[braino-chat] ${scope}:`, msg, data) : console.info(`[braino-chat] ${scope}:`, msg),
  warn: (scope: string, msg: string, data?: unknown) =>
    data !== undefined ? console.warn(`[braino-chat] ${scope}:`, msg, data) : console.warn(`[braino-chat] ${scope}:`, msg),
  error: (scope: string, msg: string, data?: unknown) =>
    data !== undefined ? console.error(`[braino-chat] ${scope}:`, msg, data) : console.error(`[braino-chat] ${scope}:`, msg),
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && (item.role === "user" || item.role === "assistant") && typeof item.text === "string";
}

function isChatThread(value: unknown): value is ChatThread {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" && Array.isArray(item.messages) && item.messages.every(isChatMessage);
}

function readThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(THREADS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isChatThread) : [];
  } catch {
    return [];
  }
}

function readCurrentThreadId() {
  if (typeof window === "undefined") return createId();
  return window.localStorage.getItem(CURRENT_THREAD_KEY) || createId();
}

function readDraft() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(DRAFT_KEY) || "";
}

function readDelegateMode() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DELEGATE_KEY) === "1";
}

function makeTitle(messages: ChatMessage[]) {
  const text = messages.find((m) => m.role === "user" && m.text.trim())?.text || "New chat";
  return text.replace(/\s+/g, " ").trim().slice(0, 48) || "New chat";
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function displayNameFromUser(user: { email?: string | null; user_metadata?: { full_name?: string; name?: string } } | null | undefined) {
  const raw = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0];
  if (!raw) return "there";
  const first = raw.replace(/[._-]+/g, " ").trim().split(/\s+/)[0] || "there";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function buildEmptyGreeting(user: { email?: string | null; user_metadata?: { full_name?: string; name?: string } } | null | undefined) {
  const name = displayNameFromUser(user);
  const hour = new Date().getHours();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const inIndia = /Kolkata|Calcutta/i.test(timeZone);
  if (hour >= 23 || hour < 5) return inIndia ? `Late night hai, ${name}. Soja.` : `It's late, ${name}. What are we doing?`;
  if (hour < 12) return inIndia ? `Morning, ${name}. Aaj kya karna hai?` : `Morning, ${name}. What are we doing?`;
  if (hour < 18) return `Hey ${name}, what are we doing?`;
  return inIndia ? `Shaam ho gayi, ${name}. Kya karna hai?` : `Welcome back, ${name}. What are we doing?`;
}

const CHAT_MEMORY_STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "braino", "chat", "could", "details", "does", "from", "give",
  "have", "just", "know", "like", "more", "need", "please", "tell", "that", "their", "there", "these", "thing",
  "this", "what", "when", "where", "which", "with", "would", "your",
]);

function compactText(text: string, max = 420) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function extractMemoryTerms(message: string) {
  return Array.from(new Set(
    String(message || "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .map((word) => word.replace(/^'+|'+$/g, ""))
      .filter((word) => word.length > 2 && !CHAT_MEMORY_STOP_WORDS.has(word))
  )).slice(0, 12);
}

function wantsSavedChatRecall(message: string) {
  return /\b(remember|previous|earlier|last time|old chat|older chat|another chat|other chat|our chat|we talked|did we discuss|conversation|history)\b/i.test(message);
}

function formatChatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function scoreThreadForMemory(thread: ChatThread, terms: string[], recencyIndex: number, forceRecall: boolean) {
  const haystack = `${thread.title}\n${thread.messages.map((message) => message.text).join("\n")}`.toLowerCase();
  const title = thread.title.toLowerCase();
  const termScore = terms.reduce((score, term) => {
    if (!term) return score;
    let next = score;
    if (title.includes(term)) next += 6;
    if (haystack.includes(term)) next += 2;
    return next;
  }, 0);
  const recencyScore = forceRecall ? Math.max(0, 5 - recencyIndex) : 0;
  return termScore + recencyScore;
}

function renderThreadMemory(thread: ChatThread, messages: ChatMessage[]) {
  const turns = messages
    .filter((message) => message.kind !== "delegate" && message.text.trim())
    .slice(-8)
    .map((message) => `- ${message.role}: ${compactText(message.text, 360)}`)
    .join("\n");
  return `Saved chat: "${compactText(thread.title, 80)}" (${formatChatDate(thread.updatedAt)})\n${turns}`;
}

function buildChatMemoryContext(args: {
  threads: ChatThread[];
  currentThreadId: string;
  currentMessages: ChatMessage[];
  message: string;
}) {
  const { threads, currentThreadId, currentMessages, message } = args;
  const activeTurns = currentMessages.filter((item) => item.kind !== "delegate" && item.text.trim()).slice(-10);
  const terms = extractMemoryTerms(message);
  const forceRecall = wantsSavedChatRecall(message);
  const sortedThreads = [...threads]
    .filter((thread) => thread.messages.some((item) => item.kind !== "delegate" && item.text.trim()))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const relevantThreads = sortedThreads
    .filter((thread) => thread.id !== currentThreadId)
    .map((thread, index) => ({ thread, score: scoreThreadForMemory(thread, terms, index, forceRecall) }))
    .filter((item) => forceRecall || item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, forceRecall ? 8 : 5)
    .map((item) => renderThreadMemory(item.thread, item.thread.messages));

  const blocks = [
    "Saved Braino chat context. Use this as recall, not as a transcript to repeat verbatim.",
    activeTurns.length
      ? `Immediate active thread before the latest user message:\n${activeTurns.map((item) => `- ${item.role}: ${compactText(item.text, 360)}`).join("\n")}`
      : "",
    relevantThreads.length
      ? `Relevant saved chats from this browser:\n\n${relevantThreads.join("\n\n")}`
      : forceRecall
        ? "No older saved chats matched beyond the active thread."
        : "",
  ].filter(Boolean).join("\n\n");

  return blocks.length > 6500 ? `${blocks.slice(0, 6500)}…` : blocks;
}

function looksLikeDelegateTask(text: string) {
  return /\b(open|go to|navigate|search|google|click|press|type|fill|submit|send|reply|email|gmail|book|buy|add to cart|order|schedule|create a doc|make a doc|edit|delete|archive|unsubscribe)\b/i.test(text);
}

function runDelegateThroughExtension(task: string, history: ChatMessage[]): Promise<ExtensionDelegateResult> {
  if (typeof window === "undefined") return Promise.resolve({ ok: false, noBridge: true });

  return new Promise((resolve) => {
    const requestId = createId();
    let settled = false;
    const cleanup = () => {
      settled = true;
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
    const finish = (result: ExtensionDelegateResult) => {
      if (settled) return;
      cleanup();
      resolve(result);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as Partial<ExtensionDelegateResult> & { type?: string; requestId?: string };
      if (!data || data.type !== "BRAINO_CHAT_DELEGATE_RESULT" || data.requestId !== requestId) return;
      finish({
        ok: data.ok === true,
        error: typeof data.error === "string" ? data.error : null,
        duplicate: data.duplicate === true,
        tabId: typeof data.tabId === "number" ? data.tabId : null,
        moved: data.moved === true,
        created: data.created === true,
        quotaExceeded: data.quotaExceeded === true,
        surface: typeof data.surface === "string" ? data.surface : null,
      });
    };
    const timer = window.setTimeout(() => {
      finish({ ok: false, noBridge: true, error: "Braino extension bridge did not answer." });
    }, 1400);

    window.addEventListener("message", onMessage);
    window.postMessage({
      type: "BRAINO_CHAT_DELEGATE_RUN",
      requestId,
      task,
      chatHistory: history
        .filter((message) => message.text.trim())
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.text.slice(0, 600) })),
    }, window.location.origin);
  });
}

function fmtInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let key = 0;
  let last = 0;
  let match: RegExpExecArray | null;
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[2]) out.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) out.push(<em key={key++}>{match[3]}</em>);
    else if (match[4]) out.push(<code key={key++}>{match[4]}</code>);
    else if (match[5]) out.push(<a key={key++} href={match[6]} target="_blank" rel="noreferrer">{match[5]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, index) => (
        <p key={index}>
          {para.split(/\n/).map((line, lineIndex, lines) => (
            <span key={lineIndex}>{fmtInline(line)}{lineIndex < lines.length - 1 ? <br /> : null}</span>
          ))}
        </p>
      ))}
    </>
  );
}

function Icon({ name }: { name: "new" | "search" | "library" | "menu" | "plus" | "mic" | "voice" | "send" | "bolt" | "x" | "edit" | "trash" }) {
  const paths: Record<typeof name, React.ReactNode> = {
    new: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    library: <><path d="M4 6h16M4 12h16M4 18h10" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    voice: <><path d="M5 12v0M9 8v8M13 5v14M17 8v8M21 12v0" /></>,
    send: <><path d="M12 19V5M5 12l7-7 7 7" /></>,
    bolt: <><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></>,
    x: <><path d="M6 6l12 12M18 6 6 18" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function BrainoMark({ size = 30, expr = "happy", talking = false }: { size?: number; expr?: string; talking?: boolean }) {
  const { mascot } = useMascotPreference();
  return (
    <span className={`braino-avatar${talking ? " is-talking" : ""}`}>
      {mascot === "webb"
        ? <Webb size={size} arm="none" talk={talking} idle bobAmp={talking ? 0.75 : 0.45} />
        : mascot === "ferro"
          ? <span style={{ width: size, height: size * 1.22, display: "block" }} dangerouslySetInnerHTML={{ __html: FERRO_WALKER_SVG.replace('width="64" height="78"', `width="${size}" height="${Math.round(size * 1.22)}"`) }} />
        : <Braino size={size} expr={expr} arm="none" talk={talking} legs gloves idle bobAmp={talking ? 0.75 : 0.45} />}
    </span>
  );
}

function GreetingWalker() {
  const trackRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const walker = walkerRef.current;
    const root = walker?.querySelector("#__sbwk_root__");
    const flip = walker?.querySelector("#__sbwk_flip__") as HTMLElement | null;
    if (!track || !walker || !root || !flip) return;

    const q = (selector: string) => root.querySelector(selector) as SVGElement | null;
    const legL = q("#__sbwk_ll__");
    const legR = q("#__sbwk_rl__");
    const eyeL = q("#__sbwk_eye_l__");
    const eyeR = q("#__sbwk_eye_r__");
    const pupL = q("#__sbwk_pupil_l__");
    const pupR = q("#__sbwk_pupil_r__");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let last = performance.now();
    let start = last;
    let dir = -1;
    let x = Math.max(6, track.clientWidth - 64 - 6);
    const speed = 74;

    const place = (now: number, moving: boolean) => {
      const t = (now - start) / 1000;
      walker.style.transform = `translateX(${x}px)`;
      flip.style.transform = `scaleX(${dir})`;

      const s = t * 4.5;
      const lp = Math.sin(s);
      const rp = Math.sin(s + Math.PI);
      const ll = moving ? Math.max(0, lp) * 5 : 0;
      const rl = moving ? Math.max(0, rp) * 5 : 0;
      const ls = moving ? Math.max(0, lp) * 8 : 0;
      const rs = moving ? Math.max(0, rp) * 8 : 0;
      const waddle = moving ? Math.sin(s) * 3.4 : 0;
      const walkBob = moving ? (-Math.abs(Math.sin(s)) * 2 - 0.4) : 0;
      const breath = 1 + 0.014 * Math.sin(t * 1.7);
      const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
      root.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);

      legL?.setAttribute("transform", `translate(0 ${-ll}) rotate(${ls} 44 74)`);
      legR?.setAttribute("transform", `translate(0 ${-rl}) rotate(${rs} 56 74)`);

      const blinkPhase = t % 3.4;
      const blink = blinkPhase < 0.13 ? Math.sin((blinkPhase / 0.13) * Math.PI) : 0;
      const eyeSy = Math.max(0.06, 1 - blink);
      eyeL?.setAttribute("transform", `translate(38,48) scale(1,${eyeSy}) translate(-38,-48)`);
      eyeR?.setAttribute("transform", `translate(62,48) scale(1,${eyeSy}) translate(-62,-48)`);

      const gaze = moving ? 2.4 : 0;
      pupL?.setAttribute("transform", `translate(${gaze} 0)`);
      pupR?.setAttribute("transform", `translate(${gaze} 0)`);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const maxX = Math.max(6, track.clientWidth - 64 - 6);
      x += dir * speed * dt;
      if (x <= 6) { x = 6; dir = 1; }
      else if (x >= maxX) { x = maxX; dir = -1; }
      place(now, true);
      raf = requestAnimationFrame(tick);
    };

    if (reduce) {
      place(performance.now(), false);
      return;
    }

    place(last, true);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="bc-empty-walk-track" ref={trackRef} aria-hidden="true">
      <span className="bc-empty-walker" ref={walkerRef}>
        <div id="__sbwk_flip__" dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
      </span>
    </div>
  );
}

async function callBrainoSiteChat(args: {
  message: string;
  history: ChatMessage[];
  chatMemoryContext?: string;
  userId?: string;
  accessToken?: string;
  driveConnected?: boolean;
}) {
  const authHeader = args.accessToken ? `Bearer ${args.accessToken}` : `Bearer ${SUPABASE_KEY}`;
  const notes = [BRAINO_SITE_CONTEXT, args.chatMemoryContext].filter(Boolean).join("\n\n");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-about-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: authHeader },
    body: JSON.stringify({
      message: args.message,
      chatHistory: args.history.slice(-18).filter((m) => m.kind !== "delegate").map((m) => ({ role: m.role, content: m.text })),
      notes,
      userId: args.userId,
      driveConnected: args.driveConnected ?? false,
      clientTimeZone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      clientUtcOffsetMinutes: new Date().getTimezoneOffset() * -1,
      pageContext: {
        title: "Braino full-screen chat",
        url: typeof window !== "undefined" ? window.location.href : "https://trybraino.com/chat",
        text: "The user is talking to Braino inside the dedicated website chat page. Relevant saved chat recall is included in notes when available.",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) throw new Error("Braino hit a rate limit for a minute. Try again in a moment.");
    if (response.status === 402) throw new Error("Braino ran out of AI credits for this route. Top it up and try again.");
    throw new Error(typeof payload?.error === "string" ? payload.error : `Chat request failed (${response.status})`);
  }

  return {
    reply: (payload.reply as string) || "Braino blanked for a second. Try that again.",
    docUrl: payload.docUrl as string | undefined,
    docName: payload.docName as string | undefined,
  };
}

function Turn({ message, reveal, onStop }: { message: ChatMessage; reveal: number | null; onStop: (id: string) => void }) {
  if (message.role === "user") {
    return (
      <div className="bc-turn bc-turn-user">
        <div className="bc-user-bubble">{message.text}</div>
      </div>
    );
  }

  if (message.kind === "delegate") {
    const status = message.status || "pending";
    const steps = (message.steps || []).filter((s) => s.description);
    return (
      <div className="bc-turn bc-turn-braino">
        <BrainoMark size={30} expr={status === "error" ? "ohh" : status === "done" ? "grin" : "think"} />
        <div className="bc-answer">
          <div className="bc-delegate-head">
            <span>Delegate</span>
            <span>{status}</span>
            {(status === "pending" || status === "running") && message.commandId && (
              <button type="button" onClick={() => onStop(message.commandId!)}>Stop</button>
            )}
          </div>
          <p>{message.text}</p>
          {steps.map((step, index) => <p className="bc-step" key={index}>{step.ok ? "Done" : "Check"} · {step.description}</p>)}
          {message.result && <p>{message.result}</p>}
        </div>
      </div>
    );
  }

  const shown = reveal == null ? message.text : message.text.slice(0, reveal);
  const typing = reveal != null && reveal < message.text.length;
  return (
    <div className="bc-turn bc-turn-braino">
      <BrainoMark size={30} expr={typing ? "happy" : "grin"} />
      <div className="bc-answer">
        <Paragraphs text={shown} />
        {typing && <span className="bc-caret" />}
        {!typing && message.docUrl && (
          <a className="bc-doc" href={message.docUrl} target="_blank" rel="noreferrer">{message.docName || "Open Google Doc"}</a>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="bc-turn bc-turn-braino">
      <BrainoMark size={30} expr="think" />
      <div className="bc-thinking"><i /><i /><i /></div>
    </div>
  );
}

function Composer({
  value,
  setValue,
  onSend,
  disabled,
  placeholder,
  attachments,
  onPick,
  onRemove,
  delegateMode,
  onToggleDelegate,
  voiceActive,
  onVoiceToggle,
}: {
  value: string;
  setValue: (value: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  attachments: Attachment[];
  onPick: (files: FileList) => void;
  onRemove: (id: string) => void;
  delegateMode: boolean;
  onToggleDelegate: () => void;
  voiceActive: boolean;
  onVoiceToggle: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  }, [value]);

  return (
    <div className="bc-composer-wrap">
      {attachments.length > 0 && (
        <div className="bc-attachments">
          {attachments.map((item) => (
            <span className="bc-attachment" key={item.id}>
              {item.name} <small>{item.size}</small>
              <button type="button" onClick={() => onRemove(item.id)}><Icon name="x" /></button>
            </span>
          ))}
        </div>
      )}
      <div className={`bc-composer${voiceActive ? " is-voice" : ""}`}>
        <button className="bc-icon-btn" type="button" aria-label="Attach" title="Attach" onClick={() => fileRef.current?.click()}>
          <Icon name="plus" />
        </button>
        <textarea
          ref={inputRef}
          rows={1}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <button className={`bc-route-btn${delegateMode ? " is-on" : ""}`} type="button" onClick={onToggleDelegate}>
          <Icon name="bolt" /> {delegateMode ? "Delegate" : "Instant"}
        </button>
        <button className="bc-voice-orb" type="button" aria-label="Voice conversation" title="Voice conversation" onClick={onVoiceToggle}>
          <Icon name="voice" />
        </button>
        <button className="bc-send" type="button" aria-label="Send" disabled={disabled || (!value.trim() && attachments.length === 0)} onClick={onSend}>
          <Icon name="send" />
        </button>
      </div>
      <input ref={fileRef} type="file" multiple hidden onChange={(event) => {
        if (event.target.files) onPick(event.target.files);
        event.target.value = "";
      }} />
    </div>
  );
}

function VoiceOverlay({
  status,
  error,
  signedIn,
  onStop,
}: {
  status: string;
  error: string;
  signedIn: boolean;
  onStop: () => void;
}) {
  const { mascot } = useMascotPreference();
  const mascotName = MASCOTS[mascot].displayName;
  const talking = status === "speaking";
  const expr = status === "error" ? "ohh" : status === "thinking" ? "think" : talking ? "grin" : "happy";
  return (
    <div className={`bc-voice-stage is-${status}`} role="dialog" aria-label={`${mascotName} voice mode`}>
      <button className="bc-voice-close" type="button" aria-label="Close voice mode" onClick={onStop}>
        <Icon name="x" />
      </button>
      <div className="bc-voice-glow" />
      <div className={`bc-big-braino${status === "listening" ? " is-listening" : ""}`}>
        <div className="bc-voice-sonar" aria-hidden="true"><span /><span /></div>
        <BrainoMark size={190} expr={expr} talking={talking} />
      </div>
      <div className="bc-voice-state">
        {status === "connecting" ? "Waking up"
          : status === "thinking" ? "Thinking"
          : status === "speaking" ? `${mascotName} is speaking`
          : status === "error" ? "Voice needs attention"
          : "Listening"}
      </div>
      {error && (
        <div className="bc-voice-error">
          {error}{!signedIn && <> · <Link to="/auth?redirect=/chat">sign in</Link></>}
        </div>
      )}
      <div className="bc-voice-hint">Press Control twice or Esc to exit</div>
    </div>
  );
}

export default function BrainoChat() {
  const { user, session } = useAuth();
  const { mascot: mascotPref } = useMascotPreference();
  const initial = useMemo(() => {
    const threads = readThreads();
    const id = readCurrentThreadId();
    const existing = threads.find((thread) => thread.id === id);
    return {
      threads,
      currentThreadId: existing?.id || id,
      messages: existing?.messages || [],
    };
  }, []);

  const [threads, setThreads] = useState<ChatThread[]>(initial.threads);
  const [currentThreadId, setCurrentThreadId] = useState(initial.currentThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [draft, setDraft] = useState(readDraft);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [delegateMode, setDelegateMode] = useState(readDelegateMode);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);

  const scrollerRef = useRef<HTMLElement>(null);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { document.title = "Braino Chat"; }, []);
  useEffect(() => { window.sessionStorage.setItem(DRAFT_KEY, draft); }, [draft]);
  useEffect(() => { window.localStorage.setItem(DELEGATE_KEY, delegateMode ? "1" : "0"); }, [delegateMode]);
  useEffect(() => { window.localStorage.setItem(CURRENT_THREAD_KEY, currentThreadId); }, [currentThreadId]);
  useEffect(() => { window.localStorage.setItem(THREADS_KEY, JSON.stringify(threads.slice(0, 80))); }, [threads]);
  useEffect(() => () => { if (revealTimer.current) clearInterval(revealTimer.current); }, []);

  useEffect(() => {
    if (!user) { setDriveConnected(false); return; }
    supabase
      .from("google_drive_connections")
      .select("user_identifier")
      .eq("user_identifier", user.id)
      .maybeSingle()
      .then(({ data }) => setDriveConnected(!!data));
  }, [user]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    requestAnimationFrame(() => { node.scrollTop = node.scrollHeight; });
  }, [messages, isSending]);

  useEffect(() => {
    if (messages.length === 0) return;
    const now = new Date().toISOString();
    setThreads((prev) => {
      const existing = prev.find((thread) => thread.id === currentThreadId);
      const nextThread: ChatThread = {
        id: currentThreadId,
        title: existing?.customTitle ? existing.title : makeTitle(messages),
        updatedAt: now,
        messages,
        customTitle: existing?.customTitle,
      };
      const rest = prev.filter((thread) => thread.id !== currentThreadId);
      if (
        existing &&
        JSON.stringify(existing.messages) === JSON.stringify(messages) &&
        existing.title === nextThread.title &&
        existing.customTitle === nextThread.customTitle
      ) return prev;
      return [nextThread, ...rest].slice(0, 80);
    });
  }, [currentThreadId, messages]);

  const applyCommandUpdate = useCallback((cmd: Command) => {
    if (!cmd?.id) return;
    setMessages((prev) => prev.map((message) => (
      message.commandId === cmd.id
        ? { ...message, status: cmd.status, steps: cmd.steps || [], result: cmd.result ?? null }
        : message
    )));
  }, []);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`braino_chat_cmds_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_commands", filter: `user_id=eq.${user.id}` }, (payload) => {
        applyCommandUpdate(payload.new as Command);
      })
      .subscribe((status) => log.info("delegate", "channel status", status));

    const poll = setInterval(async () => {
      const { data, error: pollError } = await supabase
        .from("agent_commands" as never)
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false })
        .limit(10);
      if (pollError) { log.warn("delegate", "poll failed", pollError); return; }
      (data as unknown as Command[] | null)?.forEach(applyCommandUpdate);
    }, 3000);

    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [user, applyCommandUpdate]);

  const streamReply = useCallback((reply: string, docUrl?: string, docName?: string) => {
    const id = createId();
    setIsSending(false);
    setMessages((prev) => [...prev, { id, role: "assistant", text: reply, createdAt: new Date().toISOString(), kind: "chat", docUrl, docName }]);
    setReveal({ id, n: 0 });
    let n = 0;
    if (revealTimer.current) clearInterval(revealTimer.current);
    revealTimer.current = setInterval(() => {
      n += Math.max(2, Math.round(reply.length / 200));
      if (n >= reply.length) {
        if (revealTimer.current) clearInterval(revealTimer.current);
        setReveal(null);
      } else {
        setReveal({ id, n });
      }
    }, 18);
  }, []);

  const ask = useCallback(async (text: string, history: ChatMessage[]) => {
    setIsSending(true);
    setError("");
    try {
      const response = await callBrainoSiteChat({
        message: text,
        history,
        chatMemoryContext: buildChatMemoryContext({
          threads,
          currentThreadId,
          currentMessages: history,
          message: text,
        }),
        userId: user?.id,
        accessToken: session?.access_token,
        driveConnected,
      });
      streamReply(response.reply, response.docUrl, response.docName);
      return response.reply;
    } catch (askError) {
      const message = askError instanceof Error ? askError.message : "Something went sideways while Braino was replying.";
      setIsSending(false);
      setError(message);
      setMessages((prev) => [...prev, { id: createId(), role: "assistant", text: message, createdAt: new Date().toISOString(), kind: "chat" }]);
      throw askError;
    }
  }, [currentThreadId, driveConnected, session?.access_token, streamReply, threads, user?.id]);

  const delegate = useCallback(async (task: string, history: ChatMessage[] = []) => {
    const tempId = createId();
    setMessages((prev) => [...prev, {
      id: tempId,
      role: "assistant",
      text: "Starting Delegate...",
      createdAt: new Date().toISOString(),
      kind: "delegate",
      status: "pending",
      steps: [],
      result: null,
    }]);

    const extensionStart = await runDelegateThroughExtension(task, history);
    if (extensionStart.ok) {
      const detail = extensionStart.duplicate
        ? "Delegate is already running this task in your browser."
        : extensionStart.created
          ? "Started Delegate in a new browser tab."
          : extensionStart.moved
            ? "Started Delegate on the best browser tab I could use."
            : "Started Delegate in your browser.";
      const spoken = extensionStart.duplicate ? "Delegate is already running that." : "On it. I started Delegate.";
      setMessages((prev) => prev.map((message) => message.id === tempId
        ? {
            ...message,
            text: "Delegate is running.",
            status: "done",
            steps: [{ description: detail, ok: true }],
            result: "Watch Braino on the target tab for the live run.",
          }
        : message));
      return spoken;
    }

    if (!extensionStart.noBridge) {
      const message = extensionStart.quotaExceeded
        ? "Delegate is blocked by your current plan limit."
        : extensionStart.error || "The Braino extension could not start Delegate.";
      setError(`Delegate failed: ${message}`);
      setMessages((prev) => prev.map((item) => item.id === tempId ? { ...item, status: "error", result: message } : item));
      return message;
    }

    if (!user) {
      const message = "I could not reach the installed extension from this page. Sign in and keep the extension running, then try again.";
      setMessages((prev) => prev.map((item) => item.id === tempId ? { ...item, status: "error", result: message } : item));
      return message;
    }

    const contextTurns = history
      .filter((message) => message.text.trim())
      .slice(-8)
      .map((message) => ({
        role: message.role,
        content: (message.kind === "delegate" ? `Ran delegate task: ${message.text}${message.result ? ` - ${message.result}` : ""}` : message.text).slice(0, 500),
      }));

    try {
      const { data, error: queueError } = await supabase
        .from("agent_commands" as never)
        .insert({
          user_id: user.id,
          task,
          status: "pending",
          steps: contextTurns.length ? [{ __context: true, chatHistory: contextTurns }] : [],
        } as never)
        .select()
        .single();
      if (queueError) throw queueError;
      const row = data as unknown as Command;
      setMessages((prev) => prev.map((message) => message.id === tempId
        ? { ...message, text: "Delegate is queued.", commandId: row.id, status: row.status, steps: row.steps || [], result: row.result ?? null }
        : message));
      return "I queued Delegate for your browser.";
    } catch (queueError) {
      const message = queueError instanceof Error ? queueError.message : "Couldn't reach the task queue.";
      setError(`Delegate failed: ${message}`);
      setMessages((prev) => prev.map((item) => item.id === tempId ? { ...item, status: "error", result: message } : item));
      return message;
    }
  }, [user]);

  const send = useCallback((preset?: string) => {
    const typed = (preset ?? draft).trim();
    const activeAttachments = preset ? [] : attachments;
    let text = typed;
    if (activeAttachments.length) {
      const names = activeAttachments.map((item) => item.name).join(", ");
      text = typed ? `${typed}\n\n(Attached: ${names})` : `(Attached: ${names})`;
    }
    if (!text || isSending) return;

    const userMessage: ChatMessage = { id: createId(), role: "user", text, createdAt: new Date().toISOString(), kind: "chat" };
    const history = messages.slice();
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");
    setAttachments([]);

    if (delegateMode || looksLikeDelegateTask(text)) void delegate(text, history);
    else void ask(text, history);
  }, [ask, attachments, delegate, delegateMode, draft, isSending, messages]);

  const voiceTurn = useCallback(async (text: string) => {
    const userMessage: ChatMessage = { id: createId(), role: "user", text, createdAt: new Date().toISOString(), kind: "chat" };
    const history = messages.slice();
    setMessages((prev) => [...prev, userMessage]);
    if (delegateMode || looksLikeDelegateTask(text)) return await delegate(text, history);
    return await ask(text, history);
  }, [ask, delegate, delegateMode, messages]);

  const handleVoiceLog = useCallback((scope: string, message: string, data?: unknown) => {
    log.info(scope, message, data);
  }, []);

  const {
    active: voiceActive,
    status: voiceStatus,
    error: voiceError,
    toggle: voiceToggle,
    stop: voiceStop,
  } = useBrainoVoice({
    accessToken: session?.access_token,
    onTranscript: voiceTurn,
    onLog: handleVoiceLog,
  });

  useEffect(() => {
    let taps = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && voiceActive) { voiceStop(); return; }
      if (event.key !== "Control" || event.repeat) return;
      taps += 1;
      if (timer) clearTimeout(timer);
      if (taps >= 2) {
        taps = 0;
        voiceToggle();
        return;
      }
      timer = setTimeout(() => { taps = 0; }, 400);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (timer) clearTimeout(timer); };
  }, [voiceActive, voiceStop, voiceToggle]);

  const newChat = useCallback(() => {
    const id = createId();
    setCurrentThreadId(id);
    setMessages([]);
    setDraft("");
    setError("");
    setReveal(null);
    setIsSending(false);
    setAttachments([]);
    if (revealTimer.current) clearInterval(revealTimer.current);
  }, []);

  const selectThread = useCallback((thread: ChatThread) => {
    setCurrentThreadId(thread.id);
    setMessages(thread.messages);
    setDraft("");
    setError("");
    setReveal(null);
  }, []);

  const renameThread = useCallback((thread: ChatThread) => {
    const nextTitle = window.prompt("Rename chat", thread.title)?.trim();
    if (!nextTitle || nextTitle === thread.title) return;
    setThreads((prev) => prev.map((item) => (
      item.id === thread.id
        ? { ...item, title: nextTitle.slice(0, 80), customTitle: true, updatedAt: new Date().toISOString() }
        : item
    )));
  }, []);

  const deleteThread = useCallback((thread: ChatThread) => {
    if (!window.confirm(`Delete "${thread.title}"?`)) return;
    const remaining = threads.filter((item) => item.id !== thread.id);
    setThreads(remaining);
    if (thread.id !== currentThreadId) return;

    const nextThread = remaining[0];
    if (nextThread) {
      setCurrentThreadId(nextThread.id);
      setMessages(nextThread.messages);
    } else {
      setCurrentThreadId(createId());
      setMessages([]);
    }
    setDraft("");
    setError("");
    setReveal(null);
    setAttachments([]);
    setIsSending(false);
    if (revealTimer.current) clearInterval(revealTimer.current);
  }, [currentThreadId, threads]);

  const stopTask = useCallback(async (commandId: string) => {
    setMessages((prev) => prev.map((message) => message.commandId === commandId ? { ...message, status: "error", result: "Stopped by user" } : message));
    await supabase
      .from("agent_commands" as never)
      .update({ status: "error", result: "Stopped by user" } as never)
      .eq("id", commandId);
  }, []);

  const pickFiles = useCallback((files: FileList) => {
    setAttachments((prev) => [...prev, ...Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      size: fmtSize(file.size),
    }))]);
  }, []);

  const removeAttach = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) => thread.title.toLowerCase().includes(q));
  }, [search, threads]);

  const currentTitle = useMemo(() => {
    const currentThread = threads.find((thread) => thread.id === currentThreadId);
    return currentThread?.title || (messages.length ? makeTitle(messages) : "New chat");
  }, [currentThreadId, messages, threads]);

  const mascotName = MASCOTS[mascotPref].displayName;
  const placeholder = delegateMode ? `Tell ${mascotName} what to do...` : `Message ${mascotName}`;
  const emptyGreeting = useMemo(() => buildEmptyGreeting(user), [user]);

  return (
    <div className={`bchat ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <style>{CHAT_CSS}</style>
      <BrainoDefs />
      <WebbDefs />
      {voiceActive && (
        <VoiceOverlay status={voiceStatus} error={voiceError} signedIn={!!user} onStop={voiceStop} />
      )}

      <aside className="bc-sidebar">
        <div className="bc-side-top">
          <div className="bc-brand">
            <BrainoMark size={28} expr="happy" />
            {!sidebarCollapsed && <strong>Braino</strong>}
          </div>
          <button className="bc-side-icon" type="button" aria-label="Toggle sidebar" onClick={() => setSidebarCollapsed((value) => !value)}>
            <Icon name="menu" />
          </button>
        </div>

        <nav className="bc-nav">
          <button type="button" onClick={newChat}><Icon name="new" /><span>New chat</span></button>
          <label className="bc-search"><Icon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" /></label>
          <button type="button"><Icon name="library" /><span>Library</span></button>
        </nav>

        <div className="bc-thread-section">
          <p>Chats</p>
          <div className="bc-thread-list">
            {filteredThreads.length === 0 && <span className="bc-empty-chat">No chats yet</span>}
            {filteredThreads.map((thread) => (
              <div className={`bc-thread-row${thread.id === currentThreadId ? " is-active" : ""}`} key={thread.id}>
                <button
                  className="bc-thread-open"
                  type="button"
                  onClick={() => selectThread(thread)}
                  title={thread.title}
                >
                  {thread.title}
                </button>
                <div className="bc-thread-actions" aria-label={`${thread.title} actions`}>
                  <button type="button" aria-label={`Rename ${thread.title}`} title="Rename chat" onClick={() => renameThread(thread)}>
                    <Icon name="edit" />
                  </button>
                  <button type="button" aria-label={`Delete ${thread.title}`} title="Delete chat" onClick={() => deleteThread(thread)}>
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bc-account">
          <span>{user?.email?.slice(0, 1).toUpperCase() || "B"}</span>
          {!sidebarCollapsed && (
            <div>
              <strong>{user?.email?.split("@")[0] || "Braino"}</strong>
              <Link to={user ? "/dashboard" : "/auth?redirect=/chat"}>{user ? "Dashboard" : "Sign in"}</Link>
            </div>
          )}
        </div>
      </aside>

      <main className="bc-main" ref={scrollerRef}>
        <header className="bc-topbar">
          <div>
            <span className="bc-kicker">Braino Chat</span>
            <h1>{currentTitle}</h1>
          </div>
        </header>

        <div className="bc-scroll">
          <div className="bc-thread">
            {messages.length === 0 && (
              <div className="bc-empty">
                <div className="bc-empty-greeting-stage">
                  <GreetingWalker />
                  <h2>{emptyGreeting}</h2>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <Turn key={message.id} message={message} reveal={reveal?.id === message.id ? reveal.n : null} onStop={stopTask} />
            ))}
            {isSending && <Thinking />}
          </div>
        </div>

        <div className="bc-dock">
          {error && <div className="bc-error">{error}</div>}
          <Composer
            value={draft}
            setValue={setDraft}
            onSend={() => send()}
            disabled={isSending}
            placeholder={placeholder}
            attachments={attachments}
            onPick={pickFiles}
            onRemove={removeAttach}
            delegateMode={delegateMode}
            onToggleDelegate={() => setDelegateMode((value) => !value)}
            voiceActive={voiceActive}
            onVoiceToggle={voiceToggle}
          />
        </div>
      </main>
    </div>
  );
}

const CHAT_CSS = `
.bchat{
  position:fixed;
  inset:0;
  z-index:50;
  display:grid;
  grid-template-columns:300px minmax(0,1fr);
  height:100dvh;
  min-height:0;
  background:#000;
  color:#ececec;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  overflow:hidden;
}
.bchat *{box-sizing:border-box}
.bchat button{font:inherit;color:inherit}
.bchat button svg,.bc-search svg,.bc-nav svg,.bc-route-btn svg,.bc-attachment svg{
  width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round
}
.braino-avatar{display:inline-flex;align-items:center;justify-content:center;flex:none}
.braino-avatar svg{overflow:visible;width:auto;height:auto}
.braino-avatar.is-talking{animation:bcTalkBob 1s ease-in-out infinite}
@keyframes bcTalkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}

.bc-sidebar{
  min-width:0;
  min-height:0;
  height:100dvh;
  background:#050505;
  border-right:1px solid #242424;
  padding:18px 10px 12px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.bchat.is-collapsed{grid-template-columns:72px minmax(0,1fr)}
.bchat.is-collapsed .bc-sidebar{align-items:center;padding-inline:8px}
.bchat.is-collapsed .bc-nav span,
.bchat.is-collapsed .bc-thread-section,
.bchat.is-collapsed .bc-search input{display:none}
.bc-side-top,.bc-brand{display:flex;align-items:center;gap:10px}
.bc-side-top{justify-content:space-between}
.bc-brand strong{font-size:18px}
.bc-side-icon,.bc-nav button,.bc-icon-btn,.bc-send,.bc-voice-orb,.bc-route-btn{
  border:0;
  background:transparent;
  cursor:pointer;
}
.bc-side-icon,.bc-icon-btn{
  width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#f2f2f2;
}
.bc-icon-btn{
  background:#383838;
  border:1px solid #505050;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
}
.bc-composer .bc-icon-btn{
  width:46px;
  height:46px;
  border-radius:50%;
  flex:none;
  align-self:center;
}
.bc-side-icon:hover,.bc-nav button:hover{background:#1d1d1d}
.bc-icon-btn:hover{background:#464646;border-color:#666}
.bc-nav{display:flex;flex-direction:column;gap:8px}
.bc-nav button,.bc-search{
  width:100%;
  min-height:40px;
  border-radius:10px;
  display:flex;
  align-items:center;
  gap:12px;
  padding:0 12px;
  color:#e8e8e8;
}
.bc-search{background:transparent}
.bc-search input{
  width:100%;
  border:0;
  outline:0;
  background:transparent;
  color:#e8e8e8;
  font:inherit;
}
.bc-thread-section{min-height:0;display:flex;flex:1;flex-direction:column;gap:8px}
.bc-thread-section p{
  margin:8px 12px 4px;
  font-size:13px;
  font-weight:700;
  color:#f1f1f1;
}
.bc-thread-list{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:4px;padding-right:2px}
.bc-thread-row{
  display:flex;
  align-items:center;
  gap:4px;
  border-radius:10px;
  color:#d7d7d7;
}
.bc-thread-row:hover,.bc-thread-row.is-active{background:#202020;color:#fff}
.bc-thread-open{
  border:0;
  background:transparent;
  min-width:0;
  flex:1;
  text-align:left;
  color:inherit;
  border-radius:10px;
  padding:10px 8px 10px 12px;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
  cursor:pointer;
}
.bc-thread-actions{
  display:flex;
  align-items:center;
  gap:2px;
  flex:none;
  opacity:0;
  padding-right:4px;
  transition:opacity .16s ease;
}
.bc-thread-row:hover .bc-thread-actions,.bc-thread-row:focus-within .bc-thread-actions,.bc-thread-row.is-active .bc-thread-actions{opacity:1}
.bc-thread-actions button{
  width:30px;
  height:30px;
  border:0;
  border-radius:8px;
  background:transparent;
  color:#bdbdbd;
  display:grid;
  place-items:center;
  cursor:pointer;
}
.bc-thread-actions button:hover{background:#303030;color:#fff}
.bc-thread-actions svg{width:16px;height:16px}
.bc-empty-chat{color:#777;font-size:13px;padding:10px 12px}
.bc-account{
  border-top:1px solid #222;
  padding-top:12px;
  display:flex;
  align-items:center;
  gap:10px;
}
.bc-account>span{
  width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#2488d8;color:#fff;font-size:13px;font-weight:700;
}
.bc-account div{display:flex;flex-direction:column;min-width:0}
.bc-account strong{font-size:14px;overflow:hidden;text-overflow:ellipsis}
.bc-account a{font-size:12px;color:#aaa;text-decoration:none}

.bc-main{
  min-width:0;
  min-height:0;
  height:100dvh;
  position:relative;
  display:flex;
  flex-direction:column;
  background:#000;
  overflow-y:auto;
  overflow-x:hidden;
  scrollbar-gutter:stable;
  overscroll-behavior:contain;
}
.bc-topbar{
  height:70px;
  display:flex;
  align-items:center;
  justify-content:flex-start;
  padding:0 28px;
  flex:none;
  position:sticky;
  top:0;
  z-index:3;
  background:#000;
}
.bc-kicker{font-size:12px;color:#8c8c8c}
.bc-topbar h1{font-size:18px;line-height:1.2;margin:2px 0 0;font-weight:650}
.bc-scroll{min-height:0;flex:1 0 auto;overflow:visible;padding:20px 20px 180px}
.bc-thread{width:min(1020px,100%);margin:0 auto;display:flex;flex-direction:column;gap:30px}
.bc-empty{
  min-height:54vh;
  display:grid;
  place-items:center;
  text-align:center;
  color:#dcdcdc;
  align-content:center;
  gap:18px;
  padding-top:42px;
}
.bc-empty-greeting-stage{
  position:relative;
  display:inline-block;
  width:fit-content;
  max-width:min(92vw,900px);
  min-width:min(360px,92vw);
  padding:78px 14px 18px;
}
.bc-empty-walk-track{
  position:absolute;
  top:0;
  left:14px;
  right:14px;
  height:78px;
  overflow:hidden;
  pointer-events:none;
}
.bc-empty-walker{
  position:absolute;
  left:0;
  bottom:0;
  width:64px;
  display:block;
  will-change:transform;
}
.bc-empty-walker #__sbwk_flip__{transform-origin:center;display:block}
.bc-empty-walker svg{width:64px!important;height:auto!important;overflow:visible}
.bc-empty h2{
  font-family:"Instrument Serif",Georgia,serif;
  font-size:clamp(34px,4.8vw,58px);
  line-height:1.04;
  letter-spacing:0;
  font-weight:400;
  margin:0;
}
.bc-turn{display:flex;gap:16px;align-items:flex-start}
.bc-turn-user{justify-content:flex-end}
.bc-user-bubble{
  max-width:min(660px,72%);
  padding:14px 18px;
  border-radius:22px;
  background:#2f2f2f;
  color:#ececec;
  font-size:16px;
  line-height:1.45;
}
.bc-answer{
  max-width:760px;
  color:#ececec;
  font-size:16px;
  line-height:1.65;
}
.bc-answer p{margin:0 0 14px}
.bc-answer p:last-child{margin-bottom:0}
.bc-answer code{background:#1f1f1f;border-radius:6px;padding:2px 5px}
.bc-answer a{color:#ff9c92}
.bc-caret{display:inline-block;width:2px;height:1em;background:#ececec;animation:bcBlink 1s steps(2) infinite}
@keyframes bcBlink{50%{opacity:0}}
.bc-thinking{display:flex;gap:6px;padding-top:8px}
.bc-thinking i{width:7px;height:7px;border-radius:50%;background:#aaa;animation:bcDot 1.1s infinite ease-in-out}
.bc-thinking i:nth-child(2){animation-delay:.15s}
.bc-thinking i:nth-child(3){animation-delay:.3s}
@keyframes bcDot{0%,100%{opacity:.35;transform:translateY(0)}45%{opacity:1;transform:translateY(-5px)}}
.bc-doc{display:inline-flex;margin-top:8px;color:#ff9c92;text-decoration:none}
.bc-delegate-head{display:flex;align-items:center;gap:10px;color:#aaa;font-size:13px;margin-bottom:8px}
.bc-delegate-head button{border:1px solid #444;background:#191919;border-radius:999px;padding:4px 10px;cursor:pointer}
.bc-step{color:#aaa;font-size:14px}

.bc-dock{
  position:sticky;
  left:0;
  right:0;
  bottom:0;
  z-index:4;
  flex:none;
  margin-top:auto;
  padding:24px 24px 30px;
  background:linear-gradient(180deg,rgba(0,0,0,0),#000 34%);
  pointer-events:none;
}
.bc-composer-wrap{width:min(1020px,100%);margin:0 auto}
.bc-composer-wrap,.bc-error{pointer-events:auto}
.bc-attachments{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px 14px}
.bc-attachment{display:inline-flex;align-items:center;gap:8px;border:1px solid #3a3a3a;background:#1f1f1f;border-radius:999px;padding:6px 8px 6px 12px;font-size:13px}
.bc-attachment small{color:#999}
.bc-attachment button{width:22px;height:22px;border:0;background:transparent;display:grid;place-items:center;cursor:pointer}
.bc-attachment svg{width:14px;height:14px}
.bc-composer{
  min-height:68px;
  display:flex;
  align-items:center;
  gap:8px;
  border-radius:28px;
  background:#2a2a2a;
  border:1px solid #3a3a3a;
  padding:10px;
  box-shadow:0 16px 50px rgba(0,0,0,.35);
}
.bc-composer.is-voice{border-color:#f4f4f4;box-shadow:0 0 0 1px #f4f4f4,0 0 38px rgba(255,255,255,.18)}
.bc-composer textarea{
  flex:1;
  min-width:0;
  max-height:180px;
  resize:none;
  border:0;
  outline:0;
  background:transparent;
  color:#f4f4f4;
  font-size:17px;
  line-height:1.45;
  padding:12px 4px;
}
.bc-composer textarea::placeholder{color:#a5a5a5}
.bc-route-btn{
  height:42px;
  border-radius:999px;
  padding:0 12px;
  display:flex;
  align-items:center;
  gap:7px;
  align-self:center;
  background:#383838;
  border:1px solid #505050;
  color:#f2f2f2;
  font-weight:600;
}
.bc-route-btn.is-on{background:#4a2522;color:#ffc1bb}
.bc-send,.bc-voice-orb{
  width:46px;height:46px;border-radius:50%;display:grid;place-items:center;flex:none;
  align-self:center;
  border:1px solid #f7f7f7;
  box-shadow:0 3px 12px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.45);
}
.bc-send svg,.bc-voice-orb svg,.bc-icon-btn svg,.bc-route-btn svg{opacity:1;stroke:currentColor}
.bc-composer .bc-send{background:#f4f4f4;color:#050505}
.bc-send:disabled{
  opacity:1;
  cursor:default;
  background:#515151;
  color:#dcdcdc;
  border-color:#696969;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
}
.bc-composer .bc-voice-orb{background:#f7f7f7;color:#050505}
.bc-composer.is-voice .bc-voice-orb{
  background:#fff;
  color:#050505;
  box-shadow:0 0 0 3px #f3a92a,0 0 24px rgba(243,169,42,.48);
}
.bc-icon-btn.is-on{background:#f4f4f4;color:#000;border-color:#fff}
.bc-error{width:min(1020px,100%);margin:0 auto 10px;padding:10px 14px;border-radius:12px;background:#3a1f1d;color:#ffb3ad}

.bc-voice-stage{
  position:fixed;
  top:0;
  right:0;
  bottom:0;
  left:300px;
  z-index:1000;
  display:grid;
  place-items:center;
  background:#000;
  overflow:hidden;
}
.bchat.is-collapsed .bc-voice-stage{left:72px}
.bc-voice-glow{
  position:absolute;
  width:480px;height:480px;border-radius:50%;
  background:radial-gradient(circle,rgba(232,120,110,.24),rgba(232,120,110,.08) 42%,transparent 70%);
  animation:bcVoicePulse 2.2s ease-in-out infinite;
}
.bc-voice-stage.is-speaking .bc-voice-glow{animation-duration:.8s}
@keyframes bcVoicePulse{0%,100%{transform:scale(.92);opacity:.7}50%{transform:scale(1.08);opacity:1}}
.bc-big-braino{position:relative;z-index:1;filter:drop-shadow(0 18px 28px rgba(232,120,110,.22))}
.bc-voice-sonar{
  position:absolute;
  left:50%;
  top:42%;
  width:170px;
  height:170px;
  transform:translate(-50%,-50%);
  pointer-events:none;
  z-index:-1;
  opacity:0;
}
.bc-big-braino.is-listening .bc-voice-sonar{opacity:1}
.bc-voice-sonar span{
  position:absolute;
  inset:0;
  border-radius:50%;
  border:2px solid rgba(232,120,110,.42);
  transform:scale(.45);
  opacity:0;
  animation:bcVoiceSonar 2.4s ease-out infinite;
}
.bc-voice-sonar span:nth-child(2){animation-delay:1.2s}
@keyframes bcVoiceSonar{
  0%{transform:scale(.45);opacity:0}
  14%{opacity:.65}
  100%{transform:scale(2.7);opacity:0}
}
.bc-voice-state{
  position:absolute;
  bottom:116px;
  z-index:2;
  font-size:15px;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:#e8e8e8;
}
.bc-voice-hint{
  position:absolute;
  bottom:76px;
  z-index:2;
  color:#888;
  font-size:13px;
}
.bc-voice-error{
  position:absolute;
  bottom:150px;
  z-index:2;
  max-width:520px;
  padding:10px 14px;
  border-radius:12px;
  background:#3a1f1d;
  color:#ffb3ad;
  text-align:center;
}
.bc-voice-error a{color:#fff}
.bc-voice-close{
  position:absolute;
  top:22px;
  right:22px;
  width:42px;
  height:42px;
  border:0;
  border-radius:50%;
  background:#1f1f1f;
  color:#f4f4f4;
  display:grid;
  place-items:center;
  cursor:pointer;
  z-index:2;
}

@media (max-width:760px){
  .bchat{grid-template-columns:1fr}
  .bc-sidebar{position:absolute;z-index:4;width:300px;inset:0 auto 0 0;transform:translateX(-100%);transition:transform .2s}
  .bchat:not(.is-collapsed) .bc-sidebar{transform:translateX(0)}
  .bchat.is-collapsed{grid-template-columns:1fr}
  .bc-voice-stage,.bchat.is-collapsed .bc-voice-stage{left:0}
  .bc-topbar{padding-left:76px}
  .bc-scroll{padding-inline:14px}
  .bc-user-bubble{max-width:88%}
  .bc-dock{padding:18px 12px}
  .bc-route-btn{display:none}
  .bc-big-braino .braino-avatar svg{max-width:72vw}
}
`;
