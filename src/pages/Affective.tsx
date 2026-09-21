import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./affective.css";

/* ============================================================================
   /affective — the company.

   Seven sections, one scroll: what we do, the technology, the products, why,
   questions, early access, footer. Braino gets three sentences and a link;
   his own site does the rest. A company page that tells the whole product
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

/* AffectiveOS is two different kinds of thing wearing one name, and the page
   used to show them as four equal features, which is the one thing they are
   not. Three of these are capabilities: what a machine can do in a moment,
   stateless, finished and forgotten. The fourth is continuity: what everything
   the first three do lands on, and stays in.

   Told as two halves, the section makes the argument by its own shape. */
const CAN_DO = [
  {
    h: "Senses.",
    art: "/os-senses.jpg",
    body:
      "Your Mac gets eyes and ears. It sees the screen you are on and hears you for an hour straight. No copying, no pasting, no describing what it cannot see.",
  },
  {
    h: "Voice.",
    art: "/os-voice.jpg",
    body:
      "Have you ever had a back-and-forth conversation with your Mac? Now you can. It answers out loud, and you can cut it off mid-sentence, like a person.",
  },
  {
    h: "Hands.",
    art: "/os-hands.jpg",
    body:
      "You say the task. Your Mac does it. Books the flight, fills the form, sends the reply. It asks before anything is paid for or sent.",
  },
];

const KEEPS = {
  h: "Memory.",
  art: "/os-memory.jpg",
  body:
    "Everything the first three do lands here and stays. Not what you typed into a window: what actually happened, on your machine, all day.",
  body2:
    "It is the half nobody can rent. A model can be swapped out next year and this is untouched, which is why the Mac you use in June knows more than the one you used in March.",
};

/* Braino is the product. Foundry is a model of it.
 *
 * Tabs made them siblings, which is the confusion: Affective is Apple, Braino
 * is the iPhone, and Foundry is the Pro. So the box is Braino, whole, and the
 * models are a line at the bottom of it, the way a product page ends on which
 * one is right for you. His own site does the full lineup. */
const BRAINO = {
  to: "/braino",
  name: "Braino",
  est: "Est. 2026",
  kind: "Browser and Mac",
  line: "Your own Jarvis.",
  lead:
    "The character, and the whole product. He is already open on the page you are on, he carries what you told him last month, and he goes and does the thing rather than telling you how to do it.",
  does: [
    {
      art: "/os-senses.jpg",
      h: "He is already there.",
      p: "Nothing to open, nothing to paste. He is in your browser and in your Mac's notch, on whatever you are looking at, so asking him costs the same as thinking it.",
    },
    {
      art: "/os-voice.jpg",
      h: "He sits through the meeting.",
      p: "An hour of a lecture or a call, written down while you listen. You close the laptop and the notes are already there, with what was decided and who said they would do what.",
    },
    {
      art: "/os-hands.jpg",
      h: "He knows your people.",
      p: "Who you message on a Friday, which Ravi you meant, what you told him last month. You stop introducing yourself to your own software every morning.",
    },
    {
      art: "/os-memory.jpg",
      h: "He asks before he acts.",
      p: "Nothing bought, sent, posted or deleted until you say yes. That is a rule in the code rather than a line in a prompt, which is the only version of the promise worth having.",
    },
  ],
  state: "Runs on AffectiveOS \u00b7 Private beta",
};

/* The three he comes in. Same Braino; each model is pointed at a different
   life, the way a phone has models. */
const MODELS = [
  {
    key: "braino",
    name: "Braino",
    who: "For everyone",
    line: "Browser and Mac. The whole of him, on whatever you are looking at.",
    to: "/braino-final",
    go: "Meet Braino",
    accent: "var(--a-braino)",
  },
  {
    key: "foundry",
    name: "Braino Foundry",
    who: "For founders",
    line: "You can build it, you cannot get seen. He writes your week, gets you named when buyers ask an AI, and writes to the right people.",
    to: "/foundry",
    go: "See the Foundry",
    accent: "var(--a-foundry)",
  },
  {
    key: "mesa",
    name: "Braino for Mesa",
    who: "For institutions",
    line: "The same Braino with a school's timetable, attendance and deadlines inside him. Live with Mesa School of Business.",
    to: "/contact",
    go: "Bring him to yours",
    accent: "#2f6fed",
  },
];


