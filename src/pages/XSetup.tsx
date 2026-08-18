// /x/setup — the step-by-step way to hand Braino your X account.
//
// The old /x page dropped a full control panel on a first-time user: queue,
// composer, policy gates and settings, all at once, with no order to them. This
// is the same machinery approached one decision at a time, in the warm-paper
// onboarding language already used by /onboarding, so the two feel like the
// same product.
//
// The spine of it is the voice step. Every other tool asks you to describe your
// own voice in a text box, which nobody can do. Braino reads 200 of your posts
// and tells YOU what he found, and then you correct him. Both halves are kept:
// what he inferred (voice_learned) and what you told him (voice_manual), and
// yours outranks his at generation time.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "./onboarding-flow.css";
import "./x-setup.css";
import "./channel-theme.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Step = "hello" | "connect" | "reading" | "voice" | "topics" | "rhythm" | "leash" | "done";

const STEPS: Step[] = ["hello", "connect", "reading", "voice", "topics", "rhythm", "leash", "done"];

/* The dials. Deliberately five, deliberately named in plain words, because
   "brand tone: professional" is the kind of setting nobody can answer honestly.
   Each end of each scale is a sentence, not an adjective. */
const DIALS = [
  { key: "funny", label: "Jokes", low: "Play it straight", high: "Make me laugh" },
  { key: "conversational", label: "How I talk", low: "Written, considered", high: "Like I'm talking to you" },
  { key: "spicy", label: "Opinions", low: "Careful, balanced", high: "Say the thing" },
  { key: "personal", label: "Me in it", low: "About the work", high: "About me doing the work" },
  { key: "technical", label: "Depth", low: "Anyone can follow", high: "Builders only" },
] as const;

const DEFAULT_DIALS: Record<string, number> = {
  funny: 3, conversational: 3, spicy: 3, personal: 3, technical: 3,
};

const TOPIC_SUGGESTIONS = [
  { key: "building-braino", label: "What I'm building" },
  { key: "founder", label: "Founder life" },
  { key: "ai-agents", label: "AI and agents" },
  { key: "contrarian", label: "Unpopular opinions" },
  { key: "technical", label: "Technical deep dives" },
  { key: "industry", label: "Industry takes" },
  { key: "lessons", label: "Things I got wrong" },
  { key: "behind-scenes", label: "Behind the scenes" },
];

const LEASH = [
  {
    id: "manual", name: "Ask me everything",
    note: "He writes. You approve every single post before it goes out. Nothing surprises you.",
    mode: "manual" as const,
  },
  {
    id: "assisted", name: "Approve once, he handles the rest",
    note: "You approve the post. He picks the time, posts it, checks it landed, and reports back. Recommended.",
    mode: "assisted" as const, rec: true,
  },
  {
    id: "autopilot", name: "Run it",
    note: "He fills the queue and publishes approved posts on his own schedule. You can still veto anything in the queue.",
    mode: "autopilot" as const,
  },
];

type Learned = {
  summary?: string;
  sentence_style?: string;
  opener_style?: string;
  closer_style?: string;
  humor?: string;
  formatting?: Record<string, string>;
  signature_phrases?: string[];
  never_does?: string[];
  topics?: { name: string; share: string }[];
  what_works?: { pattern: string; evidence: string }[];
  what_flops?: { pattern: string; evidence: string }[];
  confidence?: string;
  posts_read?: number;
  best_hours_utc?: { hour_utc: number; posts: number; avg_engagement: number }[];
  median_length?: number;
};

