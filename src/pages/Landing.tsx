import { useState } from "react";
import { Link } from "react-router-dom";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import "./landing.css";

/* ============================================================================
   / — the landing page.

   The page this replaces was a stack of questions you had to open one at a time,
   plus a tab row, plus thirty links out to finished pages for an unfinished
   product. Every one of those decisions asked the visitor to do the work of
   figuring out what this is. A landing page has to ASSERT.

   So: one page, one button, eight sections, no accordion and no tabs. Free
   companion first because that is how anyone meets him, then the turn into
   Distra, because founders with a distribution problem are who this is for.

   Braino Code is deliberately absent. If Distra is the wedge, a second engine
   on the same page dilutes it. It lives in the deck.
   ============================================================================ */

const FEATURES = [
  {
    n: "01",
    name: "Chat with whatever is in front of you",
    line: "Any page, any PDF, any video. He is already on it, so there is nothing to paste and nothing to upload.",
  },
  {
    n: "02",
    name: "Notes from anything you listen to",
    line: "A lecture, a podcast, a two hour video. He listens and hands back something you would actually read.",
  },
  {
    n: "03",
    name: "He sits in your meetings",
    line: "No bot in the participant list, invisible to your screen share. Notes at the end, and what you agreed to.",
  },
  {
    n: "04",
    name: "Say it, and he does it",
    line: "Books it, buys it, finds it, fills it in. In your browser, signed into your accounts, not a sandbox somewhere else.",
  },
];

/* The same four features, seen by three different people. Not personas: the
   actual job each one has that day. */
const PEOPLE = [
  {
    id: "founder",
    label: "A founder",
    line: "Seven jobs, no one to hand any of them to.",
    rows: [
      ["Chat with the page", "A competitor's pricing page, a contract, a docs page you do not have an hour for. Ask, get the answer."],
      ["Notes from audio", "The podcast you had on at the gym becomes three things worth posting about."],
      ["Meetings", "Investor calls and customer calls. Notes after, and a list of what you promised."],
      ["Delegate", "Book the flight, buy the domain, chase the renewal you keep forgetting."],
    ],
  },
  {
    id: "student",
    label: "A student",
    line: "Too much to read, and it is all due Friday.",
    rows: [
      ["Chat with the page", "The forty page PDF you were assigned. Or the LeetCode problem you are stuck on, explained on the page you are stuck on."],
      ["Notes from audio", "A three hour recorded lecture turns into clean notes in about four minutes."],
      ["Meetings", "Group project calls you would otherwise have to remember on your own."],
      ["Delegate", "Find the paper, fill the form, book the slot, rename the forty files."],
    ],
  },
  {
    id: "everyone",
    label: "Everyone else",
    line: "Thirty small frictions a day that nobody should be doing.",
    rows: [
      ["Chat with the page", "Whatever is in front of you. The terms nobody reads, the recipe, the tax page."],
      ["Notes from audio", "The long video you want the substance of and not the forty minutes."],
      ["Meetings", "The standup you zoned out in."],
      ["Delegate", "The booking, the form, the thing in seven tabs."],
    ],
  },
];

const WHY = [
  {
    h: "He is already there.",
    p: "No tab to open, no context to paste. He is on the page you are on and in the meeting you are in, which is most of the work before any answer happens.",
  },
  {
    h: "He remembers what you did, not just what you told him.",
    p: "Other assistants remember what you type into them. Braino remembers the pages you were on, the meetings he sat in, and the way you actually write.",
  },
  {
    h: "He works in your browser, in your accounts.",
    p: "Signed in as you, on the real internet. Not a separate window that has to ask you to log in again before it can do anything.",
  },
  {
    h: "He has an opinion.",
    p: "He will tell you an idea is weak. An assistant that agrees with everything is just a slower way of talking to yourself.",
  },
];

