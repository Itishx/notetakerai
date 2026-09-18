import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import MiniBraino from "@/components/MiniBraino";
import "./affective.css";

/* ============================================================================
   /affective — the company.

   Affective is the multiverse; Braino is a universe inside it. So this page
   gives Braino a brief and a door: a company page that tells the whole product
   story leaves the product page with nothing to say.

   Three rules, all three arguments rather than decoration.

   The grid has no gaps. A gutter says "separate things arranged", a shared edge
   says "one system divided", which is the claim the page is making.

   Headings are the serif, body is the sans, split by ROLE rather than by size.
   The serif makes claims and says true things; the sans explains and lists. That
   split is what stops a page this long reading as one wall.

   And the copy is written for somebody who has never heard of an accessibility
   tree. Nobody has ever wanted "screen awareness"; they want to not have to do
   it themselves. Every technical sentence was cut or translated.
   ============================================================================ */

const LAYERS = [
  {
    n: "01",
    name: "It can see your screen",
    body:
      "Whatever is in front of you right now. The email, the page, the spreadsheet, the form. It reads the real thing, so you never have to describe it or paste it anywhere.",
    spec: "Any app, any website",
  },
  {
    n: "02",
    name: "It can listen for an hour",
    body:
      "A whole lecture, a whole meeting, a whole afternoon of thinking out loud. Most dictation falls apart after a few minutes. This does not.",
    spec: "40 minutes, 88% accurate",
  },
  {
    n: "03",
    name: "It talks back",
    body:
      "Out loud, starting before you have finished your sentence, and you can cut it off mid-word the way you would a person.",
    spec: "Answers in under two seconds",
  },
  {
    n: "04",
    name: "It actually does things",
    body:
      "Not a list of steps for you to follow. It clicks, types, books and sends. Then it looks again to check the thing it did actually worked.",
    spec: "Checks its own work",
  },
  {
    n: "05",
    name: "It remembers you",
    body:
      "What you told it last month. Who your people are. How you like things done. You are not starting again every morning with a stranger.",
    spec: "The same on every device",
  },
  {
    n: "06",
    name: "It is somebody",
    body:
      "The part we are named after, and the part everybody else skips. A face, a voice, and a read on what kind of day you are having before it answers.",
    spec: "The reason you keep it",
  },
];

const PRODUCTS = [
  {
    to: "/braino",
    tag: "Character One",
    name: "Braino",
    line:
      "A companion who lives in your browser and on your Mac. Already open, already knows what you are looking at, and does the part of the day you would rather not.",
    state: "In private beta",
    accent: "var(--a-braino)",
  },
  {
    to: "/brainohera",
    tag: "Dictation",
    name: "HERA",
    line:
      "Speak anywhere on your Mac and the words land where the cursor is. Built to hold an hour of talking, not a sentence.",
    state: "Built, shipping next",
    accent: "var(--a-hera)",
  },
];

const BRAINO_BRIEFS = [
  {
    h: "He is already there.",
    p: "Nothing to open. He lives in your browser and in your Mac's notch, on whatever page you happen to be on.",
  },
  {
    h: "He does the half of the day you hate.",
    p: "The form, the booking, the five tabs, the reply you have been putting off since Tuesday.",
  },
  {
    h: "He can see what you are looking at.",
    p: "Ask about this email, this page, this invoice. There is no step where you paste anything anywhere.",
  },
  {
    h: "He knows your week.",
    p: "Your classes, your deadlines, which room, who is teaching. Not a calendar you keep up to date. The one your college already keeps.",
  },
  {
    h: "He knows your people.",
    p: "Who you message on a Friday. What you told him last month. Which Ravi you meant.",
  },
  {
    h: "He will not do what you did not ask.",
    p: "Nothing bought, sent, posted or deleted until you say yes. That one is not a promise in a prompt, it is a rule in the code.",
  },
];

/* What "hands" means, said plainly. A metaphor on its own leaves the statement
   looking like a pull quote nobody finished. */
const HANDS = [
  { k: "It sees the real screen.", v: "The page you are on, not a box you paste into." },
  { k: "It acts, then checks.", v: "Does the thing, then looks again to see whether it worked." },
  { k: "It stops itself.", v: "Before anything that spends, sends, posts or deletes." },
];

