// /x — the dashboard, rebuilt so it answers questions instead of exposing
// controls.
//
// The previous /x was a command centre: queue, composer, policy explanations,
// settings, action log and briefing, all on one surface with no order. That is
// the right tool once you already know the system and the wrong first screen
// for anybody. It still exists at /x/advanced.
//
// This one is built around the only three questions a founder actually opens
// this page with: what needs me, what is going out, and is it working. Every
// number here is real or explicitly labelled as not yet measured. Nothing is
// invented to make the page look busier.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "./onboarding-flow.css";
import "./x-dashboard.css";
import "./channel-theme.css";

type QueueRow = {
  id: string;
  text: string;
  status: string;
  pillar: string | null;
  scheduled_publish_at: string | null;
  published_at: string | null;
  x_post_id: string | null;
  error: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string; agent: string; action: string;
  target: string | null; reason: string | null; result: string; created_at: string;
};

type ReplyRow = {
  id: string; post_author_handle: string; post_url: string; post_text: string;
  our_reply: string; replied_at: string;
  opportunity_score: number | null; opportunity_reason: string | null;
  outcome: string; surface: string;
};

type Settings = {
  automation_mode: string;
  length_mode: string;
  content_mix: { day: string; format: string }[] | null;
  kill_switch: boolean;
  max_posts_per_day: number;
  quiet_start: number;
  quiet_end: number;
  pillars: { key: string; label: string; paused?: boolean }[] | null;
  xauto_daily_cap: number;
  voice_learned: Record<string, unknown> | null;
  voice_manual: Record<string, unknown> | null;
  voice_posts_read: number;
  voice_learned_at: string | null;
  setup_completed_at: string | null;
};


/* ── Demo data ───────────────────────────────────────────────────────────
   /x?demo fills every panel so the layout can be judged before there is a
   month of real history to judge it with. Opt-in by query string rather than
   a hardcoded fixture, so there is nothing to revert later and no path where
   invented numbers can reach a real account. The banner says so on screen.  */

const DEMO_NOW = Date.now();
const iso = (minutesFromNow: number) => new Date(DEMO_NOW + minutesFromNow * 60_000).toISOString();

const DEMO_QUEUE: QueueRow[] = [
  { id: "d1", status: "draft", pillar: "building-braino", scheduled_publish_at: null, published_at: null, x_post_id: null, error: null, created_at: iso(-40),
    text: "Spent four hours today on a black rectangle.\n\nIt's the Mac notch. Braino lives in it now.\n\nWorth it." },
  { id: "d2", status: "draft", pillar: "founder", scheduled_publish_at: null, published_at: null, x_post_id: null, error: null, created_at: iso(-95),
    text: "Nobody warns you that 80% of building a product is making one thing look right, and the other 20% is explaining why that took four hours." },
  { id: "d3", status: "review", pillar: "contrarian", scheduled_publish_at: null, published_at: null, x_post_id: null, error: null, created_at: iso(-160),
    text: "Every AI company is selling you the building.\n\nNobody is selling you the being seen.\n\nThat's the whole gap." },

  { id: "s1", status: "scheduled", pillar: "building-braino", scheduled_publish_at: iso(75), published_at: null, x_post_id: null, error: null, created_at: iso(-300),
    text: "Shipped voice learning today. Braino reads your last 200 posts and works out how you write, so you never have to describe your own voice in a text box." },
  { id: "s2", status: "scheduled", pillar: "ai-agents", scheduled_publish_at: iso(400), published_at: null, x_post_id: null, error: null, created_at: iso(-320),
    text: "The X API charges 1.5 cents a post. 20 cents if the post has a link in it.\n\nSo now the link goes in the reply. Cheaper and better reach. Rare that both agree." },
  { id: "s3", status: "approved", pillar: "founder", scheduled_publish_at: iso(1180), published_at: null, x_post_id: null, error: null, created_at: iso(-340),
    text: "Three months in. No launch, no revenue, one waitlist, about 1,100 commits.\n\nStill the most fun I have had building anything." },
  { id: "s4", status: "scheduled", pillar: "technical", scheduled_publish_at: iso(1600), published_at: null, x_post_id: null, error: null, created_at: iso(-360),
    text: "Reddit will shadowban you in days for posting the same link across ten subreddits.\n\nSo the engine treats Reddit as one target per campaign. Hard rule, not a setting." },
  { id: "s5", status: "scheduled", pillar: "building-braino", scheduled_publish_at: iso(2600), published_at: null, x_post_id: null, error: null, created_at: iso(-380),
    text: "Braino now checks that his own post actually went live instead of assuming it did.\n\nEmbarrassing that this was ever missing." },

  ...Array.from({ length: 34 }, (_, i) => ({
    id: `p${i}`, status: "published", pillar: "building-braino",
    scheduled_publish_at: iso(-1440 * (i + 1)), published_at: iso(-1440 * (i + 1)),
    x_post_id: `19${i}`, error: null, created_at: iso(-1440 * (i + 1)),
    text: "Published post " + (i + 1),
  })),
];

