import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import MiniBraino from "@/components/MiniBraino";
import "./affective.css";

/* ============================================================================
   /affective — the company.

   Affective is the multiverse; Braino is a universe inside it with its own
   characters and surfaces. So this page is deliberately NOT the Braino page: it
   gives Braino a brief and sends you there, because a company page that tells
   the whole product story leaves the product page with nothing to say.

   The positioning had to change once, honestly. An earlier version said "what
   we own", and we do not own the models, the speech or the vision. Claiming
   otherwise is both false and weaker than the truth: everybody has the same
   models, almost nobody has the twenty unglamorous things between a model and a
   person who trusts it. That is the actual moat and it is worth saying plainly.

   The design rule is unchanged: the grid has no gaps. A gutter says "separate
   things arranged", a shared edge says "one system divided", which is the
   entire claim the page is making.
   ============================================================================ */

/* The stack. Six because these are the six that really exist in the codebase,
   and each carries one true specific: a measured number or the actual
   mechanism. Adjectives about nothing are what make a company page read dead. */
const LAYERS = [
  {
    n: "01",
    name: "Sight",
    body:
      "Reads what is actually on the screen. The accessibility tree of any Mac app, and the real DOM of any web page, with the words printed on the elements. Not a screenshot handed to a model to guess at.",
    spec: "The live page · 220 elements a pass",
  },
  {
    n: "02",
    name: "Hearing",
    body:
      "Live transcription that survives a full lecture. The hard part was never the model. It was backpressure: when audio arrives faster than it can be read, you drop it. You never queue it.",
    spec: "40 minutes at 88% · drops, never queues",
  },
  {
    n: "03",
    name: "Voice",
    body:
      "Speech that starts before the sentence is finished, and a persona that can be swapped mid-conversation without tearing down the session.",
    spec: "First audio under 2s · barge-in aborts clean",
  },
  {
    n: "04",
    name: "Action",
    body:
      "Look, decide exactly one thing, do it, then check the screen changed the way you expected. Never a plan executed blind. Anything that spends, sends, posts or deletes stops and asks.",
    spec: "One decision a turn · the gate is code, not a prompt",
  },
  {
    n: "05",
    name: "Memory",
    body:
      "What it learns about you, kept across every surface. And what it learns from being wrong, kept across everybody: a wall one person hits once is a wall nobody else has to hit.",
    spec: "Yours, and a shared record of mistakes",
  },
  {
    n: "06",
    name: "Character",
    body:
      "The layer we are named after, and the one everyone skips. A personality assembled per turn from separate traits, so it reads what kind of moment this is and answers that, instead of performing the same warmth at everything.",
    spec: "Modular traits · routed per moment",
  },
];

/* Two products. Foundry is not one: it is Braino on the Mac, and pulling it out
   here made Braino look like three half-things instead of one whole one. */
const PRODUCTS = [
  {
    to: "/braino",
    tag: "Character One",
    name: "Braino",
    line:
      "A companion with a face, living in your browser and on your Mac. Reads the page you are on, does the thing you asked, and remembers the last time you asked it.",
    state: "In private beta",
    accent: "var(--a-braino)",
  },
  {
    to: "/brainohera",
    tag: "Dictation",
    name: "HERA",
    line:
      "Speak anywhere on the Mac and the words land where the cursor is. Built to hold an hour of talking, not a sentence.",
    state: "Built, shipping next",
    accent: "var(--a-hera)",
  },
];

/* What Braino is, in four lines, and then a door. The full story belongs on its
   own page; repeating it here would leave that page with nothing to be. */
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

/* What "hands" means, said concretely, because a metaphor alone leaves the
   statement section looking like a pull quote nobody finished. */
const HANDS = [
  { k: "It sees the real screen.", v: "The page you are on, not a box you paste into." },
  { k: "It acts, then checks.", v: "Does the thing, then looks again to see whether it worked." },
  { k: "It stops itself.", v: "Before anything that spends, sends, posts or deletes." },
];

/* The honest part, and the strongest. Everyone has the same models. */
const HONEST = [
  {
    k: "We did not train a model.",
    v: "The models are bought, like everyone else's. What sits between one and a person who trusts it is not.",
  },
  {
    k: "We did not invent speech, or vision.",
    v: "We made them survive an hour in a real room, on a real laptop, with a real person interrupting.",
  },
  {
    k: "What is ours is the assembly.",
    v: "The gate that stops a purchase. The loop that checks its own work. The memory that outlives the session. Twenty unglamorous parts nobody demos, in six layers. They are below.",
  },
];

