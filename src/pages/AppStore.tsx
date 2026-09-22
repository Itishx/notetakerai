import { useEffect, useRef, useState } from "react";
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

/* Not wireframes. Each one is a small picture of the app actually running in
   the place it stands, because a labelled rectangle asks the reader to imagine
   the product and a picture of it does not. Drawn rather than screenshotted so
   the three sit at one scale, in one light, with one set of hairlines.

   The Apple half of the blend lives here: a tinted panel per accent, a real
   bezel with a gradient in it, and the lit part glowing rather than simply
   being filled. */
const FAQ = [
  {
    q: "Why are they in one store?",
    a: "Because they run on the same thing. A mini app on its own is a good small tool and nothing more. Plugged into Braino it stops being a tool: the transcript it takes is in his memory afterwards, and the countdown at your edge knows what is actually on today. Same app, same afternoon, and the only difference is that something underneath it remembers. A store of unrelated tools is a drawer. This is one layer with several ways in.",
  },
  {
    q: "What is the difference between an Affective product and a mini app?",
    a: "Size and dependence. A product is something you live in: it runs all day, it has models rather than versions, and everything else is built to sit on top of it. Braino is the only one. A mini app is one small thing done well. It is not part of Braino and does not need him: it runs on its own as a Mac app and stands somewhere on your screen. If you do have him you can plug it in, and then it reads the same memory he does. Plugging in is the choice, not the requirement, which is the whole reason the two are listed apart.",
  },
];

