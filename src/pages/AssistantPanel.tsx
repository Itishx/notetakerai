import { FormEvent, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import SideBrainLogo from "@/components/SideBrainLogo";
import {
  AssistantPageContext,
  AgentAction,
  AgentHistoryItem,
  planAgentActions,
  tryFastPath,
} from "@/lib/assistantAgent";
import {
  Bot,
  ExternalLink,
  Globe,
  Loader2,
  LogOut,
  Mic,
  Send,
  Sparkles,
  X,
  Crown,
  RotateCcw,
} from "lucide-react";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ResumeState = {
  task: string;
  note: string;
};

type HostActionResult = {
  success?: boolean;
  error?: string;
  text?: string;
  navigating?: boolean;
  url?: string;
};

type HostPayload = {
  requestId?: string | null;
  pageContext?: AssistantPageContext;
  result?: HostActionResult;
  listening?: boolean;
  supported?: boolean;
  text?: string;
  isFinal?: boolean;
};

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const CHAT_STORAGE_KEY = "sidebrain-bookmarklet-chat-v1";
const MODE_STORAGE_KEY = "sidebrain-bookmarklet-mode-v1";
const RESUME_STORAGE_KEY = "sidebrain-bookmarklet-resume-v1";

const EMPTY_PAGE_CONTEXT: AssistantPageContext = {
  title: "Launch SideBrain from any page",
  url: "",
  text: "",
  selectedText: "",
  interactiveEls: [],
};

function readStorage<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function removeStorage(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(text: string) {
  const escaped = escapeHtml(text);
  const withInline = escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

  const lines = withInline.split("\n");
  const rendered = lines
    .map((line) => {
      if (line.startsWith("## ")) return `<h3>${line.slice(3)}</h3>`;
      if (line.startsWith("# ")) return `<h2>${line.slice(2)}</h2>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      return `<p>${line || "&nbsp;"}</p>`;
    })
    .join("");

  return rendered.replace(/(<li>.*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);
}

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/#+\s/g, "")
    .replace(/^\s*-\s+/gm, "")
    .trim();
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function buildRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AssistantPanel() {
  const { user, isPremium, signIn, signOut, signUp } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStorage(CHAT_STORAGE_KEY, []));
  const [mode, setMode] = useState<"page" | "agent">(() => readStorage(MODE_STORAGE_KEY, "page"));
  const [pageContext, setPageContext] = useState<AssistantPageContext>(EMPTY_PAGE_CONTEXT);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [resumeState, setResumeState] = useState<ResumeState | null>(() => readStorage<ResumeState | null>(RESUME_STORAGE_KEY, null));

  const pendingRequestsRef = useRef(new Map<string, (payload: HostPayload) => void>());
  const shouldSpeakNextReplyRef = useRef(false);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);
  const submitTextRef = useRef<(text: string) => Promise<void>>(async () => {});

  useEffect(() => {
    writeStorage(CHAT_STORAGE_KEY, messages);
  }, [messages]);

  useEffect(() => {
    writeStorage(MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (resumeState) {
      writeStorage(RESUME_STORAGE_KEY, resumeState);
    } else {
      removeStorage(RESUME_STORAGE_KEY);
    }
  }, [resumeState]);

  useEffect(() => {
    if (user) {
      setShowAuthModal(false);
      setAuthError("");
      setAuthSuccess("");
    }
  }, [user]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, liveTranscript]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || data.source !== "sidebrain-host") return;
      const payload = (data.payload || {}) as HostPayload;

      if (data.type === "sidebrain:context-updated") {
        if (payload.pageContext) setPageContext(payload.pageContext);
        if (payload.requestId) {
          const resolve = pendingRequestsRef.current.get(payload.requestId);
          if (resolve) {
            pendingRequestsRef.current.delete(payload.requestId);
            resolve(payload);
          }
        }
      }

      if (data.type === "sidebrain:action-result" && payload.requestId) {
        const resolve = pendingRequestsRef.current.get(payload.requestId);
        if (resolve) {
          pendingRequestsRef.current.delete(payload.requestId);
          resolve(payload);
        }
      }

      if (data.type === "sidebrain:voice-status") {
        setVoiceListening(Boolean(payload.listening));
        setVoiceSupported(payload.supported !== false);
      }

      if (data.type === "sidebrain:voice-transcript") {
        const text = String(payload.text || "").trim();
        if (!text) return;

        if (payload.isFinal) {
          setLiveTranscript("");
          if (busyRef.current) return;
          shouldSpeakNextReplyRef.current = true;
          void submitTextRef.current(text);
          return;
        }

        setLiveTranscript(text);
      }
    }

    window.addEventListener("message", handleMessage);
    if (window.parent !== window) {
      window.parent.postMessage({ source: "sidebrain-panel", type: "sidebrain:panel-ready", payload: {} }, "*");
      const requestId = buildRequestId();
      pendingRequestsRef.current.set(requestId, (payload) => {
        if (payload.pageContext) setPageContext(payload.pageContext);
      });
      window.parent.postMessage(
        {
          source: "sidebrain-panel",
          type: "sidebrain:request-page-context",
          payload: { requestId },
        },
        "*",
      );
    }

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function postToHost(type: string, payload?: Record<string, unknown>) {
    if (window.parent === window) return;
    window.parent.postMessage(
      {
        source: "sidebrain-panel",
        type,
        payload: payload || {},
      },
      "*",
    );
  }

  function requestFromHost(type: string, payload?: Record<string, unknown>) {
    if (window.parent === window) {
      if (type === "sidebrain:request-page-context") {
        return Promise.resolve({ pageContext: EMPTY_PAGE_CONTEXT });
      }
      return Promise.resolve({ result: { error: "SideBrain is not connected to a page." } });
    }

    const requestId = buildRequestId();
    return new Promise<HostPayload>((resolve) => {
      pendingRequestsRef.current.set(requestId, resolve);
      postToHost(type, { ...(payload || {}), requestId });
    });
  }

  async function refreshPageContext() {
    const payload = await requestFromHost("sidebrain:request-page-context");
    if (payload?.pageContext) {
      setPageContext(payload.pageContext as AssistantPageContext);
      return payload.pageContext as AssistantPageContext;
    }
    return EMPTY_PAGE_CONTEXT;
  }

  async function runHostAction(action: AgentAction) {
    const payload = await requestFromHost("sidebrain:run-action", { action });
    return payload?.result || payload;
  }

  function appendMessage(message: ChatMessage) {
    setMessages((current) => [...current, message]);
  }

  function replaceBusyMessage(content: string) {
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "assistant" && last.content === "__sidebrain_busy__") {
        next[next.length - 1] = { role: "assistant", content };
        return next;
      }
      return [...current, { role: "assistant", content }];
    });
  }

  function startBusyReply() {
    appendMessage({ role: "assistant", content: "__sidebrain_busy__" });
  }

  async function sendPageReply(text: string) {
    const freshContext = await refreshPageContext();

    const response = await fetch(`${FUNCTIONS_BASE}/chat-about-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        pageContext: freshContext.url ? freshContext : undefined,
        chatHistory: messages
          .filter((message) => message.role !== "system")
          .slice(-8)
          .map((message) => ({ role: message.role, content: message.content })),
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || `Request failed with ${response.status}`);
    }

    const data = await response.json();
    return String(data.reply || "I couldn't put a reply together.");
  }

  async function runAgentReply(task: string) {
    if (!user) {
      setShowAuthModal(true);
      return "Sign in to unlock agent mode, keep task history synced, and manage Premium from your dashboard.";
    }

    if (!isPremium) {
      return "Agent mode is part of **Premium** right now. Sign in, then upgrade from your dashboard when you're ready.";
    }

    const history: AgentHistoryItem[] = [];

    for (let iteration = 0; iteration < 7; iteration += 1) {
      const freshContext = await refreshPageContext();
      const fastPath = history.length === 0 ? tryFastPath(task) : null;
      const actions = fastPath || (await planAgentActions({
        apiBase: FUNCTIONS_BASE,
        task,
        pageContext: freshContext,
        history,
        chatContext: messages
          .filter((message) => message.role !== "system" && message.content !== "__sidebrain_busy__")
          .slice(-8)
          .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
      }));

      if (!actions.length) {
        return "I couldn't find a safe next step on this page.";
      }

      const first = actions[0];
      if (first.type === "done" || first.type === "answer" || first.type === "clarify") {
        setResumeState(null);
        return first.message;
      }

      for (const action of actions) {
        if (action.type === "wait") {
          await new Promise((resolve) => window.setTimeout(resolve, action.ms));
          history.push({
            type: "wait",
            description: action.description,
            result: { success: true },
          });
          continue;
        }

        if (action.type === "navigate") {
          const host = getHostname(action.url);
          setResumeState({
            task,
            note: host
              ? `Relaunch SideBrain on ${host} and tap Resume last task.`
              : "Relaunch SideBrain on the next page and tap Resume last task.",
          });
          await runHostAction(action);
          return `Opening **${action.url}**.\n\nRelaunch SideBrain from your bookmarks on the new page, then tap **Resume last task** to continue.`;
        }

        const result = await runHostAction(action);
        const error = typeof result?.error === "string" ? result.error : "";

        history.push({
          type: action.type,
          description: action.description,
          result: error
            ? { success: false, error }
            : {
                success: true,
                text: typeof result?.text === "string" ? result.text : undefined,
              },
        });

        if (error) {
          break;
        }
      }
    }

    return "I ran out of steps before I could confidently finish that. Try a narrower instruction or reopen SideBrain after the next page change.";
  }

  async function submitText(rawText: string) {
    const text = rawText.trim();
    if (!text || busy) return;

    const normalized = text.toLowerCase();
    let taskText = text;

    if (normalized === "continue" && resumeState?.task) {
      taskText = resumeState.task;
      setResumeState(null);
    }

    appendMessage({ role: "user", content: text });
    setInput("");
    setBusy(true);
    startBusyReply();

    try {
      const reply = mode === "agent" ? await runAgentReply(taskText) : await sendPageReply(taskText);
      replaceBusyMessage(reply);
      if (shouldSpeakNextReplyRef.current) {
        postToHost("sidebrain:speak", { text: stripMarkdown(reply) });
      }
    } catch (error) {
      replaceBusyMessage(`I hit an error: ${(error as Error).message}`);
    } finally {
      shouldSpeakNextReplyRef.current = false;
      setBusy(false);
    }
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setAuthError(error.message);
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          setAuthError(error.message);
        } else {
          setAuthSuccess("Check your email, verify your account, then come back and sign in.");
        }
      }
    } finally {
      setAuthLoading(false);
    }
  }

  function clearConversation() {
    setMessages([]);
    setResumeState(null);
    setLiveTranscript("");
    postToHost("sidebrain:stop-speaking");
  }

  function handleVoiceToggle() {
    if (!voiceSupported || busy) return;
    shouldSpeakNextReplyRef.current = false;
    if (voiceListening) {
      postToHost("sidebrain:stop-voice");
      return;
    }
    postToHost("sidebrain:start-voice");
  }

  function handleResumeClick() {
    if (!resumeState) return;
    shouldSpeakNextReplyRef.current = false;
    void submitText("continue");
  }

  submitTextRef.current = submitText;

  const currentHost = getHostname(pageContext.url);

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(244,173,82,0.18),_transparent_38%),linear-gradient(180deg,_#fffdf8_0%,_#f7f1e9_100%)] text-[#1d1813]">
      <div className="flex h-full flex-col">
        <header className="border-b border-[#e8ddcf] bg-[#fffaf4]/90 px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SideBrainLogo sizeClass="text-sm" />
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[#6e6153]">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#dc7f2f]" />
                <span className="truncate">{pageContext.title || "Open any page and ask for help"}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#9b8a7a]">
                <span>{currentHost || "bookmarklet mode"}</span>
                <span>live page context</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {isPremium && (
                    <Badge className="rounded-full border border-[#f0c184] bg-[#fff4df] px-2.5 py-1 text-[10px] font-medium text-[#a95b10]">
                      <Crown className="mr-1 h-3 w-3" />
                      Premium
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-[#7d6f60] hover:bg-[#f4eadf] hover:text-[#1d1813]"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  className="rounded-full border-[#ddcab5] bg-[#fff8ef] px-3 text-xs text-[#6d5c4b] hover:bg-[#fff1dd]"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("page")}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition ${
                mode === "page"
                  ? "bg-[#1d1813] text-[#fff8ef]"
                  : "border border-[#ddcab5] bg-[#fff8ef] text-[#6d5c4b]"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Talk
            </button>
            <button
              type="button"
              onClick={() => setMode("agent")}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition ${
                mode === "agent"
                  ? "bg-[#1d1813] text-[#fff8ef]"
                  : "border border-[#ddcab5] bg-[#fff8ef] text-[#6d5c4b]"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              Agent
            </button>

            <div className="ml-auto flex items-center gap-2">
              {resumeState && (
                <button
                  type="button"
                  onClick={handleResumeClick}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#f0c184] bg-[#fff4df] px-3 py-1.5 text-[11px] font-medium text-[#a95b10]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Resume last task
                </button>
              )}
              <button
                type="button"
                onClick={clearConversation}
                className="text-[11px] text-[#8b7b6b] transition hover:text-[#1d1813]"
              >
                Clear
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="rounded-[28px] border border-[#eadfce] bg-white/70 p-4 text-sm text-[#6b5e52] shadow-[0_20px_50px_rgba(82,56,28,0.06)]">
              <div className="mb-3 flex items-center gap-2 text-[#1d1813]">
                {mode === "page" ? <Globe className="h-4 w-4 text-[#dc7f2f]" /> : <Bot className="h-4 w-4 text-[#dc7f2f]" />}
                <span className="font-medium">
                  {mode === "page" ? "Ask about the page you're on" : "Tell SideBrain what to do on this page"}
                </span>
              </div>
              <p className="leading-relaxed">
                {mode === "page"
                  ? "Summaries, explanations, comparisons, code help, or context from whatever is open in the tab."
                  : "Clicks, form filling, reading elements, scrolling, and direct actions on the current page. Premium only for now."}
              </p>
              {resumeState && (
                <div className="mt-4 rounded-2xl border border-[#f0c184] bg-[#fff4df] px-3 py-2 text-[13px] text-[#8d5816]">
                  {resumeState.note}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {messages.map((message, index) => {
              if (message.content === "__sidebrain_busy__") {
                return (
                  <div
                    key={`busy-${index}`}
                    className="max-w-[88%] rounded-[24px] rounded-bl-md border border-[#eadfce] bg-white/85 px-4 py-3 text-sm text-[#6d5c4b]"
                  >
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#dc7f2f]" />
                      <span>{mode === "agent" ? "Working through the page…" : "Thinking…"}</span>
                    </div>
                  </div>
                );
              }

              const isUser = message.role === "user";
              return (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-[24px] px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "rounded-br-md bg-[#1d1813] text-[#fff8ef]"
                        : "rounded-bl-md border border-[#eadfce] bg-white/85 text-[#3f352c]"
                    }`}
                    ref={index === messages.length - 1 ? lastMessageRef : null}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                  />
                </div>
              );
            })}

            {liveTranscript && (
              <div className="max-w-[88%] rounded-[24px] rounded-bl-md border border-dashed border-[#f0c184] bg-[#fff4df] px-4 py-3 text-sm text-[#8d5816]">
                <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#b07126]">Listening</div>
                {liveTranscript}
              </div>
            )}
          </div>
        </main>

        <div className="border-t border-[#e8ddcf] bg-[#fffaf4]/95 px-4 py-4 backdrop-blur">
          {resumeState && (
            <div className="mb-3 rounded-2xl border border-[#f0c184] bg-[#fff4df] px-3 py-2 text-[12px] text-[#8d5816]">
              {resumeState.note}
            </div>
          )}

          <form
            className="rounded-[28px] border border-[#ddcab5] bg-white px-3 py-3 shadow-[0_18px_50px_rgba(82,56,28,0.08)]"
            onSubmit={(event) => {
              event.preventDefault();
              shouldSpeakNextReplyRef.current = false;
              void submitText(input);
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={mode === "agent" ? "Click the button, fill this form, read this section…" : "Ask anything about this page…"}
              className="h-11 border-0 bg-transparent px-1 text-[15px] shadow-none focus-visible:ring-0"
              disabled={busy}
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-[#8b7b6b]">
                {user ? (
                  <>
                    <span>{isPremium ? "Signed in with Premium" : "Signed in"}</span>
                    <a
                      href="/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#6b5237] transition hover:text-[#1d1813]"
                    >
                      Dashboard <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                ) : (
                  <button
                    type="button"
                    className="text-[#6b5237] transition hover:text-[#1d1813]"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign in for synced history and Premium
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={`h-10 w-10 rounded-full border-[#ddcab5] bg-[#fff8ef] text-[#6d5c4b] hover:bg-[#fff1dd] ${
                    voiceListening ? "border-[#f0c184] bg-[#fff4df] text-[#a95b10]" : ""
                  }`}
                  disabled={busy || !voiceSupported}
                  onClick={handleVoiceToggle}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-[#1d1813] text-[#fff8ef] hover:bg-[#34291f]"
                  disabled={busy || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {showAuthModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#20160c]/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] border border-[#eadfce] bg-[#fffaf4] p-5 shadow-[0_24px_80px_rgba(50,32,15,0.25)]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <SideBrainLogo sizeClass="text-sm" />
                <p className="mt-3 text-sm text-[#6d5c4b]">
                  {isLogin ? "Sign in to unlock Premium and sync history." : "Create your account to keep SideBrain with you everywhere."}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-[#7d6f60] transition hover:bg-[#f4eadf] hover:text-[#1d1813]"
                onClick={() => setShowAuthModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleAuthSubmit}>
              {!isLogin && (
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="h-11 rounded-2xl border-[#ddcab5] bg-white"
                />
              )}
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-2xl border-[#ddcab5] bg-white"
                required
              />
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="h-11 rounded-2xl border-[#ddcab5] bg-white"
                required
              />

              {authError && <p className="text-xs text-red-600">{authError}</p>}
              {authSuccess && <p className="text-xs text-[#8d5816]">{authSuccess}</p>}

              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-[#1d1813] text-[#fff8ef] hover:bg-[#34291f]"
                disabled={authLoading}
              >
                {authLoading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs text-[#7d6f60]">
              {isLogin ? "Need an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-[#6b5237] transition hover:text-[#1d1813]"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthError("");
                  setAuthSuccess("");
                }}
              >
                {isLogin ? "Create one" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
