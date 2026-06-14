import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  ChevronDown,
  CircleDollarSign,
  Code2,
  FolderOpen,
  GraduationCap,
  HardDrive,
  LogIn,
  MessageSquarePlus,
  Mic,
  PencilLine,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  docUrl?: string;
  docName?: string;
};

type StarterPrompt = {
  label: string;
  prompt: string;
  icon: LucideIcon;
};

const STORAGE_KEY = "braino-site-chat-thread-v1";
const DRAFT_KEY = "braino-site-chat-draft-v1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

const BRAINO_SITE_CONTEXT = `You are Braino inside the full-screen website chat on trybraino.com.

What this chat is for:
- This is the place where users can talk to Braino normally, in full-screen, like a serious desktop AI workspace.
- Be useful first. Answer clearly, think carefully, and don't talk like a landing page widget.
- Signed-in users may ask about their Braino usage, realtime voice costs, workflows, automations, notes, emails, and planning.
- If the user asks about cost or spend, answer with the exact summary returned by the system whenever one is available.

Product context:
- Braino is an AI companion that sits with the user as they browse, work, think, and build.
- Core capabilities include page chat, writing help, summarisation, Google Docs generation, workflow planning, and realtime voice cost visibility.
- If Google Drive is connected, Braino may be able to create Google Docs directly from a prompt.
- If the user is not signed in, explain that account-specific memory and spend answers require sign-in, but general chat still works.

Tone:
- Sound like Braino, not a corporate support rep.
- Direct, calm, smart, and a little sharp when it helps.
- Be concise by default, but go deeper when the user clearly wants depth.`;

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    label: "Write",
    prompt: "Help me turn a messy idea into something sharp and well structured.",
    icon: PencilLine,
  },
  {
    label: "Learn",
    prompt: "Teach me this clearly from first principles, then give me the practical version.",
    icon: GraduationCap,
  },
  {
    label: "Code",
    prompt: "Help me debug this properly. Start with the likely causes, then tell me what to check first.",
    icon: Code2,
  },
  {
    label: "Spend",
    prompt: "How much have I spent today with Braino, what did I spend in the last 7 days, and what was the highest contributing API cost?",
    icon: CircleDollarSign,
  },
  {
    label: "Braino's pick",
    prompt: "I am stuck. Ask me the minimum questions you need, then give me the clearest next move.",
    icon: Sparkles,
  },
];

