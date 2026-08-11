// BrainoX command center (/x): the queue, composer, policy explanations,
// settings, activity log, and the "How's my X?" briefing from BrainoX.md.
// Content flows draft -> approved -> scheduled; brainox-schedule is the only
// path to X and every schedule/publish carries its policy decision back here.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type QueueItem = {
  id: string;
  text: string;
  original_input: string | null;
  source: string;
  pillar: string | null;
  content_type: string;
  thread_mode: boolean;
  status: string;
  position: number;
  locked: boolean;
  priority: number;
  quality: { total?: number } | null;
  policy: { pass?: boolean; checks?: Array<{ name: string; pass: boolean; detail: string }> } | null;
  why: { scheduled_because?: string[]; held?: string[] } | null;
  scheduled_publish_at: string | null;
  x_post_id: string | null;
  published_at: string | null;
  error: string | null;
  created_at: string;
};

type Idea = { id: string; text: string; status: string; created_at: string };

type Pillar = { key: string; label: string; weight: number; paused: boolean };

type Settings = {
  automation_mode: "manual" | "assisted" | "autopilot";
  kill_switch: boolean;
  quiet_start: number;
  quiet_end: number;
  min_gap_minutes: number;
  max_posts_per_day: number;
  daily_target: number;
  timezone: string;
  pillars: Pillar[];
};

type ActionRow = {
  id: string;
  agent: string;
  action: string;
  target: string | null;
  reason: string | null;
  result: string;
  created_at: string;
};

type GeneratedOption = {
  text: string;
  angle: string;
  pillar: string;
  total: number;
  authenticity_note: string;
};

type BriefingStats = {
  followers: {
    current: number;
    delta1d: number | null;
    delta7d: number | null;
    delta30d: number | null;
  } | null;
  week: { postsPublished: number; totalEngagement: number };
  queue: { counts: Record<string, number> };
};

