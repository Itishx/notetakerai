// /linkedin/setup — the same six-step flow as X, in LinkedIn's room.
//
// Two real differences from the X setup, both forced by what LinkedIn permits:
//
//   1. There is no "let him read your posts" step. Reading a member's own
//      history needs Community Management access, which takes weeks to months
//      and a registered entity. So the voice step is hand-training only, seeded
//      from whatever the X setup already learned about this person. The page
//      says that outright rather than quietly skipping a step.
//   2. The leash tops out lower. LinkedIn is where an account restriction costs
//      a founder a year of business development, so the defaults are tighter.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "./onboarding-flow.css";
import "./x-setup.css";
import "./channel-theme.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Step = "hello" | "connect" | "voice" | "topics" | "rhythm" | "leash" | "done";
const STEPS: Step[] = ["hello", "connect", "voice", "topics", "rhythm", "leash", "done"];

const DIALS = [
  { key: "funny", label: "Jokes", low: "Play it straight", high: "Make me laugh" },
  { key: "conversational", label: "How I talk", low: "Written, considered", high: "Like I'm talking to you" },
  { key: "spicy", label: "Opinions", low: "Careful, balanced", high: "Say the thing" },
  { key: "personal", label: "Me in it", low: "About the work", high: "About me doing the work" },
  { key: "technical", label: "Depth", low: "Anyone can follow", high: "Builders only" },
] as const;

const TOPICS = [
  { key: "building", label: "What I'm building" },
  { key: "founder", label: "Founder lessons" },
  { key: "ai", label: "AI and agents" },
  { key: "opinion", label: "Opinions" },
  { key: "teaching", label: "Teaching" },
  { key: "hiring", label: "Hiring and team" },
  { key: "industry", label: "Industry takes" },
  { key: "failure", label: "Things I got wrong" },
];

const LEASH = [
  { mode: "manual" as const, name: "Ask me everything", note: "He writes. You approve every post before it goes out." },
  { mode: "assisted" as const, name: "Approve once, he handles the rest", note: "You approve the post. He picks the hour, publishes it, checks it landed. Recommended on LinkedIn.", rec: true },
  { mode: "autopilot" as const, name: "Run it", note: "He fills the queue and publishes on his own. Tighter caps apply here than on X." },
];

