import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { Webb, WebbDefs } from "@/components/WebbChar";
import { FERRO_WALKER_SVG } from "@/components/ferroWalkerSvg";
import { Brainelle } from "@/components/Brainelle";
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

function Markdown({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split("\n");
  const isBlockStart = (line: string) => /^(#{1,4}\s|\s*>|\s*([-*•]|\d+\.)\s|```|\s*(---|___|\*\*\*)\s*$)/.test(line);
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }

    if (/^```/.test(line)) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) { body.push(lines[i]); i += 1; }
      i += 1;
      blocks.push(<pre key={key++}><code>{body.join("\n")}</code></pre>);
      continue;
    }

    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
      blocks.push(<hr key={key++} />);
      i += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const Tag = (`h${Math.min(heading[1].length + 1, 5)}`) as "h2" | "h3" | "h4" | "h5";
      blocks.push(<Tag key={key++}>{fmtInline(heading[2])}</Tag>);
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { body.push(lines[i].replace(/^\s*>\s?/, "")); i += 1; }
      blocks.push(
        <blockquote key={key++}>
          {body.filter((row) => row.trim()).map((row, index) => <p key={index}>{fmtInline(row)}</p>)}
        </blockquote>,
      );
      continue;
    }

    if (/^\s*([-*•]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+\.)\s+/, ""));
        i += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(<List key={key++}>{items.map((item, index) => <li key={index}>{fmtInline(item)}</li>)}</List>);
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { para.push(lines[i]); i += 1; }
    blocks.push(
      <p key={key++}>
        {para.map((row, index) => (
          <span key={index}>{fmtInline(row)}{index < para.length - 1 ? <br /> : null}</span>
        ))}
      </p>,
    );
  }

  return <>{blocks}</>;
}

type IconName =
  | "new" | "search" | "panel" | "plus" | "mic" | "voice" | "send" | "think" | "bolt"
  | "x" | "edit" | "trash" | "share" | "dots" | "sparkle" | "down" | "copy" | "check" | "globe";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    new: <><path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" /><path d="M18.4 2.6a2 2 0 0 1 2.8 2.8L12.5 14 9 15l1-3.5 8.4-8.4z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    panel: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9.5 4v16" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
    voice: <><path d="M6 10v4M10 6.5v11M14 8.5v7M18 10.5v3" /></>,
    send: <><path d="M12 19V5M5 12l7-7 7 7" /></>,
    think: <><path d="M12 5.5v13" /><path d="M9.5 5.5a3 3 0 0 0-3 3 3 3 0 0 0-.8 5.6 3 3 0 0 0 3.8 4.4" /><path d="M14.5 5.5a3 3 0 0 1 3 3 3 3 0 0 1 .8 5.6 3 3 0 0 1-3.8 4.4" /></>,
    bolt: <><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></>,
    x: <><path d="M6 6l12 12M18 6 6 18" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5M14 11v5" /></>,
    share: <><path d="M12 15V3" /><path d="m8 7 4-4 4 4" /><path d="M4 14v4a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-4" /></>,
    dots: <><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>,
    sparkle: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M18.5 15.5 19 17l1.5.5-1.5.5-.5 1.5-.5-1.5L16 17l1.5-.5z" /></>,
    down: <><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></>,
    copy: <><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2" /></>,
    check: <><path d="m5 13 4 4L19 7" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function BrainoMark({ size = 30, expr = "happy", talking = false }: { size?: number; expr?: string; talking?: boolean }) {
  const { mascot } = useMascotPreference();
  return (
    <span className={`braino-avatar${talking ? " is-talking" : ""}`}>
      {mascot === "brainelle"
        ? <Brainelle size={size} expr={expr} arm="none" talk={talking} legs idle bobAmp={talking ? 0.75 : 0.45} />
        : mascot === "webb"
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

function CopyAction({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="bc-msg-action"
      type="button"
      aria-label="Copy message"
      title="Copy"
      onClick={() => {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1400);
        }).catch(() => {});
      }}
    >
      <Icon name={done ? "check" : "copy"} />
    </button>
  );
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
        <BrainoMark size={26} expr={status === "error" ? "ohh" : status === "done" ? "grin" : "think"} />
        <div className="bc-answer">
          <div className="bc-delegate-head">
            <span className="bc-delegate-tag">Delegate</span>
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
      <BrainoMark size={26} expr={typing ? "happy" : "grin"} />
      <div className="bc-answer">
        <Markdown text={shown} />
        {typing && <span className="bc-caret" />}
        {!typing && message.docUrl && (
          <a className="bc-doc" href={message.docUrl} target="_blank" rel="noreferrer">{message.docName || "Open Google Doc"}</a>
        )}
        {!typing && message.text.trim() && (
          <div className="bc-msg-actions"><CopyAction text={message.text} /></div>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="bc-turn bc-turn-braino">
      <BrainoMark size={26} expr="think" />
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
  const canSend = value.trim().length > 0 || attachments.length > 0;

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 200)}px`;
  }, [value]);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth <= 760) return;
    inputRef.current?.focus();
  }, []);

  return (
    <div className="bc-composer-wrap">
      {attachments.length > 0 && (
        <div className="bc-attachments">
          {attachments.map((item) => (
            <span className="bc-attachment" key={item.id}>
              {item.name} <small>{item.size}</small>
              <button type="button" aria-label={`Remove ${item.name}`} onClick={() => onRemove(item.id)}><Icon name="x" /></button>
            </span>
          ))}
        </div>
      )}
      <div className={`bc-composer${voiceActive ? " is-voice" : ""}`}>
        <button className="bc-tool" type="button" aria-label="Add photos and files" title="Add photos and files" onClick={() => fileRef.current?.click()}>
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
        <button
          className={`bc-tool bc-tool-label${delegateMode ? " is-on" : ""}`}
          type="button"
          title="Delegate: let Braino act in your browser"
          aria-pressed={delegateMode}
          onClick={onToggleDelegate}
        >
          <Icon name="think" /><span>Delegate</span>
        </button>
        {canSend ? (
          <button className="bc-send" type="button" aria-label="Send" disabled={disabled} onClick={onSend}>
            <Icon name="send" />
          </button>
        ) : (
          <button className="bc-orb" type="button" aria-label="Voice conversation" title="Voice conversation" onClick={onVoiceToggle}>
            <Icon name="voice" />
          </button>
        )}
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
  const { user, session, isPremium } = useAuth();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth <= 860);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
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

  const currentThread = useMemo(
    () => threads.find((thread) => thread.id === currentThreadId),
    [currentThreadId, threads],
  );

  const mascotName = MASCOTS[mascotPref].displayName;
  const placeholder = delegateMode ? `Tell ${mascotName} what to do...` : "Ask anything";
  const emptyGreeting = useMemo(() => buildEmptyGreeting(user), [user]);
  const accountName = displayNameFromUser(user);

  const onThreadScroll = useCallback(() => {
    const node = scrollerRef.current;
    if (!node) return;
    setAtBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 120);
  }, []);

  const scrollToBottom = useCallback(() => {
    const node = scrollerRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, []);

  const copyTranscript = useCallback(() => {
    if (!navigator.clipboard) return;
    const transcript = messages
      .map((message) => `${message.role === "user" ? "You" : mascotName}: ${message.text}`)
      .join("\n\n");
    navigator.clipboard.writeText(transcript).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  }, [mascotName, messages]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  const composer = (
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
  );

  return (
    <div className={`bchat ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      <style>{CHAT_CSS}</style>
      <BrainoDefs />
      <WebbDefs />
      {voiceActive && (
        <VoiceOverlay status={voiceStatus} error={voiceError} signedIn={!!user} onStop={voiceStop} />
      )}

      <button className="bc-scrim" type="button" aria-label="Close sidebar" onClick={() => setSidebarCollapsed(true)} />

      <aside className="bc-sidebar">
        <div className="bc-side-top">
          <div className="bc-brand">
            <BrainoMark size={26} expr="happy" />
            <strong>{mascotName}</strong>
          </div>
          <div className="bc-side-tools">
            <button
              className="bc-side-icon"
              type="button"
              aria-label="Search chats"
              title="Search chats"
              onClick={() => setSearchOpen((open) => !open)}
            >
              <Icon name="search" />
            </button>
            <button className="bc-side-icon" type="button" aria-label="Close sidebar" title="Close sidebar" onClick={() => setSidebarCollapsed(true)}>
              <Icon name="panel" />
            </button>
          </div>
        </div>

        <nav className="bc-nav">
          <button className="bc-nav-row" type="button" onClick={newChat}><Icon name="new" /><span>New chat</span></button>
          {searchOpen && (
            <label className="bc-nav-row bc-search">
              <Icon name="search" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search chats"
              />
            </label>
          )}
        </nav>

        <div className="bc-thread-section">
          <p className="bc-side-label">Chats</p>
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

        {user ? (
          <div className="bc-account">
            <span className="bc-account-avatar">{accountName.slice(0, 1).toUpperCase() || "B"}</span>
            <div className="bc-account-id">
              <strong>{accountName}</strong>
              <small>{isPremium ? "Pro" : "Free"}</small>
            </div>
            {!isPremium && <Link className="bc-upgrade-pill" to="/premium">Upgrade</Link>}
          </div>
        ) : (
          <div className="bc-account is-out">
            <Link className="bc-signin" to="/auth?redirect=/chat">Log in</Link>
            <Link className="bc-signup" to="/auth?redirect=/chat">Sign up for free</Link>
          </div>
        )}
      </aside>

      <main className="bc-main">
        <header className="bc-topbar">
          <div className="bc-topbar-left">
            <button className="bc-top-icon bc-top-panel" type="button" aria-label="Open sidebar" title="Open sidebar" onClick={() => setSidebarCollapsed(false)}>
              <Icon name="panel" />
            </button>
            <button className="bc-top-icon bc-top-panel" type="button" aria-label="New chat" title="New chat" onClick={newChat}>
              <Icon name="new" />
            </button>
          </div>

          <div className="bc-topbar-right">
            {!isPremium && (
              <Link className="bc-upgrade" to={user ? "/premium" : "/auth?redirect=/chat"}>
                <Icon name="sparkle" /><span>Upgrade</span>
              </Link>
            )}
            {messages.length > 0 && (
              <button className="bc-top-btn" type="button" onClick={copyTranscript}>
                <Icon name={copied ? "check" : "share"} /><span>{copied ? "Copied" : "Share"}</span>
              </button>
            )}
            {messages.length > 0 && (
              <div className="bc-menu-wrap">
                <button
                  className="bc-top-icon"
                  type="button"
                  aria-label="Chat options"
                  onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open); }}
                >
                  <Icon name="dots" />
                </button>
                {menuOpen && (
                  <div className="bc-menu">
                    <button type="button" onClick={newChat}><Icon name="new" /><span>New chat</span></button>
                    {currentThread && (
                      <button type="button" onClick={() => renameThread(currentThread)}><Icon name="edit" /><span>Rename</span></button>
                    )}
                    {currentThread && (
                      <button className="is-danger" type="button" onClick={() => deleteThread(currentThread)}><Icon name="trash" /><span>Delete</span></button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="bc-scroll" ref={scrollerRef} onScroll={onThreadScroll}>
          {messages.length === 0 ? (
            <div className="bc-hero">
              <div className="bc-empty-greeting-stage">
                <GreetingWalker />
                <h2>{emptyGreeting}</h2>
              </div>
              {error && <div className="bc-error">{error}</div>}
              {composer}
              <div className="bc-suggests">
                <button type="button" onClick={() => setDraft("Search the web for ")}>
                  <Icon name="globe" /><span>Search the web</span>
                </button>
                <button type="button" onClick={() => { setDelegateMode(true); setDraft("Open "); }}>
                  <Icon name="bolt" /><span>Delegate a browser task</span>
                </button>
                <button type="button" onClick={voiceToggle}>
                  <Icon name="voice" /><span>Talk to {mascotName}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bc-thread">
              {messages.map((message) => (
                <Turn key={message.id} message={message} reveal={reveal?.id === message.id ? reveal.n : null} onStop={stopTask} />
              ))}
              {isSending && <Thinking />}
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="bc-dock">
            {!atBottom && (
              <button className="bc-jump" type="button" aria-label="Scroll to bottom" onClick={scrollToBottom}>
                <Icon name="down" />
              </button>
            )}
            {error && <div className="bc-error">{error}</div>}
            {composer}
            <p className="bc-disclaimer">{mascotName} can make mistakes. Check important info.</p>
          </div>
        )}
      </main>
    </div>
  );
}

const CHAT_CSS = `
.bchat{
  --bc-bg:#000;
  --bc-side:#000;
  --bc-hover:#1c1c1c;
  --bc-active:#2a2a2a;
  --bc-surface:#303030;
  --bc-line:#2a2a2a;
  --bc-text:#f3f3f3;
  --bc-dim:#b4b4b4;
  --bc-muted:#8f8f8f;
  --bc-blue:#0285ff;
  position:fixed;
  inset:0;
  z-index:50;
  display:grid;
  grid-template-columns:260px minmax(0,1fr);
  height:100dvh;
  min-height:0;
  background:var(--bc-bg);
  color:var(--bc-text);
  font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  font-size:16px;
  overflow:hidden;
}
.bchat *{box-sizing:border-box}
:where(.bchat) button{font:inherit;color:inherit}
:where(.bchat) svg{
  width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;flex:none;
}
.bchat ::-webkit-scrollbar{width:10px;height:10px}
.bchat ::-webkit-scrollbar-thumb{background:#2f2f2f;border-radius:999px;border:3px solid transparent;background-clip:content-box}
.bchat ::-webkit-scrollbar-thumb:hover{background:#454545;background-clip:content-box}
.bchat ::-webkit-scrollbar-track{background:transparent}
.braino-avatar{display:inline-flex;align-items:center;justify-content:center;flex:none}
.braino-avatar svg{overflow:visible;width:auto;height:auto;stroke-width:initial}
.braino-avatar.is-talking{animation:bcTalkBob 1s ease-in-out infinite}
@keyframes bcTalkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}

.bc-scrim{display:none;border:0;padding:0}

/* ---------- sidebar ---------- */
.bc-sidebar{
  min-width:0;
  min-height:0;
  height:100dvh;
  background:var(--bc-side);
  padding:10px 8px 10px;
  display:flex;
  flex-direction:column;
  gap:6px;
}
.bchat.is-collapsed{grid-template-columns:0 minmax(0,1fr)}
.bchat.is-collapsed .bc-sidebar{display:none}
.bc-side-top{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:2px 4px 6px 8px}
.bc-brand{display:flex;align-items:center;gap:8px;min-width:0}
.bc-brand strong{font-size:17px;font-weight:600;letter-spacing:-.01em}
.bc-side-tools{display:flex;align-items:center;gap:2px}
.bc-side-icon{
  width:36px;height:36px;border:0;border-radius:9px;background:transparent;color:var(--bc-dim);
  display:grid;place-items:center;cursor:pointer;transition:background .12s ease,color .12s ease;
}
.bc-side-icon:hover{background:var(--bc-hover);color:var(--bc-text)}
.bc-nav{display:flex;flex-direction:column;gap:2px}
.bc-nav-row{
  width:100%;
  min-height:38px;
  border:0;
  border-radius:9px;
  background:transparent;
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 10px;
  color:var(--bc-text);
  font-size:14px;
  cursor:pointer;
  transition:background .12s ease;
}
.bc-nav-row:hover{background:var(--bc-hover)}
.bc-nav-row svg{color:var(--bc-dim)}
.bc-search{cursor:text}
.bc-search input{
  width:100%;
  border:0;
  outline:0;
  background:transparent;
  color:var(--bc-text);
  font:inherit;
  font-size:14px;
}
.bc-search input::placeholder{color:var(--bc-muted)}
.bc-thread-section{min-height:0;display:flex;flex:1;flex-direction:column;gap:2px;margin-top:14px}
.bc-side-label{
  margin:0 0 4px;
  padding:0 10px;
  font-size:12px;
  font-weight:500;
  color:var(--bc-muted);
  letter-spacing:.01em;
}
.bc-thread-list{min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:1px;padding-right:2px}
.bc-thread-row{
  display:flex;
  align-items:center;
  gap:2px;
  border-radius:9px;
  color:var(--bc-dim);
  transition:background .12s ease,color .12s ease;
}
.bc-thread-row:hover{background:var(--bc-hover);color:var(--bc-text)}
.bc-thread-row.is-active{background:var(--bc-active);color:var(--bc-text)}
.bc-thread-open{
  border:0;
  background:transparent;
  min-width:0;
  flex:1;
  text-align:left;
  color:inherit;
  border-radius:9px;
  padding:8px 4px 8px 10px;
  font-size:14px;
  line-height:1.35;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
  cursor:pointer;
}
.bc-thread-actions{
  display:flex;
  align-items:center;
  gap:1px;
  flex:none;
  opacity:0;
  padding-right:4px;
  transition:opacity .14s ease;
}
.bc-thread-row:hover .bc-thread-actions,.bc-thread-row:focus-within .bc-thread-actions,.bc-thread-row.is-active .bc-thread-actions{opacity:1}
.bc-thread-actions button{
  width:26px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--bc-muted);
  display:grid;place-items:center;cursor:pointer;
}
.bc-thread-actions button:hover{background:#3a3a3a;color:#fff}
.bc-thread-actions svg{width:15px;height:15px}
.bc-empty-chat{color:var(--bc-muted);font-size:13px;padding:8px 10px}
.bc-account{
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px 8px 4px;
  margin-top:6px;
}
.bc-account-avatar{
  width:28px;height:28px;border-radius:50%;display:grid;place-items:center;flex:none;
  background:#3b7ff5;color:#fff;font-size:12px;font-weight:600;
}
.bc-account-id{display:flex;flex-direction:column;min-width:0;flex:1;line-height:1.2}
.bc-account-id strong{font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bc-account-id small{font-size:12px;color:var(--bc-muted)}
.bc-upgrade-pill{
  flex:none;
  border-radius:999px;
  background:#2f2f2f;
  color:var(--bc-text);
  font-size:13px;
  font-weight:500;
  padding:6px 13px;
  text-decoration:none;
  transition:background .12s ease;
}
.bc-upgrade-pill:hover{background:#3d3d3d}
.bc-account.is-out{flex-direction:column;align-items:stretch;gap:6px;padding-bottom:8px}
.bc-signin,.bc-signup{
  display:block;
  text-align:center;
  border-radius:999px;
  font-size:14px;
  font-weight:500;
  padding:9px 14px;
  text-decoration:none;
  transition:background .12s ease;
}
.bc-signin{background:#f3f3f3;color:#0d0d0d}
.bc-signin:hover{background:#fff}
.bc-signup{background:transparent;border:1px solid #3d3d3d;color:var(--bc-text)}
.bc-signup:hover{background:var(--bc-hover)}

/* ---------- main ---------- */
.bc-main{
  min-width:0;
  min-height:0;
  height:100dvh;
  display:flex;
  flex-direction:column;
  background:var(--bc-bg);
  overflow:hidden;
}
.bc-topbar{
  flex:none;
  height:54px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  padding:0 14px;
}
.bc-topbar-left,.bc-topbar-right{display:flex;align-items:center;gap:4px}
.bc-top-icon{
  width:36px;height:36px;border:0;border-radius:9px;background:transparent;color:var(--bc-dim);
  display:grid;place-items:center;cursor:pointer;transition:background .12s ease,color .12s ease;
}
.bc-top-icon:hover{background:var(--bc-hover);color:var(--bc-text)}
.bc-top-panel{display:none}
.bchat.is-collapsed .bc-top-panel{display:grid}
.bc-top-btn{
  height:36px;
  border:0;
  border-radius:9px;
  background:transparent;
  color:var(--bc-dim);
  display:flex;
  align-items:center;
  gap:7px;
  padding:0 11px;
  font-size:14px;
  cursor:pointer;
  transition:background .12s ease,color .12s ease;
}
.bc-top-btn:hover{background:var(--bc-hover);color:var(--bc-text)}
.bc-top-btn svg{width:18px;height:18px}
.bc-upgrade{
  height:36px;
  display:flex;
  align-items:center;
  gap:7px;
  padding:0 11px;
  border-radius:9px;
  color:#8ab4ff;
  font-size:14px;
  font-weight:500;
  text-decoration:none;
  transition:background .12s ease;
}
.bc-upgrade:hover{background:var(--bc-hover)}
.bc-upgrade svg{width:18px;height:18px}
.bc-menu-wrap{position:relative}
.bc-menu{
  position:absolute;
  top:42px;
  right:0;
  z-index:20;
  min-width:190px;
  padding:6px;
  border-radius:14px;
  background:#2a2a2a;
  border:1px solid #3d3d3d;
  box-shadow:0 12px 40px rgba(0,0,0,.55);
  display:flex;
  flex-direction:column;
  gap:1px;
}
.bc-menu button{
  display:flex;
  align-items:center;
  gap:10px;
  width:100%;
  border:0;
  border-radius:9px;
  background:transparent;
  color:var(--bc-text);
  font-size:14px;
  padding:9px 10px;
  text-align:left;
  cursor:pointer;
}
.bc-menu button:hover{background:#3a3a3a}
.bc-menu button svg{width:17px;height:17px;color:var(--bc-dim)}
.bc-menu button.is-danger{color:#ff6b64}
.bc-menu button.is-danger svg{color:#ff6b64}

.bc-scroll{
  flex:1;
  min-height:0;
  overflow-y:auto;
  overflow-x:hidden;
  overscroll-behavior:contain;
  scrollbar-gutter:stable both-edges;
}

/* ---------- empty state ---------- */
.bc-hero{
  min-height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:20px;
  padding:24px 20px 90px;
}
.bc-hero .bc-composer-wrap{width:min(768px,100%)}
.bc-empty-greeting-stage{
  position:relative;
  display:inline-block;
  width:fit-content;
  max-width:min(92vw,760px);
  min-width:min(340px,92vw);
  padding:74px 10px 4px;
  text-align:center;
}
.bc-empty-walk-track{
  position:absolute;
  top:0;
  left:10px;
  right:10px;
  height:74px;
  overflow:hidden;
  pointer-events:none;
}
.bc-empty-walker{
  position:absolute;
  left:0;
  bottom:0;
  width:60px;
  display:block;
  will-change:transform;
}
.bc-empty-walker #__sbwk_flip__{transform-origin:center;display:block}
.bc-empty-walker svg{width:60px!important;height:auto!important;overflow:visible;stroke-width:initial}
.bc-hero h2{
  font-size:clamp(24px,3vw,30px);
  line-height:1.25;
  letter-spacing:-.02em;
  font-weight:400;
  color:var(--bc-text);
  margin:0;
}
.bc-suggests{
  width:min(768px,100%);
  display:flex;
  flex-direction:column;
  gap:2px;
  padding-left:18px;
}
.bc-suggests button{
  display:flex;
  align-items:center;
  gap:14px;
  border:0;
  border-radius:12px;
  background:transparent;
  color:var(--bc-dim);
  font-size:15px;
  padding:12px 14px;
  text-align:left;
  cursor:pointer;
  transition:background .12s ease,color .12s ease;
}
.bc-suggests button:hover{background:var(--bc-hover);color:var(--bc-text)}
.bc-suggests svg{width:19px;height:19px;color:var(--bc-muted)}

/* ---------- thread ---------- */
.bc-thread{
  width:min(768px,100%);
  margin:0 auto;
  padding:16px 20px 28px;
  display:flex;
  flex-direction:column;
  gap:26px;
}
.bc-turn{display:flex;gap:12px;align-items:flex-start}
.bc-turn-user{justify-content:flex-end}
.bc-user-bubble{
  max-width:min(560px,80%);
  padding:10px 20px;
  border-radius:22px;
  background:var(--bc-surface);
  color:var(--bc-text);
  font-size:16px;
  line-height:1.6;
  white-space:pre-wrap;
  word-break:break-word;
}
.bc-turn-braino .braino-avatar{margin-top:2px}
.bc-answer{
  min-width:0;
  flex:1;
  color:var(--bc-text);
  font-size:16px;
  line-height:1.75;
  word-break:break-word;
}
.bc-answer p{margin:0 0 18px}
.bc-answer p:last-child{margin-bottom:0}
.bc-answer h2,.bc-answer h3,.bc-answer h4,.bc-answer h5{
  margin:26px 0 12px;
  line-height:1.4;
  font-weight:600;
  letter-spacing:-.01em;
}
.bc-answer h2{font-size:20px}
.bc-answer h3{font-size:18px}
.bc-answer h4,.bc-answer h5{font-size:16px}
.bc-answer>*:first-child{margin-top:0}
.bc-answer ul,.bc-answer ol{margin:0 0 18px;padding-left:26px}
.bc-answer ul{list-style:disc}
.bc-answer ol{list-style:decimal}
.bc-answer li{padding-left:4px;margin-bottom:6px}
.bc-answer li:last-child{margin-bottom:0}
.bc-answer li::marker{color:var(--bc-muted)}
.bc-answer blockquote{
  margin:0 0 18px;
  padding:2px 0 2px 18px;
  border-left:2px solid #4d4d4d;
  color:var(--bc-dim);
}
.bc-answer blockquote p:last-child{margin-bottom:0}
.bc-answer hr{border:0;border-top:1px solid #303030;margin:28px 0}
.bc-answer code{background:#2a2a2a;border-radius:5px;padding:2px 6px;font-size:14px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.bc-answer pre{
  margin:0 0 18px;
  padding:14px 16px;
  border-radius:14px;
  background:#0d0d0d;
  border:1px solid #2a2a2a;
  overflow-x:auto;
}
.bc-answer pre code{background:transparent;padding:0;font-size:13.5px;line-height:1.6}
.bc-answer a{color:#8ab4ff;text-decoration:underline;text-underline-offset:2px}
.bc-answer strong{font-weight:600}
.bc-caret{display:inline-block;width:2px;height:1em;background:var(--bc-text);vertical-align:text-bottom;animation:bcBlink 1s steps(2) infinite}
@keyframes bcBlink{50%{opacity:0}}
.bc-msg-actions{display:flex;gap:2px;margin-top:10px;opacity:0;transition:opacity .14s ease}
.bc-turn:hover .bc-msg-actions,.bc-turn:focus-within .bc-msg-actions{opacity:1}
.bc-msg-action{
  width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--bc-muted);
  display:grid;place-items:center;cursor:pointer;
}
.bc-msg-action:hover{background:var(--bc-hover);color:var(--bc-text)}
.bc-msg-action svg{width:16px;height:16px}
.bc-thinking{display:flex;gap:6px;padding-top:10px}
.bc-thinking i{width:7px;height:7px;border-radius:50%;background:#9a9a9a;animation:bcDot 1.1s infinite ease-in-out}
.bc-thinking i:nth-child(2){animation-delay:.15s}
.bc-thinking i:nth-child(3){animation-delay:.3s}
@keyframes bcDot{0%,100%{opacity:.35;transform:translateY(0)}45%{opacity:1;transform:translateY(-5px)}}
.bc-doc{display:inline-flex;margin-top:8px;color:#8ab4ff;text-decoration:none}
.bc-delegate-head{display:flex;align-items:center;gap:8px;color:var(--bc-muted);font-size:13px;margin-bottom:10px}
.bc-delegate-tag{
  border-radius:999px;
  background:#2a2a2a;
  color:var(--bc-dim);
  padding:2px 9px;
  font-size:12px;
  font-weight:500;
}
.bc-delegate-head button{border:1px solid #3f3f3f;background:#212121;color:var(--bc-dim);border-radius:999px;padding:3px 10px;font-size:12px;cursor:pointer}
.bc-delegate-head button:hover{background:#2d2d2d}
.bc-step{color:var(--bc-muted);font-size:14px;margin:0 0 6px}

/* ---------- dock ---------- */
.bc-dock{
  flex:none;
  position:relative;
  padding:0 20px 10px;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.bc-composer-wrap{width:min(768px,100%)}
.bc-jump{
  position:absolute;
  top:-46px;
  left:50%;
  transform:translateX(-50%);
  width:34px;height:34px;
  border-radius:50%;
  border:1px solid #3a3a3a;
  background:#212121;
  color:var(--bc-text);
  display:grid;
  place-items:center;
  cursor:pointer;
  box-shadow:0 6px 18px rgba(0,0,0,.45);
}
.bc-jump:hover{background:#2d2d2d}
.bc-jump svg{width:17px;height:17px}
.bc-disclaimer{
  margin:8px 0 2px;
  font-size:12px;
  color:var(--bc-muted);
  text-align:center;
}
.bc-attachments{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 8px 8px}
.bc-attachment{
  display:inline-flex;align-items:center;gap:8px;border:1px solid #3a3a3a;background:#212121;
  border-radius:12px;padding:6px 6px 6px 12px;font-size:13px;
}
.bc-attachment small{color:var(--bc-muted)}
.bc-attachment button{width:22px;height:22px;border:0;border-radius:6px;background:transparent;display:grid;place-items:center;cursor:pointer;color:var(--bc-muted)}
.bc-attachment button:hover{background:#333;color:#fff}
.bc-attachment svg{width:14px;height:14px}
.bc-composer{
  min-height:56px;
  display:flex;
  align-items:center;
  gap:4px;
  border-radius:28px;
  background:var(--bc-surface);
  padding:6px 10px 6px 8px;
}
.bc-composer.is-voice{box-shadow:0 0 0 1px #f4f4f4,0 0 34px rgba(255,255,255,.14)}
.bc-composer textarea{
  flex:1;
  min-width:0;
  max-height:200px;
  resize:none;
  border:0;
  outline:0;
  background:transparent;
  color:var(--bc-text);
  font:inherit;
  font-size:16px;
  line-height:1.5;
  padding:11px 6px;
}
.bc-composer textarea::placeholder{color:#a0a0a0}
.bc-tool{
  height:40px;
  min-width:40px;
  border:0;
  border-radius:999px;
  background:transparent;
  color:var(--bc-dim);
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  padding:0 10px;
  cursor:pointer;
  align-self:flex-end;
  transition:background .12s ease,color .12s ease;
}
.bc-tool:hover{background:#414141;color:var(--bc-text)}
.bc-tool-label{font-size:14px;font-weight:400;padding:0 13px}
.bc-tool-label.is-on{background:rgba(2,133,255,.18);color:#7fb9ff}
.bc-tool-label.is-on:hover{background:rgba(2,133,255,.26)}
.bc-send,.bc-orb{
  width:40px;height:40px;border-radius:50%;border:0;display:grid;place-items:center;flex:none;
  align-self:flex-end;cursor:pointer;transition:background .12s ease,opacity .12s ease;
}
.bc-send{background:#f3f3f3;color:#0d0d0d}
.bc-send:hover{background:#fff}
.bc-send:disabled{background:#565656;color:#bdbdbd;cursor:default}
.bc-orb{background:var(--bc-blue);color:#fff}
.bc-orb:hover{background:#2b98ff}
.bc-composer.is-voice .bc-orb{box-shadow:0 0 0 3px rgba(2,133,255,.35),0 0 22px rgba(2,133,255,.45)}
.bc-error{
  width:min(768px,100%);
  margin:0 auto 10px;
  padding:10px 14px;
  border-radius:12px;
  background:#3a1f1d;
  color:#ffb3ad;
  font-size:14px;
}

/* ---------- voice stage ---------- */
.bc-voice-stage{
  position:fixed;
  top:0;
  right:0;
  bottom:0;
  left:260px;
  z-index:1000;
  display:grid;
  place-items:center;
  background:#000;
  overflow:hidden;
}
.bchat.is-collapsed .bc-voice-stage{left:0}
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
  color:var(--bc-muted);
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
  top:16px;
  right:16px;
  width:40px;
  height:40px;
  border:0;
  border-radius:50%;
  background:#212121;
  color:var(--bc-text);
  display:grid;
  place-items:center;
  cursor:pointer;
  z-index:2;
}
.bc-voice-close:hover{background:#2d2d2d}

@media (max-width:860px){
  .bchat{grid-template-columns:1fr}
  .bc-sidebar{
    position:fixed;
    z-index:60;
    width:280px;
    inset:0 auto 0 0;
    transform:translateX(-100%);
    transition:transform .22s ease;
    box-shadow:0 0 40px rgba(0,0,0,.6);
  }
  .bchat:not(.is-collapsed) .bc-sidebar{transform:translateX(0)}
  .bchat.is-collapsed{grid-template-columns:1fr}
  .bchat.is-collapsed .bc-sidebar{display:flex}
  .bchat:not(.is-collapsed) .bc-scrim{
    display:block;
    position:fixed;
    inset:0;
    z-index:55;
    background:rgba(0,0,0,.55);
    cursor:default;
  }
  .bc-top-panel{display:grid}
  .bc-voice-stage,.bchat.is-collapsed .bc-voice-stage{left:0}
  .bc-thread,.bc-hero{padding-inline:14px}
  .bc-dock{padding-inline:12px}
  .bc-user-bubble{max-width:88%}
  .bc-tool-label span{display:none}
  .bc-tool-label{padding:0 10px}
  .bc-suggests{padding-left:6px}
  .bc-big-braino .braino-avatar svg{max-width:72vw}
}
`;