const CHAT_PAGE_CSS = `
  @keyframes bcFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes bcPulse {
    0%, 100% { opacity: 0.72; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  }

  .bc-shell {
    min-height: 100vh;
    background:
      radial-gradient(circle at 50% 46%, rgba(255,255,255,0.03), transparent 18%),
      radial-gradient(circle at 84% 92%, rgba(226, 125, 57, 0.08), transparent 16%),
      linear-gradient(180deg, #171717 0%, #1d1d1d 42%, #1a1a1a 100%);
    color: #f2ede6;
    display: flex;
    overflow: hidden;
  }

  .bc-rail {
    width: 72px;
    flex-shrink: 0;
    border-right: 1px solid rgba(255,255,255,0.05);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0)),
      rgba(17,17,17,0.86);
    padding: 20px 14px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .bc-rail-spacer {
    flex: 1;
  }

  .bc-rail-button,
  .bc-rail-link,
  .bc-prompt-pill,
  .bc-icon-button,
  .bc-send-button,
  .bc-notice-close {
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
  }

  .bc-rail-button,
  .bc-rail-link {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    color: rgba(242,237,230,0.72);
    background: transparent;
    border: 1px solid transparent;
    text-decoration: none;
    transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease, color 0.16s ease;
  }

  .bc-rail-button:hover,
  .bc-rail-link:hover {
    color: #f6f2ec;
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.08);
    transform: translateY(-1px);
  }

  .bc-rail-brand {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 30%),
      rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .bc-rail-brand img {
    width: 22px;
    height: 22px;
    filter: drop-shadow(0 0 14px rgba(226, 125, 57, 0.35));
  }

  .bc-rail-divider {
    width: 30px;
    height: 1px;
    background: rgba(255,255,255,0.08);
    margin: 4px 0 2px;
  }

  .bc-user-badge {
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    display: grid;
    place-items: center;
    color: #e7dfd5;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 700;
  }

  .bc-stage {
    flex: 1;
    min-width: 0;
    padding: 28px 24px;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .bc-top-strip {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  .bc-top-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(255,255,255,0.045);
    border: 1px solid rgba(255,255,255,0.07);
    color: rgba(242,237,230,0.76);
    font-size: 13px;
    text-decoration: none;
  }

  .bc-empty-view {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .bc-empty-inner {
    width: min(100%, 980px);
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: bcFadeUp 0.34s ease;
  }

  .bc-greeting {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 26px;
    color: #ede7dd;
  }

  .bc-greeting-mark {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #e27d39;
    background: rgba(226, 125, 57, 0.08);
    box-shadow: 0 0 28px rgba(226, 125, 57, 0.09);
  }

  .bc-greeting-text {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: clamp(42px, 5.2vw, 72px);
    line-height: 0.98;
    letter-spacing: -0.035em;
  }

  .bc-compose-wrap {
    width: min(100%, 900px);
  }

  .bc-composer {
    width: 100%;
    padding: 16px 18px 14px;
    border-radius: 28px;
    background: rgba(52, 52, 52, 0.94);
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 28px 70px rgba(0,0,0,0.28);
  }

  .bc-textarea {
    width: 100%;
    min-height: 116px;
    max-height: 260px;
    resize: none;
    border: 0;
    outline: 0;
    background: transparent;
    color: #f5f0e9;
    font-family: 'NeueHaas', 'Helvetica Neue', Arial, sans-serif;
    font-size: 18px;
    line-height: 1.55;
    padding: 4px 2px 10px;
  }

  .bc-textarea::placeholder {
    color: rgba(237, 231, 221, 0.54);
  }

  .bc-composer-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .bc-footer-left,
  .bc-footer-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bc-icon-button,
  .bc-send-button {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    transition: transform 0.16s ease, background 0.16s ease, color 0.16s ease, opacity 0.16s ease;
  }

  .bc-icon-button {
    background: transparent;
    color: rgba(242,237,230,0.74);
  }

  .bc-icon-button:hover {
    background: rgba(255,255,255,0.06);
    color: #fff;
    transform: translateY(-1px);
  }

  .bc-send-button {
    background: #f0ebe3;
    color: #141414;
  }

  .bc-send-button:hover {
    transform: translateY(-1px);
  }

  .bc-send-button:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    transform: none;
  }

  .bc-model-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: rgba(242,237,230,0.78);
    font-size: 14px;
    white-space: nowrap;
  }

  .bc-model-pill strong {
    color: #f3eee7;
    font-weight: 500;
  }

  .bc-wave {
    display: inline-flex;
    align-items: flex-end;
    gap: 3px;
    height: 18px;
    margin-left: 2px;
  }

  .bc-wave span {
    width: 2px;
    border-radius: 999px;
    background: rgba(242,237,230,0.82);
    animation: bcPulse 1.4s ease-in-out infinite;
  }

  .bc-wave span:nth-child(1) { height: 8px; animation-delay: 0s; }
  .bc-wave span:nth-child(2) { height: 15px; animation-delay: 0.12s; }
  .bc-wave span:nth-child(3) { height: 11px; animation-delay: 0.24s; }
  .bc-wave span:nth-child(4) { height: 17px; animation-delay: 0.36s; }
  .bc-wave span:nth-child(5) { height: 10px; animation-delay: 0.48s; }

  .bc-notice {
    margin-top: 8px;
    width: 100%;
    border-radius: 14px;
    background: rgba(16,16,16,0.78);
    border: 1px solid rgba(255,255,255,0.04);
    color: rgba(242,237,230,0.86);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 10px 14px;
    font-size: 13px;
  }

  .bc-notice strong {
    color: #f4eee6;
    font-weight: 500;
  }

  .bc-notice-close {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: transparent;
    color: rgba(242,237,230,0.6);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .bc-notice-close:hover {
    background: rgba(255,255,255,0.05);
    color: #fff;
  }

  .bc-prompt-row {
    margin-top: 16px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  .bc-prompt-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 16px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(242,237,230,0.88);
    font-size: 14px;
    transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
  }

  .bc-prompt-pill:hover {
    transform: translateY(-1px);
    background: rgba(255,255,255,0.085);
    border-color: rgba(255,255,255,0.12);
  }

  .bc-prompt-pill:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }

  .bc-thread-view {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    padding-top: 10px;
  }

  .bc-thread-head {
    width: min(100%, 900px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: rgba(242,237,230,0.72);
    font-size: 13px;
  }

  .bc-thread-head strong {
    display: block;
    color: #f4eee6;
    font-size: 18px;
    font-family: 'Instrument Serif', Georgia, serif;
    font-weight: 400;
    letter-spacing: -0.02em;
  }

  .bc-thread-meta {
    color: rgba(242,237,230,0.5);
  }

  .bc-thread-scroll {
    width: min(100%, 900px);
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 4px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .bc-message {
    display: flex;
    padding: 8px 0 14px;
    animation: bcFadeUp 0.24s ease;
  }

  .bc-message.user {
    justify-content: flex-start;
  }

  .bc-thread-scroll .bc-message:not(:last-child) {
    border-bottom: 1px solid rgba(255,255,255,0.035);
  }

  .bc-message-card {
    width: 100%;
    max-width: min(820px, 100%);
    padding: 2px 0;
    line-height: 1.72;
    font-size: 15px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .bc-message.assistant .bc-message-card {
    color: #efe8de;
  }

  .bc-message.user .bc-message-card {
    max-width: min(720px, 100%);
    margin-left: auto;
    color: rgba(251,247,241,0.92);
  }

  .bc-message-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
    color: rgba(242,237,230,0.5);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .bc-message-meta strong {
    color: rgba(242,237,230,0.86);
    font-weight: 600;
  }

  .bc-message-body {
    color: inherit;
    font-size: 15px;
    line-height: 1.82;
  }

  .bc-doc-link {
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border-radius: 12px;
    background: rgba(226, 125, 57, 0.1);
    border: 1px solid rgba(226, 125, 57, 0.22);
    color: #f4eee6;
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none;
  }

  .bc-typing {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .bc-typing i {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: rgba(242,237,230,0.78);
    animation: bcPulse 1.2s ease-in-out infinite;
  }

  .bc-typing i:nth-child(2) { animation-delay: 0.16s; }
  .bc-typing i:nth-child(3) { animation-delay: 0.32s; }

  .bc-error {
    width: min(100%, 900px);
    margin: 0 auto;
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(201, 84, 74, 0.12);
    border: 1px solid rgba(201, 84, 74, 0.26);
    color: #f6ece7;
    font-size: 13.5px;
  }

  .bc-floating-brain {
    position: fixed;
    right: 22px;
    bottom: 18px;
    width: 68px;
    height: 68px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at 35% 28%, rgba(255,255,255,0.12), transparent 24%),
      rgba(255,255,255,0.035);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 22px 48px rgba(0,0,0,0.35);
    pointer-events: none;
  }

  .bc-floating-brain img {
    width: 46px;
    height: 46px;
  }

  @media (max-width: 900px) {
    .bc-stage {
      padding: 18px 16px;
    }

    .bc-empty-inner {
      width: min(100%, 760px);
    }

    .bc-greeting-text {
      font-size: clamp(34px, 8vw, 56px);
    }
  }

  @media (max-width: 760px) {
    .bc-shell {
      display: block;
    }

    .bc-rail {
      width: 100%;
      height: auto;
      border-right: 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding: 14px 16px;
      flex-direction: row;
      justify-content: space-between;
      gap: 12px;
    }

    .bc-rail-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .bc-rail-divider,
    .bc-rail-spacer {
      display: none;
    }

    .bc-stage {
      padding: 16px 12px 86px;
    }

    .bc-top-strip {
      justify-content: flex-start;
    }

    .bc-empty-view {
      padding: 10px 0 0;
      align-items: flex-start;
    }

    .bc-greeting {
      gap: 10px;
      margin-bottom: 18px;
    }

    .bc-greeting-mark {
      width: 28px;
      height: 28px;
    }

    .bc-textarea {
      min-height: 96px;
      font-size: 16px;
    }

    .bc-composer-footer,
    .bc-thread-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .bc-footer-right {
      width: 100%;
      justify-content: space-between;
    }

    .bc-prompt-row {
      justify-content: flex-start;
    }

    .bc-prompt-pill {
      width: calc(50% - 5px);
      justify-content: center;
    }

    .bc-floating-brain {
      width: 56px;
      height: 56px;
      right: 14px;
      bottom: 14px;
    }

    .bc-floating-brain img {
      width: 38px;
      height: 38px;
    }
  }
`;

