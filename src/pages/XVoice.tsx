// /x/voice — tell Braino how you talk, any day, not only during setup.
//
// The setup flow asks once. This is the page you come back to when he writes
// something that is not you, which is the moment the correction is sharpest and
// most specific. It shows everything he inferred from your history side by side
// with everything you told him, and makes clear which one wins.
//
// It also owns two settings that decide more about the output than any adjective:
// how long a post is allowed to be, and which shape of post goes out on which day.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "./onboarding-flow.css";
import "./x-setup.css";
import "./x-voice.css";
import "./x-black.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/* Mirrors _shared/x-voice-prompt.ts. Kept in sync by hand because the edge
   runtime and the browser bundle do not share a module graph. */
const LENGTH_MODES = [
  { key: "punchy", label: "Punchy", floor: 60, line: "Short and hard, but still a whole thought. Never a fragment posted for rhythm." },
  { key: "balanced", label: "Balanced", floor: 120, line: "Room to make a point and land it. The default." },
  { key: "substantial", label: "Substantial", floor: 180, line: "Uses the space. Sets something up, then pays it off. Multi-line where the thought breaks." },
] as const;

const FORMATS = [
  { key: "teach", label: "Teach something", line: "Explain one useful thing plainly." },
  { key: "opinion", label: "An opinion", line: "A position, stated and defended." },
  { key: "build-log", label: "What I shipped", line: "Something concrete that got built." },
  { key: "story", label: "Something that happened", line: "A specific moment with a point." },
  { key: "contrarian", label: "Disagree with the room", line: "Name the consensus, say why it is wrong." },
  { key: "proof", label: "Numbers and receipts", line: "A real figure, and what it means." },
  { key: "question", label: "Ask them", line: "A question you actually want answered." },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DIALS = [
  { key: "funny", label: "Jokes", low: "Play it straight", high: "Make me laugh" },
  { key: "conversational", label: "How I talk", low: "Written, considered", high: "Like I'm talking to you" },
  { key: "spicy", label: "Opinions", low: "Careful, balanced", high: "Say the thing" },
  { key: "personal", label: "Me in it", low: "About the work", high: "About me doing the work" },
  { key: "technical", label: "Depth", low: "Anyone can follow", high: "Builders only" },
] as const;

type Learned = Record<string, any> | null;

export default function XVoice() {
  const { user, session } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [relearning, setRelearning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [learned, setLearned] = useState<Learned>(null);
  const [postsRead, setPostsRead] = useState(0);
  const [learnedAt, setLearnedAt] = useState<string | null>(null);

  const [dials, setDials] = useState<Record<string, number>>({
    funny: 3, conversational: 3, spicy: 3, personal: 3, technical: 3,
  });
  const [describe, setDescribe] = useState("");
  const [always, setAlways] = useState("");
  const [never, setNever] = useState("");
  const [correction, setCorrection] = useState("");
  const [lengthMode, setLengthMode] = useState<string>("balanced");
  const [mix, setMix] = useState<{ day: string; format: string }[]>(
    DAYS.map((day, i) => ({ day, format: FORMATS[i % FORMATS.length].key })),
  );

  useEffect(() => { document.title = "How you talk"; }, []);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await (supabase as any)
      .from("x_settings")
      .select("voice_learned,voice_manual,voice_posts_read,voice_learned_at,length_mode,content_mix")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setLearned(data.voice_learned ?? null);
      setPostsRead(data.voice_posts_read ?? 0);
      setLearnedAt(data.voice_learned_at ?? null);
      setLengthMode(data.length_mode ?? "balanced");
      if (Array.isArray(data.content_mix) && data.content_mix.length) setMix(data.content_mix);
      const m = data.voice_manual ?? {};
      if (m.dials) setDials((d) => ({ ...d, ...m.dials }));
      if (m.describe) setDescribe(m.describe);
      if (Array.isArray(m.always)) setAlways(m.always.join("\n"));
      if (Array.isArray(m.never)) setNever(m.never.join("\n"));
      if (m.correction) setCorrection(m.correction);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true); setSaved(false); setError(null);
    try {
      await (supabase as any).from("x_settings").upsert({
        user_id: user.id,
        voice_manual: {
          dials,
          describe: describe.trim() || null,
          always: always.split("\n").map((l) => l.trim()).filter(Boolean),
          never: never.split("\n").map((l) => l.trim()).filter(Boolean),
          correction: correction.trim() || null,
          written_at: new Date().toISOString(),
        },
        length_mode: lengthMode,
        content_mix: mix,
      }, { onConflict: "user_id" });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }, [user, dials, describe, always, never, correction, lengthMode, mix]);

  const relearn = useCallback(async () => {
    setRelearning(true); setError(null);
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
      if (!res.ok) throw new Error(payload.error || "Could not read your posts.");
      setLearned(payload.learned ?? null);
      setPostsRead(payload.posts_read ?? 0);
      setLearnedAt(new Date().toISOString());
      if (payload.learned?.suggested_length_mode) setLengthMode(payload.learned.suggested_length_mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRelearning(false);
    }
  }, [session]);

  const struct = learned?.structure as Record<string, number> | undefined;
  const floor = LENGTH_MODES.find((m) => m.key === lengthMode)?.floor ?? 120;

  return (
    <div className="ob-doc xs-doc xv-doc">
      <header className="ob-top">
        <div className="ob-top-inner">
          <Link to="/x" className="ob-mark"><i />braino for X</Link>
          <span className="ob-count">How you talk</span>
        </div>
      </header>

      <main className="xv-main">
        <div className="xv-head">
          <p className="ob-eyebrow">Voice</p>
          <h1 className="ob-h1">He read who you<br /><em>have been.</em></h1>
          <p className="ob-lede">
            This page is who you actually are. Everything you write here outranks everything he
            worked out on his own, on every single post, forever.
          </p>
        </div>

        {/* ── What he read ─────────────────────────────────────────── */}
        <section className="xv-sec">
          <div className="xv-sec-head">
            <h2>What he read in you</h2>
            <button type="button" className="ob-btn is-outline xv-small" onClick={relearn} disabled={relearning}>
              {relearning ? "Reading..." : postsRead ? "Read me again" : "Read my posts"}
            </button>
          </div>

          {!learned ? (
            <div className="xv-empty">
              He has not read your history yet. Everything below still works, he will simply have
              nothing of his own to go on.
            </div>
          ) : (
            <>
              <p className="xv-summary">{learned.summary}</p>

              {/* The measured half. Numbers, not adjectives. */}
              {struct && (
                <div className="xv-metrics">
                  <div><span>Typical length</span><b>{struct.median_length}</b><em>characters</em></div>
                  <div><span>Typical post</span><b>{struct.avg_words}</b><em>words</em></div>
                  <div><span>Under 80 chars</span><b>{struct.share_under_80_chars}%</b><em>of your posts</em></div>
                  <div><span>Over 200 chars</span><b>{struct.share_over_200_chars}%</b><em>of your posts</em></div>
                  <div><span>Multi line</span><b>{struct.share_multiline}%</b><em>use line breaks</em></div>
                  <div><span>With a number</span><b>{struct.share_with_number}%</b><em>cite something</em></div>
                </div>
              )}

              <div className="xv-read">
                {learned.how_they_think && <div><b>How you think</b><p>{learned.how_they_think}</p></div>}
                {learned.length_read && <div><b>What your length says</b><p>{learned.length_read}</p></div>}
                {learned.paragraph_style && <div><b>How you break lines</b><p>{learned.paragraph_style}</p></div>}
                {learned.opener_style && <div><b>How you open</b><p>{learned.opener_style}</p></div>}
                {learned.closer_style && <div><b>How you close</b><p>{learned.closer_style}</p></div>}
                {learned.register && <div><b>Register</b><p>{learned.register}</p></div>}
                {learned.humor?.kind && (
                  <div><b>Jokes</b><p>{learned.humor.kind}, {learned.humor.frequency}. {learned.humor.example ? `"${learned.humor.example}"` : ""}</p></div>
                )}
              </div>

              {Array.isArray(learned.writing_rules) && learned.writing_rules.length > 0 && (
                <div className="xv-rules">
                  <b>The rules he wrote for himself, from you</b>
                  <ol>{learned.writing_rules.map((r: string, i: number) => <li key={i}>{r}</li>)}</ol>
                </div>
              )}

              {Array.isArray(learned.signature_phrases) && learned.signature_phrases.length > 0 && (
                <div className="xs-phrases">
                  <b>Words you actually use</b>
                  <div>{learned.signature_phrases.slice(0, 12).map((w: string) => <span key={w}>{w}</span>)}</div>
                </div>
              )}

              <p className="xs-fine">
                {postsRead} posts read{learnedAt ? `, ${daysAgo(learnedAt)}` : ""}.
                {learned.confidence ? ` Confidence: ${learned.confidence}.` : ""}
              </p>
            </>
          )}
        </section>

        {/* ── Length ───────────────────────────────────────────────── */}
        <section className="xv-sec">
          <div className="xv-sec-head">
            <h2>How long a post is allowed to be</h2>
          </div>
          <p className="xv-note">
            This decides more about how the writing sounds than any adjective on this page. Most
            tools treat 280 as a target and produce four word fragments. Set a floor and he cannot.
          </p>
          <div className="xv-lengths">
            {LENGTH_MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                className={"xv-length" + (lengthMode === m.key ? " is-on" : "")}
                onClick={() => setLengthMode(m.key)}
              >
                <b>{m.label}</b>
                <span className="xv-floor">never below {m.floor} characters</span>
                <span>{m.line}</span>
              </button>
            ))}
          </div>
          {struct && (
            <p className="xs-fine">
              For reference, your own posts run about {struct.median_length} characters, and{" "}
              {struct.share_under_80_chars}% of them are under 80.
              {learned?.suggested_length_mode && learned.suggested_length_mode !== lengthMode
                ? ` Based on that he would have picked ${LENGTH_MODES.find((m) => m.key === learned.suggested_length_mode)?.label}.`
                : ""}
            </p>
          )}
          <p className="xs-fine">
            Anything shorter than {floor} characters, or under eight words, is thrown away before
            you ever see it. Enforced in code, not asked for in a prompt.
          </p>
        </section>

        {/* ── Content mix ──────────────────────────────────────────── */}
        <section className="xv-sec">
          <div className="xv-sec-head">
            <h2>What kind of post, on which day</h2>
          </div>
          <p className="xv-note">
            Topics say what a post is about. This says what shape it takes. Without it, seven posts
            on seven topics still read as seven opinions.
          </p>
          <div className="xv-mix">
            {mix.map((row, i) => (
              <div key={row.day} className="xv-mix-row">
                <b>{row.day}</b>
                <select
                  value={row.format}
                  onChange={(e) => setMix((m) => m.map((r, j) => (j === i ? { ...r, format: e.target.value } : r)))}
                >
                  {FORMATS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                <span>{FORMATS.find((f) => f.key === row.format)?.line}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Tell him ─────────────────────────────────────────────── */}
        <section className="xv-sec">
          <div className="xv-sec-head">
            <h2>Now tell him yourself</h2>
          </div>
          <p className="xv-note">This wins over everything above. Every time.</p>

          <div className="xs-dials">
            {DIALS.map((d) => (
              <div key={d.key} className="xs-dial">
                <div className="xs-dial-top">
                  <b>{d.label}</b>
                  <span>{dialWord(d.key, dials[d.key])}</span>
                </div>
                <input type="range" min={1} max={5} step={1} value={dials[d.key]} aria-label={d.label}
                  onChange={(e) => setDials((s) => ({ ...s, [d.key]: Number(e.target.value) }))} />
                <div className="xs-dial-ends"><span>{d.low}</span><span>{d.high}</span></div>
              </div>
            ))}
          </div>

          <label className="xs-field">
            <b>How would you describe the way you talk?</b>
            <span>Say it the way you would say it to a friend. This goes into the prompt word for word.</span>
            <textarea rows={4} value={describe} onChange={(e) => setDescribe(e.target.value)}
              placeholder="I'm very conversational and pretty funny. I make a lot of jokes. I don't do three word tweets, they say nothing. I'd rather be interesting than correct." />
          </label>

          <div className="xs-two">
            <label className="xs-field">
              <b>Always</b><span>One per line.</span>
              <textarea rows={5} value={always} onChange={(e) => setAlways(e.target.value)}
                placeholder={"Make at least one joke\nSay the actual number\nWrite like I talk"} />
            </label>
            <label className="xs-field">
              <b>Never</b><span>One per line.</span>
              <textarea rows={5} value={never} onChange={(e) => setNever(e.target.value)}
                placeholder={"Three word posts\nHashtags\nEm dashes\nSounding like a brand"} />
            </label>
          </div>

          <label className="xs-field">
            <b>Anything he got wrong up there?</b>
            <span>Optional. This overrides what he read.</span>
            <textarea rows={3} value={correction} onChange={(e) => setCorrection(e.target.value)}
              placeholder="He thinks I'm serious. I'm not, I'm just bad at typing tone." />
          </label>
        </section>

        {error && <p className="xs-error">{error}</p>}

        <div className="xv-save">
          <button type="button" className="ob-btn is-coral" onClick={save} disabled={saving || loading}>
            {saving ? "Saving..." : saved ? "Saved" : "Save how I talk"}
          </button>
          <button type="button" className="ob-btn is-quiet" onClick={() => navigate("/x")}>
            Back to dashboard
          </button>
        </div>
      </main>
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

function daysAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}