export default function XSetup() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const [connected, setConnected] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [followers, setFollowers] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [learned, setLearned] = useState<Learned | null>(null);
  const [postsRead, setPostsRead] = useState(0);
  const [readCost, setReadCost] = useState(0);
  const [topPosts, setTopPosts] = useState<{ id: string; text: string; score: number }[]>([]);
  const [starred, setStarred] = useState<Record<string, boolean>>({});

  const [dials, setDials] = useState<Record<string, number>>(DEFAULT_DIALS);
  const [describe, setDescribe] = useState("");
  const [always, setAlways] = useState("");
  const [never, setNever] = useState("");
  const [correction, setCorrection] = useState("");

  const [topics, setTopics] = useState<string[]>(["building-braino", "founder"]);
  const [customTopic, setCustomTopic] = useState("");

  const [perDay, setPerDay] = useState(3);
  const [quietStart, setQuietStart] = useState(23);
  const [quietEnd, setQuietEnd] = useState(7);
  const [mode, setMode] = useState<"manual" | "assisted" | "autopilot">("assisted");

  const [saving, setSaving] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => { document.title = "Set up Braino for X"; }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);
  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  /* ── Is X already connected? ─────────────────────────────────────────── */
  const checkConnection = useCallback(async () => {
    if (!user) return false;
    const { data } = await (supabase as any)
      .from("x_connections")
      .select("username, display_name")
      .eq("user_identifier", user.id)
      .maybeSingle();
    if (data?.username) {
      setConnected(true);
      setHandle(data.username);
      return true;
    }
    return false;
  }, [user]);

  useEffect(() => { void checkConnection(); }, [checkConnection]);

  /* ── Connect ─────────────────────────────────────────────────────────── */
  const connectX = useCallback(async () => {
    if (!user) {
      setConnectError("You are not signed in to Braino. Sign in first, then connect X.");
      return;
    }
    setConnectError(null);
    setConnecting(true);
    // Opened synchronously so the browser does not treat it as a popup blocker
    // candidate. The URL is set after the token round trip returns.
    const popup = window.open("about:blank", "_blank", "width=620,height=720");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/x-oauth-start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ userIdentifier: user.id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.authUrl) {
        popup?.close();
        throw new Error(payload.error || "Could not start the X connection.");
      }
      if (popup && !popup.closed) popup.location.href = payload.authUrl;
      else window.open(payload.authUrl, "_blank");

      const startedAt = Date.now();
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        const ok = await checkConnection();
        if (ok) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setConnecting(false);
          popup?.close();
          setStep((s) => s + 1);
        } else if (Date.now() - startedAt > 180_000) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setConnecting(false);
          setConnectError("That took too long. Try again.");
        }
      }, 2000);
    } catch (e) {
      setConnecting(false);
      setConnectError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, [user, session, checkConnection]);

  /* ── Read the history ────────────────────────────────────────────────── */
  const runLearn = useCallback(async () => {
    setReading(true);
    setReadError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/x-voice-learn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({}),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Braino could not read your posts.");
      setLearned(payload.learned ?? null);
      setPostsRead(payload.posts_read ?? 0);
      setReadCost(payload.est_cost_usd ?? 0);
      setTopPosts(payload.top_posts ?? []);
      // Seed the topic picks from what he actually found them posting about.
      const found = (payload.learned?.topics ?? []) as { name: string }[];
      if (found.length) {
        const matched = TOPIC_SUGGESTIONS
          .filter((t) => found.some((f) => f.name?.toLowerCase().includes(t.label.toLowerCase().split(" ")[0])))
          .map((t) => t.key);
        if (matched.length) setTopics(matched);
      }
      setStep((s) => s + 1);
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setReading(false);
    }
  }, [session]);

  const toggleStar = useCallback(async (id: string) => {
    const next = !starred[id];
    setStarred((s) => ({ ...s, [id]: next }));
    if (!user) return;
    await (supabase as any)
      .from("x_voice_samples")
      .update({ starred: next })
      .eq("user_id", user.id)
      .eq("x_post_id", id);
  }, [starred, user]);

  /* ── Save and finish ─────────────────────────────────────────────────── */
  const finish = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const pillars = topics.map((key, i) => {
        const known = TOPIC_SUGGESTIONS.find((t) => t.key === key);
        return {
          key,
          label: known?.label ?? key,
          weight: Math.round(100 / Math.max(topics.length, 1)),
          paused: false,
          order: i,
        };
      });

      const voiceManual = {
        dials,
        describe: describe.trim() || null,
        always: splitLines(always),
        never: splitLines(never),
        correction: correction.trim() || null,
        written_at: new Date().toISOString(),
      };

      await (supabase as any).from("x_settings").upsert({
        user_id: user.id,
        voice_manual: voiceManual,
        pillars,
        max_posts_per_day: perDay,
        quiet_start: quietStart,
        quiet_end: quietEnd,
        automation_mode: mode,
        setup_completed_at: new Date().toISOString(),
        setup_step: "done",
      }, { onConflict: "user_id" });

      setStep(STEPS.length - 1);
    } finally {
      setSaving(false);
    }
  }, [user, topics, dials, describe, always, never, correction, perDay, quietStart, quietEnd, mode]);

  // Only the topic step has a hard requirement. Connecting X is the real path,
  // but a preview of the flow is a legitimate reason to be here, and every step
  // after this one already degrades honestly when there is no connection.
  const canContinue = useMemo(() => {
    if (current === "topics") return topics.length > 0;
    return true;
  }, [current, topics]);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const starCount = Object.values(starred).filter(Boolean).length;

  return (
    <div className="ob-doc xs-doc ch-x">
      <header className="ob-top">
        <div className="ob-top-inner">
          <Link to="/x" className="ob-mark"><i />braino for X</Link>
          <span className="ob-count">
            {current === "done" ? "All set" : `Step ${step + 1} of ${STEPS.length - 1}`}
          </span>
        </div>
        <div className="ob-progress">
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <main className="ob-stage">
        {/* ── Hello ─────────────────────────────────────────────────── */}
        {current === "hello" && (
          <section className="ob-step ob-hello">
            <p className="ob-eyebrow">Braino for X</p>
            <h1 className="ob-h1">Let him learn<br /><em>how you talk.</em></h1>
            <p className="ob-lede">
              Six questions, about three minutes. By the end he will know how you write,
              what you write about, and exactly how far he is allowed to go without asking you.
            </p>
            <div className="xs-promise">
              <div><b>He reads you first</b><span>200 of your own posts, so you never have to describe your own voice.</span></div>
              <div><b>You correct him</b><span>He tells you what he found. You tell him where he is wrong.</span></div>
              <div><b>You keep the yes</b><span>Nothing goes out that you have not seen. That never changes.</span></div>
            </div>
          </section>
        )}

        {/* ── Connect ───────────────────────────────────────────────── */}
        {current === "connect" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step one</p>
            <h1 className="ob-h1">Connect <em>your X.</em></h1>
            <p className="ob-lede">
              X will ask if Braino can read your posts and post for you. This is a key card, not
              your password, and you can cancel it from your X settings at any moment.
            </p>

            <div className="ob-body">
              {connected ? (
                <div className="xs-connected">
                  <b>Connected</b>
                  <span>@{handle}</span>
                  <p>Braino can see your account. Next he reads it.</p>
                </div>
              ) : (
                <>
                  <button type="button" className="ob-btn is-coral xs-connect" onClick={connectX} disabled={connecting}>
                    {connecting ? "Waiting for X..." : "Connect X"}
                  </button>
                  {connectError && <p className="xs-error">{connectError}</p>}
                  <p className="xs-fine">
                    Not ready to connect? Continue anyway and walk the rest of the setup. He
                    will not be able to read your posts until an account is attached, and the
                    dashboard will keep asking you to finish this step.
                  </p>
                </>
              )}
              <ul className="xs-scopes">
                <li><b>Read your posts</b> so he can learn your voice and check what worked</li>
                <li><b>Post on your behalf</b> only for posts you approved</li>
                <li><b>Read your mentions</b> so he can draft replies for you</li>
              </ul>
            </div>
          </section>
        )}

        {/* ── Reading ───────────────────────────────────────────────── */}
        {current === "reading" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step two</p>
            <h1 className="ob-h1">Let him <em>read you.</em></h1>
            <p className="ob-lede">
              He pulls your last 200 posts along with how each one performed, and works out how you
              actually write. It takes about twenty seconds and costs one dollar, once, ever.
            </p>
            <div className="ob-body">
              {!reading && !learned && (
                <>
                  <button type="button" className="ob-btn is-coral xs-connect" onClick={runLearn}>
                    Read my last 200 posts
                  </button>
                  {readError && <p className="xs-error">{readError}</p>}
                  <p className="xs-fine">
                    He reads posts only. Not your DMs, not your drafts, not anyone else's account.
                  </p>
                </>
              )}
              {reading && (
                <div className="xs-reading">
                  <div className="xs-bar"><span /></div>
                  <p>Reading your posts, working out the pattern...</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Voice ─────────────────────────────────────────────────── */}
        {current === "voice" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step three</p>
            <h1 className="ob-h1">Here is what<br /><em>he found.</em></h1>
            <p className="ob-lede">
              Read it. Where he is right, leave it. Where he is wrong, tell him below. What you
              write beats what he guessed, always.
            </p>

            <div className="ob-body">
              {learned ? (
                <>
                  <div className="xs-found">
                    <div className="xs-found-head">
                      <b>What Braino read in you</b>
                      <span>{postsRead} posts · ${readCost.toFixed(2)} · {learned.confidence ?? "medium confidence"}</span>
                    </div>
                    {learned.summary && <p className="xs-found-summary">{learned.summary}</p>}
                    <div className="xs-found-grid">
                      {learned.sentence_style && <div><b>Sentences</b><p>{learned.sentence_style}</p></div>}
                      {learned.opener_style && <div><b>How you open</b><p>{learned.opener_style}</p></div>}
                      {learned.humor && <div><b>Jokes</b><p>{learned.humor}</p></div>}
                      {learned.formatting?.hashtags && <div><b>Hashtags</b><p>{learned.formatting.hashtags}</p></div>}
                      {learned.formatting?.emoji && <div><b>Emoji</b><p>{learned.formatting.emoji}</p></div>}
                      {typeof learned.median_length === "number" && <div><b>Typical length</b><p>{learned.median_length} characters</p></div>}
                    </div>
                    {!!learned.signature_phrases?.length && (
                      <div className="xs-phrases">
                        <b>Words you actually use</b>
                        <div>{learned.signature_phrases.slice(0, 10).map((w) => <span key={w}>{w}</span>)}</div>
                      </div>
                    )}
                    {!!learned.what_works?.length && (
                      <div className="xs-works">
                        <b>What worked for you</b>
                        <ul>{learned.what_works.slice(0, 3).map((w, i) => (
                          <li key={i}><strong>{w.pattern}</strong>{w.evidence ? <em>{w.evidence}</em> : null}</li>
                        ))}</ul>
                      </div>
                    )}
                  </div>

                  {!!topPosts.length && (
                    <div className="xs-stars">
                      <b>Star the ones that are most you</b>
                      <p className="xs-fine">A real example teaches him more than any setting on this page.</p>
                      {topPosts.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={"xs-star" + (starred[t.id] ? " is-on" : "")}
                          onClick={() => toggleStar(t.id)}
                        >
                          <i>{starred[t.id] ? "★" : "☆"}</i>
                          <span>{t.text}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="xs-found xs-found-empty">
                  <b>He has not read your posts yet</b>
                  <p>You can still train him by hand below, and let him read you later from the dashboard.</p>
                </div>
              )}

              {/* ── The manual half ── */}
              <div className="xs-train">
                <div className="xs-train-head">
                  <b>Now tell him yourself</b>
                  <p>He read who you have been. This is who you actually are, which matters more.</p>
                </div>

                <div className="xs-dials">
                  {DIALS.map((d) => (
                    <div key={d.key} className="xs-dial">
                      <div className="xs-dial-top">
                        <b>{d.label}</b>
                        <span>{dialWord(d.key, dials[d.key])}</span>
                      </div>
                      <input
                        type="range" min={1} max={5} step={1}
                        value={dials[d.key]}
                        onChange={(e) => setDials((s) => ({ ...s, [d.key]: Number(e.target.value) }))}
                        aria-label={d.label}
                      />
                      <div className="xs-dial-ends"><span>{d.low}</span><span>{d.high}</span></div>
                    </div>
                  ))}
                </div>

                <label className="xs-field">
                  <b>How would you describe the way you talk?</b>
                  <span>Say it the way you would say it to a friend. This goes to him word for word.</span>
                  <textarea
                    rows={3}
                    value={describe}
                    onChange={(e) => setDescribe(e.target.value)}
                    placeholder="I'm very conversational and pretty funny. I make a lot of jokes. I'd rather be interesting than correct."
                  />
                </label>

                <div className="xs-two">
                  <label className="xs-field">
                    <b>Always</b>
                    <span>One per line.</span>
                    <textarea rows={4} value={always} onChange={(e) => setAlways(e.target.value)}
                      placeholder={"Keep it short\nMake at least one joke\nTalk like a person"} />
                  </label>
                  <label className="xs-field">
                    <b>Never</b>
                    <span>One per line.</span>
                    <textarea rows={4} value={never} onChange={(e) => setNever(e.target.value)}
                      placeholder={"Hashtags\nEm dashes\nMotivational filler\nSounding like a brand"} />
                  </label>
                </div>

                {learned && (
                  <label className="xs-field">
                    <b>Anything he got wrong up there?</b>
                    <span>Optional. This overrides what he read.</span>
                    <textarea rows={2} value={correction} onChange={(e) => setCorrection(e.target.value)}
                      placeholder="He thinks I'm serious. I'm not, I'm just bad at typing tone." />
                  </label>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Topics ────────────────────────────────────────────────── */}
        {current === "topics" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step four</p>
            <h1 className="ob-h1">What do you<br /><em>post about?</em></h1>
            <p className="ob-lede">
              Pick a few. He rotates between them so your feed does not become one note, and he
              tells you later which ones your people actually respond to.
            </p>
            <div className="ob-body">
              <div className="ob-chips">
                {TOPIC_SUGGESTIONS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={"ob-chip" + (topics.includes(t.key) ? " is-on" : "")}
                    onClick={() => setTopics((list) =>
                      list.includes(t.key) ? list.filter((k) => k !== t.key) : [...list, t.key])}
                  >
                    {t.label}
                  </button>
                ))}
                {topics.filter((k) => !TOPIC_SUGGESTIONS.some((t) => t.key === k)).map((k) => (
                  <button key={k} type="button" className="ob-chip is-on"
                    onClick={() => setTopics((list) => list.filter((x) => x !== k))}>
                    {k}
                  </button>
                ))}
              </div>
              <div className="xs-add">
                <input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customTopic.trim()) {
                      e.preventDefault();
                      setTopics((l) => [...l, customTopic.trim()]);
                      setCustomTopic("");
                    }
                  }}
                  placeholder="Add your own, then press enter"
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Rhythm ────────────────────────────────────────────────── */}
        {current === "rhythm" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step five</p>
            <h1 className="ob-h1">How often, <em>and when not.</em></h1>
            <p className="ob-lede">
              He never exceeds this, even if he has good ideas. Silence at the wrong hour is worth
              more than a post nobody sees.
            </p>
            <div className="ob-body">
              <div className="xs-rhythm">
                <div className="xs-count">
                  <b>Posts per day</b>
                  <div className="xs-counter">
                    <button type="button" onClick={() => setPerDay((n) => Math.max(1, n - 1))}>−</button>
                    <span>{perDay}</span>
                    <button type="button" onClick={() => setPerDay((n) => Math.min(10, n + 1))}>+</button>
                  </div>
                  <p className="xs-fine">
                    {perDay <= 2 ? "Steady. Good if you would rather be missed than muted."
                      : perDay <= 4 ? "The sweet spot for growing an account from small."
                      : "Aggressive. Only worth it if you genuinely have that much to say."}
                  </p>
                </div>
                <div className="xs-quiet">
                  <b>Never post between</b>
                  <div className="xs-hours">
                    <select value={quietStart} onChange={(e) => setQuietStart(Number(e.target.value))}>
                      {hours().map((h) => <option key={h} value={h}>{label(h)}</option>)}
                    </select>
                    <span>and</span>
                    <select value={quietEnd} onChange={(e) => setQuietEnd(Number(e.target.value))}>
                      {hours().map((h) => <option key={h} value={h}>{label(h)}</option>)}
                    </select>
                  </div>
                  {!!learned?.best_hours_utc?.length && (
                    <p className="xs-fine">
                      For what it is worth, your best performing hours so far are{" "}
                      {learned.best_hours_utc.slice(0, 2).map((h) => `${label(h.hour_utc)} UTC`).join(" and ")}.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Leash ─────────────────────────────────────────────────── */}
        {current === "leash" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step six</p>
            <h1 className="ob-h1">How far can he<br /><em>go alone?</em></h1>
            <p className="ob-lede">
              You can change this any day, and he drops back a level by himself if anything looks
              wrong. Start tighter than you think you need.
            </p>
            <div className="ob-body ob-cards xs-leash">
              {LEASH.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={"ob-card" + (mode === l.mode ? " is-on" : "")}
                  onClick={() => setMode(l.mode)}
                >
                  <span className="ob-card-name">{l.name}{l.rec ? <em> · recommended</em> : null}</span>
                  <span className="ob-card-note">{l.note}</span>
                  <span className="ob-tick">✓</span>
                </button>
              ))}
            </div>
            <div className="xs-gates">
              <b>He always stops and asks before these, at every level</b>
              <div>
                <span>Anything that spends money</span>
                <span>Sending a DM</span>
                <span>Deleting anything</span>
                <span>Following or unfollowing</span>
                <span>Anything about a price or a promise</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Done ──────────────────────────────────────────────────── */}
        {current === "done" && (
          <section className="ob-step ob-done">
            <p className="ob-eyebrow">Ready</p>
            <h1 className="ob-h1">He knows you now.</h1>
            <p className="ob-lede">
              From here he drafts, you approve, he handles the rest. Your first drafts are waiting
              on the dashboard.
            </p>
            <div className="ob-summary xs-summary">
              <div><span>Account</span><b>@{handle ?? "connected"}</b></div>
              <div><span>Posts he read</span><b>{postsRead || "not yet"}</b></div>
              <div><span>Examples you starred</span><b>{starCount}</b></div>
              <div><span>Topics</span><b>{topics.length}</b></div>
              <div><span>Per day</span><b>{perDay}</b></div>
              <div><span>Leash</span><b>{LEASH.find((l) => l.mode === mode)?.name}</b></div>
            </div>
            <button type="button" className="ob-btn is-coral xs-connect" onClick={() => navigate("/x")}>
              Open my dashboard
            </button>
          </section>
        )}
      </main>

      {current !== "done" && (
        <footer className="ob-foot">
          <button type="button" className="ob-btn is-quiet" onClick={back}
            style={{ visibility: step === 0 ? "hidden" : "visible" }}>
            ← Back
          </button>
          {current === "reading" && !learned ? (
            <button type="button" className="ob-btn is-quiet ob-skip" onClick={next}>
              Skip, I will train him by hand
            </button>
          ) : <span />}
          <button
            type="button"
            className="ob-btn is-coral"
            disabled={!canContinue || saving || reading}
            onClick={current === "leash" ? finish : next}
          >
            {current === "leash" ? (saving ? "Saving..." : "Finish setup") : "Continue →"}
          </button>
        </footer>
      )}
    </div>
  );
}

function dialWord(key: string, value: number) {
  const scales: Record<string, string[]> = {
    funny: ["Never jokes", "Rarely", "Sometimes", "Often", "Always joking"],
    conversational: ["Written", "Mostly written", "Balanced", "Chatty", "Pure talking"],
    spicy: ["Very careful", "Careful", "Balanced", "Direct", "Says the thing"],
    personal: ["All work", "Mostly work", "Balanced", "Personal", "Very personal"],
    technical: ["Anyone", "Mostly simple", "Balanced", "Technical", "Builders only"],
  };
  return scales[key]?.[value - 1] ?? "";
}

function splitLines(value: string) {
  return value.split("\n").map((l) => l.trim()).filter(Boolean);
}

function hours() {
  return Array.from({ length: 24 }, (_, i) => i);
}

function label(h: number) {
  const suffix = h < 12 ? "am" : "pm";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
}
