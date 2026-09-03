import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import "./braino-dash.css";
import SpotifyPanel, { type SpotifyConnectionSummary } from "@/components/SpotifyPanel";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { Webb, WebbDefs } from "@/components/WebbChar";
import { FERRO_WALKER_SVG } from "@/components/ferroWalkerSvg";
import { MASCOTS, useMascotPreference, type MascotId } from "@/lib/mascotPreference";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
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
  Shield,
  Sparkles,
  Trash2,
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

type GoogleDriveConn = {
  google_email: string | null;
  updated_at: string | null;
} | null;

type GoogleCalendarConn = {
  google_email: string | null;
  updated_at: string | null;
  watch_expires_at: string | null;
  last_sync_at: string | null;
} | null;

type BrainoContact = {
  id: string;
  user_id: string;
  name: string;
  name_key: string;
  nickname: string | null;
  nickname_key: string | null;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

type BrainoMemory = {
  id: string;
  content: string;
  category: string;
  salience: number;
  created_at: string;
};

type VoiceCommandUrl = {
  id: string;
  command_id: string;
  url: string;
  position: number;
};

type VoiceCommand = {
  id: string;
  mode_id: string;
  phrase: string;
  open_mode: "tab" | "incognito";
  position: number;
  urls: VoiceCommandUrl[];
};

type VoiceMode = {
  id: string;
  name: string;
  notch_color: string;
  is_active: boolean;
  is_hidden: boolean;
  position: number;
  commands: VoiceCommand[];
};

type BrainoContactDraft = {
  id: string | null;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  photo_url: string;
};

type XConnection = {
  username: string | null;
  displayName: string | null;
  xUserId: string | null;
  updatedAt: string | null;
} | null;

type SpotifyConn = SpotifyConnectionSummary;

type ScheduledXPost = {
  id: string;
  content: string;
  scheduled_at: string;
  status: "pending" | "processing" | "posted" | "failed" | "cancelled";
  x_post_id: string | null;
  error_message: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
  media_url: string | null;
  thread_mode: boolean;
};

type XAutomationStats = {
  total_replies: number;
  total_runs: number;
  total_runtime_ms: number;
  last_run_reply_count: number;
  last_run_duration_ms: number;
  last_run_started_at: string | null;
  last_run_finished_at: string | null;
} | null;

type XPersona = {
  display_name: string;
  bio: string;
  what_building: string;
  tone_notes: string;
  content_source?: string;
  auto_posting_enabled?: boolean;
  auto_reply_enabled?: boolean;
  posts_per_day?: number;
} | null;

type XReplyLog = {
  id: string;
  session_id: string | null;
  mention_tweet_id: string | null;
  our_reply_tweet_id: string | null;
  post_author_handle: string;
  post_author_display_name: string;
  post_url: string;
  post_text: string;
  our_reply: string;
  status: "pending" | "posted" | "failed";
  error_message: string | null;
  discovered_at: string;
  replied_at: string | null;
};

type XAutoSession = {
  id: string;
  session_number: number;
  status: "active" | "completed" | "stopped";
  started_at: string;
  ends_at: string;
  stopped_at: string | null;
  cooldown_ends_at: string;
  last_polled_at: string | null;
  last_reply_at: string | null;
  replies_posted: number;
  replies_failed: number;
  replies_queued: number;
  followers_gained: number;
  replies_received: number;
  total_views: number;
};

type AiCostPoint = {
  date: string;
  costUsd: number;
  currency: string;
};

type AiCostLineItem = {
  lineItem: string;
  costUsd: number;
  currency: string;
};

type AiCostModelUsage = {
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  inputAudioTokens: number;
  outputAudioTokens: number;
};

type AiCostSummary = {
  currency: string;
  trackedTotalUsd: number;
  currentMonthUsd: number;
  last30DaysUsd: number;
  trackingStartDate: string;
  requestCountLast30Days: number;
  dailyCosts: AiCostPoint[];
  lineItemBreakdownLast30Days: AiCostLineItem[];
  modelBreakdownLast30Days: AiCostModelUsage[];
  scopedProjectIds: string[];
  lastUpdatedAt: string;
};

type AiCostErrorPayload = {
  message: string;
  setupUrl?: string;
};

type XSessionSortKey =
  | "session_number"
  | "status"
  | "started_at"
  | "replies_posted"
  | "followers_gained"
  | "replies_received"
  | "total_views";

/* The two worlds. Everything he is for you, and everything he is for the
   company. They are different jobs with different vocabularies, so they are
   different trees rather than one long list. */
type DashboardWorld = "companion" | "foundry";

type DashboardTab =
  /* Companion */
  | "overview" | "notes" | "meetings" | "lectures" | "highlights"
  | "tasks" | "voiceCommands"
  | "memory" | "heart" | "eyes" | "ears"
  | "settings"
  /* Foundry */
  | "distraOverview" | "distraJobs"
  | "engineContent" | "engineSeo" | "engineAeo" | "engineOutreach"
  | "brandLinkedin" | "founderProfile"
  /* The old X command centre, now one engine among several. */
  | "xAutomation";

type NavNode = { id?: DashboardTab; label: string; children?: NavNode[]; badge?: "notes" | "tasks" | "memory" };

/* The shape of the product, written down once. The sidebar renders this and
   nothing else, so adding a section is a line here rather than markup in three
   places. */
const NAV: Record<DashboardWorld, NavNode[]> = {
  companion: [
    { label: "The basics", children: [{ id: "overview", label: "Overview" }] },
    {
      label: "Notes",
      children: [
        { id: "notes", label: "All notes", badge: "notes" },
        { id: "meetings", label: "Meetings" },
        { id: "lectures", label: "Lectures & audio" },
        { id: "highlights", label: "Highlights" },
      ],
    },
    {
      label: "Agentic commands",
      children: [
        { id: "tasks", label: "Tasks" },
        { id: "voiceCommands", label: "What you can say" },
      ],
    },
    {
      label: "Braino OS",
      children: [
        { id: "memory", label: "Memory", badge: "memory" },
        { id: "heart", label: "Heart" },
        { id: "eyes", label: "Eyes" },
        { id: "ears", label: "Ears" },
      ],
    },
    { label: "Settings", children: [{ id: "settings", label: "Account" }] },
  ],
  foundry: [
    {
      label: "Distra",
      children: [
        { id: "distraOverview", label: "Overview" },
        { id: "distraJobs", label: "Tasks & jobs" },
      ],
    },
    {
      label: "Engines",
      children: [
        { id: "engineContent", label: "1. Content" },
        { id: "xAutomation", label: "X command centre" },
        { id: "engineSeo", label: "2.1 Optics · SEO" },
        { id: "engineAeo", label: "2.2 Optics · AEO" },
        { id: "engineOutreach", label: "3. Outreach" },
      ],
    },
    {
      label: "Lock in",
      children: [
        { id: "brandLinkedin", label: "Personal branding" },
        { id: "founderProfile", label: "Founder profile" },
      ],
    },
  ],
};

const COMPANION_TABS = new Set<DashboardTab>(
  NAV.companion.flatMap((group) => (group.children || []).map((child) => child.id!)).filter(Boolean),
);

function worldOf(tab: DashboardTab): DashboardWorld {
  return COMPANION_TABS.has(tab) ? "companion" : "foundry";
}
type NoteView = "list" | "grid";

type ActivityPoint = {
  key: string;
  label: string;
  noteCount: number;
  taskCount: number;
  totalCount: number;
};

/* These two are applied inline in a few hundred places. Rather than touch every
   call site, they are redefined: the display style is the same typeface at a
   heading weight with tight tracking, and the label style keeps the small,
   spaced, technical feel without being monospaced. Renaming them would be a
   thousand-line diff for no behaviour change. */
const serifStyle = { fontWeight: 650, letterSpacing: "-0.028em" } as const;
const monoStyle = { fontWeight: 600, letterSpacing: "0.02em", fontVariantNumeric: "tabular-nums" } as const;
const BRAINO_CONTACT_PHOTO_BUCKET = "braino-contact-photos";
const BRAINO_CONTACT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const BRAINO_CONTACT_PHOTO_PUBLIC_PREFIX = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BRAINO_CONTACT_PHOTO_BUCKET}/`;

// A fingerprint credential is welded to the exact rp.id it was created under, and we serve from both
// trybraino.com and www.trybraino.com. Using the raw hostname means a key registered on one is invisible
// on the other, which locks the hidden folder for good. Drop the www so both origins share one rp.id.
const brainoRpId = () => {
  const host = window.location.hostname;
  if (host === "localhost" || /^[\d.]+$/.test(host)) return host;
  return host.replace(/^www\./, "");
};

/* The name in the top bar comes from the same tree the sidebar draws, so the
   two cannot disagree and a new section does not arrive titled
   "DistraOverview". */
function dashboardTabLabel(tab: DashboardTab) {
  for (const groups of Object.values(NAV)) {
    for (const group of groups) {
      for (const child of group.children || []) {
        if (child.id === tab) return child.label;
      }
    }
  }
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

function formatCountdown(ms: number) {
  if (ms <= 0) return "0m";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function sessionStatusLabel(status: XAutoSession["status"]) {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  return "Stopped";
}

function sessionStatusClass(status: XAutoSession["status"]) {
  if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  if (status === "completed") return "border-[var(--sb-line)] bg-[var(--sb-panel)] text-[var(--sb-ink-2)]";
  return "border-amber-500/30 bg-amber-500/10 text-amber-700";
}

function replyLogStatusClass(status: XReplyLog["status"]) {
  if (status === "posted") return "bg-emerald-500/10 text-emerald-700";
  if (status === "failed") return "bg-red-500/10 text-red-600";
  return "bg-amber-500/10 text-amber-700";
}

function toDateTimeLocalValue(date: Date) {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
}

function defaultScheduledAtValue(minutesAhead = 15) {
  return toDateTimeLocalValue(new Date(Date.now() + minutesAhead * 60000));
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

function formatMoney(value: number, currency = "usd") {
  const normalizedCurrency = currency.toUpperCase();
  const maxFractionDigits = Math.abs(value) > 0 && Math.abs(value) < 1 ? 3 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatLongDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildCombinedKnowledgePreview({
  displayName,
  overallMemory,
  memoryNotes,
  contacts,
  xPersona,
}: {
  displayName: string;
  overallMemory: string;
  memoryNotes: Note[];
  contacts: BrainoContact[];
  xPersona: XPersona;
}) {
  const sections: string[] = [];

  if (displayName.trim()) {
    sections.push(`Name: ${displayName.trim()}`);
  }

  if (overallMemory.trim()) {
    sections.push(`Overall user profile:\n${overallMemory.trim()}`);
  }

  const rememberedFacts = Array.from(
    new Set(
      memoryNotes
        .map((note) => String(note.structured_notes || note.title || "").trim())
        .filter(Boolean),
    ),
  );

  if (rememberedFacts.length > 0) {
    sections.push(`Additional remembered facts:\n${rememberedFacts.map((fact) => `- ${fact}`).join("\n")}`);
  }

  const rememberedContacts = Array.from(
    new Set(
      contacts
        .map((contact) => {
          const name = String(contact.name || "").trim();
          if (!name) return "";
          const bits = [
            contact.nickname ? `nickname: ${contact.nickname}` : "",
            contact.email ? `email: ${contact.email}` : "",
            contact.phone ? `phone: ${contact.phone}` : "",
          ].filter(Boolean);
          return bits.length ? `${name} — ${bits.join("; ")}` : name;
        })
        .filter(Boolean),
    ),
  );

  if (rememberedContacts.length > 0) {
    sections.push(`Saved contacts:\n${rememberedContacts.map((contact) => `- ${contact}`).join("\n")}`);
  }

  const xLines = [
    xPersona?.display_name ? `Name: ${xPersona.display_name}` : null,
    xPersona?.bio ? `Who they are: ${xPersona.bio}` : null,
    xPersona?.what_building ? `What they are building: ${xPersona.what_building}` : null,
    xPersona?.tone_notes ? `Voice and tone: ${xPersona.tone_notes}` : null,
  ].filter(Boolean);

  if (xLines.length > 0) {
    sections.push(`X automation profile:\n${xLines.join("\n")}`);
  }

  return sections.join("\n\n").trim();
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

function NoteModal({ note, onClose, userId, authHeader, driveConnected }: {
  note: Note;
  onClose: () => void;
  userId?: string;
  authHeader?: string;
  driveConnected?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [savingToDoc, setSavingToDoc] = useState(false);
  const [savedDocUrl, setSavedDocUrl] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(note.structured_notes || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToDoc = async () => {
    if (!userId || !authHeader) return;
    setSavingToDoc(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-docs-save-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ userIdentifier: userId, noteId: note.id }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to save");
      setSavedDocUrl(data.docUrl);
      window.open(data.docUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not save to Google Doc");
    } finally {
      setSavingToDoc(false);
    }
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

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--sb-line-2)] py-4">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
          >
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy markdown"}
          </Button>

          {driveConnected && userId && (
            savedDocUrl ? (
              <a
                href={savedDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/15"
              >
                <Check className="h-3.5 w-3.5" />
                Open in Google Docs →
              </a>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveToDoc}
                disabled={savingToDoc}
                className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
              >
                {savingToDoc
                  ? <><span className="mr-1.5 h-3.5 w-3.5 animate-spin inline-block rounded-full border-2 border-current border-t-transparent" />Saving…</>
                  : <><FileText className="mr-1.5 h-3.5 w-3.5 text-blue-500" />Save to Google Doc</>
                }
              </Button>
            )
          )}
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

/* A section that exists in the shape of the product but has nothing behind it
   yet. It says what will live here and what to use meanwhile, because a blank
   panel reads as a bug and a fake one is worse than either. */
function SoonPanel({ title, what, meanwhile }: { title: string; what: string; meanwhile?: React.ReactNode }) {
  return (
    <div>
      <div className="bd-phead">
        <h1>{title}</h1>
        <div className="bd-sub">{what}</div>
      </div>
      <div className="bd-soon">
        <p>Not built yet. It has a place here so the shape of the product is honest about what is coming.</p>
        {meanwhile ? <p className="bd-soon-alt">{meanwhile}</p> : null}
      </div>
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
  collapsed = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: React.ReactNode;
  onClick?: () => void;
  muted?: boolean;
  collapsed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn("bd-nav-item", active && "active", muted && "muted", collapsed && "justify-center")}
    >
      <span className="bd-ic">{icon}</span>
      {!collapsed && <span className="bd-nm">{label}</span>}
      {!collapsed && badge ? <span className="bd-ct">{badge}</span> : null}
    </button>
  );
}

function VoiceModeCard({
  mode,
  draggable,
  onDragStart,
  onDragEnd,
  onRename,
  onColorChange,
  onDelete,
  onHide,
  hideLabel = "Hide",
  onDeleteCommand,
  onToggleOpenMode,
  onAddUrl,
  onDeleteUrl,
  draft,
  onDraftChange,
  onAddCommand,
}: {
  mode: VoiceMode;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  onHide: () => void;
  hideLabel?: string;
  onDeleteCommand: (commandId: string) => void;
  onToggleOpenMode: (commandId: string, openMode: "tab" | "incognito") => void;
  onAddUrl: (commandId: string, url: string) => void;
  onDeleteUrl: (commandId: string, urlId: string) => void;
  draft: { phrase: string; url: string; openMode: "tab" | "incognito" };
  onDraftChange: (draft: { phrase: string; url: string; openMode: "tab" | "incognito" }) => void;
  onAddCommand: () => void;
}) {
  const [nameDraft, setNameDraft] = useState(mode.name);
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({});

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="bd-mode-card"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="cursor-grab select-none text-[var(--sb-ink-4)]" title="Drag to move">&#10287;</span>
          <span className="bd-mode-swatch" style={{ backgroundColor: mode.notch_color, color: mode.notch_color }} />
          <input
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={() => {
              if (nameDraft.trim() && nameDraft !== mode.name) onRename(nameDraft.trim());
            }}
            className="bd-mode-name max-w-[220px] flex-1"
          />
          {mode.is_active ? <span className="bd-tag accent">live</span> : null}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <input
            type="color"
            value={mode.notch_color}
            onChange={(event) => onColorChange(event.target.value)}
            className="bd-color-input"
            title="Notch color"
          />
          <button type="button" onClick={onHide} className="bd-btn ghost !px-3 !py-1.5 !text-[12px]">
            {hideLabel}
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete mode"
            className="grid h-7 w-7 place-items-center rounded-lg text-[var(--sb-ink-4)] transition hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink-2)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {mode.commands.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-[var(--sb-line-2)] px-4 py-3 text-[12.5px] text-[var(--sb-ink-4)]">
            No commands in this mode yet.
          </div>
        ) : (
          mode.commands.map((command) => (
            <div key={command.id} className="bd-cmd group">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="bd-cmd-phrase">&ldquo;{command.phrase}&rdquo;</div>
                <div className="flex items-center gap-2">
                  <div className="bd-seg">
                    <button type="button" className={command.open_mode === "tab" ? "on" : ""} onClick={() => onToggleOpenMode(command.id, "tab")}>
                      Tab
                    </button>
                    <button type="button" className={command.open_mode === "incognito" ? "on" : ""} onClick={() => onToggleOpenMode(command.id, "incognito")}>
                      Incognito
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCommand(command.id)}
                    className="rounded-md p-1 text-[var(--sb-ink-4)] opacity-0 transition hover:text-[var(--sb-ink-2)] group-hover:opacity-100"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-2.5 space-y-1">
                {command.urls.map((u) => (
                  <div key={u.id} className="bd-url-row">
                    <span className="truncate">{u.url}</span>
                    <button type="button" onClick={() => onDeleteUrl(command.id, u.id)} className="flex-shrink-0 text-[var(--sb-ink-4)] hover:text-[var(--sb-ink-2)]">
                      <XCircle className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {command.urls.length > 1 ? (
                  <div className="bd-eyebrow !text-[9px]">Opens a random 1&ndash;{command.urls.length} of these each time</div>
                ) : null}
                <div className="flex items-center gap-1.5 pt-1.5">
                  <input
                    value={urlDrafts[command.id] || ""}
                    onChange={(event) => setUrlDrafts((prev) => ({ ...prev, [command.id]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onAddUrl(command.id, urlDrafts[command.id] || "");
                        setUrlDrafts((prev) => ({ ...prev, [command.id]: "" }));
                      }
                    }}
                    placeholder="Add another URL…"
                    className="bd-input h-7 flex-1 !py-0 !text-[11.5px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onAddUrl(command.id, urlDrafts[command.id] || "");
                      setUrlDrafts((prev) => ({ ...prev, [command.id]: "" }));
                    }}
                    className="bd-btn ghost !px-2.5 !py-1 !text-[11px]"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] border border-dashed border-[var(--sb-line-2)] px-3 py-2.5">
          <input
            value={draft.phrase}
            onChange={(event) => onDraftChange({ ...draft, phrase: event.target.value })}
            placeholder="Phrase, e.g. open my inbox"
            className="bd-input h-8 min-w-[150px] flex-1 !py-0 !text-[12px]"
          />
          <input
            value={draft.url}
            onChange={(event) => onDraftChange({ ...draft, url: event.target.value })}
            placeholder="https://…"
            className="bd-input h-8 min-w-[150px] flex-1 !py-0 !text-[12px]"
          />
          <select
            value={draft.openMode}
            onChange={(event) => onDraftChange({ ...draft, openMode: event.target.value as "tab" | "incognito" })}
            className="bd-input h-8 !py-0 !text-[12px]"
          >
            <option value="tab">Tab</option>
            <option value="incognito">Incognito</option>
          </select>
          <button
            type="button"
            onClick={onAddCommand}
            disabled={!draft.phrase.trim() || !draft.url.trim()}
            className="bd-btn dark !py-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add command
          </button>
        </div>
      </div>
    </div>
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

function emptyContactDraft(): BrainoContactDraft {
  return { id: null, name: "", nickname: "", email: "", phone: "", photo_url: "" };
}

function normalizeBrainoContactName(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sortBrainoContacts(items: BrainoContact[]) {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function storageSafeSegment(value: string, fallback: string) {
  const safe = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return safe || fallback;
}

function contactPhotoExtension(file: File) {
  const explicit = file.name.split(".").pop()?.trim().toLowerCase();
  if (explicit) return explicit;
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "bin";
}

function createContactPhotoPath(userId: string, contactName: string, file: File) {
  const base = storageSafeSegment(contactName || file.name.replace(/\.[^.]+$/, ""), "contact");
  const ext = contactPhotoExtension(file);
  const unique = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${userId}/${base}-${unique}.${ext}`;
}

function getManagedContactPhotoPath(url: string | null | undefined) {
  const trimmed = String(url || "").trim();
  if (!trimmed || !trimmed.startsWith(BRAINO_CONTACT_PHOTO_PUBLIC_PREFIX)) return null;
  return decodeURIComponent(trimmed.slice(BRAINO_CONTACT_PHOTO_PUBLIC_PREFIX.length));
}

