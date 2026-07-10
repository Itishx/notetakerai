// Braino Dev Pulse — Braino's sense of his own development history.
//
// This is a CAPABILITY / SENSE, not a personality file. It fetches recent git commits from the
// GitHub API, derives "work-rhythm" flags from their timestamps (when the builder last worked,
// whether it was a late night, a long burst, a streak, what theme he's been deep in), caches the
// result, and formats it into a short block that gets folded into Braino's system prompt.
//
// The personality half — how Braino *uses* this (ideating, gently noticing you worked till 5am) —
// lives in the Emotional Engine (the "building" moment + the ideation trait). This file only gives
// him the eyes; the heart is elsewhere. Mirrors the shape of realtime-cost-summary.ts: a shared
// loader imported directly by chat-about-notes (no HTTP hop), plus a thin edge function wrapper.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — avoids hammering GitHub on every chat turn
const HOUR_MS = 60 * 60 * 1000;
const SESSION_GAP_MS = 3 * HOUR_MS; // commits within 3h of each other count as one work session
const SHORT_COMMIT_COUNT = 12; // how many recent commits to show in the always-on block
const DIFF_COMMIT_COUNT = 5; // how many top commits to pull diffs for on-demand
const PATCH_CHARS = 1200; // truncate each commit's diff to keep tokens sane

type SupabaseClientLike = ReturnType<typeof createClient>;

export type DevCommit = {
  sha: string;
  message: string; // first line only
  date: string; // ISO author date
};

export type DevCommitDiff = {
  sha: string;
  message: string;
  files: Array<{ filename: string; additions: number; deletions: number; patch: string }>;
};

export type DevPulse = {
  repo: string;
  fetchedAt: string;
  commits: DevCommit[];
  rhythm: {
    lastCommitAt: string | null;
    lastCommitLocal: string | null; // human "Jun 22, 04:58" in the user's tz
    hoursSinceLastCommit: number | null;
    lateNight: boolean; // last session's final commit landed 00:00–05:00 local
    lateNightHourLocal: number | null; // the local hour (for "4am" phrasing)
    sessionBurst: number; // commits in the most recent unbroken work session
    streakDays: number; // consecutive local days with at least one commit
    themeCluster: { label: string; count: number; of: number } | null; // "voice", 8 of 15
  };
  diffs?: DevCommitDiff[]; // only present when withDiffs requested
};

export type LoadDevPulseOptions = {
  withDiffs?: boolean;
  clientTimeZone?: string | null;
  now?: Date;
};

// ── Public: does this message want Braino to reflect on his own development? ─────────────────
// Sibling of isRealtimeCostQuestion. Reuses the same cues as the "building" emotional moment.
const DEV_PULSE_RE =
  /\b(what (else )?(can|should) i (add|build|do)|make you better|improve you|what'?s new (in|with) you|ideate|brainstorm|what'?s next|next feature|work(ed|ing)? on you|when did i last|what did i (build|ship|change)|how long (was|have) i)\b/i;

export function isDevPulseQuestion(message: string | null | undefined): boolean {
  return DEV_PULSE_RE.test(String(message || ""));
}

// ── Public: load (cached) pulse for an authed request, formatted for the prompt ──────────────
export async function loadDevPulseForRequest(
  authHeader: string | null,
  options: LoadDevPulseOptions = {},
): Promise<{ pulse: DevPulse; formatted: string } | null> {
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const githubToken = Deno.env.get("GITHUB_TOKEN");
  const repo = (Deno.env.get("GITHUB_REPO") || "").trim();
  // Optional: the branch the builder actually works on. Empty = the repo's default branch.
  // Set this when active development lives on a feature branch (e.g. ahead of main).
  const branch = (Deno.env.get("GITHUB_BRANCH") || "").trim();

  // Graceful degradation: if the integration isn't configured, Braino simply has no dev-sense.
  if (!anonKey || !serviceRoleKey || !supabaseUrl || !githubToken || !repo) return null;
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await authClient.auth.getUser();
    if (error || !user) return null;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const pulse = await getOrRefreshPulse(admin, repo, branch, githubToken, options);
    if (!pulse) return null;

    return { pulse, formatted: formatDevPulse(pulse, options) };
  } catch (err) {
    console.error("dev-pulse load error:", err);
    return null;
  }
}

