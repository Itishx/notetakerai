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

/* What the Mac gets that it never had. Four things a person would notice,
   rather than the layers underneath that make them true. No "Today" line on
   these cells, because each one carries its own contrast ("no copying, no
   pasting") rather than sitting beside a struck-through version of itself. */
const THE_FOUR = [
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
  {
    h: "Memory.",
    art: "/os-memory.jpg",
    body:
      "Your Mac gets a memory. It remembers what you have been doing, who your people are, and what you told it last month. Every day stops starting from zero.",
  },
];

/* A picture that has not arrived yet draws its own quiet block instead of a
   broken image, and the moment the file exists it appears. Drop the four into
   public/ under the names above and refresh: there is nothing to edit here. */
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

/* One product, two doors. Braino is the character and the whole of it; Foundry
   is the same Braino aimed at the founder building a company alone. They are
   not two binaries and the page does not pretend they are: the box shows a
   preview of each, and his own site tells either story properly. */
const PRODUCTS = [
  {
    key: "braino",
    tab: "Braino",
    to: "/braino",
    name: "Braino",
    est: "Est. 2026",
    kind: "Browser and Mac",
    line: "Your own Jarvis.",
    lead:
      "The character, and the whole product. He is already open on the page you are on, he carries what you told him last month, and he goes and does the thing rather than telling you how to do it.",
    does: [
      {
        key: "there",
        art: "/os-senses.jpg",
        h: "He is already there.",
        p: "Nothing to open, nothing to paste. He is in your browser and in your Mac's notch, on whatever you are looking at, so asking him costs the same as thinking it.",
      },
      {
        key: "meeting",
        art: "/os-voice.jpg",
        h: "He sits through the meeting.",
        p: "An hour of a lecture or a call, written down while you listen. You close the laptop and the notes are already there, with what was decided and who said they would do what.",
      },
      {
        key: "people",
        art: "/os-hands.jpg",
        h: "He knows your people.",
        p: "Who you message on a Friday, which Ravi you meant, what you told him last month. You stop introducing yourself to your own software every morning.",
      },
      {
        key: "asks",
        art: "/os-memory.jpg",
        h: "He asks before he acts.",
        p: "Nothing bought, sent, posted or deleted until you say yes. That is a rule in the code rather than a line in a prompt, which is the only version of the promise worth having.",
      },
    ],
    foot: "The broad product: browser, Mac, voice, files, meetings and the rest of the day.",
    state: "Runs on AffectiveOS · Private beta",
    go: "Meet Braino",
    accent: "var(--a-braino)",
  },
  {
    key: "foundry",
    tab: "Braino Foundry",
    to: "/foundry",
    name: "Braino Foundry",
    est: "For founders",
    kind: "The same Braino",
    line: "An AI co-founder.",
    lead:
      "You build the thing. He does the half that gets it seen: the posting, the outreach, the people who said maybe. Same Braino, pointed at your company.",
    does: [
      {
        key: "company",
        art: "/os-senses.jpg",
        h: "He knows your company.",
        p: "What you are building, who you have spoken to, what you decided last month. You stop explaining your own company every morning.",
      },
      {
        key: "posting",
        art: "/os-voice.jpg",
        h: "He does the posting.",
        p: "The updates, the replies, the thread you meant to write on Sunday. The part that never gets done because you are busy building.",
      },
      {
        key: "follow",
        art: "/os-hands.jpg",
        h: "He chases the follow-ups.",
        p: "The people who said maybe, the mail nobody answered, the call you were going to make on Tuesday. He keeps the list and works it.",
      },
      {
        key: "truth",
        art: "/os-memory.jpg",
        h: "He tells you the truth.",
        p: "A co-founder who only ever agrees is a mirror. He remembers what you decided in March and says so when today contradicts it.",
      },
    ],
    foot: "Handing work to coding agents and checking it comes to Foundry first. Not shipped yet.",
    state: "Runs on AffectiveOS · For founders",
    go: "See the Foundry",
    accent: "var(--a-foundry)",
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
  /* Which of the two doors is open. Nothing to store anywhere: it is a tab. */
  const [product, setProduct] = useState(0);
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
        <div className="aff-wrap aff-position-in">
          <div className="aff-position-claim aff-reveal">
            <p className="aff-position-kicker">What we do</p>
            <h2 className="aff-position-line">
              We build the technology that makes it possible to talk to your Mac.
            </h2>
          </div>
          <div className="aff-position-cols aff-reveal">
            <p>
              AI has got very good at telling you what to do. You still have to go and do
              it yourself. Open the tab, find the file, fill in the form, send the reply.
            </p>
            <p className="aff-position-punch">We build the part that goes and does it.</p>
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

      {/* ── The technology ─────────────────────────────────────────────────── */}
      <section className="aff-sec aff-day" id="technology">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">The technology in question</p>
            <h2>AffectiveOS. We make the Mac come alive.</h2>
            <p>
              AffectiveOS sits under every product we make. It gives the Mac you already
              own four things it never had.
            </p>
          </div>
        </div>
        {/* One picture per thing, in the same framed box his section uses. It
            ran to the page edge while the product below it sat in a box, and
            two different ideas of what a grid is on one page is the kind of
            inconsistency you feel before you can name it. The image fills its
            cell to the hairline; only the words are indented. They arrive one
            after another on the way past, which is the only flourish the page
            allows itself. */}
        <div className="aff-wrap">
          <div className="aff-grid aff-grid-4 aff-four">
          {THE_FOUR.map((d, i) => (
            <article className="aff-four-item aff-reveal" key={d.h} style={{ transitionDelay: `${i * 110}ms` }}>
              <FourArt art={d.art} label={d.h.replace(".", "")} />
                <div className="aff-four-say">
                  <h3>{d.h}</h3>
                  <p>{d.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="aff-wrap">
          {/* Where all of it lands: the four are the floor, and the character
              is what we put on top of them. */}
          <p className="aff-day-foot aff-reveal">
            Four things. Then we build somebody on top.
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

        {/* One box with dividers, rather than a section made of bands. He is
            one product with two doors, so the box has two tabs and everything
            under them changes: the name, what he is, what he does and where
            the door goes. */}
        <div className="aff-wrap">
          <article className="aff-plate" style={{ ["--acc" as string]: PRODUCTS[product].accent }}>
            <div className="aff-plate-tabs">
              <div className="aff-plate-tablist" role="tablist" aria-label="Which Braino">
                {PRODUCTS.map((p, i) => (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={i === product}
                    className={i === product ? "on" : ""}
                    style={{ ["--dot" as string]: p.accent }}
                    onClick={() => setProduct(i)}
                  >
                    <i aria-hidden="true" />
                    {p.tab}
                  </button>
                ))}
              </div>
              {/* Said once, here, so nobody has to work it out from the tabs:
                  it is one thing with two doors. */}
              <p className="aff-plate-one">One product, two doors.</p>
            </div>

            {PRODUCTS.slice(product, product + 1).map((p) => (
              <div className="aff-plate-view" key={p.key}>
                <div className="aff-plate-art">
                  <div className="aff-plate-mark">
                    {/* Him and his name as one lockup. Across the box from each
                        other they were two things that happened to share a
                        ground; beside each other they are a signature. */}
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
                      <h3>{p.name}</h3>
                      <p className="aff-plate-line">
                        <span>{p.kind}</span>
                        <span>{p.est}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="aff-plate-lead">
                  <p className="aff-plate-intro">{p.line}</p>
                  <p className="aff-plate-blurb">{p.lead}</p>
                </div>

                {/* His four, built the way AffectiveOS's four are built. */}
                <div className="aff-grid aff-grid-4 aff-plate-does">
                  {p.does.map((d) => (
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

                <div className="aff-plate-end">
                  <p className="aff-plate-foundry">{p.foot}</p>
                  <p className="aff-plate-go">
                    <Link to={p.to}>{p.go}<i aria-hidden="true">→</i></Link>
                    <span>{p.state}</span>
                  </p>
                </div>
              </div>
            ))}
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
                <p>
                  We do not make a computer. We build the technology that lets you talk to
                  the one you have, and the products that do the work. Bengaluru.
                </p>
              </div>
              <nav className="aff-foot-col">
                <h4>Products</h4>
                <Link to="/braino">Braino</Link>
                {/* The same Braino, with a school's own timetable, attendance
                    and deadlines inside him. It has no page of its own yet, so
                    it points at his. */}
                <Link to="/braino">Braino For Mesa School Of Business</Link>
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
