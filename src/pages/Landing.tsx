import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import BrainoFooter from "@/components/BrainoFooter";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import "../styles/apple.css";
import "./landing.css";

/* ============================================================================
   / — the landing page.

   The page this replaced was a stack of questions you had to open one at a
   time, a tab row that duplicated the notch, and thirty links out to finished
   pages for an unfinished product. All of that asked the visitor to do the work
   of figuring out what this is. A landing page has to assert.

   The first pass at fixing it swung too far the other way and read as a pitch
   deck: hairlines, big type, nothing to look at. So the argument stays exactly
   as it was and the surface is now the site's own Apple system, with the notch,
   the theme toggle and the real footer that every other page has.

   Free companion first, because that is how anyone meets him, then the turn
   into Distra, because founders with a distribution problem are who this is for.
   Braino Code is deliberately absent: if Distra is the wedge, a second engine on
   the same page dilutes it.
   ============================================================================ */

const SunIcon = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const MoonIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>);

const ANCHORS = [
  { href: "#does", label: "What he does" },
  { href: "#who", label: "Who it's for" },
  { href: "#distra", label: "For founders" },
  { href: "#why", label: "Why him" },
];

/* One accent per feature, the same way the deck gives one accent per act: the
   colour is what makes four panels read as four ideas rather than one list. */
const FEATURES = [
  { n: "01", ac: "ac-coral", name: "Chat with whatever is in front of you",
    line: "Any page, any PDF, any video. He is already on it, so there is nothing to paste and nothing to upload." },
  { n: "02", ac: "ac-violet", name: "Notes from anything you listen to",
    line: "A lecture, a podcast, a two hour video. He listens and hands back something you would actually read." },
  { n: "03", ac: "ac-blue", name: "He sits in your meetings",
    line: "No bot in the participant list, invisible to your screen share. Notes at the end, and what you agreed to." },
  { n: "04", ac: "ac-green", name: "Say it, and he does it",
    line: "Books it, buys it, finds it, fills it in. In your browser, signed into your accounts, not a sandbox somewhere else." },
];

const PEOPLE = [
  { id: "founder", label: "A founder", line: "Seven jobs, no one to hand any of them to.",
    rows: [
      ["Chat with the page", "A competitor's pricing page, a contract, a docs page you do not have an hour for. Ask, get the answer."],
      ["Notes from audio", "The podcast you had on at the gym becomes three things worth posting about."],
      ["Meetings", "Investor calls and customer calls. Notes after, and a list of what you promised."],
      ["Delegate", "Book the flight, buy the domain, chase the renewal you keep forgetting."],
    ] },
  { id: "student", label: "A student", line: "Too much to read, and it is all due Friday.",
    rows: [
      ["Chat with the page", "The forty page PDF you were assigned. Or the LeetCode problem you are stuck on, explained on the page you are stuck on."],
      ["Notes from audio", "A three hour recorded lecture turns into clean notes in about four minutes."],
      ["Meetings", "Group project calls you would otherwise have to remember on your own."],
      ["Delegate", "Find the paper, fill the form, book the slot, rename the forty files."],
    ] },
  { id: "everyone", label: "Everyone else", line: "Thirty small frictions a day that nobody should be doing.",
    rows: [
      ["Chat with the page", "Whatever is in front of you. The terms nobody reads, the recipe, the tax page."],
      ["Notes from audio", "The long video you want the substance of and not the forty minutes."],
      ["Meetings", "The standup you zoned out in."],
      ["Delegate", "The booking, the form, the thing in seven tabs."],
    ] },
];

const DISTRA = [
  ["He learns how you write", "By reading two hundred of your own posts, ranked by what actually worked. Not by asking you to describe your voice in a box."],
  ["He writes and posts", "From what you actually shipped that week, at the hours your own numbers say, in your voice rather than a marketing one."],
  ["He finds the conversations", "The posts worth replying to, with the reply already drafted. You press send, because that is the part that should stay human."],
  ["He shows his work", "Every decision, including the ones where he refused to post something and why. An agent you cannot audit is one you cannot trust."],
];

