import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import { useNotchNav } from "@/components/useNotchNav";
import "./affective.css";
import "./affective-home.css";
import { MacTaskFilm } from "@/components/MacTaskFilm";
import "./affectiveos-page.css";
import "./store-mag.css";
import { EffortChart, Viz, VoiceToAction, CapabilityMatrix, RequestWaterfall, DataMap, NotchScene } from "./aff-figures";

/* ============================================================================
   /affectiveos — an announcement, written the way a lab publishes a model
   (2026-09-30, after Anthropic's launch posts). One centred column; the
   opening paragraph is the headline; the company's serif for reading; bold
   run-ins; a comparison table with the AffectiveOS column lit; charts in
   square boxes with tabs; captions under them. What the technology IS, never
   how it is built. Every number is ours, measured in the beta, or says it is
   illustrative.
   ============================================================================ */

type Tab = "speed" | "memory";

/* The five things it gives your Mac, in the card design first made for the
   old About page (senses, voice, hands, then memory and trust wide). */
const FIVE = [
  { h: "Senses.", art: "/os-senses.jpg", p: "It sees the screen you are on and hears you, even for an hour straight. Nothing to copy, paste or explain." },
  { h: "Voice.", art: "/os-voice.jpg", p: "It talks back, out loud. Cut it off mid-sentence and it stops, like a person would." },
  { h: "Hands.", art: "/os-hands.jpg", p: "Say the task and it gets done in the apps you already use: the message sent, the file found, the form filled. 129 tools, on the real Mac." },
  { h: "Memory.", art: "/os-memory.jpg", p: "Everything it hears, says and does lands here and stays, on your Mac. Not what you typed into a chat: what actually happened, all day." },
  { h: "Trust.", art: "", p: "Anything that spends money, sends a message, posts in public or deletes something waits for your yes." },
];

/* Time to done, in seconds: from our own beta logs (the email figure is the
   team's own target, and says so in the notes). */
const SPEED: { job: string; instead: string; s: number; label: string; note?: string }[] = [
  { job: "What is due this week?", instead: "instead of opening the portal and scrolling", s: 0.5, label: "0.5 s" },
  { job: "Message the right person on WhatsApp", instead: "instead of find, open, type, send", s: 1, label: "~1 s" },
  { job: "Fill a whole form from what he knows", instead: "instead of typing every field again", s: 1, label: "~1 s" },
  { job: "Draft the reply to an email thread", instead: "instead of reading back and writing it", s: 5, label: "< 5 s", note: "1" },
  { job: "Find and compare the cheapest flights", instead: "instead of tabs, filters and dates", s: 20, label: "~20 s" },
]

function SpeedChart() {
  // log scale, 0.1 s to 60 s
  const x = (s: number) => 330 + (Math.log10(s) - Math.log10(0.1)) / (Math.log10(60) - Math.log10(0.1)) * 570;
  const ticks = [0.1, 0.5, 1, 5, 10, 30, 60];
  return (
    <svg viewBox="0 0 960 340" className="ao-svg" role="img" aria-label="Time to done for five everyday jobs, from half a second for your next class to about twenty seconds for finding flights.">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1="20" x2={x(t)} y2="290" className="ao-grid" />
          <text x={x(t)} y="316" className="ao-tick">{t < 1 ? `${t}` : t}</text>
        </g>
      ))}
      <line x1="330" y1="290" x2="900" y2="290" className="ao-axis" />
      {SPEED.map((r, i) => {
        const y = 42 + i * 52;
        return (
          <g key={r.job}>
            <text x="316" y={y} className="ao-row-label">{r.job}</text>
            <text x="316" y={y + 18} className="ao-row-sub">{r.instead}</text>
            <line x1="330" y1={y} x2={x(r.s)} y2={y} className="ao-bar" />
            <circle cx={x(r.s)} cy={y} r="8" className="ao-dot" />
            <text x={x(r.s) + 16} y={y + 6} className="ao-val">{r.label}{r.note ? <tspan className="ao-sup" dy="-6">{r.note}</tspan> : null}</text>
          </g>
        );
      })}
      <text x="615" y="338" className="ao-axis-t">Seconds, from asking to done (log scale)</text>
    </svg>
  );
}

function MemoryChart() {
  const months = ["Mar", "Apr", "May", "Jun"];
  return (
    <svg viewBox="0 0 960 340" className="ao-svg" role="img" aria-label="Illustrative: what AffectiveOS knows about you rises month after month; a chat window starts over each time.">
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="120" y1={40 + i * 60} x2="900" y2={40 + i * 60} className="ao-grid" />)}
      <line x1="120" y1="280" x2="900" y2="280" className="ao-axis" />
      <line x1="120" y1="30" x2="120" y2="280" className="ao-axis" />
      <text x="70" y="160" className="ao-axis-t" transform="rotate(-90 70 160)">What it knows about you</text>
      {months.map((m, i) => <text key={m} x={200 + i * 220} y="308" className="ao-tick">{m}</text>)}
      <polyline points="150,262 330,220 510,170 690,118 870,64" className="ao-line ao-line-blue" />
      {[[150, 262], [330, 220], [510, 170], [690, 118], [870, 64]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="8" className="ao-dot" />)}
      {[0, 1, 2, 3].map((i) => (
        <polyline key={i} points={`${150 + i * 200},270 ${290 + i * 200},236 ${290 + i * 200},270`} className="ao-line ao-line-grey" />
      ))}
    </svg>
  );
}


