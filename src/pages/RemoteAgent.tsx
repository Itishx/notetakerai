import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Bot, Send, Loader2, CheckCircle2, XCircle, Clock, ChevronDown, LogIn } from "lucide-react";

type AgentStep = { type: string; description: string; ok: boolean; snapshot?: { title: string; url: string } };
type Command = {
  id: string;
  task: string;
  status: "pending" | "running" | "done" | "error";
  steps: AgentStep[];
  result: string | null;
  created_at: string;
};

const StatusIcon = ({ status }: { status: Command["status"] }) => {
  if (status === "pending") return <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />;
  if (status === "running") return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
  if (status === "done")    return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
  return <XCircle className="w-3.5 h-3.5 text-red-400" />;
};

const StatusLabel: Record<Command["status"], string> = {
  pending: "Waiting for desktop…",
  running: "Running…",
  done:    "Done",
  error:   "Failed",
};

function CommandCard({ cmd }: { cmd: Command }) {
  const [expanded, setExpanded] = useState(cmd.status === "running");
  const hasSteps = cmd.steps.length > 0;

  useEffect(() => {
    if (cmd.status === "running") setExpanded(true);
  }, [cmd.status]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
      {/* Task */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-background" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground font-medium leading-snug">{cmd.task}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <StatusIcon status={cmd.status} />
            <span className="text-xs text-muted-foreground">{StatusLabel[cmd.status]}</span>
            {cmd.status === "running" && cmd.steps.length > 0 && (
              <span className="text-xs text-muted-foreground/50">· step {cmd.steps.length}</span>
            )}
          </div>
        </div>
        {hasSteps && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex-shrink-0 p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Steps */}
      {expanded && hasSteps && (
        <div className="border-t border-border/40 px-4 py-3 space-y-1.5">
          {cmd.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-xs mt-0.5 flex-shrink-0 ${step.ok ? "text-green-500" : "text-red-400"}`}>
                {step.ok ? "✓" : "✗"}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-snug">{step.description}</p>
                {step.snapshot && (
                  <p className="text-xs text-muted-foreground/40 truncate mt-0.5">{step.snapshot.title}</p>
                )}
              </div>
            </div>
          ))}
          {cmd.status === "running" && (
            <div className="flex items-center gap-2 pt-0.5">
              <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0" />
              <p className="text-xs text-muted-foreground/50 italic">working…</p>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {cmd.result && (
        <div className={`border-t px-4 py-3 ${cmd.status === "error" ? "border-red-400/20 bg-red-400/5" : "border-border/40 bg-primary/3"}`}>
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load recent commands
  useEffect(() => {
    if (!user) return;
    supabase
      .from("agent_commands")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setCommands((data as unknown as Command[]).reverse());
      });
  }, [user]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("agent_commands_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_commands", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as Command;
          setCommands(prev => {
            const idx = prev.findIndex(c => c.id === updated.id);
            if (idx === -1) return [...prev, updated];
            const next = [...prev];
            next[idx] = updated;
            return next;
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Scroll to bottom when new commands arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commands]);

  const sendCommand = async () => {
    if (!input.trim() || !user || sending) return;
    const task = input.trim();
    setInput("");
    setSending(true);
    try {
      const { error } = await supabase
        .from("agent_commands")
        .insert({ user_id: user.id, task, status: "pending", steps: [] });
      if (error) throw error;
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCommand(); }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
        <Bot className="w-10 h-10 text-primary/60" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-medium text-foreground mb-2">Remote Agent</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Log in to send tasks to your desktop browser from your phone.
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
        <Bot className="w-10 h-10 text-primary/60" strokeWidth={1.5} />
        <div>
          <h1 className="text-xl font-medium text-foreground mb-2">Remote Agent</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Remote control requires a Premium subscription.
          </p>
        </div>
        <Link
          to="/premium"
          className="flex items-center gap-2 h-11 px-8 rounded-full bg-primary text-primary-foreground text-sm font-medium"
        >
          Get Premium
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">SideBrain Agent</p>
          <p className="text-xs text-muted-foreground">Controls your desktop browser</p>
        </div>
      </div>

      {/* Commands feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {commands.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Bot className="w-8 h-8 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground/50 max-w-xs">
              Type a task below and it'll run on your desktop browser. Make sure SideBrain is open on your laptop.
            </p>
          </div>
        )}
        {commands.map(cmd => <CommandCard key={cmd.id} cmd={cmd} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-background/90 backdrop-blur border-t border-border/40 px-4 py-3">
        <div className="flex items-end gap-2 bg-card border border-border/60 rounded-2xl px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Send email to john@… · Search YouTube · Open Netflix…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none py-1 max-h-32"
            style={{ fieldSizing: "content" } as any}
          />
          <button
            onClick={sendCommand}
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            {sending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground/30 mt-2">
          Desktop must have SideBrain open to execute tasks
        </p>
      </div>
    </div>
  );
}