// ── Cache read-through. Diffs are never cached (cheap base stays fresh; diffs fetched live). ──
async function getOrRefreshPulse(
  admin: SupabaseClientLike,
  repo: string,
  branch: string,
  githubToken: string,
  options: LoadDevPulseOptions,
): Promise<DevPulse | null> {
  const now = options.now instanceof Date ? options.now : new Date();
  // Cache per repo+branch so switching branches doesn't serve the wrong history.
  const repoKey = branch ? `${repo}#${branch}` : repo;
  let base: DevPulse | null = null;

  const { data: cached } = await admin
    .from("braino_dev_pulse")
    .select("payload,fetched_at")
    .eq("repo", repoKey)
    .maybeSingle();

  const fresh = cached?.fetched_at &&
    now.getTime() - new Date(cached.fetched_at as string).getTime() < CACHE_TTL_MS;

  if (fresh && cached?.payload) {
    base = cached.payload as DevPulse;
    console.log("dev-pulse cache hit", repoKey);
  } else {
    base = await fetchPulseFromGitHub(repo, branch, githubToken, options);
    if (!base) {
      // GitHub failed — fall back to stale cache if we have any, rather than going blind.
      return cached?.payload ? (cached.payload as DevPulse) : null;
    }
    await admin
      .from("braino_dev_pulse")
      .upsert({ repo: repoKey, payload: base, fetched_at: now.toISOString() }, { onConflict: "repo" });
    console.log("dev-pulse refreshed from GitHub", repoKey);
  }

  // Diffs are requested on-demand and computed live (not part of the cached base).
  if (options.withDiffs && base) {
    base = { ...base, diffs: await fetchDiffs(repo, githubToken, base.commits) };
  }
  return base;
}

async function ghFetch(url: string, githubToken: string) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "braino-dev-pulse",
    },
  });
}

