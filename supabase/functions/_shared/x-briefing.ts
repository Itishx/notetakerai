// x-briefing.ts — one canonical answer to "how is my X doing", shared by the
// dashboard, the /x briefing endpoint, and the voice path.
//
// It used to live inside brainox-briefing, which meant the voice path (x-status)
// answered the same question from a completely different and much thinner set
// of queries: follower count, a delta, and mentions. So asking Braino out loud
// got a worse answer than opening the page, which is exactly backwards.
//
// Everything spoken is composed FROM the stats object below, never from
// separate queries, so the surfaces can never disagree.
import { BRAINO_TEXT_MODEL, BRAINO_TEXT_REASONING_EFFORT } from "./openai-models.ts";

const FORMAT_LABELS: Record<string, string> = {
  teach: "teaching something", opinion: "an opinion", "build-log": "what you shipped",
  story: "something that happened", contrarian: "disagreeing with the room",
  proof: "numbers and receipts", question: "a question for them",
};

export type XStats = Awaited<ReturnType<typeof buildXStats>>;

// deno-lint-ignore no-explicit-any
export async function buildXStats(supabase: any, userId: string) {
  const since7d = new Date(Date.now() - 7 * 864e5).toISOString();
  const since24h = new Date(Date.now() - 864e5).toISOString();

  const [
    { data: snapshots }, { data: postedRows }, { data: queueRows },
    { data: settings }, { data: recentActions }, { data: starred },
  ] = await Promise.all([
    supabase.from("x_follower_snapshots").select("captured_on,followers_count")
      .eq("user_id", userId).order("captured_on", { ascending: false }).limit(31),
    supabase.from("scheduled_x_posts").select("content,x_post_id,posted_at")
      .eq("user_id", userId).eq("status", "posted").gte("posted_at", since7d)
      .order("posted_at", { ascending: false }).limit(50),
    supabase.from("x_queue_items")
      .select("status,text,pillar,scheduled_publish_at,error")
      .eq("user_id", userId).not("status", "in", "(archived,rejected)").limit(200),
    supabase.from("x_settings")
      .select("daily_target,automation_mode,kill_switch,max_posts_per_day,quiet_start,quiet_end,length_mode,content_mix,voice_learned,voice_manual,voice_posts_read,voice_learned_at,pillars,setup_completed_at")
      .eq("user_id", userId).maybeSingle(),
    supabase.from("x_action_log").select("agent,action,target,reason,result,created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("x_voice_samples").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("starred", true),
  ]);

  /* ── followers ── */
  const ordered = (snapshots ?? []).slice().reverse();
  const latest = ordered[ordered.length - 1] ?? null;
  const deltaSince = (days: number): number | null => {
    if (!latest) return null;
    const target = new Date(Date.now() - days * 864e5);
    // deno-lint-ignore no-explicit-any
    const base = ordered.filter((r: any) => new Date(r.captured_on) <= target).pop();
    return base ? latest.followers_count - base.followers_count : null;
  };

  /* ── engagement on the week's posts ── */
  // deno-lint-ignore no-explicit-any
  const tweetIds = (postedRows ?? []).map((r: any) => r.x_post_id).filter(Boolean);
  // deno-lint-ignore no-explicit-any
  let analytics: any[] = [];
  if (tweetIds.length) {
    const { data } = await supabase.from("x_post_analytics")
      .select("tweet_id,like_count,retweet_count,reply_count,quote_count,bookmark_count")
      .eq("user_id", userId).in("tweet_id", tweetIds);
    analytics = data ?? [];
  }
  const engagementOf = (id: string | null) => {
    const r = analytics.find((e) => e.tweet_id === id);
    if (!r) return { likes: 0, reposts: 0, replies: 0, quotes: 0, bookmarks: 0, total: 0 };
    return {
      likes: r.like_count, reposts: r.retweet_count, replies: r.reply_count,
      quotes: r.quote_count, bookmarks: r.bookmark_count,
      total: r.like_count + r.retweet_count + r.reply_count + r.quote_count + r.bookmark_count,
    };
  };
  // deno-lint-ignore no-explicit-any
  const ranked = (postedRows ?? []).map((r: any) => ({
    text: r.content, postedAt: r.posted_at, xPostId: r.x_post_id,
    engagement: engagementOf(r.x_post_id),
  })).sort((a, b) => b.engagement.total - a.engagement.total);

  /* ── queue ── */
  const counts: Record<string, number> = {};
  for (const r of queueRows ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const nextScheduled = (queueRows ?? [])
    // deno-lint-ignore no-explicit-any
    .filter((r: any) => r.status === "scheduled" && r.scheduled_publish_at)
    // deno-lint-ignore no-explicit-any
    .sort((a: any, b: any) => new Date(a.scheduled_publish_at).getTime() - new Date(b.scheduled_publish_at).getTime())[0] ?? null;
  // deno-lint-ignore no-explicit-any
  const failures = (queueRows ?? []).filter((r: any) => r.status === "failed");

  /* ── what he did, and what he refused ── */
  const actions = recentActions ?? [];
  // deno-lint-ignore no-explicit-any
  const last24h = actions.filter((a: any) => a.created_at >= since24h);
  // deno-lint-ignore no-explicit-any
  const refusals = actions.filter((a: any) => a.result === "blocked").slice(0, 3);

  /* ── today's shape ── */
  const mix = Array.isArray(settings?.content_mix) ? settings.content_mix : [];
  const dayIndex = (new Date().getUTCDay() + 6) % 7;
  const todaysFormat = mix[dayIndex]?.format ?? null;

  const learned = settings?.voice_learned ?? null;

  return {
    followers: latest ? {
      current: latest.followers_count, asOf: latest.captured_on,
      delta1d: deltaSince(1), delta7d: deltaSince(7), delta30d: deltaSince(30),
      dailyTarget: settings?.daily_target ?? null,
    } : null,
    week: {
      postsPublished: (postedRows ?? []).length,
      totalEngagement: ranked.reduce((s, p) => s + p.engagement.total, 0),
      bestPost: ranked[0] ?? null,
      worstPost: ranked.length > 1 ? ranked[ranked.length - 1] : null,
      topPosts: ranked.slice(0, 5),
    },
    queue: {
      counts, nextScheduled,
      failures: failures.length,
      // deno-lint-ignore no-explicit-any
      firstFailure: failures[0] ? { text: (failures[0] as any).text, error: (failures[0] as any).error } : null,
    },
    voice: {
      hasRead: Boolean(learned),
      postsRead: settings?.voice_posts_read ?? 0,
      readAt: settings?.voice_learned_at ?? null,
      handTrained: Boolean(settings?.voice_manual),
      starredExamples: starred?.count ?? 0,
      summary: learned?.summary ?? null,
      lengthMode: settings?.length_mode ?? "balanced",
    },
    plan: {
      todaysFormat,
      todaysFormatLabel: todaysFormat ? FORMAT_LABELS[todaysFormat] ?? todaysFormat : null,
      week: mix,
      maxPerDay: settings?.max_posts_per_day ?? null,
      quietHours: settings ? { start: settings.quiet_start, end: settings.quiet_end } : null,
      // deno-lint-ignore no-explicit-any
      pillars: Array.isArray(settings?.pillars) ? settings.pillars.map((p: any) => p.label ?? p.key) : [],
    },
    automation: {
      mode: settings?.automation_mode ?? "manual",
      killSwitch: settings?.kill_switch ?? false,
      setUp: Boolean(settings?.setup_completed_at),
    },
    activity: { last24hCount: last24h.length, recent: actions.slice(0, 6), refusals },
    limits: {
      note: "Impressions, profile visits and follower attribution need a paid X API tier. Engagement counts and follower snapshots are live.",
    },
  };
}

export async function composeSpokenBriefing(stats: XStats): Promise<string | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: BRAINO_TEXT_MODEL,
        reasoning_effort: BRAINO_TEXT_REASONING_EFFORT,
        messages: [
          {
            role: "system",
            content: [
              "You are Braino, briefing the account owner on his X account out loud. First person, warm, direct, no preamble.",
              "This is a full status report, not a headline. Cover, in this order, skipping anything the JSON has no data for:",
              "1. Followers and the direction they moved.",
              "2. What went out this week and how it did. Name the best post by quoting a few words of it.",
              "3. What is in the queue right now and what goes out next, with the time.",
              "4. What YOU have been doing on his behalf since yesterday, from the activity list. If you refused to post something, say so and say why. That is the most useful sentence in the whole briefing.",
              "5. What kind of post today is meant to be, from the plan.",
              "6. One concrete recommendation, tied to a number you just said.",
              "Rules: use ONLY numbers present in the JSON, never invent or round up. If a value is null, skip that clause entirely rather than guessing.",
              "Never use em dashes or en dashes. Speak in short plain sentences. Under 180 words.",
              "If he has not had his voice read yet, say that plainly and say it is the single most useful thing he could do next.",
            ].join("\n"),
          },
          { role: "user", content: JSON.stringify(stats) },
        ],
      }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const text = String(payload?.choices?.[0]?.message?.content || "").trim();
    return text ? text.replace(/\s*[—–]\s*/g, ", ") : null;
  } catch (e) {
    console.error("spoken briefing failed:", e);
    return null;
  }
}

