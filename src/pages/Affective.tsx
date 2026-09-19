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
    body:
      "Your Mac gets eyes and ears. It sees the screen you are on and hears you for an hour straight. No copying, no pasting, no describing what it cannot see.",
  },
  {
    h: "Voice.",
    body:
      "Have you ever had a back-and-forth conversation with your Mac? Now you can. It answers out loud, and you can cut it off mid-sentence, like a person.",
  },
  {
    h: "Hands.",
    body:
      "You say the task. Your Mac does it. Books the flight, fills the form, sends the reply. It asks before anything is paid for or sent.",
  },
  {
    h: "Memory.",
    body:
      "Your Mac gets a memory. It remembers what you have been doing, who your people are, and what you told it last month. Every day stops starting from zero.",
  },
];

const PRODUCTS = [
  {
    key: "braino",
    to: "/braino",
    name: "Braino",
    line:
      "The companion. He lives in your browser and on your Mac, already knows what you are looking at, and does the half of the day you would rather not. For founders, there is a door called the Foundry: same Braino, running your distribution.",
    state: "Runs on Affective OS · Private beta",
    go: "Meet Braino",
    accent: "var(--a-braino)",
  },
  {
    key: "hera",
    to: "/brainohera",
    name: "HERA",
    line:
      "The ears, sold on their own. Speak anywhere on your Mac and the words land where the cursor is. It writes what you say and never acts. Works with Braino, or without him.",
    state: "Runs on Affective OS · Built, shipping next",
    go: "See HERA",
    accent: "var(--a-hera)",
  },
];

/* The questions people actually ask, answered without a single word anybody
   would have to look up. Four, including the one about what we did not build. */