async function fetchPulseFromGitHub(
  repo: string,
  branch: string,
  githubToken: string,
  options: LoadDevPulseOptions,
): Promise<DevPulse | null> {
  const shaParam = branch ? `&sha=${encodeURIComponent(branch)}` : "";
  const res = await ghFetch(
    `https://api.github.com/repos/${repo}/commits?per_page=40${shaParam}`,
    githubToken,
  );
  if (!res.ok) {
    console.error("dev-pulse GitHub commits error:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const raw = await res.json();
  if (!Array.isArray(raw)) return null;

  const commits: DevCommit[] = raw
    .map((c: any) => ({
      sha: String(c?.sha || ""),
      message: String(c?.commit?.message || "").split("\n")[0].trim(),
      date: String(c?.commit?.author?.date || c?.commit?.committer?.date || ""),
    }))
    .filter((c) => c.sha && c.date);

  return {
    repo,
    fetchedAt: new Date().toISOString(),
    commits,
    rhythm: computeRhythm(commits, options.clientTimeZone),
  };
}

async function fetchDiffs(
  repo: string,
  githubToken: string,
  commits: DevCommit[],
): Promise<DevCommitDiff[]> {
  const top = commits.slice(0, DIFF_COMMIT_COUNT);
  const out: DevCommitDiff[] = [];
  for (const c of top) {
    try {
      const res = await ghFetch(`https://api.github.com/repos/${repo}/commits/${c.sha}`, githubToken);
      if (!res.ok) continue;
      const data = await res.json();
      const files = Array.isArray(data?.files)
        ? data.files.slice(0, 8).map((f: any) => ({
            filename: String(f?.filename || ""),
            additions: Number(f?.additions) || 0,
            deletions: Number(f?.deletions) || 0,
            patch: truncate(String(f?.patch || ""), PATCH_CHARS),
          }))
        : [];
      out.push({ sha: c.sha, message: c.message, files });
    } catch (err) {
      console.error("dev-pulse diff error:", c.sha, err);
    }
  }
  return out;
}

// ── Work-rhythm intelligence — the part that makes the sleep-nudge possible ──────────────────
function computeRhythm(commits: DevCommit[], timeZone?: string | null): DevPulse["rhythm"] {
  if (!commits.length) {
    return {
      lastCommitAt: null, lastCommitLocal: null, hoursSinceLastCommit: null,
      lateNight: false, lateNightHourLocal: null, sessionBurst: 0, streakDays: 0, themeCluster: null,
    };
  }

  const tz = normalizeTimeZone(timeZone);
  const dates = commits.map((c) => new Date(c.date)).filter((d) => !isNaN(d.getTime()));
  const last = dates[0];
  const lastHourLocal = localHour(last, tz);
  const lateNight = lastHourLocal >= 0 && lastHourLocal < 5;

  // sessionBurst: walk back while each commit is within SESSION_GAP_MS of the previous one.
  let sessionBurst = 1;
  for (let i = 1; i < dates.length; i++) {
    if (dates[i - 1].getTime() - dates[i].getTime() <= SESSION_GAP_MS) sessionBurst++;
    else break;
  }

  // streakDays: consecutive local calendar days (ending on the last commit's day) with a commit.
  const days = new Set(dates.map((d) => localDayKey(d, tz)));
  let streakDays = 0;
  const cursor = new Date(last);
  while (days.has(localDayKey(cursor, tz))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    lastCommitAt: last.toISOString(),
    lastCommitLocal: localStamp(last, tz),
    hoursSinceLastCommit: Math.max(0, Math.round((Date.now() - last.getTime()) / HOUR_MS)),
    lateNight,
    lateNightHourLocal: lateNight ? lastHourLocal : null,
    sessionBurst,
    streakDays,
    themeCluster: computeTheme(commits.slice(0, 15)),
  };
}

// Most common conventional-commit scope ("feat(voice)" → "voice"), else type ("fix"), in the window.
function computeTheme(commits: DevCommit[]): DevPulse["rhythm"]["themeCluster"] {
  const counts = new Map<string, number>();
  for (const c of commits) {
    const m = c.message.match(/^(\w+)(?:\(([^)]+)\))?:/);
    const key = (m?.[2] || m?.[1] || "").trim().toLowerCase();
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best: { label: string; count: number } | null = null;
  for (const [label, count] of counts) {
    if (!best || count > best.count) best = { label, count };
  }
  if (!best || best.count < 2) return null;
  return { label: best.label, count: best.count, of: commits.length };
}

// ── Formatting for the prompt ────────────────────────────────────────────────────────────────
export function formatDevPulse(pulse: DevPulse, options: LoadDevPulseOptions = {}): string {
  const r = pulse.rhythm;
  const lines: string[] = [`Repo: ${pulse.repo}`];

  if (r.lastCommitLocal) {
    const ago = r.hoursSinceLastCommit === null
      ? ""
      : r.hoursSinceLastCommit < 1
      ? " (just now)"
      : ` (${r.hoursSinceLastCommit}h ago)`;
    lines.push(`Last commit: ${r.lastCommitLocal} their local time${ago}.`);
  }
  if (r.lateNight && r.lateNightHourLocal !== null) {
    const h12 = ((r.lateNightHourLocal + 11) % 12) + 1;
    lines.push(`They were up late — their last commit landed around ${h12}am.`);
  }
  if (r.sessionBurst >= 3) {
    lines.push(`Their most recent work session was a real push: ${r.sessionBurst} commits back-to-back.`);
  }
  if (r.streakDays >= 2) {
    lines.push(`They've worked on you ${r.streakDays} days in a row.`);
  }
  if (r.themeCluster) {
    lines.push(`Lately they've been deep in "${r.themeCluster.label}" (${r.themeCluster.count} of the last ${r.themeCluster.of} commits).`);
  }

  lines.push("", "Recent commits (newest first):");
  for (const c of pulse.commits.slice(0, SHORT_COMMIT_COUNT)) {
    const stamp = shortStamp(c.date);
    lines.push(`- ${c.message}${stamp ? ` — ${stamp}` : ""}`);
  }

  if (options.withDiffs && pulse.diffs?.length) {
    lines.push("", "What actually changed in the latest few (for grounded, specific ideas):");
    for (const d of pulse.diffs) {
      lines.push(`• ${d.message}`);
      for (const f of d.files) {
        lines.push(`  ${f.filename} (+${f.additions}/-${f.deletions})`);
        if (f.patch) {
          lines.push(f.patch.split("\n").map((l) => `    ${l}`).join("\n"));
        }
      }
    }
  }

  return lines.join("\n");
}

// ── Small date helpers (Intl-based, honour the user's timezone) ───────────────────────────────
function normalizeTimeZone(tz?: string | null): string {
  const t = String(tz || "").trim();
  if (!t) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: t });
    return t;
  } catch {
    return "UTC";
  }
}

function localHour(date: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hour12: false }).format(date);
  const n = parseInt(h, 10);
  return n === 24 ? 0 : n; // some runtimes render midnight as "24"
}

function localDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date); // YYYY-MM-DD
}

function localStamp(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

function shortStamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(d);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… [diff truncated]`;
}