/* Used when the model is unavailable. Deliberately still detailed: a degraded
   briefing that only says the follower count is the bug this file exists to fix. */
export function fallbackBriefing(stats: XStats): string {
  const out: string[] = [];
  if (stats.followers) {
    const d = stats.followers.delta7d;
    out.push(`You have ${stats.followers.current.toLocaleString()} followers${d !== null ? `, ${d >= 0 ? "up" : "down"} ${Math.abs(d)} this week` : ""}.`);
  }
  out.push(`${stats.week.postsPublished} post${stats.week.postsPublished === 1 ? "" : "s"} went out this week with ${stats.week.totalEngagement} engagements.`);
  if (stats.week.bestPost) out.push(`Best one was "${stats.week.bestPost.text.slice(0, 70)}", ${stats.week.bestPost.engagement.total} engagements.`);
  const c = stats.queue.counts;
  out.push(`In the queue: ${c["scheduled"] ?? 0} scheduled, ${c["approved"] ?? 0} approved, ${c["draft"] ?? 0} waiting on you.`);
  if (stats.queue.nextScheduled?.scheduled_publish_at) {
    out.push(`Next one goes out at ${new Date(stats.queue.nextScheduled.scheduled_publish_at).toLocaleTimeString()}.`);
  }
  if (stats.activity.refusals.length) {
    // deno-lint-ignore no-explicit-any
    out.push(`I refused to post something: ${(stats.activity.refusals[0] as any).reason ?? "policy gate"}.`);
  }
  if (stats.plan.todaysFormatLabel) out.push(`Today is meant to be ${stats.plan.todaysFormatLabel}.`);
  if (!stats.voice.hasRead) out.push("I have not read your posting history yet. That is the most useful thing you could let me do next.");
  if (stats.automation.killSwitch) out.push("Publishing is currently stopped by your kill switch.");
  return out.join(" ");
}
