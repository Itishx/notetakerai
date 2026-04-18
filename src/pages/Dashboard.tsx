import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Bot, NotebookText, Settings, CheckCircle2,
  XCircle, Clock, ChevronDown, ChevronUp, Zap, Search,
  ExternalLink, Copy, Check, LogOut,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Note = {
  id: string;
  title: string | null;
  source_title: string | null;
  source_url: string | null;
  structured_notes: string | null;
  use_case: string | null;
  created_at: string;
};

type AgentStep = { description: string; ok: boolean };
type Command = {
  id: string;
  task: string;
  status: string;
  steps: AgentStep[];
  result: string | null;
  created_at: string;
};

type NotionConn = {
  workspace_name: string | null;
  workspace_id: string | null;
} | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<[hul])/gm, "")
    .replace(/\n/g, "<br/>");
}

function useCaseLabel(uc: string | null) {
  const map: Record<string, string> = {
    lecture: "Lecture", meeting: "Meeting", page: "Chat", general: "General", agent: "Agent",
  };
  return map[uc || ""] || uc || "Note";
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done") return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">Done</Badge>;
  if (status === "error") return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Error</Badge>;
  if (status === "running") return <Badge className="bg-primary/10 text-primary border-primary/20 text-xs animate-pulse">Running</Badge>;
  return <Badge className="bg-muted text-muted-foreground text-xs">Pending</Badge>;
}

// ─── Note Modal ───────────────────────────────────────────────────────────────