const WHY = [
  { h: "He is already there.", p: "No tab to open, no context to paste. He is on the page you are on and in the meeting you are in, which is most of the work before any answer happens." },
  { h: "He remembers what you did, not just what you told him.", p: "Other assistants remember what you type into them. Braino remembers the pages you were on, the meetings he sat in, and the way you actually write." },
  { h: "He works in your browser, in your accounts.", p: "Signed in as you, on the real internet. Not a separate window that has to ask you to log in again before it can do anything." },
  { h: "He has an opinion.", p: "He will tell you an idea is weak. An assistant that agrees with everything is just a slower way of talking to yourself." },
];

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.16 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  const ref = useReveal();
  const [who, setWho] = useState(0);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  useEffect(() => { document.title = "Braino — speak, watch it happen"; }, []);

  const person = PEOPLE[who];

  return (
    <div className={"apple ld" + (dark ? " dark" : "")} ref={ref}>
      <BrainoDefs />
      <IomiNotch />

      <div className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="ld-anchor-name">Braino</span>
          <div className="an-links">
            {ANCHORS.map((a) => <a key={a.href} href={a.href}>{a.label}</a>)}
            <a href={EXTENSION_DOWNLOAD_URL} className="apple-cta">Get Braino</a>
          </div>
          <button className="apple-theme-toggle" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title="Toggle dark mode">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* ── 1. Hero ──────────────────────────────────────────────────── */}
      <header className="apple-hero left ac-coral ld-hero" id="top">
        <div className="ld-hero-grid">
          <div className="apple-reveal">
            <p className="apple-eyebrow">Braino</p>
            <h1 className="apple-display">Speak,<br /><span className="tone">watch it happen.</span></h1>
            <p className="apple-subhead">
              Braino is an AI that lives on your screen. You talk to him like a person, and he
              actually does the work.
            </p>
            <div className="ld-cta">
              <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn">Get Braino, free</a>
              <span className="ld-cta-note">Chrome. Takes a minute. No card.</span>
            </div>
          </div>
          <div className="ld-hero-art apple-reveal" aria-hidden="true">
            <Braino size={300} expr="happy" arm="wave" legs gloves />
          </div>
        </div>
      </header>

      {/* ── 2. What he does ──────────────────────────────────────────── */}
      <section id="does">
        <div className="apple-statement apple-reveal ac-coral">
          Four things, <span className="tone">every day.</span>
        </div>
        {FEATURES.map((f, i) => (
          <div className="apple-section apple-reveal" key={f.n}>
            <div className={"apple-panel ld-feature " + f.ac + (i % 2 ? " is-flip" : "")}>
              <div className="apple-copy">
                <span className="ld-feat-n">{f.n}</span>
                <h3 className="ld-feat-h">{f.name}</h3>
                <p className="ld-feat-p">{f.line}</p>
              </div>
              {/* Sized for a real 16:9 clip of the thing happening. Until those
                  exist, an honest empty frame rather than a stock photograph. */}
              <div className="ld-frame" aria-hidden="true" />
            </div>
          </div>
        ))}
      </section>

      {/* ── 3. Same four, different person ───────────────────────────── */}
      <section className="ld-who apple-reveal" id="who">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Who it is for</p>
          <h2 className="ld-h2">Same four things. <span className="tone">Different day.</span></h2>
          <p className="ld-lede">One product, three doors in. Pick the one that sounds like you.</p>

          <div className="ld-pills" role="tablist">
            {PEOPLE.map((p, i) => (
              <button key={p.id} type="button" role="tab" aria-selected={who === i}
                className={who === i ? "is-on" : undefined} onClick={() => setWho(i)}>
                {p.label}
              </button>
            ))}
          </div>

          <p className="ld-who-line">{person.line}</p>
          <div className="ld-rows">
            {person.rows.map(([k, v]) => (
              <div key={k}><b>{k}</b><p>{v}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. The turn ──────────────────────────────────────────────── */}
      <div className="apple-statement apple-reveal ac-blue ld-turn">
        That is Braino for anyone. <span className="tone">If you are building something, he has a second job.</span>
      </div>

      {/* ── 5. Distra ────────────────────────────────────────────────── */}
      <section className="apple-section apple-reveal" id="distra">
        <div className="apple-panel ac-blue ld-distra">
          <div className="apple-copy">
            <p className="apple-eyebrow">For founders</p>
            <h2 className="ld-h2">You built it.<br /><span className="tone">Nobody saw it.</span></h2>
            <p className="ld-lede">
              Building got cheap. Being seen did not. Every AI company sells you the building half.
              Nobody sells you the being seen, and posting consistently in your own voice is the
              seventh job you are already doing badly.
            </p>
          </div>
          <div className="ld-distra-grid">
            {DISTRA.map(([h, p]) => <div key={h}><b>{h}</b><p>{p}</p></div>)}
          </div>
          <div className="ld-cta">
            <Link to="/channels" className="ld-btn ghost">See how it works</Link>
            <span className="ld-cta-note">On X and LinkedIn now. Reddit and Instagram next.</span>
          </div>
        </div>
      </section>

      {/* ── 6. The two Brainos ───────────────────────────────────────── */}
      <section className="ld-kinds apple-reveal" id="kinds">
        <div className="ld-wrap">
          <p className="apple-eyebrow">The two Brainos</p>
          <h2 className="ld-h2">One character. <span className="tone">Two jobs.</span></h2>
        </div>
        <div className="apple-section">
          <div className="apple-duo">
            <div className="apple-panel ac-coral ld-kind">
              <div className="apple-copy">
                <span className="ld-kind-tag">Free, forever</span>
                <h3>Braino</h3>
                <p className="ld-kind-p">The companion. Lives in your browser, does the four things above, and is genuinely free rather than free for now.</p>
                <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn sm">Get Braino</a>
              </div>
            </div>
            <div className="apple-panel ac-blue ld-kind">
              <div className="apple-copy">
                <span className="ld-kind-tag">The one you hire</span>
                <h3>Distra</h3>
                <p className="ld-kind-p">The distribution engine. Same character, same memory, pointed at the problem of nobody knowing your product exists.</p>
                <Link to="/channels" className="ld-btn sm ghost">See Distra</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="ld-wrap">
          <p className="ld-fine">
            There is also <strong>HERA</strong>, which is not a third Braino. It is a mode either one
            drops into: hold a key, talk, and the words land at your cursor in whatever app you were
            already in. It never says anything back.
          </p>
        </div>
      </section>

      {/* ── 7. Why him ───────────────────────────────────────────────── */}
      <section className="ld-why-sec apple-reveal" id="why">
        <div className="ld-wrap">
          <p className="apple-eyebrow">The obvious question</p>
          <h2 className="ld-h2">Why not just <span className="tone">use ChatGPT?</span></h2>
          <div className="ld-why">
            {WHY.map((w) => <div key={w.h}><b>{w.h}</b><p>{w.p}</p></div>)}
          </div>
        </div>
      </section>

      {/* ── 8. Close ─────────────────────────────────────────────────── */}
      <section className="ld-close apple-reveal">
        <div className="ld-close-art" aria-hidden="true"><Braino size={150} expr="happy" legs gloves /></div>
        <h2 className="apple-display">Speak, <span className="tone">watch it happen.</span></h2>
        <div className="ld-cta">
          <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn">Get Braino, free</a>
        </div>
      </section>

      <BrainoFooter />
    </div>
  );
}
