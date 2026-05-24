import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  FolderOpen,
  Grid2x2,
  HelpCircle,
  Highlighter,
  LayoutGrid,
  List,
  LogOut,
  Mic,
  NotebookText,
  Plus,
  Search,
  Settings,
  Sparkles,
  Zap,
  XCircle,
} from "lucide-react";

type Note = {
  id: string;
  title: string | null;
  source_title: string | null;
  source_url: string | null;
  structured_notes: string | null;
  use_case: string | null;
  created_at: string;
};

type AgentStep = {
  description: string;
  ok: boolean;
  __meta?: boolean;
  durationMs?: number;
};

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

type XAutomationStats = {
  total_replies: number;
  total_runs: number;
  total_runtime_ms: number;
  last_run_reply_count: number;
  last_run_duration_ms: number;
  last_run_started_at: string | null;
  last_run_finished_at: string | null;
} | null;

type DashboardTab = "overview" | "notes" | "tasks" | "xAutomation" | "settings" | "memory" | "highlights";
type NoteView = "list" | "grid";

type ActivityPoint = {
  key: string;
  label: string;
  noteCount: number;
  taskCount: number;
  totalCount: number;
};

const serifStyle = { fontFamily: "Instrument Serif, Georgia, serif" } as const;
const monoStyle = { fontFamily: "JetBrains Mono, monospace" } as const;