const DEMO_ACTIVITY: ActivityRow[] = [
  { id: "a1", agent: "content", action: "generate:pillar", target: "what I'm building", reason: "3 options produced, 1 dropped for being too short.", result: "success", created_at: iso(-4) },
  { id: "a2", agent: "scheduler", action: "scheduled", target: "Shipped voice learning today...", reason: "Placed at 2:21 AM, your strongest hour for this pillar.", result: "success", created_at: iso(-38) },
  { id: "a3", agent: "policy", action: "blocked", target: "Three months in, no launch...", reason: "Near duplicate of a post from 6 days ago. Held, not deleted.", result: "blocked", created_at: iso(-52) },
  { id: "a4", agent: "publisher", action: "published", target: "Braino now checks his own post...", reason: "Verified live on X, permalink stored.", result: "success", created_at: iso(-190) },
  { id: "a5", agent: "x-voice-learn", action: "learned_voice", target: "brainosays", reason: "Read 200 posts and rebuilt the voice profile.", result: "success", created_at: iso(-2880) },
];

const DEMO_REPLIES: ReplyRow[] = [
  { id: "r1", post_author_handle: "levelsio", post_url: "#", outcome: "sent", surface: "browser",
    post_text: "Most AI wrappers die because the model gets better and eats the wrapper. What survives?",
    our_reply: "The part that owns the context. A wrapper dies when the model can do the same job cold. Ours can't be done cold: it needs 200 of your posts and eight months of your commits.",
    opportunity_score: 84, opportunity_reason: "Direct question in your problem space, thread still moving", replied_at: iso(-25) },
  { id: "r2", post_author_handle: "swyx", post_url: "#", outcome: "skipped", surface: "browser",
    post_text: "Big congrats to the team on the raise, so well deserved.",
    our_reply: "", opportunity_score: 18, opportunity_reason: "Congratulations post, deserves a like not a comment", replied_at: iso(-31) },
  { id: "r3", post_author_handle: "dr_cintas", post_url: "#", outcome: "sent", surface: "browser",
    post_text: "Everyone is building agents. Almost nobody is building the thing that makes agents trustworthy.",
    our_reply: "Trust is just legibility with a receipt. Ours logs every refusal with the gate that caught it. Turns out people forgive a no far faster than a silent yes.",
    opportunity_score: 79, opportunity_reason: "Contestable claim you have real evidence about", replied_at: iso(-96) },
  { id: "r4", post_author_handle: "nutlope", post_url: "#", outcome: "skipped", surface: "browser",
    post_text: "what's everyone shipping this weekend?",
    our_reply: "", opportunity_score: 34, opportunity_reason: "Already 400 replies, one more is noise", replied_at: iso(-180) },
];

const FORMAT_LABELS: Record<string, string> = {
  teach: "Teach something",
  opinion: "An opinion",
  "build-log": "What I shipped",
  story: "Something that happened",
  contrarian: "Disagree with the room",
  proof: "Numbers and receipts",
  question: "Ask them",
};

