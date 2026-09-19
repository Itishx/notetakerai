import { FormEvent, useEffect, useRef, useState } from "react";
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

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

/* One product on this page for now. HERA has her own page and comes back here
   when there is something to show of her. */
/* One product on this page for now. HERA has her own page and comes back here
   when there is something to show of her. */
const PRODUCTS = [
  {
    key: "braino",
    to: "/braino",
    name: "Braino",
    est: "Est. 2026",
    kind: "Browser and Mac",
    lead:
      "The companion. He lives in your browser and on your Mac, already knows what you are looking at, and does the half of the day you would rather not.",
    /* What he actually does, as things somebody would notice rather than as
       features. Four, because a list of six reads as a spec sheet. */
    does: [
      { h: "He is already there.", p: "Nothing to open. He is in your browser and in your Mac's notch, on whatever you happen to be looking at." },
      { h: "He does the boring half.", p: "The form, the booking, the five tabs, the reply you have been putting off since Tuesday." },
      { h: "He knows your people.", p: "Who you message on a Friday, what you told him last month, which Ravi you meant." },
      { h: "He asks first.", p: "Nothing bought, sent, posted or deleted until you say yes. That is a rule in the code, not a line in a prompt." },
    ],
    foundry:
      "For founders there is a door called the Foundry: the same Braino, running your distribution.",
    state: "Runs on AffectiveOS · Private beta",
    go: "Meet Braino",
    accent: "var(--a-braino)",
  },
];

/* The questions people actually ask, answered without a single word anybody
   would have to look up. Four, including the one about what we did not build. */
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
    q: "Did you build the AI itself?",
    a: "No. The models that think are built by labs with more money than us. We build everything between the model and your machine: the seeing, the hearing, the doing, the remembering, and the part that stops it sending the wrong thing.",
  },
  {
    q: "Who is it for?",
    a: "Right now, founders and students in Bengaluru who own a Mac. Soon, anyone who owns a Mac. Windows is not on the list yet, and we would rather say so than pretend.",
  },
];

/* Scroll-linked drift.
 *
 * Anything marked data-drift slides sideways as it crosses the screen: the
 * further through the viewport it is, the further right it sits. Read on a
 * frame, written as one transform, and the amount is small on purpose, because
 * the effect is meant to be felt rather than watched.
 *
 * Off under 900px, where there is no room to move anything sideways, and off
 * entirely for anyone who has asked for less motion. */