const COMPARE: { row: string; sub: string; us: string; chat: string; dict: string; cloud: string }[] = [
  { row: "Sees your screen", sub: "without pasting", us: "Yes", chat: "When you paste it", dict: "No", cloud: "Its own browser" },
  { row: "Hears you", sub: "for an hour straight", us: "Yes", chat: "Voice mode", dict: "Types it out", cloud: "No" },
  { row: "Talks back", sub: "and can be cut off", us: "Yes", chat: "Voice mode", dict: "No", cloud: "No" },
  { row: "Does the task", sub: "in your own apps", us: "Yes", chat: "No", dict: "No", cloud: "On a remote computer" },
  { row: "Remembers your day", sub: "across every app", us: "Yes", chat: "Its own window", dict: "No", cloud: "Per task" },
  { row: "Asks before acting", sub: "spend, send, post, delete", us: "Always", chat: "Not applicable", dict: "Not applicable", cloud: "Varies" },
  { row: "Where it runs", sub: "", us: "Your Mac", chat: "A browser tab", dict: "Your Mac", cloud: "The cloud" },
];

export default function AffectiveOSPage() {
  const { theme, toggle } = useAffTheme();
  useNotchNav();
  const [tab, setTab] = useState<Tab>("speed");

  useEffect(() => {
    document.title = "Introducing AffectiveOS · Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff ao" data-theme={theme}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <Link to="/braino">Braino</Link>
            <Link to="/affectiveos">AffectiveOS</Link>
            <Link to="/about">About</Link>
            <Link to="/braino#early-access" className="aff-nav-go">Join the waitlist</Link>
            <AffThemeToggle theme={theme} onToggle={toggle} />
          </div>
        </div>
      </nav>

      {/* ── Why it works: AffectiveOS, the layer under him ── */}
      <section className="ah-os" id="technology">
        <div className="aff-wrap">
          <p className="ah-kicker">Why it works</p>
          <h2 className="aff-h1 ah-os-line">
            Maven and Braino both run on AffectiveOS, the layer we built for the Mac you already own.
          </h2>
          <div className="ah-os-say aff-reveal">
            <p>AffectiveOS gives your Mac eyes to see your screen, ears to hear you, a voice to answer, hands to do the work, and a memory of you. It runs on top of macOS, so there is nothing to replace or reinstall.</p>
            
          </div>
        </div>
        {/* What it gives your Mac: the senses grid, three that act and the one
            they all land on, the way the old About page drew it. */}
        <div className="aff-wrap">
          <div className="ah-mac aff-reveal"><MacTaskFilm /></div>
        </div>
      </section>



      <article className="ao-col">
        <p className="ao-date">September 30, 2026 · Announcements</p>
        <h1 className="ao-title">
          Introducing AffectiveOS, an agentic, voice-first operating system that lets you talk to
          your Mac and have it do the work. It sees your screen, hears you, answers out loud, acts in
          your apps, and remembers you.
        </h1>

        <Viz caption="Figure 1. You speak; your words appear; the steps run, and it stops before anything is posted."><VoiceToAction /></Viz>
        <p>
          Here is the thing that bugged us. Computers got faster every year, and we still spend the
          day operating them: open this, find that, copy, paste, click, send. We were learning the
          computer's language, the way we always have. Commands, then menus, then taps.
        </p>
        <p>
          We think the next step is the one where the computer learns ours. You say what you want,
          the way you would say it to a friend, and it happens. That is AffectiveOS. And Braino, a
          companion who lives in your notch, is the first thing we built on it.
        </p>
        <p className="ao-why">We grew up watching Tony Stark talk to Jarvis. This is our way of building it, for the Mac you already own.</p>
        <p>So what does it actually give your Mac? Five things it never had.</p>
      </article>

      <article className="ao-col">
        {FIVE.map((d) => (
          <p key={d.h}><b>{d.h}</b> {d.p}</p>
        ))}
      </article>

      <article className="ao-col">
        <h2>How it works</h2>

        <p>
          <b>One brain, two speeds.</b> Think of how you work. Some things you just do without
          thinking, and some you stop and plan. AffectiveOS is the same. A reflex on your Mac figures
          out what you mean: a chat, a quick action or a bigger job. The easy ones it just does. The
          big ones go to the thinking, which plans the whole job once. And the reflex learns from the
          thinking, so what needed a plan yesterday can be a reflex tomorrow.
        </p>
        <p>
          <b>We buy the thinking, build the hands, and keep the memory.</b> We are not trying to train
          the biggest model. We use the best ones of the day, from labs like Anthropic and OpenAI, and
          swap them as they get better. Everything that acts on your Mac, we built. And what it
          remembers is yours, on your machine.
        </p>
      </article>

      <div className="ao-wide">
        <figure className="ao-chart">
          <div className="ao-chart-head"><b>Where the time goes</b><span>Illustrative</span></div>
          <div className="ao-legend"><span><i className="is-grey" />Doing it yourself</span><span><i className="is-blue" />Saying it to your Mac</span></div>
          <EffortChart />
        </figure>
        <p className="ao-cap">An illustration, not a measurement: the steps you take by hand for everyday jobs, against saying one sentence.</p>
      </div>

      <article className="ao-col">
        <h2>How it compares</h2>
        <Viz caption="Figure 2. What each kind of tool covers today."><CapabilityMatrix /></Viz>
        <p>
          Honestly, every tool out there does one piece of this well. A chat assistant is smart, but
          then you do the work. Dictation types faster, and that is it. Cloud agents can act, but on
          some computer that is not yours. We wanted all of it together, on the Mac you already own.
        </p>
      </article>

      <div className="ao-wide">
        <div className="ao-table-wrap">
          <table className="ao-table">
            <thead>
              <tr><th /><th className="is-us">AffectiveOS</th><th>Chat assistants</th><th>Dictation apps</th><th>Cloud agents</th></tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.row}>
                  <td><b>{r.row}</b>{r.sub && <span>{r.sub}</span>}</td>
                  <td className="is-us"><b>{r.us}</b></td>
                  <td>{r.chat}</td><td>{r.dict}</td><td>{r.cloud}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ao-cap">A general comparison of categories, not of any one product. Categories change quickly; this reflects them as of September 2026.</p>
      </div>

      <article className="ao-col">
        <h2>Speed</h2>
        <Viz caption="Figure 3. One request, broken down. Typical, not a benchmark: the hands take as long as the job does."><RequestWaterfall /></Viz>
        <p>
          Most of what we ask for is small, and small things should feel instant. So a reflex on the
          Mac handles them itself, in about five hundredths of a second, before any big model is even
          involved. Bigger jobs get planned once, in about two seconds, and then you watch them happen.
        </p>
      </article>

      <div className="ao-wide">
        <div className="ao-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "speed"} onClick={() => setTab("speed")}>Time to done</button>
          <button type="button" role="tab" aria-selected={tab === "memory"} onClick={() => setTab("memory")}>Memory over time</button>
        </div>
        <figure className="ao-chart">
          <div className="ao-chart-head">
            <b>{tab === "speed" ? "Everyday jobs" : "What it knows about you"}</b>
            <span>{tab === "speed" ? "Seconds to done" : "Illustrative"}</span>
          </div>
          <div className="ao-legend">
            {tab === "speed"
              ? <span><i className="is-blue" />AffectiveOS, in the Braino beta</span>
              : <><span><i className="is-blue" />AffectiveOS</span><span><i className="is-grey" />A chat window, starting over</span></>}
          </div>
          {tab === "speed" ? <SpeedChart /> : <MemoryChart />}
        </figure>
        <p className="ao-cap">
          {tab === "speed"
            ? "Typical times measured in our private beta on a MacBook, from the moment you finish speaking. They vary with the job, the network and the model in use."
            : "An illustration of the idea, not a measurement: memory kept on the machine grows with use, while a chat window's memory ends with the window."}
        </p>
      </div>

      <article className="ao-col">
        <h2>Privacy</h2>
        <Viz caption="Figure 4. Where things live."><DataMap /></Viz>
        <p>
          Something that sees your screen all day has to earn that. So what AffectiveOS remembers
          stays on your Mac. Private windows and password apps are never written down, nothing it
          sees is sold, and you can read, fix or delete anything it keeps, or pause it whenever you
          like.
        </p>

        <h2>Availability</h2>
        <Viz caption="Figure 5. AffectiveOS arrives inside Braino, in the notch."><NotchScene /></Viz>
        <p>
          You do not install AffectiveOS on its own. It comes inside <Link to="/braino">Braino</Link>,
          which is in private beta on Mac and Chrome right now. We are letting people in a few at a
          time. <Link to="/braino#early-access">Join the waitlist</Link>, or read <Link to="/about">why we are
          building this</Link>.
        </p>

        <div className="ao-notes">
          <p>Footnotes</p>
          <ol>
            <li>Replying to an email in under five seconds is the time for Braino to draft the reply; you still read it and press send.</li>
            <li>The comparison table describes categories of tools in general, not any single product.</li>
            <li>The memory chart is illustrative and is not based on a measurement.</li>
          </ol>
        </div>
      </article>

      <footer className="ao-foot">
        <span>Affective · Bengaluru</span>
        <span><Link to="/">Home</Link><Link to="/about">About</Link><Link to="/braino">Braino</Link></span>
      </footer>
    </div>
  );
}
