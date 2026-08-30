import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EXTENSION_DOWNLOAD_URL, EXTENSION_DOWNLOAD_FILENAME } from "@/lib/extensionDownload";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { Markdown } from "@/components/BrainoMarkdown";
import "./onboarding-flow.css";

/* Braino setup.
 *
 * The old version of this file asked eight questions and saved one answer, and
 * two of its screens promised things a web page cannot do: permission toggles
 * that grant nothing, and a choice of four voices when he has one. It was a
 * form standing in front of a product whose whole pitch is "say it and it
 * happens".
 *
 * This version makes him do something real before it asks for anything. Step
 * two is him actually answering, out of the same brain the chat page uses. Only
 * then does he ask your name, and the manner screen shows you his real answer
 * written three ways instead of three adjectives. Every answer here is written
 * to the profile the engine actually reads.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

type Device = "chrome" | "mac" | "both";

const DEVICES: { id: Device; icon: string; name: string; note: string }[] = [
  { id: "chrome", icon: "◎", name: "In my browser", note: "He rides along in Chrome: reads the page, does the tab work, talks." },
  { id: "mac", icon: "⌘", name: "On my Mac", note: "The full companion. Files, apps, screen, voice, the whole machine." },
  { id: "both", icon: "◈", name: "Both", note: "One Braino, one memory, wherever you are working." },
];

const HOTKEYS: Record<Device, { caps: string[]; name: string; note: string }[]> = {
  chrome: [
    { caps: ["Ctrl", "Ctrl"], name: "Talk to him", note: "Tap twice, start speaking." },
    { caps: ["Shift", "Shift"], name: "Let him roam", note: "He steps onto the page and follows along." },
    { caps: ["Esc"], name: "Stop", note: "Cuts him off mid-sentence. Always works." },
  ],
  mac: [
    { caps: ["Ctrl", "Ctrl"], name: "Talk to him", note: "Anywhere on the Mac, any app." },
    { caps: ["⌥", "⌥"], name: "Type what you say", note: "Silent dictation straight into the caret." },
    { caps: ["Esc"], name: "Stop", note: "Cuts him off mid-sentence. Always works." },
  ],
  both: [
    { caps: ["Ctrl", "Ctrl"], name: "Talk to him", note: "Same two keys in the browser and on the Mac." },
    { caps: ["⌥", "⌥"], name: "Type what you say", note: "Silent dictation straight into the caret." },
    { caps: ["Shift", "Shift"], name: "Let him roam", note: "He steps onto the page and follows along." },
  ],
};

/* Things worth asking a stranger's assistant on the first go: each one gets a
   real answer in a few seconds without needing anything installed. */
const ASK_EXAMPLES = [
  "Explain what a term sheet actually is, like I am 12.",
  "Give me three names for an app that reads my meetings.",
  "What should I do first if I have one hour and a big deadline?",
];

/* These are not adjectives, they are the engine's real knobs. humor, pushback
   and warmth are read by the emotional engine on every reply, so picking one of
   these genuinely changes how he talks to you. */
type MannerId = "warm" | "direct" | "playful";

const MANNERS: {
  id: MannerId;
  name: string;
  note: string;
  fallback: string;
  settings: { humor: "off" | "dry" | "playful"; pushback: "gentle" | "direct"; warmth: "measured" | "warm" };
}[] = [
  {
    id: "warm",
    name: "Warm",
    note: "Reads the room. Softer landing on a hard day.",
    fallback: "Here is how I would think about it, and take your time with it. There is no rush on my end.",
    settings: { humor: "dry", pushback: "gentle", warmth: "warm" },
  },
  {
    id: "direct",
    name: "Direct",
    note: "Answer first. No preamble, no cheerleading.",
    fallback: "Short version: do the first one. The other two cost you a week and buy you nothing.",
    settings: { humor: "dry", pushback: "direct", warmth: "measured" },
  },
  {
    id: "playful",
    name: "Playful",
    note: "Jokes back. Still gets the work done.",
    fallback: "Right, so the good news is this is easy. The bad news is you are not going to like why.",
    settings: { humor: "playful", pushback: "direct", warmth: "warm" },
  },
];

