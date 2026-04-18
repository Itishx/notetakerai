import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Bot, Send, Loader2, CheckCircle2, XCircle, Clock, ChevronDown, LogIn, Zap } from "lucide-react";

type AgentStep = { type: string; description: string; ok: boolean; snapshot?: { title: string; url: string } };
type Command = {
  id: string;
  task: string;
  status: "pending" | "running" | "done" | "error";
  steps: AgentStep[];
  result: string | null;
  created_at: string;
};

type Tab = "active" | "done" | "all";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CommandCard({ cmd }: { cmd: Command }) {
  const [expanded, setExpanded] = useState(cmd.status === "running");
  const isActive = cmd.status === "pending" || cmd.status === "running";

  useEffect(() => {
    if (cmd.status === "running") setExpanded(true);
  }, [cmd.status]);

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isActive
        ? "border-primary/20 bg-primary/3"
        : cmd.status === "error"
        ? "border-red-400/20 bg-red-400/3"
        : "border-border/50 bg-card/40"
    }`}>
      <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
          cmd.status === "pending" ? "bg-muted-foreground/30" :
          cmd.status === "running" ? "bg-primary animate-pulse" :
          cmd.status === "done"    ? "bg-green-500" :
                                     "bg-red-400"
        }`} />

        <div className="flex-1 min-w-0">
          {/* Task text — clamped to 2 lines */}
          <p className="text-sm text-foreground font-medium leading-snug line-clamp-2">{cmd.task}</p>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {cmd.status === "pending" && (
              <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Waiting for desktop…
              </span>
            )}
            {cmd.status === "running" && (
              <span className="text-xs text-primary flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Running{cmd.steps.length > 0 ? ` · step ${cmd.steps.length}` : "…"}
              </span>
            )}
            {cmd.status === "done" && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Done
              </span>
            )}
            {cmd.status === "error" && (
              <span className="text-xs text-red-400 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Failed
              </span>
            )}
            <span className="text-xs text-muted-foreground/30">{timeAgo(cmd.created_at)}</span>
          </div>
        </div>

        {cmd.steps.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Result snippet (not expanded) */}
      {!expanded && cmd.result && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-xs text-muted-foreground/60 line-clamp-1">{cmd.result}</p>
        </div>
      )}

      {/* Steps */}
      {expanded && cmd.steps.length > 0 && (
        <div className="border-t border-border/30 px-4 py-3 space-y-2">
          {cmd.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-xs flex-shrink-0 mt-0.5 ${step.ok ? "text-green-500" : "text-red-400"}`}>
                {step.ok ? "✓" : "✗"}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-snug">{step.description}</p>
                {step.snapshot && (
                  <p className="text-xs text-muted-foreground/30 truncate mt-0.5">{step.snapshot.title}</p>
                )}
              </div>
            </div>
          ))}
          {cmd.status === "running" && (
            <div className="flex items-center gap-2 pt-0.5">
              <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
              <p className="text-xs text-muted-foreground/40 italic">working…</p>
            </div>
          )}
        </div>
      )}

      {/* Full result when expanded */}
      {expanded && cmd.result && (
        <div className={`border-t px-4 py-3 ${cmd.status === "error" ? "border-red-400/20" : "border-border/30"}`}>
          <p className="text-xs text-muted-foreground leading-relaxed">{cmd.result}</p>
        </div>
      )}
    </div>
  );
}

export default function RemoteAgent() {
  const { user, profile } = useAuth();
  const isPremium = (profile as any)?.is_premium === true;
  const [commands, setCommands] = useState<Command[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent commands
  useEffect(() => {
    if (!user) return;
    supabase
      .from("agent_commands" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) setCommands((data as unknown as Command[]));
      });
  }, [user]);

  // Realtime subscription + polling fallback (mobile WebSockets can die in background)
  useEffect(() => {
    if (!user) return;

    const applyUpdate = (updated: Command) => {
      if (!updated?.id) return;
      setCommands(prev => {
        const idx = prev.findIndex(c => c.id === updated.id);
        if (idx === -1) return [updated, ...prev];
        if (JSON.stringify(prev[idx]) === JSON.stringify(updated)) return prev; // no change
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    };

    // Realtime (fast path)
    const channel = supabase
      .channel(`agent_cmds_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_commands", filter: `user_id=eq.${user.id}` },
        (payload) => applyUpdate(payload.new as Command)
      )
      .subscribe();

    // Polling fallback — fires every 3s while any command is active
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from("agent_commands" as any)
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) (data as unknown as Command[]).forEach(applyUpdate);
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [user]);

  const sendCommand = async () => {
    if (!input.trim() || !user || sending) return;
    const task = input.trim();
    setSendError(null);
    setSending(true);
    setTab("active");

    const tempId = `temp-${Date.now()}`;
    const optimistic: Command = {
      id: tempId, task, status: "pending", steps: [], result: null,
      created_at: new Date().toISOString(),
    };
    setCommands(prev => [optimistic, ...prev]);
    setInput("");

    try {
      const { data, error } = await supabase
        .from("agent_commands" as any)
        .insert({ user_id: user.id, task, status: "pending", steps: [] })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setCommands(prev => prev.map(c => c.id === tempId ? (data as unknown as Command) : c));
      }
    } catch (e: any) {
      setCommands(prev => prev.filter(c => c.id !== tempId));
      setInput(task);
      setSendError(e?.message || "Failed to send");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Bot className="w-7 h-7 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Remote Agent</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Control your desktop browser from your phone.
          </p>
        </div>
        <Link
          to="/auth?redirect=/remote-agent"
          className="flex items-center gap-2 h-11 px-8 rounded-full bg-primary text-primary-foreground text-sm font-medium"
        >
          <LogIn className="w-4 h-4" /> Sign in
        </Link>
      </div>
    );
  }

  // Not premium
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Zap className="w-7 h-7 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Premium feature</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Remote Agent lets you control your desktop browser from anywhere.
          </p>
        </div>
        <Link
          to="/premium"
          className="h-11 px-8 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center"
        >
          Unlock Premium
        </Link>
      </div>
    );
  }

  const active = commands.filter(c => c.status === "pending" || c.status === "running");
  const done   = commands.filter(c => c.status === "done");
  const shown  = tab === "active" ? active : tab === "done" ? done : commands;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "active", label: "Active",    count: active.length },
    { key: "done",   label: "Done",      count: done.length },
    { key: "all",    label: "All",       count: commands.length },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">

      {/* Header / greeting */}
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-xs font-medium text-primary/70 uppercase tracking-widest">SideBrain</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground leading-tight">
          Hey, what do you<br />want me to do?
        </h1>
        <p className="text-sm text-muted-foreground mt-1">I'll run it on your desktop browser.</p>
      </div>

      {/* Input bar */}
      <div className="px-5 pb-4">
        <div className={`flex items-center gap-2.5 bg-card border rounded-2xl px-4 py-3 transition-all ${
          sendError ? "border-red-400/40" : "border-border/60 focus-within:border-primary/30"
        }`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendCommand(); }}
            placeholder="Open Netflix · Search for flights · Send email to…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none"
          />
          <button
            onClick={sendCommand}
            disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-25 transition-opacity flex-shrink-0"
          >
            {sending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
        {sendError && <p className="text-xs text-red-400 mt-1.5 px-1">{sendError}</p>}
      </div>

      {/* Tabs */}
      <div className="px-5 pb-3 flex gap-1.5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              tab === t.key
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-background/20 text-background" : "bg-background/60 text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Command list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2.5">
        {shown.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            {tab === "active" ? (
              <>
                <div className="w-10 h-10 rounded-2xl bg-muted/40 flex items-center justify-center mb-1">
                  <Bot className="w-5 h-5 text-muted-foreground/30" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-muted-foreground/50">Nothing running right now.</p>
                <p className="text-xs text-muted-foreground/30">Type a task above to get started.</p>
              </>
            ) : tab === "done" ? (
              <p className="text-sm text-muted-foreground/40">No completed tasks yet.</p>
            ) : (
              <p className="text-sm text-muted-foreground/40">No tasks yet.</p>
            )}
          </div>
        )}
        {shown.map(cmd => <CommandCard key={cmd.id} cmd={cmd} />)}
      </div>
    </div>
  );
}