const FAQ = [
  {
    q: "What is Affective, in one line?",
    a: "A technology company. We build Affective OS, which lets you talk to your Mac and watch things happen, and the products that run on it.",
  },
  {
    q: "Is Affective OS something I install?",
    a: "No. It comes inside the products. You meet Braino or HERA. Affective OS is what makes them work.",
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
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/affective" className="aff-logo">Affective.</Link>
          <div className="aff-nav-links">
            <a href="#technology">Technology</a>
            <a href="#products">Products</a>
            <a href="#why">Why</a>
            <a href="#early">Early access</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────
          The promise, what the company is, and where we are. Nothing else on
          the first screen: an argument this big needs the reader to have
          decided to keep going before it starts arguing. */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <h1 className="aff-h1 aff-reveal">
            Stop using your Mac.
            <b>Start talking to it.</b>
          </h1>
          <p className="aff-hero-one aff-reveal">
            We build the technology that makes it possible, and the products that do the
            work.
          </p>

          {/* A room, not a screenshot. The page is arguing that the computer
              stops being a thing you sit in front of, and a picture of a screen
              would argue the opposite on the first screen. */}
          <figure className="aff-shot aff-reveal">
            <div className="aff-shot-frame">
              <img
                src="/affectivehero.jpeg"
                alt="A warm, lamp-lit room with a low chair, a sofa and a glass table, and no screen anywhere in it."
                width={736}
                height={1104}
                loading="eager"
                decoding="async"
              />
            </div>
            <figcaption className="aff-shot-note">
              The computer is still here. You just stop sitting at it.
            </figcaption>
          </figure>

          <div className="aff-hero-meta aff-reveal">
            <span>Bengaluru</span>
            <span>Private beta</span>
          </div>
        </div>
      </header>

      {/* ── What we do ─────────────────────────────────────────────────────
          The claim across the top and the reason underneath, laid out the
          other way up from the thesis further down so two sections of large
          serif do not read as the same section twice. */}
      <section className="aff-position" id="what">
        <div className="aff-wrap">
          <p className="aff-position-kicker aff-reveal">What we do</p>
          <h2 className="aff-position-line aff-reveal">
            Speak.
            <b>Watch it happen.</b>
          </h2>
          <div className="aff-position-cols aff-reveal">
            <p>
              AI has got very good at telling you what to do. You still have to go and do
              it yourself. Open the tab, find the file, fill in the form, send the reply.
            </p>
            <p>We build the part that goes and does it.</p>
          </div>
        </div>
      </section>

      {/* ── The technology ─────────────────────────────────────────────────── */}
      <section className="aff-sec aff-day" id="technology">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">The technology</p>
            <h2>Affective OS. We make the Mac come alive.</h2>
            <p>
              Affective OS sits under every product we make. It gives the Mac you already
              own four things it never had.
            </p>
          </div>
        </div>
        <div className="aff-wrap">
          <div className="aff-grid aff-grid-2 aff-reveal">
            {THE_FOUR.map((d) => (
              <article className="aff-day-cell" key={d.h}>
                <h3>{d.h}</h3>
                <p className="aff-day-next">{d.body}</p>
              </article>
            ))}
          </div>
          {/* Where all of it lands: the four are the floor, and the character
              is what we put on top of them. */}
          <p className="aff-day-foot aff-reveal">
            Four things. Then we build somebody on top.
          </p>
        </div>
      </section>

      {/* ── The products ───────────────────────────────────────────────────── */}
      <section className="aff-sec" id="products">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">The products</p>
            <h2>What we made with it.</h2>
          </div>
        </div>
        <div className="aff-wrap">
          <div className="aff-panels aff-reveal">
            {PRODUCTS.map((p, i) => (
              <Link
                to={p.to}
                key={p.name}
                className={"aff-panel" + (i % 2 ? " aff-panel-flip" : "")}
                style={{ ["--acc" as string]: p.accent }}
              >
                <div className="aff-panel-say">
                  <h3>{p.name}</h3>
                  <p>{p.line}</p>
                  <span className="aff-panel-foot">
                    <span className="aff-panel-go">{p.go}<i aria-hidden="true">→</i></span>
                    <span className="aff-panel-state">{p.state}</span>
                  </span>
                </div>
                {/* Not a screenshot. A drawing of the one moment that says what
                    the product is, in the product's own colour, on glass. A
                    faked screengrab would be claiming a screen exists exactly
                    as pictured; a drawing is honest about being a drawing and
                    still shows the thing. */}
                <div className={"aff-panel-art aff-art-" + p.key} aria-hidden="true">
                  <div className="aff-glass">
                    {p.key === "braino" ? (
                      <>
                        <div className="aff-glass-top">
                          <span className="aff-glass-dot" />
                          <span className="aff-glass-title">Book the 6am flight to Delhi</span>
                          <span className="aff-glass-time">2:14</span>
                        </div>
                        <div className="aff-glass-bar"><i style={{ width: "68%" }} /></div>
                        <p className="aff-glass-say">
                          Passenger details filled. Stopping before it pays.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="aff-glass-top">
                          <span className="aff-glass-dot" />
                          <span className="aff-glass-title">Listening</span>
                          <span className="aff-glass-time">41:12</span>
                        </div>
                        <div className="aff-wave">
                          {[38, 64, 22, 88, 46, 72, 30, 58, 92, 40, 66, 26, 80, 48, 34, 70, 24, 56].map((h, n) => (
                            <i key={n} style={{ height: `${h}%` }} />
                          ))}
                        </div>
                        <p className="aff-glass-say">
                          and tell them the deck is ready by Friday
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {/* The whole ecosystem argument, in three sentences, because nobody
              wants to know that two products share a user record. They want to
              know they will not have to say it all again. */}
          <p className="aff-day-foot aff-reveal">
            One memory between them. Whatever you teach one, the other already knows.
            Whatever we build next arrives already knowing you.
          </p>
        </div>
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

      {/* ── Early access ───────────────────────────────────────────────────
          The same list the waitlist page writes to, asked for here so the
          scroll ends on the thing to do rather than on a link to another page
          that asks again. */}
      <section className="aff-sec aff-early" id="early">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">Early access</p>
            <h2>Get in line.</h2>
            <p>
              Mac only, for now. Founders and students first. A few seats a week, and we
              write to you when one is yours.
            </p>
          </div>
          <form className="aff-early-form aff-reveal" onSubmit={join}>
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
            <p className="aff-early-said aff-reveal">
              {state === "done" && "You are on the list. We write when a seat is yours."}
              {state === "existing" && "You are already on the list. Nothing more to do."}
              {state === "error" && "That did not go through. Check the address and try once more."}
            </p>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="aff-foot">
        <div className="aff-wrap">
          <div className="aff-foot-grid">
            <div className="aff-foot-brand">
              <strong className="aff-mark">Affective.</strong>
              {/* Affective is not a computer. It is the company building what
                  the one you already own was missing. */}
              <p>
                We do not make a computer. We build the technology that lets you talk to
                the one you have, and the products that do the work. Bengaluru.
              </p>
            </div>
            <nav className="aff-foot-col">
              <h4>Products</h4>
              <Link to="/braino">Braino</Link>
              <Link to="/brainohera">HERA</Link>
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
      </footer>
    </div>
  );
}