function dashboardTabLabel(tab: DashboardTab) {
  if (tab === "tasks") return "Agent Tasks";
  if (tab === "xAutomation") return "X Automation";
  if (tab === "highlights") return "Highlights";
  return tab.charAt(0).toUpperCase() + tab.slice(1);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatDuration(ms?: number) {
  if (!ms) return null;
  if (ms < 60000) return `${Math.max(1, Math.round(ms / 1000))}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function renderMarkdown(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}

function caseLabel(value: string | null) {
  const map: Record<string, string> = {
    lecture: "Lecture",
    meeting: "Meeting",
    page: "Chat",
    general: "General",
    agent: "Agent",
  };
  return map[value || ""] || value || "Note";
}

function getInitials(value: string) {
  return value
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function domainFromUrl(url: string | null) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function shiftDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dayKey(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildActivitySeries(notes: Note[], commands: Command[], days = 14) {
  const today = startOfDay(new Date());
  const noteCounts = new Map<string, number>();
  const taskCounts = new Map<string, number>();

  notes.forEach((note) => {
    const key = dayKey(note.created_at);
    noteCounts.set(key, (noteCounts.get(key) || 0) + 1);
  });

  commands.forEach((command) => {
    const key = dayKey(command.created_at);
    taskCounts.set(key, (taskCounts.get(key) || 0) + 1);
  });

  return Array.from({ length: days }, (_, index) => {
    const date = shiftDays(today, -(days - 1 - index));
    const key = dayKey(date);
    const noteCount = noteCounts.get(key) || 0;
    const taskCount = taskCounts.get(key) || 0;

    return {
      key,
      label: date.toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
      noteCount,
      taskCount,
      totalCount: noteCount + taskCount,
    } satisfies ActivityPoint;
  });
}

function computeCurrentStreak(activityKeys: Set<string>) {
  let streak = 0;
  let cursor = startOfDay(new Date());

  while (activityKeys.has(dayKey(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }

  return streak;
}

function computeBestStreak(activityKeys: Set<string>) {
  const keys = Array.from(activityKeys).sort();
  if (!keys.length) return 0;

  let best = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const key of keys) {
    const currentDate = new Date(`${key}T00:00:00`);
    if (!previous) {
      current = 1;
    } else {
      const diff = (currentDate.getTime() - previous.getTime()) / 86400000;
      current = diff === 1 ? current + 1 : 1;
    }
    previous = currentDate;
    best = Math.max(best, current);
  }

  return best;
}

function buildLinePoints(values: number[], width: number, height: number, padding = 8) {
  const max = Math.max(...values, 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : padding + (usableWidth * index) / (values.length - 1);
    const y = height - padding - (value / max) * usableHeight;
    return { x, y };
  });
}

function linePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function areaPath(points: Array<{ x: number; y: number }>, height: number, padding = 8) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return [
    `M ${first.x} ${height - padding}`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
    `L ${last.x} ${height - padding}`,
    "Z",
  ].join(" ");
}

function noteVisual(note: Note) {
  const domain = domainFromUrl(note.source_url).toLowerCase();

  if (domain.includes("youtube")) {
    return {
      short: "YT",
      gradient: "linear-gradient(135deg, #DB4437, #B6362B)",
      tagClasses: "bg-red-100 text-red-700 border-red-200",
    };
  }

  if (note.use_case === "meeting") {
    return {
      short: "MT",
      gradient: "linear-gradient(135deg, #2B6CDF, #1E50B0)",
      tagClasses: "bg-blue-100 text-blue-700 border-blue-200",
    };
  }

  if (note.use_case === "lecture") {
    return {
      short: "LE",
      gradient: "linear-gradient(135deg, #6B4E32, #8C5A3D)",
      tagClasses: "bg-amber-100 text-amber-800 border-amber-200",
    };
  }

  if (note.use_case === "page") {
    return {
      short: "CH",
      gradient: "linear-gradient(135deg, #E27D39, #C65E1E)",
      tagClasses: "bg-orange-100 text-orange-700 border-orange-200",
    };
  }

  return {
    short: "GN",
    gradient: "linear-gradient(135deg, #4B413A, #1B1713)",
    tagClasses: "bg-stone-100 text-stone-700 border-stone-200",
  };
}

function commandMeta(command: Command) {
  const allSteps = Array.isArray(command.steps) ? command.steps : [];
  const meta = allSteps.find((step) => step.__meta);
  const steps = allSteps.filter((step) => !step.__meta);
  return { meta, steps };
}

function taskStatusLabel(status: string) {
  if (status === "done") return "Done";
  if (status === "error") return "Error";
  if (status === "running") return "Running";
  if (status === "draft") return "Draft";
  if (status === "pending") return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function guessTaskSite(task: string) {
  const lower = task.toLowerCase();

  if (lower.includes("reddit")) {
    return { label: "reddit.com", color: "linear-gradient(135deg, #FF4500, #C73600)" };
  }
  if (lower.includes("gmail") || lower.includes("email") || lower.includes("mail")) {
    return { label: "mail.google.com", color: "linear-gradient(135deg, #DB4437, #B6362B)" };
  }
  if (lower.includes("linkedin")) {
    return { label: "linkedin.com", color: "linear-gradient(135deg, #0072B1, #005A8E)" };
  }
  if (lower.includes("x.com") || lower.includes("twitter")) {
    return { label: "x.com", color: "linear-gradient(135deg, #2B2B2B, #14110E)" };
  }
  if (lower.includes("youtube")) {
    return { label: "youtube.com", color: "linear-gradient(135deg, #DB4437, #B6362B)" };
  }
  if (lower.includes("github")) {
    return { label: "github.com", color: "linear-gradient(135deg, #2B2B2B, #14110E)" };
  }
  if (lower.includes("amazon")) {
    return { label: "amazon.com", color: "linear-gradient(135deg, #F7B500, #C57A00)" };
  }

  return { label: "browser", color: "linear-gradient(135deg, #B8AFA4, #8A7F75)" };
}

function statusClasses(status: string) {
  if (status === "done") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "error") return "bg-red-50 text-red-700 border-red-200";
  if (status === "running") return "bg-orange-50 text-orange-700 border-orange-200";
  if (status === "draft") return "bg-stone-100 text-stone-700 border-stone-200";
  return "bg-stone-100 text-stone-700 border-stone-200";
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      style={monoStyle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] tracking-[0.04em]",
        statusClasses(status),
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {taskStatusLabel(status)}
    </span>
  );
}

function NoteMark({ note, size = "md" }: { note: Note; size?: "sm" | "md" }) {
  const visual = noteVisual(note);
  const classes =
    size === "sm"
      ? "h-7 w-7 rounded-[7px] text-[10px]"
      : "h-8 w-8 rounded-[8px] text-[11px]";

  return (
    <div
      style={{ background: visual.gradient, ...monoStyle }}
      className={cn("grid place-items-center font-semibold text-white", classes)}
    >
      {visual.short}
    </div>
  );
}

function TaskStatusIcon({ status }: { status: string }) {
  if (status === "done") {
    return (
      <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid h-6 w-6 place-items-center rounded-full bg-red-50 text-red-700">
        <XCircle className="h-3.5 w-3.5" />
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="grid h-6 w-6 place-items-center rounded-full border border-[var(--sb-accent)] border-t-transparent text-[var(--sb-accent-deep)] animate-spin" />
    );
  }

  return (
    <div className="grid h-6 w-6 place-items-center rounded-full bg-[var(--sb-bg-2)] text-[var(--sb-ink-3)]">
      <Clock3 className="h-3.5 w-3.5" />
    </div>
  );
}

function NoteModal({ note, onClose }: { note: Note; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.structured_notes || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-[var(--sb-ink)] sm:rounded-[24px]">
        <DialogHeader className="border-b border-[var(--sb-line-2)] pb-4">
          <DialogTitle style={serifStyle} className="pr-8 text-left text-3xl font-normal tracking-[-0.02em]">
            {note.title || "Untitled note"}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span style={monoStyle} className="text-[11px] text-[var(--sb-ink-3)]">
              {new Date(note.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <Badge variant="outline" className={cn("border text-[10px]", noteVisual(note).tagClasses)} style={monoStyle}>
              {caseLabel(note.use_case)}
            </Badge>
            {note.source_url && (
              <a
                href={note.source_url}
                target="_blank"
                rel="noreferrer"
                style={monoStyle}
                className="inline-flex items-center gap-1.5 text-[11px] text-[var(--sb-ink-3)] transition-colors hover:text-[var(--sb-ink)]"
              >
                <ExternalLink className="h-3 w-3" />
                {note.source_title || domainFromUrl(note.source_url)}
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-[var(--sb-line-2)] py-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
          >
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy markdown"}
          </Button>
        </div>

        <div
          className="overflow-y-auto py-5 text-[15px] leading-7 text-[var(--sb-ink-2)]"
          style={{ ...serifStyle, maxHeight: "calc(88vh - 220px)" }}
          dangerouslySetInnerHTML={{
            __html: note.structured_notes
              ? renderMarkdown(note.structured_notes)
              : "<p style='font-family:Inter,sans-serif;color:var(--sb-ink-3)'>No content available.</p>",
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function TaskRow({ command }: { command: Command }) {
  const [expanded, setExpanded] = useState(false);
  const { meta, steps } = commandMeta(command);
  const site = guessTaskSite(command.task);
  const duration = formatDuration(meta?.durationMs);

  return (
    <div className="overflow-hidden rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="grid w-full grid-cols-[28px_minmax(0,1fr)_auto_auto] items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--sb-panel)]"
      >
        <TaskStatusIcon status={command.status} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-[var(--sb-ink)]">{command.task}</div>
          <div style={monoStyle} className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-[var(--sb-ink-3)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: site.color }} />
              {site.label}
            </span>
            <span className="text-[var(--sb-ink-4)]">·</span>
            <span>{timeAgo(command.created_at)}</span>
            {steps.length > 0 && (
              <>
                <span className="text-[var(--sb-ink-4)]">·</span>
                <span>{steps.length} steps{duration ? ` · ${duration}` : ""}</span>
              </>
            )}
          </div>
        </div>
        <StatusPill status={command.status} />
        <ChevronDown className={cn("h-4 w-4 text-[var(--sb-ink-3)] transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-[var(--sb-line-2)] bg-[var(--sb-panel)] px-5 py-4">
          {steps.length > 0 ? (
            <div className="space-y-2.5">
              {steps.map((step, index) => (
                <div key={`${command.id}-${index}`} className="flex items-start gap-2 text-xs text-[var(--sb-ink-2)]">
                  {step.ok ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-600" />
                  )}
                  <span>{step.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--sb-ink-3)]">No recorded step trace yet.</p>
          )}

          {command.result && (
            <p className="mt-3 border-t border-[var(--sb-line-2)] pt-3 text-xs italic text-[var(--sb-ink-3)]">
              {command.result}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
  muted = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
        active
          ? "bg-[var(--sb-ink)] text-[var(--sb-on-ink)]"
          : muted
            ? "text-[var(--sb-ink-3)] hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink-2)]"
            : "text-[var(--sb-ink-2)] hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink)]",
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      <span>{label}</span>
      {badge ? <span className="ml-auto">{badge}</span> : null}
    </button>
  );
}

function MemoryAddForm({ userId, onAdded }: { userId: string; onAdded: (note: Note) => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    const { data } = await supabase
      .from("notes")
      .insert({
        user_id: userId,
        title: trimmed.slice(0, 120),
        structured_notes: trimmed,
        use_case: "memory",
      })
      .select("id,title,source_title,source_url,structured_notes,use_case,created_at")
      .single();
    setSaving(false);
    if (data) {
      onAdded(data as Note);
      setText("");
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="e.g. I'm a CS student at IIT Delhi"
        className="h-10 flex-1 rounded-xl border-[var(--sb-line)] bg-[var(--sb-panel)] text-[13.5px]"
      />
      <Button
        onClick={handleSave}
        disabled={saving || !text.trim()}
        className="h-10 rounded-xl bg-[var(--sb-ink)] px-4 text-[13px] text-[var(--sb-on-ink)] hover:opacity-90"
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [notes, setNotes] = useState<Note[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [notionConn, setNotionConn] = useState<NotionConn>(null);
  const [xAutomationStats, setXAutomationStats] = useState<XAutomationStats>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteFilter, setNoteFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [noteView, setNoteView] = useState<NoteView>("list");
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(profile?.display_name || "");

    const load = async () => {
      const [notesRes, commandsRes, notionRes, xStatsRes] = await Promise.all([
        supabase
          .from("notes")
          .select("id,title,source_title,source_url,structured_notes,use_case,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("agent_commands")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(120),
        supabase
          .from("notion_connections")
          .select("workspace_name,workspace_id")
          .eq("user_identifier", user.id)
          .maybeSingle(),
        supabase
          .from("x_automation_stats")
          .select("total_replies,total_runs,total_runtime_ms,last_run_reply_count,last_run_duration_ms,last_run_started_at,last_run_finished_at")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (notesRes.data) setNotes(notesRes.data as Note[]);
      if (commandsRes.data) setCommands(commandsRes.data as unknown as Command[]);
      setNotionConn(notionRes.data as NotionConn);
      setXAutomationStats((xStatsRes.data as XAutomationStats) || null);
      setDataLoading(false);
    };

    load();
  }, [profile, user]);

  const isPremium = profile?.is_premium === true;
  const firstName = profile?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  const activitySeries = useMemo(() => buildActivitySeries(notes, commands), [commands, notes]);
  const activityKeys = useMemo(
    () => new Set(activitySeries.filter((point) => point.totalCount > 0).map((point) => point.key)),
    [activitySeries],
  );
  const currentStreak = useMemo(() => computeCurrentStreak(activityKeys), [activityKeys]);
  const bestStreak = useMemo(() => computeBestStreak(activityKeys), [activityKeys]);

  const monthlyTaskLimit = isPremium ? null : 25;
  const monthStart = useMemo(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const tasksThisMonth = commands.filter((command) => new Date(command.created_at) >= monthStart).length;
  const doneTasks = commands.filter((command) => command.status === "done").length;
  const runningTasks = commands.filter((command) => command.status === "running");
  const successRate = commands.length ? Math.round((doneTasks / commands.length) * 100) : 0;
  const xTotalReplies = xAutomationStats?.total_replies || 0;
  const xTotalRuns = xAutomationStats?.total_runs || 0;
  const xTotalRuntime = formatDuration(xAutomationStats?.total_runtime_ms) || "0s";
  const xLastRunDuration = formatDuration(xAutomationStats?.last_run_duration_ms) || "0s";

  const lastActivity = useMemo(() => {
    const latest = [notes[0]?.created_at, commands[0]?.created_at]
      .filter(Boolean)
      .map((value) => new Date(value as string).getTime())
      .sort((a, b) => b - a)[0];
    return latest ? timeAgo(new Date(latest).toISOString()) : "never";
  }, [commands, notes]);

  const accountDays = useMemo(() => {
    if (!user?.created_at) return 1;
    const created = new Date(user.created_at).getTime();
    return Math.max(1, Math.ceil((Date.now() - created) / 86400000));
  }, [user?.created_at]);

  const notesByFilter = useMemo(
    () =>
      notes
        .filter((n) => n.use_case !== "memory" && n.use_case !== "highlight")
        .filter((note) => {
          const matchesSearch =
            !searchQuery ||
            [note.title, note.source_title, note.structured_notes, note.source_url]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesFilter = noteFilter === "all" || note.use_case === noteFilter;
          return matchesSearch && matchesFilter;
        }),
    [noteFilter, notes, searchQuery],
  );

  const memoryNotes = useMemo(() => notes.filter((n) => n.use_case === "memory"), [notes]);
  const highlights = useMemo(() => notes.filter((n) => n.use_case === "highlight"), [notes]);

  const taskStatuses = useMemo(() => {
    const base = ["all", "running", "done", "error", "pending"];
    const extra = Array.from(new Set(commands.map((command) => command.status))).filter((status) => !base.includes(status));
    return [...base, ...extra];
  }, [commands]);

  const commandsByFilter = useMemo(
    () =>
      commands.filter((command) => {
        const matchesSearch =
          !searchQuery ||
          [command.task, command.result, ...commandMeta(command).steps.map((step) => step.description)]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = taskFilter === "all" || command.status === taskFilter;
        return matchesSearch && matchesFilter;
      }),
    [commands, searchQuery, taskFilter],
  );

  const uniqueSites = useMemo(() => {
    const seen = new Map<string, { label: string; color: string; count: number }>();
    commands.forEach((command) => {
      const site = guessTaskSite(command.task);
      const current = seen.get(site.label);
      if (current) {
        current.count += 1;
      } else {
        seen.set(site.label, { ...site, count: 1 });
      }
    });
    return Array.from(seen.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [commands]);

  const taskSparkPoints = buildLinePoints(
    activitySeries.map((point) => point.taskCount),
    200,
    28,
    4,
  );
  const notesSparkPoints = buildLinePoints(
    activitySeries.map((point) => point.noteCount),
    200,
    28,
    4,
  );
  const chartTaskPoints = buildLinePoints(
    activitySeries.map((point) => point.taskCount),
    400,
    180,
    12,
  );
  const chartNotePoints = buildLinePoints(
    activitySeries.map((point) => point.noteCount),
    400,
    180,
    12,
  );

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("user_id", user.id);
    setSavingName(false);
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 2000);
  };

  const topSearchPlaceholder =
    activeTab === "notes"
      ? "Search notes..."
      : activeTab === "tasks"
        ? "Search tasks..."
        : activeTab === "xAutomation"
          ? "Search X automation stats..."
        : activeTab === "settings"
          ? "Search account settings..."
          : activeTab === "memory"
            ? "Search memory..."
            : activeTab === "highlights"
              ? "Search highlights..."
              : "Search notes, tasks, recordings...";

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[var(--sb-bg)]">
        <div className="grid min-h-screen lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="hidden border-r border-[var(--sb-line)] bg-[var(--sb-panel)] p-5 lg:block">
            <Skeleton className="mb-6 h-7 w-32 rounded-full bg-[var(--sb-bg-2)]" />
            <Skeleton className="mb-6 h-11 w-full rounded-xl bg-[var(--sb-bg-2)]" />
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full rounded-lg bg-[var(--sb-bg-2)]" />
              ))}
            </div>
          </div>
          <div className="p-4 md:p-8">
            <Skeleton className="mb-6 h-16 w-full rounded-2xl bg-[var(--sb-bg-2)]" />
            <Skeleton className="mb-6 h-24 w-80 rounded-3xl bg-[var(--sb-bg-2)]" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 rounded-3xl bg-[var(--sb-bg-2)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--sb-bg)] text-[var(--sb-ink)]">
      <div className="grid min-h-screen lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--sb-line)] bg-[var(--sb-panel)] px-3.5 py-4 lg:flex">
          <Link to="/" className="flex items-center gap-0 px-2 pb-5 no-underline">
            <span
              style={{
                fontFamily: "'TNR', 'Times New Roman', serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 17,
                color: "var(--sb-ink)",
              }}
            >side</span>
            <span
              style={{
                fontFamily: "'BeVietnam', sans-serif",
                fontWeight: 800,
                fontSize: 17,
                color: "var(--sb-ink)",
                letterSpacing: "-0.03em",
              }}
            >brain</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate("/#install")}
            className="mb-5 flex w-full items-center gap-2 rounded-[10px] bg-[var(--sb-ink)] px-3 py-3 text-left text-[13.5px] font-medium text-[var(--sb-on-ink)] transition hover:opacity-90"
          >
            <span
              className="h-4 w-4 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 35%, #FFD9A8, #F39A42, #D96E1A)",
                boxShadow: "0 0 8px rgba(243,154,66,0.6)",
              }}
            />
            <span>Talk to SideBrain</span>
            <span style={monoStyle} className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
              CMD K
            </span>
          </button>

          <div style={monoStyle} className="px-2 pb-1 text-[9.5px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
            Workspace
          </div>
          <div className="space-y-0.5">
            <SidebarItem
              label="Overview"
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
            />
            <SidebarItem
              label="Notes"
              active={activeTab === "notes"}
              onClick={() => setActiveTab("notes")}
              icon={<FileText className="h-3.5 w-3.5" />}
              badge={
                <span style={monoStyle} className={cn("rounded-full px-2 py-0.5 text-[10px]", activeTab === "notes" ? "bg-white/12 text-white/80" : "bg-[var(--sb-accent-soft)] text-[var(--sb-accent-deep)]")}>
                  {notes.length}
                </span>
              }
            />
            <SidebarItem
              label="Agent Tasks"
              active={activeTab === "tasks"}
              onClick={() => setActiveTab("tasks")}
              icon={<Bot className="h-3.5 w-3.5" />}
              badge={
                runningTasks.length > 0 ? (
                  <span className={cn("h-2 w-2 rounded-full", activeTab === "tasks" ? "bg-white" : "bg-[var(--sb-accent)]")} />
                ) : undefined
              }
            />
            <SidebarItem
              label="X Automation"
              active={activeTab === "xAutomation"}
              onClick={() => setActiveTab("xAutomation")}
              icon={<Zap className="h-3.5 w-3.5" />}
              badge={
                xTotalReplies > 0 ? (
                  <span style={monoStyle} className={cn("rounded-full px-2 py-0.5 text-[10px]", activeTab === "xAutomation" ? "bg-white/12 text-white/80" : "bg-[var(--sb-accent-soft)] text-[var(--sb-accent-deep)]")}>
                    {xTotalReplies}
                  </span>
                ) : undefined
              }
            />
            <SidebarItem label="Recordings" muted icon={<Mic className="h-3.5 w-3.5" />} badge={<span style={monoStyle} className="text-[10px] text-[var(--sb-ink-4)]">Soon</span>} />
            <SidebarItem
              label="Memory"
              active={activeTab === "memory"}
              onClick={() => setActiveTab("memory")}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              badge={
                memoryNotes.length > 0 ? (
                  <span style={monoStyle} className={cn("rounded-full px-2 py-0.5 text-[10px]", activeTab === "memory" ? "bg-white/12 text-white/80" : "bg-[var(--sb-accent-soft)] text-[var(--sb-accent-deep)]")}>
                    {memoryNotes.length}
                  </span>
                ) : undefined
              }
            />
          </div>

          <div style={monoStyle} className="px-2 pb-1 pt-4 text-[9.5px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
            Library
          </div>
          <div className="space-y-0.5">
            <SidebarItem label="Collections" muted icon={<FolderOpen className="h-3.5 w-3.5" />} />
            <SidebarItem
              label="Search"
              muted={false}
              onClick={() => {
                setActiveTab("notes");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              icon={<Search className="h-3.5 w-3.5" />}
              badge={
                <span style={monoStyle} className="rounded bg-[var(--sb-bg-2)] px-1.5 py-0.5 text-[10px] text-[var(--sb-ink-3)]">
                  CMD F
                </span>
              }
            />
            <SidebarItem
              label="Highlights"
              active={activeTab === "highlights"}
              onClick={() => setActiveTab("highlights")}
              icon={<Highlighter className="h-3.5 w-3.5" />}
              badge={
                highlights.length > 0 ? (
                  <span style={monoStyle} className={cn("rounded-full px-2 py-0.5 text-[10px]", activeTab === "highlights" ? "bg-white/12 text-white/80" : "bg-[var(--sb-accent-soft)] text-[var(--sb-accent-deep)]")}>
                    {highlights.length}
                  </span>
                ) : undefined
              }
            />
          </div>

          <div style={monoStyle} className="px-2 pb-1 pt-4 text-[9.5px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
            Account
          </div>
          <SidebarItem
            label="Settings"
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
            icon={<Settings className="h-3.5 w-3.5" />}
          />

          <div className="mt-auto border-t border-[var(--sb-line-2)] pt-3">
            <div className="mb-3 overflow-hidden rounded-xl bg-[var(--sb-ink)] p-4 text-[var(--sb-on-ink)]">
              <div style={monoStyle} className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-accent-2)]">
                {isPremium ? "PREMIUM ACTIVE" : "FREE PLAN"}
              </div>
              <h4 style={serifStyle} className="mb-3 max-w-[170px] text-[20px] leading-[1.15] tracking-[-0.02em]">
                {isPremium ? "Unlimited Delegate is live." : "Go Pro for unlimited Delegate."}
              </h4>
              <div className="mb-2 text-[11.5px] text-white/60">
                {isPremium ? "Premium enabled for this account." : `${tasksThisMonth} / ${monthlyTaskLimit} tasks used this month`}
              </div>
              <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--sb-accent)]"
                  style={{
                    width: isPremium
                      ? "100%"
                      : `${Math.min(100, Math.round((tasksThisMonth / Math.max(monthlyTaskLimit || 1, 1)) * 100))}%`,
                  }}
                />
              </div>
              {!isPremium ? (
                <Link to="/premium">
                  <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--sb-panel-2)] px-3 py-2 text-xs font-medium text-[var(--sb-ink)] transition hover:brightness-110">
                    <Zap className="h-3 w-3" />
                    Upgrade - $12/mo
                  </button>
                </Link>
              ) : (
                <Link to="/premium">
                  <button className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--sb-panel-2)] px-3 py-2 text-xs font-medium text-[var(--sb-ink)] transition hover:brightness-110">
                    Manage plan
                  </button>
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-[var(--sb-bg-2)]"
            >
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[linear-gradient(135deg,#6B4E32,#8C5A3D)] text-xs font-semibold text-white">
                {getInitials(profile?.display_name || user.email || "SB")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-[var(--sb-ink)]">{profile?.display_name || firstName}</div>
                <div style={monoStyle} className="text-[10px] uppercase tracking-[0.04em] text-[var(--sb-ink-3)]">
                  BETA
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--sb-ink-3)]" />
            </button>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--sb-line-2)] bg-[color-mix(in_srgb,var(--sb-bg)_86%,transparent)] px-4 backdrop-blur md:px-8">
            <div style={monoStyle} className="hidden items-center gap-2 text-[11px] text-[var(--sb-ink-3)] md:flex">
              <span>SideBrain</span>
              <span className="text-[var(--sb-ink-4)]">/</span>
              <b className="font-medium text-[var(--sb-ink)]">{dashboardTabLabel(activeTab)}</b>
            </div>

            <div className="flex max-w-[540px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] px-3 py-2 text-[13px] text-[var(--sb-ink-3)]">
              <Search className="h-3.5 w-3.5" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={topSearchPlaceholder}
                className="w-full border-0 bg-transparent text-[13.5px] text-[var(--sb-ink)] outline-none placeholder:text-[var(--sb-ink-3)]"
              />
              <span style={monoStyle} className="hidden rounded border border-[var(--sb-line-2)] bg-[var(--sb-bg-2)] px-1.5 py-0.5 text-[10px] md:inline-flex">
                CMD K
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--sb-ink-2)] transition hover:bg-[var(--sb-panel)] hover:text-[var(--sb-ink)]">
                <Bell className="h-4 w-4" />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-[10px] text-[var(--sb-ink-2)] transition hover:bg-[var(--sb-panel)] hover:text-[var(--sb-ink)]">
                <HelpCircle className="h-4 w-4" />
              </button>
              <Link to="/remote-agent">
                <button className="hidden items-center gap-2 rounded-[10px] bg-[var(--sb-ink)] px-4 py-2 text-[13px] font-medium text-[var(--sb-on-ink)] transition hover:opacity-90 md:inline-flex">
                  <Plus className="h-3.5 w-3.5" />
                  New task
                </button>
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1320px] px-4 pb-20 pt-8 md:px-8 lg:px-10">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 style={serifStyle} className="mb-2 text-[clamp(36px,4.4vw,56px)] leading-[1.02] tracking-[-0.03em]">
                  {greeting()}, <em className="text-[var(--sb-accent-deep)]">{firstName}.</em>
                </h1>
                <div style={monoStyle} className="flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--sb-ink-3)]">
                  <span>
                    <b className="font-medium text-[var(--sb-ink-2)]">Day {accountDays}</b>
                  </span>
                  <span className="h-1 w-1 rounded-full bg-[var(--sb-ink-4)]" />
                  <span>last active {lastActivity}</span>
                </div>
              </div>

              <div className="min-w-[220px] rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] px-4 py-3">
                <div style={monoStyle} className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.06em] text-[var(--sb-ink-3)]">
                  <span>Delegate this month</span>
                  <span className="text-[var(--sb-ink)]">
                    <b>{tasksThisMonth}</b>
                    {monthlyTaskLimit ? ` / ${monthlyTaskLimit}` : " / unlimited"}
                  </span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-[var(--sb-bg-2)]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,var(--sb-accent),var(--sb-accent-deep))]"
                    style={{
                      width: monthlyTaskLimit
                        ? `${Math.min(100, Math.round((tasksThisMonth / Math.max(monthlyTaskLimit, 1)) * 100))}%`
                        : "100%",
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mb-8 flex flex-wrap items-center gap-1 border-b border-[var(--sb-line-2)]">
              {[
                { key: "overview", label: "Overview", icon: LayoutGrid, count: null },
                { key: "notes", label: "Notes", icon: FileText, count: notes.length },
                { key: "tasks", label: "Agent Tasks", icon: Bot, count: commands.length },
                { key: "xAutomation", label: "X Automation", icon: Zap, count: xTotalReplies },
                { key: "settings", label: "Settings", icon: Settings, count: null },
              ].map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key as DashboardTab);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                      selected ? "text-[var(--sb-ink)]" : "text-[var(--sb-ink-3)] hover:text-[var(--sb-ink-2)]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.count !== null ? (
                      <span
                        style={monoStyle}
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10.5px]",
                          selected ? "bg-[var(--sb-accent-soft)] text-[var(--sb-accent-deep)]" : "bg-[var(--sb-bg-2)] text-[var(--sb-ink-3)]",
                        )}
                      >
                        {tab.count}
                      </span>
                    ) : null}
                    {selected ? <span className="absolute inset-x-2 bottom-[-1px] h-0.5 rounded-full bg-[var(--sb-ink)]" /> : null}
                  </button>
                );
              })}
            </div>

            {activeTab === "overview" && (
              <div>
                <div className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
                  <div className="relative overflow-hidden rounded-[18px] border border-[var(--sb-ink)] bg-[linear-gradient(180deg,var(--sb-ink)_0%,#2A211A_100%)] p-5 text-[var(--sb-on-ink)]">
                    <div className="mb-3 flex items-center justify-between">
                      <span style={monoStyle} className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--sb-accent-2)]">
                        Tasks done
                      </span>
                      <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-white/10 text-[var(--sb-accent-2)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div style={serifStyle} className="mb-1 flex items-end gap-1 text-5xl leading-none tracking-[-0.03em]">
                      <span className="italic text-[var(--sb-accent-2)]">{doneTasks}</span>
                      <span className="pb-1 text-lg font-sans text-white/50">/ {commands.length}</span>
                    </div>
                    <div className="text-[13.5px] text-white/65">{successRate}% success rate</div>
                    <svg className="mt-4 h-7 w-full" viewBox="0 0 200 28" preserveAspectRatio="none">
                      <path
                        d={linePath(taskSparkPoints)}
                        fill="none"
                        stroke="oklch(0.82 0.14 65)"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span style={monoStyle} className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                        Total notes
                      </span>
                      <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[var(--sb-bg-2)] text-[var(--sb-ink-2)]">
                        <NotebookText className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div style={serifStyle} className="mb-1 text-5xl leading-none tracking-[-0.03em] italic text-[var(--sb-accent-deep)]">
                      {notes.length}
                    </div>
                    <div className="text-[13.5px] text-[var(--sb-ink-2)]">Saved from lectures, meetings, and live page chat</div>
                    <svg className="mt-4 h-7 w-full" viewBox="0 0 200 28" preserveAspectRatio="none">
                      <path
                        d={linePath(notesSparkPoints)}
                        fill="none"
                        stroke="var(--sb-ink-3)"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span style={monoStyle} className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                        Tasks run
                      </span>
                      <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[var(--sb-bg-2)] text-[var(--sb-ink-2)]">
                        <Bot className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div style={serifStyle} className="mb-1 text-5xl leading-none tracking-[-0.03em] italic text-[var(--sb-accent-deep)]">
                      {commands.length}
                    </div>
                    <div className="text-[13.5px] text-emerald-700">+{tasksThisMonth} this month</div>
                    <svg className="mt-4 h-7 w-full" viewBox="0 0 200 28" preserveAspectRatio="none">
                      <path
                        d={linePath(taskSparkPoints)}
                        fill="none"
                        stroke="var(--sb-ink-2)"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>

                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span style={monoStyle} className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                        This month
                      </span>
                      <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[var(--sb-bg-2)] text-[var(--sb-ink-2)]">
                        <Clock3 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div style={serifStyle} className="mb-1 text-5xl leading-none tracking-[-0.03em] italic text-[var(--sb-accent-deep)]">
                      {tasksThisMonth}
                    </div>
                    <div className="text-[13.5px] text-[var(--sb-ink-2)]">{monthlyTaskLimit ? `${Math.max(monthlyTaskLimit - tasksThisMonth, 0)} tasks left on free` : "Unlimited premium headroom"}</div>
                    <svg className="mt-4 h-7 w-full" viewBox="0 0 200 28" preserveAspectRatio="none">
                      <path
                        d={linePath(taskSparkPoints)}
                        fill="none"
                        stroke="var(--sb-ink-2)"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>

                <div className="mb-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                  <div className="overflow-hidden rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)]">
                    <div className="flex items-end justify-between gap-4 px-6 pb-4 pt-5">
                      <div>
                        <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                          Recent notes
                        </h3>
                        <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                          From your last week - lectures, meetings, chats
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("notes")}
                        style={monoStyle}
                        className="text-[11px] tracking-[0.06em] text-[var(--sb-ink-3)] transition-colors hover:text-[var(--sb-ink)]"
                      >
                        View all -
                      </button>
                    </div>
                    {dataLoading ? (
                      <div className="space-y-3 px-6 pb-6">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={index} className="h-16 rounded-xl bg-[var(--sb-bg-2)]" />
                        ))}
                      </div>
                    ) : notes.length === 0 ? (
                      <div className="px-6 pb-6 text-sm text-[var(--sb-ink-3)]">No notes yet. Record something from the extension and it will land here.</div>
                    ) : (
                      <div>
                        {notes.slice(0, 4).map((note) => (
                          <button
                            key={note.id}
                            type="button"
                            onClick={() => setSelectedNote(note)}
                            className="grid w-full grid-cols-[36px_minmax(0,1fr)_auto_auto] items-center gap-4 border-t border-[var(--sb-line-2)] px-6 py-4 text-left transition-colors hover:bg-[var(--sb-panel)]"
                          >
                            <NoteMark note={note} />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-[var(--sb-ink)]">{note.title || "Untitled note"}</div>
                              <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                                {domainFromUrl(note.source_url) || note.source_title || "SideBrain"} <span className="mx-1 text-[var(--sb-ink-4)]">·</span> {timeAgo(note.created_at)}
                              </div>
                            </div>
                            <Badge variant="outline" className={cn("border text-[10px]", noteVisual(note).tagClasses)} style={monoStyle}>
                              {caseLabel(note.use_case)}
                            </Badge>
                            <span style={monoStyle} className="text-[11px] text-[var(--sb-ink-3)]">
                              {shortDate(note.created_at)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="overflow-hidden rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)]">
                      <div className="px-6 pb-4 pt-5">
                        <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                          In <em className="text-[var(--sb-accent-deep)]">progress.</em>
                        </h3>
                        <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                          Live agent work
                        </div>
                      </div>
                      <div className="space-y-4 px-6 pb-6">
                        {runningTasks.length > 0 ? (
                          runningTasks.slice(0, 2).map((command) => {
                            const site = guessTaskSite(command.task);
                            const { steps } = commandMeta(command);
                            const currentStep = Math.max(1, Math.min(steps.length, 1 + steps.filter((step) => step.ok).length));
                            return (
                              <div key={command.id} className="rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                                <div className="mb-3 flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--sb-accent)] shadow-[0_0_8px_var(--sb-accent)] animate-pulse" />
                                  <span style={monoStyle} className="text-[10px] uppercase tracking-[0.14em] text-[var(--sb-accent-deep)]">
                                    Delegate - acting
                                  </span>
                                  <span style={monoStyle} className="ml-auto text-[11px] text-[var(--sb-ink-3)]">
                                    {timeAgo(command.created_at)}
                                  </span>
                                </div>
                                <div style={serifStyle} className="text-[18px] leading-[1.3] tracking-[-0.01em] text-[var(--sb-ink)]">
                                  {command.task}
                                </div>
                                <div className="mt-4 flex gap-1">
                                  {Array.from({ length: Math.max(steps.length, 5) }).map((_, index) => (
                                    <span
                                      key={index}
                                      className={cn(
                                        "h-[3px] flex-1 rounded-full",
                                        index + 1 < currentStep
                                          ? "bg-[var(--sb-accent)]"
                                          : index + 1 === currentStep
                                            ? "bg-[linear-gradient(90deg,var(--sb-accent),var(--sb-bg-2))]"
                                            : "bg-[var(--sb-bg-2)]",
                                      )}
                                    />
                                  ))}
                                </div>
                                <div style={monoStyle} className="mt-3 flex items-center gap-2 text-[11px] text-[var(--sb-ink-3)]">
                                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: site.color }} />
                                  <span>{site.label}</span>
                                  <span className="text-[var(--sb-ink-4)]">·</span>
                                  <span>step {currentStep} / {Math.max(steps.length, 5)}</span>
                                  <Link to="/remote-agent" className="ml-auto">
                                    <button className="rounded-md border border-[var(--sb-line)] px-2.5 py-1 text-[10.5px] text-[var(--sb-ink-3)] transition hover:border-[var(--sb-ink-4)] hover:text-[var(--sb-ink)]">
                                      Open
                                    </button>
                                  </Link>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                              <span style={monoStyle} className="text-[10px] uppercase tracking-[0.14em] text-emerald-700">
                                Calm
                              </span>
                            </div>
                            <div style={serifStyle} className="text-[18px] leading-[1.3] tracking-[-0.01em] text-[var(--sb-ink)]">
                              No live agent work right now.
                            </div>
                            <div style={monoStyle} className="mt-3 text-[11px] text-[var(--sb-ink-3)]">
                              Start a remote task or open the extension to give SideBrain something to do.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                      <div className="mb-4">
                        <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                          You're on a <em className="text-[var(--sb-accent-deep)]">{currentStreak || 0}-day</em> streak.
                        </h3>
                        <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                          Keep using SideBrain to extend it
                        </div>
                      </div>
                      <div style={serifStyle} className="flex items-end gap-2 text-[64px] leading-none tracking-[-0.03em] text-[var(--sb-ink)]">
                        <span className="italic text-[var(--sb-accent-deep)]">{currentStreak || 0}</span>
                        <span className="pb-2 font-sans text-base not-italic text-[var(--sb-ink-3)]">days</span>
                      </div>
                      <div className="mt-2 text-[13px] text-[var(--sb-ink-2)]">
                        Out of the last two weeks. Best streak: {bestStreak} day{bestStreak === 1 ? "" : "s"}.
                      </div>
                      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:grid-cols-14">
                        {activitySeries.map((point) => {
                          const level =
                            point.totalCount >= 4 ? 4 : point.totalCount >= 3 ? 3 : point.totalCount >= 2 ? 2 : point.totalCount >= 1 ? 1 : 0;
                          const levelClass =
                            level === 4
                              ? "bg-[var(--sb-accent)]"
                              : level === 3
                                ? "bg-[oklch(0.78_0.14_60)]"
                                : level === 2
                                  ? "bg-[oklch(0.88_0.10_65)]"
                                  : level === 1
                                    ? "bg-[oklch(0.94_0.05_70)]"
                                    : "bg-[var(--sb-bg-2)]";
                          return <div key={point.key} title={`${point.label}: ${point.totalCount} items`} className={cn("aspect-square rounded-[3px]", levelClass)} />;
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
                  <div className="overflow-hidden rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)]">
                    <div className="flex items-end justify-between gap-4 px-6 pb-4 pt-5">
                      <div>
                        <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                          Recent agent tasks
                        </h3>
                        <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                          {commands.length} lifetime - {tasksThisMonth} this month
                        </div>
                      </div>
                      <Link to="/remote-agent" style={monoStyle} className="text-[11px] tracking-[0.06em] text-[var(--sb-ink-3)] transition-colors hover:text-[var(--sb-ink)]">
                        New task -
                      </Link>
                    </div>
                    <div className="space-y-3 px-6 pb-6">
                      {commands.length === 0 ? (
                        <div className="rounded-[16px] border border-dashed border-[var(--sb-line)] px-5 py-6 text-sm text-[var(--sb-ink-3)]">
                          No tasks yet. Try Delegate from your phone and the history will start stacking up here.
                        </div>
                      ) : (
                        commands.slice(0, 5).map((command) => <TaskRow key={command.id} command={command} />)
                      )}
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] px-6 pb-6 pt-5">
                    <div className="mb-4">
                      <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                        Activity
                      </h3>
                      <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                        Last 14 days
                      </div>
                    </div>
                    <div className="relative h-[180px]">
                      <svg className="h-full w-full" viewBox="0 0 400 180" preserveAspectRatio="none">
                        <line x1="0" y1="45" x2="400" y2="45" stroke="var(--sb-line-2)" strokeWidth="1" strokeDasharray="2 4" />
                        <line x1="0" y1="90" x2="400" y2="90" stroke="var(--sb-line-2)" strokeWidth="1" strokeDasharray="2 4" />
                        <line x1="0" y1="135" x2="400" y2="135" stroke="var(--sb-line-2)" strokeWidth="1" strokeDasharray="2 4" />
                        <defs>
                          <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="oklch(0.72 0.17 55)" stopOpacity="0.35" />
                            <stop offset="1" stopColor="oklch(0.72 0.17 55)" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath(chartTaskPoints, 180, 12)} fill="url(#taskGrad)" />
                        <path d={linePath(chartTaskPoints)} fill="none" stroke="oklch(0.72 0.17 55)" strokeWidth="2" />
                        <path d={linePath(chartNotePoints)} fill="none" stroke="var(--sb-ink-3)" strokeWidth="1.5" strokeDasharray="3 3" />
                        {chartTaskPoints.length > 0 ? (
                          <circle
                            cx={chartTaskPoints[chartTaskPoints.length - 1].x}
                            cy={chartTaskPoints[chartTaskPoints.length - 1].y}
                            r="4"
                            fill="oklch(0.72 0.17 55)"
                            stroke="var(--sb-panel-2)"
                            strokeWidth="2"
                          />
                        ) : null}
                      </svg>
                    </div>
                    <div style={monoStyle} className="mt-2 flex items-center justify-between text-[10px] text-[var(--sb-ink-3)]">
                      {activitySeries.filter((_, index) => index % 3 === 0 || index === activitySeries.length - 1).map((point) => (
                        <span key={point.key}>{point.label}</span>
                      ))}
                    </div>
                    <div style={monoStyle} className="mt-3 flex gap-4 text-[11px] text-[var(--sb-ink-2)]">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-[oklch(0.72_0.17_55)]" />
                        Tasks
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--sb-ink-3)]" />
                        Notes
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-[oklch(0.9_0.06_70)] bg-[linear-gradient(135deg,var(--sb-accent-soft)_0%,var(--sb-panel)_100%)] px-5 py-4 text-[13px] text-[var(--sb-ink-2)]">
                  <span
                    className="h-[22px] w-[22px] rounded-full"
                    style={{
                      background: "radial-gradient(circle at 35% 35%, #FFD9A8, #F39A42, #D96E1A)",
                      boxShadow: "0 0 10px rgba(243,154,66,0.5)",
                    }}
                  />
                  <span>
                    <b className="font-medium text-[var(--sb-ink)]">Tip:</b> Right-click any selection on a page and ask SideBrain about it without opening the full panel.
                  </span>
                  <Link to="/#install" style={monoStyle} className="ml-auto text-[11px] tracking-[0.04em] text-[var(--sb-ink-3)] transition-colors hover:text-[var(--sb-ink)]">
                    Install extension →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "notes" && (
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="flex min-w-[240px] max-w-[420px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] px-3 py-2">
                    <Search className="h-3.5 w-3.5 text-[var(--sb-ink-3)]" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search notes..."
                      className="w-full border-0 bg-transparent text-[13.5px] text-[var(--sb-ink)] outline-none placeholder:text-[var(--sb-ink-3)]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {["all", "lecture", "meeting", "page", "general", "agent"].map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setNoteFilter(filter)}
                        className={cn(
                          "rounded-full border px-3.5 py-2 text-[12.5px] transition-colors",
                          noteFilter === filter
                            ? "border-[var(--sb-ink)] bg-[var(--sb-ink)] text-[var(--sb-on-ink)]"
                            : "border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] text-[var(--sb-ink-2)] hover:bg-[var(--sb-panel)]",
                        )}
                      >
                        {filter === "all" ? "All" : caseLabel(filter)}
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto flex rounded-[10px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-1">
                    <button
                      type="button"
                      onClick={() => setNoteView("list")}
                      className={cn(
                        "grid h-7 w-8 place-items-center rounded-[7px] text-[var(--sb-ink-3)]",
                        noteView === "list" && "bg-[var(--sb-panel)] text-[var(--sb-ink)] shadow-[var(--sb-shadow-sm)]",
                      )}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteView("grid")}
                      className={cn(
                        "grid h-7 w-8 place-items-center rounded-[7px] text-[var(--sb-ink-3)]",
                        noteView === "grid" && "bg-[var(--sb-panel)] text-[var(--sb-ink)] shadow-[var(--sb-shadow-sm)]",
                      )}
                    >
                      <Grid2x2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {dataLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-20 rounded-[18px] bg-[var(--sb-bg-2)]" />
                    ))}
                  </div>
                ) : notesByFilter.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-6 py-16 text-center text-sm text-[var(--sb-ink-3)]">
                    {searchQuery ? "No notes match that search yet." : "No notes yet."}
                  </div>
                ) : noteView === "list" ? (
                  <div className="overflow-hidden rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)]">
                    {notesByFilter.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => setSelectedNote(note)}
                        className="grid w-full grid-cols-[36px_minmax(0,1fr)_auto_auto] items-center gap-4 border-t border-[var(--sb-line-2)] px-6 py-4 text-left first:border-t-0 transition-colors hover:bg-[var(--sb-panel)]"
                      >
                        <NoteMark note={note} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-[var(--sb-ink)]">{note.title || "Untitled note"}</div>
                          <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                            {domainFromUrl(note.source_url) || note.source_title || "SideBrain"}
                            <span className="mx-1 text-[var(--sb-ink-4)]">·</span>
                            {note.source_title || "Saved with SideBrain"}
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("border text-[10px]", noteVisual(note).tagClasses)} style={monoStyle}>
                          {caseLabel(note.use_case)}
                        </Badge>
                        <span style={monoStyle} className="text-[11px] text-[var(--sb-ink-3)]">
                          {timeAgo(note.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {notesByFilter.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => setSelectedNote(note)}
                        className="flex min-h-[220px] flex-col gap-3 rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5 text-left transition-transform hover:-translate-y-0.5 hover:border-[var(--sb-line)]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <NoteMark note={note} size="sm" />
                          <Badge variant="outline" className={cn("border text-[10px]", noteVisual(note).tagClasses)} style={monoStyle}>
                            {caseLabel(note.use_case)}
                          </Badge>
                        </div>
                        <div style={serifStyle} className="text-[22px] leading-[1.15] tracking-[-0.01em] text-[var(--sb-ink)]">
                          {note.title || "Untitled note"}
                        </div>
                        <p className="flex-1 text-[13px] leading-6 text-[var(--sb-ink-2)]">
                          {(note.structured_notes || "No preview available.").replace(/\s+/g, " ").slice(0, 180)}
                          {(note.structured_notes || "").length > 180 ? "..." : ""}
                        </p>
                        <div style={monoStyle} className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.04em] text-[var(--sb-ink-3)]">
                          <span>{domainFromUrl(note.source_url) || "sidebrain"}</span>
                          <span className="text-[var(--sb-ink-4)]">·</span>
                          <span>{shortDate(note.created_at)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <div className="flex min-w-[240px] max-w-[420px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] px-3 py-2">
                    <Search className="h-3.5 w-3.5 text-[var(--sb-ink-3)]" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search tasks..."
                      className="w-full border-0 bg-transparent text-[13.5px] text-[var(--sb-ink)] outline-none placeholder:text-[var(--sb-ink-3)]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {taskStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setTaskFilter(status)}
                        className={cn(
                          "rounded-full border px-3.5 py-2 text-[12.5px] transition-colors",
                          taskFilter === status
                            ? "border-[var(--sb-ink)] bg-[var(--sb-ink)] text-[var(--sb-on-ink)]"
                            : "border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] text-[var(--sb-ink-2)] hover:bg-[var(--sb-panel)]",
                        )}
                      >
                        {taskStatusLabel(status)}
                        {status === "all" ? <span style={monoStyle} className="ml-1 text-[10px] opacity-70">{commands.length}</span> : null}
                      </button>
                    ))}
                  </div>

                  <Link to="/remote-agent" className="ml-auto">
                    <Button variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-panel)]">
                      <Bot className="mr-1.5 h-3.5 w-3.5" />
                      New task
                    </Button>
                  </Link>
                </div>

                {dataLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-20 rounded-[18px] bg-[var(--sb-bg-2)]" />
                    ))}
                  </div>
                ) : commandsByFilter.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-6 py-16 text-center text-sm text-[var(--sb-ink-3)]">
                    No tasks match those filters.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commandsByFilter.map((command) => (
                      <TaskRow key={command.id} command={command} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "xAutomation" && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Total replies",
                      value: xTotalReplies.toLocaleString("en-US"),
                      hint: "Lifetime across synced X Auto runs",
                      icon: <Zap className="h-3.5 w-3.5" />,
                    },
                    {
                      label: "Automation runs",
                      value: xTotalRuns.toLocaleString("en-US"),
                      hint: "Each finished or stopped session",
                      icon: <Bot className="h-3.5 w-3.5" />,
                    },
                    {
                      label: "Total runtime",
                      value: xTotalRuntime,
                      hint: "Time spent scanning and replying",
                      icon: <Clock3 className="h-3.5 w-3.5" />,
                    },
                    {
                      label: "Last run",
                      value: `${xAutomationStats?.last_run_reply_count || 0} replies`,
                      hint: `Duration ${xLastRunDuration}`,
                      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                    },
                  ].map((card) => (
                    <div key={card.label} className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <span style={monoStyle} className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                          {card.label}
                        </span>
                        <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[var(--sb-bg-2)] text-[var(--sb-ink-2)]">
                          {card.icon}
                        </span>
                      </div>
                      <div style={serifStyle} className="mb-1 text-4xl leading-none tracking-[-0.03em] italic text-[var(--sb-accent-deep)]">
                        {card.value}
                      </div>
                      <div className="text-[13px] text-[var(--sb-ink-2)]">{card.hint}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                    <div className="mb-4">
                      <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                        X Auto <em className="text-[var(--sb-accent-deep)]">summary.</em>
                      </h3>
                      <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                        Synced from the extension
                      </div>
                    </div>

                    {xAutomationStats ? (
                      <div className="space-y-4">
                        <div className="rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                          <div className="mb-2 text-sm font-medium text-[var(--sb-ink)]">Last automation run</div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--sb-ink-3)]">
                                Replies posted
                              </div>
                              <div className="mt-1 text-[14px] text-[var(--sb-ink)]">{xAutomationStats.last_run_reply_count}</div>
                            </div>
                            <div>
                              <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--sb-ink-3)]">
                                Runtime
                              </div>
                              <div className="mt-1 text-[14px] text-[var(--sb-ink)]">{xLastRunDuration}</div>
                            </div>
                            <div>
                              <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--sb-ink-3)]">
                                Started
                              </div>
                              <div className="mt-1 text-[14px] text-[var(--sb-ink)]">{formatDateTime(xAutomationStats.last_run_started_at)}</div>
                            </div>
                            <div>
                              <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--sb-ink-3)]">
                                Finished
                              </div>
                              <div className="mt-1 text-[14px] text-[var(--sb-ink)]">{formatDateTime(xAutomationStats.last_run_finished_at)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                          <div className="mb-2 text-sm font-medium text-[var(--sb-ink)]">What the current automation does</div>
                          <div className="space-y-2 text-[13px] text-[var(--sb-ink-2)]">
                            <p>Skips promoted posts and ad-labeled tweets.</p>
                            <p>Skips Narendra Modi and broader political posts.</p>
                            <p>Waits 3 seconds before posting each generated reply.</p>
                            <p>Special-cases builder prompts so Braino can mention what it is building more naturally.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-6 py-14 text-center text-sm text-[var(--sb-ink-3)]">
                        No X automation history yet. Run X Auto once from the extension and the stats will appear here.
                      </div>
                    )}
                  </div>

                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                    <div className="mb-4">
                      <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                        Guardrails
                      </h3>
                      <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                        Current pacing and filter rules
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        "One reply per surfaced post key to avoid timeline loops.",
                        "Ads and promoted posts are ignored before a reply is generated.",
                        "Political handles and political-language tweets are skipped.",
                        "Draft / option labels are stripped before anything is posted.",
                      ].map((item) => (
                        <div key={item} className="flex items-start gap-3 rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                          <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[var(--sb-accent)]" />
                          <div className="text-[13px] leading-6 text-[var(--sb-ink-2)]">{item}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                  <h3 style={serifStyle} className="mb-1 text-[26px] leading-none tracking-[-0.02em]">
                    Profile
                  </h3>
                  <p className="mb-5 text-[13.5px] text-[var(--sb-ink-2)]">
                    How your SideBrain workspace identifies you across the dashboard and extension.
                  </p>

                  <div className="mb-4 flex items-center gap-4 rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-[linear-gradient(135deg,#6B4E32,#8C5A3D)] text-base font-semibold text-white">
                      {getInitials(profile?.display_name || user.email || "SB")}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[var(--sb-ink)]">{profile?.display_name || "No display name yet"}</div>
                      <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && handleSaveName()}
                      placeholder="Display name"
                      className="h-11 rounded-xl border-[var(--sb-line)] bg-[var(--sb-panel)] text-sm"
                    />
                    <Button
                      onClick={handleSaveName}
                      disabled={savingName}
                      variant="outline"
                      className="h-11 rounded-xl border-[var(--sb-line)] bg-[var(--sb-panel)] text-sm text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                    >
                      {nameSaved ? <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> : null}
                      {nameSaved ? "Saved" : savingName ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                  <h3 style={serifStyle} className="mb-1 text-[26px] leading-none tracking-[-0.02em]">
                    Voice & language
                  </h3>
                  <p className="mb-5 text-[13.5px] text-[var(--sb-ink-2)]">
                    The extension owns playback and speech settings today. These controls will sync here soon.
                  </p>

                  <div className="space-y-3">
                    {[
                      ["Voice", "Warm narrator default"],
                      ["Language", "English (US)"],
                      ["Speech rate", "1.0x - natural"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                        <div>
                          <div className="text-sm font-medium text-[var(--sb-ink)]">{label}</div>
                          <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                            {value}
                          </div>
                        </div>
                        <button className="rounded-full border border-[var(--sb-line)] px-3 py-1.5 text-xs text-[var(--sb-ink-3)] transition hover:border-[var(--sb-ink-4)] hover:text-[var(--sb-ink)]">
                          Soon
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                  <h3 style={serifStyle} className="mb-1 text-[26px] leading-none tracking-[-0.02em]">
                    Notion
                  </h3>
                  <p className="mb-5 text-[13.5px] text-[var(--sb-ink-2)]">
                    Send structured notes to your workspace with one click from the extension.
                  </p>

                  <div className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--sb-ink)]">
                        <span className={cn("h-2 w-2 rounded-full", notionConn ? "bg-emerald-500" : "bg-[var(--sb-ink-4)]")} />
                        {notionConn ? notionConn.workspace_name || "Connected workspace" : "Not connected"}
                      </div>
                      <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                        {notionConn ? notionConn.workspace_id || "Workspace active" : "Connect from the Notion sync flow"}
                      </div>
                    </div>
                    <Link to="/notion-sync">
                      <Button variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]">
                        {notionConn ? "Manage" : "Connect"}
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                  <h3 style={serifStyle} className="mb-1 text-[26px] leading-none tracking-[-0.02em]">
                    Delegate surfaces
                  </h3>
                  <p className="mb-5 text-[13.5px] text-[var(--sb-ink-2)]">
                    Fine-grained per-site permissions are coming soon. For now, here are the domains your task history touches most.
                  </p>

                  <div className="space-y-3">
                    {uniqueSites.length > 0 ? (
                      uniqueSites.map((site) => (
                        <div key={site.label} className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                          <div className="flex items-center gap-3">
                            <span className="h-4 w-4 rounded-[4px]" style={{ background: site.color }} />
                            <div className="text-sm text-[var(--sb-ink)]">{site.label}</div>
                          </div>
                          <span style={monoStyle} className="rounded-full bg-[var(--sb-bg-2)] px-2.5 py-1 text-[10px] text-[var(--sb-ink-3)]">
                            {site.count} task{site.count === 1 ? "" : "s"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] p-4 text-sm text-[var(--sb-ink-3)]">
                        No browser task history yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                  <h3 style={serifStyle} className="mb-1 text-[26px] leading-none tracking-[-0.02em]">
                    Plan
                  </h3>
                  <p className="mb-5 text-[13.5px] text-[var(--sb-ink-2)]">
                    {isPremium ? "Premium is active on this account." : "Free plan - limited Delegate runs, full note history stays available."}
                  </p>

                  <div className="rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                    <div style={monoStyle} className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                      {isPremium ? "PREMIUM" : "FREE"}
                    </div>
                    <div style={serifStyle} className="mb-2 text-[40px] leading-none tracking-[-0.03em] text-[var(--sb-ink)]">
                      {isPremium ? "Unlimited" : `${tasksThisMonth}/${monthlyTaskLimit}`}
                    </div>
                    <div className="mb-4 text-sm text-[var(--sb-ink-2)]">
                      {isPremium ? "Delegate, remote agent, and premium history are unlocked." : "Delegate usage resets each month."}
                    </div>
                    {!isPremium ? (
                      <Link to="/premium">
                        <Button className="rounded-full bg-[var(--sb-ink)] text-xs text-[var(--sb-on-ink)] hover:opacity-90">
                          <Zap className="mr-1.5 h-3.5 w-3.5" />
                          Upgrade
                        </Button>
                      </Link>
                    ) : (
                      <Link to="/premium">
                        <Button variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]">
                          Manage plan
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6 xl:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 style={serifStyle} className="mb-1 text-[26px] leading-none tracking-[-0.02em]">
                        Sign out
                      </h3>
                      <p className="text-[13.5px] text-[var(--sb-ink-2)]">
                        Remove this account from the dashboard and extension on this device.
                      </p>
                    </div>
                    <Button
                      onClick={() => signOut()}
                      variant="outline"
                      className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-sm text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                    >
                      <LogOut className="mr-1.5 h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "memory" && (
              <div>
                <div className="mb-6">
                  <h2 style={serifStyle} className="text-[28px] leading-none tracking-[-0.02em] text-[var(--sb-ink)]">
                    Memory
                  </h2>
                  <p className="mt-1.5 text-[13.5px] text-[var(--sb-ink-2)]">
                    Things SideBrain has learned about you — preferences, context, and facts you've asked it to remember.
                  </p>
                </div>

                {dataLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-[14px] bg-[var(--sb-bg-2)]" />
                    ))}
                  </div>
                ) : memoryNotes.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-8 py-16 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--sb-accent-soft)]">
                      <Sparkles className="h-5 w-5 text-[var(--sb-accent-deep)]" />
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium text-[var(--sb-ink)]">No memories yet</div>
                      <div className="max-w-[340px] text-[13px] text-[var(--sb-ink-3)]">
                        Tell SideBrain something to remember — like "I'm a CS student" or "always summarize in bullet points" — and it will appear here.
                      </div>
                    </div>
                    <div style={monoStyle} className="rounded-full border border-[var(--sb-line-2)] bg-[var(--sb-panel)] px-4 py-2 text-[11px] text-[var(--sb-ink-3)]">
                      Try: "Remember that I prefer concise answers"
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {memoryNotes.map((mem) => (
                      <div
                        key={mem.id}
                        className="group flex items-start gap-4 rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] px-5 py-4"
                      >
                        <div className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-[var(--sb-accent-soft)]">
                          <Sparkles className="h-3.5 w-3.5 text-[var(--sb-accent-deep)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {mem.title && (
                            <div className="mb-0.5 text-[12.5px] font-semibold text-[var(--sb-ink)]">{mem.title}</div>
                          )}
                          <div className="text-[13.5px] leading-relaxed text-[var(--sb-ink-2)]">
                            {mem.structured_notes || mem.title || "—"}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span style={monoStyle} className="text-[11px] text-[var(--sb-ink-4)]">
                            {shortDate(mem.created_at)}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              await supabase.from("notes").delete().eq("id", mem.id);
                              setNotes((prev) => prev.filter((n) => n.id !== mem.id));
                            }}
                            className="hidden rounded-md p-1 text-[var(--sb-ink-4)] transition hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink-2)] group-hover:block"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-4">
                  <div style={monoStyle} className="mb-3 text-[10px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                    Add a memory manually
                  </div>
                  <MemoryAddForm
                    userId={user!.id}
                    onAdded={(newNote) => setNotes((prev) => [newNote, ...prev])}
                  />
                </div>
              </div>
            )}

            {activeTab === "highlights" && (
              <div>
                <div className="mb-6">
                  <h2 style={serifStyle} className="text-[28px] leading-none tracking-[-0.02em] text-[var(--sb-ink)]">
                    Highlights
                  </h2>
                  <p className="mt-1.5 text-[13.5px] text-[var(--sb-ink-2)]">
                    Text you've saved from pages across the web. Select any passage and ask SideBrain to highlight it.
                  </p>
                </div>

                {dataLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-[14px] bg-[var(--sb-bg-2)]" />
                    ))}
                  </div>
                ) : highlights.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-8 py-16 text-center">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--sb-accent-soft)]">
                      <Highlighter className="h-5 w-5 text-[var(--sb-accent-deep)]" />
                    </div>
                    <div>
                      <div className="mb-1 text-sm font-medium text-[var(--sb-ink)]">No highlights yet</div>
                      <div className="max-w-[340px] text-[13px] text-[var(--sb-ink-3)]">
                        Select text on any page, then tell SideBrain to save it. Your highlights will appear here, grouped by source.
                      </div>
                    </div>
                    <div style={monoStyle} className="rounded-full border border-[var(--sb-line-2)] bg-[var(--sb-panel)] px-4 py-2 text-[11px] text-[var(--sb-ink-3)]">
                      Try: select a paragraph → "highlight this"
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {highlights.map((hl) => (
                      <div
                        key={hl.id}
                        className="group rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {hl.source_title && (
                              <div className="truncate text-[13px] font-medium text-[var(--sb-ink)]">{hl.source_title}</div>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              {hl.source_url && (
                                <a
                                  href={hl.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-[11.5px] text-[var(--sb-ink-3)] hover:text-[var(--sb-accent-deep)]"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {domainFromUrl(hl.source_url)}
                                </a>
                              )}
                              <span style={monoStyle} className="text-[11px] text-[var(--sb-ink-4)]">
                                {shortDate(hl.created_at)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await supabase.from("notes").delete().eq("id", hl.id);
                              setNotes((prev) => prev.filter((n) => n.id !== hl.id));
                            }}
                            className="hidden flex-shrink-0 rounded-md p-1 text-[var(--sb-ink-4)] transition hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink-2)] group-hover:block"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>

                        <blockquote className="border-l-2 border-[var(--sb-accent)] pl-4">
                          <p className="text-[14px] leading-relaxed text-[var(--sb-ink)] italic">
                            {hl.structured_notes || hl.title || "—"}
                          </p>
                        </blockquote>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {selectedNote ? <NoteModal note={selectedNote} onClose={() => setSelectedNote(null)} /> : null}
    </div>
  );
}
