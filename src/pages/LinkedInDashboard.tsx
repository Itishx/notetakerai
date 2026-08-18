// /linkedin — the dashboard, same three questions as /x: what needs me, what is
// going out, is it working.
//
// One panel exists here that has no equivalent on X, and it is the most
// important thing on the page: the comment drafter. On LinkedIn the comment is
// the growth lever, not the post. Comments carry 8 to 15 times the algorithmic
// weight of likes and a good comment on a large account reaches more of the
// right people than your own post does. Braino cannot send them (the Comments
// API sits behind Community Management access we do not have, and an
// auto-posted generic comment is worse than no comment) so he writes them and
// you send them. That is the correct split anyway.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "./onboarding-flow.css";
import "./x-dashboard.css";
import "./channel-theme.css";
import "./linkedin.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Row = {
  id: string; text: string; status: string; kind: string; pillar: string | null;
  format: string | null; target_url: string | null;
  scheduled_publish_at: string | null; published_at: string | null;
  permalink: string | null; error: string | null; created_at: string;
};
type Act = { id: string; agent: string; action: string; target: string | null; reason: string | null; result: string; created_at: string };
type Settings = {
  automation_mode: string; kill_switch: boolean; max_posts_per_day: number;
  quiet_start: number; quiet_end: number; length_mode: string;
  pillars: { key: string; label: string }[] | null;
  content_mix: { day: string; format: string }[] | null;
  voice_manual: Record<string, unknown> | null;
  setup_completed_at: string | null;
};

const FORMATS: Record<string, string> = {
  teach: "Teach something", opinion: "An opinion", "build-log": "What I shipped",
  story: "Something that happened", contrarian: "Disagree with the room",
  proof: "Numbers and receipts", question: "Ask them",
};