function Walker() {
  return <div className="ob-walker" aria-hidden dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />;
}

/* The left half of the sign-in screen. A scripted job on a loop: you say a
   thing, he works, it is done. Argues for him better than a sentence about him
   would, and it costs nothing because none of it is real. */
const JOB_BEATS = [
  { face: "listening", line: "Post that we shipped voice mode today.", who: "you" as const },
  { face: "thinking", line: "Writing the post", who: "him" as const },
  { face: "thinking", line: "Checking how you usually say it", who: "him" as const },
  { face: "done", line: "Posted to X", who: "him" as const },
];

function JobLoop() {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    const hold = beat === JOB_BEATS.length - 1 ? 2200 : 1700;
    const timer = window.setTimeout(() => setBeat((b) => (b + 1) % JOB_BEATS.length), hold);
    return () => window.clearTimeout(timer);
  }, [beat]);

  const current = JOB_BEATS[beat];
  return (
    <div className={`ob-loop is-${current.face}`} aria-hidden>
      <div className="ob-loop-notch">
        <span className="ob-loop-eyes"><i /><i /></span>
        <span className="ob-loop-line">{current.line}</span>
        {current.face === "thinking" && <span className="ob-loop-dots"><i /><i /><i /></span>}
        {current.face === "done" && <span className="ob-loop-check">✓</span>}
      </div>
      <p className="ob-loop-who">{current.who === "you" ? "You said it" : "He is doing it"}</p>
    </div>
  );
}

/* One way in to the brain, the same endpoint the chat page uses. */
async function askBraino(message: string, notes: string) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-about-notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token || SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      message,
      chatHistory: [],
      notes,
      userId: data.session?.user?.id,
      clientTimeZone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      clientUtcOffsetMinutes: new Date().getTimezoneOffset() * -1,
      pageContext: {
        title: "Braino setup",
        url: typeof window !== "undefined" ? window.location.href : "https://trybraino.com/onboarding",
        text: "Someone is meeting Braino for the first time, during setup, before installing anything.",
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 429) throw new Error("He is thinking too fast for his own good. Give it a moment.");
    throw new Error(typeof payload?.error === "string" ? payload.error : "He could not reach the brain just now.");
  }
  return String(payload.reply || "").trim();
}

/* Models wander. Take the JSON if it is there, walk away quietly if it is not. */
function readThreeWays(reply: string): Record<MannerId, string> | null {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(reply.slice(start, end + 1));
    const out = {} as Record<MannerId, string>;
    for (const manner of MANNERS) {
      const value = parsed?.[manner.id];
      if (typeof value !== "string" || !value.trim()) return null;
      out[manner.id] = value.trim();
    }
    return out;
  } catch {
    return null;
  }
}

function guessDevice(): Device {
  if (typeof navigator === "undefined") return "chrome";
  return /Mac/i.test(navigator.userAgent) ? "mac" : "chrome";
}