const DEFAULT_SETTINGS: Settings = {
  automation_mode: "manual",
  kill_switch: false,
  quiet_start: 23,
  quiet_end: 7,
  min_gap_minutes: 90,
  max_posts_per_day: 5,
  daily_target: 100,
  timezone: "Asia/Kolkata",
  pillars: [
    { key: "building-braino", label: "Building Braino", weight: 30, paused: false },
    { key: "founder", label: "Founder Journey", weight: 20, paused: false },
    { key: "ai-agents", label: "AI / Agents", weight: 15, paused: false },
    { key: "contrarian", label: "Contrarian Opinions", weight: 10, paused: false },
    { key: "technical", label: "Technical Insights", weight: 10, paused: false },
    { key: "industry", label: "Industry Commentary", weight: 10, paused: false },
    { key: "experimental", label: "Experimental", weight: 5, paused: false },
  ],
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  approved: "Approved",
  draft: "Drafts",
  review: "Needs review",
  paused: "Paused",
  failed: "Failed",
  published: "Published",
  rejected: "Rejected",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BrainoX() {
  const { user, session, loading } = useAuth();
  const token = session?.access_token ?? null;

  const [items, setItems] = useState<QueueItem[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [log, setLog] = useState<ActionRow[]>([]);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingStats, setBriefingStats] = useState<BriefingStats | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Composer
  const [composerText, setComposerText] = useState("");
  const [composerMode, setComposerMode] = useState<"authored" | "raw_thought" | "generate">("authored");
  const [composerPillar, setComposerPillar] = useState("building-braino");
  const [composerBusy, setComposerBusy] = useState(false);
  const [options, setOptions] = useState<GeneratedOption[]>([]);

  // Per-item UI state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ideaText, setIdeaText] = useState("");
  const [planProposals, setPlanProposals] = useState<Array<{ itemId: string; text: string; at: string }>>([]);
  const dragId = useRef<string | null>(null);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 4500);
  }, []);

  const callFn = useCallback(
    async (name: string, body: unknown): Promise<Record<string, unknown>> => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          apikey: ANON_KEY,
        },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok && !payload?.blocked) {
        throw new Error(String(payload?.error || `${name} failed (${res.status})`));
      }
      return payload;
    },
    [token],
  );

  const loadQueue = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("x_queue_items")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data as QueueItem[]) ?? []);
  }, [user]);

  const loadIdeas = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("x_ideas")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(30);
    setIdeas((data as Idea[]) ?? []);
  }, [user]);

  const loadLog = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("x_action_log")
      .select("id,agent,action,target,reason,result,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setLog((data as ActionRow[]) ?? []);
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("x_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setSettings({ ...DEFAULT_SETTINGS, ...data, pillars: (data.pillars as Pillar[]) ?? DEFAULT_SETTINGS.pillars });
    }
    setSettingsLoaded(true);
  }, [user]);

  const saveSettings = useCallback(
    async (next: Settings) => {
      if (!user) return;
      setSettings(next);
      await (supabase as any).from("x_settings").upsert({
        user_id: user.id,
        automation_mode: next.automation_mode,
        kill_switch: next.kill_switch,
        quiet_start: next.quiet_start,
        quiet_end: next.quiet_end,
        min_gap_minutes: next.min_gap_minutes,
        max_posts_per_day: next.max_posts_per_day,
        daily_target: next.daily_target,
        timezone: next.timezone,
        pillars: next.pillars,
      });
    },
    [user],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadQueue(), loadIdeas(), loadLog()]);
  }, [loadQueue, loadIdeas, loadLog]);

  // Boot: reconcile with the dispatcher, then load everything.
  useEffect(() => {
    if (!user || !token) return;
    (async () => {
      try {
        await callFn("brainox-schedule", { action: "sync" });
      } catch {
        // Sync is best-effort; the queue still renders without it.
      }
      await Promise.all([refreshAll(), loadSettings()]);
    })();
  }, [user, token, callFn, refreshAll, loadSettings]);

  const fetchBriefing = useCallback(async () => {
    setBriefingBusy(true);
    try {
      const payload = await callFn("brainox-briefing", { spoken: true });
      setBriefing(String(payload?.briefing || ""));
      setBriefingStats((payload?.stats as BriefingStats) ?? null);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Briefing failed.");
    } finally {
      setBriefingBusy(false);
    }
  }, [callFn, flash]);

  // ── Composer actions ──────────────────────────────────────────────────

  const addToQueue = useCallback(
    async (text: string, source: string, pillar: string | null, original: string | null) => {
      if (!user) return;
      const minPosition = items.length ? Math.min(...items.map((item) => item.position)) : 0;
      await (supabase as any).from("x_queue_items").insert({
        user_id: user.id,
        text,
        original_input: original,
        source,
        pillar,
        status: "draft",
        position: minPosition - 1,
      });
      await loadQueue();
    },
    [user, items, loadQueue],
  );

  const handleCompose = useCallback(async () => {
    const text = composerText.trim();
    if (composerMode !== "generate" && !text) return;
    setComposerBusy(true);
    setOptions([]);
    try {
      if (composerMode === "authored") {
        // The user's words are the source of truth: straight into drafts.
        await addToQueue(text, "authored", null, text);
        setComposerText("");
        flash("Added to drafts, wording preserved.");
      } else {
        const payload = await callFn("brainox-generate", {
          mode: composerMode === "raw_thought" ? "options" : "generate",
          input: text,
          pillar: composerPillar,
        });
        setOptions((payload?.options as GeneratedOption[]) ?? []);
      }
    } catch (error) {
      flash(error instanceof Error ? error.message : "That did not work.");
    } finally {
      setComposerBusy(false);
    }
  }, [composerText, composerMode, composerPillar, addToQueue, callFn, flash]);

  const saveOption = useCallback(
    async (option: GeneratedOption) => {
      await addToQueue(
        option.text,
        composerMode === "raw_thought" ? "raw_thought" : "braino",
        option.pillar || composerPillar,
        composerText.trim() || null,
      );
      setOptions((prev) => prev.filter((entry) => entry !== option));
      flash("Draft saved to the queue.");
    },
    [addToQueue, composerMode, composerPillar, composerText, flash],
  );

  // ── Queue item actions ────────────────────────────────────────────────

  const updateItem = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      if (!user) return;
      await (supabase as any).from("x_queue_items").update(patch).eq("id", id).eq("user_id", user.id);
      await loadQueue();
    },
    [user, loadQueue],
  );

  const runSchedule = useCallback(
    async (action: "schedule" | "publish_now" | "unschedule", itemId: string, scheduledAt?: string) => {
      setBusyId(itemId);
      try {
        const payload = await callFn("brainox-schedule", { action, itemId, scheduledAt });
        if (payload?.blocked) {
          const decision = payload.decision as QueueItem["policy"];
          const failures = (decision?.checks ?? []).filter((check) => !check.pass);
          flash(`Held by policy: ${failures.map((check) => check.detail).join(" ")}`);
        } else if (payload?.published) {
          flash("Published to X.");
        } else if (payload?.scheduled) {
          flash(`Scheduled for ${fmtWhen(String(payload.scheduledAt))}.`);
        } else if (payload?.unscheduled) {
          flash("Back in the approved pile.");
        } else if (payload?.error) {
          flash(String(payload.error));
        }
      } catch (error) {
        flash(error instanceof Error ? error.message : "Action failed.");
      } finally {
        setBusyId(null);
        setSchedulingId(null);
        await Promise.all([loadQueue(), loadLog()]);
      }
    },
    [callFn, flash, loadQueue, loadLog],
  );

  const runPlan = useCallback(
    async (apply: boolean) => {
      try {
        const payload = await callFn("brainox-schedule", { action: "plan", apply });
        if (payload?.blocked) {
          flash("X automation is stopped, so nothing was planned.");
          return;
        }
        const proposals = (payload?.proposals as Array<{ itemId: string; text: string; at: string }>) ?? [];
        if (!proposals.length) {
          flash("Nothing approved to plan. Approve a draft first.");
          return;
        }
        if (payload?.applied) {
          flash(`Scheduled ${proposals.length} post(s).`);
          setPlanProposals([]);
          await Promise.all([loadQueue(), loadLog()]);
        } else {
          setPlanProposals(proposals);
        }
      } catch (error) {
        flash(error instanceof Error ? error.message : "Planning failed.");
      }
    },
    [callFn, flash, loadQueue, loadLog],
  );

  // Drag-and-drop ordering (fractional positions, single-row updates).
  const handleDrop = useCallback(
    async (targetId: string) => {
      const sourceId = dragId.current;
      dragId.current = null;
      if (!sourceId || sourceId === targetId) return;
      const ordered = items.filter((item) => ["draft", "review", "approved", "paused"].includes(item.status));
      const targetIndex = ordered.findIndex((item) => item.id === targetId);
      if (targetIndex === -1) return;
      const before = ordered[targetIndex - 1];
      const target = ordered[targetIndex];
      const newPosition = before ? (before.position + target.position) / 2 : target.position - 1;
      await updateItem(sourceId, { position: newPosition });
    },
    [items, updateItem],
  );

  const addIdea = useCallback(async () => {
    const text = ideaText.trim();
    if (!user || !text) return;
    await (supabase as any).from("x_ideas").insert({ user_id: user.id, text });
    setIdeaText("");
    await loadIdeas();
  }, [user, ideaText, loadIdeas]);

  const draftIdea = useCallback(
    async (idea: Idea) => {
      setComposerMode("raw_thought");
      setComposerText(idea.text);
      await (supabase as any).from("x_ideas").update({ status: "drafted" }).eq("id", idea.id);
      await loadIdeas();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [loadIdeas],
  );

  const grouped = useMemo(() => {
    const buckets: Record<string, QueueItem[]> = {};
    for (const item of items) {
      (buckets[item.status] ??= []).push(item);
    }
    buckets["scheduled"]?.sort(
      (a, b) =>
        new Date(a.scheduled_publish_at ?? 0).getTime() - new Date(b.scheduled_publish_at ?? 0).getTime(),
    );
    buckets["published"]?.sort(
      (a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
    );
    return buckets;
  }, [items]);

  const activePillars = settings.pillars.filter((pillar) => !pillar.paused);

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a]" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-lg font-semibold">BrainoX</p>
          <p className="mt-2 text-sm text-white/50">
            The distribution command center is yours alone. Sign in to open it.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-block rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header / control bar */}
      <div className="border-b border-white/8 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-semibold tracking-tight shrink-0">Braino</span>
            <span className="text-white/30">/</span>
            <span className="text-white/50 text-sm">x command center</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] uppercase tracking-wide ${
                settings.kill_switch
                  ? "border-red-500/40 text-red-400"
                  : "border-emerald-500/30 text-emerald-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${settings.kill_switch ? "bg-red-400" : "bg-emerald-400"}`}
              />
              {settings.kill_switch ? "Stopped" : settings.automation_mode}
            </span>
            <button
              onClick={() => saveSettings({ ...settings, kill_switch: !settings.kill_switch })}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                settings.kill_switch
                  ? "bg-emerald-500 text-black hover:bg-emerald-400"
                  : "bg-red-500/15 text-red-300 hover:bg-red-500/25"
              }`}
            >
              {settings.kill_switch ? "Resume automation" : "Stop all X automation"}
            </button>
            <button
              onClick={() => setShowSettings((value) => !value)}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[12px] text-white/70 hover:text-white"
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
          <div className="rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm">{notice}</div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {/* Settings */}
        {showSettings && settingsLoaded && (
          <section className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:p-5 space-y-4">
            <p className="text-sm font-semibold">Distribution settings</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-[12px] text-white/50">
                Mode
                <select
                  value={settings.automation_mode}
                  onChange={(event) =>
                    saveSettings({ ...settings, automation_mode: event.target.value as Settings["automation_mode"] })
                  }
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black px-2 py-1.5 text-sm text-white"
                >
                  <option value="manual">Manual</option>
                  <option value="assisted">Assisted</option>
                  <option value="autopilot">Queue autopilot</option>
                </select>
              </label>
              <label className="text-[12px] text-white/50">
                Min gap (minutes)
                <input
                  type="number"
                  value={settings.min_gap_minutes}
                  onChange={(event) => saveSettings({ ...settings, min_gap_minutes: Number(event.target.value) || 90 })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-[12px] text-white/50">
                Max posts / day
                <input
                  type="number"
                  value={settings.max_posts_per_day}
                  onChange={(event) => saveSettings({ ...settings, max_posts_per_day: Number(event.target.value) || 5 })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-[12px] text-white/50">
                Daily follower target
                <input
                  type="number"
                  value={settings.daily_target}
                  onChange={(event) => saveSettings({ ...settings, daily_target: Number(event.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-[12px] text-white/50">
                Quiet from (hour)
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.quiet_start}
                  onChange={(event) => saveSettings({ ...settings, quiet_start: Number(event.target.value) % 24 })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-[12px] text-white/50">
                Quiet until (hour)
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settings.quiet_end}
                  onChange={(event) => saveSettings({ ...settings, quiet_end: Number(event.target.value) % 24 })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black px-2 py-1.5 text-sm"
                />
              </label>
              <label className="col-span-2 text-[12px] text-white/50">
                Timezone
                <input
                  value={settings.timezone}
                  onChange={(event) => saveSettings({ ...settings, timezone: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <div>
              <p className="text-[12px] text-white/50 mb-2">Content pillars (weight, pause)</p>
              <div className="flex flex-wrap gap-2">
                {settings.pillars.map((pillar, index) => (
                  <div
                    key={pillar.key}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] ${
                      pillar.paused ? "border-white/10 text-white/30" : "border-white/20 text-white/80"
                    }`}
                  >
                    <span>{pillar.label}</span>
                    <input
                      type="number"
                      value={pillar.weight}
                      onChange={(event) => {
                        const pillars = [...settings.pillars];
                        pillars[index] = { ...pillar, weight: Number(event.target.value) || 0 };
                        saveSettings({ ...settings, pillars });
                      }}
                      className="w-12 rounded bg-black border border-white/15 px-1 py-0.5 text-center"
                    />
                    <button
                      onClick={() => {
                        const pillars = [...settings.pillars];
                        pillars[index] = { ...pillar, paused: !pillar.paused };
                        saveSettings({ ...settings, pillars });
                      }}
                      className="text-white/40 hover:text-white"
                    >
                      {pillar.paused ? "resume" : "pause"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Briefing + overview */}
        <section className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">How's my X?</p>
              <p className="text-[12px] text-white/40">
                Followers, this week's posts, the queue, and one recommendation. Same numbers the voice briefing uses.
              </p>
            </div>
            <button
              onClick={fetchBriefing}
              disabled={briefingBusy}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {briefingBusy ? "Reading the account..." : "Brief me"}
            </button>
          </div>
          {briefingStats && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Followers"
                value={briefingStats.followers ? briefingStats.followers.current.toLocaleString() : "no snapshot yet"}
              />
              <Stat
                label="24h change"
                value={
                  briefingStats.followers?.delta1d !== null && briefingStats.followers?.delta1d !== undefined
                    ? `${briefingStats.followers.delta1d >= 0 ? "+" : ""}${briefingStats.followers.delta1d}`
                    : "n/a"
                }
              />
              <Stat label="Posts this week" value={String(briefingStats.week.postsPublished)} />
              <Stat label="Engagements (7d)" value={String(briefingStats.week.totalEngagement)} />
            </div>
          )}
          {briefing && <p className="mt-4 text-sm leading-relaxed text-white/85">{briefing}</p>}
        </section>

        {/* Composer */}
        <section className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["authored", "I wrote this"],
                ["raw_thought", "Raw thought"],
                ["generate", "Braino, draft something"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => {
                  setComposerMode(mode);
                  setOptions([]);
                }}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  composerMode === mode ? "bg-white text-black" : "border border-white/15 text-white/60 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
            {composerMode === "generate" && (
              <select
                value={composerPillar}
                onChange={(event) => setComposerPillar(event.target.value)}
                className="rounded-full border border-white/15 bg-black px-3 py-1.5 text-[12px] text-white/80"
              >
                {activePillars.map((pillar) => (
                  <option key={pillar.key} value={pillar.key}>
                    {pillar.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <textarea
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            placeholder={
              composerMode === "authored"
                ? "Paste the post exactly as you want it. Braino will not touch the wording."
                : composerMode === "raw_thought"
                  ? "Dump the thought. Braino turns it into three post options without inventing anything."
                  : "Optional: give Braino material to ground the drafts in. Empty means opinion-level only."
            }
            rows={3}
            className="w-full resize-y rounded-xl border border-white/12 bg-black/60 px-3 py-2.5 text-sm outline-none placeholder:text-white/25 focus:border-white/30"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/30">
              {composerMode === "authored" && composerText.length > 280
                ? `${composerText.length} chars. Over 280, it will publish as a thread if thread mode is on.`
                : `${composerText.length} chars`}
            </p>
            <button
              onClick={handleCompose}
              disabled={composerBusy || (composerMode !== "generate" && !composerText.trim())}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {composerBusy
                ? "Working..."
                : composerMode === "authored"
                  ? "Add to queue"
                  : "Generate options"}
            </button>
          </div>

          {options.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {options.map((option, index) => (
                <div key={index} className="rounded-xl border border-white/12 bg-black/50 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] text-white/40">
                    <span>{option.angle || "option"}</span>
                    <span className={option.total >= 80 ? "text-emerald-400" : option.total >= 70 ? "text-white/60" : "text-amber-400"}>
                      {option.total}/100
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed flex-1">{option.text}</p>
                  {option.authenticity_note && (
                    <p className="text-[11px] text-white/30">{option.authenticity_note}</p>
                  )}
                  <button
                    onClick={() => saveOption(option)}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-[12px] hover:bg-white hover:text-black transition-colors"
                  >
                    Save as draft
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Plan */}
        <section className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => runPlan(settings.automation_mode === "autopilot")}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:text-white"
          >
            {settings.automation_mode === "autopilot" ? "Autopilot: schedule approved posts" : "Suggest a schedule"}
          </button>
          <p className="text-[12px] text-white/35">
            Slots respect your spacing, quiet hours, and daily cap.
          </p>
        </section>

        {planProposals.length > 0 && (
          <section className="rounded-2xl border border-white/8 bg-white/4 p-4 space-y-2">
            <p className="text-sm font-semibold">Suggested schedule</p>
            {planProposals.map((proposal) => (
              <div key={proposal.itemId} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-white/70">{proposal.text}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[12px] text-white/40">{fmtWhen(proposal.at)}</span>
                  <button
                    onClick={async () => {
                      await runSchedule("schedule", proposal.itemId, proposal.at);
                      setPlanProposals((prev) => prev.filter((entry) => entry.itemId !== proposal.itemId));
                    }}
                    className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-black"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Queue */}
        {(["scheduled", "approved", "draft", "review", "paused", "failed", "published", "rejected"] as const).map(
          (status) => {
            const bucket = grouped[status];
            if (!bucket?.length) return null;
            const draggable = ["draft", "review", "approved", "paused"].includes(status);
            return (
              <section key={status} className="space-y-2">
                <p className="text-[12px] uppercase tracking-wide text-white/40">
                  {STATUS_LABELS[status]} <span className="text-white/25">({bucket.length})</span>
                </p>
                {bucket.map((item) => (
                  <div
                    key={item.id}
                    draggable={draggable}
                    onDragStart={() => (dragId.current = item.id)}
                    onDragOver={(event) => draggable && event.preventDefault()}
                    onDrop={() => draggable && handleDrop(item.id)}
                    className={`rounded-2xl border border-white/8 bg-white/4 p-4 ${draggable ? "cursor-grab" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {editingId === item.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editText}
                              onChange={(event) => setEditText(event.target.value)}
                              rows={3}
                              className="w-full resize-y rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-sm"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  await updateItem(item.id, { text: editText });
                                  setEditingId(null);
                                }}
                                className="rounded-full bg-white px-3 py-1 text-[12px] font-medium text-black"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-white/60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.text}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
                          {item.pillar && <span className="rounded-full border border-white/12 px-2 py-0.5">{item.pillar}</span>}
                          <span>{item.source.replace("_", " ")}</span>
                          {item.quality?.total !== undefined && <span>score {item.quality.total}</span>}
                          {item.status === "scheduled" && item.scheduled_publish_at && (
                            <span className="text-white/60">{fmtWhen(item.scheduled_publish_at)}</span>
                          )}
                          {item.status === "published" && item.published_at && (
                            <span>
                              {timeAgo(item.published_at)}
                              {item.x_post_id && (
                                <>
                                  {" · "}
                                  <a
                                    href={`https://x.com/i/status/${item.x_post_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline hover:text-white"
                                  >
                                    view on X
                                  </a>
                                </>
                              )}
                            </span>
                          )}
                          {item.error && <span className="text-red-400">{item.error}</span>}
                        </div>
                        {item.why?.held && item.why.held.length > 0 && item.status !== "published" && (
                          <p className="mt-2 text-[12px] text-amber-300/80">Held: {item.why.held.join(" ")}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {(item.status === "draft" || item.status === "review") && (
                          <>
                            <ItemButton onClick={() => updateItem(item.id, { status: "approved" })}>Approve</ItemButton>
                            <ItemButton
                              onClick={() => {
                                setEditingId(item.id);
                                setEditText(item.text);
                              }}
                            >
                              Edit
                            </ItemButton>
                            <ItemButton subtle onClick={() => updateItem(item.id, { status: "rejected" })}>
                              Reject
                            </ItemButton>
                          </>
                        )}
                        {item.status === "approved" && (
                          <>
                            {schedulingId === item.id ? (
                              <div className="flex flex-col items-end gap-1.5">
                                <input
                                  type="datetime-local"
                                  value={scheduleAt}
                                  onChange={(event) => setScheduleAt(event.target.value)}
                                  className="rounded-lg border border-white/15 bg-black px-2 py-1 text-[12px]"
                                />
                                <div className="flex gap-1.5">
                                  <ItemButton
                                    onClick={() =>
                                      scheduleAt && runSchedule("schedule", item.id, new Date(scheduleAt).toISOString())
                                    }
                                  >
                                    Confirm
                                  </ItemButton>
                                  <ItemButton subtle onClick={() => setSchedulingId(null)}>
                                    Cancel
                                  </ItemButton>
                                </div>
                              </div>
                            ) : (
                              <>
                                <ItemButton disabled={busyId === item.id} onClick={() => setSchedulingId(item.id)}>
                                  Schedule
                                </ItemButton>
                                <ItemButton disabled={busyId === item.id} onClick={() => runSchedule("publish_now", item.id)}>
                                  {busyId === item.id ? "Publishing..." : "Publish now"}
                                </ItemButton>
                                <ItemButton subtle onClick={() => updateItem(item.id, { status: "paused" })}>
                                  Pause
                                </ItemButton>
                              </>
                            )}
                          </>
                        )}
                        {item.status === "scheduled" && (
                          <ItemButton disabled={busyId === item.id} onClick={() => runSchedule("unschedule", item.id)}>
                            Unschedule
                          </ItemButton>
                        )}
                        {item.status === "paused" && (
                          <ItemButton onClick={() => updateItem(item.id, { status: "approved" })}>Resume</ItemButton>
                        )}
                        {item.status === "failed" && (
                          <>
                            <ItemButton disabled={busyId === item.id} onClick={() => runSchedule("publish_now", item.id)}>
                              Retry now
                            </ItemButton>
                            <ItemButton subtle onClick={() => updateItem(item.id, { status: "draft", error: null })}>
                              Back to drafts
                            </ItemButton>
                          </>
                        )}
                        {item.status !== "published" && (
                          <ItemButton subtle onClick={() => updateItem(item.id, { status: "archived" })}>
                            Archive
                          </ItemButton>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            );
          },
        )}

        {items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">
            The queue is empty. Write something above, or dump a raw thought and let Braino shape it.
          </p>
        )}

        {/* Ideas */}
        <section className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:p-5 space-y-3">
          <p className="text-sm font-semibold">Idea inbox</p>
          <div className="flex gap-2">
            <input
              value={ideaText}
              onChange={(event) => setIdeaText(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && addIdea()}
              placeholder="Ideas never disappear. Drop one here."
              className="flex-1 rounded-xl border border-white/12 bg-black/60 px-3 py-2 text-sm outline-none placeholder:text-white/25 focus:border-white/30"
            />
            <button onClick={addIdea} className="rounded-full border border-white/20 px-4 text-sm text-white/80 hover:text-white">
              Keep
            </button>
          </div>
          {ideas.length > 0 && (
            <div className="space-y-1.5">
              {ideas.map((idea) => (
                <div key={idea.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className={idea.status === "drafted" ? "text-white/30 line-through" : "text-white/75"}>
                    {idea.text}
                  </span>
                  {idea.status === "inbox" && (
                    <button
                      onClick={() => draftIdea(idea)}
                      className="shrink-0 text-[12px] text-white/40 hover:text-white"
                    >
                      Draft it
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Activity log */}
        {log.length > 0 && (
          <section className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:p-5">
            <p className="text-sm font-semibold mb-3">What Braino did, and why</p>
            <div className="space-y-2">
              {log.map((row) => (
                <div key={row.id} className="flex items-start gap-3 text-[13px]">
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      row.result === "success"
                        ? "bg-emerald-400"
                        : row.result === "blocked"
                          ? "bg-amber-400"
                          : "bg-red-400"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-white/75">
                      <span className="text-white/40">{row.agent}</span> · {row.action}
                      {row.target ? ` · "${row.target.slice(0, 70)}"` : ""}
                    </p>
                    {row.reason && <p className="text-white/35">{row.reason}</p>}
                  </div>
                  <span className="ml-auto shrink-0 text-white/25">{timeAgo(row.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="pb-8 text-center text-[11px] text-white/25">
          Publishing rides the connected X account. Manage the connection from the{" "}
          <Link to="/dashboard" className="underline hover:text-white/60">
            dashboard
          </Link>
          . Public stats stay on{" "}
          <Link to="/live" className="underline hover:text-white/60">
            /live
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/40 px-3 py-2.5">
      <p className="text-[11px] text-white/35">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ItemButton({
  children,
  onClick,
  subtle,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  subtle?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-3 py-1 text-[12px] transition-colors disabled:opacity-40 ${
        subtle
          ? "text-white/40 hover:text-white"
          : "border border-white/20 text-white/80 hover:bg-white hover:text-black"
      }`}
    >
      {children}
    </button>
  );
}
