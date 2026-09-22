import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./affective.css";
import "./app-store.css";

/* ============================================================================
   /apps — the store.

   Two categories, and the difference between them is the whole point.

   A product is something you live in. Braino is the only one, and his models
   are variations of him rather than separate products, the way an iPhone comes
   in sizes. His page is /braino: this page hands you to it and does not try to
   be it.

   A mini app is one small thing done well. It is NOT a Braino app. It runs on
   its own as a Mac app and stands somewhere on your screen, and if you happen
   to have Braino it can plug into him instead and read the same memory as
   everything else. That is the ecosystem, and it only means anything if the
   mini apps genuinely work without him, so the grid below says plainly which
   ones do today and which ones do not.
   ============================================================================ */

const MODELS = ["Braino", "Braino Foundry", "Braino for Mesa"];

const MINI: {
  name: string;
  where: string;
  art: "notch" | "edge" | "caret";
  line: string;
  alone: string;
  plugged: string;
  how: string;
}[] = [
  {
    name: "Live Transcript",
    where: "Stands in the notch",
    art: "notch",
    line: "Everything said in the room turns into text along the top of the screen while it is still being said.",
    alone: "Not yet",
    plugged: "Yes",
    how: "Cmd + Shift + E",
  },
  {
    name: "Countdown",
    where: "Stands at the right edge",
    art: "edge",
    line: "A sliver of him leans in past the edge of the screen. Click him and the time left springs out of his side.",
    alone: "Yes",
    plugged: "Not yet",
    how: "npm run widget",
  },
  {
    name: "Yap",
    where: "Stands at the caret",
    art: "caret",
    line: "Talk, and the words land in whatever you were typing into. Nothing opens and nothing is in the way.",
    alone: "Not yet",
    plugged: "Yes",
    how: "Option twice",
  },
];

/* The same Mac, three times, with one part of it lit. Drawn rather than
   screenshotted, because the row is about where a thing stands on your screen
   and a screenshot would put its interface in front of that. */
function Screen({ art }: { art: "notch" | "edge" | "caret" }) {
  return (
    <svg className="ast-screen" viewBox="0 0 160 100" role="img" aria-hidden="true">
      <rect x="6" y="6" width="148" height="80" rx="6" className="ast-screen-body" />
      <rect x="62" y="86" width="36" height="4" rx="2" className="ast-screen-foot" />
      {art === "notch" && (
        <>
          <rect x="52" y="6" width="56" height="10" rx="5" className="ast-lit" />
          <rect x="60" y="10" width="26" height="2" rx="1" className="ast-lit-ink" />
          <rect x="90" y="10" width="11" height="2" rx="1" className="ast-lit-ink" />
        </>
      )}
      {art === "edge" && (
        <>
          <rect x="147" y="36" width="7" height="22" rx="3.5" className="ast-lit" />
          <rect x="112" y="41" width="31" height="12" rx="3" className="ast-lit-soft" />
          <rect x="116" y="45" width="23" height="3" rx="1.5" className="ast-lit-ink" />
        </>
      )}
      {art === "caret" && (
        <>
          <rect x="30" y="38" width="46" height="2.5" rx="1.25" className="ast-lit-ink" />
          <rect x="30" y="46" width="62" height="2.5" rx="1.25" className="ast-lit-ink" />
          <rect x="94" y="43" width="2" height="12" rx="1" className="ast-lit" />
        </>
      )}
    </svg>
  );
}

function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".aff-reveal");
    if (!els?.length) return;
    // Visible at rest if the observer never runs, so the page never ships empty.
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