export default function OnboardingFlow() {
  const { user } = useAuth();

  const steps = useMemo(() => ["auth", "ask", "you", "manner", "install"] as const, []);
  const [step, setStep] = useState(0);
  const current = steps[step];
  const total = steps.length;

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [askText, setAskText] = useState("");
  const [askReply, setAskReply] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const askedRef = useRef("");

  const [callMe, setCallMe] = useState("");
  const [aboutYou, setAboutYou] = useState("");

  const [manner, setManner] = useState<MannerId | null>(null);
  const [samples, setSamples] = useState<Record<MannerId, string> | null>(null);
  const [samplesBusy, setSamplesBusy] = useState(false);

  const [device, setDevice] = useState<Device>(guessDevice);

  useEffect(() => { document.title = "Set up Braino"; }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const googleName = String(
    user?.user_metadata?.full_name || user?.user_metadata?.name || "",
  ).trim();
  const firstName = googleName.split(" ")[0] || "";
  const email = user?.email || "";

  /* Signing in returns here, so the moment a user exists the door is behind us. */
  useEffect(() => {
    if (!user) return;
    try { sessionStorage.removeItem("braino.onboarding"); } catch { /* private mode */ }
    if (step === 0) setStep(1);
  }, [user, step]);

  useEffect(() => {
    if (firstName && !callMe) setCallMe(firstName);
  }, [firstName, callMe]);

  const signInWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    /* Supabase only returns people to URLs on its allow list. If /onboarding is
       not on it yet, Google drops them on the homepage instead and the flow is
       lost. This breadcrumb lets the homepage put them back. */
    try { sessionStorage.setItem("braino.onboarding", "1"); } catch { /* private mode */ }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) {
      setAuthError(error.message);
      setAuthBusy(false);
    }
  }, []);

  const runAsk = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || askBusy) return;
    setAskBusy(true);
    setAskError(null);
    setAskReply("");
    askedRef.current = question;
    try {
      const reply = await askBraino(
        question,
        "This is the first thing this person has ever asked Braino. Answer it properly, in his own voice, in four sentences or fewer. No welcome speech, no mention of setup, no offer to help further.",
      );
      setAskReply(reply);
    } catch (error) {
      setAskError(error instanceof Error ? error.message : "That did not go through.");
    } finally {
      setAskBusy(false);
    }
  }, [askBusy]);

  /* The manner screen wants his real answer written three ways. Asked once, on
     arrival. If the model will not hand back clean JSON, or takes too long, the
     written samples stand in and the screen still works: this is a nice touch,
     never a thing that can block someone from finishing setup. */
  const askedForSamplesRef = useRef(false);
  useEffect(() => {
    if (current !== "manner" || askedForSamplesRef.current || !askReply) return;
    askedForSamplesRef.current = true;
    setSamplesBusy(true);
    const giveUp = new Promise<string>((resolve) => window.setTimeout(() => resolve(""), 25000));
    Promise.race([
      askBraino(
        `Here is something you just told someone:\n\n"${askReply.slice(0, 700)}"\n\n` +
          "Write the opening two sentences of that same answer three ways: warm (reads the room, gentle), " +
          "direct (answer first, no preamble), playful (jokes, still useful). " +
          'Reply with only a JSON object and nothing else, in this exact shape: {"warm":"...","direct":"...","playful":"..."}',
        "Return raw JSON only. No commentary before or after it.",
      ),
      giveUp,
    ])
      .then((reply) => setSamples(readThreeWays(reply)))
      .catch(() => setSamples(null))
      .finally(() => setSamplesBusy(false));
  }, [current, askReply]);

  /* Saving happens as you go, not at the end, so leaving halfway still keeps
     what you told him. These are the columns the engine reads: user-knowledge
     picks up display_name and overall_memory, the emotional engine reads
     personality_settings. */
  const saveAboutYou = useCallback(async () => {
    if (!user) return;
    const patch: { display_name?: string; overall_memory?: string } = {};
    if (callMe.trim()) patch.display_name = callMe.trim();
    if (aboutYou.trim()) patch.overall_memory = aboutYou.trim();
    if (!Object.keys(patch).length) return;
    await supabase.from("profiles").update(patch).eq("user_id", user.id);
  }, [user, callMe, aboutYou]);

  const saveManner = useCallback(async (id: MannerId) => {
    if (!user) return;
    const chosen = MANNERS.find((m) => m.id === id);
    if (!chosen) return;
    const { data } = await supabase.from("profiles").select("personality_settings").eq("user_id", user.id).maybeSingle();
    const existing = (data as { personality_settings?: Record<string, unknown> } | null)?.personality_settings || {};
    await supabase
      .from("profiles")
      .update({ personality_settings: { ...existing, ...chosen.settings } })
      .eq("user_id", user.id);
  }, [user]);

  const chooseManner = useCallback((id: MannerId) => {
    setManner(id);
    void saveManner(id);
  }, [saveManner]);

  const next = useCallback(() => {
    if (current === "you") void saveAboutYou();
    setStep((s) => Math.min(s + 1, total - 1));
  }, [current, saveAboutYou, total]);

  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  /* Anyone who wants the product now should get it now. */
  const skipToInstall = useCallback(() => {
    void saveAboutYou();
    setStep(total - 1);
  }, [saveAboutYou, total]);

  const canContinue =
    current === "auth" ? Boolean(user) :
    current === "you" ? callMe.trim().length > 0 :
    true;

  const liveKeys = HOTKEYS[device];

  return (
    <div className="ob-doc">
      <header className="ob-top">
        <div className="ob-top-inner">
          <Link to="/" className="ob-mark"><i />braino</Link>
          <span className="ob-count">Step {step + 1} of {total}</span>
        </div>
        <div className="ob-progress"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
      </header>

      <main className="ob-stage">
        {current === "auth" && (
          <section className="ob-step ob-auth">
            <div className="ob-auth-show">
              <Walker />
              <JobLoop />
            </div>
            <div className="ob-auth-door">
              <p className="ob-eyebrow">Get started</p>
              <h1 className="ob-h1">Make him <em>yours</em>.</h1>
              <p className="ob-lede">
                Sign in, ask him something, and see whether you like him. Nothing installs until the end.
              </p>
              <button type="button" className="ob-btn ob-google" onClick={signInWithGoogle} disabled={authBusy}>
                {authBusy ? "Opening Google…" : "Continue with Google"}
              </button>
              {authError && <p className="ob-auth-error">{authError}</p>}
              <p className="ob-fineprint">
                Already have an account? <Link to="/auth">Sign in another way</Link>
              </p>
            </div>
          </section>
        )}

        {current === "ask" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Him, actually working</p>
            <h1 className="ob-h1">Ask him <em>for something.</em></h1>
            <p className="ob-lede">
              Anything at all. He answers here, right now, with nothing installed. This is the part everyone
              skips to, so it may as well come first.
            </p>

            <div className="ob-body">
              <form
                className="ob-ask"
                onSubmit={(event) => { event.preventDefault(); void runAsk(askText); }}
              >
                <input
                  value={askText}
                  onChange={(event) => setAskText(event.target.value)}
                  placeholder="Ask me for something…"
                  aria-label="Ask Braino for something"
                  autoFocus
                />
                <button type="submit" className="ob-btn is-coral" disabled={!askText.trim() || askBusy}>
                  {askBusy ? "Thinking…" : "Ask"}
                </button>
              </form>

              {!askReply && !askBusy && (
                <div className="ob-suggests">
                  {ASK_EXAMPLES.map((example) => (
                    <button
                      type="button"
                      key={example}
                      className="ob-suggest"
                      onClick={() => { setAskText(example); void runAsk(example); }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}

              {askBusy && (
                <div className="ob-reply is-waiting">
                  <span className="ob-loop-dots"><i /><i /><i /></span>
                </div>
              )}

              {askReply && !askBusy && (
                <div className="ob-reply">
                  <span className="ob-reply-who">Braino</span>
                  <div className="ob-reply-body"><Markdown text={askReply} /></div>
                  <button type="button" className="ob-skip" onClick={() => { setAskReply(""); setAskText(""); }}>
                    Ask him something else
                  </button>
                </div>
              )}

              {askError && (
                <p className="ob-auth-error">
                  {askError} You can carry on, this does not hold anything up.
                </p>
              )}
            </div>
          </section>
        )}

        {current === "you" && (
          <section className="ob-step">
            <p className="ob-eyebrow">His turn</p>
            <h1 className="ob-h1">Now he asks <em>about you.</em></h1>
            <p className="ob-lede">
              Two things and he stops asking. Both go into his memory, so they show up the first time they matter.
            </p>

            <div className="ob-body ob-fields">
              <label className="ob-field">
                <span>What should I call you?</span>
                <input
                  className="ob-name-input"
                  value={callMe}
                  onChange={(event) => setCallMe(event.target.value)}
                  placeholder="Your name"
                  autoFocus
                />
              </label>
              <label className="ob-field">
                <span>Anything I should know about you?</span>
                <input
                  className="ob-name-input"
                  value={aboutYou}
                  onChange={(event) => setAboutYou(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && canContinue) next(); }}
                  placeholder="I am building a company and I sleep badly…"
                />
              </label>
              {email && (
                <div className="ob-avatar">
                  <b>{(callMe || "?").charAt(0).toUpperCase()}</b>Signed in<small>{email}</small>
                </div>
              )}
            </div>
          </section>
        )}

        {current === "manner" && (
          <section className="ob-step">
            <p className="ob-eyebrow">His manner</p>
            <h1 className="ob-h1">Which one <em>sounds right?</em></h1>
            <p className="ob-lede">
              {samples
                ? "The same answer he just gave you, said three ways. Pick the one you would rather read."
                : "Pick the one you would rather read. He still reads the moment, so a heavy day sounds different from a good one."}
            </p>

            <div className="ob-body ob-cards">
              {MANNERS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={`ob-card ob-manner${manner === m.id ? " is-on" : ""}`}
                  onClick={() => chooseManner(m.id)}
                >
                  <span className="ob-tick">✓</span>
                  <p className="ob-card-name">{m.name}</p>
                  <p className="ob-sample">
                    {samplesBusy && !samples
                      ? <span className="ob-sample-wait" aria-label="Loading" />
                      : `“${samples?.[m.id] || m.fallback}”`}
                  </p>
                  <p className="ob-card-note">{m.note}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {current === "install" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Last thing</p>
            <h1 className="ob-h1">
              {callMe.trim() ? <>Take him with you, <em>{callMe.trim()}.</em></> : <>Take him <em>with you.</em></>}
            </h1>
            <p className="ob-lede">
              He already knows what you told him. Installing is the only thing left, and you can add the other
              side any time. He shares one memory across both.
            </p>

            <div className="ob-body ob-cards">
              {DEVICES.map((d) => (
                <button
                  type="button"
                  key={d.id}
                  className={`ob-card${device === d.id ? " is-on" : ""}`}
                  onClick={() => setDevice(d.id)}
                >
                  <span className="ob-tick">✓</span>
                  <span className="ob-card-icon">{d.icon}</span>
                  <p className="ob-card-name">{d.name}</p>
                  <p className="ob-card-note">{d.note}</p>
                </button>
              ))}
            </div>

            <div className="ob-installs">
              {device !== "mac" && (
                <a href={EXTENSION_DOWNLOAD_URL} download={EXTENSION_DOWNLOAD_FILENAME} className="ob-btn is-coral is-big">
                  Add to Chrome
                </a>
              )}
              {device !== "chrome" && (
                <Link to="/braino?view=foundry" className={`ob-btn is-big${device === "mac" ? " is-coral" : " is-outline"}`}>
                  Download for Mac
                </Link>
              )}
            </div>

            {/* Three keys is the whole manual, so they earn a line here. Kept as
                a compact strip: this screen already carries the download, and
                the download is what people came for. */}
            <div className="ob-keystrip">
              {liveKeys.map((k) => (
                <div className="ob-keychip" key={k.name}>
                  <span className="ob-caps">
                    {k.caps.map((cap, i) => (
                      <span key={`${cap}-${i}`}>
                        {i > 0 && <span className="ob-cap-x">×</span>}
                        <span className="ob-cap">{cap}</span>
                      </span>
                    ))}
                  </span>
                  <span className="ob-key-copy"><strong>{k.name}</strong><span>{k.note}</span></span>
                </div>
              ))}
            </div>

            <p className="ob-fineprint">
              Chrome asks for the page and the microphone at install, and a Mac asks the first time he needs
              each one. This page grants none of it, and would not want to.
            </p>
          </section>
        )}
      </main>

      <footer className="ob-foot">
        <button
          type="button"
          className="ob-btn is-quiet"
          onClick={back}
          style={{ visibility: step === 0 ? "hidden" : "visible" }}
        >
          ← Back
        </button>
        {current === "auth" ? null : current === "install" ? (
          <Link to="/dashboard" className="ob-skip">Open his dashboard instead</Link>
        ) : (
          <span className="ob-foot-right">
            <button type="button" className="ob-skip" onClick={skipToInstall}>Skip setup, just give me him</button>
            <button type="button" className="ob-btn" onClick={next} disabled={!canContinue}>Continue</button>
          </span>
        )}
      </footer>
    </div>
  );
}