function NoteModal({ note, onClose }: { note: Note; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(note.structured_notes || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-left pr-8">
            {note.title || "Untitled Note"}
          </DialogTitle>
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            {note.use_case && <Badge variant="outline" className="text-xs">{useCaseLabel(note.use_case)}</Badge>}
            {note.source_url && (
              <a href={note.source_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <ExternalLink className="w-3 h-3" />
                {note.source_title || note.source_url.slice(0, 40)}
              </a>
            )}
          </div>
        </DialogHeader>
        <div className="flex gap-2 pb-3 border-b border-border/50">
          <Button size="sm" variant="outline" onClick={copy} className="text-xs">
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy markdown"}
          </Button>
        </div>
        <div
          className="flex-1 overflow-y-auto text-sm leading-relaxed prose prose-sm max-w-none"
          style={{ fontFamily: "Charter, Georgia, serif" }}
          dangerouslySetInnerHTML={{ __html: note.structured_notes ? renderMarkdown(note.structured_notes) : "<p class='text-muted-foreground'>No content available.</p>" }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ cmd }: { cmd: Command }) {
  const [expanded, setExpanded] = useState(false);
  const steps = Array.isArray(cmd.steps) ? cmd.steps : [];

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{cmd.task}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(cmd.created_at)}</p>
        </div>
        <StatusBadge status={cmd.status} />
        {steps.length > 0 && (
          expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border/50 bg-muted/20 px-4 py-3 flex flex-col gap-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              {s.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />}
              <span>{s.description}</span>
            </div>
          ))}
          {cmd.result && (
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/40 italic">{cmd.result}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [notes, setNotes] = useState<Note[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [notionConn, setNotionConn] = useState<NotionConn>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [noteFilter, setNoteFilter] = useState<string>("all");
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(profile?.display_name || "");

    const load = async () => {
      const [notesRes, cmdsRes, notionRes] = await Promise.all([
        supabase.from("notes").select("id,title,source_title,source_url,structured_notes,use_case,created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("agent_commands").select("*")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("notion_connections").select("workspace_name,workspace_id")
          .eq("user_identifier", user.id).maybeSingle(),
      ]);
      if (notesRes.data) setNotes(notesRes.data as Note[]);
      if (cmdsRes.data) setCommands(cmdsRes.data as Command[]);
      setNotionConn(notionRes.data as NotionConn);
      setDataLoading(false);
    };

    load();
  }, [user, profile]);

  const saveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", user.id);
    setSavingName(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  };

  const firstName = profile?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const isPremium = profile?.is_premium === true;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const tasksThisMonth = commands.filter(c => new Date(c.created_at) >= monthStart).length;
  const doneTasks = commands.filter(c => c.status === "done").length;

  const filteredNotes = notes.filter(n => {
    const matchSearch = !noteSearch || (n.title || "").toLowerCase().includes(noteSearch.toLowerCase()) || (n.source_title || "").toLowerCase().includes(noteSearch.toLowerCase());
    const matchFilter = noteFilter === "all" || n.use_case === noteFilter;
    return matchSearch && matchFilter;
  });

  const filteredCommands = commands.filter(c =>
    taskFilter === "all" || c.status === taskFilter
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 px-6 max-w-4xl mx-auto flex flex-col gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-28 pb-20 px-4 md:px-6 max-w-4xl mx-auto">

        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {greeting()}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isPremium ? "Premium member" : "Free plan"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <Badge className="bg-primary/10 text-primary border-primary/30 font-medium">
                <Zap className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            ) : (
              <Link to="/premium">
                <Button size="sm" className="rounded-full text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                  <Zap className="w-3 h-3 mr-1.5" />
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="mb-6 bg-muted/50 rounded-full p-1">
            <TabsTrigger value="overview" className="rounded-full text-xs px-4">Overview</TabsTrigger>
            <TabsTrigger value="notes" className="rounded-full text-xs px-4">Notes</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-full text-xs px-4">Agent Tasks</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-full text-xs px-4">Settings</TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW TAB ─────────────────────────────── */}
          <TabsContent value="overview" className="flex flex-col gap-6">

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Notes", value: dataLoading ? "—" : notes.length, icon: <FileText className="w-4 h-4" /> },
                { label: "Tasks Run", value: dataLoading ? "—" : commands.length, icon: <Bot className="w-4 h-4" /> },
                { label: "This Month", value: dataLoading ? "—" : tasksThisMonth, icon: <Clock className="w-4 h-4" /> },
                { label: "Tasks Done", value: dataLoading ? "—" : doneTasks, icon: <CheckCircle2 className="w-4 h-4" /> },
              ].map(stat => (
                <div key={stat.label} className="border border-border/50 rounded-2xl p-4 bg-card flex flex-col gap-2">
                  <div className="text-muted-foreground">{stat.icon}</div>
                  <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent Notes */}
            <div className="border border-border/50 rounded-2xl p-5 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <NotebookText className="w-4 h-4 text-muted-foreground" />
                  Recent Notes
                </h2>
                <button onClick={() => document.querySelector('[data-value="notes"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }))}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </button>
              </div>
              {dataLoading ? (
                <div className="flex flex-col gap-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No notes yet. Record a session with the extension.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {notes.slice(0, 5).map(n => (
                    <button key={n.id} onClick={() => setSelectedNote(n)}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors text-left border border-transparent hover:border-border/50">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{n.title || "Untitled Note"}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}{n.source_title ? ` · ${n.source_title}` : ""}</p>
                      </div>
                      {n.use_case && <Badge variant="outline" className="text-xs flex-shrink-0">{useCaseLabel(n.use_case)}</Badge>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Tasks */}
            <div className="border border-border/50 rounded-2xl p-5 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  Recent Agent Tasks
                </h2>
                <Link to="/remote-agent" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  New task →
                </Link>
              </div>
              {dataLoading ? (
                <div className="flex flex-col gap-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              ) : commands.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet. Try Delegate from your phone.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {commands.slice(0, 5).map(cmd => (
                    <div key={cmd.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-background/60">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{cmd.task}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(cmd.created_at)}</p>
                      </div>
                      <StatusBadge status={cmd.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notion status */}
            <div className="border border-border/50 rounded-2xl p-5 bg-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${notionConn ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">Notion</p>
                  <p className="text-xs text-muted-foreground">
                    {notionConn ? `Connected · ${notionConn.workspace_name || "Workspace"}` : "Not connected"}
                  </p>
                </div>
              </div>
              {!notionConn && (
                <Link to="/notion-sync">
                  <Button size="sm" variant="outline" className="rounded-full text-xs">Connect →</Button>
                </Link>
              )}
            </div>
          </TabsContent>

          {/* ── NOTES TAB ────────────────────────────────── */}
          <TabsContent value="notes" className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={noteSearch}
                  onChange={e => setNoteSearch(e.target.value)}
                  className="pl-8 rounded-full text-sm h-9"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {["all", "lecture", "meeting", "page", "general"].map(f => (
                  <button key={f}
                    onClick={() => setNoteFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${noteFilter === f ? "bg-foreground text-background border-foreground" : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}>
                    {f === "all" ? "All" : useCaseLabel(f)}
                  </button>
                ))}
              </div>
            </div>

            {dataLoading ? (
              <div className="flex flex-col gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                {noteSearch ? "No notes match your search." : "No notes yet."}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredNotes.map(n => (
                  <button key={n.id} onClick={() => setSelectedNote(n)}
                    className="flex items-start gap-4 px-5 py-4 rounded-2xl border border-border/50 bg-card hover:bg-muted/30 transition-colors text-left">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{n.title || "Untitled Note"}</p>
                      {n.source_title && <p className="text-xs text-muted-foreground truncate mt-0.5">{n.source_title}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {n.use_case && <Badge variant="outline" className="text-xs">{useCaseLabel(n.use_case)}</Badge>}
                      <span className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TASKS TAB ────────────────────────────────── */}
          <TabsContent value="tasks" className="flex flex-col gap-4">
            <div className="flex items-center gap-2 justify-between flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {["all", "done", "error", "running", "pending"].map(f => (
                  <button key={f}
                    onClick={() => setTaskFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${taskFilter === f ? "bg-foreground text-background border-foreground" : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <Link to="/remote-agent">
                <Button size="sm" variant="outline" className="rounded-full text-xs">
                  <Bot className="w-3.5 h-3.5 mr-1.5" />
                  New task
                </Button>
              </Link>
            </div>

            {dataLoading ? (
              <div className="flex flex-col gap-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filteredCommands.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">No tasks found.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredCommands.map(cmd => <TaskRow key={cmd.id} cmd={cmd} />)}
              </div>
            )}
          </TabsContent>

          {/* ── SETTINGS TAB ─────────────────────────────── */}
          <TabsContent value="settings" className="flex flex-col gap-4">

            {/* Profile */}
            <div className="border border-border/50 rounded-2xl p-5 bg-card flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-foreground">Profile</h2>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-lg flex-shrink-0">
                  {(profile?.display_name || user.email || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{profile?.display_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="text-sm rounded-xl"
                  onKeyDown={e => e.key === "Enter" && saveName()}
                />
                <Button onClick={saveName} disabled={savingName} size="sm" variant="outline" className="rounded-xl shrink-0">
                  {nameSaved ? <Check className="w-4 h-4 text-green-500" /> : "Save"}
                </Button>
              </div>
            </div>

            {/* Notion */}
            <div className="border border-border/50 rounded-2xl p-5 bg-card flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">Notion</h2>
              {notionConn ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-foreground">{notionConn.workspace_name || "Connected"}</span>
                  </div>
                  <Link to="/notion-sync">
                    <Button size="sm" variant="outline" className="rounded-full text-xs">Manage</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Not connected</span>
                  <Link to="/notion-sync">
                    <Button size="sm" variant="outline" className="rounded-full text-xs">Connect Notion →</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Plan */}
            <div className="border border-border/50 rounded-2xl p-5 bg-card flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Plan</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{isPremium ? "SideBrain Premium" : "Free plan — limited agent tasks"}</p>
              </div>
              {!isPremium && (
                <Link to="/premium">
                  <Button size="sm" className="rounded-full text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                    <Zap className="w-3 h-3 mr-1.5" />
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>

            {/* Sign out */}
            <div className="border border-border/50 rounded-2xl p-5 bg-card">
              <h2 className="text-sm font-semibold text-foreground mb-3">Account</h2>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs text-muted-foreground hover:text-foreground border-border/50"
                onClick={() => signOut()}
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign out
              </Button>
            </div>

          </TabsContent>
        </Tabs>
      </div>

      {/* Note modal */}
      {selectedNote && <NoteModal note={selectedNote} onClose={() => setSelectedNote(null)} />}
    </div>
  );
}
