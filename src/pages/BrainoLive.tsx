import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const STATS_URL = `${SUPABASE_URL}/functions/v1/x-auto-public-stats?username=brainoai`;

type PublicStats = {
  account: { username: string; display_name: string };
  pipeline: {
    auto_posting_enabled: boolean;
    auto_reply_enabled: boolean;
    next_post_at: string | null;
  };
  totals: {
    posts: number;
    likes: number;
    retweets: number;
    replies_received: number;
    replies_sent: number;
  };
  recent_posts: Array<{
    id: string;
    content: string;
    posted_at: string;
    x_url: string;
    likes: number;
    retweets: number;
    replies: number;
    bookmarks: number;
  }>;
  recent_replies: Array<{
    author_handle: string;
    mention_text: string;
    our_reply: string;
    replied_at: string;
    post_url: string;
  }>;
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

function timeUntil(iso: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "any moment";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.floor(hrs / 24)}d`;
}

export default function BrainoLive() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { data, isLoading, isError } = useQuery<PublicStats>({
    queryKey: ["braino-live-stats"],
    queryFn: async () => {
      const res = await fetch(STATS_URL);
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const pipelineRunning = data?.pipeline.auto_posting_enabled || data?.pipeline.auto_reply_enabled;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/8 px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="font-semibold tracking-tight shrink-0">Braino</span>
            <span className="text-white/30">/</span>
            <span className="text-white/50 text-sm">live</span>
          </div>
          <a
            href="https://trybraino.com"
            className="text-[12px] text-white/40 hover:text-white/70 transition-colors shrink-0 hidden sm:block"
          >
            trybraino.com →
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 sm:px-6 sm:py-10 sm:space-y-10">

        {/* Hero status bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: pipelineRunning ? "#22c55e" : "#6b7280",
                boxShadow: pipelineRunning ? `0 0 ${6 + (tick % 2) * 2}px #22c55e` : "none",
                transition: "box-shadow 0.5s ease",
              }}
            />
            <span className="text-[13px] font-medium">
              {isLoading ? "Loading…" : pipelineRunning ? "Pipeline running" : "Pipeline paused"}
            </span>
          </div>
          {data && (
            <a
              href={`https://x.com/${data.account.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-white/50 hover:text-white/80 transition-colors"
            >
              @{data.account.username}
            </a>
          )}
          {data?.pipeline.next_post_at && (
            <span className="text-[12px] text-white/30 font-mono">
              next {timeUntil(data.pipeline.next_post_at)}
            </span>
          )}
          <div className="flex items-center gap-2 sm:ml-auto">
            {data?.pipeline.auto_posting_enabled && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-400 font-mono">
                posting
              </span>
            )}
            {data?.pipeline.auto_reply_enabled && (
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] text-sky-400 font-mono">
                replying
              </span>
            )}
          </div>
        </div>

        {/* Stats row — 2 cols on mobile, 4 on sm+ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total posts", value: data?.totals.posts ?? "—" },
            { label: "Total likes", value: data?.totals.likes ?? "—" },
            { label: "Retweets", value: data?.totals.retweets ?? "—" },
            { label: "Auto-replies", value: data?.totals.replies_sent ?? "—" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:p-5">
              <div className="text-[24px] sm:text-[28px] font-semibold tracking-tight tabular-nums">
                {isLoading ? <span className="animate-pulse text-white/20">···</span> : stat.value.toLocaleString()}
              </div>
              <div className="mt-1 text-[11px] sm:text-[12px] text-white/40 font-mono">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout — stacks on mobile, side-by-side on lg */}
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">

          {/* Tweet feed */}
          <div>
            <div className="mb-3 text-[11px] font-mono text-white/30 uppercase tracking-widest">Recent posts</div>
            <div className="space-y-3">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-white/8 bg-white/4 p-5 h-28" />
                ))}
              {isError && (
                <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-8 text-center text-[13px] text-white/30">
                  Could not load posts — retrying shortly.
                </div>
              )}
              {data?.recent_posts.length === 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-8 text-center text-[13px] text-white/30">
                  No posts yet — pipeline is warming up.
                </div>
              )}
              {data?.recent_posts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-white/8 bg-white/4 p-4 sm:p-5">
                  <p className="text-[14px] leading-relaxed text-white/85 mb-4">{post.content}</p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3 sm:gap-4 text-[12px] text-white/30 font-mono">
                      <span>❤ {post.likes}</span>
                      <span>↻ {post.retweets}</span>
                      <span>↩ {post.replies}</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-[11px] text-white/25 font-mono">{timeAgo(post.posted_at)}</span>
                      {/* Always visible on mobile (no hover-only on touch) */}
                      <a
                        href={post.x_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-white/40 sm:text-white/30 hover:text-white/60 transition-colors font-mono sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        View →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reply log */}
          <div>
            <div className="mb-3 text-[11px] font-mono text-white/30 uppercase tracking-widest">Auto-replies</div>
            <div className="space-y-3">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-white/8 bg-white/4 p-4 h-28" />
                ))}
              {data?.recent_replies.length === 0 && (
                <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-8 text-center text-[12px] text-white/30">
                  No replies yet — will engage when mentions come in.
                </div>
              )}
              {data?.recent_replies.map((reply, i) => (
                <div key={i} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-white/30 font-mono">@{reply.author_handle}</span>
                    <span className="text-white/15">·</span>
                    <span className="text-[11px] text-white/20 font-mono">{timeAgo(reply.replied_at)}</span>
                  </div>
                  <p className="mb-2 text-[12px] text-white/40 italic leading-relaxed line-clamp-2">
                    "{reply.mention_text}"
                  </p>
                  <p className="text-[13px] text-white/70 leading-relaxed">{reply.our_reply}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — stacks on mobile */}
        <div className="border-t border-white/8 pt-6 sm:pt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-white/20 font-mono">
            Auto-refreshes every 30s · Built with Braino
          </span>
          <a
            href="https://trybraino.com"
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors font-mono"
          >
            Get your own autonomous X →
          </a>
        </div>
      </div>
    </div>
  );
}