function useDrift() {
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-drift]")];
    if (!els.length) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const apply = () => {
      frame = 0;
      const narrow = window.innerWidth < 900;
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

/* The pan.
 *
 * The four things are wider than any screen, so the section holds still while
 * they travel through it: how far you have scrolled into the tall box is how
 * far the row has moved, which means every one of the four gets the screen to
 * itself on the way past instead of four of them sharing it at stamp size.
 *
 * The travel is measured from the row rather than guessed, so it always ends
 * on the last cell's right edge, whatever the screen. Off under 900px, where
 * the four simply stack. */
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
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "existing" | "error">("idle");

  useEffect(() => {
    document.title = "Affective";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  /* The same door the waitlist page uses, so one list, one inbox. */
  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "loading") return;
    if (!email.trim().includes("@")) { setState("error"); return; }
    setState("loading");
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: email.trim(), categories: ["braino"], context: "affective-site" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error();
      setState(data.error === "already_on_waitlist" ? "existing" : "done");
    } catch {
      setState("error");
    }
  };

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
            <a href="#why">Why</a>
            <a href="#early">Early access</a>
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
        <div className="aff-band" data-drift="38">
          <img
            src="/affective-hero.jpg"
            alt="A cross-stitched view of a lake through stone arches, with a cat sitting on the balustrade watching it."
            width={1774}
            height={887}
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1">
              Stop using your Mac.
              <b>Start talking to it.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">
                We build the technology that makes it possible, and the products that do
                the work.
              </p>
              <div className="aff-hero-cta">
                <a href="#early" className="aff-cta">Join the waitlist</a>
                <Link to="/braino" className="aff-cta aff-cta-ghost">Meet Braino</Link>
              </div>
            </div>
          </div>
        </div>

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
            the point here, and the photograph is what they are about. */}
        <div className="aff-band aff-band-tall aff-reveal aff-rise" data-drift="42">
          <img
            src="/speak.jpg"
            alt=""
            width={1672}
            height={941}
            loading="lazy"
            decoding="async"
          />
        </div>
      </section>

      {/* ── The technology ─────────────────────────────────────────────────── */}
      <section className="aff-sec aff-day" id="technology">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">The technology</p>
            <h2>AffectiveOS. We make the Mac come alive.</h2>
            <p>
              AffectiveOS sits under every product we make. It gives the Mac you already
              own four things it never had.
            </p>
          </div>
        </div>
        {/* One picture per thing, on the page's own grid and running to the
            page edge rather than sitting inside the measure: four cells wide
            enough for the pictures to be pictures. The image fills its cell to
            the hairline; only the words are indented. They arrive one after
            another on the way past, which is the only flourish the page allows
            itself. */}
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
            <p className="aff-sec-kicker">The products</p>
            <h2>What we made with it.</h2>
          </div>
        </div>

        {PRODUCTS.map((p) => (
          <article className={"aff-plate aff-plate-" + p.key} key={p.key} style={{ ["--acc" as string]: p.accent }}>
            {/* His field, not a photograph. There is no picture of Braino
                that is not a screenshot, and a screenshot here would turn the
                page into a product tour two sections early. So the plate is a
                warm ground carrying his name at board size, the way the teaser
                opens on the name and nothing else. */}
            <div className="aff-plate-art aff-reveal">
              <div className="aff-plate-mark">
                {/* Never the company's Didone. Braino is the software and
                    Affective is the company; they do not wear one face. */}
                <h3>{p.name}</h3>
                <p className="aff-plate-line">
                  <span>{p.kind}</span>
                  <span>{p.est}</span>
                </p>
              </div>
              {/* And him, standing beside his own name at the size a person
                  stands. A page that says we build somebody and then shows a
                  tinted rectangle with a word on it is arguing against
                  itself. */}
              <img
                className="aff-plate-him"
                src="/braino-standing.svg"
                alt="Braino, standing"
                width={104}
                height={127}
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="aff-wrap aff-plate-say aff-reveal">
              <div className="aff-plate-lead">
                <p className="aff-plate-intro">
                  <Kinetic line="The first thing we put AffectiveOS into." />
                </p>
                <p className="aff-plate-blurb">{p.lead}</p>
              </div>

              {/* What he does, on the page's own grid: four cells attached to
                  one another, which is the same argument the four things make
                  further up. A paragraph on the left and a table on the right
                  was two columns of nothing in particular. */}
              <div className="aff-grid aff-grid-4 aff-plate-does">
                {p.does.map((d) => (
                  <article key={d.h}>
                    <h4>{d.h}</h4>
                    <p>{d.p}</p>
                  </article>
                ))}
              </div>

              <div className="aff-plate-end">
                <p className="aff-plate-foundry">{p.foundry}</p>
                <p className="aff-plate-go">
                  <Link to={p.to}>{p.go}<i aria-hidden="true">→</i></Link>
                  <span>{p.state}</span>
                </p>
              </div>
            </div>
          </article>
        ))}

      </section>

      {/* ── Why ────────────────────────────────────────────────────────────
          A magazine spread: the claim at full size on the left, the reason it
          is true set as a standfirst on the right, and the name explained
          underneath it, which is the only place on the page where the word
          Affective is allowed to be about us rather than about the Mac. */}
      <section className="aff-statement" id="why">
        <div className="aff-wrap">
          <div className="aff-statement-in">
            <blockquote className="aff-reveal">
              The hard part was never the intelligence.
              {" "}<span>It was the hands.</span>
            </blockquote>
            <div className="aff-statement-say aff-reveal">
              <p className="aff-statement-kicker">Why</p>
              <p>
                Every model can tell you how to book the flight. Not one of them can reach
                over and do it on the machine in front of you. Seeing the screen you are
                actually on, pressing the button that is actually there, knowing when to
                stop and ask. Each piece exists somewhere. Nobody had held them together
                on a normal laptop, on a normal Tuesday. That is the only thing we build.
              </p>
              <p className="aff-statement-name">
                <b>About the name.</b> A mind does three things: thinks, does, feels.
                Everyone in AI is racing on the first two. We are named after the third.
                Affective is the old, precise word for the feeling layer, the part that
                turns a voice into a someone. It is the part everybody skips. It is the
                part you keep.
              </p>
            </div>
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
              <h2>Questions.</h2>
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

      {/* ── The tagline ────────────────────────────────────────────────────
          The last thing said, on its own, before the ask. Under the mission it
          was a second headline two lines below the first, which is where a
          tagline stops being a tagline and starts being a repeat. */}
      <section className="aff-close">
        <div className="aff-wrap">
          <p className="aff-tagline aff-reveal">
            Speak.<b>Watch it happen.</b>
          </p>
        </div>
      </section>

      {/* ── Get in line ────────────────────────────────────────────────────
          A strip, not a section: the ask is one line and one field across the
          page, sitting between the questions and the closing picture. In the
          footer it was six hundred pixels down inside the photograph, which is
          further than anybody scrolls to join anything. */}
      <section className="aff-join" id="early">
        <div className="aff-wrap aff-join-in">
          <div className="aff-join-say">
            <h2>Get in line.</h2>
            <p>
              Mac only, for now. Founders and students first. A few seats a week, and we
              write to you when one is yours.
            </p>
          </div>
          <div className="aff-join-form">
            <form className="aff-early-form" onSubmit={join}>
              <input
                id="aff-early-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@where.you.are"
                aria-label="Your email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state !== "loading") setState("idle"); }}
              />
              <button type="submit" disabled={state === "loading"}>
                {state === "loading" ? "One moment" : "Join the waitlist"}
              </button>
            </form>
            {state !== "idle" && state !== "loading" && (
              <p className="aff-early-said">
                {state === "done" && "You are on the list. We write when a seat is yours."}
                {state === "existing" && "You are already on the list. Nothing more to do."}
                {state === "error" && "That did not go through. Check the address and try once more."}
              </p>
            )}
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
                <a href="#early">Early access</a>
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