const HONEST = [
  {
    k: "We did not build the AI.",
    v: "The models are bought, the same ones anybody can buy. Nobody has an advantage there, and anyone claiming one is selling something.",
  },
  {
    k: "We did not invent speech, or vision.",
    v: "We made them survive an hour in a real room, on a real laptop, with a real person interrupting. That part nobody sells you.",
  },
  {
    k: "What is ours is everything in between.",
    v: "The bit that stops it buying the wrong thing. The bit that checks its own work. The bit that still knows you next month. Twenty unglamorous parts, and they are the whole product.",
  },
];

/* The questions people actually ask, answered without a single word anybody
   would have to look up. */
const FAQ = [
  {
    q: "What is Affective, in one line?",
    a: "A company building the technology that makes voice-first computing possible, and the characters people actually want to talk to.",
  },
  {
    q: "Is this just another chatbot?",
    a: "The opposite. A chatbot answers and leaves you to it. Ours goes and does the thing, on the screen you are already looking at, and then tells you it is done.",
  },
  {
    q: "Do I have to move to a new app?",
    a: "No. It works inside what you already use: your browser, your Mac, your email, your college portal. There is nothing to migrate and nothing to set up.",
  },
  {
    q: "Can it do something I did not ask for?",
    a: "No. Anything that spends money, sends a message, posts publicly or deletes something stops and waits for you to say yes. That is enforced in the code, not requested in an instruction.",
  },
  {
    q: "What can I actually use today?",
    a: "Braino is in private beta on Chrome and macOS. HERA is built and ships next. Everything described on this page is something the software does now, not something planned.",
  },
  {
    q: "Who is it for?",
    a: "One person at a time. Not a team plan, not a workspace. The whole thing assumes it belongs to you and knows your life, which is a different product from one that belongs to your employer.",
  },
];

function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".aff-reveal");
    if (!els?.length) return;
    // Visible at rest if the observer never runs. A section parked at opacity 0
    // waiting on JS is how a page ships looking empty.
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return root;
}

