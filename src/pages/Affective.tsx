import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./affective.css";

/* ============================================================================
   /affective — the parent company.

   Braino is the iPhone; this is the company that made it. The point of the page
   is that the layers came first and Braino is the first thing assembled out of
   them, which is what makes a second and a third product obvious rather than a
   pivot.

   Two things carry the design, and both are arguments rather than decoration.

   The grid has no gaps. Cells share a hairline and run edge to edge, because a
   gutter says "separate things arranged" and a shared edge says "one system
   divided", which is the whole claim. It also keeps the page off the
   rounded-card SaaS default.

   And the copy stays concrete. Apple's real trick is not grandeur, it is
   naming something ordinary precisely enough that it sounds inevitable, and
   the failure mode next door is a page of adjectives about nothing. So every
   layer here carries one true specific: a real latency, a real number, the
   actual mechanism. Anything that could be said about any company has been cut.
   ============================================================================ */

/* What is actually left when you take Braino apart. Six, because these are the
   six the codebase really has, not a rounder number that reads better. */
const LAYERS = [
  {
    n: "01",
    name: "Sight",
    body:
      "Reads what is on the screen: the accessibility tree of any Mac app, and the real DOM of any web page. Not a screenshot to be guessed at, the actual elements, with the words printed on them.",
    spec: "220 elements a pass · the page, not a picture of it",
  },
  {
    n: "02",
    name: "Hearing",
    body:
      "Live transcription that holds a room for a full lecture. The hard part was never the model, it was backpressure: when audio arrives faster than it can be read, the answer is to drop it, never to queue it.",
    spec: "40 minutes at 88% · drops, never queues",
  },
  {
    n: "03",
    name: "Voice",
    body:
      "Streamed speech that starts talking before the sentence is finished, with a persona that can be swapped mid-conversation without restarting the session.",
    spec: "First audio under 2s · barge-in aborts cleanly",
  },
  {
    n: "04",
    name: "Action",
    body:
      "The loop. Look at the screen, decide exactly one thing, do it, then judge whether it worked before deciding again. Never a plan executed blind. Anything that spends money, sends, posts or deletes stops and asks first.",
    spec: "One decision a turn · irreversible actions gated in code",
  },
  {
    n: "05",
    name: "Memory",
    body:
      "What it learns about you, kept across every surface, and what it learns from being wrong, kept across everybody. A wall one person hits once is a wall nobody else has to hit.",
    spec: "Per person, and a shared record of mistakes",
  },
  {
    n: "06",
    name: "Character",
    body:
      "The layer we are named after. A personality assembled per turn from separate traits rather than written once as a prompt, so it reads what kind of moment this is and answers that, instead of performing the same warmth at everything.",
    spec: "Modular traits · routed per moment",
  },
];

/* The products. Braino first because it is the one that exists; the rest are
   honest about their state rather than all claiming to be live. */
const PRODUCTS = [
  {
    to: "/braino",
    tag: "Companion",
    name: "Braino",
    line: "Lives in your browser and on your Mac. Reads the page you are on, runs the task you asked for, remembers what you told it last week.",
    state: "In private beta",
    accent: "var(--a-braino)",
    live: true,
  },
  {
    to: "/hera",
    tag: "Dictation",
    name: "HERA",
    line: "Speak anywhere on the Mac and the words land where the cursor is. Built for an hour of talking, not a sentence.",
    state: "Built, shipping next",
    accent: "var(--a-hera)",
    live: true,
  },
  {
    to: "/photos",
    tag: "Memory",
    name: "Braino Photos",
    line: "Your own library, read and understood, so the question can be a sentence instead of a search term.",
    state: "Early",
    accent: "var(--a-photos)",
    live: true,
  },
  {
    to: "/braino?view=foundry",
    tag: "macOS",
    name: "Braino Foundry",
    line: "The whole machine by voice. Files, folders, mail, meetings, and the apps you already have open.",
    state: "In private beta",
    accent: "var(--a-foundry)",
    live: true,
  },
  {
    to: "/browser",
    tag: "Browser",
    name: "Braino Browser",
    line: "A browser that already knows what you are doing, because the companion is not an extension bolted on afterwards.",
    state: "In design",
    accent: "var(--a-browser)",
    live: false,
  },
];

/* The Braino story, told the way a product page tells one: a claim, then the
   mechanism under it. Every row here is a thing the software actually does. */