function Shot({ art }: { art: "notch" | "edge" | "caret" }) {
  const id = "sh-" + art;
  return (
    <svg className="ast-shot" viewBox="0 0 220 138" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={id + "-glass"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1eee5" />
        </linearGradient>
        <linearGradient id={id + "-lit"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0938a" />
          <stop offset="1" stopColor="#c9544a" />
        </linearGradient>
        <radialGradient id={id + "-glow"} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#d9645b" stopOpacity="0.4" />
          <stop offset="1" stopColor="#d9645b" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the machine */}
      <rect x="14" y="10" width="192" height="112" rx="11" fill={`url(#${id}-glass)`} stroke="#cdc7b7" />
      <rect x="20" y="16" width="180" height="100" rx="7" fill="#fdfcf8" stroke="#e2ddd0" />

      {art === "notch" && (
        <>
          <ellipse cx="110" cy="22" rx="52" ry="20" fill={`url(#${id}-glow)`} />
          <rect x="72" y="14" width="76" height="15" rx="7.5" fill="#1b1a14" />
          <circle cx="82" cy="21.5" r="3" fill={`url(#${id}-lit)`} />
          <rect x="90" y="19" width="32" height="2.2" rx="1.1" fill="#f6f3ea" opacity=".9" />
          <rect x="126" y="19" width="14" height="2.2" rx="1.1" fill="#f6f3ea" opacity=".45" />
          <rect x="36" y="52" width="120" height="3" rx="1.5" fill="#d8d2c3" />
          <rect x="36" y="64" width="148" height="3" rx="1.5" fill="#ddd7c9" />
          <rect x="36" y="76" width="96" height="3" rx="1.5" fill="#e6e1d4" />
          <rect x="36" y="88" width="132" height="3" rx="1.5" fill="#eeeade" />
        </>
      )}

      {art === "edge" && (
        <>
          <ellipse cx="196" cy="66" rx="42" ry="40" fill={`url(#${id}-glow)`} />
          <rect x="36" y="36" width="104" height="3" rx="1.5" fill="#e6e1d4" />
          <rect x="36" y="46" width="128" height="3" rx="1.5" fill="#ece7db" />
          {/* the glass pill with the count in it */}
          <rect x="104" y="56" width="80" height="24" rx="8" fill="#1b1a14" opacity=".9" />
          <rect x="112" y="64" width="13" height="8" rx="2" fill="#f6a8a2" />
          <rect x="128" y="67" width="3" height="3" rx="1.5" fill="#f6a8a2" opacity=".6" />
          <rect x="134" y="64" width="13" height="8" rx="2" fill="#f6a8a2" />
          <rect x="150" y="67" width="3" height="3" rx="1.5" fill="#f6a8a2" opacity=".6" />
          <rect x="156" y="64" width="13" height="8" rx="2" fill="#f6a8a2" opacity=".7" />
          <rect x="36" y="92" width="88" height="3" rx="1.5" fill="#efebe0" />
          {/* him, leaning in past the edge */}
          <rect x="194" y="50" width="12" height="36" rx="6" fill={`url(#${id}-lit)`} />
          <circle cx="199" cy="62" r="2" fill="#1b1a14" opacity=".55" />
        </>
      )}

      {art === "caret" && (
        <>
          <ellipse cx="120" cy="66" rx="48" ry="30" fill={`url(#${id}-glow)`} />
          <rect x="36" y="44" width="122" height="3.4" rx="1.7" fill="#d8d2c3" />
          <rect x="36" y="56" width="148" height="3.4" rx="1.7" fill="#ddd7c9" />
          <rect x="36" y="68" width="74" height="3.4" rx="1.7" fill="#e3ded1" />
          <rect x="114" y="62" width="2.6" height="16" rx="1.3" fill={`url(#${id}-lit)`} />
          {/* what is being said, still arriving */}
          <rect x="126" y="66" width="2.4" height="8" rx="1.2" fill="#d9645b" opacity=".85" />
          <rect x="132" y="62" width="2.4" height="16" rx="1.2" fill="#d9645b" opacity=".65" />
          <rect x="138" y="65" width="2.4" height="10" rx="1.2" fill="#d9645b" opacity=".5" />
          <rect x="144" y="68" width="2.4" height="4" rx="1.2" fill="#d9645b" opacity=".35" />
          <rect x="36" y="88" width="108" height="3.4" rx="1.7" fill="#efebe0" />
        </>
      )}

      {/* the stand */}
      <rect x="92" y="122" width="36" height="5" rx="2.5" fill="#cdc7b7" />
      <rect x="76" y="127" width="68" height="4" rx="2" fill="#dcd6c7" />
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
  const [tab, setTab] = useState<"products" | "mini">("products");

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

      {/* ── The hero ──────────────────────────────────────────────────────
          The company page's own hero, verbatim in structure: the claim on the
          left at full size, the one sentence and the two ways in on the right.
          A store is not a different kind of page and should not arrive looking
          like one. */}
      <header className="aff-hero">
        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1">
              <span className="aff-h1-line">Two kinds of thing.</span>
              <b>One layer under both.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">
                A product is something you live in. A mini app is one small thing done well, and it
                runs on its own until you decide to plug it in.
              </p>
              <div className="aff-hero-cta">
                <Link to="/braino" className="aff-cta">Open Braino</Link>
                <Link to="/waitlist" className="aff-cta aff-cta-ghost">Join the waitlist</Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── The two categories, as tabs ───────────────────────────────────
          They were side by side and that was the wrong shape: a half screen
          each meant neither got to be seen properly, and a product and a shelf
          of small apps do not want the same amount of room. As tabs, whichever
          one you asked for gets the whole width. */}
      <div className="ast-tabs-bar">
        <div className="aff-wrap">
          <div className="ast-tabs" role="tablist" aria-label="Store categories">
            <button
              type="button"
              role="tab"
              id="tab-products"
              aria-selected={tab === "products"}
              aria-controls="panel-products"
              className={"ast-tab" + (tab === "products" ? " is-on" : "")}
              onClick={() => setTab("products")}
            >
              <span className="ast-tab-name">Affective products</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-mini"
              aria-selected={tab === "mini"}
              aria-controls="panel-mini"
              className={"ast-tab" + (tab === "mini" ? " is-on" : "")}
              onClick={() => setTab("mini")}
            >
              <span className="ast-tab-name">Mini apps</span>
            </button>
          </div>
        </div>
      </div>

      {/* The panel is keyed on the tab so its entrance animation restarts on a
          switch. Nothing inside it is a reveal target: a scroll observer that
          has already run would leave freshly mounted nodes sitting at zero. */}
      <section className="ast-panel-wrap">
        <div
          className="ast-panel"
          key={tab}
          role="tabpanel"
          id={tab === "products" ? "panel-products" : "panel-mini"}
          aria-labelledby={tab === "products" ? "tab-products" : "tab-mini"}
        >
          <div className="aff-wrap">
            <p className="ast-subhead">
              {tab === "products"
                ? "Something you live in. There is one so far."
                : `One small thing each. ${MINI.length} of them, and none needs Braino to run.`}
            </p>
          </div>

          {tab === "products" ? (
            <div className="aff-wrap">
            <Link to="/braino" className="ast-wide">
              <div className="ast-wide-art">
                <img src="/braino-standing.svg" alt="" width={64} height={78} aria-hidden="true" />
              </div>
              <div className="ast-wide-body">
                <p className="ast-feat-kicker">Product</p>
                <h3>Braino</h3>
                <p className="ast-feat-line">
                  He sees the screen, hears the room, does things on the machine, and remembers all
                  of it. The first thing we put AffectiveOS into, and the thing every mini app can
                  plug into.
                </p>
                <p className="ast-feat-models">
                  {MODELS.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </p>
                <div className="ast-wide-foot">
                  <span className="ast-feat-go">
                    Open Braino<i aria-hidden="true">→</i>
                  </span>
                  <span className="ast-state is-out">Chrome build out</span>
                </div>
              </div>
            </Link>
            </div>
          ) : (
            <div className="aff-wrap">
            <div className="ast-minigrid">
              {MINI.map((a) => (
                <article className="ast-minicard" key={a.name}>
                  <div className="ast-minicard-art">
                    <Shot art={a.art} />
                  </div>
                  <div className="ast-minicard-body">
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
                    </p>
                    <p className="ast-minicard-how">
                      <code>{a.how}</code>
                    </p>
                  </div>
                </article>
              ))}
            </div>
            </div>
          )}
        </div>
      </section>

      {/* ── The two questions the split was trying to answer with layout ──── */}
      <section className="aff-sec aff-faq-sec" id="faq">
        <div className="aff-wrap">
          <div className="aff-faq-in">
            <div className="aff-faq-head aff-reveal">
              <h2>Questions you may have.</h2>
              <p>Mostly about why these two things are on one page.</p>
            </div>
            {/* details/summary, so it works with no JavaScript and with a
                keyboard. Same as the company page. */}
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
                  Building tech that makes life more affective.
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