const DEMO_SETTINGS = {
  automation_mode: "assisted",
  kill_switch: false,
  max_posts_per_day: 3,
  quiet_start: 23,
  quiet_end: 7,
  pillars: [
    { key: "building-braino", label: "What I'm building" },
    { key: "founder", label: "Founder life" },
    { key: "ai-agents", label: "AI and agents" },
    { key: "contrarian", label: "Unpopular opinions" },
    { key: "technical", label: "Technical deep dives" },
  ],
  voice_learned: {
    summary: "Short sentences, often fragments. Opens with the blunt fact and lets it sit, no setup line. Never uses hashtags, almost never emoji. Dry humour, usually at his own expense, roughly one post in four. Writes about building, being solo, and what he got wrong. Posts about failing outperform posts about shipping by roughly four to one.",
  },
  voice_manual: { dials: {} },
  length_mode: "substantial",
  xauto_daily_cap: 20,
  content_mix: [
    { day: "Mon", format: "build-log" }, { day: "Tue", format: "teach" },
    { day: "Wed", format: "opinion" }, { day: "Thu", format: "story" },
    { day: "Fri", format: "proof" }, { day: "Sat", format: "contrarian" },
    { day: "Sun", format: "question" },
  ],
  voice_posts_read: 200,
  voice_learned_at: new Date(DEMO_NOW - 86_400_000 * 2).toISOString(),
  setup_completed_at: new Date(DEMO_NOW - 86_400_000 * 31).toISOString(),
} as unknown as Settings;

const DEMO_FOLLOWERS = [
  1893, 1921, 1958, 1974, 2012, 2049, 2088, 2103, 2147, 2199,
  2236, 2281, 2318, 2354, 2402, 2447, 2489, 2531, 2578, 2614,
  2661, 2708, 2742, 2789, 2831, 2874, 2918, 2963, 3005, 3047,
].map((count, i) => ({ date: new Date(DEMO_NOW - 86_400_000 * (29 - i)).toISOString().slice(0, 10), count }));