export default function Dashboard() {
  const { user, profile, loading, signOut, session, isPremium } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  /* Which half of the product you are in. Derived from the tab so that landing
     on a Foundry tab from anywhere shows the Foundry tree, rather than the two
     drifting apart. */
  const [world, setWorld] = useState<DashboardWorld>("companion");
  useEffect(() => { setWorld(worldOf(activeTab)); }, [activeTab]);
  const [xSubTab, setXSubTab] = useState<"settings" | "activity">("activity");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [notionConn, setNotionConn] = useState<NotionConn>(null);
  const [googleDriveConn, setGoogleDriveConn] = useState<GoogleDriveConn>(null);
  const [googleCalendarConn, setGoogleCalendarConn] = useState<GoogleCalendarConn>(null);
  const [xConn, setXConn] = useState<XConnection>(null);
  const [spotifyConn, setSpotifyConn] = useState<SpotifyConn>(null);
  const [scheduledXPosts, setScheduledXPosts] = useState<ScheduledXPost[]>([]);
  const [xAutomationStats, setXAutomationStats] = useState<XAutomationStats>(null);
  const [aiCostSummary, setAiCostSummary] = useState<AiCostSummary | null>(null);
  const [aiCostLoading, setAiCostLoading] = useState(false);
  const [aiCostError, setAiCostError] = useState<AiCostErrorPayload | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteFilter, setNoteFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [noteView, setNoteView] = useState<NoteView>("list");
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [contacts, setContacts] = useState<BrainoContact[]>([]);
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);
  // Memory Engine: auto-remembered facts + the master on/off toggle.
  const [brainoMemories, setBrainoMemories] = useState<BrainoMemory[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [swearingEnabled, setSwearingEnabled] = useState(false);
  const [swearingSaving, setSwearingSaving] = useState(false);
  const [memoryToggleSaving, setMemoryToggleSaving] = useState(false);
  // Voice Commands: modes (with notch color) each holding phrase -> URL(s) shortcuts.
  const [voiceModes, setVoiceModes] = useState<VoiceMode[]>([]);
  const [newModeName, setNewModeName] = useState("");
  const [hiddenFolderUnlocked, setHiddenFolderUnlocked] = useState(false);
  const [hiddenFolderUnlocking, setHiddenFolderUnlocking] = useState(false);
  // Set when the stored fingerprint can't be used here (new browser, wiped keychain) so we can offer re-registering.
  const [hiddenFolderNeedsSetup, setHiddenFolderNeedsSetup] = useState(false);
  const [draggedModeId, setDraggedModeId] = useState<string | null>(null);
  const [newCommandDraft, setNewCommandDraft] = useState<Record<string, { phrase: string; url: string; openMode: "tab" | "incognito" }>>({});
  const [hiddenModesCredentialId, setHiddenModesCredentialId] = useState<string | null>(null);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryDraft, setEditingMemoryDraft] = useState("");
  const [contactDraft, setContactDraft] = useState<BrainoContactDraft>(emptyContactDraft());
  const [contactSaving, setContactSaving] = useState(false);
  const [contactDeletingId, setContactDeletingId] = useState<string | null>(null);
  const [contactPhotoFile, setContactPhotoFile] = useState<File | null>(null);
  const [contactPhotoPreviewUrl, setContactPhotoPreviewUrl] = useState("");
  const contactPhotoInputRef = useRef<HTMLInputElement>(null);
  const contactPhotoObjectUrlRef = useRef<string | null>(null);
  const [voicePref, setVoicePref] = useState<"realtime" | "fish">(() => {
    const stored = localStorage.getItem("brainoVoicePref");
    return stored === "realtime" ? "realtime" : "fish"; // "elevenlabs" legacy → "fish"
  });
  const { mascot: mascotPref, setMascot: setMascotPref } = useMascotPreference();
  const [overallMemory, setOverallMemory] = useState("");
  const [overallMemoryDraft, setOverallMemoryDraft] = useState("");
  const [overallMemorySaving, setOverallMemorySaving] = useState(false);
  const [overallMemorySaved, setOverallMemorySaved] = useState(false);
  const [overallMemoryError, setOverallMemoryError] = useState<string | null>(null);
  const [driveConnectLoading, setDriveConnectLoading] = useState(false);
  const [calendarConnectLoading, setCalendarConnectLoading] = useState(false);
  const [xConnectLoading, setXConnectLoading] = useState(false);
  const [spotifyConnectLoading, setSpotifyConnectLoading] = useState(false);
  const [xPostDraft, setXPostDraft] = useState("");
  const [xScheduledAt, setXScheduledAt] = useState(() => defaultScheduledAtValue());
  const [xScheduling, setXScheduling] = useState(false);
  const [xThreadMode, setXThreadMode] = useState(false);
  const [xPostingNow, setXPostingNow] = useState(false);
  const [xPostMediaUrl, setXPostMediaUrl] = useState<string | null>(null);
  const [xMediaUploading, setXMediaUploading] = useState(false);
  const xMediaInputRef = useRef<HTMLInputElement>(null);
  const [xCancellingId, setXCancellingId] = useState<string | null>(null);
  const [xRetryingId, setXRetryingId] = useState<string | null>(null);
  const [xDispatching, setXDispatching] = useState(false);
  const [xPersona, setXPersona] = useState<XPersona>(null);
  const [xPersonaDraft, setXPersonaDraft] = useState({ display_name: "", bio: "", what_building: "", tone_notes: "", content_source: "" });
  const [xPersonaSaving, setXPersonaSaving] = useState(false);
  const [xPersonaSaved, setXPersonaSaved] = useState(false);
  const [xPersonaSaveError, setXPersonaSaveError] = useState<string | null>(null);
  const [xPersonaVerified, setXPersonaVerified] = useState<{ display_name: string; bio: string; what_building: string; tone_notes: string; content_source?: string } | null>(null);
  const [xAutoPostingEnabled, setXAutoPostingEnabled] = useState(false);
  const [xAutoReplyEnabled, setXAutoReplyEnabled] = useState(false);
  const [xPostsPerDay, setXPostsPerDay] = useState(4);

  const clearContactPhotoObjectUrl = () => {
    if (contactPhotoObjectUrlRef.current) {
      URL.revokeObjectURL(contactPhotoObjectUrlRef.current);
      contactPhotoObjectUrlRef.current = null;
    }
  };

  const resetContactComposer = (draft: BrainoContactDraft = emptyContactDraft()) => {
    clearContactPhotoObjectUrl();
    setContactPhotoFile(null);
    setContactPhotoPreviewUrl(String(draft.photo_url || "").trim());
    setContactDraft(draft);
    if (contactPhotoInputRef.current) contactPhotoInputRef.current.value = "";
  };

  useEffect(() => () => {
    if (contactPhotoObjectUrlRef.current) {
      URL.revokeObjectURL(contactPhotoObjectUrlRef.current);
      contactPhotoObjectUrlRef.current = null;
    }
  }, []);
  const [xAutoToggling, setXAutoToggling] = useState<"posting" | "reply" | null>(null);
  const [xNextPostAt, setXNextPostAt] = useState<string | null>(null);
  const [xAutoSessions, setXAutoSessions] = useState<XAutoSession[]>([]);
  const [selectedXSessionId, setSelectedXSessionId] = useState<string | null>(null);
  const [xSessionStarting, setXSessionStarting] = useState(false);
  const [xSessionStopping, setXSessionStopping] = useState(false);
  const [xSessionSortKey, setXSessionSortKey] = useState<XSessionSortKey>("started_at");
  const [xSessionSortDirection, setXSessionSortDirection] = useState<"asc" | "desc">("desc");
  const [xReplyLogs, setXReplyLogs] = useState<XReplyLog[]>([]);
  const [xGenerating, setXGenerating] = useState(false);
  const [xGenerateResult, setXGenerateResult] = useState<string | null>(null);
  const [xEngaging, setXEngaging] = useState(false);
  const [xEngageResult, setXEngageResult] = useState<string | null>(null);
  const [xSessionClock, setXSessionClock] = useState(() => Date.now());
  const xGenerateAbortRef = useRef<AbortController | null>(null);
  const xEngageAbortRef = useRef<AbortController | null>(null);
  const drivePollRef = useRef<number | null>(null);
  const calendarPollRef = useRef<number | null>(null);
  const xPollRef = useRef<number | null>(null);
  const spotifyPollRef = useRef<number | null>(null);

  function stopDrivePolling() {
    if (drivePollRef.current !== null) {
      window.clearInterval(drivePollRef.current);
      drivePollRef.current = null;
    }
  }

  function stopCalendarPolling() {
    if (calendarPollRef.current !== null) {
      window.clearInterval(calendarPollRef.current);
      calendarPollRef.current = null;
    }
  }

  function stopXPolling() {
    if (xPollRef.current !== null) {
      window.clearInterval(xPollRef.current);
      xPollRef.current = null;
    }
  }

  function stopSpotifyPolling() {
    if (spotifyPollRef.current !== null) {
      window.clearInterval(spotifyPollRef.current);
      spotifyPollRef.current = null;
    }
  }

  useEffect(() => {
    localStorage.setItem("brainoVoicePref", voicePref);
    window.postMessage({ type: "sbSetVoicePref", pref: voicePref }, "*");
  }, [voicePref]);

  async function refreshGoogleDriveConnection(userId: string) {
    const { data } = await supabase
      .from("google_drive_connections")
      .select("google_email,updated_at")
      .eq("user_identifier", userId)
      .maybeSingle();

    setGoogleDriveConn((data as GoogleDriveConn) || null);
    return (data as GoogleDriveConn) || null;
  }

  async function refreshGoogleCalendarConnection(userId: string) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-connection-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ userIdentifier: userId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Failed to load Google Calendar connection");
    const connection = payload.connected
      ? {
          google_email: payload.connection?.google_email ?? null,
          updated_at: payload.connection?.updated_at ?? null,
          watch_expires_at: payload.connection?.watch_expires_at ?? null,
          last_sync_at: payload.connection?.last_sync_at ?? null,
        }
      : null;
    setGoogleCalendarConn(connection);
    return connection;
  }

  async function refreshBrainoContacts(userId: string) {
    const { data, error } = await supabase
      .from("braino_contacts")
      .select("id,user_id,name,name_key,nickname,nickname_key,email,phone,photo_url,created_at,updated_at")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) throw error;
    const rows = sortBrainoContacts((data as BrainoContact[] | null) || []);
    setContacts(rows);
    return rows;
  }

  async function refreshSpotifyConnection(userId: string) {
    const { data } = await supabase
      .from("spotify_connections")
      .select("display_name,spotify_email,product,updated_at")
      .eq("user_identifier", userId)
      .maybeSingle();

    setSpotifyConn((data as SpotifyConn) || null);
    return (data as SpotifyConn) || null;
  }

  async function fetchXConnection(userId: string): Promise<XConnection> {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/x-connection-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ userIdentifier: userId }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Failed to load X connection");
    }
    if (!payload.connected) return null;
    return {
      username: payload.username ?? null,
      displayName: payload.displayName ?? null,
      xUserId: payload.xUserId ?? null,
      updatedAt: payload.updatedAt ?? null,
    };
  }

  async function refreshXConnection(userId: string) {
    const connection = await fetchXConnection(userId);
    setXConn(connection);
    return connection;
  }

  async function refreshScheduledXPosts(userId: string) {
    const { data, error } = await supabase
      .from("scheduled_x_posts")
      .select("*")
      .eq("user_id", userId)
      .order("scheduled_at", { ascending: true })
      .limit(20);

    if (error) throw error;
    const posts = (data as ScheduledXPost[] | null) || [];
    setScheduledXPosts(posts);
    return posts;
  }

  async function refreshXAutomationStats(userId: string) {
    const { data, error } = await (supabase as any)
      .from("x_automation_stats")
      .select("total_replies,total_runs,total_runtime_ms,last_run_reply_count,last_run_duration_ms,last_run_started_at,last_run_finished_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    const stats = (data as XAutomationStats) || null;
    setXAutomationStats(stats);
    return stats;
  }

  async function refreshXAutoActivity(userId: string) {
    const [sessionsRes, logsRes] = await Promise.all([
      (supabase as any)
        .from("x_auto_sessions")
        .select("id,session_number,status,started_at,ends_at,stopped_at,cooldown_ends_at,last_polled_at,last_reply_at,replies_posted,replies_failed,replies_queued,followers_gained,replies_received,total_views")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(30),
      (supabase as any)
        .from("x_auto_reply_logs")
        .select("id,session_id,mention_tweet_id,our_reply_tweet_id,post_author_handle,post_author_display_name,post_url,post_text,our_reply,status,error_message,discovered_at,replied_at")
        .eq("user_id", userId)
        .order("discovered_at", { ascending: false })
        .limit(200),
    ]);

    if (sessionsRes.error) throw sessionsRes.error;
    if (logsRes.error) throw logsRes.error;

    const sessions = (sessionsRes.data as XAutoSession[] | null) || [];
    const logs = (logsRes.data as XReplyLog[] | null) || [];

    setXAutoSessions(sessions);
    setSelectedXSessionId((current) =>
      current && sessions.some((item) => item.id === current)
        ? current
        : sessions[0]?.id ?? null,
    );
    setXReplyLogs(logs);

    return { sessions, logs };
  }

  async function fetchAiCostSummary(accessToken: string) {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-cost-overview`, {
      method: "GET",
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.userMessage || payload.error || "Failed to load API cost overview") as Error & {
        setupUrl?: string;
      };
      if (typeof payload.setupUrl === "string") {
        error.setupUrl = payload.setupUrl;
      }
      throw error;
    }
    return payload as AiCostSummary;
  }

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(profile?.display_name || "");

    const load = async () => {
      const [notesRes, commandsRes, notionRes, driveRes, calendarRes, contactsRes, spotifyRes, profileMemoryRes, xStatsRes, xConnRes, scheduledXRes, xPersonaRes, xSessionsRes, xReplyLogsRes, brainoMemoriesRes, voiceModesRes, voiceCommandsRes, voiceCommandUrlsRes] = await Promise.all([
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
          .from("google_drive_connections")
          .select("google_email,updated_at")
          .eq("user_identifier", user.id)
          .maybeSingle(),
        refreshGoogleCalendarConnection(user.id).catch(() => null),
        refreshBrainoContacts(user.id).catch(() => []),
        supabase
          .from("spotify_connections")
          .select("display_name,spotify_email,product,updated_at")
          .eq("user_identifier", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("overall_memory,memory_enabled,personality_settings,hidden_modes_credential_id")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("x_automation_stats")
          .select("total_replies,total_runs,total_runtime_ms,last_run_reply_count,last_run_duration_ms,last_run_started_at,last_run_finished_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        fetchXConnection(user.id).catch(() => null),
        supabase
          .from("scheduled_x_posts")
          .select("*")
          .eq("user_id", user.id)
          .order("scheduled_at", { ascending: true })
          .limit(20),
        (supabase as any)
          .from("x_auto_persona")
          .select("display_name,bio,what_building,tone_notes,content_source,auto_posting_enabled,auto_reply_enabled,posts_per_day")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("x_auto_sessions")
          .select("id,session_number,status,started_at,ends_at,stopped_at,cooldown_ends_at,last_polled_at,last_reply_at,replies_posted,replies_failed,replies_queued,followers_gained,replies_received,total_views")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false })
          .limit(30),
        (supabase as any)
          .from("x_auto_reply_logs")
          .select("id,session_id,mention_tweet_id,our_reply_tweet_id,post_author_handle,post_author_display_name,post_url,post_text,our_reply,status,error_message,discovered_at,replied_at")
          .eq("user_id", user.id)
          .order("discovered_at", { ascending: false })
          .limit(200),
        (supabase as any)
          .from("braino_memories")
          .select("id,content,category,salience,created_at")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("salience", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(300),
        (supabase as any)
          .from("voice_modes")
          .select("id,name,notch_color,is_active,is_hidden,position")
          .eq("user_id", user.id)
          .order("position", { ascending: true }),
        (supabase as any)
          .from("voice_commands")
          .select("id,mode_id,phrase,open_mode,position")
          .eq("user_id", user.id)
          .order("position", { ascending: true }),
        (supabase as any)
          .from("voice_command_urls")
          .select("id,command_id,url,position")
          .order("position", { ascending: true }),
      ]);

      if (notesRes.data) setNotes(notesRes.data as Note[]);
      if (commandsRes.data) setCommands(commandsRes.data as unknown as Command[]);
      setNotionConn(notionRes.data as NotionConn);
      setGoogleDriveConn((driveRes.data as GoogleDriveConn) || null);
      setGoogleCalendarConn((calendarRes as GoogleCalendarConn) || null);
      setContacts(sortBrainoContacts((contactsRes as BrainoContact[]) || []));
      setSpotifyConn((spotifyRes.data as SpotifyConn) || null);
      const loadedOverallMemory = String((profileMemoryRes.data as { overall_memory?: string } | null)?.overall_memory || "");
      setOverallMemory(loadedOverallMemory);
      setOverallMemoryDraft(loadedOverallMemory);
      setBrainoMemories(((brainoMemoriesRes?.data as BrainoMemory[] | null) || []));
      {
        const rawModes = ((voiceModesRes?.data as Omit<VoiceMode, "commands">[] | null) || []);
        const rawCommands = ((voiceCommandsRes?.data as Omit<VoiceCommand, "urls">[] | null) || []);
        const rawUrls = ((voiceCommandUrlsRes?.data as VoiceCommandUrl[] | null) || []);
        const urlsByCommand = new Map<string, VoiceCommandUrl[]>();
        for (const u of rawUrls) {
          const list = urlsByCommand.get(u.command_id) || [];
          list.push(u);
          urlsByCommand.set(u.command_id, list);
        }
        const commandsByMode = new Map<string, VoiceCommand[]>();
        for (const c of rawCommands) {
          const list = commandsByMode.get(c.mode_id) || [];
          list.push({ ...c, urls: urlsByCommand.get(c.id) || [] });
          commandsByMode.set(c.mode_id, list);
        }
        setVoiceModes(rawModes.map((m) => ({ ...m, commands: commandsByMode.get(m.id) || [] })));
      }
      setHiddenModesCredentialId(
        (profileMemoryRes.data as { hidden_modes_credential_id?: string | null } | null)?.hidden_modes_credential_id || null,
      );
      setMemoryEnabled((profileMemoryRes.data as { memory_enabled?: boolean } | null)?.memory_enabled !== false);
      setSwearingEnabled(((profileMemoryRes.data as { personality_settings?: { swearing?: boolean } } | null)?.personality_settings?.swearing) === true);
      setXConn((xConnRes as XConnection) || null);
      setScheduledXPosts((scheduledXRes.data as ScheduledXPost[] | null) || []);
      setXAutomationStats((xStatsRes.data as XAutomationStats) || null);
      const persona = (xPersonaRes.data as XPersona) || null;
      setXPersona(persona);
      if (persona) {
        setXPersonaDraft({ display_name: persona.display_name || "", bio: persona.bio || "", what_building: persona.what_building || "", tone_notes: persona.tone_notes || "", content_source: persona.content_source || "" });
        setXAutoPostingEnabled(persona.auto_posting_enabled ?? false);
        setXAutoReplyEnabled(persona.auto_reply_enabled ?? false);
        setXPostsPerDay(persona.posts_per_day ?? 4);
      }
      // Fetch next scheduled post time
      const { data: nextPost } = await (supabase as any)
        .from("scheduled_x_posts")
        .select("scheduled_at")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      setXNextPostAt(nextPost?.scheduled_at ?? null);
      const sessions = (xSessionsRes.data as XAutoSession[] | null) || [];
      setXAutoSessions(sessions);
      setSelectedXSessionId(sessions[0]?.id ?? null);
      setXReplyLogs((xReplyLogsRes.data as XReplyLog[]) || []);
      setDataLoading(false);
    };

    load();
  }, [profile, user]);

  useEffect(() => {
    if (!user || !session?.access_token) return;

    let cancelled = false;

    const loadCostSummary = async (silent = false) => {
      if (!silent) setAiCostLoading(true);
      try {
        const summary = await fetchAiCostSummary(session.access_token);
        if (cancelled) return;
        setAiCostSummary(summary);
        setAiCostError(null);
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error) {
          setAiCostError({
            message: error.message,
            setupUrl: (error as Error & { setupUrl?: string }).setupUrl,
          });
        } else {
          setAiCostError({ message: "Could not load API cost overview." });
        }
      } finally {
        if (!cancelled && !silent) setAiCostLoading(false);
      }
    };

    loadCostSummary();
    const interval = window.setInterval(() => {
      loadCostSummary(true).catch(() => null);
    }, 120000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [session?.access_token, user]);

  useEffect(() => () => {
    stopDrivePolling();
    stopCalendarPolling();
    stopXPolling();
    stopSpotifyPolling();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setXSessionClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedXSessionId && xAutoSessions.some((sessionItem) => sessionItem.id === selectedXSessionId)) {
      return;
    }
    setSelectedXSessionId(xAutoSessions[0]?.id ?? null);
  }, [selectedXSessionId, xAutoSessions]);

  useEffect(() => {
    if (!user || activeTab !== "xAutomation") return;

    const interval = window.setInterval(() => {
      refreshXAutoActivity(user.id).catch(() => null);
      refreshXAutomationStats(user.id).catch(() => null);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [activeTab, user]);

  async function handleConnectGoogleDrive() {
    if (!user) return;
    setDriveConnectLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-oauth-start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userIdentifier: user.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.authUrl) {
        throw new Error(payload.error || "Failed to start Google Drive OAuth");
      }

      window.open(payload.authUrl, "_blank", "noopener,noreferrer");
      stopDrivePolling();
      const startedAt = Date.now();
      drivePollRef.current = window.setInterval(async () => {
        const connection = await refreshGoogleDriveConnection(user.id);
        if (connection) {
          stopDrivePolling();
          setDriveConnectLoading(false);
          return;
        }
        if (Date.now() - startedAt > 2 * 60 * 1000) {
          stopDrivePolling();
          setDriveConnectLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error("google drive connect failed:", error);
      setDriveConnectLoading(false);
      window.alert(error instanceof Error ? error.message : "Failed to connect Google Drive");
    }
  }

  async function handleConnectGoogleCalendar() {
    if (!user) return;
    setCalendarConnectLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth-start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userIdentifier: user.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.authUrl) {
        throw new Error(payload.error || "Failed to start Google Calendar OAuth");
      }

      window.open(payload.authUrl, "_blank", "noopener,noreferrer");
      stopCalendarPolling();
      const startedAt = Date.now();
      calendarPollRef.current = window.setInterval(async () => {
        const connection = await refreshGoogleCalendarConnection(user.id);
        if (connection) {
          stopCalendarPolling();
          setCalendarConnectLoading(false);
          return;
        }
        if (Date.now() - startedAt > 2 * 60 * 1000) {
          stopCalendarPolling();
          setCalendarConnectLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error("google calendar connect failed:", error);
      setCalendarConnectLoading(false);
      window.alert(error instanceof Error ? error.message : "Failed to connect Google Calendar");
    }
  }

  async function handleConnectX() {
    if (!user) return;
    setXConnectLoading(true);

    // Open the popup synchronously (before any await) so browsers don't block it.
    // With noopener, window.open returns null, so we omit it here and set the URL after.
    const popup = window.open("about:blank", "_blank", "width=620,height=720");

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/x-oauth-start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ userIdentifier: user.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.authUrl) {
        popup?.close();
        throw new Error(payload.error || "Failed to start X OAuth");
      }

      if (popup && !popup.closed) {
        popup.location.href = payload.authUrl;
      } else {
        window.open(payload.authUrl, "_blank");
      }

      stopXPolling();
      const startedAt = Date.now();
      xPollRef.current = window.setInterval(async () => {
        try {
          const connection = await refreshXConnection(user.id);
          if (connection) {
            stopXPolling();
            setXConnectLoading(false);
            toast({
              title: "X connected",
              description: connection.username ? `Linked @${connection.username}.` : "Your X account is now linked.",
            });
            return;
          }
        } catch (error) {
          console.error("x connection poll failed:", error);
        }

        if (Date.now() - startedAt > 2 * 60 * 1000) {
          stopXPolling();
          setXConnectLoading(false);
        }
      }, 2000);
    } catch (error) {
      popup?.close();
      console.error("x connect failed:", error);
      setXConnectLoading(false);
      toast({
        title: "Could not connect X",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleConnectSpotify() {
    if (!user || !session) return;
    setSpotifyConnectLoading(true);

    const popup = window.open("about:blank", "_blank", "width=620,height=720");

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spotify-oauth-start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.authUrl) {
        popup?.close();
        throw new Error(payload.error || "Failed to start Spotify OAuth");
      }

      if (popup && !popup.closed) {
        popup.location.href = payload.authUrl;
      } else {
        window.open(payload.authUrl, "_blank");
      }

      stopSpotifyPolling();
      const startedAt = Date.now();
      spotifyPollRef.current = window.setInterval(async () => {
        try {
          const connection = await refreshSpotifyConnection(user.id);
          if (connection) {
            stopSpotifyPolling();
            setSpotifyConnectLoading(false);
            toast({
              title: "Spotify connected",
              description: connection.display_name || connection.spotify_email || "Your Spotify account is now linked.",
            });
            return;
          }
        } catch (error) {
          console.error("spotify connection poll failed:", error);
        }

        if (Date.now() - startedAt > 2 * 60 * 1000) {
          stopSpotifyPolling();
          setSpotifyConnectLoading(false);
        }
      }, 2000);
    } catch (error) {
      popup?.close();
      console.error("spotify connect failed:", error);
      setSpotifyConnectLoading(false);
      toast({
        title: "Could not connect Spotify",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleScheduleXPost() {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to schedule posts." });
      return;
    }
    if (!xConn) {
      toast({ title: "Connect X first", description: "Link an X account before scheduling posts." });
      return;
    }

    const content = xPostDraft.trim();
    if (!content) {
      toast({ title: "Write the post first", description: "Add some text before scheduling it." });
      return;
    }
    const scheduledDate = new Date(xScheduledAt);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      toast({ title: "Pick a future time", description: "The scheduled time must be in the future." });
      return;
    }

    setXScheduling(true);
    try {
      const { data, error } = await supabase
        .from("scheduled_x_posts")
        .insert({
          user_id: user.id,
          content,
          scheduled_at: scheduledDate.toISOString(),
          media_url: xPostMediaUrl ?? null,
          thread_mode: xThreadMode,
        })
        .select()
        .single();

      if (error) throw error;

      setScheduledXPosts((prev) =>
        [...prev, data as ScheduledXPost].sort(
          (left, right) => new Date(left.scheduled_at).getTime() - new Date(right.scheduled_at).getTime(),
        ),
      );
      setXPostDraft("");
      setXScheduledAt(defaultScheduledAtValue());
      setXPostMediaUrl(null);
      toast({
        title: "Post scheduled",
        description: `Braino will send it on ${formatDateTime(scheduledDate.toISOString())}.`,
      });
    } catch (error) {
      console.error("schedule x post failed:", error);
      toast({
        title: "Could not schedule post",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setXScheduling(false);
    }
  }

  async function handlePostXNow() {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to post on X." });
      return;
    }
    if (!xConn) {
      toast({ title: "Connect X first", description: "Link an X account before posting." });
      return;
    }

    const content = xPostDraft.trim();
    if (!content) {
      toast({ title: "Write the post first", description: "Add some text before posting it." });
      return;
    }


    setXPostingNow(true);
    try {
      const dueAt = new Date(Date.now() - 1_000).toISOString();
      const { error } = await supabase
        .from("scheduled_x_posts")
        .insert({
          user_id: user.id,
          content,
          scheduled_at: dueAt,
          media_url: xPostMediaUrl ?? null,
          thread_mode: xThreadMode,
        });

      if (error) throw error;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispatch-scheduled-x-posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to post to X");
      }

      await refreshScheduledXPosts(user.id);
      setXPostDraft("");
      setXScheduledAt(defaultScheduledAtValue());
      setXPostMediaUrl(null);
      toast({
        title: payload.posted ? "Posted to X" : "Post sent to queue",
        description: payload.posted
          ? "Braino sent your draft right away."
          : `${payload.failed || 0} failed. Check the queue for the exact X error.`,
      });
    } catch (error) {
      console.error("post x now failed:", error);
      toast({
        title: "Could not post to X",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setXPostingNow(false);
    }
  }

  async function handleMediaFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const isVideo = file.type.startsWith("video/");
    const maxBytes = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({ title: "File too large", description: isVideo ? "Videos must be under 50 MB." : "Images must be under 5 MB." });
      return;
    }
    setXMediaUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("x-post-media").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("x-post-media").getPublicUrl(path);
      setXPostMediaUrl(publicUrl);
    } catch (error) {
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setXMediaUploading(false);
      if (xMediaInputRef.current) xMediaInputRef.current.value = "";
    }
  }

  async function handleCancelScheduledXPost(id: string) {
    if (!user) return;
    setXCancellingId(id);
    try {
      const { error } = await supabase
        .from("scheduled_x_posts")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setScheduledXPosts((prev) => prev.map((post) => (post.id === id ? { ...post, status: "cancelled" } : post)));
    } catch (error) {
      console.error("cancel x post failed:", error);
      toast({
        title: "Could not cancel post",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setXCancellingId(null);
    }
  }

  async function handleRetryScheduledXPost(id: string) {
    if (!user) return;
    setXRetryingId(id);
    try {
      const { error } = await supabase
        .from("scheduled_x_posts")
        .update({ status: "pending", error_message: null, scheduled_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      setScheduledXPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "pending" as const, error_message: null } : p))
      );
      toast({ title: "Post re-queued", description: "It will be dispatched on the next run." });
    } catch (error) {
      toast({ title: "Could not retry post", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setXRetryingId(null);
    }
  }

  async function handleClearPostedXPosts() {
    if (!user) return;
    const ids = scheduledXPosts.filter((p) => ["posted", "failed", "cancelled"].includes(p.status)).map((p) => p.id);
    if (ids.length === 0) return;
    try {
      const { error } = await supabase
        .from("scheduled_x_posts")
        .delete()
        .in("id", ids)
        .eq("user_id", user.id);
      if (error) throw error;
      setScheduledXPosts((prev) => prev.filter((p) => !ids.includes(p.id)));
    } catch (error) {
      toast({ title: "Could not clear posts", description: error instanceof Error ? error.message : "Please try again." });
    }
  }

  async function handleRunGenerate() {
    if (!session) return;
    const ctrl = new AbortController();
    xGenerateAbortRef.current = ctrl;
    setXGenerating(true);
    setXGenerateResult(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/x-auto-generate`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generation failed");
      const count = data?.generated ?? 0;
      setXGenerateResult(count > 0 ? `Generated ${count} post${count > 1 ? "s" : ""} — queued for dispatch` : "No new posts generated (quota full or no persona set)");
      const { data: fresh } = await supabase.from("scheduled_x_posts").select("*").eq("user_id", user!.id).order("scheduled_at", { ascending: false }).limit(50);
      if (fresh) setScheduledXPosts(fresh as ScheduledXPost[]);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setXGenerateResult("Stopped.");
      } else {
        setXGenerateResult(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    } finally {
      xGenerateAbortRef.current = null;
      setXGenerating(false);
    }
  }

  function handleStopGenerate() {
    xGenerateAbortRef.current?.abort();
  }

  async function handleRunEngage() {
    if (!session) return;
    const ctrl = new AbortController();
    xEngageAbortRef.current = ctrl;
    setXEngaging(true);
    setXEngageResult(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/x-auto-engage`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Engage failed");
      const count = data?.replied ?? 0;
      const sessionSummaries = Array.isArray(data?.sessions) ? data.sessions : [];
      const queued = sessionSummaries.reduce(
        (sum: number, item: { queued?: number }) => sum + Number(item?.queued || 0),
        0,
      );
      setXEngageResult(
        count > 0
          ? `Posted ${count} repl${count > 1 ? "ies" : "y"} this minute${queued > 0 ? ` · ${queued} still queued` : ""}`
          : queued > 0
            ? `${queued} repl${queued > 1 ? "ies are" : "y is"} queued for the active session`
            : data?.message || "No active session work right now",
      );
      await Promise.all([
        refreshXAutoActivity(user!.id),
        refreshXAutomationStats(user!.id),
      ]);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setXEngageResult("Stopped.");
      } else {
        setXEngageResult(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    } finally {
      xEngageAbortRef.current = null;
      setXEngaging(false);
    }
  }

  function handleStopEngage() {
    xEngageAbortRef.current?.abort();
  }

  async function handleStartXSession() {
    if (!session || !user) return;
    setXSessionStarting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/x-auto-session-start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not start X Auto session");

      await Promise.all([
        refreshXAutoActivity(user.id),
        refreshXAutomationStats(user.id),
      ]);

      toast({
        title: `Session ${data?.session?.session_number ?? "?"} started`,
        description: "X Auto will reply at most once per minute for the next 3 hours.",
      });
      setXEngageResult(null);
    } catch (error) {
      toast({
        title: "Could not start session",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setXSessionStarting(false);
    }
  }

  async function handleStopXSession() {
    if (!session || !user) return;
    setXSessionStopping(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/x-auto-session-stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not stop X Auto session");

      await Promise.all([
        refreshXAutoActivity(user.id),
        refreshXAutomationStats(user.id),
      ]);

      toast({
        title: `Session ${data?.session?.session_number ?? "?"} stopped`,
        description: "That session is now locked in and the 3-hour cooldown still applies.",
      });
    } catch (error) {
      toast({
        title: "Could not stop session",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setXSessionStopping(false);
    }
  }

  function handleXSessionSort(key: XSessionSortKey) {
    if (xSessionSortKey === key) {
      setXSessionSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }

    setXSessionSortKey(key);
    setXSessionSortDirection(key === "status" ? "asc" : "desc");
  }

  async function handleClearXQueue() {
    if (!user) return;
    const pendingIds = scheduledXPosts.filter((p) => p.status === "pending").map((p) => p.id);
    if (pendingIds.length === 0) return;
    try {
      const { error } = await supabase
        .from("scheduled_x_posts")
        .update({ status: "cancelled" })
        .in("id", pendingIds)
        .eq("user_id", user.id);
      if (error) throw error;
      setScheduledXPosts((prev) =>
        prev.map((p) => (pendingIds.includes(p.id) ? { ...p, status: "cancelled" as const } : p))
      );
    } catch (error) {
      toast({
        title: "Could not clear queue",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleDispatchScheduledXPosts() {
    if (!user) return;
    setXDispatching(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dispatch-scheduled-x-posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to dispatch scheduled posts");
      }

      await refreshScheduledXPosts(user.id);
      toast({
        title: "Dispatch finished",
        description: `${payload.posted || 0} posted, ${payload.failed || 0} failed.`,
      });
    } catch (error) {
      console.error("dispatch x posts failed:", error);
      toast({
        title: "Dispatch failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setXDispatching(false);
    }
  }

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
  const activeXSession = useMemo(
    () => xAutoSessions.find((sessionItem) => sessionItem.status === "active") || null,
    [xAutoSessions],
  );
  const latestXSession = xAutoSessions[0] || null;
  const selectedXSession = useMemo(
    () => xAutoSessions.find((sessionItem) => sessionItem.id === selectedXSessionId) || latestXSession,
    [latestXSession, selectedXSessionId, xAutoSessions],
  );
  const selectedXSessionLogs = useMemo(
    () =>
      selectedXSession
        ? [...xReplyLogs.filter((log) => log.session_id === selectedXSession.id)].sort(
            (left, right) =>
              new Date(left.discovered_at).getTime() - new Date(right.discovered_at).getTime(),
          )
        : [],
    [selectedXSession, xReplyLogs],
  );
  const sortedXAutoSessions = useMemo(() => {
    const sessions = [...xAutoSessions];
    sessions.sort((left, right) => {
      const direction = xSessionSortDirection === "asc" ? 1 : -1;
      const getComparable = (sessionItem: XAutoSession) => {
        if (xSessionSortKey === "status") return sessionItem.status;
        if (xSessionSortKey === "started_at") return new Date(sessionItem.started_at).getTime();
        return sessionItem[xSessionSortKey];
      };
      const leftValue = getComparable(left);
      const rightValue = getComparable(right);
      if (leftValue === rightValue) return 0;
      return leftValue > rightValue ? direction : -direction;
    });
    return sessions;
  }, [xAutoSessions, xSessionSortDirection, xSessionSortKey]);
  const activeSessionTimeRemainingMs = activeXSession
    ? Math.max(0, new Date(activeXSession.ends_at).getTime() - xSessionClock)
    : 0;
  const cooldownTimeRemainingMs = !activeXSession && latestXSession
    ? Math.max(0, new Date(latestXSession.cooldown_ends_at).getTime() - xSessionClock)
    : 0;
  const xSessionFocus = activeXSession || latestXSession;

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
  const topCostLineItem = aiCostSummary?.lineItemBreakdownLast30Days[0] || null;
  const topCostModel = aiCostSummary?.modelBreakdownLast30Days[0] || null;

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
  const combinedKnowledgePreview = useMemo(
    () =>
      buildCombinedKnowledgePreview({
        displayName,
        overallMemory,
        memoryNotes,
        contacts,
        xPersona,
      }),
    [contacts, displayName, memoryNotes, overallMemory, xPersona],
  );
  const xPersonaConfigured = useMemo(
    () =>
      Boolean(
        xPersona?.display_name?.trim() ||
          xPersona?.bio?.trim() ||
          xPersona?.what_building?.trim() ||
          xPersona?.tone_notes?.trim(),
      ),
    [xPersona],
  );
  const memoryEntryCount = memoryNotes.length + (overallMemory.trim() ? 1 : 0);

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
  const aiCostSparkPoints = buildLinePoints(
    (aiCostSummary?.dailyCosts || []).map((point) => point.costUsd),
    260,
    76,
    6,
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

  const openNewContactDialog = (prefill?: Partial<BrainoContactDraft>) => {
    resetContactComposer({
      ...emptyContactDraft(),
      ...prefill,
      name: String(prefill?.name || "").trim(),
      nickname: String(prefill?.nickname || "").trim(),
      email: String(prefill?.email || "").trim(),
      phone: String(prefill?.phone || "").trim(),
      photo_url: String(prefill?.photo_url || "").trim(),
    });
    setContactsDialogOpen(true);
  };

  const openEditContactDialog = (contact: BrainoContact) => {
    resetContactComposer({
      id: contact.id,
      name: contact.name || "",
      nickname: contact.nickname || "",
      email: contact.email || "",
      phone: contact.phone || "",
      photo_url: contact.photo_url || "",
    });
    setContactsDialogOpen(true);
  };

  const handleContactPhotoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Unsupported file", description: "Upload an image file for the contact photo.", variant: "destructive" });
      event.target.value = "";
      return;
    }

    if (file.size > BRAINO_CONTACT_PHOTO_MAX_BYTES) {
      toast({ title: "Photo too large", description: "Contact photos must stay under 5 MB.", variant: "destructive" });
      event.target.value = "";
      return;
    }

    clearContactPhotoObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    contactPhotoObjectUrlRef.current = objectUrl;
    setContactPhotoFile(file);
    setContactPhotoPreviewUrl(objectUrl);
  };

  const handleRemoveContactPhoto = () => {
    clearContactPhotoObjectUrl();
    setContactPhotoFile(null);
    setContactPhotoPreviewUrl("");
    setContactDraft((prev) => ({ ...prev, photo_url: "" }));
    if (contactPhotoInputRef.current) contactPhotoInputRef.current.value = "";
  };

  const handleSaveContact = async () => {
    if (!user) return;

    const name = contactDraft.name.trim();
    const nickname = contactDraft.nickname.trim();
    const email = contactDraft.email.trim().toLowerCase();
    const phone = contactDraft.phone.trim();
    const currentPhotoUrl = contactDraft.photo_url.trim();
    const previousContact = contactDraft.id ? contacts.find((item) => item.id === contactDraft.id) || null : null;
    const previousManagedPhotoPath = getManagedContactPhotoPath(previousContact?.photo_url);

    if (!name) {
      toast({ title: "Contact name missing", description: "Give Braino a name to remember.", variant: "destructive" });
      return;
    }
    if (!email && !phone) {
      toast({ title: "Add at least one detail", description: "Save an email or phone number so Braino can actually use this contact.", variant: "destructive" });
      return;
    }

    let uploadedPhotoPath: string | null = null;
    let photo_url = currentPhotoUrl;

    const payload = {
      user_id: user.id,
      name,
      name_key: normalizeBrainoContactName(name),
      nickname: nickname || null,
      nickname_key: nickname ? normalizeBrainoContactName(nickname) : null,
      email: email || null,
      phone: phone || null,
      photo_url: photo_url || null,
      updated_at: new Date().toISOString(),
    };

    setContactSaving(true);

    if (contactPhotoFile) {
      try {
        uploadedPhotoPath = createContactPhotoPath(user.id, name, contactPhotoFile);
        const { error } = await supabase.storage
          .from(BRAINO_CONTACT_PHOTO_BUCKET)
          .upload(uploadedPhotoPath, contactPhotoFile, { contentType: contactPhotoFile.type });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
          .from(BRAINO_CONTACT_PHOTO_BUCKET)
          .getPublicUrl(uploadedPhotoPath);
        photo_url = publicUrl;
        payload.photo_url = publicUrl;
      } catch (error) {
        setContactSaving(false);
        toast({
          title: "Could not upload photo",
          description: error instanceof Error ? error.message : "Please try another image.",
          variant: "destructive",
        });
        return;
      }
    }

    let response;
    if (contactDraft.id) {
      response = await supabase
        .from("braino_contacts")
        .update(payload)
        .eq("id", contactDraft.id)
        .eq("user_id", user.id)
        .select("id,user_id,name,name_key,nickname,nickname_key,email,phone,photo_url,created_at,updated_at")
        .single();
    } else {
      response = await supabase
        .from("braino_contacts")
        .insert(payload)
        .select("id,user_id,name,name_key,nickname,nickname_key,email,phone,photo_url,created_at,updated_at")
        .single();
    }

    setContactSaving(false);

    if (response.error) {
      if (uploadedPhotoPath) {
        await supabase.storage.from(BRAINO_CONTACT_PHOTO_BUCKET).remove([uploadedPhotoPath]).catch(() => undefined);
      }
      toast({
        title: "Could not save contact",
        description: response.error.message || "Check whether this name or nickname already exists, then try again.",
        variant: "destructive",
      });
      return;
    }

    const savedContact = response.data as BrainoContact;
    setContacts((prev) => {
      const withoutCurrent = prev.filter((item) => item.id !== savedContact.id);
      return sortBrainoContacts([...withoutCurrent, savedContact]);
    });
    const nextManagedPhotoPath = getManagedContactPhotoPath(savedContact.photo_url);
    if (previousManagedPhotoPath && previousManagedPhotoPath !== nextManagedPhotoPath) {
      await supabase.storage.from(BRAINO_CONTACT_PHOTO_BUCKET).remove([previousManagedPhotoPath]).catch(() => undefined);
    }
    setContactsDialogOpen(false);
    resetContactComposer();
    toast({
      title: contactDraft.id ? "Contact updated" : "Contact saved",
      description: `${savedContact.name} is now part of Braino's contact memory.`,
    });
  };

  const handleDeleteContact = async (contact: BrainoContact) => {
    if (!user) return;
    setContactDeletingId(contact.id);
    const managedPhotoPath = getManagedContactPhotoPath(contact.photo_url);
    const { error } = await supabase
      .from("braino_contacts")
      .delete()
      .eq("id", contact.id)
      .eq("user_id", user.id);
    setContactDeletingId(null);

    if (error) {
      toast({ title: "Could not delete contact", description: error.message || "Please try again.", variant: "destructive" });
      return;
    }

    if (managedPhotoPath) {
      await supabase.storage.from(BRAINO_CONTACT_PHOTO_BUCKET).remove([managedPhotoPath]).catch(() => undefined);
    }
    setContacts((prev) => prev.filter((item) => item.id !== contact.id));
    toast({ title: "Contact deleted", description: `${contact.name} is no longer in Braino's contact memory.` });
  };

  const handleSaveOverallMemory = async () => {
    if (!user) return;
    setOverallMemorySaving(true);
    setOverallMemoryError(null);

    const nextValue = overallMemoryDraft.trim();
    const { error } = await supabase
      .from("profiles")
      .update({ overall_memory: nextValue })
      .eq("user_id", user.id);

    if (error) {
      setOverallMemoryError(error.message || "Could not save overall memory.");
      setOverallMemorySaving(false);
      return;
    }

    setOverallMemory(nextValue);
    setOverallMemorySaving(false);
    setOverallMemorySaved(true);
    window.setTimeout(() => setOverallMemorySaved(false), 2500);
  };

  // Memory Engine — master on/off toggle.
  const handleToggleMemory = async (next: boolean) => {
    if (!user) return;
    setMemoryEnabled(next);
    setMemoryToggleSaving(true);
    const { error } = await supabase.from("profiles").update({ memory_enabled: next }).eq("user_id", user.id);
    setMemoryToggleSaving(false);
    if (error) {
      setMemoryEnabled(!next);
      toast({ title: "Could not update memory setting", description: error.message || "Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: next ? "Memory on" : "Memory off", description: next ? "Braino will keep learning about you." : "Braino won't save new memories." });
  };

  // Personality — "let Braino swear" toggle (merges into personality_settings jsonb).
  const handleToggleSwearing = async (next: boolean) => {
    if (!user) return;
    setSwearingEnabled(next);
    setSwearingSaving(true);
    const { data: cur } = await supabase.from("profiles").select("personality_settings").eq("user_id", user.id).maybeSingle();
    const merged = { ...((cur as { personality_settings?: Record<string, unknown> } | null)?.personality_settings || {}), swearing: next };
    const { error } = await supabase.from("profiles").update({ personality_settings: merged }).eq("user_id", user.id);
    setSwearingSaving(false);
    if (error) {
      setSwearingEnabled(!next);
      toast({ title: "Could not update setting", description: error.message || "Please try again.", variant: "destructive" });
      return;
    }
    toast({ title: next ? "Swearing on" : "Swearing off", description: next ? "Braino can talk like a friend now." : "Braino keeps it clean." });
  };

  // Memory Engine — delete one auto-remembered fact.
  const handleDeleteBrainoMemory = async (id: string) => {
    setBrainoMemories((prev) => prev.filter((m) => m.id !== id));
    if (editingMemoryId === id) setEditingMemoryId(null);
    await supabase.from("braino_memories").delete().eq("id", id);
  };

  // Memory Engine — save an inline edit to a memory's content.
  const handleSaveBrainoMemoryEdit = async (id: string) => {
    const next = editingMemoryDraft.trim();
    setEditingMemoryId(null);
    if (!next) return;
    setBrainoMemories((prev) => prev.map((m) => (m.id === id ? { ...m, content: next } : m)));
    await supabase.from("braino_memories").update({ content: next, source: "user", updated_at: new Date().toISOString() }).eq("id", id);
  };

  // Voice Commands — create a new mode ("group"). Position = end of list.
  const handleCreateVoiceMode = async () => {
    if (!user) return;
    const name = newModeName.trim();
    if (!name) return;
    setNewModeName("");
    const position = voiceModes.length;
    const { data, error } = await (supabase as any)
      .from("voice_modes")
      .insert({ user_id: user.id, name, position })
      .select("id,name,notch_color,is_active,is_hidden,position")
      .single();
    if (error || !data) {
      toast({ title: "Could not create mode", description: error?.message || "Please try again.", variant: "destructive" });
      return;
    }
    setVoiceModes((prev) => [...prev, { ...(data as Omit<VoiceMode, "commands">), commands: [] }]);
  };

  // Voice Commands — rename a mode inline.
  const handleRenameVoiceMode = async (modeId: string, name: string) => {
    setVoiceModes((prev) => prev.map((m) => (m.id === modeId ? { ...m, name } : m)));
    await (supabase as any).from("voice_modes").update({ name, updated_at: new Date().toISOString() }).eq("id", modeId);
  };

  // Voice Commands — change a mode's notch boot-up color.
  const handleChangeModeColor = async (modeId: string, notch_color: string) => {
    setVoiceModes((prev) => prev.map((m) => (m.id === modeId ? { ...m, notch_color } : m)));
    await (supabase as any).from("voice_modes").update({ notch_color, updated_at: new Date().toISOString() }).eq("id", modeId);
  };

  // Voice Commands — move a mode in/out of the hidden folder.
  const handleToggleModeHidden = async (modeId: string, is_hidden: boolean) => {
    setVoiceModes((prev) => prev.map((m) => (m.id === modeId ? { ...m, is_hidden } : m)));
    await (supabase as any).from("voice_modes").update({ is_hidden, updated_at: new Date().toISOString() }).eq("id", modeId);
  };

  // Voice Commands — delete a mode (cascades to its commands + urls).
  const handleDeleteVoiceMode = async (modeId: string) => {
    setVoiceModes((prev) => prev.filter((m) => m.id !== modeId));
    await (supabase as any).from("voice_modes").delete().eq("id", modeId);
  };

  // Voice Commands — add a command (phrase + first URL) to a mode.
  const handleAddVoiceCommand = async (modeId: string) => {
    if (!user) return;
    const draft = newCommandDraft[modeId];
    const phrase = draft?.phrase?.trim();
    const url = draft?.url?.trim();
    if (!phrase || !url) return;
    const mode = voiceModes.find((m) => m.id === modeId);
    const position = mode?.commands.length || 0;
    const { data: cmdData, error: cmdError } = await (supabase as any)
      .from("voice_commands")
      .insert({ user_id: user.id, mode_id: modeId, phrase, open_mode: draft.openMode || "tab", position })
      .select("id,mode_id,phrase,open_mode,position")
      .single();
    if (cmdError || !cmdData) {
      toast({ title: "Could not add command", description: cmdError?.message || "Please try again.", variant: "destructive" });
      return;
    }
    const { data: urlData } = await (supabase as any)
      .from("voice_command_urls")
      .insert({ command_id: cmdData.id, url, position: 0 })
      .select("id,command_id,url,position")
      .single();
    setNewCommandDraft((prev) => ({ ...prev, [modeId]: { phrase: "", url: "", openMode: "tab" } }));
    setVoiceModes((prev) =>
      prev.map((m) =>
        m.id === modeId
          ? { ...m, commands: [...m.commands, { ...(cmdData as Omit<VoiceCommand, "urls">), urls: urlData ? [urlData as VoiceCommandUrl] : [] }] }
          : m,
      ),
    );
  };

  // Voice Commands — delete a command entirely.
  const handleDeleteVoiceCommand = async (modeId: string, commandId: string) => {
    setVoiceModes((prev) => prev.map((m) => (m.id === modeId ? { ...m, commands: m.commands.filter((c) => c.id !== commandId) } : m)));
    await (supabase as any).from("voice_commands").delete().eq("id", commandId);
  };

  // Voice Commands — toggle a command's tab / incognito open mode.
  const handleToggleCommandOpenMode = async (modeId: string, commandId: string, open_mode: "tab" | "incognito") => {
    setVoiceModes((prev) =>
      prev.map((m) => (m.id === modeId ? { ...m, commands: m.commands.map((c) => (c.id === commandId ? { ...c, open_mode } : c)) } : m)),
    );
    await (supabase as any).from("voice_commands").update({ open_mode, updated_at: new Date().toISOString() }).eq("id", commandId);
  };

  // Voice Commands — add another URL to a command; Braino opens a random subset (1..N) of these on trigger.
  const handleAddCommandUrl = async (modeId: string, commandId: string, url: string) => {
    const clean = url.trim();
    if (!clean) return;
    const mode = voiceModes.find((m) => m.id === modeId);
    const command = mode?.commands.find((c) => c.id === commandId);
    const position = command?.urls.length || 0;
    const { data, error } = await (supabase as any)
      .from("voice_command_urls")
      .insert({ command_id: commandId, url: clean, position })
      .select("id,command_id,url,position")
      .single();
    if (error || !data) return;
    setVoiceModes((prev) =>
      prev.map((m) =>
        m.id === modeId
          ? { ...m, commands: m.commands.map((c) => (c.id === commandId ? { ...c, urls: [...c.urls, data as VoiceCommandUrl] } : c)) }
          : m,
      ),
    );
  };

  // Voice Commands — remove one URL from a command.
  const handleDeleteCommandUrl = async (modeId: string, commandId: string, urlId: string) => {
    setVoiceModes((prev) =>
      prev.map((m) =>
        m.id === modeId
          ? { ...m, commands: m.commands.map((c) => (c.id === commandId ? { ...c, urls: c.urls.filter((u) => u.id !== urlId) } : c)) }
          : m,
      ),
    );
    await (supabase as any).from("voice_command_urls").delete().eq("id", urlId);
  };

  // Voice Commands — register this device's fingerprint/biometric as the hidden-folder key.
  const handleRegisterHiddenModesFingerprint = async () => {
    if (!user) return;
    if (!window.PublicKeyCredential) {
      toast({ title: "Not supported", description: "This browser/device doesn't support fingerprint unlock.", variant: "destructive" });
      return;
    }
    // Refuse to start unless a real biometric sensor is wired to this browser. Without the check the
    // browser happily falls back to its passkey sheet and starts asking for account passwords.
    const hasTouchId = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
    if (!hasTouchId) {
      toast({
        title: "No fingerprint on this device",
        description: "Turn on Touch ID (or Windows Hello) for this browser, then try again.",
        variant: "destructive",
      });
      return;
    }
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBytes = new TextEncoder().encode(user.id);
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "Braino", id: brainoRpId() },
          user: { id: userIdBytes, name: user.email || "braino-user", displayName: displayName || "Braino user" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          // Device-bound and non-discoverable on purpose: a discoverable/resident key gets synced into
          // iCloud Keychain, which is what turns this into a "passkey for trybraino.com" password prompt.
          // Discouraged keeps it in the browser's local Touch ID keychain, so the sensor is the only key.
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            residentKey: "discouraged",
            requireResidentKey: false,
            userVerification: "required",
          },
          attestation: "none",
          hints: ["client-device"],
          timeout: 60000,
        } as PublicKeyCredentialCreationOptions,
      })) as PublicKeyCredential | null;
      if (!credential) throw new Error("No credential returned");
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      await supabase.from("profiles").update({ hidden_modes_credential_id: credentialId }).eq("user_id", user.id);
      setHiddenModesCredentialId(credentialId);
      setHiddenFolderNeedsSetup(false);
      setHiddenFolderUnlocked(true);
      toast({ title: "Fingerprint set", description: "This device can now unlock your hidden modes." });
    } catch (err) {
      toast({ title: "Could not register fingerprint", description: (err as Error)?.message || "Please try again.", variant: "destructive" });
    }
  };

  // Voice Commands — prompt the registered fingerprint/biometric to unlock the hidden folder for this session.
  const handleUnlockHiddenFolder = async () => {
    if (!hiddenModesCredentialId) return;
    setHiddenFolderUnlocking(true);
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const padded = hiddenModesCredentialId.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((hiddenModesCredentialId.length + 3) % 4);
      const rawId = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: brainoRpId(),
          // "internal" transport + the client-device hint pin this to the fingerprint sensor on this
          // machine. Leave them out and the browser offers phone / security key / synced passkey first.
          allowCredentials: [{ id: rawId, type: "public-key", transports: ["internal"] as AuthenticatorTransport[] }],
          userVerification: "required",
          hints: ["client-device"],
          timeout: 60000,
        } as PublicKeyCredentialRequestOptions,
      });
      if (!assertion) throw new Error("No assertion returned");
      setHiddenFolderNeedsSetup(false);
      setHiddenFolderUnlocked(true);
    } catch (err) {
      // The stored key is device-bound, so a different browser or a wiped keychain can never match it.
      // Offer re-registration rather than leaving the folder permanently locked.
      setHiddenFolderNeedsSetup(true);
      toast({
        title: "Unlock failed",
        description: "Fingerprint didn't match, or this device was never set up. Tap \"Use this device\" to register it.",
        variant: "destructive",
      });
    } finally {
      setHiddenFolderUnlocking(false);
    }
  };

  const handleToggleAutoMode = async (field: "auto_posting_enabled" | "auto_reply_enabled", value: boolean) => {
    if (!user) return;
    setXAutoToggling(field === "auto_posting_enabled" ? "posting" : "reply");
    const { error } = await (supabase as any).from("x_auto_persona").upsert(
      { user_id: user.id, [field]: value },
      { onConflict: "user_id" }
    );
    if (!error) {
      if (field === "auto_posting_enabled") setXAutoPostingEnabled(value);
      else setXAutoReplyEnabled(value);
      if (value && !xConn) {
        toast({ title: "X account not linked", description: "Connect your X account below — the pipeline will start once linked." });
      }
    } else {
      toast({ title: "Could not save", description: error.message || "Check that the DB migration has been applied.", variant: "destructive" });
    }
    setXAutoToggling(null);
  };

  const handlePostsPerDayChange = async (value: number) => {
    if (!user) return;
    setXPostsPerDay(value);
    await (supabase as any).from("x_auto_persona").upsert(
      { user_id: user.id, posts_per_day: value, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  };

  const handleSavePersona = async () => {
    if (!user) return;
    setXPersonaSaving(true);
    setXPersonaSaveError(null);
    setXPersonaVerified(null);

    const { error: upsertError } = await (supabase as any).from("x_auto_persona").upsert(
      { user_id: user.id, ...xPersonaDraft, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      setXPersonaSaveError(upsertError.message || "Failed to save — check Supabase migration is applied.");
      setXPersonaSaving(false);
      return;
    }

    // Read back what was actually written to confirm it's in the DB
    const { data: verified, error: readError } = await (supabase as any)
      .from("x_auto_persona")
      .select("display_name,bio,what_building,tone_notes,content_source")
      .eq("user_id", user.id)
      .maybeSingle();

    if (readError || !verified) {
      setXPersonaSaveError(readError?.message || "Saved but could not verify — try refreshing.");
      setXPersonaSaving(false);
      return;
    }

    setXPersona({ ...xPersonaDraft });
    setXPersonaVerified(verified);
    setXPersonaSaving(false);
    setXPersonaSaved(true);
    window.setTimeout(() => { setXPersonaSaved(false); setXPersonaVerified(null); }, 5000);
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
      <div className="bd-root min-h-screen bg-[var(--sb-bg)]">
        <div className="grid min-h-screen lg:grid-cols-[244px_minmax(0,1fr)]">
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
    <div className="bd-root min-h-screen bg-[var(--sb-bg)] text-[var(--sb-ink)]">
      <BrainoDefs />
      <WebbDefs />
      <div
        className="grid min-h-screen transition-[grid-template-columns] duration-300"
        style={{ gridTemplateColumns: sidebarCollapsed ? "64px minmax(0,1fr)" : "244px minmax(0,1fr)" }}
      >
        <aside className={cn(
          "bd-sidebar hidden py-[22px] lg:flex transition-all duration-300",
          sidebarCollapsed ? "px-2 items-center" : "px-4",
        )}>
          <div className={cn("flex items-center pb-5", sidebarCollapsed ? "justify-center" : "justify-between")}>
            {sidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--sb-ink-3)] transition-colors hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
            <>
            <Link
              to="/"
              className="flex items-center gap-2 px-2 no-underline"
            >
            {/* Brain SVG logo */}
            <svg viewBox="0 0 100 100" style={{ width: 26, height: 26, flexShrink: 0 }}>
              <defs>
                <linearGradient id="sb-logo-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#F6A8A2" />
                  <stop offset="0.55" stopColor="#E8786E" />
                  <stop offset="1" stopColor="#C9544A" />
                </linearGradient>
                <radialGradient id="sb-logo-glow" cx="35%" cy="30%" r="50%">
                  <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" />
                  <stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sb-logo-fill)" />
              <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#sb-logo-glow)" />
              <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
              <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
              <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
              <circle cx="38" cy="48" r="6.5" fill="white" />
              <circle cx="38" cy="48" r="3.2" fill="#1B1713" />
              <circle cx="39" cy="47.6" r="1.1" fill="white" />
              <circle cx="62" cy="48" r="6.5" fill="white" />
              <circle cx="62" cy="48" r="3.2" fill="#1B1713" />
              <circle cx="63" cy="47.6" r="1.1" fill="white" />
              <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
              <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
              <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span
              style={{
                fontFamily: "'BeVietnam', sans-serif",
                fontWeight: 800,
                fontSize: 17,
                color: "var(--sb-ink)",
                letterSpacing: "-0.03em",
              }}
            >Braino</span>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              title="Collapse sidebar"
              className="grid h-6 w-6 place-items-center rounded-md text-[var(--sb-ink-3)] transition-colors hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink)]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            </>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/#install")}
            title={sidebarCollapsed ? "Talk to Braino" : undefined}
            className={cn(
              "mb-5 flex w-full items-center gap-2 rounded-[10px] bg-[var(--sb-ink)] py-3 text-left text-[13.5px] font-medium text-[var(--sb-on-ink)] transition hover:opacity-90",
              sidebarCollapsed ? "justify-center px-0" : "px-3",
            )}
          >
            <span
              className="h-4 w-4 flex-shrink-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 35%, #FFD9A8, #F39A42, #D96E1A)",
                boxShadow: "0 0 8px rgba(243,154,66,0.6)",
              }}
            />
            {!sidebarCollapsed && (
              <>
                <span>Talk to Braino</span>
                <span style={monoStyle} className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                  CMD K
                </span>
              </>
            )}
          </button>

          {/* Two worlds, then the tree beneath the one you are in. A single
              flat list of twenty items is a filing cabinet; this is a product
              with two halves that happen to share a character. */}
          {!sidebarCollapsed && (
            <div className="bd-worlds">
              {(["companion", "foundry"] as DashboardWorld[]).map((w) => (
                <button
                  key={w}
                  type="button"
                  className={cn("bd-world", world === w && "active")}
                  onClick={() => {
                    setWorld(w);
                    const first = NAV[w][0]?.children?.[0]?.id;
                    if (first) setActiveTab(first);
                  }}
                >
                  {w === "companion" ? "Companion" : "Foundry"}
                </button>
              ))}
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {NAV[world].map((group) => (
              <div key={group.label} className="bd-nav-sec">
                {!sidebarCollapsed && <div className="bd-nav-grp">{group.label}</div>}
                <div className="space-y-0.5 w-full">
                  {(group.children || []).map((child) => (
                    <SidebarItem
                      key={child.id}
                      collapsed={sidebarCollapsed}
                      label={child.label}
                      active={activeTab === child.id}
                      onClick={() => child.id && setActiveTab(child.id)}
                      icon={<span className="bd-nav-dot" aria-hidden />}
                      badge={
                        child.badge === "notes" ? <span style={monoStyle}>{notes.length}</span>
                        : child.badge === "memory" ? <span style={monoStyle}>{brainoMemories.length}</span>
                        : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bd-side-foot mt-auto w-full">
            {!sidebarCollapsed && (
              <div className="bd-invert mb-3 overflow-hidden rounded-xl p-4">
                <div style={monoStyle} className="bd-invert-accent mb-2 text-[10px] uppercase tracking-[0.12em]">
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
            )}

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              title={sidebarCollapsed ? (profile?.display_name || firstName) : undefined}
              className={cn("bd-profile w-full", sidebarCollapsed && "justify-center")}
            >
              <div className="bd-avatar">
                {getInitials(profile?.display_name || user.email || "SB")}
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="bd-pn truncate">{profile?.display_name || firstName}</div>
                    <div className="bd-pb">{isPremium ? "Premium" : "Free"}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[var(--sb-ink-3)]" />
                </>
              )}
            </button>

          </div>
        </aside>

        <main className="min-w-0">
          <div className="bd-topbar px-4 md:!px-10">
            <span className="bd-tt hidden md:inline">{dashboardTabLabel(activeTab)}</span>

            <label className="bd-search">
              <Search className="h-[15px] w-[15px] flex-shrink-0" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={topSearchPlaceholder}
              />
              <span className="bd-kbd hidden md:inline-flex">CMD K</span>
            </label>

            <div className="flex items-center gap-1.5">
              <button className="grid h-8 w-8 place-items-center rounded-lg text-[var(--sb-ink-3)] transition hover:bg-[var(--sb-panel)] hover:text-[var(--sb-ink)]">
                <Bell className="h-4 w-4" />
              </button>
              <button className="grid h-8 w-8 place-items-center rounded-lg text-[var(--sb-ink-3)] transition hover:bg-[var(--sb-panel)] hover:text-[var(--sb-ink)]">
                <HelpCircle className="h-4 w-4" />
              </button>
              <Link to="/channels">
                <button className="bd-btn hidden md:inline-flex">
                  Distribution
                </button>
              </Link>
              <Link to="/remote-agent">
                <button className="bd-btn dark hidden md:inline-flex">
                  <Plus className="h-3.5 w-3.5" />
                  New task
                </button>
              </Link>
            </div>
          </div>

          <div className="bd-pane">
            {activeTab === "overview" && (
            <>
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
                <div style={monoStyle} className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.06em] text-[var(--sb-ink-3)]">
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
            </>
            )}

            {activeTab === "overview" && (
              <div>
                <div className="mb-8 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
                  <div className="bd-invert relative overflow-hidden rounded-[18px] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span style={monoStyle} className="bd-invert-accent text-[10.5px] uppercase tracking-[0.14em]">
                        Tasks done
                      </span>
                      <span className="bd-invert-accent grid h-[22px] w-[22px] place-items-center rounded-md bg-white/10">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <div style={serifStyle} className="mb-1 flex items-end gap-1 text-5xl leading-none tracking-[-0.03em]">
                      <span className="bd-invert-accent italic">{doneTasks}</span>
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

                <div className="mb-8 overflow-hidden rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)]">
                  <div className="grid gap-5 px-6 pb-6 pt-5 xl:grid-cols-[1.35fr_0.9fr]">
                    <div>
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                          <div style={monoStyle} className="mb-2 text-[10.5px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                            API spend
                          </div>
                          <h3 style={serifStyle} className="text-[28px] leading-none tracking-[-0.02em]">
                            OpenAI costs, <em className="text-[var(--sb-accent-deep)]">including Realtime.</em>
                          </h3>
                          <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                            {aiCostSummary?.scopedProjectIds?.length
                              ? `Scoped to ${aiCostSummary.scopedProjectIds.length} OpenAI project${aiCostSummary.scopedProjectIds.length === 1 ? "" : "s"}.`
                              : "All spend billed to this OpenAI org is counted here, including browser Realtime sessions."}
                          </div>
                        </div>
                        <span className="grid h-9 w-9 place-items-center rounded-[12px] bg-[var(--sb-bg-2)] text-[var(--sb-accent-deep)]">
                          <Sparkles className="h-4 w-4" />
                        </span>
                      </div>

                      {aiCostLoading && !aiCostSummary ? (
                        <div className="space-y-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                              <Skeleton key={index} className="h-28 rounded-[16px] bg-[var(--sb-bg-2)]" />
                            ))}
                          </div>
                          <Skeleton className="h-28 rounded-[18px] bg-[var(--sb-bg-2)]" />
                        </div>
                      ) : aiCostSummary ? (
                        <>
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="rounded-[16px] border border-[var(--sb-line)] bg-[var(--sb-panel)] p-4">
                              <div style={monoStyle} className="mb-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                Tracked total
                              </div>
                              <div style={serifStyle} className="text-[34px] leading-none tracking-[-0.03em] text-[var(--sb-ink)]">
                                {formatMoney(aiCostSummary.trackedTotalUsd, aiCostSummary.currency)}
                              </div>
                              <div className="mt-2 text-[13px] text-[var(--sb-ink-2)]">
                                Since {formatLongDate(aiCostSummary.trackingStartDate)}
                              </div>
                            </div>

                            <div className="rounded-[16px] border border-[var(--sb-line)] bg-[var(--sb-panel)] p-4">
                              <div style={monoStyle} className="mb-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                This month
                              </div>
                              <div style={serifStyle} className="text-[34px] leading-none tracking-[-0.03em] text-[var(--sb-ink)]">
                                {formatMoney(aiCostSummary.currentMonthUsd, aiCostSummary.currency)}
                              </div>
                              <div className="mt-2 text-[13px] text-[var(--sb-ink-2)]">
                                Live dashboard total for the current calendar month
                              </div>
                            </div>

                            <div className="rounded-[16px] border border-[var(--sb-line)] bg-[var(--sb-panel)] p-4">
                              <div style={monoStyle} className="mb-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                Last 30 days
                              </div>
                              <div style={serifStyle} className="text-[34px] leading-none tracking-[-0.03em] text-[var(--sb-ink)]">
                                {formatMoney(aiCostSummary.last30DaysUsd, aiCostSummary.currency)}
                              </div>
                              <div className="mt-2 text-[13px] text-[var(--sb-ink-2)]">
                                {formatCount(aiCostSummary.requestCountLast30Days)} completions / realtime requests in the latest usage window
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                            <div className="rounded-[18px] border border-[var(--sb-line)] bg-[var(--sb-panel)] p-4">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                  30-day cost trend
                                </div>
                                <div style={monoStyle} className="text-[10.5px] text-[var(--sb-ink-3)]">
                                  {aiCostError
                                    ? "Last refresh failed"
                                    : `Updated ${timeAgo(aiCostSummary.lastUpdatedAt)}`}
                                </div>
                              </div>
                              <div className="text-[13px] text-[var(--sb-ink-2)]">
                                Use this to catch runaway voice sessions fast. If Realtime spikes, it will show up in the org costs even when the audio session started in the browser.
                              </div>
                              <div className="mt-4 flex items-end justify-between gap-4">
                                <div className="max-w-[280px]">
                                  <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                    Biggest line item
                                  </div>
                                  <div className="mt-1 text-sm font-medium text-[var(--sb-ink)]">
                                    {topCostLineItem?.lineItem || "No breakdown yet"}
                                  </div>
                                  <div className="mt-1 text-[13px] text-[var(--sb-ink-2)]">
                                    {topCostLineItem
                                      ? `${formatMoney(topCostLineItem.costUsd, topCostLineItem.currency)} in the last 30 days`
                                      : "Spend details will populate after the first successful sync."}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                    Top model activity
                                  </div>
                                  <div className="mt-1 text-sm font-medium text-[var(--sb-ink)]">
                                    {topCostModel?.model || "No model usage yet"}
                                  </div>
                                  <div className="mt-1 text-[13px] text-[var(--sb-ink-2)]">
                                    {topCostModel
                                      ? `${formatCount(topCostModel.requests)} requests in the last 30 days`
                                      : "Model usage appears after OpenAI usage data comes through."}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-[18px] border border-[var(--sb-line)] bg-[linear-gradient(180deg,var(--sb-panel)_0%,rgba(255,255,255,0.78)_100%)] p-4">
                              <div className="mb-2 flex items-center justify-between">
                                <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                  Daily burn
                                </div>
                                <div style={monoStyle} className="text-[10.5px] text-[var(--sb-ink-3)]">
                                  30d
                                </div>
                              </div>
                              <svg className="h-[76px] w-full" viewBox="0 0 260 76" preserveAspectRatio="none">
                                <path d={areaPath(aiCostSparkPoints, 76, 6)} fill="rgba(226,125,57,0.14)" />
                                <path d={linePath(aiCostSparkPoints)} fill="none" stroke="oklch(0.66 0.18 52)" strokeWidth="2" />
                              </svg>
                              <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--sb-ink-2)]">
                                <span>{aiCostSummary.dailyCosts[0] ? shortDate(aiCostSummary.dailyCosts[0].date) : "—"}</span>
                                <span>{aiCostSummary.dailyCosts[aiCostSummary.dailyCosts.length - 1] ? shortDate(aiCostSummary.dailyCosts[aiCostSummary.dailyCosts.length - 1].date) : "—"}</span>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-5 py-6 text-sm text-[var(--sb-ink-3)]">
                          <div>{aiCostError?.message || "No OpenAI cost data is available yet."}</div>
                          {aiCostError?.setupUrl ? (
                            <a
                              href={aiCostError.setupUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-[13px] font-medium text-[var(--sb-accent-deep)] transition hover:opacity-80"
                            >
                              Open OpenAI admin keys →
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[18px] border border-[var(--sb-line)] bg-[var(--sb-panel)] p-4">
                        <div style={monoStyle} className="mb-3 text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                          Top cost drivers
                        </div>
                        {aiCostSummary?.lineItemBreakdownLast30Days?.length ? (
                          <div className="space-y-3">
                            {aiCostSummary.lineItemBreakdownLast30Days.slice(0, 4).map((item) => (
                              <div key={item.lineItem} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-[var(--sb-ink)]">{item.lineItem}</div>
                                  <div style={monoStyle} className="mt-1 text-[10.5px] text-[var(--sb-ink-3)]">
                                    Last 30 days
                                  </div>
                                </div>
                                <div style={monoStyle} className="text-[12px] text-[var(--sb-ink)]">
                                  {formatMoney(item.costUsd, item.currency)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-[var(--sb-ink-3)]">
                            Cost line items will appear after the first sync from OpenAI.
                          </div>
                        )}
                      </div>

                      <div className="rounded-[18px] border border-[var(--sb-line)] bg-[var(--sb-panel)] p-4">
                        <div style={monoStyle} className="mb-3 text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                          Model activity
                        </div>
                        {aiCostSummary?.modelBreakdownLast30Days?.length ? (
                          <div className="space-y-3">
                            {aiCostSummary.modelBreakdownLast30Days.slice(0, 4).map((item) => (
                              <div key={item.model} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-[var(--sb-ink)]">{item.model}</div>
                                  <div style={monoStyle} className="mt-1 text-[10.5px] text-[var(--sb-ink-3)]">
                                    {formatCount(item.requests)} requests
                                  </div>
                                </div>
                                <div style={monoStyle} className="text-right text-[10.5px] text-[var(--sb-ink-3)]">
                                  <div>in {formatCount(item.inputTokens + item.inputAudioTokens)}</div>
                                  <div>out {formatCount(item.outputTokens + item.outputAudioTokens)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-[var(--sb-ink-3)]">
                            Model usage will show here once the usage API returns data for recent calls.
                          </div>
                        )}
                      </div>
                    </div>
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

            {(activeTab === "notes" || activeTab === "meetings" || activeTab === "lectures") && (
              <div>
                <div className="bd-phead">
                  <h1>Everything, <span className="bd-serif-i">remembered.</span></h1>
                  <div className="bd-sub">{notes.length} notes captured across your workspaces. Searchable, and yours.</div>
                </div>
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
                <div className="bd-phead">
                  <h1>Delegate to the <span className="bd-serif-i">agent.</span></h1>
                  <div className="bd-sub">Tell Braino what to do in the browser and it runs the steps for you.</div>
                </div>
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
                <div className="bd-phead">
                  <h1>X on <span className="bd-serif-i">autopilot.</span></h1>
                  <div className="bd-sub">Braino drafts replies and schedules posts. You stay in control.</div>
                </div>
                {/* X sub-tab nav */}
                <div className="flex gap-1 rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-1">
                  {(["settings", "activity"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setXSubTab(tab)}
                      className={cn(
                        "flex-1 rounded-[10px] px-4 py-2 text-[13px] font-medium capitalize transition-colors",
                        xSubTab === tab
                          ? "bg-[var(--sb-ink)] text-[var(--sb-on-ink)]"
                          : "text-[var(--sb-ink-3)] hover:text-[var(--sb-ink)]"
                      )}
                    >
                      {tab === "activity" ? "Activity" : "Settings"}
                    </button>
                  ))}
                </div>

                {xSubTab === "settings" && (
                <>
                {/* Auto Mode control card */}
                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                  <div className="mb-5">
                    <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                      Auto <em className="text-[var(--sb-accent-deep)]">Mode.</em>
                    </h3>
                    <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                      24/7 autonomous pipeline — posts &amp; replies while you sleep
                    </div>
                  </div>
                  <div className="space-y-4">
                    {/* Auto Posting toggle */}
                    <div className="flex items-center justify-between rounded-xl border border-[var(--sb-line)] bg-[var(--sb-panel)] px-4 py-3">
                      <div>
                        <div className="text-[13px] font-medium text-[var(--sb-ink)]">Auto Posting</div>
                        <div style={monoStyle} className="mt-0.5 text-[11px] text-[var(--sb-ink-3)]">
                          {xAutoPostingEnabled
                            ? `Posts ${xPostsPerDay}× per day in your voice`
                            : "Braino will generate & schedule tweets daily"}
                        </div>
                      </div>
                      <Switch
                        checked={xAutoPostingEnabled}
                        onCheckedChange={(v) => handleToggleAutoMode("auto_posting_enabled", v)}
                        disabled={xAutoToggling === "posting"}
                      />
                    </div>

                    {/* Auto Reply toggle */}
                    <div className="flex items-center justify-between rounded-xl border border-[var(--sb-line)] bg-[var(--sb-panel)] px-4 py-3">
                      <div>
                        <div className="text-[13px] font-medium text-[var(--sb-ink)]">Auto Reply</div>
                        <div style={monoStyle} className="mt-0.5 text-[11px] text-[var(--sb-ink-3)]">
                          {xAutoReplyEnabled
                            ? "Legacy compatibility is on. Sessions still start manually and reply once per minute."
                            : "Optional compatibility toggle for the extension. Sessions are still the main control."}
                        </div>
                      </div>
                      <Switch
                        checked={xAutoReplyEnabled}
                        onCheckedChange={(v) => handleToggleAutoMode("auto_reply_enabled", v)}
                        disabled={xAutoToggling === "reply"}
                      />
                    </div>

                    {/* Posts per day selector */}
                    <div className="flex items-center gap-3 rounded-xl border border-[var(--sb-line)] bg-[var(--sb-panel)] px-4 py-3">
                      <div className="flex-1">
                        <div className="text-[13px] font-medium text-[var(--sb-ink)]">Posts per day</div>
                        <div style={monoStyle} className="mt-0.5 text-[11px] text-[var(--sb-ink-3)]">Spread evenly across the day · max 50</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePostsPerDayChange(Math.max(1, xPostsPerDay - 1))}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--sb-panel-2)] text-[var(--sb-ink-2)] hover:bg-[var(--sb-line)] transition-colors"
                        >−</button>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={xPostsPerDay}
                          onChange={e => {
                            const v = Math.min(50, Math.max(1, Number(e.target.value) || 1));
                            handlePostsPerDayChange(v);
                          }}
                          className="h-7 w-12 rounded-lg border border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-center text-[13px] font-medium text-[var(--sb-ink)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => handlePostsPerDayChange(Math.min(50, xPostsPerDay + 1))}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--sb-panel-2)] text-[var(--sb-ink-2)] hover:bg-[var(--sb-line)] transition-colors"
                        >+</button>
                      </div>
                    </div>

                    {/* Status row */}
                    <div style={monoStyle} className="flex flex-wrap gap-4 px-1 text-[11px] text-[var(--sb-ink-3)]">
                      {!xConn && (
                        <span className="text-amber-600">Link your X account below — required for the pipeline to run</span>
                      )}
                      {xNextPostAt && xConn && (
                        <span>
                          Next post:{" "}
                          <span className="text-[var(--sb-ink)]">
                            {new Date(xNextPostAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Voice & Style persona card */}
                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                        Your Voice &amp; <em className="text-[var(--sb-accent-deep)]">Style.</em>
                      </h3>
                      <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                        Shape how Braino sounds when it replies on X
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-[var(--sb-ink)]">Your name</label>
                      <Input
                        value={xPersonaDraft.display_name}
                        onChange={e => setXPersonaDraft(p => ({ ...p, display_name: e.target.value }))}
                        placeholder="e.g. Alex — how should Braino refer to you?"
                        className="rounded-xl border-[var(--sb-line-2)] bg-[var(--sb-panel)] text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-[var(--sb-ink)]">Tone &amp; style notes</label>
                      <Textarea
                        value={xPersonaDraft.tone_notes}
                        onChange={e => setXPersonaDraft(p => ({ ...p, tone_notes: e.target.value }))}
                        placeholder="e.g. casual, direct, founder energy, no corporate speak"
                        className="min-h-[80px] resize-none rounded-xl border-[var(--sb-line-2)] bg-[var(--sb-panel)] text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-[var(--sb-ink)]">Who you are</label>
                      <Textarea
                        value={xPersonaDraft.bio}
                        onChange={e => setXPersonaDraft(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Your background, role, what you care about…"
                        className="min-h-[80px] resize-none rounded-xl border-[var(--sb-line-2)] bg-[var(--sb-panel)] text-[13px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-[var(--sb-ink)]">What you&apos;re building</label>
                      <Textarea
                        value={xPersonaDraft.what_building}
                        onChange={e => setXPersonaDraft(p => ({ ...p, what_building: e.target.value }))}
                        placeholder="e.g. Building Braino, an AI browser companion at trybraino.com"
                        className="min-h-[80px] resize-none rounded-xl border-[var(--sb-line-2)] bg-[var(--sb-panel)] text-[13px]"
                      />
                    </div>
                  </div>

                  {/* Content source — full-width, large */}
                  <div className="mt-4">
                    <label className="mb-1.5 block text-[13px] font-medium text-[var(--sb-ink)]">
                      What to post about
                    </label>
                    <div style={monoStyle} className="mb-2 text-[11px] text-[var(--sb-ink-3)]">
                      Paste articles, notes, ideas, or a brief — Braino will generate every post from this material. No content source = generic posts.
                    </div>
                    <Textarea
                      value={xPersonaDraft.content_source}
                      onChange={e => setXPersonaDraft(p => ({ ...p, content_source: e.target.value }))}
                      placeholder={"Paste anything: an article, a list of talking points, a product update, your thoughts on a topic, raw notes...\n\nBraino will mine this for tweet ideas and write them in your voice."}
                      className="min-h-[200px] rounded-xl border-[var(--sb-line-2)] bg-[var(--sb-panel)] text-[13px] leading-relaxed"
                    />
                    <div style={monoStyle} className="mt-1.5 text-right text-[11px] text-[var(--sb-ink-4)]">
                      {xPersonaDraft.content_source.length > 0 ? `${xPersonaDraft.content_source.length.toLocaleString()} chars` : "no limit — paste as much as you want"}
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {xPersonaSaveError && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-600">
                        <span className="font-medium">Error:</span> {xPersonaSaveError}
                        {xPersonaSaveError.includes("migration") && (
                          <div className="mt-1 text-[12px] opacity-80">Run the SQL migration in Supabase first — see Dashboard instructions.</div>
                        )}
                      </div>
                    )}
                    {xPersonaSaved && xPersonaVerified && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-700">
                        <div className="mb-1 flex items-center gap-1.5 font-medium"><Check className="h-3.5 w-3.5" /> Synced to Braino — verified in DB</div>
                        <div style={monoStyle} className="space-y-0.5 text-[11px] opacity-80">
                          {xPersonaVerified.display_name && <div>name: {xPersonaVerified.display_name}</div>}
                          {xPersonaVerified.bio && <div>bio: {xPersonaVerified.bio.slice(0, 60)}{xPersonaVerified.bio.length > 60 ? "…" : ""}</div>}
                          {xPersonaVerified.what_building && <div>building: {xPersonaVerified.what_building.slice(0, 60)}{xPersonaVerified.what_building.length > 60 ? "…" : ""}</div>}
                          {xPersonaVerified.tone_notes && <div>style: {xPersonaVerified.tone_notes.slice(0, 60)}{xPersonaVerified.tone_notes.length > 60 ? "…" : ""}</div>}
                          {xPersonaVerified.content_source
                            ? <div className="text-emerald-600">content source: ✓ {xPersonaVerified.content_source.length.toLocaleString()} chars saved</div>
                            : <div className="opacity-50">content source: not set</div>}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSavePersona}
                        disabled={xPersonaSaving}
                        size="sm"
                        className={cn("gap-1.5 rounded-xl", xPersonaSaveError && "border-red-500/50 bg-red-500/10 text-red-600 hover:bg-red-500/20")}
                      >
                        {xPersonaSaved ? <><Check className="h-3.5 w-3.5" /> Synced</> : xPersonaSaving ? "Saving…" : xPersonaSaveError ? "Retry" : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                          Scheduled <em className="text-[var(--sb-accent-deep)]">posts.</em>
                        </h3>
                        <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                          Server-side queue for laptop-off posting
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full border px-3 py-1 text-[10px]",
                          xConn ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-[var(--sb-line)] bg-[var(--sb-panel)] text-[var(--sb-ink-3)]",
                        )}
                        style={monoStyle}
                      >
                        {xConn ? `Linked${xConn.username ? ` · @${xConn.username}` : ""}` : "X account not linked"}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                        <div className="mb-2 text-sm font-medium text-[var(--sb-ink)]">Post text</div>
                        <Textarea
                          value={xPostDraft}
                          onChange={(event) => setXPostDraft(event.target.value)}
                          placeholder={xConn ? "Draft the post Braino should send for you…" : "Connect X first to unlock scheduling."}
                          disabled={!xConn || xScheduling || xPostingNow}
                          className="min-h-[140px] rounded-[14px] border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-[14px] text-[var(--sb-ink)] placeholder:text-[var(--sb-ink-3)]"
                        />
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--sb-ink-3)]" style={monoStyle}>
                          <span>{xConn ? "Braino will send exactly this text." : "OAuth link required before the queue can post."}</span>
                          <span>{xPostDraft.length} chars</span>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[12px] font-medium text-[var(--sb-ink)]">Thread mode</span>
                            <span className="text-[11px] text-[var(--sb-ink-3)]" style={monoStyle}>
                              {xThreadMode ? "Each paragraph → separate tweet" : "Post everything as one tweet"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setXThreadMode((v) => !v)}
                            disabled={!xConn}
                            className={cn(
                              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                              xThreadMode ? "bg-[var(--sb-accent)]" : "bg-[var(--sb-line-2)]"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                                xThreadMode ? "translate-x-4" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>

                        {/* Media attachment */}
                        <input
                          ref={xMediaInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
                          className="hidden"
                          onChange={handleMediaFileSelect}
                        />
                        {xPostMediaUrl ? (
                          <div className="mt-3 flex items-center gap-3 rounded-[12px] border border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-2">
                            {xPostMediaUrl.match(/\.(mp4|mov|avi)$/i) ? (
                              <video src={xPostMediaUrl} className="h-14 w-20 rounded-[8px] object-cover" />
                            ) : (
                              <img src={xPostMediaUrl} alt="attached" className="h-14 w-20 rounded-[8px] object-cover" />
                            )}
                            <span className="flex-1 truncate text-[11px] text-[var(--sb-ink-3)]" style={monoStyle}>
                              Media attached
                            </span>
                            <button
                              onClick={() => setXPostMediaUrl(null)}
                              className="text-[11px] text-red-400 hover:text-red-500"
                              style={monoStyle}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => xMediaInputRef.current?.click()}
                            disabled={!user || xMediaUploading}
                            className="mt-3 flex items-center gap-2 rounded-[12px] border border-dashed border-[var(--sb-line)] px-3 py-2 text-[11px] text-[var(--sb-ink-3)] transition-colors hover:border-[var(--sb-ink-3)] hover:text-[var(--sb-ink-2)] disabled:opacity-50"
                            style={monoStyle}
                          >
                            {xMediaUploading ? "Uploading…" : "+ Attach image or video"}
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end">
                        <div>
                          <div className="mb-2 text-sm font-medium text-[var(--sb-ink)]">Schedule for</div>
                          <Input
                            type="datetime-local"
                            value={xScheduledAt}
                            onChange={(event) => setXScheduledAt(event.target.value)}
                            disabled={!xConn || xScheduling || xPostingNow}
                            className="h-11 rounded-[14px] border-[var(--sb-line)] bg-[var(--sb-panel)] text-[13.5px]"
                          />
                        </div>
                        <Button
                          onClick={handleScheduleXPost}
                          disabled={!xConn || xScheduling || xPostingNow}
                          className="h-11 rounded-[14px] bg-[var(--sb-ink)] px-5 text-[13px] text-[var(--sb-on-ink)] hover:opacity-90"
                        >
                          {xScheduling ? "Scheduling…" : "Schedule post"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handlePostXNow}
                          disabled={!xConn || xScheduling || xPostingNow || xDispatching}
                          className="h-11 rounded-[14px] border-[var(--sb-line)] bg-[var(--sb-panel)] px-5 text-[13px] text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                        >
                          {xPostingNow ? "Posting…" : "Post now"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={xConn ? handleDispatchScheduledXPosts : handleConnectX}
                          disabled={xConn ? xDispatching || xPostingNow : xConnectLoading}
                          className="h-11 rounded-[14px] border-[var(--sb-line)] bg-[var(--sb-panel)] px-5 text-[13px] text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                        >
                          {xConn ? (xDispatching ? "Dispatching…" : "Run due now") : (xConnectLoading ? "Waiting…" : "Connect X")}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                    <div className="mb-4">
                      <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                        Queue
                      </h3>
                      <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                        Pending, sent, and failed scheduled posts
                      </div>
                    </div>

                    {scheduledXPosts.filter((p) => p.status !== "cancelled").length ? (
                      <div className="space-y-3">
                        {scheduledXPosts.filter((p) => p.status !== "cancelled").map((post) => (
                          <div key={post.id} className="rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="whitespace-pre-wrap text-[14px] leading-6 text-[var(--sb-ink)]">{post.content}</p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "shrink-0 rounded-full border px-2.5 py-1 text-[10px]",
                                  post.status === "posted" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
                                  post.status === "failed" && "border-red-500/30 bg-red-500/10 text-red-600",
                                  post.status === "processing" && "border-amber-500/30 bg-amber-500/10 text-amber-700",
                                  post.status === "pending" && "border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-[var(--sb-ink-2)]",
                                  post.status === "cancelled" && "border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-[var(--sb-ink-3)]",
                                )}
                                style={monoStyle}
                              >
                                {post.status}
                              </Badge>
                            </div>
                            <div style={monoStyle} className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--sb-ink-3)]">
                              <span>Scheduled {formatDateTime(post.scheduled_at)}</span>
                              {post.posted_at ? <span>Posted {formatDateTime(post.posted_at)}</span> : null}
                              {post.x_post_id ? <span>Post ID {post.x_post_id}</span> : null}
                            </div>
                            {post.error_message ? (
                              <div className="mt-3 rounded-[12px] border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-700">
                                {post.error_message}
                              </div>
                            ) : null}
                            {(post.status === "pending" || post.status === "failed") ? (
                              <div className="mt-3 flex gap-2">
                                {post.status === "failed" && (
                                  <Button
                                    variant="outline"
                                    onClick={() => handleRetryScheduledXPost(post.id)}
                                    disabled={xRetryingId === post.id}
                                    className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                                  >
                                    {xRetryingId === post.id ? "Retrying…" : "Retry"}
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  onClick={() => handleCancelScheduledXPost(post.id)}
                                  disabled={xCancellingId === post.id}
                                  className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                                >
                                  {xCancellingId === post.id ? "Cancelling…" : "Cancel"}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-6 py-14 text-center text-sm text-[var(--sb-ink-3)]">
                        No scheduled X posts yet. Queue one here and the backend will handle delivery.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Total replies",
                      value: xTotalReplies.toLocaleString("en-US"),
                      hint: "Lifetime across finished X Auto sessions",
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
                      label: "Latest session",
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
                        Lifetime <em className="text-[var(--sb-accent-deep)]">summary.</em>
                      </h3>
                      <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                        Rolled up from your session history
                      </div>
                    </div>

                    {xAutomationStats ? (
                      <div className="space-y-4">
                        <div className="rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                          <div className="mb-2 text-sm font-medium text-[var(--sb-ink)]">Latest finished session</div>
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
                            <p>Posts at most one reply per minute during an active session.</p>
                            <p>Special-cases builder prompts so Braino can mention what it is building more naturally.</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-6 py-14 text-center text-sm text-[var(--sb-ink-3)]">
                        No X automation history yet. Extension reply stats will appear here after your first synced run.
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

                {/* Reply History log */}
                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                        Reply <em className="text-[var(--sb-accent-deep)]">History.</em>
                      </h3>
                      <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                        Recent reply rows across your X Auto sessions
                      </div>
                    </div>
                    <span style={monoStyle} className="rounded-full border border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[11px] text-[var(--sb-ink-3)]">
                      {xReplyLogs.length} logged
                    </span>
                  </div>
                  {xReplyLogs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--sb-line)] p-8 text-center text-[13px] text-[var(--sb-ink-3)]">
                      No reply rows yet. They&apos;ll appear here as soon as your first session starts surfacing mentions.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {xReplyLogs.map(log => (
                        <div key={log.id} className="rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span style={monoStyle} className="rounded-full bg-[var(--sb-accent-soft)] px-2 py-0.5 text-[11px] text-[var(--sb-accent-deep)] shrink-0">
                                @{log.post_author_handle || "unknown"}
                              </span>
                              <span
                                style={monoStyle}
                                className={cn("rounded-full px-2 py-0.5 text-[10px]", replyLogStatusClass(log.status))}
                              >
                                {log.status}
                              </span>
                              {log.post_author_display_name && (
                                <span className="truncate text-[12px] text-[var(--sb-ink-3)]">{log.post_author_display_name}</span>
                              )}
                            </div>
                            <span style={monoStyle} className="shrink-0 text-[11px] text-[var(--sb-ink-4)]">
                              {timeAgo(log.replied_at || log.discovered_at)}
                            </span>
                          </div>
                          <div className="mb-2">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--sb-ink-4)]">Tweet</span>
                            <p className="mt-0.5 line-clamp-2 text-[13px] text-[var(--sb-ink-2)]">{log.post_text}</p>
                          </div>
                          <div className="mb-3 border-l-2 border-[var(--sb-accent)] pl-3">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--sb-ink-4)]">Reply</span>
                            <p className="mt-0.5 text-[13px] text-[var(--sb-ink)]">{log.our_reply}</p>
                          </div>
                          {log.error_message ? (
                            <div className="mb-3 rounded-[12px] border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-600">
                              {log.error_message}
                            </div>
                          ) : null}
                          {log.post_url && (
                            <a
                              href={log.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-[var(--sb-ink-3)] hover:text-[var(--sb-accent)] transition-colors"
                              style={monoStyle}
                            >
                              <ExternalLink className="h-3 w-3" />
                              View on X
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </>
                )}

                {xSubTab === "activity" && (
                  <div className="space-y-5">
                    <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                          <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                            Session <em className="text-[var(--sb-accent-deep)]">Control.</em>
                          </h3>
                          <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                            Start one 3-hour X Auto reply session at a time. During an active session, Braino replies at most once per minute.
                          </div>
                        </div>
                        {xConn?.username === "brainosays" && (
                          <a
                            href="/live"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-2 text-[12px] text-[var(--sb-ink-2)] hover:border-[var(--sb-accent)] hover:text-[var(--sb-accent)] transition-colors"
                            style={monoStyle}
                          >
                            <ExternalLink className="h-3 w-3" />
                            View public live page
                          </a>
                        )}
                      </div>
                      {!xConn && (
                        <div style={monoStyle} className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[11px] text-amber-700">
                          Link your X account in Settings before starting a session.
                        </div>
                      )}
                      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                        <div className="rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-5">
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full border px-3 py-1 text-[10px]",
                                xSessionFocus ? sessionStatusClass(xSessionFocus.status) : "border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-[var(--sb-ink-3)]",
                              )}
                              style={monoStyle}
                            >
                              {xSessionFocus ? `Session ${xSessionFocus.session_number} · ${sessionStatusLabel(xSessionFocus.status)}` : "No session yet"}
                            </Badge>
                            {activeXSession ? (
                              <span style={monoStyle} className="text-[11px] text-[var(--sb-ink-3)]">
                                Ends in {formatCountdown(activeSessionTimeRemainingMs)}
                              </span>
                            ) : cooldownTimeRemainingMs > 0 ? (
                              <span style={monoStyle} className="text-[11px] text-[var(--sb-ink-3)]">
                                Next session available in {formatCountdown(cooldownTimeRemainingMs)}
                              </span>
                            ) : (
                              <span style={monoStyle} className="text-[11px] text-[var(--sb-ink-3)]">
                                Ready to start a fresh 3-hour session
                              </span>
                            )}
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                              {
                                label: "Replies posted",
                                value: xSessionFocus?.replies_posted ?? 0,
                              },
                              {
                                label: "Followers gained",
                                value: xSessionFocus?.followers_gained ?? 0,
                              },
                              {
                                label: "Replies received",
                                value: xSessionFocus?.replies_received ?? 0,
                              },
                              {
                                label: "Total views",
                                value: xSessionFocus?.total_views ?? 0,
                              },
                            ].map((item) => (
                              <div key={item.label} className="rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-4">
                                <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                  {item.label}
                                </div>
                                <div style={serifStyle} className="mt-2 text-[30px] leading-none tracking-[-0.03em] italic text-[var(--sb-accent-deep)]">
                                  {item.value.toLocaleString("en-US")}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button
                              onClick={handleStartXSession}
                              disabled={!xConn || xSessionStarting || !!activeXSession || cooldownTimeRemainingMs > 0}
                              className="rounded-xl bg-[var(--sb-ink)] px-4 text-[13px] text-[var(--sb-on-ink)] hover:opacity-90"
                            >
                              {xSessionStarting ? "Starting…" : "Start Session"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleStopXSession}
                              disabled={!activeXSession || xSessionStopping}
                              className="rounded-xl border-[var(--sb-line)] bg-[var(--sb-panel)] px-4 text-[13px] text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                            >
                              {xSessionStopping ? "Stopping…" : "Stop Session"}
                            </Button>
                          </div>
                          <div style={monoStyle} className="mt-4 text-[11px] text-[var(--sb-ink-3)]">
                            {activeXSession
                              ? `Session ${activeXSession.session_number} started ${timeAgo(activeXSession.started_at)} and will stop automatically at ${formatDateTime(activeXSession.ends_at)}.`
                              : latestXSession
                                ? `Latest session: Session ${latestXSession.session_number} · ${sessionStatusLabel(latestXSession.status)} · started ${formatDateTime(latestXSession.started_at)}`
                                : "No sessions have been started yet."}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 rounded-xl border border-[var(--sb-line)] bg-[var(--sb-panel)] px-4 py-3">
                            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", xGenerating ? "animate-pulse bg-emerald-500" : "bg-[var(--sb-line)]")} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-medium text-[var(--sb-ink)]">Generate posts</div>
                              <div style={monoStyle} className="mt-0.5 text-[11px] text-[var(--sb-ink-3)]">
                                {xGenerating
                                  ? "Generating tweets in your voice…"
                                  : xGenerateResult
                                    ? xGenerateResult
                                    : xNextPostAt
                                      ? `Next queued post: ${new Date(xNextPostAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}`
                                      : "Generates today's posts and queues them for dispatch"}
                              </div>
                            </div>
                            {xGenerating ? (
                              <button
                                onClick={handleStopGenerate}
                                style={monoStyle}
                                className="shrink-0 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-500 transition-colors hover:bg-red-500/20"
                              >
                                Stop
                              </button>
                            ) : (
                              <button
                                onClick={handleRunGenerate}
                                disabled={!xConn}
                                style={monoStyle}
                                className="shrink-0 rounded-lg border border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1.5 text-[11px] text-[var(--sb-ink)] transition-colors hover:bg-[var(--sb-bg-2)] disabled:opacity-40"
                              >
                                Run now
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-3 rounded-xl border border-[var(--sb-line)] bg-[var(--sb-panel)] px-4 py-3">
                            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", xEngaging ? "animate-pulse bg-emerald-500" : "bg-[var(--sb-line)]")} />
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-medium text-[var(--sb-ink)]">Run this minute's reply tick</div>
                              <div style={monoStyle} className="mt-0.5 text-[11px] text-[var(--sb-ink-3)]">
                                {xEngaging
                                  ? "Scanning active sessions and posting at most one reply each…"
                                  : xEngageResult
                                    ? xEngageResult
                                    : activeXSession
                                      ? `Session ${activeXSession.session_number} is live. One reply max per minute.`
                                      : "Useful for testing. It only does work if a session is active."}
                              </div>
                            </div>
                            {xEngaging ? (
                              <button
                                onClick={handleStopEngage}
                                style={monoStyle}
                                className="shrink-0 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-500 transition-colors hover:bg-red-500/20"
                              >
                                Stop
                              </button>
                            ) : (
                              <button
                                onClick={handleRunEngage}
                                disabled={!xConn || !activeXSession}
                                style={monoStyle}
                                className="shrink-0 rounded-lg border border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1.5 text-[11px] text-[var(--sb-ink)] transition-colors hover:bg-[var(--sb-bg-2)] disabled:opacity-40"
                              >
                                Run now
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                              Session <em className="text-[var(--sb-accent-deep)]">History.</em>
                            </h3>
                            <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                              Sortable history of every X Auto session
                            </div>
                          </div>
                          <span style={monoStyle} className="rounded-full border border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[11px] text-[var(--sb-ink-3)]">
                            {xAutoSessions.length} session{xAutoSessions.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        {sortedXAutoSessions.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-[var(--sb-line)] px-6 py-12 text-center text-[13px] text-[var(--sb-ink-3)]">
                            No sessions yet. Start one above and Braino will begin tracking replies, followers, views, and reply rows session by session.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-left">
                              <thead>
                                <tr style={monoStyle} className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                  {[
                                    ["session_number", "Session"],
                                    ["status", "Status"],
                                    ["started_at", "Started"],
                                    ["replies_posted", "Replies"],
                                    ["followers_gained", "Followers"],
                                    ["replies_received", "Replies got"],
                                    ["total_views", "Views"],
                                  ].map(([key, label]) => (
                                    <th key={key} className="border-b border-[var(--sb-line-2)] px-3 py-3 font-medium">
                                      <button
                                        onClick={() => handleXSessionSort(key as XSessionSortKey)}
                                        className="inline-flex items-center gap-1 transition-colors hover:text-[var(--sb-ink)]"
                                      >
                                        <span>{label}</span>
                                        <span>
                                          {xSessionSortKey === key ? (xSessionSortDirection === "desc" ? "↓" : "↑") : "↕"}
                                        </span>
                                      </button>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sortedXAutoSessions.map((sessionItem) => (
                                  <tr
                                    key={sessionItem.id}
                                    onClick={() => setSelectedXSessionId(sessionItem.id)}
                                    className={cn(
                                      "cursor-pointer border-b border-[var(--sb-line-2)] transition-colors hover:bg-[var(--sb-panel)]/70",
                                      selectedXSession?.id === sessionItem.id && "bg-[var(--sb-panel)]",
                                    )}
                                  >
                                    <td className="px-3 py-3">
                                      <div className="text-[13px] font-medium text-[var(--sb-ink)]">Session {sessionItem.session_number}</div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <span
                                        style={monoStyle}
                                        className={cn(
                                          "rounded-full border px-2.5 py-1 text-[10px]",
                                          sessionStatusClass(sessionItem.status),
                                        )}
                                      >
                                        {sessionStatusLabel(sessionItem.status)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-[12px] text-[var(--sb-ink-2)]">{formatDateTime(sessionItem.started_at)}</td>
                                    <td className="px-3 py-3 text-[12px] text-[var(--sb-ink-2)]">{sessionItem.replies_posted}</td>
                                    <td className="px-3 py-3 text-[12px] text-[var(--sb-ink-2)]">{sessionItem.followers_gained}</td>
                                    <td className="px-3 py-3 text-[12px] text-[var(--sb-ink-2)]">{sessionItem.replies_received}</td>
                                    <td className="px-3 py-3 text-[12px] text-[var(--sb-ink-2)]">{sessionItem.total_views.toLocaleString("en-US")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                              Session <em className="text-[var(--sb-accent-deep)]">Detail.</em>
                            </h3>
                            <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                              Per-reply rows for the selected session
                            </div>
                          </div>
                          {selectedXSession ? (
                            <span style={monoStyle} className="rounded-full border border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[11px] text-[var(--sb-ink-3)]">
                              Session {selectedXSession.session_number}
                            </span>
                          ) : null}
                        </div>

                        {!selectedXSession ? (
                          <div className="rounded-xl border border-dashed border-[var(--sb-line)] px-6 py-12 text-center text-[13px] text-[var(--sb-ink-3)]">
                            Select a session to inspect its reply rows.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              {[
                                ["Started", formatDateTime(selectedXSession.started_at)],
                                ["Stopped", selectedXSession.stopped_at ? formatDateTime(selectedXSession.stopped_at) : selectedXSession.status === "active" ? "Still active" : "—"],
                                ["Queued left", String(selectedXSession.replies_queued)],
                                ["Failed", String(selectedXSession.replies_failed)],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-3">
                                  <div style={monoStyle} className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                    {label}
                                  </div>
                                  <div className="mt-1 text-[13px] text-[var(--sb-ink)]">{value}</div>
                                </div>
                              ))}
                            </div>

                            {selectedXSessionLogs.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-[var(--sb-line)] px-5 py-10 text-center text-[13px] text-[var(--sb-ink-3)]">
                                No reply rows are logged for this session yet.
                              </div>
                            ) : (
                              <div className="max-h-[520px] overflow-x-auto overflow-y-auto rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)]">
                                <table className="min-w-[820px] text-left">
                                  <thead className="sticky top-0 bg-[var(--sb-panel)]">
                                    <tr style={monoStyle} className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--sb-ink-3)]">
                                      <th className="border-b border-[var(--sb-line-2)] px-3 py-3 font-medium">User</th>
                                      <th className="border-b border-[var(--sb-line-2)] px-3 py-3 font-medium">Mention</th>
                                      <th className="border-b border-[var(--sb-line-2)] px-3 py-3 font-medium">Reply</th>
                                      <th className="border-b border-[var(--sb-line-2)] px-3 py-3 font-medium">Status</th>
                                      <th className="border-b border-[var(--sb-line-2)] px-3 py-3 font-medium">Time</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedXSessionLogs.map((log) => (
                                      <tr key={log.id} className="border-b border-[var(--sb-line-2)] align-top last:border-b-0">
                                        <td className="px-3 py-3">
                                          <div className="flex min-w-0 flex-col gap-1">
                                            <span style={monoStyle} className="text-[11px] text-[var(--sb-accent-deep)]">
                                              @{log.post_author_handle || "unknown"}
                                            </span>
                                            {log.post_url ? (
                                              <a
                                                href={log.post_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] text-[var(--sb-ink-3)] transition-colors hover:text-[var(--sb-accent)]"
                                              >
                                                <ExternalLink className="h-3 w-3" />
                                                Open
                                              </a>
                                            ) : null}
                                          </div>
                                        </td>
                                        <td className="px-3 py-3">
                                          <p className="max-w-[220px] text-[12px] leading-5 text-[var(--sb-ink-2)]">{log.post_text}</p>
                                        </td>
                                        <td className="px-3 py-3">
                                          <div className="max-w-[240px] space-y-2">
                                            <p className="text-[12px] leading-5 text-[var(--sb-ink)]">{log.our_reply || "—"}</p>
                                            {log.error_message ? (
                                              <div className="rounded-[10px] border border-red-500/20 bg-red-500/5 px-2.5 py-2 text-[11px] text-red-600">
                                                {log.error_message}
                                              </div>
                                            ) : null}
                                          </div>
                                        </td>
                                        <td className="px-3 py-3">
                                          <span
                                            style={monoStyle}
                                            className={cn("rounded-full px-2 py-0.5 text-[10px]", replyLogStatusClass(log.status))}
                                          >
                                            {log.status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-3 text-[12px] text-[var(--sb-ink-3)]">
                                          {formatDateTime(log.replied_at || log.discovered_at)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <h3 style={serifStyle} className="text-[26px] leading-none tracking-[-0.02em]">
                            Recent <em className="text-[var(--sb-accent-deep)]">Posts.</em>
                          </h3>
                          <div style={monoStyle} className="mt-2 text-[11px] text-[var(--sb-ink-3)]">
                            Scheduled and posted alongside your sessions
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {scheduledXPosts.some((p) => ["posted", "failed", "cancelled"].includes(p.status)) && (
                            <button
                              onClick={handleClearPostedXPosts}
                              className="rounded-lg border border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[11px] text-[var(--sb-ink-3)] transition-colors hover:bg-[var(--sb-bg-2)]"
                              style={monoStyle}
                            >
                              Clear posted
                            </button>
                          )}
                          {scheduledXPosts.some((p) => p.status === "pending") && (
                            <button
                              onClick={handleClearXQueue}
                              className="rounded-lg border border-red-400/30 bg-red-500/8 px-3 py-1 text-[11px] text-red-500 transition-colors hover:bg-red-500/15"
                              style={monoStyle}
                            >
                              Clear pending
                            </button>
                          )}
                          <span style={monoStyle} className="rounded-full border border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[11px] text-[var(--sb-ink-3)]">
                            {scheduledXPosts.length} in queue
                          </span>
                        </div>
                      </div>

                      {scheduledXPosts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[var(--sb-line)] px-6 py-12 text-center text-[13px] text-[var(--sb-ink-3)]">
                          No posts yet. The pipeline will start filling this once your X schedule runs.
                        </div>
                      ) : (
                        <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                          {scheduledXPosts.slice(0, 10).map((post) => (
                            <div key={post.id} className="rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                              <p className="mb-2 text-[13px] leading-6 text-[var(--sb-ink)]">{post.content}</p>
                              <div style={monoStyle} className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--sb-ink-3)]">
                                <span className={cn(
                                  "rounded-full px-2 py-0.5",
                                  post.status === "posted" && "bg-emerald-500/10 text-emerald-700",
                                  post.status === "failed" && "bg-red-500/10 text-red-600",
                                  post.status === "pending" && "bg-[var(--sb-accent-soft)] text-[var(--sb-accent-deep)]",
                                  post.status === "cancelled" && "bg-[var(--sb-line)] text-[var(--sb-ink-4)]",
                                )}>
                                  {post.status}
                                </span>
                                <span>{post.posted_at ? timeAgo(post.posted_at) : `scheduled ${formatDateTime(post.scheduled_at)}`}</span>
                                {post.x_post_id && xConn?.username && (
                                  <a
                                    href={`https://x.com/${xConn.username}/status/${post.x_post_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-0.5 transition-colors hover:text-[var(--sb-accent)]"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" />
                                    View
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="grid gap-5 xl:grid-cols-2">
                <div className="bd-phead xl:col-span-2">
                  <h1>Settings.</h1>
                  <div className="bd-sub">Account, connections, and how Braino sounds.</div>
                </div>
                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6 xl:col-span-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 style={serifStyle} className="mb-1 text-[24px] leading-none tracking-[-0.02em]">
                        Let Braino <em className="text-[var(--sb-accent-deep)]">swear.</em>
                      </h3>
                      <p className="max-w-[560px] text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
                        Off by default. When on, Braino talks like a close friend and is allowed the occasional salty word (for example, he&apos;ll say &quot;fucking around&quot; when you&apos;re joking with him). Off keeps every reply clean.
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2.5">
                      <span style={monoStyle} className="text-[11px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                        {swearingEnabled ? "Swearing on" : "Swearing off"}
                      </span>
                      <Switch checked={swearingEnabled} disabled={swearingSaving} onCheckedChange={handleToggleSwearing} />
                    </div>
                  </div>
                </div>
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
                    Choose which voice Braino uses in live voice mode. Same realtime mechanism for all — only the speaking voice changes.
                  </p>

                  <div className="space-y-3">
                    {([
                      { id: "fish",       label: "Fish Audio",           desc: "Braino's default voice — Realtime listens, Fish Audio speaks" },
                      { id: "realtime",   label: "Realtime AI",          desc: "OpenAI's native voice — lowest latency, but uses OpenAI audio output" },
                    ] as const).map(({ id: option, label, desc }) => {
                      const isSelected = voicePref === option;
                      return (
                        <button
                          key={option}
                          onClick={() => {
                            setVoicePref(option);
                            localStorage.setItem("brainoVoicePref", option);
                            window.postMessage({ type: "sbSetVoicePref", pref: option }, "*");
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border p-4 text-left transition",
                            isSelected
                              ? "border-[var(--sb-ink-3)] bg-[var(--sb-panel)]"
                              : "border-[var(--sb-line-2)] bg-[var(--sb-panel)] opacity-60 hover:opacity-90",
                          )}
                        >
                          <div>
                            <div className="text-sm font-medium text-[var(--sb-ink)]">{label}</div>
                            <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">{desc}</div>
                          </div>
                          <div className={cn(
                            "h-4 w-4 rounded-full border-2 transition",
                            isSelected ? "border-[var(--sb-ink)] bg-[var(--sb-ink)]" : "border-[var(--sb-ink-4)]",
                          )} />
                        </button>
                      );
                    })}

                    {[
                      ["Language", "English (US)"],
                      ["Speech rate", "1.0x - natural"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                        <div>
                          <div className="text-sm font-medium text-[var(--sb-ink)]">{label}</div>
                          <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">{value}</div>
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
                    Choose your avatar
                  </h3>
                  <p className="mb-5 text-[13.5px] text-[var(--sb-ink-2)]">
                    One Braino OS underneath — same voice, memory, and actions. Pick which character shows up on screen.
                  </p>

                  <div className="space-y-3">
                    {(Object.keys(MASCOTS) as MascotId[]).map((id) => {
                      const isSelected = mascotPref === id;
                      const { displayName, blurb } = MASCOTS[id];
                      return (
                        <button
                          key={id}
                          onClick={() => setMascotPref(id)}
                          className={cn(
                            "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition",
                            isSelected
                              ? "border-[var(--sb-ink-3)] bg-[var(--sb-panel)]"
                              : "border-[var(--sb-line-2)] bg-[var(--sb-panel)] opacity-60 hover:opacity-90",
                          )}
                        >
                          <div className="grid h-14 w-14 flex-shrink-0 place-items-end justify-center overflow-visible">
                            {id === "webb"
                              ? <Webb size={46} idle style={{ width: "auto", height: "100%" }} />
                              : id === "ferro"
                                ? <span style={{ width: 46, height: 56, display: "block" }} dangerouslySetInnerHTML={{ __html: FERRO_WALKER_SVG.replace('width="64" height="78"', 'width="46" height="56"') }} />
                              : <Braino size={46} legs gloves idle expr="happy" style={{ width: "auto", height: "100%" }} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-[var(--sb-ink)]">{displayName}</div>
                            <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">{blurb}</div>
                          </div>
                          <div className={cn(
                            "h-4 w-4 flex-shrink-0 rounded-full border-2 transition",
                            isSelected ? "border-[var(--sb-ink)] bg-[var(--sb-ink)]" : "border-[var(--sb-ink-4)]",
                          )} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6 xl:col-span-2">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 style={serifStyle} className="mb-1 text-[26px] leading-none tracking-[-0.02em]">
                        Braino contacts
                      </h3>
                      <p className="text-[13.5px] text-[var(--sb-ink-2)]">
                        Save the people Braino should know by name or nickname. Calendar invites and Gmail drafts can resolve Rahul or RD to the right person without you spelling it out every time.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={() => openNewContactDialog()}
                      variant="outline"
                      className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Add contact
                    </Button>
                  </div>

                  {contacts.length === 0 ? (
                    <div className="rounded-[16px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-5 py-7 text-center">
                      <div className="text-sm font-medium text-[var(--sb-ink)]">No contacts saved yet</div>
                      <div className="mt-1 text-[13px] text-[var(--sb-ink-3)]">
                        Start with the people you talk to most. Example: Rahul → rahul.2002.dey@gmail.com, nickname: RD
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                          <div className="flex min-w-0 items-center gap-3">
                            {contact.photo_url ? (
                              <img
                                src={contact.photo_url}
                                alt={contact.name}
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="grid h-11 w-11 place-items-center rounded-full bg-[linear-gradient(135deg,#6B4E32,#8C5A3D)] text-sm font-semibold text-white">
                                {getInitials(contact.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                <div className="truncate text-sm font-medium text-[var(--sb-ink)]">{contact.name}</div>
                                {contact.nickname ? (
                                  <span style={monoStyle} className="rounded-full border border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-2 py-0.5 text-[10px] text-[var(--sb-ink-3)]">
                                    aka {contact.nickname}
                                  </span>
                                ) : null}
                              </div>
                              <div style={monoStyle} className="mt-1 truncate text-[11px] text-[var(--sb-ink-3)]">
                                {[contact.email, contact.phone].filter(Boolean).join(" · ") || "Saved without email or phone"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openEditContactDialog(contact)}
                              className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1.5 text-[11px] text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleDeleteContact(contact)}
                              disabled={contactDeletingId === contact.id}
                              className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1.5 text-[11px] text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                            >
                              {contactDeletingId === contact.id ? "Deleting…" : "Delete"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-6 xl:col-span-2">
                  <h3 style={serifStyle} className="mb-1 text-[26px] leading-none tracking-[-0.02em]">
                    Connectors
                  </h3>
                  <p className="mb-5 text-[13.5px] text-[var(--sb-ink-2)]">
                    Configure the services Braino can talk to. Connected apps will eventually power announcements, file actions, and richer automations.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--sb-ink)]">
                          <span className={cn("h-2 w-2 rounded-full", xConn ? "bg-emerald-500" : "bg-[var(--sb-ink-4)]")} />
                          X
                        </div>
                        <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                          {xConn ? `Linked ${xConn.username ? `@${xConn.username}` : "account"} for server-side scheduling` : "Connect a real X account for dashboard scheduling and backend posting"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleConnectX}
                        disabled={xConnectLoading}
                        className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                      >
                        {xConnectLoading ? "Waiting…" : xConn ? "Reconnect" : "Connect"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--sb-ink)]">
                          <span className={cn("h-2 w-2 rounded-full", notionConn ? "bg-emerald-500" : "bg-[var(--sb-ink-4)]")} />
                          Notion
                        </div>
                        <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                          {notionConn ? notionConn.workspace_name || notionConn.workspace_id || "Workspace connected" : "Send structured notes into your workspace"}
                        </div>
                      </div>
                      <Link to="/notion-sync">
                        <Button variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]">
                          {notionConn ? "Manage" : "Connect"}
                        </Button>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--sb-ink)]">
                          <span className={cn("h-2 w-2 rounded-full", googleDriveConn ? "bg-emerald-500" : "bg-[var(--sb-ink-4)]")} />
                          Google Drive
                        </div>
                        <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                          {googleDriveConn ? googleDriveConn.google_email || `Updated ${formatDateTime(googleDriveConn.updated_at)}` : "Save artifacts, organize folders, and power Docs flows"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleConnectGoogleDrive}
                        disabled={driveConnectLoading}
                        className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                      >
                        {driveConnectLoading ? "Waiting…" : googleDriveConn ? "Reconnect" : "Connect"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--sb-ink)]">
                          <span className={cn("h-2 w-2 rounded-full", googleCalendarConn ? "bg-emerald-500" : "bg-[var(--sb-ink-4)]")} />
                          Google Calendar
                        </div>
                        <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                          {googleCalendarConn
                            ? `${googleCalendarConn.google_email || "Calendar connected"}${googleCalendarConn.watch_expires_at ? ` · Watch live until ${formatDateTime(googleCalendarConn.watch_expires_at)}` : googleCalendarConn.last_sync_at ? ` · Synced ${formatDateTime(googleCalendarConn.last_sync_at)}` : ""}`
                            : "Schedule, reschedule, cancel, forward, and open Meet calls"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleConnectGoogleCalendar}
                        disabled={calendarConnectLoading}
                        className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                      >
                        {calendarConnectLoading ? "Waiting…" : googleCalendarConn ? "Reconnect" : "Connect"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--sb-ink)]">
                          <span className={cn("h-2 w-2 rounded-full", spotifyConn ? "bg-emerald-500" : "bg-[var(--sb-ink-4)]")} />
                          Spotify
                        </div>
                        <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                          {spotifyConn
                            ? `${spotifyConn.display_name || spotifyConn.spotify_email || "Account connected"}${spotifyConn.product ? ` · ${spotifyConn.product}` : ""}`
                            : "Search tracks, play songs, and control Spotify from Braino"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleConnectSpotify}
                        disabled={spotifyConnectLoading}
                        className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                      >
                        {spotifyConnectLoading ? "Waiting…" : spotifyConn ? "Reconnect" : "Connect"}
                      </Button>
                    </div>

                    {[
                      { name: "Slack", blurb: "Mentions, DMs, and team activity announcements", status: "Soon" },
                      { name: "Gmail", blurb: "Inbox awareness once the heavier compliance path is ready", status: "Planned" },
                      { name: "Outlook / Microsoft Graph", blurb: "Enterprise mail and calendar support", status: "Planned" },
                      { name: "GitHub", blurb: "PR reviews, CI failures, and repo activity", status: "Planned" },
                    ].map((connector) => (
                      <div key={connector.name} className="flex items-center justify-between rounded-xl border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-medium text-[var(--sb-ink)]">
                            <span className="h-2 w-2 rounded-full bg-[var(--sb-ink-4)]" />
                            {connector.name}
                          </div>
                          <div style={monoStyle} className="mt-1 text-[11px] text-[var(--sb-ink-3)]">
                            {connector.blurb}
                          </div>
                        </div>
                        <span className="rounded-full border border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1.5 text-xs text-[var(--sb-ink-3)]">
                          {connector.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <SpotifyPanel
                  sessionAccessToken={session?.access_token ?? null}
                  connection={spotifyConn}
                  connectLoading={spotifyConnectLoading}
                  onConnect={handleConnectSpotify}
                />

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
                <div className="bd-phead">
                  <h1>What Braino <span className="bd-serif-i">knows.</span></h1>
                  <div className="bd-sub">Long-term memory across everything you do. Edit or forget any of it.</div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 style={serifStyle} className="text-[24px] leading-none tracking-[-0.02em] text-[var(--sb-ink)]">
                          What Braino should <em className="text-[var(--sb-accent-deep)]">know about you.</em>
                        </h3>
                        <p className="mt-2 max-w-[520px] text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
                          Tell him as much or as little as you want. The more real it is, the more he feels like yours: he will reference it, tease you with it, and keep you accountable to it.
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]"
                      >
                        Always on
                      </Badge>
                    </div>

                    <Textarea
                      value={overallMemoryDraft}
                      onChange={(event) => {
                        setOverallMemoryDraft(event.target.value);
                        if (overallMemorySaved) setOverallMemorySaved(false);
                        if (overallMemoryError) setOverallMemoryError(null);
                      }}
                      placeholder={"Who are you, really? What are you building, what are you afraid of, what should he hold you to?\n\nYou can keep it practical (“I prefer concise answers and direct feedback”) or go deeper (“I struggle to ship, call me out when I start rebuilding instead of launching”). He works with whatever you give him."}
                      className="min-h-[240px] rounded-[16px] border-[var(--sb-line-2)] bg-[var(--sb-panel)] text-[13.5px] leading-relaxed"
                    />

                    <div className="mt-3 rounded-[14px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-4 py-3">
                      <p className="text-[12.5px] leading-relaxed text-[var(--sb-ink-3)]">
                        <span className="font-medium text-[var(--sb-ink-2)]">We don&apos;t care about your data.</span>{" "}
                        Truly. Nobody here reads this and nobody ever will; it exists so Braino knows you and you feel a little lighter having said it somewhere. This is not about forming a dependency on an app. It is about a companion who actually knows the person he sits with. The founder filled his in first.
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <div style={monoStyle} className="text-[11px] text-[var(--sb-ink-4)]">
                        {overallMemoryDraft.trim().length > 0 ? `${overallMemoryDraft.trim().length.toLocaleString()} chars` : "Add a durable user profile prompt here"}
                      </div>
                      <Button
                        onClick={handleSaveOverallMemory}
                        disabled={overallMemorySaving || overallMemoryDraft.trim() === overallMemory}
                        size="sm"
                        className={cn("rounded-xl", overallMemoryError && "border-red-500/50 bg-red-500/10 text-red-600 hover:bg-red-500/20")}
                      >
                        {overallMemorySaved ? <><Check className="mr-1.5 h-3.5 w-3.5" /> Saved</> : overallMemorySaving ? "Saving…" : overallMemoryError ? "Retry" : "Save"}
                      </Button>
                    </div>

                    {overallMemoryError ? (
                      <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-600">
                        {overallMemoryError}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 style={serifStyle} className="text-[24px] leading-none tracking-[-0.02em] text-[var(--sb-ink)]">
                          Combined <em className="text-[var(--sb-accent-deep)]">knowledge.</em>
                        </h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
                          This is the merged identity context Braino can use across the product.
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-[10px] text-[var(--sb-ink-3)]">
                        {overallMemory.trim() ? "Overall memory included" : "Overall memory empty"}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-[10px] text-[var(--sb-ink-3)]">
                        {memoryNotes.length} memory fact{memoryNotes.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-[10px] text-[var(--sb-ink-3)]">
                        {contacts.length} contact{contacts.length === 1 ? "" : "s"}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-[10px] text-[var(--sb-ink-3)]">
                        {xPersonaConfigured ? "X persona merged" : "No X persona yet"}
                      </Badge>
                    </div>

                    {dataLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Skeleton key={index} className="h-5 rounded-full bg-[var(--sb-bg-2)]" />
                        ))}
                      </div>
                    ) : combinedKnowledgePreview ? (
                      <div className="rounded-[16px] border border-[var(--sb-line)] bg-[var(--sb-panel)] p-4">
                        <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
                          {combinedKnowledgePreview}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-4 rounded-[16px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-6 py-10 text-center">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--sb-accent-soft)]">
                          <Sparkles className="h-5 w-5 text-[var(--sb-accent-deep)]" />
                        </div>
                        <div>
                          <div className="mb-1 text-sm font-medium text-[var(--sb-ink)]">No identity context yet</div>
                          <div className="max-w-[320px] text-[13px] text-[var(--sb-ink-3)]">
                            Add your overall profile on the left. Manual memory facts and X persona data will stack into this view automatically.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 style={serifStyle} className="text-[24px] leading-none tracking-[-0.02em] text-[var(--sb-ink)]">
                        What Braino <em className="text-[var(--sb-accent-deep)]">remembers.</em>
                      </h3>
                      <p className="mt-2 max-w-[580px] text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
                        Braino saves these automatically as you talk — who you are, what you&apos;re building, how you like things. Edit or remove anything; he uses them across every conversation.
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2.5">
                      <span style={monoStyle} className="text-[11px] uppercase tracking-[0.14em] text-[var(--sb-ink-3)]">
                        {memoryEnabled ? "Memory on" : "Memory off"}
                      </span>
                      <Switch checked={memoryEnabled} disabled={memoryToggleSaving} onCheckedChange={handleToggleMemory} />
                    </div>
                  </div>

                  {dataLoading ? (
                    <div className="space-y-2.5">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-12 rounded-[14px] bg-[var(--sb-bg-2)]" />
                      ))}
                    </div>
                  ) : brainoMemories.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-6 py-12 text-center">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--sb-accent-soft)]">
                        <Sparkles className="h-5 w-5 text-[var(--sb-accent-deep)]" />
                      </div>
                      <div>
                        <div className="mb-1 text-sm font-medium text-[var(--sb-ink)]">Nothing remembered yet</div>
                        <div className="max-w-[380px] text-[13px] text-[var(--sb-ink-3)]">
                          As you chat, Braino starts saving the important things here on its own — your name, what you&apos;re building, the people and preferences that matter.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[10px] text-[var(--sb-ink-3)]">
                          {brainoMemories.length} remembered
                        </Badge>
                        {!memoryEnabled ? (
                          <span className="text-[11.5px] text-[var(--sb-ink-4)]">Memory is paused — existing facts are still used.</span>
                        ) : null}
                      </div>
                      {brainoMemories.map((mem) => (
                        <div
                          key={mem.id}
                          className="group flex items-start gap-3 rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] px-4 py-3"
                        >
                          <Badge
                            variant="outline"
                            className="mt-0.5 flex-shrink-0 rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-2.5 py-0.5 text-[9.5px] uppercase tracking-[0.1em] text-[var(--sb-ink-3)]"
                          >
                            {mem.category}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            {editingMemoryId === mem.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editingMemoryDraft}
                                  onChange={(event) => setEditingMemoryDraft(event.target.value)}
                                  className="min-h-[58px] rounded-[12px] border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] text-[13.5px] leading-relaxed"
                                />
                                <div className="flex items-center gap-2">
                                  <Button size="sm" className="h-7 rounded-lg text-[12px]" onClick={() => handleSaveBrainoMemoryEdit(mem.id)}>
                                    <Check className="mr-1 h-3.5 w-3.5" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[12px]" onClick={() => setEditingMemoryId(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[13.5px] leading-relaxed text-[var(--sb-ink-2)]">{mem.content}</div>
                            )}
                          </div>
                          {editingMemoryId !== mem.id ? (
                            <div className="flex flex-shrink-0 items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => { setEditingMemoryId(mem.id); setEditingMemoryDraft(mem.content); }}
                                className="rounded-md px-1.5 py-0.5 text-[11px] text-[var(--sb-ink-4)] transition hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink-2)]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBrainoMemory(mem.id)}
                                className="rounded-md p-1 text-[var(--sb-ink-4)] transition hover:bg-[var(--sb-bg-2)] hover:text-[var(--sb-ink-2)]"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 style={serifStyle} className="text-[24px] leading-none tracking-[-0.02em] text-[var(--sb-ink)]">
                          Supporting <em className="text-[var(--sb-accent-deep)]">memory.</em>
                        </h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
                          Small remembered facts still matter. These sit under the overall profile and help Braino keep sharp details around.
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] px-3 py-1 text-[10px] text-[var(--sb-ink-3)]">
                        {memoryNotes.length} saved
                      </Badge>
                    </div>

                    {dataLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <Skeleton key={index} className="h-16 rounded-[14px] bg-[var(--sb-bg-2)]" />
                        ))}
                      </div>
                    ) : memoryNotes.length === 0 ? (
                      <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-[var(--sb-line)] bg-[var(--sb-panel)] px-8 py-14 text-center">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--sb-accent-soft)]">
                          <Sparkles className="h-5 w-5 text-[var(--sb-accent-deep)]" />
                        </div>
                    <div>
                          <div className="mb-1 text-sm font-medium text-[var(--sb-ink)]">No supporting memory facts yet</div>
                      <div className="max-w-[340px] text-[13px] text-[var(--sb-ink-3)]">
                            Save short facts like preferences, ongoing projects, or constraints that Braino should keep around.
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
                            className="group flex items-start gap-4 rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] px-5 py-4"
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
                  </div>

                  <div className="rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel-2)] p-5">
                    <div className="mb-4">
                      <h3 style={serifStyle} className="text-[24px] leading-none tracking-[-0.02em] text-[var(--sb-ink)]">
                        Add a <em className="text-[var(--sb-accent-deep)]">memory.</em>
                      </h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-[var(--sb-ink-2)]">
                        Use this for one-off facts. The big identity prompt belongs in overall memory.
                      </p>
                    </div>
                    <MemoryAddForm
                      userId={user!.id}
                      onAdded={(newNote) => setNotes((prev) => [newNote, ...prev])}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "highlights" && (
              <div>
                <div className="bd-phead">
                  <h1>Passages worth <span className="bd-serif-i">keeping.</span></h1>
                  <div className="bd-sub">Text you&apos;ve saved from pages across the web. Select any passage and ask Braino to highlight it.</div>
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

            {activeTab === "heart" && (
              <SoonPanel
                title="His heart"
                what="How he reads the moment: the traits, the tone, and the toggles that decide how he talks to you."
                meanwhile="The emotional engine is live everywhere he speaks. What is missing is the panel to see and change it."
              />
            )}

            {activeTab === "eyes" && (
              <SoonPanel
                title="His eyes"
                what="What he can see: the page you are on, your screen when you ask, and the camera when you point him at it."
                meanwhile="Ask him to look at your screen or your camera and he already will. This is where you will decide when he may."
              />
            )}

            {activeTab === "ears" && (
              <SoonPanel
                title="His ears"
                what="Listening: the wake word, what he hears, and what he does not."
                meanwhile="Double Control talks to him now. The microphone is off until you press it."
              />
            )}

            {activeTab === "distraOverview" && (
              <SoonPanel
                title="Distra"
                what="The distribution co-founder: what went out, what is queued, and how it landed, across every channel rather than one."
                meanwhile="The X command centre under Engines is the part that runs today."
              />
            )}

            {activeTab === "distraJobs" && (
              <SoonPanel
                title="Tasks & jobs"
                what="Everything Distra is doing on its own, and everything waiting on you."
                meanwhile="Posts waiting on approval are on the X page for now."
              />
            )}

            {activeTab === "engineContent" && (
              <SoonPanel
                title="Content"
                what="Five posts a week, drafted from what you actually shipped, fitted to each platform you care about."
                meanwhile="X is the channel that runs today. The rest of the engine is next."
              />
            )}

            {activeTab === "engineSeo" && (
              <SoonPanel
                title="Optics · SEO"
                what="Being findable the old way: what you rank for, what you do not, and what to write about it."
              />
            )}

            {activeTab === "engineAeo" && (
              <SoonPanel
                title="Optics · AEO"
                what="Being named when a buyer asks an AI. Whether you come up, who comes up instead, and what to do about it."
              />
            )}

            {activeTab === "engineOutreach" && (
              <SoonPanel
                title="Outreach"
                what="The right people found, written to one at a time, and followed up. Nothing sends without you."
              />
            )}

            {activeTab === "brandLinkedin" && (
              <SoonPanel
                title="Personal branding"
                what="Your LinkedIn, in your voice, on a schedule you do not have to think about."
              />
            )}

            {activeTab === "founderProfile" && (
              <SoonPanel
                title="Founder profile"
                what="Who you are and what you are building, in one place, so everything he writes sounds like you rather than like a template."
              />
            )}

            {activeTab === "voiceCommands" && (
              <div>
                <div className="bd-phead">
                  <h1>Say it, <span className="bd-serif-i">open it.</span></h1>
                  <div className="bd-sub">
                    Group your shortcuts into modes. Say &quot;Braino, start &lt;mode&gt;&quot; to activate one: its commands go live and
                    Braino&apos;s notch takes on its color. Each command opens the URL you configured directly, no searching, no thinking.
                    Attach more than one URL and Braino opens a random handful each time.
                  </div>
                </div>

                <div className="bd-ask">
                  <input
                    value={newModeName}
                    onChange={(event) => setNewModeName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleCreateVoiceMode();
                    }}
                    placeholder="Name a new mode, e.g. Work…"
                  />
                  <button type="button" className="bd-send" onClick={handleCreateVoiceMode} title="Create mode">
                    <Plus className="h-[17px] w-[17px]" />
                  </button>
                </div>

                <div className="bd-shead">
                  <h2>Your modes</h2>
                  {voiceModes.length > 0 ? (
                    <span className="bd-mono text-[11px] text-[var(--sb-ink-3)]">
                      {voiceModes.reduce((n, m) => n + m.commands.length, 0)} commands
                    </span>
                  ) : null}
                </div>

                {dataLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-[18px] bg-[var(--sb-bg-2)]" />
                    ))}
                  </div>
                ) : (
                  <div
                    className="space-y-4"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedModeId) handleToggleModeHidden(draggedModeId, false);
                      setDraggedModeId(null);
                    }}
                  >
                    {voiceModes.filter((m) => !m.is_hidden).length === 0 ? (
                      <div className="bd-empty">
                        <h3>No modes yet</h3>
                        <p>Name one above, then teach it what to open. Say the phrase, Braino opens the link.</p>
                      </div>
                    ) : (
                      voiceModes
                        .filter((m) => !m.is_hidden)
                        .map((mode) => (
                          <VoiceModeCard
                            key={mode.id}
                            mode={mode}
                            draggable
                            onDragStart={() => setDraggedModeId(mode.id)}
                            onDragEnd={() => setDraggedModeId(null)}
                            onRename={(name) => handleRenameVoiceMode(mode.id, name)}
                            onColorChange={(color) => handleChangeModeColor(mode.id, color)}
                            onDelete={() => handleDeleteVoiceMode(mode.id)}
                            onHide={() => handleToggleModeHidden(mode.id, true)}
                            onDeleteCommand={(commandId) => handleDeleteVoiceCommand(mode.id, commandId)}
                            onToggleOpenMode={(commandId, openMode) => handleToggleCommandOpenMode(mode.id, commandId, openMode)}
                            onAddUrl={(commandId, url) => handleAddCommandUrl(mode.id, commandId, url)}
                            onDeleteUrl={(commandId, urlId) => handleDeleteCommandUrl(mode.id, commandId, urlId)}
                            draft={newCommandDraft[mode.id] || { phrase: "", url: "", openMode: "tab" }}
                            onDraftChange={(draft) => setNewCommandDraft((prev) => ({ ...prev, [mode.id]: draft }))}
                            onAddCommand={() => handleAddVoiceCommand(mode.id)}
                          />
                        ))
                    )}
                  </div>
                )}

                <div className="bd-shead"><h2>Hidden</h2></div>
                <div>
                  <div
                    className={cn("bd-dropzone", draggedModeId && "over")}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggedModeId) handleToggleModeHidden(draggedModeId, true);
                      setDraggedModeId(null);
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <FolderOpen className="h-4 w-4 text-[var(--sb-ink-3)]" />
                        <h3 style={serifStyle} className="text-[19px] leading-none tracking-[-0.01em] text-[var(--sb-ink)]">
                          Hidden modes
                        </h3>
                        <span className="bd-tag">{voiceModes.filter((m) => m.is_hidden).length}</span>
                      </div>
                      {!hiddenModesCredentialId ? (
                        <button type="button" onClick={handleRegisterHiddenModesFingerprint} className="bd-btn ghost !py-1.5 !text-[12px]">
                          <Shield className="h-3.5 w-3.5" /> Set up fingerprint
                        </button>
                      ) : !hiddenFolderUnlocked ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={handleUnlockHiddenFolder} disabled={hiddenFolderUnlocking} className="bd-btn ghost !py-1.5 !text-[12px]">
                            <Shield className="h-3.5 w-3.5" />
                            {hiddenFolderUnlocking ? "Waiting…" : "Unlock"}
                          </button>
                          {hiddenFolderNeedsSetup ? (
                            <button type="button" onClick={handleRegisterHiddenModesFingerprint} className="bd-btn ghost !py-1.5 !text-[12px]">
                              Use this device
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <button type="button" onClick={() => setHiddenFolderUnlocked(false)} className="bd-btn ghost !py-1.5 !text-[12px]">
                          Lock
                        </button>
                      )}
                    </div>

                    <p className="mb-4 max-w-[560px] text-[12.5px] leading-relaxed text-[var(--sb-ink-3)]">
                      Drag a mode here to hide it from the list above. Reopening this folder asks for your fingerprint. Visibility
                      only: a hidden mode still activates by voice exactly as before.
                    </p>

                    {!hiddenFolderUnlocked ? (
                      <div className="bd-locked">
                        {voiceModes.filter((m) => m.is_hidden).length} mode{voiceModes.filter((m) => m.is_hidden).length === 1 ? "" : "s"} locked
                        {hiddenFolderNeedsSetup ? (
                          <span className="mt-2 block text-[12px] font-normal normal-case tracking-normal text-[var(--sb-ink-3)]">
                            No fingerprint key on this browser yet. Tap “Use this device” above and touch the sensor once.
                          </span>
                        ) : null}
                      </div>
                    ) : voiceModes.filter((m) => m.is_hidden).length === 0 ? (
                      <div className="bd-locked !border-dashed">Nothing hidden yet</div>
                    ) : (
                      <div className="space-y-4">
                        {voiceModes
                          .filter((m) => m.is_hidden)
                          .map((mode) => (
                            <VoiceModeCard
                              key={mode.id}
                              mode={mode}
                              draggable
                              onDragStart={() => setDraggedModeId(mode.id)}
                              onDragEnd={() => setDraggedModeId(null)}
                              onRename={(name) => handleRenameVoiceMode(mode.id, name)}
                              onColorChange={(color) => handleChangeModeColor(mode.id, color)}
                              onDelete={() => handleDeleteVoiceMode(mode.id)}
                              onHide={() => handleToggleModeHidden(mode.id, false)}
                              hideLabel="Unhide"
                              onDeleteCommand={(commandId) => handleDeleteVoiceCommand(mode.id, commandId)}
                              onToggleOpenMode={(commandId, openMode) => handleToggleCommandOpenMode(mode.id, commandId, openMode)}
                              onAddUrl={(commandId, url) => handleAddCommandUrl(mode.id, commandId, url)}
                              onDeleteUrl={(commandId, urlId) => handleDeleteCommandUrl(mode.id, commandId, urlId)}
                              draft={newCommandDraft[mode.id] || { phrase: "", url: "", openMode: "tab" }}
                              onDraftChange={(draft) => setNewCommandDraft((prev) => ({ ...prev, [mode.id]: draft }))}
                              onAddCommand={() => handleAddVoiceCommand(mode.id)}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={contactsDialogOpen} onOpenChange={(open) => {
        setContactsDialogOpen(open);
        if (!open && !contactSaving) resetContactComposer();
      }}>
        <DialogContent className="max-w-lg border-[var(--sb-line)] bg-[var(--sb-panel-2)] text-[var(--sb-ink)] sm:rounded-[24px]">
          <DialogHeader>
            <DialogTitle style={serifStyle} className="text-left text-3xl font-normal tracking-[-0.02em]">
              {contactDraft.id ? "Edit contact" : "Add a Braino contact"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 pt-2">
            <div className="grid gap-2">
              <label className="text-[12px] font-medium text-[var(--sb-ink-2)]">Name</label>
              <Input
                value={contactDraft.name}
                onChange={(event) => setContactDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Rahul"
                className="h-11 rounded-xl border-[var(--sb-line)] bg-[var(--sb-panel)] text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-[12px] font-medium text-[var(--sb-ink-2)]">Nickname</label>
              <Input
                value={contactDraft.nickname}
                onChange={(event) => setContactDraft((prev) => ({ ...prev, nickname: event.target.value }))}
                placeholder="rahul bhai"
                className="h-11 rounded-xl border-[var(--sb-line)] bg-[var(--sb-panel)] text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-[12px] font-medium text-[var(--sb-ink-2)]">Email</label>
              <Input
                value={contactDraft.email}
                onChange={(event) => setContactDraft((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="rahul@example.com"
                className="h-11 rounded-xl border-[var(--sb-line)] bg-[var(--sb-panel)] text-sm"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-[12px] font-medium text-[var(--sb-ink-2)]">Phone</label>
              <Input
                value={contactDraft.phone}
                onChange={(event) => setContactDraft((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="+91 98765 43210"
                className="h-11 rounded-xl border-[var(--sb-line)] bg-[var(--sb-panel)] text-sm"
              />
            </div>

            <div className="grid gap-3 rounded-[18px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] p-4">
              <div className="flex items-center gap-4">
                {contactPhotoPreviewUrl ? (
                  <img
                    src={contactPhotoPreviewUrl}
                    alt={contactDraft.name || "Contact photo"}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[linear-gradient(135deg,#6B4E32,#8C5A3D)] text-lg font-semibold text-white">
                    {getInitials(contactDraft.name || "B")}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-[var(--sb-ink-2)]">Photo</div>
                  <div className="mt-1 text-[12px] leading-relaxed text-[var(--sb-ink-3)]">
                    Upload a real image here. No photo link needed anymore.
                  </div>
                  <div style={monoStyle} className="mt-2 text-[10px] text-[var(--sb-ink-4)]">
                    JPG, PNG, GIF, or WebP up to 5 MB
                  </div>
                </div>
              </div>

              <input
                ref={contactPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleContactPhotoFileSelect}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => contactPhotoInputRef.current?.click()}
                  disabled={contactSaving}
                  className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1.5 text-[11px] text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                >
                  {contactPhotoPreviewUrl ? "Replace photo" : "Upload photo"}
                </Button>
                {contactPhotoPreviewUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveContactPhoto}
                    disabled={contactSaving}
                    className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel-2)] px-3 py-1.5 text-[11px] text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
                  >
                    Remove photo
                  </Button>
                ) : null}
                {contactPhotoFile ? (
                  <span style={monoStyle} className="text-[10px] text-[var(--sb-ink-4)]">
                    {contactPhotoFile.name}
                  </span>
                ) : null}
              </div>
            </div>

            <div style={monoStyle} className="rounded-[14px] border border-[var(--sb-line-2)] bg-[var(--sb-panel)] px-4 py-3 text-[11px] text-[var(--sb-ink-3)]">
              Braino uses this list when you say things like "schedule a call with Rahul", "send Rahul an email", or "message RD".
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setContactsDialogOpen(false);
                  resetContactComposer();
                }}
                className="rounded-full border-[var(--sb-line)] bg-[var(--sb-panel)] text-xs text-[var(--sb-ink)] hover:bg-[var(--sb-bg-2)]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveContact}
                disabled={contactSaving}
                className="rounded-full bg-[var(--sb-ink)] text-xs text-[var(--sb-on-ink)] hover:opacity-90"
              >
                {contactSaving ? "Saving…" : contactDraft.id ? "Save contact" : "Add contact"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedNote ? (
        <NoteModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          userId={user.id}
          authHeader={session ? `Bearer ${session.access_token}` : undefined}
          driveConnected={!!googleDriveConn}
        />
      ) : null}
    </div>
  );
}