export default function Affective() {
  const root = useReveal();

  useEffect(() => {
    document.title = "Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff" ref={root}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/affective" className="aff-logo">Affective</Link>
          <div className="aff-nav-links">
            <a href="#honest">What is ours</a>
            <a href="#stack">What it does</a>
            <a href="#characters">Characters</a>
            <a href="#faq">Questions</a>
            <Link to="/waitlist">Early access</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <p className="aff-kicker aff-reveal">Affective · Voice-first computing</p>
          {/* The claim on the left and, immediately beside it, the reason
              anybody should care. A short claim on its own is a slogan. */}
          <div className="aff-hero-cols">
            <h1 className="aff-h1 aff-reveal">
              We build the technology behind a computer you can{" "}
              <em>just talk to.</em>
            </h1>
            <div className="aff-reveal">
              <p className="aff-hero-explain">
                AI has got very good at telling you what to do. You still have to go and do
                it yourself. Open the tab, find the file, copy it across, fill in the form,
                send the email you have been putting off since Tuesday.
              </p>
              <p className="aff-hero-explain">
                We build the part that goes and does it, and the characters worth asking.
              </p>
            </div>
          </div>

          {/* Show the thing. A company page that never does is asking to be
              taken on faith. */}
          <figure className="aff-shot aff-reveal">
            <div className="aff-shot-frame">
              <span className="aff-shot-note">Braino, on the page you are already on</span>
            </div>
          </figure>

          <div className="aff-hero-meta aff-reveal">
            <span>Bengaluru</span>
            <span>Two products</span>
            <span>Private beta</span>
          </div>
        </div>
      </header>

      {/* ── What is ours ───────────────────────────────────────────────────── */}
      <section className="aff-sec" id="honest">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>What is ours, and what is not.</h2>
            <p>
              Worth saying before anything else, because it is the only question about an
              AI company that matters.
            </p>
          </div>
          <dl className="aff-honest aff-reveal">
            {HONEST.map((h) => (
              <div className="aff-honest-row" key={h.k}>
                <dt>{h.k}</dt>
                <dd>{h.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── The statement, its own section ─────────────────────────────────── */}
      <section className="aff-statement">
        <div className="aff-wrap">
          <blockquote className="aff-reveal">
            The hard part was never the intelligence.
            {" "}<span>It was the hands.</span>
          </blockquote>
          <dl className="aff-hands aff-reveal">
            {HANDS.map((h) => (
              <div key={h.k}>
                <dt>{h.k}</dt>
                <dd>{h.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── What it does ───────────────────────────────────────────────────── */}
      <section className="aff-sec" id="stack">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>Six things, and you only get an assistant worth having with all six.</h2>
            <p>
              Most of these exist somewhere on their own. Nobody had put them in one place
              and made them survive a normal Tuesday.
            </p>
          </div>
        </div>
        <div className="aff-wrap">
          <div className="aff-grid aff-grid-3 aff-reveal">
            {LAYERS.map((l) => (
              <article className="aff-cell" key={l.n}>
                <span className="aff-cell-n">{l.n}</span>
                <h3>{l.name}</h3>
                <p>{l.body}</p>
                <span className="aff-spec">{l.spec}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Characters ─────────────────────────────────────────────────────── */}
      <section className="aff-sec" id="characters">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>One set of parts. Different people built out of them.</h2>
            <p>
              Something that can do everything and is nobody is a command line with extra
              steps. So we do not sell the parts. We build somebody out of them, and the
              parts are why the next one takes weeks instead of a year.
            </p>
          </div>
        </div>
        <div className="aff-wrap">
          <div className="aff-grid aff-grid-2 aff-reveal">
            {PRODUCTS.map((p) => (
              <Link
                to={p.to}
                key={p.name}
                className="aff-prod"
                style={{ ["--acc" as string]: p.accent }}
              >
                <span className="aff-prod-tag">{p.tag}</span>
                <h3>{p.name}</h3>
                <p className="aff-prod-line">{p.line}</p>
                <div className="aff-prod-foot">
                  <span>See it</span>
                  <span>{p.state}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Braino ─────────────────────────────────────────────────────────── */}
      <section className="aff-braino">
        <div className="aff-wrap">
          <div className="aff-braino-top aff-reveal">
            <p className="aff-braino-eyebrow">Where it started</p>
            <div className="aff-braino-name">
              <h2>Braino</h2>
              <div className="aff-braino-face" aria-hidden="true">
                <MiniBraino size={96} />
              </div>
            </div>
            <p className="aff-braino-line">
              Affective exists because of him. He came first. Every part on this page was
              built because he needed it to be somebody worth keeping around, and the
              company is what was left over once he worked.
            </p>
          </div>
        </div>
        <div className="aff-wrap">
          <div className="aff-grid aff-grid-2 aff-reveal">
            {BRAINO_BRIEFS.map((b) => (
              <article className="aff-brief" key={b.h}>
                <h3>{b.h}</h3>
                <p>{b.p}</p>
              </article>
            ))}
          </div>
          <div className="aff-door aff-reveal">
            <Link to="/braino" className="aff-door-link">
              The whole of Braino
              <span aria-hidden="true">→</span>
            </Link>
            <p>Browser, Mac, the Foundry, and the characters inside his world.</p>
          </div>
        </div>
      </section>

      {/* ── Questions ──────────────────────────────────────────────────────── */}
      <section className="aff-sec" id="faq">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>Questions people actually ask.</h2>
          </div>
          {/* details/summary, so it works with no JavaScript and with a
              keyboard, and so the page is not one uninterrupted scroll of prose
              by the time somebody gets here. */}
          <div className="aff-faq aff-reveal">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>
                  <span>{f.q}</span>
                  <i aria-hidden="true" />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="aff-foot">
        <div className="aff-wrap">
          <div className="aff-foot-grid">
            <div className="aff-foot-brand">
              <strong>Affective</strong>
              {/* Affective is not a voice-first computer. It is the company
                  building what one needs in order to exist. */}
              <p>
                We do not make a voice-first computer. We build the technology that makes
                one possible, and the characters worth talking to. Bengaluru.
              </p>
            </div>
            <nav className="aff-foot-col">
              <h4>Products</h4>
              <Link to="/braino">Braino</Link>
              <Link to="/brainohera">HERA</Link>
            </nav>
            <nav className="aff-foot-col">
              <h4>Company</h4>
              <Link to="/waitlist">Early access</Link>
              <Link to="/contact">Contact</Link>
            </nav>
          </div>
          <p className="aff-foot-rule">
            Braino is in private beta and not generally available. Everything described
            here is something the software does today. Nothing on this page is a roadmap.
          </p>
        </div>
      </footer>
    </div>
  );
}