export default function AppStore() {
  const root = useReveal();

  return (
    <div className="aff ast" ref={root}>
      <nav className="aff-nav">
        <div className="aff-nav-in">
          <Link to="/" className="aff-logo" aria-label="Affective">
            <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
          </Link>
          <div className="aff-nav-links">
            <Link to="/apps">Apps</Link>
            <Link to="/braino">Braino</Link>
            <Link to="/waitlist">Early access</Link>
          </div>
        </div>
      </nav>

      <header className="ast-head">
        <div className="aff-wrap">
          <div className="aff-reveal">
            <p className="ast-kicker">App store</p>
            <h1 className="ast-h1">
              Two kinds of thing.
              <b>Products, and the small apps that plug into them.</b>
            </h1>
            <p className="ast-lede">
              A product is something you live in. A mini app is one small thing done well: it runs
              on its own as a Mac app and stands somewhere on your screen. If you have Braino you
              can plug it into him instead, and then it reads the same memory everything else
              does. That is the whole ecosystem, and it only means anything because the mini apps
              work without him.
            </p>
          </div>
        </div>
      </header>

      {/* ── The two categories, side by side ──────────────────────────────
          The split is the argument. A product and a mini app are not the same
          kind of thing, and putting them in one column under one heading is
          what made them look like the same kind of thing. One hairline down
          the middle of the screen says it before a word is read: the left is
          something you live in, the right is a shelf of small things that can
          plug into it. */}
      <section className="ast-split">
        <div className="ast-half ast-half-product" id="products">
          <div className="ast-half-head">
            <h2>Affective products</h2>
            <p>Something you live in. There is one so far.</p>
          </div>

          <Link to="/braino" className="ast-prodcard aff-reveal">
            <div className="ast-prodcard-art">
              <img src="/braino-standing.svg" alt="" width={64} height={78} aria-hidden="true" />
            </div>
            <div className="ast-prodcard-body">
              <p className="ast-feat-kicker">Product</p>
              <h3>Braino</h3>
              <p className="ast-feat-line">
                He sees the screen, hears the room, does things on the machine, and remembers all
                of it. The first thing we put AffectiveOS into.
              </p>
              <p className="ast-feat-models">
                {MODELS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </p>
              <div className="ast-prodcard-foot">
                <span className="ast-feat-go">
                  Open Braino<i aria-hidden="true">→</i>
                </span>
                <span className="ast-state is-out">Chrome build out</span>
              </div>
            </div>
          </Link>
        </div>

        {/* The shelf. Small cards in a column, the way a reading list is set:
            the words first and a small picture of where it stands beside them,
            because at this size the drawing is a marker and not the point. */}
        <div className="ast-half ast-half-mini" id="mini">
          <div className="ast-half-head">
            <h2>Mini apps</h2>
            <p>One small thing each. Use them on their own, or plug them into Braino.</p>
          </div>

          <ul className="ast-minilist aff-reveal">
            {MINI.map((a) => (
              <li key={a.name}>
                <div className="ast-minicard-text">
                  <p className="ast-where">{a.where}</p>
                  <h3>{a.name}</h3>
                  <p className="ast-minicard-line">{a.line}</p>
                  <p className="ast-minicard-meta">
                    <span>
                      On its own
                      <b className={a.alone === "Yes" ? "is-yes" : "is-no"}>{a.alone}</b>
                    </span>
                    <span>
                      Plugs into Braino
                      <b className={a.plugged === "Yes" ? "is-yes" : "is-no"}>{a.plugged}</b>
                    </span>
                    <code>{a.how}</code>
                  </p>
                </div>
                <div className="ast-minicard-art">
                  <Screen art={a.art} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── What the two categories are for ───────────────────────────────── */}
      <section className="ast-note">
        <div className="aff-wrap">
          <div className="aff-reveal">
            <h2 className="ast-note-h">Why they are in one store</h2>
            <p>
              A mini app on its own is a good small tool and nothing more. Plugged into Braino it
              stops being a tool: the transcript it takes is in his memory afterwards, and the
              countdown at your edge knows what is actually on today. Same app, same afternoon, and
              the difference is only that something underneath it remembers.
            </p>
            <p>
              Not everything gets in. It has to get better from what the layer already knows, and
              it has to put something back. A photo editor answers no twice, which makes it
              somebody else&rsquo;s good idea.
            </p>
            <Link to="/waitlist" className="ast-cta">
              Get early access
            </Link>
          </div>
        </div>
      </section>

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
                <strong className="aff-mark">
                  <img src="/affective-logo.png" alt="Affective" width={1000} height={207} />
                </strong>
                <p>
                  We build AffectiveOS, a continuity layer for the Mac you already own: the part
                  that understands you, does things for you, and remembers both.
                </p>
                <p className="aff-foot-where">Bengaluru.</p>
              </div>
              <nav className="aff-foot-col aff-tree" aria-label="Products">
                <h4>Products</h4>
                <ul>
                  <li><Link to="/braino">Braino</Link></li>
                  <li><Link to="/foundry">Braino Foundry</Link></li>
                  <li><Link to="/apps">App store</Link></li>
                </ul>
              </nav>
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
              Every mini app above says whether it stands on its own today and whether it plugs in
              today. Where the answer is no, it says no.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