export default function XDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [followers, setFollowers] = useState<{ date: string; count: number }[]>([]);
  const [starredCount, setStarredCount] = useState(0);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const demo = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo");

  useEffect(() => { document.title = "Braino for X"; }, []);

  const load = useCallback(async () => {
    if (demo) {
      setConnected(true);
      setHandle("brainosays");
      setSettings(DEMO_SETTINGS);
      setQueue(DEMO_QUEUE);
      setFollowers(DEMO_FOLLOWERS);
      setStarredCount(4);
      setActivity(DEMO_ACTIVITY);
      setReplies(DEMO_REPLIES);
      setLastCheck(Date.now());
      setLoading(false);
      return;
    }
    if (!user) { setLoading(false); return; }
    const [conn, set, q, snaps, stars, acts, reps] = await Promise.all([
      (supabase as any).from("x_connections").select("username").eq("user_identifier", user.id).maybeSingle(),
      (supabase as any).from("x_settings").select(
        "automation_mode,kill_switch,max_posts_per_day,quiet_start,quiet_end,pillars,voice_learned,voice_manual,voice_posts_read,voice_learned_at,setup_completed_at,length_mode,content_mix,xauto_daily_cap",
      ).eq("user_id", user.id).maybeSingle(),
      (supabase as any).from("x_queue_items").select(
        "id,text,status,pillar,scheduled_publish_at,published_at,x_post_id,error,created_at",
      ).eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
      (supabase as any).from("x_follower_snapshots").select("captured_on,followers_count")
        .eq("user_id", user.id).order("captured_on", { ascending: false }).limit(30),
      (supabase as any).from("x_voice_samples").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("starred", true),
      (supabase as any).from("x_activity_feed")
        .select("id,agent,action,target,reason,result,created_at")
        .eq("user_id", user.id).limit(8),
      (supabase as any).from("x_auto_reply_logs")
        .select("id,post_author_handle,post_url,post_text,our_reply,replied_at,opportunity_score,opportunity_reason,outcome,surface")
        .eq("user_id", user.id).order("replied_at", { ascending: false }).limit(12),
    ]);

    setConnected(Boolean(conn.data?.username));
    setHandle(conn.data?.username ?? null);
    setSettings((set.data as Settings) ?? null);
    setQueue((q.data as QueueRow[]) ?? []);
    setFollowers(((snaps.data as { captured_on: string; followers_count: number }[]) ?? [])
      .map((r) => ({ date: r.captured_on, count: r.followers_count })).reverse());
    setStarredCount(stars.count ?? 0);
    setActivity((acts?.data as ActivityRow[]) ?? []);
    setReplies((reps?.data as ReplyRow[]) ?? []);
    setLastCheck(Date.now());
    setLoading(false);
  }, [user, demo]);

  useEffect(() => { void load(); }, [load]);

  // Re-read every 30 seconds so the page is current without pretending to hold
  // a socket it does not have. The separate 1s tick only moves the "checked Ns
  // ago" label, which is the honest way to show liveness.
  useEffect(() => {
    if (demo) return;
    const poll = window.setInterval(() => { void load(); }, 30_000);
    return () => window.clearInterval(poll);
  }, [load, demo]);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  /* ── Derived: the three questions ────────────────────────────────────── */
  const needsYou = useMemo(
    () => queue.filter((r) => r.status === "draft" || r.status === "review"),
    [queue],
  );
  const goingOut = useMemo(
    () => queue
      .filter((r) => (r.status === "approved" || r.status === "scheduled") && !r.published_at)
      .sort((a, b) => (a.scheduled_publish_at ?? "z").localeCompare(b.scheduled_publish_at ?? "z")),
    [queue],
  );
  const published = useMemo(
    () => queue.filter((r) => r.status === "published"),
    [queue],
  );
  const failed = useMemo(() => queue.filter((r) => r.status === "failed"), [queue]);

  const followerNow = followers.length ? followers[followers.length - 1].count : null;
  const followerWeekAgo = followers.length > 7 ? followers[followers.length - 8].count : followers[0]?.count ?? null;
  const followerDelta = followerNow !== null && followerWeekAgo !== null ? followerNow - followerWeekAgo : null;

  const todayIndex = (new Date().getDay() + 6) % 7; // Monday first, to match content_mix
  const voiceKnown = Boolean(settings?.voice_learned) || Boolean(settings?.voice_manual);
  const needsSetup = !connected || !settings?.setup_completed_at;

  const approve = useCallback(async (id: string) => {
    if (demo) { setQueue((q) => q.map((r) => (r.id === id ? { ...r, status: "approved", scheduled_publish_at: iso(240) } : r))); return; }
    if (!user) return;
    setBusy(id);
    await (supabase as any).from("x_queue_items").update({ status: "approved" }).eq("id", id).eq("user_id", user.id);
    await load();
    setBusy(null);
  }, [user, load, demo]);

  const reject = useCallback(async (id: string) => {
    if (demo) { setQueue((q) => q.filter((r) => r.id !== id)); return; }
    if (!user) return;
    setBusy(id);
    await (supabase as any).from("x_queue_items").update({ status: "rejected" }).eq("id", id).eq("user_id", user.id);
    await load();
    setBusy(null);
  }, [user, load, demo]);

  /* ── First run ───────────────────────────────────────────────────────── */
  if (!loading && needsSetup) {
    return (
      <div className="ob-doc xd-doc ch-x">
        <Header handle={handle} mode={settings?.automation_mode} />
        <main className="xd-main xd-empty">
          <p className="ob-eyebrow">Braino for X</p>
          <h1 className="ob-h1">Not set up <em>yet.</em></h1>
          <p className="ob-lede">
            Three minutes. He connects to your account, reads how you write, and you tell him how
            far he can go on his own.
          </p>
          <button type="button" className="ob-btn is-coral" onClick={() => navigate("/x/setup")}>
            Set up Braino for X
          </button>
          <p className="xd-fine">
            Already connected but the setup never finished? The flow picks up where you left it.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="ob-doc xd-doc ch-x">
      <Header handle={handle} mode={settings?.automation_mode} />

      <main className="xd-main">
        {demo && (
          <div className="xd-demo">
            <b>Demo data</b>
            <span>Every number and post on this page is invented, so the layout can be judged before there is a month of real history. Drop <code>?demo</code> from the URL for your real account.</span>
          </div>
        )}

        {/* ── Line one: the only sentence that matters ───────────────── */}
        <section className="xd-hero">
          <p className="ob-eyebrow">Today</p>
          <h1 className="xd-headline">
            {loading ? "Loading..."
              : needsYou.length
                ? <>You have <em>{needsYou.length} {needsYou.length === 1 ? "post" : "posts"}</em> to look at.</>
                : goingOut.length
                  ? <>Nothing needs you. <em>{goingOut.length}</em> queued up.</>
                  : <>Nothing waiting. <em>Give him something.</em></>}
          </h1>
          {settings?.kill_switch && (
            <p className="xd-alert">Kill switch is ON. Nothing will publish until you turn it off.</p>
          )}
          {!!failed.length && (
            <p className="xd-alert">{failed.length} post{failed.length === 1 ? "" : "s"} failed to publish. Check the details below.</p>
          )}
        </section>

        {/* ── The four numbers ───────────────────────────────────────── */}
        <section className="xd-stats">
          <div>
            <span>Followers</span>
            <b>{followerNow === null ? "—" : followerNow.toLocaleString()}</b>
            <em>{followerDelta === null ? "tracking starts today"
              : followerDelta === 0 ? "flat this week"
              : `${followerDelta > 0 ? "+" : ""}${followerDelta.toLocaleString()} this week`}</em>
          </div>
          <div>
            <span>Published</span>
            <b>{published.length}</b>
            <em>all time, through Braino</em>
          </div>
          <div>
            <span>Queued</span>
            <b>{goingOut.length}</b>
            <em>max {settings?.max_posts_per_day ?? 3} a day</em>
          </div>
          <div>
            <span>Waiting on you</span>
            <b className={needsYou.length ? "is-hot" : undefined}>{needsYou.length}</b>
            <em>{needsYou.length ? "takes about a minute" : "you are clear"}</em>
          </div>
        </section>

        {/* ── Needs you ──────────────────────────────────────────────── */}
        <section className="xd-block">
          <div className="xd-block-head">
            <h2>Needs you</h2>
            <p>Read it, tap yes or no. That is the whole job.</p>
          </div>
          {needsYou.length === 0 ? (
            <div className="xd-none">Nothing waiting. He will bring you drafts as he writes them.</div>
          ) : (
            <div className="xd-cards">
              {needsYou.map((row) => (
                <article key={row.id} className="xd-card">
                  <p className="xd-card-text">{row.text}</p>
                  <div className="xd-card-foot">
                    <span className="xd-pill">{prettyPillar(row.pillar, settings)}</span>
                    <div className="xd-actions">
                      <button type="button" className="xd-no" disabled={busy === row.id} onClick={() => reject(row.id)}>
                        Not this
                      </button>
                      <button type="button" className="xd-yes" disabled={busy === row.id} onClick={() => approve(row.id)}>
                        {busy === row.id ? "..." : "Post this"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── Going out ──────────────────────────────────────────────── */}
        <section className="xd-block">
          <div className="xd-block-head">
            <h2>Going out</h2>
            <p>Approved and waiting for their slot. He picks the time.</p>
          </div>
          {goingOut.length === 0 ? (
            <div className="xd-none">Queue is empty.</div>
          ) : (
            <ol className="xd-timeline">
              {goingOut.slice(0, 8).map((row) => (
                <li key={row.id}>
                  <span className="xd-when">{whenLabel(row.scheduled_publish_at)}</span>
                  <p>{row.text}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ── xAuto ──────────────────────────────────────────────────── */}
        <section className="xd-block">
          <div className="xd-block-head">
            <h2>xAuto</h2>
            <p>
              He reads your timeline, judges it, and drafts replies only for the few worth
              answering. You press send. Every decision lands here, including the ones he passed on.
            </p>
          </div>
          {replies.length === 0 ? (
            <div className="xd-none">
              Nothing yet. Open X with the extension running and he will offer to start, or say
              "start xAuto" to Braino on your Mac.
            </div>
          ) : (
            <ol className="xd-replies">
              {replies.map((r) => (
                <li key={r.id} className={r.outcome === "skipped" ? "is-skipped" : undefined}>
                  <div className="xr-head">
                    <b>@{r.post_author_handle}</b>
                    <span className={"xr-verdict is-" + r.outcome}>
                      {r.outcome === "sent" ? "Sent" : r.outcome === "skipped" ? "You skipped" : "Drafted"}
                    </span>
                    {typeof r.opportunity_score === "number" && <em>{r.opportunity_score}/100</em>}
                    <span className="xr-when">{shortAgo(r.replied_at)}</span>
                  </div>
                  <p className="xr-post">{r.post_text.slice(0, 190)}{r.post_text.length > 190 ? "..." : ""}</p>
                  {r.our_reply
                    ? <p className="xr-reply">{r.our_reply}</p>
                    : <p className="xr-reason">He passed: {r.opportunity_reason}</p>}
                  {r.our_reply && r.opportunity_reason && <p className="xr-reason">Why this one: {r.opportunity_reason}</p>}
                </li>
              ))}
            </ol>
          )}
          <p className="xd-fine">
            Capped at <b>{settings?.xauto_daily_cap ?? 20} replies a day</b>, well under X's own
            limits, because the goal is not to squeeze under a threshold. It is to look like a
            person having a normal day. Braino never sends one himself.
          </p>
        </section>

        {/* ── What he is doing right now ─────────────────────────────── */}
        <section className="xd-block">
          <div className="xd-block-head">
            <h2>What he is doing</h2>
            <p>
              Every decision he made, including the ones where he refused.
              <span className="xd-live">
                <i />{lastCheck ? `checked ${secondsAgo(lastCheck)}` : "connecting"}
              </span>
            </p>
          </div>
          {activity.length === 0 ? (
            <div className="xd-none">Nothing yet. He logs every action here, including blocks.</div>
          ) : (
            <ol className="xd-activity">
              {activity.map((a) => (
                <li key={a.id} className={a.result === "blocked" ? "is-blocked" : a.result === "failed" ? "is-failed" : undefined}>
                  <span className="xd-act-when">{shortAgo(a.created_at)}</span>
                  <div>
                    <b>{actionLabel(a)}</b>
                    {a.reason && <p>{a.reason}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ── This week's shape ──────────────────────────────────────── */}
        <section className="xd-block">
          <div className="xd-block-head">
            <h2>This week's shape</h2>
            <p>What kind of post goes out on each day. Topics say what it's about, this says what it is.</p>
          </div>
          <div className="xd-mix">
            {(settings?.content_mix ?? []).map((row, i) => (
              <div key={row.day} className={"xd-mix-day" + (i === todayIndex ? " is-today" : "")}>
                <span>{row.day}</span>
                <b>{FORMAT_LABELS[row.format] ?? row.format}</b>
                {i === todayIndex && <em>today</em>}
              </div>
            ))}
          </div>
          <p className="xd-fine">
            Post length: <b>{lengthLabel(settings?.length_mode)}</b>. Anything shorter is thrown
            away before you see it. <Link to="/x/voice">Change how you talk</Link>
          </p>
        </section>

        {/* ── What he knows about you ────────────────────────────────── */}
        <section className="xd-block">
          <div className="xd-block-head">
            <h2>What he knows about you</h2>
            <p>The voice he writes in. Half read from your posts, half told by you.</p>
          </div>
          <div className="xd-voice">
            <div className="xd-voice-main">
              {voiceKnown ? (
                <>
                  <p className="xd-voice-summary">
                    {String((settings?.voice_learned as { summary?: string })?.summary
                      ?? (settings?.voice_manual as { describe?: string })?.describe
                      ?? "Trained by hand.")}
                  </p>
                  <div className="xd-voice-meta">
                    <span><b>{settings?.voice_posts_read ?? 0}</b> posts read</span>
                    <span><b>{starredCount}</b> starred examples</span>
                    <span><b>{settings?.voice_manual ? "yes" : "no"}</b> hand training</span>
                    {settings?.voice_learned_at && <span>last read {dayLabel(settings.voice_learned_at)}</span>}
                  </div>
                </>
              ) : (
                <p className="xd-voice-summary">
                  He has not learned your voice yet. That is the single highest-value thing on
                  this page.
                </p>
              )}
            </div>
            <div className="xd-voice-actions">
              <Link to="/x/voice" className="ob-btn is-outline">Train him</Link>
            </div>
          </div>
        </section>

        {/* ── Health ─────────────────────────────────────────────────── */}
        <section className="xd-block">
          <div className="xd-block-head">
            <h2>Is it working</h2>
            <p>Plain answers. If something is off, it says so here rather than failing quietly.</p>
          </div>
          <div className="xd-health">
            <Health ok={connected} label="Connected to X" detail={handle ? `@${handle}` : "not connected"} />
            <Health ok={!settings?.kill_switch} label="Publishing allowed" detail={settings?.kill_switch ? "kill switch on" : "kill switch off"} />
            <Health ok={voiceKnown} label="Knows your voice" detail={voiceKnown ? `${settings?.voice_posts_read ?? 0} posts read` : "not trained yet"} />
            <Health ok={failed.length === 0} label="No failures" detail={failed.length ? `${failed.length} failed` : "all clean"} />
          </div>
          <p className="xd-fine">
            Leash: <b>{modeLabel(settings?.automation_mode)}</b>. Quiet hours{" "}
            {hourLabel(settings?.quiet_start ?? 23)} to {hourLabel(settings?.quiet_end ?? 7)}.{" "}
            <Link to="/x/setup">Change</Link> · <Link to="/x/advanced">Advanced controls</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function Header({ handle, mode }: { handle: string | null; mode?: string }) {
  return (
    <header className="ob-top">
      <div className="ob-top-inner">
        <Link to="/" className="ob-mark"><i />braino for X</Link>
        <span className="ob-count">
          {handle ? `@${handle}` : "not connected"}{mode ? ` · ${modeLabel(mode)}` : ""}
        </span>
      </div>
    </header>
  );
}

function Health({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={"xd-health-row" + (ok ? " is-ok" : " is-bad")}>
      <i>{ok ? "✓" : "!"}</i>
      <b>{label}</b>
      <span>{detail}</span>
    </div>
  );
}

function lengthLabel(mode?: string) {
  if (mode === "substantial") return "Substantial, never under 180 characters";
  if (mode === "punchy") return "Punchy, never under 60 characters";
  return "Balanced, never under 120 characters";
}

function actionLabel(a: ActivityRow) {
  const t = a.target ? ` ${a.target.length > 54 ? a.target.slice(0, 54) + "..." : a.target}` : "";
  if (a.action.startsWith("generate")) return `Wrote drafts${t ? " for" + t : ""}`;
  if (a.action === "scheduled") return `Scheduled${t}`;
  if (a.action === "published") return `Published${t}`;
  if (a.action === "blocked") return `Refused to post${t}`;
  if (a.action === "learned_voice") return `Read your history${t ? " from" + t : ""}`;
  return `${a.action}${t}`;
}

function secondsAgo(ms: number) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

function shortAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function modeLabel(mode?: string) {
  if (mode === "autopilot") return "Run it";
  if (mode === "assisted") return "Approve once";
  return "Ask me everything";
}

function prettyPillar(key: string | null, settings: Settings | null) {
  if (!key) return "general";
  const found = settings?.pillars?.find((p) => p.key === key);
  return found?.label ?? key;
}

function whenLabel(iso: string | null) {
  if (!iso) return "no time yet";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today ${time}`;
  const tomorrow = new Date(now.getTime() + 86_400_000);
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function hourLabel(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
}