function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".aff-reveal");
    if (!els?.length) return;
    // Everything visible at rest if the observer never runs: a section parked at
    // opacity 0 waiting on JS is how a page ships looking empty.
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
    document.body.style.background = "#fbfbfd";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff" ref={root}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/affective" className="aff-logo">Affective</Link>
          <div className="aff-nav-links">
            <a href="#honest">What is ours</a>
            <a href="#stack">The assembly</a>
            <a href="#characters">Characters</a>
            <Link to="/waitlist">Early access</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <p className="aff-kicker aff-reveal">Affective · Voice-first computing</p>
          {/* Claim left, meaning right, at the same baseline. "Software that
              does the thing" is sharp and, on its own, vague enough to be
              anybody's, so the sentence that says what it means has to sit
              beside it rather than a scroll below it. */}
          <div className="aff-hero-cols">
            <h1 className="aff-h1 aff-reveal">
              Software that <u>does</u> the thing,{" "}
              <em>instead of telling you how.</em>
            </h1>
            <div className="aff-reveal">
              <p className="aff-hero-explain">
                AI has got very good at telling you what to do. You still have to go and do
                it. Open the tab. Find the file. Copy it across. Fill in the form. Chase the
                email you have been meaning to send since Tuesday.
              </p>
              <p className="aff-hero-explain">
                We build the part that just does it. Out loud, on the computer you already
                have, inside the apps you already use.
              </p>
            </div>
          </div>
          <div className="aff-hero-meta aff-reveal">
            <span>Bengaluru</span>
            <span>Two products</span>
            <span>Private beta</span>
          </div>
        </div>
      </header>

      {/* ── How we work, honestly ──────────────────────────────────────────── */}
      <section className="aff-sec" id="honest">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>What is ours, and what is not.</h2>
            <p>
              Worth saying before anything else, because it is the only question about an
              AI company that matters. Everybody has the same models. Almost nobody has the
              part between a model and a person who actually trusts it.
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

      {/* ── The stack ──────────────────────────────────────────────────────── */}
      <section className="aff-sec" id="stack">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>The assembly, in six parts.</h2>
            <p>
              None of these is a model. They are the parts around one: how a machine sees a
              screen, holds a room, acts without wrecking anything, and does not start every
              morning from nothing. An agent is what happens when you have all six.
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

      {/* ── The statement ──────────────────────────────────────────────────── */}
      <section className="aff-statement">
        <div className="aff-wrap">
          <blockquote className="aff-reveal">
            The hard part was never the intelligence. It was the hands.
          </blockquote>
          <footer className="aff-reveal">
            Affective computing is the real name for machines that read how a person
            actually is. We took it because the last layer is the one everybody skips,
            and it is the difference between a tool you use and someone you keep.
          </footer>
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

      {/* ── Characters ─────────────────────────────────────────────────────── */}
      <section className="aff-sec" id="characters">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>One stack. Characters on top of it.</h2>
            <p>
              An agent with no personality is a command line with extra steps. So we do not
              ship the stack, we ship somebody built out of it, and the stack is what makes
              the next one take weeks instead of a year.
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

      {/* ── Braino, briefly, then a door ───────────────────────────────────── */}
      <section className="aff-braino">
        <div className="aff-wrap">
          <div className="aff-braino-top aff-reveal">
            <p className="aff-braino-eyebrow">Character One</p>
            <div className="aff-braino-name">
              <h2>Braino</h2>
              <div className="aff-braino-face" aria-hidden="true">
                <MiniBraino size={96} />
              </div>
            </div>
            <p className="aff-braino-line">
              Not an assistant. A companion, with a face and a voice and a mood, who is
              already open when you get there and does the part of the day you would rather
              not. A world of his own, with his own surfaces and his own characters. This
              is the short version.
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

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="aff-foot">
        <div className="aff-wrap">
          <div className="aff-foot-grid">
            <div className="aff-foot-brand">
              <strong>Affective</strong>
              <p>
                A voice-first computer, and the characters that make one worth keeping.
                Built in Bengaluru.
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
