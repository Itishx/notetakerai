import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  EXTENSION_DOWNLOAD_URL,
  EXTENSION_DOWNLOAD_FILENAME,
  EXTENSION_VERSION,
} from "@/lib/extensionDownload";
import "./affective.css";
import "./app-store.css";

/* ============================================================================
   /apps/braino — one product's page inside the store.

   The level the store front hands you to, and the only level where a download
   button is allowed to exist. Shaped the way a product page is shaped: what it
   is, how to get it, then what is inside it.

   The last part is the one that matters here. The apps below are not things to
   install, they are places Braino stands once he is installed, so each of them
   says where it lives and how to turn it on and none of them has a button. The
   moment one does, the visitor has learned the wrong thing about the product.
   ============================================================================ */

const DOES = [
  {
    h: "He sees what you see",
    p: "The screen, not a copy of it pasted into a chat box. What is in front of you is what he is talking about.",
  },
  {
    h: "He hears the room",
    p: "Meetings, calls, lectures. Said out loud is enough, and it does not have to be said to him.",
  },
  {
    h: "He keeps it",
    p: "What happened on the machine goes into one memory that every app here reads from. That is the part nothing else has.",
  },
];

const INSIDE: {
  name: string;
  where: string;
  art: "notch" | "edge" | "caret";
  line: string;
  lives: string;
  how: string;
  state: "running" | "mac";
  honest?: string;
}[] = [
  {
    name: "Live Transcript",
    where: "The notch",
    art: "notch",
    line: "Everything said in the room turns into text along the top of the screen while it is still being said.",
    lives: "In Braino for Mac",
    how: "Cmd + Shift + E",
    state: "mac",
  },
  {
    name: "Countdown",
    where: "The right edge",
    art: "edge",
    line: "A sliver of him leans in past the edge of the screen. Click him and what is left springs out of his side.",
    lives: "Runs from the repo",
    how: "npm run widget",
    state: "running",
    honest:
      "It counts and that is all. It cannot read his memory yet, so it does not know what is on today. Wiring it to the layer is the next thing.",
  },
  {
    name: "Yap",
    where: "Wherever the caret is",
    art: "caret",
    line: "Talk, and the words land in whatever you were typing into. Nothing opens and nothing is in the way.",
    lives: "In Braino for Mac",
    how: "Option twice",
    state: "mac",
  },
];

/* The same Mac, three times, with one part of it lit. Drawn rather than
   screenshotted, because the row is about position on the screen and a
   screenshot would put the app's own interface in front of that. */
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

export default function AppBraino() {
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
            <Link to="/braino">About Braino</Link>
            <Link to="/waitlist">Early access</Link>
          </div>
        </div>
      </nav>

      <div className="aff-wrap">
        <p className="ast-crumb">
          <Link to="/apps">Apps</Link>
          <span aria-hidden="true">/</span>
          <b>Braino</b>
        </p>
      </div>

      {/* ── The product ────────────────────────────────────────────────────
          Icon, name, what it is, and the two ways to get it. Everything a
          product page owes you before you scroll. */}
      <header className="ast-prod">
        <div className="aff-wrap">
          <div className="ast-prod-in aff-reveal">
            <div className="ast-prod-icon">
              <img src="/braino-standing.svg" alt="" width={64} height={78} aria-hidden="true" />
            </div>
            <div className="ast-prod-body">
              <p className="ast-where">Assistant</p>
              <h1>Braino</h1>
              <p className="ast-prod-sub">
                He sees the screen, hears the room, does things on the machine, and remembers all
                of it. Three apps come with him.
              </p>

              <div className="ast-gets">
                <div className="ast-get-one">
                  <a className="ast-dl" href={EXTENSION_DOWNLOAD_URL} download={EXTENSION_DOWNLOAD_FILENAME}>
                    Download for Chrome
                  </a>
                  <span>Unpacked developer build</span>
                </div>
                <div className="ast-get-one">
                  <Link className="ast-dl is-soft" to="/waitlist">
                    Get early access for Mac
                  </Link>
                  <span>Not downloadable yet</span>
                </div>
              </div>
            </div>
          </div>

          <dl className="ast-facts aff-reveal">
            <div><dt>Version</dt><dd>{EXTENSION_VERSION}</dd></div>
            <div><dt>Size</dt><dd>0.9 MB</dd></div>
            <div><dt>Works on</dt><dd>Chrome, and macOS in early access</dd></div>
            <div><dt>Seller</dt><dd>Affective, Bengaluru</dd></div>
          </dl>
        </div>
      </header>

      {/* ── What he does ───────────────────────────────────────────────────── */}
      <section className="ast-does">
        <div className="aff-wrap">
          <div className="ast-does-grid aff-reveal">
            {DOES.map((d) => (
              <div key={d.h}>
                <h2>{d.h}</h2>
                <p>{d.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What is inside him ─────────────────────────────────────────────
          The sub apps. No buttons anywhere in this grid, on purpose. */}
      <section className="ast-shelf" id="inside">
        <div className="aff-wrap">
          <div className="ast-shelf-head aff-reveal">
            <h2>Apps inside Braino</h2>
            <p>Places he stands once he is installed. Nothing here is a separate download.</p>
          </div>
          <div className="ast-grid is-three aff-reveal">
            {INSIDE.map((a) => (
              <article className="ast-cell" key={a.name}>
                <div className="ast-cell-art">
                  <Screen art={a.art} />
                </div>
                <div className="ast-cell-body">
                  <div className="ast-cell-top">
                    <span className="ast-where">{a.where}</span>
                    <span className={"ast-state is-" + a.state}>
                      {a.state === "running" ? "Running" : "In the Mac app"}
                    </span>
                  </div>
                  <h3>{a.name}</h3>
                  <p className="ast-line">{a.line}</p>
                  {a.honest && <p className="ast-honest">{a.honest}</p>}
                  <p className="ast-how">
                    <span>{a.lives}</span>
                    <code>{a.how}</code>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Turning them on ────────────────────────────────────────────────── */}
      <section className="ast-setup">
        <div className="aff-wrap">
          <div className="ast-setup-grid aff-reveal">
            <div>
              <h2>Where you set them up</h2>
              <p>
                Each app is a switch rather than an install. Turn one on and it is there the next
                time you need it, off and he stops standing in that place.
              </p>
            </div>
            <ul>
              <li>
                <strong>In the Mac app</strong>
                <span>Settings, one row per app, with the shortcut next to it.</span>
              </li>
              <li>
                <strong>On the web</strong>
                <span>
                  The <Link to="/dashboard">dashboard</Link> holds what he has remembered from them,
                  and the switch for whether he remembers at all.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── The rest of the family ─────────────────────────────────────────── */}
      <section className="ast-note">
        <div className="aff-wrap">
          <div className="aff-reveal">
            <h2 className="ast-note-h">Also from here</h2>
            <p>
              Braino comes in more than one model. Same character and same memory, pointed at
              different people.
            </p>
            <p className="ast-also">
              <Link to="/foundry">Braino Foundry, for founders</Link>
              <Link to="/contact">Braino for Mesa, for institutions</Link>
              <Link to="/apps">All Affective apps</Link>
            </p>
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
                  <li><Link to="/apps/braino">Braino</Link></li>
                  <li><Link to="/foundry">Braino Foundry</Link></li>
                  <li><Link to="/apps">All apps</Link></li>
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
              The Chrome build is real. The Mac build is not out. Each app above says which of the
              two it lives in.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
