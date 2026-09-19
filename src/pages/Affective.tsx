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
    tag: "Product One",
    name: "Braino",
    line:
      "A companion who lives in your browser and on your Mac. Already open, already knows what you are looking at, and does the part of the day you would rather not.",
    state: "In private beta",
    accent: "var(--a-braino)",
  },
  {
    to: "/brainohera",
    tag: "Product Two",
    name: "HERA",
    line:
      "Speak anywhere on your Mac and the words land where the cursor is. Built to hold an hour of talking, not a sentence.",
    state: "Built, shipping next",
    accent: "var(--a-hera)",
  },
];

/* What one learns and the other already knows.
 *
 * This was four paragraphs explaining an account system, which is the answer
 * to a question nobody asked. Nobody wants to know that two products share a
 * user record. They want to know they will not have to say it all again.
 *
 * So each one is a sentence, and each sentence is a thing that would otherwise
 * have annoyed you twice. */
const TRAVELS = [
  { h: "Your words", p: "Say Riya once. Nothing writes Rhea again." },
  { h: "Your people", p: "It knows which Ravi you meant." },
  { h: "Your week", p: "It already has your Tuesday." },
  { h: "Your way", p: "What you said in March still holds in June." },
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
/* The middle of the story, and the part that was missing.
 *
 * The page went promise, then argument, then capability list, and never once
 * showed a Tuesday. This is not a tour of what the software does; it is what
 * changes about a normal day on a normal Mac. Each one is written as an outcome
 * somebody would notice, with the version everybody has today beside it, so the
 * value lands before a single word of how it works.
 *
 * Deliberately not phrased as "ask it to X". A list of commands is a manual,
 * and a manual is a thing you read after you have already been convinced. */
const THE_DAY = [
  {
    h: "Meetings become invisible.",
    now: "You half-listen and half-type, and end up doing neither well.",
    next:
      "It listens for the whole hour. You shut the laptop and the notes are already written, with what was decided and who said they would do what.",
  },
  {
    h: "Typing becomes optional.",
    now: "Everything you want to say has to go through your hands first.",
    next:
      "Talk anywhere on your Mac and the words land where the cursor is. In the email, in the doc, in the message box. An hour of it, not a sentence.",
  },
  {
    h: "Nothing needs explaining twice.",
    now: "Copy it out, paste it in, describe the bit it cannot see, try again.",
    next:
      "It is looking at the same screen you are. Ask about this email, this page, this invoice, and there is no step where you set the scene.",
  },
  {
    h: "The errands stop being yours.",
    now: "The booking, the form, the six tabs, the reply you have been putting off.",
    next:
      "You say it once and it goes and does it, and it stops to ask before anything gets bought, sent or deleted.",
  },
  {
    h: "Your week keeps itself.",
    now: "A calendar is only as good as the last time you remembered to update it.",
    next:
      "It reads the timetable your college or your company already keeps, so it knows what is on today without you entering anything.",
  },
  {
    h: "And you are not talking to a tool.",
    now: "A blank box and a blinking cursor, every single morning, forever.",
    next:
      "A face, a voice, and a read on what kind of day you are having. It knows what you told it last month, and it is the same one tomorrow.",
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
    q: "Did you build the AI itself?",
    a: "No, and neither did almost anybody saying they did. The models are bought, the same ones anybody can buy. There is no advantage there and anyone claiming one is selling something.",
  },
  {
    q: "Then what is actually yours?",
    a: "Everything in between. Speech and vision exist; making them survive an hour in a real room, on a real laptop, with a real person interrupting, does not come in a box. Nor does the part that stops it buying the wrong thing, or checks its own work, or still knows you next month. It is about twenty unglamorous pieces and they are the entire product.",
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
            <a href="#day">What changes</a>
            <a href="#stack">How it works</a>
            <a href="#products">Products</a>
            <a href="#ecosystem">Ecosystem</a>
            <a href="#faq">Questions</a>
            <Link to="/waitlist">Early access</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────
          Four things and nothing else: what this is, the promise, the picture,
          and where we are. The long version of the claim was carrying the
          whole argument in the first screen, which left nothing to open on and
          no reason to scroll. It has its own section underneath now, and this
          is the line it is arguing for. */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <p className="aff-kicker aff-reveal">Affective · Voice-first computing</p>
          <h1 className="aff-h1 aff-reveal">
            Stop using your computer.
            <b>Start talking to it.</b>
          </h1>
          {/* One line. A promise this big needs saying what it is, and nothing
              past that until the reader has decided to keep going. */}
          <p className="aff-hero-one aff-reveal">
            We make the products you talk to, and the technology underneath them.
          </p>

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

      {/* ── The position ───────────────────────────────────────────────────
          What the hero used to be, given its own room. As the opening screen
          it was three paragraphs deep before anybody had agreed to read
          anything; as the second beat it is the argument for the line they
          have just read and decided to keep going on.

          Laid out the other way up from the thesis further down, statement
          across the top and the supporting text in columns beneath, so two
          sections of large serif do not read as the same section twice. */}
      <section className="aff-position" id="position">
        <div className="aff-wrap">
          <p className="aff-position-kicker aff-reveal">What we do</p>
          <h2 className="aff-position-line aff-reveal">
            We build the technology that lets you talk to your computer instead of typing
            and clicking your way through it.
            <b>Your hands are free.</b>
          </h2>
          <div className="aff-position-cols aff-reveal">
            <p>
              AI has got very good at telling you what to do. You still have to go and do
              it yourself. Open the tab, find the file, fill in the form, send the email
              you have been putting off since Tuesday.
            </p>
            <p>Say it out loud instead. That is the whole company.</p>
          </div>
        </div>
      </section>

      {/* ── What changes ──────────────────────────────────────────────────── */}
      <section className="aff-sec aff-day" id="day">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">What it means</p>
            <h2>What changes about your day.</h2>
            <p>
              Talking to a computer sounds like a small thing. Here is what it actually
              does to a week: six you would notice by Friday, each one beside the version
              you have today.
            </p>
          </div>
        </div>
        <div className="aff-wrap">
          <div className="aff-grid aff-grid-2 aff-reveal">
            {THE_DAY.map((d) => (
              <article className="aff-day-cell" key={d.h}>
                <h3>{d.h}</h3>
                {/* Today first, so the reader recognises themselves before
                    being sold anything. */}
                <p className="aff-day-now"><span>Today</span>{d.now}</p>
                <p className="aff-day-next">{d.next}</p>
              </article>
            ))}
          </div>
          {/* Where all of it lands. The point of the section is not six
              separate tricks, it is that one character performs all of them. */}
          <p className="aff-day-foot aff-reveal">
            All six come out of one set of parts. So far we have built{" "}
            <a href="#products">two things</a> with them.
          </p>
        </div>
      </section>

      {/* ── The thesis ─────────────────────────────────────────────────────
          A magazine spread: the claim at full size on the left, and the reason
          it is true set as a standfirst on the right. Previously the quote sat
          alone above three cells that restated the six layers three sections
          early, which is what made it read as a page that had run out rather
          than a page that had paused. */}
      <section className="aff-statement" id="hands">
        <div className="aff-wrap">
          <div className="aff-statement-in">
            <blockquote className="aff-reveal">
              The hard part was never the intelligence.
              {" "}<span>It was the hands.</span>
            </blockquote>
            <div className="aff-statement-say aff-reveal">
              <p className="aff-statement-kicker">Why the company exists</p>
              <p>
                Every model on the market can tell you how to book the flight, write the
                reply, fill in the form. Not one of them can reach over and do it on the
                machine in front of you.
              </p>
              <p>
                So we stopped trying to make the thinking better. All of the work turned
                out to be in the hands: seeing the screen you are actually on, pressing the
                button that is actually there, and knowing when to stop and ask. Nobody
                sells that part. It is the only part we build.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── What it does ───────────────────────────────────────────────────── */}
      <section className="aff-sec" id="stack">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">What we built</p>
            <h2>None of that works unless six things are true at once.</h2>
            <p>
              Each one exists somewhere on its own. The work is holding all six together on
              a normal Tuesday, which is the part that had not been done.
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
      <section className="aff-sec" id="products">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">What we made with it</p>
            <h2>One set of parts. Two products built out of them.</h2>
            <p>
              Something that can do everything and is nobody is a command line with extra
              steps, so we do not sell the parts. We finish things with them. One writes
              what you say and never acts. One acts. The parts are why the second took
              weeks instead of a year, and why the third will too.
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
                <div className="aff-prod-top">
                  <span className="aff-prod-tag">{p.tag}</span>
                  <span className="aff-prod-state">{p.state}</span>
                </div>
                <h3>{p.name}</h3>
                <p className="aff-prod-line">{p.line}</p>
                <span className="aff-prod-go">
                  See it<i aria-hidden="true">→</i>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── The ecosystem ──────────────────────────────────────────────────
          This said "two products, one account, and here is the mechanism",
          which is an answer to a question nobody has. The story is the one
          thing everybody has felt: software that makes you introduce yourself
          again every time you open something new.

          So the section is short now. A promise, a picture of who holds what,
          four sentences, and the line that says which one you are talking to. */}
      <section className="aff-sec aff-eco" id="ecosystem">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">How it ties together</p>
            <h2>You only have to say it once.</h2>
            <p>
              Two products, and one memory between them. Whatever you teach one, the other
              already knows, on whatever machine you open next.
            </p>
          </div>
        </div>

        <div className="aff-wrap">
          <div className="aff-grid aff-eco-map aff-reveal">
            <div className="aff-eco-end" style={{ ["--acc" as string]: "var(--a-hera)" }}>
              <span className="aff-eco-tag">Voice</span>
              <h3>HERA</h3>
              <p>It writes down what you say. That is all it will ever do.</p>
            </div>
            {/* The middle cell is the argument. Deeper paper rather than a dark
                fill, so the sheet stays one sheet. */}
            <div className="aff-eco-core">
              <span className="aff-eco-tag">Both</span>
              <h3>Everything it knows about you</h3>
              <p>Learned once, and it is yours. It follows you into whichever one you open.</p>
            </div>
            <div className="aff-eco-end" style={{ ["--acc" as string]: "var(--a-braino)" }}>
              <span className="aff-eco-tag">Companion</span>
              <h3>Braino</h3>
              <p>It goes and does it, and asks first if you would mind.</p>
            </div>
          </div>
        </div>

        <div className="aff-wrap">
          <p className="aff-eco-label aff-reveal">Things you will not say twice</p>
          <div className="aff-grid aff-grid-4 aff-reveal">
            {TRAVELS.map((t) => (
              <article className="aff-eco-cell" key={t.h}>
                <h4>{t.h}</h4>
                <p>{t.p}</p>
              </article>
            ))}
          </div>

          {/* Which one you are talking to, and why there are two of them at
              all. The old version answered this by saying the rule lives in
              the code, which matters to us and to nobody reading. */}
          <div className="aff-eco-rule aff-reveal">
            <p className="aff-eco-rule-line">
              One writes. <span>One does.</span>
            </p>
            <p className="aff-eco-rule-say">
              You always know which you are talking to. HERA will never surprise you. Braino
              can go and finish the thing, and asks before anything you would want asking
              about. And whatever we build next arrives already knowing you.
            </p>
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

      {/* ── Questions ──────────────────────────────────────────────────────
          Two columns, with the heading held on the left while the answers move
          past it. It gives the page a centre gutter it did not have, and stops
          the last screen reading as more of the same rail. */}
      <section className="aff-sec aff-faq-sec" id="faq">
        <div className="aff-wrap">
          <div className="aff-faq-in">
            <div className="aff-faq-head aff-reveal">
              <h2>Questions people actually ask.</h2>
              <p>Including the ones about what we did not build.</p>
            </div>
            {/* details/summary, so it works with no JavaScript and with a
                keyboard. */}
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
                one possible, and the character worth talking to. Bengaluru.
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