const FAQ = [
  {
    q: "What is Affective, in one line?",
    a: "A technology company. We build AffectiveOS, which lets you talk to your Mac and watch things happen, and the products that run on it.",
  },
  {
    q: "Is AffectiveOS something I install?",
    a: "No. It comes inside the products. You meet Braino or HERA. AffectiveOS is what makes them work.",
  },
  {
    q: "Is this just another chatbot?",
    a: "The opposite. A chatbot answers and leaves you to it. Ours goes and does the thing, on the screen you are already looking at, and then checks that it worked.",
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
    a: "No. The models that think are built by labs with more money than us. We build everything between the model and your machine: the seeing, the hearing, the doing, the remembering, and the part that stops it sending the wrong thing.",
  },
  {
    q: "What can I actually use today?",
    a: "Braino is in private beta on Chrome and macOS. HERA is built and ships next. Everything described on this page is something the software does now, not something planned.",
  },
  {
    q: "Who is it for?",
    a: "Right now, founders and students in Bengaluru who own a Mac. Soon, anyone who owns a Mac. Windows is not on the list yet, and we would rather say so than pretend.",
  },
];

/* Words that land one at a time and stay, which is how the teaser builds a
   line: the phrase accumulates rather than fading in as a block. The stamp is
   180ms because a word needs that long to resolve; anything quicker reads as
   choppy however fast the section is meant to feel. */
function Kinetic({ line, gap = 150 }: { line: string; gap?: number }) {
  /* The words are separate boxes with a gap between them, so the text itself
     has no spaces in it. A screen reader is given the sentence whole, and the
     pieces are hidden from it. */
  return (
    <span className="aff-kin" aria-label={line}>
      {line.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} aria-hidden="true" style={{ animationDelay: `${i * gap}ms` }}>{word}</span>
      ))}
    </span>
  );
}

/* One word that keeps changing its mind.
 *
 * "Stop using your Mac" is where the company starts and not where it ends, so
 * the word swaps: Mac, computer, Mac. The line has to hold still while it
 * happens, and a word box that snaps from one width to the other drags the
 * full stop across the page, so each word is measured once and the box is
 * given that width to travel to. */