function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStoredMessages() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChatMessage);
  } catch {
    return [];
  }
}

function readStoredDraft() {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(DRAFT_KEY) || "";
  } catch {
    return "";
  }
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (item.role === "user" || item.role === "assistant") &&
    typeof item.text === "string" &&
    typeof item.createdAt === "string"
  );
}

function formatMessageTime(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(iso?: string) {
  if (!iso) return "No replies yet";
  const date = new Date(iso);
  const deltaMs = Date.now() - date.getTime();
  if (!Number.isFinite(deltaMs)) return "No replies yet";
  const minutes = Math.round(deltaMs / 60000);
  if (minutes <= 0) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function buildThreadTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  if (!firstUserMessage) return "New chat";
  const clean = firstUserMessage.text.replace(/\s+/g, " ").trim();
  if (!clean) return "New chat";
  return clean.length > 46 ? `${clean.slice(0, 45)}…` : clean;
}

function getUserMonogram(email?: string | null) {
  const initial = (email || "U").trim().charAt(0).toUpperCase();
  return initial || "U";
}

function getDisplayName(displayName?: string | null, email?: string | null) {
  const source = (displayName || email || "there").trim();
  const token = source
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)[0];
  if (!token) return "there";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function getDayPart(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5 || hour >= 21) return "late-night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

async function callBrainoSiteChat(args: {
  message: string;
  history: ChatMessage[];
  userId?: string;
  accessToken?: string;
  driveConnected?: boolean;
}) {
  const authHeader = args.accessToken ? `Bearer ${args.accessToken}` : `Bearer ${SUPABASE_KEY}`;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-about-notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: authHeader,
    },
    body: JSON.stringify({
      message: args.message,
      chatHistory: args.history.slice(-10).map((entry) => ({
        role: entry.role,
        content: entry.text,
      })),
      notes: BRAINO_SITE_CONTEXT,
      userId: args.userId,
      driveConnected: args.driveConnected ?? false,
      clientTimeZone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      clientUtcOffsetMinutes: new Date().getTimezoneOffset() * -1,
      pageContext: {
        title: "Braino full-screen chat",
        url: typeof window !== "undefined" ? window.location.href : "https://trybraino.com/chat",
        text: "The user is talking to Braino inside the dedicated website chat page.",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Braino hit a rate limit for a minute. Try again in a moment.");
    }
    if (response.status === 402) {
      throw new Error("Braino ran out of AI credits for this route. Top it up and try again.");
    }
    throw new Error(
      typeof payload?.error === "string" && payload.error.trim().length > 0
        ? payload.error
        : `Chat request failed (${response.status})`,
    );
  }

  return {
    reply: (payload.reply as string) || "Braino blanked for a second. Try that again.",
    docUrl: payload.docUrl as string | undefined,
    docName: payload.docName as string | undefined,
  };
}

export default function BrainoChat() {
  const { user, session, profile, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages());
  const [input, setInput] = useState(() => readStoredDraft());
  const [driveConnected, setDriveConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [showNotice, setShowNotice] = useState(true);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    document.title = "Braino Chat";
  }, []);

  useEffect(() => {
    if (!user) {
      setDriveConnected(false);
      return;
    }

    supabase
      .from("google_drive_connections")
      .select("user_identifier")
      .eq("user_identifier", user.id)
      .maybeSingle()
      .then(({ data }) => setDriveConnected(!!data));
  }, [user]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore storage errors in private browsing or restricted contexts.
    }
  }, [messages]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, input);
    } catch {
      // Ignore storage errors in private browsing or restricted contexts.
    }
  }, [input]);

  useEffect(() => {
    const element = threadRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages, isSending]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.min(element.scrollHeight, 260)}px`;
  }, [input]);

  const threadTitle = buildThreadTitle(messages);
  const displayName = getDisplayName(profile?.display_name, user?.email);
  const greeting = `It's ${getDayPart()} ${displayName}`;
  const lastMessage = messages[messages.length - 1];

  async function handleSend(rawMessage?: string) {
    const nextText = (rawMessage ?? input).trim();
    if (!nextText || isSending) return;

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      text: nextText,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setError("");
    setIsSending(true);

    try {
      const response = await callBrainoSiteChat({
        message: nextText,
        history: nextHistory,
        userId: user?.id,
        accessToken: session?.access_token,
        driveConnected,
      });

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        text: response.reply,
        createdAt: new Date().toISOString(),
        docUrl: response.docUrl,
        docName: response.docName,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Something went sideways while Braino was replying.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: createMessageId(),
          role: "assistant",
          text: message,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setError("");
    setInput("");
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore storage errors.
    }
    textareaRef.current?.focus();
  }

  function renderComposer() {
    return (
      <div className="bc-compose-wrap">
        <section className="bc-composer">
          <textarea
            ref={textareaRef}
            className="bc-textarea"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="How can I help you today?"
          />

          <div className="bc-composer-footer">
            <div className="bc-footer-left">
              <button className="bc-icon-button" type="button" title="Attach later">
                <MessageSquarePlus size={18} />
              </button>
            </div>

            <div className="bc-footer-right">
              <div className="bc-model-pill">
                <strong>Braino Core</strong>
                <span>Sharp</span>
                <ChevronDown size={15} />
              </div>

              <button className="bc-icon-button" type="button" title="Voice coming soon">
                <Mic size={18} />
              </button>

              <div className="bc-wave" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <button
                className="bc-send-button"
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || input.trim().length === 0}
                title="Send"
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </section>

        {showNotice && (
          <div className="bc-notice">
            <div>
              <strong>{user ? "Spend answers are live." : "Sign in for exact spend answers."}</strong>{" "}
              {user
                ? "Ask what you spent this session, today, or in the last 7 days."
                : "Braino can answer this session, today, and last-7-days spend once your account session is linked."}
            </div>
            <button className="bc-notice-close" type="button" onClick={() => setShowNotice(false)} aria-label="Dismiss note">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="bc-shell">
      <style>{CHAT_PAGE_CSS}</style>

      <aside className="bc-rail">
        <div className="bc-rail-group">
          <div className="bc-rail-brand" aria-hidden="true">
            <img src="/favicon.svg" alt="" />
          </div>
        </div>

        <div className="bc-rail-divider" />

        <div className="bc-rail-group">
          <button className="bc-rail-button" type="button" onClick={handleNewChat} title="New chat">
            <MessageSquarePlus size={18} />
          </button>
          <button className="bc-rail-button" type="button" onClick={() => void handleSend(STARTER_PROMPTS[3].prompt)} title="Check spend">
            <CircleDollarSign size={18} />
          </button>
          <button className="bc-rail-button" type="button" onClick={() => void handleSend("Create a Google Doc about my current project and structure it cleanly.")} title="Create doc">
            <FolderOpen size={18} />
          </button>
          <button className="bc-rail-button" type="button" onClick={() => void handleSend("Help me write something crisp and professional.")} title="Write">
            <PencilLine size={18} />
          </button>
        </div>

        <div className="bc-rail-spacer" />

        {user ? (
          <Link className="bc-rail-link" to="/dashboard" title="Dashboard">
            <HardDrive size={18} />
          </Link>
        ) : (
          <Link className="bc-rail-link" to="/auth" title="Sign in">
            <LogIn size={18} />
          </Link>
        )}

        <div className="bc-user-badge" title={loading ? "Loading account" : user?.email || "Guest"}>
          {user ? getUserMonogram(user.email) : <UserRound size={18} />}
        </div>
      </aside>

      <section className="bc-stage">
        <div className="bc-top-strip">
          <Link className="bc-top-pill" to={user ? "/dashboard" : "/auth"}>
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>

        {messages.length === 0 ? (
          <div className="bc-empty-view">
            <div className="bc-empty-inner">
              <div className="bc-greeting">
                <div className="bc-greeting-mark">
                  <Sparkles size={18} />
                </div>
                <div className="bc-greeting-text">{greeting}</div>
              </div>

              {renderComposer()}

              <div className="bc-prompt-row">
                {STARTER_PROMPTS.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.label}
                      className="bc-prompt-pill"
                      type="button"
                      onClick={() => void handleSend(prompt.prompt)}
                      disabled={isSending}
                    >
                      <Icon size={16} />
                      {prompt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bc-thread-view">
            <div className="bc-thread-head">
              <div>
                <strong>{threadTitle}</strong>
                <div className="bc-thread-meta">{messages.filter((message) => message.role === "user").length} prompts in this chat</div>
              </div>
              <div className="bc-thread-meta">Last reply {formatRelativeTime(lastMessage?.createdAt)}</div>
            </div>

            <div className="bc-thread-scroll" ref={threadRef}>
              {messages.map((message) => {
                const isUser = message.role === "user";

                return (
                  <article key={message.id} className={`bc-message ${isUser ? "user" : "assistant"}`}>
                    <div className="bc-message-card">
                      <div className="bc-message-meta">
                        <strong>{isUser ? "You" : "Braino"}</strong>
                        <span>{formatMessageTime(message.createdAt)}</span>
                      </div>
                      <div className="bc-message-body">{message.text}</div>
                      {!isUser && message.docUrl && (
                        <a
                          className="bc-doc-link"
                          href={message.docUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <HardDrive size={14} />
                          {message.docName || "Open Google Doc"}
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}

              {isSending && (
                <article className="bc-message assistant">
                  <div className="bc-message-card">
                    <div className="bc-message-meta">
                      <strong>Braino</strong>
                      <span>thinking</span>
                    </div>
                    <div className="bc-typing" aria-label="Braino is thinking">
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                </article>
              )}
            </div>

            {error && <div className="bc-error">{error}</div>}

            {renderComposer()}
          </div>
        )}
      </section>

      <div className="bc-floating-brain" aria-hidden="true">
        <img src="/favicon.svg" alt="" />
      </div>
    </main>
  );
}
