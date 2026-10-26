import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter, useAffReveal } from "@/components/affPage";
import { AppLogo } from "@/components/AppLogo";
import "./affective.css";
import "./affective-home.css";
import "./maven.css";

/* Maven (2026-10-26): agentic dictation for the Mac, its own product by
   Affective (it grew out of BrainoHERA). Copy is Itish's "Maven website copy
   v2"; the page is built from the home page's parts, like /braino and
   /foundry. The mark is two slanted pills that fade from ink to air. */

export function MavenMark({ size = 120 }: { size?: number }) {
  return (
    <svg className="mv-mark" width={size} height={size * 0.625} viewBox="0 0 240 150" role="img" aria-label="Maven">
      <defs>
        <linearGradient id="mv-fade" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="currentColor" />
          <stop offset="0.45" stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect x="-22" y="-74" width="44" height="148" rx="22" transform="translate(72 75) rotate(41)" fill="url(#mv-fade)" />
      <rect x="-22" y="-74" width="44" height="148" rx="22" transform="translate(168 75) rotate(41)" fill="url(#mv-fade)" />
    </svg>
  );
}

/* Maven's face: the two bars are its eyes. No mouth, no body, nothing of
   Braino. It is alive through small things only: it breathes, blinks, looks
   at your pointer, and each mood is one change in how the bars sit. */
type Mood = "idle" | "listening" | "thinking" | "happy" | "sleepy";
const MOODS: { key: Mood; label: string; note: string }[] = [
  { key: "idle", label: "Waiting", note: "Breathes, blinks now and then, and watches your pointer." },
  { key: "listening", label: "Listening", note: "Your voice moves through both bars, the same wave in each." },
  { key: "thinking", label: "Thinking", note: "The bars tilt back and forth while it works out what you meant." },
  { key: "happy", label: "Done", note: "A small hop when your words land." },
  { key: "sleepy", label: "Resting", note: "Half closed, slow breathing, when nothing is happening." },
];