const BRAINO_ROWS = [
  {
    h: "It can see what you are looking at.",
    p: "Ask about this page, this email, this invoice, and there is no step where you paste anything. It reads the real page, in the tab you are already in, signed in as you.",
    list: ["Any page, any tab", "Any Mac app, through the accessibility layer", "The elements, with the words on them"],
    note: "Reading the live DOM, not a screenshot",
  },
  {
    h: "It does the thing, one step at a time.",
    p: "It looks, decides a single next action, does it, then checks the screen changed the way it expected. When something fails twice it stops and says so, instead of trying harder at the same wall.",
    list: ["One decision per turn", "Verified against the screen after", "Stops itself rather than looping"],
    note: "The loop, with its own brakes",
  },
  {
    h: "Nothing irreversible happens without you.",
    p: "Buying, sending, posting and deleting are marked as irreversible before they are ever offered, in code rather than in an instruction. It cannot talk itself past the gate, however certain it is.",
    list: ["Marked before it is offered", "Enforced outside the model", "Waits for a real yes"],
    note: "The one rule that is not a prompt",
  },
  {
    h: "It knows your week.",
    p: "Your timetable, your deadlines, how much of your course you have actually attended. Not a calendar you have to keep up to date, the one your school already keeps.",
    list: ["Classes, rooms and who teaches them", "Deadlines, including the ones you missed", "How many you can still miss"],
    note: "Connects itself, once, and then stays connected",
  },
  {
    h: "It remembers, and it learns from being wrong.",
    p: "What you tell it stays known. And when it hits a wall, it writes down what it should have done, so the next person who lands there is handed the answer instead of the wall.",
    list: ["Durable facts about you", "Shared record of what did not work", "Reviewed before anything is taught"],
    note: "Two kinds of memory, doing different jobs",
  },
];

function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".aff-reveal");
    if (!els?.length) return;
    // Everything is visible at rest if the observer never fires: a section
    // parked at opacity 0 waiting on JS is how a page ships looking empty.
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
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
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
            <a href="#layers">Technology</a>
            <a href="#products">Products</a>
            <a href="#braino">Braino</a>
            <Link to="/waitlist">Get early access</Link>
          </div>
        </div>
      </nav>

      <header className="aff-hero">
        <div className="aff-wrap">
          <p className="aff-kicker aff-reveal">Affective</p>
          <h1 className="aff-h1 aff-reveal">
            We build the layers a computer needs to be useful to one person.
            {" "}<em>Braino is the first thing we made out of them.</em>
          </h1>
          <p className="aff-sub aff-reveal">
            Sight, hearing, voice, action, memory and character. Six pieces, built once,
            assembled differently for each thing we ship. A companion is one arrangement
            of them. It is not the only one.
          </p>
        </div>
      </header>

      {/* ── The layers ─────────────────────────────────────────────────────── */}
      <section className="aff-sec" id="layers">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>What we own.</h2>
            <p>
              None of these is a model. They are the parts around one: how a computer
              sees a screen, holds a room, acts without breaking anything, and does not
              start every day from nothing.
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
            Affective computing is the name for machines that read and respond to
            how a person actually is. We took the name because the last layer is
            the one everybody skips.
          </footer>
        </div>
      </section>

      {/* ── The products ───────────────────────────────────────────────────── */}
      <section className="aff-sec" id="products">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <h2>What we have built with them.</h2>
            <p>
              One set of layers, arranged five ways. Each is its own product with its own
              reason to exist, and each one makes the next cheaper to build.
            </p>
          </div>
        </div>
        <div className="aff-wrap">
          <div className="aff-grid aff-grid-2 aff-reveal">
            {PRODUCTS.map((p) => (
              <Link
                to={p.to}
                key={p.name}
                className={"aff-prod" + (p.live ? "" : " aff-prod-soon")}
                style={{ ["--acc" as string]: p.accent }}
              >
                <span className="aff-prod-tag">{p.tag}</span>
                <h3>{p.name}</h3>
                <p className="aff-prod-line">{p.line}</p>
                <div className="aff-prod-foot">
                  <span>{p.live ? "See it" : "Read the thinking"}</span>
                  <span>{p.state}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Braino, the long one ───────────────────────────────────────────── */}
      <section className="aff-braino" id="braino">
        <div className="aff-braino-hero">
          <div className="aff-wrap">
            <p className="aff-braino-eyebrow aff-reveal">Product One</p>
            <h2 className="aff-reveal">Braino</h2>
            <p className="aff-reveal">
              A companion that lives where you already work. It sees your screen, does
              what you asked, and remembers the last time you asked it.
            </p>
          </div>
        </div>

        <div className="aff-wrap">
          {BRAINO_ROWS.map((r) => (
            <div className="aff-row aff-reveal" key={r.h}>
              <div className="aff-row-copy">
                <h3>{r.h}</h3>
                <p>{r.p}</p>
                <ul className="aff-row-list">
                  {r.list.map((li) => <li key={li}>{li}</li>)}
                </ul>
              </div>
              <div className="aff-frame">
                <p className="aff-frame-note">{r.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="aff-foot">
        <div className="aff-wrap">
          <div className="aff-foot-top">
            <strong style={{ color: "var(--a-ink)", fontWeight: 600 }}>Affective</strong>
            <Link to="/braino">Braino</Link>
            <Link to="/hera">HERA</Link>
            <Link to="/photos">Photos</Link>
            <Link to="/browser">Browser</Link>
            <Link to="/waitlist">Early access</Link>
          </div>
          <p className="aff-foot-rule">
            Braino is in private beta and not generally available. Everything described
            here is something the software does today; nothing on this page is a roadmap.
          </p>
        </div>
      </footer>
    </div>
  );
}
