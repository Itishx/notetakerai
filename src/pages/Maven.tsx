import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AffThemeToggle, useAffTheme } from "@/components/AffTheme";
import "./affective.css";
import "./maven.css";

/* Maven (2026-10-26): agentic dictation for the Mac, its own product by
   Affective (it grew out of BrainoHERA). Copy is Itish's "Maven website copy
   v2". The mark is two slanted pills that fade from ink to air, drawn in code
   so it stays sharp at any size. */

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

/* No public build yet: the button asks for the preview instead of pretending to download. */
const DOWNLOAD = "mailto:talk2braino@gmail.com?subject=Maven%20for%20Mac&body=I%27d%20like%20to%20try%20Maven.";

const SEE = [
  { say: "Tell Rahul the deck is done, numbers by five.", does: "Types a clean message in Slack, with Rahul spelled right." },
  { say: "Fill in my address.", does: "Fills the form and waits. It doesn't submit until you say so." },
  { say: "Add that to my launch list.", does: "Knows which list, and adds it." },
];

const DOES = [
  { h: "Type", p: "Hold a key, talk, and clean, formatted text shows up in any app you use. Punctuation in, filler out, lists that look like lists." },
  { h: "Do", p: "Open an app. Switch a tab. Fill a form. Small jobs on your Mac, by voice." },
  { h: "Remember", p: "Your names, your lists, your way of writing. Say it once, and Maven keeps it." },
];

const FAQ = [
  { q: "Does it work in every app?", a: "If you can click into it, you can talk into it." },
  { q: "Will it send a message or submit a form without asking?", a: "No. It waits for your yes." },
  { q: "Where is my memory kept?", a: "In your own account, where you can see it and delete it. Your voice is turned into text in the cloud, and we don't keep the recording." },
  { q: "Does it work on Windows?", a: "Not yet. Tell us and we'll let you know first." },
  { q: "How is Maven different from Wispr Flow?", a: "Wispr Flow is built around dictation: you talk, it types. Maven types too. Then it goes further: it does small jobs on your Mac by voice, like opening apps, switching tabs and filling forms. It also remembers your names, lists and details, so you say them once." },
];

export default function Maven() {
  const [open, setOpen] = useState<number | null>(null);
  const { theme, toggle } = useAffTheme();
  useEffect(() => {
    document.title = "Maven · Agentic Dictation · Affective";
    const prev = document.body.style.background;
    document.body.style.background = theme === "dark" ? "" : "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, [theme]);
  return (
    <div className="aff" data-theme={theme}>
    <nav className="aff-nav">
      <div className="aff-nav-in">
        <Link to="/" className="aff-logo" aria-label="Affective">
          <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
        </Link>
        <div className="aff-nav-links">
          <Link to="/braino">Braino</Link>
          <Link to="/maven">Maven</Link>
          <Link to="/affectiveos">AffectiveOS</Link>
          <a href={DOWNLOAD} className="aff-nav-go">Download for Mac</a>
          <AffThemeToggle theme={theme} onToggle={toggle} />
        </div>
      </div>
    </nav>
    <main className="mv-page">
      <section className="mv-hero">
        <MavenMark size={200} />
        <p className="mv-eyebrow">Agentic Dictation</p>
        <h1>Speak it into being.</h1>
        <p className="mv-line">Maven types what you say, does small jobs for you, and remembers you. On your Mac.</p>
        <a href={DOWNLOAD} className="mv-btn">Download for Mac</a>
      </section>

      <section className="mv-sec">
        <h2>See it work</h2>
        <ul className="mv-see">
          {SEE.map((x) => (
            <li key={x.say}>
              <p className="mv-say"><span>You say</span>&ldquo;{x.say}&rdquo;</p>
              <p className="mv-does"><span>Maven</span>{x.does}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mv-sec">
        <h2>What it does</h2>
        <ul className="mv-points">
          {DOES.map((x) => <li key={x.h}><h3>{x.h}</h3><p>{x.p}</p></li>)}
        </ul>
      </section>

      <section className="mv-sec mv-honest">
        <h2>Honest take</h2>
        <p>You already talk to AI. Good. Your chatbot lives in a tab. Maven lives wherever you type: messages, docs, forms, everything else. It's not here to replace your chatbot. It's here so your voice works everywhere else too.</p>
      </section>

      <section className="mv-sec">
        <h2>Pricing</h2>
        <div className="mv-price">
          <div><h3>Free</h3><p className="mv-amt">$0</p><p>Dictation, small actions on your Mac, basic memory.</p></div>
          <div className="is-pro"><h3>Pro</h3><p className="mv-amt">$10<small>/month</small></p><p>Unlimited dictation, full memory, sending and submitting with your yes, voice shortcuts.</p></div>
        </div>
      </section>

      <section className="mv-sec">
        <h2>FAQ</h2>
        <ul className="mv-faq">
          {FAQ.map((x, i) => (
            <li key={x.q} className={open === i ? "is-open" : undefined}>
              <button type="button" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>{x.q}<span>{open === i ? "−" : "+"}</span></button>
              {open === i && <p>{x.a}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mv-end">
        <MavenMark size={72} />
        <h2>Say something.</h2>
        <a href={DOWNLOAD} className="mv-btn">Download for Mac</a>
      </section>

      <footer className="mv-foot">Maven, by Affective. Powered by AffectiveOS.</footer>
    </main>
    </div>
  );
}