export default function LinkedInDashboard() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [activity, setActivity] = useState<Act[]>([]);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  /* comment drafter */
  const [postText, setPostText] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [comments, setComments] = useState<{ text: string; angle: string; total?: number }[]>([]);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => { document.title = "Braino for LinkedIn"; }, []);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const [conn, set, q, acts] = await Promise.all([
      (supabase as any).from("channel_connections").select("handle,display_name")
        .eq("user_id", user.id).eq("channel", "linkedin").maybeSingle(),
      (supabase as any).from("channel_settings").select("*")
        .eq("user_id", user.id).eq("channel", "linkedin").maybeSingle(),
      (supabase as any).from("channel_queue_items")
        .select("id,text,status,kind,pillar,format,target_url,scheduled_publish_at,published_at,permalink,error,created_at")
        .eq("user_id", user.id).eq("channel", "linkedin")
        .order("created_at", { ascending: false }).limit(60),
      (supabase as any).from("channel_action_log")
        .select("id,agent,action,target,reason,result,created_at")
        .eq("user_id", user.id).eq("channel", "linkedin")
        .order("created_at", { ascending: false }).limit(8),
    ]);
    setConnected(Boolean(conn.data?.handle));
    setHandle(conn.data?.display_name || conn.data?.handle || null);
    setSettings((set.data as Settings) ?? null);
    setRows((q.data as Row[]) ?? []);
    setActivity((acts.data as Act[]) ?? []);
    setLastCheck(Date.now());
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const poll = window.setInterval(() => { void load(); }, 30_000);
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => { window.clearInterval(poll); window.clearInterval(t); };
  }, [load]);

  const posts = useMemo(() => rows.filter((r) => r.kind === "post"), [rows]);
  const needsYou = useMemo(() => posts.filter((r) => r.status === "draft" || r.status === "review"), [posts]);
  const goingOut = useMemo(() => posts.filter((r) => (r.status === "approved" || r.status === "scheduled") && !r.published_at)
    .sort((a, b) => (a.scheduled_publish_at ?? "z").localeCompare(b.scheduled_publish_at ?? "z")), [posts]);
  const published = useMemo(() => posts.filter((r) => r.status === "published"), [posts]);
  const failed = useMemo(() => posts.filter((r) => r.status === "failed"), [posts]);
  const todayIndex = (new Date().getDay() + 6) % 7;
  const needsSetup = !settings?.setup_completed_at;

  const setStatus = useCallback(async (id: string, status: string) => {
    if (!user) return;
    setBusy(id);
    await (supabase as any).from("channel_queue_items").update({ status }).eq("id", id).eq("user_id", user.id);
    await load(); setBusy(null);
  }, [user, load]);

  const draftComment = useCallback(async () => {
    if (!postText.trim()) return;
    setDrafting(true); setDraftError(null); setComments([]);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/linkedin-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ mode: "comment", input: postText.trim(), targetUrl: postUrl.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Could not draft a comment.");
      setComments(payload.options ?? []);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setDrafting(false); }
  }, [postText, postUrl, session]);

  const copy = useCallback(async (text: string, i: number) => {
    await navigator.clipboard.writeText(text);
    setCopied(i);
    window.setTimeout(() => setCopied(null), 2000);
  }, []);

  if (!loading && needsSetup) {
    return (
      <div className="ob-doc xd-doc ch-linkedin">
        <Head handle={handle} mode={settings?.automation_mode} />
        <main className="xd-main xd-empty">
          <p className="ob-eyebrow">Braino for LinkedIn</p>
          <h1 className="ob-h1">Not set up <em>yet.</em></h1>
          <p className="ob-lede">Three minutes. Connect LinkedIn, tell him how you talk, and set how far he can go alone.</p>
          <button type="button" className="ob-btn is-coral" onClick={() => navigate("/linkedin/setup")}>Set up Braino for LinkedIn</button>
        </main>
      </div>
    );
  }

  return (
    <div className="ob-doc xd-doc ch-linkedin">
      <Head handle={handle} mode={settings?.automation_mode} />
      <main className="xd-main">
        <section className="xd-hero">
          <p className="ob-eyebrow">Today</p>
          <h1 className="xd-headline">
            {loading ? "Loading..."
              : needsYou.length ? <>You have <em>{needsYou.length} {needsYou.length === 1 ? "post" : "posts"}</em> to look at.</>
              : goingOut.length ? <>Nothing needs you. <em>{goingOut.length}</em> queued.</>
              : <>Nothing waiting. <em>Go comment on something.</em></>}
          </h1>
          {settings?.kill_switch && <p className="xd-alert">Kill switch is ON. Nothing will publish.</p>}
          {!!failed.length && <p className="xd-alert">{failed.length} post{failed.length === 1 ? "" : "s"} failed. {failed[0]?.error}</p>}
          {!connected && <p className="xd-alert">LinkedIn is not connected, so nothing can publish. <Link to="/linkedin/setup">Connect it</Link></p>}
        </section>

        <section className="xd-stats">
          <div><span>Published</span><b>{published.length}</b><em>through Braino</em></div>
          <div><span>Queued</span><b>{goingOut.length}</b><em>max {settings?.max_posts_per_day ?? 1} a day</em></div>
          <div><span>Waiting on you</span><b className={needsYou.length ? "is-hot" : undefined}>{needsYou.length}</b><em>{needsYou.length ? "about a minute" : "you are clear"}</em></div>
          <div><span>Followers</span><b>—</b><em>needs API access we do not have</em></div>
        </section>

        {/* ── The growth lever ───────────────────────────────────────── */}
        <section className="xd-block li-comment">
          <div className="xd-block-head">
            <h2>Comment on somebody's post</h2>
            <p>
              This grows you faster than posting does. Comments carry 8 to 15 times the weight of
              likes, and one on a big account beats your own post to a small following. Paste what
              they wrote, get something worth saying.
            </p>
          </div>
          <div className="li-composer">
            <textarea rows={5} value={postText} onChange={(e) => setPostText(e.target.value)}
              placeholder="Paste the post you want to comment on..." />
            <input value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="Its URL (optional)" />
            <button type="button" className="ob-btn is-coral" onClick={draftComment} disabled={drafting || !postText.trim()}>
              {drafting ? "Thinking..." : "Draft three comments"}
            </button>
            {draftError && <p className="xs-error">{draftError}</p>}
          </div>
          {!!comments.length && (
            <div className="li-drafts">
              {comments.map((c, i) => (
                <article key={i}>
                  <span className="li-angle">{c.angle}{typeof c.total === "number" ? ` · ${c.total}/100` : ""}</span>
                  <p>{c.text}</p>
                  <button type="button" onClick={() => copy(c.text, i)}>{copied === i ? "Copied" : "Copy"}</button>
                </article>
              ))}
              <p className="xd-fine">
                Braino never posts these. LinkedIn's comment API sits behind partner access we do not
                have, and an auto-posted comment reads like a bot anyway. Copy, paste, send.
              </p>
            </div>
          )}
        </section>

        {/* ── Needs you ──────────────────────────────────────────────── */}
        <section className="xd-block">
          <div className="xd-block-head"><h2>Needs you</h2><p>Read it, tap yes or no.</p></div>
          {needsYou.length === 0 ? <div className="xd-none">Nothing waiting.</div> : (
            <div className="xd-cards">
              {needsYou.map((r) => (
                <article key={r.id} className="xd-card">
                  <p className="xd-card-text">{r.text}</p>
                  <div className="xd-card-foot">
                    <span className="xd-pill">{settings?.pillars?.find((p) => p.key === r.pillar)?.label ?? r.pillar ?? "general"}</span>
                    <div className="xd-actions">
                      <button type="button" className="xd-no" disabled={busy === r.id} onClick={() => setStatus(r.id, "rejected")}>Not this</button>
                      <button type="button" className="xd-yes" disabled={busy === r.id} onClick={() => setStatus(r.id, "approved")}>{busy === r.id ? "..." : "Post this"}</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="xd-block">
          <div className="xd-block-head"><h2>Going out</h2><p>Approved and waiting for their slot.</p></div>
          {goingOut.length === 0 ? <div className="xd-none">Queue is empty.</div> : (
            <ol className="xd-timeline">
              {goingOut.slice(0, 8).map((r) => (
                <li key={r.id}><span className="xd-when">{whenLabel(r.scheduled_publish_at)}</span><p>{r.text}</p></li>
              ))}
            </ol>
          )}
        </section>

        <section className="xd-block">
          <div className="xd-block-head">
            <h2>What he is doing</h2>
            <p>Every decision, including refusals.<span className="xd-live"><i />{lastCheck ? `checked ${secondsAgo(lastCheck)}` : "connecting"}</span></p>
          </div>
          {activity.length === 0 ? <div className="xd-none">Nothing yet.</div> : (
            <ol className="xd-activity">
              {activity.map((a) => (
                <li key={a.id} className={a.result === "blocked" ? "is-blocked" : a.result === "failed" ? "is-failed" : undefined}>
                  <span className="xd-act-when">{shortAgo(a.created_at)}</span>
                  <div><b>{a.action.replace(/[:_]/g, " ")}{a.target ? ` · ${a.target.slice(0, 50)}` : ""}</b>{a.reason && <p>{a.reason}</p>}</div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="xd-block">
          <div className="xd-block-head"><h2>This week's shape</h2><p>What kind of post goes out on each day.</p></div>
          <div className="xd-mix">
            {(settings?.content_mix ?? []).map((row, i) => (
              <div key={row.day} className={"xd-mix-day" + (i === todayIndex ? " is-today" : "")}>
                <span>{row.day}</span><b>{FORMATS[row.format] ?? row.format}</b>{i === todayIndex && <em>today</em>}
              </div>
            ))}
          </div>
        </section>

        <section className="xd-block">
          <div className="xd-block-head"><h2>Is it working</h2><p>Plain answers, including what is not available.</p></div>
          <div className="xd-health">
            <H ok={connected} label="Connected to LinkedIn" detail={handle ?? "not connected"} />
            <H ok={!settings?.kill_switch} label="Publishing allowed" detail={settings?.kill_switch ? "kill switch on" : "kill switch off"} />
            <H ok={Boolean(settings?.voice_manual)} label="Knows how you talk" detail={settings?.voice_manual ? "hand trained" : "not trained"} />
            <H ok={false} label="Analytics" detail="needs partner access" />
          </div>
          <p className="xd-fine">
            LinkedIn will not let a member app read your own posts, so follower counts and post
            performance are genuinely unavailable here until Community Management access lands.
            Everything else on this page is real. <Link to="/linkedin/setup">Change settings</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function Head({ handle, mode }: { handle: string | null; mode?: string }) {
  return (
    <header className="ob-top">
      <div className="ob-top-inner">
        <Link to="/channels" className="ob-mark"><i />braino for LinkedIn</Link>
        <span className="ob-count">{handle ?? "not connected"}{mode ? ` · ${mode}` : ""}</span>
      </div>
    </header>
  );
}
function H({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return <div className={"xd-health-row" + (ok ? " is-ok" : " is-bad")}><i>{ok ? "✓" : "!"}</i><b>{label}</b><span>{detail}</span></div>;
}
function whenLabel(iso: string | null) {
  if (!iso) return "no time yet";
  const d = new Date(iso); const now = new Date();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  const tm = new Date(now.getTime() + 864e5);
  if (d.toDateString() === tm.toDateString()) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} ${time}`;
}
function secondsAgo(ms: number) { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`; }
function shortAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now"; if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