export default function Landing() {
  const [who, setWho] = useState(0);
  const person = PEOPLE[who];

  return (
    <div className="ld">
      <BrainoDefs />

      <nav className="ld-nav">
        <div className="ld-nav-in">
          <span className="ld-mark"><i />braino</span>
          <div className="ld-nav-links">
            <a href="#does">What he does</a>
            <a href="#distra">For founders</a>
            <a href="#kinds">The two Brainos</a>
            <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn sm">Get Braino</a>
          </div>
        </div>
      </nav>

      {/* ── 1. Hero ──────────────────────────────────────────────────── */}
      <header className="ld-hero">
        <div className="ld-hero-copy">
          <h1>Speak, watch it happen.</h1>
          <p className="ld-sub">
            Braino is an AI that lives on your screen. You talk to him like a person, and he
            actually does the work.
          </p>
          <div className="ld-cta">
            <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn">Get Braino, free</a>
            <span className="ld-cta-note">Chrome. Takes a minute. No card.</span>
          </div>
        </div>
        <div className="ld-hero-art" aria-hidden="true">
          <Braino size={280} expr="happy" arm="wave" legs gloves />
        </div>
      </header>

      {/* ── 2. What he does ──────────────────────────────────────────── */}
      <section className="ld-sec" id="does">
        <p className="ld-kicker">What he does</p>
        <h2 className="ld-h2">Four things, every day.</h2>
        <p className="ld-lede">
          This is the free Braino, the one that lives in your browser. No setup beyond installing
          him.
        </p>
        <div className="ld-feats">
          {FEATURES.map((f) => (
            <article key={f.n}>
              {/* Sized to hold a real 16:9 clip of the thing happening. Until
                  those exist, an honest empty frame rather than a stock photo. */}
              <div className="ld-frame" aria-hidden="true"><span>{f.n}</span></div>
              <h3>{f.name}</h3>
              <p>{f.line}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── 3. Same four, different person ───────────────────────────── */}
      <section className="ld-sec ld-who" id="who">
        <p className="ld-kicker">Who it is for</p>
        <h2 className="ld-h2">Same four things. <span className="tone">Different day.</span></h2>
        <p className="ld-lede">One product, three doors in. Pick the one that sounds like you.</p>

        <div className="ld-pills" role="tablist">
          {PEOPLE.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={who === i}
              className={who === i ? "is-on" : undefined}
              onClick={() => setWho(i)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="ld-who-line">{person.line}</p>
        <div className="ld-rows">
          {person.rows.map(([k, v]) => (
            <div key={k}>
              <b>{k}</b>
              <p>{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. The turn ──────────────────────────────────────────────── */}
      <section className="ld-turn">
        <p>
          That is Braino for anyone. <strong>If you are building something, he has a second job.</strong>
        </p>
      </section>

      {/* ── 5. Distra ────────────────────────────────────────────────── */}
      <section className="ld-sec ld-distra" id="distra">
        <p className="ld-kicker">For founders</p>
        <h2 className="ld-h2">You built it.<br /><span className="tone">Nobody saw it.</span></h2>
        <p className="ld-lede">
          Building got cheap. Being seen did not. Every AI company sells you the building half.
          Nobody sells you the being seen, and posting consistently in your own voice is the
          seventh job you are already doing badly.
        </p>
        <div className="ld-distra-grid">
          <div>
            <b>He learns how you write</b>
            <p>By reading two hundred of your own posts, ranked by what actually worked. Not by asking you to describe your voice in a box.</p>
          </div>
          <div>
            <b>He writes and posts</b>
            <p>From what you actually shipped that week, at the hours your own numbers say, in your voice rather than a marketing one.</p>
          </div>
          <div>
            <b>He finds the conversations</b>
            <p>The posts worth replying to, with the reply already drafted. You press send, because that is the part that should stay human.</p>
          </div>
          <div>
            <b>He shows his work</b>
            <p>Every decision, including the ones where he refused to post something and why. An agent you cannot audit is one you cannot trust.</p>
          </div>
        </div>
        <p className="ld-fine">On X and LinkedIn now. Reddit and Instagram next.</p>
        <div className="ld-cta">
          <Link to="/channels" className="ld-btn ghost">See how it works</Link>
        </div>
      </section>

      {/* ── 6. The two Brainos ───────────────────────────────────────── */}
      <section className="ld-sec" id="kinds">
        <p className="ld-kicker">The two Brainos</p>
        <h2 className="ld-h2">One character. <span className="tone">Two jobs.</span></h2>
        <div className="ld-two">
          <article>
            <span>Free, forever</span>
            <h3>Braino</h3>
            <p>The companion. Lives in your browser, does the four things above, and is genuinely free rather than free for now.</p>
            <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn sm">Get Braino</a>
          </article>
          <article className="is-paid">
            <span>The one you hire</span>
            <h3>Distra</h3>
            <p>The distribution engine. Same character, same memory, pointed at the problem of nobody knowing your product exists.</p>
            <Link to="/channels" className="ld-btn sm ghost">See Distra</Link>
          </article>
        </div>
        <p className="ld-fine">
          There is also <strong>HERA</strong>, which is not a third Braino. It is a mode either one
          drops into: hold a key, talk, and the words land at your cursor in whatever app you were
          already in. It never says anything back.
        </p>
      </section>

      {/* ── 7. Why him ───────────────────────────────────────────────── */}
      <section className="ld-sec" id="why">
        <p className="ld-kicker">The obvious question</p>
        <h2 className="ld-h2">Why not just <span className="tone">use ChatGPT?</span></h2>
        <div className="ld-why">
          {WHY.map((w) => (
            <div key={w.h}><b>{w.h}</b><p>{w.p}</p></div>
          ))}
        </div>
      </section>

      {/* ── 8. Close ─────────────────────────────────────────────────── */}
      <section className="ld-close">
        <div className="ld-close-art" aria-hidden="true"><Braino size={140} expr="happy" legs gloves /></div>
        <h2>Speak, watch it happen.</h2>
        <div className="ld-cta">
          <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn">Get Braino, free</a>
        </div>
      </section>

      <footer className="ld-foot">
        <div className="ld-foot-in">
          <span>Braino</span>
          <div>
            <Link to="/channels">Distra</Link>
            <Link to="/knowledge">Knowledge base</Link>
            <Link to="/premium">Pricing</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
        <p>Built by one person, somewhere with good coffee.</p>
      </footer>
    </div>
  );
}