export function MavenFace({ mood }: { mood: Mood }) {
  const ref = useRef<HTMLDivElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      setLook({ x: Math.max(-1, Math.min(1, dx * 2.2)), y: Math.max(-1, Math.min(1, dy * 2.2)) });
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);
  useEffect(() => {
    let t = 0;
    const next = () => { t = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 140); next(); }, 2200 + Math.random() * 2800); };
    next();
    return () => clearTimeout(t);
  }, []);
  const follow = mood === "idle" || mood === "listening";
  return (
    <div ref={ref} className={`mv-face is-${mood}${blink && mood !== "sleepy" ? " is-blink" : ""}`}
      style={{ ["--lx" as string]: follow ? look.x.toFixed(3) : 0, ["--ly" as string]: follow ? look.y.toFixed(3) : 0 }} aria-hidden="true">
      <div className="mv-eyes">
        {[0, 1].map((e) => (
          <span key={e} className="mv-eye">
            <span className="mv-wave">{[0, 1, 2, 3, 4].map((d) => <i key={d} style={{ ["--i" as string]: d }} />)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const DOWNLOAD = "mailto:talk2braino@gmail.com?subject=Maven%20for%20Mac&body=I%27d%20like%20to%20try%20Maven.";

const SEE = [
  { say: "Tell Rahul the deck is done, numbers by five.", does: "Types a clean message in Slack, with Rahul spelled right." },
  { say: "Fill in my address.", does: "Fills the form and waits. It doesn't submit until you say so." },
  { say: "Add that to my launch list.", does: "Knows which list, and adds it." },
];

const DOES = [
  { k: "Type", h: "Talk, and it's written.", p: "Hold a key, talk, and clean, formatted text shows up in any app you use. Punctuation in, filler out, lists that look like lists." },
  { k: "Do", h: "Small jobs, by voice.", p: "Open an app. Switch a tab. Fill a form. Small jobs on your Mac, by voice." },
  { k: "Remember", h: "Say it once.", p: "Your names, your lists, your way of writing. Say it once, and Maven keeps it." },
];

const FAQ = [
  { q: "Does it work in every app?", a: "If you can click into it, you can talk into it." },
  { q: "Will it send a message or submit a form without asking?", a: "No. It waits for your yes." },
  { q: "Where is my memory kept?", a: "In your own account, where you can see it and delete it. Your voice is turned into text in the cloud, and we don't keep the recording." },
  { q: "Does it work on Windows?", a: "Not yet. Tell us and we'll let you know first." },
  { q: "How is Maven different from Wispr Flow?", a: "Wispr Flow is built around dictation: you talk, it types. Maven types too. Then it goes further: it does small jobs on your Mac by voice, like opening apps, switching tabs and filling forms. It also remembers your names, lists and details, so you say them once." },
];

export default function Maven() {
  const { theme, toggle } = useAffTheme();
  const root = useAffReveal();
  const [mood, setMood] = useState<Mood>("idle");
  useEffect(() => { document.title = "Maven · Agentic Dictation · Affective"; }, []);
  const current = MOODS.find((m) => m.key === mood)!;

  return (
    <div className="aff mv" data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} braino brand={["Maven", "/maven"]}
        links={[["See it work", "#see"], ["Face", "#face"], ["Pricing", "#pricing"], ["Questions", "#faq"]]} go={["Download for Mac", "/maven#download"]} />

      {/* ── Hero: the home page's ── */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1">
              <span className="aff-h1-line">Speak it</span>
              <b>into being.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="ah-kicker">Agentic Dictation</p>
              <p className="aff-hero-one">Maven types what you say, does small jobs for you, and remembers you. On your Mac.</p>
              <div className="aff-hero-cta">
                <a href={DOWNLOAD} className="aff-cta">Download for Mac</a>
                <a href="#see" className="aff-cta aff-cta-ghost">See it work</a>
              </div>
            </div>
          </div>
        </div>
        <div className="mv-stage aff-reveal">
          <MavenFace mood="listening" />
        </div>
        <div className="aff-strip">
          <div className="aff-wrap aff-strip-in">
            <p className="aff-strip-label">Works wherever you type</p>
            <ul className="aff-strip-names aff-strip-logos">
              {(["WhatsApp", "Chrome", "Mail", "Finder", "Calendar", "Spotify"] as const).map((n) => (
                <li key={n}><AppLogo name={n} /><span>{n}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      <main>
        {/* ── See it work ── */}
        <section className="hb6" id="see">
          <div className="aff-wrap">
            <div className="hb6-box aff-reveal">
              <div className="hb6-head">
                <div>
                  <p className="ah-kicker">See it work</p>
                  <div className="hb5-name"><h2>You say. Maven does.</h2><MavenMark size={84} /></div>
                </div>
              </div>
              <ul className="mv-see">
                {SEE.map((x) => (
                  <li key={x.say}>
                    <p className="mv-say"><span>You say</span>&ldquo;{x.say}&rdquo;</p>
                    <p className="mv-does"><span>Maven</span>{x.does}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── What it does ── */}
        <section className="hb6">
          <div className="aff-wrap">
            <div className="hb6-box aff-reveal">
              <div className="hb6-head"><div><p className="ah-kicker">What it does</p><h2 className="mv-h2">Type. Do. Remember.</h2></div></div>
              <ul className="hb4-does hb6-jobs">
                {DOES.map((d) => <li key={d.k} className="is-key"><small>{d.k}</small><h3>{d.h}</h3><p>{d.p}</p></li>)}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Maven's face (2026-10-26): two lines, alive ── */}
        <section className="hb6" id="face">
          <div className="aff-wrap">
            <div className="hb6-box mv-facebox aff-reveal">
              <div className="mv-face-copy">
                <p className="ah-kicker">Meet the face</p>
                <h2 className="mv-h2">Two lines. Still alive.</h2>
                <p className="hb6-line">Maven isn't a mascot. Its whole face is the two lines of its name. They breathe, blink, look at you, and listen. Move your pointer around.</p>
                <div className="mv-moods" role="tablist" aria-label="Mood">
                  {MOODS.map((m) => (
                    <button key={m.key} type="button" role="tab" aria-selected={mood === m.key} className={mood === m.key ? "on" : ""} onClick={() => setMood(m.key)}>{m.label}</button>
                  ))}
                </div>
                <p className="mv-mood-note">{current.note}</p>
              </div>
              <div className="mv-face-stage"><MavenFace mood={mood} /></div>
            </div>
          </div>
        </section>

        {/* ── Honest take ── */}
        <section className="hb6">
          <div className="aff-wrap">
            <div className="mv-honest aff-reveal">
              <p className="ah-kicker">Honest take</p>
              <p>You already talk to AI. Good. Your chatbot lives in a tab. Maven lives wherever you type: messages, docs, forms, everything else. It's not here to replace your chatbot. It's here so your voice works everywhere else too.</p>
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="hb6" id="pricing">
          <div className="aff-wrap">
            <div className="mv-price aff-reveal">
              <div><p className="ah-kicker">Free</p><p className="mv-amt">$0</p><p>Dictation, small actions on your Mac, basic memory.</p></div>
              <div className="is-pro"><p className="ah-kicker">Pro</p><p className="mv-amt">$10<small>/month</small></p><p>Unlimited dictation, full memory, sending and submitting with your yes, voice shortcuts.</p></div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Questions: the home page's ── */}
      <section className="hb2-faq" id="faq">
        <div className="aff-wrap hb2-faq-split">
          <div className="hb2-faq-side">
            <h3 className="hb2-faq-h aff-reveal">Questions</h3>
            <p>The short answers.</p>
          </div>
          <div className="hb2-faq-list">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<i aria-hidden="true">+</i></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── The last word ── */}
      <section className="hb-end" id="download">
        <div className="hb-end-glow" aria-hidden="true" />
        <div className="aff-wrap hb-end-in aff-reveal mv-end">
          <MavenFace mood="happy" />
          <h2 className="aff-h1 hb-end-line">Say something.</h2>
          <a href={DOWNLOAD} className="aff-cta">Download for Mac</a>
          <p className="mv-by">Maven, by <Link to="/">Affective</Link>. Powered by <Link to="/affectiveos">AffectiveOS</Link>.</p>
        </div>
      </section>

      <AffFooter />
    </div>
  );
}