function SwapWord({ words, every = 2600 }: { words: string[]; every?: number }) {
  const [at, setAt] = useState(0);
  const [width, setWidth] = useState<number | null>(null);
  const hold = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (words.length < 2) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return;
    const timer = window.setInterval(() => setAt((v) => (v + 1) % words.length), every);
    return () => window.clearInterval(timer);
  }, [words.length, every]);

  useEffect(() => {
    const live = hold.current?.querySelector<HTMLElement>(`[data-word="${words[at]}"]`);
    if (live) setWidth(live.getBoundingClientRect().width);
  }, [at, words]);

  return (
    <span className="aff-swap" ref={hold} style={width ? { width: `${Math.ceil(width)}px` } : undefined}>
      {/* Every word is drawn, so every word can be measured; only one is lit. */}
      {words.map((word, i) => (
        <span
          key={word}
          data-word={word}
          className={"aff-swap-word" + (i === at ? " on" : "")}
          aria-hidden={i !== at}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

function FourArt({ art, label }: { art: string; label: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className="aff-four-art aff-rise">
      {missing
        ? <span className="aff-four-wait">{label}</span>
        : (
          <img
            src={art}
            alt=""
            width={341}
            height={415}
            loading="lazy"
            decoding="async"
            onError={() => setMissing(true)}
          />
        )}
    </div>
  );
}

/* Scroll-linked drift.
 *
 * Anything marked data-drift slides sideways as it crosses the screen, and the
 * hero picture marked data-grow opens from the measure to the page over the
 * first screen of scrolling. Read on a frame, written as one number each, so
 * the shape of both lives in the stylesheet.
 *
 * Off under 900px, where there is no room to move anything sideways, and off
 * for anyone who has asked for less motion. */
function useDrift() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-drift]")];
    const grows = [...document.querySelectorAll<HTMLElement>("[data-grow]")];
    if (!els.length && !grows.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const narrow = window.innerWidth < 900;
      for (const el of grows) {
        const p = Math.min(1, Math.max(0, window.scrollY / Math.max(220, window.innerHeight * 0.55)));
        el.style.setProperty("--grow", narrow || still.matches ? "1" : p.toFixed(3));
      }
      for (const el of els) {
        if (narrow || still.matches) { el.style.setProperty("--drift", "0px"); continue; }
        const r = el.getBoundingClientRect();
        // 0 as it comes up from the bottom, 1 as it leaves the top.
        const p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
        const amount = Number(el.dataset.drift) || 0;
        el.style.setProperty("--drift", `${((Math.min(1, Math.max(0, p)) - 0.5) * amount).toFixed(1)}px`);
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(apply); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}

function usePan() {
  useEffect(() => {
    const boxes = [...document.querySelectorAll<HTMLElement>("[data-pan]")];
    if (!boxes.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const off = window.innerWidth < 900 || still.matches;
      for (const box of boxes) {
        const row = box.querySelector<HTMLElement>("[data-pan-row]");
        if (!row) continue;
        if (off) { row.style.setProperty("--pan", "0px"); continue; }
        const r = box.getBoundingClientRect();
        const runway = Math.max(1, r.height - window.innerHeight);
        const p = Math.min(1, Math.max(0, -r.top / runway));
        const travel = Math.max(0, row.scrollWidth - window.innerWidth);
        row.style.setProperty("--pan", `${(-p * travel).toFixed(1)}px`);
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(apply); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    apply();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}

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
  useDrift();
  usePan();
  /* The wordmark keeps its A and loses the rest once you are past the first
     screen, so the bar gets quieter as the page gets louder. Read on a frame
     rather than on every scroll event, and hysteresis on the two edges so a
     nudge at the threshold cannot flicker it open and shut. */
  const [tight, setTight] = useState(false);
  /* Plain words or the ones people who name things use. Both are true. */
  const [plain, setPlain] = useState(true);
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      setTight((was) => (window.scrollY > (was ? 40 : 96)));
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(read); };
    window.addEventListener("scroll", onScroll, { passive: true });
    read();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    document.title = "Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff" ref={root}>
      <nav className={"aff-nav" + (tight ? " is-tight" : "")}>
        <div className="aff-nav-in">
          <Link to="/affective" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <a href="#technology">Technology</a>
            <a href="#products">Products</a>
            <Link to="/waitlist">Early access</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────
          The picture first, edge to edge and flush under the nav, then the
          claim under it with what the company is beside it. A room rather
          than a screenshot: the page is arguing that the computer stops being
          a thing you sit in front of, and a picture of a screen would argue
          the opposite in the first frame. */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1">
              <span className="aff-h1-line">
                Stop using your <SwapWord words={["Mac", "computer"]} />.
              </span>
              <b>Start talking to it.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">
                We build the technology that makes it possible, and the products that do
                the work.
              </p>
              <div className="aff-hero-cta">
                <Link to="/waitlist" className="aff-cta">Join the waitlist</Link>
                <Link to="/braino" className="aff-cta aff-cta-ghost">Meet Braino</Link>
              </div>
            </div>
          </div>
        </div>

        {/* The picture arrives as an object in the measure and opens to the
            whole page as you scroll into it: the room stops being something
            shown to you and becomes somewhere you are. It grows rather than
            slides, so nothing is ever cut off at an edge. */}
        <figure className="aff-hero-shot" data-grow>
          <img
            src="/affective-hero.jpg"
            alt="A cross-stitched view of a lake through stone arches, with a cat sitting on the balustrade watching it."
            width={1774}
            height={887}
            loading="eager"
            decoding="async"
          />
        </figure>

        {/* Where a landing page puts its customers. We have none to put there,
            and the honest version of that row is the one thing everybody in
            this business is coy about: whose thinking we buy. Saying it here,
            under the first claim, is the same answer the questions give and it
            costs nothing to be first to say it. Names rather than logos, set
            in one ink, because a row of other people's marks reads as their
            page rather than ours. */}
        <div className="aff-strip">
          <div className="aff-wrap aff-strip-in">
            <p className="aff-strip-label">The thinking is bought</p>
            <ul className="aff-strip-names">
              <li>Anthropic</li>
              <li>OpenAI</li>
              <li>Perplexity</li>
            </ul>
            <p className="aff-strip-note">The hands are ours</p>
          </div>
        </div>
      </header>

      {/* ── What we do ─────────────────────────────────────────────────────
          Two different things were wearing one hat here. What the company does
          is build the technology that lets you talk to your Mac; "Speak. Watch
          it happen." is the tagline, and a tagline set under a label reading
          What we do reads as a job description nobody could act on. So the
          mission is the headline, and the tagline gets its own line at the end
          of the section, where a tagline belongs: after the argument, before
          the picture. */}
      <section className="aff-position" id="what">
        <div className="aff-wrap">
          {/* The same thing said twice, because both versions are true and
              people arrive wanting different ones. The plain one is the claim;
              the other is the same claim said a little more technically.
              Neither is allowed a word somebody would have to look up: a
              sentence that needs a dictionary is not a harder idea, it is a
              worse sentence. Having a switch at all is the honest part.

              This section is deliberately about REMEMBERING and the hero is
              about DOING. They were both about doing, which is why they read
              as the same paragraph twice.

              And it does NOT say that other assistants forget. They do not:
              this repo is read every day by one that remembers it across
              sessions and across a model change. The true difference is
              narrower and better. Their memory is scoped to their own window
              and holds what was typed into it; a memory that lives on the
              machine holds what happened. Write the false version and the
              first technical reader who sees it stops believing the rest.

              Nobody has met Braino by this point either: he is two sections
              away. A section that names him here is written by somebody who
              already knows the page. */}
          <div className="aff-position-top">
            <p className="aff-position-kicker">What we do</p>
            <div className="aff-say" role="tablist" aria-label="How to say it">
              {[["Simple", true], ["Jargon", false]].map(([label, isPlain]) => (
                <button
                  key={String(label)}
                  type="button"
                  role="tab"
                  aria-selected={plain === isPlain}
                  className={plain === isPlain ? "on" : ""}
                  onClick={() => setPlain(Boolean(isPlain))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="aff-position-in">
            <div className="aff-position-claim aff-reveal">
              <h2 className="aff-position-line">
                {plain
                  ? "We build the technology that makes it possible to speak to your Mac."
                  : "We build the continuity layer: the part that lets a system learn you, and keep learning, the longer you use it."}
              </h2>
            </div>
            <div className="aff-position-cols aff-reveal">
              {plain ? (
                <>
                  <p>
                    Current AI remembers what you tell it. None of it remembers what you
                    did. It knows the conversation inside its own window: not the call at
                    half eleven, not the page you were reading, not the thing you fixed in
                    another app.
                  </p>
                  <p className="aff-position-punch">
                    This sits on the machine instead, so what it keeps is what actually
                    happened. Say it once, and the Mac you use in June knows more than the
                    one you used in March.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Current AI has memory, and all of it is scoped to its own window.
                    Yours is spread across four tools, none of which can see the other
                    three, and not one of which saw your afternoon.
                  </p>
                  <p className="aff-position-punch">
                    The continuity layer sits on the machine instead, underneath whichever
                    model is current, and keeps what happened rather than what was typed.
                    Which is why a system built on it is worth more in month six than it
                    was in month one, and why that part cannot be bought in.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* The picture closes the claim rather than opening it: the words are
            the point here, and the photograph is what they are about. Framed
            and in the measure, because the page has one idea of what an object
            is and a photograph is not exempt from it. */}
        <div className="aff-wrap">
          <figure className="aff-shot-box aff-reveal aff-rise">
            <img
              src="/speak.jpg"
              alt=""
              width={1672}
              height={941}
              loading="lazy"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      {/* ── The technology ─────────────────────────────────────────────────
          Two halves rather than four features. What it can do, and what it
          keeps. The first three are stateless and finish; the fourth is what
          they land on, which is why it is the whole width of the page rather
          than a fourth cell in a row. */}
      <section className="aff-sec aff-day" id="technology">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">The technology in question</p>
            <h2>AffectiveOS. We make the Mac come alive.</h2>
            <p>
              AffectiveOS sits under every product we make, and it is two halves. Three
              things the Mac can suddenly do, and one thing it suddenly keeps.
            </p>
          </div>
        </div>

        <div className="aff-wrap">
          <p className="aff-half-label aff-reveal">What it can do</p>
          <div className="aff-grid aff-grid-3 aff-four">
            {CAN_DO.map((d, i) => (
              <article className="aff-four-item aff-reveal" key={d.h} style={{ transitionDelay: `${i * 110}ms` }}>
                <FourArt art={d.art} label={d.h.replace(".", "")} />
                <div className="aff-four-say">
                  <h3>{d.h}</h3>
                  <p>{d.body}</p>
                </div>
              </article>
            ))}
          </div>

          {/* The second half, and it is not a fourth cell: it is what the three
              above it drop things onto. Wide, because that is the shape of a
              floor. */}
          <p className="aff-half-label aff-reveal">And what it keeps</p>
          <div className="aff-keeps aff-reveal">
            <FourArt art={KEEPS.art} label={KEEPS.h.replace(".", "")} />
            <div className="aff-keeps-say">
              {/* The term belongs here and nowhere else on the page: this is
                  the one place a reader can see what it is made of. Memory is
                  what it holds; continuity is what having it everywhere
                  gives you. */}
              <p className="aff-keeps-tag">The continuity layer</p>
              <h3>{KEEPS.h}</h3>
              <p>{KEEPS.body}</p>
              <p className="aff-keeps-punch">{KEEPS.body2}</p>
            </div>
          </div>

          {/* Where all of it lands: the four are the floor, and the character
              is what we put on top of them. */}
          <p className="aff-day-foot aff-reveal">
            Three things it can do, one thing it keeps. Then we build somebody on top.
          </p>
        </div>
      </section>

      {/* ── The products ───────────────────────────────────────────────────
          One plate each, the way a brand board lays a product out: the name
          on the picture, and the short version under it in two columns with
          the facts in a table. Braino's plate is a photograph; HERA has no
          picture yet and gets her own colour rather than a borrowed one,
          which is honest and still a plate. */}
      <section className="aff-sec" id="products">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">The product</p>
            <h2><Kinetic line="The first thing we put AffectiveOS into." /></h2>
          </div>
        </div>

        {/* One box with dividers. It is Braino, whole: his name, what he is,
            what he does, and at the bottom the two he comes in, because a
            product page ends on which one is right for you rather than making
            you choose before you know what it is. */}
        <div className="aff-wrap">
          <article className="aff-plate">
            <div className="aff-plate-art">
              <div className="aff-plate-mark">
                {/* Him and his name as one lockup. Across the box from each
                    other they were two things that happened to share a ground;
                    beside each other they are a signature. */}
                <img
                  className="aff-plate-him"
                  src="/braino-standing.svg"
                  alt="Braino, standing"
                  width={104}
                  height={127}
                  loading="lazy"
                  decoding="async"
                />
                <div className="aff-plate-name">
                  {/* Never the company's Didone. Braino is the software and
                      Affective is the company; they do not wear one face. */}
                  <h3>{BRAINO.name}</h3>
                  <p className="aff-plate-line">
                    <span>{BRAINO.kind}</span>
                    <span>{BRAINO.est}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="aff-plate-lead">
              <p className="aff-plate-intro">{BRAINO.line}</p>
              <p className="aff-plate-blurb">{BRAINO.lead}</p>
            </div>

            {/* His four, built the way AffectiveOS's four are built. */}
            <div className="aff-grid aff-grid-4 aff-plate-does">
              {BRAINO.does.map((d) => (
                <article key={d.h}>
                  <div className="aff-does-art">
                    <img src={d.art} alt="" width={341} height={415} loading="lazy" decoding="async" />
                  </div>
                  <div className="aff-does-say">
                    <h4>{d.h}</h4>
                    <p>{d.p}</p>
                  </div>
                </article>
              ))}
            </div>

            {/* Which one is right for you. Three models of one product, not
                three products: the same Braino, pointed at a different life
                each time. */}
            <div className="aff-models">
              <p className="aff-models-label">One Braino · Three models</p>
              <div className="aff-models-row">
                {MODELS.map((m) => (
                  <Link to={m.to} className="aff-model" key={m.key} style={{ ["--acc" as string]: m.accent }}>
                    <span className="aff-model-who"><i aria-hidden="true" />{m.who}</span>
                    <h4>{m.name}</h4>
                    <p>{m.line}</p>
                    <span className="aff-model-go">{m.go}<i aria-hidden="true">→</i></span>
                  </Link>
                ))}
              </div>
              <p className="aff-plate-foundry">{BRAINO.state}</p>
            </div>
          </article>
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
              <h2>Questions you may have.</h2>
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

      {/* ── Footer ─────────────────────────────────────────────────────────
          The closing picture, with everything written over it. A scrim from
          the bottom rather than a wash over the whole frame, so the image
          keeps its light and the words still hold at any brightness. */}
      <footer className="aff-foot">
        <img
          className="aff-foot-art"
          src="/affective-footer.jpg"
          alt=""
          width={1983}
          height={793}
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
        <div className="aff-foot-in">
          <div className="aff-wrap">
            <div className="aff-foot-grid">
              <div className="aff-foot-brand">
                {/* Affective is not a computer. It is the company building
                    what the one you already own was missing. */}
                <strong className="aff-mark">
                  <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
                </strong>
                {/* The four compressed into two, because a list of four reads
                    as features and the pair reads as a thing: understanding is
                    the eyes, the ears and the memory; doing is the voice and
                    the hands. "Remembers both" is the clause that earns the
                    word continuity, and without it this is a description of an
                    assistant. */}
                <p>
                  We build AffectiveOS, a continuity layer for the Mac you already own:
                  the part that understands you, does things for you, and remembers both.
                </p>
                <p className="aff-foot-where">Bengaluru.</p>
              </div>
              {/* Products holds one product, and the product divides into the
                  two he comes in. Drawn rather than listed, because a list
                  makes three separate things out of one. */}
              <nav className="aff-foot-col aff-tree" aria-label="Products">
                <h4>Products</h4>
                <ul>
                  <li><Link to="/braino">Braino</Link></li>
                  <li><Link to="/foundry">Braino Foundry</Link></li>
                </ul>
              </nav>
              {/* Its own column. A school buying the same Braino with its own
                  timetable, attendance and deadlines inside him is a deal
                  rather than a download, so it goes to a person, not a form. */}
              <nav className="aff-foot-col aff-tree aff-tree-on" aria-label="For institutions">
                <h4>For institutions</h4>
                <ul>
                  <li><Link to="/contact">Braino for Mesa School of Business</Link></li>
                </ul>
              </nav>
              <nav className="aff-foot-col">
                <h4>Company</h4>
                <Link to="/waitlist">Early access</Link>
                <Link to="/contact">Contact</Link>
              </nav>
            </div>
            <p className="aff-foot-rule">
              Everything on this page is something the software does today. Nothing here is
              a roadmap.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