export default function LinkedInSetup() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const [connected, setConnected] = useState(false);
  const [handle, setHandle] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [needsConfig, setNeedsConfig] = useState(false);

  const [dials, setDials] = useState<Record<string, number>>({ funny: 3, conversational: 3, spicy: 3, personal: 3, technical: 3 });
  const [describe, setDescribe] = useState("");
  const [always, setAlways] = useState("");
  const [never, setNever] = useState("");
  const [borrowedX, setBorrowedX] = useState<string | null>(null);

  const [topics, setTopics] = useState<string[]>(["building", "founder"]);
  const [perDay, setPerDay] = useState(1);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(6);
  const [mode, setMode] = useState<"manual" | "assisted" | "autopilot">("assisted");
  const [saving, setSaving] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => { document.title = "Set up Braino for LinkedIn"; }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);
  useEffect(() => () => { if (pollRef.current) window.clearInterval(pollRef.current); }, []);

  const check = useCallback(async () => {
    if (!user) return false;
    const { data } = await (supabase as any).from("channel_connections")
      .select("handle,display_name").eq("user_id", user.id).eq("channel", "linkedin").maybeSingle();
    if (data?.handle) { setConnected(true); setHandle(data.display_name || data.handle); return true; }
    return false;
  }, [user]);

  useEffect(() => { void check(); }, [check]);

  // Seed the voice step from the X setup, if one exists. Same person, so the
  // thinking carries over even though the form does not.
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await (supabase as any).from("x_settings")
        .select("voice_manual,voice_learned").eq("user_id", user.id).maybeSingle();
      if (data?.voice_manual?.dials) setDials((d) => ({ ...d, ...data.voice_manual.dials }));
      if (data?.voice_manual?.describe) setDescribe(data.voice_manual.describe);
      if (Array.isArray(data?.voice_manual?.always)) setAlways(data.voice_manual.always.join("\n"));
      if (Array.isArray(data?.voice_manual?.never)) setNever(data.voice_manual.never.join("\n"));
      if (data?.voice_learned?.summary) setBorrowedX(String(data.voice_learned.summary));
    })();
  }, [user]);

  const connect = useCallback(async () => {
    if (!user) { setConnectError("You are not signed in to Braino. Sign in first."); return; }
    setConnectError(null); setNeedsConfig(false); setConnecting(true);
    const popup = window.open("about:blank", "_blank", "width=620,height=760");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/linkedin-oauth-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({}),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.authUrl) {
        popup?.close();
        if (payload.needsConfig) setNeedsConfig(true);
        throw new Error(payload.error || "Could not start the LinkedIn connection.");
      }
      if (popup && !popup.closed) popup.location.href = payload.authUrl;
      else window.open(payload.authUrl, "_blank");

      const started = Date.now();
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        if (await check()) {
          window.clearInterval(pollRef.current!); setConnecting(false); popup?.close(); setStep((s) => s + 1);
        } else if (Date.now() - started > 180_000) {
          window.clearInterval(pollRef.current!); setConnecting(false); setConnectError("That took too long. Try again.");
        }
      }, 2000);
    } catch (e) {
      setConnecting(false);
      setConnectError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, [user, session, check]);

  const finish = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      await (supabase as any).from("channel_settings").upsert({
        user_id: user.id, channel: "linkedin",
        voice_manual: {
          dials,
          describe: describe.trim() || null,
          always: always.split("\n").map((l) => l.trim()).filter(Boolean),
          never: never.split("\n").map((l) => l.trim()).filter(Boolean),
          written_at: new Date().toISOString(),
        },
        pillars: topics.map((key) => ({ key, label: TOPICS.find((t) => t.key === key)?.label ?? key, weight: Math.round(100 / topics.length), paused: false })),
        max_posts_per_day: perDay,
        quiet_start: quietStart, quiet_end: quietEnd,
        automation_mode: mode,
        setup_completed_at: new Date().toISOString(),
      }, { onConflict: "user_id,channel" });
      setStep(STEPS.length - 1);
    } finally { setSaving(false); }
  }, [user, dials, describe, always, never, topics, perDay, quietStart, quietEnd, mode]);

  const canContinue = useMemo(() => (current === "topics" ? topics.length > 0 : true), [current, topics]);
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="ob-doc xs-doc ch-linkedin">
      <header className="ob-top">
        <div className="ob-top-inner">
          <Link to="/linkedin" className="ob-mark"><i />braino for LinkedIn</Link>
          <span className="ob-count">{current === "done" ? "All set" : `Step ${step + 1} of ${STEPS.length - 1}`}</span>
        </div>
        <div className="ob-progress"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </header>

      <main className="ob-stage">
        {current === "hello" && (
          <section className="ob-step ob-hello">
            <p className="ob-eyebrow">Braino for LinkedIn</p>
            <h1 className="ob-h1">The easiest room<br /><em>to grow in.</em></h1>
            <p className="ob-lede">
              A founder's own profile gets 561% more reach than a company page, and comments carry
              8 to 15 times the weight of likes. Five questions, about three minutes.
            </p>
            <div className="xs-promise">
              <div><b>He writes for this room</b><span>LinkedIn is not X. Hook on line one, 150 to 300 words, no cross-posting.</span></div>
              <div><b>He drafts your comments</b><span>Paste a post, get something worth saying. You send it.</span></div>
              <div><b>He never touches your account</b><span>Only the sanctioned API. No browser automation, ever, on this platform.</span></div>
            </div>
          </section>
        )}

        {current === "connect" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step one</p>
            <h1 className="ob-h1">Connect <em>LinkedIn.</em></h1>
            <p className="ob-lede">
              LinkedIn asks whether Braino can post on your behalf. That is the only permission he
              gets, and you can revoke it from your LinkedIn settings at any time.
            </p>
            <div className="ob-body">
              {connected ? (
                <div className="xs-connected"><b>Connected</b><span>{handle}</span><p>Braino can post to your profile.</p></div>
              ) : (
                <>
                  <button type="button" className="ob-btn is-coral xs-connect" onClick={connect} disabled={connecting}>
                    {connecting ? "Waiting for LinkedIn..." : "Connect LinkedIn"}
                  </button>
                  {connectError && <p className="xs-error">{connectError}</p>}
                  {needsConfig && (
                    <p className="xs-fine">
                      The server needs a LinkedIn app first. Create one at the LinkedIn developer portal,
                      request the "Share on LinkedIn" and "Sign In with LinkedIn using OpenID Connect"
                      products, then set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET as Supabase secrets.
                    </p>
                  )}
                  <p className="xs-fine">Not ready? Continue anyway and walk the rest of the setup.</p>
                </>
              )}
              <ul className="xs-scopes">
                <li><b>Post on your behalf</b> only for posts you approved</li>
                <li><b>Your name and photo</b> so the dashboard knows who you are</li>
                <li><b>Nothing else.</b> He cannot read your feed, your messages, or your connections</li>
              </ul>
            </div>
          </section>
        )}

        {current === "voice" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step two</p>
            <h1 className="ob-h1">Tell him <em>how you talk.</em></h1>
            <p className="ob-lede">
              On X he read two hundred of your posts and worked this out himself. LinkedIn will not
              let a member app read your own history, so here you tell him instead.
            </p>
            <div className="ob-body">
              {borrowedX && (
                <div className="xs-found">
                  <div className="xs-found-head"><b>Borrowed from your X voice</b><span>same person, different room</span></div>
                  <p className="xs-found-summary">{borrowedX}</p>
                  <p className="xs-fine">He keeps the thinking and the humour. The form he translates: longer, hook first, no one-liners.</p>
                </div>
              )}
              <div className="xs-train">
                <div className="xs-dials">
                  {DIALS.map((d) => (
                    <div key={d.key} className="xs-dial">
                      <div className="xs-dial-top"><b>{d.label}</b><span>{dialWord(d.key, dials[d.key])}</span></div>
                      <input type="range" min={1} max={5} value={dials[d.key]} aria-label={d.label}
                        onChange={(e) => setDials((s) => ({ ...s, [d.key]: Number(e.target.value) }))} />
                      <div className="xs-dial-ends"><span>{d.low}</span><span>{d.high}</span></div>
                    </div>
                  ))}
                </div>
                <label className="xs-field">
                  <b>How would you describe the way you talk?</b>
                  <span>Goes into the prompt word for word.</span>
                  <textarea rows={4} value={describe} onChange={(e) => setDescribe(e.target.value)}
                    placeholder="I'm conversational and pretty funny. I don't do corporate LinkedIn voice. I'd rather say something true and slightly awkward than something polished and empty." />
                </label>
                <div className="xs-two">
                  <label className="xs-field"><b>Always</b><span>One per line.</span>
                    <textarea rows={4} value={always} onChange={(e) => setAlways(e.target.value)}
                      placeholder={"Hook on line one\nUse a real number\nSound like a person"} /></label>
                  <label className="xs-field"><b>Never</b><span>One per line.</span>
                    <textarea rows={4} value={never} onChange={(e) => setNever(e.target.value)}
                      placeholder={"Thrilled to announce\nAgree?\nOne word per line posts\nHashtag stacks"} /></label>
                </div>
              </div>
            </div>
          </section>
        )}

        {current === "topics" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step three</p>
            <h1 className="ob-h1">What do you<br /><em>post about?</em></h1>
            <p className="ob-lede">He rotates between these so your profile does not become one note.</p>
            <div className="ob-body">
              <div className="ob-chips">
                {TOPICS.map((t) => (
                  <button key={t.key} type="button"
                    className={"ob-chip" + (topics.includes(t.key) ? " is-on" : "")}
                    onClick={() => setTopics((l) => l.includes(t.key) ? l.filter((k) => k !== t.key) : [...l, t.key])}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {current === "rhythm" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step four</p>
            <h1 className="ob-h1">How often, <em>and when not.</em></h1>
            <p className="ob-lede">
              LinkedIn rewards one good post a day far more than three thin ones. The first sixty
              minutes decide roughly 70% of a post's reach, so posting when you can reply matters.
            </p>
            <div className="ob-body">
              <div className="xs-rhythm">
                <div className="xs-count">
                  <b>Posts per day</b>
                  <div className="xs-counter">
                    <button type="button" onClick={() => setPerDay((n) => Math.max(1, n - 1))}>−</button>
                    <span>{perDay}</span>
                    <button type="button" onClick={() => setPerDay((n) => Math.min(3, n + 1))}>+</button>
                  </div>
                  <p className="xs-fine">{perDay === 1 ? "One a day is the right answer here. More is not better on LinkedIn." : "Above one a day, each post cannibalises the last. Only worth it if they are genuinely different."}</p>
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
                  <p className="xs-fine">He aims for hours you are awake, so you can answer comments inside that first hour.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {current === "leash" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Step five</p>
            <h1 className="ob-h1">How far can he<br /><em>go alone?</em></h1>
            <p className="ob-lede">
              Tighter defaults than X on purpose. A restricted LinkedIn account costs a founder a
              year of business development, and it is not worth the convenience.
            </p>
            <div className="ob-body ob-cards xs-leash">
              {LEASH.map((l) => (
                <button key={l.mode} type="button" className={"ob-card" + (mode === l.mode ? " is-on" : "")} onClick={() => setMode(l.mode)}>
                  <span className="ob-card-name">{l.name}{l.rec ? <em> · recommended</em> : null}</span>
                  <span className="ob-card-note">{l.note}</span>
                  <span className="ob-tick">✓</span>
                </button>
              ))}
            </div>
            <div className="xs-gates">
              <b>He never does these on LinkedIn, at any level</b>
              <div>
                <span>Send a connection request</span><span>Send a DM</span>
                <span>Comment without you sending it</span><span>Like or follow anything</span>
                <span>Touch your account through a browser</span>
              </div>
            </div>
          </section>
        )}

        {current === "done" && (
          <section className="ob-step ob-done">
            <p className="ob-eyebrow">Ready</p>
            <h1 className="ob-h1">Set up.</h1>
            <p className="ob-lede">Drafts appear on your dashboard. The comment drafter is there too, and that is the one that grows you.</p>
            <div className="ob-summary xs-summary">
              <div><span>Account</span><b>{handle ?? "not connected"}</b></div>
              <div><span>Topics</span><b>{topics.length}</b></div>
              <div><span>Per day</span><b>{perDay}</b></div>
              <div><span>Leash</span><b>{LEASH.find((l) => l.mode === mode)?.name}</b></div>
            </div>
            <button type="button" className="ob-btn is-coral xs-connect" onClick={() => navigate("/linkedin")}>Open my dashboard</button>
          </section>
        )}
      </main>

      {current !== "done" && (
        <footer className="ob-foot">
          <button type="button" className="ob-btn is-quiet" onClick={back} style={{ visibility: step === 0 ? "hidden" : "visible" }}>← Back</button>
          <span />
          <button type="button" className="ob-btn is-coral" disabled={!canContinue || saving}
            onClick={current === "leash" ? finish : next}>
            {current === "leash" ? (saving ? "Saving..." : "Finish setup") : "Continue →"}
          </button>
        </footer>
      )}
    </div>
  );
}

function dialWord(key: string, v: number) {
  const s: Record<string, string[]> = {
    funny: ["Never jokes", "Rarely", "Sometimes", "Often", "Always joking"],
    conversational: ["Written", "Mostly written", "Balanced", "Chatty", "Pure talking"],
    spicy: ["Very careful", "Careful", "Balanced", "Direct", "Says the thing"],
    personal: ["All work", "Mostly work", "Balanced", "Personal", "Very personal"],
    technical: ["Anyone", "Mostly simple", "Balanced", "Technical", "Builders only"],
  };
  return s[key]?.[v - 1] ?? "";
}
function hours() { return Array.from({ length: 24 }, (_, i) => i); }
function label(h: number) { const s = h < 12 ? "am" : "pm"; const t = h % 12 === 0 ? 12 : h % 12; return `${t}${s}`; }
